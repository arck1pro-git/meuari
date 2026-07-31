"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Notificacao } from "@/lib/portal/notificacoes";
import { formatarData } from "@/lib/portal/formato";
import { marcarNotificacoesComoLidas } from "../acoes";
import { IconeSino } from "./icones";

/*
 * O cabecalho tem duas coisas: quem entrou e o sino.
 *
 * O saldo saiu daqui — antes ele era assumido pelo cabecalho conforme a pessoa
 * rolava, com um `useEffect` medindo a cada quadro. Agora é assunto exclusivo do
 * cartao do /portal.
 *
 * Os tres pontos tambem sairam, e com eles Fazer aporte, Ativar notificacoes e
 * Sair. Foi decisao de produto; o `DialogoDeAporte` e o hook `usePush`
 * continuam no repositorio, prontos para voltar quando houver onde pendura-los.
 */
export function Cabecalho({
  nome,
  notificacoes,
}: {
  nome: string;
  notificacoes: Notificacao[];
}) {
  const primeiroNome = nome.split(" ")[0];
  // `Array.from` e nao `[0]`: acento e emoji podem ocupar duas unidades, e o
  // corte no meio de um par sairia como caractere quebrado.
  const inicial = (Array.from(primeiroNome)[0] ?? "?").toUpperCase();

  const [aberta, setAberta] = useState(false);
  // Comeca no que o servidor mandou e zera ao abrir, sem esperar a resposta:
  // o contador é sobre o que a pessoa acabou de ver.
  const [naoLidas, setNaoLidas] = useState(
    () => notificacoes.filter((n) => !n.lida).length,
  );
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc — o que se espera de um painel assim.
  useEffect(() => {
    if (!aberta) return;

    const aoClicar = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberta(false);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberta(false);
    };

    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberta]);

  function alternar() {
    const abrindo = !aberta;
    setAberta(abrindo);

    if (abrindo && naoLidas > 0) {
      setNaoLidas(0);
      // Sem `await`: a marca de leitura é registro, nao impede a caixa de abrir.
      marcarNotificacoesComoLidas().catch(() => {});
    }
  }

  return (
    // `sticky` e nao `fixed`: assim o header continua ocupando altura no fluxo
    // e o conteudo abaixo nao precisa de padding de compensacao.
    /*
     * O degrade agora vai de escuro a escuro: quem acende a faixa sao os dois
     * brilhos radiais abaixo, um em cada canto. Terminar no ceu deixava o canto
     * inferior lavado de azul-claro, porque parada de cor termina em parede.
     *
     * A cor vem da classe `degrade-cabecalho`, escrita em CSS puro no
     * `globals.css` — ver o comentario de la sobre por que ela nao usa os
     * utilitarios de degrade do Tailwind.
     */
    <header className="degrade-cabecalho sticky top-0 z-50 isolate animate-surgir rounded-b-2xl text-white">
      {/* Camadas decorativas: sem z-index proprio, ficam acima do fundo da
          faixa e abaixo do conteudo, que sobe com `relative`. O
          `overflow-hidden` fica nesta caixa, e nao no <header>: no header ele
          tambem recortaria o painel que abre abaixo do sino. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-2xl"
      >
        <div className="absolute inset-0 animate-deriva brilho-ciano" />
        {/* O gemeo no canto oposto. Atraso proprio para os dois nao subirem e
            descerem em bloco, o que leria como uma coisa só piscando. */}
        <div className="absolute inset-0 animate-deriva brilho-ciano-canto [animation-delay:-8s]" />
        <div className="absolute inset-y-0 left-0 w-1/4 animate-brilho bg-linear-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-3">
          {/* A inicial de quem entrou. `aria-hidden` porque o nome vem escrito
              logo ao lado: para quem ouve a pagina, a letra seria repeticao. */}
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-marinho"
          >
            {inicial}
          </span>

          <p className="text-sm font-semibold">
            Olá, <span className="font-bold">{primeiroNome}</span>
          </p>
        </div>

        <div ref={caixa} className="relative">
          <button
            type="button"
            aria-label={
              naoLidas > 0
                ? `Notificações, ${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`
                : "Notificações"
            }
            aria-haspopup="dialog"
            aria-expanded={aberta}
            onClick={alternar}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/30 text-white transition-colors hover:bg-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marinho"
          >
            <IconeSino />

            {/* O contador é decorativo: o numero ja esta no `aria-label` do
                botao, e repeti-lo faria o leitor de tela dizer duas vezes. */}
            {naoLidas > 0 && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ciano px-1 text-[0.625rem] font-bold text-tinta"
              >
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            )}
          </button>

          {aberta && (
            <div
              role="dialog"
              aria-label="Notificações"
              className="absolute top-11 right-0 z-10 max-h-[70vh] w-80 animate-aparecer overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-tinta/10"
            >
              <p className="sticky top-0 border-b border-tinta/10 bg-white px-4 py-3 text-sm font-bold text-tinta">
                Notificações
              </p>

              {notificacoes.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-neutral-500">
                  Nada por aqui ainda.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {notificacoes.map((n) => (
                    <li key={n.id}>
                      <Corpo notificacao={n} aoIr={() => setAberta(false)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** Com link vira `<Link>`; sem link, texto. Nao inventa clique que nao leva a lugar nenhum. */
function Corpo({
  notificacao,
  aoIr,
}: {
  notificacao: Notificacao;
  aoIr: () => void;
}) {
  const conteudo = (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-tinta">
          {notificacao.titulo}
        </span>
        <time
          dateTime={notificacao.data}
          className="shrink-0 text-xs text-neutral-400 tabular-nums"
        >
          {formatarData(notificacao.data)}
        </time>
      </span>
      {notificacao.corpo && (
        <span className="mt-1 block text-sm leading-relaxed text-neutral-600">
          {notificacao.corpo}
        </span>
      )}
    </>
  );

  // O ponto marca o que chegou desde a ultima visita.
  const marca = !notificacao.lida && (
    <span
      aria-hidden
      className="absolute top-4 left-1.5 h-1.5 w-1.5 rounded-full bg-azul"
    />
  );

  if (notificacao.url) {
    return (
      <Link
        href={notificacao.url}
        onClick={aoIr}
        className="relative block px-4 py-3 pl-5 transition-colors hover:bg-tinta/5 focus:outline-none focus-visible:bg-tinta/5"
      >
        {marca}
        {conteudo}
      </Link>
    );
  }

  return (
    <div className="relative px-4 py-3 pl-5">
      {marca}
      {conteudo}
    </div>
  );
}
