import Image from "next/image";
import type { ItemDoHistorico } from "@/lib/portal/calculo";
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { IconeSetaDireita } from "./icones";
import { Cartao } from "./ui";

/*
 * A mesma pilha de cartoes em dois lugares: o recorte no /portal, com os
 * ultimos aportes, e a tela cheia em /portal/historico. Sem "use client" — o
 * modulo nao tem estado nem evento, entao ele acompanha quem o importa: vira
 * cliente dentro da aba, e fica no servidor na pagina.
 */
export function ListaHistorico({ itens }: { itens: ItemDoHistorico[] }) {
  if (itens.length === 0) {
    return (
      <Cartao>
        <p className="text-sm text-neutral-500">Nenhum aporte registrado ainda.</p>
      </Cartao>
    );
  }

  return (
    /* Um cartao por aporte. A lista continua sendo lista para quem le por
       audio — a mudanca é de forma, nao de semantica. */
    <ol className="escalonar space-y-3">
      {itens.map(({ aporte, taxaAnterior }) => (
        <li key={aporte.id}>
          {/* Elevacao leve: sao muitos, e a sombra padrao repetida a cada 12px
              preenche os vaos e faz a pilha ler cinza. */}
          <Cartao elevacao="leve">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-lg font-semibold tabular-nums text-black">
                {formatarMoeda(aporte.valor)}
              </p>
              {/* `dateTime` carrega o ISO: com a data em numeros, `10/03` é
                  ambiguo entre dia e mes para quem le por maquina. */}
              <time
                dateTime={aporte.data}
                className="shrink-0 text-xs text-neutral-500 tabular-nums"
              >
                {formatarData(aporte.data)}
              </time>
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              {aporte.tipo} · {aporte.empreendimentoNome}
            </p>

            {/* Mesma divisao do cartao de saldo: dado a esquerda, atalho a
                direita. O `min-h` segura a linha quando falta o atalho, para a
                participacao nao mudar de altura. */}
            <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">
                Participacao{" "}
                <span className="font-semibold text-black">
                  {formatarPercentual(aporte.taxaMensal)} ao mês
                </span>
              </p>

              <span className="flex shrink-0 items-center gap-3">
                {aporte.documento && (
                  <a
                    href={aporte.documento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
                  >
                    Contrato
                    <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </a>
                )}

                {/* Enfeite: `alt` vazio para quem le por audio nao ouvir um
                    "fogo" solto no meio da participacao. */}
                <Image
                  src="/icons/3dicons-fire-dynamic-color.png"
                  alt=""
                  width={64}
                  height={64}
                  className="h-8 w-8 shrink-0 drop-shadow-[0_4px_8px_rgba(0,20,73,0.2)]"
                />
              </span>
            </div>

            {taxaAnterior !== undefined && (
              <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600 marker:text-marinho">
                <li>
                  <span className="tabular-nums">
                    {formatarPercentual(taxaAnterior)}
                  </span>
                  <span aria-hidden className="mx-1.5 text-neutral-400">
                    →
                  </span>
                  <span className="sr-only">passou para </span>
                  <span className="font-semibold tabular-nums text-black">
                    {formatarPercentual(aporte.taxaMensal)}
                  </span>
                </li>
              </ul>
            )}
          </Cartao>
        </li>
      ))}
    </ol>
  );
}
