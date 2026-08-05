import "server-only";
import { sanitizarHtml } from "@/lib/sanitizar";

/*
 * Airticles: o blog que alimenta a secao de sugestoes do portal.
 *
 * Unico ponto que le a `BLOG_API` e fala com a API. `server-only` para o
 * modulo nunca entrar num bundle de cliente — a chave é de servidor, e por
 * isso ela nao tem o prefixo `NEXT_PUBLIC_`.
 *
 * O host nao é variavel de ambiente de proposito: nao ha outro ambiente da
 * Airticles para apontar.
 */
const API = "https://api.airticles.ai";

function chave(): string {
  const valor = process.env.BLOG_API;
  if (!valor) throw new Error("BLOG_API env var is missing");
  return valor;
}

/** Como a *listagem* devolve cada artigo. */
export type Artigo = {
  id: number;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  mainKeyword: string;
  secondaryKeywords: string[];
  html?: string;
  /** Absoluto na listagem (`https://…`), relativo no detalhe (`/uploads/…`). */
  coverImageUrl?: string | null;
};

/**
 * Como o *detalhe* devolve. E um formato proprio, nao uma extensao do de cima:
 * aqui nao vem `id`, `createdAt` nem `updatedAt`, e a data chega em snake_case.
 * Herdar de `Artigo` faria o TypeScript prometer campos que nunca chegam —
 * `res.json()` é um cast, entao ele nao acusaria, e a data sairia vazia na tela.
 */
export type ArtigoCompleto = {
  title: string;
  slug: string;
  status: string;
  category: string;
  html: string;
  coverImageUrl: string | null;
  scheduled_at: string | null;
  project_id: number;
};

type Listagem = {
  projectId: number;
  count: number;
  items: Artigo[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

async function buscar<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, {
    headers: { "X-API-Key": chave() },
    // Artigo publicado muda pouco; 5 minutos evitam bater na Airticles a cada
    // visita do portal, que é `force-dynamic` e nao guarda a pagina.
    next: { revalidate: 300 },
  });
  if (!resposta.ok) {
    throw new Error(`Airticles respondeu ${resposta.status}`);
  }
  return resposta.json() as Promise<T>;
}

export async function getArtigos(limite: number): Promise<Artigo[]> {
  const dados = await buscar<Listagem>(`/api/posts?limit=${limite}`);
  return dados.items;
}

/*
 * A listagem devolve o `status` de cada artigo, e nem todo artigo esta no ar.
 * O que ainda vai entrar nao pode aparecer para o investidor.
 *
 * A Airticles responde em portugues e com inicial maiuscula — hoje sao
 * `Publicado` e `Agendado`, e os agendados estao no topo da lista, porque a
 * ordem é por id e nao por data. Comparo em minusculas, e aceito tambem a
 * grafia em ingles: o painel é traduzido, e a palavra pode mudar com o idioma
 * da conta sem que ninguem avise.
 */
const PUBLICADOS = new Set(["publicado", "published"]);

export function publicado(artigo: { status: string }): boolean {
  return PUBLICADOS.has(artigo.status?.trim().toLowerCase());
}

export async function getArtigo(id: string): Promise<ArtigoCompleto> {
  const artigo = await buscar<ArtigoCompleto>(
    `/api/posts/${encodeURIComponent(id)}`,
  );

  /*
   * O corpo é limpo aqui, e nao na pagina: assim nao ha como uma tela nova
   * esquecer de limpar. Quem chama recebe HTML ja seguro para injetar.
   */
  return { ...artigo, html: sanitizarHtml(artigo.html) };
}

/**
 * A capa em URL absoluta. Aceita o caminho relativo do detalhe e, quando nao
 * ha capa declarada, cai para a primeira imagem do proprio texto.
 */
export function capa(artigo: {
  coverImageUrl?: string | null;
  html?: string;
}): string | null {
  const declarada = artigo.coverImageUrl;
  if (declarada) return absoluta(declarada);

  const primeira = artigo.html?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return primeira ? absoluta(primeira[1]) : null;
}

function absoluta(url: string): string {
  return url.startsWith("http") ? url : `${API}${url}`;
}
