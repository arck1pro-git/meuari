import type { Modalidade } from "./dados";

/**
 * A conta do simulador: quanto rende um aporte novo — o aditivo que entra no
 * contrato que a pessoa ja tem.
 *
 * Regras, do memorial de calculo do ARI (06/08/2026) e do proprio contrato:
 *
 * - **Juros simples.** O rendimento incide sempre sobre o capital, nunca sobre
 *   o rendimento ja acumulado. Um periodo nao é `(1+i)^n`, é `capital x taxa x
 *   n`.
 * - **Prazo, forma e participacao vem do contrato**, porque o aditivo entra
 *   nele e nao ao lado dele. O aporte novo nunca cai na tabela de quem comeca
 *   do zero: quem negociou 2,30% aporta a 2,30%, e nao volta para 1,80% por ter
 *   aportado de novo.
 * - **A soma pode subir a participacao, nunca baixar.** Quando capital do
 *   contrato mais aporte alcancam uma faixa melhor, ela vale para o capital
 *   inteiro — o dinheiro antigo sobe junto, e é dai que vem o pulo do
 *   rendimento.
 * - **A soma pode subir a participacao.** Quando capital atual mais aporte
 *   alcancam uma faixa melhor, ela passa a valer para o **capital inteiro** —
 *   e nao so para o dinheiro que acabou de entrar. É a mesma regra que o portal
 *   ja aplica quando um aporte traz taxa nova (ver `recebimentos.ts`), e é o
 *   que faz um aporte perto da borda valer mais do que ele mesmo.
 * - **Sem IR, sem taxa de administracao, sem carencia.** O rendimento é
 *   declarado isento, e o simulador nao aplica desconto nenhum.
 *
 * As faixas sao constante daqui, e nao tabela de banco: é regra de produto,
 * entra com o codigo e muda com ele.
 *
 * O modulo é puro: nada de banco, nada de React. Assim a mesma conta pode ser
 * conferida num teste, e o componente so exibe.
 */

export const PRAZOS = [18, 24, 36] as const;

export type Prazo = (typeof PRAZOS)[number];

/**
 * A tabela do memorial: participacao mensal por forma de retorno e prazo.
 *
 * **Ela é a taxa de quem entra do zero, e por isso o simulador do aditivo nao a
 * usa.** Quem ja tem contrato aporta na participacao que ja negociou — cair na
 * tabela rebaixaria um investidor de 2,30% para 1,80% por ele ter aportado de
 * novo, que é o contrario do que um aditivo deve fazer.
 *
 * Fica registrada aqui porque é o preco publico do produto, e é a referencia
 * quando alguem for simular sem contrato nenhum.
 */
export const TAXAS: Record<Forma, Record<Prazo, number>> = {
  mensal: { 18: 0.015, 24: 0.016, 36: 0.018 },
  final: { 18: 0.02, 24: 0.021, 36: 0.023 },
};

export type FaixaDeCapital = {
  /** Capital do contrato (o que ja tem + o aditivo) a partir do qual ela vale. */
  aPartirDe: number;
  /** Participacao mensal em decimal: 0.021 = 2,1% ao mes. */
  taxa: number;
};

/**
 * A escada de participacao: quanto o capital paga, por forma de retorno e por
 * prazo.
 *
 * Lida assim: no mensal de 36 meses, capital de 200 a 400 mil paga 2,3% ao mes;
 * passou de 400 mil, paga 2,5%. O degrau de baixo de cada prazo é a taxa de
 * entrada do produto — a mesma de `TAXAS`, que é onde comeca quem chega do
 * zero.
 *
 * Tres coisas que a estrutura diz e que valem repetir:
 *
 * - **Cada prazo tem a propria escada.** 2,3% é o topo do 24 meses e o meio do
 *   36 — o mesmo numero em dois lugares diferentes da tabela.
 * - **Cada forma tambem.** Mensal e final correm em escalas diferentes, e
 *   misturar as duas foi o que fez um contrato mensal aparecer a 2,80%.
 * - **O degrau é piso, e nao teto.** Quem negociou acima dele nao é rebaixado
 *   por aportar de novo.
 *
 * A base é o capital **daquele contrato**, e nao a carteira inteira.
 */
export const FAIXAS: Record<Forma, Record<number, FaixaDeCapital[]>> = {
  mensal: {
    18: [
      { aPartirDe: 50_000, taxa: 0.015 },
      { aPartirDe: 100_000, taxa: 0.018 },
      { aPartirDe: 200_000, taxa: 0.02 },
      { aPartirDe: 400_000, taxa: 0.022 },
    ],
    24: [
      { aPartirDe: 50_000, taxa: 0.016 },
      { aPartirDe: 100_000, taxa: 0.019 },
      { aPartirDe: 200_000, taxa: 0.021 },
      { aPartirDe: 400_000, taxa: 0.023 },
    ],
    36: [
      { aPartirDe: 50_000, taxa: 0.018 },
      { aPartirDe: 100_000, taxa: 0.021 },
      { aPartirDe: 200_000, taxa: 0.023 },
      { aPartirDe: 400_000, taxa: 0.025 },
    ],
  },
  /*
   * O final paga meio ponto a mais que o mensal em toda celula — o preco de
   * deixar o capital inteiro na obra ate o fim. As doze linhas estao escritas
   * uma a uma, e nao derivadas do mensal com um `+ 0.005`: no dia em que uma
   * celula fugir da regra, a tabela continua verdadeira sozinha.
   */
  final: {
    18: [
      { aPartirDe: 50_000, taxa: 0.02 },
      { aPartirDe: 100_000, taxa: 0.023 },
      { aPartirDe: 200_000, taxa: 0.025 },
      { aPartirDe: 400_000, taxa: 0.027 },
    ],
    24: [
      { aPartirDe: 50_000, taxa: 0.021 },
      { aPartirDe: 100_000, taxa: 0.024 },
      { aPartirDe: 200_000, taxa: 0.026 },
      { aPartirDe: 400_000, taxa: 0.028 },
    ],
    36: [
      { aPartirDe: 50_000, taxa: 0.023 },
      { aPartirDe: 100_000, taxa: 0.026 },
      { aPartirDe: 200_000, taxa: 0.028 },
      { aPartirDe: 400_000, taxa: 0.03 },
    ],
  },
};


/**
 * O prazo de quem nao tem prazo registrado.
 *
 * A coluna `prazo_meses` é opcional e boa parte dos contratos antigos esta sem
 * ela. 36 é o padrao do simulador do site — e o mais comum na carteira.
 */
const PRAZO_PADRAO = 36;

/** Os limites do produto. Fora deles a tela avisa, mas nao impede de simular. */
export const APORTE_MINIMO = 50_000;
export const APORTE_MAXIMO = 1_000_000;

/** A forma de retorno é a mesma modalidade dos contratos, vista do outro lado. */
export type Forma = Modalidade;

/** Um contrato do investidor, com o capital ja somado aos aditivos. */
export type ContratoParaSimular = {
  id: string;
  empreendimentoId: string;
  empreendimento: string;
  modalidade: Modalidade;
  /** Soma dos aportes ja feitos neste contrato. */
  capital: number;
  /** Participacao vigente — a do aporte mais recente. */
  taxa: number;
  /** Prazo contratado, quando ha um registrado. */
  prazoMeses: number | null;
};

export type Simulacao = {
  aporte: number;
  /** Prazo do contrato — o mesmo que o aditivo segue. */
  prazo: number;
  forma: Forma;
  /** A participacao que passa a valer: a do contrato, ou a da faixa alcancada. */
  taxa: number;
  /** `true` quando a soma cruzou uma faixa e a participacao subiu. */
  subiu: boolean;

  /* O aditivo, sozinho. */

  /** `aporte x taxa` — o que o aditivo paga por mes, na forma mensal. */
  rendaMensal: number;
  /** `aporte x taxa x prazo` — o rendimento do periodo inteiro. */
  retornoTotal: number;
  /** `aporte + retornoTotal`. */
  capitalMaisRetorno: number;
  /** `taxa x prazo`, em decimal: 0.828 = +82,8% sobre o capital. */
  ganho: number;

  /* O aditivo somado ao que ja existe. */

  /** Capital do contrato mais o aporte novo. */
  capitalTotal: number;
  /** O que o contrato paga por mes hoje, na participacao de hoje. */
  mensalDoContrato: number;
  /**
   * O que passa a cair por mes com o aporte — o capital inteiro na
   * participacao nova, e nao a soma de duas contas separadas. Quando a faixa
   * sobe, o capital antigo sobe junto.
   */
  mensalTotal: number;
  /** A faixa seguinte, quando ha uma melhor a alcancar. */
  proxima: { taxa: number; falta: number } | null;
};

/*
 * Dinheiro em centavos inteiros, como no resto do portal: ha valores que caem
 * em cima do meio centavo, e em ponto flutuante eles pousam ora acima ora
 * abaixo da metade conforme a ordem das somas. Com inteiros a regra é uma só —
 * meio centavo sobe.
 */
function multiplicar(reais: number, taxa: number): number {
  const micro = Math.round(reais * 100) * Math.round(taxa * 1e6);
  const inteiro = Math.floor(micro / 1e6);
  const resto = micro - inteiro * 1e6;
  return (inteiro + (resto * 2 >= 1e6 ? 1 : 0)) / 100;
}

/**
 * Simula o aditivo.
 *
 * Prazo, forma e participacao **nao se escolhem aqui**: vem do contrato que a
 * pessoa ja assinou, porque é nele que o aditivo entra. A unica pergunta que
 * sobra é quanto — e a resposta pode subir a participacao, se a soma alcancar
 * uma faixa.
 */
export function simular({
  contrato,
  aporte,
}: {
  contrato: ContratoParaSimular;
  aporte: number;
}): Simulacao {
  const limpo = Math.max(0, aporte);
  const forma = contrato.modalidade;
  const prazo = contrato.prazoMeses ?? PRAZO_PADRAO;
  const capitalTotal = contrato.capital + limpo;

  /*
   * A base é a participacao **do contrato**, e nunca a tabela de quem entra do
   * zero: o dinheiro novo entra no que ja foi negociado. So a faixa pode mexer
   * nela, e so para cima.
   *
   * Cada forma tem a propria escada — misturar as duas foi o que fez um
   * contrato mensal aparecer a 2,80%, taxa que so existe no mundo do final.
   */
  const escada = FAIXAS[forma][prazo] ?? [];
  const alcancadas = escada.filter((f) => capitalTotal >= f.aPartirDe);
  const taxa = Math.max(
    contrato.taxa,
    ...alcancadas.map((f) => f.taxa),
    // O zero segura o `Math.max` quando nao ha faixa alcancada: sem ele,
    // `Math.max()` sobre lista vazia devolveria -Infinity.
    0,
  );

  /*
   * A proxima faixa é a mais barata de alcancar entre as que ainda pagam mais
   * do que a taxa vigente. "Mais barata" e nao "a maior": o que interessa a
   * quem simula é o degrau seguinte, e nao o ultimo da escada.
   */
  const acima = escada
    .filter((f) => f.aPartirDe > capitalTotal && f.taxa > taxa)
    .sort((a, b) => a.aPartirDe - b.aPartirDe);

  const rendaMensal = multiplicar(limpo, taxa);
  const retornoTotal = rendaMensal * prazo;

  return {
    aporte: limpo,
    prazo,
    forma,
    taxa,
    subiu: taxa > contrato.taxa,
    rendaMensal,
    retornoTotal,
    capitalMaisRetorno: limpo + retornoTotal,
    ganho: taxa * prazo,
    capitalTotal,
    /*
     * Uma taxa só para tudo: o aporte entra na participacao do contrato, entao
     * capital velho e capital novo correm juntos. Quando a faixa sobe, sobe
     * para os dois — e é dai que vem o pulo do rendimento.
     */
    mensalDoContrato:
      forma === "mensal" ? multiplicar(contrato.capital, contrato.taxa) : 0,
    mensalTotal: forma === "mensal" ? multiplicar(capitalTotal, taxa) : 0,
    proxima: acima[0]
      ? { taxa: acima[0].taxa, falta: acima[0].aPartirDe - capitalTotal }
      : null,
  };
}
