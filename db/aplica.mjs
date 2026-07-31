/**
 * Roda um arquivo .sql no banco do .env. Nao ha psql nesta maquina.
 *
 *   node db/aplica.mjs db/recebimentos.sql
 *
 * O arquivo inteiro vai numa chamada só; como os schemas abrem com BEGIN e
 * fecham com COMMIT, um erro no meio nao deixa a tabela pela metade.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("uso: node db/aplica.mjs <arquivo.sql>");
  process.exit(1);
}

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

const cliente = new pg.Client({ connectionString: lerEnv().DATABASE_URL });
await cliente.connect();

try {
  await cliente.query(readFileSync(arquivo, "utf8"));
  console.log(`${arquivo} aplicado.`);
} catch (erro) {
  // Só a mensagem: o objeto do `pg` traz a string de conexao junto.
  console.error(`Falhou: ${erro.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
