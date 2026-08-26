"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Avisa o servidor de que uma tela foi aberta, e de quanto tempo ela ficou.
 *
 * **Por que no cliente, e nao no servidor.** Registrar dentro de cada `page.tsx`
 * parece mais direto e mede outra coisa: o Next faz *prefetch* dos links em
 * volta, entao a pagina roda no servidor sem ninguem ter aberto nada — e, na
 * volta, uma tela servida do cache do roteador nao roda de novo. Um caminho
 * conta visita a mais, o outro a menos. Aqui é o proprio navegador dizendo o que
 * apareceu na tela.
 *
 * **Por que dentro da `Moldura`.** Ela é o layout do grupo `(app)`, e layout
 * **nao remonta** na troca de rota — é o motivo de ela existir. Um efeito com
 * dependencia em `usePathname()` dispara entao exatamente uma vez por navegacao,
 * que é a contagem que se quer. No `layout.tsx`, que é de servidor, o efeito
 * veria só a primeira entrada.
 *
 * **O tempo é medido pela aba a frente, e nao pelo relogio.** Quem abre o
 * portal, troca para o WhatsApp e volta vinte minutos depois nao ficou vinte
 * minutos no portal. `visibilitychange` marca as duas pontas, e o que se soma é
 * só o intervalo visivel.
 *
 * O envio da saida é a parte fraca, e nao ha como nao ser: a aba pode ser
 * fechada sem aviso, o iOS encerra o processo quando quer, e `sendBeacon` nao
 * confirma entrega. Por isso o painel nao depende dele — ver a nota sobre a
 * duracao em `lib/admin/acessos.ts`.
 */

const DESTINO = "/registro-de-acesso";

/**
 * Abaixo disso nao se manda nada.
 *
 * Meio segundo é o que separa "olhou a tela" de "passou por ela indo para
 * outra". Sem o piso, cada toque no rodape dispararia um envio de 80 ms que nao
 * muda numero nenhum do painel.
 */
const PISO_MS = 500;

/** O iOS antigo responde por `navigator.standalone`; o resto, por media query. */
function instalado(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function Telemetria() {
  const rota = usePathname();

  useEffect(() => {
    /*
     * O estado vive dentro do efeito, e nao num `useRef`: ele pertence a *esta*
     * rota, e a troca de rota tem de zerar tudo. Num ref, o tempo de uma tela
     * vazaria para a seguinte.
     */
    let id: string | null = null;
    let somado = 0;
    let desde: number | null =
      document.visibilityState === "visible" ? performance.now() : null;
    /** A rota ja foi deixada para tras, mas o id ainda nao tinha chegado. */
    let saiu = false;

    function acumular() {
      if (desde === null) return;
      somado += performance.now() - desde;
      desde = null;
    }

    function enviar() {
      if (!id) return;
      const ms = Math.round(
        somado + (desde === null ? 0 : performance.now() - desde),
      );
      if (ms < PISO_MS) return;

      /*
       * `sendBeacon` e nao `fetch`: ele entrega a requisicao ao navegador, que
       * a conclui mesmo depois de a pagina morrer. Um `fetch` disparado no
       * caminho da saida é cancelado junto com o documento.
       *
       * O `Blob` com tipo é o que faz o corpo chegar como JSON — sem ele o
       * beacon manda `text/plain` e o `request.json()` do outro lado recusa.
       */
      navigator.sendBeacon(
        DESTINO,
        new Blob([JSON.stringify({ id, ms })], { type: "application/json" }),
      );
    }

    fetch(DESTINO, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rota,
        // A largura da janela desmente o `user-agent` quando ele mente — ver a
        // nota da coluna `largura` em `db/acessos.sql`.
        largura: window.innerWidth,
        standalone: instalado(),
      }),
      // Se a navegacao acontecer antes de a resposta voltar, a requisicao ainda
      // completa: a visita aconteceu, e nao se perde por ter sido curta.
      keepalive: true,
    })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((corpo: { id: string | null } | null) => {
        id = corpo?.id ?? null;
        // A pessoa ja saiu desta rota enquanto o id vinha. O tempo dela esta
        // somado; só faltava para onde mandar.
        if (saiu) enviar();
      })
      .catch(() => {
        // Rede caiu, sessao venceu, servidor recusou. Medicao de uso nao tem
        // nada a dizer para quem esta usando o app.
      });

    /*
     * Manda ja, sem esperar a saida da rota. No celular, "escondeu" é muitas
     * vezes a ultima coisa que se ve antes de o sistema encerrar o processo —
     * esperar o fim da navegacao é apostar num evento que talvez nao venha.
     *
     * Reenviar depois nao estraga nada: o `update` guarda o maior valor.
     */
    function aoEsconder() {
      acumular();
      enviar();
    }

    function aoTrocarVisibilidade() {
      if (document.visibilityState === "hidden") aoEsconder();
      // `??=` e nao `=`: dois eventos seguidos de "voltou" — que acontece ao
      // desbloquear a tela — jogariam a marca para frente e perderiam o
      // intervalo entre eles.
      else desde ??= performance.now();
    }

    document.addEventListener("visibilitychange", aoTrocarVisibilidade);
    /*
     * `pagehide` direto no `aoEsconder`, e nao no despachante acima: quando ele
     * dispara o `visibilityState` ainda pode estar `visible`, e o despachante
     * entenderia a saida da pagina como uma volta.
     *
     * E `pagehide` e nao `unload`: o `unload` nao dispara com bfcache, e o iOS
     * praticamente só usa bfcache.
     */
    window.addEventListener("pagehide", aoEsconder);

    return () => {
      document.removeEventListener("visibilitychange", aoTrocarVisibilidade);
      window.removeEventListener("pagehide", aoEsconder);

      acumular();
      saiu = true;
      enviar();
    };
  }, [rota]);

  return null;
}
