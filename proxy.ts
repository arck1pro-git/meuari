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

/** Rotas que precisam ficar de fora, senao ninguem consegue entrar. */
const PUBLICAS = ["/login", "/admin/login"];

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
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ARI.png|icons/).*)"],
};
