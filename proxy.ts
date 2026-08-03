import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, conferirCookie } from "@/lib/sessao";

/*
 * Guarda de entrada do app: sem sessao de pé, qualquer rota manda para /login.
 *
 * No Next 16 este arquivo se chama `proxy.ts` — o antigo `middleware.ts` foi
 * renomeado e agora roda no runtime Node, o que permite usar o `node:crypto`
 * que confere a assinatura do cookie.
 *
 * A checagem aqui é *otimista*, no vocabulario dos docs: le so o cookie, nunca
 * o banco, porque roda em toda requisicao, inclusive nos prefetch de navegacao.
 * Ela protege a navegacao, e nao os dados — por isso cada pagina chama
 * `exigirSessao()` e cada Server Action tem a guarda propria. Server Action, em
 * particular, é um POST na rota onde ela vive: mexer no `matcher` abaixo
 * mudaria, de tabela, quais acoes o proxy cobre.
 */

/**
 * Rotas que precisam ficar de fora, senao ninguem consegue entrar.
 *
 * `/download` entra aqui por outro motivo: ela é feita para ser mandada por
 * mensagem a quem ainda nao instalou nada. Exigir sessao seria pedir que a
 * pessoa entre justamente no que ela ainda vai instalar — e nao ha dado de
 * ninguem ali, só o convite e as instrucoes.
 */
const PUBLICAS = ["/login", "/admin/login", "/download"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const bruto = request.cookies.get(COOKIE_SESSAO)?.value;
  if (conferirCookie(bruto)) return NextResponse.next();

  // O /admin tem tela de entrada propria; o resto do app usa a do portal.
  const paraAdmin = pathname.startsWith("/admin");
  const destino = new URL(paraAdmin ? "/admin/login" : "/login", request.url);

  if (!paraAdmin) {
    // Volta para onde a pessoa tentava ir depois de entrar.
    destino.searchParams.set("proximo", pathname + search);
    // Cookie presente mas recusado = sessao vencida (ou adulterada). Sem cookie
    // nenhum é so alguem que ainda nao entrou, e nao ha aviso a dar.
    if (bruto) destino.searchParams.set("expirou", "1");
  }

  return NextResponse.redirect(destino);
}

export const config = {
  /*
   * Roda em tudo, menos nos arquivos que a tela de login precisa carregar e nos
   * internos do Next. Sem esta excecao a guarda barraria o proprio CSS e o logo
   * do login. Note que `public/documentos` NAO esta na lista: os contratos ficam
   * atras da sessao, como o resto.
   *
   * `manifest.webmanifest` e `sw.js` tambem ficam de fora, e nao por descuido:
   * o navegador busca os dois *sem* as credenciais da pagina — o service worker
   * é registrado num contexto proprio — e a guarda os desviava para o login. O
   * resultado era um app que nunca aparecia como instalavel e um push que nunca
   * chegava a se inscrever. Nao ha o que proteger neles: um diz o nome e as
   * cores do app, o outro é o mesmo arquivo publico para todo mundo.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|ARI.png|logo.png|icons/|manifest.webmanifest|sw.js).*)",
  ],
};
