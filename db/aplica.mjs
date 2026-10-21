/**
 * Roda um arquivo .sql no banco. Nao ha psql nesta maquina.
 *
 *   node db/aplica.mjs db/recebimentos.sql           no banco de desenvolvimento
 *   node db/aplica.mjs db/recebimentos.sql --prod    em producao
 *
 * O banco vem de `db/env.mjs`: desenvolvimento por padrao, producao so com
 * `--prod`. A primeira linha impressa diz em qual dos dois o arquivo entrou.
 *
 * O arquivo inteiro vai numa chamada só; como os schemas abrem com BEGIN e
 * fecham com COMMIT, um erro no meio nao deixa a tabela pela metade.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { anunciar, argumentos, banco } from "./env.mjs";

const [arquivo] = argumentos();
if (!arquivo) {
  console.error("uso: node db/aplica.mjs <arquivo.sql> [--prod]");
  process.exit(1);
}

const b = banco();
anunciar(b);

const cliente = new pg.Client({ connectionString: b.url });
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
