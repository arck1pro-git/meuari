import "server-only";
import { consultar } from "@/lib/db";
import { assinarVarias, BUCKETS, type Bucket } from "@/lib/storage";

/**
 * Camada de dados do Portal do Investidor — agora lendo do Postgres.
 *
 * O portal mostra *so* o que existe no banco. Onde antes havia texto de exemplo
 * (etapas de obra, relatorios mensais, endereco, percentual concluido, cotas,
 * CPF) nao ha tabela, e por isso nao ha mais tela: inventar numero de obra é
 * pior do que nao mostrar.
 *
 * Uma linha de `contratos` é um aporte: valor, data, participacao, modalidade e
 * o instrumento que o formaliza, tudo junto. As duas tabelas foram uma só, se
 * separaram para o aporte ganhar data propria, e voltaram a ser uma quando a
 * coluna `data` passou para ca.
 */

/** Data no formato `AAAA-MM-DD`. Evitamos `Date` para nao depender de fuso. */
export type DataISO = string;

export type Modalidade = "final" | "mensal";

/** Um aporte do investidor. No banco, uma linha de `contratos`. */
export type Aporte = {
  id: string;
  /** A data em que o dinheiro entrou. */
  data: DataISO;
  valor: number;
  /** Texto livre digitado no /admin. Vira a legenda do cartao. */
  tipo: string;
  modalidade: Modalidade;
  /** Participacao mensal em decimal: 0.026 = 2,6% ao mes. */
  taxaMensal: number;
  /** URL do instrumento assinado, se houver. */
  documento: string | null;
  empreendimentoId: string;
  empreendimentoNome: string;
};

/** Documento, imagem ou video de um empreendimento — as tres tem a mesma forma. */
export type Arquivo = {
  id: string;
  nome: string;
  url: string;
  data: DataISO;
};

export type Empreendimento = {
  id: string;
  nome: string;
  descricao: string | null;
  previsaoInicioObras: DataISO | null;
  documentos: Arquivo[];
  imagens: Arquivo[];
  videos: Arquivo[];
};

/*
 * Datas e dinheiro sao convertidos no proprio SQL:
 *
 * - `to_char(... at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')` entrega a data
 *   pronta como texto. Deixar o `pg` devolver `Date` traria o fuso do servidor
 *   para dentro do calculo — em producao, provavelmente UTC, o que joga um
 *   aporte das 22h para o dia seguinte.
 * - `::float8` porque o driver devolve `numeric` como *string*, para nao perder
 *   precisao. Sem o cast, `valor` chegaria como "50000.00" e somar viraria
 *   concatenacao.
 */
const FUSO = "America/Sao_Paulo";

/** Data de posicao da carteira: hoje, no fuso de Brasilia. */
export async function dataDeReferencia(): Promise<DataISO> {
  const [linha] = await consultar<{ hoje: string }>(
    `select to_char(now() at time zone $1, 'YYYY-MM-DD') as hoje`,
    [FUSO],
  );
  return linha.hoje;
}

export async function getAportes(usuarioId: string): Promise<Aporte[]> {
  const aportes = await consultar<Aporte>(
    `select c.id,
            to_char(c.data, 'YYYY-MM-DD') as data,
            c.valor::float8  as valor,
            c.tipo,
            c.modalidade,
            c.taxa::float8   as "taxaMensal",
            c.documento,
            e.id             as "empreendimentoId",
            e.nome           as "empreendimentoNome"
       from contratos c
       join empreendimentos e on e.id = c.empreendimento_id
      where c.usuario_id = $1
      order by c.data, c.criado_em`,
    [usuarioId],
  );

  /*
   * A assinatura acontece *depois* da consulta, e é ela que faz o controle de
   * acesso: o `where usuario_id = $1` acima é a prova de que o contrato é desta
   * pessoa. Sem isso, um caminho de bucket vazado viraria download para
   * qualquer um — o bucket é privado justamente para nao aceitar pedido cru.
   */
  const assinadas = await assinarVarias(
    BUCKETS.contratos,
    aportes.map((a) => a.documento).filter((d): d is string => Boolean(d)),
  );

  return aportes.map((aporte) => ({
    ...aporte,
    documento: aporte.documento
      ? (assinadas.get(aporte.documento) ?? null)
      : null,
  }));
}

/**
 * Creditos ja pagos, lancados a mao no /admin.
 *
 * O portal usa estes valores no lugar do calculo ate a data de corte — ver
 * `PRIMEIRO_CICLO_CALCULADO`. É o que permite o historico refletir o que de fato
 * caiu na conta, inclusive quando fugiu da formula.
 */
export async function getRecebimentosLancados(usuarioId: string): Promise<
  {
    data: DataISO;
    valor: number;
    observacao: string | null;
    /** `null` = credito geral, sem empreendimento atribuido. */
    empreendimentoId: string | null;
  }[]
> {
  return consultar(
    `select to_char(data, 'YYYY-MM-DD') as data,
            valor::float8 as valor,
            observacao,
            empreendimento_id as "empreendimentoId"
       from recebimentos
      where usuario_id = $1
      order by data`,
    [usuarioId],
  );
}

/**
 * Empreendimentos que o investidor pode ver: aqueles em que ele aportou, e
 * nenhum outro. Um empreendimento sem aporte nao aparece no portal de ninguem —
 * o que é o comportamento certo, e nao um bug.
 */
export async function getEmpreendimentos(
  usuarioId: string,
): Promise<Empreendimento[]> {
  const empreendimentos = await consultar<{
    id: string;
    nome: string;
    descricao: string | null;
    previsaoInicioObras: DataISO | null;
  }>(
    `select distinct
            e.id,
            e.nome,
            e.descricao,
            to_char(e.previsao_inicio_obras, 'YYYY-MM-DD') as "previsaoInicioObras"
       from empreendimentos e
       join contratos c on c.empreendimento_id = e.id
      where c.usuario_id = $1
      order by e.nome`,
    [usuarioId],
  );

  if (empreendimentos.length === 0) return [];

  const ids = empreendimentos.map((e) => e.id);

  // Uma consulta por tabela, e nao uma por empreendimento: `= any($1)` traz
  // tudo de uma vez e o agrupamento acontece aqui. O nome da tabela sai da
  // lista literal abaixo — nunca de requisicao —, que é o que permite
  // interpola-lo no texto do SQL.
  const [documentos, imagens, videos] = await Promise.all(
    ["documentos", "imagens", "videos"].map((tabela) =>
      consultar<Arquivo & { empreendimentoId: string }>(
        `select id, nome, url,
                to_char(criado_em at time zone $2, 'YYYY-MM-DD') as data,
                empreendimento_id as "empreendimentoId"
           from ${tabela}
          where empreendimento_id = any($1)
          order by criado_em desc, nome`,
        [ids, FUSO],
      ),
    ),
  );

  /*
   * Cada lista vira URL utilizavel aqui, e nao no componente: o componente é
   * quem menos deve saber de bucket e assinatura, e a checagem de acesso ja
   * aconteceu na consulta acima (so entram empreendimentos onde esta pessoa
   * aportou).
   */
  const [comDocumentos, comImagens, comVideos] = await Promise.all([
    resolver(documentos, BUCKETS.documentos),
    resolver(imagens, BUCKETS.imagens),
    resolver(videos, BUCKETS.videos),
  ]);

  const dos = <T extends { empreendimentoId: string }>(lista: T[], id: string) =>
    lista.filter((item) => item.empreendimentoId === id);

  return empreendimentos.map((e) => ({
    ...e,
    documentos: dos(comDocumentos, e.id),
    imagens: dos(comImagens, e.id),
    videos: dos(comVideos, e.id),
  }));
}

/**
 * Troca o caminho guardado no banco pela URL que o navegador consegue abrir.
 *
 * O que nao tem endereco utilizavel some da lista: melhor a secao vir menor do
 * que um item quebrado, com nome e sem arquivo.
 */
async function resolver<T extends Arquivo>(
  lista: T[],
  bucket: Bucket,
): Promise<T[]> {
  if (lista.length === 0) return lista;

  const assinadas = await assinarVarias(
    bucket,
    lista.map((item) => item.url),
  );

  return lista
    .map((item) => ({ ...item, url: assinadas.get(item.url) ?? null }))
    .filter((item): item is T => Boolean(item.url));
}
