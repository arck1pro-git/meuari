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
 * A instancia mora no modulo, e nao num contexto do React: quem precisa dela
 * (a rolagem por ancora, dentro do `Abas`) so quer disparar um efeito, nao
 * re-renderizar quando ela muda. Um contexto aqui custaria um provider e um
 * re-render em toda a arvore, sem nada em troca.
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
     * `autoRaf` deixa o proprio Lenis tocar o loop de quadros. E `anchors` fica
     * desligado: as ancoras daqui apontam para dentro de paineis de aba, que
     * precisam ser abertos antes da rolagem. Quem cuida disso é o `Abas`, e ele
     * termina chamando `rolarAte` — com os dois ligados, haveria duas rolagens
     * disputando o mesmo destino.
     */
    const lenis = new Lenis({ autoRaf: true });
    instancia = lenis;

    return () => {
      lenis.destroy();
      instancia = null;
    };
  }, []);

  return null;
}
