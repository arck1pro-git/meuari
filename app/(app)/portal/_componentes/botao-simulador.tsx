import Link from "next/link";
import { IconeSimulador } from "./icones";

/**
 * Botao do meio do rodape: leva ao simulador.
 *
 * Antes era a galeria de fotos, que passou a viver dentro de cada obra — o
 * lugar dela é junto do empreendimento a que as fotos pertencem, e nao numa
 * porta separada que mistura todas.
 */
export function BotaoSimulador({ className }: { className?: string }) {
  return (
    <Link href="/simulador" className={className}>
      {/* O tom do ciano vai numa camada sobre branco, e nao direto no botao: a
          parte de cima passa sobre o conteudo da pagina, e sem a base branca o
          que estiver atras apareceria atraves dos 30%. */}
      <span aria-hidden className="absolute inset-0 rounded-full bg-ciano/30" />
      <IconeSimulador className="relative h-7 w-7 stroke-[2.5]" />
      <span className="sr-only">Simulador ARI</span>
    </Link>
  );
}
