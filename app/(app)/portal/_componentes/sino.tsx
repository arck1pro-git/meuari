"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Notificacao } from "@/lib/portal/notificacoes";
import { formatarData } from "@/lib/portal/formato";
import { marcarNotificacoesComoLidas } from "../acoes";
import { usePush } from "./usar-push";

/**
 * O sino e a caixa de notificacoes.
 *
 * Vive num modulo proprio porque tem dois donos: o cabecalho, que é a cara do
 * mobile, e a barra lateral do desktop. Duplicar o estado, o contador e o
 * fechamento por Esc em dois lugares seria duas chances de eles divergirem.
 */
export function Sino({
  notificacoes,
  alinhamento = "direita",
}: {
  notificacoes: Notificacao[];
  /** De que lado do botao o painel abre. No cabecalho ele cai para a esquerda;
   *  na barra lateral, para a direita, que é onde ha espaco. */
  alinhamento?: "direita" | "esquerda";
}) {
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
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 transition-colors hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marinho"
      >
        {/* O sino 3D da mesma familia do foguete e do foguinho. Ele ja tem cor
            propria, entao o fundo do botao é discreto — a pastilha translucida
            competia com o icone. */}
        <Image
          src="/icons/3dicons-bell-dynamic-color.png"
          alt=""
          width={64}
          height={64}
          className="h-7 w-7"
        />

        {/* O contador é decorativo: o numero ja esta no `aria-label` do botao,
            e repeti-lo faria o leitor de tela dizer duas vezes. */}
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
          className={`absolute top-11 z-10 max-h-[70vh] w-80 animate-aparecer overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-tinta/10 ${
            alinhamento === "direita" ? "right-0" : "left-0"
          }`}
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

          <Interruptor />
        </div>
      )}
    </div>
  );
}

/**
 * Liga e desliga os avisos no aparelho, no pé da caixa.
 *
 * Fica aqui, e nao numa tela de ajustes, porque é onde a pessoa esta quando
 * pensa no assunto: ela abriu as notificacoes. E é por aparelho, nao por conta
 * — a inscricao pertence a este navegador, e o texto diz isso.
 */
function Interruptor() {
  const { estado, ativar, desativar } = usePush();

  // "verificando" nao vira interruptor meio ligado: o pé so aparece quando ha
  // uma resposta.
  if (estado === "verificando") return null;

  /*
   * Sem suporte é quase sempre uma de duas coisas, e as duas tem conserto do
   * lado de quem le — por isso o texto, e nao o silencio:
   *
   * - a pagina esta em `http` (o servidor de desenvolvimento na rede local, por
   *   exemplo). Fora de `localhost`, o navegador nao entrega service worker
   *   nem push sem `https`;
   * - é um iPhone com o site aberto no Safari, e nao pelo icone da tela de
   *   inicio. O iOS so libera push para o app instalado.
   */
  if (estado === "indisponivel") {
    return (
      <p className="sticky bottom-0 border-t border-tinta/10 bg-white px-4 py-3 text-xs leading-relaxed text-neutral-500">
        Este navegador não aceita avisos aqui. No iPhone, abra pelo ícone do app
        na tela de início; e a página precisa estar em <code>https</code>.
      </p>
    );
  }

  if (estado === "negado") {
    return (
      <p className="sticky bottom-0 border-t border-tinta/10 bg-white px-4 py-3 text-xs leading-relaxed text-neutral-500">
        Os avisos estão bloqueados para este site. Para voltar, libere as
        notificações nas configurações do navegador.
      </p>
    );
  }

  const ligado = estado === "ligado";
  const ocupado = estado === "ligando";

  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-tinta/10 bg-white px-4 py-3">
      <span className="text-xs font-medium text-tinta">
        Avisos neste aparelho
        {estado === "erro" && (
          <span className="mt-0.5 block text-[0.6875rem] font-normal text-red-600">
            Não deu certo. Tente de novo.
          </span>
        )}
      </span>

      {/*
       * `role="switch"` com `aria-checked`: para quem le por audio, isto é um
       * interruptor com dois estados, e nao um botao que faz algo opaco. O
       * texto ao lado nao nomeia o botao sozinho — um `span` vizinho nao vira
       * rotulo —, entao o nome vai no `aria-label`.
       */}
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label="Avisos neste aparelho"
        disabled={ocupado}
        onClick={() => (ligado ? desativar() : ativar())}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 disabled:opacity-60 ${
          ligado ? "bg-marinho" : "bg-neutral-300"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            ligado ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
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
