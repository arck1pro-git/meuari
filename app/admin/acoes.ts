"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { autenticar, abrirSessao, fecharSessao, sessaoValida } from "@/lib/auth";
import { atualizar, camposAlterados, criar, excluir } from "@/lib/admin/crud";
import {
  estimativaDe,
  jaLancado,
  lancarCredito,
} from "@/lib/admin/lancamentos";
import { registrar } from "@/lib/auditoria";
import { acharTabela } from "@/lib/admin/tabelas";
import { dataDoCredito } from "@/lib/portal/recebimentos";
import { emMinutos, limparTentativas, podeTentar } from "@/lib/limite";
import { assinarUpload } from "@/lib/storage";
import { conferirArquivo } from "@/lib/upload";

/**
 * Toda acao passa por aqui antes de tocar no banco.
 *
 * A guarda do layout protege a *navegacao*, mas Server Action é um endpoint:
 * responde a POST direto, sem passar por layout nenhum. Sem esta checagem, um
 * investidor comum poderia chamar a acao e escrever no banco.
 */
async function exigirAdmin() {
  const sessao = await sessaoValida();
  if (sessao?.tipo !== "administrador") {
    throw new Error("Acesso restrito a administradores");
  }
}

function exigirTabela(slug: string) {
  const tabela = acharTabela(slug);
  if (!tabela) throw new Error("Tabela desconhecida");
  return tabela;
}

export async function entrar(_anterior: string | null, dados: FormData) {
  const email = String(dados.get("email") ?? "");
  const senha = String(dados.get("senha") ?? "");

  // Mesmo freio do login do investidor — e esta porta importa mais.
  const { liberado, faltamSegundos } = await podeTentar(email);
  if (!liberado) {
    await registrar({
      acao: "login_recusado",
      detalhe: { area: "admin", email, motivo: "freio de tentativas" },
    });
    return `Muitas tentativas. Tente de novo em ${emMinutos(faltamSegundos)} min.`;
  }

  const sessao = await autenticar(email, senha);
  // Mensagem unica para credencial errada e usuario inexistente: dizer qual
  // dos dois falhou entrega quais e-mails existem.
  if (!sessao) {
    // O identificador tentado é registrado; a senha, nunca.
    await registrar({ acao: "login_recusado", detalhe: { area: "admin", email } });
    return "E-mail ou senha invalidos.";
  }
  if (sessao.tipo !== "administrador") {
    await registrar({
      acao: "login_recusado",
      detalhe: { area: "admin", email, motivo: "nao é administrador" },
      usuario: { id: sessao.id, nome: sessao.nome },
    });
    return "Esta area é restrita.";
  }

  await limparTentativas(email);
  await abrirSessao(sessao);
  await registrar({
    acao: "login",
    detalhe: { area: "admin" },
    usuario: { id: sessao.id, nome: sessao.nome },
  });
  redirect("/admin");
}

export async function sair() {
  // Antes de fechar: depois dela nao ha mais sessao para dizer quem saiu.
  await registrar({ acao: "logout", detalhe: { area: "admin" } });
  await fecharSessao();
  redirect("/admin/login");
}

export async function acaoCriar(slug: string, dados: FormData) {
  await exigirAdmin();
  const tabela = exigirTabela(slug);
  const { id, colunas } = await criar(tabela, dados);

  await registrar({
    acao: "criar",
    alvoTabela: tabela.tabela,
    alvoId: id,
    // So os nomes das colunas: o valor pode ser um hash de senha.
    detalhe: { campos: colunas },
  });

  revalidatePath(`/admin/${slug}`);
  redirect(`/admin/${slug}`);
}

export async function acaoAtualizar(
  slug: string,
  id: string,
  dados: FormData,
) {
  await exigirAdmin();
  const tabela = exigirTabela(slug);
  const campos = await camposAlterados(tabela, dados);

  await atualizar(tabela, id, dados);
  await registrar({
    acao: "atualizar",
    alvoTabela: tabela.tabela,
    alvoId: id,
    detalhe: { campos },
  });

  revalidatePath(`/admin/${slug}`);
  redirect(`/admin/${slug}`);
}

/**
 * Devolve ao browser uma URL para ele enviar o arquivo direto ao bucket.
 *
 * O bucket e o campo nao vem soltos: chegam pelo slug da tabela e pelo nome do
 * campo, que sao resolvidos contra o registro. Assim ninguem escolhe em que
 * bucket escrever mandando outro nome — mesma defesa dos identificadores de SQL.
 */
export async function acaoAssinarUpload(
  slug: string,
  campo: string,
  nomeArquivo: string,
) {
  await exigirAdmin();

  const alvo = exigirTabela(slug).campos.find(
    (c) => c.nome === campo && c.tipo === "arquivo",
  );
  if (!alvo?.bucket) throw new Error("Campo de arquivo desconhecido");

  /*
   * A extensao é conferida aqui, e nao no navegador: o `accept` do seletor de
   * arquivo é dica de interface e some com uma chamada direta a esta acao. Sem
   * URL assinada, nao ha para onde enviar — é este o ponto de controle.
   */
  conferirArquivo(nomeArquivo, alvo.aceita);

  const assinado = await assinarUpload(alvo.bucket, nomeArquivo);
  await registrar({
    acao: "upload",
    alvoTabela: exigirTabela(slug).tabela,
    detalhe: { campo, arquivo: nomeArquivo, caminho: assinado.caminho },
  });

  return assinado;
}

/** Competencia `AAAA-MM`. Ela vira o dia 17 do credito, e nunca uma data solta. */
const COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Lanca o credito mensal de um investidor num empreendimento.
 *
 * O campo em branco significa "o valor da estimativa" — e ela é **refeita
 * aqui**, do banco, em vez de vir num campo escondido do formulario. É o mesmo
 * cuidado do resto do painel: o que o navegador manda é intencao, nunca numero
 * de contrato.
 *
 * Erro previsivel — a linha ja lancada — nao vira tela de erro: volta para a
 * propria pagina com um aviso, porque a causa mais provavel é uma aba aberta
 * desde antes do lancamento.
 */
export async function acaoLancarCredito(
  alvo: { usuarioId: string; empreendimentoId: string; competencia: string },
  dados: FormData,
) {
  await exigirAdmin();

  if (!COMPETENCIA.test(alvo.competencia)) {
    throw new Error("Competencia invalida");
  }

  const data = dataDoCredito(alvo.competencia);
  const destino = `/admin/lancamentos?mes=${alvo.competencia}`;

  if (await jaLancado(alvo.usuarioId, alvo.empreendimentoId, data)) {
    redirect(`${destino}&aviso=duplicado`);
  }

  const digitado = String(dados.get("valor") ?? "")
    .trim()
    .replace(",", ".");

  const valor =
    digitado === ""
      ? (await estimativaDe(alvo.usuarioId, alvo.empreendimentoId, data)).valor
      : Number(digitado);

  if (!Number.isFinite(valor)) throw new Error("Valor invalido");

  const observacao = String(dados.get("observacao") ?? "").trim() || null;

  const id = await lancarCredito({
    usuarioId: alvo.usuarioId,
    empreendimentoId: alvo.empreendimentoId,
    data,
    valor,
    observacao,
  });

  await registrar({
    acao: "criar",
    alvoTabela: "recebimentos",
    alvoId: id,
    detalhe: {
      campos: ["usuario_id", "empreendimento_id", "data", "valor", "observacao"],
      // Se o valor saiu da formula ou da mao de quem lancou — é a pergunta que
      // se faz quando um credito é contestado.
      valorVeioDe: digitado === "" ? "estimativa" : "digitado",
      competencia: alvo.competencia,
    },
  });

  revalidatePath("/admin/lancamentos");
  revalidatePath("/admin/recebimentos");
  redirect(`${destino}&ok=1`);
}

export async function acaoExcluir(slug: string, id: string) {
  await exigirAdmin();
  const tabela = exigirTabela(slug);

  await excluir(tabela, id);
  await registrar({ acao: "excluir", alvoTabela: tabela.tabela, alvoId: id });

  revalidatePath(`/admin/${slug}`);
}
