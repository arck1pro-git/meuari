import "server-only";
import { gerarHash } from "../auth";
import { consultar } from "../db";
import { acharTabela, type Campo, type Tabela } from "./tabelas";

export type Linha = Record<string, unknown>;

/** O SQLSTATE de "ja existe uma linha com estes valores". */
export const DUPLICADO = "23505";

/**
 * O que cada restricao de unicidade quer dizer, em portugues.
 *
 * A chave é o nome da restricao no banco — o Postgres o devolve em
 * `erro.constraint`. Ele é preciso: diz exatamente qual regra foi violada, o
 * que uma mensagem generica nao daria. "Ja existe um registro" nao ajuda quem
 * esta olhando um formulario de dez campos.
 *
 * Mora aqui, e nao na acao nem na tela, porque as duas precisam: a acao para
 * decidir se o erro é tratavel, a tela para escrever a frase. Duas copias
 * divergiriam no dia em que uma restricao nova aparecesse.
 *
 * Restricao que nao estiver aqui cai no texto generico — melhor uma frase vaga
 * do que uma tela de erro 500.
 */
const JA_EXISTE: Record<string, string> = {
  recebimentos_contrato_data_key:
    "Já existe um crédito lançado para este contrato nesta data. Para corrigir o valor, edite o crédito que já existe em vez de criar outro.",
  usuarios_email_unico:
    "Já existe uma conta com este e-mail. O e-mail identifica a pessoa no login, então ele não se repete.",
  push_inscricoes_endpoint_key:
    "Este aparelho já está inscrito para receber avisos.",
};

/** `true` quando o erro é uma violacao de unicidade — a que a tela sabe explicar. */
export function ehDuplicado(erro: unknown): boolean {
  return (erro as { code?: string }).code === DUPLICADO;
}

/** O nome da restricao violada, para viajar na URL ate a tela. */
export function restricaoDe(erro: unknown): string {
  return (erro as { constraint?: string }).constraint ?? "";
}

/** A frase que a tela mostra. Restricao desconhecida cai no generico. */
export function textoDeDuplicado(restricao?: string): string {
  return (
    (restricao && JA_EXISTE[restricao]) ||
    "Já existe um registro com estes dados. Confira os campos que não podem se repetir."
  );
}

/*
 * Identificadores vao para o texto do SQL entre aspas duplas. Como todos saem
 * do registro de tabelas — nunca da URL ou do formulario —, nao ha entrada do
 * usuario nesse caminho. Esta funcao é a ultima trava: se algum dia um nome
 * chegar de fora, ela interrompe em vez de montar a consulta.
 */
function ident(nome: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(nome)) {
    throw new Error(`Identificador recusado: ${nome}`);
  }
  return `"${nome}"`;
}

/** Coluna real de um campo: a senha do formulario grava em `senha_hash`. */
function coluna(campo: Campo): string {
  return campo.tipo === "senha" ? "senha_hash" : campo.nome;
}

/**
 * As colunas que a tela usa — `id`, as da listagem e as dos campos do
 * formulario. Nada mais.
 *
 * Era `select *`, e o `*` de `usuarios` inclui `senha_hash`. Nada vazava: o
 * formulario é Server Component e `valorInicial` procura `linha["senha"]`, que
 * nao existe (a coluna se chama `senha_hash`). Mas o hash viajava do banco para
 * a arvore de render sem que ninguem o pedisse, e bastava um dia alguem passar a
 * linha inteira para um componente de cliente. O que nao sai do banco nao vaza.
 *
 * `senha_hash` é o unico campo excluido de proposito: ele nao tem uso em tela
 * nenhuma — a senha em branco significa "manter a atual", e o hash nao tem
 * volta.
 */
function colunasVisiveis(t: Tabela): string {
  const nomes = new Set<string>(["id"]);
  for (const c of t.colunas) nomes.add(c);
  for (const campo of t.campos) {
    if (campo.tipo === "senha") continue;
    nomes.add(coluna(campo));
  }

  return [...nomes]
    .map((nome) => {
      /*
       * Coluna calculada (`colunasSql`) entra como expressao apelidada; o resto
       * passa por `ident()`. Os dois saem do registro — nunca de requisicao —, e
       * é isso que torna a interpolacao segura. O apelido continua passando por
       * `ident()` mesmo assim: o nome vira chave do objeto que a tela le, e um
       * apelido torto quebraria a listagem em silencio.
       */
      const expressao = t.colunasSql?.[nome];
      return expressao ? `${expressao} as ${ident(nome)}` : ident(nome);
    })
    .join(", ");
}

export async function listar(
  t: Tabela,
  filtro?: { campo: string; valor: string },
): Promise<Linha[]> {
  /*
   * O nome da coluna é conferido contra o registro antes de entrar na consulta.
   * Coluna nao pode ser `$1` — ela faz parte do texto do SQL —, entao a defesa
   * é so essa: o que nao esta declarado como filtro nao filtra nada.
   */
  const permitido = filtro && t.filtros?.includes(filtro.campo);
  // `criado_em` no `order by` sem estar no `select`: o Postgres aceita, e nao ha
  // tabela que mostre essa coluna em todas as telas.
  if (!permitido) {
    return consultar(
      `select ${colunasVisiveis(t)} from ${ident(t.tabela)}
        order by criado_em desc limit 200`,
    );
  }

  return consultar(
    `select ${colunasVisiveis(t)} from ${ident(t.tabela)}
      where ${ident(filtro.campo)} = $1
      order by criado_em desc limit 200`,
    [filtro.valor],
  );
}

export async function obter(t: Tabela, id: string): Promise<Linha | undefined> {
  const [linha] = await consultar(
    `select ${colunasVisiveis(t)} from ${ident(t.tabela)} where id = $1`,
    [id],
  );
  return linha;
}

/** Opcoes de um campo `referencia`, para montar o `<select>`. */
export async function opcoesDeReferencia(
  campo: Campo,
): Promise<{ id: string; rotulo: string }[]> {
  const alvo = campo.aponta ? acharTabela(campo.aponta) : undefined;
  if (!alvo) return [];

  /*
   * `rotuloSql` entra literal no texto da consulta. Ele vem do registro, como
   * os nomes de tabela e de coluna, e nunca de requisicao — é a mesma regra que
   * torna esta montagem segura.
   */
  const legenda = alvo.rotuloSql ?? `${ident(alvo.rotuloRef)}::text`;

  const linhas = await consultar<{ id: string; rotulo: string }>(
    `select id, ${legenda} as rotulo
       from ${ident(alvo.tabela)} order by rotulo limit 500`,
  );
  return linhas;
}

/**
 * Converte o que veio do formulario no valor que vai ao banco.
 * Devolve `undefined` quando o campo deve ser ignorado — o caso da senha em
 * branco, que significa "manter a atual", e nao "apagar".
 */
/**
 * Numero digitado por gente, em portugues.
 *
 * Aceita o que a tela devolve depois de formatar (`1.234,56`, `2,6%`) e tambem o
 * que alguem digita cru (`1234.56`, `3`). A regra dos separadores:
 *
 * - **Virgula presente** manda: ela é o decimal, e todo ponto é milhar.
 *   `1.234,56` -> 1234.56.
 * - **Só ponto**: é o decimal, como em qualquer teclado. `1234.56` -> 1234.56.
 *
 * O caso ambiguo de verdade — `1.234`, que pode ser mil e duzentos ou um e
 * pouco — cai na segunda regra e vira 1.234. É a leitura certa para quem digita
 * direto, e quem usa a tela nunca chega aqui com esse texto: o campo formata no
 * blur e manda a virgula junto.
 *
 * `%`, `R$` e espaco saem antes de tudo — inclusive o espaco fino que o
 * `Intl.NumberFormat` usa como separador de milhar em alguns ambientes, que nao
 * é o espaco comum e passa batido por um `trim()`.
 */
function numeroDeTexto(texto: string): number {
  const limpo = texto
    .replace(/[R$%\s  ]/gi, "")
    .replace(/^\+/, "");

  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

/** Corta as casas decimais que o banco nao guarda, sem deixar lixo binario. */
function arredondar(valor: number, casas: number): number {
  return Number(valor.toFixed(casas));
}

async function valorDoCampo(
  campo: Campo,
  bruto: FormDataEntryValue | null,
): Promise<unknown | undefined> {
  const texto = typeof bruto === "string" ? bruto.trim() : "";

  if (campo.tipo === "senha") {
    return texto === "" ? undefined : await gerarHash(texto);
  }

  // Campo vazio vira NULL, e nao string vazia: assim `date` e `numeric`
  // aceitam, e a diferenca entre "sem valor" e "vazio" nao se perde.
  if (texto === "") return null;

  /*
   * A divisao por 100 mora **aqui**, e nao no componente que formata.
   *
   * O campo chega em por cento — é assim que se fala de participacao — e o
   * banco guarda decimal. Se a conversao vivesse no navegador, um envio sem
   * JavaScript (ou um `curl`) gravaria 3 no lugar de 0,03: trezentos por cento
   * ao mes. Com ela no servidor, a tela é só apresentacao.
   */
  if (campo.tipo === "percentual") {
    const n = numeroDeTexto(texto);
    if (Number.isNaN(n)) throw new Error(`${campo.rotulo}: numero invalido`);
    if (n < 0) throw new Error(`${campo.rotulo}: nao pode ser negativo`);
    // `taxa` é `numeric(6,5)`: cinco casas no decimal, que sao tres no
    // percentual. Arredondar aqui evita o `0.026000000000000002` que a divisao
    // binaria produz e que o banco recusaria por escala.
    return arredondar(n / 100, 5);
  }

  if (campo.tipo === "numero" || campo.tipo === "dinheiro") {
    const n = numeroDeTexto(texto);
    if (Number.isNaN(n)) throw new Error(`${campo.rotulo}: numero invalido`);
    // Dinheiro é `numeric(14,2)`; `numero` pode ser inteiro (prazo, ordem) ou
    // ter casas (percentual de etapa), e ai nao se arredonda nada.
    return campo.tipo === "dinheiro" ? arredondar(n, 2) : n;
  }

  return texto;
}

async function paresDoFormulario(t: Tabela, dados: FormData) {
  const colunas: string[] = [];
  const valores: unknown[] = [];

  for (const campo of t.campos) {
    const valor = await valorDoCampo(campo, dados.get(campo.nome));
    if (valor === undefined) continue;

    if (campo.obrigatorio && (valor === null || valor === "")) {
      throw new Error(`${campo.rotulo} é obrigatorio`);
    }
    colunas.push(coluna(campo));
    valores.push(valor);
  }

  return { colunas, valores };
}

/** Devolve o id e as colunas gravadas — é o que a auditoria registra. */
export async function criar(
  t: Tabela,
  dados: FormData,
): Promise<{ id: string; colunas: string[] }> {
  const { colunas, valores } = await paresDoFormulario(t, dados);
  if (colunas.length === 0) throw new Error("Nada para gravar");

  /*
   * `$1, $2, …` — os marcadores de parametro. Sem o cifrao isto vira
   * `values (1, 2, 3)`, numeros literais, e o Postgres recusa com "column
   * usuario_id is of type uuid but expression is of type integer". Era o que
   * quebrava toda criacao pelo painel; o `update` logo abaixo sempre teve o
   * seu, e por isso editar funcionava e criar nao.
   */
  const marcadores = valores.map((_, i) => `$${i + 1}`).join(", ");
  const [linha] = await consultar<{ id: string }>(
    `insert into ${ident(t.tabela)} (${colunas.map(ident).join(", ")})
     values (${marcadores})
     returning id`,
    valores,
  );

  return { id: String(linha?.id ?? ""), colunas };
}

export async function atualizar(
  t: Tabela,
  id: string,
  dados: FormData,
): Promise<void> {
  const { colunas, valores } = await paresDoFormulario(t, dados);
  if (colunas.length === 0) return;

  const atribuicoes = colunas
    .map((c, i) => `${ident(c)} = $${i + 1}`)
    .join(", ");
  await consultar(
    `update ${ident(t.tabela)} set ${atribuicoes} where id = $${valores.length + 1}`,
    [...valores, id],
  );
}

export async function excluir(t: Tabela, id: string): Promise<void> {
  await consultar(`delete from ${ident(t.tabela)} where id = $1`, [id]);
}

/** As colunas que um formulario alteraria — sem os valores. Para a auditoria. */
export async function camposAlterados(
  t: Tabela,
  dados: FormData,
): Promise<string[]> {
  const { colunas } = await paresDoFormulario(t, dados);
  return colunas;
}
