"use client";

import { useEffect } from "react";

/**
 * Registra o service worker na carga da pagina.
 *
 * Antes ele só era registrado quando alguem ligava as notificacoes. Isso basta
 * para o push, mas nao para a instalacao: o Chrome so oferece "instalar app"
 * quando ja existe um service worker ativo com tratador de `fetch`. Sem este
 * registro, o portal tem manifesto e nao aparece como instalavel.
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
