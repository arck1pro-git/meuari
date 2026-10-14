"use client";

import { useEffect, useState } from "react";
import {
  IconeConfere,
  IconeFechar,
} from "@/app/(app)/portal/_componentes/icones";

/** Quanto tempo o aviso fica na tela antes de sair sozinho. */
const DURACAO = 4500;

/**
 * O aviso passageiro de "deu certo": criado, salvo, excluido.
 *
 * Ate aqui gravar no painel nao dava retorno nenhum. A folha fechava, a lista
 * voltava, e quem queria saber se tinha salvo precisava procurar a linha — numa
 * tabela de duzentas, e em ordem de data, nem sempre ela esta no topo.
 *
 * **Passageiro so o que deu certo.** Erro continua sendo faixa fixa na pagina:
 * ele pede uma acao, e uma mensagem que some sozinha enquanto a pessoa le é o
 * pior jeito de dar uma noticia ruim.
 *
 * Ao aparecer, tira da URL os parametros que o trouxeram (`limpar`). Sem isso,
 * recarregar a pagina mostraria "Contrato criado" de novo, e o botao de voltar
 * reabriria o aviso de uma acao que ja passou. `history.replaceState` troca o
 * endereco sem navegar — o Next acompanha a troca, e a pagina nao refaz nada.
 */
export function AvisoPassageiro({
  texto,
  limpar,
}: {
  texto: string;
  /** Os parametros da URL que pertencem a este aviso. */
  limpar: string[];
}) {
  const [visivel, setVisivel] = useState(true);
  // Texto, e nao a lista: um array novo a cada render reexecutaria o efeito.
  const chaves = limpar.join(",");

  useEffect(() => {
    const url = new URL(window.location.href);
    for (const chave of chaves.split(",")) url.searchParams.delete(chave);
    window.history.replaceState(window.history.state, "", url);

    const saida = window.setTimeout(() => setVisivel(false), DURACAO);
    return () => window.clearTimeout(saida);
  }, [chaves]);

  if (!visivel) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 flex max-w-sm animate-subir-folha items-center gap-3 rounded-xl bg-tinta py-3 pr-2 pl-4 text-sm font-medium text-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.45)] sm:right-6 sm:bottom-6"
    >
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-verde"
      >
        <IconeConfere className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">{texto}</span>
      <button
        type="button"
        onClick={() => setVisivel(false)}
        aria-label="Fechar aviso"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <IconeFechar className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
