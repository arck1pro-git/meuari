import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BotaoInstalar } from "./instalar";

export const metadata: Metadata = {
  title: "Baixe o Meu ARI",
  description:
    "Instale o Meu ARI no seu celular e acompanhe os rendimentos do seu aporte com segurança.",
};

/** O que o app entrega, em duas palavras — com os icones 3D de `public`. */
const SELOS = [
  {
    icone: "3dicons-shield-dynamic-color.png",
    titulo: "Segurança",
    apoio:
      "Entrada por senha só sua, e os documentos do seu contrato atrás dela.",
  },
  {
    icone: "3dicons-folder-dynamic-color.png",
    titulo: "Transparência",
    apoio:
      "Cada crédito com a conta que o gerou, e as fotos da obra que você está construindo.",
  },
];

/**
 * A pagina para quem ainda nao tem o app.
 *
 * Publica de proposito — ela é feita para ser mandada por mensagem, e exigir
 * sessao para ver "baixe o app" seria pedir que a pessoa entre no que ela ainda
 * nao instalou.
 *
 * Nao ha loja: o Meu ARI é um app instalavel direto do navegador. O que muda de
 * um aparelho para outro é *como* se instala, e disso cuida o `BotaoInstalar`.
 */
export default function DownloadPage() {
  return (
    <div className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-white px-5 py-14">
      {/* Camada propria por causa da mascara do `pontilhado`, que recorta o
          elemento inteiro em que é aplicada. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 pontilhado" />

      <main className="escalonar relative w-full max-w-sm">
        <Image
          src="/logo.png"
          alt="Meu ARI"
          width={1080}
          height={1080}
          className="mx-auto h-20 w-20 rounded-2xl shadow-[0_6px_18px_-6px_rgb(0_20_73_/_0.45)]"
          loading="eager"
        />

        <div className="degrade-cartao sombra-cartao-alta mt-6 rounded-2xl p-6 text-white sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            Acompanhe o seu ARI pelo celular
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Instale o <span className="font-semibold text-white">Meu ARI</span> e
            veja quanto o seu aporte rendeu, o que já caiu na conta e como anda a
            obra — com mais segurança, direto na tela de início.
          </p>

          <ul className="mt-6 space-y-4">
            {SELOS.map((selo) => (
              <li key={selo.titulo} className="flex items-start gap-3">
                <Image
                  src={`/icons/${selo.icone}`}
                  alt=""
                  width={80}
                  height={80}
                  className="h-10 w-10 shrink-0"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {selo.titulo}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/70">
                    {selo.apoio}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <BotaoInstalar />
          </div>

          <p className="mt-4 text-center text-xs text-white/60">
            Não ocupa espaço como um app de loja: ele é instalado direto do
            navegador e abre como qualquer outro aplicativo.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Já tem acesso?{" "}
          <Link
            href="/login"
            className="rounded font-semibold text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
          >
            Entrar no portal
          </Link>
        </p>
      </main>
    </div>
  );
}
