"use client";

import { useFormStatus } from "react-dom";

/**
 * O botao de enviar de qualquer formulario do painel, com o estado de gravando.
 *
 * Ate aqui os formularios do /admin nao davam sinal nenhum: clicava-se em
 * "Salvar" e a tela ficava parada ate o servidor responder. Numa acao que
 * escreve no banco, valida, registra na auditoria e redireciona, isso sao uns
 * dois segundos de nada acontecendo — e o reflexo é clicar de novo, que era como
 * se lancava o mesmo credito duas vezes.
 *
 * `useFormStatus`, e nao um `useState` proprio: ele le o estado do \`<form>\` que
 * envolve este botao, entao o componente nao precisa saber qual acao roda nem
 * receber nada de quem o usa. Ele **tem** de ser filho do formulario — um irmao
 * do \`<form>\` sempre leria \`pending: false\`.
 *
 * O botao se desabilita enquanto envia. Nao é enfeite: é o que impede o segundo
 * clique, e por isso vale tambem para o "Excluir", que nao tem volta.
 */
export function BotaoEnviar({
  children,
  enviando,
  className,
  onClick,
}: {
  /** O texto normal do botao. */
  children: React.ReactNode;
  /** O texto enquanto grava. Ex.: "Salvando…". */
  enviando: string;
  className?: string;
  /** Para quem precisa confirmar antes — ver `BotaoExcluir`. */
  onClick?: (evento: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={onClick}
      // `aria-busy` para quem ouve a tela: sem ele o botao apenas emudece.
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-progress disabled:opacity-60`}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Girando />
          {enviando}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * O circulo girando.
 *
 * SVG de tracado, e nao uma borda com `animate-spin`: a borda exige um elemento
 * quadrado com fundo transparente, e dentro de um botao colorido ela vira um
 * anel de cor errada. Aqui o traco é `currentColor`, entao ele acompanha o texto
 * do botao onde quer que ele esteja.
 *
 * Quem pediu menos movimento no sistema recebe o circulo parado: a regra de
 * `prefers-reduced-motion` em `globals.css` zera a duracao de toda animacao, e
 * um spinner infinito é justamente o que ela existe para conter.
 */
function Girando() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="h-3.5 w-3.5 shrink-0 animate-spin"
      fill="none"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
