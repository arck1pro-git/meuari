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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-tinta/10 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-tinta">Administracao</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Area restrita a administradores.
        </p>

        {erro === "restrito" && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Sua conta nao tem acesso a esta area.
          </p>
        )}

        <FormularioLogin />
      </div>
    </div>
  );
}
