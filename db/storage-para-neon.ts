/**
 * Copia os arquivos do Supabase Storage para o bucket do Neon Object Storage.
 *
 *   node --experimental-strip-types db/storage-para-neon.ts --prod            confere, nao copia
 *   node --experimental-strip-types db/storage-para-neon.ts --prod --copiar   copia o que falta
 *   node --experimental-strip-types db/storage-para-neon.ts --prod --cors     so configura o CORS do bucket
 *
 * **So roda com `--prod`.** A origem é o Supabase, e o Supabase é um só — o de
 * producao. Rodado em dev, o script levaria contratos reais de investidor para
 * o bucket de desenvolvimento, e dado real nao entra em dev (ver `AGENTS.md`).
 *
 * **Os quatro buckets do Supabase viram pastas do bucket do Neon**, com o mesmo
 * caminho dentro: `docs/2026/abc.pdf` no Neon é o `2026/abc.pdf` do bucket
 * `docs`. É o que `lib/storage.ts` espera, e por isso o banco nao muda.
 *
 * **Nada é apagado no Supabase.** Os originais ficam como estao, e sao a volta:
 * sem `NEON_STORAGE_ENDPOINT`, o portal le de la de novo.
 *
 * **Rodar de novo é seguro, e é o plano.** O que ja esta no Neon com o mesmo
 * tamanho fica de fora; so sobe o que falta ou difere. Depois de ligar o Neon
 * em producao, uma segunda passada pega o que o painel tiver enviado ao
 * Supabase entre a primeira copia e a troca.
 *
 * **A conferencia final é pelo banco, e nao pela listagem.** Para cada coluna
 * que guarda arquivo, todo caminho referenciado precisa responder no Neon —
 * é isso que o investidor vai abrir. O que nao responde é listado no fim.
 *
 * O banco e as variaveis vem de `db/env.mjs`: desenvolvimento por padrao,
 * producao so com `--prod`. As credenciais do Neon sao as mesmas que o portal
 * usa (`NEON_STORAGE_*`, ver `lib/storage.ts`).
 */
import pg from "pg";
import { alvo, anunciar, banco, variaveis } from "./env.mjs";
import { presignar, type CredenciaisS3 } from "../lib/s3.ts";

const COPIAR = process.argv.includes("--copiar");
const CORS = process.argv.includes("--cors");
/** Quantos arquivos sobem ao mesmo tempo. */
const PARALELO = 4;

/** Os buckets do Supabase, na mesma ordem e com o mesmo nome de `BUCKETS`. */
const PASTAS = ["scp", "docs", "fotos-empreendimentos", "videos"] as const;

/** Cada coluna que guarda caminho de arquivo, e a pasta dela. */
const REFERENCIAS = [
  { tabela: "contratos", coluna: "documento", pasta: "scp" },
  { tabela: "aditivos", coluna: "documento", pasta: "scp" },
  { tabela: "documentos", coluna: "url", pasta: "docs" },
  { tabela: "etapas", coluna: "documento", pasta: "docs" },
  { tabela: "imagens", coluna: "url", pasta: "fotos-empreendimentos" },
  { tabela: "videos", coluna: "url", pasta: "videos" },
] as const;

// --- ambiente -----------------------------------------------------------------

const qual = alvo();
const arquivos = variaveis(qual) as Record<string, { valor: string; origem: string }>;
const ler = (nome: string) => process.env[nome] ?? arquivos[nome]?.valor;
const origemDe = (nome: string) =>
  process.env[nome] ? "process.env" : (arquivos[nome]?.origem ?? "?");

function exigir(nome: string): string {
  const valor = ler(nome);
  if (!valor) {
    console.error(`Falta ${nome} no ambiente de ${qual}.`);
    process.exit(1);
  }
  return valor;
}

const b = banco();
anunciar(b);

if (qual !== "prod") {
  console.error(
    "Este script so roda com --prod: a origem é o Supabase de producao, e o que ele copia sao arquivos reais de investidor.",
  );
  process.exit(1);
}

const neon: CredenciaisS3 = {
  endpoint: exigir("NEON_STORAGE_ENDPOINT").replace(/\/+$/, ""),
  regiao: ler("NEON_STORAGE_REGION") || "us-east-2",
  chave: exigir("NEON_STORAGE_ACCESS_KEY_ID"),
  segredo: exigir("NEON_STORAGE_SECRET_ACCESS_KEY"),
  bucket: ler("NEON_STORAGE_BUCKET") || "portal",
};

const supabase = exigir("SUPABASE_URL").replace(/\/+$/, "");
const chaveSupabase = exigir("SUPABASE_SECRET_KEY");
const authSupabase = {
  apikey: chaveSupabase,
  Authorization: `Bearer ${chaveSupabase}`,
};

console.log(`Origem:  Supabase ${new URL(supabase).host}`);
console.log(
  `Destino: Neon ${new URL(neon.endpoint).host}, bucket "${neon.bucket}" (NEON_STORAGE_ENDPOINT de ${origemDe("NEON_STORAGE_ENDPOINT")})`,
);
console.log(COPIAR ? "Modo: COPIAR\n" : "Modo: so conferir (use --copiar para copiar)\n");

// --- Neon ---------------------------------------------------------------------

/**
 * Tamanho do objeto no Neon, ou `null` quando ele nao esta la.
 *
 * Repete duas vezes em falha passageira (5xx, 429 ou rede caindo), com espera
 * crescente: uma conferencia de centenas de arquivos nao pode morrer por um
 * pedido que o Neon pediu para refazer.
 */
async function tamanhoNoNeon(chave: string): Promise<number | null> {
  for (let tentativa = 0; ; tentativa++) {
    let resposta: Response | null = null;
    try {
      resposta = await fetch(presignar(neon, { metodo: "HEAD", chave, segundos: 300 }), {
        method: "HEAD",
      });
    } catch (erro) {
      if (tentativa >= 2) throw erro;
    }
    if (resposta) {
      if (resposta.status === 404) return null;
      if (resposta.ok) return Number(resposta.headers.get("content-length"));
      const passageira = resposta.status >= 500 || resposta.status === 429;
      if (!passageira || tentativa >= 2) {
        throw new Error(`HEAD ${chave}: ${resposta.status}`);
      }
    }
    await new Promise((r) => setTimeout(r, 500 * (tentativa + 1)));
  }
}

async function conferirBucket() {
  const r = await fetch(presignar(neon, { metodo: "HEAD", segundos: 300 }), {
    method: "HEAD",
  });
  if (r.ok) return;
  console.error(
    r.status === 404
      ? `O bucket "${neon.bucket}" nao existe nesse branch do Neon. Crie no Console (Object storage > New bucket), privado.`
      : `O Neon recusou o acesso ao bucket "${neon.bucket}" (${r.status}). Confira a chave e o endpoint.`,
  );
  process.exit(1);
}

/**
 * CORS do bucket: o painel envia o arquivo direto do navegador, com `PUT`, e a
 * galeria baixa a foto com `fetch`, em `GET`. O `HEAD` fica de fora: so o
 * servidor o usa. Origem `*` porque o que autoriza é a
 * assinatura da URL, e nao a origem — CORS so decide se o navegador mostra a
 * resposta, e um `curl` com a mesma URL passaria de qualquer jeito.
 */
async function configurarCors() {
  const xml =
    `<CORSConfiguration><CORSRule>` +
    `<AllowedOrigin>*</AllowedOrigin>` +
    `<AllowedMethod>GET</AllowedMethod><AllowedMethod>PUT</AllowedMethod>` +
    `<AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader>` +
    `<MaxAgeSeconds>3600</MaxAgeSeconds>` +
    `</CORSRule></CORSConfiguration>`;
  const { createHash } = await import("node:crypto");
  const r = await fetch(
    presignar(neon, { metodo: "PUT", segundos: 300, consulta: { cors: "" } }),
    {
      method: "PUT",
      headers: {
        "content-type": "application/xml",
        "content-md5": createHash("md5").update(xml).digest("base64"),
      },
      body: xml,
    },
  );
  if (!r.ok) {
    console.error(`O Neon recusou o CORS: ${r.status} ${await r.text()}`);
    process.exit(1);
  }
  console.log("CORS do bucket configurado (GET e PUT de qualquer origem).");

  // O que vale é o navegador ver a permissao na resposta ao preflight.
  const teste = await fetch(
    presignar(neon, { metodo: "PUT", chave: "teste-cors", segundos: 60 }),
    {
      method: "OPTIONS",
      headers: {
        origin: "https://exemplo.com.br",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    },
  );
  const permite = teste.headers.get("access-control-allow-origin");
  if (!permite) {
    console.error(
      `Preflight de PUT SEM Access-Control-Allow-Origin (${teste.status}) — o envio pelo painel vai falhar no navegador.`,
    );
    process.exit(1);
  }
  console.log(`Preflight de PUT responde Access-Control-Allow-Origin: ${permite}.`);
}

// --- Supabase -----------------------------------------------------------------

type Objeto = { caminho: string; bytes: number; tipo: string | null };

/**
 * Tudo que esta no bucket do Supabase. O `list` nao desce em pasta sozinho —
 * devolve a pasta como item de `metadata` nulo —, entao a varredura é
 * recursiva, como em `db/fotos-orfas.mjs`.
 */
async function listar(bucket: string, prefixo = ""): Promise<Objeto[]> {
  const achados: Objeto[] = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${supabase}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...authSupabase, "content-type": "application/json" },
      body: JSON.stringify({ prefix: prefixo, limit: 1000, offset }),
    });
    const itens = await r.json();
    if (!Array.isArray(itens)) throw new Error(`${bucket}: ${JSON.stringify(itens)}`);

    for (const item of itens) {
      // O marcador que o painel do Supabase cria em pasta vazia nao é arquivo.
      if (item.name === ".emptyFolderPlaceholder") continue;
      const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
      if (item.metadata) {
        achados.push({
          caminho,
          bytes: Number(item.metadata.size ?? 0),
          tipo: item.metadata.mimetype ?? null,
        });
      } else {
        achados.push(...(await listar(bucket, caminho)));
      }
    }
    if (itens.length < 1000) break;
  }
  return achados;
}

async function copiar(pasta: string, o: Objeto) {
  const baixa = await fetch(
    `${supabase}/storage/v1/object/${pasta}/${o.caminho.split("/").map(encodeURIComponent).join("/")}`,
    { headers: authSupabase },
  );
  if (!baixa.ok) throw new Error(`baixar: ${baixa.status} ${await baixa.text()}`);
  const corpo = Buffer.from(await baixa.arrayBuffer());

  const chave = `${pasta}/${o.caminho}`;
  const sobe = await fetch(presignar(neon, { metodo: "PUT", chave, segundos: 900 }), {
    method: "PUT",
    headers: {
      "content-type":
        o.tipo || baixa.headers.get("content-type") || "application/octet-stream",
    },
    body: corpo,
  });
  if (!sobe.ok) throw new Error(`enviar: ${sobe.status} ${await sobe.text()}`);

  // Confere pelo que o Neon diz que guardou, e nao pela resposta do envio.
  const tamanho = await tamanhoNoNeon(chave);
  if (tamanho !== corpo.length) {
    throw new Error(`no Neon ficou com ${tamanho} bytes, esperado ${corpo.length}`);
  }
}

/** Roda `tarefa` sobre a lista, `PARALELO` por vez. */
async function emLotes<T>(lista: T[], tarefa: (item: T) => Promise<void>) {
  let proximo = 0;
  await Promise.all(
    Array.from({ length: Math.min(PARALELO, lista.length) }, async () => {
      while (proximo < lista.length) await tarefa(lista[proximo++]);
    }),
  );
}

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

// --- execucao -----------------------------------------------------------------

await conferirBucket();
// O `--cors` faz so isso: nao varre o Supabase nem le o banco.
if (CORS) {
  await configurarCors();
  process.exit(0);
}

/** O que o Neon tem, chave -> tamanho; preenchido na varredura e na copia. */
const noNeon = new Map<string, number | null>();
const falhas: string[] = [];

for (const pasta of PASTAS) {
  const objetos = await listar(pasta);
  // Em lotes, como a copia: um HEAD por objeto, todos de uma vez, abriria
  // centenas de conexoes, e o Neon limitaria.
  const situacao: { o: Objeto; tamanho: number | null }[] = [];
  await emLotes(objetos, async (o) => {
    const tamanho = await tamanhoNoNeon(`${pasta}/${o.caminho}`);
    noNeon.set(`${pasta}/${o.caminho}`, tamanho);
    situacao.push({ o, tamanho });
  });
  const faltam = situacao.filter((s) => s.tamanho !== s.o.bytes).map((s) => s.o);
  const total = objetos.reduce((soma, o) => soma + o.bytes, 0);

  console.log(
    `${pasta.padEnd(22)} ${String(objetos.length).padStart(4)} arquivos (${mb(total)}), ` +
      `${objetos.length - faltam.length} ja no Neon, ${faltam.length} a copiar (${mb(faltam.reduce((s, o) => s + o.bytes, 0))})`,
  );

  if (!COPIAR || faltam.length === 0) continue;

  let feitos = 0;
  await emLotes(faltam, async (o) => {
    try {
      await copiar(pasta, o);
      noNeon.set(`${pasta}/${o.caminho}`, o.bytes);
      feitos++;
    } catch (erro) {
      falhas.push(`${pasta}/${o.caminho}: ${(erro as Error).message}`);
    }
  });
  console.log(`${"".padEnd(22)} copiados ${feitos} de ${faltam.length}`);
}

if (falhas.length > 0) {
  console.log(`\n${falhas.length} falha(s) na copia:`);
  for (const f of falhas) console.log(`  ${f}`);
}

// --- conferencia pelo banco ---------------------------------------------------

const cliente = new pg.Client({ connectionString: b.url });
const ausentes: string[] = [];
let referenciados = 0;
try {
  await cliente.connect();
  for (const ref of REFERENCIAS) {
    // Nomes fixos, daqui de cima — nada vem de fora. O filtro é o mesmo de
    // `ehCaminhoDeBucket`: link externo e arquivo de `public/` nao sao do bucket.
    const { rows } = await cliente.query<{ caminho: string }>(
      `select distinct ${ref.coluna} as caminho from ${ref.tabela}
        where coalesce(${ref.coluna}, '') <> ''
          and ${ref.coluna} not like 'http%' and ${ref.coluna} not like '/%'`,
    );
    for (const { caminho } of rows) {
      referenciados++;
      const chave = `${ref.pasta}/${caminho}`;
      const tamanho = noNeon.has(chave) ? noNeon.get(chave) : await tamanhoNoNeon(chave);
      if (tamanho == null) ausentes.push(`${ref.tabela}.${ref.coluna}: ${chave}`);
    }
  }
} catch (erro) {
  // So a mensagem, como em `db/aplica.mjs`: o objeto de erro do `pg` inteiro
  // nao diz mais que ela.
  console.error(`\nConferencia pelo banco falhou: ${(erro as Error).message}`);
  process.exit(1);
} finally {
  await cliente.end().catch(() => {});
}

console.log(
  `\nConferencia pelo banco: ${referenciados} arquivo(s) referenciado(s), ${referenciados - ausentes.length} respondem no Neon.`,
);
if (ausentes.length > 0) {
  console.log(`${ausentes.length} referenciado(s) que NAO estao no Neon:`);
  for (const a of ausentes) console.log(`  ${a}`);
}

process.exit(falhas.length > 0 || (COPIAR && ausentes.length > 0) ? 1 : 0);
