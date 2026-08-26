import "server-only";
import { consultar } from "@/lib/db";
import { assinarVarias, BUCKETS } from "@/lib/storage";

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

/**
 * Uma foto da obra: um `Arquivo` que sabe de onde é.
 *
 * O local vem junto da foto, e nao numa lista separada de locais, por um motivo
 * pratico: a galeria monta os atalhos do topo a partir das proprias fotos, entao
 * local cadastrado que ainda nao tem foto nenhuma simplesmente nao aparece —
 * atalho que leva a uma fila vazia é pior do que atalho nenhum.
 *
 * `null` é o estado normal, e nao pendencia: obra sem locais cadastrados
 * continua com a fila unica de sempre.
 */
export type Foto = Arquivo & {
  /**
   * A mesma foto numa largura maior, para a ampliacao.
   *
   * `url` é a versao de cartao e continua sendo a que se usa sem pensar; esta
   * só é buscada quando a tela cheia abre. Ver `CARTAO` e `CHEIA`.
   */
  ampliada: string;
  /**
   * `desde` é a data de cadastro do local, e existe só para ordenar os atalhos
   * da galeria — nao é para aparecer em tela. Os locais saem na ordem em que
   * foram criados, que é a ordem em que alguem os pensou; havia uma coluna
   * `ordem` digitada a mao e ela saiu pelo mesmo motivo que a das etapas. Ver a
   * nota em `lib/admin/tabelas.ts`.
   */
  local: { id: string; nome: string; desde: string } | null;
};

/** A forma crua que a consulta devolve, antes de o local virar um objeto. */
type LinhaDeFoto = Arquivo & {
  localId: string | null;
  localNome: string | null;
  localDesde: string | null;
};

/**
 * Junta as tres colunas do `left join` num campo só.
 *
 * Na tela o local é uma coisa ou nao é — e tres campos que so fazem sentido
 * juntos, todos podendo ser nulos por conta propria, sao tres oportunidades de
 * alguem checar o errado.
 */
function comLocal<T extends LinhaDeFoto>({
  localId,
  localNome,
  localDesde,
  ...resto
}: T): Omit<T, "localId" | "localNome" | "localDesde"> & Foto {
  return {
    ...resto,
    local:
      localId && localNome
        ? { id: localId, nome: localNome, desde: localDesde ?? "" }
        : null,
  } as Omit<T, "localId" | "localNome" | "localDesde"> & Foto;
}

/*
 * As colunas de uma foto com o local ao lado.
 *
 * Uma constante para as duas consultas — a da lista de obras e a da obra
 * unica — porque elas tem de devolver exatamente a mesma forma: é o mesmo
 * `Foto` que alimenta o mesmo carrossel nas duas telas.
 *
 * `left join` e nao `join`: foto sem local continua na lista. Um `join` comum
 * faria as fotos antigas desaparecerem da galeria no dia em que o primeiro
 * local fosse cadastrado.
 */
const COLUNAS_DA_FOTO = `i.id, i.nome, i.url,
        to_char(i.criado_em at time zone $2, 'YYYY-MM-DD') as data,
        l.id as "localId", l.nome as "localNome",
        to_char(l.criado_em, 'YYYY-MM-DD"T"HH24:MI:SS.US') as "localDesde"`;

export type Empreendimento = {
  id: string;
  nome: string;
  descricao: string | null;
  previsaoInicioObras: DataISO | null;
  /** Onde a obra fica. `null` enquanto ninguem preencher no /admin. */
  cidade: string | null;
  /** Sigla de duas letras, maiuscula — o banco recusa outra coisa. */
  uf: string | null;
  /** Em que pé ela esta: `Lançamento`, `Em obras`, `Em construção`, `Entregue`. */
  status: string | null;
  /** A entrega — que nao é o inicio das obras. */
  previsaoEntrega: DataISO | null;
  documentos: Arquivo[];
  imagens: Foto[];
};

/**
 * As colunas da ficha, no formato que a tela usa. Uma lista só, para as duas
 * consultas.
 *
 * **A lista é fechada, e é ela que decide o que o investidor recebe.** Nao ha
 * `select e.*` aqui de proposito: coluna nova em `empreendimentos` nao chega ao
 * portal sozinha — alguem precisa vir aqui e acrescenta-la, e é nesse momento
 * que se pergunta se aquele dado é para ser visto.
 *
 * `meta_captacao` **nao entra aqui**, e a ausencia é a funcionalidade: ela diz
 * quanto a incorporadora ainda precisa levantar. É numero de negocio, sem uso
 * para quem ja aportou, e que pode ser lido como sinal de risco por quem ve "R$
 * 5,8 milhoes a captar" na tela da propria obra. Ela vive so no /admin — ver
 * `lib/admin/painel.ts`.
 */
const COLUNAS_DA_FICHA = `e.id,
            e.nome,
            e.descricao,
            e.cidade,
            e.uf,
            e.status,
            to_char(e.previsao_inicio_obras, 'YYYY-MM-DD') as "previsaoInicioObras",
            to_char(e.previsao_entrega, 'YYYY-MM-DD')      as "previsaoEntrega"`;

/** O que as duas consultas de empreendimento devolvem antes dos arquivos. */
type FichaDoEmpreendimento = Omit<Empreendimento, "documentos" | "imagens">;

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

/**
 * Todo dinheiro que a pessoa colocou: a entrada de cada contrato e cada aditivo
 * feito depois.
 *
 * Os dois viram a mesma coisa aqui — um `Aporte` —, porque para o calculo eles
 * sao a mesma coisa: capital que entrou numa data, sob uma participacao. O que
 * muda é a origem, e é o contrato que carrega modalidade, obra e prazo.
 *
 * O aditivo sem participacao propria herda a do contrato (`coalesce`): em
 * branco significa "segue como esta", e nao "sem taxa".
 */
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

      union all

     select a.id,
            to_char(a.data, 'YYYY-MM-DD') as data,
            a.valor::float8 as valor,
            coalesce(a.observacao, 'Aporte adicional') as tipo,
            c.modalidade,
            coalesce(a.taxa, c.taxa)::float8 as "taxaMensal",
            a.documento,
            e.id   as "empreendimentoId",
            e.nome as "empreendimentoNome"
       from aditivos a
       join contratos c      on c.id = a.contrato_id
       join empreendimentos e on e.id = c.empreendimento_id
      where c.usuario_id = $1

      order by data, id`,
    [usuarioId],
  );

  /*
   * O documento nao é assinado aqui: ele aponta para `/arquivo/aporte/{id}`, que
   * confere a posse de novo, **registra o acesso** e assina por 60 segundos.
   *
   * Antes a URL assinada era gerada nesta consulta e ia pronta para o `href`.
   * Funcionava e era segura no momento da emissao — o `where usuario_id = $1`
   * acima é a prova de posse —, mas tinha dois furos que só a rota fecha: nao
   * havia registro de quem abriu contrato de quem, e o link valia uma hora fora
   * da sessao, para qualquer um que o copiasse.
   *
   * De brinde, sai uma ida de rede ao Supabase a cada render da carteira: antes
   * cada aporte com documento era assinado mesmo quando ninguem clicava.
   */
  return aportes.map((aporte) => ({
    ...aporte,
    documento: aporte.documento ? `/arquivo/aporte/${aporte.id}` : null,
  }));
}

/**
 * Creditos ja pagos, lancados no /admin.
 *
 * É a unica fonte do grafico de recebimentos: o portal nao calcula credito
 * nenhum. A conta do contrato virou a estimativa do `/admin/lancamentos`, que
 * sugere o valor do ciclo para quem lanca confirmar ou corrigir — e o que a
 * pessoa ve é sempre o que passou por ali.
 */
export async function getRecebimentosLancados(usuarioId: string): Promise<
  {
    data: DataISO;
    valor: number;
    observacao: string | null;
    /** O empreendimento vem do contrato do credito, e nao de coluna propria. */
    empreendimentoId: string;
  }[]
> {
  /*
   * O vinculo é com o contrato, e a obra sai dele. Antes o credito guardava o
   * empreendimento por conta propria e podia ficar sem nenhum — "credito
   * geral" —, o que deixava a tela filtrada por obra sem saber onde encaixa-lo.
   */
  return consultar(
    `select to_char(r.data, 'YYYY-MM-DD') as data,
            r.valor::float8 as valor,
            r.observacao,
            c.empreendimento_id as "empreendimentoId"
       from recebimentos r
       join contratos c on c.id = r.contrato_id
      where c.usuario_id = $1
      order by r.data`,
    [usuarioId],
  );
}

/**
 * Os contratos da pessoa como o simulador precisa deles.
 *
 * Agora é um por contrato de verdade — antes era um agrupamento por
 * empreendimento e modalidade, porque cada aporte era uma linha de `contratos`
 * e nao havia contrato a que se referir.
 *
 * Duas contas moram no SQL, e nao aqui, por correcao:
 *
 * - **capital** é a entrada mais todos os aditivos;
 * - **taxa vigente** é a do aditivo mais recente que trouxe participacao
 *   propria; sem nenhum, a do contrato. A regra é que a ultima participacao
 *   passa a valer para o capital inteiro, entao pegar "alguma" delas daria um
 *   numero plausivel e errado.
 */
export async function getContratosParaSimular(usuarioId: string): Promise<
  {
    id: string;
    empreendimentoId: string;
    empreendimento: string;
    modalidade: Modalidade;
    capital: number;
    taxa: number;
    prazoMeses: number | null;
  }[]
> {
  return consultar(
    `select c.id,
            e.id   as "empreendimentoId",
            e.nome as empreendimento,
            c.modalidade,
            (c.valor + coalesce(
               (select sum(a.valor) from aditivos a where a.contrato_id = c.id),
               0))::float8 as capital,
            coalesce(
              (select a.taxa from aditivos a
                where a.contrato_id = c.id and a.taxa is not null
                order by a.data desc, a.criado_em desc
                limit 1),
              c.taxa)::float8 as taxa,
            c.prazo_meses as "prazoMeses"
       from contratos c
       join empreendimentos e on e.id = c.empreendimento_id
      where c.usuario_id = $1
      order by e.nome, c.data`,
    [usuarioId],
  );
}

/**
 * So o id e o nome dos empreendimentos da pessoa.
 *
 * O `/portal` precisava disto — validar o `?e=` da URL e montar o seletor —
 * e estava chamando `getEmpreendimentos`, que alem da consulta traz
 * documentos, imagens e videos e assina a URL de cada arquivo no Supabase. Eram
 * tres consultas e uma ida a rede por bucket, toda vez, para acabar usando dois
 * campos.
 */
export async function getEmpreendimentosBasicos(
  usuarioId: string,
): Promise<{ id: string; nome: string }[]> {
  return consultar<{ id: string; nome: string }>(
    `select distinct e.id, e.nome
       from empreendimentos e
       join contratos c on c.empreendimento_id = e.id
      where c.usuario_id = $1
      order by e.nome`,
    [usuarioId],
  );
}

/**
 * Empreendimentos que o investidor pode ver: aqueles em que ele aportou, e
 * nenhum outro. Um empreendimento sem aporte nao aparece no portal de ninguem —
 * o que é o comportamento certo, e nao um bug.
 *
 * Traz os arquivos e as fotos, ja com URL assinada. Para quem so precisa de id
 * e nome, ha `getEmpreendimentosBasicos` — bem mais barata.
 */
export async function getEmpreendimentos(
  usuarioId: string,
): Promise<Empreendimento[]> {
  const empreendimentos = await consultar<FichaDoEmpreendimento>(
    `select distinct
            ${COLUNAS_DA_FICHA}
       from empreendimentos e
       join contratos c on c.empreendimento_id = e.id
      where c.usuario_id = $1
      order by e.nome`,
    [usuarioId],
  );

  if (empreendimentos.length === 0) return [];

  const ids = empreendimentos.map((e) => e.id);

  /*
   * Uma consulta por tabela, e nao uma por empreendimento: `= any($1)` traz
   * tudo de uma vez e o agrupamento acontece aqui.
   *
   * As duas eram a mesma consulta, montada num `map` sobre `["documentos",
   * "imagens"]`. Deixaram de ser quando a foto ganhou o local: a de imagens tem
   * um `left join` que a de documentos nao tem. Escritas por extenso porque
   * agora sao mesmo duas coisas — parametrizar a diferenca sairia mais longo
   * que as duas juntas.
   */
  const [documentos, imagens] = await Promise.all([
    consultar<Arquivo & { empreendimentoId: string }>(
      `select id, nome, url,
              to_char(criado_em at time zone $2, 'YYYY-MM-DD') as data,
              empreendimento_id as "empreendimentoId"
         from documentos
        where empreendimento_id = any($1)
        order by criado_em desc, nome`,
      [ids, FUSO],
    ),
    consultar<LinhaDeFoto & { empreendimentoId: string }>(
      // A ordem continua sendo a da fila: mais recente primeiro. Ordenar por
      // local aqui mudaria o carrossel da tela da obra, que mostra "as fotos
      // mais novas" e nao "as fotos agrupadas" — a divisao por local é da
      // ampliacao, e acontece la.
      `select ${COLUNAS_DA_FOTO}, i.empreendimento_id as "empreendimentoId"
         from imagens i
         left join locais l on l.id = i.local_id
        where i.empreendimento_id = any($1)
        order by i.criado_em desc, i.nome`,
      [ids, FUSO],
    ),
  ]);

  /*
   * Cada lista vira URL utilizavel aqui, e nao no componente: o componente é
   * quem menos deve saber de bucket e assinatura, e a checagem de acesso ja
   * aconteceu na consulta acima (so entram empreendimentos onde esta pessoa
   * aportou).
   */
  // Documento vai pela rota auditada; foto continua assinada aqui.
  const comDocumentos = pelaRota(documentos);
  const comImagens = await resolverFotos(imagens);

  const dos = <T extends { empreendimentoId: string }>(
    lista: T[],
    id: string,
  ) => lista.filter((item) => item.empreendimentoId === id);

  return empreendimentos.map((e) => ({
    ...e,
    documentos: dos(comDocumentos, e.id),
    imagens: dos(comImagens, e.id).map(comLocal),
  }));
}

/**
 * Documento de obra apontando para `/arquivo/obra/{id}`, em vez de URL assinada.
 *
 * O mesmo motivo de `getAportes`: a rota confere a posse outra vez, registra
 * quem abriu e assina por 60 segundos. Aqui nao ha o filtro que `resolverFotos`
 * faz — sem assinar, nao ha como saber de antemao se o arquivo ainda esta no
 * bucket. É troca consciente: um item que sumiu do Storage aparece na lista e dá
 * 404 no clique, em vez de desaparecer em silencio. Some com o nome na tela é
 * pior, porque o investidor viu aquele documento na semana passada.
 *
 * **Foto continua assinada direto** (`resolverFotos`, abaixo): uma galeria com
 * dezenas de imagens passando por redirecionamento seria uma ida a mais por
 * foto, e foto de obra nao tem o peso de um contrato.
 */
function pelaRota<T extends Arquivo>(lista: T[]): T[] {
  return lista
    .filter((item) => Boolean(item.url))
    .map((item) => ({ ...item, url: `/arquivo/obra/${item.id}` }));
}

/*
 * Havia aqui um `resolver` generico, que assinava uma lista de arquivos de
 * qualquer bucket. Ele tinha dois chamadores, os dois de foto, e os dois
 * passaram para `resolverFotos` quando a foto ganhou duas larguras. Sem
 * chamador, saiu: helper generico com um caso de uso só é abstracao esperando
 * para divergir do unico lugar que a usa.
 */

/**
 * As duas larguras em que uma foto é entregue.
 *
 * **Nenhuma tela recebe o original.** O bucket guarda render de arquitetura em
 * PNG — os sete que havia somavam 20 MB, e o navegador baixava os 20 MB para
 * desenhar um quadrado de 400px no celular. O Supabase redimensiona e converte
 * para WebP na borda; medido neste mesmo bucket, o PNG de 6,75 MB volta com
 * 122 KB em 1080px.
 *
 * Duas, e nao uma, porque as duas telas pedem coisas diferentes:
 *
 * - `CARTAO` serve o carrossel da obra, que desenha a foto num quadrado. 1080px
 *   cobre a coluna inteira num monitor comum e ainda sobra para a tela retina
 *   do celular.
 * - `CHEIA` serve a ampliacao, que ocupa a tela toda.
 *
 * **1600 é o teto util, e nao um numero redondo:** os originais tem por volta
 * dessa largura, entao pedir 2000 devolveu exatamente o mesmo arquivo de 1600
 * na medicao. Acima disso paga-se banda por pixel que nao existe.
 *
 * Sao duas assinaturas em lote — duas idas ao Storage por tela, e nao duas por
 * foto.
 */
const CARTAO = { largura: 1080, qualidade: 68 } as const;
const CHEIA = { largura: 1600, qualidade: 72 } as const;

/**
 * O mesmo que `resolver`, para foto: assina nas duas larguras.
 *
 * `url` continua sendo a que qualquer tela pode usar sem pensar — é a menor.
 * `ampliada` só é buscada pelo navegador quando a ampliacao abre, via `srcset`;
 * ver `Carrossel`.
 */
async function resolverFotos<T extends LinhaDeFoto>(
  lista: T[],
): Promise<(T & { ampliada: string })[]> {
  if (lista.length === 0) return [];

  const caminhos = lista.map((item) => item.url);
  const [cartao, cheia] = await Promise.all([
    assinarVarias(BUCKETS.imagens, caminhos, { transformar: CARTAO }),
    assinarVarias(BUCKETS.imagens, caminhos, { transformar: CHEIA }),
  ]);

  return lista
    .map((item) => ({
      ...item,
      url: cartao.get(item.url) ?? null,
      // Se só a versao grande falhar, a foto ainda aparece: a ampliacao cai no
      // `src`, que é a menor. Perder nitidez é melhor que perder a foto.
      ampliada: cheia.get(item.url) ?? cartao.get(item.url) ?? null,
    }))
    .filter((item): item is T & { ampliada: string } => Boolean(item.url));
}

/** Quem é a pessoa, para a tela de perfil. */
export type Perfil = {
  nome: string;
  email: string;
  /** `investidor` ou `administrador`. */
  tipo: string;
  /** Data de criacao da conta, em `AAAA-MM-DD`. */
  desde: DataISO;
  /** Quantos aportes e quantas obras — o resumo do vinculo com a operacao. */
  aportes: number;
  obras: number;
};

export async function getPerfil(usuarioId: string): Promise<Perfil | null> {
  /*
   * Um `select` só: os dois contadores vem de subconsultas em vez de `join` +
   * `group by`, porque um join com contratos multiplicaria a linha do usuario e
   * o `distinct` para desfazer isso é justamente o que se quer evitar.
   */
  const [linha] = await consultar<{
    nome: string;
    email: string;
    tipo: string;
    desde: string;
    aportes: string;
    obras: string;
  }>(
    `select u.nome,
            u.email,
            u.tipo,
            to_char(u.criado_em, 'YYYY-MM-DD') as desde,
            (select count(*) from contratos c where c.usuario_id = u.id) as aportes,
            (select count(distinct c.empreendimento_id)
               from contratos c where c.usuario_id = u.id) as obras
       from usuarios u
      where u.id = $1`,
    [usuarioId],
  );

  if (!linha) return null;

  // `count` volta como texto no driver: bigint nao cabe em number com garantia,
  // e o pg prefere nao decidir por nos.
  return {
    nome: linha.nome,
    email: linha.email,
    tipo: linha.tipo,
    desde: linha.desde,
    aportes: Number(linha.aportes),
    obras: Number(linha.obras),
  };
}

/** Uma etapa da obra, com o quanto ela andou. */
export type Etapa = {
  id: string;
  nome: string;
  /** De 0 a 100. */
  percentual: number;
  /** `null` enquanto a etapa estiver em andamento. */
  concluidaEm: DataISO | null;
  observacao: string | null;
  /**
   * Link para `/arquivo/etapa/{id}`, ou `null` quando nao ha papel anexado.
   *
   * **Nunca o caminho no bucket**, e nunca uma URL assinada: é a rota que
   * confere a posse de novo, registra quem abriu e assina por 60 segundos.
   * Mesmo arranjo dos documentos da obra — ver `pelaRota`.
   */
  documento: string | null;
};

/** O empreendimento inteiro: ficha, fotos, etapas e documentos. */
export type Obra = Empreendimento & {
  etapas: Etapa[];
  /**
   * Quando a obra mudou pela ultima vez — a mais recente entre a ficha, as
   * etapas, as fotos e os documentos.
   *
   * Nao é um campo digitado: é a data do proprio movimento. Um "atualizado em"
   * que alguem precisa lembrar de mexer é o primeiro dado a ficar velho.
   */
  atualizadoEm: DataISO | null;
};

/**
 * Uma obra da pessoa, com tudo que a tela dela mostra.
 *
 * A checagem de acesso é a propria consulta: o `join` com `contratos` só
 * devolve linha se aquele investidor aportou naquele empreendimento. Id de
 * outro, ou inventado, volta vazio — e a pagina responde 404 sem consultar mais
 * nada nem revelar que o empreendimento existe.
 */
export async function getObra(
  usuarioId: string,
  empreendimentoId: string,
): Promise<Obra | null> {
  const [base] = await consultar<FichaDoEmpreendimento>(
    `select distinct
            ${COLUNAS_DA_FICHA}
       from empreendimentos e
       join contratos c on c.empreendimento_id = e.id
      where c.usuario_id = $1 and e.id = $2`,
    [usuarioId, empreendimentoId],
  );

  if (!base) return null;

  const [documentos, imagens, etapas, movimento] = await Promise.all([
    consultar<Arquivo>(
      `select id, nome, url, to_char(criado_em at time zone $2, 'YYYY-MM-DD') as data
         from documentos where empreendimento_id = $1
        order by criado_em desc, nome`,
      [base.id, FUSO],
    ),
    // A mesma forma da consulta da lista de obras — as duas alimentam o mesmo
    // carrossel, entao dividem `COLUNAS_DA_FOTO`.
    consultar<LinhaDeFoto>(
      `select ${COLUNAS_DA_FOTO}
         from imagens i
         left join locais l on l.id = i.local_id
        where i.empreendimento_id = $1
        order by i.criado_em desc, i.nome`,
      [base.id, FUSO],
    ),
    /*
     * `documento` sai daqui como o caminho cru do bucket e é trocado pelo link
     * da rota logo abaixo, na montagem — a coluna nunca chega ao navegador. Ver
     * a nota no tipo `Etapa`.
     */
    /*
     * A ordem é a de cadastro.
     *
     * `etapas.ordem` era um numero digitado no /admin e vinha na frente da data
     * neste `order by`. Saiu porque era sempre a propria sequencia de cadastro,
     * escrita a mao: as catorze etapas de hoje tem 1 a 14, e ordenar por
     * `criado_em` devolve exatamente a mesma fila. A coluna continua no banco,
     * dormente. Ver a nota em `lib/admin/tabelas.ts`.
     */
    consultar<Etapa>(
      `select id, nome, percentual::float8 as percentual,
              to_char(concluida_em, 'YYYY-MM-DD') as "concluidaEm",
              observacao,
              documento
         from etapas where empreendimento_id = $1
        order by criado_em`,
      [base.id],
    ),
    /*
     * A data do ultimo movimento. `greatest` ignora nulo — obra sem etapa nem
     * foto cai na propria ficha, e so devolve vazio se nada disso existir.
     */
    consultar<{ atualizadoEm: DataISO | null }>(
      `select to_char(
                greatest(
                  e.atualizado_em,
                  (select max(atualizado_em) from etapas     where empreendimento_id = e.id),
                  (select max(criado_em)     from imagens    where empreendimento_id = e.id),
                  (select max(criado_em)     from documentos where empreendimento_id = e.id)
                ) at time zone $2,
                'YYYY-MM-DD'
              ) as "atualizadoEm"
         from empreendimentos e where e.id = $1`,
      [base.id, FUSO],
    ),
  ]);

  // Documento vai pela rota auditada; foto continua assinada aqui.
  const comDocumentos = pelaRota(documentos);
  const comImagens = await resolverFotos(imagens);

  return {
    ...base,
    documentos: comDocumentos,
    imagens: comImagens.map(comLocal),
    /*
     * O caminho no bucket sai daqui e o link da rota entra no lugar. A troca
     * é nesta linha, e nao no SQL, pelo mesmo motivo de `pelaRota`: a coluna
     * guarda o caminho, a tela precisa de um endereco, e quem converte um no
     * outro é o codigo que sabe onde a rota mora.
     */
    etapas: etapas.map((etapa) => ({
      ...etapa,
      documento: etapa.documento ? `/arquivo/etapa/${etapa.id}` : null,
    })),
    atualizadoEm: movimento[0]?.atualizadoEm ?? null,
  };
}
