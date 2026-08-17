import Link from "next/link";
import { BotaoSimulador } from "./botao-simulador";
import { IconeInvestimento, IconeObra } from "./icones";

/**
 * A barra de secoes do rodape — só no mobile.
 *
 * Era um componente de abas, com painel escondido e estado no cliente. Virou
 * navegacao de verdade quando as obras ganharam rota propria: agora cada secao
 * é um endereco, entao isto é `<Link>` e `aria-current`, sem estado nenhum — e
 * por isso roda inteiro no servidor.
 *
 * A fila de abas que aparecia no topo a partir do desktop saiu daqui: quem faz
 * esse papel agora é a `BarraLateral`, e manter as duas seria a mesma navegacao
 * em dois lugares da mesma tela.
 */
const SECOES = [
  { href: "/portal", rotulo: "Meus aportes", Icone: IconeInvestimento },
  // Predio, e nao o documento que estava aqui: a secao é a obra em si — fotos,
  // etapas, ficha —, e o papel é so uma parte dela, atras do botao flutuante.
  { href: "/obras", rotulo: "Obras", Icone: IconeObra },
] as const;

export function Navegacao({
  ativo,
}: {
  ativo: "/portal" | "/obras" | "/simulador";
}) {
  return (
    /* Barra rente as bordas. A margem de seguranca do aparelho entra como
       padding, e nao margem — o branco deve ir ate o fim da tela e é o conteudo
       que precisa parar antes da faixa do gesto. */
      <nav
        aria-label="Secoes do portal"
        // Sem `overflow-hidden`: o botao do meio cruza a borda de cima e seria
        // cortado pela metade. Quem cuida de nao vazar pelo canto arredondado é
        // a marca da secao ativa, que é curta e centrada.
        // Nao acrescente `relative` aqui: `fixed` ja serve de ancoradouro para
        // os filhos absolutos, e as duas classes disputam a mesma propriedade
        // `position` — a que vencer pela ordem do CSS tira a barra do lugar.
        className="fixed inset-x-0 bottom-0 z-40 animate-surgir rounded-t-2xl border-t border-tinta/10 bg-white shadow-[0_-4px_16px_-6px_rgba(0,20,73,0.18)] md:hidden [animation-delay:240ms]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center">
          {SECOES.map(({ href, rotulo, Icone }, indice) => {
            const selecionada = href === ativo;
            return (
              <div key={href} className="contents">
                {/* Fatia vazia no meio da fila: guarda o lugar do botao do
                    simulador, que mora fora deste flex. Sem ela as duas secoes
                    se encontrariam justamente sob ele. */}
                {indice === Math.floor(SECOES.length / 2) && (
                  <span aria-hidden className="w-16 shrink-0" />
                )}

                <Link
                  href={href}
                  aria-current={selecionada ? "page" : undefined}
                  // O tamanho e a espessura do traco entram por aqui, mirando o
                  // svg de dentro: o mesmo icone é reaproveitado nas abas do
                  // topo, e um seletor descendente vence tanto as classes de
                  // tamanho dele quanto o `stroke-width` do SVG.
                  // O icone da secao aberta vai em ouro. A marca de cima
                  // continua marinho: é ela que carrega o contraste do estado
                  // ativo, e o ouro sobre branco rende 1,5:1 — bom de ver,
                  // fraco de ler.
                  className={`relative flex flex-1 items-center justify-center py-2.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azul [&_svg]:h-7 [&_svg]:w-7 [&_svg]:stroke-[2.5] ${
                    selecionada
                      ? "text-ouro"
                      : "text-neutral-400 hover:text-marinho/70"
                  }`}
                >
                  {/* Sem rotulo visivel, a secao aberta precisa de marca
                      propria: so a diferenca de cor do icone seria fraca
                      demais. Curta e centrada para nao alcancar o canto
                      arredondado da barra, que nao recorta os filhos. */}
                  {selecionada && (
                    <span
                      aria-hidden
                      className="absolute top-0 left-1/2 h-1 w-8 -translate-x-1/2 rounded-b-full bg-marinho"
                    />
                  )}
                  <Icone />
                  {/* O rotulo sai da tela, nao da acessibilidade: sem ele o
                      link ficaria sem nome para leitor de tela. */}
                  <span className="sr-only">{rotulo}</span>
                </Link>
              </div>
            );
          })}
        </div>

        {/*
         * Ancorado no proprio `<nav>`, e nao numa fatia da fila: aqui o `top`
         * negativo conta a partir da borda de cima da barra, entao `-top-8`
         * significa literalmente 32px acima dela — sobram 24px dentro.
         */}
        <BotaoSimulador
          // Ele tambem é uma secao: aberta, o botao precisa dizer isso, senao é
          // a unica peca da barra que nao responde a onde a pessoa esta.
          ativo={ativo === "/simulador"}
          className="absolute -top-8 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-white text-tinta shadow-[0_6px_16px_-4px_rgba(0,20,73,0.35)] transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
        />
    </nav>
  );
}
