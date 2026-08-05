import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { getObra } from "@/lib/portal/dados";
import { AbasDaObra } from "../_componentes/abas-obra";
import { Carrossel } from "../_componentes/carrossel";
import { CartaoObra } from "../_componentes/cartao-obra";
import { Etapas } from "../_componentes/etapas";
import { Documentos } from "../_componentes/documentos";
import { FichaObra } from "../_componentes/ficha-obra";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sessao = await exigirSessao(`/obras/${id}`);
  const obra = await getObra(sessao.id, id);
  return { title: obra ? `${obra.nome} · Meu ARI` : "Obra · Meu ARI" };
}

/**
 * A ficha de uma obra: fotos, andamento e papeis.
 *
 * Era um segundo nivel dentro do `/obras`, aberto por estado no cliente. Virou
 * rota pelo mesmo motivo das outras: endereco para compartilhar, botao de
 * voltar do navegador, e a lista deixando de carregar o que só a ficha usa.
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
   */
  const obra = await getObra(sessao.id, id);
  if (!obra) notFound();

  return (
    /*
     * Fundo cinza levissimo só nesta tela, e nao no app inteiro: aqui o
     * conteudo é uma pilha de cartoes, e o cinza é o que faz cada um deles ler
     * como superficie. Nas outras telas o fundo branco continua certo.
     */
    <main className="mx-auto w-full max-w-5xl flex-1 bg-[#F7F8FA] px-5 pt-5 pb-28 sm:px-8 md:pt-8 md:pb-12">
      <div className="escalonar">
        {/*
         * O nome da obra vive sobre a foto, e nao dentro do carrossel: assim
         * ele nao rola junto com as imagens — a foto muda, o titulo fica.
         *
         * A foto encosta nas bordas do cartao; quem a recorta é o `overflow`
         * dele, e por isso o carrossel nao tem canto proprio.
         */}
        <section className="sombra-suave relative overflow-hidden rounded-[20px] bg-white">
          {obra.imagens.length > 0 && <Carrossel fotos={obra.imagens} />}

          <h1 className="absolute inset-x-0 bottom-0 px-6 pb-6 text-2xl font-bold tracking-tight text-balance text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.45)] sm:px-7 sm:text-[1.75rem]">
            {obra.nome}
          </h1>
        </section>

        {/* Server Components entregues como props para um componente de
            cliente: os tres chegam prontos, e trocar de aba nao volta ao
            servidor. */}
        <div className="mt-[22px]">
          <AbasDaObra
            informacoes={<FichaObra obra={obra} />}
            progresso={
              <CartaoObra>
                <Etapas etapas={obra.etapas} />
              </CartaoObra>
            }
            documentos={
              <Documentos documentos={obra.documentos} videos={obra.videos} />
            }
          />
        </div>
      </div>
    </main>
  );
}
