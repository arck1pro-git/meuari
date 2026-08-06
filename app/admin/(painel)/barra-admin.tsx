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

export function BarraAdmin({
  secoes,
  nome,
  sair,
}: {
  secoes: { slug: string; rotulo: string }[];
  nome: string;
  /** A acao de servidor que fecha a sessao. */
  sair: () => void;
}) {
  const rota = usePathname();
  const inicial = (Array.from(nome)[0] ?? "?").toUpperCase();

  return (
    <aside className="degrade-cabecalho fixed inset-y-0 left-0 z-40 flex w-16 flex-col overflow-hidden text-white md:w-60">
      {/* As mesmas camadas do portal: o brilho que passeia e o gemeo no canto
          oposto, com atraso proprio para os dois nao piscarem em bloco. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 animate-deriva brilho-ciano" />
        <div className="absolute inset-0 animate-deriva brilho-ciano-canto [animation-delay:-8s]" />
      </div>

      <div className="relative flex h-full flex-col">
        <Link
          href="/admin"
          className="flex h-16 shrink-0 items-center justify-center px-3 md:justify-start md:px-4"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-bold md:hidden"
          >
            A
          </span>
          <span className="hidden text-sm font-bold tracking-tight md:block">
            Administração
          </span>
        </Link>

        {/* A lista rola dentro da coluna quando nao couber — o rodape com o
            "Sair" fica parado no pé. */}
        <nav
          aria-label="Seções do painel"
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin] md:px-3"
        >
          <ul className="space-y-1">
            {secoes.map(({ slug, rotulo }) => {
              const Icone = ICONES[slug] ?? IconeTransparencia;
              const aberta = rota === `/admin/${slug}`;
              return (
                <li key={slug}>
                  <Link
                    href={`/admin/${slug}`}
                    aria-current={aberta ? "page" : undefined}
                    title={rotulo}
                    className={`flex h-11 items-center justify-center gap-3 rounded-xl text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:justify-start md:px-3 ${
                      aberta
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {/* Ouro na secao aberta, como no rodape do portal. */}
                    <Icone
                      className={`h-5 w-5 shrink-0 ${aberta ? "text-ouro" : ""}`}
                    />
                    {/* Um rotulo só, que sai da tela no trilho estreito em vez
                        de desaparecer: `sr-only` esconde do olho e mantem para
                        quem ouve, e `not-sr-only` o traz de volta no desktop.
                        Dois spans alternados dariam o mesmo visual e dois nomes
                        no leitor de tela. */}
                    <span className="truncate sr-only md:not-sr-only">
                      {rotulo}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Quem entrou e a saida, no pé — como no portal. No trilho estreito
            sobra só a inicial e o botao. */}
        <div className="shrink-0 border-t border-white/15 px-2 py-3 md:px-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-marinho md:mx-0"
            >
              {inicial}
            </span>
            <span className="hidden min-w-0 flex-1 truncate text-xs text-white/70 md:block">
              {nome}
            </span>
          </div>

          <form action={sair} className="mt-2">
            <button
              type="submit"
              title="Sair"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-white/15 text-xs font-semibold transition-colors duration-200 hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
