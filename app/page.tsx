import Link from "next/link";
import { exigirSessao } from "@/lib/auth";

// Depende da sessao, entao nada de resposta guardada.
export const dynamic = "force-dynamic";

export default async function Home() {
  const sessao = await exigirSessao("/");

  return (
    // `min-h-dvh` pelo mesmo motivo do /login: o Lenis zera a altura do
    // documento, entao `flex-1` sozinho nao centraliza na vertical.
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-white px-5 py-16">
      <main className="escalonar w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-tinta">
          Portal do Investidor ARI
        </h1>
        {/* Sem o nome do empreendimento aqui: quem tem mais de um contrato tem
            mais de um empreendimento, e escolher um deles nesta tela seria
            escolher errado. Os nomes aparecem no /portal, cada um no seu
            cartao. */}
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          Acompanhe seus aportes, sua participacao nos resultados e o andamento
          das obras.
        </p>

        <Link
          href="/portal"
          className="mt-8 flex items-center justify-center rounded-full bg-marinho px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-tinta hover:shadow-lg hover:shadow-marinho/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          Entrar
        </Link>

        <p className="mt-4 text-xs text-neutral-400">
          Sessao ativa: {sessao.nome}
        </p>
      </main>
    </div>
  );
}
