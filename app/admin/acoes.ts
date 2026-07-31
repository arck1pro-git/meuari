"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { autenticar, abrirSessao, fecharSessao, lerSessao } from "@/lib/auth";
import { atualizar, criar, excluir } from "@/lib/admin/crud";
import { acharTabela } from "@/lib/admin/tabelas";
import { assinarUpload } from "@/lib/storage";

/**
 * Toda acao passa por aqui antes de tocar no banco.
 *
 * A guarda do layout protege a *navegacao*, mas Server Action é um endpoint:
 * responde a POST direto, sem passar por layout nenhum. Sem esta checagem, um
 * investidor comum poderia chamar a acao e escrever no banco.
 */
async function exigirAdmin() {
  const sessao = await lerSessao();
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

  const sessao = await autenticar(email, senha);
  // Mensagem unica para credencial errada e usuario inexistente: dizer qual
  // dos dois falhou entrega quais e-mails existem.
  if (!sessao) return "E-mail ou senha invalidos.";
  if (sessao.tipo !== "administrador") return "Esta area é restrita.";

  await abrirSessao(sessao);
  redirect("/admin");
}

export async function sair() {
  await fecharSessao();
  redirect("/admin/login");
}

export async function acaoCriar(slug: string, dados: FormData) {
  await exigirAdmin();
  await criar(exigirTabela(slug), dados);
  revalidatePath(`/admin/${slug}`);
  redirect(`/admin/${slug}`);
}

export async function acaoAtualizar(
  slug: string,
  id: string,
  dados: FormData,
) {
  await exigirAdmin();
  await atualizar(exigirTabela(slug), id, dados);
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

  return assinarUpload(alvo.bucket, nomeArquivo);
}

export async function acaoExcluir(slug: string, id: string) {
  await exigirAdmin();
  await excluir(exigirTabela(slug), id);
  revalidatePath(`/admin/${slug}`);
}
