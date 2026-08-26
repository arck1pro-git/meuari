import Link from "next/link";
import type { Notificacao } from "@/lib/portal/notificacoes";
import { Sino } from "./sino";

/*
 * O cabecalho de todas as telas: quem entrou e o sino.
 *
 * **Vale tambem no desktop.** Ele era `md:hidden`, e a partir do `md` quem
 * carregava o nome era a barra lateral. Ela nao existe mais, entao a
 * identificacao de quem entrou passou a valer nos dois tamanhos, aqui.
 *
 * **Sem fila de secoes e sem saida.** As secoes ficariam de enfeite: no
 * desktop o /portal ja mostra as tres de uma vez, e no celular quem navega é
 * a barra do rodape. A saida mora no /perfil, junto do "sair de todos os
 * aparelhos" — e o retrato aqui do lado é o caminho para la.
 *
 * O saldo saiu daqui — antes ele era assumido pelo cabecalho conforme a pessoa
 * rolava, com um `useEffect` medindo a cada quadro. Agora é assunto exclusivo do
 * cartao do /portal.
 *
 * Sem estado e sem rota lida, é Server Component.
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
     * Cor chapada, e nao degrade.
     *
     * A faixa usava `degrade-cabecalho`, que vai de `#001449` a `#012677` na
     * diagonal. Sobrou o tom escuro puro — o mesmo `tinta` que é o
     * `theme_color` do manifesto, entao a barra do sistema no Android continua
     * casando com o topo do app.
     *
     * **A classe do degrade nao foi tocada**: ela ainda veste o hero da obra, o
     * retrato do /perfil e os cartoes do simulador. O que mudou foi so quem a
     * usa aqui.
     */
    /*
     * **No desktop a faixa é reta e chapada.** Sem canto arredondado e sem
     * nenhuma das camadas de brilho — só `tinta`.
     *
     * O canto de baixo existe para o formato de aplicativo: num telefone a
     * faixa é um bloco que termina, e o arredondado o separa do conteudo. Numa
     * tela larga ela atravessa 1900px de ponta a ponta, e o mesmo raio de 16px
     * vira um detalhe perdido nas duas extremidades — lê como falha de
     * alinhamento, e nao como acabamento.
     *
     * Os brilhos seguem o mesmo raciocinio: no celular a faixa ocupa boa parte
     * da tela e o movimento a torna viva; esticada num monitor ela é uma regua
     * de 60px de altura, e um degrade passeando ali é ruido permanente no
     * campo de visao de quem esta lendo numero logo abaixo. É a mesma razao
     * que ja tirou o degrade da coluna do /admin.
     */
    <header className="sticky top-0 z-50 isolate animate-surgir rounded-b-2xl bg-tinta text-white md:rounded-b-none">
      {/* Camadas decorativas: sem z-index proprio, ficam acima do fundo da
          faixa e abaixo do conteudo, que sobe com `relative`. O
          `overflow-hidden` fica nesta caixa, e nao no <header>: no header ele
          tambem recortaria o painel que abre abaixo do sino.

          `md:hidden` desliga as tres de uma vez — é o bloco inteiro que sai do
          desktop, e nao cada brilho por sua conta. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-2xl md:hidden"
      >
        <div className="absolute inset-0 animate-deriva brilho-ciano" />
        {/* O gemeo no canto oposto. Atraso proprio para os dois nao subirem e
            descerem em bloco, o que leria como uma coisa só piscando. */}
        <div className="absolute inset-0 animate-deriva brilho-ciano-canto [animation-delay:-8s]" />
        <div className="absolute inset-y-0 left-0 w-1/4 animate-brilho bg-linear-to-r from-transparent via-white/25 to-transparent" />
      </div>

      {/*
       * A faixa tem 52px (`py-2`), 60px a partir do `sm` (`sm:py-3`) — o alvo de
       * toque continua de sobra porque quem o recebe é o link inteiro, retrato e
       * nome juntos, e nao o circulo sozinho.
       *
       * Largura inteira, sem o `mx-auto max-w-5xl` que prendia a faixa em 64rem.
       * O /portal passou a ocupar a tela toda, e um cabecalho mais estreito que o
       * conteudo deixaria o nome e o sino flutuando para dentro das bordas
       * enquanto os cartoes iam ate elas.
       *
       * As telas que continuam com coluna centrada — historico, perfil — ficam
       * com o cabecalho mais largo que o miolo. É o arranjo comum de app de
       * largura cheia, e o `px` é o mesmo nos dois, entao as pontas se
       * correspondem.
       */}
      <div className="relative flex w-full items-center justify-between gap-4 px-5 py-2 sm:px-8 sm:py-3">
        {/* A foto e o nome sao um alvo só, e nao dois: quem toca no retrato
            espera o mesmo que quem toca no "Ver perfil" logo abaixo. */}
        <Link
          href="/perfil"
          className="group flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marinho"
        >
          {/* A inicial de quem entrou. `aria-hidden` porque o nome vem escrito
              logo ao lado: para quem ouve a pagina, a letra seria repeticao. */}
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-marinho"
          >
            {inicial}
          </span>

          {/*
           * O nome ganhou o peso e o "Olá" perdeu: quem identifica a conta é o
           * nome, e a saudacao é so a moldura dele. O "Ver perfil" desceu de
           * tamanho e de opacidade para ler como link secundario, que é o que
           * ele é — a acao principal do cabecalho nunca foi essa.
           */}
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

        {/*
         * Só o sino na ponta direita.
         *
         * A saida esteve aqui ao lado dele por uma versao, e saiu: sair é o
         * oposto de um aviso, e ter os dois a um pixel de distancia convidava
         * ao toque errado. Ela voltou a morar so no /perfil, alcancado pelo
         * retrato deste mesmo cabecalho.
         */}
        <Sino notificacoes={notificacoes} />
      </div>
    </header>
  );
}
