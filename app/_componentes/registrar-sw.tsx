"use client";

import { useEffect } from "react";

/**
 * Registra o service worker na carga da pagina.
 *
 * Mora no layout raiz, e nao numa tela de dentro do app: o Chrome so oferece
 * "instalar app" quando ja existe um service worker ativo com tratador de
 * `fetch` *na pagina em que a pessoa esta*, e o botao de instalar aparece
 * justamente onde ninguem entrou ainda — a `/login`. Deixado so na moldura
 * de quem ja tem sessao, o service worker nunca chegava a tempo para quem
 * via o botao pela primeira vez: o `beforeinstallprompt` nunca disparava, e
 * o clique caia sempre no aviso de passo manual, Chrome incluso.
 *
 * O registro é idempotente — chamar de novo com a mesma URL nao registra
 * duas vezes — entao nao ha problema em `usePush` tambem registrar quando a
 * pessoa liga as notificacoes.
 *
 * Nao renderiza nada — é so o efeito.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Sem `await` no efeito e sem estado: se falhar, o portal segue igual —
    // service worker aqui é para instalar e notificar, nao para servir a tela.
    navigator.serviceWorker
      .register("/sw.js")
      .catch((erro) => console.error("service worker:", erro));
  }, []);

  return null;
}
