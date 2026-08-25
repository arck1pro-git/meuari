"use client";

import { useEffect, useRef, useState } from "react";
import type { Arquivo } from "@/lib/portal/dados";
import {
  IconeExpandir,
  IconeFechar,
  IconeSetaDireita,
  IconeSetaEsquerda,
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
/** Qual foto ocupa a janela de rolagem, pela posicao dela. */
function indiceVisivel(elemento: HTMLDivElement): number {
  const largura = elemento.clientWidth;
  return largura ? Math.round(elemento.scrollLeft / largura) : 0;
}

export function Carrossel({ fotos }: { fotos: Arquivo[] }) {
  const fila = useRef<HTMLDivElement>(null);
  const janela = useRef<HTMLDialogElement>(null);
  const filaAmpliada = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [naAmpliacao, setNaAmpliacao] = useState(0);

  useEffect(() => {
    const elemento = fila.current;
    if (!elemento) return;

    /*
     * Contar por `scrollLeft` dividido pela largura é mais simples e erra no
     * fim da lista, quando a ultima foto nao chega a preencher a tela.
     */
    function aoRolar() {
      setAtual(indiceVisivel(elemento!));
    }

    elemento.addEventListener("scroll", aoRolar, { passive: true });
    return () => elemento.removeEventListener("scroll", aoRolar);
  }, []);

  function irPara(indice: number) {
    const elemento = fila.current;
    if (!elemento) return;
    elemento.scrollTo({
      left: indice * elemento.clientWidth,
      behavior: "smooth",
    });
  }

  /**
   * Abre a ampliacao ja na foto que estava na frente.
   *
   * O `scrollLeft` é acertado **depois** do `showModal()`: antes disso o
   * dialogo nao tem layout, `clientWidth` é zero e a conta daria sempre a
   * primeira foto.
   */
  function ampliar() {
    janela.current?.showModal();
    setNaAmpliacao(atual);
    const elemento = filaAmpliada.current;
    if (elemento) elemento.scrollLeft = atual * elemento.clientWidth;
  }

  /**
   * Anda uma foto na ampliacao — é o que as setas do desktop comandam.
   *
   * Ela **rola a mesma fila** que o arraste rola, em vez de guardar um indice
   * proprio: o `onScroll` continua sendo a unica fonte de qual foto esta na
   * frente, entao seta, arraste e roda do mouse nunca discordam.
   *
   * Sem dar a volta no fim da lista: com `snap-mandatory`, saltar da ultima
   * para a primeira faz a fila varrer todas as fotos no caminho. As setas se
   * desabilitam nas pontas, que diz a mesma coisa sem o efeito colateral.
   */
  function andar(passo: number) {
    const elemento = filaAmpliada.current;
    if (!elemento) return;
    elemento.scrollTo({
      left: (naAmpliacao + passo) * elemento.clientWidth,
      behavior: "smooth",
    });
  }

  /**
   * Fechar devolve o carrossel de baixo na foto em que a ampliacao parou.
   *
   * Sem isto, quem navegou ate a quinta foto na tela cheia voltaria para a
   * primeira ao fechar — e a tela pareceria ter perdido o lugar.
   */
  function fechar() {
    const elemento = fila.current;
    if (elemento) {
      elemento.scrollLeft = naAmpliacao * elemento.clientWidth;
      setAtual(naAmpliacao);
    }
    janela.current?.close();
  }

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
        onClick={ampliar}
        aria-label="Ver as fotos em tela cheia"
        title="Expandir"
        className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-tinta/40 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-tinta/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
      >
        <IconeExpandir className="h-4.5 w-4.5" />
      </button>

      {/*
       * O carrossel inteiro ampliado num `<dialog>`, e nao uma foto solta: quem
       * abre uma foto grande quer ver as outras grandes tambem, e fechar para
       * arrastar e abrir de novo é o caminho mais longo entre duas imagens.
       *
       * `<dialog>` nativo com `showModal()`, e nao uma `div` por cima: Esc para
       * fechar, foco preso dentro e o resto da pagina inerte, sem escrever nada
       * disso. E ele sobe para a *top layer*, entao ignora `z-index` e
       * `overflow` de quem estiver por perto.
       */}
      <dialog
        ref={janela}
        aria-label="Fotos da obra em tela cheia"
        onClick={(evento) => {
          // Clique no fundo (o proprio dialog) fecha; na foto, nao.
          if (evento.target === janela.current) fechar();
        }}
        onClose={() => {
          // Esc fecha por fora do nosso botao — o carrossel de baixo precisa
          // acompanhar do mesmo jeito.
          const elemento = fila.current;
          if (elemento) {
            elemento.scrollLeft = naAmpliacao * elemento.clientWidth;
            setAtual(naAmpliacao);
          }
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 backdrop:bg-tinta/90 backdrop:backdrop-blur-sm open:animate-aparecer"
      >
        <div className="relative flex h-full flex-col justify-center">
          {/* A mesma fila de baixo, em tela cheia: `snap` para cada foto parar
              inteira, e `object-contain` para nenhuma ser recortada. */}
          <div
            ref={filaAmpliada}
            onScroll={(evento) =>
              setNaAmpliacao(indiceVisivel(evento.currentTarget))
            }
            tabIndex={0}
            role="group"
            aria-label="Fotos da obra"
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {fotos.map((foto) => (
              <figure
                key={foto.id}
                className="flex w-screen shrink-0 snap-center items-center justify-center px-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={foto.nome}
                  className="max-h-[82dvh] w-auto max-w-full rounded-2xl object-contain"
                  draggable={false}
                />
              </figure>
            ))}
          </div>

          {/*
           * As setas, só a partir do `md`.
           *
           * No celular quem troca de foto é o polegar, e dois botoes de 44px
           * sobre a imagem cobririam justamente as bordas dela. No desktop nao
           * ha arraste: sobrava a roda do mouse na horizontal, que quase
           * ninguem usa, ou as setas do teclado, que exigem saber que a fila
           * tem foco.
           *
           * Desabilitadas nas pontas em vez de escondidas: um botao que some
           * muda a largura util da imagem no meio da navegacao.
           */}
          {fotos.length > 1 && (
            <>
              <Seta
                lado="esquerda"
                onClick={() => andar(-1)}
                desabilitada={naAmpliacao === 0}
              />
              <Seta
                lado="direita"
                onClick={() => andar(1)}
                desabilitada={naAmpliacao === fotos.length - 1}
              />
            </>
          )}

          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IconeFechar className="h-5 w-5" />
          </button>

          {/* Contador em vez de pontinhos: em tela cheia, com muitas fotos, a
              fila de bolinhas viraria uma regua ilegivel no pé da imagem. */}
          {fotos.length > 1 && (
            <p className="absolute inset-x-0 bottom-6 text-center text-sm font-medium text-white/80 tabular-nums">
              {naAmpliacao + 1} / {fotos.length}
            </p>
          )}
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
                i === atual
                  ? "scale-125 bg-white"
                  : "bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Uma seta da ampliacao.
 *
 * Fora do corpo do carrossel porque sao duas, e a unica diferenca entre elas é
 * o lado — repetir doze linhas de classe para trocar `left` por `right` é o
 * tipo de copia que envelhece torta.
 *
 * A pastilha translucida com `backdrop-blur` é a mesma do botao de expandir e
 * do de fechar: sobre foto clara ou escura, ela se sustenta sem moldura.
 */
function Seta({
  lado,
  onClick,
  desabilitada,
}: {
  lado: "esquerda" | "direita";
  onClick: () => void;
  desabilitada: boolean;
}) {
  const esquerda = lado === "esquerda";
  const Icone = esquerda ? IconeSetaEsquerda : IconeSetaDireita;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitada}
      aria-label={esquerda ? "Foto anterior" : "Próxima foto"}
      className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 disabled:pointer-events-none disabled:opacity-25 md:flex ${
        esquerda ? "left-4" : "right-4"
      }`}
    >
      <Icone className="h-6 w-6" />
    </button>
  );
}
