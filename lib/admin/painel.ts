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
  /**
   * Quanto se pretende captar nesta obra. `null` quando ninguem definiu.
   *
   * Dado interno: nunca sai daqui para o portal do investidor. Ver a nota em
   * `COLUNAS_DA_FICHA`, em `lib/portal/dados.ts`.
   */
  meta: number | null;
  /**
   * `capital / meta`, em decimal. `null` sem meta — e nao zero: "0% captado" e
   * "obra sem meta definida" sao coisas diferentes, e a tela mostra cada uma do
   * seu jeito.
   */
  progresso: number | null;
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

/** Um mes da curva de captacao. */
export type PontoDaCaptacao = {
  competencia: string;
  /** O que entrou neste mes — `entradas + aditivos`. */
  valor: number;
  /** Só a entrada de contratos assinados neste mes. */
  entradas: number;
  /** Só os aportes feitos em contrato que ja existia. */
  aditivos: number;
  /** Tudo que ja tinha entrado ao fim deste mes. */
  acumulado: number;
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
  /**
   * A soma das metas das obras **que tem meta**. `0` quando nenhuma tem.
   *
   * Obra sem meta fica fora da soma em vez de entrar como zero: senao o
   * progresso global passaria a dizer que se captou mais do que se pretendia,
   * so porque alguem nao preencheu um campo.
   */
  metaTotal: number;
  /** `totalCaptado / metaTotal`, ou `null` quando nao ha meta nenhuma. */
  progresso: number | null;
  /** O que falta para a meta. Nunca negativo — captar acima dela é 100%. */
  faltaCaptar: number;
  /** Quantas obras ainda nao tem meta definida — a tela avisa. */
  obrasSemMeta: number;
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
  /** A curva do que ja entrou, mes a mes e acumulada. */
  captacao: PontoDaCaptacao[];
  ciclo: CicloDoMes;
};

/**
 * A entrada de cada contrato e todos os aditivos, numa lista só.
 *
 * Sao a mesma coisa para a conta — capital que entrou numa data, sob uma
 * participacao —, e o `origem` é o que permite separar de novo os dois totais
 * que a tela mostra. Aditivo sem taxa herda a do contrato (`coalesce`): em
 * branco significa "segue como esta", e nao "sem taxa".
 *
 * **Só contrato de investidor.** A juncao com `usuarios` esta aqui por isso, e
 * nao para trazer coluna nenhuma: ha contrato em nome de administrador — a
 * conta de demonstracao, a mesma que aparece na foto do app —, e ele inflava
 * todo numero do painel como se fosse capital captado. O painel responde
 * "quanto entrou de investidor", e conta de casa nao é entrada.
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
       join usuarios u        on u.id = c.usuario_id
      where u.tipo = 'investidor'

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
       join usuarios u         on u.id = c.usuario_id
      where u.tipo = 'investidor'

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

/**
 * A curva de captacao: o que entrou em cada mes, e o acumulado ate ali.
 *
 * Mes sem aporte **entra na serie**, com valor zero e o acumulado repetido — ao
 * contrario da serie de creditos, onde mes vazio é omitido. A diferenca é o que
 * cada grafico diz: barra de credito ausente é "nao houve credito"; curva
 * acumulada com buraco desenharia uma reta ligando dois pontos distantes, como
 * se a captacao tivesse crescido devagar durante um periodo em que ela nao
 * mexeu.
 */
function curvaDaCaptacao(linhas: LinhaDeAporte[]): PontoDaCaptacao[] {
  if (linhas.length === 0) return [];

  /*
   * Separado por origem, e nao só somado: a entrada de um contrato novo e um
   * aporte num contrato que ja existe sao dois movimentos diferentes de
   * captacao — um é cliente novo, o outro é confianca de quem ja esta dentro. O
   * grafico do topo mostra os dois empilhados, e a soma continua sendo a barra
   * inteira.
   */
  const porMes = new Map<string, { entradas: number; aditivos: number }>();
  for (const linha of linhas) {
    const competencia = linha.data.slice(0, 7);
    const atual = porMes.get(competencia) ?? { entradas: 0, aditivos: 0 };
    if (linha.origem === "contrato") atual.entradas += linha.valor;
    else atual.aditivos += linha.valor;
    porMes.set(competencia, atual);
  }

  const ordenadas = [...porMes.keys()].sort();
  const primeira = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];

  const curva: PontoDaCaptacao[] = [];
  let acumulado = 0;

  for (let mes = primeira; mes <= ultima; mes = mesSeguinte(mes)) {
    const { entradas, aditivos } = porMes.get(mes) ?? {
      entradas: 0,
      aditivos: 0,
    };
    const valor = entradas + aditivos;
    acumulado += valor;
    curva.push({ competencia: mes, valor, entradas, aditivos, acumulado });
  }

  return curva;
}

/** `2026-08` -> `2026-09`. */
function mesSeguinte(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return mes === 12
    ? `${ano + 1}-01`
    : `${ano}-${String(mes + 1).padStart(2, "0")}`;
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

/** Uma obra como o cadastro a conhece, antes de somar contrato nenhum. */
type ObraCadastrada = { id: string; nome: string; meta: number | null };

/**
 * As obras com o que entrou em cada uma.
 *
 * A lista parte do **cadastro**, e nao dos contratos: uma obra recem-lancada tem
 * meta e nenhum aporte, e ela precisa aparecer — é justamente a que mais
 * interessa a quem capta. Montada só a partir dos contratos, ela sumiria da tela
 * exatamente enquanto estivesse em zero.
 *
 * Fica de fora a obra que nao tem meta **nem** contrato: essa é linha de
 * cadastro sem nada dentro, e listar zero contra nada é ruido.
 */
function resumirObras(
  contratos: ContratoApurado[],
  cadastradas: ObraCadastrada[],
): ResumoDeObra[] {
  const porObra = new Map<string, ResumoDeObra>();

  for (const obra of cadastradas) {
    porObra.set(obra.id, {
      id: obra.id,
      nome: obra.nome,
      contratos: 0,
      capital: 0,
      porMes: 0,
      meta: obra.meta,
      progresso: null,
    });
  }

  for (const contrato of contratos) {
    /*
     * O `??` cobre o caso de um contrato apontar para obra que a consulta de
     * cadastro nao trouxe. Nao deveria acontecer — ha chave estrangeira —, mas
     * perder capital de vista por causa de uma corrida entre duas consultas
     * seria pior do que uma linha sem meta.
     */
    const atual =
      porObra.get(contrato.empreendimentoId) ??
      ({
        id: contrato.empreendimentoId,
        nome: contrato.empreendimento,
        contratos: 0,
        capital: 0,
        porMes: 0,
        meta: null,
        progresso: null,
      } satisfies ResumoDeObra);

    atual.contratos += 1;
    atual.capital += contrato.capital;
    atual.porMes += contrato.porMes;
    porObra.set(contrato.empreendimentoId, atual);
  }

  return [...porObra.values()]
    .filter((obra) => obra.contratos > 0 || obra.meta !== null)
    .map((obra) => ({
      ...obra,
      // Sem meta nao ha progresso — e `null`, e nao `0`: a tela precisa
      // distinguir "nao captou nada" de "ninguem definiu a meta".
      progresso: obra.meta && obra.meta > 0 ? obra.capital / obra.meta : null,
    }))
    .sort((a, b) => b.capital - a.capital);
}

export async function montarPainel(
  referencia: DataISO,
): Promise<PainelDoAdmin> {
  const dataDoCiclo = dataDoCredito(referencia.slice(0, 7));

  const [linhas, cadastradas, meses, lancados] = await Promise.all([
    aportes(),
    /*
     * O cadastro das obras, com a meta. Consulta propria, e nao um campo a mais
     * na juncao de `aportes()`: aquela devolve uma linha por aporte, e a meta
     * viria repetida em todas — alem de sumir justamente na obra que ainda nao
     * tem aporte nenhum, que é a que mais interessa a quem esta captando.
     */
    consultar<ObraCadastrada>(
      `select id, nome, meta_captacao::float8 as meta
         from empreendimentos
        order by nome`,
    ),
    /*
     * Um ponto por mes, e nao um por credito: a tela é da carteira inteira, e
     * o que ela mostra é o desembolso do mes. Credito com data futura fica de
     * fora — o lancamento pode ser preparado antes do dia 17.
     *
     * Sai separado por modalidade porque o grafico de rendimento distingue os
     * dois: `mensal` é caixa que saiu, `final` é divida que cresceu. O `join`
     * com `contratos` é o que traz a modalidade — `recebimentos` só guarda o
     * contrato.
     */
    consultar<PontoDaSerie & { modalidade: Modalidade }>(
      `select to_char(r.data, 'YYYY-MM') as competencia,
              c.modalidade,
              sum(r.valor)::float8       as valor,
              count(*)::int              as quantos
         from recebimentos r
         join contratos c on c.id = r.contrato_id
         join usuarios u  on u.id = c.usuario_id
        where r.data <= $1 and u.tipo = 'investidor'
        group by 1, 2
        order by 1`,
      [referencia],
    ),
    /*
     * So os `mensal`: um credito lancado a mao num contrato `final` nao conta
     * como ciclo fechado, e faria o painel dizer que falta menos do que falta.
     *
     * E so os de investidor, pelo mesmo motivo do resto: o denominador deste
     * indicador (`ciclo.contratos`) sai de `aportes()`, que ja exclui o
     * administrador — contar o credito dele aqui daria "14 de 13 lancados".
     */
    consultar<{ total: number }>(
      `select count(*)::int as total
         from recebimentos r
         join contratos c on c.id = r.contrato_id
         join usuarios u  on u.id = c.usuario_id
        where r.data = $1 and c.modalidade = 'mensal'
          and u.tipo = 'investidor'`,
      [dataDoCiclo],
    ),
  ]);

  const apurados = [...apurarContratos(linhas, referencia).values()];

  const soma = (quais: (c: ContratoApurado) => number) =>
    apurados.reduce((total, c) => total + quais(c), 0);

  const entradas = soma((c) => c.entrada);
  const aditivos = soma((c) => c.aditivos);
  const totalCaptado = entradas + aditivos;

  // A serie antiga — todos os creditos por mes, sem separar — continua servindo
  // a contagem de "meses com credito" na faixa de indicadores.
  const serie: PontoDaSerie[] = [
    ...meses
      .reduce((mapa, m) => {
        const atual = mapa.get(m.competencia) ?? { valor: 0, quantos: 0 };
        mapa.set(m.competencia, {
          valor: atual.valor + m.valor,
          quantos: atual.quantos + m.quantos,
        });
        return mapa;
      }, new Map<string, { valor: number; quantos: number }>())
      .entries(),
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([competencia, v]) => ({ competencia, ...v }));

  const obras = resumirObras(apurados, cadastradas);

  /*
   * Só as obras com meta entram na soma. Uma obra sem meta entrando como zero
   * faria o progresso global subir sozinho a cada empreendimento novo cadastrado
   * — o denominador ficaria parado enquanto o numerador cresce.
   */
  const metaTotal = obras.reduce((total, obra) => total + (obra.meta ?? 0), 0);

  return {
    totalCaptado,
    metaTotal,
    progresso: metaTotal > 0 ? totalCaptado / metaTotal : null,
    // Nunca negativo: captar acima da meta é meta cumprida, e nao "falta menos
    // que zero".
    faltaCaptar: Math.max(0, metaTotal - totalCaptado),
    obrasSemMeta: obras.filter((obra) => obra.meta === null).length,
    entradas,
    aditivos,
    quantosContratos: apurados.length,
    quantosAditivos: soma((c) => c.quantosAditivos),
    investidores: new Set(apurados.map((c) => c.usuarioId)).size,
    modalidades: resumirModalidades(apurados),
    obras,
    totalPago: meses.reduce((total, m) => total + m.valor, 0),
    serie,
    captacao: curvaDaCaptacao(linhas),
    ciclo: {
      data: dataDoCiclo,
      contratos: apurados.filter((c) => c.modalidade === "mensal").length,
      lancados: lancados[0]?.total ?? 0,
    },
  };
}
