"use client";

import { useEffect, useRef, useState } from "react";
import type { Arquivo } from "@/lib/portal/dados";
import {
  IconeExpandir,
  IconeFechar,
} from "../../portal/_componentes/icones";

/**
 * As fotos da obra, arrastaveis com o dedo.
 *
 * O arraste é do proprio navegador: uma fila que rola na horizontal, com
 * `snap` para cada foto parar no lugar. Nao ha biblioteca nem `pointermove`
 * escrito a mao, e por isso o toque tem a inercia do sistema, o trackpad
 * funciona, a roda do mouse funciona e o teclado tambem — coisas que uma
 * implementacao propria costuma perder uma a uma.
 *
 * O `useState` aqui serve so aos pontinhos: qual foto esta na frente. Ele
 * acompanha a rolagem, nunca a comanda.
 */
export function Carrossel({ fotos }: { fotos: Arquivo[] }) {
  const fila = useRef<HTMLDivElement>(null);
  const janela = useRef<HTMLDialogElement>(null);
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const elemento = fila.current;
    if (!elemento) return;

    /*
     * Qual foto ocupa o centro da janela de rolagem. Contar por `scrollLeft`
     * dividido pela largura é mais simples e erra no fim da lista, quando a
     * ultima foto nao chega a preencher a tela.
     */
    function aoRolar() {
      const largura = elemento!.clientWidth;
      if (!largura) return;
      setAtual(Math.round(elemento!.scrollLeft / largura));
    }

    elemento.addEventListener("scroll", aoRolar, { passive: true });
    return () => elemento.removeEventListener("scroll", aoRolar);
  }, []);

  function irPara(indice: number) {
    const elemento = fila.current;
    if (!elemento) return;
    elemento.scrollTo({ left: indice * elemento.clientWidth, behavior: "smooth" });
  }

  /*
   * A foto ampliada é a que esta na frente — a mesma que o dedo parou de
   * arrastar. Nao ha estado proprio para ela: `atual` ja é a resposta, e
   * duplicar isso abriria a chance de a janela mostrar uma foto e o carrossel,
   * outra.
   */
  const ampliada = fotos[atual] ?? fotos[0];

  return (
    <div className="relative">
      <div
        ref={fila}
        /*
         * `snap-x snap-mandatory` faz cada foto parar inteira no lugar;
         * `overscroll-x-contain` impede que o arraste no fim da fila vire o
         * gesto de "voltar" do navegador.
         *
         * Sem `gap`: as fotos ficam encostadas, e o arraste passa de uma para a
         * outra sem faixa branca no meio.
         */
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        // Rolagem por teclado precisa de foco, e a fila é uma lista de imagens.
        tabIndex={0}
        role="group"
        aria-label="Fotos da obra"
      >
        {fotos.map((foto) => (
          <figure
            key={foto.id}
            className="relative w-full shrink-0 snap-center overflow-hidden bg-neutral-100"
          >
            {/* `<img>` e nao `next/image`: a URL vem assinada, com token que
                muda a cada carga — nao ha o que o otimizador guarde. */}
            {/* O fade é da propria montagem, e nao do `onLoad`: imagem em
                cache dispara `load` antes da hidratacao, e um fade preso nesse
                evento deixaria a foto invisivel para sempre. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt={foto.nome}
              className="aspect-square w-full animate-aparecer object-cover"
              draggable={false}
            />

            {/* Só o veu, sem texto: quem ocupa esta faixa é o nome da obra e os
                selos, que vivem no hero e nao rolam junto com as fotos. Vai a
                3/5 da altura porque a legenda cresceu — abaixo disso, o selo de
                cima cairia fora do escuro. */}
            <span
              aria-hidden
              className="veu-foto pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
            />
          </figure>
        ))}
      </div>

      {/* Fora da fila que rola: o botao fica parado no canto enquanto as fotos
          passam por baixo dele. A pastilha escura é o que o mantem legivel
          tanto sobre ceu claro quanto sobre concreto. */}
      <button
        type="button"
        onClick={() => janela.current?.showModal()}
        aria-label="Ver a foto em tela cheia"
        title="Expandir"
        className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-tinta/40 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-tinta/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
      >
        <IconeExpandir className="h-4.5 w-4.5" />
      </button>

      {/*
       * A foto grande num `<dialog>`, e nao num `div` por cima: a janela modal
       * do proprio navegador ja traz Esc para fechar, o foco preso dentro dela
       * e o resto da pagina inerte — tres coisas que uma sobreposicao caseira
       * costuma esquecer.
       */}
      <dialog
        ref={janela}
        aria-label={`Foto: ${ampliada?.nome ?? ""}`}
        onClick={(evento) => {
          // Clique no fundo (o proprio dialog) fecha; na foto, nao.
          if (evento.target === janela.current) janela.current?.close();
        }}
        className="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl border-0 bg-transparent p-0 backdrop:bg-tinta/85 backdrop:backdrop-blur-sm open:animate-aparecer"
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ampliada?.url}
            alt={ampliada?.nome ?? ""}
            className="max-h-[92dvh] w-full rounded-2xl object-contain"
          />

          <button
            type="button"
            onClick={() => janela.current?.close()}
            aria-label="Fechar"
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-tinta/40 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-tinta/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IconeFechar className="h-4.5 w-4.5" />
          </button>
        </div>
      </dialog>

      {/* Os pontinhos so aparecem com mais de uma foto — com uma só, eles
          seriam um controle para lugar nenhum. */}
      {/* No canto direito, e nao no centro: o pé da foto é do nome da obra
          agora, e os pontinhos centrados caiam em cima dele. */}
      {fotos.length > 1 && (
        <div className="absolute right-5 bottom-5 flex justify-end gap-2 sm:right-7 sm:bottom-6">
          {fotos.map((foto, i) => (
            <button
              key={foto.id}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Foto ${i + 1} de ${fotos.length}`}
              aria-current={i === atual}
              // Bolinha cheia na atual, vazada nas outras — ●○○○. A que esta
              // na frente cresce um pouco, o que da a leitura mesmo para quem
              // nao distingue os dois tons.
              // Sobre a foto, entao brancos: a bolinha marinho sumiria numa
              // imagem escura.
              className={`h-2 w-2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                i === atual ? "scale-125 bg-white" : "bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
