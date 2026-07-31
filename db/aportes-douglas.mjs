/**
 * Lanca os aportes do Douglas em `contratos`.
 *
 *   node db/aportes-douglas.mjs          confere e lanca
 *   node db/aportes-douglas.mjs --refaz  apaga os anteriores e lanca de novo
 *
 * Uma linha de `contratos` é um aporte com o contrato que o formaliza. A data do
 * aporte vai na coluna `data`, e nao mais em `criado_em`.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const EMPREENDIMENTO = "ARI";
const EMAIL = "douglas@exemplo.com";

/**
 * `taxa` é a participacao que passa a valer para o capital inteiro a partir
 * daquela data — as linhas sem troca repetem a vigente.
 */
const APORTES = [
  { data: "2025-09-10", valor: 150000, taxa: 0.019, tipo: "Aporte inicial" },
  { data: "2026-01-28", valor: 50000, taxa: 0.023, tipo: "Aporte adicional" },
  { data: "2026-01-29", valor: 50000, taxa: 0.023, tipo: "Aporte adicional" },
  { data: "2026-05-08", valor: 25000, taxa: 0.023, tipo: "Aporte adicional" },
  { data: "2026-05-22", valor: 10000, taxa: 0.023, tipo: "Aporte adicional" },
  { data: "2026-05-26", valor: 5000, taxa: 0.023, tipo: "Aporte adicional" },
  { data: "2026-05-27", valor: 5000, taxa: 0.023, tipo: "Aporte adicional" },
  { data: "2026-05-28", valor: 5000, taxa: 0.026, tipo: "Aporte adicional" },
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

let {
  rows: [empreendimento],
} = await cliente.query("select id from empreendimentos where nome = $1", [
  EMPREENDIMENTO,
]);
if (!empreendimento) {
  ({
    rows: [empreendimento],
  } = await cliente.query(
    "insert into empreendimentos (nome) values ($1) returning id",
    [EMPREENDIMENTO],
  ));
  console.log(`Empreendimento "${EMPREENDIMENTO}" criado.`);
}

const {
  rows: [{ total }],
} = await cliente.query(
  "select count(*)::int as total from contratos where usuario_id = $1",
  [investidor.id],
);

if (total > 0 && !refaz) {
  console.log(
    `${investidor.nome} ja tem ${total} lancamento(s). Nada alterado — use --refaz para substituir.`,
  );
  await cliente.end();
  process.exit(0);
}

if (total > 0) {
  await cliente.query("delete from contratos where usuario_id = $1", [
    investidor.id,
  ]);
  console.log(`${total} lancamento(s) anterior(es) apagado(s).`);
}

for (const aporte of APORTES) {
  await cliente.query(
    `insert into contratos
       (usuario_id, empreendimento_id, data, valor, taxa, modalidade, tipo)
     values ($1, $2, $3, $4, $5, 'mensal', $6)`,
    [
      investidor.id,
      empreendimento.id,
      aporte.data,
      aporte.valor,
      aporte.taxa,
      aporte.tipo,
    ],
  );
}

const capital = APORTES.reduce((soma, a) => soma + a.valor, 0);
console.log(
  `\n${APORTES.length} aportes lancados para ${investidor.nome} — capital de ${capital.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
);

await cliente.end();
