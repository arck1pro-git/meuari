import Link from "next/link";
import { consultar } from "@/lib/db";
import { TABELAS } from "@/lib/admin/tabelas";
import { IconeSetaDireita } from "@/app/(app)/portal/_componentes/icones";

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
      <h1 className="animate-surgir text-base font-bold tracking-tight text-black">
        Tabelas
      </h1>
      <p className="mt-1 animate-surgir text-sm text-neutral-500 [animation-delay:60ms]">
        Criar, editar e excluir registros de cada tabela.
      </p>

      <ul className="escalonar mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contagens.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/admin/${t.slug}`}
              className="sombra-cartao hover:sombra-cartao-alta group flex h-full items-center justify-between gap-4 rounded-2xl border border-tinta/12 bg-white p-5 transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
            >
              <span>
                <span className="block text-sm font-semibold text-tinta">
                  {t.rotulo}
                </span>
                {/* A contagem em ouro, como o "agora" do portal: é o dado da
                    peca, e o resto do cartao é rotulo. */}
                <span className="mt-1 block text-xs text-neutral-500">
                  <span className="font-bold tabular-nums text-ouro">
                    {t.total}
                  </span>{" "}
                  {t.total === 1 ? "registro" : "registros"}
                </span>
              </span>

              <IconeSetaDireita className="h-5 w-5 shrink-0 text-marinho transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
