"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/**
 * O seletor do painel — um `listbox` proprio, sem `<select>` nativo.
 *
 * O nativo resolvia quatro coisas de graca: teclado, foco, o `name` no FormData
 * e a validacao de obrigatorio. Trocar por um componente significa reimplementar
 * as quatro, e é o que este arquivo faz. O que se ganha em troca:
 *
 * - **Busca.** `opcoesDeReferencia` devolve ate 500 linhas, e escolher um
 *   contrato entre quinhentos num `<select>` é rolar uma lista de nomes
 *   parecidos. Com mais de oito opcoes aparece um campo de filtro.
 * - **Desenho igual em toda maquina.** O `<select>` é pintado pelo sistema
 *   operacional: a lista aberta ignora a borda, o raio e a cor de foco do resto
 *   do formulario.
 *
 * **O valor continua indo no formulario por um `<input>` escondido.** É ele que
 * carrega o `name`, entao as Server Actions leem exatamente como liam antes — a
 * troca é so de interface, e nenhuma acao precisou mudar.
 *
 * O teclado segue o padrao de `listbox` da WAI-ARIA: setas andam, Home e End vao
 * as pontas, Enter e Espaco escolhem, Esc fecha sem escolher, e digitar letras
 * pula para a opcao que comeca com elas.
 */

export type OpcaoDoSeletor = { valor: string; rotulo: string };

/** A partir de quantas opcoes vale mostrar o campo de busca. */
const BUSCA_A_PARTIR_DE = 8;

/** Quanto tempo as letras digitadas contam como uma palavra só. */
const JANELA_DA_DIGITACAO = 700;

export function Seletor({
  nome,
  opcoes,
  valorInicial = "",
  vazio,
  obrigatorio,
  aoEscolher,
  className = "",
  rotuloAcessivel,
}: {
  /** Nome no FormData. Sem ele, o seletor só navega — nao envia nada. */
  nome?: string;
  opcoes: OpcaoDoSeletor[];
  valorInicial?: string;
  /** O texto da opcao vazia. Sem ele, nao ha opcao vazia. */
  vazio?: string;
  obrigatorio?: boolean;
  /** Para os seletores que mudam a URL em vez de enviar um formulario. */
  aoEscolher?: (valor: string) => void;
  className?: string;
  /** Quando nao ha `<label>` em volta. */
  rotuloAcessivel?: string;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [emFoco, setEmFoco] = useState(0);
  const [paraCima, setParaCima] = useState(false);

  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const digitado = useRef({ texto: "", em: 0 });
  const id = useId();

  /*
   * A opcao vazia entra como uma opcao de verdade, e nao como um caso a parte:
   * assim ela anda no teclado, aparece na busca e se escolhe como as outras.
   */
  const todas: OpcaoDoSeletor[] = vazio
    ? [{ valor: "", rotulo: vazio }, ...opcoes]
    : opcoes;

  const filtradas = busca
    ? todas.filter((o) =>
        o.rotulo.toLowerCase().includes(busca.trim().toLowerCase()),
      )
    : todas;

  const escolhida = todas.find((o) => o.valor === valor);

  function fechar() {
    setAberto(false);
    setBusca("");
    gatilho.current?.focus();
  }

  function escolher(novo: string) {
    setValor(novo);
    fechar();
    aoEscolher?.(novo);
  }

  function abrir() {
    const indice = Math.max(
      0,
      todas.findIndex((o) => o.valor === valor),
    );
    setEmFoco(indice);
    setAberto(true);
  }

  /*
   * Para cima quando nao cabe para baixo. Medido ao abrir, e nao no CSS: o
   * `overflow-y-auto` da folha corta o que passa da borda dela, e um seletor no
   * ultimo campo de um formulario de doze abriria dentro do corte.
   */
  useLayoutEffect(() => {
    if (!aberto) return;
    const caixaDoGatilho = gatilho.current?.getBoundingClientRect();
    if (!caixaDoGatilho) return;
    const abaixo = window.innerHeight - caixaDoGatilho.bottom;
    setParaCima(abaixo < 280 && caixaDoGatilho.top > abaixo);
  }, [aberto]);

  /*
   * Fecha ao clicar fora. `pointerdown` e nao `click`: o clique de fora pode
   * cair num botao que ja navegou antes de o `click` chegar aqui.
   */
  useEffect(() => {
    if (!aberto) return;
    function fora(evento: PointerEvent) {
      if (!caixa.current?.contains(evento.target as Node)) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  // Mantem a opcao em foco visivel enquanto se anda com as setas.
  useEffect(() => {
    if (!aberto) return;
    lista.current
      ?.querySelector(`[data-indice="${emFoco}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [emFoco, aberto]);

  function andar(passo: number) {
    setEmFoco((atual) => {
      if (filtradas.length === 0) return 0;
      /*
       * Sem dar a volta: chegar ao fim e reaparecer no topo desorienta em lista
       * longa, que é justamente o caso dos contratos.
       */
      return Math.min(filtradas.length - 1, Math.max(0, atual + passo));
    });
  }

  /** Digitar letras pula para a opcao que comeca com elas — como no nativo. */
  function porDigitacao(tecla: string) {
    const agora = Date.now();
    const texto =
      agora - digitado.current.em > JANELA_DA_DIGITACAO
        ? tecla
        : digitado.current.texto + tecla;
    digitado.current = { texto, em: agora };

    const alvo = filtradas.findIndex((o) =>
      o.rotulo.toLowerCase().startsWith(texto.toLowerCase()),
    );
    if (alvo >= 0) setEmFoco(alvo);
  }

  function noTeclado(evento: React.KeyboardEvent) {
    if (!aberto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(evento.key)) {
        evento.preventDefault();
        abrir();
      }
      return;
    }

    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        andar(1);
        break;
      case "ArrowUp":
        evento.preventDefault();
        andar(-1);
        break;
      case "Home":
        evento.preventDefault();
        setEmFoco(0);
        break;
      case "End":
        evento.preventDefault();
        setEmFoco(filtradas.length - 1);
        break;
      case "Enter":
      case " ":
        evento.preventDefault();
        if (filtradas[emFoco]) escolher(filtradas[emFoco].valor);
        break;
      case "Escape":
        evento.preventDefault();
        fechar();
        break;
      case "Tab":
        // Tab sai do campo: fecha sem escolher, e sem puxar o foco de volta.
        setAberto(false);
        setBusca("");
        break;
      default:
        if (evento.key.length === 1 && !evento.metaKey && !evento.ctrlKey) {
          porDigitacao(evento.key);
        }
    }
  }

  const comBusca = todas.length > BUSCA_A_PARTIR_DE;

  return (
    <div ref={caixa} className="relative">
      {/*
       * O valor para o formulario.
       *
       * `sr-only` e nao `type="hidden"`: campo escondido de verdade nao recebe
       * foco, e o navegador precisa focar o campo invalido para mostrar a bolha
       * de "preencha este campo". Com `sr-only` ele existe, tem tamanho e é
       * focavel por codigo — a bolha aparece junto do gatilho, que é onde ela faz
       * sentido. O `onFocus` devolve o foco ao gatilho logo em seguida, para o
       * teclado nunca parar num campo que ninguem ve.
       */}
      {nome && (
        <input
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          name={nome}
          value={valor}
          required={obrigatorio}
          readOnly
          onFocus={() => gatilho.current?.focus()}
        />
      )}

      <button
        ref={gatilho}
        type="button"
        role="combobox"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-controls={`${id}-lista`}
        aria-label={rotuloAcessivel}
        aria-activedescendant={
          aberto && filtradas[emFoco] ? `${id}-op-${emFoco}` : undefined
        }
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={noTeclado}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition-colors duration-200 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul ${
          aberto
            ? "border-azul ring-2 ring-azul"
            : "border-zinc-200 hover:border-zinc-300"
        } ${escolhida?.valor ? "text-tinta" : "text-neutral-400"} ${className}`}
      >
        <span className="truncate">{escolhida?.rotulo ?? vazio ?? "—"}</span>
        <Seta aberto={aberto} />
      </button>

      {aberto && (
        <div
          className={`absolute z-50 w-full min-w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg ${
            paraCima ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {comBusca && (
            <div className="border-b border-zinc-100 p-2">
              <input
                autoFocus
                value={busca}
                onChange={(evento) => {
                  setBusca(evento.target.value);
                  setEmFoco(0);
                }}
                onKeyDown={noTeclado}
                placeholder="Buscar…"
                aria-label="Buscar opção"
                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-tinta focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
              />
            </div>
          )}

          <ul
            ref={lista}
            id={`${id}-lista`}
            role="listbox"
            aria-label={rotuloAcessivel}
            className="max-h-60 overflow-y-auto overscroll-contain py-1"
          >
            {filtradas.length === 0 && (
              <li className="px-3.5 py-3 text-sm text-neutral-400">
                Nada encontrado.
              </li>
            )}

            {filtradas.map((opcao, indice) => {
              const marcada = opcao.valor === valor;
              return (
                <li
                  key={opcao.valor || "__vazio"}
                  id={`${id}-op-${indice}`}
                  data-indice={indice}
                  role="option"
                  aria-selected={marcada}
                  /* `pointerdown` chega antes do fechamento por clique fora, que
                     tambem escuta `pointerdown` — sem isto os dois competiriam e
                     a escolha as vezes se perdia. */
                  onPointerDown={(evento) => {
                    evento.preventDefault();
                    escolher(opcao.valor);
                  }}
                  onPointerEnter={() => setEmFoco(indice)}
                  className={`cursor-pointer px-3.5 py-2 text-sm transition-colors duration-100 ${
                    indice === emFoco ? "bg-indigo-50" : ""
                  } ${
                    marcada
                      ? "font-semibold text-marinho"
                      : opcao.valor
                        ? "text-tinta"
                        : "text-neutral-400"
                  }`}
                >
                  {opcao.rotulo}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** A seta do gatilho, que vira ao abrir. */
function Seta({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
        aberto ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}
