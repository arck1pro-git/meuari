"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatarCompetenciaCurta,
  formatarMoeda,
  formatarMoedaCurta,
  formatarPercentual,
} from "@/lib/portal/formato";

/**
 * Os graficos do painel de administracao.
 *
 * Proprios, e nao os do portal. O grafico do investidor é SVG escrito a mao e
 * desenhado para uma coisa: uma serie, num cartao estreito, com o toque no dedo
 * como unica interacao. Aqui sao tres leituras diferentes — composicao, serie
 * temporal e comparacao entre obras — em telas largas de computador, que é onde
 * se administra. Esticar aquele componente para os tres casos o deixaria pior
 * nos quatro.
 *
 * Recharts porque é o que a tela pede: eixo com marcas, tooltip que segue o
 * ponteiro e area que se redimensiona sozinha. Escrever isso a mao tres vezes é
 * o que o portal ja fez uma vez, e ali havia motivo — um cartao de investidor
 * nao carrega 100kB de biblioteca. Um painel interno carrega.
 *
 * As cores sao os literais do `.tema-painel`, em `globals.css`, repetidos aqui
 * porque `fill` e `stroke` do Recharts sao props de JavaScript e nao alcancam
 * variavel de CSS. É o mesmo arranjo do grafico do portal, e pelo mesmo motivo.
 *
 * **Este é o unico lugar do painel que a troca de paleta nao alcanca sozinha.**
 * Todo o resto herda as variaveis; estes seis valores sao copia, e quem mexer
 * na paleta tem de mexer aqui tambem — nao ha como o compilador cobrar.
 */
const COR = {
  tinta: "#1c2027",
  marinho: "#4338ca",
  azul: "#4f46e5",
  ceu: "#818cf8",
  ouro: "#f59e0b",
  /* A grade e o rotulo nao vem da paleta: sao os cinzas do proprio grafico. Os
     dois puxados para o frio, para nao ficarem amarelados ao lado do indigo — a
     grade quase encostando no chao cinza da pagina. */
  grade: "#e6e8ee",
  rotulo: "#6b7280",
} as const;

/** A moldura branca do tooltip, igual nos tres graficos. */
function Balao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[0.6875rem] text-neutral-500">{titulo}</p>
      {children}
    </div>
  );
}

function ValorDoBalao({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-0.5 text-sm font-bold tabular-nums text-tinta">
      {children}
    </p>
  );
}

/* Os eixos e a grade sao os mesmos nos graficos cartesianos — em objeto, para
   um ajuste de cor ou de fonte nao precisar ser feito duas vezes. */
const EIXO = {
  tick: { fill: COR.rotulo, fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * O valor do eixo e da meta: `R$ 3 mi`, `R$ 750 mil`.
 *
 * O eixo usava `formatarMoedaCurta` — `R$ 3.025.000`, doze caracteres numa
 * coluna de 72px, que o Recharts corta sem avisar a partir do milhao. E no eixo
 * ninguem le o valor exato: le a escala. O numero cheio continua no balao.
 */
function formatarEixo(valor: number): string {
  return moedaCompacta.format(valor);
}

/** A largura do eixo Y para o formato compacto — "R$ 750 mil" é o mais largo. */
const LARGURA_DO_EIXO = 64;

/**
 * Um `id` de SVG que nao se repete na pagina.
 *
 * O gradiente da area é referenciado por `url(#id)`, e o id era fixo: dois
 * graficos iguais na mesma tela apontariam os dois para o primeiro gradiente
 * do documento. O `useId` do React vem com caracteres (`«»`, `:`) que o `url()`
 * nao aceita sem escape, e por isso sai daqui so com letras e numeros.
 */
function useIdDeSvg(prefixo: string): string {
  return `${prefixo}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * A marca de "hoje" nos graficos que atravessam o presente.
 *
 * A cor ja separava o que aconteceu do que é projecao, mas so para quem
 * decorasse a legenda: num horizonte de tres anos, a fronteira entre as duas
 * cores nao diz *quando* ela fica. Um fio vertical com a palavra diz.
 *
 * Funcao, e nao componente: o que chega ao grafico é o proprio
 * `ReferenceLine`, como filho direto, que é a forma que o Recharts reconhece em
 * qualquer versao. Embrulhado num componente proprio, depende de como a versao
 * da vez procura os filhos.
 */
function marcaDeHoje(competenciaAtual: string, rotulos: string[]) {
  const rotulo = formatarCompetenciaCurta(competenciaAtual);
  // Fora da serie, nao ha onde marcar — e o Recharts desenharia no vazio.
  if (!rotulos.includes(rotulo)) return null;

  return (
    <ReferenceLine
      x={rotulo}
      stroke={COR.tinta}
      strokeOpacity={0.35}
      strokeDasharray="3 3"
      label={{
        value: "hoje",
        position: "insideTopLeft",
        fill: COR.rotulo,
        fontSize: 11,
      }}
    />
  );
}

export type PontoDaEntrada = {
  competencia: string;
  entradas: number;
  aditivos: number;
  valor: number;
};

/**
 * Quanto entrou em cada mes — a barra de captacao.
 *
 * É o primeiro bloco do painel, e o mais direto: sem acumulado, sem meta, sem
 * projecao. Uma barra por mes, com a altura do que entrou. A curva acumulada
 * logo abaixo responde "onde estamos"; esta responde "como foi o mes".
 *
 * **Empilhada por origem.** Entrada de contrato novo e aditivo sao dois
 * movimentos diferentes de captacao — um é investidor que chegou, o outro é
 * quem ja estava dentro aportando de novo —, e a divisao muda o que o mes
 * significa. Um mes de 200 mil todo em aditivo diz algo diferente de um mes de
 * 200 mil em contratos novos. A soma continua sendo a barra inteira.
 *
 * Mes sem aporte aparece como vao, e nao é omitido: o eixo é o tempo, e buraco
 * no meio de uma serie mensal faria dois meses distantes parecerem vizinhos.
 */
export function GraficoDeEntradas({ pontos }: { pontos: PontoDaEntrada[] }) {
  const dados = pontos.map((ponto) => ({
    ...ponto,
    rotulo: formatarCompetenciaCurta(ponto.competencia),
  }));

  // Modalidade sem valor nenhum nao vira barra invisivel na legenda.
  const temAditivos = pontos.some((p) => p.aditivos > 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer
          data={dados}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <XAxis dataKey="rotulo" {...EIXO} interval="preserveStartEnd" />
          <YAxis
            {...EIXO}
            width={LARGURA_DO_EIXO}
            tickFormatter={formatarEixo}
            tickCount={4}
          />

          <Tooltip
            cursor={{ fill: COR.tinta, fillOpacity: 0.04 }}
            content={({ active, payload }) => {
              const ponto = payload?.[0]?.payload as
                (PontoDaEntrada & { rotulo: string }) | undefined;
              if (!active || !ponto) return null;

              return (
                <Balao titulo={ponto.rotulo}>
                  <ValorDoBalao>{formatarMoeda(ponto.valor)}</ValorDoBalao>
                  {ponto.valor === 0 ? (
                    <p className="text-[0.6875rem] text-neutral-400">
                      Sem aporte neste mês
                    </p>
                  ) : (
                    <p className="text-[0.6875rem] text-neutral-500 tabular-nums">
                      {formatarMoeda(ponto.entradas)} em contratos ·{" "}
                      {formatarMoeda(ponto.aditivos)} em aditivos
                    </p>
                  )}
                </Balao>
              );
            }}
          />

          {/* As mesmas cores da rosca "Captado por origem": é o mesmo corte do
              mesmo dinheiro, visto no tempo em vez de em proporcao. */}
          <Bar
            dataKey="entradas"
            stackId="entrada"
            fill={COR.marinho}
            radius={temAditivos ? [0, 0, 0, 0] : [3, 3, 0, 0]}
            maxBarSize={40}
          />
          {temAditivos && (
            <Bar
              dataKey="aditivos"
              stackId="entrada"
              fill={COR.ceu}
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type FatiaDoInvestidor = { nome: string; valor: number };

export type PontoDoPagamento = {
  competencia: string;
  realizado: number;
  projetado: number;
  total: number;
  investidores: FatiaDoInvestidor[];
};

/**
 * Quantos nomes cabem no balao antes de ele virar uma lista de rolagem.
 *
 * Nao é um numero de design: é o teto acima do qual o balao fica mais alto que o
 * proprio grafico (16rem) e passa a cobrir o que a pessoa esta olhando. Com a
 * carteira de hoje — 14 investidores no mes de pico — nenhum mes chega la, e o
 * balao mostra todo mundo. O corte existe para quando chegar.
 */
const NOMES_NO_BALAO = 16;

/**
 * Quanto sai por mes na modalidade `mensal`, ate o ultimo contrato vencer.
 *
 * O gemeo de `GraficoDeEntradas`, virado ao contrario: la é o dinheiro que
 * entra, aqui o que sai. Mesma forma de barra de proposito — as duas respondem
 * "quanto, em que mes", e trocar a forma faria parecer que sao perguntas
 * diferentes.
 *
 * **A serie atravessa o presente**, e é o que distingue este grafico de todos os
 * outros do painel: os meses a esquerda de hoje sao creditos lancados, os a
 * direita sao a estimativa da mesma formula que o lancamento usa. Um contrato de
 * 36 meses é caixa comprometido por tres anos, e o painel nao dizia isso em
 * lugar nenhum.
 *
 * As duas cores nao sao duas grandezas empilhadas: cada mes tem uma ou outra,
 * nunca as duas. Elas dividem o `stackId` so para ocupar a mesma coluna — o que
 * a cor separa é *ja aconteceu* de *ainda vai acontecer*.
 */
export function GraficoDePagamentos({
  pontos,
  competenciaAtual,
}: {
  pontos: PontoDoPagamento[];
  /** `AAAA-MM` de hoje, vindo do servidor — onde fica a marca de "hoje". */
  competenciaAtual: string;
}) {
  const dados = pontos.map((ponto) => ({
    ...ponto,
    rotulo: formatarCompetenciaCurta(ponto.competencia),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer
          data={dados}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          {/*
           * `interval` calculado, e nao `preserveStartEnd`: sao quase quatro
           * anos de colunas, e deixar o Recharts decidir sozinho enfileira
           * rotulos ate eles se tocarem. Um a cada seis meses da uma marca por
           * semestre, que é a leitura util num horizonte deste tamanho.
           */}
          <XAxis dataKey="rotulo" {...EIXO} interval={5} />
          <YAxis
            {...EIXO}
            width={LARGURA_DO_EIXO}
            tickFormatter={formatarEixo}
            tickCount={4}
          />

          {marcaDeHoje(
            competenciaAtual,
            dados.map((d) => d.rotulo),
          )}

          <Tooltip
            cursor={{ fill: COR.tinta, fillOpacity: 0.04 }}
            content={({ active, payload }) => {
              const ponto = payload?.[0]?.payload as
                (PontoDoPagamento & { rotulo: string }) | undefined;
              if (!active || !ponto) return null;

              const mostrados = ponto.investidores.slice(0, NOMES_NO_BALAO);
              const restantes = ponto.investidores.slice(NOMES_NO_BALAO);
              const sobra = restantes.reduce((s, i) => s + i.valor, 0);

              return (
                <Balao
                  titulo={`${ponto.rotulo} · ${
                    ponto.projetado > 0 ? "previsto" : "pago"
                  }`}
                >
                  <ValorDoBalao>{formatarMoeda(ponto.total)}</ValorDoBalao>

                  {ponto.investidores.length === 0 ? (
                    <p className="mt-1 text-[0.6875rem] text-neutral-400">
                      Nenhum crédito neste mês
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-0.5 border-t border-zinc-100 pt-1.5">
                      {mostrados.map((investidor) => (
                        <li
                          key={investidor.nome}
                          className="flex items-baseline justify-between gap-4 text-[0.6875rem]"
                        >
                          {/* `max-w` com `truncate`: nome comprido nao pode
                              empurrar o valor para fora do balao. */}
                          <span className="max-w-40 truncate text-neutral-500">
                            {investidor.nome}
                          </span>
                          <span className="shrink-0 font-medium text-tinta tabular-nums">
                            {formatarMoeda(investidor.valor)}
                          </span>
                        </li>
                      ))}
                      {restantes.length > 0 && (
                        <li className="flex items-baseline justify-between gap-4 pt-0.5 text-[0.6875rem] text-neutral-400">
                          <span>e mais {restantes.length}</span>
                          <span className="shrink-0 tabular-nums">
                            {formatarMoeda(sobra)}
                          </span>
                        </li>
                      )}
                    </ul>
                  )}
                </Balao>
              );
            }}
          />

          <Bar
            dataKey="realizado"
            stackId="pagamento"
            fill={COR.marinho}
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="projetado"
            stackId="pagamento"
            fill={COR.ceu}
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type PontoDaCurva = {
  competencia: string;
  valor: number;
  acumulado: number;
};

/**
 * Quanto ja se captou, mes a mes — a curva acumulada.
 *
 * Acumulada, e nao o que entrou em cada mes: a pergunta do bloco é "onde
 * estamos", e ela se responde por uma linha que so sobe. O que entrou no mes
 * aparece no toque, que é onde ele importa — para explicar um degrau.
 *
 * A `meta` vira uma linha tracejada no topo. É o que transforma a curva de
 * "quanto temos" em "quanto falta": sem ela, uma subida bonita nao diz se esta
 * perto ou longe.
 */
export function GraficoDaCaptacao({
  pontos,
  meta,
}: {
  pontos: PontoDaCurva[];
  /** Meta total. `null` quando nenhuma obra tem meta definida. */
  meta: number | null;
}) {
  const dados = pontos.map((ponto) => ({
    ...ponto,
    rotulo: formatarCompetenciaCurta(ponto.competencia),
  }));
  const gradiente = useIdDeSvg("area-captacao");

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer
          data={dados}
          margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR.marinho} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COR.marinho} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis dataKey="rotulo" {...EIXO} interval="preserveStartEnd" />
          <YAxis
            {...EIXO}
            width={LARGURA_DO_EIXO}
            tickFormatter={formatarEixo}
            tickCount={4}
            /* O topo do eixo acomoda a meta, e nao só a curva: sem isto a linha
               tracejada cairia fora da area desenhada e a comparacao — que é o
               ponto do grafico — nao apareceria. */
            domain={[
              0,
              meta ? Math.max(meta, ...dados.map((d) => d.acumulado)) : "auto",
            ]}
          />

          {meta && (
            <ReferenceLine
              y={meta}
              stroke={COR.ouro}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Meta ${formatarEixo(meta)}`,
                position: "insideTopRight",
                fill: COR.rotulo,
                fontSize: 11,
              }}
            />
          )}

          <Tooltip
            cursor={{ stroke: COR.grade, strokeWidth: 1 }}
            content={({ active, payload }) => {
              const ponto = payload?.[0]?.payload as
                (PontoDaCurva & { rotulo: string }) | undefined;
              if (!active || !ponto) return null;

              return (
                <Balao titulo={ponto.rotulo}>
                  <ValorDoBalao>{formatarMoeda(ponto.acumulado)}</ValorDoBalao>
                  <p className="text-[0.6875rem] text-neutral-500 tabular-nums">
                    {ponto.valor > 0
                      ? `+ ${formatarMoeda(ponto.valor)} neste mês`
                      : "sem aporte neste mês"}
                    {meta
                      ? ` · ${formatarPercentual(ponto.acumulado / meta, 1)} da meta`
                      : ""}
                  </p>
                </Balao>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="acumulado"
            stroke={COR.marinho}
            strokeWidth={2}
            fill={`url(#${gradiente})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: COR.marinho,
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type PontoDoInvestidor = {
  competencia: string;
  valor: number;
  projetado: boolean;
};

/**
 * O contrato de um investidor rendendo — barras no `mensal`, area no `final`.
 *
 * **A forma muda com a modalidade porque a grandeza muda.** No `mensal` cada
 * ponto é o credito daquele ciclo: um evento fechado, que se le como barra. No
 * `final` cada ponto é o saldo naquele mes: um valor que evolui, que se le como
 * curva. Desenhar saldo em barras sugeriria que cada mes é um recebimento novo.
 *
 * O passado e a projecao aparecem separados: cheio o que aconteceu, esmaecido e
 * tracejado o que a formula diz que vai acontecer. Sem essa distincao a tela
 * mostraria numero que ninguem lancou com o mesmo peso do que ja foi pago — o
 * defeito que o portal do investidor teve uma vez e que a nota em
 * `lib/portal/recebimentos.ts` registra.
 */
export function GraficoDoInvestidor({
  pontos,
  modalidade,
  competenciaAtual,
}: {
  pontos: PontoDoInvestidor[];
  modalidade: "mensal" | "final";
  /** `AAAA-MM` de hoje, vindo do servidor. */
  competenciaAtual: string;
}) {
  const dados = pontos.map((ponto) => ({
    ...ponto,
    rotulo: formatarCompetenciaCurta(ponto.competencia),
    /*
     * Duas chaves em vez de uma: o Recharts precisa de series distintas para
     * pintar o passado e a projecao de formas diferentes. O mes de virada
     * aparece nas duas, senao a area abriria um vao de um mes entre elas.
     */
    real: ponto.projetado ? null : ponto.valor,
    projecao:
      ponto.projetado || ponto.competencia === competenciaAtual
        ? ponto.valor
        : null,
  }));
  const gradiente = useIdDeSvg("area-investidor");
  const hoje = marcaDeHoje(
    competenciaAtual,
    dados.map((d) => d.rotulo),
  );

  const eixos = (
    <>
      <XAxis dataKey="rotulo" {...EIXO} interval="preserveStartEnd" />
      <YAxis
        {...EIXO}
        width={LARGURA_DO_EIXO}
        tickFormatter={formatarEixo}
        tickCount={4}
      />
    </>
  );

  const balao = (
    <Tooltip
      cursor={
        modalidade === "mensal"
          ? { fill: COR.tinta, fillOpacity: 0.04 }
          : { stroke: COR.grade, strokeWidth: 1 }
      }
      content={({ active, payload }) => {
        const ponto = payload?.[0]?.payload as
          (PontoDoInvestidor & { rotulo: string }) | undefined;
        if (!active || !ponto) return null;

        return (
          <Balao titulo={ponto.rotulo}>
            <ValorDoBalao>{formatarMoeda(ponto.valor)}</ValorDoBalao>
            <p className="text-[0.6875rem] text-neutral-500">
              {ponto.projetado
                ? "projeção"
                : modalidade === "mensal"
                  ? ponto.valor > 0
                    ? "crédito lançado"
                    : "sem crédito neste mês"
                  : "saldo apurado"}
            </p>
          </Balao>
        );
      }}
    />
  );

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {modalidade === "mensal" ? (
          <BarChart
            accessibilityLayer
            data={dados}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            {eixos}
            {hoje}
            {balao}
            <Bar
              dataKey="real"
              fill={COR.marinho}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
            {/* A projecao em ambar e translucida: mesma familia do "retido" no
                resto do painel, e clara o bastante para nao competir com o que
                de fato foi pago. */}
            <Bar
              dataKey="projecao"
              fill={COR.ouro}
              fillOpacity={0.55}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        ) : (
          <AreaChart
            accessibilityLayer
            data={dados}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COR.marinho} stopOpacity={0.28} />
                <stop offset="100%" stopColor={COR.marinho} stopOpacity={0} />
              </linearGradient>
            </defs>
            {eixos}
            {hoje}
            {balao}
            <Area
              type="monotone"
              dataKey="real"
              stroke={COR.marinho}
              strokeWidth={2}
              fill={`url(#${gradiente})`}
              dot={false}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="projecao"
              stroke={COR.ouro}
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="none"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export type FatiaDoCaptado = { nome: string; valor: number };

/**
 * Entradas de contrato x aditivos, com o total captado no meio.
 *
 * Rosca e nao pizza: o buraco é onde mora o total, e é ele que responde a
 * pergunta da tela. As duas fatias sozinhas dariam a proporcao sem o numero.
 */
export function GraficoDoCaptado({
  fatias,
  total,
  paleta = "origem",
  rotulo = "Captado",
}: {
  fatias: FatiaDoCaptado[];
  total: number;
  /**
   * Qual conjunto de cores usar. **Um nome, e nao os hexes.**
   *
   * A pagina que monta esta rosca é Server Component, e as cores moram neste
   * modulo, que é `"use client"`. Valor exportado de modulo cliente **nao
   * atravessa** essa fronteira: o servidor recebe uma referencia, e nao a
   * string. Era o que deixava as duas fatias pretas — o `fill` chegava
   * invalido e o Recharts caia na cor padrao dele.
   *
   * Um nome é dado comum: atravessa, e a escolha da cor acontece deste lado.
   */
  paleta?: "origem" | "modalidade";
  /** A palavra no buraco, acima do total. */
  rotulo?: string;
}) {
  const CORES =
    paleta === "modalidade"
      ? [COR_DA_MODALIDADE.mensal, COR_DA_MODALIDADE.final]
      : [COR.marinho, COR.ceu];

  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={fatias}
            dataKey="valor"
            nameKey="nome"
            innerRadius="66%"
            outerRadius="92%"
            // Sem espaco entre as fatias e sem borda: o anel é uma barra
            // dobrada em circulo, e corte nele leria como uma terceira fatia.
            paddingAngle={0}
            strokeWidth={0}
            // De cima, no sentido do relogio — como se le um relogio, e nao
            // como o Recharts desenha por padrao (da direita, anti-horario).
            startAngle={90}
            endAngle={-270}
          >
            {fatias.map((fatia, i) => (
              <Cell key={fatia.nome} fill={CORES[i % CORES.length]} />
            ))}
          </Pie>

          <Tooltip
            content={({ active, payload }) => {
              const fatia = payload?.[0]?.payload as FatiaDoCaptado | undefined;
              if (!active || !fatia) return null;

              return (
                <Balao titulo={fatia.nome}>
                  <ValorDoBalao>{formatarMoeda(fatia.valor)}</ValorDoBalao>
                  <p className="text-[0.6875rem] text-neutral-500 tabular-nums">
                    {formatarPercentual(fatia.valor / total, 1)} do captado
                  </p>
                </Balao>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* O total por cima do buraco, e nao num `<text>` do SVG: aqui ele herda
          a fonte e o `tabular-nums` da pagina, e quebra em duas linhas sozinho
          quando a coluna aperta. `pointer-events-none` para nao roubar o toque
          das fatias. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[0.625rem] font-semibold tracking-wider text-neutral-400 uppercase">
          {rotulo}
        </span>
        <span className="mt-0.5 text-lg font-bold tracking-tight tabular-nums text-tinta">
          {formatarMoedaCurta(total)}
        </span>
      </div>
    </div>
  );
}

/**
 * As cores das duas modalidades. **Fonte unica** — a rosca e o pontinho da
 * tabela leem daqui. (A barra empilhada que tambem lia saiu com o bloco
 * redundante; o pontinho da tabela usa as classes do Tailwind, e nao este
 * objeto, porque vive num componente de servidor.)
 *
 * **Sao as mesmas de "Captado por origem", por escolha de quem desenha a tela.**
 * Nao sao copias dos valores: apontam para `COR.marinho` e `COR.ceu`, os mesmos
 * tokens que a outra rosca usa por padrao, entao as duas nunca podem divergir num
 * ajuste futuro de paleta.
 *
 * O que se perde, e fica registrado: as duas roscas aparecem **lado a lado**, e
 * agora o mesmo indigo escuro quer dizer "entradas de contrato" numa e "retorno
 * mensal" na outra. Quem passar o olho pelas duas de uma vez pode ler a cor como
 * se fosse o mesmo assunto. Os titulos e a legenda de cada bloco sao o que
 * separa — antes a cor separava sozinha.
 *
 * Se um dia a leitura cruzada atrapalhar, o caminho de volta é trocar estes dois
 * valores por um par de outra familia; nada mais precisa mudar.
 */
export const COR_DA_MODALIDADE = {
  /** O tom cheio, como as entradas de contrato na rosca vizinha. */
  mensal: COR.marinho,
  /** O tom claro, como os aditivos. */
  final: COR.ceu,
} as const;

export type FaixaDoRelogio = { hora: number; aberturas: number };

/**
 * A que horas o portal é aberto — as 24 horas do dia, no fuso de Brasilia.
 *
 * As barras existem para uma pergunta pratica: quando avisar. O portal manda
 * notificacao, e o horario em que as pessoas ja estao olhando é diferente do
 * horario em que é comodo disparar.
 *
 * **As 24 faixas aparecem sempre, inclusive as vazias.** O eixo aqui é o
 * relogio, e nao a lista do que aconteceu: omitir as horas sem acesso faria a
 * madrugada encostar na manha e a tarde parecer continua quando nao foi.
 *
 * O rotulo do eixo vai de tres em tres. Vinte e quatro numeros de 11px numa
 * faixa dessa largura se sobrepoem, e o que se le num grafico de horario é a
 * forma — a manha contra a noite —, nao o valor exato de cada hora, que o balao
 * entrega no ponteiro.
 */
export function GraficoDeHoras({ faixas }: { faixas: FaixaDoRelogio[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer
          data={faixas}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="hora"
            {...EIXO}
            interval={2}
            tickFormatter={(hora: number) => `${hora}h`}
          />
          <YAxis {...EIXO} width={36} allowDecimals={false} tickCount={4} />

          <Tooltip
            cursor={{ fill: COR.tinta, fillOpacity: 0.04 }}
            content={({ active, payload }) => {
              const faixa = payload?.[0]?.payload as FaixaDoRelogio | undefined;
              if (!active || !faixa) return null;

              return (
                <Balao
                  titulo={`Entre ${faixa.hora}h e ${(faixa.hora + 1) % 24}h`}
                >
                  <ValorDoBalao>
                    {faixa.aberturas}{" "}
                    {faixa.aberturas === 1 ? "tela aberta" : "telas abertas"}
                  </ValorDoBalao>
                </Balao>
              );
            }}
          />

          <Bar
            dataKey="aberturas"
            fill={COR.marinho}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
