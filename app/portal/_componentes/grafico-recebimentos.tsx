"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Recebimento } from "@/lib/portal/recebimentos";
import {
  formatarCompetencia,
  formatarData,
  formatarMoeda,
  formatarMoedaCurta,
  formatarPercentual,
} from "@/lib/portal/formato";
import { marcasDoEixo, topoLimpo } from "./escala";

/**
 * Quanto caiu na conta em cada mes. Barras, e nao linha: cada credito é um
 * evento fechado no dia 17, nao um valor que evolui entre um mes e o outro.
 *
 * O mesmo par de leituras do grafico de saldo, para os dois conviverem na mesma
 * pilha sem parecer de familias diferentes.
 */
const PALETA = {
  claro: {
    barra: "#012677", // marinho
    barraQuebrada: "#005bc5", // azul — ciclo rateado
    grade: "#ededed",
    rotulo: "#737373",
  },
  escuro: {
    barra: "#ffffff",
    barraQuebrada: "#17f9ff", // ciano
    grade: "rgba(255, 255, 255, 0.24)",
    rotulo: "rgba(255, 255, 255, 0.78)",
  },
} as const;

/** O mes corrente, nos dois tons. Marca onde a pessoa esta na linha do tempo. */
const OURO = "#f7bc05";

const LARGURA_PADRAO = 780; // usada ate o primeiro measure no cliente
const ALTURA = 220;
const MARGEM = { topo: 22, direita: 4, base: 28, esquerda: 0 };

/** `2025-09` -> `2025`. */
const anoDe = (competencia: string) => competencia.slice(0, 4);

/**
 * A participacao aplicada no ciclo. Com um trecho é so a taxa; com dois, cada
 * uma com os dias que lhe couberam — é o que explica um credito que nao é nem o
 * valor da taxa antiga nem o da nova.
 */
function taxaDoCiclo(trechos: Recebimento["trechos"]): string {
  if (trechos.length === 0) return "";
  if (trechos.length === 1) return `${formatarPercentual(trechos[0].taxa)} ao mês`;
  return trechos.map((t) => formatarPercentual(t.taxa)).join(" → ");
}

/**
 * Os dias que entraram na conta. Em taxa unica basta a fracao do ciclo; com
 * duas, cada uma com os seus dias.
 *
 * De proposito em taxa mensal, e nao na diaria: a diaria é `mensal / 30`, uma
 * dizima em dois dos tres casos (1,90/30 = 0,063333...%). Exibi-la arredondada
 * convidaria a multiplicar 0,0633% por 30 e chegar a um valor que nao é o
 * creditado.
 */
function contaDoCiclo(trechos: Recebimento["trechos"]): string {
  if (trechos.length === 1) {
    return `${trechos[0].dias} de 30 dias do ciclo`;
  }
  return trechos
    .map((t) => `${t.dias} dias a ${formatarPercentual(t.taxa)}`)
    .join(" + ");
}

export function GraficoRecebimentos({
  pagamentos,
  competenciaAtual,
  tom = "claro",
}: {
  pagamentos: Recebimento[];
  /**
   * `AAAA-MM` de hoje, para a barra do mes corrente sair em ouro.
   *
   * Vem pronta do servidor, e nao de um `new Date()` aqui: a data do navegador
   * é outro relogio, em outro fuso, e o valor do primeiro render precisa bater
   * com o que o HTML ja trouxe — senao a hidratacao acusa e a arvore inteira é
   * redesenhada.
   */
  competenciaAtual?: string;
  tom?: "claro" | "escuro";
}) {
  const cor = PALETA[tom];
  const container = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(LARGURA_PADRAO);
  const [ativo, setAtivo] = useState<number | null>(null);

  // O viewBox acompanha a largura real em pixels — 1 unidade = 1px —, senao o
  // rotulo de 12px encolheria junto com a tela.
  useEffect(() => {
    const elemento = container.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) =>
      setLargura(entrada.contentRect.width),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const { barras, marcas, y, plot } = useMemo(() => {
    const plot = {
      largura: Math.max(1, largura - MARGEM.esquerda - MARGEM.direita),
      altura: ALTURA - MARGEM.topo - MARGEM.base,
    };

    const topo = topoLimpo(Math.max(...pagamentos.map((p) => p.valor)));
    const y = (valor: number) =>
      MARGEM.topo + plot.altura - (valor / topo) * plot.altura;

    // Uma fatia por mes, com respiro proporcional: em 11 meses a barra fica
    // larga, em 60 fica fina, e em nenhum dos dois encosta na vizinha.
    const fatia = plot.largura / pagamentos.length;
    const espessura = Math.max(2, fatia * 0.62);

    return {
      plot,
      y,
      marcas: marcasDoEixo(topo, 2),
      barras: pagamentos.map((pagamento, i) => ({
        ...pagamento,
        x: MARGEM.esquerda + fatia * (i + 0.5) - espessura / 2,
        largura: espessura,
        centro: MARGEM.esquerda + fatia * (i + 0.5),
        altura: Math.max(1, MARGEM.topo + plot.altura - y(pagamento.valor)),
        topoY: y(pagamento.valor),
      })),
    };
  }, [pagamentos, largura]);

  const destacado = ativo === null ? null : barras[ativo];

  function indiceNoPonteiro(clientX: number, svg: SVGSVGElement) {
    const caixa = svg.getBoundingClientRect();
    if (caixa.width === 0) return 0;
    const fatia = plot.largura / pagamentos.length;
    const indice = Math.floor((clientX - caixa.left - MARGEM.esquerda) / fatia);
    return Math.min(pagamentos.length - 1, Math.max(0, indice));
  }

  function navegar(evento: React.KeyboardEvent<SVGSVGElement>) {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    const salto = evento.key === "ArrowLeft" ? -1 : 1;
    setAtivo((atual) => {
      const base = atual ?? pagamentos.length - 1;
      return Math.min(pagamentos.length - 1, Math.max(0, base + salto));
    });
  }

  const ultimo = barras[barras.length - 1];

  return (
    <div ref={container} className="relative">
      <svg
        viewBox={`0 0 ${largura} ${ALTURA}`}
        width="100%"
        height={ALTURA}
        className={`block touch-none rounded-lg focus:outline-none focus-visible:ring-2 ${
          tom === "escuro"
            ? "focus-visible:ring-white"
            : "focus-visible:ring-azul focus-visible:ring-offset-2"
        }`}
        role="img"
        aria-label={`Recebimentos mensais de ${formatarCompetencia(
          pagamentos[0].competencia,
        )} a ${formatarCompetencia(
          ultimo.competencia,
        )}. Ultimo credito de ${formatarMoeda(ultimo.valor)} a ${taxaDoCiclo(
          ultimo.trechos,
        )}. Use as setas para percorrer os meses.`}
        tabIndex={0}
        onPointerDown={(e) =>
          setAtivo(indiceNoPonteiro(e.clientX, e.currentTarget))
        }
        onPointerMove={(e) =>
          setAtivo(indiceNoPonteiro(e.clientX, e.currentTarget))
        }
        onPointerLeave={() => setAtivo(null)}
        onPointerCancel={() => setAtivo(null)}
        onKeyDown={navegar}
        onBlur={() => setAtivo(null)}
      >
        {marcas.map((valor, i) => (
          <g key={valor}>
            <line
              x1={MARGEM.esquerda}
              x2={largura - MARGEM.direita}
              y1={y(valor)}
              y2={y(valor)}
              stroke={cor.grade}
              strokeWidth={1}
            />
            {/* O rotulo do zero sobraria: a linha de base ja diz o que ele
                diria. Como no grafico de saldo, o texto vai acima da linha para
                a margem esquerda poder ser zero. */}
            {i > 0 && (
              <text
                x={0}
                y={y(valor) - 6}
                textAnchor="start"
                fontSize={12}
                fill={cor.rotulo}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatarMoedaCurta(valor)}
              </text>
            )}
          </g>
        ))}

        {barras.map((barra, i) => (
          <rect
            key={barra.data}
            x={barra.x}
            y={barra.topoY}
            width={barra.largura}
            height={barra.altura}
            rx={2}
            // O mes corrente vem primeiro, em ouro: ele diz onde a pessoa esta
            // na linha do tempo, e isso vale mais que o aviso de rateio.
            // Rateado sai em outro tom — é o que explica a barra baixa do
            // primeiro mes e a de uma troca de participacao no meio do caminho.
            fill={
              barra.competencia === competenciaAtual
                ? OURO
                : barra.quebrado
                  ? cor.barraQuebrada
                  : cor.barra
            }
            fillOpacity={destacado && destacado !== barras[i] ? 0.55 : 1}
          />
        ))}

        {/* Um rotulo por ano, na primeira barra de cada ano. */}
        {barras.map((barra, i) =>
          i === 0 || anoDe(barra.competencia) !== anoDe(barras[i - 1].competencia) ? (
            <text
              key={`ano-${barra.data}`}
              x={barra.centro}
              y={ALTURA - 8}
              textAnchor={i === 0 ? "start" : "middle"}
              fontSize={12}
              fill={cor.rotulo}
            >
              {anoDe(barra.competencia)}
            </text>
          ) : null,
        )}
      </svg>

      {destacado && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max max-w-[13rem] -translate-x-1/2 rounded-xl border border-tinta/12 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `clamp(5.5rem, ${(destacado.centro / largura) * 100}%, calc(100% - 5.5rem))`,
          }}
        >
          <p className="text-xs text-neutral-500">
            Crédito em {formatarData(destacado.data)}
          </p>
          <p className="mt-1 text-sm font-semibold text-tinta">
            {formatarMoeda(destacado.valor)}
          </p>

          {/* Lancado nao ganha explicacao de taxa: o valor veio da tabela, e
              atribuir a ele uma conta que nao foi a dele seria inventar. */}
          {destacado.origem === "lancado" ? (
            <p className="mt-0.5 text-xs text-neutral-500">
              {destacado.observacao ?? "Crédito lançado"}
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-neutral-600 tabular-nums">
                {taxaDoCiclo(destacado.trechos)}
              </p>
              <p className="text-xs text-neutral-500 tabular-nums">
                {contaDoCiclo(destacado.trechos)}
              </p>
              {/* Rateio que a taxa nao explica: a taxa foi uma só, mas entrou
                  dinheiro no meio do ciclo. */}
              {destacado.quebrado && destacado.trechos.length === 1 && (
                <p className="mt-0.5 text-xs text-neutral-500">
                  Aporte no meio do ciclo
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
