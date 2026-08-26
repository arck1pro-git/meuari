/**
 * Converte para WebP as imagens que ja estao no bucket.
 *
 *   node db/imagens-para-webp.mjs              lista, e nao converte nada
 *   node db/imagens-para-webp.mjs --converter  converte
 *
 * O painel passou a converter tudo no envio (ver `paraWebp`), mas isso só vale
 * do proximo upload em diante. Este script cuida do que ja estava la: quando foi
 * escrito, o bucket tinha tres PNG de ~2 MB ao lado de tres WebP de ~0,3 MB.
 *
 * **Quem converte é o proprio Supabase.** O endpoint de transformacao devolve
 * WebP quando o `Accept` pede — é o mesmo caminho que serve a galeria (ver
 * `CARTAO` e `CHEIA` em `lib/portal/dados.ts`). Sem isso seria preciso trazer um
 * codificador de imagem para dentro do projeto, uma dependencia nativa inteira
 * para uma faxina que roda uma vez.
 *
 * **A ordem é a mesma de `lib/admin/crud.ts`, e pelo mesmo motivo.** Sobe o
 * arquivo novo, aponta a linha para ele, e só entao apaga o antigo. Se parar no
 * meio, o pior caso é um objeto orfao — que `db/fotos-orfas.mjs` limpa depois.
 * Na ordem inversa, uma falha deixaria a linha apontando para um arquivo que
 * nao existe mais, e a foto sumiria da tela do investidor.
 *
 * Rodar de novo é seguro: o que ja é `.webp` fica de fora.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const CONVERTER = process.argv.includes("--converter");
const BUCKET = "fotos-empreendimentos";

/**
 * O mesmo teto do navegador, em `app/admin/(painel)/[tabela]/webp.ts`.
 *
 * Repetido aqui, e nao importado: aquele modulo é de cliente e usa `canvas` e
 * `document`. Sao dois numeros que precisam concordar, e este comentario é o
 * unico vinculo entre eles.
 */
const LADO_MAXIMO = 2560;
const QUALIDADE = 82;

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

const env = lerEnv();
const base = env.SUPABASE_URL.replace(/\/+$/, "");
const auth = {
  apikey: env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
};
const emMB = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;

/** Baixa a imagem ja convertida, pela rota de transformacao do Storage. */
async function baixarComoWebp(caminho) {
  const assinatura = await fetch(
    `${base}/storage/v1/object/sign/${BUCKET}/${caminho}`,
    {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({
        expiresIn: 300,
        transform: { width: LADO_MAXIMO, quality: QUALIDADE },
      }),
    },
  );
  const { signedURL } = await assinatura.json();
  if (!signedURL) throw new Error("nao consegui assinar");

  // O `Accept` é o que decide o formato: sem ele o Storage devolve o original.
  const resposta = await fetch(`${base}/storage/v1${signedURL}`, {
    headers: { accept: "image/webp,image/*" },
  });
  if (!resposta.ok) throw new Error(`render devolveu ${resposta.status}`);

  const tipo = resposta.headers.get("content-type");
  if (tipo !== "image/webp") throw new Error(`veio ${tipo}, e nao webp`);

  return Buffer.from(await resposta.arrayBuffer());
}

const cliente = new pg.Client({ connectionString: env.DATABASE_URL });
await cliente.connect();

try {
  const { rows } = await cliente.query(
    "select id, nome, url from imagens order by criado_em",
  );
  const pendentes = rows.filter((r) => !r.url.toLowerCase().endsWith(".webp"));

  if (pendentes.length === 0) {
    console.log(`Nada a fazer: as ${rows.length} imagens ja estao em WebP.`);
  } else {
    console.log(
      `${pendentes.length} de ${rows.length} fora do WebP:\n` +
        pendentes.map((r) => `  ${r.url}  (${r.nome})`).join("\n"),
    );

    if (!CONVERTER) {
      console.log("\nRode de novo com --converter para converte-las.");
    } else {
      let antes = 0;
      let depois = 0;

      for (const linha of pendentes) {
        const novoCaminho = linha.url.replace(/\.[^.]+$/, "") + ".webp";
        process.stdout.write(`\n${linha.url}\n`);

        const bytes = await baixarComoWebp(linha.url);

        const envio = await fetch(
          `${base}/storage/v1/object/${BUCKET}/${novoCaminho}`,
          {
            method: "POST",
            headers: { ...auth, "content-type": "image/webp" },
            body: bytes,
          },
        );
        // 409 = ja existe um objeto naquele caminho. Nao é falha: uma execucao
        // anterior parou no meio, e o arquivo certo ja esta la.
        if (!envio.ok && envio.status !== 409) {
          throw new Error(`upload falhou: ${envio.status} ${await envio.text()}`);
        }

        await cliente.query("update imagens set url = $1 where id = $2", [
          novoCaminho,
          linha.id,
        ]);

        // Só agora: a linha ja aponta para o arquivo novo.
        await fetch(`${base}/storage/v1/object/${BUCKET}/${linha.url}`, {
          method: "DELETE",
          headers: auth,
        });

        console.log(`  -> ${novoCaminho}  ${emMB(bytes.length)}`);
        depois += bytes.length;
      }

      // O tamanho de antes vem da listagem, para o resumo poder comparar.
      const lista = await fetch(`${base}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ prefix: "2026", limit: 1000 }),
      });
      for (const o of await lista.json()) antes += o.metadata?.size ?? 0;

      console.log(
        `\n${pendentes.length} convertidas. Bucket agora: ${emMB(antes)}.`,
      );
      console.log(`As novas somam ${emMB(depois)}.`);
    }
  }
} catch (erro) {
  // Só a mensagem: o objeto do `pg` traz a string de conexao junto.
  console.error(`Falhou: ${erro.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
