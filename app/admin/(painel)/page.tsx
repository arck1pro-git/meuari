import Link from "next/link";
import { consultar } from "@/lib/db";
import { TABELAS } from "@/lib/admin/tabelas";

// Contagem por tabela, sempre do banco — nada de cache entre visitas.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const contagens = await Promise.all(
    TABELAS.map(async (t) => {
      // O nome da tabela vem do registro, nunca da requisicao.
      const [linha] = await consultar<{ total: string }>(
        `select count(*)::text as total from "${t.tabela}"`,
      );
      return { ...t, total: Number(linha?.total ?? 0) };
    }),
  );

  return (
    <>
      <h1 className="text-xl font-bold">Tabelas</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Criar, editar e excluir registros de cada tabela.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contagens.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/admin/${t.slug}`}
              className="block rounded-xl border border-tinta/10 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <span className="block text-sm font-semibold">{t.rotulo}</span>
              <span className="mt-1 block text-xs text-neutral-500">
                {t.total} {t.total === 1 ? "registro" : "registros"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
