"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "./_componentes/cabecalho";

/**
 * A tela de falha do painel.
 *
 * Ate aqui o /admin nao tinha uma: qualquer excecao — o banco fora do ar, o n8n
 * respondendo torto — caia na tela padrao do Next, branca, em ingles, **sem a
 * coluna da esquerda**. Quem administra perdia o painel inteiro de vista e a
 * unica saida era o botao de voltar do navegador.
 *
 * Vivendo aqui, dentro de `(painel)`, ela ocupa so o lugar do conteudo: a
 * coluna continua no lugar, e qualquer outra secao esta a um clique.
 *
 * Valor digitado errado **nao** chega aqui — volta para o formulario aberto,
 * com a frase do que corrigir (ver `destinoDaRecusa`, em `app/admin/acoes.ts`).
 * O que sobra para esta tela é o que a pessoa nao tem como consertar.
 *
 * A mensagem do erro nao aparece: em producao o Next a troca por um texto
 * generico, justamente para nao vazar detalhe do servidor. O que se mostra é o
 * `digest`, que casa com a linha do log — é o que alguem do suporte pede.
 */
export default function ErroDoPainel({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto mt-10 max-w-xl animate-surgir rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-lg font-bold text-amber-700 ring-1 ring-amber-200"
      >
        !
      </span>
      <h1 className="mt-4 text-xl font-bold tracking-tight text-tinta">
        Esta tela não carregou
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Algo falhou do lado do servidor. Se você estava salvando, confira na
        lista se a alteração entrou antes de repetir — ela pode ter sido
        gravada mesmo assim.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => retry()} className={BOTAO_PRIMARIO}>
          Tentar de novo
        </button>
        <Link href="/admin" className={BOTAO_SECUNDARIO}>
          Ir para o Dashboard
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 border-t border-zinc-100 pt-4 text-xs text-neutral-400">
          Código para o suporte:{" "}
          <span className="font-mono text-neutral-500 select-all">
            {error.digest}
          </span>
        </p>
      )}
    </section>
  );
}
