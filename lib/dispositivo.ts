import "server-only";
import { headers } from "next/headers";
import { userAgent } from "next/server";

/**
 * De que aparelho e de onde veio esta requisicao.
 *
 * Modulo proprio porque dois lugares perguntam a mesma coisa: o registro de
 * acesso (`lib/acessos.ts`), que grava em colunas, e a auditoria
 * (`lib/auditoria.ts`), que guarda no `detalhe`. Duplicar a leitura era garantir
 * que as duas divergissem no primeiro cabecalho novo.
 *
 * **Tudo aqui é palpite informado, e nenhum campo é confiavel para decidir
 * nada.** O `user-agent` é enviado pelo navegador e pode dizer qualquer coisa;
 * a geolocalizacao por IP erra cidade com frequencia e some atras de VPN. Serve
 * para ler tendencia — "a maioria entra pelo celular", "quase todo acesso vem de
 * Goiania" — e nunca como prova de quem estava onde.
 */

export type ContextoDaRequisicao = {
  /** `mobile`, `tablet`, `desktop` — ou o que o UA disser, quando for outro. */
  dispositivo: string | null;
  sistema: string | null;
  navegador: string | null;
  ip: string | null;
  cidade: string | null;
  regiao: string | null;
  pais: string | null;
  /** Requisicao de robo conhecido. Ver a nota em `lib/acessos.ts`. */
  robo: boolean;
};

/**
 * O `x-vercel-ip-city` chega percent-encoded — "Goi%C3%A2nia".
 *
 * Sem o decode a cidade aparece assim mesmo na tela do painel. `try` porque um
 * `%` solto no cabecalho faz o `decodeURIComponent` estourar, e um nome de
 * cidade malformado nao pode derrubar o registro.
 */
function texto(bruto: string | null): string | null {
  if (!bruto) return null;
  try {
    return decodeURIComponent(bruto) || null;
  } catch {
    return bruto;
  }
}

export async function contextoDaRequisicao(): Promise<ContextoDaRequisicao> {
  const cabecalhos = await headers();

  /*
   * `userAgent()` do Next em vez de uma expressao regular escrita a mao: ele
   * traz o `ua-parser` junto e ja separa aparelho, sistema e navegador — que é
   * o mesmo trabalho que a regex faria pior, e sem cobrir o iPad.
   *
   * `device.type` vem `undefined` para computador (o parser só nomeia o que nao
   * é o padrao), entao a ausencia é que significa desktop.
   */
  const { device, os, browser, isBot } = userAgent({ headers: cabecalhos });

  return {
    dispositivo: device.type ?? "desktop",
    sistema: os.name ?? null,
    navegador: browser.name ?? null,

    // O mesmo primeiro item da cadeia que `lib/limite.ts` usa: o resto sao os
    // proxies pelos quais a requisicao passou.
    ip: cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,

    /*
     * Preenchidos pela hospedagem, na borda, antes de a requisicao chegar aqui.
     * Em desenvolvimento nao existem e ficam nulos — nao ha o que consertar
     * nisso, e a tela do painel diz "—" no lugar.
     *
     * O `request.geo` do Next foi removido na versao 15: hoje isto é cabecalho,
     * e sai de graca sem nenhum servico de geolocalizacao a contratar.
     */
    cidade: texto(cabecalhos.get("x-vercel-ip-city")),
    regiao: texto(cabecalhos.get("x-vercel-ip-country-region")),
    pais: texto(cabecalhos.get("x-vercel-ip-country")),

    robo: isBot,
  };
}
