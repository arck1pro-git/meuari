/**
 * Define a senha de um usuario.
 *
 *   node db/senha.mjs douglas@exemplo.com teste          no banco de desenvolvimento
 *   node db/senha.mjs douglas@exemplo.com teste --prod   em producao
 *
 * O banco vem de `db/env.mjs`: desenvolvimento por padrao, producao so com
 * `--prod`. A primeira linha impressa diz em qual dos dois a senha mudou.
 *
 * O banco guarda so o hash (`scrypt$sal$hash`, o mesmo formato de `lib/auth.ts`),
 * entao a senha em claro nao fica em lugar nenhum depois daqui — nem no proprio
 * banco. Para trocar, rode de novo.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";
import { anunciar, argumentos, banco } from "./env.mjs";

const scrypt = promisify(scryptCb);

const [email, senha] = argumentos();
if (!email || !senha) {
  console.error("uso: node db/senha.mjs <email> <senha> [--prod]");
  process.exit(1);
}

const b = banco();
anunciar(b);

const sal = randomBytes(16);
const hash = await scrypt(senha, sal, 64);
const guardado = `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;

const cliente = new pg.Client({ connectionString: b.url });
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
