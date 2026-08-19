"use client";

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

/** O que o grafico de creditos recebe: um ponto por mes. */
export type PontoDoMes = {
  competencia: string;
  valor: number;
  quantos: number;
};

/**
 * Quanto foi pago em credito, mes a mes — a carteira inteira somada.
 *
 * Area, e nao barras: no portal cada barra é o credito daquela pessoa, um evento
 * fechado. Aqui a linha é o desembolso da casa ao longo do tempo, e o que se
 * quer ver é a curva — se esta subindo, e quanto.
 */
export function GraficoDeCreditos({
  pontos,
  competenciaAtual,
}: {
  pontos: PontoDoMes[];
  /** `AAAA-MM` de hoje, vindo do servidor: o relogio do navegador é outro. */
  competenciaAtual: string;
}) {
  const dados = pontos.map((ponto) => ({
    ...ponto,
    rotulo: formatarCompetenciaCurta(ponto.competencia),
    atual: ponto.competencia === competenciaAtual,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer
          data={dados}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            {/* O degrade morre antes da base: area chapada em azul pesa mais que
                a curva, e é a curva que carrega a informacao. */}
            <linearGradient id="area-creditos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR.azul} stopOpacity={0.28} />
              <stop offset="100%" stopColor={COR.azul} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis dataKey="rotulo" {...EIXO} interval="preserveStartEnd" />
          <YAxis
            {...EIXO}
            width={72}
            tickFormatter={formatarMoedaCurta}
            tickCount={4}
          />

          <Tooltip
            // A linha de referencia do Recharts vem cinza-claro por padrao e
            // sumia sobre o branco do cartao.
            cursor={{ stroke: COR.grade, strokeWidth: 1 }}
            content={({ active, payload }) => {
              const ponto = payload?.[0]?.payload as
                | (PontoDoMes & { rotulo: string })
                | undefined;
              if (!active || !ponto) return null;

              return (
                <Balao titulo={ponto.rotulo}>
                  <ValorDoBalao>{formatarMoeda(ponto.valor)}</ValorDoBalao>
                  <p className="text-[0.6875rem] text-neutral-500">
                    {ponto.quantos}{" "}
                    {ponto.quantos === 1 ? "crédito" : "créditos"}
                  </p>
                </Balao>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="valor"
            stroke={COR.azul}
            strokeWidth={2}
            fill="url(#area-creditos)"
            // O ponto aparece so onde o ponteiro esta: um marcador por mes em
            // dez meses vira uma fileira de bolinhas competindo com a curva.
            dot={false}
            activeDot={{ r: 4, fill: COR.azul, stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
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

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer
          data={dados}
          margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="area-captacao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR.marinho} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COR.marinho} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis dataKey="rotulo" {...EIXO} interval="preserveStartEnd" />
          <YAxis
            {...EIXO}
            width={72}
            tickFormatter={formatarMoedaCurta}
            tickCount={4}
            /* O topo do eixo acomoda a meta, e nao só a curva: sem isto a linha
               tracejada cairia fora da area desenhada e a comparacao — que é o
               ponto do grafico — nao apareceria. */
            domain={[0, meta ? Math.max(meta, ...dados.map((d) => d.acumulado)) : "auto"]}
          />

          {meta && (
            <ReferenceLine
              y={meta}
              stroke={COR.ouro}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Meta ${formatarMoedaCurta(meta)}`,
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
                | (PontoDaCurva & { rotulo: string })
                | undefined;
              if (!active || !ponto) return null;

              return (
                <Balao titulo={ponto.rotulo}>
                  <ValorDoBalao>{formatarMoeda(ponto.acumulado)}</ValorDoBalao>
                  <p className="text-[0.6875rem] text-neutral-500 tabular-nums">
                    {ponto.valor > 0
                      ? `+ ${formatarMoeda(ponto.valor)} neste mês`
                      : "sem aporte neste mês"}
                    {meta ? ` · ${formatarPercentual(ponto.acumulado / meta, 1)} da meta` : ""}
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
            fill="url(#area-captacao)"
            dot={false}
            activeDot={{ r: 4, fill: COR.marinho, stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type PontoDoRendimento = {
  competencia: string;
  pago: number;
  provisionado: number;
};

/**
 * O resultado de cada modalidade, mes a mes — e as duas **nao** se somam.
 *
 * `pago` é o credito que saiu do caixa para os contratos `mensal`, lido da
 * tabela `recebimentos`. `provisionado` é o que os contratos `final` renderam
 * naquele mes e ficou retido, a pagar no resgate — vem da formula, porque nao ha
 * tabela do que ainda nao foi pago.
 *
 * Barras lado a lado, e nao empilhadas: empilhar somaria visualmente caixa que
 * saiu com divida que cresceu, e o topo da pilha seria um numero que nao existe.
 * Lado a lado, cada um se le sozinho e a comparacao continua imediata.
 *
 * Cores de familias diferentes pelo mesmo motivo: o indigo é o dinheiro que
 * andou; o ambar é o que ficou devendo.
 */
export function GraficoDeRendimento({ pontos }: { pontos: PontoDoRendimento[] }) {
  const dados = pontos.map((ponto) => ({
    ...ponto,
    rotulo: formatarCompetenciaCurta(ponto.competencia),
  }));

  // Uma modalidade sem nenhum valor nao vira barra invisivel na legenda.
  const temPago = pontos.some((p) => p.pago > 0);
  const temProvisao = pontos.some((p) => p.provisionado > 0);

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
            width={72}
            tickFormatter={formatarMoedaCurta}
            tickCount={4}
          />

          <Tooltip
            cursor={{ fill: COR.tinta, fillOpacity: 0.04 }}
            content={({ active, payload }) => {
              const ponto = payload?.[0]?.payload as
                | (PontoDoRendimento & { rotulo: string })
                | undefined;
              if (!active || !ponto) return null;

              return (
                <Balao titulo={ponto.rotulo}>
                  {temPago && (
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-tinta">
                      {formatarMoeda(ponto.pago)}
                      <span className="ml-1.5 text-[0.6875rem] font-normal text-neutral-500">
                        pago no mensal
                      </span>
                    </p>
                  )}
                  {temProvisao && (
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-tinta">
                      {formatarMoeda(ponto.provisionado)}
                      <span className="ml-1.5 text-[0.6875rem] font-normal text-neutral-500">
                        provisionado no final
                      </span>
                    </p>
                  )}
                </Balao>
              );
            }}
          />

          {/* As cores saem de `COR_DA_MODALIDADE`, e nao de literais: a legenda
              abaixo do grafico le do mesmo lugar, e com dois literais separados
              elas divergiriam no primeiro ajuste de paleta — que foi
              exatamente o que quase aconteceu. */}
          {temPago && (
            <Bar
              dataKey="pago"
              fill={COR_DA_MODALIDADE.mensal}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
          )}
          {temProvisao && (
            <Bar
              dataKey="provisionado"
              fill={COR_DA_MODALIDADE.final}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
          )}
        </BarChart>
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

  const eixos = (
    <>
      <XAxis dataKey="rotulo" {...EIXO} interval="preserveStartEnd" />
      <YAxis {...EIXO} width={72} tickFormatter={formatarMoedaCurta} tickCount={4} />
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
          | (PontoDoInvestidor & { rotulo: string })
          | undefined;
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
            {balao}
            <Bar dataKey="real" fill={COR.marinho} radius={[3, 3, 0, 0]} maxBarSize={22} />
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
              <linearGradient id="area-investidor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COR.marinho} stopOpacity={0.28} />
                <stop offset="100%" stopColor={COR.marinho} stopOpacity={0} />
              </linearGradient>
            </defs>
            {eixos}
            {balao}
            <Area
              type="monotone"
              dataKey="real"
              stroke={COR.marinho}
              strokeWidth={2}
              fill="url(#area-investidor)"
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
  cores,
  rotulo = "Captado",
}: {
  fatias: FatiaDoCaptado[];
  total: number;
  /**
   * As cores das fatias, na ordem. Quando a rosca corta por modalidade elas
   * precisam ser as mesmas da barra e da tabela logo abaixo — a mesma coisa com
   * duas cores em blocos vizinhos lê como duas coisas.
   */
  cores?: string[];
  /** A palavra no buraco, acima do total. */
  rotulo?: string;
}) {
  const CORES = cores ?? [COR.marinho, COR.ceu];

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
              const fatia = payload?.[0]?.payload as
                | FatiaDoCaptado
                | undefined;
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

export type BarraDeObra = {
  nome: string;
  capital: number;
  contratos: number;
  porMes: number;
  /** Meta de captacao. `null` quando ninguem definiu — dado so do /admin. */
  meta: number | null;
  progresso: number | null;
};

/**
 * Captacao por obra, em barras deitadas: o que entrou e o que falta para a meta.
 *
 * Deitadas porque o rotulo é nome de empreendimento: em pé, "Tourmaline Tower"
 * ou vira meia palavra ou sai na diagonal. A altura acompanha a quantidade de
 * obras — barra fina em tela cheia parece defeito, e barra gorda em duas obras
 * parece outra coisa.
 *
 * **Empilhada, e nao duas barras lado a lado.** A barra inteira é a meta, e a
 * parte cheia é o captado: o vao que sobra *é* o que falta, e se le sem
 * legenda. Em barras agrupadas o olho compara dois comprimentos e precisa fazer
 * a subtracao sozinho.
 *
 * O eixo é absoluto, e nao percentual: assim duas obras com metas diferentes
 * aparecem com larguras diferentes, que é a verdade — uma obra de 6 milhoes a
 * 50% e uma de 1 milhao a 50% nao sao a mesma coisa para quem capta.
 *
 * Obra sem meta vira barra só de captado, sem vao: nao ha o que faltar quando
 * nao ha alvo.
 */
export function GraficoDeObras({ obras }: { obras: BarraDeObra[] }) {
  const altura = Math.max(140, obras.length * 52 + 24);

  const dados = obras.map((obra) => ({
    ...obra,
    // O que completa a barra ate a meta. Nunca negativo: captado acima da meta
    // fecha a barra, e o excedente aparece no tooltip e no percentual.
    falta: obra.meta ? Math.max(0, obra.meta - obra.capital) : 0,
  }));

  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer
          data={dados}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nome"
            {...EIXO}
            width={148}
            tick={{ fill: COR.tinta, fontSize: 12, fontWeight: 600 }}
          />

          <Tooltip
            // O realce padrao é um retangulo cinza na faixa inteira, que aqui
            // cobre o nome da obra junto.
            cursor={{ fill: COR.tinta, fillOpacity: 0.04 }}
            content={({ active, payload }) => {
              const obra = payload?.[0]?.payload as BarraDeObra | undefined;
              if (!active || !obra) return null;

              return (
                <Balao titulo={obra.nome}>
                  <ValorDoBalao>{formatarMoeda(obra.capital)}</ValorDoBalao>
                  {obra.meta ? (
                    <p className="text-[0.6875rem] text-neutral-500 tabular-nums">
                      {formatarPercentual(obra.progresso ?? 0, 1)} de{" "}
                      {formatarMoeda(obra.meta)}
                    </p>
                  ) : (
                    <p className="text-[0.6875rem] text-neutral-400">
                      Sem meta definida
                    </p>
                  )}
                  <p className="text-[0.6875rem] text-neutral-500 tabular-nums">
                    {obra.contratos}{" "}
                    {obra.contratos === 1 ? "contrato" : "contratos"} ·{" "}
                    {formatarMoeda(obra.porMes)} por mês
                  </p>
                </Balao>
              );
            }}
          />

          {/* A ordem importa: o captado primeiro, encostado no eixo. */}
          <Bar dataKey="capital" stackId="obra" fill={COR.marinho} maxBarSize={22} />
          <Bar
            dataKey="falta"
            stackId="obra"
            fill={COR.tinta}
            fillOpacity={0.1}
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * A participacao de cada modalidade no capital, numa barra só.
 *
 * Nao é grafico do Recharts: sao duas divs. Uma barra empilhada de duas fatias
 * nao precisa de eixo, de escala nem de tooltip — o rotulo ao lado ja diz tudo
 * —, e chamar a biblioteca para desenhar dois retangulos seria trocar CSS por
 * SVG sem ganhar nada.
 */
export function BarraDeModalidades({
  fatias,
}: {
  fatias: { nome: string; valor: number; cor: string }[];
}) {
  const total = fatias.reduce((soma, f) => soma + f.valor, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div
        aria-hidden
        className="flex h-2 overflow-hidden rounded-full bg-zinc-100"
      >
        {fatias.map((fatia) => (
          <div
            key={fatia.nome}
            style={{
              width: `${(fatia.valor / total) * 100}%`,
              backgroundColor: fatia.cor,
            }}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {fatias.map((fatia) => (
          <li key={fatia.nome} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: fatia.cor }}
            />
            <span className="text-neutral-500">{fatia.nome}</span>
            <span className="font-semibold tabular-nums text-tinta">
              {formatarPercentual(fatia.valor / total, 1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * As cores das duas modalidades. **Fonte unica** — barra, rosca, pontinho da
 * tabela, barras do rendimento e legenda leem daqui.
 *
 * Sao de familias diferentes de proposito: mensal e final nao sao duas partes de
 * uma coisa, sao dois produtos com regras opostas — um paga todo mes, o outro
 * segura tudo ate o resgate. Duas tonalidades da mesma cor diriam o contrario.
 *
 * **Nenhuma das duas é o indigo.** O `marinho` é a cor de "captado por origem",
 * na rosca vizinha, onde ele é "entradas de contrato". As duas roscas aparecem
 * lado a lado, e ate aqui o indigo estava nas duas significando coisas
 * diferentes — o mesmo tom dizendo "entrada" a esquerda e "mensal" a direita.
 * Agora a rosca da origem fica na familia do indigo (duas partes de um todo) e a
 * da modalidade em duas familias proprias.
 *
 * O ambar do `final` é o mesmo que marca "provisionado" e "retido" no resto do
 * painel: ali ele ja quer dizer "dinheiro que ainda nao saiu".
 */
export const COR_DA_MODALIDADE = {
  /** Ciano: o dinheiro que circula todo mes. */
  mensal: "#0891b2",
  /** Ambar: o que fica retido ate o resgate. */
  final: COR.ouro,
} as const;
