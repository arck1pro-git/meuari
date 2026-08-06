"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DialogoDeAporte } from "@/app/(app)/portal/_componentes/dialogo-aporte";
import { formatarMoedaCurta, formatarPercentual } from "@/lib/portal/formato";
import {
  APORTE_MAXIMO,
  APORTE_MINIMO,
  simular,
  type ContratoParaSimular,
} from "@/lib/portal/simulacao";

/**
 * O simulador do aditivo: quanto rende um aporte novo no contrato que a pessoa
 * ja tem.
 *
 * A tela é a mesma da obra — fundo cinza, cartoes brancos de canto 20, rotulo
 * miudo em caixa alta, valor grande, tudo preto. Muda o conteudo, e nao a casa.
 *
 * **Uma pergunta só: quanto.** Prazo e forma de retorno chegaram a ser botoes
 * aqui e sairam — eles vem do contrato assinado, e perguntar de novo o que ja
 * esta no papel transforma uma resposta em formulario. A taxa cai da tabela a
 * partir desses dois, e aparece pronta no resultado.
 *
 * A conta roda a cada tecla, no cliente, porque a resposta precisa ser
 * imediata. A funcao `simular` é pura e vive fora do componente.
 */

/** `50000` -> `50.000`. Sem centavos: aporte nao tem quebrado. */
function comSeparador(valor: number): string {
  return valor === 0 ? "" : valor.toLocaleString("pt-BR");
}

/** A mesma superficie da tela da obra: canto de 20, sombra de cartao, respiro largo. */
function Cartao({ children }: { children: React.ReactNode }) {
  return (
    <section className="sombra-cartao rounded-[20px] bg-white p-6 sm:p-7">
      {children}
    </section>
  );
}

function Rotulo({
  children,
  escuro = false,
}: {
  children: React.ReactNode;
  /** No cartao do resultado, que corre sobre o degrade da marca. */
  escuro?: boolean;
}) {
  return (
    <p
      className={`text-[0.625rem] font-semibold tracking-[0.08em] uppercase ${
        escuro ? "text-white/70" : "text-black"
      }`}
    >
      {children}
    </p>
  );
}

/**
 * Em que ponto da conversa a tela esta.
 *
 * `calculando` existe por escolha de produto, e nao por necessidade tecnica: a
 * conta é instantanea. Sao tres segundos em que a tela mostra que esta fazendo
 * alguma coisa — o mesmo motivo pelo qual caixa eletronico demora a contar
 * dinheiro que ja contou.
 */
type Fase = "entrada" | "calculando" | "resultado";

const DEMORA_DA_CONTA = 3000;

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
  const foraDaFaixa =
    aporte > 0 && (aporte < APORTE_MINIMO || aporte > APORTE_MAXIMO);

  /*
   * O "a mais" que o amarelo mostra, e que muda com a forma: no mensal é a
   * parcela nova que entra na conta todo mes; no final, é o rendimento que sai
   * no vencimento — nos dois casos, o que existe por causa do aporte.
   */
  const oQueOAditivoTraz = mensal ? s.rendaMensal : s.retornoTotal;

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
                <li key={`${c.empreendimentoId}-${c.modalidade}`}>
                  <button
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setEscolhido(i)}
                    className={`block rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${
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

      <div className="escalonar">
        {/*
         * De inicio, só o campo. O resultado nao fica pre-desenhado com zeros
         * esperando alguem digitar: a tela abre com a pergunta, e a resposta
         * chega depois — em cartao proprio, no lugar do formulario.
         */}
        {fase === "entrada" ? (
          <form onSubmit={calcular}>
            <Cartao>
              <label htmlFor="aporte" className="block">
                <Rotulo>Quanto você quer aportar?</Rotulo>

                <span className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-neutral-300">R$</span>
                  {/*
                   * `text` com `inputMode` numerico, e nao `type="number"`: o
                   * numerico do celular traz virgula e sinal, aceita "1e5" e mostra
                   * setinhas no desktop. Aqui só entram digitos, e a formatacao com
                   * ponto de milhar acontece a cada tecla.
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
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-[2rem] leading-none font-bold tabular-nums text-black placeholder:text-neutral-300 focus:outline-none"
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

              {/* Aviso, e nao trava: quem digitou 30 mil quer ver o numero, e a
              tela diz que a conversa comeca em 50. */}
              {foraDaFaixa && (
                <p className="mt-3 text-[0.6875rem] leading-relaxed text-amber-700">
                  Aportes de {formatarMoedaCurta(APORTE_MINIMO)} a{" "}
                  {formatarMoedaCurta(APORTE_MAXIMO)}. Fora dessa faixa, fale
                  com o comercial — a simulação continua valendo como
                  referência.
                </p>
              )}

              <button
                type="submit"
                disabled={aporte <= 0}
                className="mt-6 w-full rounded-2xl bg-marinho px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(0,20,73,0.5)] transition-all duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-tinta/15 disabled:text-neutral-500 disabled:shadow-none"
              >
                Simular
              </button>
            </Cartao>
          </form>
        ) : fase === "calculando" ? (
          /*
           * A espera acontece no mesmo cartao azul que vai receber a resposta:
           * a tela nao troca de forma no meio do caminho, só de conteudo. Tres
           * barras que pulsam, e nao um rodinha girando — elas ocupam o lugar
           * exato das tres linhas que vao aparecer.
           */
          <section
            role="status"
            aria-live="polite"
            className="degrade-cabecalho sombra-cartao rounded-[20px] p-6 text-white sm:p-7"
          >
            <p className="text-sm font-semibold">Calculando a sua simulação…</p>
            <p className="mt-1 text-[0.6875rem] text-white/70">
              Aporte de {formatarMoedaCurta(aporte)} no seu contrato.
            </p>

            <div aria-hidden className="mt-6 space-y-3">
              <span className="block h-7 w-2/3 animate-pulse rounded-lg bg-white/20" />
              <span className="block h-3 w-full animate-pulse rounded-lg bg-white/12 [animation-delay:150ms]" />
              <span className="block h-3 w-5/6 animate-pulse rounded-lg bg-white/12 [animation-delay:300ms]" />
            </div>
          </section>
        ) : (
          <>
            {/*
             * O resultado no degrade da marca, o mesmo do cabecalho: a pergunta é
             * branca, a resposta é azul. Duas superficies diferentes separam o que
             * se digita do que se le sem precisar de titulo dizendo isso.
             */}
            <section
              aria-live="polite"
              className="degrade-cabecalho sombra-cartao animate-surgir rounded-[20px] p-6 text-white sm:p-7"
            >
              <Rotulo escuro>
                {mensal
                  ? "Você recebe por mês"
                  : "Você recebe no vencimento do aditivo"}
              </Rotulo>

              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-[1.625rem] leading-none font-bold tabular-nums">
                  {formatarMoedaCurta(
                    mensal ? s.mensalTotal : s.capitalMaisRetorno,
                  )}
                </span>
                {aporte > 0 && (
                  <Ouro>
                    +{formatarMoedaCurta(oQueOAditivoTraz)} com o aporte
                  </Ouro>
                )}
              </p>

              {/* Quando a soma cruza uma faixa, quem sobe é o capital inteiro —
              e é isso que faz o aporte valer mais do que ele mesmo. */}
              {s.subiu && (
                <p className="mt-4 rounded-xl bg-white/12 px-4 py-3 text-[0.8125rem] leading-relaxed text-white ring-1 ring-white/20">
                  <span className="font-bold text-ouro">
                    Sua participação sobe
                  </span>{" "}
                  para{" "}
                  <span className="font-bold tabular-nums">
                    {formatarPercentual(s.taxa)} ao mês
                  </span>{" "}
                  — no capital inteiro, e não só no aporte novo.
                </p>
              )}

              {s.proxima && (
                <p className="mt-3 text-[0.6875rem] leading-relaxed text-white/75">
                  Faltam{" "}
                  <span className="font-bold tabular-nums text-white">
                    {formatarMoedaCurta(s.proxima.falta)}
                  </span>{" "}
                  para a participação de{" "}
                  <span className="font-bold tabular-nums text-white">
                    {formatarPercentual(s.proxima.taxa)} ao mês
                  </span>
                  .
                </p>
              )}

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 border-t border-white/15 pt-6 sm:grid-cols-3">
                <Bloco
                  escuro
                  rotulo="Capital"
                  valor={formatarMoedaCurta(s.capitalTotal)}
                  apoio={`hoje ${formatarMoedaCurta(contrato.capital)}`}
                  extra={aporte > 0 ? `+${formatarMoedaCurta(aporte)}` : null}
                />
                <Bloco
                  escuro
                  rotulo="Participação do aditivo"
                  valor={formatarPercentual(s.taxa)}
                  apoio={`seu contrato a ${formatarPercentual(contrato.taxa)}`}
                  extra={s.subiu ? "subiu de faixa" : null}
                />
                <Bloco
                  escuro
                  rotulo="Rendimento do aditivo"
                  valor={formatarMoedaCurta(s.retornoTotal)}
                  apoio={`em ${s.prazo} meses`}
                />
              </dl>
            </section>

            <button
              type="button"
              onClick={() => dialogo.current?.showModal()}
              className="mt-5 w-full rounded-2xl bg-marinho px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(0,20,73,0.5)] transition-all duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              Quero aportar {formatarMoedaCurta(aporte)}
            </button>

            {/* A volta ao campo. Sem ela, mudar o valor exigiria recarregar a
            pagina — e simulador que nao aceita segunda tentativa nao é
            simulador. */}
            <button
              type="button"
              onClick={voltarAoValor}
              className="mt-3 w-full rounded-xl px-5 py-2.5 text-sm font-medium text-neutral-500 transition-colors duration-200 hover:bg-tinta/[0.04] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              Simular outro valor
            </button>

            <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-neutral-500">
              Projeção em juros simples, isenta de Imposto de Renda. Não é
              promessa de resultado.
            </p>
          </>
        )}
      </div>

      <DialogoDeAporte dialogo={dialogo} />
    </>
  );
}

/**
 * O amarelo do aditivo.
 *
 * Pastilha, e nao texto colorido: o ouro sobre branco rende 1,5:1 de contraste
 * — bom de ver, impossivel de ler. Em area cheia com texto escuro em cima ele
 * fica legivel e continua sendo a unica coisa amarela da tela, que é o ponto.
 */
function Ouro({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-ouro px-2.5 py-1 text-[0.75rem] font-bold whitespace-nowrap text-tinta tabular-nums">
      {children}
    </span>
  );
}

function Bloco({
  rotulo,
  valor,
  apoio,
  extra,
  escuro = false,
}: {
  rotulo: string;
  valor: string;
  apoio: string;
  /** O que o aditivo acrescenta neste numero. Em amarelo, quando houver. */
  extra?: string | null;
  escuro?: boolean;
}) {
  return (
    <div>
      <dt
        className={`text-[0.625rem] font-semibold tracking-[0.08em] uppercase ${
          escuro ? "text-white/60" : "text-black"
        }`}
      >
        {rotulo}
      </dt>
      <dd
        className={`mt-1 text-[0.9375rem] leading-tight font-bold tabular-nums ${
          escuro ? "text-white" : "text-black"
        }`}
      >
        {valor}
      </dd>
      <dd
        className={`mt-0.5 text-[0.6875rem] ${
          escuro ? "text-white/70" : "text-black"
        }`}
      >
        {apoio}
      </dd>
      {extra && (
        <dd className="mt-1.5">
          {/* No escuro o ouro pode ser tinta: sobre o marinho ele passa de 7:1.
              No claro precisa de area cheia, senao fica ilegivel. */}
          <span
            className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold tabular-nums ${
              escuro ? "bg-white/15 text-ouro" : "bg-ouro/25 text-black"
            }`}
          >
            {extra}
          </span>
        </dd>
      )}
    </div>
  );
}
