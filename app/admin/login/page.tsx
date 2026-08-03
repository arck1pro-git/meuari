import type { Metadata } from "next";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = {
  title: "Entrar · Administracao",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    // O mesmo fundo pontilhado da entrada do investidor, com a mesma mascara
    // que apaga os pontos nas bordas.
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-white px-5">
      <div aria-hidden className="pontilhado absolute inset-0" />

      <div className="sombra-cartao-alta relative w-full max-w-sm animate-surgir rounded-2xl border border-tinta/12 bg-white p-8">
        <h1 className="text-lg font-bold tracking-tight text-black">
          Administração
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Área restrita a administradores.
        </p>

        {erro === "restrito" && (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            Sua conta não tem acesso a esta área.
          </p>
        )}

        <FormularioLogin />
      </div>
    </div>
  );
}
