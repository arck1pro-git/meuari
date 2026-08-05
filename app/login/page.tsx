import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { inicioDe, sessaoValida } from "@/lib/auth";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = {
  title: "Entrar · Meu ARI",
  // Tela de login nao tem por que aparecer em busca.
  robots: { index: false, follow: false },
};

// Le o cookie da requisicao, entao nada de resposta guardada.
export const dynamic = "force-dynamic";

/** O que o portal entrega, em quatro palavras — com os icones 3D de `public`. */
const SELOS = [
  {
    icone: "3dicons-shield-dynamic-color.png",
    titulo: "Segurança",
    apoio: "Acesso só seu",
  },
  {
    icone: "3dicons-dollar-dynamic-color.png",
    titulo: "Rentabilidade",
    apoio: "Participação nos resultados",
  },
  {
    icone: "3dicons-folder-dynamic-color.png",
    titulo: "Transparência",
    apoio: "Documentos da obra",
  },
  {
    icone: "3dicons-bell-dynamic-color.png",
    titulo: "Avisos",
    apoio: "A cada crédito",
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
      className={`flex items-center gap-2.5 rounded-full bg-white py-2 pr-4 pl-2 shadow-[0_4px_14px_-6px_rgb(0_20_73_/_0.3)] ring-1 ring-tinta/10 ${className}`}
    >
      <Image
        src={`/icons/${selo.icone}`}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0"
      />
      <span className="text-left">
        <span className="block text-xs font-semibold text-tinta">
          {selo.titulo}
        </span>
        <span className="block text-[0.6875rem] leading-tight text-neutral-500">
          {selo.apoio}
        </span>
      </span>
    </span>
  );
}

/* Onde cada selo flutua no desktop, e com quanto atraso — atrasos diferentes
   para eles nao subirem e descerem em bloco, o que pareceria uma coisa só. */
const POSICOES = [
  "top-[16%] left-[12%] [animation-delay:0ms]",
  "top-[30%] right-[11%] [animation-delay:600ms]",
  "bottom-[26%] left-[14%] [animation-delay:1200ms]",
  "bottom-[17%] right-[13%] [animation-delay:1800ms]",
];

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
     * `min-h-dvh` e nao o `flex-1` do layout: o Lenis marca o documento com
     * `html.lenis, html.lenis body { height: auto }`, que vence o `h-full` do
     * layout raiz por especificidade. Sem altura no documento, `min-h-full` e
     * `flex-1` nao esticam, e a coluna nunca chega ao meio da tela.
     */
    <div className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-white px-5 py-14">
      {/* Camada propria por causa da mascara do `pontilhado`, que recorta o
          elemento inteiro em que é aplicada. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 pontilhado" />

      {/* Selos espalhados: so onde ha margem em volta do cartao. Abaixo do `lg`
          eles viram uma fileira, dentro da coluna. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden lg:block"
      >
        {SELOS.map((selo, i) => (
          <Selo
            key={selo.titulo}
            selo={selo}
            className={`absolute animate-boiar ${POSICOES[i]}`}
          />
        ))}
      </div>

      <main className="escalonar relative w-full max-w-sm">
        {/* O logo do app, o mesmo icone da tela de inicio. Ele ja é quadrado
            e ja traz o fundo tinta, entao dispensa o circulo branco que a arte
            deitada exigia — aqui basta arredondar. */}
        <Image
          src="/logo.png"
          alt="Meu ARI"
          width={1080}
          height={1080}
          className="mx-auto h-20 w-20 rounded-2xl shadow-[0_6px_18px_-6px_rgb(0_20_73_/_0.45)]"
          loading="eager"
        />

        {/*
          * O mesmo cartao escuro do resto do app: a classe `degrade-cartao` do
          * `globals.css`, em CSS puro. Antes era um degrade montado com os
          * utilitarios do Tailwind e terminando no `ceu`, que é justamente o
          * par que foi trocado no portal — o fim claro lavava o canto e as
          * camadas de `color-mix` sumiam em alguns navegadores.
          */}
        <div className="degrade-cartao sombra-cartao-alta mt-6 rounded-2xl p-6 text-white sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Meu ARI</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Entre para acompanhar seus aportes, sua participação nos resultados e
            o andamento da obra.
          </p>

          {expirou && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-white/15 px-4 py-2.5 text-sm text-white ring-1 ring-white/25"
            >
              Sua sessão expirou. Entre novamente para continuar.
            </p>
          )}

          <FormularioLogin proximo={proximo} />
        </div>

        <ul
          aria-hidden
          className="mt-8 flex flex-wrap justify-center gap-2 lg:hidden"
        >
          {SELOS.map((selo) => (
            <li key={selo.titulo}>
              <Selo selo={selo} />
            </li>
          ))}
        </ul>

        {/* Uma unica copia acessivel dos selos: as duas versoes visiveis se
            revezam por breakpoint, e a escondida some da arvore junto. */}
        <p className="sr-only">
          {SELOS.map((s) => `${s.titulo}: ${s.apoio}.`).join(" ")}
        </p>

        <p className="mt-6 text-center text-xs leading-relaxed text-neutral-400">
          Ainda não tem acesso? Fale com o time comercial para receber suas
          credenciais.
        </p>
      </main>
    </div>
  );
}
