import Link from "next/link";
import type { Notificacao } from "@/lib/portal/notificacoes";
import { IconeInvestimento, IconeSimulador, IconeTransparencia } from "./icones";
import { Sino } from "./sino";

/**
 * A navegacao do desktop.
 *
 * `hidden md:flex` — ela só existe a partir do desktop, e ali substitui as duas
 * pecas do mobile de uma vez: o cabecalho, que tinha o retrato e o sino, e a
 * barra do rodape, que tinha as secoes e o simulador. Nada foi reaproveitado de
 * posicao; o que se reaproveita é o conteudo.
 *
 * `fixed` e nao `sticky`: a coluna acompanha a rolagem sem depender da altura do
 * conteudo ao lado, e o respiro do lado direito é dado por quem a usa, com um
 * `md:pl-60` na moldura.
 */
const SECOES = [
  { href: "/portal", rotulo: "Meus aportes", Icone: IconeInvestimento },
  { href: "/obras", rotulo: "Obras", Icone: IconeTransparencia },
] as const;

export function BarraLateral({
  nome,
  notificacoes,
  ativo,
}: {
  nome: string;
  notificacoes: Notificacao[];
  /** Secao aberta. `null` nas telas que nao sao secao — perfil, artigo. */
  ativo: "/portal" | "/obras" | "/simulador" | null;
}) {
  const primeiroNome = nome.split(" ")[0];
  const inicial = (Array.from(primeiroNome)[0] ?? "?").toUpperCase();

  return (
    <aside className="degrade-cabecalho fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-hidden text-white md:flex">
      {/* As mesmas camadas do cabecalho, giradas para uma coluna: o brilho de
          cima e o do canto oposto. Decorativas, sem z-index — o conteudo sobe
          com `relative`. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 animate-deriva brilho-ciano" />
        <div className="absolute inset-0 animate-deriva brilho-ciano-canto [animation-delay:-8s]" />
      </div>

      <div className="relative flex h-full flex-col gap-8 px-4 py-6">
        {/* Quem entrou. Retrato, nome e "Ver perfil" num alvo só, como no
            cabecalho do mobile. */}
        <Link
          href="/perfil"
          className="group flex items-center gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-marinho"
          >
            {inicial}
          </span>

          {/* O mesmo peso do cabecalho do mobile: o nome carrega, a saudacao é
              moldura, e "Ver perfil" le como link secundario. */}
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] leading-tight font-bold">
              <span className="font-normal text-white/70">Olá, </span>
              {primeiroNome}
            </span>
            <span className="mt-0.5 block text-[0.6875rem] leading-tight font-medium text-white/60 underline-offset-2 transition-colors duration-200 group-hover:text-white/90 group-hover:underline">
              Ver perfil
            </span>
          </span>
        </Link>

        <nav aria-label="Secoes do portal">
          <ul className="space-y-1">
            {SECOES.map(({ href, rotulo, Icone }) => {
              const selecionada = href === ativo;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={selecionada ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      selecionada
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {/* Ouro na secao aberta, o mesmo do rodape do mobile. */}
                    <Icone
                      className={`h-5 w-5 shrink-0 ${
                        selecionada ? "text-ouro" : ""
                      }`}
                    />
                    {rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* O simulador era o botao redondo do meio do rodape. Aqui ele é uma
            linha inteira: numa coluna, o circulo flutuante nao teria a que se
            ancorar. */}
        <Link
          href="/simulador"
          aria-current={ativo === "/simulador" ? "page" : undefined}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            ativo === "/simulador"
              ? "bg-ciano/45"
              : "bg-ciano/25 hover:bg-ciano/40"
          }`}
        >
          {/* Ouro na secao aberta, como nas duas de cima. */}
          <IconeSimulador
            className={`h-5 w-5 shrink-0 ${
              ativo === "/simulador" ? "text-ouro" : ""
            }`}
          />
          Simulador
        </Link>

        {/* `mt-auto` empurra o sino para o pé da coluna: ele é aviso, nao
            navegacao, e no rodape do mobile tambem ficava fora da fila. */}
        <div className="mt-auto flex items-center gap-3">
          <Sino notificacoes={notificacoes} alinhamento="esquerda" />
          <span className="text-xs text-white/60">Notificações</span>
        </div>
      </div>
    </aside>
  );
}
