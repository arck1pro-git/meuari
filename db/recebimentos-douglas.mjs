/**
 * Lanca o historico de creditos do Douglas ate a data de corte.
 *
 *   node db/recebimentos-douglas.mjs
 *   node db/recebimentos-douglas.mjs --refaz   (sobrescreve os valores)
 *
 * Os valores abaixo sao os que a formula produz — servem de ponto de partida.
 * Os que sairam diferentes na vida real devem ser corrigidos em /admin ->
 * Recebimentos, e o portal passa a mostrar o valor corrigido sem recalcular.
 *
 * De julho de 2026 em diante o portal calcula sozinho; nao lance nada dali para
 * a frente ou o credito aparecera duas vezes.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const EMAIL = "douglas@exemplo.com";

const CREDITOS = [
  { data: "2025-09-17", valor: 665.0 },
  { data: "2025-10-17", valor: 2850.0 },
  { data: "2025-11-17", valor: 2850.0 },
  { data: "2025-12-17", valor: 2850.0 },
  { data: "2026-01-17", valor: 2850.0 },
  { data: "2026-02-17", valor: 4648.33 },
  { data: "2026-03-17", valor: 5750.0 },
  { data: "2026-04-17", valor: 5750.0 },
  { data: "2026-05-17", valor: 5922.5 },
  { data: "2026-06-17", valor: 7316.67 },
];

function lerEnv() {
  const env = {};
  for (const linha of readFileSync(
    new URL("../.env", import.meta.url),
    "utf8",
  ).split(/\r?\n/)) {
    const corte = linha.indexOf("=");
    if (corte < 1 || linha.trimStart().startsWith("#")) continue;
    let valor = linha.slice(corte + 1).trim();
    if (/^['"]/.test(valor)) valor = valor.slice(1, -1);
    env[linha.slice(0, corte).trim()] = valor;
  }
  return env;
}

const refaz = process.argv.includes("--refaz");
const cliente = new pg.Client({ connectionString: lerEnv().DATABASE_URL });
await cliente.connect();

const {
  rows: [investidor],
} = await cliente.query("select id, nome from usuarios where lower(email) = $1", [
  EMAIL,
]);
if (!investidor) throw new Error(`Usuario ${EMAIL} nao existe — rode db/seed.mjs`);

let lancados = 0;
for (const credito of CREDITOS) {
  const { rowCount } = await cliente.query(
    `insert into recebimentos (usuario_id, data, valor)
     values ($1, $2, $3)
     on conflict (usuario_id, data) do ${
       // Sem --refaz, uma linha ja corrigida a mao nao pode ser sobrescrita.
       refaz ? "update set valor = excluded.valor" : "nothing"
     }`,
    [investidor.id, credito.data, credito.valor],
  );
  lancados += rowCount;
}

const {
  rows: [resumo],
} = await cliente.query(
  `select count(*)::int as linhas, coalesce(sum(valor), 0)::float8 as total
     from recebimentos where usuario_id = $1`,
  [investidor.id],
);

console.log(
  `\n${lancados} de ${CREDITOS.length} linhas gravadas para ${investidor.nome}.`,
);
console.log(
  `Historico atual: ${resumo.linhas} creditos, ${resumo.total.toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" },
  )}.`,
);
console.log("Corrija os que sairam diferentes em /admin -> Recebimentos.\n");

await cliente.end();
