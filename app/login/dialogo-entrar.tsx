"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { IconeFechar } from "../(app)/portal/_componentes/icones";
import { FormularioLogin } from "./formulario";

/* Traco e caixa dos icones do app — as mesmas do `icones.tsx` do portal. Estes
   dois vivem aqui porque so a tela de entrada os usa. */
const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** Busto em circulo: a conta de quem entra. */
function IconePerfil({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="12" cy="12" r="9.25" />
    </svg>
  );
}

/** Cadeado fechado: a sessao protegida. */
function IconeCadeado({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </svg>
  );
}

/*
 * O id do dialogo, compartilhado entre ele e os botoes que o abrem.
 *
 * A capa tem duas entradas — a do topo, no desktop, e a que fica abaixo do
 * texto, no celular — e elas vivem em pontos distantes da arvore. Um estado de
 * React entre as duas pediria contexto ou subir a capa inteira para o cliente;
 * o `<dialog>` ja é uma peca com estado proprio no DOM, e abri-lo pelo id é a
 * forma que a plataforma oferece. Um dialogo só, dois gatilhos.
 */
const ID = "dialogo-entrar";

/**
 * O botao que abre a entrada. Vive onde o layout precisar.
 *
 * Um icone só, o do perfil, a esquerda do rotulo: ele diz de que porta se trata
 * antes da leitura. Havia um segundo, de seta, no fim — dois icones num botao
 * deste tamanho brigavam pela mesma frase.
 *
 * O ciano saiu do hover: sob o mouse o botao so cresce 3% e puxa um cinza de
 * nada. Mudar de cor é anunciar outra coisa; crescer é so dizer "sou clicavel",
 * que é o que um botao precisa responder.
 *
 * A escala do hover e a do toque convivem porque o Tailwind emite `active`
 * depois de `hover`: com o botao apertado, o 0,98 vence o 1,03 e o gesto lê
 * como afundar.
 *
 * `brightness-90` no toque, e nao uma cor fixa: o filtro escurece o que estiver
 * la — branco parado ou o cinza do hover —, entao o "apertou" fica igual nos
 * dois estados.
 */
export function BotaoEntrar({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const dialogo = document.getElementById(ID);
        if (dialogo instanceof HTMLDialogElement) dialogo.showModal();
      }}
      className={`flex shrink-0 items-center gap-2.5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-tinta shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] transition-all duration-200 ease-[var(--ease-suave)] hover:scale-[1.03] hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tinta active:scale-[0.98] active:brightness-90 ${className}`}
    >
      <IconePerfil className="h-4.5 w-4.5 shrink-0 text-marinho" />
      Acessar conta
    </button>
  );
}

/**
 * O formulario de entrada, em folha modal.
 *
 * A entrada deixou de ser uma secao no fim da rolagem: quem chega para entrar
 * nao deveria precisar descobrir que o formulario esta abaixo da dobra. Agora
 * ele abre por cima de tudo, a um toque, de qualquer ponto da pagina.
 *
 * `<dialog>` nativo com `showModal()`, e nao uma `div` por cima: Esc para
 * fechar, foco preso dentro e o resto da pagina inerte, sem escrever nada
 * disso. E ele sobe para a *top layer*, entao ignora o `overflow-hidden` da
 * capa — que, numa `div` comum, recortaria o dialogo.
 */
export function DialogoEntrar({
  proximo,
  expirou,
}: {
  proximo?: string;
  expirou?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  /*
   * Abre sozinho quando a pessoa nao chegou aqui por vontade propria: sessao
   * vencida ou tentativa de abrir uma pagina interna. Nos dois casos ha um
   * recado a dar e um caminho a retomar — deixar isso atras de um clique seria
   * esconder a resposta da pergunta que ela acabou de fazer.
   */
  const abrirNaCarga = Boolean(expirou || proximo);
  useEffect(() => {
    if (abrirNaCarga) dialogo.current?.showModal();
  }, [abrirNaCarga]);

  return (
    <>
      <dialog
        id={ID}
        ref={dialogo}
        aria-label="Entrar na sua conta"
        // Clique no fundo fecha; dentro do cartao, nao.
        onClick={(evento) => {
          if (evento.target === dialogo.current) dialogo.current?.close();
        }}
        /*
         * Folha que sobe pela base no celular (`mt-auto`, cantos so em cima) e
         * cartao centrado no desktop — o mesmo dialogo, duas formas, porque o
         * polegar alcanca a base e o mouse nao precisa disso. É o desenho da
         * folha de documentos da obra, para as duas superficies do app abrirem
         * do mesmo jeito.
         */
        className="dialogo-entrar mt-auto mb-0 w-full max-w-md border-0 bg-white p-0 text-tinta shadow-[0_-12px_40px_-12px_rgba(0,20,73,0.45)] backdrop:bg-tinta/70 backdrop:backdrop-blur-sm open:animate-subir-folha sm:m-auto sm:rounded-[1.75rem] max-sm:rounded-t-[1.75rem]"
      >
        <div className="relative p-7 sm:p-9">
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            aria-label="Fechar"
            className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors duration-200 hover:bg-tinta/5 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
          >
            <IconeFechar className="h-4.5 w-4.5" />
          </button>

          {/* O logo abre o cartao: ele fecha o topo do bloco e evita que o
              branco comece no vazio. */}
          <Image
            src="/logo.png"
            alt=""
            width={1080}
            height={1080}
            className="h-12 w-12 rounded-xl ring-1 ring-tinta/10"
          />

          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-tinta">
            Entrar na sua conta
          </h2>

          {expirou && (
            /* Ouro, e nao vermelho: sessao vencida nao é erro de quem entra, é
               o relogio do sistema. Vermelho aqui leria como senha errada, que
               é outra mensagem e vem de dentro do formulario. */
            <p
              role="status"
              className="mt-6 rounded-xl bg-ouro/15 px-4 py-3 text-sm leading-relaxed text-tinta ring-1 ring-ouro/40"
            >
              Sua sessão expirou por inatividade. Entre novamente para continuar
              de onde parou.
            </p>
          )}

          <FormularioLogin proximo={proximo} />

          {/* Regua fina antes do rodape: separa o que se faz do que se lê, sem
              cobrar mais uma caixa. */}
          <hr className="mt-8 border-t border-tinta/10" />

          <p className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-neutral-500">
            <IconeCadeado className="mt-px h-4 w-4 shrink-0 text-marinho" />
            <span>
              Sessão protegida, com expiração automática. Cada conta enxerga
              apenas os próprios contratos e documentos.
            </span>
          </p>
        </div>
      </dialog>
    </>
  );
}
