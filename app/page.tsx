import Link from "next/link";
import { getEmpreendimento, getInvestidorAtual } from "@/lib/portal/dados";

export default async function Home() {
  const investidor = await getInvestidorAtual();
  const empreendimento = await getEmpreendimento();

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-5 py-16">
      <main className="escalonar w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-tinta">
          Portal do Investidor {empreendimento.nome}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          Acompanhe seus aportes, sua participacao nos resultados e o andamento
          da obra do empreendimento {empreendimento.nome}.
        </p>

        <Link
          href="/portal"
          className="mt-8 flex items-center justify-center rounded-full bg-marinho px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-tinta hover:shadow-lg hover:shadow-marinho/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          Entrar
        </Link>

        <p className="mt-4 text-xs text-neutral-400">
          Sessao ativa: {investidor.nome} · contrato {investidor.contrato}
        </p>
      </main>
    </div>
  );
}
