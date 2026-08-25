"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ItemDoHistorico, MesDaPosicao } from "@/lib/portal/calculo";
import type { Recebimentos } from "@/lib/portal/recebimentos";
import { formatarMoeda } from "@/lib/portal/formato";
import { GraficoProgresso } from "./grafico-progresso";
import { GraficoRecebimentos } from "./grafico-recebimentos";
import { IconeSetaDireita } from "./icones";
import { ListaHistorico } from "./lista-historico";
import { Cartao } from "./ui";

/** Quantos aportes cabem no recorte do portal. O resto fica no "Ver tudo". */
const VISIVEIS = 3;

/**
 * Os recortes de tempo do grafico.
 *
 * `meses` conta creditos, e nao meses do calendario: o credito é mensal e cai
 * sempre no dia 17, entao os tres ultimos creditos sao os tres ultimos meses
 * com dinheiro. Contar pelo calendario traria o mes corrente vazio ate o dia
 * 17 e o recorte de tres meses mostraria duas barras.
 */
const PERIODOS = [
  // `Tudo` abre a fila por ser o padrao: o primeiro da esquerda é o que a
  // pessoa ja esta vendo quando o cartao aparece.
  { id: "tudo", rotulo: "Tudo", meses: null },
  { id: "3m", rotulo: "3 meses", meses: 3 },
  { id: "6m", rotulo: "6 meses", meses: 6 },
  { id: "ano", rotulo: "Neste ano", meses: null },
] as const;

type Periodo = (typeof PERIODOS)[number]["id"];

/**
 * O recorte vale para as duas series — os creditos do mensal e os meses da
 * posicao do final —, porque as duas sao uma lista mensal com `competencia`.
 */
function recortar<T extends { competencia: string }>(
  itens: T[],
  periodo: Periodo,
  competenciaAtual: string,
): T[] {
  if (periodo === "tudo") return itens;
  if (periodo === "ano") {
    const ano = competenciaAtual.slice(0, 4);
    return itens.filter((i) => i.competencia.startsWith(ano));
  }
  const { meses } = PERIODOS.find((p) => p.id === periodo)!;
  return itens.slice(-meses!);
}

export function AbaAporte({
  historico,
  recebimentos,
  serie,
  competenciaAtual,
  verTudoHref,
}: {
  historico: ItemDoHistorico[];
  recebimentos: Recebimentos;
  /**
   * A posicao mes a mes, quando o aporte é da modalidade `final`. Nesse
   * regime o resultado nao cai na conta: fica retido e o saldo sobe, entao o
   * grafico que faz sentido é o do progresso, e nao o dos creditos.
   *
   * `null` quando ha algum aporte `mensal` — ai o cartao mostra o que foi
   * creditado, como sempre.
   */
  serie: MesDaPosicao[] | null;
  /** `AAAA-MM` de hoje, apurado no banco. So atravessa ate o grafico. */
  competenciaAtual: string;
  /** Leva a `/portal/historico`, carregando o filtro de empreendimento. */
  verTudoHref: string;
}) {
  // `tudo` é o padrao: a primeira leitura do cartao é a vida inteira do aporte.
  const [periodo, setPeriodo] = useState<Periodo>("tudo");

  const progresso = serie !== null;

  const { visiveis, mesesVisiveis, total } = useMemo(() => {
    const visiveis = recortar(
      recebimentos.pagamentos,
      periodo,
      competenciaAtual,
    );
    const mesesVisiveis = serie
      ? recortar(serie, periodo, competenciaAtual)
      : [];

    /*
     * O numero de cima acompanha o recorte, e cada regime conta o seu: no
     * `final` é o resultado acumulado no periodo — a diferenca entre o saldo
     * do ultimo mes e o capital que havia no inicio dele —, no `mensal` é a
     * soma do que caiu na conta.
     */
    const ultimo = mesesVisiveis[mesesVisiveis.length - 1];
    return {
      visiveis,
      mesesVisiveis,
      total: ultimo
        ? ultimo.saldoFinal
        : visiveis.reduce((soma, p) => soma + p.valor, 0),
    };
  }, [recebimentos.pagamentos, serie, periodo, competenciaAtual]);

  return (
    <div className="escalonar">
      {/*
       * Este bloco era dois: "Meu ARI" — a evolucao do saldo, num cartao azul —
       * e "Recebimentos", o que caiu na conta, num cartao claro logo abaixo.
       * Viraram um só: o cartao azul do primeiro, o grafico e os numeros do
       * segundo.
       *
       * O titulo agora é **"Investido"**, e nao o nome do app. Ele nomeava o
       * produto ("Meu ARI") numa tela que ja é o produto inteiro — dizer o nome
       * de novo, no meio da propria tela, nao informava nada. "Investido" diz o
       * que o cartao mostra.
       *
       * Titulo e cartao num invólucro só: `escalonar` atrasa cada filho direto
       * do container, e soltos aqui eles entrariam em tempos diferentes.
       */}
      <div id="recebimentos" className="scroll-mt-24">
        <h2 className="sr-only">Investido</h2>
        <Cartao tom="escuro">
          {progresso || recebimentos.pagamentos.length > 0 ? (
            <>
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm text-white/75">
                  {progresso
                    ? "Saldo acumulado"
                    : periodo === "tudo"
                      ? "Total recebido"
                      : "Recebido no periodo"}
                </p>
                <p className="text-lg font-semibold tabular-nums text-white">
                  {formatarMoeda(total)}
                </p>
              </div>

              {/* O recorte de tempo. `aria-pressed` e nao `radiogroup`: sao
                  botoes que trocam o que o grafico mostra, e a leitura por audio
                  ja anuncia qual esta ligado. */}
              <div
                role="group"
                aria-label="Periodo do grafico"
                className="mb-5 flex flex-wrap gap-2"
              >
                {PERIODOS.map(({ id, rotulo }) => {
                  const ligado = id === periodo;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={ligado}
                      onClick={() => setPeriodo(id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        ligado
                          ? "bg-white text-tinta"
                          : "bg-white/15 text-white/80 hover:bg-white/25 hover:text-white"
                      }`}
                    >
                      {rotulo}
                    </button>
                  );
                })}
              </div>

              {/* Só o grafico. A participacao de cada ciclo — e o rateio,
                  quando a taxa muda no meio — continua no toque da barra.

                  O `mt-8` é o respiro entre o saldo e o desenho. O corpo do
                  cartao é bloco simples, entao esta margem **colapsa** com o
                  `mb-5` da fila de periodos logo acima: o vao final é 32px, e
                  nao a soma dos dois. Mexer aqui é o jeito de afastar o
                  grafico do numero sem empurrar tambem os botoes. */}
              <div className="mt-8">
                {(progresso ? mesesVisiveis.length : visiveis.length) > 0 ? (
                  progresso ? (
                    <GraficoProgresso
                      serie={mesesVisiveis}
                      competenciaAtual={competenciaAtual}
                      tom="escuro"
                    />
                  ) : (
                    <GraficoRecebimentos
                      pagamentos={visiveis}
                      competenciaAtual={competenciaAtual}
                      tom="escuro"
                    />
                  )
                ) : (
                  // Acontece em "Neste ano" enquanto nada aconteceu no ano
                  // corrente. O grafico precisa de pelo menos um ponto.
                  <p className="py-10 text-center text-sm text-white/75">
                    Nada neste período.
                  </p>
                )}
              </div>
            </>
          ) : (
            // O grafico precisa de pelo menos um ponto para existir; sem
            // nenhum ele nao é desenhado vazio, é substituido.
            <p className="py-10 text-center text-sm text-white/75">
              O gráfico aparece aqui quando o seu primeiro crédito for
              registrado.
            </p>
          )}
        </Cartao>
      </div>

      {/* A ancora passa para o invólucro, e nao fica no cartao: assim a rolagem
          para nele com o titulo visivel, e nao logo abaixo dele. O `scroll-mt`
          vem junto, porque era o `Cartao` quem o trazia. */}
      <div id="historico" className="mt-16 scroll-mt-24">
        <div className="mb-5 flex items-baseline justify-end gap-3">
          <h2 className="sr-only">Historico</h2>

          {/* Mesma forma do atalho do cartao de saldo. Só aparece quando ha o
              que ver alem do recorte — senao levaria a uma copia da tela. */}
          {historico.length > VISIVEIS && (
            <Link
              href={verTudoHref}
              className="group inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
            >
              Ver tudo
              <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        <ListaHistorico itens={historico.slice(0, VISIVEIS)} />
      </div>
    </div>
  );
}
