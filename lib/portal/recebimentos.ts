import type { Aporte, DataISO } from "./dados";

/**
 * Recebimentos da modalidade `mensal`: o resultado é creditado todo dia 17, e
 * nao acumula no saldo.
 *
 * **O portal nao calcula credito.** O que ele mostra é a tabela `recebimentos`,
 * linha por linha — o que de fato caiu na conta. Antes havia uma data de corte:
 * ate ela valia a tabela, dali em diante a formula projetava sozinha. O defeito
 * é o de todo sistema que mistura os dois: a tela dizia um numero que ninguem
 * tinha lancado, e um credito que saiu diferente da formula virava divergencia
 * entre o extrato e o portal.
 *
 * A formula continua aqui, e continua sendo a mesma — só mudou de papel. Ela é
 * a **estimativa** do `/admin/lancamentos`: sugere o valor do ciclo, ja
 * preenchido no campo, e quem lanca confirma ou corrige. O numero que a pessoa
 * ve é sempre um que passou por essa conferencia.
 *
 * Convencoes do regime, todas vindas do contrato e nao de calendario:
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

/** O dia do mes em que o credito cai. */
export const DIA_DO_CREDITO = 17;
const DIAS_DO_MES = 30;

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

/**
 * Um credito que caiu na conta.
 *
 * Sai da tabela `recebimentos`, e de lugar nenhum mais — por isso nao ha mais
 * `origem` nem a conta do ciclo aqui: nao ha o que distinguir, e atribuir uma
 * formula a um valor digitado seria inventar a explicacao dele.
 */
export type Recebimento = {
  data: DataISO;
  /** Competencia `AAAA-MM`, para o eixo do grafico. */
  competencia: string;
  valor: number;
  /** Anotacao do lancamento, quando houver. */
  observacao?: string;
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

/** O dia do credito de uma competencia `AAAA-MM`. */
export function dataDoCredito(competencia: string): DataISO {
  return `${competencia}-${String(DIA_DO_CREDITO).padStart(2, "0")}`;
}

/** O que a conta precisa de um aporte — o resto do `Aporte` nao entra nela. */
export type AporteMensal = Pick<
  Aporte,
  "data" | "valor" | "taxaMensal" | "modalidade"
>;

/**
 * As faixas de participacao saem dos proprios aportes: cada um passa a valer a
 * taxa dele a partir da sua data. Datas repetidas ficam com a ultima taxa
 * lancada, e faixas que repetem a taxa anterior sao descartadas.
 */
export function faixasDeParticipacao(aportes: AporteMensal[]): Faixa[] {
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
 * O historico de creditos: a tabela, e nada alem dela.
 *
 * Mes sem linha é mes sem credito — nada é completado, nada é projetado. Tudo
 * que chega aqui ja passou pelo `/admin`, entao a tela nunca mostra um numero
 * que ninguem conferiu.
 */
export function montarRecebimentos(
  referencia: DataISO,
  lancados: RecebimentoLancado[] = [],
): Recebimentos {
  const pagamentos: Recebimento[] = lancados
    // Credito com data futura existe: o lancamento pode ser preparado antes do
    // dia 17. Ele fica de fora ate a data chegar.
    .filter((l) => l.data <= referencia)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((l) => ({
      data: l.data,
      competencia: competenciaDe(l.data),
      valor: l.valor,
      ...(l.observacao ? { observacao: l.observacao } : {}),
    }));

  return { pagamentos, totalPago: somarCentavos(pagamentos) };
}

/** A sugestao de credito para um ciclo, com a conta que a produziu. */
export type Estimativa = {
  /** O valor do ciclo, em reais, ja fechado no centavo. */
  valor: number;
  /** Capital que rendeu no ciclo. */
  capital: number;
  /**
   * A participacao aplicada. Quase sempre um trecho de 30 dias; dois quando a
   * taxa mudou no meio, e ai cada um traz os dias que lhe couberam.
   */
  trechos: TrechoDeTaxa[];
  /** `true` quando algum aporte ou troca de taxa partiu o ciclo. */
  quebrado: boolean;
  /** Participacao vigente no fim do ciclo, em decimal. */
  taxaVigente: number;
};

/**
 * Quanto renderia o ciclo que fecha em `data` — um dia 17.
 *
 * É a conta do contrato, e serve de sugestao para quem lanca: o ciclo cobre
 * `[dia 17 anterior, dia 17 deste mes)`, e um aporte entra a partir da propria
 * data, entao o primeiro credito dele é sempre o quebrado.
 *
 * Sugestao, e nao verdade — o valor que vale é o que for gravado em
 * `recebimentos`.
 */
export function estimarCiclo(
  aportes: AporteMensal[],
  data: DataISO,
): Estimativa {
  const mensais = aportes
    .filter((a) => a.modalidade === "mensal")
    .sort((a, b) => a.data.localeCompare(b.data));

  const faixas = faixasDeParticipacao(mensais);
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

  return {
    valor: dividirMeioParaCima(micro, DIVISOR) / 100,
    capital,
    trechos,
    // Rateado por qualquer um dos tres motivos: a taxa mudou no meio, o ciclo
    // nao teve os 30 dias, ou um aporte entrou depois do dia 17. Sem capital
    // nao ha ciclo, e ai nao ha o que ratear.
    quebrado:
      capital > 0 &&
      (trechos.length > 1 || diasCobertos < DIAS_DO_MES || entrouNoMeio),
    taxaVigente: taxaEm(faixas, data),
  };
}
