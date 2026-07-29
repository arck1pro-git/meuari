"use client";

import Image from "next/image";
import { useRef } from "react";
import { IconeMais } from "./icones";

/**
 * TODO: numero real do comercial. Nao existe telefone nos dados do portal —
 * ate ele chegar, este link abre o WhatsApp sem destinatario valido.
 */
const WHATSAPP = "https://wa.me/5500000000000";

/**
 * Botao de novo aporte e o aviso que ele abre.
 *
 * Usa `<dialog>` nativo com `showModal()`, e nao uma `div` sobreposta: assim
 * ganhamos foco preso, fechar no Esc e fundo inerte sem escrever nada disso. E
 * o dialogo sobe para a *top layer* do navegador, entao ele ignora o `z-index`
 * e o recorte do rodape onde o botao mora.
 */
export function BotaoNovoAporte({ className }: { className?: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        className={className}
      >
        {/* O tom do ciano vai numa camada sobre branco, e nao direto no botao:
            a parte de cima passa sobre o conteudo da pagina, e sem a base
            branca o que estiver atras apareceria atraves dos 30%. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-ciano/30"
        />
        <IconeMais className="relative h-7 w-7 stroke-[2.5]" />
        <span className="sr-only">Novo aporte</span>
      </button>

      <dialog
        ref={dialogo}
        aria-label="Novo aporte"
        // Clique no fundo fecha. O alvo so é o proprio `dialog` quando o clique
        // cai fora do conteudo — dentro dele, o alvo é algum filho.
        onClick={(evento) => {
          if (evento.target === dialogo.current) dialogo.current.close();
        }}
        className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-3xl border-0 bg-white p-0 text-tinta shadow-[0_24px_60px_-12px_rgba(0,20,73,0.45)] backdrop:bg-tinta/60 backdrop:backdrop-blur-sm open:animate-aparecer"
      >
        <div className="flex flex-col items-center px-6 pt-9 pb-6 text-center">
          <Image
            src="/icons/3dicons-whatsapp-dynamic-color.png"
            alt=""
            width={112}
            height={112}
            className="h-24 w-24 animate-boiar drop-shadow-[0_12px_18px_rgba(0,20,73,0.3)]"
          />

          <p className="mt-7 text-sm leading-relaxed text-neutral-600">
            No app <span className="font-semibold text-tinta">Meu ARI</span> não
            é permitido ou possível realizar transações bancárias. Para realizar
            um novo aporte, iremos te redirecionar para nosso comercial via
            WhatsApp. Você aceita?
          </p>

          {/* Empilhados, com a acao principal em cima: no polegar, o que fica
              mais perto da base é o que se alcanca primeiro, e ali deve estar a
              saida, nao a confirmacao. */}
          <div className="mt-7 flex w-full flex-col gap-2.5">
            {/* Link de verdade, e nao um botao com `window.open`: preserva
                abrir em nova aba, copiar endereco e o aviso de saida do app. */}
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dialogo.current?.close()}
              className="rounded-xl bg-marinho px-4 py-3 text-center text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
            >
              Falar com comercial
            </a>

            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-500 transition-colors duration-200 hover:bg-tinta/5 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
