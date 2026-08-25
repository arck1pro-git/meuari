import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { BotaoInstalar } from "./instalar";
import { inicioDe, sessaoValida } from "@/lib/auth";
import { BotaoEntrar, DialogoEntrar } from "./dialogo-entrar";

export const metadata: Metadata = {
  title: "Entrar · Amaan Invest",
  // Tela de login nao tem por que aparecer em busca.
  robots: { index: false, follow: false },
};

// Le o cookie da requisicao, entao nada de resposta guardada.
export const dynamic = "force-dynamic";

/**
 * O que o portal entrega — com os icones 3D de `public`.
 *
 * Sao tres pontos, e nao um catalogo: acompanhar a obra, ver os documentos e
 * ser avisado. É o que o portal faz de fato — promessa a mais aqui vira
 * expectativa frustrada depois do login.
 *
 * Duas linhas por pastilha, e nada mais: elas sao lembrete ao lado da foto, nao
 * texto de venda. A frase que explicava cada uma saiu junto com a secao de
 * cartoes que a mostrava.
 */
const SELOS = [
  {
    icone: "3dicons-rocket-dynamic-color.png",
    titulo: "Acompanhamento",
    apoio: "A obra passo a passo",
  },
  {
    icone: "3dicons-folder-dynamic-color.png",
    titulo: "Transparência",
    apoio: "Contratos e relatórios",
  },
  {
    icone: "3dicons-bell-dynamic-color.png",
    titulo: "Avisos",
    apoio: "A cada etapa que avança",
  },
];

function Selo({
  selo,
  className = "",
}: {
  selo: (typeof SELOS)[number];
  className?: string;
}) {
  return (
    <span
      // Sombra propria, mais rasa que a `sombra-cartao`: aquela é calibrada
      // para o peso de um cartao e, numa pilula deste tamanho, desenha uma
      // borda escura em vez de elevacao.
      className={`flex items-center gap-2 rounded-full bg-white py-1.5 pr-3 pl-1.5 shadow-[0_4px_14px_-6px_rgb(0_20_73_/_0.3)] ring-1 ring-tinta/10 sm:gap-2.5 sm:py-2 sm:pr-4 sm:pl-2 ${className}`}
    >
      <Image
        src={`/icons/${selo.icone}`}
        alt=""
        width={32}
        height={32}
        className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
      />
      <span className="text-left">
        <span className="block text-[0.6875rem] font-semibold text-tinta sm:text-xs">
          {selo.titulo}
        </span>
        {/* A segunda linha sai no celular: ao lado de uma foto de 16rem, tres
            pastilhas de duas linhas viram parede. O titulo sozinho ja diz. */}
        <span className="hidden text-[0.6875rem] leading-tight text-neutral-500 sm:block">
          {selo.apoio}
        </span>
      </span>
    </span>
  );
}

/* Onde cada pastilha flutua em volta da foto: duas na esquerda e uma na
   direita, em alturas alternadas, para elas emoldurarem o aparelho em vez de
   enfileirar. Longe do centro, onde fica a tela do celular — o que ela mostra é
   o assunto, e pastilha por cima dela vira tapume.

   Atrasos *e* duracoes diferentes: so o atraso nao basta — com o mesmo periodo
   as tres voltam a se encontrar depois de algumas idas e vindas, e o conjunto
   pulsa em bloco. Com periodos primos entre si elas nunca sincronizam. */
const POSICOES_NA_FOTO = [
  "top-4 -left-6 lg:top-16 lg:left-0 [animation-delay:0ms] [animation-duration:3s]",
  "top-32 -right-5 lg:top-44 lg:right-2 [animation-delay:600ms] [animation-duration:3.7s]",
  "bottom-10 -left-4 lg:bottom-28 lg:left-2 [animation-delay:1200ms] [animation-duration:4.3s]",
];

/**
 * A foto do app em uso, encostada na base da capa.
 *
 * Sem painel branco: o PNG tem alfa de verdade, entao a mao recorta sozinha
 * sobre o azul — e sem a moldura o aparelho pode crescer ate o pé da secao,
 * coisa que dentro de um cartao ele nunca podia, porque o cartao tinha de
 * terminar antes.
 *
 * Duas montagens, uma peca só. No celular ela é o ultimo bloco do fluxo, no
 * centro e encostada no pé da secao — vem depois do texto e do botao, que é a
 * ordem em que se lê e se decide. A partir do `lg` vira camada absoluta na
 * direita: ali, no fluxo, o `py` da secao a seguraria acima da borda de baixo,
 * e é justamente encostar nela que da a impressao do aparelho saindo da tela.
 *
 * O recuo da direita (`lg:right-24`, `xl:right-40`) traz a foto e as pastilhas
 * para dentro da tela em vez de deixa-las coladas na borda. Mexer nele pede
 * mexer junto na largura maxima da coluna de texto: é ela que reserva esta
 * faixa, e as duas contas tem de bater.
 */
function FotoDoApp() {
  return (
    <div className="pointer-events-none relative mx-auto h-[19rem] w-[15rem] shrink-0 lg:absolute lg:right-24 lg:bottom-0 lg:mx-0 lg:h-[36rem] lg:w-[29rem] xl:right-40 xl:h-[46rem] xl:w-[36rem]">
      <Image
        // Nome sem espaco nem parentese, de proposito: numa URL eles viram
        // `%20` e `(`, e parentese ainda é metacaractere no regex do
        // `matcher` do `proxy.ts` — foi o que barrou o `mao (1).png`.
        //
        // Trocar o arquivo aqui pede duas coisas: conferir `width`/`height`
        // abaixo (é a proporcao que reserva o espaco) e liberar o nome novo
        // no `matcher` do `proxy.ts`, senao o otimizador recebe o redirect
        // para /login e responde 400 numa foto que existe.
        src="/amaaninvest.png"
        alt="O aplicativo Amaan Invest aberto num celular"
        width={3496}
        height={4807}
        /* `priority` porque é a imagem grande da primeira dobra — sem isto o
             Next a trata como qualquer outra e ela chega depois do texto. */
        priority
        sizes="(min-width: 1280px) 36rem, (min-width: 1024px) 29rem, 15rem"
        /* `h-full` na camada, e nao altura propria: quem manda no tamanho da
             foto passa a ser o bloco, num lugar só. */
        className="absolute bottom-0 left-1/2 h-full w-auto -translate-x-1/2 object-contain object-bottom"
      />

      {SELOS.map((selo, i) => (
        <Selo
          key={selo.titulo}
          selo={selo}
          className={`absolute animate-flutuar ${POSICOES_NA_FOTO[i]}`}
        />
      ))}
    </div>
  );
}

/**
 * O recado de sessao vencida, na propria capa.
 *
 * Ele morava dentro do dialogo, e era o que justificava abrir o dialogo sozinho
 * na carga. Fora dele, o recado é lido de imediato e o dialogo volta a ser o
 * que deveria: uma coisa que abre quando se pede.
 *
 * Ouro, e nao vermelho: sessao vencida nao é erro de quem entra, é o relogio do
 * sistema. Vermelho leria como senha errada, que é outra mensagem e vem de
 * dentro do formulario.
 */
function AvisoDeSessao() {
  return (
    <p
      role="status"
      className="mb-6 inline-flex items-start gap-2.5 rounded-xl bg-ouro/15 px-4 py-3 text-sm leading-relaxed text-white ring-1 ring-ouro/40"
    >
      Sua sessão expirou por inatividade. Entre novamente para continuar de onde
      parou.
    </p>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; expirou?: string }>;
}) {
  const { proximo, expirou } = await searchParams;

  /*
   * Quem ja tem sessao nao precisa ver o formulario.
   *
   * `sessaoValida` e nao `lerSessao`: um cookie que passou por "sair de todos
   * os aparelhos" continua com assinatura boa, e so o banco sabe que ele nao
   * vale mais. Com `lerSessao` esta pagina mandaria a pessoa para o portal, o
   * portal a mandaria de volta para ca, e os dois ficariam se empurrando.
   */
  const sessao = await sessaoValida();
  if (sessao) redirect(inicioDe(sessao.tipo));

  return (
    /*
     * Uma tela só: a capa ocupa a dobra inteira e o formulario abre por cima
     * dela, no dialogo. Nao ha o que rolar — a secao de entrada saiu.
     *
     * `min-h-dvh` e nao o `flex-1` do layout: o Lenis marca o documento com
     * `html.lenis, html.lenis body { height: auto }`, que vence o `h-full` do
     * layout raiz por especificidade, e sem altura no documento nada estica.
     */
    <div className="flex min-h-dvh flex-1 flex-col bg-tinta text-white">
      {/* ---------------------------------------------------------- capa -- */}
      {/* A capa é a propria secao: sem cartao por cima, sem canto e sem borda —
          o azul vai de borda a borda da tela. */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden px-5 py-8 sm:px-8 sm:py-10 lg:px-16 xl:px-24">
        {/*
         * A luz do canto superior esquerdo, em camada propria: o degrade morre
         * no meio da tela e deixa o resto no azul chapado, que é o que da
         * profundidade sem clarear tudo. Ver `luz-canto` no `globals.css`.
         */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 luz-canto"
        />

        {/*
         * Os pontos, em verde agua. Camada propria por causa da mascara do
         * `pontilhado`, que recorta o elemento inteiro em que é aplicada.
         *
         * A cor entra por variavel em vez de virar uma segunda classe: o padrao
         * é o mesmo, muda só a tinta do ponto. Sobre fundo escuro o ciano
         * precisa de opacidade baixa para pontilhar e nao chapar.
         */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 pontilhado"
          style={
            {
              "--cor-do-ponto": "rgb(23 249 255 / 0.3)",
            } as React.CSSProperties
          }
        />

        {/*
         * O botao no alto, a direita: é o lugar onde se procura a entrada num
         * site, e ele fica fora do bloco de texto para nao competir com a
         * frase. Ele nao rola para lugar nenhum — abre o formulario por cima da
         * pagina, que é a unica entrada que existe.
         *
         * No celular esta faixa fica so com o logo: o alto da tela ali é
         * estreito, e um botao ao lado do logo espremeria os dois. A entrada
         * desce para baixo do texto, no lugar onde o polegar chega. Um dos dois
         * aparece de cada vez — nunca os dois na mesma tela.
         */}
        <div className="relative flex shrink-0 items-center justify-between gap-4">
          {/*
           * O nome sobe para o topo: quem diz o produto passa a ser ele, no
           * canto, e a direita do miolo fica livre para a foto do app em uso.
           *
           * O arquivo é o `logonome.png` aparado — o original tem 34% de altura
           * em vazio transparente em cima e embaixo, e usado cru ele reservaria
           * quase o triplo da caixa que a tinta ocupa, empurrando o botao de
           * entrar para longe. Aqui o creme lê sobre o marinho; a versao de
           * fundo claro é outra, e mora na folha de entrada.
           *
           * `priority` porque é a primeira coisa da primeira dobra: sem isto o
           * nome do produto chega depois da frase que o explica.
           */}
          <Image
            src="/logonome-fundo-escuro.png"
            alt="Amaan Incorporadora"
            width={1452}
            height={394}
            priority
            className="h-9 w-auto sm:h-11"
          />

          <BotaoEntrar className="hidden lg:flex" />
        </div>

        {/*
         * O miolo: no desktop a frase fica na esquerda e a direita é reservada
         * a foto, que nao esta neste flex e sim na camada absoluta. No celular
         * é uma coluna só — texto, botao, foto —, e a foto vem depois, no
         * fluxo.
         *
         * `items-start` e nao `items-center`: o bloco sobe para logo abaixo do
         * botao em vez de flutuar no meio do que sobra da tela.
         */}
        <div className="relative flex flex-1 items-start pt-10 lg:pt-14">
          <div className="escalonar mx-auto w-full max-w-6xl lg:max-w-none">
            {/* A largura maxima é o que impede o texto de correr por baixo do
                aparelho: a foto ocupa a direita sem participar do fluxo, entao
                quem tem de parar antes é a coluna. A conta é a largura da
                camada mais o recuo dela — 29+6 no `lg`, 36+10 no `xl` — com
                folga para o texto nao encostar no aparelho. */}
            <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-[calc(100%-37rem)] lg:text-left xl:max-w-[calc(100%-48rem)]">
              {/*
               * Duas escolhas de texto que valem ficar registradas:
               *
               * - ponto no lugar da virgula, porque "Você ja investiu" e "agora
               *   acompanhe" sao oracoes independentes e a virgula as emendava;
               * - ouro nas duas palavras que carregam a promessa — o verbo do
               *   convite e o nome do produto. Sobre a tinta ele passa de 10:1
               *   de contraste; é sobre branco que ele nao pode virar texto.
               *
               * E as de forma: a hero inteira em serifada — `ui-serif`, a
               * Georgia do sistema, unica excecao ao Inter que corre em todo o
               * resto do projeto. No peso normal, e nao no `semibold` que ela
               * usava com o Inter: a serifa ja carrega contraste de traco por
               * conta propria, e somar peso a isso, neste corpo, vira mancha.
               *
               * O ouro continua marcando as duas palavras da promessa. Sem a
               * troca de fonte que elas tinham por um momento: com a frase toda
               * serifada, a cor sozinha ja as separa.
               *
               * A largura em `ch` fixa o numero de linhas acompanhando o
               * tamanho da fonte — `text-balance` só iguala o comprimento delas
               * depois que a largura ja decidiu quantas sao.
               */}
              {expirou && <AvisoDeSessao />}

              <h1 className="font-serif text-[2rem] leading-[1.1] font-normal tracking-tight text-balance sm:text-[2.75rem] lg:max-w-[22ch] lg:text-[3rem] xl:text-[3.5rem]">
                Você já investiu. Agora{" "}
                <span className="text-ouro">acompanhe</span> o crescimento do
                seu <span className="text-ouro">capital</span> e o que seu
                dinheiro está construindo.
              </h1>

              {/*
               * A frase de apoio saiu enxugada do rascunho: ele dizia
               * "andamento da obra e incorporação" e, duas linhas depois,
               * "andamento de cada etapa da obra" — a mesma palavra tres vezes.
               * Aqui ela aparece uma vez, e a lista do que se encontra vem
               * depois dos dois pontos, que é o que ela é.
               *
               * No celular ela nao aparece: com a hero, o botao e o aparelho
               * dividindo uma dobra so, cinco linhas de apoio empurrariam a
               * foto para fora da tela. Quem le no celular decide pela promessa
               * e pelo botao — o detalhe espera do outro lado.
               */}
              <p className="mt-8 hidden max-w-xl text-lg leading-relaxed text-white/70 lg:mt-10 lg:block">
                O Amaan Invest reúne num só lugar tudo sobre o seu investimento
                e o andamento da incorporação: os contratos e relatórios
                conforme são disponibilizados, a evolução de cada etapa da obra,
                as imagens mais recentes e quanto o seu dinheiro rendeu até
                aqui.
              </p>

              {/* A entrada do celular: largura cheia, logo abaixo do texto e
                  acima da foto — onde a mao alcanca. No desktop ela sai, porque
                  la a entrada é a do topo. Mesmo botao, mesmo dialogo; muda so
                  onde ele cabe melhor. */}
              <BotaoEntrar className="mt-9 w-full justify-center lg:hidden" />

              {/*
               * Instalar o app, em contorno: é oferta, e nao a acao principal
               * da tela. No celular ele cai logo abaixo de "Acessar conta"; no
               * desktop, onde aquele botao mora no topo, ele fica sozinho
               * embaixo do apoio — a mesma posicao na coluna, dois vizinhos
               * diferentes.
               *
               * `max-w-sm` porque o bloco tambem carrega o painel de passos que
               * o botao revela: sem teto, ele se espicharia pela largura da
               * coluna no desktop e viraria uma faixa de texto.
               */}
              <div className="mx-auto mt-4 max-w-sm lg:mx-0 lg:mt-6">
                <BotaoInstalar />
              </div>
            </div>
          </div>
        </div>

        {/* Ultimo bloco do fluxo no celular, camada absoluta no desktop. Vem
            depois do miolo, e nao antes, porque no celular esta é a ordem de
            leitura: promessa, entrada, e o aparelho fechando a tela. */}
        <FotoDoApp />

        {/* O dialogo em si — sem botao. Ele sobe para a *top layer*, entao o
            lugar dele na arvore nao muda nada; fica no fim para deixar claro
            que nao participa do empilhamento da capa. */}
        <DialogoEntrar proximo={proximo} />
      </section>
    </div>
  );
}
