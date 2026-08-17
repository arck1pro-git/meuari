import "server-only";
import { consultar } from "@/lib/db";
import type { DataISO, Modalidade } from "@/lib/portal/dados";
import {
  dataDoCredito,
  faixasDeParticipacao,
  taxaEm,
} from "@/lib/portal/recebimentos";

/**
 * Os numeros da carteira inteira, para a tela inicial do painel.
 *
 * A tela inicial era a mesma lista da coluna da esquerda, so que em cartoes com
 * a contagem de linhas de cada tabela. "11 contratos" nao responde nada que
 * quem administra pergunte: a pergunta é quanto foi captado, quanto disso esta
 * em cada modalidade e quanto sai de caixa todo mes.
 *
 * **A participacao vigente sai das mesmas funcoes do portal.** `taxaEm` sobre
 * `faixasDeParticipacao` é o que decide a taxa no lancamento do credito e na
 * posicao do investidor; refazer a regra em SQL aqui daria um numero plausivel
 * que divergiria do que é pago. Por isso a consulta traz os aportes crus e o
 * agrupamento acontece em TypeScript — sao poucas centenas de linhas, e o preco
 * de uma volta a mais na memoria é nao ter duas versoes da mesma regra.
 */

/** Um aporte com o contrato a que pertence — a entrada ou um aditivo. */
type LinhaDeAporte = {
  contratoId: string;
  usuarioId: string;
  modalidade: Modalidade;
  empreendimentoId: string;
  empreendimento: string;
  origem: "contrato" | "aditivo";
  data: DataISO;
  valor: number;
  taxaMensal: number;
};

/** Um contrato depois de somados os aportes dele. */
type ContratoApurado = {
  usuarioId: string;
  modalidade: Modalidade;
  empreendimentoId: string;
  empreendimento: string;
  /** Entrada + aditivos. */
  capital: number;
  entrada: number;
  aditivos: number;
  quantosAditivos: number;
  /** Participacao vigente hoje, em decimal. */
  taxa: number;
  /** Um mes cheio na participacao vigente: `capital x taxa`. */
  porMes: number;
};

export type ResumoDeModalidade = {
  modalidade: Modalidade;
  contratos: number;
  /** Quantas pessoas diferentes — um investidor pode ter varios contratos. */
  investidores: number;
  capital: number;
  entradas: number;
  aditivos: number;
  quantosAditivos: number;
  /**
   * Quanto a modalidade movimenta num mes cheio.
   *
   * Em `mensal` é o que sai de caixa todo dia 17; em `final` é o que fica
   * retido no saldo, a ser pago no resgate. Sao coisas diferentes com a mesma
   * conta, e a tela é que diz qual é qual.
   */
  porMes: number;
  /** Participacao media ponderada pelo capital — `porMes / capital`. */
  taxaMedia: number;
};

export type ResumoDeObra = {
  id: string;
  nome: string;
  contratos: number;
  capital: number;
  porMes: number;
};

/**
 * Um mes da serie de creditos pagos.
 *
 * Forma propria, e nao o `Recebimento` do portal: aquele carrega `data` e
 * `observacao` porque a barra do investidor mostra o dia do credito e a
 * anotacao de quem o lancou. Aqui cada ponto é a soma de varios creditos, e
 * nenhum dos dois campos tem valor unico para o mes.
 */
export type PontoDaSerie = {
  /** Competencia `AAAA-MM`. */
  competencia: string;
  valor: number;
  /** Quantos creditos foram somados neste mes. */
  quantos: number;
};

/** Onde esta o lancamento do credito deste mes. */
export type CicloDoMes = {
  data: DataISO;
  /** Contratos `mensal` que esperam credito. */
  contratos: number;
  lancados: number;
};

export type PainelDoAdmin = {
  /** Tudo que entrou: as entradas de contrato mais todos os aditivos. */
  totalCaptado: number;
  entradas: number;
  aditivos: number;
  quantosContratos: number;
  quantosAditivos: number;
  investidores: number;
  /** So as modalidades que existem em contrato — nunca um bloco zerado. */
  modalidades: ResumoDeModalidade[];
  /** Da maior captacao para a menor. */
  obras: ResumoDeObra[];
  /** Soma de `recebimentos` ate a data de referencia. */
  totalPago: number;
  /** Um ponto por mes com credito. Mes sem credito nao vira ponto zerado. */
  serie: PontoDaSerie[];
  ciclo: CicloDoMes;
};

/**
 * A entrada de cada contrato e todos os aditivos, numa lista só.
 *
 * Sao a mesma coisa para a conta — capital que entrou numa data, sob uma
 * participacao —, e o `origem` é o que permite separar de novo os dois totais
 * que a tela mostra. Aditivo sem taxa herda a do contrato (`coalesce`): em
 * branco significa "segue como esta", e nao "sem taxa".
 */
async function aportes(): Promise<LinhaDeAporte[]> {
  return consultar<LinhaDeAporte>(
    `select c.id            as "contratoId",
            c.usuario_id    as "usuarioId",
            c.modalidade,
            e.id            as "empreendimentoId",
            e.nome          as empreendimento,
            'contrato'      as origem,
            to_char(c.data, 'YYYY-MM-DD') as data,
            c.valor::float8 as valor,
            c.taxa::float8  as "taxaMensal"
       from contratos c
       join empreendimentos e on e.id = c.empreendimento_id

      union all

     select c.id,
            c.usuario_id,
            c.modalidade,
            e.id,
            e.nome,
            'aditivo',
            to_char(a.data, 'YYYY-MM-DD'),
            a.valor::float8,
            coalesce(a.taxa, c.taxa)::float8
       from aditivos a
       join contratos c        on c.id = a.contrato_id
       join empreendimentos e  on e.id = c.empreendimento_id

      order by data`,
  );
}

/** Soma os aportes de cada contrato e resolve a participacao vigente. */
function apurarContratos(
  linhas: LinhaDeAporte[],
  referencia: DataISO,
): Map<string, ContratoApurado> {
  const porContrato = new Map<string, LinhaDeAporte[]>();
  for (const linha of linhas) {
    const lista = porContrato.get(linha.contratoId);
    if (lista) lista.push(linha);
    else porContrato.set(linha.contratoId, [linha]);
  }

  const apurados = new Map<string, ContratoApurado>();

  for (const [id, doContrato] of porContrato) {
    const [primeiro] = doContrato;

    let entrada = 0;
    let aditivos = 0;
    let quantosAditivos = 0;
    for (const linha of doContrato) {
      if (linha.origem === "contrato") {
        entrada += linha.valor;
      } else {
        aditivos += linha.valor;
        quantosAditivos += 1;
      }
    }

    const capital = entrada + aditivos;
    // A mesma regra do credito e da posicao: a ultima participacao lancada vale
    // para o capital inteiro daquela data em diante.
    const taxa = taxaEm(faixasDeParticipacao(doContrato), referencia);

    apurados.set(id, {
      usuarioId: primeiro.usuarioId,
      modalidade: primeiro.modalidade,
      empreendimentoId: primeiro.empreendimentoId,
      empreendimento: primeiro.empreendimento,
      capital,
      entrada,
      aditivos,
      quantosAditivos,
      taxa,
      porMes: capital * taxa,
    });
  }

  return apurados;
}

/** A ordem dos blocos na tela: primeiro o que sai de caixa, depois o retido. */
const ORDEM_DAS_MODALIDADES: Modalidade[] = ["mensal", "final"];

function resumirModalidades(
  contratos: ContratoApurado[],
): ResumoDeModalidade[] {
  return ORDEM_DAS_MODALIDADES.map((modalidade) => {
    const desta = contratos.filter((c) => c.modalidade === modalidade);

    const capital = desta.reduce((soma, c) => soma + c.capital, 0);
    const porMes = desta.reduce((soma, c) => soma + c.porMes, 0);

    return {
      modalidade,
      contratos: desta.length,
      investidores: new Set(desta.map((c) => c.usuarioId)).size,
      capital,
      entradas: desta.reduce((soma, c) => soma + c.entrada, 0),
      aditivos: desta.reduce((soma, c) => soma + c.aditivos, 0),
      quantosAditivos: desta.reduce((soma, c) => soma + c.quantosAditivos, 0),
      porMes,
      // Ponderada, e nao a media das taxas: um contrato de 10 mil e outro de um
      // milhao nao pesam igual no que se paga.
      taxaMedia: capital > 0 ? porMes / capital : 0,
    };
    // Modalidade sem contrato nenhum nao vira bloco vazio na tela.
  }).filter((m) => m.contratos > 0);
}

function resumirObras(contratos: ContratoApurado[]): ResumoDeObra[] {
  const porObra = new Map<string, ResumoDeObra>();

  for (const contrato of contratos) {
    const atual = porObra.get(contrato.empreendimentoId) ?? {
      id: contrato.empreendimentoId,
      nome: contrato.empreendimento,
      contratos: 0,
      capital: 0,
      porMes: 0,
    };

    atual.contratos += 1;
    atual.capital += contrato.capital;
    atual.porMes += contrato.porMes;
    porObra.set(contrato.empreendimentoId, atual);
  }

  return [...porObra.values()].sort((a, b) => b.capital - a.capital);
}

export async function montarPainel(
  referencia: DataISO,
): Promise<PainelDoAdmin> {
  const dataDoCiclo = dataDoCredito(referencia.slice(0, 7));

  const [linhas, meses, lancados] = await Promise.all([
    aportes(),
    /*
     * Um ponto por mes, e nao um por credito: a tela é da carteira inteira, e
     * o que ela mostra é o desembolso do mes. Credito com data futura fica de
     * fora — o lancamento pode ser preparado antes do dia 17.
     */
    consultar<PontoDaSerie>(
      `select to_char(data, 'YYYY-MM') as competencia,
              sum(valor)::float8       as valor,
              count(*)::int            as quantos
         from recebimentos
        where data <= $1
        group by 1
        order by 1`,
      [referencia],
    ),
    // So os `mensal`: um credito lancado a mao num contrato `final` nao conta
    // como ciclo fechado, e faria o painel dizer que falta menos do que falta.
    consultar<{ total: number }>(
      `select count(*)::int as total
         from recebimentos r
         join contratos c on c.id = r.contrato_id
        where r.data = $1 and c.modalidade = 'mensal'`,
      [dataDoCiclo],
    ),
  ]);

  const apurados = [...apurarContratos(linhas, referencia).values()];

  const soma = (quais: (c: ContratoApurado) => number) =>
    apurados.reduce((total, c) => total + quais(c), 0);

  const entradas = soma((c) => c.entrada);
  const aditivos = soma((c) => c.aditivos);

  return {
    totalCaptado: entradas + aditivos,
    entradas,
    aditivos,
    quantosContratos: apurados.length,
    quantosAditivos: soma((c) => c.quantosAditivos),
    investidores: new Set(apurados.map((c) => c.usuarioId)).size,
    modalidades: resumirModalidades(apurados),
    obras: resumirObras(apurados),
    totalPago: meses.reduce((total, m) => total + m.valor, 0),
    serie: meses,
    ciclo: {
      data: dataDoCiclo,
      contratos: apurados.filter((c) => c.modalidade === "mensal").length,
      lancados: lancados[0]?.total ?? 0,
    },
  };
}
