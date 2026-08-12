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
 */
export function CabecalhoDaSecao({
  titulo,
  apoio,
  acessorio,
}: {
  titulo: string;
  apoio?: string;
  acessorio?: React.ReactNode;
}) {
  return (
    <header className="flex animate-surgir flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-tinta/[0.08] pb-5">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-tinta">
          {titulo}
        </h1>
        {apoio && (
          <p className="mt-1 text-sm leading-relaxed text-neutral-500">
            {apoio}
          </p>
        )}
      </div>

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
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-tinta/[0.08] bg-tinta/[0.03] px-3 py-1.5 text-xs text-neutral-500">
      <span className="font-bold tabular-nums text-tinta">{total}</span>
      {total === 1 ? "registro" : "registros"}
    </span>
  );
}
