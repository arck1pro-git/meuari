"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MesDaPosicao } from "@/lib/portal/calculo";
import {
  formatarCompetencia,
  formatarMoeda,
  formatarMoedaCurta,
} from "@/lib/portal/formato";
import { marcasDoEixo, topoLimpo } from "./escala";

/**
 * A evolucao do investimento na modalidade `final`, mes a mes.
 *
 * Aqui o resultado nao sai da conta: ele fica retido e o saldo cresce. Por isso
 * area e linha, e nao barras — o valor de um mes continua no seguinte, e a
 * leitura que interessa é a subida, nao o evento isolado.
 *
 * Duas series empilhadas visualmente: o capital aportado, mais escuro, e o
 * saldo, que é capital mais o resultado acumulado. A distancia entre as duas
 * linhas é o quanto o dinheiro rendeu ate ali.
 */
const PALETA = {
  claro: {
    linha: "#012677", // marinho
    area: "rgba(1, 38, 119, 0.12)",
    capital: "rgba(1, 38, 119, 0.35)",
    grade: "#ededed",
    rotulo: "#737373",
    fundoPonto: "#ffffff",
  },
  escuro: {
    linha: "#ffffff",
    area: "rgba(255, 255, 255, 0.16)",
    capital: "rgba(255, 255, 255, 0.45)",
    grade: "rgba(255, 255, 255, 0.24)",
    rotulo: "rgba(255, 255, 255, 0.78)",
    fundoPonto: "#012677",
  },
} as const;

const OURO = "#f7bc05";
const LARGURA_PADRAO = 780;
const ALTURA = 220;
const MARGEM = { topo: 22, direita: 4, base: 28, esquerda: 0 };

const anoDe = (competencia: string) => competencia.slice(0, 4);

export function GraficoProgresso({
  serie,
  competenciaAtual,
  tom = "claro",
}: {
  serie: MesDaPosicao[];
  /** `AAAA-MM` de hoje, para marcar o mes corrente em ouro. */
  competenciaAtual?: string;
  tom?: "claro" | "escuro";
}) {
  const cor = PALETA[tom];
  const container = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(LARGURA_PADRAO);
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const elemento = container.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) =>
      setLargura(entrada.contentRect.width),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const { pontos, marcas, y, plot } = useMemo(() => {
    const plot = {
      largura: Math.max(1, largura - MARGEM.esquerda - MARGEM.direita),
      altura: ALTURA - MARGEM.topo - MARGEM.base,
    };

    const topo = topoLimpo(Math.max(...serie.map((m) => m.saldoFinal)));
    const y = (valor: number) =>
      MARGEM.topo + plot.altura - (valor / topo) * plot.altura;

    /*
     * Com um mes só nao ha linha para desenhar: o divisor seria zero e o ponto
     * ficaria na margem esquerda. Nesse caso ele vai ao centro.
     */
    const passo = serie.length > 1 ? plot.largura / (serie.length - 1) : 0;
    const x = (i: number) =>
      serie.length > 1 ? MARGEM.esquerda + passo * i : plot.largura / 2;

    return {
      plot,
      y,
      marcas: marcasDoEixo(topo, 2),
      pontos: serie.map((mes, i) => ({ ...mes, x: x(i), y: y(mes.saldoFinal) })),
    };
  }, [serie, largura]);

  const caminho = (chave: "saldoFinal" | "capital") =>
    pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${y(p[chave])}`).join(" ");

  // A area fecha na base do plot, e nao no zero do eixo: sao o mesmo lugar, mas
  // escrito assim ela nao depende de o eixo comecar em zero.
  const base = MARGEM.topo + plot.altura;
  const area = `${caminho("saldoFinal")} L ${pontos[pontos.length - 1].x} ${base} L ${pontos[0].x} ${base} Z`;

  const destacado = ativo === null ? null : pontos[ativo];
  const ultimo = pontos[pontos.length - 1];

  function indiceNoPonteiro(clientX: number, svg: SVGSVGElement) {
    const caixa = svg.getBoundingClientRect();
    if (caixa.width === 0 || serie.length < 2) return 0;
    const passo = plot.largura / (serie.length - 1);
    const indice = Math.round((clientX - caixa.left - MARGEM.esquerda) / passo);
    return Math.min(serie.length - 1, Math.max(0, indice));
  }

  function navegar(evento: React.KeyboardEvent<SVGSVGElement>) {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    const salto = evento.key === "ArrowLeft" ? -1 : 1;
    setAtivo((atual) => {
      const inicio = atual ?? serie.length - 1;
      return Math.min(serie.length - 1, Math.max(0, inicio + salto));
    });
  }

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
        aria-label={`Evolucao do investimento de ${formatarCompetencia(
          serie[0].competencia,
        )} a ${formatarCompetencia(ultimo.competencia)}. Saldo atual de ${formatarMoeda(
          ultimo.saldoFinal,
        )}, sendo ${formatarMoeda(ultimo.capital)} de capital aportado. Use as setas para percorrer os meses.`}
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

        <path d={area} fill={cor.area} />

        {/* O capital aportado, tracejado: é o piso do saldo, e a distancia ate
            a linha cheia é o resultado acumulado. */}
        <path
          d={caminho("capital")}
          fill="none"
          stroke={cor.capital}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        <path
          d={caminho("saldoFinal")}
          fill="none"
          stroke={cor.linha}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* O mes corrente ganha ponto proprio, em ouro: ele ainda esta em curso
            e é onde a pessoa esta na linha do tempo. */}
        {pontos.map((ponto) =>
          ponto.competencia === competenciaAtual || ponto === destacado ? (
            <circle
              key={ponto.competencia}
              cx={ponto.x}
              cy={ponto.y}
              r={ponto === destacado ? 5 : 4}
              fill={ponto.competencia === competenciaAtual ? OURO : cor.linha}
              stroke={cor.fundoPonto}
              strokeWidth={2}
            />
          ) : null,
        )}

        {pontos.map((ponto, i) =>
          i === 0 || anoDe(ponto.competencia) !== anoDe(pontos[i - 1].competencia) ? (
            <text
              key={`ano-${ponto.competencia}`}
              x={ponto.x}
              y={ALTURA - 8}
              textAnchor={i === 0 ? "start" : "middle"}
              fontSize={12}
              fill={cor.rotulo}
            >
              {anoDe(ponto.competencia)}
            </text>
          ) : null,
        )}
      </svg>

      {destacado && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max max-w-[13rem] -translate-x-1/2 rounded-xl border border-tinta/12 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `clamp(5.5rem, ${(destacado.x / largura) * 100}%, calc(100% - 5.5rem))`,
          }}
        >
          <p className="text-xs text-neutral-500">
            {formatarCompetencia(destacado.competencia)}
            {destacado.parcial && " · em curso"}
          </p>
          <p className="mt-1 text-sm font-semibold text-tinta">
            {formatarMoeda(destacado.saldoFinal)}
          </p>
          <p className="mt-0.5 text-xs text-neutral-600 tabular-nums">
            {formatarMoeda(destacado.capital)} aportados
          </p>
          <p className="text-xs text-neutral-500 tabular-nums">
            +{formatarMoeda(destacado.saldoFinal - destacado.capital)} de
            resultado
          </p>
        </div>
      )}
    </div>
  );
}
