import "server-only";
import { gerarHash } from "../auth";
import { consultar } from "../db";
import { acharTabela, type Campo, type Tabela } from "./tabelas";

export type Linha = Record<string, unknown>;

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
  if (!permitido) {
    return consultar(
      `select * from ${ident(t.tabela)} order by criado_em desc limit 200`,
    );
  }

  return consultar(
    `select * from ${ident(t.tabela)}
      where ${ident(filtro.campo)} = $1
      order by criado_em desc limit 200`,
    [filtro.valor],
  );
}

export async function obter(t: Tabela, id: string): Promise<Linha | undefined> {
  const [linha] = await consultar(
    `select * from ${ident(t.tabela)} where id = $1`,
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

  const linhas = await consultar<{ id: string; rotulo: string }>(
    `select id, ${ident(alvo.rotuloRef)}::text as rotulo
       from ${ident(alvo.tabela)} order by rotulo limit 500`,
  );
  return linhas;
}

/**
 * Converte o que veio do formulario no valor que vai ao banco.
 * Devolve `undefined` quando o campo deve ser ignorado — o caso da senha em
 * branco, que significa "manter a atual", e nao "apagar".
 */
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

  if (campo.tipo === "numero" || campo.tipo === "dinheiro") {
    const n = Number(texto.replace(",", "."));
    if (Number.isNaN(n)) throw new Error(`${campo.rotulo}: numero invalido`);
    return n;
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

  const marcadores = valores.map((_, i) => `${i + 1}`).join(", ");
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
