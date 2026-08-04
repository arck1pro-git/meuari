/**
 * Manda um aviso de teste para as inscricoes guardadas.
 *
 *   node --experimental-strip-types db/push-teste.ts
 *   node --experimental-strip-types db/push-teste.ts "Outro titulo"
 *
 * Le o `.env` na mao — este script roda fora do Next, que é quem normalmente
 * carrega o ambiente.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { enviarPush, type Inscricao } from "../lib/push.ts";

for (const linha of readFileSync(new URL("../.env", import.meta.url), "utf8").split(
  /\r?\n/,
)) {
  const corte = linha.indexOf("=");
  if (corte < 1 || linha.trimStart().startsWith("#")) continue;
  let valor = linha.slice(corte + 1).trim();
  if (/^["']/.test(valor)) valor = valor.slice(1, -1);
  process.env[linha.slice(0, corte).trim()] ??= valor;
}

const titulo = process.argv[2] ?? "teste";

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
await cliente.connect();

const { rows } = await cliente.query<Inscricao & { nome: string }>(
  `select u.nome, p.endpoint, p.p256dh, p.auth
     from push_inscricoes p
     join usuarios u on u.id = p.usuario_id
    order by p.criado_em`,
);

console.log(`inscricoes: ${rows.length}`);

for (const inscricao of rows) {
  const servico = new URL(inscricao.endpoint).host;
  const resultado = await enviarPush(inscricao, {
    titulo,
    corpo: "Se você está lendo isto, os avisos estão funcionando.",
    url: "/portal",
  });

  if (resultado.ok) {
    console.log(`  ok      ${inscricao.nome} (${servico})`);
    continue;
  }

  console.log(
    `  falhou  ${inscricao.nome} (${servico}) — HTTP ${resultado.status}${
      resultado.expirada ? ", inscricao expirada" : ""
    }: ${resultado.detalhe}`,
  );
}

await cliente.end();
