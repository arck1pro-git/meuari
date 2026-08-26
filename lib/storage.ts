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

/**
 * Redimensionamento feito pelo proprio Supabase, na borda.
 *
 * O que ele resolve, com numeros medidos neste bucket: os renders da obra sao
 * PNG de 1,4 a 6,8 MB — sete deles somavam 20 MB, e o navegador baixava tudo
 * isso para desenhar um quadrado de 400px. Pedindo `width: 1080` o mesmo arquivo
 * volta em WebP com 110 a 122 KB. O de 6,75 MB vira 96 KB a 800px.
 *
 * A conversao para WebP é automatica e depende do `Accept` do navegador; nao ha
 * o que pedir. Quem nao aceitar WebP recebe o original redimensionado.
 *
 * **Nao serve para PDF**, e por isso nao entra em `assinarLeitura`: contrato e
 * documento sao servidos inteiros, pela rota auditada.
 *
 * A URL sai de `/render/image/sign/...` em vez de `/object/sign/...`, e a
 * transformacao vai **dentro do token** — nao é query string que alguem possa
 * editar para pedir outro tamanho.
 */
export type Transformacao = {
  /** Largura maxima em px. A altura acompanha, mantendo a proporcao. */
  largura: number;
  /** 20 a 100. Acima de ~75 o arquivo cresce sem diferenca visivel. */
  qualidade: number;
};

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

/*
 * As URLs ja assinadas, para nao assinar de novo a cada visita.
 *
 * Vive no `globalThis` pelo mesmo motivo do pool em `lib/db.ts` e do freio em
 * `lib/limite.ts`: em desenvolvimento o Next recarrega os modulos a cada
 * alteracao, e um `Map` de modulo comum seria zerado junto.
 *
 * **Ele resolve duas coisas, e a segunda é a que mais pesa.**
 *
 * 1. Assinar com transformacao é uma chamada por foto (ver `assinarVarias`).
 *    Numa galeria de dez fotos em duas larguras sao vinte idas ao Storage —
 *    aceitavel uma vez por hora, caro a cada carregamento de tela.
 * 2. **A URL passa a ser estavel.** Antes, cada renderizacao gerava um token
 *    novo, entao o endereco da foto mudava e o cache do navegador nunca
 *    acertava: ir para a obra e voltar baixava tudo de novo. Com a URL repetida,
 *    a segunda visita nao busca imagem nenhuma.
 *
 * Guardar URL assinada nao afrouxa acesso nenhum: quem decide se aquela pessoa
 * pode ver a foto é a consulta que veio antes, e ela roda igual em toda visita.
 * O que se reaproveita é o endereco, que ja seria o mesmo para qualquer pessoa
 * autorizada.
 *
 * Na Vercel, com varias instancias, cada uma tem o seu — é cache, e nao estado:
 * o pior caso é assinar de novo, nunca servir errado.
 */
type UrlGuardada = { url: string; expiraEm: number };

const global_ = globalThis as typeof globalThis & {
  urlsAssinadas?: Map<string, UrlGuardada>;
};
const guardadas = (global_.urlsAssinadas ??= new Map());

/**
 * Quanto da vida do token se usa antes de assinar outro.
 *
 * 80%: um endereco entregue no ultimo instante do cache ainda vale por doze
 * minutos, tempo de sobra para a pagina carregar as fotos. Guardar ate o fim
 * entregaria URL vencida para quem chegasse no segundo errado.
 */
const APROVEITAMENTO = 0.8;

function limpar(agora: number) {
  for (const [chave, item] of guardadas) {
    if (item.expiraEm <= agora) guardadas.delete(chave);
  }
}

/**
 * Assina varios caminhos do mesmo bucket, com cache.
 *
 * **Uma chamada por caminho, e nao uma para todos.** O Storage tem um endpoint
 * em lote (`POST /object/sign/{bucket}` com `paths`), e ele foi usado aqui ate
 * a foto passar a ser redimensionada. O lote **ignora o `transform` em
 * silencio**: devolve 200, com token valido, e a imagem volta no tamanho
 * original — medido, um PNG de 6,9 MB que deveria vir com 96 KB voltava com
 * 385 KB, convertido para WebP mas sem redimensionar. A largura precisa estar
 * *dentro* do token, e só o endpoint de caminho unico a assina.
 *
 * As chamadas vao em paralelo, e o cache acima faz com que quase nunca
 * aconteçam.
 */
export async function assinarVarias(
  bucket: Bucket,
  valores: string[],
  opcoes: { segundos?: number; transformar?: Transformacao } = {},
): Promise<Map<string, string | null>> {
  const { segundos = VALIDADE_PADRAO, transformar } = opcoes;
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

  const agora = Date.now();
  limpar(agora);

  // A largura entra na chave: a mesma foto em duas larguras sao dois enderecos.
  const chaveDe = (caminho: string) =>
    `${bucket}|${caminho}|${transformar ? `${transformar.largura}x${transformar.qualidade}` : "cru"}`;

  const faltando = daBucket.filter((caminho) => {
    const guardada = guardadas.get(chaveDe(caminho));
    if (!guardada) return true;
    mapa.set(caminho, guardada.url);
    return false;
  });

  await Promise.all(
    faltando.map(async (caminho) => {
      try {
        const { signedURL } = await pedir(`/object/sign/${bucket}/${caminho}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expiresIn: segundos,
            /*
             * O nome dos campos é o da API do Supabase, e nao o nosso: `width`
             * e `quality`. A traducao para portugues para aqui — o que
             * atravessa a rede tem de ser o que o outro lado entende.
             *
             * Com `transform`, o `signedURL` que volta aponta para
             * `/render/image/sign/...` em vez de `/object/sign/...`.
             */
            ...(transformar
              ? {
                  transform: {
                    width: transformar.largura,
                    quality: transformar.qualidade,
                  },
                }
              : {}),
          }),
        });

        const url = `${base()}/storage/v1${signedURL}`;
        guardadas.set(chaveDe(caminho), {
          url,
          expiraEm: agora + segundos * APROVEITAMENTO * 1000,
        });
        mapa.set(caminho, url);
      } catch {
        // Arquivo apagado no bucket, ou Storage fora do ar: a foto some da
        // lista em vez de derrubar a tela. Falha nao entra no cache.
        mapa.set(caminho, null);
      }
    }),
  );

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
