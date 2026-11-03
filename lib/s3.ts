import { createHash, createHmac } from "node:crypto";

/**
 * URL pre-assinada de S3 (AWS Signature V4), escrita com o `node:crypto`.
 *
 * Serve o Neon Object Storage, que fala o dialeto S3: ler, enviar, conferir e
 * apagar um objeto sao uma URL assinada cada. Sem `@aws-sdk/*` pelo mesmo
 * motivo de `lib/push.ts` dispensar biblioteca de Web Push: o que se usa aqui
 * é uma assinatura HMAC de umas sessenta linhas, e o SDK traria dezenas de
 * pacotes para fazer isso.
 *
 * **Sem `server-only`, de proposito.** O script de migracao em `db/` importa
 * este arquivo fora do Next, e a linha o derrubaria. Nada aqui le ambiente nem
 * guarda segredo: as credenciais chegam por parametro, e quem as tira do
 * ambiente é `lib/storage.ts`, esse sim `server-only`.
 *
 * O desenho segue a especificacao da AWS ("Authenticating Requests: Using
 * Query Parameters"): assinatura na query e corpo `UNSIGNED-PAYLOAD`. Entre os
 * cabecalhos assinados vai sempre o `host`, e mais os que o chamador pedir em
 * `cabecalhos` — o envio do painel assina o `Content-Type`, para o navegador
 * nao poder gravar HTML com nome de `.pdf`. O Neon só aceita endereco no
 * estilo de caminho (`endpoint/bucket/chave`), e é o que sai daqui.
 */

export type CredenciaisS3 = {
  /** Ex.: `https://br-xxx.storage.c-4.us-east-2.aws.neon.tech`, sem barra no fim. */
  endpoint: string;
  /** Ex.: `us-east-2`. */
  regiao: string;
  chave: string;
  segredo: string;
  bucket: string;
};

/** O teto da AWS para URL pre-assinada com SigV4: sete dias. */
const VALIDADE_MAXIMA = 7 * 24 * 3600;

/**
 * Codificacao de URI da AWS: tudo vira `%XX`, menos letra, digito e `-._~`.
 *
 * O `encodeURIComponent` deixa passar `!'()*`, que a AWS codifica — e uma
 * diferenca de um caractere entre o que se assina e o que se envia é
 * assinatura recusada.
 */
function codificar(texto: string): string {
  return encodeURIComponent(texto).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function hmac(chave: Buffer | string, texto: string): Buffer {
  return createHmac("sha256", chave).update(texto, "utf8").digest();
}

/**
 * URL que autoriza um pedido ao bucket, valida por `segundos`.
 *
 * `chave` vazia aponta para o proprio bucket — é o caso da listagem e da
 * configuracao de CORS. `consulta` leva os parametros da operacao
 * (`list-type`, `prefix`, `cors`...), que entram na assinatura junto com os
 * da AWS.
 */
export function presignar(
  cred: CredenciaisS3,
  pedido: {
    metodo: "GET" | "HEAD" | "PUT" | "DELETE";
    chave?: string;
    segundos: number;
    consulta?: Record<string, string>;
    /**
     * Cabecalhos que entram na assinatura, alem do `host`. Quem usar a URL
     * precisa mandar exatamente estes valores, ou o pedido é recusado.
     */
    cabecalhos?: Record<string, string>;
    /** Para testar a assinatura contra um exemplo fixo; em uso real, omita. */
    agora?: Date;
  },
): string {
  const { metodo, chave = "", consulta = {}, cabecalhos = {} } = pedido;
  const segundos = Math.max(1, Math.min(VALIDADE_MAXIMA, Math.round(pedido.segundos)));

  // 2026-11-03T12:34:56.789Z -> 20261103T123456Z
  const data = (pedido.agora ?? new Date())
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const dia = data.slice(0, 8);
  const escopo = `${dia}/${cred.regiao}/s3/aws4_request`;
  const host = new URL(cred.endpoint).host;

  // A barra separa pastas e nao é codificada; cada trecho entre barras é.
  const caminho =
    `/${codificar(cred.bucket)}` +
    (chave ? `/${chave.split("/").map(codificar).join("/")}` : "");

  // Nome em minuscula e valor sem espaco nas pontas, em ordem alfabetica: a
  // forma canonica que a AWS remonta do outro lado para conferir.
  const assinados: Record<string, string> = { host };
  for (const [nome, valor] of Object.entries(cabecalhos)) {
    assinados[nome.toLowerCase()] = valor.trim();
  }
  const nomes = Object.keys(assinados).sort();
  const listaDeNomes = nomes.join(";");

  const parametros: Record<string, string> = {
    ...consulta,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${cred.chave}/${escopo}`,
    "X-Amz-Date": data,
    "X-Amz-Expires": String(segundos),
    "X-Amz-SignedHeaders": listaDeNomes,
  };

  // Ordem pelo nome ja codificado, byte a byte — o que a AWS exige.
  const query = Object.entries(parametros)
    .map(([k, v]) => [codificar(k), codificar(v)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonico = [
    metodo,
    caminho,
    query,
    // Cada cabecalho termina em quebra de linha, e o bloco inteiro é seguido
    // de outra — por isso a linha em branco antes da lista de nomes.
    nomes.map((nome) => `${nome}:${assinados[nome]}\n`).join(""),
    listaDeNomes,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const paraAssinar = [
    "AWS4-HMAC-SHA256",
    data,
    escopo,
    createHash("sha256").update(canonico, "utf8").digest("hex"),
  ].join("\n");

  const chaveDeAssinatura = hmac(
    hmac(hmac(hmac(`AWS4${cred.segredo}`, dia), cred.regiao), "s3"),
    "aws4_request",
  );
  const assinatura = createHmac("sha256", chaveDeAssinatura)
    .update(paraAssinar, "utf8")
    .digest("hex");

  return `${cred.endpoint}${caminho}?${query}&X-Amz-Signature=${assinatura}`;
}
