/**
 * Em que banco um script de `db/` mexe.
 *
 * Sao dois: o de **producao**, cuja URL vive em `.env` — a mesma da Vercel —,
 * e o de **desenvolvimento**, em `.env.development.local`, que o `next dev`
 * tambem le e que fica fora do git como todo `.env*`.
 *
 * **O padrao é desenvolvimento.** Os scripts daqui escrevem — criam tabela,
 * inserem usuario, trocam senha —, e durante meses todos leram só o `.env`, ou
 * seja, cada teste local era uma escrita em producao. Agora acertar producao é
 * pedido explicito: `--prod` na linha de comando, ou `BANCO=prod` no ambiente.
 *
 * A ordem dos arquivos é a do proprio Next (secao "Environment Variable Load
 * Order" em node_modules/next/dist/docs/01-app/02-guides/environment-variables.md):
 * o script enxerga o mesmo banco que o `next dev` enxerga nesta pasta — e, com
 * `--prod`, o mesmo que o `next start` enxergaria. `process.env` vem antes de
 * todos os arquivos, tambem como no Next.
 */
import { existsSync, readFileSync } from "node:fs";

const RAIZ = new URL("../", import.meta.url);

const ORDEM = {
  dev: [".env.development.local", ".env.local", ".env.development", ".env"],
  prod: [".env.production.local", ".env.local", ".env.production", ".env"],
};

function lerArquivo(nome) {
  const caminho = new URL(nome, RAIZ);
  if (!existsSync(caminho)) return {};

  const env = {};
  for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
    const corte = linha.indexOf("=");
    if (corte < 1 || linha.trimStart().startsWith("#")) continue;
    let valor = linha.slice(corte + 1).trim();
    if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
    env[linha.slice(0, corte).trim()] = valor;
  }
  return env;
}

/** `prod` quando pedido por `--prod` ou `BANCO=prod`; senao `dev`. */
export function alvo(argv = process.argv) {
  return argv.includes("--prod") || process.env.BANCO === "prod"
    ? "prod"
    : "dev";
}

/** Os argumentos que nao sao opcao (`--algo`). */
export function argumentos(argv = process.argv) {
  return argv.slice(2).filter((a) => !a.startsWith("--"));
}

/**
 * As variaveis do alvo, mescladas na ordem do Next: a primeira ocorrencia
 * vence, e cada uma lembra de que arquivo veio.
 */
export function variaveis(qual = alvo()) {
  const resultado = {};
  for (const nome of ORDEM[qual]) {
    for (const [chave, valor] of Object.entries(lerArquivo(nome))) {
      if (!(chave in resultado)) resultado[chave] = { valor, origem: nome };
    }
  }
  return resultado;
}

/**
 * So o host da URL — para dizer na tela em que banco se esta. Nunca a URL
 * inteira: ela carrega a senha.
 */
export function hostDe(url) {
  try {
    return new URL(url).host;
  } catch {
    return "?";
  }
}

/** A URL do banco do alvo e de onde ela veio. Lanca quando nao ha nenhuma. */
export function banco(qual = alvo()) {
  const url = process.env.DATABASE_URL
    ? { valor: process.env.DATABASE_URL, origem: "process.env" }
    : variaveis(qual).DATABASE_URL;

  if (!url) {
    throw new Error(
      `DATABASE_URL nao encontrada para ${qual} (procurei em ${ORDEM[qual].join(", ")}).`,
    );
  }

  return { alvo: qual, url: url.valor, origem: url.origem, host: hostDe(url.valor) };
}

/** A primeira linha de todo script: em que banco ele vai mexer. */
export function anunciar(b) {
  console.log(
    `Banco de ${b.alvo === "prod" ? "PRODUCAO" : "desenvolvimento"}: ${b.host} (DATABASE_URL de ${b.origem})`,
  );
}
