/**
 * Icones das secoes. Traco de 1.75 e caixa de 24 para casar com o olho e o
 * kebab que ja existiam. `currentColor` em tudo — quem colore é o botao.
 */

const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** Curva ascendente: a evolucao do saldo. */
export function IconeInvestimento({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M3 17.5 9.5 11l4 4L21 7.5" />
      <path d="M15.5 7.5H21v5.5" />
    </svg>
  );
}

/** Sinal de mais: acrescentar. */
export function IconeMais({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

/** Seta para a direita: atalho para outra secao da mesma pagina. */
export function IconeSetaDireita({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/** Predio: a obra e os documentos do empreendimento. */
export function IconeTransparencia({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M3 21h18" />
      <path d="M6 21V6.5L12 3l6 3.5V21" />
      <path d="M10 21v-4.5h4V21" />
      <path d="M9.5 9h1m4 0h1m-6 3.5h1m4 0h1" />
    </svg>
  );
}
