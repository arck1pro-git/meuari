"use client";

import type { EventoDoHistorico, Posicao } from "@/lib/portal/calculo";
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { GraficoSaldo } from "./grafico-saldo";
import { IconeSetaDireita } from "./icones";
import { Cartao } from "./ui";

export function AbaAporte({
  posicao,
  historico,
}: {
  posicao: Posicao;
  historico: EventoDoHistorico[];
}) {
  /*
   * O historico chega com aportes e mudancas de participacao como eventos
   * irmaos. Aqui o aporte vira o item e a participacao passa a ser detalhe
   * dele: para cada aporte, a faixa vigente na data, mais a troca que tenha
   * acontecido naquele mesmo dia — que é o que rende o "de x para y".
   */
  const taxas = historico.filter(
    (evento): evento is Extract<EventoDoHistorico, { tipo: "taxa" }> =>
      evento.tipo === "taxa",
  );

  const cartoes = historico
    .filter(
      (evento): evento is Extract<EventoDoHistorico, { tipo: "aporte" }> =>
        evento.tipo === "aporte",
    )
    .map((evento) => ({
      aporte: evento.aporte,
      // A ultima faixa que comecou ate a data do aporte — nao necessariamente
      // uma que tenha comecado nele.
      vigente: taxas.findLast((taxa) => taxa.data <= evento.data)?.taxa,
      // So conta como troca se havia faixa anterior; a primeira é a contratada.
      trocaNoDia: taxas.find(
        (taxa) => taxa.data === evento.data && taxa.taxaAnterior,
      ),
    }))
    // Do mais recente ao primeiro.
    .reverse();

  return (
    <div className="escalonar space-y-4">
      {/* Titulo e cartao num invólucro só: `escalonar` atrasa cada filho direto
          do container, e soltos aqui eles entrariam em tempos diferentes. */}
      <div>
        <h2 className="mb-5 text-base font-bold tracking-tight text-black">
          Meu ARI
        </h2>
        <Cartao tom="escuro">
          <GraficoSaldo serie={posicao.serie} tom="escuro" />
        </Cartao>
      </div>

      {/* A ancora passa para o invólucro, e nao fica no cartao: assim a rolagem
          para nele com o titulo visivel, e nao logo abaixo dele. O `scroll-mt`
          vem junto, porque era o `Cartao` quem o trazia. */}
      <div id="historico" className="mt-10 scroll-mt-24">
        <h2 className="mb-5 text-base font-bold tracking-tight text-black">
          Historico
        </h2>
        {/* Um cartao por aporte. A lista continua sendo lista para quem le
            por audio — a mudanca é de forma, nao de semantica. */}
        <ol className="space-y-3">
          {cartoes.map(({ aporte, vigente, trocaNoDia }) => (
            <li key={aporte.id}>
              <Cartao>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-lg font-semibold tabular-nums text-black">
                    {formatarMoeda(aporte.valor)}
                  </p>
                  {/* `dateTime` carrega o ISO: com a data em numeros, `10/03`
                      é ambiguo entre dia e mes para quem le por maquina. */}
                  <time
                    dateTime={aporte.data}
                    className="shrink-0 text-xs text-neutral-500 tabular-nums"
                  >
                    {formatarData(aporte.data)}
                  </time>
                </div>

                <p className="mt-1 text-sm text-neutral-500">{aporte.origem}</p>

                {/* Mesma divisao do cartao de saldo: dado a esquerda, atalho a
                    direita. O `min-h` segura a linha quando falta a
                    participacao, para o atalho nao subir de altura. */}
                <div className="mt-4 flex min-h-6 items-center justify-between gap-3">
                  {vigente ? (
                    <p className="text-sm text-neutral-600">
                      Participacao{" "}
                      <span className="font-semibold text-black">
                        {formatarPercentual(vigente.taxaMensal)} ao mês
                      </span>
                    </p>
                  ) : (
                    <span />
                  )}

                  {aporte.contratoArquivo && (
                    <a
                      href={aporte.contratoArquivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
                    >
                      Contrato
                      <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </a>
                  )}
                </div>

                {trocaNoDia?.taxaAnterior && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600 marker:text-marinho">
                    <li>
                      <span className="tabular-nums">
                        {formatarPercentual(trocaNoDia.taxaAnterior.taxaMensal)}
                      </span>
                      <span aria-hidden className="mx-1.5 text-neutral-400">
                        →
                      </span>
                      <span className="sr-only">passou para </span>
                      <span className="font-semibold tabular-nums text-black">
                        {formatarPercentual(trocaNoDia.taxa.taxaMensal)}
                      </span>
                    </li>
                  </ul>
                )}
              </Cartao>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
