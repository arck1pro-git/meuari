"use server";

import { redirect } from "next/navigation";
import { abrirSessao, autenticar, fecharSessao, inicioDe } from "@/lib/auth";
import { registrar } from "@/lib/auditoria";
import { consultar } from "@/lib/db";
import { lerSessao } from "@/lib/sessao";
import { emMinutos, limparTentativas, podeTentar } from "@/lib/limite";

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

  /*
   * O freio vem antes do `autenticar`, e nao depois: é justamente o custo do
   * `scrypt` que se quer evitar pagar num laco de tentativas.
   */
  const { liberado, faltamSegundos } = await podeTentar(email);
  if (!liberado) {
    // Registrado tambem: sem isto, uma onda de tentativas some do rastro
    // justamente a partir do momento em que o freio comeca a agir.
    await registrar({
      acao: "login_recusado",
      detalhe: { email, motivo: "freio de tentativas" },
    });
    return {
      erro: `Muitas tentativas. Tente de novo em ${emMinutos(faltamSegundos)} min.`,
      email,
    };
  }

  const sessao = await autenticar(email, senha);
  /*
   * Mensagem unica para senha errada, e-mail inexistente e conta sem senha
   * definida: dizer qual dos casos ocorreu entrega quais e-mails existem no
   * cadastro.
   */
  if (!sessao) {
    await registrar({ acao: "login_recusado", detalhe: { email } });
    return { erro: "E-mail ou senha invalidos.", email };
  }

  // Entrou: o balde zera, senao quem erra quatro vezes e acerta na quinta
  // ficaria a um erro do bloqueio pelos proximos dez minutos.
  await limparTentativas(email);

  await abrirSessao(sessao);
  await registrar({
    acao: "login",
    usuario: { id: sessao.id, nome: sessao.nome },
  });
  redirect(destinoSeguro(proximo, sessao.tipo));
}

export async function sair() {
  // Antes de fechar: depois dela nao ha sessao para dizer quem saiu.
  await registrar({ acao: "logout" });
  await fecharSessao();
  redirect("/login");
}

/**
 * Encerra a sessao deste aparelho e a de todos os outros.
 *
 * O cookie nao é guardado em lugar nenhum, entao nao ha lista de sessoes para
 * percorrer. O que existe é um contador por usuario: subir o contador faz todo
 * cookie emitido antes deixar de valer, porque `exigirSessao` compara a versao
 * do cookie com a do banco a cada pagina.
 *
 * O efeito nas outras abas nao é instantaneo — ele aparece na proxima
 * navegacao delas, que é quando a comparacao acontece.
 */
export async function sairDeTodos() {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");

  await consultar(
    "update usuarios set sessao_versao = sessao_versao + 1 where id = $1",
    [sessao.id],
  );

  await registrar({
    acao: "logout",
    detalhe: { alcance: "todos os aparelhos" },
    usuario: { id: sessao.id, nome: sessao.nome },
  });

  await fecharSessao();
  redirect("/login");
}
