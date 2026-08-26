import type { Etapa } from "@/lib/portal/dados";
import {
  IconeConfere,
  IconeTransparencia,
} from "../../portal/_componentes/icones";

/**
 * Os projetos em dois quadros, lado a lado: o que ja passou e o que ainda esta
 * em analise.
 *
 * A divisao é por **estagio**, e nao por disciplina. Chegou a ser por frente —
 * projeto, aprovacoes, marketing —, e a pergunta que a tela responde nao era
 * essa: quem abre a obra quer saber o que ja esta aprovado e o que falta, e nao
 * a qual departamento cada papel pertence.
 *
 * A rolagem é a do proprio navegador — `snap` para a coluna parar no lugar,
 * `overscroll-x-contain` para o arraste no fim nao virar o gesto de "voltar".
 * Nada de `pointermove` escrito a mao: assim o toque tem a inercia do sistema, e
 * o trackpad, a roda do mouse e o teclado funcionam de graca.
 */

/** Um projeto so sai de "em aprovacao" quando fecha os 100%. */
const CONCLUIDO = 100;

const QUADROS = [
  {
    titulo: "Aprovados",
    apoio: "Concluídos e protocolados",
    concluidos: true,
  },
  {
    titulo: "Em aprovação final",
    apoio: "Em análise nos órgãos",
    concluidos: false,
  },
] as const;

export function QuadrosDaObra({ etapas }: { etapas: Etapa[] }) {
  if (etapas.length === 0) {
    return (
      <p className="sombra-cartao rounded-[20px] md:rounded-lg bg-white px-6 py-10 text-center text-sm text-neutral-500">
        O andamento dos projetos ainda não foi publicado.
      </p>
    );
  }

  return (
    /*
     * Sangra ate a borda da tela: o `px` devolve o alinhamento do conteudo, e o
     * `-mx` deixa a coluna escorrer para fora quando arrastada. Sem isso a
     * ultima coluna encostaria numa parede invisivel antes da borda.
     */
    <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
      {QUADROS.map((quadro) => {
        const doQuadro = etapas.filter((e) =>
          quadro.concluidos
            ? e.percentual >= CONCLUIDO
            : e.percentual < CONCLUIDO,
        );
        if (doQuadro.length === 0) return null;

        return (
          <section
            key={quadro.titulo}
            /*
             * Largura por porcentagem da tela, e nao fixa: no celular a coluna
             * ocupa 82% e a vizinha aparece pela beirada — é ela que diz que ha
             * mais para o lado. No desktop as duas cabem juntas.
             */
            className="sombra-cartao w-[82%] shrink-0 snap-start rounded-[20px] md:rounded-lg bg-white p-4 sm:w-[calc((100%-1rem)/2)]"
          >
            <header className="mb-3.5 flex items-baseline justify-between gap-2 px-1">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold tracking-tight text-black">
                  {quadro.titulo}
                </h3>
                <p className="mt-0.5 truncate text-[0.6875rem] text-neutral-500">
                  {quadro.apoio}
                </p>
              </div>

              {/* O contador de coluna que todo quadro tem, e que evita contar
                  linha a linha. */}
              <span className="shrink-0 rounded-full bg-tinta/[0.05] px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-neutral-500">
                {doQuadro.length}
              </span>
            </header>

            <ul className="grid grid-cols-1 gap-2">
              {doQuadro.map((etapa) => {
                const fechou = etapa.percentual >= CONCLUIDO;
                return (
                  <li
                    key={etapa.id}
                    className="rounded-xl bg-tinta/[0.03] px-3.5 py-3 transition-colors duration-200 hover:bg-tinta/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex min-w-0 items-center gap-1.5 text-sm text-black">
                        {/* O confere só no que fechou: um icone por linha
                            viraria ruido, e aqui ele marca a excecao. */}
                        {fechou && (
                          <IconeConfere className="h-4 w-4 shrink-0 text-verde" />
                        )}
                        <span className="truncate">{etapa.nome}</span>
                      </p>

                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="text-sm font-bold tabular-nums text-black">
                          {etapa.percentual.toFixed(0)}%
                        </span>

                        {/*
                         * O papel que comprova a etapa — laudo, ART, medicao.
                         *
                         * So aparece na etapa que tem um. Um botao apagado em
                         * toda linha prometeria um documento que nao existe, e
                         * a ausencia dele ja é a resposta.
                         *
                         * `<a>`, e nao `<button>`: o destino é um endereco, e
                         * quem clica espera poder abrir em outra aba. Ele leva
                         * a `/arquivo/etapa/{id}`, que confere a posse de novo
                         * no servidor, registra quem abriu e so entao assina —
                         * o link daqui nao é o arquivo, é o pedido dele.
                         *
                         * O alvo de toque é 32px, acima do minimo confortavel,
                         * mesmo com o icone desenhando 16.
                         */}
                        {etapa.documento && (
                          <a
                            href={etapa.documento}
                            download
                            aria-label={`Baixar o documento da etapa ${etapa.nome}`}
                            title="Baixar documento"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors duration-200 hover:bg-tinta/[0.06] hover:text-marinho focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                          >
                            <IconeTransparencia className="h-4 w-4" />
                          </a>
                        )}
                      </span>
                    </div>

                    {/*
                     * A mesma barra do cartao de informacoes, um degrau menor:
                     * 6px de trilha, canto redondo e a marca final entrando por
                     * variavel — ver `barra-ate` no `globals.css`. A cor diz o
                     * estagio: verde no que fechou, azul no que corre.
                     */}
                    <div
                      aria-hidden
                      className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-tinta/[0.07]"
                    >
                      <div
                        className={`barra-ate h-full origin-left rounded-full ${
                          fechou ? "bg-verde" : "bg-azul"
                        }`}
                        style={
                          {
                            "--preenchimento": etapa.percentual / 100,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
