"use client";

import { useRouter } from "next/navigation";
import type { Modalidade } from "@/lib/portal/dados";
import { Seletor } from "./seletor";

/**
 * Quem olhar, e sob qual modalidade.
 *
 * O estado é a URL (`?i=<id>&m=mensal`), como no filtro da listagem: assim o
 * link vai por mensagem para outra pessoa ja apontando para o contrato certo, o
 * botao de voltar funciona, e a pagina — que é `force-dynamic` — refaz a
 * consulta no servidor com a serie pronta. Guardar isto num `useState` obrigaria
 * a trazer a serie de todos os investidores para o navegador so para escolher
 * uma.
 *
 * Ambos preservam o outro parametro ao mudar: trocar de modalidade nao pode
 * jogar de volta para o primeiro investidor da lista.
 */
export function SeletorDeInvestidor({
  investidores,
  selecionado,
  modalidade,
  destino,
}: {
  investidores: { id: string; nome: string }[];
  selecionado: string;
  modalidade: Modalidade;
  /** Rota do painel, sem query. */
  destino: string;
}) {
  const router = useRouter();

  function ir(proximo: { i?: string; m?: Modalidade }) {
    const busca = new URLSearchParams({
      i: proximo.i ?? selecionado,
      m: proximo.m ?? modalidade,
    });
    /*
     * A ancora leva de volta ao bloco depois do recarregamento. Sem ela, a
     * pagina volta ao topo a cada troca e o grafico — que fica la embaixo — sai
     * de vista justamente quando se quer compara-lo.
     */
    router.push(`${destino}?${busca}#investidor`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seletor
        key={selecionado}
        rotuloAcessivel="Investidor"
        opcoes={investidores.map((i) => ({ valor: i.id, rotulo: i.nome }))}
        valorInicial={selecionado}
        aoEscolher={(i) => ir({ i })}
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
              onClick={() => ir({ m: opcao })}
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
