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
 * abaixo. O `acessorio` é o canto direito — filtro, contagem, o que a tela
 * tiver.
 *
 * Nao ha frase de apoio, e nao é esquecimento: havia uma por tela, e ela
 * repetia o titulo com outras palavras — "Fotos da obra" embaixo de "Imagens".
 * Quem administra abre a tela sabendo o que ela é; a linha só empurrava o
 * conteudo para baixo.
 */
export function CabecalhoDaSecao({
  titulo,
  acessorio,
}: {
  titulo: string;
  acessorio?: React.ReactNode;
}) {
  return (
    // `items-center` porque o titulo virou uma linha só: com `items-end` o
    // filtro e a contagem do canto direito assentavam na base do texto e
    // subiam um fio acima dele.
    <header className="flex animate-surgir flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-zinc-200 pb-5">
      <h1 className="min-w-0 text-xl font-bold tracking-tight text-tinta">
        {titulo}
      </h1>

      {acessorio && (
        <div className="flex shrink-0 items-center gap-3">{acessorio}</div>
      )}
    </header>
  );
}

/**
 * A contagem de registros, em pastilha.
 *
 * Era texto solto ao lado do titulo — do mesmo tamanho e cor do resto, entao
 * lia como legenda. Fechado numa pastilha vira dado, que é o que ele é.
 */
export function Contagem({ total }: { total: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-neutral-500">
      <span className="font-bold tabular-nums text-tinta">{total}</span>
      {total === 1 ? "registro" : "registros"}
    </span>
  );
}
