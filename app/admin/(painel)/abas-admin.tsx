"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A fila de tabelas do cabecalho, com a atual marcada.
 *
 * Cliente por um motivo só: qual tabela esta aberta é a rota, e um layout nao
 * recebe os parametros da pagina que ele envolve. `usePathname` responde isso
 * sem prop atravessando tres niveis.
 */
export function AbasAdmin({
  tabelas,
}: {
  tabelas: { slug: string; rotulo: string }[];
}) {
  const rota = usePathname();

  return (
    <nav
      aria-label="Tabelas"
      className="mx-auto flex w-full max-w-6xl gap-1.5 overflow-x-auto px-5 pb-3 sm:px-8"
    >
      {tabelas.map((t) => {
        const aberta = rota === `/admin/${t.slug}`;
        return (
          <Link
            key={t.slug}
            href={`/admin/${t.slug}`}
            aria-current={aberta ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              aberta
                ? "bg-white text-tinta"
                : "bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
            }`}
          >
            {t.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
