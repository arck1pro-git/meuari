import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { IconeSetaEsquerda } from "../portal/_componentes/icones";

export const metadata: Metadata = {
  title: "Simulador ARI · Meu ARI",
};

// Le a sessao: nada de resposta guardada.
export const dynamic = "force-dynamic";

/**
 * O simulador, ainda por fazer.
 *
 * A pagina existe desde ja porque o botao do meio do rodape aponta para ela —
 * levar a um 404 seria pior do que dizer que esta a caminho. Quando o calculo
 * entrar, é aqui.
 */
export default async function SimuladorPage() {
  await exigirSessao("/simulador");

  // // A barra lateral do desktop entra aqui tambem: chegar pelo botao do // simulador e perder a navegacao deixaria a tela sem saida que nao o // "Voltar".
  return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-8">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
        >
          <IconeSetaEsquerda className="h-4 w-4" />
          Voltar
        </Link>

        <div className="mt-16 flex flex-col items-center text-center">
          <Image
            src="/icons/3dicons-rocket-dynamic-color.png"
            alt=""
            width={160}
            height={160}
            className="h-28 w-28 animate-boiar drop-shadow-[0_12px_18px_rgba(0,20,73,0.3)]"
          />

          <h1 className="mt-10 animate-surgir text-3xl font-semibold tracking-tight text-balance text-tinta sm:text-4xl">
            Simulador ARI
          </h1>

          <p className="mt-4 max-w-md animate-surgir text-sm leading-relaxed text-balance text-neutral-500 [animation-delay:120ms]">
            Em desenvolvimento. Aqui você vai poder projetar quanto um aporte
            rende ao longo do tempo, na participação do seu contrato.
          </p>
        </div>
      </main>
  );
}
