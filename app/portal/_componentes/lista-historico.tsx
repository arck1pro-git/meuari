import Image from "next/image";
import type { ItemDoHistorico } from "@/lib/portal/calculo";
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { IconeTransparencia } from "./icones";
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
    <ol className="escalonar space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
      {itens.map(({ aporte, taxaAnterior }) => (
        <li key={aporte.id}>
          <Cartao>
            <div className="flex items-baseline justify-between gap-4">
              {/* O valor sai no ouro da marca, o mesmo do ARI no cartao de
                  saldo e do icone da secao aberta no rodape. */}
              <p className="text-lg font-bold tabular-nums text-ouro">
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

            {/* Linha de contexto, nao de leitura: quem já viu o valor e a data
                so precisa dela de relance. Menor que o resto do cartao. */}
            <p className="mt-1 text-xs text-neutral-500">
              {aporte.tipo} · {aporte.empreendimentoNome}
            </p>

            {/* Mesma divisao do cartao de saldo: dado a esquerda, atalho a
                direita. O `min-h` segura a linha quando falta o atalho, para a
                participacao nao mudar de altura. */}
            <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
              {/* A participacao e a troca de taxa sao a mesma lista: uma diz
                  quanto vale hoje, a outra de onde veio. Separadas, a segunda
                  parecia comentario solto no pé do cartao. */}
              <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600 marker:text-marinho">
                <li>
                  Participacao{" "}
                  <span className="font-semibold tabular-nums text-black">
                    {formatarPercentual(aporte.taxaMensal)} ao mês
                  </span>
                </li>

                {taxaAnterior !== undefined && (
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
                )}
              </ul>

              {/* Empilhados: o contrato em cima, o foguinho embaixo. Antes o
                  atalho era a palavra "Contrato" ao lado do fogo, e a linha
                  ficava com tres coisas disputando a mesma altura. */}
              <span className="flex shrink-0 flex-col items-center gap-1.5">
                {aporte.documento && (
                  <a
                    href={aporte.documento}
                    target="_blank"
                    rel="noopener noreferrer"
                    // O nome fica no `sr-only`: sem texto visivel, o link
                    // precisa de algum nome para quem le por audio, e "Contrato"
                    // diz mais do que o arquivo em si.
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-marinho/8 text-marinho transition-colors duration-200 hover:bg-marinho/15 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
                  >
                    <IconeTransparencia className="h-4.5 w-4.5" />
                    <span className="sr-only">Contrato</span>
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
          </Cartao>
        </li>
      ))}
    </ol>
  );
}
