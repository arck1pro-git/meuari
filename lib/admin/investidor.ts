import "server-only";
import { consultar } from "@/lib/db";
import { apurarPosicao } from "@/lib/portal/calculo";
import type { DataISO, Modalidade } from "@/lib/portal/dados";
import {
  dataDoCredito,
  estimarCiclo,
  faixasDeParticipacao,
  taxaEm,
  type AporteMensal,
} from "@/lib/portal/recebimentos";

/**
 * O contrato de um investidor rendendo, mes a mes — para o painel do /admin.
 *
 * Duas leituras, uma por modalidade, porque as duas modalidades **nao medem a
 * mesma grandeza**:
 *
 * - `mensal` mede **quanto sai por mes**. A serie é o credito de cada ciclo.
 * - `final` mede **quanto ja vale**. A serie é o saldo — capital mais o
 *   resultado retido, que so é pago no resgate.
 *
 * Desenhar as duas com o mesmo eixo e o mesmo nome seria dizer que R$ 7.800 por
 * mes e R$ 400.000 de saldo sao pontos comparaveis. A tela troca de grafico
 * junto com a modalidade.
 *
 * **O passado vem da tabela; o futuro, da formula.** É a mesma regra do resto do
 * portal (ver `lib/portal/recebimentos.ts`): ate hoje, o que vale é o que foi
 * lancado em `recebimentos` — inclusive quando alguem corrigiu o valor a mao.
 * Dali em diante é projecao, e ela vai marcada como tal, para nunca virar
 * "numero que ninguem conferiu".
 */

/** O prazo de quem nao tem prazo registrado — o mesmo padrao do simulador. */
export const PRAZO_PADRAO = 36;

export type PontoDoContrato = {
  /** Competencia `AAAA-MM`. */
  competencia: string;
  valor: number;
  /** `true` quando o ponto é conta, e nao registro. A tela o desenha tracejado. */
  projetado: boolean;
};

export type SerieDoInvestidor = {
  investidorId: string;
  investidor: string;
  modalidade: Modalidade;
  /** Quantos contratos daquela modalidade entraram nesta serie. */
  contratos: number;
  /** Capital somado — entradas e aditivos. */
  capital: number;
  /** Participacao vigente hoje, em decimal. */
  taxa: number;
  /** O mes em que o ultimo contrato desta modalidade vence. */
  fimDoPrazo: string;
  pontos: PontoDoContrato[];
  /**
   * Em `mensal`: o que ja foi pago, e o que ainda vai ser ate o fim do prazo.
   * Em `final`: o saldo de hoje, e o do resgate.
   */
  ateAgora: number;
  aoFim: number;
};

/** Quem tem contrato — a lista do seletor. */
export async function investidoresComContrato(): Promise<
  { id: string; nome: string }[]
> {
  return consultar(
    `select distinct u.id, u.nome
       from usuarios u
       join contratos c on c.usuario_id = u.id
      order by u.nome`,
  );
}

/** Um aporte com o que a conta precisa dele, mais o prazo do contrato. */
type AporteDoInvestidor = AporteMensal & {
  contratoId: string;
  prazoMeses: number | null;
  /** Data de assinatura do contrato — de onde o prazo conta. */
  contratoData: DataISO;
};

export function competenciaDe(iso: DataISO): string {
  return iso.slice(0, 7);
}

export function mesSeguinte(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return mes === 12
    ? `${ano + 1}-01`
    : `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * O ultimo mes do prazo, a partir da data de assinatura.
 *
 * **Competencia, e nao data.** Desde que o rendimento passou a ser por mes
 * fechado (ver `apurarPosicao`), o dia nao decide mais nada: o mes em que o
 * dinheiro entra ja conta inteiro. Um contrato de 6 meses assinado em qualquer
 * dia de julho rende julho, agosto, setembro, outubro, novembro e dezembro — seis
 * parcelas iguais, terminando em **dezembro**, e nao em janeiro.
 *
 * Por isso soma `meses - 1`: o mes da assinatura é a primeira parcela, e nao a
 * parcela zero. Somar `meses` cheios dava sete competencias para um prazo de
 * seis.
 *
 * As duas versoes anteriores desta funcao mediam dias — o dia 28 fixo, depois a
 * vespera do aniversario — e ambas existiam so para acertar o rateio das pontas.
 * Sem rateio, o problema todo desaparece.
 *
 * Exportada para `lib/admin/pagamentos.ts` usar a mesma. Copiar a regra la seria
 * ter duas definicoes de onde um contrato termina, e foi exatamente esse numero
 * que ja saiu errado tres vezes antes de assentar aqui.
 */
export function fimDoPrazoDe(assinatura: DataISO, meses: number): string {
  const [ano, mes] = assinatura.split("-").map(Number);
  const total = ano * 12 + (mes - 1) + Math.max(0, meses - 1);
  return `${Math.floor(total / 12)}-${doisDigitos((total % 12) + 1)}`;
}

/**
 * A serie de um investidor numa modalidade. `null` quando ele nao tem contrato
 * daquele tipo — a tela mostra o vazio explicando, e nao um grafico de zeros.
 */
export async function serieDoInvestidor(
  usuarioId: string,
  modalidade: Modalidade,
  referencia: DataISO,
): Promise<SerieDoInvestidor | null> {
  const [pessoa] = await consultar<{ nome: string }>(
    `select nome from usuarios where id = $1`,
    [usuarioId],
  );
  if (!pessoa) return null;

  /*
   * Entrada de contrato e aditivos na mesma lista: para a conta os dois sao a
   * mesma coisa — capital que entrou numa data, sob uma participacao. O aditivo
   * sem taxa herda a do contrato (`coalesce`), que é o que "em branco = segue
   * como esta" significa.
   */
  const aportes = await consultar<AporteDoInvestidor>(
    `select c.id            as "contratoId",
            to_char(c.data, 'YYYY-MM-DD') as data,
            c.valor::float8 as valor,
            c.taxa::float8  as "taxaMensal",
            c.modalidade,
            c.prazo_meses   as "prazoMeses",
            to_char(c.data, 'YYYY-MM-DD') as "contratoData"
       from contratos c
      where c.usuario_id = $1 and c.modalidade = $2

      union all

     select c.id,
            to_char(a.data, 'YYYY-MM-DD'),
            a.valor::float8,
            coalesce(a.taxa, c.taxa)::float8,
            c.modalidade,
            c.prazo_meses,
            to_char(c.data, 'YYYY-MM-DD')
       from aditivos a
       join contratos c on c.id = a.contrato_id
      where c.usuario_id = $1 and c.modalidade = $2

      order by data`,
    [usuarioId, modalidade],
  );

  if (aportes.length === 0) return null;

  const capital = aportes.reduce((soma, a) => soma + a.valor, 0);
  const taxa = taxaEm(faixasDeParticipacao(aportes), referencia);
  const contratos = new Set(aportes.map((a) => a.contratoId)).size;

  /*
   * O horizonte é o vencimento mais distante entre os contratos desta
   * modalidade: com dois contratos de prazos diferentes, cortar no mais curto
   * esconderia a segunda metade do outro.
   *
   * Competencia, e nao data: com o rendimento por mes fechado, o dia da
   * assinatura nao decide mais nada. Ver `fimDoPrazoDe`.
   */
  const fimDoPrazo = aportes.reduce((maior, a) => {
    const fim = fimDoPrazoDe(a.contratoData, a.prazoMeses ?? PRAZO_PADRAO);
    return fim > maior ? fim : maior;
  }, competenciaDe(aportes[0].contratoData));

  const pontos =
    modalidade === "mensal"
      ? await serieMensal(aportes, referencia, fimDoPrazo)
      : serieFinal(aportes, referencia, fimDoPrazo);

  const passados = pontos.filter((p) => !p.projetado);

  return {
    investidorId: usuarioId,
    investidor: pessoa.nome,
    modalidade,
    contratos,
    capital,
    taxa,
    fimDoPrazo,
    pontos,
    /*
     * `mensal` soma — sao pagamentos, e o total é quanto saiu. `final` nao soma:
     * cada ponto ja é o saldo daquele mes, e somar saldos daria um numero sem
     * sentido. Entao é o ultimo ponto de cada metade.
     */
    ateAgora:
      modalidade === "mensal"
        ? passados.reduce((t, p) => t + p.valor, 0)
        : (passados.at(-1)?.valor ?? capital),
    aoFim:
      modalidade === "mensal"
        ? pontos.reduce((t, p) => t + p.valor, 0)
        : (pontos.at(-1)?.valor ?? capital),
  };
}

/**
 * `mensal`: o credito de cada ciclo.
 *
 * Ate hoje, o que foi **lancado** — nao a conta. É a regra do portal inteiro: o
 * valor que vale é o gravado em `recebimentos`, inclusive quando alguem o
 * corrigiu a mao. Dali em diante, `estimarCiclo`, a mesma funcao que sugere o
 * valor na tela de lancamento.
 *
 * Mes passado sem credito entra com zero, e nao é omitido: aqui o zero é
 * informacao — significa que aquele mes nao foi lancado.
 */
async function serieMensal(
  aportes: AporteDoInvestidor[],
  referencia: DataISO,
  fimDoPrazo: string,
): Promise<PontoDoContrato[]> {
  const contratoIds = [...new Set(aportes.map((a) => a.contratoId))];

  const lancados = await consultar<{ competencia: string; valor: number }>(
    `select to_char(data, 'YYYY-MM') as competencia, sum(valor)::float8 as valor
       from recebimentos
      where contrato_id = any($1) and data <= $2
      group by 1`,
    [contratoIds, referencia],
  );

  const pagoPorMes = new Map(lancados.map((l) => [l.competencia, l.valor]));

  const inicio = competenciaDe(aportes[0].data);
  const hoje = competenciaDe(referencia);
  const pontos: PontoDoContrato[] = [];

  for (let mes = inicio; mes <= fimDoPrazo; mes = mesSeguinte(mes)) {
    const passado = mes <= hoje;

    pontos.push({
      competencia: mes,
      valor: passado
        ? (pagoPorMes.get(mes) ?? 0)
        : estimarCiclo(aportes, dataDoCredito(mes)).valor,
      projetado: !passado,
    });
  }

  return pontos;
}

/**
 * `final`: o saldo — capital mais o resultado retido.
 *
 * **Duas apuracoes, e nao uma.** `apurarPosicao` calcula o mes da data de
 * referencia *pro rata* ate aquele dia, e os anteriores cheios. Isso obriga a
 * chamar duas vezes:
 *
 * - com a referencia em **hoje**, para o mes corrente sair com o que de fato ja
 *   rendeu — é esse o saldo de verdade agora;
 * - com a referencia no **fim do prazo**, para os meses seguintes sairem
 *   completos.
 *
 * Uma chamada só, com a referencia la na frente, dava o mes corrente **cheio** e
 * marcado como realizado: o cartao dizia "saldo hoje R$ 20.335,48" quando o
 * saldo de hoje era R$ 20.167,74. O numero certo é o menor — o mes ainda nao
 * acabou.
 *
 * O degrau entre o mes corrente e o seguinte é maior que os outros, e esta
 * certo: ele carrega o resto do mes que ainda vai correr.
 *
 * O primeiro mes tambem nao é cheio, e esse é o contrato falando: o aporte rende
 * *pro rata die* a partir do dia em que entra. Quem aportou dia 6 de um mes de
 * 31 leva 26 trinta-e-um-avos.
 */
function serieFinal(
  aportes: AporteDoInvestidor[],
  referencia: DataISO,
  fimDoPrazo: string,
): PontoDoContrato[] {
  /*
   * Uma apuracao só, ate o ultimo mes do prazo.
   *
   * Antes eram duas — uma ate hoje e outra ate o fim —, porque o mes corrente
   * saia rateado ate a data de referencia e precisava vir da apuracao certa. Com
   * o rendimento por mes fechado nao ha mais rateio: o mes corrente rende igual
   * aos outros, entao a apuracao longa ja o traz correto.
   *
   * O dia 28 existe em todo mes, e qualquer dia serve — a conta nao olha mais
   * para ele. Fica o 28 por ser o unico seguro em fevereiro.
   */
  const projecao = apurarPosicao(aportes, `${fimDoPrazo}-28`);
  if (!projecao) return [];

  const hoje = competenciaDe(referencia);

  return projecao.serie.map((mes) => ({
    competencia: mes.competencia,
    valor: mes.saldoFinal,
    // O mes corrente conta como realizado: ele ja rendeu inteiro.
    projetado: mes.competencia > hoje,
  }));
}
