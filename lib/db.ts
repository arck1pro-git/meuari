import "server-only";
import { Pool } from "pg";

/*
 * Um pool por processo. Em desenvolvimento o Next recarrega os modulos a cada
 * alteracao, e sem guardar a instancia no `globalThis` cada recarga abriria um
 * pool novo ate estourar o limite de conexoes do banco.
 */
const global_ = globalThis as typeof globalThis & { poolPg?: Pool };

export const db =
  global_.poolPg ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // O banco fica atras de um pooler; poucas conexoes por processo bastam.
    max: 5,
  });

if (process.env.NODE_ENV !== "production") global_.poolPg = db;

/** Consulta parametrizada. Valores sempre por `$1`, nunca interpolados. */
export async function consultar<T extends object = Record<string, unknown>>(
  sql: string,
  valores: unknown[] = [],
): Promise<T[]> {
  const { rows } = await db.query(sql, valores);
  return rows as T[];
}
