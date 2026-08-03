"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

/** Compensa a altura do cabecalho sticky, que cobriria o topo do alvo. */
const RECUO = -96;

/**
 * Rolagem suave é movimento que o usuario nao pediu, entao o padrao é ceder a
 * quem configurou `prefers-reduced-motion: reduce` e ficar na rolagem nativa.
 *
 * Se a sua maquina reporta `reduce` por engano — emulacao do DevTools ligada,
 * por exemplo — o efeito some por inteiro e parece que a lib nao funciona.
 * Passe para `false` e o Lenis roda para todo mundo, sem excecao.
 */
const RESPEITAR_MENOS_MOVIMENTO = true;

/*
 * A instancia mora no modulo, e nao num contexto do React: quem rola por
 * ancora so quer disparar um efeito, nao re-renderizar quando ela muda. Um
 * contexto aqui custaria um provider e um re-render em toda a arvore, sem nada
 * em troca.
 */
let instancia: Lenis | null = null;

/**
 * Rola ate o elemento pela rolagem suave, caindo para a nativa quando o Lenis
 * nao esta ativo — o que acontece de proposito com `prefers-reduced-motion`.
 */
export function rolarAte(alvo: HTMLElement) {
  if (instancia) instancia.scrollTo(alvo, { offset: RECUO });
  else alvo.scrollIntoView({ block: "start", behavior: "smooth" });
}

export function RolagemSuave() {
  useEffect(() => {
    if (
      RESPEITAR_MENOS_MOVIMENTO &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    /*
     * `autoRaf` deixa o proprio Lenis tocar o loop de quadros. `anchors` ficava
     * desligado enquanto as secoes eram abas: o alvo vivia num painel escondido,
     * que precisava abrir antes da rolagem, e quem cuidava disso chamava
     * `rolarAte` no fim. Agora cada secao é uma rota e toda ancora aponta para
     * algo visivel na propria pagina — o Lenis pode cuidar delas sozinho.
     */
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: RECUO } });
    instancia = lenis;

    return () => {
      lenis.destroy();
      instancia = null;
    };
  }, []);

  return null;
}
