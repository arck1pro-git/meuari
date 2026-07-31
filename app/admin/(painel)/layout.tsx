import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/auth";
import { TABELAS } from "@/lib/admin/tabelas";
import { sair } from "../acoes";

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
    <div className="min-h-screen bg-neutral-50 text-tinta">
      <header className="border-b border-tinta/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/admin" className="text-sm font-bold">
            Administracao
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-500">{sessao.nome}</span>
            <form action={sair}>
              <button
                type="submit"
                className="rounded-lg border border-tinta/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-tinta/5"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-5 pb-2">
          {TABELAS.map((t) => (
            <Link
              key={t.slug}
              href={`/admin/${t.slug}`}
              className="rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap text-neutral-600 transition-colors hover:bg-tinta/5 hover:text-tinta"
            >
              {t.rotulo}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
