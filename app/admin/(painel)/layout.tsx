import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/auth";
import { TABELAS } from "@/lib/admin/tabelas";
import { sair } from "../acoes";
import { AbasAdmin } from "./abas-admin";

export const metadata: Metadata = {
  title: "Administracao · Meu ARI",
  // A area nao deve aparecer em busca nenhuma.
  robots: { index: false, follow: false },
};

/*
 * A guarda vive num grupo de rotas — `(painel)` nao aparece na URL — para o
 * login poder ser filho de `/admin` sem herdar a exigencia de sessao. Fosse um
 * layout unico em `/admin`, ou o login exigiria sessao (e ninguem entraria), ou
 * a guarda precisaria adivinhar a rota atual.
 *
 * A casca segue a do portal: mesma faixa escura no topo, mesmos cartoes, mesma
 * elevacao. O painel é a mesma marca vista por dentro — nao precisa parecer
 * outro produto.
 */
export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await lerSessao();
  if (!sessao) redirect("/admin/login");
  if (sessao.tipo !== "administrador") redirect("/admin/login?erro=restrito");

  return (
    <div className="min-h-dvh bg-white text-tinta">
      <header className="degrade-cabecalho isolate animate-surgir rounded-b-2xl text-white">
        {/* As mesmas camadas do cabecalho do portal: o brilho que passeia e o
            gemeo no canto oposto, com atraso proprio para os dois nao piscarem
            em bloco. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-2xl"
        >
          <div className="absolute inset-0 animate-deriva brilho-ciano" />
          <div className="absolute inset-0 animate-deriva brilho-ciano-canto [animation-delay:-8s]" />
        </div>

        <div className="relative">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link
              href="/admin"
              className="rounded-lg text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Administração
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-white/70 sm:inline">
                {sessao.nome}
              </span>
              <form action={sair}>
                <button
                  type="submit"
                  className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold transition-colors duration-200 hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>

          <AbasAdmin
            tabelas={TABELAS.map(({ slug, rotulo }) => ({ slug, rotulo }))}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
