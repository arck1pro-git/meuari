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
    /** Dinheiro. Na tela sai `1.234,56`; no banco entra `1234.56`. */
    | "dinheiro"
    /**
     * Participacao, digitada em **por cento** e guardada em **decimal**.
     *
     * Quem administra pensa e fala "2,6% ao mes"; o calculo e o banco querem
     * `0.026`. Antes a conversao era mental e ficava na `ajuda` do campo — "Em
     * decimal: 0.026 = 2,6% ao mes" —, o que significa que um dia alguem
     * digitaria `2,6` e gravaria 260% ao mes.
     *
     * Agora a divisao por 100 acontece no servidor (`valorDoCampo`), e a tela só
     * mostra o `%`. Nao confundir com `etapas.percentual`, que é `numero` e vive
     * em 0–100 no proprio banco — ali nao ha conversao nenhuma.
     */
    | "percentual"
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
  /**
   * O texto do botao que abre o formulario de criar.
   *
   * Escrito por extenso, e nao derivado do `rotulo`: em portugues o artigo
   * concorda com o substantivo — "Nova imagem", "Novo contrato" —, e nenhuma
   * regra de singular acerta "Etapas da obra" ou o genero de cada palavra.
   * Tabela sem isto cai em "Novo registro".
   */
  rotuloNovo?: string;
  /** Colunas mostradas na listagem. */
  colunas: string[];
  /**
   * Colunas da listagem que **nao existem no banco**: uma expressao SQL por
   * nome.
   *
   * Vai **literal** para o texto da consulta, e por isso mora aqui e em lugar
   * nenhum mais — é a mesma regra do `rotuloSql` acima e dos nomes de tabela:
   * nada que venha de requisicao entra nesta string.
   *
   * Existe por um caso concreto: dizer se um usuario tem senha definida. O que o
   * banco guarda é o hash, que nao é a senha e nao volta a ser — mostrar o valor
   * seria exibir um blob hexadecimal inutil, e ainda por cima entregar material
   * para quebra offline. O que responde a pergunta de quem administra é "tem ou
   * nao tem", e isso é uma expressao, nao uma coluna.
   */
  colunasSql?: Record<string, string>;
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
    /*
     * "Investidores", e nao "Usuarios" — é como se fala deles em todo o resto do
     * produto. A tabela guarda tambem os administradores, que sao poucos e
     * aparecem com o `tipo` na propria listagem; o rotulo segue quem é a
     * maioria e o motivo de a tela existir.
     *
     * O `slug` continua `usuarios`: ele é a URL e o nome real no banco, e mexer
     * nele quebraria link salvo sem ganhar nada.
     */
    rotulo: "Investidores",
    tabela: "usuarios",
    rotuloNovo: "Novo investidor",
    rotuloRef: "nome",
    colunas: ["nome", "email", "tipo", "senha_definida", "criado_em"],
    /*
     * A senha nao tem valor a mostrar: `senha_hash` guarda o resultado de um
     * scrypt, que é de mao unica. O que a listagem responde é se ha senha —
     * quem nunca definiu nao consegue entrar, e ate aqui isso so se descobria
     * tentando.
     */
    colunasSql: {
      senha_definida: `case when senha_hash is null or senha_hash = '' then 'sem senha' else 'definida' end`,
    },
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
    rotuloNovo: "Novo empreendimento",
    rotuloRef: "nome",
    colunas: ["nome", "cidade", "uf", "status", "meta_captacao", "previsao_entrega"],
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      {
        /*
         * Quanto se pretende captar. **Dado interno** — ele diz quanto ainda
         * falta levantar, e no portal de quem ja aportou isso nao tem uso e
         * pode ser lido como sinal de risco.
         *
         * O que o mantem interno nao é este comentario: é `COLUNAS_DA_FICHA`,
         * em `lib/portal/dados.ts`, que lista uma a uma as colunas que o
         * investidor recebe. `meta_captacao` nao esta la, e ha uma nota ali
         * explicando que a ausencia é proposital.
         */
        nome: "meta_captacao",
        rotulo: "Meta de captação",
        tipo: "dinheiro",
        ajuda:
          "Quanto se pretende captar nesta obra. Só o /admin vê — nunca aparece para o investidor. Em branco, o painel não mostra progresso.",
      },
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
    rotuloNovo: "Novo contrato",
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
        rotulo: "Participação mensal",
        tipo: "percentual",
        obrigatorio: true,
        ajuda:
          "Ao mês. Um aditivo pode trocá-la; enquanto não trocar, vale esta.",
      },
      {
        nome: "modalidade",
        rotulo: "Modalidade",
        tipo: "escolha",
        obrigatorio: true,
        opcoes: ["mensal", "final"],
      },
      /*
       * "Tipo" saiu daqui. Era texto livre que virava a legenda do cartao no
       * historico do investidor, e em tres contratos tinha tres grafias:
       * 'Aporte Inicial', 'Aporte inicial' e 'contrato'. A coluna continua no
       * banco, NOT NULL, com DEFAULT 'Aporte inicial' — ver
       * `db/contrato-tipo-padrao.sql`. O historico segue lendo ela.
       *
       * "Observacao" saiu junto, e essa nao deixou nada para tras: estava vazia
       * em todos os contratos.
       */
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
        // `numero`, e nao `percentual`: sao meses, e 18 é 18.
        tipo: "numero",
        ajuda: "18, 24 ou 36. É ele que decide a faixa no simulador.",
      },
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
    rotuloNovo: "Novo aditivo",
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
        rotulo: "Nova participação",
        // A mesma grandeza do contrato, e por isso o mesmo tipo: se aqui fosse
        // `numero`, o mesmo campo teria duas regras em duas telas.
        tipo: "percentual",
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
    rotuloNovo: "Novo recebimento",
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
    rotulo: "Notificações",
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
    rotuloNovo: "Novo documento",
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
    rotuloNovo: "Nova etapa",
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
    rotuloNovo: "Nova imagem",
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
