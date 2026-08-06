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
 * - **Prazo e forma vem do contrato**, porque o aditivo entra nele e nao ao
 *   lado dele. A participacao sai da tabela do memorial na coluna daquela forma
 *   — mensal e final correm em escalas diferentes, e a taxa de uma nunca vale
 *   na outra.
 * - **O que ja esta assinado nao é renegociado.** O contrato antigo continua na
 *   participacao dele; o aporte novo entra na sua, e as duas se somam.
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
 * É ela que da a taxa do aditivo. Prazo maior paga mais; receber no final paga
 * mais que receber todo mes, porque ai o capital fica inteiro na obra o periodo
 * todo. **As duas colunas vivem em escalas diferentes** — 1,80% no mensal de 36
 * meses é o par de 2,30% no final —, e por isso nenhum numero de uma serve na
 * outra.
 */
export const TAXAS: Record<Forma, Record<Prazo, number>> = {
  mensal: { 18: 0.015, 24: 0.016, 36: 0.018 },
  final: { 18: 0.02, 24: 0.021, 36: 0.023 },
};

export type FaixaDeCapital = {
  /** Capital do contrato (o que ja tem + o aditivo) a partir do qual ela vale. */
  aPartirDe: number;
  /** Participacao mensal em decimal: 0.019 = 1,9% ao mes. */
  taxa: number;
};

/**
 * A escada de participacao por capital, **uma por forma de retorno**.
 *
 * Separadas de proposito: mensal e final correm em escalas diferentes, e uma
 * escada só produzia o erro que apareceu em tela — um contrato mensal
 * simulando a 2,80%, taxa que so existe no mundo do final.
 *
 * Cada degrau fixa a participacao, e nao é acrescimo sobre a taxa atual. Quem
 * ja tem taxa acima do degrau nao é rebaixado: a faixa é piso de oferta, e nao
 * teto do que ja foi assinado. A base é o capital **daquele contrato**, e nao a
 * carteira inteira.
 *
 * **Vazias ate os degraus reais chegarem.** Assim o aditivo entra na taxa do
 * memorial e a tela nao promete aumento nenhum — que é o certo para uma regra
 * que ninguem confirmou. Preencher é escrever as linhas, em ordem crescente:
 *
 *     mensal: [{ aPartirDe: 500_000, taxa: 0.019 }],
 */
export const FAIXAS: Record<Forma, FaixaDeCapital[]> = {
  mensal: [],
  final: [],
};

const ehPrazoDaTabela = (meses: number): meses is Prazo =>
  (PRAZOS as readonly number[]).includes(meses);

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

/** Um contrato do investidor, agregado por empreendimento e modalidade. */
export type ContratoParaSimular = {
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
   * A taxa base é a do memorial, na coluna da forma do contrato. Prazo fora da
   * tabela — um contrato de 12 ou de 48 meses — cai na participacao do proprio
   * contrato: inventar a celula que falta seria pior, ja que a tabela tem tres
   * colunas porque sao tres os prazos oferecidos.
   */
  const daTabela = ehPrazoDaTabela(prazo)
    ? TAXAS[forma][prazo]
    : contrato.taxa;

  /*
   * A faixa nunca reduz o que ja foi oferecido: ela é piso, e nao teto. Cada
   * forma tem a propria escada — misturar as duas foi o que fez um contrato
   * mensal aparecer a 2,80%.
   */
  const alcancadas = FAIXAS[forma].filter((f) => capitalTotal >= f.aPartirDe);
  const taxa = Math.max(
    daTabela,
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
  const acima = FAIXAS[forma]
    .filter((f) => f.aPartirDe > capitalTotal && f.taxa > taxa)
    .sort((a, b) => a.aPartirDe - b.aPartirDe);

  const rendaMensal = multiplicar(limpo, taxa);
  const retornoTotal = rendaMensal * prazo;

  return {
    aporte: limpo,
    prazo,
    forma,
    taxa,
    subiu: taxa > daTabela,
    rendaMensal,
    retornoTotal,
    capitalMaisRetorno: limpo + retornoTotal,
    ganho: taxa * prazo,
    capitalTotal,
    /*
     * O contrato segue na participacao dele — o aditivo nao renegocia o que ja
     * foi assinado —, e o aporte novo entra na sua. As duas pontas se somam;
     * uma taxa media entre elas seria um numero que nao existe em contrato
     * nenhum.
     *
     * A excecao é a faixa: quando ela sobe, sobe para o capital inteiro, e ai
     * as duas pontas passam a correr juntas na taxa nova.
     */
    mensalDoContrato:
      forma === "mensal" ? multiplicar(contrato.capital, contrato.taxa) : 0,
    mensalTotal:
      forma !== "mensal"
        ? 0
        : taxa > daTabela
          ? multiplicar(capitalTotal, taxa)
          : multiplicar(contrato.capital, contrato.taxa) +
            multiplicar(limpo, taxa),
    proxima: acima[0]
      ? { taxa: acima[0].taxa, falta: acima[0].aPartirDe - capitalTotal }
      : null,
  };
}
