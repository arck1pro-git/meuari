/**
 * Service worker do Amaan Invest — so o necessario para push.
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

/*
 * Repasse puro: pede a rede e devolve o que vier, sem guardar nada.
 *
 * Existe por uma exigencia do Chrome — para oferecer a instalacao do app, ele
 * quer um service worker com tratador de `fetch`. Sem isto o portal nao aparece
 * como instalavel, mesmo com manifesto completo.
 *
 * E de proposito que ele nao faz cache: o portal é todo dinamico (saldo,
 * creditos, URLs assinadas que expiram) e servir uma copia velha disso seria
 * pior do que nao funcionar offline.
 */
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  /*
   * Requisicao para fora do nosso dominio passa direto, sem o service worker
   * encostar.
   *
   * Nao é so economia: o que o service worker refaz com `fetch()` deixa de ser
   * pedido de imagem e vira pedido de rede, e passa a valer contra a
   * `connect-src` da politica de conteudo em vez da `img-src`. Foi assim que as
   * capas dos artigos, que vem da Airticles, morreram com `ERR_FAILED` no dia
   * em que a politica entrou — a imagem estava liberada, o `fetch` dela nao.
   */
  if (new URL(evento.request.url).origin !== self.location.origin) return;

  evento.respondWith(fetch(evento.request));
});

self.addEventListener("push", (evento) => {
  // O corpo pode vir como JSON ou texto puro, dependendo de quem enviou.
  let dados = { titulo: "Amaan Invest", corpo: "", url: "/portal" };
  try {
    dados = { ...dados, ...(evento.data ? evento.data.json() : {}) };
  } catch {
    if (evento.data) dados.corpo = evento.data.text();
  }

  /*
   * Sem `badge` e sem `icon` — o aviso mostra um logo so.
   *
   * `badge` é a silhueta monocromatica que o sistema encolhe para um disco de
   * ~24px, na barra de status do Android. Passar ali o logo colorido de 192px
   * dava um circulo borrado ao lado do icone de verdade.
   *
   * `icon` saiu depois, e por um motivo parecido: o Android o usa como *large
   * icon*, a miniatura no canto **direito** do aviso. Com o app instalado, o
   * lado esquerdo ja mostra o icone do proprio app — entao o mesmo logo
   * aparecia duas vezes no mesmo balao, uma em cada ponta.
   *
   * A troca tem um custo, e ele é no computador: la nao ha icone de app
   * instalado a esquerda, e sem `icon` o aviso sai com a marca do navegador em
   * vez da nossa. Vale a pena porque quem recebe isto é investidor no celular.
   *
   * `lang` e `dir` porque o texto é em portugues: eles orientam a leitura por
   * voz e a direcao do balao.
   */
  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      lang: "pt-BR",
      dir: "ltr",
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
