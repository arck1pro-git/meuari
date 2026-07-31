/**
 * Define a senha de um usuario.
 *
 *   node db/senha.mjs douglas@exemplo.com teste
 *
 * O banco guarda so o hash (`scrypt$sal$hash`, o mesmo formato de `lib/auth.ts`),
 * entao a senha em claro nao fica em lugar nenhum depois daqui — nem no proprio
 * banco. Para trocar, rode de novo.
 */
import { readFileSync } from "node:fs";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(scryptCb);

const [email, senha] = process.argv.slice(2);
if (!email || !senha) {
  console.error("uso: node db/senha.mjs <email> <senha>");
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

const sal = randomBytes(16);
const hash = await scrypt(senha, sal, 64);
const guardado = `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;

const cliente = new pg.Client({ connectionString: lerEnv().DATABASE_URL });
await cliente.connect();

const { rows } = await cliente.query(
  `update usuarios set senha_hash = $1
    where lower(email) = lower($2)
    returning nome, tipo, senha_hash`,
  [guardado, email],
);

if (rows.length === 0) {
  console.error(`Nenhum usuario com e-mail ${email}.`);
  await cliente.end();
  process.exit(1);
}

// Confere o que ficou gravado pelo mesmo caminho do login, em vez de confiar no
// `update`: deriva de novo a partir do sal salvo e compara em tempo constante.
const [, salSalvo, hashSalvo] = rows[0].senha_hash.split("$");
const esperado = Buffer.from(hashSalvo, "hex");
const obtido = await scrypt(senha, Buffer.from(salSalvo, "hex"), esperado.length);
const confere = timingSafeEqual(esperado, obtido);

console.log(
  `\nSenha definida para ${rows[0].nome} (${rows[0].tipo}, ${email}).`,
);
console.log(`Verificacao do hash gravado: ${confere ? "confere" : "FALHOU"}`);

await cliente.end();
process.exit(confere ? 0 : 1);
