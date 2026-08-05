import type { Etapa } from "@/lib/portal/dados";
import { IconeConfere } from "../../portal/_componentes/icones";

/**
 * O andamento dos projetos, por disciplina.
 *
 * Nao é percentual de obra: é a fase em que cada projeto esta, das quatro que o
 * fluxo tem. A barra corre sobre uma trilha dividida nessas quatro partes, e
 * onde ela para é o que se le.
 *
 * No banco continua um numero de 0 a 100, e nao uma coluna de fase: metade de
 * uma fase é informacao real (a incorporacao andou dentro do desenvolvimento
 * sem sair dele), e um enum perderia isso.
 */
const FASES = ["Viabilidade", "Desenv.", "Em aprovação", "Finalizado"] as const;

/**
 * A cor mora no numero, nao na barra.
 *
 * Onze barras coloridas lado a lado viram um grafico de pizza deitado: o olho
 * salta de cor em cor e nao le a coluna. Aqui a barra é neutra — tinta clara —
 * e só o que fechou ganha o verde, que é a excecao que vale marcar. O estagio
 * de cada projeto continua dito pela porcentagem, e é ela que carrega a cor.
 */
function cores(percentual: number): { barra: string; texto: string } {
  if (percentual >= 100) return { barra: "bg-verde/85", texto: "text-verde" };
  if (percentual >= 50) return { barra: "bg-tinta/30", texto: "text-azul" };
  return { barra: "bg-tinta/30", texto: "text-amber-700" };
}

export function Etapas({ etapas }: { etapas: Etapa[] }) {
  if (etapas.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        O andamento dos projetos ainda não foi publicado.
      </p>
    );
  }

  return (
    <>
      {/*
       * Tres colunas, e a do meio com largura fixa: é ela que faz as
       * porcentagens formarem uma coluna alinhada, em vez de cada uma parar num
       * lugar diferente conforme o tamanho do nome.
       *
       * A regua de fases some no celular — quatro rotulos em 300px sao quatro
       * rotulos ilegiveis. La a leitura é o numero mais a posicao da barra.
       */}
      <div className="mb-4 hidden sm:grid sm:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,2fr)] sm:items-center sm:gap-x-4">
        <span />
        <span />
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg">
          {FASES.map((fase) => (
            <span
              key={fase}
              className="bg-tinta/[0.035] px-2 py-1.5 text-center text-[0.625rem] leading-tight font-semibold tracking-wide text-neutral-500 uppercase"
            >
              {fase}
            </span>
          ))}
        </div>
      </div>

      {/* Divisor discreto entre os itens: o suficiente para separar as linhas
          sem virar uma grade desenhada. */}
      <ol className="divide-y divide-tinta/[0.06]">
        {etapas.map((etapa) => {
          const { barra, texto } = cores(etapa.percentual);

          return (
            <li
              key={etapa.id}
              className="py-3.5 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,2fr)] sm:items-center sm:gap-x-4"
            >
              {/* O confere só no que fechou: um icone por linha viraria ruido,
                  e aqui ele marca a excecao — o projeto que acabou. */}
              <p className="flex items-center gap-1.5 text-sm text-neutral-500">
                {etapa.percentual >= 100 && (
                  <IconeConfere className="h-4 w-4 shrink-0 text-verde/80" />
                )}
                {etapa.nome}
              </p>

              {/* No celular a porcentagem vai para a mesma linha do nome, à
                  direita; no desktop ela é a coluna do meio. `absolute` seria
                  mais curto e quebraria o alinhamento em nome de duas linhas. */}
              <p
                className={`-mt-5 text-right text-sm font-semibold tabular-nums sm:mt-0 ${texto}`}
              >
                {etapa.percentual.toFixed(0)}%
              </p>

              <div
                aria-hidden
                className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-tinta/[0.06] sm:mt-0"
              >
                <div
                  // A marca final entra por variavel; ver `barra-ate` no
                  // `globals.css`. Só transform anima fora da thread principal.
                  className={`barra-ate h-full origin-left rounded-full ${barra}`}
                  style={
                    {
                      "--preenchimento": etapa.percentual / 100,
                    } as React.CSSProperties
                  }
                />

                {/* As divisas das fases, por cima da barra. */}
                {[25, 50, 75].map((corte) => (
                  <span
                    key={corte}
                    className="absolute inset-y-0 w-px bg-white"
                    style={{ left: `${corte}%` }}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
