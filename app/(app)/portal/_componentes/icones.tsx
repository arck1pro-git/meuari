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

/** Seta para baixo entrando numa base: baixar o arquivo. */
export function IconeBaixar({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19h14" />
    </svg>
  );
}

/** Pessoa: quem tem conta. */
export function IconePessoa({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </svg>
  );
}

/** Pasta: o que foi publicado. */
export function IconePasta({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h3.7l1.8 2h7.5A1.5 1.5 0 0 1 20 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    </svg>
  );
}

/** Sino: o aviso. */
export function IconeSino({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M18 16H6l1.3-2.2V10a4.7 4.7 0 0 1 9.4 0v3.8z" />
      <path d="M10.2 19a2 2 0 0 0 3.6 0" />
    </svg>
  );
}

/** Seta subindo sobre um degrau: o que cresce. */
export function IconeSubindo({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M4 16.5 9.5 11l3.5 3.5L20 7.5" />
      <path d="M15 7.5h5v5" />
    </svg>
  );
}

/** Porcentagem: a participacao. */
export function IconePorcentagem({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="m6 18 12-12" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

/** Alfinete: onde a obra fica. */
export function IconeLocal({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/** Predio: o estagio do empreendimento. */
export function IconeObra({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M4 21V6.5L12 3v18" />
      <path d="M12 9h8v12" />
      <path d="M7.5 9v0M7.5 13v0M7.5 17v0" />
      <path d="M16 13v0M16 17v0" />
    </svg>
  );
}

/** Relogio: quando isto mudou pela ultima vez. */
export function IconeRelogio({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </svg>
  );
}

/** Setas para os cantos: ver a foto em tela cheia. */
export function IconeExpandir({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M9 4H4v5" />
      <path d="M15 4h5v5" />
      <path d="M15 20h5v-5" />
      <path d="M9 20H4v-5" />
    </svg>
  );
}

/** X: fecha o que estiver aberto por cima. */
export function IconeFechar({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

/** Confere: a etapa fechou. */
export function IconeConfere({ className = "h-5 w-5" }) {
  return (
    <svg {...BASE} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
