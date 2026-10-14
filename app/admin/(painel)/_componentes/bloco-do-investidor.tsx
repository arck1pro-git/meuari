"use client";

import { useEffect, useRef, useState } from "react";
// So tipos: os dois modulos sao de servidor, e `import type` some na compilacao.
import type { SerieDoInvestidor } from "@/lib/admin/investidor";
import type { Modalidade } from "@/lib/portal/dados";
import {
  formatarCompetencia,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { Bloco } from "./blocos";
import { GraficoDoInvestidor } from "./graficos";
import { SeletorDeInvestidor } from "./seletor-investidor";

type Escolha = { id: string; modalidade: Modalidade };

/**
 * O contrato de um investidor, com a troca de investidor e de modalidade.
 *
 * **A primeira serie vem pronta do servidor**, no HTML da pagina — o bloco abre
 * cheio, sem esperar nada. As seguintes vem de `/admin/serie-do-investidor`,
 * uma consulta só, em vez de refazer o Dashboard inteiro a cada clique.
 *
 * Tres coisas que a navegacao antiga nao dava e esta da:
 *
 * - **Sinal de espera.** Clicar num nome e nada mudar por meio segundo é o que
 *   faz clicar de novo. Agora a serie anterior esmaece ate a nova chegar.
 * - **A ultima escolha vence.** Trocar de investidor duas vezes seguidas cancela
 *   o primeiro pedido (`AbortController`). Sem isso, a resposta mais lenta
 *   chegava por ultimo e o grafico mostrava a pessoa errada sob o nome certo.
 * - **A rolagem fica onde esta.** A URL muda por `history.replaceState`, sem
 *   navegar: o link continua dando para mandar, e a tela nao pula.
 */
export function BlocoDoInvestidor({
  investidores,
  inicial,
  competenciaAtual,
}: {
  investidores: { id: string; nome: string }[];
  inicial: Escolha & { serie: SerieDoInvestidor | null };
  /** `AAAA-MM` de hoje, vindo do servidor. */
  competenciaAtual: string;
}) {
  const [escolha, setEscolha] = useState<Escolha>({
    id: inicial.id,
    modalidade: inicial.modalidade,
  });
  const [serie, setSerie] = useState(inicial.serie);
  const [estado, setEstado] = useState<"pronto" | "carregando" | "erro">(
    "pronto",
  );
  const pedido = useRef<AbortController | null>(null);

  // Saiu da tela no meio de um pedido: a resposta nao tem mais onde cair.
  useEffect(() => () => pedido.current?.abort(), []);

  async function trocar(proxima: Escolha) {
    setEscolha(proxima);
    setEstado("carregando");

    pedido.current?.abort();
    const controle = new AbortController();
    pedido.current = controle;

    /*
     * A URL acompanha a escolha, para o link e o recarregar abrirem no mesmo
     * investidor. `replaceState`, e nao `pushState`: trocar de pessoa é mudar o
     * que se olha, e nao uma pagina nova — encher o historico faria o "voltar"
     * passear por todos os nomes clicados antes de sair do Dashboard.
     */
    const url = new URL(window.location.href);
    url.searchParams.set("i", proxima.id);
    url.searchParams.set("m", proxima.modalidade);
    url.hash = "";
    window.history.replaceState(window.history.state, "", url);

    try {
      const resposta = await fetch(
        `/admin/serie-do-investidor?${new URLSearchParams({
          i: proxima.id,
          m: proxima.modalidade,
        })}`,
        { signal: controle.signal, cache: "no-store" },
      );
      if (!resposta.ok) throw new Error(`status ${resposta.status}`);

      const corpo = (await resposta.json()) as {
        serie: SerieDoInvestidor | null;
      };
      setSerie(corpo.serie);
      setEstado("pronto");
    } catch (erro) {
      // Cancelado por uma escolha mais nova: quem responde agora é ela.
      if (controle.signal.aborted) return;
      console.error("[dashboard] serie do investidor:", erro);
      setEstado("erro");
    }
  }

  const carregando = estado === "carregando";

  return (
    <div id="investidor" className="escalonar mt-4 scroll-mt-6">
      <Bloco
        titulo="Contrato do investidor"
        apoio={
          serie
            ? serie.modalidade === "mensal"
              ? "O crédito de cada ciclo. Cheio o que foi lançado, âmbar a projeção."
              : "O saldo mês a mês — capital mais o resultado retido até o resgate."
            : undefined
        }
        acessorio={
          <SeletorDeInvestidor
            investidores={investidores}
            selecionado={escolha.id}
            modalidade={escolha.modalidade}
            aoTrocar={trocar}
          />
        }
      >
        {/* `aria-busy` para quem ouve: sem ele, o grafico velho esmaecido
            seria lido como se fosse o novo. */}
        <div
          aria-busy={carregando}
          className={`transition-opacity duration-200 ${
            carregando ? "pointer-events-none opacity-45" : ""
          }`}
        >
          {estado === "erro" ? (
            <div className="py-16 text-center text-sm text-neutral-500">
              Não deu para carregar este contrato.{" "}
              <button
                type="button"
                onClick={() => trocar(escolha)}
                className="font-semibold text-marinho underline-offset-2 hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-azul"
              >
                Tentar de novo
              </button>
            </div>
          ) : serie ? (
            <>
              <dl className="mb-5 flex flex-wrap gap-x-8 gap-y-3">
                <Resumo
                  rotulo="Capital"
                  valor={formatarMoeda(serie.capital)}
                  apoio={`${serie.contratos} ${serie.contratos === 1 ? "contrato" : "contratos"}`}
                />
                <Resumo
                  rotulo="Participação"
                  valor={formatarPercentual(serie.taxa)}
                  apoio="vigente hoje"
                />
                <Resumo
                  rotulo={
                    serie.modalidade === "mensal" ? "Já pago" : "Saldo hoje"
                  }
                  valor={formatarMoeda(serie.ateAgora)}
                  apoio={
                    serie.modalidade === "mensal"
                      ? "créditos lançados"
                      : "capital + retido"
                  }
                />
                <Resumo
                  rotulo={
                    serie.modalidade === "mensal"
                      ? "Total no prazo"
                      : "No resgate"
                  }
                  valor={formatarMoeda(serie.aoFim)}
                  apoio={`projetado até ${formatarCompetencia(serie.fimDoPrazo)}`}
                />
              </dl>

              <GraficoDoInvestidor
                pontos={serie.pontos}
                modalidade={serie.modalidade}
                competenciaAtual={competenciaAtual}
              />
            </>
          ) : (
            /* Vazio explicando, e nao grafico de zeros: hoje ninguem tem
               contrato `final`, e um eixo achatado no zero pareceria defeito
               em vez de ausencia. */
            <p className="py-16 text-center text-sm text-neutral-500">
              Este investidor não tem contrato{" "}
              <span className="font-semibold text-tinta">
                {escolha.modalidade === "mensal" ? "mensal" : "no final"}
              </span>
              .{" "}
              {escolha.modalidade === "final"
                ? "Nenhum contrato dessa modalidade foi cadastrado ainda."
                : "Veja a outra modalidade acima."}
            </p>
          )}
        </div>
      </Bloco>
    </div>
  );
}

/**
 * Um numero da faixa que abre o bloco do investidor.
 *
 * Em linha, e nao na grade dividida da faixa do topo: sao quatro numeros sobre
 * uma pessoa só, e eles se leem como uma frase — capital, participacao, o que ja
 * saiu, o que ainda sai.
 */
function Resumo({
  rotulo,
  valor,
  apoio,
}: {
  rotulo: string;
  valor: string;
  apoio: string;
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold tracking-wider text-neutral-400 uppercase">
        {rotulo}
      </dt>
      <dd className="mt-1 text-lg font-bold tabular-nums text-tinta">
        {valor}
      </dd>
      {/* `dd`, e nao `p`: dentro de um grupo do `<dl>` so cabem `dt` e `dd`. */}
      <dd className="text-xs text-neutral-400">{apoio}</dd>
    </div>
  );
}
