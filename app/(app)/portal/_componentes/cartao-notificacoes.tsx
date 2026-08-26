"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { usePush } from "./usar-push";

/**
 * O convite para ligar as notificacoes, flutuando no topo do portal.
 *
 * Ele **nao ocupa lugar no fluxo**. Antes era o primeiro filho do `<main>`, e
 * por isso empurrava para baixo tudo o que vinha depois: quem abria o app via o
 * saldo — a razao de entrar — deslocado por um convite. Agora ele paira sobre o
 * conteudo, e a tela por baixo fica exatamente onde estaria sem ele.
 *
 * Aparece uma vez, para quem ainda nao decidiu. Quem ja ligou, quem recusou no
 * navegador e quem esta num aparelho sem suporte nunca veem — e quem dispensa
 * nao ve de novo.
 *
 * O pedido de permissao nasce do toque no botao, e nao da carga da pagina. O
 * navegador exige isso, e a pessoa merece: a caixa do sistema aparece depois de
 * alguem ler o que ela faz.
 */
/*
 * A chave guarda o nome antigo do app de proposito.
 *
 * Renomear para `amaan-invest:` faria o navegador de quem ja dispensou nao achar
 * mais a marca, e o cartao voltaria a aparecer para essas pessoas — um recado
 * que elas ja recusaram uma vez. O texto da chave nao aparece em lugar nenhum
 * da tela; trocar so por causa da marca custaria mais do que corrige.
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
  if (dispensado || (estado !== "desligado" && estado !== "ligando"))
    return null;

  return (
    /*
     * `fixed` — logo abaixo do cabecalho no celular, no alto a direita no
     * desktop.
     *
     * Os deslocamentos do topo saem da altura do cabecalho, que o proprio
     * componente dele registra: 52px com `py-2`, 60px com `sm:py-3`. Mais meio
     * rem de respiro. Sao literais, e nao uma variavel de CSS, porque ha um
     * consumidor so — uma variavel lida num lugar unico seria a mesma
     * manutencao com um salto de arquivo no meio.
     *
     * No `md` o cabecalho nao existe (`md:hidden`) e quem ocupa a esquerda é a
     * coluna de 15rem: o cartao larga as ancoras laterais e vira uma caixa
     * estreita no canto superior direito, longe dela.
     *
     * `z-40` acompanha o rodape e a coluna, ficando acima do conteudo. Nao sobe
     * mais que isso porque o cabecalho é `z-50`, e é dele o painel que desce do
     * sino — um convite para ligar avisos nao pode cobrir a caixa de avisos.
     */
    <div
      aria-label="Ativar notificações"
      className="sombra-cartao fixed inset-x-4 top-[3.75rem] z-40 flex animate-surgir items-center gap-4 rounded-2xl md:rounded-lg border border-tinta/12 bg-white p-4 sm:inset-x-8 sm:top-[4.25rem] sm:p-5 md:inset-x-auto md:top-6 md:right-8 md:w-[26rem]"
    >
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
