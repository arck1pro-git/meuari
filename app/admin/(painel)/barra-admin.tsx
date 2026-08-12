"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconeGaleria,
  IconeInvestimento,
  IconeMais,
  IconeObra,
  IconePasta,
  IconePessoa,
  IconePorcentagem,
  IconeSino,
  IconeTransparencia,
} from "@/app/(app)/portal/_componentes/icones";
import { agrupar } from "./_componentes/grupos";

/**
 * A navegacao do painel: uma coluna fixa a esquerda, com um icone por secao.
 *
 * Substitui o cabecalho que havia aqui — faixa com titulo, nome de quem entrou,
 * "Sair" e uma fila de pastilhas que rolava na horizontal. Com onze tabelas
 * aquela fila era um carrossel: metade das secoes vivia fora da tela, e chegar
 * numa delas era arrastar ate achar. Numa coluna todas cabem de uma vez.
 *
 * Duas larguras, e nao duas pecas: no celular ela é um trilho de icones de
 * 64px, e a partir do desktop abre para 240px com os nomes ao lado. O rotulo
 * nunca some — no trilho ele vive no `title` e num `sr-only`.
 *
 * As secoes vem em grupos (ver `GRUPOS`), e o topo da coluna é o atalho para a
 * inicial do painel — que agora tambem se marca como aberta, porque ela é uma
 * tela como as outras e nao um logotipo decorativo.
 *
 * Cliente por um motivo só: qual secao esta aberta é a rota, e um layout nao
 * recebe os parametros da pagina que ele envolve. `usePathname` responde isso
 * sem prop atravessando tres niveis.
 */

/**
 * O icone de cada secao, pelo slug.
 *
 * Mora aqui, e nao no registro de `lib/admin/tabelas.ts`: aquele arquivo é a
 * fonte dos identificadores que entram no SQL e roda no servidor, entao
 * componente React nao tem o que fazer la dentro.
 */
const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  usuarios: IconePessoa,
  empreendimentos: IconeObra,
  contratos: IconeTransparencia,
  aditivos: IconeMais,
  // O credito que cai na conta — e a tela onde ele é lancado.
  recebimentos: IconeInvestimento,
  notificacoes: IconeSino,
  documentos: IconePasta,
  etapas: IconePorcentagem,
  imagens: IconeGaleria,
};

type Secao = { slug: string; rotulo: string };

export function BarraAdmin({
  secoes,
  nome,
  sair,
}: {
  secoes: Secao[];
  nome: string;
  /** A acao de servidor que fecha a sessao. */
  sair: () => void;
}) {
  const rota = usePathname();
  const inicial = (Array.from(nome)[0] ?? "?").toUpperCase();
  const blocos = agrupar(secoes);
  const naInicial = rota === "/admin";

  return (
    // Tinta chapada, sem degrade nem brilho passeando: o degrade é a assinatura
    // do cabecalho do portal, onde ele aparece por alguns segundos e some na
    // rolagem. Aqui a faixa fica na tela o tempo todo, ao lado de tabelas —
    // cor viva e movimento constante ao lado de dado é ruido de fundo. O que
    // separa a coluna do conteudo passou a ser a borda.
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-white/10 bg-tinta text-white md:w-60">
      <div className="flex h-full flex-col">
        <Link
          href="/admin"
          aria-current={naInicial ? "page" : undefined}
          title="Início da administração"
          className="flex h-16 shrink-0 items-center justify-center gap-2.5 border-b border-white/10 px-3 transition-colors duration-200 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset md:justify-start md:px-4"
        >
          <span
            aria-hidden
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors duration-200 ${
              naInicial ? "bg-ouro text-tinta" : "bg-white/15 text-white"
            }`}
          >
            A
          </span>
          <span className="hidden min-w-0 md:block">
            <span className="block truncate text-sm font-bold tracking-tight">
              Administração
            </span>
            <span className="block truncate text-[0.6875rem] text-white/50">
              Meu ARI
            </span>
          </span>
        </Link>

        {/* A lista rola dentro da coluna quando nao couber — o rodape com o
            "Sair" fica parado no pé. */}
        <nav
          aria-label="Seções do painel"
          className="min-h-0 flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:thin] md:px-3"
        >
          {blocos.map((bloco, i) => (
            <div key={bloco.titulo || "outras"} className={i > 0 ? "mt-5" : ""}>
              {/* O titulo do grupo so existe no desktop. No trilho de icones
                  ele nao caberia, e a separacao ali fica por conta do respiro
                  entre os blocos — que é a mesma informacao, em silencio. */}
              {bloco.titulo && (
                <p className="mb-1.5 hidden px-3 text-[0.625rem] font-semibold tracking-wider text-white/40 uppercase md:block">
                  {bloco.titulo}
                </p>
              )}

              <ul className="space-y-1">
                {bloco.itens.map(({ slug, rotulo }) => {
                  const Icone = ICONES[slug] ?? IconeTransparencia;
                  const aberta = rota === `/admin/${slug}`;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/admin/${slug}`}
                        aria-current={aberta ? "page" : undefined}
                        title={rotulo}
                        /* A barrinha de ouro na borda esquerda marca a secao
                           aberta no trilho estreito, onde o rotulo nao cabe e o
                           fundo claro sozinho é pouco. */
                        className={`relative flex h-11 items-center justify-center gap-3 rounded-xl text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:justify-start md:px-3 ${
                          aberta
                            ? "bg-white/[0.14] text-white before:absolute before:top-2.5 before:bottom-2.5 before:-left-2 before:w-1 before:rounded-r-full before:bg-ouro md:before:-left-3"
                            : "text-white/70 hover:bg-white/[0.08] hover:text-white"
                        }`}
                      >
                        {/* Ouro na secao aberta, como no rodape do portal. */}
                        <Icone
                          className={`h-5 w-5 shrink-0 ${aberta ? "text-ouro" : ""}`}
                        />
                        {/* Um rotulo só, que sai da tela no trilho estreito em
                            vez de desaparecer: `sr-only` esconde do olho e
                            mantem para quem ouve, e `not-sr-only` o traz de
                            volta no desktop. Dois spans alternados dariam o
                            mesmo visual e dois nomes no leitor de tela. */}
                        <span className="truncate sr-only md:not-sr-only">
                          {rotulo}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Quem entrou e a saida, no pé — como no portal. No trilho estreito
            sobra só a inicial e o botao. */}
        <div className="shrink-0 border-t border-white/10 px-2 py-3 md:px-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-marinho md:mx-0"
            >
              {inicial}
            </span>
            <span className="hidden min-w-0 flex-1 md:block">
              <span className="block truncate text-xs font-medium text-white">
                {nome}
              </span>
              <span className="block text-[0.6875rem] text-white/45">
                Administrador
              </span>
            </span>
          </div>

          <form action={sair} className="mt-2.5">
            <button
              type="submit"
              title="Sair"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/15 text-xs font-semibold text-white/80 transition-colors duration-200 hover:border-white/25 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <IconeSairPorta className="h-4 w-4 shrink-0" />
              <span className="hidden md:block">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Porta com seta: encerrar a sessao. Local — só o painel usa. */
function IconeSairPorta({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M14 20H6.5A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4H14" />
      <path d="M16 8.5 19.5 12 16 15.5" />
      <path d="M19.5 12H10" />
    </svg>
  );
}
