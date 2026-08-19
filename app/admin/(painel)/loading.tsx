import { Barra, BlocoVazio } from "./_componentes/esqueleto";

/**
 * O painel enquanto as consultas correm.
 *
 * O dashboard soma a carteira inteira, apura a posicao de cada contrato `final`
 * e monta quatro series — é a tela mais cara do /admin. Sem este arquivo, clicar
 * em "Dashboard" na coluna deixava a tela anterior congelada ate tudo terminar,
 * e a navegacao parecia travada.
 *
 * A forma imita a da tela real: faixa de indicadores, curva larga, duas roscas,
 * bloco do investidor. Esqueleto que nao tem a forma do que vem depois troca a
 * espera por um salto — o conteudo chega e reorganiza tudo.
 */
export default function Carregando() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
        <Barra className="h-6 w-32" />
      </div>

      {/* Captação */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
        <Barra className="h-3 w-24" />
        <Barra className="mt-3 h-8 w-64" />
        <Barra className="mt-4 h-2.5 w-full" />
      </div>

      {/* A faixa de quatro indicadores */}
      <div className="mt-4 grid grid-cols-2 divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-4 sm:p-5">
            <Barra className="h-3 w-20" />
            <Barra className="mt-2 h-6 w-28" />
            <Barra className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <BlocoVazio altura="h-64" titulo="w-44" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BlocoVazio altura="h-56" titulo="w-40" />
        <BlocoVazio altura="h-56" titulo="w-48" />
      </div>

      <div className="mt-4">
        <BlocoVazio altura="h-64" titulo="w-40" />
      </div>
    </>
  );
}
