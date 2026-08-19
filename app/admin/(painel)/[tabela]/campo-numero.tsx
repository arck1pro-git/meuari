"use client";

import { useState } from "react";

/**
 * O campo de dinheiro e o de participacao, que se formatam sozinhos.
 *
 * Digita-se `3` e sai `3%`. Digita-se `1234,5` e sai `1.234,50`. A formatacao
 * acontece ao sair do campo — durante a digitacao ela atrapalharia, porque o
 * cursor pularia a cada separador inserido.
 *
 * **A tela é só apresentacao.** O que vai no `name` é o proprio texto visivel, e
 * quem converte é o servidor (`valorDoCampo`, em `lib/admin/crud.ts`): ele
 * aceita `3%`, `3`, `1.234,56` e `1234.56`, e é ele que divide o percentual por
 * 100. Nao ha campo escondido com um segundo valor.
 *
 * O motivo de ser assim, e nao o contrario: com a conversao no navegador, um
 * envio sem JavaScript gravaria `3` no lugar de `0,03` — trezentos por cento ao
 * mes. Formatacao que se perde é cosmetica; conversao que se perde é dinheiro
 * errado no banco.
 *
 * `type="text"`, e nao `number`: o `number` recusa `1.234,56` e o `%`, e no
 * Firefox ele aceita texto qualquer e devolve string vazia — o valor sumiria sem
 * aviso. `inputMode="decimal"` mantem o teclado numerico no celular.
 */

/** O mesmo desenho dos outros campos do formulario. */
const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-tinta tabular-nums transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul";

/**
 * Le o que a pessoa digitou. A regra é a mesma do servidor, e de proposito: os
 * dois precisam concordar sobre o que `1.234,56` significa.
 */
function paraNumero(texto: string): number | null {
  const limpo = texto.replace(/[R$%\s  ]/gi, "").replace(/^\+/, "");
  if (limpo === "") return null;

  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

const moeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * `2.6` -> `2,6%`.
 *
 * Ate tres casas, e sem zero a direita: a participacao é `2,6%` e nao
 * `2,600%`. Tres porque o banco guarda cinco casas no decimal, que sao tres no
 * percentual — mais que isso nao caberia de qualquer jeito.
 */
function formatarPercentual(n: number): string {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%`;
}

export function CampoNumero({
  nome,
  rotulo,
  valorInicial,
  formato,
  obrigatorio,
  ajuda,
}: {
  nome: string;
  rotulo: string;
  /** Ja no formato de exibicao — o servidor o preparou. */
  valorInicial: string;
  formato: "dinheiro" | "percentual";
  obrigatorio?: boolean;
  ajuda?: string;
}) {
  const [texto, setTexto] = useState(valorInicial);

  function formatar() {
    const n = paraNumero(texto);
    // Campo vazio continua vazio: em `taxa` do aditivo isso significa "segue a
    // do contrato", e escrever `0%` ali mudaria o sentido.
    if (n === null) {
      setTexto("");
      return;
    }
    setTexto(formato === "dinheiro" ? moeda.format(n) : formatarPercentual(n));
  }

  return (
    <label className="block">
      <span className="text-xs font-semibold text-neutral-600">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden className="text-red-600"> *</span>
        )}
      </span>

      <input
        name={nome}
        id={nome}
        type="text"
        inputMode="decimal"
        required={obrigatorio}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onBlur={formatar}
        // Sem `placeholder` de exemplo formatado: ele parece valor preenchido no
        // campo vazio, e este formulario ja perdeu um contrato assim.
        placeholder={formato === "dinheiro" ? "0,00" : "0%"}
        className={CLASSE_CAMPO}
      />

      {ajuda && (
        <span className="mt-1 block text-xs text-neutral-400">{ajuda}</span>
      )}
    </label>
  );
}
