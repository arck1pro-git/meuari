import { Barra } from "../_componentes/esqueleto";

/**
 * Uma tabela do painel enquanto a consulta corre.
 *
 * O titulo nao aparece aqui, e nao por esquecimento: o nome da tabela vem do
 * parametro da rota, e o esqueleto nao o recebe. Uma barra cinza no lugar dele é
 * mais honesta do que adivinhar — e o nome ja esta em destaque na coluna da
 * esquerda, que nao pisca durante a navegacao.
 *
 * A forma acompanha a tela: grupo e titulo a esquerda, o botao de criar a
 * direita, a barra de busca e a tabela. Esqueleto com outra forma troca a
 * espera por um salto quando o conteudo chega.
 */
export default function Carregando() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <Barra className="h-2.5 w-20" />
          <Barra className="mt-2 h-7 w-44" />
        </div>
        <Barra className="h-9 w-36 rounded-xl" />
      </div>

      {/* A barra de busca e a contagem. */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Barra className="h-9 w-full max-w-sm rounded-xl" />
        <Barra className="h-3 w-20" />
      </div>

      {/* A listagem: cabecalho e algumas linhas. Seis porque é o que cabe numa
          tela sem rolar — mais que isso seria desenhar um carregamento maior do
          que a espera. */}
      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 py-3.5">
          <Barra className="h-2.5 w-1/2" />
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
