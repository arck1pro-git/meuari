import "server-only";
import { BUCKETS, type Bucket } from "@/lib/storage";

/**
 * Registro das tabelas administraveis.
 *
 * Ele é a fonte unica dos identificadores usados na montagem de SQL. Nome de
 * tabela e de coluna nao podem ser parametrizados por `$1` — entram no texto da
 * consulta —, entao a unica defesa contra injecao é nunca aceitar identificador
 * vindo da URL ou do formulario. Tudo é resolvido contra este registro; o que
 * nao estiver aqui nao existe para o CRUD.
 */

export type Campo = {
  nome: string;
  rotulo: string;
  tipo:
    | "texto"
    | "area"
    | "email"
    | "numero"
    | "dinheiro"
    | "data"
    | "senha"
    | "escolha"
    | "referencia"
    | "arquivo";
  obrigatorio?: boolean;
  /** Para `escolha`. */
  opcoes?: string[];
  /** Para `referencia`: slug da tabela apontada. */
  aponta?: string;
  /**
   * Para `arquivo`: em que bucket ele vive. Sai daqui, e nunca da requisicao —
   * é o mesmo cuidado dos nomes de tabela e coluna.
   */
  bucket?: Bucket;
  /** Para `arquivo`: o que o seletor de arquivo aceita, ex. "application/pdf". */
  aceita?: string;
  ajuda?: string;
};

export type Tabela = {
  slug: string;
  rotulo: string;
  /** Nome real no banco. */
  tabela: string;
  /** Coluna usada como legenda quando outra tabela aponta para esta. */
  rotuloRef: string;
  /**
   * Legenda montada, para quando uma coluna só nao identifica a linha — o caso
   * do contrato, que precisa dizer de quem é e de qual obra.
   *
   * Vai **literal** para o texto do SQL, e por isso mora aqui e em lugar
   * nenhum mais: é o mesmo cuidado dos nomes de tabela e de coluna. Nada que
   * venha de requisicao entra nesta string.
   */
  rotuloSql?: string;
  campos: Campo[];
  /** Colunas mostradas na listagem. */
  colunas: string[];
  /**
   * Tabela que é registro do que aconteceu, e nao cadastro: a listagem some com
   * o formulario de criar e com o "Editar", e sobra o "Excluir".
   *
   * O caso é `notificacoes`. Criar uma linha ali a mao encheria o sino sem
   * mandar push nenhum — o envio de verdade tem botao proprio na mesma tela.
   */
  semFormulario?: boolean;
  /**
   * Campos de `referencia` que viram filtro no topo da listagem.
   *
   * Sai daqui, e nunca da URL: o nome da coluna entra no texto do SQL, e é o
   * mesmo cuidado dos nomes de tabela. O valor, esse sim, vai parametrizado.
   */
  filtros?: string[];
};

export const TABELAS: Tabela[] = [
  {
    slug: "usuarios",
    rotulo: "Usuarios",
    tabela: "usuarios",
    rotuloRef: "nome",
    colunas: ["nome", "email", "tipo", "criado_em"],
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      { nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true },
      {
        nome: "tipo",
        rotulo: "Tipo",
        tipo: "escolha",
        obrigatorio: true,
        opcoes: ["investidor", "administrador"],
      },
      {
        nome: "senha",
        rotulo: "Senha",
        tipo: "senha",
        ajuda: "Deixe em branco para manter a senha atual.",
      },
    ],
  },
  {
    slug: "empreendimentos",
    rotulo: "Empreendimentos",
    tabela: "empreendimentos",
    rotuloRef: "nome",
    colunas: ["nome", "cidade", "uf", "status", "previsao_entrega"],
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      {
        nome: "descricao",
        rotulo: "Chamada",
        tipo: "area",
        ajuda:
          'Uma frase, no topo da tela da obra. Ex.: "O futuro da moradia em Itapema."',
      },
      { nome: "cidade", rotulo: "Cidade", tipo: "texto" },
      {
        nome: "uf",
        rotulo: "Estado",
        tipo: "texto",
        ajuda: "Sigla de duas letras, maiuscula: SC, SP, PR.",
      },
      {
        nome: "status",
        rotulo: "Status",
        tipo: "escolha",
        // A mesma lista do CHECK em `db/empreendimento-ficha.sql`. Mexer aqui
        // sem mexer la faz o banco recusar o registro na hora de salvar.
        opcoes: ["Lançamento", "Em obras", "Em construção", "Entregue"],
        ajuda: "Aparece como selo sobre a foto, na tela do investidor.",
      },
      {
        nome: "previsao_inicio_obras",
        rotulo: "Previsao de inicio das obras",
        tipo: "data",
      },
      {
        nome: "previsao_entrega",
        rotulo: "Previsao de entrega",
        tipo: "data",
        ajuda: "A entrega das chaves — nao é o inicio das obras.",
      },
    ],
  },
  {
    /*
     * Uma linha aqui é **um contrato**: o vinculo do investidor com a obra, com
     * o valor de entrada, a participacao, o prazo e o instrumento assinado. Os
     * aportes seguintes sao aditivos, na tabela abaixo.
     */
    slug: "contratos",
    rotulo: "Contratos",
    tabela: "contratos",
    rotuloRef: "data",
    // A legenda de um contrato precisa dizer de quem é e de qual obra: uma
    // lista de datas soltas nao identifica nada no seletor do aditivo.
    rotuloSql: `(select u.nome from usuarios u where u.id = contratos.usuario_id)
                || ' · ' ||
                (select e.nome from empreendimentos e where e.id = contratos.empreendimento_id)
                || ' · ' || to_char(contratos.data, 'DD/MM/YYYY')`,
    colunas: ["usuario_id", "empreendimento_id", "data", "valor", "taxa", "modalidade"],
    // Um investidor tem varios aportes, e a pergunta de sempre é "o que fulano
    // tem". Sem filtro, a lista é a mistura de todo mundo em ordem de criacao.
    filtros: ["usuario_id"],
    campos: [
      {
        nome: "usuario_id",
        rotulo: "Investidor",
        tipo: "referencia",
        aponta: "usuarios",
        obrigatorio: true,
      },
      {
        nome: "empreendimento_id",
        rotulo: "Empreendimento",
        tipo: "referencia",
        aponta: "empreendimentos",
        obrigatorio: true,
      },
      {
        nome: "data",
        rotulo: "Data de assinatura",
        tipo: "data",
        obrigatorio: true,
      },
      {
        nome: "valor",
        rotulo: "Valor de entrada",
        tipo: "dinheiro",
        obrigatorio: true,
        ajuda: "O aporte que abre o contrato. Os seguintes sao aditivos.",
      },
      {
        nome: "taxa",
        rotulo: "Participacao mensal",
        tipo: "numero",
        obrigatorio: true,
        ajuda:
          "Em decimal: 0.026 = 2,6% ao mes. Um aditivo pode troca-la; enquanto nao trocar, vale esta.",
      },
      {
        nome: "modalidade",
        rotulo: "Modalidade",
        tipo: "escolha",
        obrigatorio: true,
        opcoes: ["mensal", "final"],
      },
      {
        nome: "tipo",
        rotulo: "Tipo",
        tipo: "texto",
        obrigatorio: true,
        ajuda: 'Aparece no cartao do historico. Ex.: "Aporte inicial".',
      },
      {
        nome: "documento",
        rotulo: "Instrumento assinado",
        tipo: "arquivo",
        bucket: BUCKETS.contratos,
        aceita: "application/pdf",
      },
      {
        nome: "prazo_meses",
        rotulo: "Prazo (meses)",
        tipo: "numero",
        ajuda: "18, 24 ou 36. É ele que decide a faixa no simulador.",
      },
      { nome: "observacao", rotulo: "Observacao", tipo: "texto" },
    ],
  },
  {
    /*
     * Cada aporte feito depois da assinatura. Ele entra **dentro** do contrato
     * — nao é um contrato novo —, e por isso o unico vinculo que tem é com ele.
     */
    slug: "aditivos",
    rotulo: "Aditivos",
    tabela: "aditivos",
    rotuloRef: "data",
    colunas: ["contrato_id", "data", "valor", "taxa", "observacao"],
    filtros: ["contrato_id"],
    campos: [
      {
        nome: "contrato_id",
        rotulo: "Contrato",
        tipo: "referencia",
        aponta: "contratos",
        obrigatorio: true,
      },
      {
        nome: "data",
        rotulo: "Data do aporte",
        tipo: "data",
        obrigatorio: true,
      },
      { nome: "valor", rotulo: "Valor", tipo: "dinheiro", obrigatorio: true },
      {
        nome: "taxa",
        rotulo: "Nova participacao",
        tipo: "numero",
        ajuda:
          "Em branco = segue a do contrato. Preenchida, passa a valer para o capital inteiro a partir desta data.",
      },
      {
        nome: "documento",
        rotulo: "Aditivo assinado",
        tipo: "arquivo",
        bucket: BUCKETS.contratos,
        aceita: "application/pdf",
      },
      { nome: "observacao", rotulo: "Observacao", tipo: "texto" },
    ],
  },
  {
    // Os creditos que caíram na conta — a unica fonte do grafico do portal,
    // que nao recalcula nada. O lancamento do mes é feito no painel do topo
    // desta mesma tela; a tabela é onde se corrige, se apaga e se olha o
    // historico inteiro.
    slug: "recebimentos",
    rotulo: "Recebimentos",
    tabela: "recebimentos",
    rotuloRef: "data",
    colunas: ["contrato_id", "data", "valor", "observacao"],
    filtros: ["contrato_id"],
    campos: [
      /*
       * Só o contrato. Investidor e empreendimento saiam daqui como colunas
       * proprias, e o credito podia ficar sem obra — "credito geral" —, o que
       * deixava a tela filtrada por empreendimento sem saber onde encaixa-lo.
       * O contrato responde as duas coisas, e ainda diz a participacao e o
       * prazo que geraram aquele valor.
       */
      {
        nome: "contrato_id",
        rotulo: "Contrato",
        tipo: "referencia",
        aponta: "contratos",
        obrigatorio: true,
      },
      {
        nome: "data",
        rotulo: "Data do credito",
        tipo: "data",
        obrigatorio: true,
      },
      { nome: "valor", rotulo: "Valor", tipo: "dinheiro", obrigatorio: true },
      {
        nome: "observacao",
        rotulo: "Observacao",
        tipo: "texto",
        ajuda:
          "Aparece no toque da barra, no grafico do investidor. Use para o que fugiu da conta do ciclo.",
      },
    ],
  },
  {
    /*
     * O historico do que ja foi enviado — uma linha por aparicao na caixa do
     * sino. Nao se cria linha aqui: quem envia sao os dois campos no topo da
     * tela, "Enviar agora" e "Envio automatico". Um insert cru encheria o sino
     * sem push nenhum, que é a pior das duas metades.
     */
    slug: "notificacoes",
    rotulo: "Notificacoes",
    tabela: "notificacoes",
    rotuloRef: "titulo",
    colunas: ["titulo", "usuario_id", "criado_em"],
    semFormulario: true,
    campos: [
      {
        nome: "usuario_id",
        rotulo: "Investidor",
        tipo: "referencia",
        aponta: "usuarios",
        ajuda: "Em branco = aviso geral, para todos os investidores.",
      },
      { nome: "titulo", rotulo: "Titulo", tipo: "texto", obrigatorio: true },
      { nome: "corpo", rotulo: "Texto", tipo: "area" },
      {
        nome: "url",
        rotulo: "Link",
        tipo: "texto",
        ajuda: "Para onde levar ao tocar. Ex.: /galeria",
      },
    ],
  },
  {
    slug: "documentos",
    rotulo: "Documentos",
    tabela: "documentos",
    rotuloRef: "nome",
    colunas: ["nome", "empreendimento_id", "criado_em"],
    campos: [
      {
        nome: "empreendimento_id",
        rotulo: "Empreendimento",
        tipo: "referencia",
        aponta: "empreendimentos",
        obrigatorio: true,
      },
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      {
        nome: "url",
        rotulo: "Arquivo",
        tipo: "arquivo",
        bucket: BUCKETS.documentos,
        obrigatorio: true,
      },
    ],
  },
  {
    slug: "etapas",
    rotulo: "Etapas da obra",
    tabela: "etapas",
    rotuloRef: "nome",
    colunas: ["nome", "empreendimento_id", "percentual", "concluida_em", "ordem"],
    filtros: ["empreendimento_id"],
    campos: [
      {
        nome: "empreendimento_id",
        rotulo: "Empreendimento",
        tipo: "referencia",
        aponta: "empreendimentos",
        obrigatorio: true,
      },
      {
        nome: "nome",
        rotulo: "Etapa",
        tipo: "texto",
        obrigatorio: true,
        ajuda: 'Ex.: "Fundacao", "Estrutura", "Alvenaria".',
      },
      {
        nome: "percentual",
        rotulo: "Concluido (%)",
        tipo: "numero",
        obrigatorio: true,
        ajuda: "De 0 a 100. Aceita casa decimal: 37,5.",
      },
      /*
       * A "Frente" saiu daqui: os quadros da obra passaram a se dividir por
       * estagio — aprovado ou em aprovacao —, e nao por departamento. A coluna
       * `etapas.grupo` continua no banco, vazia e dormente, para o caso de a
       * divisao por frente voltar.
       */
      {
        nome: "concluida_em",
        rotulo: "Concluida em",
        tipo: "data",
        ajuda: "Deixe vazio enquanto a etapa estiver em andamento.",
      },
      {
        nome: "ordem",
        rotulo: "Ordem",
        tipo: "numero",
        ajuda: "A ordem da obra, nao a do cadastro. Menor aparece primeiro.",
      },
      { nome: "observacao", rotulo: "Observacao", tipo: "area" },
    ],
  },
  {
    slug: "imagens",
    rotulo: "Imagens",
    tabela: "imagens",
    rotuloRef: "nome",
    colunas: ["nome", "empreendimento_id", "criado_em"],
    campos: [
      {
        nome: "empreendimento_id",
        rotulo: "Empreendimento",
        tipo: "referencia",
        aponta: "empreendimentos",
        obrigatorio: true,
      },
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      {
        nome: "url",
        rotulo: "Imagem",
        tipo: "arquivo",
        bucket: BUCKETS.imagens,
        aceita: "image/*",
        obrigatorio: true,
      },
    ],
  },
  /*
   * "Videos" saiu do painel e da tela da obra. A tabela `videos` continua no
   * banco, vazia — nunca teve linha —, e o bucket segue declarado em
   * `lib/storage.ts`. Nada foi apagado: o que sumiu foi a porta.
   */
  /*
   * "Inscricoes de push" saiu do painel. A tabela `push_inscricoes` continua
   * viva e é escrita pelo proprio app — quem liga o aviso no sino grava a
   * inscricao do aparelho —, mas ela nao é cadastro: sao endpoint e chaves
   * criptograficas que ninguem digita, edita ou confere a olho.
   */
];

export function acharTabela(slug: string): Tabela | undefined {
  return TABELAS.find((t) => t.slug === slug);
}
