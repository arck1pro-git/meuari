import type { Etapa } from "@/lib/portal/dados";
import { etapasConcluidas, mediaDasEtapas } from "./andamento";

/**
 * O andamento dos projetos como grafico: rotulo pequeno, numero grande e uma
 * barra que atravessa a largura inteira.
 *
 * Um só, e na ficha — a aba Andamento chegou a abrir com ele e a repeti-lo por
 * frente, e o que se via primeiro eram quatro numeros grandes em vez da lista
 * que a aba existe para mostrar. O resumo mora onde se procura resumo.
 *
 * Devolve `null` sem etapa nenhuma: barra vazia com "0%" diria que a obra nao
 * andou, quando o que ha é obra sem projeto cadastrado.
 */
export function BarraDeAndamento({ etapas }: { etapas: Etapa[] }) {
  const media = mediaDasEtapas(etapas);
  if (media === null) return null;

  const concluidas = etapasConcluidas(etapas);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.625rem] font-semibold tracking-[0.08em] text-black uppercase">
            Andamento total da incorporação
          </p>
          {/* Continua sendo o maior numero do cartao — só que um degrau abaixo,
              junto com o resto dos textos daqui. */}
          <p className="mt-1.5 text-[1.625rem] leading-none font-bold tabular-nums text-black">
            {media.toFixed(0)}
            <span className="text-base font-semibold text-black">%</span>
          </p>
        </div>

        <p className="pb-0.5 text-right text-[0.6875rem] text-black">
          {concluidas} de {etapas.length}
          <br />
          {concluidas === 1 ? "finalizado" : "finalizados"}
        </p>
      </div>

      <div
        aria-hidden
        className="mt-3.5 h-2 overflow-hidden rounded-full bg-tinta/[0.07]"
      >
        {/* A marca final entra por variavel; ver `barra-ate` no `globals.css`.
            Só transform anima fora da thread principal. */}
        <div
          className="barra-ate barra-progresso h-full origin-left rounded-full"
          style={{ "--preenchimento": media / 100 } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
