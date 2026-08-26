"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { DialogoDeAporte } from "@/app/(app)/portal/_componentes/dialogo-aporte";
import {
  IconePorcentagem,
  IconeSetaDireita,
  IconeSubindo,
} from "@/app/(app)/portal/_componentes/icones";
import { formatarMoedaCurta, formatarPercentual } from "@/lib/portal/formato";
import { simular, type ContratoParaSimular } from "@/lib/portal/simulacao";

/**
 * O simulador do aditivo: quanto rende um aporte novo no contrato que a pessoa
 * ja tem.
 *
 * A tela é a mesma da obra — fundo cinza, cartoes de canto 20, rotulo miudo em
 * caixa alta sobre valor grande. Muda o conteudo, e nao a casa.
 *
 * **Uma pergunta só: quanto.** Prazo e forma de retorno chegaram a ser botoes
 * aqui e sairam — vem do contrato assinado, e perguntar de novo o que ja esta
 * no papel transforma uma resposta em formulario.
 *
 * Duas superficies, e cada uma com um papel: a pergunta em cartao branco, a
 * resposta no degrade da marca. Elas nunca aparecem juntas — ver `Fase`.
 */

/** `50000` -> `50.000`. Sem centavos: aporte nao tem quebrado. */
function comSeparador(valor: number): string {
  return valor === 0 ? "" : valor.toLocaleString("pt-BR");
}

/**
 * Em que ponto da conversa a tela esta.
 *
 * `calculando` existe por escolha de produto, e nao por necessidade tecnica: a
 * conta é instantanea. Sao tres segundos em que a tela mostra que esta fazendo
 * alguma coisa — o mesmo motivo pelo qual caixa eletronico demora a contar
 * dinheiro que ja contou. É tambem o estado de carregando do botao "Simular":
 * ele nao pisca um spinner e sai; quem carrega é o cartao inteiro, no lugar
 * dele.
 */
type Fase = "entrada" | "calculando" | "resultado";

const DEMORA_DA_CONTA = 3000;

/** Quanto tempo o numero leva subindo ate o valor final. */
const DURACAO_DA_CONTAGEM = 800;

/**
 * O numero subindo ate o valor.
 *
 * Serve a leitura, e nao ao enfeite: o olho acompanha o valor crescendo e sabe
 * que aquilo acabou de ser calculado, sem precisar de um "novo!" escrito ao
 * lado. Quem pediu menos movimento no sistema recebe o valor direto — a
 * consulta de `prefers-reduced-motion` é a mesma que o resto do app respeita.
 */
function semMovimento(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useContagem(alvo: number, rodar: boolean): number {
  // O estado nasce em zero para a contagem ter de onde subir. Quem pediu menos
  // movimento nasce ja no valor — e o efeito abaixo fecha em um quadro.
  const [valor, setValor] = useState(() =>
    rodar && !semMovimento() ? 0 : alvo,
  );
  const anterior = useRef(0);

  useEffect(() => {
    if (!rodar) {
      anterior.current = alvo;
      return;
    }

    /*
     * Duracao zero em vez de um `setValor` direto: `setState` sincrono dentro
     * de efeito dispara renderizacao em cascata (e o lint recusa). Com um
     * quadro só, quem pediu menos movimento recebe o valor final sem animacao
     * nenhuma, pelo mesmo caminho de codigo.
     */
    const duracao = semMovimento() ? 0 : DURACAO_DA_CONTAGEM;
    const de = anterior.current;
    const inicio = performance.now();
    let quadro = 0;

    function passo(agora: number) {
      const t = duracao === 0 ? 1 : Math.min(1, (agora - inicio) / duracao);
      // Saida cubica: chega quase inteiro no primeiro terco e assenta no fim,
      // que é a curva de quem freia — e nao de quem para de repente.
      const suave = 1 - Math.pow(1 - t, 3);
      setValor(de + (alvo - de) * suave);
      if (t < 1) quadro = requestAnimationFrame(passo);
      else anterior.current = alvo;
    }

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, rodar]);

  return rodar ? valor : alvo;
}

/**
 * O cifrao 3D da familia de `public/icons`, no lugar da moeda desenhada a
 * traco.
 *
 * 16px é o teto util para ele: abaixo disso o volume vira borrao colorido, e
 * como o rotulo ao lado tem 10px, um icone maior deixaria de acompanhar a linha
 * e passaria a comanda-la.
 */
function CifraoTresD() {
  return (
    <Image
      src="/icons/3dicons-dollar-dynamic-color.png"
      alt=""
      width={96}
      height={96}
      className="h-4 w-4 shrink-0"
    />
  );
}

/**
 * Rotulo miudo em caixa alta — a menor peca da hierarquia.
 *
 * O icone entra do lado, do tamanho da letra: ele é marcador de assunto, e nao
 * ilustracao. Maior, roubaria o olho do numero logo abaixo, que é quem importa.
 */
function Rotulo({
  children,
  icone,
  escuro = false,
}: {
  children: React.ReactNode;
  icone?: React.ReactNode;
  escuro?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-1.5 text-[0.625rem] leading-none font-semibold tracking-[0.1em] uppercase ${
        escuro ? "text-white/55" : "text-neutral-500"
      }`}
    >
      {icone}
      {children}
    </p>
  );
}

export function Simulador({ contratos }: { contratos: ContratoParaSimular[] }) {
  const [escolhido, setEscolhido] = useState(0);
  const [aporte, setAporte] = useState(0);
  const [fase, setFase] = useState<Fase>("entrada");
  const dialogo = useRef<HTMLDialogElement>(null);
  const relogio = useRef<number | undefined>(undefined);

  // Sair da tela no meio da contagem nao pode deixar um `setState` marcado
  // para um componente que ja morreu.
  useEffect(() => () => window.clearTimeout(relogio.current), []);

  function calcular(evento: React.FormEvent) {
    evento.preventDefault();
    if (aporte <= 0) return;
    setFase("calculando");
    relogio.current = window.setTimeout(
      () => setFase("resultado"),
      DEMORA_DA_CONTA,
    );
  }

  function voltarAoValor() {
    window.clearTimeout(relogio.current);
    setFase("entrada");
  }

  const contrato = contratos[escolhido] ?? contratos[0];
  const s = useMemo(() => simular({ contrato, aporte }), [contrato, aporte]);

  const mensal = s.forma === "mensal";

  /*
   * O "a mais" do badge, que muda com a forma: no mensal é a parcela nova que
   * entra na conta todo mes; no final, o rendimento que sai no vencimento. Nos
   * dois casos, o que existe por causa do aporte.
   */
  const oQueOAditivoTraz = mensal ? s.rendaMensal : s.retornoTotal;
  const destaque = mensal ? s.mensalTotal : s.capitalMaisRetorno;

  const mostrando = fase === "resultado";
  const numeroPrincipal = useContagem(destaque, mostrando);
  const capitalContado = useContagem(s.capitalTotal, mostrando);

  /*
   * O quanto do caminho ate a proxima faixa ja foi andado. A barra mede o
   * degrau, e nao o capital total: uma barra que corre de zero ao infinito nao
   * diz nada, e esta responde exatamente o que se quer saber.
   */
  const rumoAProxima = s.proxima
    ? s.capitalTotal / (s.capitalTotal + s.proxima.falta)
    : 1;

  return (
    <>
      {/* O seletor é a moldura da tela, como na obra: fica fora da pilha que
          entra escalonada. Com um contrato só ele nao aparece. */}
      {contratos.length > 1 && (
        <nav aria-label="Contrato" className="mb-4 animate-surgir">
          <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
            {contratos.map((c, i) => {
              const ativo = i === escolhido;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setEscolhido(i)}
                    className={`block rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${
                      ativo
                        ? "bg-marinho text-white"
                        : "bg-tinta/5 text-neutral-600 hover:bg-tinta/10 hover:text-tinta"
                    }`}
                  >
                    {c.empreendimento}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/*
       * De inicio, só o campo. O resultado nao fica pre-desenhado com zeros
       * esperando alguem digitar: a tela abre com a pergunta, e a resposta
       * chega depois, no lugar do formulario.
       */}
      {fase === "entrada" ? (
        <form onSubmit={calcular} className="animate-aparecer">
          <section className="sombra-cartao rounded-[20px] md:rounded-lg bg-white p-6 sm:p-8">
            <label htmlFor="aporte" className="block">
              <Rotulo icone={<CifraoTresD />}>
                Quanto você quer aportar?
              </Rotulo>

              <span className="mt-4 flex items-baseline gap-2">
                <span className="text-xl font-bold text-neutral-300">R$</span>
                {/*
                 * `text` com `inputMode` numerico, e nao `type="number"`: o
                 * numerico do celular traz virgula e sinal, aceita "1e5" e
                 * mostra setinhas no desktop. Aqui só entram digitos, e a
                 * formatacao com ponto de milhar acontece a cada tecla.
                 *
                 * `autoFocus` de proposito: a tela existe para receber este
                 * numero, e é a unica coisa a fazer nela.
                 */}
                <input
                  id="aporte"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  placeholder="0"
                  value={comSeparador(aporte)}
                  onChange={(evento) => {
                    const digitos = evento.target.value.replace(/\D/g, "");
                    setAporte(Math.min(Number(digitos || 0), 999_999_999));
                  }}
                  className="w-full min-w-0 border-0 bg-transparent p-0 text-[2.25rem] leading-none font-bold tracking-tight tabular-nums text-black placeholder:text-neutral-300 focus:outline-none"
                />

                {aporte > 0 && (
                  <button
                    type="button"
                    onClick={() => setAporte(0)}
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-neutral-500 transition-colors duration-200 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                  >
                    Limpar
                  </button>
                )}
              </span>
            </label>

            {/*
             * Aqui havia a tarja ambar dizendo "Aportes de 50 mil a 1 milhao.
             * Fora dessa faixa, fale com o comercial".
             *
             * Ela saiu por pedido de quem administra. Nunca foi trava — o
             * calculo aceitava qualquer valor e continua aceitando —, entao
             * remove-la nao muda numero nenhum da tela: muda só o que a tela
             * diz enquanto a pessoa digita.
             *
             * `APORTE_MINIMO` e `APORTE_MAXIMO` continuam em
             * `lib/portal/simulacao.ts`, onde a regra de produto mora. Nao ha
             * mais quem os leia; ficam la porque a faixa continua valendo como
             * politica comercial, e apaga-los seria jogar fora o registro dela
             * junto com a tarja.
             */}

            <button
              type="submit"
              disabled={aporte <= 0}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-marinho px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,20,73,0.6)] transition-all duration-200 ease-[var(--ease-suave)] hover:bg-azul hover:shadow-[0_14px_34px_-10px_rgba(0,91,197,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-tinta/10 disabled:text-neutral-400 disabled:shadow-none"
            >
              Simular
              <IconeSetaDireita className="h-4 w-4" />
            </button>
          </section>
        </form>
      ) : fase === "calculando" ? (
        /*
         * A espera acontece no cartao que vai receber a resposta: a tela nao
         * troca de forma no meio do caminho, só de conteudo. Barras que pulsam,
         * e nao rodinha girando — elas ocupam o lugar exato do que vai chegar.
         */
        <section
          role="status"
          aria-live="polite"
          className="degrade-cabecalho sombra-cartao animate-aparecer rounded-[20px] md:rounded-lg p-6 text-white sm:p-8"
        >
          <Rotulo escuro>Calculando a sua simulação</Rotulo>
          <p className="mt-2 text-[0.8125rem] text-white/70">
            Aporte de {formatarMoedaCurta(aporte)} no seu contrato.
          </p>

          <div aria-hidden className="mt-8 space-y-4">
            <span className="block h-9 w-2/3 animate-pulse rounded-xl bg-white/20" />
            <span className="block h-3 w-full animate-pulse rounded-lg bg-white/12 [animation-delay:150ms]" />
            <span className="block h-3 w-5/6 animate-pulse rounded-lg bg-white/12 [animation-delay:300ms]" />
          </div>
        </section>
      ) : (
        <>
          {/*
           * O resultado no degrade da marca, o mesmo do cabecalho. Um cartao
           * só: tres blocos separados por fios, do mais importante para o menos
           * — o que se recebe, de onde saiu, e quanto rende no fim.
           */}
          <section
            aria-live="polite"
            className="degrade-cabecalho sombra-cartao animate-surgir rounded-[20px] md:rounded-lg p-6 text-white sm:p-8"
          >
            <Rotulo escuro>
              {mensal ? "Você recebe por mês" : "Você recebe no vencimento"}
            </Rotulo>

            {/* O numero é o elemento mais importante da tela, e o desenho diz
                isso: 40px, negrito, entrelinha colada. */}
            <p className="mt-3 text-[2.5rem] leading-none font-bold tracking-tight tabular-nums">
              {formatarMoedaCurta(numeroPrincipal)}
            </p>

            {aporte > 0 && (
              <p className="mt-3 animate-aparecer">
                {/* Badge, e nao linha de texto: ele diz o quanto mudou sem
                    disputar tamanho com o valor acima. */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 py-1.5 pr-3 pl-2.5 text-xs font-semibold text-white ring-1 ring-white/20">
                  {/* Seta desenhada no lugar do triangulo de texto: o glifo ▲
                      muda de tamanho e de alinhamento conforme a fonte que o
                      aparelho tiver. */}
                  <IconeSubindo className="h-3.5 w-3.5 shrink-0 text-ouro" />
                  <span className="tabular-nums">
                    +{formatarMoedaCurta(oQueOAditivoTraz)}
                    {mensal ? "/mês" : ""}
                  </span>
                  <span className="font-normal text-white/70">
                    com este aporte
                  </span>
                </span>
              </p>
            )}

            {/* Quando a soma cruza uma faixa, quem sobe é o capital inteiro —
                e é isso que faz o aporte valer mais do que ele mesmo. */}
            {s.subiu && (
              <p className="mt-4 rounded-xl bg-white/12 px-4 py-3 text-[0.8125rem] leading-relaxed ring-1 ring-white/20">
                <span className="font-bold text-ouro">
                  Sua participação sobe
                </span>{" "}
                para{" "}
                <span className="font-bold tabular-nums">
                  {formatarPercentual(s.taxa)} ao mês
                </span>
                .
              </p>
            )}

            <div className="mt-8 space-y-6 border-t border-white/15 pt-6">
              {/* De onde saiu o capital: a conta inteira, na ordem em que ela
                  acontece. É o bloco que responde "por que esse numero". */}
              <div>
                <Rotulo
                  escuro
                  icone={<CifraoTresD />}
                >
                  Capital
                </Rotulo>
                <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.8125rem] text-white/70">
                  <span className="tabular-nums">
                    {formatarMoedaCurta(contrato.capital)}
                  </span>
                  <span aria-hidden className="text-white/40">
                    +
                  </span>
                  <span className="tabular-nums">
                    {formatarMoedaCurta(aporte)}
                  </span>
                  <span aria-hidden className="text-white/40">
                    =
                  </span>
                  <span className="text-base font-bold tabular-nums text-white">
                    {formatarMoedaCurta(capitalContado)}
                  </span>
                </div>
                <p className="mt-1 text-[0.6875rem] text-white/50">
                  hoje + novo aporte = capital total
                </p>
              </div>

              <div>
                <Rotulo
                  escuro
                  icone={<IconePorcentagem className="h-3.5 w-3.5" />}
                >
                  Participação
                </Rotulo>
                <div className="mt-2.5 flex items-baseline justify-between gap-4">
                  <p className="text-base font-bold tabular-nums">
                    {formatarPercentual(s.taxa)}
                    <span className="ml-1.5 text-[0.6875rem] font-normal text-white/60">
                      no capital inteiro
                    </span>
                  </p>
                  {s.subiu && (
                    <p className="text-[0.8125rem] tabular-nums text-white/70 line-through">
                      {formatarPercentual(contrato.taxa)}
                    </p>
                  )}
                </div>

                {/* Barra discretissima: uma linha de 3px medindo o quanto falta
                    do degrau seguinte. Sem proxima faixa ela nao existe — nao
                    ha caminho a mostrar. */}
                {s.proxima && (
                  <>
                    <div
                      aria-hidden
                      className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/15"
                    >
                      <div
                        className="barra-ate h-full origin-left rounded-full bg-white/70"
                        style={
                          {
                            "--preenchimento": rumoAProxima,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <p className="mt-2 text-[0.6875rem] leading-relaxed text-white/60">
                      Faltam{" "}
                      <span className="font-bold tabular-nums text-white/85">
                        {formatarMoedaCurta(s.proxima.falta)}
                      </span>{" "}
                      para{" "}
                      <span className="font-bold tabular-nums text-white/85">
                        {formatarPercentual(s.proxima.taxa)} ao mês
                      </span>
                      .
                    </p>
                  </>
                )}
              </div>

            </div>

          </section>

          <button
            type="button"
            onClick={() => dialogo.current?.showModal()}
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-marinho px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,20,73,0.6)] transition-all duration-200 ease-[var(--ease-suave)] hover:bg-azul hover:shadow-[0_14px_34px_-10px_rgba(0,91,197,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 active:scale-[0.985]"
          >
            Quero aportar {formatarMoedaCurta(aporte)}
            <IconeSetaDireita className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>

          {/* A volta ao campo. Sem ela, mudar o valor exigiria recarregar a
              pagina — e simulador que nao aceita segunda tentativa nao é
              simulador. */}
          <button
            type="button"
            onClick={voltarAoValor}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-tinta/12 bg-white px-5 py-3 text-sm font-semibold text-neutral-600 transition-all duration-200 ease-[var(--ease-suave)] hover:border-tinta/25 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 active:scale-[0.985]"
          >
            <span aria-hidden className="text-base leading-none">
              ↺
            </span>
            Alterar valor
          </button>
        </>
      )}

      <DialogoDeAporte dialogo={dialogo} />
    </>
  );
}
