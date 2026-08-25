"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Recebimento } from "@/lib/portal/recebimentos";
import {
  formatarCompetencia,
  formatarData,
  formatarMoeda,
  formatarMoedaCurta,
} from "@/lib/portal/formato";
import { marcasDoEixo, topoLimpo } from "./escala";

/**
 * Quanto caiu na conta em cada mes. Barras, e nao linha: cada credito é um
 * evento fechado no dia 17, nao um valor que evolui entre um mes e o outro.
 *
 * Toda barra é um credito lancado no /admin — nao ha projecao aqui. Por isso
 * sumiu o tom de "ciclo rateado": ele distinguia o que a formula tinha
 * calculado, e nao ha mais formula em tela.
 *
 * O mesmo par de leituras do grafico de saldo, para os dois conviverem na mesma
 * pilha sem parecer de familias diferentes.
 */
const PALETA = {
  claro: {
    barra: "#012677", // marinho
    grade: "#ededed",
    rotulo: "#737373",
  },
  escuro: {
    barra: "#ffffff",
    grade: "rgba(255, 255, 255, 0.24)",
    rotulo: "rgba(255, 255, 255, 0.78)",
  },
} as const;

/** O mes corrente, nos dois tons. Marca onde a pessoa esta na linha do tempo. */
const OURO = "#f7bc05";

const LARGURA_PADRAO = 780; // usada ate o primeiro measure no cliente
const ALTURA = 220;
/*
 * `esquerda: 64` reserva a faixa dos rotulos do eixo.
 *
 * Era `0`, com a justificativa de que o rotulo vai *acima* da linha de grade
 * e por isso nao precisaria de espaco horizontal. So que a barra tambem
 * comecava em zero e é desenhada **depois** do texto — entao qualquer barra
 * alta o bastante para alcancar aquela altura pintava por cima do rotulo.
 * Com `R$ 25.000` em 12px dando uns 60px, os valores do eixo sumiam atras
 * das primeiras colunas.
 *
 * Vale nos dois tamanhos, e nao so no desktop: a sobreposicao acontecia
 * igual no celular — la ela so era menos obvia porque o grafico é mais
 * estreito e as barras, mais baixas.
 */
const MARGEM = { topo: 22, direita: 4, base: 28, esquerda: 64 };

/** `2025-09` -> `2025`. */
const anoDe = (competencia: string) => competencia.slice(0, 4);

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
    //
    // A barra ocupa 62% da fatia, e nao os 80% de antes: numa coluna estreita
    // — a do desktop, ao lado da obra — as colunas gordas encostavam umas nas
    // outras e viravam um bloco continuo. Os 38% de vao dao a cada credito um
    // contorno proprio.
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
        )}. Ultimo credito de ${formatarMoeda(
          ultimo.valor,
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
                diria.

                Ele ficava *acima* da linha, encostado no x=0, porque a margem
                esquerda era zero e nao havia calha onde pousar. Agora ha: o
                texto se alinha a direita da calha e centra na propria linha,
                que é como se le um eixo. */}
            {i > 0 && (
              <text
                x={MARGEM.esquerda - 8}
                y={y(valor)}
                textAnchor="end"
                dominantBaseline="middle"
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
            // O mes corrente em ouro: ele diz onde a pessoa esta na linha do
            // tempo. O resto é uma cor só — cada barra é um credito, e nao ha
            // dois tipos de credito para distinguir.
            fill={barra.competencia === competenciaAtual ? OURO : cor.barra}
            fillOpacity={destacado && destacado !== barras[i] ? 0.55 : 1}
          />
        ))}

        {/* Um rotulo por ano, na primeira barra de cada ano. */}
        {barras.map((barra, i) =>
          i === 0 ||
          anoDe(barra.competencia) !== anoDe(barras[i - 1].competencia) ? (
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

          {/* Sem conta de taxa aqui: o valor veio da tabela, e atribuir a ele
              uma formula que pode nao ter sido a dele seria inventar. O que
              explica o credito é a anotacao de quem o lancou. */}
          <p className="mt-0.5 text-xs text-neutral-500">
            {destacado.observacao ?? "Crédito lançado"}
          </p>
        </div>
      )}
    </div>
  );
}
