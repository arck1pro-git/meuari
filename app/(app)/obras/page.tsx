import type { Metadata } from "next";
import { exigirSessao } from "@/lib/auth";
import { getEmpreendimentos } from "@/lib/portal/dados";
import { ListaDeObras } from "./_componentes/lista-obras";

export const metadata: Metadata = {
  title: "Obras · Portal do Investidor Ari",
};

// Le a sessao e assina URLs que expiram: nada de resposta guardada.
export const dynamic = "force-dynamic";

/**
 * As obras em que a pessoa aportou.
 *
 * Era uma aba dentro do /portal, com painel escondido no mesmo endereco. Virou
 * rota: dá link para mandar a alguem, botao de voltar do navegador e uma
 * consulta menor no /portal, que nao precisa mais carregar documentos, videos e
 * fotos assinados so para deixar prontos num painel fechado.
 */
export default async function ObrasPage() {
  const sessao = await exigirSessao("/obras");

  const [empreendimentos] = await Promise.all([
    getEmpreendimentos(sessao.id),
  ]);

  // pb reserva a altura da barra do rodape no mobile — sem isso o ultimo cartao fica sob ela.
  return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
        <h1 className="mb-5 animate-surgir text-base font-bold tracking-tight text-black">
          Obras
        </h1>

        <ListaDeObras empreendimentos={empreendimentos} />
      </main>
  );
}
