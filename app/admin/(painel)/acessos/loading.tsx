import { Barra, BlocoVazio } from "../_componentes/esqueleto";

/**
 * A tela de Acessos enquanto as seis consultas correm.
 *
 * Ela agrupa a tabela por sessao cinco vezes — resumo, aparelho, secao, hora e
 * a lista —, e no periodo "Tudo" isso varre a tabela inteira. Sem este arquivo,
 * cada troca de filtro deixaria a tela anterior congelada ate tudo terminar, e
 * quem clicasse em "30 dias" acharia que o botao nao respondeu.
 *
 * A forma imita a da tela real: barra de filtros, faixa de quatro indicadores,
 * grafico largo, dois blocos lado a lado e a tabela. Esqueleto sem a forma do
 * que vem depois troca a espera por um salto.
 */
export default function Carregando() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
        <Barra className="h-6 w-28" />
      </div>

      {/* A barra de filtros. Ela é a primeira coisa a aparecer na tela real, e
          continua no lugar entre uma consulta e outra — aqui ela é cinza só na
          primeira visita. */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3">
        <Barra className="h-8 w-64" />
        <Barra className="h-8 w-40" />
        <Barra className="h-8 w-56" />
      </div>

      <div className="mt-4 grid grid-cols-2 divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-4 sm:p-5">
            <Barra className="h-3 w-20" />
            <Barra className="mt-2 h-6 w-24" />
            <Barra className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <BlocoVazio altura="h-56" titulo="w-36" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BlocoVazio altura="h-48" titulo="w-32" />
        <BlocoVazio altura="h-48" titulo="w-32" />
      </div>

      <div className="mt-4">
        <BlocoVazio altura="h-72" titulo="w-24" />
      </div>
    </>
  );
}
