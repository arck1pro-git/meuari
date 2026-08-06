import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { getEmpreendimentosBasicos, getObra } from "@/lib/portal/dados";
import { TelaDaObra } from "./_componentes/tela-obra";

export const metadata: Metadata = {
  title: "Obras · Portal do Investidor Ari",
};

// Le a sessao e assina URLs que expiram: nada de resposta guardada.
export const dynamic = "force-dynamic";

/**
 * `/obras` nao é mais uma lista — é a primeira obra da pessoa, ja aberta.
 *
 * A lista era uma tela inteira para uma escolha entre duas ou tres opcoes, e
 * quem tem uma só via um cartao solitario que existia apenas para ser clicado.
 * Agora o rodape leva direto ao empreendimento, e a troca acontece no seletor
 * do topo.
 *
 * Ela desenha a tela em vez de redirecionar para `/obras/<id>`: o `redirect()`
 * so aconteceria depois de o cabecalho ter sido enviado, e o Next resolveria
 * isso com um `<meta refresh>` de um segundo. Ver `TelaDaObra`.
 */
export default async function ObrasPage() {
  const sessao = await exigirSessao("/obras");

  /*
   * A consulta é a propria regra: ela só devolve empreendimento em que esta
   * pessoa tem contrato. As duas idas ao banco sao em sequencia porque a
   * segunda precisa do id que a primeira descobre.
   */
  const obras = await getEmpreendimentosBasicos(sessao.id);

  if (obras.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
        <h1 className="mb-5 animate-surgir text-base font-bold tracking-tight text-black">
          Obras
        </h1>
        <p className="sombra-cartao animate-surgir rounded-2xl bg-white px-6 py-10 text-center text-sm text-neutral-500 [animation-delay:60ms]">
          Você ainda não tem aporte em nenhum empreendimento.
        </p>
      </main>
    );
  }

  const obra = await getObra(sessao.id, obras[0].id);
  if (!obra) notFound();

  return <TelaDaObra obra={obra} obras={obras} />;
}
