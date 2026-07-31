import Link from "next/link";
import { capa, getArtigos, publicado, type Artigo } from "@/lib/artigos";

/** Quantos artigos cabem no bloco do portal. */
const QUANTOS = 3;

/*
 * Pede muito mais do que mostra porque o filtro de publicados corta a lista
 * depois de ela chegar, e a Airticles ordena por id, nao por data: os
 * agendados dos proximos meses vem primeiro. Nos dados de hoje, os 15
 * primeiros traziam só dois publicados — com 50 vem 35.
 */
const BUSCADOS = 50;

/**
 * Os ultimos artigos do blog, logo abaixo do historico.
 *
 * Server Component: a chave da Airticles fica no servidor e o portal continua
 * sem nenhuma chamada de rede no cliente.
 */
export async function Sugestoes() {
  let artigos: Artigo[] = [];

  /*
   * A secao é acessoria: se a Airticles cair, ou a chave for recusada, o
   * portal nao pode ir junto. Falhou, o bloco simplesmente nao aparece — nem
   * mensagem de erro, que aqui nao teria o que a pessoa fizesse a respeito.
   */
  try {
    const lote = await getArtigos(BUSCADOS);
    artigos = lote.filter(publicado).slice(0, QUANTOS);
  } catch (erro) {
    console.error("[sugestoes] Airticles:", erro);
    return null;
  }

  if (artigos.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-5 text-base font-bold tracking-tight text-black">
        Sugestões
      </h2>

      <ul className="escalonar grid gap-4 sm:grid-cols-3">
        {artigos.map((artigo) => {
          const imagem = capa(artigo);

          return (
            <li key={artigo.id}>
              <Link
                href={`/portal/sugestoes/${artigo.id}`}
                className="sombra-cartao-leve hover:sombra-cartao group block h-full overflow-hidden rounded-2xl border border-tinta/12 bg-white transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
              >
                {/* `<img>` e nao `next/image`: a capa vem de um host externo
                    que nao controlamos, e o otimizador recusa origem que nao
                    esteja declarada no `next.config`. Sem capa, nada de moldura
                    vazia — o cartao fica so com o titulo. */}
                {imagem && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imagem}
                    alt=""
                    className="aspect-16/9 w-full bg-neutral-100 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                <p className="p-4 text-sm leading-snug font-semibold text-balance text-tinta">
                  {artigo.title}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
