/**
 * O cabecalho de cada tela do painel.
 *
 * Existe para uma coisa que estava errada: em Recebimentos e Notificacoes o
 * `<h1>` da secao aparecia *depois* dos paineis de lancar e de enviar, entao a
 * tela abria com um `<h2>` e o titulo dela vinha no meio da rolagem. Para quem
 * le com leitor de tela isso é um documento sem cabeca; para quem le com os
 * olhos, é chegar numa pagina sem saber onde esta.
 *
 * Agora toda tela abre por aqui, e o que era titulo virou o nome do que vem
 * abaixo. O `acessorio` é o canto direito — os botoes do que a tela faz.
 *
 * Nao ha frase de apoio, e nao é esquecimento: havia uma por tela, e ela
 * repetia o titulo com outras palavras — "Fotos da obra" embaixo de "Imagens".
 * Quem administra abre a tela sabendo o que ela é; a linha só empurrava o
 * conteudo para baixo.
 *
 * O que ha acima do titulo é o **grupo** da coluna da esquerda — "Investimento",
 * "Obra". Uma palavra, em cinza: no celular a coluna vira um trilho de icones e
 * os titulos dos grupos somem, e é aqui que a pessoa continua sabendo em que
 * parte do painel esta.
 */
export function CabecalhoDaSecao({
  titulo,
  grupo,
  acessorio,
}: {
  titulo: string;
  grupo?: string;
  acessorio?: React.ReactNode;
}) {
  return (
    <header className="flex animate-surgir flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-zinc-200 pb-5">
      <div className="min-w-0">
        {grupo && (
          <p className="text-[0.6875rem] font-semibold tracking-wider text-neutral-400 uppercase">
            {grupo}
          </p>
        )}
        <h1 className="min-w-0 text-2xl font-bold tracking-tight text-tinta">
          {titulo}
        </h1>
      </div>

      {acessorio && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {acessorio}
        </div>
      )}
    </header>
  );
}

/**
 * As duas formas de botao do topo das telas, num lugar só.
 *
 * Estavam escritas por extenso em cada `Link` — seis copias da mesma linha de
 * classes, que ja tinham divergido no `padding` e no anel de foco.
 */
export const BOTAO_PRIMARIO =
  "inline-flex items-center gap-1.5 rounded-xl bg-marinho px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2";

export const BOTAO_SECUNDARIO =
  "inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-700 transition-colors duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul";
