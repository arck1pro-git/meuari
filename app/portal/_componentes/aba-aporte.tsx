"use client";

import Link from "next/link";
import type { ItemDoHistorico } from "@/lib/portal/calculo";
import type { Recebimentos } from "@/lib/portal/recebimentos";
import { formatarMoeda } from "@/lib/portal/formato";
import { GraficoRecebimentos } from "./grafico-recebimentos";
import { IconeSetaDireita } from "./icones";
import { ListaHistorico } from "./lista-historico";
import { Cartao } from "./ui";

/** Quantos aportes cabem no recorte do portal. O resto fica no "Ver tudo". */
const VISIVEIS = 3;

export function AbaAporte({
  historico,
  recebimentos,
  competenciaAtual,
  verTudoHref,
}: {
  historico: ItemDoHistorico[];
  recebimentos: Recebimentos;
  /** `AAAA-MM` de hoje, apurado no banco. So atravessa ate o grafico. */
  competenciaAtual: string;
  /** Leva a `/portal/historico`, carregando o filtro de empreendimento. */
  verTudoHref: string;
}) {
  return (
    <div className="escalonar space-y-4">
      {/*
       * "Meu ARI" era a evolucao do saldo, num cartao azul, e "Recebimentos"
       * era o que caiu na conta, num cartao claro logo abaixo. Viraram um só:
       * o nome e o cartao azul do primeiro, o grafico e os numeros do segundo.
       *
       * Titulo e cartao num invólucro só: `escalonar` atrasa cada filho direto
       * do container, e soltos aqui eles entrariam em tempos diferentes.
       */}
      <div id="recebimentos" className="scroll-mt-24">
        <h2 className="mb-5 text-base font-bold tracking-tight text-black">
          Meu ARI
        </h2>
        <Cartao tom="escuro">
          {recebimentos.pagamentos.length > 0 ? (
            <>
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm text-white/75">Total recebido</p>
                <p className="text-lg font-semibold tabular-nums text-white">
                  {formatarMoeda(recebimentos.totalPago)}
                </p>
              </div>

              {/* Só o grafico. A participacao de cada ciclo — e o rateio,
                  quando a taxa muda no meio — continua no toque da barra. */}
              <GraficoRecebimentos
                pagamentos={recebimentos.pagamentos}
                competenciaAtual={competenciaAtual}
                tom="escuro"
              />
            </>
          ) : (
            // O grafico precisa de pelo menos um credito para existir; sem
            // nenhum ele nao é desenhado vazio, é substituido.
            <p className="py-10 text-center text-sm text-white/75">
              O gráfico aparece aqui quando o seu primeiro crédito for
              registrado.
            </p>
          )}
        </Cartao>
      </div>

      {/* A ancora passa para o invólucro, e nao fica no cartao: assim a rolagem
          para nele com o titulo visivel, e nao logo abaixo dele. O `scroll-mt`
          vem junto, porque era o `Cartao` quem o trazia. */}
      <div id="historico" className="mt-10 scroll-mt-24">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight text-black">
            Historico
          </h2>

          {/* Mesma forma do atalho do cartao de saldo. Só aparece quando ha o
              que ver alem do recorte — senao levaria a uma copia da tela. */}
          {historico.length > VISIVEIS && (
            <Link
              href={verTudoHref}
              className="group inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
            >
              Ver tudo
              <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        <ListaHistorico itens={historico.slice(0, VISIVEIS)} />
      </div>
    </div>
  );
}
