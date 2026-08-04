import Link from "next/link";
import { capa, getArtigos, publicado, type Artigo } from "@/lib/artigos";
import { IconeSetaDireita } from "./icones";

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
    <div className="mt-16">
      <h2 className="mb-5 text-base font-bold tracking-tight text-black">
        Sugestões
      </h2>

      <ul className="escalonar grid gap-4 sm:grid-cols-3">
        {artigos.map((artigo) => {
          const imagem = capa(artigo);

          return (
            <li key={artigo.id}>
              {/* A foto ocupa o cartao inteiro e o titulo mora dentro dela,
                  sem base branca embaixo. `bg-tinta` aparece quando o artigo
                  nao tem capa — ai o cartao é um retangulo escuro com o titulo,
                  e nao um vazio. */}
              <Link
                href={`/portal/sugestoes/${artigo.id}`}
                className="sombra-cartao hover:sombra-cartao-alta group relative block aspect-3/2 overflow-hidden rounded-2xl bg-tinta transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
              >
                {/* `<img>` e nao `next/image`: a capa vem de um host externo
                    que nao controlamos, e o otimizador recusa origem que nao
                    esteja declarada no `next.config`. */}
                {imagem && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imagem}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* O veu escurece so o pé da foto. Sem ele, titulo branco sobre
                    capa clara desaparece — e capa clara é a maioria. */}
                <span
                  aria-hidden
                  className="veu-foto absolute inset-x-0 bottom-0 h-2/3"
                />

                {/* Diz o que o cartao faz. Nao é `<button>`: o cartao inteiro ja
                    é o link, e um botao dentro de um link é aninhamento invalido
                    e alvo de toque duplicado. Fundo branco solido porque ele
                    para em cima da foto, onde nao ha veu. */}
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-tinta shadow-sm transition-colors duration-200 group-hover:bg-white">
                  Ler artigo
                  <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>

                {/* A sombra no texto cobre o caso extremo: mancha clara bem no
                    lugar da palavra, que o veu sozinho nao escurece o bastante. */}
                <p className="absolute inset-x-0 bottom-0 p-4 text-base leading-snug font-semibold text-balance text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
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
