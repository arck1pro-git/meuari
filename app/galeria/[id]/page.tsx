import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { getEmpreendimentos } from "@/lib/portal/dados";
import { formatarData } from "@/lib/portal/formato";
import { IconeSetaEsquerda } from "@/app/(app)/portal/_componentes/icones";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sessao = await exigirSessao(`/galeria/${id}`);
  const alvo = (await getEmpreendimentos(sessao.id)).find((e) => e.id === id);
  return { title: alvo ? `${alvo.nome} · Galeria` : "Galeria · Amaan Invest" };
}

export default async function GaleriaDoEmpreendimento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await exigirSessao(`/galeria/${id}`);

  /*
   * A lista ja vem filtrada pelos contratos da pessoa, entao procurar dentro
   * dela é a checagem de acesso: um id de empreendimento alheio simplesmente
   * nao é encontrado e vira 404 — sem consulta extra e sem vazar a existencia
   * do empreendimento.
   */
  const empreendimento = (await getEmpreendimentos(sessao.id)).find(
    (e) => e.id === id,
  );
  if (!empreendimento || empreendimento.imagens.length === 0) notFound();

  return (
    // Fundo escuro: a foto é o conteudo, e branco em volta rouba contraste dela.
    <div className="min-h-dvh bg-tinta">
      {/* Fica por cima das fotos o tempo todo — sem isto, sair da galeria
          exigiria rolar ate o fim. Leva ao /portal, e nao a um indice de
          galerias: a lista de obras agora é a aba Obras. */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-linear-to-b from-tinta to-transparent px-5 py-4 sm:px-8">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-white/90 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <IconeSetaEsquerda className="h-4 w-4" />
          Voltar
        </Link>
        <p className="truncate text-sm font-semibold text-white">
          {empreendimento.nome}
        </p>
      </header>

      <ul className="escalonar -mt-14">
        {empreendimento.imagens.map((imagem) => (
          <li key={imagem.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem.url}
              alt={imagem.nome}
              className="block w-full object-contain"
            />

            {/* O nome da foto e a data, sobre o degrade que garante leitura
                mesmo quando a base da imagem é clara. */}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-tinta/80 to-transparent px-5 pt-16 pb-5 sm:px-8">
              <span className="block text-sm font-medium text-white">
                {imagem.nome}
              </span>
              <span className="mt-0.5 block text-xs text-white/70 tabular-nums">
                {formatarData(imagem.data)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
