/**
 * Cria os usuarios iniciais. Idempotente: rodar de novo nao duplica ninguem.
 *
 *   node db/seed.mjs
 *   node db/seed.mjs admin@empresa.com.br  (define o e-mail do administrador)
 *
 * A senha do administrador é sorteada e impressa uma unica vez — o banco guarda
 * so o hash, entao nao ha como recupera-la depois.
 */
import { readFileSync } from "node:fs";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const derivar = promisify(scrypt);

// Mesmo formato de `lib/auth.ts`: scrypt$sal$hash, ambos em hex.
async function gerarHash(senha) {
  const sal = randomBytes(16);
  const hash = await derivar(senha, sal, 64);
  return `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;
}

const bruto =
  readFileSync(new URL("../.env", import.meta.url), "utf8").match(
    /^DATABASE_URL\s*=\s*(.+)$/m,
  )?.[1].trim() ?? "";
const url = bruto.replace(/^['"]|['"]$/g, "");
if (!url) throw new Error("DATABASE_URL ausente no .env");

const emailAdmin = process.argv[2] ?? "admin@meuari.com.br";
const senhaAdmin = randomBytes(9).toString("base64url");

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();

// `on conflict` no indice de e-mail sem caixa — o mesmo que garante a
// unicidade. Sem ele, rodar duas vezes estouraria a restricao.
const admin = await cliente.query(
  `insert into usuarios (nome, email, tipo, senha_hash)
   values ($1, $2, 'administrador', $3)
   on conflict ((lower(email))) do nothing
   returning id`,
  ["Administrador", emailAdmin, await gerarHash(senhaAdmin)],
);

const douglas = await cliente.query(
  `insert into usuarios (nome, email, tipo)
   values ('Douglas', $1, 'investidor')
   on conflict ((lower(email))) do nothing
   returning id`,
  ["douglas@exemplo.com"],
);

console.log("");
if (admin.rowCount) {
  console.log("Administrador criado.");
  console.log("  e-mail:", emailAdmin);
  console.log("  senha :", senhaAdmin, " <- anote agora, nao volta a aparecer");
} else {
  console.log(`Administrador ${emailAdmin} ja existia — nada alterado.`);
}

console.log(
  douglas.rowCount
    ? "Investidor Douglas criado (douglas@exemplo.com), sem contrato."
    : "Investidor Douglas ja existia — nada alterado.",
);
console.log("");

await cliente.end();
