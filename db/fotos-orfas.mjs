/**
 * Objetos no bucket de fotos que nenhuma linha do banco aponta.
 *
 *   node db/fotos-orfas.mjs            lista, e nao apaga nada
 *   node db/fotos-orfas.mjs --apagar   apaga o que listou
 *
 * **Listar é o padrao, e apagar exige a flag.** Isto destroi arquivo de
 * Storage, que nao volta — um script cujo comportamento padrao é destrutivo é o
 * tipo de coisa que alguem roda por engano depois de apertar seta para cima.
 *
 * ---
 *
 * **Por que ainda existe orfao, agora que o Excluir apaga o arquivo junto.**
 *
 * `lib/admin/crud.ts` passou a apagar o objeto quando a linha sai, entao a porta
 * principal fechou. Sobra uma: **trocar o arquivo de um registro existente**. O
 * upload acontece no navegador, direto para o bucket, antes de o formulario ser
 * enviado (ver `CampoArquivo`) — quem escolhe outro arquivo e desiste de salvar
 * deixa o novo objeto sem dono, e quem salva deixa o antigo. Fechar essa porta
 * exigiria apagar na hora do upload, o que perderia o arquivo de quem abandona a
 * edicao no meio.
 *
 * Entao a faxina é periodica de proposito, e este script é ela.
 *
 * Havia 20,1 MB em sete PNGs quando ele foi escrito: os renders de uma obra cujas
 * linhas foram excluidas no /admin antes de o `crud.ts` aprender a apagar junto.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const APAGAR = process.argv.includes("--apagar");
const BUCKET = "fotos-empreendimentos";

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
  "content-type": "application/json",
};

/**
 * Tudo que esta no bucket.
 *
 * O `list` do Storage nao desce em pasta sozinho: ele devolve o nome da pasta
 * como se fosse um item, com `metadata` nulo. Por isso a varredura é recursiva —
 * os arquivos vivem em `AAAA/`, uma pasta por ano de upload (ver `assinarUpload`).
 */
async function listar(prefixo = "") {
  const resposta = await fetch(`${base}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ prefix: prefixo, limit: 1000 }),
  });
  const itens = await resposta.json();
  if (!Array.isArray(itens)) throw new Error(JSON.stringify(itens));

  const achados = [];
  for (const item of itens) {
    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.metadata) achados.push({ caminho, bytes: item.metadata.size });
    else achados.push(...(await listar(caminho)));
  }
  return achados;
}

const cliente = new pg.Client({ connectionString: env.DATABASE_URL });
await cliente.connect();

try {
  const { rows } = await cliente.query("select url from imagens");
  const comDono = new Set(rows.map((r) => r.url));

  const orfaos = (await listar()).filter((o) => !comDono.has(o.caminho));
  const mb = orfaos.reduce((s, o) => s + o.bytes, 0) / 1048576;

  if (orfaos.length === 0) {
    console.log(`Nada a fazer: ${comDono.size} fotos no banco, nenhuma sobra.`);
  } else {
    for (const o of orfaos) {
      console.log(`  ${(o.bytes / 1048576).toFixed(2).padStart(7)} MB  ${o.caminho}`);
    }
    console.log(
      `\n${orfaos.length} sem dono, ${mb.toFixed(1)} MB (${comDono.size} fotos em uso).`,
    );

    if (!APAGAR) {
      console.log("Rode de novo com --apagar para remove-los.");
    } else {
      const resposta = await fetch(`${base}/storage/v1/object/${BUCKET}`, {
        method: "DELETE",
        headers: auth,
        body: JSON.stringify({ prefixes: orfaos.map((o) => o.caminho) }),
      });
      if (!resposta.ok) throw new Error(await resposta.text());
      console.log(`Apagados. ${mb.toFixed(1)} MB liberados.`);
    }
  }
} catch (erro) {
  // Só a mensagem: o objeto do `pg` traz a string de conexao junto.
  console.error(`Falhou: ${erro.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
