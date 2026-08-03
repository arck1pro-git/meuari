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

/** Moeda: o dinheiro aportado e o saldo. */
export function IconeInvestimento({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M14.6 9.6c-.5-.9-1.5-1.4-2.6-1.4-1.6 0-2.6.8-2.6 1.9 0 1.2 1 1.7 2.7 2.1 1.8.4 2.9.9 2.9 2.2 0 1.2-1.1 2-2.8 2-1.2 0-2.2-.5-2.8-1.3" />
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

/** Fotos empilhadas: a galeria da obra. */
export function IconeGaleria({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <circle cx="7.5" cy="10" r="1.2" />
      <path d="m3.5 15.5 3.7-3.2a1.6 1.6 0 0 1 2.1 0L17 18" />
      <path d="M20 8v9a2 2 0 0 1-2 2H8" />
    </svg>
  );
}

/** Calculadora: o simulador. */
export function IconeSimulador({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 7.5h7" />
      <path d="M9 12h.01M12 12h.01M15 12h.01" />
      <path d="M9 16h.01M12 16h.01M15 16h.01" />
    </svg>
  );
}

/** Seta para a esquerda: voltar da ficha para a lista. */
export function IconeSetaEsquerda({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M20 12H5" />
      <path d="m11 6-6 6 6 6" />
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

/**
 * Documento com a ponta dobrada: os relatorios e papeis do empreendimento.
 * Duas linhas de texto, e nao tres — no rodape o traco vai a 2.5 e uma terceira
 * fecharia o miolo do icone.
 */
export function IconeTransparencia({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13.5h6" />
      <path d="M9 17h4" />
    </svg>
  );
}
