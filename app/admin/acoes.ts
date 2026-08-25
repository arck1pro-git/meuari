"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  autenticar,
  abrirSessao,
  fecharSessao,
  sessaoValida,
} from "@/lib/auth";
import { agendar, removerAgendamento } from "@/lib/admin/agendamentos";
import {
  atualizar,
  camposAlterados,
  criar,
  ehDuplicado,
  excluir,
  restricaoDe,
} from "@/lib/admin/crud";
import {
  estimativaDe,
  jaLancado,
  lancarCredito,
} from "@/lib/admin/lancamentos";
import { avisarNovoDocumento } from "@/lib/admin/aviso-de-documento";
import { registrar } from "@/lib/auditoria";
import { enviarAviso } from "@/lib/notificacoes-envio";
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
    await registrar({
      acao: "login_recusado",
      detalhe: { area: "admin", email },
    });
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

/**
 * Manda de volta para a listagem com o aviso de duplicado, ou relanca.
 *
 * Violacao de unicidade nao é falha de sistema: é o banco recusando uma linha
 * que ja existe, e quem esta preenchendo o formulario precisa ler isso em
 * portugues. Ate aqui virava 500 na cara de quem tentava lancar o credito do mes
 * duas vezes — e tentar duas vezes é o que acontece com uma aba aberta desde
 * antes do primeiro lancamento.
 *
 * O `redirect` funciona lancando, entao ele mora no `catch` de quem chama, e
 * nao aqui dentro: aqui ele seria engolido pelo proprio bloco.
 */
function avisoDeDuplicado(erro: unknown, slug: string): string {
  if (!ehDuplicado(erro)) throw erro;
  const onde = encodeURIComponent(restricaoDe(erro));
  // `novo=1` mantem o formulario aberto: o aviso serve para corrigir e tentar de
  // novo, e fechar a tela junto obrigaria a reabrir para isso.
  return `/admin/${slug}?erro=duplicado&onde=${onde}&novo=1`;
}

export async function acaoCriar(slug: string, dados: FormData) {
  await exigirAdmin();
  const tabela = exigirTabela(slug);

  let id: string;
  let colunas: string[];
  try {
    ({ id, colunas } = await criar(tabela, dados));
  } catch (erro) {
    redirect(avisoDeDuplicado(erro, slug));
  }

  /*
   * Documento publicado avisa os investidores da obra.
   *
   * Aqui, e nao dentro de `criar()`: aquele monta SQL a partir do registro e
   * serve as onze tabelas igualmente: uma consequencia que vale para uma so nao
   * pode morar la. E depois do insert, nunca antes — aviso de documento que
   * falhou na gravacao seria aviso de nada.
   *
   * Nao ha o mesmo em `acaoAtualizar`: trocar o nome ou o arquivo de um
   * documento que ja existe nao é publicacao, e reavisar a cada correcao de
   * digitacao ensina a ignorar o sino.
   */
  const entrega =
    tabela.slug === "documentos" ? await avisarNovoDocumento(id) : null;

  await registrar({
    acao: "criar",
    alvoTabela: tabela.tabela,
    alvoId: id,
    // So os nomes das colunas: o valor pode ser um hash de senha.
    detalhe: {
      campos: colunas,
      // Sem isto, "quem foi avisado quando o documento entrou" nao teria
      // resposta: a linha de `notificacoes` nao guarda de onde veio.
      ...(entrega && {
        avisados: entrega.pessoas,
        entregues: entrega.entregues,
        aparelhos: entrega.inscricoes,
      }),
    },
  });

  revalidatePath(`/admin/${slug}`);
  /*
   * Sem `revalidatePath` para o lado do investidor: o portal e as telas de obra
   * sao `force-dynamic` e consultam o banco a cada visita, entao nao ha cache
   * para invalidar — a linha existiria so para parecer cuidadosa.
   */

  /*
   * O painel volta dizendo quantos foram avisados. É a unica parte do que
   * acabou de acontecer que a tabela nao mostra sozinha — a linha nova aparece
   * na lista, o push nao aparece em lugar nenhum.
   */
  redirect(
    entrega
      ? `/admin/${slug}?ok=avisado&pessoas=${entrega.pessoas}&entregues=${entrega.entregues}&aparelhos=${entrega.inscricoes}`
      : `/admin/${slug}`,
  );
}

export async function acaoAtualizar(slug: string, id: string, dados: FormData) {
  await exigirAdmin();
  const tabela = exigirTabela(slug);
  const campos = await camposAlterados(tabela, dados);

  try {
    await atualizar(tabela, id, dados);
  } catch (erro) {
    // Mesma historia da criacao: editar a data de um credito para uma que ja
    // tem lancamento esbarra na mesma restricao.
    redirect(avisoDeDuplicado(erro, slug));
  }

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
  alvo: { contratoId: string; competencia: string },
  dados: FormData,
) {
  await exigirAdmin();

  if (!COMPETENCIA.test(alvo.competencia)) {
    throw new Error("Competencia invalida");
  }

  const data = dataDoCredito(alvo.competencia);
  // O painel de lancamento vive dentro da tela de Recebimentos.
  // `lancar=1` para o painel continuar aberto: quem acabou de lancar quase
  // sempre lanca o proximo.
  const destino = `/admin/recebimentos?lancar=1&mes=${alvo.competencia}`;

  if (await jaLancado(alvo.contratoId, data)) {
    redirect(`${destino}&aviso=duplicado`);
  }

  const digitado = String(dados.get("valor") ?? "")
    .trim()
    .replace(",", ".");

  const valor =
    digitado === ""
      ? (await estimativaDe(alvo.contratoId, data)).valor
      : Number(digitado);

  if (!Number.isFinite(valor)) throw new Error("Valor invalido");

  const observacao = String(dados.get("observacao") ?? "").trim() || null;

  const id = await lancarCredito({
    contratoId: alvo.contratoId,
    data,
    valor,
    observacao,
  });

  await registrar({
    acao: "criar",
    alvoTabela: "recebimentos",
    alvoId: id,
    detalhe: {
      campos: ["contrato_id", "data", "valor", "observacao"],
      // Se o valor saiu da formula ou da mao de quem lancou — é a pergunta que
      // se faz quando um credito é contestado.
      valorVeioDe: digitado === "" ? "estimativa" : "digitado",
      competencia: alvo.competencia,
    },
  });

  revalidatePath("/admin/recebimentos");
  redirect(`${destino}&ok=1`);
}

/* ------------------------------------------------------ notificacoes -- */

/**
 * Envia um aviso na hora: cria a linha na caixinha e manda o push.
 *
 * Sem n8n no caminho — ele só entra quando o envio tem de se repetir sozinho.
 * Aqui a pessoa apertou o botao, e o efeito é imediato.
 */
export async function acaoEnviarNotificacao(dados: FormData) {
  await exigirAdmin();

  const texto = (campo: string) => String(dados.get(campo) ?? "").trim();

  const titulo = texto("titulo");
  if (!titulo) throw new Error("Titulo é obrigatorio");

  const entrega = await enviarAviso({
    // Em branco = aviso geral, para todos.
    usuarioId: texto("usuario_id") || null,
    titulo,
    corpo: texto("corpo") || null,
    url: texto("url") || null,
  });

  await registrar({
    acao: "criar",
    alvoTabela: "notificacoes",
    alvoId: entrega.id,
    detalhe: {
      envio: "imediato",
      entregues: entrega.entregues,
      inscricoes: entrega.inscricoes,
    },
  });

  revalidatePath("/admin/notificacoes");

  /*
   * O numero de entregas volta na URL porque é a unica resposta que importa:
   * "mandei" sem dizer para quantos aparelhos nao diz nada quando ninguem
   * recebeu.
   */
  redirect(
    `/admin/notificacoes?ok=enviado&entregues=${entrega.entregues}&aparelhos=${entrega.inscricoes}`,
  );
}

/* --------------------------------------------------- envio automatico -- */

/** `HH:MM` das 00:00 as 23:59. */
const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Cria o agendamento e a automacao que o dispara.
 *
 * A validacao é a de sempre nesta casa: a mao, campo a campo, do lado do
 * servidor. O formulario é o que ajuda a acertar; ele nao é o que garante.
 */
export async function acaoAgendarNotificacao(dados: FormData) {
  await exigirAdmin();

  const texto = (campo: string) => String(dados.get(campo) ?? "").trim();

  const titulo = texto("titulo");
  if (!titulo) throw new Error("Titulo é obrigatorio");

  const recorrencia = texto("recorrencia");
  if (!["diaria", "semanal", "mensal"].includes(recorrencia)) {
    throw new Error("Recorrencia invalida");
  }

  /*
   * Horarios chegam como campos repetidos e saem daqui unicos e em ordem: dois
   * "09:00" na mesma regra fariam o n8n disparar duas vezes no mesmo minuto.
   */
  const horarios = [...new Set(dados.getAll("horario").map(String))]
    .map((h) => h.trim())
    .filter((h) => HORARIO.test(h))
    .sort();

  if (horarios.length === 0) throw new Error("Informe ao menos um horario");

  const diasSemana = [...new Set(dados.getAll("dia_semana").map(Number))]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort();

  if (recorrencia === "semanal" && diasSemana.length === 0) {
    throw new Error("Escolha ao menos um dia da semana");
  }

  const diaMes = Number(texto("dia_mes"));
  if (recorrencia === "mensal" && !(diaMes >= 1 && diaMes <= 31)) {
    throw new Error("Dia do mes invalido");
  }

  const { id, erroDoN8n } = await agendar({
    // Em branco = aviso geral, como em `notificacoes`.
    usuarioId: texto("usuario_id") || null,
    titulo,
    corpo: texto("corpo") || null,
    url: texto("url") || null,
    recorrencia: recorrencia as "diaria" | "semanal" | "mensal",
    diasSemana,
    diaMes: recorrencia === "mensal" ? diaMes : null,
    horarios,
  });

  await registrar({
    acao: "criar",
    alvoTabela: "notificacoes_agendadas",
    alvoId: id,
    detalhe: {
      recorrencia,
      horarios,
      automacao: erroDoN8n ? "falhou" : "criada",
    },
  });

  revalidatePath("/admin/notificacoes");

  /*
   * O n8n fora do ar nao pode virar tela de erro: o agendamento ficou gravado,
   * so nao ficou ligado. A tela diz isso, e a exclusao continua a um clique.
   */
  redirect(
    erroDoN8n
      ? "/admin/notificacoes?aviso=n8n"
      : "/admin/notificacoes?ok=agendado",
  );
}

export async function acaoRemoverAgendamento(id: string) {
  await exigirAdmin();

  await removerAgendamento(id);
  await registrar({
    acao: "excluir",
    alvoTabela: "notificacoes_agendadas",
    alvoId: id,
  });

  revalidatePath("/admin/notificacoes");
}

/**
 * Os dois SQLSTATE de "tem gente apontando para esta linha".
 *
 * `23503` é a violacao de chave estrangeira comum; `23001` é a que o Postgres
 * levanta especificamente no `ON DELETE RESTRICT` — mensagem diferente, codigo
 * diferente. Medido no proprio banco, e nao deduzido: so o 23503 deixava o
 * erro cru vazar para a tela.
 */
const VINCULO = new Set(["23503", "23001"]);

export async function acaoExcluir(slug: string, id: string) {
  await exigirAdmin();
  const tabela = exigirTabela(slug);

  try {
    await excluir(tabela, id);
  } catch (erro) {
    /*
     * Nao é falha do sistema: é o banco cumprindo o `ON DELETE RESTRICT`, que
     * existe justamente para um clique em "Excluir" no usuario nao levar junto
     * contratos e recebimentos dele. A tela precisa dizer isso em portugues, e
     * nao mostrar a excecao do Postgres.
     *
     * O `redirect` mora aqui no `catch`, e nao dentro do `try`: ele funciona
     * lancando, e la seria engolido por este mesmo bloco.
     */
    const codigo = (erro as { code?: string }).code;
    if (!codigo || !VINCULO.has(codigo)) throw erro;

    const onde = (erro as { table?: string }).table ?? "outra tabela";
    redirect(`/admin/${slug}?erro=vinculo&onde=${encodeURIComponent(onde)}`);
  }

  await registrar({ acao: "excluir", alvoTabela: tabela.tabela, alvoId: id });

  revalidatePath(`/admin/${slug}`);
}
