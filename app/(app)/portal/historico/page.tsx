import type { Metadata } from "next";
import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { montarHistorico } from "@/lib/portal/calculo";
import { getAportes, getEmpreendimentosBasicos } from "@/lib/portal/dados";
import { IconeSetaEsquerda } from "../_componentes/icones";
import { ListaHistorico } from "../_componentes/lista-historico";

export const metadata: Metadata = {
  title: "Histórico · Portal do Investidor Ari",
};

// Tudo vem do banco a cada visita, e a sessao decide de quem sao os dados.
export const dynamic = "force-dynamic";

/**
 * O historico inteiro. O /portal mostra so os ultimos aportes; aqui nao ha
 * recorte — é para onde o "Ver tudo" leva.
 */
export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const sessao = await exigirSessao("/portal/historico");

  const [{ e: escolhido }, todosOsAportes, empreendimentos] =
    await Promise.all([
      searchParams,
      getAportes(sessao.id),
      getEmpreendimentosBasicos(sessao.id),
    ]);

  // Mesmo filtro do /portal, validado do mesmo jeito: id alheio ou inventado
  // nao é encontrado e a tela volta ao consolidado.
  const selecionado =
    empreendimentos.find((emp) => emp.id === escolhido)?.id ?? null;
  const aportes = selecionado
    ? todosOsAportes.filter((a) => a.empreendimentoId === selecionado)
    : todosOsAportes;

  const historico = montarHistorico(aportes);
  const filtrado = selecionado
    ? empreendimentos.find((emp) => emp.id === selecionado)
    : undefined;

  return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
        {/* A volta leva ao /portal com o mesmo filtro, para a pessoa cair de
            novo na tela que deixou. */}
        <Link
          href={selecionado ? `/portal?e=${selecionado}` : "/portal"}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
        >
          <IconeSetaEsquerda className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="mt-6 animate-surgir text-xl font-bold tracking-tight text-black">
          Historico
        </h1>

        {/* Com filtro ligado, dizer de qual empreendimento é a lista — sem o
            seletor por perto, o titulo sozinho mentiria por omissao. */}
        <p className="mt-1 mb-6 animate-surgir text-sm text-neutral-500 [animation-delay:60ms]">
          {historico.length}{" "}
          {historico.length === 1 ? "aporte" : "aportes"}
          {filtrado ? ` em ${filtrado.nome}` : ""}
        </p>

        {/* O escalonado mora na propria lista: aqui ele pegaria o <ol> inteiro
            como filho unico e os cartoes entrariam todos de uma vez. */}
        <ListaHistorico itens={historico} />
      </main>
  );
}
