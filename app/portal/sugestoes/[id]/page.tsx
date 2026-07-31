import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { capa, getArtigo } from "@/lib/artigos";
import { formatarData } from "@/lib/portal/formato";
import { getNotificacoes } from "@/lib/portal/notificacoes";
import { Cabecalho } from "../../_componentes/cabecalho";
import { IconeSetaEsquerda } from "../../_componentes/icones";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const artigo = await getArtigo(id);
    return { title: `${artigo.title} · Meu ARI` };
  } catch {
    return { title: "Artigo · Meu ARI" };
  }
}

/** Um artigo do blog, dentro do portal — a leitura nao tira a pessoa daqui. */
export default async function ArtigoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await exigirSessao(`/portal/sugestoes/${id}`);

  const artigo = await getArtigo(id).catch((erro) => {
    console.error("[sugestoes] Airticles:", erro);
    return null;
  });
  // Id inexistente e Airticles fora dao no mesmo lugar: nao ha artigo para ler.
  if (!artigo) notFound();

  const notificacoes = await getNotificacoes(sessao.id);
  const imagem = capa(artigo);

  return (
    <div className="flex flex-1 flex-col">
      <Cabecalho nome={sessao.nome} notificacoes={notificacoes} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-6 pb-28 sm:px-8">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
        >
          <IconeSetaEsquerda className="h-4 w-4" />
          Voltar
        </Link>

        <article className="animate-surgir">
          {artigo.category && (
            <p className="mt-6 text-xs font-semibold tracking-wide text-marinho uppercase">
              {artigo.category}
            </p>
          )}

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance text-black sm:text-3xl">
            {artigo.title}
          </h1>

          {/* `scheduled_at` é o unico carimbo de data que o detalhe devolve —
              nao ha `createdAt` nem `updatedAt` neste formato. */}
          {artigo.scheduled_at && (
            <time
              dateTime={artigo.scheduled_at}
              className="mt-2 block text-xs text-neutral-500 tabular-nums"
            >
              {formatarData(artigo.scheduled_at.slice(0, 10))}
            </time>
          )}

          {imagem && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imagem}
              alt=""
              className="mt-6 aspect-16/9 w-full rounded-2xl bg-neutral-100 object-cover"
            />
          )}

          {/*
           * O corpo vem em HTML pronto da Airticles. E conteudo do proprio
           * time, publicado pelo painel deles — nao ha entrada de terceiros
           * aqui —, e a estilizacao mora na classe `article-body` do
           * `globals.css`, ja que as tags chegam sem classe nenhuma.
           */}
          <div
            className="article-body mt-8"
            dangerouslySetInnerHTML={{ __html: artigo.html }}
          />
        </article>
      </main>
    </div>
  );
}
