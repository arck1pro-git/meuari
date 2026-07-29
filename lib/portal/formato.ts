import type { DataISO } from "./dados";

const MESES = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moedaCurta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

/** Sem centavos — para eixos de grafico e rotulos diretos. */
export function formatarMoedaCurta(valor: number): string {
  return moedaCurta.format(valor);
}

/** `0.0125` -> `1,25%`. */
export function formatarPercentual(decimal: number, casas = 2): string {
  return `${(decimal * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** `2025-03-10` -> `10/03/2025`. Sem `Date`, entao sem surpresa de fuso. */
export function formatarData(iso: DataISO): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** `2025-03-10` -> `10 de marco de 2025`. */
export function formatarDataExtensa(iso: DataISO): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

/** `2025-03` -> `marco de 2025`. */
export function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return `${MESES[mes - 1]} de ${ano}`;
}

/** `2025-03` -> `mar/25`. Para eixos de grafico. */
export function formatarCompetenciaCurta(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}`;
}
