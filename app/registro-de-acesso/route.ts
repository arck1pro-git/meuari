import { NextResponse, after, type NextRequest } from "next/server";
import { encerrarAcesso, registrarAcesso } from "@/lib/acessos";
import { lerSessao } from "@/lib/sessao";

/**
 * Para onde o portal avisa que uma tela foi aberta — e, depois, por quanto
 * tempo ela ficou.
 *
 * **Fora de `/api/`, e isso importa.** Aquele prefixo esta na lista `DE_MAQUINA`
 * do `proxy.ts`, que existe para o n8n chegar sem sessao; uma rota de telemetria
 * ali nasceria aberta para qualquer um. Aqui ela fica dentro do `matcher`
 * normal, entao a guarda do proxy ja barra quem nao tem cookie, e a sessao é
 * conferida de novo abaixo.
 *
 * **Rota, e nao Server Action**, que é o padrao do resto do app. Duas razoes: a
 * saida da pagina é avisada por `navigator.sendBeacon`, que só sabe fazer um
 * POST simples e nao tem como invocar uma acao; e uma Server Action revalida o
 * cache do roteador na volta, o que faria cada navegacao recarregar dados a toa.
 *
 * Os dois envios entram pela mesma porta, distinguidos pelo corpo: com `rota` é
 * uma tela aberta, com `id` é o tempo dela. Duas rotas para dois `insert`/
 * `update` de quatro linhas seria arquivo a mais sem nada em troca.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  /*
   * `lerSessao` e nao `sessaoValida`: esta é a chamada mais frequente do app —
   * uma por tela aberta — e a segunda faria uma consulta ao banco a cada uma
   * para conferir se a sessao foi revogada.
   *
   * O que se perde com isso é pequeno e vale medir contra o custo: quem clicou
   * em "sair de todos os aparelhos" continuaria conseguindo *registrar visita*
   * ate o cookie vencer. Ver as telas, nao — cada pagina passa por
   * `exigirSessao()`, que confere no banco, e o registro parte de dentro da
   * pagina ja renderizada. Na pratica nao ha o que gravar.
   */
  const sessao = await lerSessao();
  if (!sessao) {
    // Sem corpo: quem chegou sem sessao nao tem nada a saber daqui.
    return new NextResponse(null, { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  /*
   * O tempo de uma tela: chega por `sendBeacon`, com a aba ja saindo.
   *
   * `after()` para o `update` nao segurar a resposta. O navegador esta se
   * desfazendo da pagina neste instante; devolver o 204 na hora e escrever
   * depois é exatamente o caso que aquela funcao existe para atender.
   */
  if (typeof corpo.id === "string") {
    after(() => encerrarAcesso(sessao, { id: corpo.id, ms: corpo.ms }));
    return new NextResponse(null, { status: 204 });
  }

  /*
   * Uma tela aberta. Aqui a gravacao é aguardada, e nao adiada: o id que ela
   * devolve é o que o navegador guarda para, na saida, dizer quanto tempo
   * ficou. Sem ele nao ha o que reportar depois.
   */
  const id = await registrarAcesso(sessao, {
    rota: corpo.rota,
    largura: corpo.largura,
    standalone: corpo.standalone,
  });

  // `id: null` é resposta normal, e nao falha: cookie antigo sem `sid` ou rota
  // recusada. O cliente simplesmente nao tem o que reportar depois. Visita
  // repetida em poucos segundos devolve o id da linha que ja existe — o tempo
  // continua sendo anotado no lugar certo.
  return NextResponse.json({ id });
}
