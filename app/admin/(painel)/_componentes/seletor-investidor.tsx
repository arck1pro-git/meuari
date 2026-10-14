"use client";

import type { Modalidade } from "@/lib/portal/dados";
import { Seletor } from "./seletor";

/**
 * Quem olhar, e sob qual modalidade.
 *
 * So escolhe — quem busca a serie e escreve a URL é o `BlocoDoInvestidor`, que
 * o usa. Ate aqui este seletor navegava (`router.push`), e a pagina inteira do
 * Dashboard era refeita no servidor a cada troca; a ancora `#investidor` na URL
 * existia so para devolver a rolagem ao bloco depois do recarregamento.
 *
 * Ambos preservam o outro valor ao mudar: trocar de modalidade nao pode jogar
 * de volta para o primeiro investidor da lista.
 */
export function SeletorDeInvestidor({
  investidores,
  selecionado,
  modalidade,
  aoTrocar,
}: {
  investidores: { id: string; nome: string }[];
  selecionado: string;
  modalidade: Modalidade;
  aoTrocar: (proxima: { id: string; modalidade: Modalidade }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seletor
        key={selecionado}
        rotuloAcessivel="Investidor"
        opcoes={investidores.map((i) => ({ valor: i.id, rotulo: i.nome }))}
        valorInicial={selecionado}
        aoEscolher={(id) => {
          if (id !== selecionado) aoTrocar({ id, modalidade });
        }}
        className="min-w-56 py-1.5"
      />

      {/* Dois botoes, e nao um segundo `select`: sao duas opcoes fixas e
          mutuamente exclusivas, e o par mostra as duas de uma vez — o `select`
          esconderia a que nao esta escolhida atras de um clique. */}
      <div
        role="group"
        aria-label="Modalidade"
        className="flex rounded-xl border border-zinc-200 bg-white p-0.5"
      >
        {(["mensal", "final"] as const).map((opcao) => {
          const ativa = opcao === modalidade;
          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={ativa}
              onClick={() => {
                if (!ativa) aoTrocar({ id: selecionado, modalidade: opcao });
              }}
              className={`rounded-[0.625rem] px-3 py-1 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul ${
                ativa
                  ? "bg-marinho text-white"
                  : "text-neutral-500 hover:bg-zinc-100 hover:text-tinta"
              }`}
            >
              {opcao === "mensal" ? "Mensal" : "Final"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
