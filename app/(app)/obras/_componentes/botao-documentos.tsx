"use client";

import { useRef } from "react";
import {
  IconeFechar,
  IconeTransparencia,
} from "../../portal/_componentes/icones";

/**
 * O botao flutuante dos documentos, e a folha que ele abre.
 *
 * Os papeis sairam do corpo da pagina: a tela da obra passou a ser uma leitura
 * corrida — fotos, ficha, quadros —, e uma lista de arquivos no meio dela
 * interrompia essa leitura para responder uma pergunta que nem sempre é feita.
 * No botao, eles ficam a um toque de qualquer ponto da rolagem.
 *
 * `<dialog>` nativo com `showModal()`, e nao uma `div` por cima: Esc para
 * fechar, foco preso dentro e o resto da pagina inerte, sem escrever nada
 * disso. E ele sobe para a *top layer*, entao ignora `z-index` e `overflow` de
 * quem estiver por perto.
 *
 * O conteudo chega pronto do servidor, como `children`: a lista ja vem com as
 * URLs assinadas, e o botao nao busca nada ao abrir.
 */
export function BotaoDocumentos({
  quantos,
  children,
}: {
  /** Quantos arquivos ha. Zero nao mostra botao nenhum. */
  quantos: number;
  children: React.ReactNode;
}) {
  const folha = useRef<HTMLDialogElement>(null);

  if (quantos === 0) return null;

  return (
    <>
      {/*
       * `fixed` no canto direito, acima da barra do app no celular — sem o
       * `bottom-24` ele cairia atras dela. No desktop, onde essa barra nao
       * existe, volta para 1.5rem.
       *
       * Redondo e so com o icone: sem rotulo, o nome vive no `aria-label` e no
       * `title` — é o que o leitor de tela anuncia e o que aparece com o mouse
       * parado. O ouro é a unica peca dessa cor na tela, e é o que faz o botao
       * existir sobre foto, cartao branco ou fundo cinza sem depender de sombra.
       *
       * O icone é o mesmo `IconeTransparencia` que marca documento no resto do
       * app — traco em `currentColor`, e nao o PNG 3D que estava aqui: ele era
       * a unica peca ilustrada num app inteiro de traco, e ainda pesava uma
       * requisicao de imagem por um desenho de 28px.
       */}
      <button
        type="button"
        onClick={() => folha.current?.showModal()}
        aria-label={`Documentos da obra (${quantos})`}
        title="Documentos"
        className="fixed right-5 bottom-24 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ouro text-tinta shadow-[0_12px_28px_-6px_rgba(247,188,5,0.55)] transition-all duration-200 hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ouro focus-visible:ring-offset-2 active:scale-95 sm:right-8 md:bottom-6"
      >
        <IconeTransparencia className="h-6 w-6" />
      </button>

      <dialog
        ref={folha}
        aria-label="Documentos da obra"
        // Clique no fundo fecha; dentro da folha, nao.
        onClick={(evento) => {
          if (evento.target === folha.current) folha.current?.close();
        }}
        /*
         * Folha que sobe pela base no celular (`mt-auto`, cantos so em cima) e
         * caixa centrada no desktop — o mesmo dialogo, duas formas, porque o
         * polegar alcanca a base e o mouse nao precisa disso.
         */
        className="folha-documentos mt-auto mb-0 max-h-[85dvh] w-full max-w-lg border-0 bg-white p-0 text-tinta shadow-[0_-12px_40px_-12px_rgba(0,20,73,0.45)] backdrop:bg-tinta/60 backdrop:backdrop-blur-sm open:animate-subir-folha sm:m-auto sm:rounded-[20px] max-sm:rounded-t-[20px]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-tinta/[0.08] px-6 py-4">
          <h2 className="text-base font-bold tracking-tight text-tinta">
            Documentos
          </h2>
          <button
            type="button"
            onClick={() => folha.current?.close()}
            aria-label="Fechar"
            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 transition-colors duration-200 hover:bg-tinta/5 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
          >
            <IconeFechar className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* A lista rola dentro da folha, e nao a folha inteira: o cabecalho
            acima fica parado, entao o "fechar" nunca sai da vista. */}
        <div className="max-h-[calc(85dvh-8rem)] overflow-y-auto overscroll-contain px-6 py-5">
          {children}
        </div>
      </dialog>
    </>
  );
}
