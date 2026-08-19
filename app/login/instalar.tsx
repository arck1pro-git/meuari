"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { IconeBaixar } from "@/app/(app)/portal/_componentes/icones";

/**
 * O caminho da instalacao no iPhone, print a print.
 *
 * Estava escrito so em texto, e o texto estava **errado**: mandava tocar em
 * "Compartilhar, o quadrado com a seta para cima, na barra de baixo". No Safari
 * atual nao ha mais esse botao na barra — ha o `•••`, e Compartilhar é um item
 * dentro dele. Pior, o "Adicionar a Tela de Inicio" só aparece depois de um
 * "Ver Mais" que quase ninguem acha. Sao quatro toques, e o texto descrevia
 * dois.
 *
 * As imagens sao os quatro prints de `public/ios`, na ordem dos arquivos. Cada
 * um ja vem com o alvo circulado em vermelho — é o que faz o passo se resolver
 * num olhar, sem ler.
 *
 * `width`/`height` sao os do arquivo, lidos do PNG: o `next/image` precisa deles
 * para reservar o espaco antes de a imagem chegar, e sem isso a lista pula de
 * altura quatro vezes enquanto carrega.
 */
const PASSOS_IOS = [
  {
    src: "/ios/0.png",
    largura: 852,
    altura: 1846,
    titulo: "Toque no •••",
    apoio: "Na barra de baixo do Safari, à direita do endereço.",
    alt: "Barra do Safari com o botão de três pontos destacado em vermelho",
  },
  {
    src: "/ios/1.png",
    largura: 881,
    altura: 1786,
    titulo: "Escolha Compartilhar",
    apoio: "É o primeiro item do menu que abriu.",
    alt: "Menu do Safari com a opção Compartilhar destacada em vermelho",
  },
  {
    src: "/ios/2.png",
    largura: 1508,
    altura: 1043,
    titulo: "Toque em Ver Mais",
    apoio: "A seta para baixo, no fim da segunda fileira de ícones.",
    alt: "Folha de compartilhamento com o botão Ver Mais destacado em vermelho",
  },
  {
    src: "/ios/3.png",
    largura: 1063,
    altura: 1480,
    titulo: "Adicionar à Tela de Início",
    apoio: "Role até encontrar. Depois confirme em Adicionar.",
    alt: "Lista expandida com a opção Adicionar à Tela de Início destacada em vermelho",
  },
];

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
 * Mora na `/login` — capa publica de quem ainda nao entrou, e por isso a unica
 * tela em que faz sentido oferecer instalar antes de acessar a conta. Contorno
 * porque ali ele divide o espaco com "Acessar conta", que é a acao principal.
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

const CLASSE_BOTAO =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-[var(--ease-suave)] hover:scale-[1.03] hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tinta active:scale-[0.98] active:brightness-90 disabled:pointer-events-none disabled:opacity-60 lg:w-auto";

export function BotaoInstalar() {
  const plataforma = useSyncExternalStore(
    assinar,
    lerPlataforma,
    (): Plataforma => "servidor",
  );

  const [convite, setConvite] = useState<EventoDeInstalacao | null>(null);
  /** Os passos manuais só aparecem depois do toque no botao. */
  const [mostrarPassos, setMostrarPassos] = useState(false);
  /** Enquanto a caixa nativa esta aberta, aguardando a escolha da pessoa. */
  const [instalando, setInstalando] = useState(false);
  /*
   * `appinstalled` chega antes de o `matchMedia` do `display-mode` reagir em
   * alguns Chromium — sem isto o botao "Baixar" ainda pisca na tela por um
   * instante depois da pessoa confirmar a instalacao.
   */
  const [instaladoAgora, setInstaladoAgora] = useState(false);

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

    function aoInstalar() {
      setConvite(null);
      setMostrarPassos(false);
      setInstaladoAgora(true);
    }

    window.addEventListener("beforeinstallprompt", aoConvidar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoConvidar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  /**
   * O botao é um só, e o que ele faz depende do que o aparelho permite: onde ha
   * caixa de instalacao, ele abre a caixa; onde nao ha, ele mostra o caminho.
   * Nunca leva a lugar nenhum.
   */
  async function baixar() {
    if (!convite) return setMostrarPassos(true);

    setInstalando(true);
    try {
      await convite.prompt();
      const { outcome } = await convite.userChoice;
      // O evento vale uma vez só: usado, ele nao pode ser disparado de novo.
      setConvite(null);
      // Recusou a caixa? O caminho manual continua valendo.
      if (outcome === "dismissed") setMostrarPassos(true);
    } finally {
      setInstalando(false);
    }
  }

  if (plataforma === "servidor") {
    // Enquanto nao se sabe o aparelho, o espaco do botao fica reservado — sem
    // isto o cartao pula de altura assim que a pagina monta.
    return <p className="h-12" aria-hidden />;
  }

  if (plataforma === "instalado" || instaladoAgora) {
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
        disabled={instalando}
        aria-expanded={mostrarPassos}
        aria-busy={instalando}
        className={CLASSE_BOTAO}
      >
        <IconeBaixar className="h-4 w-4 shrink-0" />
        {instalando ? "Instalando…" : "Baixar Meu ARI"}
      </button>

      {mostrarPassos &&
        (plataforma === "ios" ? (
          <div className="animate-aparecer max-w-sm rounded-xl bg-white/15 px-4 py-4 text-sm text-white ring-1 ring-white/25">
            <p className="font-semibold">No iPhone ou iPad</p>
            <p className="mt-0.5 text-xs text-white/60">
              São quatro toques. O que fazer está circulado em cada tela.
            </p>

            <ol className="mt-4 space-y-4">
              {PASSOS_IOS.map((passo, indice) => (
                <li key={passo.src}>
                  <div className="flex items-start gap-2.5">
                    {/* O numero mostrado é 1..4, e nao o 0..3 do nome do
                        arquivo: a ordem dos prints é a da pasta, mas quem le
                        conta a partir de um. */}
                    <span
                      aria-hidden
                      className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[0.6875rem] font-bold text-tinta"
                    >
                      {indice + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{passo.titulo}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-white/70">
                        {passo.apoio}
                      </span>
                    </span>
                  </div>

                  {/* Altura fixa com `object-contain`: os quatro prints vao de
                      0,46 a 1,45 de proporcao — dois sao a tela inteira, dois
                      sao recorte —, e deixar cada um na altura natural faria a
                      lista sanfonar. O fundo claro atras é o que transforma a
                      sobra das laterais em moldura em vez de buraco. */}
                  <div className="mt-2.5 flex h-72 items-center justify-center overflow-hidden rounded-lg bg-white/85 ring-1 ring-white/25">
                    <Image
                      src={passo.src}
                      alt={passo.alt}
                      width={passo.largura}
                      height={passo.altura}
                      /* `sizes` estreito porque a caixa nunca passa de ~20rem:
                         sem ele o otimizador serviria a versao de tela cheia de
                         um PNG de 1,4 MB. */
                      sizes="320px"
                      className="max-h-full w-auto object-contain"
                    />
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-4 text-xs text-white/60">
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
