import type { Etapa } from "@/lib/portal/dados";
import { IconeConfere } from "../../portal/_componentes/icones";
import { DESCRICAO_DO_GRUPO, porGrupo } from "./grupos";

/**
 * Os projetos em quadros, um por frente, lado a lado.
 *
 * Era uma lista unica de onze linhas, com regua de fases e barra em cada uma.
 * Virou tres colunas que se arrastam com o dedo: cada frente cabe inteira num
 * relance, e comparar duas é olhar de uma coluna para a vizinha em vez de rolar
 * a tela.
 *
 * A rolagem é a do proprio navegador — `snap` para a coluna parar no lugar,
 * `overscroll-x-contain` para o arraste no fim nao virar o gesto de "voltar".
 * Nada de `pointermove` escrito a mao: assim o toque tem a inercia do sistema, e
 * o trackpad, a roda do mouse e o teclado funcionam de graca.
 */

/*
 * Preto de verdade — `text-black`, e nao a `tinta` da marca — no titulo do
 * quadro, no nome do projeto e na porcentagem. É o mesmo preto dos titulos do
 * `/portal`; aqui ele vale para a linha inteira, que é uma lista para varrer
 * com o olho e nao um texto para ler.
 *
 * A porcentagem ja foi tres cores — verde no que fechou, azul no meio, ambar no
 * que atrasou —, e com onze projetos viravam um semaforo: o olho pulava de cor
 * em cor e parava de ler a coluna. O que fechou continua marcado, mas pelo
 * confere ao lado do nome, que é um sinal só e nao um codigo de cores.
 */

export function QuadrosDaObra({ etapas }: { etapas: Etapa[] }) {
  if (etapas.length === 0) {
    return (
      <p className="sombra-cartao rounded-[20px] bg-white px-6 py-10 text-center text-sm text-neutral-500">
        O andamento dos projetos ainda não foi publicado.
      </p>
    );
  }

  const quadros = porGrupo(etapas);

  return (
    /*
     * Sangra ate a borda da tela: o `px` devolve o alinhamento do conteudo, e o
     * `-mx` deixa a coluna escorrer para fora quando arrastada. Sem isso a
     * ultima coluna encostaria numa parede invisivel antes da borda.
     */
    <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
      {quadros.map(({ grupo, etapas: doGrupo }) => (
        <section
          key={grupo}
          /*
           * Largura por porcentagem da tela, e nao fixa: no celular a coluna
           * ocupa 78% e a vizinha aparece pela beirada — é ela que diz que ha
           * mais para o lado. No desktop as tres cabem juntas.
           */
          className="sombra-cartao w-[78%] shrink-0 snap-start rounded-[20px] bg-white p-4 sm:w-[46%] lg:w-[calc((100%-2rem)/3)]"
        >
          <header className="mb-3.5 flex items-baseline justify-between gap-2 px-1">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold tracking-tight text-black">
                {grupo}
              </h3>
              <p className="mt-0.5 truncate text-[0.6875rem] text-neutral-500">
                {DESCRICAO_DO_GRUPO[grupo]}
              </p>
            </div>

            {/* Quantos projetos ha na frente — o contador de coluna que todo
                quadro tem, e que aqui evita contar linha a linha. */}
            <span className="shrink-0 rounded-full bg-tinta/[0.05] px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-neutral-500">
              {doGrupo.length}
            </span>
          </header>

          <ul className="grid grid-cols-1 gap-2">
            {doGrupo.map((etapa) => (
              <li
                key={etapa.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-tinta/[0.03] px-3.5 py-3 transition-colors duration-200 hover:bg-tinta/[0.05]"
              >
                <p className="flex min-w-0 items-center gap-1.5 text-sm text-black">
                  {/* O confere só no que fechou: um icone por linha viraria
                      ruido, e aqui ele marca a excecao. */}
                  {etapa.percentual >= 100 && (
                    <IconeConfere className="h-4 w-4 shrink-0 text-verde/80" />
                  )}
                  <span className="truncate">{etapa.nome}</span>
                </p>

                <span className="shrink-0 text-sm font-bold tabular-nums text-black">
                  {etapa.percentual.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
