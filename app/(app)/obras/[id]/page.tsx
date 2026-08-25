import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { getEmpreendimentosBasicos, getObra } from "@/lib/portal/dados";
import { TelaDaObra } from "../_componentes/tela-obra";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sessao = await exigirSessao(`/obras/${id}`);
  const obra = await getObra(sessao.id, id);
  return { title: obra ? `${obra.nome} · Amaan Invest` : "Obra · Amaan Invest" };
}

/**
 * Uma obra escolhida no seletor — ou aberta por link direto.
 *
 * A tela em si é a mesma de `/obras`, que abre na primeira: quem desenha é
 * `TelaDaObra`. Aqui fica só o que muda entre as duas, que é de onde sai o id.
 */
export default async function ObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await exigirSessao(`/obras/${id}`);

  /*
   * A checagem de acesso é a propria consulta — ela só devolve a obra se esta
   * pessoa tiver contrato nela. Id alheio e id inventado dao no mesmo: 404, sem
   * revelar que o empreendimento existe.
   *
   * A lista do seletor sai da mesma regra e vem junto, em paralelo: ela é leve
   * (id e nome) e só traz onde ha contrato desta pessoa.
   */
  const [obra, obras] = await Promise.all([
    getObra(sessao.id, id),
    getEmpreendimentosBasicos(sessao.id),
  ]);
  if (!obra) notFound();

  return <TelaDaObra obra={obra} obras={obras} />;
}
