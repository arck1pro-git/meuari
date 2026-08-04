/**
 * Envio de Web Push, sem dependencia externa.
 *
 * Sao dois padroes empilhados, e vale saber qual é qual:
 *
 * - **RFC 8292 (VAPID)** diz quem esta enviando. Um JWT assinado com a nossa
 *   chave privada, que o serviço de push do navegador confere contra a publica
 *   com que a pessoa se inscreveu.
 * - **RFC 8291** diz o que vai dentro. O corpo é cifrado com uma chave derivada
 *   do par da propria inscricao — nem o serviço de push (Apple, Google) le o
 *   conteudo, so o aparelho de destino.
 *
 * Escrito com `node:crypto` em vez do pacote `web-push` pelo mesmo motivo do
 * `scrypt` em `auth.ts`: o que o Node ja faz nao vira dependencia.
 */
import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  createSign,
  randomBytes,
} from "node:crypto";

export type Inscricao = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type Aviso = {
  titulo: string;
  corpo?: string;
  /** Para onde o toque na notificacao leva. */
  url?: string;
};

const de64 = (texto: string) => Buffer.from(texto, "base64url");
const para64 = (bytes: Buffer) => bytes.toString("base64url");

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`${nome} ausente no ambiente`);
  return valor;
}

/* ---------------------------------------------------------------- VAPID -- */

/**
 * A chave privada VAPID chega como 32 bytes crus (base64url), e o `node:crypto`
 * quer uma chave estruturada. O caminho mais curto é montar um JWK: o `d` é o
 * segredo, e o `x`/`y` saem da publica, que é um ponto nao comprimido de 65
 * bytes — 0x04 seguido das duas metades.
 */
function chavePrivadaVapid() {
  const publica = de64(exigir("VAPID_PUBLIC_KEY"));
  if (publica.length !== 65 || publica[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY nao é um ponto P-256 nao comprimido");
  }

  return createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: exigir("VAPID_PRIVATE_KEY"),
      x: para64(publica.subarray(1, 33)),
      y: para64(publica.subarray(33, 65)),
    },
    format: "jwk",
  });
}

/**
 * O JWT que identifica o remetente.
 *
 * `aud` é a origem do endpoint — cada serviço de push so aceita um token feito
 * para ele. `sub` precisa ser um `mailto:` ou uma URL de verdade: a Apple
 * recusa o envio sem isso, com 400.
 */
function tokenVapid(endpoint: string): string {
  const cabecalho = { typ: "JWT", alg: "ES256" };
  const corpo = {
    aud: new URL(endpoint).origin,
    // 12 horas. O maximo que a especificacao admite é 24.
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: exigir("VAPID_SUBJECT"),
  };

  const base = [cabecalho, corpo]
    .map((parte) => para64(Buffer.from(JSON.stringify(parte))))
    .join(".");

  const assinador = createSign("SHA256");
  assinador.update(base);
  // `ieee-p1363` devolve r||s em 64 bytes. O padrao do Node é DER, que o JWT
  // nao aceita — e o erro que isso da (403) nao diz nada sobre o formato.
  const assinatura = assinador.sign({
    key: chavePrivadaVapid(),
    dsaEncoding: "ieee-p1363",
  });

  return `${base}.${para64(assinatura)}`;
}

/* ------------------------------------------------------------ conteudo -- */

function hmac(chave: Buffer, dado: Buffer): Buffer {
  return createHmac("sha256", chave).update(dado).digest();
}

/** HKDF-Expand com uma iteracao só — basta para os tamanhos daqui (≤ 32). */
function derivar(prk: Buffer, info: Buffer, tamanho: number): Buffer {
  return hmac(prk, Buffer.concat([info, Buffer.from([1])])).subarray(0, tamanho);
}

/**
 * Cifra o corpo no esquema `aes128gcm`.
 *
 * O resultado ja carrega tudo que o aparelho precisa para abrir: o sal, o
 * tamanho do registro, e a chave publica efemera que geramos so para este
 * envio. Por isso o `Content-Encoding` é a unica coisa que vai no cabecalho.
 */
function cifrar(inscricao: Inscricao, texto: string): Buffer {
  const cliente = de64(inscricao.p256dh);
  const autenticacao = de64(inscricao.auth);

  const efemera = createECDH("prime256v1");
  efemera.generateKeys();
  const publicaEfemera = efemera.getPublicKey();
  const compartilhado = efemera.computeSecret(cliente);

  // RFC 8291: o segredo da inscricao entra como sal, e o info amarra as duas
  // chaves publicas — sem isso, um segredo capturado serviria para outro par.
  const info = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    cliente,
    publicaEfemera,
  ]);
  const ikm = derivar(hmac(autenticacao, compartilhado), info, 32);

  const sal = randomBytes(16);
  const prk = hmac(sal, ikm);
  const chave = derivar(prk, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = derivar(prk, Buffer.from("Content-Encoding: nonce\0"), 12);

  const cifrador = createCipheriv("aes-128-gcm", chave, nonce);
  const corpo = Buffer.concat([
    cifrador.update(Buffer.from(texto)),
    // 0x02 marca o fim do ultimo registro. Sem ele o navegador descarta.
    cifrador.update(Buffer.from([0x02])),
    cifrador.final(),
    cifrador.getAuthTag(),
  ]);

  const tamanhoDoRegistro = Buffer.alloc(4);
  tamanhoDoRegistro.writeUInt32BE(4096);

  return Buffer.concat([
    sal,
    tamanhoDoRegistro,
    Buffer.from([publicaEfemera.length]),
    publicaEfemera,
    corpo,
  ]);
}

/* --------------------------------------------------------------- envio -- */

export type Resultado =
  | { ok: true }
  /** `expirada` = o aparelho desinstalou ou revogou; a linha pode ser apagada. */
  | { ok: false; status: number; expirada: boolean; detalhe: string };

export async function enviarPush(
  inscricao: Inscricao,
  aviso: Aviso,
): Promise<Resultado> {
  const corpo = cifrar(
    inscricao,
    JSON.stringify({
      titulo: aviso.titulo,
      corpo: aviso.corpo ?? "",
      url: aviso.url ?? "/portal",
    }),
  );

  const resposta = await fetch(inscricao.endpoint, {
    method: "POST",
    headers: {
      TTL: "86400",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${tokenVapid(inscricao.endpoint)}, k=${exigir("VAPID_PUBLIC_KEY")}`,
    },
    body: new Uint8Array(corpo),
  });

  if (resposta.ok) return { ok: true };

  return {
    ok: false,
    status: resposta.status,
    // 404 e 410 sao o serviço dizendo que aquela inscricao morreu.
    expirada: resposta.status === 404 || resposta.status === 410,
    detalhe: (await resposta.text()).slice(0, 200),
  };
}
