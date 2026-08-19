import { Barra } from "../_componentes/esqueleto";

/**
 * Uma tabela do painel enquanto a consulta corre.
 *
 * O titulo nao aparece aqui, e nao por esquecimento: o nome da tabela vem do
 * parametro da rota, e o esqueleto nao o recebe. Uma barra cinza no lugar dele é
 * mais honesta do que adivinhar — e o nome ja esta em destaque na coluna da
 * esquerda, que nao pisca durante a navegacao.
 */
export default function Carregando() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <Barra className="h-6 w-40" />
        <div className="flex gap-2">
          <Barra className="h-8 w-44" />
          <Barra className="h-8 w-28" />
        </div>
      </div>

      {/* A listagem: cabecalho e algumas linhas. Seis porque é o que cabe numa
          tela sem rolar — mais que isso seria desenhar um carregamento maior do
          que a espera. */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <Barra className="h-3 w-32" />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-zinc-100 px-4 py-4 last:border-b-0"
          >
            <Barra className="h-3.5 flex-1" />
            <Barra className="h-3.5 w-32" />
            <Barra className="h-3.5 w-24" />
            <Barra className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}
