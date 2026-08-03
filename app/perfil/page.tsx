import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sair } from "@/app/login/acoes";
import { exigirSessao } from "@/lib/auth";
import { getPerfil } from "@/lib/portal/dados";
import { formatarData } from "@/lib/portal/formato";
import { getNotificacoes } from "@/lib/portal/notificacoes";
import { Moldura } from "../portal/_componentes/moldura";
import { IconeSetaEsquerda } from "../portal/_componentes/icones";
import { Cartao } from "../portal/_componentes/ui";

export const metadata: Metadata = {
  title: "Perfil · Portal do Investidor Ari",
};

// Le a sessao: nada de resposta guardada.
export const dynamic = "force-dynamic";

/** Quem esta logado, o vinculo com o ARI e a porta de saida. */
export default async function PerfilPage() {
  const sessao = await exigirSessao("/perfil");

  const [perfil, notificacoes] = await Promise.all([
    getPerfil(sessao.id),
    getNotificacoes(sessao.id),
  ]);

  // A sessao existe mas o usuario nao: conta apagada com o cookie ainda de pé.
  if (!perfil) notFound();

  const inicial = (Array.from(perfil.nome)[0] ?? "?").toUpperCase();

  return (
    <Moldura nome={sessao.nome} notificacoes={notificacoes}>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
        >
          <IconeSetaEsquerda className="h-4 w-4" />
          Voltar
        </Link>

        <div className="escalonar mt-6">
          <Cartao>
            <div className="flex items-center gap-4">
              {/* A mesma inicial do cabecalho, em tamanho de retrato. */}
              <span
                aria-hidden
                className="degrade-cabecalho flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              >
                {inicial}
              </span>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-black">
                  {perfil.nome}
                </h1>
                <p className="mt-0.5 truncate text-sm text-neutral-500">
                  {perfil.email}
                </p>
              </div>
            </div>

            <dl className="mt-8 divide-y divide-neutral-100 border-y border-neutral-100">
              <Linha rotulo="Perfil">
                {perfil.tipo === "administrador" ? "Administrador" : "Investidor"}
              </Linha>
              <Linha rotulo="No ARI desde">{formatarData(perfil.desde)}</Linha>
              <Linha rotulo="Aportes">
                <span className="tabular-nums">{perfil.aportes}</span>
              </Linha>
              <Linha rotulo="Obras">
                <span className="tabular-nums">{perfil.obras}</span>
              </Linha>
            </dl>

            {/*
             * Sair é Server Action num `<form>`, e nao um `onClick`: o cookie
             * de sessao é `httpOnly`, entao quem o apaga é o servidor. De
             * quebra, funciona antes de o JavaScript carregar.
             */}
            <form action={sair} className="mt-8">
              <button
                type="submit"
                className="w-full rounded-xl border border-tinta/12 px-4 py-2.5 text-sm font-semibold text-marinho transition-colors duration-200 hover:border-transparent hover:bg-marinho hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
              >
                Sair
              </button>
            </form>
          </Cartao>
        </div>
      </main>
    </Moldura>
  );
}

/** Uma linha da ficha: rotulo a esquerda, valor a direita. */
function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-neutral-500">{rotulo}</dt>
      <dd className="text-sm font-semibold text-black">{children}</dd>
    </div>
  );
}
