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
 * 64px, e a partir do desktop abre para 208px com os nomes ao lado. O rotulo
 * nunca some — no trilho ele vive no `title` e num `sr-only`.
 *
 * Os 208px sao o piso, e nao um numero redondo: descontados o respiro da lista,
 * o do item, o icone e o vao, sobram ~128px para o rotulo, e "Empreendimentos"
 * — o mais longo — ocupa ~110px em 14px. Abaixo disso ele passa a truncar, e um
 * nome cortado na navegacao é pior do que a coluna larga.
 *
 * As secoes vem em grupos (ver `GRUPOS`), e a inicial do painel é o primeiro
 * item da lista, chamado "Dashboard".
 *
 * Ela era o bloco do topo — avatar "A" com "Administração / Meu ARI" —, que
 * levava para `/admin` sem parecer que levava a lugar nenhum: no formato de
 * cabecalho lia como marca, e marca nao se clica. Como item da lista, com icone
 * e o mesmo realce de secao aberta dos outros, ele é o que sempre foi: uma tela
 * do painel. E a coluna ganhou os 64px de altura que o cabecalho ocupava.
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
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-white/10 bg-tinta text-white md:w-52">
      <div className="flex h-full flex-col">
        {/* A lista rola dentro da coluna quando nao couber — o rodape com o
            "Sair" fica parado no pé. `pt-4` porque nao ha mais cabecalho acima:
            o `py-3` de antes encostava o primeiro item no alto da tela. */}
        <nav
          aria-label="Seções do painel"
          className="min-h-0 flex-1 overflow-y-auto px-2 pt-4 pb-3 [scrollbar-width:thin] md:px-3"
        >
          {/* Fora dos grupos, e sozinha: o Dashboard nao é uma tabela, e o
              `agrupar` trabalha sobre os slugs de `TABELAS`. Em cima porque é a
              tela de chegada. */}
          <ul>
            <li>
              <ItemDaColuna
                href="/admin"
                rotulo="Dashboard"
                Icone={IconePainel}
                aberta={naInicial}
              />
            </li>
          </ul>

          {blocos.map((bloco) => (
            <div key={bloco.titulo || "outras"} className="mt-5">
              {/* O titulo do grupo so existe no desktop. No trilho de icones
                  ele nao caberia, e a separacao ali fica por conta do respiro
                  entre os blocos — que é a mesma informacao, em silencio. */}
              {bloco.titulo && (
                <p className="mb-1.5 hidden px-3 text-[0.625rem] font-semibold tracking-wider text-white/40 uppercase md:block">
                  {bloco.titulo}
                </p>
              )}

              <ul className="space-y-1">
                {bloco.itens.map(({ slug, rotulo }) => (
                  <li key={slug}>
                    <ItemDaColuna
                      href={`/admin/${slug}`}
                      rotulo={rotulo}
                      Icone={ICONES[slug] ?? IconeTransparencia}
                      aberta={rota === `/admin/${slug}`}
                    />
                  </li>
                ))}
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

/**
 * Um item da coluna: icone, rotulo e o realce de aberto.
 *
 * Componente, e nao o `className` repetido duas vezes: o Dashboard e as nove
 * secoes tem exatamente o mesmo comportamento, e duplicar aquela linha de
 * classes era garantir que os dois divergissem no primeiro ajuste.
 */
function ItemDaColuna({
  href,
  rotulo,
  Icone,
  aberta,
}: {
  href: string;
  rotulo: string;
  Icone: React.ComponentType<{ className?: string }>;
  aberta: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={aberta ? "page" : undefined}
      title={rotulo}
      /* A barrinha de ouro na borda esquerda marca a secao aberta no trilho
         estreito, onde o rotulo nao cabe e o fundo claro sozinho é pouco. */
      className={`relative flex h-11 items-center justify-center gap-3 rounded-xl text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:justify-start md:px-3 ${
        aberta
          ? "bg-white/[0.14] text-white before:absolute before:top-2.5 before:bottom-2.5 before:-left-2 before:w-1 before:rounded-r-full before:bg-ouro md:before:-left-3"
          : "text-white/70 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {/* Ouro na secao aberta, como no rodape do portal. */}
      <Icone className={`h-5 w-5 shrink-0 ${aberta ? "text-ouro" : ""}`} />
      {/* Um rotulo só, que sai da tela no trilho estreito em vez de
          desaparecer: `sr-only` esconde do olho e mantem para quem ouve, e
          `not-sr-only` o traz de volta no desktop. Dois spans alternados dariam
          o mesmo visual e dois nomes no leitor de tela. */}
      <span className="truncate sr-only md:not-sr-only">{rotulo}</span>
    </Link>
  );
}

/**
 * Quadros: o Dashboard. Local, como o da porta — só o painel usa.
 *
 * Grade de quatro, e nao um grafico: os quadros dizem "tela com varios blocos",
 * que é o que a inicial é. Um icone de grafico competiria com o
 * `IconePorcentagem` das etapas e com o `IconeInvestimento` dos recebimentos,
 * que ja sao os dois mais parecidos da coluna.
 */
function IconePainel({ className = "h-5 w-5" }) {
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
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
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
