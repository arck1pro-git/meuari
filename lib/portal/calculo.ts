import type { Aporte, DataISO } from "./dados";
import {
  faixasDeParticipacao,
  taxaEm,
  type AporteMensal,
} from "./recebimentos";

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
  /**
   * `true` no mes corrente — o da data de referencia.
   *
   * Marca a posicao na linha do tempo, e nao o valor: desde que o rendimento
   * passou a ser por mes fechado, o mes corrente rende igual aos outros. Quem
   * usa isto é a tela, para distinguir o mes em curso.
   */
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
  /** Resultado do mes corrente. Mes cheio, como todos os outros. */
  rendimentoNoMes: number;
  /** Um mes cheio na participacao vigente. Em juros simples é exato. */
  rendimentoMensalCheio: number;
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

function competenciaDe(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/**
 * Apura a posicao mes a mes, do primeiro aporte ate a data de referencia.
 *
 * Regime: **juros simples**, por **mes fechado**. O resultado de cada mes incide
 * apenas sobre o capital aportado — `capital x participacao` —, nunca sobre o
 * resultado ja acumulado.
 *
 * **Nao ha rateio por dia.** O mes em que o dinheiro entra rende inteiro, e o
 * ultimo mes do prazo tambem: um contrato de N meses tem N parcelas iguais.
 *
 * Ja foram tentadas duas contagens por dia antes desta, e as duas erravam. A de
 * calendario dava a um contrato de N meses um rendimento diferente de
 * `capital x taxa x N` sempre que o mes de entrada e o de saida tinham tamanhos
 * diferentes — quem entrava em agosto (31 dias) e saia em fevereiro (28) recebia
 * 1,017 mes na virada. A de 30/360 corrigia o total, mas deixava a primeira e a
 * ultima barra do grafico pela metade, cada uma com um pedaco do mesmo mes.
 *
 * Por mes fechado nao ha ponta a completar: cada competencia em que o dinheiro
 * esteve rende `capital x taxa`, e o total sai exato por construcao.
 *
 * Vale só para a modalidade `final`. O credito mensal continua rateado por dia
 * quando o aporte entra no meio do ciclo — ver `lib/portal/recebimentos.ts`.
 *
 * A modalidade decide o que entra aqui:
 * - `final`: o resultado acumula no saldo e é recebido de uma vez no resgate.
 * - `mensal`: entra so como capital. O resultado dele é creditado todo dia 17 e
 *   nao acumula — ele é lancado no /admin e lido de `recebimentos`, que aplica a
 *   mesma base 30/360 sobre o ciclo do dia 18 ao 17.
 *
 * Devolve `null` quando nao ha aporte nenhum — carteira vazia nao tem posicao a
 * apurar, e a tela mostra o estado vazio em vez de uma serie de zeros.
 */
/*
 * `AporteMensal` e nao `Aporte`: sao os quatro campos que esta funcao le — data,
 * valor, taxa e modalidade. O nome do tipo diz "mensal" por causa de onde ele
 * nasceu, mas ele nao filtra modalidade nenhuma; aqui a `final` é justamente a
 * que rende.
 *
 * A assinatura foi aberta para o painel do /admin poder apurar a provisao dos
 * contratos `final` sem precisar montar um `Aporte` inteiro — com id, documento
 * e nome de empreendimento — só para jogar fora. O `/portal` continua passando
 * `Aporte[]`, que satisfaz este tipo.
 */
export function apurarPosicao(
  aportes: AporteMensal[],
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

  while (ano < fim.ano || (ano === fim.ano && mes <= fim.mes)) {
    const competencia = competenciaDe(ano, mes);
    const parcial = ano === fim.ano && mes === fim.mes;

    const saldoInicial = capital + retido;
    let rendimentoDoMes = 0;
    let retidoDoMes = 0;
    let aportadoNoMes = 0;

    for (const aporte of ordenados) {
      if (aporte.data > competencia + "-31") continue; // ainda nao entrou
      const entrouAgora = aporte.data.startsWith(competencia);

      if (entrouAgora) {
        /*
         * No mes corrente, um aporte marcado para daqui a alguns dias ainda nao
         * entrou — e dinheiro que nao entrou nao rende. Nos meses ja fechados
         * todo aporte do mes ja aconteceu, e a checagem nao se aplica.
         */
        if (parcial && partes(aporte.data).dia > fim.dia) continue;
        aportadoNoMes += aporte.valor;
        capital += aporte.valor;
      }

      // So a modalidade `final` rende aqui. Ver a nota do topo.
      if (aporte.modalidade !== "final") continue;

      /*
       * **Mes cheio, sempre.** O mes em que o dinheiro entra conta inteiro, e o
       * ultimo do prazo tambem — nao ha meia barra em ponta nenhuma.
       */
      const rendimento = aporte.valor * aporte.taxaMensal;
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
