"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { BotaoNovoAporte } from "./botao-aporte";
import { rolarAte } from "@/app/_componentes/rolagem-suave";

export type Aba = {
  id: string;
  rotulo: string;
  /**
   * Elemento ja renderizado, como o `conteudo`: componente nao atravessa a
   * fronteira servidor/cliente, so o que é serializavel. Quem monta a aba
   * define o tamanho; a cor vem do botao, por `currentColor`.
   */
  icone: React.ReactNode;
  conteudo: React.ReactNode;
};

/**
 * No desktop as secoes viram abas no topo. No mobile, uma pilula flutuante no
 * rodape — so uma das duas aparece por vez, entao a barra de baixo é navegacao
 * comum (`nav` + `aria-current`) e a lista de abas do topo é quem nomeia os
 * paineis.
 */
export function Abas({ abas, className }: { abas: Aba[]; className?: string }) {
  const [ativa, setAtiva] = useState(abas[0].id);
  const base = useId();
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});

  /*
   * Ancora que aponta para dentro de um painel: o alvo existe no DOM mesmo
   * quando a aba esta fechada, mas o `hidden` impede o navegador de rolar ate
   * ele — o clique nao faria nada. Entao descobrimos em que painel o alvo mora,
   * abrimos aquela aba e so depois rolamos.
   */
  useEffect(() => {
    function abrirAncora() {
      const alvo = document.getElementById(
        decodeURIComponent(window.location.hash.slice(1)),
      );
      const painel = alvo?.closest<HTMLElement>('[role="tabpanel"]');
      if (!alvo || !painel) return;

      const aba = abas.find((a) => painel.id === `${base}-painel-${a.id}`);
      if (!aba) return;

      setAtiva(aba.id);
      // O painel so deixa de ser `hidden` no proximo quadro; antes disso o alvo
      // nao tem posicao na pagina e o scroll iria para o lugar errado.
      requestAnimationFrame(() => rolarAte(alvo));
    }

    abrirAncora();
    window.addEventListener("hashchange", abrirAncora);
    return () => window.removeEventListener("hashchange", abrirAncora);
  }, [abas, base]);

  function navegar(evento: React.KeyboardEvent, indice: number) {
    const salto =
      evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    if (salto === 0) return;
    evento.preventDefault();
    const proxima = abas[(indice + salto + abas.length) % abas.length];
    setAtiva(proxima.id);
    botoes.current[proxima.id]?.focus();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Secoes do portal"
        className="hidden animate-surgir gap-6 border-b border-tinta/12 md:flex [animation-delay:180ms]"
      >
        {abas.map((aba, indice) => {
          const selecionada = aba.id === ativa;
          return (
            <button
              key={aba.id}
              ref={(elemento) => {
                botoes.current[aba.id] = elemento;
              }}
              type="button"
              role="tab"
              id={`${base}-aba-${aba.id}`}
              aria-selected={selecionada}
              aria-controls={`${base}-painel-${aba.id}`}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => setAtiva(aba.id)}
              onKeyDown={(evento) => navegar(evento, indice)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${
                selecionada
                  ? "border-marinho text-tinta"
                  : "border-transparent text-neutral-500 hover:text-tinta"
              }`}
            >
              {aba.icone}
              {aba.rotulo}
            </button>
          );
        })}
      </div>

      {abas.map((aba) => (
        <div
          key={aba.id}
          role="tabpanel"
          id={`${base}-painel-${aba.id}`}
          aria-labelledby={`${base}-aba-${aba.id}`}
          hidden={aba.id !== ativa}
          tabIndex={0}
          // A animacao entra por seletor de atributo, e nao por estado do
          // React: assim ela roda de novo toda vez que o painel deixa de estar
          // `hidden` — ou seja, a cada troca de aba, e nao so na carga.
          className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-4 md:mt-8 [&:not([hidden])]:animate-aparecer"
        >
          {aba.conteudo}
        </div>
      ))}

      {/* O rodape do portal: barra rente as bordas, em todas as larguras. A
          margem de seguranca do aparelho entra como padding, e nao margem — o
          branco deve ir ate o fim da tela e é o conteudo que precisa parar
          antes da faixa do gesto. Com margem sobraria uma tira embaixo. */}
      <nav
        aria-label="Secoes do portal"
        // Sem `overflow-hidden`: o botao de acao cruza a borda de cima e seria
        // cortado pela metade. Quem cuida de nao vazar pelo canto arredondado é
        // a propria marca da aba ativa, que é curta e centrada.
        // Nao acrescente `relative` aqui: `fixed` ja serve de ancoradouro para
        // os filhos absolutos, e as duas classes disputam a mesma propriedade
        // `position` — a que vencer pela ordem do CSS tira a barra do lugar.
        className="fixed inset-x-0 bottom-0 z-40 animate-surgir rounded-t-2xl border-t border-tinta/10 bg-white shadow-[0_-4px_16px_-6px_rgba(0,20,73,0.18)] [animation-delay:240ms]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center">
          {abas.map((aba, indice) => {
            const selecionada = aba.id === ativa;
            return (
              <Fragment key={aba.id}>
                {/* Fatia vazia no meio da fila: guarda o lugar do botao de
                    acao, que mora fora deste flex. Sem ela as duas abas se
                    encontrariam justamente sob ele. */}
                {indice === Math.floor(abas.length / 2) && (
                  <span aria-hidden className="w-16 shrink-0" />
                )}
              <button
                type="button"
                onClick={() => setAtiva(aba.id)}
                aria-current={selecionada ? "page" : undefined}
                // O tamanho e a espessura do traco entram por aqui, mirando o
                // svg de dentro: o mesmo elemento de icone é reaproveitado nas
                // abas do topo, e um seletor descendente vence tanto as classes
                // de tamanho dele quanto o atributo `stroke-width` do SVG.
                className={`relative flex flex-1 items-center justify-center py-2.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azul [&_svg]:h-6 [&_svg]:w-6 [&_svg]:stroke-[2.5] ${
                  selecionada
                    ? "text-marinho"
                    : "text-neutral-400 hover:text-marinho/70"
                }`}
              >
                  {/* Sem rotulo visivel, a aba ativa precisa de marca propria:
                      so a diferenca de opacidade do icone seria fraca demais.
                      Curta e centrada para nao alcancar o canto arredondado da
                      barra, que nao recorta os filhos. */}
                  {selecionada && (
                    <span
                      aria-hidden
                      className="absolute top-0 left-1/2 h-1 w-8 -translate-x-1/2 rounded-b-full bg-marinho"
                    />
                  )}
                {aba.icone}
                {/* O rotulo sai da tela, nao da acessibilidade: sem ele o botao
                    ficaria sem nome para leitor de tela. */}
                  <span className="sr-only">{aba.rotulo}</span>
                </button>
              </Fragment>
            );
          })}
        </div>

        {/*
         * Ancorado no proprio `<nav>`, e nao numa fatia da fila: aqui o `top`
         * negativo conta a partir da borda de cima da barra, entao `-top-8`
         * significa literalmente 32px acima dela — sobram 24px dentro.
         */}
        <BotaoNovoAporte className="absolute -top-8 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-white text-tinta shadow-[0_6px_16px_-4px_rgba(0,20,73,0.35)] transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2" />
      </nav>
    </div>
  );
}
