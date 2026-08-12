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

/**
 * Rotas de maquina: elas nao tem sessao porque nao ha pessoa do outro lado.
 *
 * Quem chama é o n8n, no horario do agendamento, e a guarda dela é uma chave
 * combinada no cabecalho — conferida dentro da propria rota, com comparacao de
 * tempo constante. Mandar isso para o /login daria um redirecionamento que o
 * n8n leria como sucesso, e o aviso nunca sairia.
 */
const DE_MAQUINA = ["/api/"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (DE_MAQUINA.some((p) => pathname.startsWith(p))) {
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
  /*
   * `mao2.png` entrou aqui pelo mesmo motivo do `logo.png`: ele aparece na tela
   * de login, que é publica. E ha uma sutileza que custou um diagnostico — o
   * otimizador de imagem do Next busca o arquivo original no *nosso proprio
   * servidor*, entao a guarda o desviava para o login e o `/_next/image`
   * respondia "isn't a valid image", com 400, para uma foto que existia.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|ARI.png|logo.png|mao2.png|icons/|manifest.webmanifest|sw.js).*)",
  ],
};
