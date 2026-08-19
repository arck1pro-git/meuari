"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconeFechar } from "@/app/(app)/portal/_componentes/icones";

/**
 * A folha que cobre a tela — todo formulario de "novo alguma coisa" mora nela.
 *
 * `<dialog>` nativo com `showModal()`: Esc fecha, o foco fica preso dentro, o
 * resto da pagina fica inerte, e ela sobe para a *top layer* — entao ignora
 * `z-index` e `overflow` de quem estiver por perto. Uma `div` posicionada nao
 * daria nenhuma dessas quatro coisas sem codigo.
 *
 * **Quem manda é a URL, e nao um `useState`.** Este componente só existe quando
 * a pagina renderiza com o parametro certo (`?novo=1`, `?editar=<id>`,
 * `?lancar=1`), e fechar significa navegar para a URL sem ele. É o que faz o
 * link ser compartilhavel, o botao de voltar funcionar e o servidor devolver o
 * conteudo ja pronto — inclusive quando uma acao redireciona de volta com o
 * parametro ainda ali, como o lancamento de credito faz.
 *
 * O conteudo chega pronto do servidor, como `children`: a folha nao busca nada
 * ao abrir. É o que permite um formulario com `<select>` de quinhentas opcoes
 * abrir instantaneo.
 */
export function Folha({
  fechar,
  titulo,
  largura = "max-w-2xl",
  children,
}: {
  /** Para onde ir ao fechar — a mesma URL, sem o parametro que a abriu. */
  fechar: string;
  /** O nome da folha para quem ouve a tela. */
  titulo: string;
  /** A largura maxima no desktop. Formulario longo pede mais que uma lista. */
  largura?: string;
  children: React.ReactNode;
}) {
  const folha = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  /*
   * Abre no primeiro render. `showModal()` nao pode vir do servidor, e o
   * atributo `open` renderiza a folha **sem** modal — sem fundo, sem foco preso
   * e sem top layer, que sao justamente as quatro coisas pelas quais ela existe.
   */
  useEffect(() => {
    const atual = folha.current;
    if (atual && !atual.open) atual.showModal();
  }, []);

  return (
    <dialog
      ref={folha}
      aria-label={titulo}
      // `onClose` cobre as tres saidas de uma vez: Esc, o botao de fechar e o
      // clique no fundo. Todas terminam na mesma navegacao.
      onClose={() => router.push(fechar)}
      // Clique no fundo fecha; dentro da folha, nao.
      onClick={(evento) => {
        if (evento.target === folha.current) folha.current?.close();
      }}
      /*
       * Sobe pela base no celular (`mt-auto`, cantos so em cima) e vira caixa
       * centrada no desktop — a mesma folha, duas formas, porque o polegar
       * alcanca a base e o mouse nao precisa disso.
       */
      className={`folha-documentos mt-auto mb-0 max-h-[88dvh] w-full ${largura} border-0 bg-white p-0 text-tinta shadow-[0_-12px_40px_-12px_rgba(0,20,73,0.45)] backdrop:bg-tinta/60 backdrop:backdrop-blur-sm open:animate-subir-folha sm:m-auto sm:rounded-2xl max-sm:rounded-t-2xl`}
    >
      {/* O fechar fica preso no topo: o conteudo rola por baixo dele, e num
          formulario de doze campos o botao sairia de vista no primeiro giro. */}
      <button
        type="button"
        onClick={() => folha.current?.close()}
        aria-label="Fechar"
        className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-500 backdrop-blur transition-colors duration-200 hover:bg-zinc-100 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
      >
        <IconeFechar className="h-4 w-4" />
      </button>

      <div className="max-h-[88dvh] overflow-y-auto overscroll-contain p-5 sm:p-6">
        {children}
      </div>
    </dialog>
  );
}
