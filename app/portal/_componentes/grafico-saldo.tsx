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
 * Duas leituras do mesmo desenho. No `escuro` a serie inverte para o branco e a
 * `superficie` — o anel que recorta o ponto final — deixa de ser o fundo do
 * cartao, que ali é degrade: vira a tinta translucida, escura o bastante para
 * separar o ponto em qualquer trecho da faixa. Area e guia sobem de opacidade
 * porque branco sobre azul rende menos que azul sobre branco.
 */
const PALETA = {
  claro: {
    serie: "#012677", // marinho
    superficie: "#ffffff",
    grade: "#ededed",
    rotulo: "#737373",
    area: 0.06,
    guia: 0.25,
  },
  escuro: {
    serie: "#ffffff",
    superficie: "rgba(0, 20, 73, 0.55)", // tinta
    grade: "rgba(255, 255, 255, 0.24)",
    rotulo: "rgba(255, 255, 255, 0.78)",
    area: 0.16,
    guia: 0.45,
  },
} as const;

const LARGURA_PADRAO = 780; // usada ate o primeiro measure no cliente
const ESTREITO = 520;
const ALTURA = 300;

/** `2025-03` -> `2025`. */
const anoDe = (competencia: string) => competencia.slice(0, 4);

export function GraficoSaldo({
  serie,
  tom = "claro",
}: {
  serie: MesDaPosicao[];
  tom?: "claro" | "escuro";
}) {
  const cor = PALETA[tom];
  const container = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(LARGURA_PADRAO);
  const [medido, setMedido] = useState(false);
  const [ativo, setAtivo] = useState<number | null>(null);

  /*
   * O viewBox acompanha a largura real em pixels — 1 unidade = 1px. Sem isso o
   * SVG escala junto com o container e, num celular de 390px, um rotulo de 12px
   * viraria 5px. Assim o texto tem o mesmo tamanho em qualquer tela.
   */
  useEffect(() => {
    const elemento = container.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(entrada.contentRect.width);
      setMedido(true);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const estreito = largura < ESTREITO;
  // Altura fixa: o grafico tem o mesmo tamanho em qualquer tela. A largura
  // continua acompanhando o container, mas a proporcao vertical nao muda.
  const altura = ALTURA;

  const { pontos, marcas, y, margem, plot, rotulado } = useMemo(() => {
    // O rotulo do eixo Y vai *acima* da linha de grade em qualquer largura, e
    // nao ao lado: assim a margem esquerda é sempre zero e o desenho usa a
    // largura inteira. A direita segue reservada no largo, onde o valor final
    // aparece ao lado do ultimo ponto.
    const margem = estreito
      ? { topo: 22, direita: 10, base: 28, esquerda: 0 }
      : { topo: 22, direita: 96, base: 34, esquerda: 0 };

    const plot = {
      largura: Math.max(1, largura - margem.esquerda - margem.direita),
      altura: altura - margem.topo - margem.base,
    };

    const topo = topoLimpo(Math.max(...serie.map((m) => m.saldoFinal)));
    const passo = serie.length > 1 ? plot.largura / (serie.length - 1) : 0;
    const y = (valor: number) =>
      margem.topo + plot.altura - (valor / topo) * plot.altura;

    return {
      margem,
      plot,
      y,
      // Duas divisoes: com o topo em 500.000, marca em 250.000 e 500.000. O
      // rotulo do zero nao é desenhado, entao sobram esses dois.
      marcas: marcasDoEixo(topo, 2),
      // Um rotulo por ano, e nao por mes: marcamos o ponto em que o ano vira.
      // O primeiro entra sempre, senao o inicio da serie ficaria sem legenda.
      rotulado: (i: number) =>
        i === 0 || anoDe(serie[i].competencia) !== anoDe(serie[i - 1].competencia),
      pontos: serie.map((mes, i) => ({
        ...mes,
        cx: margem.esquerda + i * passo,
        cy: y(mes.saldoFinal),
      })),
    };
  }, [serie, largura, altura, estreito]);

  const linha = pontos
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.cx} ${p.cy}`)
    .join(" ");
  const area = `${linha} L${pontos[pontos.length - 1].cx} ${y(0)} L${pontos[0].cx} ${y(0)} Z`;
  const ultimo = pontos[pontos.length - 1];
  const destacado = ativo === null ? null : pontos[ativo];

  function indiceNoPonteiro(clientX: number, svg: SVGSVGElement) {
    const caixa = svg.getBoundingClientRect();
    if (caixa.width === 0) return 0;
    const px = clientX - caixa.left;
    const passo = serie.length > 1 ? plot.largura / (serie.length - 1) : 1;
    const indice = Math.round((px - margem.esquerda) / passo);
    return Math.min(serie.length - 1, Math.max(0, indice));
  }

  function navegar(evento: React.KeyboardEvent<SVGSVGElement>) {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    const salto = evento.key === "ArrowLeft" ? -1 : 1;
    setAtivo((atual) => {
      const base = atual ?? serie.length - 1;
      return Math.min(serie.length - 1, Math.max(0, base + salto));
    });
  }

  return (
    <div ref={container} className="relative">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        width="100%"
        height={altura}
        // No escuro o anel dispensa o offset: a folga sairia branca e brigaria
        // com o proprio anel em cima do degrade.
        className={`block touch-none rounded-lg focus:outline-none focus-visible:ring-2 ${
          tom === "escuro"
            ? "focus-visible:ring-white"
            : "focus-visible:ring-azul focus-visible:ring-offset-2"
        }`}
        role="img"
        tabIndex={0}
        aria-label={`Evolucao do saldo de ${formatarCompetencia(
          serie[0].competencia,
        )} a ${formatarCompetencia(
          serie[serie.length - 1].competencia,
        )}. Saldo atual de ${formatarMoeda(
          ultimo.saldoFinal,
        )}. Use as setas para percorrer os meses.`}
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
              x1={margem.esquerda}
              x2={largura - margem.direita}
              y1={y(valor)}
              y2={y(valor)}
              stroke={cor.grade}
              strokeWidth={1}
            />
            {/* O rotulo do zero sobraria dentro do desenho, e a linha de base
                ja diz o que ele diria. */}
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

        <path d={area} fill={cor.serie} fillOpacity={cor.area} />
        <path
          d={linha}
          fill="none"
          stroke={cor.serie}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {pontos.map((p, i) =>
          rotulado(i) ? (
            <text
              key={p.competencia}
              x={p.cx}
              y={altura - 10}
              // As pontas ancoram para dentro, senao o primeiro e o ultimo mes
              // saem pela borda quando a margem lateral é pequena.
              textAnchor={
                i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"
              }
              fontSize={12}
              fill={cor.rotulo}
            >
              {anoDe(p.competencia)}
            </text>
          ) : null,
        )}

        {destacado && (
          <line
            x1={destacado.cx}
            x2={destacado.cx}
            y1={margem.topo}
            y2={margem.topo + plot.altura}
            stroke={cor.serie}
            strokeOpacity={cor.guia}
            strokeWidth={1}
          />
        )}

        {/* Ponto final: anel de 2px na cor da superficie. */}
        <circle
          cx={ultimo.cx}
          cy={ultimo.cy}
          r={4.5}
          fill={cor.serie}
          stroke={cor.superficie}
          strokeWidth={2}
        />
        {/*
         * No estreito nao ha margem para o rotulo — o saldo ja esta no topo da
         * tela, em corpo grande. Espera a primeira medicao: ate ela chegar, a
         * largura é o palpite de 780px, e no celular o rotulo apareceria em
         * cima do desenho ate o `ResizeObserver` corrigir.
         */}
        {medido && !estreito && (
          <text
            x={ultimo.cx + 12}
            y={ultimo.cy + 4}
            fontSize={13}
            fontWeight={600}
            fill={cor.serie}
          >
            {formatarMoedaCurta(ultimo.saldoFinal)}
          </text>
        )}

        {destacado && destacado !== ultimo && (
          <circle
            cx={destacado.cx}
            cy={destacado.cy}
            r={4.5}
            fill={cor.serie}
            stroke={cor.superficie}
            strokeWidth={2}
          />
        )}
      </svg>

      {destacado && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max max-w-[13rem] -translate-x-1/2 rounded-xl border border-tinta/12 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `clamp(5.5rem, ${(destacado.cx / largura) * 100}%, calc(100% - 5.5rem))`,
          }}
        >
          <p className="text-xs text-neutral-500">
            {formatarCompetencia(destacado.competencia)}
            {destacado.parcial ? " (parcial)" : ""}
          </p>
          <p className="mt-1 text-sm font-semibold text-tinta">
            {formatarMoeda(destacado.saldoFinal)}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Resultado {formatarMoeda(destacado.rendimento)}
          </p>
          {destacado.aportes > 0 && (
            <p className="text-xs text-neutral-500">
              Aporte de {formatarMoeda(destacado.aportes)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
