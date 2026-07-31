"use server";

import { redirect } from "next/navigation";
import { abrirSessao, autenticar, fecharSessao, inicioDe } from "@/lib/auth";

/**
 * Para onde ir depois de entrar.
 *
 * O `proximo` vem da URL, ou seja, de fora — quem manda o link escolhe o valor.
 * Sem esta peneira, `?proximo=https://outro-site` viraria um redirecionamento
 * aberto: a pessoa entraria no nosso login e sairia no site de quem montou o
 * link. Aceito so caminho interno: uma barra no inicio e nada de `//`, que o
 * navegador leria como outro dominio.
 */
function destinoSeguro(proximo: string, tipo: string): string {
  const interno = proximo.startsWith("/") && !proximo.startsWith("//");
  return interno ? proximo : inicioDe(tipo);
}

/**
 * O `email` volta junto do erro de proposito: o React limpa o formulario
 * assim que a acao termina, e sem devolve-lo a pessoa reescreveria o e-mail a
 * cada tentativa. A senha nunca volta.
 */
export type EstadoDoLogin = { erro: string; email: string } | null;

export async function entrar(
  _anterior: EstadoDoLogin,
  dados: FormData,
): Promise<EstadoDoLogin> {
  const email = String(dados.get("email") ?? "");
  const senha = String(dados.get("senha") ?? "");
  const proximo = String(dados.get("proximo") ?? "");

  const sessao = await autenticar(email, senha);
  /*
   * Mensagem unica para senha errada, e-mail inexistente e conta sem senha
   * definida: dizer qual dos casos ocorreu entrega quais e-mails existem no
   * cadastro.
   */
  if (!sessao) return { erro: "E-mail ou senha invalidos.", email };

  await abrirSessao(sessao);
  redirect(destinoSeguro(proximo, sessao.tipo));
}

export async function sair() {
  await fecharSessao();
  redirect("/login");
}
