import type { Aporte, DataISO } from "./dados";
import { faixasDeParticipacao, taxaEm } from "./recebimentos";

/** Um mes fechado (ou o mes corrente, parcial) da posicao do investidor. */
export type MesDaPosicao = {
  /** Competencia `AAAA-MM`. */
  competencia: string;
  saldoInicial: number;
  aportes: number;
  /** Capital aportado ao fim do mes — a base de calculo dos juros simples. */
  capital: number;
  /** Resultado apurado no mes, somando todos os aportes. */
  rendimento: number;
  saldoFinal: number;
  /** `true` no mes corrente, que ainda nao fechou. */
  parcial: boolean;
};

export type Posicao = {
  referencia: DataISO;
  serie: MesDaPosicao[];
  saldoAtual: number;
  totalAportado: number;
  /**
   * Resultado retido no saldo — ou seja, so da modalidade `final`. O que é
   * creditado todo mes vive na tabela `recebimentos`, em outro regime (base
   * 30/360, credito no dia 17); somar os dois aqui misturaria as contas.
   */
  rendimentoAcumulado: number;
  /** Resultado sobre o capital aportado, em decimal. */
  rentabilidadeAcumulada: number;
  /** Resultado apurado no mes corrente ate a data de referencia. */
  rendimentoNoMes: number;
  /** Um mes cheio na participacao vigente. Em juros simples é exato. */
  rendimentoMensalCheio: number;
  /** Dias ja decorridos e dias totais do mes corrente. */
  diasDoMesCorrente: { decorridos: number; total: number };
  /**
   * Participacao vigente na data de referencia, em decimal.
   *
   * Uma taxa só, e nao uma por aporte: quando um aporte traz taxa nova, ela
   * passa a valer para o capital inteiro daquele dia em diante. Ver as
   * convencoes em `recebimentos.ts`.
   */
  participacaoMensal: number;
};

/** Um aporte no historico, com a participacao anterior quando ela mudou. */
export type ItemDoHistorico = {
  aporte: Aporte;
  /** Presente so quando este aporte trouxe participacao diferente do anterior. */
  taxaAnterior?: number;
};

type PartesDaData = { ano: number; mes: number; dia: number };

function partes(iso: DataISO): PartesDaData {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return { ano, mes, dia };
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function competenciaDe(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/**
 * Apura a posicao mes a mes, do primeiro aporte ate a data de referencia.
 *
 * Regime: **juros simples**. O resultado de cada mes incide apenas sobre o
 * capital aportado — `capital x participacao` —, nunca sobre o resultado ja
 * acumulado. Aportes rendem pro rata die no proprio mes de entrada, e o mes
 * corrente é apurado proporcionalmente aos dias ja decorridos.
 *
 * A modalidade decide o que entra aqui:
 * - `final`: o resultado acumula no saldo e é recebido de uma vez no resgate.
 * - `mensal`: entra so como capital. O resultado dele é creditado todo dia 17 e
 *   nao acumula — ele é lancado no /admin e lido de `recebimentos`, em base
 *   30/360, e nao no calendario deste apurador.
 *
 * Devolve `null` quando nao ha aporte nenhum — carteira vazia nao tem posicao a
 * apurar, e a tela mostra o estado vazio em vez de uma serie de zeros.
 */
export function apurarPosicao(
  aportes: Aporte[],
  referencia: DataISO,
): Posicao | null {
  if (aportes.length === 0) return null;

  const ordenados = [...aportes].sort((a, b) => a.data.localeCompare(b.data));

  const inicio = partes(ordenados[0].data);
  const fim = partes(referencia);

  const serie: MesDaPosicao[] = [];
  let capital = 0; // base de calculo: so o que foi aportado
  let rendimentoAcumulado = 0; // apurado, retido ou nao
  let retido = 0; // a parte que fica no saldo (modalidade `final`)
  let ano = inicio.ano;
  let mes = inicio.mes;
  let diasDoMesCorrente = { decorridos: 0, total: 0 };

  while (ano < fim.ano || (ano === fim.ano && mes <= fim.mes)) {
    const competencia = competenciaDe(ano, mes);
    const totalDeDias = diasNoMes(ano, mes);
    const parcial = ano === fim.ano && mes === fim.mes;
    const diasDecorridos = parcial
      ? Math.min(fim.dia, totalDeDias)
      : totalDeDias;
    if (parcial) {
      diasDoMesCorrente = { decorridos: diasDecorridos, total: totalDeDias };
    }

    const saldoInicial = capital + retido;
    let rendimentoDoMes = 0;
    let retidoDoMes = 0;
    let aportadoNoMes = 0;

    for (const aporte of ordenados) {
      if (aporte.data > competencia + "-31") continue; // ainda nao entrou
      const entrouAgora = aporte.data.startsWith(competencia);

      // Quantos dias do mes este aporte passou rendendo.
      let diasRendendo: number;
      if (entrouAgora) {
        const dia = partes(aporte.data).dia;
        if (dia > diasDecorridos) continue; // aporte ainda nao ocorreu
        diasRendendo = diasDecorridos - dia + 1;
        aportadoNoMes += aporte.valor;
        capital += aporte.valor;
      } else {
        diasRendendo = diasDecorridos;
      }

      // So a modalidade `final` rende aqui. Ver a nota do topo.
      if (aporte.modalidade !== "final") continue;

      const rendimento =
        aporte.valor * aporte.taxaMensal * (diasRendendo / totalDeDias);
      rendimentoDoMes += rendimento;
      retidoDoMes += rendimento;
    }

    rendimentoAcumulado += rendimentoDoMes;
    retido += retidoDoMes;

    serie.push({
      competencia,
      saldoInicial,
      aportes: aportadoNoMes,
      capital,
      rendimento: rendimentoDoMes,
      saldoFinal: capital + retido,
      parcial,
    });

    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  const totalAportado = capital;
  const ultimo = serie[serie.length - 1];
  const participacaoMensal = taxaEm(faixasDeParticipacao(ordenados), referencia);

  return {
    referencia,
    serie,
    saldoAtual: capital + retido,
    totalAportado,
    rendimentoAcumulado,
    rentabilidadeAcumulada:
      totalAportado > 0 ? rendimentoAcumulado / totalAportado : 0,
    rendimentoNoMes: ultimo?.rendimento ?? 0,
    rendimentoMensalCheio: totalAportado * participacaoMensal,
    diasDoMesCorrente,
    participacaoMensal,
  };
}

/**
 * Aportes do mais recente para o primeiro, marcando onde a participacao mudou
 * em relacao ao aporte anterior — é o que rende o "de x para y" no cartao.
 */
export function montarHistorico(aportes: Aporte[]): ItemDoHistorico[] {
  const ordenados = [...aportes].sort((a, b) => a.data.localeCompare(b.data));

  return ordenados
    .map((aporte, indice) => {
      const anterior = indice > 0 ? ordenados[indice - 1] : undefined;
      const mudou = anterior && anterior.taxaMensal !== aporte.taxaMensal;
      return { aporte, taxaAnterior: mudou ? anterior.taxaMensal : undefined };
    })
    .reverse();
}
