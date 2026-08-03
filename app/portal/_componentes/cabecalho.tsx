import Link from "next/link";
import type { Notificacao } from "@/lib/portal/notificacoes";
import { Sino } from "./sino";

/*
 * O cabecalho do mobile: quem entrou e o sino.
 *
 * `md:hidden` — a partir do desktop ele nao existe, e tudo o que estava aqui
 * passa para a barra lateral. Nao é o mesmo bloco reposicionado: sao duas
 * formas para dois tamanhos, e a lateral tem espaco para nome, secoes e sino
 * de uma vez.
 *
 * O saldo saiu daqui — antes ele era assumido pelo cabecalho conforme a pessoa
 * rolava, com um `useEffect` medindo a cada quadro. Agora é assunto exclusivo do
 * cartao do /portal.
 *
 * Voltou a ser Server Component quando o sino saiu para o modulo dele: o estado
 * do painel mora la, e aqui nao sobrou nada de cliente.
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

  return (
    // `sticky` e nao `fixed`: assim o header continua ocupando altura no fluxo
    // e o conteudo abaixo nao precisa de padding de compensacao.
    /*
     * O degrade vai de escuro a escuro: quem acende a faixa sao os dois brilhos
     * radiais abaixo, um em cada canto. Terminar no ceu deixava o canto inferior
     * lavado de azul-claro, porque parada de cor termina em parede.
     *
     * A cor vem da classe `degrade-cabecalho`, escrita em CSS puro no
     * `globals.css` — ver o comentario de la sobre por que ela nao usa os
     * utilitarios de degrade do Tailwind.
     */
    <header className="degrade-cabecalho sticky top-0 z-50 isolate animate-surgir rounded-b-2xl text-white md:hidden">
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
        {/* A foto e o nome sao um alvo só, e nao dois: quem toca no retrato
            espera o mesmo que quem toca no "Ver perfil" logo abaixo. */}
        <Link
          href="/perfil"
          className="group flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marinho"
        >
          {/* A inicial de quem entrou. `aria-hidden` porque o nome vem escrito
              logo ao lado: para quem ouve a pagina, a letra seria repeticao. */}
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-marinho"
          >
            {inicial}
          </span>

          <span>
            <span className="block text-sm font-semibold">
              Olá, <span className="font-bold">{primeiroNome}</span>
            </span>
            <span className="block text-xs text-white/70 transition-colors duration-200 group-hover:text-white">
              Ver perfil
            </span>
          </span>
        </Link>

        <Sino notificacoes={notificacoes} />
      </div>
    </header>
  );
}
