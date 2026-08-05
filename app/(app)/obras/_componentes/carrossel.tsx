"use client";

import { useEffect, useRef, useState } from "react";
import type { Arquivo } from "@/lib/portal/dados";

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt={foto.nome}
              className="aspect-square w-full object-cover transition-transform duration-300"
              draggable={false}
            />

            {/* Só o veu, sem texto: quem ocupa esta faixa agora é o nome da
                obra, que vive na pagina e nao rola junto com as fotos. Nome de
                arquivo e data eram informacao de acervo, nao de quem le. */}
            <span
              aria-hidden
              className="veu-foto pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
            />
          </figure>
        ))}
      </div>

      {/* Os pontinhos so aparecem com mais de uma foto — com uma só, eles
          seriam um controle para lugar nenhum. */}
      {fotos.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
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
