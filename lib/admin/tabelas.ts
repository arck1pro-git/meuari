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
  campos: Campo[];
  /** Colunas mostradas na listagem. */
  colunas: string[];
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
    colunas: ["nome", "previsao_inicio_obras", "criado_em"],
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      { nome: "descricao", rotulo: "Descricao", tipo: "area" },
      {
        nome: "previsao_inicio_obras",
        rotulo: "Previsao de inicio das obras",
        tipo: "data",
      },
    ],
  },
  {
    /*
     * Uma linha aqui é um aporte *e* o contrato que o formaliza — as duas coisas
     * viraram uma tabela só. É daqui que o portal deriva capital, saldo,
     * historico e a agenda de creditos.
     */
    slug: "contratos",
    rotulo: "Aportes e contratos",
    tabela: "contratos",
    rotuloRef: "data",
    colunas: ["usuario_id", "data", "valor", "taxa", "modalidade", "tipo"],
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
        rotulo: "Data do aporte",
        tipo: "data",
        obrigatorio: true,
      },
      { nome: "valor", rotulo: "Valor", tipo: "dinheiro", obrigatorio: true },
      {
        nome: "taxa",
        rotulo: "Participacao mensal",
        tipo: "numero",
        obrigatorio: true,
        ajuda:
          "Em decimal: 0.026 = 2,6% ao mes. Passa a valer para o capital inteiro a partir desta data; repita a vigente quando nao houver troca.",
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
        ajuda: 'Aparece no cartao do historico. Ex.: "Aporte adicional".',
      },
      {
        nome: "documento",
        rotulo: "Instrumento assinado",
        tipo: "arquivo",
        bucket: BUCKETS.contratos,
        aceita: "application/pdf",
      },
      { nome: "prazo_meses", rotulo: "Prazo (meses)", tipo: "numero" },
      { nome: "observacao", rotulo: "Observacao", tipo: "texto" },
    ],
  },
  {
    // O historico de creditos ate a data de corte. O portal mostra estes
    // valores como estao, sem recalcular — é aqui que se corrige um credito que
    // saiu diferente da formula.
    slug: "recebimentos",
    rotulo: "Recebimentos",
    tabela: "recebimentos",
    rotuloRef: "data",
    colunas: ["usuario_id", "empreendimento_id", "data", "valor", "observacao"],
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
        ajuda:
          "Em branco = credito geral: entra no consolidado, mas nao aparece quando o investidor filtra por um empreendimento.",
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
        ajuda: "Por que fugiu da formula, quando for o caso.",
      },
    ],
  },
  {
    // O que aparece na caixa do sino, no portal.
    slug: "notificacoes",
    rotulo: "Notificacoes",
    tabela: "notificacoes",
    rotuloRef: "titulo",
    colunas: ["titulo", "usuario_id", "criado_em"],
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
  {
    slug: "videos",
    rotulo: "Videos",
    tabela: "videos",
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
        rotulo: "Video",
        tipo: "arquivo",
        bucket: BUCKETS.videos,
        aceita: "video/*",
        obrigatorio: true,
        ajuda:
          "Bucket publico: quem tiver o link assiste. Para video fechado, use outro bucket.",
      },
    ],
  },
  {
    slug: "push-inscricoes",
    rotulo: "Inscricoes de push",
    tabela: "push_inscricoes",
    rotuloRef: "endpoint",
    colunas: ["usuario_id", "endpoint", "criado_em"],
    campos: [
      {
        nome: "usuario_id",
        rotulo: "Usuario",
        tipo: "referencia",
        aponta: "usuarios",
        obrigatorio: true,
      },
      { nome: "endpoint", rotulo: "Endpoint", tipo: "texto", obrigatorio: true },
      { nome: "p256dh", rotulo: "Chave p256dh", tipo: "texto", obrigatorio: true },
      { nome: "auth", rotulo: "Chave auth", tipo: "texto", obrigatorio: true },
    ],
  },
];

export function acharTabela(slug: string): Tabela | undefined {
  return TABELAS.find((t) => t.slug === slug);
}
