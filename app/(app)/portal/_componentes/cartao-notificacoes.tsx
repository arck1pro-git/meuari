"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { usePush } from "./usar-push";

/**
 * O convite para ligar as notificacoes, no topo do portal.
 *
 * Aparece uma vez, para quem ainda nao decidiu. Quem ja ligou, quem recusou no
 * navegador e quem esta num aparelho sem suporte nunca veem — e quem dispensa
 * nao ve de novo.
 *
 * O pedido de permissao nasce do toque no botao, e nao da carga da pagina. O
 * navegador exige isso, e a pessoa merece: a caixa do sistema aparece depois de
 * alguem ler o que ela faz.
 */
const DISPENSADO = "meu-ari:push-dispensado";

/*
 * O `localStorage` é um sistema externo ao React, e é assim que se le um:
 * `useSyncExternalStore`, com um retorno proprio para o servidor.
 *
 * O jeito obvio — `useState` mais um efeito que le no primeiro render — é o que
 * o lint do React barra, e com razao: ele custa um render a mais em toda visita,
 * so para descobrir algo que raramente muda.
 *
 * No servidor a resposta é sempre "dispensado", entao o HTML nunca traz o
 * cartao. Ele aparece depois, no cliente, se for o caso — o contrario faria o
 * cartao piscar e sumir em quem ja decidiu.
 */
const ouvintes = new Set<() => void>();

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => void ouvintes.delete(ouvinte);
}

function lerDispensado() {
  return localStorage.getItem(DISPENSADO) === "1";
}

export function CartaoDeNotificacoes() {
  const { estado, ativar } = usePush();
  const dispensado = useSyncExternalStore(assinar, lerDispensado, () => true);

  function dispensar() {
    localStorage.setItem(DISPENSADO, "1");
    for (const ouvinte of ouvintes) ouvinte();
  }

  // `verificando` tambem some: o cartao aparece quando ha certeza de que ha o
  // que oferecer, e nao pisca antes disso.
  if (dispensado || (estado !== "desligado" && estado !== "ligando")) return null;

  return (
    <div className="sombra-cartao mb-6 flex animate-surgir items-center gap-4 rounded-2xl border border-tinta/12 bg-white p-4 sm:p-5">
      <Image
        src="/icons/3dicons-bell-dynamic-color.png"
        alt=""
        width={96}
        height={96}
        className="h-12 w-12 shrink-0 animate-boiar drop-shadow-[0_6px_10px_rgba(0,20,73,0.2)]"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-black">Ative os avisos</p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
          Avisamos quando o crédito do dia 17 cair e quando houver novidade nas
          suas obras.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={ativar}
            disabled={estado === "ligando"}
            className="rounded-lg bg-marinho px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {estado === "ligando" ? "Ativando…" : "Ativar notificações"}
          </button>

          <button
            type="button"
            onClick={dispensar}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors duration-200 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
