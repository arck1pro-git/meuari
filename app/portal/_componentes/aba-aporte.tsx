"use client";

import type { EventoDoHistorico, Posicao } from "@/lib/portal/calculo";
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { GraficoSaldo } from "./grafico-saldo";
import { Cartao } from "./ui";

export function AbaAporte({
  posicao,
  historico,
}: {
  posicao: Posicao;
  historico: EventoDoHistorico[];
}) {
  // Do mais recente ao primeiro. Copia antes de inverter: `reverse` muta, e o
  // array vem por prop.
  const linhaDoTempo = [...historico].reverse();

  return (
    <div className="escalonar space-y-4">
      <Cartao tom="escuro" titulo="Meu ARI">
        <GraficoSaldo serie={posicao.serie} tom="escuro" />
      </Cartao>

      <Cartao id="historico" titulo="Historico">
        <ol className="pt-1">
          {linhaDoTempo.map((evento, i) => (
            <li
              key={chaveDoEvento(evento)}
              className="relative flex gap-4 pb-7 last:pb-0"
            >
              {/*
               * Trilho ligando um marcador ao seguinte. Comeca no pé do
               * marcador (`top-4`) e passa 6px do fim do item (`-bottom-1.5`),
               * que é exatamente onde o proximo marcador comeca — sem isso
               * sobraria um vao entre o fim de um trecho e o inicio do outro.
               * Nao sai no ultimo item: seria um traco solto para lugar nenhum.
               */}
              {i < linhaDoTempo.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-4 -bottom-1.5 left-1 w-0.5 rounded-full bg-neutral-200"
                />
              )}

              {/* Cheio para aporte, vazado para taxa: o tipo do evento se le no
                  trilho, sem precisar do texto. */}
              <span
                aria-hidden
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  evento.tipo === "aporte"
                    ? "bg-marinho"
                    : "border-2 border-marinho/40 bg-white"
                }`}
              />

              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                <div className="min-w-0">
                <p className="text-sm font-medium text-tinta">
                  {evento.tipo === "aporte"
                    ? evento.aporte.origem
                    : evento.taxaAnterior
                      ? "Mudanca de participacao"
                      : "Participacao contratada"}
                </p>
                {/* `dateTime` carrega o ISO: com a data em numeros, `10/03` é
                    ambiguo entre dia e mes para quem le por maquina. */}
                <time
                  dateTime={evento.data}
                  className="mt-0.5 block text-xs text-neutral-500 tabular-nums"
                >
                  {formatarData(evento.data)}
                </time>
              </div>

              <p className="shrink-0 text-right text-base font-semibold tabular-nums text-tinta">
                {evento.tipo === "aporte" ? (
                  formatarMoeda(evento.aporte.valor)
                ) : evento.taxaAnterior ? (
                  <>
                    <span className="font-normal text-neutral-400">
                      {formatarPercentual(evento.taxaAnterior.taxaMensal)}
                    </span>
                    <span aria-hidden className="mx-1.5 text-neutral-300">
                      →
                    </span>
                    <span className="sr-only">passou para </span>
                    {formatarPercentual(evento.taxa.taxaMensal)}
                    <span className="font-normal text-neutral-500"> ao mês</span>
                  </>
                ) : (
                  <>
                    {formatarPercentual(evento.taxa.taxaMensal)}
                    <span className="font-normal text-neutral-500"> ao mês</span>
                  </>
                )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Cartao>
    </div>
  );
}

function chaveDoEvento(evento: EventoDoHistorico): string {
  return evento.tipo === "aporte" ? evento.aporte.id : evento.taxa.id;
}
