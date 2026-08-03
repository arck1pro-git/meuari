"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * O botao de instalar, que depende inteiramente do navegador de quem chega.
 *
 * - **Android e desktop (Chrome, Edge, Samsung)**: o navegador avisa que o app
 *   é instalavel pelo evento `beforeinstallprompt`. Guardamos esse evento e o
 *   disparamos no toque — é a unica forma de abrir a caixa de instalacao, e ela
 *   exige um gesto da pessoa.
 * - **iPhone e iPad**: nao existe esse evento. O botao continua la, com o mesmo
 *   nome, e o toque revela o caminho do Safari — Compartilhar, Adicionar a
 *   Tela de Inicio.
 * - **Ja instalado**: nada a oferecer, e dizemos isso.
 *
 * O botao é sempre um só, e sempre com o mesmo rotulo: quem chega quer baixar,
 * e a diferenca entre os aparelhos é problema nosso, nao dela.
 */

/** O evento nao esta no lib.dom padrao — é uma extensao dos navegadores Chromium. */
type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Plataforma = "servidor" | "instalado" | "ios" | "comum";

const CONSULTA = "(display-mode: standalone)";

/*
 * Que aparelho é este, lido como sistema externo — que é o que ele é.
 *
 * `navigator` e `matchMedia` nao existem no servidor, entao a resposta de la é
 * `servidor` e o botao so aparece depois de montar. Um palpite no HTML
 * apareceria errado por um quadro e trocaria na cara da pessoa.
 */
function assinar(aoMudar: () => void) {
  const media = window.matchMedia(CONSULTA);
  media.addEventListener("change", aoMudar);
  return () => media.removeEventListener("change", aoMudar);
}

function lerPlataforma(): Plataforma {
  // `standalone` é o iOS antigo; o `display-mode` responde pelo resto.
  const instalado =
    window.matchMedia(CONSULTA).matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (instalado) return "instalado";

  const ehIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPad moderno se anuncia como Mac; o toque é o que o entrega.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return ehIOS ? "ios" : "comum";
}

export function BotaoInstalar() {
  const plataforma = useSyncExternalStore(
    assinar,
    lerPlataforma,
    (): Plataforma => "servidor",
  );

  const [convite, setConvite] = useState<EventoDeInstalacao | null>(null);
  /** Os passos manuais só aparecem depois do toque no botao. */
  const [mostrarPassos, setMostrarPassos] = useState(false);

  useEffect(() => {
    /*
     * O evento costuma chegar antes de o React montar, e nao ha como
     * recupera-lo depois — por isso o ouvinte fica nesta pagina, e nao num
     * lugar mais alto que so monta depois.
     */
    function aoConvidar(evento: Event) {
      evento.preventDefault();
      setConvite(evento as EventoDeInstalacao);
    }

    window.addEventListener("beforeinstallprompt", aoConvidar);
    return () => window.removeEventListener("beforeinstallprompt", aoConvidar);
  }, []);

  /**
   * O botao é um só, e o que ele faz depende do que o aparelho permite: onde ha
   * caixa de instalacao, ele abre a caixa; onde nao ha, ele mostra o caminho.
   * Nunca leva a lugar nenhum.
   */
  async function baixar() {
    if (!convite) return setMostrarPassos(true);

    await convite.prompt();
    const { outcome } = await convite.userChoice;
    // O evento vale uma vez só: usado, ele nao pode ser disparado de novo.
    setConvite(null);
    // Recusou a caixa? O caminho manual continua valendo.
    if (outcome === "dismissed") setMostrarPassos(true);
  }

  if (plataforma === "servidor") {
    // Enquanto nao se sabe o aparelho, o espaco do botao fica reservado — sem
    // isto o cartao pula de altura assim que a pagina monta.
    return <p className="h-12" aria-hidden />;
  }

  if (plataforma === "instalado") {
    return (
      <p className="rounded-xl bg-white/15 px-4 py-3 text-center text-sm font-medium text-white ring-1 ring-white/25">
        Você já está com o app instalado neste aparelho.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={baixar}
        aria-expanded={mostrarPassos}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-marinho transition-all duration-200 hover:bg-ciano hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marinho active:scale-[0.98]"
      >
        <IconeBaixar />
        Baixar Meu ARI
      </button>

      {mostrarPassos &&
        (plataforma === "ios" ? (
          <div className="animate-aparecer rounded-xl bg-white/15 px-4 py-3 text-sm text-white ring-1 ring-white/25">
            <p className="font-semibold">No iPhone ou iPad</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-white/85 marker:text-white/60">
              <li>
                Toque em <span className="font-semibold">Compartilhar</span>, o
                quadrado com a seta para cima, na barra de baixo.
              </li>
              <li>
                Escolha{" "}
                <span className="font-semibold">Adicionar à Tela de Início</span>.
              </li>
              <li>
                Confirme em <span className="font-semibold">Adicionar</span>.
              </li>
            </ol>
            <p className="mt-2 text-xs text-white/60">
              Precisa ser pelo Safari — outros navegadores no iPhone não
              instalam.
            </p>
          </div>
        ) : (
          <div className="animate-aparecer rounded-xl bg-white/15 px-4 py-3 text-sm text-white ring-1 ring-white/25">
            <p className="font-semibold">Para instalar neste navegador</p>
            <p className="mt-1 text-white/85">
              No Android, abra esta página no{" "}
              <span className="font-semibold">Chrome</span> e toque de novo. No
              computador, o Chrome mostra um ícone de instalar na barra de
              endereço.
            </p>
          </div>
        ))}
    </div>
  );
}

/** Seta para baixo entrando numa base — o gesto de baixar. */
function IconeBaixar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4 shrink-0"
    >
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19h14" />
    </svg>
  );
}
