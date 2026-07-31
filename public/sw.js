/**
 * Service worker do Meu ARI — so o necessario para push.
 *
 * Nao guarda nada em cache de proposito: o portal é todo dinamico (saldo,
 * creditos, URLs assinadas que expiram) e servir uma copia velha disso seria
 * pior do que nao funcionar offline.
 */

// Assume o controle sem esperar o proximo carregamento.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) =>
  evento.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (evento) => {
  // O corpo pode vir como JSON ou texto puro, dependendo de quem enviou.
  let dados = { titulo: "Meu ARI", corpo: "", url: "/portal" };
  try {
    dados = { ...dados, ...(evento.data ? evento.data.json() : {}) };
  } catch {
    if (evento.data) dados.corpo = evento.data.text();
  }

  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/ARI.png",
      badge: "/ARI.png",
      data: { url: dados.url },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = evento.notification.data?.url ?? "/portal";

  // Reaproveita uma aba do portal ja aberta em vez de empilhar outra.
  evento.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((abas) => {
        for (const aba of abas) {
          if (aba.url.includes(destino) && "focus" in aba) return aba.focus();
        }
        return self.clients.openWindow(destino);
      }),
  );
});
