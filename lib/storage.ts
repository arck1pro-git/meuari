import "server-only";

/**
 * Supabase Storage, so o que precisamos: assinar upload, assinar leitura e
 * apagar.
 *
 * Sem o `@supabase/supabase-js`: sao tres rotas REST, e o cliente oficial traria
 * postgrest, realtime e auth junto para nao usar nenhum deles.
 *
 * A chave secreta ignora qualquer politica do Storage — ela mora aqui, num
 * modulo `server-only`, e nunca chega ao browser. Quem decide o que cada pessoa
 * pode ver é o nosso codigo: uma URL assinada só é gerada depois de a consulta
 * provar que aquele arquivo é de quem esta pedindo.
 */

/** Buckets do projeto. Nome do bucket nunca vem de requisicao — sai daqui. */
export const BUCKETS = {
  /** Contratos e instrumentos, por investidor. */
  contratos: "scp",
  /** Documentos do empreendimento. */
  documentos: "docs",
  /** Fotos do empreendimento. */
  imagens: "fotos-empreendimentos",
  /** Videos — bucket publico, servido direto, sem assinatura. */
  videos: "videos",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Os privados. O de video é publico de proposito: video pede range request. */
const PRIVADOS: Bucket[] = [
  BUCKETS.contratos,
  BUCKETS.documentos,
  BUCKETS.imagens,
];

/** Uma hora: o suficiente para ler a pagina sem virar link permanente. */
const VALIDADE_PADRAO = 3600;

/*
 * Sem `NEXT_PUBLIC_`: variavel com esse prefixo é embutida no pacote que o
 * navegador baixa. Nada aqui precisa disso — o browser so recebe URL ja
 * assinada, e o endereco do projeto vai dentro dela.
 */
function base(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL ausente no ambiente");
  return url.replace(/\/$/, "");
}

function autorizacao(): Record<string, string> {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("SUPABASE_SECRET_KEY ausente no ambiente");
  return { apikey: chave, Authorization: `Bearer ${chave}` };
}

/**
 * Um valor guardado no banco é caminho de bucket, ou é endereco pronto?
 *
 * Endereco pronto começa com `http` (link externo, como um video no YouTube) ou
 * com `/` (arquivo em `public/`, do tempo anterior ao Storage). O resto é chave
 * de objeto dentro do bucket daquela tabela.
 */
export function ehCaminhoDeBucket(valor: string): boolean {
  return Boolean(valor) && !valor.startsWith("http") && !valor.startsWith("/");
}

/** Endereco publico e permanente — so faz sentido em bucket publico. */
export function urlPublica(bucket: Bucket, caminho: string): string {
  return `${base()}/storage/v1/object/public/${bucket}/${caminho}`;
}

async function pedir(rota: string, init: RequestInit = {}) {
  const resposta = await fetch(`${base()}/storage/v1${rota}`, {
    ...init,
    headers: { ...autorizacao(), ...(init.headers ?? {}) },
    // Nada de cache: URL assinada expira, e resposta guardada venceria junto.
    cache: "no-store",
  });
  if (!resposta.ok) {
    throw new Error(
      `Storage ${init.method ?? "GET"} ${rota}: ${resposta.status} ${await resposta.text()}`,
    );
  }
  return resposta.json();
}

/**
 * URL de leitura, valida por `segundos`. Devolve o valor intacto quando ele ja
 * é um endereco pronto, e `null` quando a assinatura falha — arquivo apagado no
 * bucket nao pode derrubar a pagina inteira.
 */
export async function assinarLeitura(
  bucket: Bucket,
  valor: string,
  segundos = VALIDADE_PADRAO,
): Promise<string | null> {
  if (!ehCaminhoDeBucket(valor)) return valor || null;
  if (!PRIVADOS.includes(bucket)) return urlPublica(bucket, valor);

  try {
    const { signedURL } = await pedir(`/object/sign/${bucket}/${valor}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expiresIn: segundos }),
    });
    return `${base()}/storage/v1${signedURL}`;
  } catch {
    return null;
  }
}

/**
 * O mesmo, para varios caminhos do mesmo bucket, numa chamada só — a grade de
 * imagens de um empreendimento assinaria uma por uma sem isto.
 */
export async function assinarVarias(
  bucket: Bucket,
  valores: string[],
  segundos = VALIDADE_PADRAO,
): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>();

  const daBucket = valores.filter(ehCaminhoDeBucket);
  for (const valor of valores) {
    if (!daBucket.includes(valor)) mapa.set(valor, valor || null);
  }
  if (daBucket.length === 0) return mapa;

  if (!PRIVADOS.includes(bucket)) {
    for (const caminho of daBucket) mapa.set(caminho, urlPublica(bucket, caminho));
    return mapa;
  }

  try {
    const lista: { path: string; signedURL: string | null; error: string | null }[] =
      await pedir(`/object/sign/${bucket}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expiresIn: segundos, paths: daBucket }),
      });

    for (const item of lista) {
      mapa.set(
        item.path,
        item.signedURL ? `${base()}/storage/v1${item.signedURL}` : null,
      );
    }
  } catch {
    for (const caminho of daBucket) mapa.set(caminho, null);
  }
  return mapa;
}

/** Tira acento, espaco e o que mais atrapalhe numa chave de objeto. */
function higienizar(nome: string): string {
  return (
    nome
      .normalize("NFD")
      // Os acentos, que o NFD acabou de separar da letra. O intervalo é
      // U+0300-U+036F, e sao marcas combinantes: no editor elas aparecem
      // grudadas nos colchetes, sem largura propria.
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .toLowerCase()
      .slice(0, 80) || "arquivo"
  );
}

/**
 * URL para o browser enviar o arquivo direto ao bucket.
 *
 * O arquivo nao passa pelo nosso servidor de proposito: Server Action tem
 * limite de corpo de 1 MB por padrao, e um PDF de 3 MB atravessando o Node so
 * para ser reenviado é trabalho sem ganho. O token da URL vale para aquele
 * caminho e nada mais.
 */
export async function assinarUpload(
  bucket: Bucket,
  nomeOriginal: string,
): Promise<{ envio: string; caminho: string }> {
  const agora = new Date();
  const caminho = `${agora.getFullYear()}/${crypto.randomUUID().slice(0, 8)}-${higienizar(nomeOriginal)}`;

  const { url } = await pedir(`/object/upload/sign/${bucket}/${caminho}`, {
    method: "POST",
  });

  return { envio: `${base()}/storage/v1${url}`, caminho };
}

export async function apagar(bucket: Bucket, caminho: string): Promise<void> {
  if (!ehCaminhoDeBucket(caminho)) return;
  await pedir(`/object/${bucket}/${caminho}`, { method: "DELETE" });
}
