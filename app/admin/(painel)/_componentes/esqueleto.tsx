/**
 * As pecas cinzas que ocupam o lugar do conteudo enquanto ele nao chega.
 *
 * Server Components: sao \`div\` com fundo e animacao, nada mais. Um esqueleto que
 * precisa de JavaScript para aparecer chegaria depois do conteudo que ele
 * deveria anunciar.
 *
 * Elas existem para o `loading.tsx` de cada rota do painel. Sem ele, toda
 * navegacao no /admin espera o servidor terminar as consultas antes de pintar
 * qualquer coisa — as paginas sao `force-dynamic`, entao nao ha nada em cache
 * para mostrar no lugar. Com ele, a moldura aparece na hora e o conteudo entra
 * quando fica pronto.
 */

/** Um retangulo cinza. `className` decide o tamanho. */
export function Barra({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-zinc-200/70 ${className}`}
    />
  );
}

/** A moldura de um bloco do painel, com o titulo e uma area de conteudo. */
export function BlocoVazio({
  altura = "h-64",
  titulo = "w-40",
}: {
  /** Altura da area de conteudo — a do grafico que vai entrar ali. */
  altura?: string;
  /** Largura da barra que faz as vezes do titulo. */
  titulo?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <Barra className={`h-4 ${titulo}`} />
      <Barra className="mt-2 h-3 w-64" />
      <Barra className={`mt-5 w-full ${altura}`} />
    </div>
  );
}
