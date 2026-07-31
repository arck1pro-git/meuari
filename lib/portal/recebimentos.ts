import type { Aporte, DataISO } from "./dados";

/**
 * Recebimentos da modalidade `mensal`: o resultado é creditado todo dia 17, e
 * nao acumula no saldo.
 *
 * Convencoes deste regime, todas vindas do contrato e nao de calendario:
 *
 * - **Mes é sempre 30 dias** (base 30/360). Dois dias 17 seguidos distam 30
 *   dias, mesmo quando o mes civil tem 28 ou 31.
 * - **A participacao é a mensal, rateada pelos dias**: `taxa x dias / 30`, sem
 *   arredondar a diaria no meio do caminho. Um ciclo cheio rende exatamente a
 *   taxa contratada — 30 dias a 2,60% dao 2,600%, e nao 2,601%.
 * - **Credito no dia 17.** Um aporte que entra fora dessa data nao espera o
 *   ciclo inteiro: ele recebe o *quebrado*, so os dias entre a entrada e o
 *   proximo dia 17.
 * - **A participacao vigente vale para o capital inteiro.** Quando um aporte
 *   traz taxa nova, ela passa a valer para tudo a partir daquele dia — sem
 *   efeito retroativo. Se a troca cai no meio de um ciclo, o ciclo é rateado:
 *   os dias antes correm na taxa antiga e os dias depois na nova.
 */

const DIA_DO_CREDITO = 17;
const DIAS_DO_MES = 30;

/**
 * Onde a formula assume.
 *
 * O passado nem sempre seguiu a regra — houve creditos fora da conta —, entao
 * ate esta data o historico vem da tabela `recebimentos`, lancado a mao, e nao
 * do calculo. Daqui em diante o portal calcula.
 *
 * Mover esta data é a unica coisa que precisa mudar para esticar ou encurtar o
 * trecho lancado.
 */
export const PRIMEIRO_CICLO_CALCULADO = "2026-07-01";

/** Um pedaco do ciclo em que valeu uma taxa. */
export type TrechoDeTaxa = {
  /** Participacao mensal contratada, em decimal. */
  taxa: number;
  dias: number;
};

/*
 * Daqui para baixo o dinheiro anda em inteiros. Motivo concreto: ha creditos que
 * caem em cima do meio centavo. Em ponto flutuante eles pousam ora um fio acima,
 * ora um fio abaixo da metade, conforme a ordem das somas, e o centavo exibido
 * vira sorteio — o total chegou a ficar um centavo fora da soma das barras. Com
 * inteiros a regra é uma só e sempre a mesma: meio centavo sobe.
 */

/** A taxa mensal em milionesimos: 2,30% = 23000. */
function taxaMicro(taxaMensal: number): number {
  return Math.round(taxaMensal * 1e6);
}

/** Reais para centavos. O banco guarda `numeric(14,2)`, entao nao ha fracao. */
function paraCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Divisao inteira com meio para cima.
 *
 * Numerador e denominador sao inteiros exatos (bem abaixo de 2^53), entao o
 * resto é exato e nao existe o "quase 0,5" que faz o binario decidir errado.
 */
function dividirMeioParaCima(numerador: number, denominador: number): number {
  const inteiro = Math.floor(numerador / denominador);
  const resto = numerador - inteiro * denominador;
  return inteiro + (resto * 2 >= denominador ? 1 : 0);
}

/** O que divide o numerador acumulado: 30 dias x 1e6 da taxa. */
const DIVISOR = DIAS_DO_MES * 1e6;

/** Soma valores em reais pelos centavos, para nao acumular sujeira binaria. */
function somarCentavos(itens: { valor: number }[]): number {
  return itens.reduce((soma, i) => soma + paraCentavos(i.valor), 0) / 100;
}

export type Recebimento = {
  /** Data do credito — sempre um dia 17 nos calculados. */
  data: DataISO;
  /** Competencia `AAAA-MM`, para o eixo do grafico. */
  competencia: string;
  valor: number;
  /**
   * De onde veio o valor: `lancado` é o que caiu na conta de verdade, digitado
   * no /admin; `calculado` sai da formula. A tela precisa saber para nao
   * explicar um lancamento com uma conta que nao foi a dele.
   */
  origem: "lancado" | "calculado";
  /** Anotacao do lancamento, quando houver. */
  observacao?: string;
  /** Capital que rendeu no ciclo (o maior valor exposto no periodo). */
  capital: number;
  /**
   * A participacao aplicada no ciclo. Quase sempre um trecho de 30 dias; dois
   * quando a taxa mudou no meio, e ai cada um traz os dias que lhe couberam.
   * Vazio nos lancados.
   */
  trechos: TrechoDeTaxa[];
  /** `true` quando algum aporte ou troca de taxa partiu o ciclo. */
  quebrado: boolean;
};

/** Uma linha da tabela `recebimentos`. */
export type RecebimentoLancado = {
  data: DataISO;
  valor: number;
  observacao: string | null;
};

export type Recebimentos = {
  pagamentos: Recebimento[];
  /** Soma de tudo que ja foi creditado. */
  totalPago: number;
  /** Um ciclo cheio de 30 dias, no capital e na participacao de hoje. */
  mensalCheio: number;
  /** Participacao vigente na data de referencia, em decimal. */
  taxaVigente: number;
  /** A linha do tempo das participacoes contratadas, em ordem. */
  faixas: Faixa[];
  /** Proximo dia 17 depois da referencia. */
  proximaData: DataISO | null;
};

/** Faixa de participacao vigente a partir de uma data. */
export type Faixa = { desde: DataISO; taxa: number };

/**
 * Posicao de uma data na base 30/360: cada mes ocupa 30 dias.
 *
 * O dia 31 colapsa no 30 — é o que faz um credito de 31/01 e outro de 30/01
 * renderem o mesmo quebrado, e é a regra da propria convencao.
 */
function indice360(iso: DataISO): number {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return ano * 360 + (mes - 1) * DIAS_DO_MES + Math.min(dia, DIAS_DO_MES);
}

function somarMes(iso: DataISO, meses: number): DataISO {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const total = (ano * 12 + (mes - 1) + meses) as number;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function competenciaDe(iso: DataISO): string {
  return iso.slice(0, 7);
}

/**
 * As faixas de participacao saem dos proprios aportes: cada um passa a valer a
 * taxa dele a partir da sua data. Datas repetidas ficam com a ultima taxa
 * lancada, e faixas que repetem a taxa anterior sao descartadas.
 */
export function faixasDeParticipacao(aportes: Aporte[]): Faixa[] {
  const porData = new Map<DataISO, number>();
  for (const aporte of [...aportes].sort((a, b) => a.data.localeCompare(b.data))) {
    porData.set(aporte.data, aporte.taxaMensal);
  }

  const faixas: Faixa[] = [];
  for (const [desde, taxa] of porData) {
    if (faixas.at(-1)?.taxa === taxa) continue;
    faixas.push({ desde, taxa });
  }
  return faixas;
}

/**
 * Parte o intervalo `[de, ate)` nos trechos em que cada participacao valeu.
 *
 * Dias fora de qualquer faixa — antes do primeiro aporte — nao entram: o
 * capital ainda nao existia.
 */
function trechosDeTaxa(
  faixas: Faixa[],
  de: DataISO,
  ate: DataISO,
): TrechoDeTaxa[] {
  const inicio = indice360(de);
  const fim = indice360(ate);
  if (fim <= inicio) return [];

  const trechos: TrechoDeTaxa[] = [];
  for (let i = 0; i < faixas.length; i += 1) {
    const desta = indice360(faixas[i].desde);
    const daProxima = faixas[i + 1] ? indice360(faixas[i + 1].desde) : Infinity;

    const a = Math.max(inicio, desta);
    const b = Math.min(fim, daProxima);
    if (b > a) trechos.push({ taxa: faixas[i].taxa, dias: b - a });
  }
  return trechos;
}

/**
 * `dias x taxa` somado, em milionesimos — o fator que multiplica o capital no
 * periodo. Inteiro, para a conta do credito nao passar por decimal nenhum; a
 * divisao por 30 fica para o fim, uma unica vez.
 */
function fatorMicro(faixas: Faixa[], de: DataISO, ate: DataISO): number {
  return trechosDeTaxa(faixas, de, ate).reduce(
    (soma, trecho) => soma + trecho.dias * taxaMicro(trecho.taxa),
    0,
  );
}

/** Participacao vigente numa data. */
export function taxaEm(faixas: Faixa[], data: DataISO): number {
  let taxa = 0;
  for (const faixa of faixas) {
    if (faixa.desde <= data) taxa = faixa.taxa;
  }
  return taxa;
}

/**
 * Monta a agenda de creditos ate a data de referencia.
 *
 * Duas metades, separadas por `PRIMEIRO_CICLO_CALCULADO`:
 *
 * - **Antes**, vale a tabela: o que esta em `lancados` é o que caiu na conta,
 *   inclusive o que fugiu da formula. Nada é calculado ali, nem completado —
 *   mes sem linha é mes sem credito.
 * - **Dali em diante**, vale o calculo: cada credito cobre o intervalo
 *   `[dia 17 anterior, dia 17 deste mes)`, e um aporte entra a partir da propria
 *   data, entao o primeiro credito dele é sempre o quebrado.
 */
export function montarRecebimentos(
  aportes: Aporte[],
  referencia: DataISO,
  lancados: RecebimentoLancado[] = [],
): Recebimentos {
  const mensais = aportes
    .filter((a) => a.modalidade === "mensal")
    .sort((a, b) => a.data.localeCompare(b.data));

  const faixas = faixasDeParticipacao(mensais);
  const taxaVigente = taxaEm(faixas, referencia);

  const historico: Recebimento[] = lancados
    .filter((l) => l.data < PRIMEIRO_CICLO_CALCULADO && l.data <= referencia)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((l) => ({
      data: l.data,
      competencia: competenciaDe(l.data),
      valor: l.valor,
      origem: "lancado" as const,
      ...(l.observacao ? { observacao: l.observacao } : {}),
      // O capital exposto ainda é derivavel dos aportes; a conta do valor, nao.
      capital: mensais
        .filter((a) => a.data <= l.data)
        .reduce((soma, a) => soma + a.valor, 0),
      trechos: [],
      quebrado: false,
    }));

  const vazio: Recebimentos = {
    pagamentos: historico,
    totalPago: somarCentavos(historico),
    mensalCheio: 0,
    taxaVigente,
    faixas,
    proximaData: null,
  };
  if (mensais.length === 0) return vazio;

  const primeiro = mensais[0].data;
  const [anoInicial, mesInicial] = primeiro.split("-").map(Number);

  /*
   * O primeiro credito é o dia 17 seguinte ao primeiro aporte. Se o aporte
   * entrou antes do dia 17, ainda cabe no dia 17 do proprio mes.
   */
  const diaDoPrimeiro = Number(primeiro.slice(8, 10));
  let data = `${anoInicial}-${String(mesInicial).padStart(2, "0")}-${DIA_DO_CREDITO}`;
  if (diaDoPrimeiro >= DIA_DO_CREDITO) data = somarMes(data, 1);

  const pagamentos: Recebimento[] = [...historico];
  let totalEmCentavos = historico.reduce(
    (soma, p) => soma + paraCentavos(p.valor),
    0,
  );
  let proximaData: DataISO | null = null;

  // Um teto de seguranca: sem ele um `referencia` estranho giraria para sempre.
  for (let ciclo = 0; ciclo < 1200; ciclo += 1) {
    if (data > referencia) {
      proximaData = data;
      break;
    }

    // Ciclo dentro do trecho lancado: quem responde por ele é a tabela.
    if (data < PRIMEIRO_CICLO_CALCULADO) {
      data = somarMes(data, 1);
      continue;
    }

    const anterior = somarMes(data, -1);

    // A participacao do ciclo é do periodo, e nao de cada aporte: mesmo quem
    // entrou no dia 8 rende pela taxa que valia nos dias em que esteve dentro.
    const trechos = trechosDeTaxa(faixas, anterior, data);
    const diasCobertos = trechos.reduce((soma, t) => soma + t.dias, 0);

    // Acumula `centavos x dias x taxa`: inteiro exato, fechado no centavo uma
    // unica vez, no fim — arredondar cada aporte antes de somar mudaria o total.
    let micro = 0;
    let capital = 0;
    let entrouNoMeio = false;

    for (const aporte of mensais) {
      if (aporte.data >= data) break; // entrou depois deste ciclo (lista ordenada)

      // Do dia do aporte, e nao do inicio do ciclo: quem entrou no dia 8 rende
      // pelos dias que esteve dentro, na taxa diaria de cada um deles.
      const de = aporte.data > anterior ? aporte.data : anterior;
      const fator = fatorMicro(faixas, de, data);
      if (fator <= 0) continue;

      micro += paraCentavos(aporte.valor) * fator;
      capital += aporte.valor;
      if (aporte.data > anterior) entrouNoMeio = true;
    }

    const centavos = dividirMeioParaCima(micro, DIVISOR);
    totalEmCentavos += centavos;

    pagamentos.push({
      data,
      competencia: competenciaDe(data),
      valor: centavos / 100,
      origem: "calculado",
      capital,
      trechos,
      // Rateado por qualquer um dos tres motivos: a taxa mudou no meio, o ciclo
      // nao teve os 30 dias, ou um aporte entrou depois do dia 17.
      quebrado:
        trechos.length > 1 || diasCobertos < DIAS_DO_MES || entrouNoMeio,
    });

    data = somarMes(data, 1);
  }

  const capitalHoje = mensais
    .filter((a) => a.data <= referencia)
    .reduce((soma, a) => soma + a.valor, 0);

  return {
    pagamentos,
    // Soma dos creditos ja fechados no centavo — o mesmo numero que a pessoa
    // chega somando o que ve no grafico.
    totalPago: totalEmCentavos / 100,
    // Pelo mesmo caminho do credito: um ciclo cheio de 30 dias.
    mensalCheio:
      dividirMeioParaCima(
        paraCentavos(capitalHoje) * DIAS_DO_MES * taxaMicro(taxaVigente),
        DIVISOR,
      ) / 100,
    taxaVigente,
    faixas,
    proximaData,
  };
}
