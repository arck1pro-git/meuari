import type { Aporte, DataISO, FaixaDeTaxa, Investidor } from "./dados";

/** Um mes fechado (ou o mes corrente, parcial) da posicao do investidor. */
export type MesDaPosicao = {
  /** Competencia `AAAA-MM`. */
  competencia: string;
  saldoInicial: number;
  aportes: number;
  taxaMensal: number;
  /** Capital aportado ao fim do mes — a base de calculo dos juros simples. */
  capital: number;
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
  rendimentoAcumulado: number;
  /** Rendimento sobre o capital aportado, em decimal. */
  rentabilidadeAcumulada: number;
  /** Rendimento apurado no mes corrente ate a data de referencia. */
  rendimentoNoMes: number;
  /**
   * Rendimento de um mes cheio na taxa vigente. Em juros simples é exato —
   * capital x taxa —, nao é projecao.
   */
  rendimentoMensalCheio: number;
  /** Dias ja decorridos e dias totais do mes corrente. */
  diasDoMesCorrente: { decorridos: number; total: number };
  taxaAtual: FaixaDeTaxa;
};

/** Evento unificado do historico: aportes e mudancas de taxa em ordem. */
export type EventoDoHistorico =
  | { tipo: "aporte"; data: DataISO; aporte: Aporte; totalApos: number }
  | { tipo: "taxa"; data: DataISO; taxa: FaixaDeTaxa; taxaAnterior?: FaixaDeTaxa };

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

/** Ordem cronologica de `AAAA-MM-DD` — a comparacao lexicografica ja serve. */
function antesOuIgual(a: DataISO, b: DataISO): boolean {
  return a <= b;
}

/**
 * Taxa vigente dentro de uma competencia. Usamos a ultima faixa que passou a
 * valer ate o fim do mes, para que uma faixa iniciada no meio do mes ja valha
 * para ele.
 */
function taxaDaCompetencia(
  taxas: FaixaDeTaxa[],
  ano: number,
  mes: number,
): FaixaDeTaxa {
  const ultimoDia = `${competenciaDe(ano, mes)}-${String(
    diasNoMes(ano, mes),
  ).padStart(2, "0")}`;

  let vigente = taxas[0];
  for (const taxa of taxas) {
    if (antesOuIgual(taxa.vigenteDesde, ultimoDia)) vigente = taxa;
  }
  return vigente;
}

/**
 * Apura a posicao mes a mes, do primeiro aporte ate a data de referencia.
 *
 * Regime: **juros simples**. O rendimento de cada mes incide apenas sobre o
 * capital aportado — `capital x taxa` —, nunca sobre o rendimento ja acumulado.
 * Aportes rendem pro rata die no proprio mes de entrada, e o mes corrente é
 * apurado proporcionalmente aos dias ja decorridos.
 *
 * A taxa é fixa; quando o contrato formaliza uma nova taxa, ela passa a valer
 * para os meses seguintes, sem efeito retroativo sobre o que ja foi apurado.
 */
export function apurarPosicao(
  investidor: Investidor,
  referencia: DataISO,
): Posicao {
  const aportes = [...investidor.aportes].sort((a, b) =>
    a.data.localeCompare(b.data),
  );
  const taxas = [...investidor.taxas].sort((a, b) =>
    a.vigenteDesde.localeCompare(b.vigenteDesde),
  );

  const inicio = partes(aportes[0].data);
  const fim = partes(referencia);

  const serie: MesDaPosicao[] = [];
  let capital = 0; // base de calculo: so o que foi aportado
  let rendimentoAcumulado = 0;
  let ano = inicio.ano;
  let mes = inicio.mes;
  let diasDoMesCorrente = { decorridos: 0, total: 0 };

  while (ano < fim.ano || (ano === fim.ano && mes <= fim.mes)) {
    const competencia = competenciaDe(ano, mes);
    const totalDeDias = diasNoMes(ano, mes);
    const parcial = ano === fim.ano && mes === fim.mes;
    const diasDecorridos = parcial ? Math.min(fim.dia, totalDeDias) : totalDeDias;
    const fracaoDoMes = diasDecorridos / totalDeDias;
    if (parcial) {
      diasDoMesCorrente = { decorridos: diasDecorridos, total: totalDeDias };
    }

    const faixa = taxaDaCompetencia(taxas, ano, mes);
    const i = faixa.taxaMensal;

    const saldoInicial = capital + rendimentoAcumulado;

    // Capital que ja estava na base rende o mes (ou a fracao corrida).
    let rendimento = capital * i * fracaoDoMes;

    let aportadoNoMes = 0;
    for (const aporte of aportes) {
      if (!aporte.data.startsWith(competencia)) continue;
      const dia = partes(aporte.data).dia;
      if (dia > diasDecorridos) continue; // aporte ainda nao ocorreu

      const diasRendendo = diasDecorridos - dia + 1;
      rendimento += aporte.valor * i * (diasRendendo / totalDeDias);
      aportadoNoMes += aporte.valor;
      capital += aporte.valor;
    }

    rendimentoAcumulado += rendimento;

    serie.push({
      competencia,
      saldoInicial,
      aportes: aportadoNoMes,
      taxaMensal: i,
      capital,
      rendimento,
      saldoFinal: capital + rendimentoAcumulado,
      parcial,
    });

    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  const totalAportado = capital;
  const saldoAtual = capital + rendimentoAcumulado;
  const ultimo = serie[serie.length - 1];
  const taxaAtual = taxaDaCompetencia(taxas, fim.ano, fim.mes);

  return {
    referencia,
    serie,
    saldoAtual,
    totalAportado,
    rendimentoAcumulado,
    rentabilidadeAcumulada:
      totalAportado > 0 ? rendimentoAcumulado / totalAportado : 0,
    rendimentoNoMes: ultimo?.rendimento ?? 0,
    rendimentoMensalCheio: capital * taxaAtual.taxaMensal,
    diasDoMesCorrente,
    taxaAtual,
  };
}

/** Aportes e mudancas de taxa intercalados em ordem cronologica. */
export function montarHistorico(investidor: Investidor): EventoDoHistorico[] {
  const aportes = [...investidor.aportes].sort((a, b) =>
    a.data.localeCompare(b.data),
  );
  const taxas = [...investidor.taxas].sort((a, b) =>
    a.vigenteDesde.localeCompare(b.vigenteDesde),
  );

  let acumulado = 0;
  const eventos: EventoDoHistorico[] = aportes.map((aporte) => {
    acumulado += aporte.valor;
    return {
      tipo: "aporte" as const,
      data: aporte.data,
      aporte,
      totalApos: acumulado,
    };
  });

  taxas.forEach((taxa, indice) => {
    eventos.push({
      tipo: "taxa",
      data: taxa.vigenteDesde,
      taxa,
      taxaAnterior: indice > 0 ? taxas[indice - 1] : undefined,
    });
  });

  // Empate de data: a taxa contratada aparece depois do aporte que a originou.
  return eventos.sort((a, b) => {
    const porData = a.data.localeCompare(b.data);
    if (porData !== 0) return porData;
    return a.tipo === "aporte" ? -1 : 1;
  });
}
