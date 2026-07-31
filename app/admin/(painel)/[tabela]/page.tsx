import Link from "next/link";
import { notFound } from "next/navigation";
import { listar, obter, opcoesDeReferencia, type Linha } from "@/lib/admin/crud";
import { acharTabela, type Tabela } from "@/lib/admin/tabelas";
import { acaoExcluir } from "../../acoes";
import { Formulario } from "./formulario";

export const dynamic = "force-dynamic";

/** Legenda das chaves estrangeiras: id cru nao diz nada em tela. */
async function mapaDeRotulos(tabela: Tabela) {
  const mapa = new Map<string, string>();
  for (const campo of tabela.campos) {
    if (campo.tipo !== "referencia") continue;
    for (const o of await opcoesDeReferencia(campo)) mapa.set(o.id, o.rotulo);
  }
  return mapa;
}

function exibir(valor: unknown, rotulos: Map<string, string>): string {
  if (valor === null || valor === undefined) return "—";
  if (valor instanceof Date) return valor.toLocaleDateString("pt-BR");
  const texto = String(valor);
  return rotulos.get(texto) ?? texto;
}

export default async function TabelaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tabela: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const { tabela: slug } = await params;
  const { editar } = await searchParams;

  // Slug desconhecido vira 404 — nunca chega ao SQL.
  const tabela = acharTabela(slug);
  if (!tabela) notFound();

  const [linhas, rotulos, emEdicao] = await Promise.all([
    listar(tabela),
    mapaDeRotulos(tabela),
    editar ? obter(tabela, editar) : Promise.resolve(undefined),
  ]);

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-bold">{tabela.rotulo}</h1>
        <span className="text-xs text-neutral-500">
          {linhas.length} {linhas.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      <div className="mt-6">
        <Formulario tabela={tabela} linha={emEdicao} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-tinta/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-tinta/10 text-xs text-neutral-500">
            <tr>
              {tabela.colunas.map((c) => (
                <th key={c} className="px-4 py-3 font-medium whitespace-nowrap">
                  {c}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {linhas.length === 0 && (
              <tr>
                <td
                  colSpan={tabela.colunas.length + 1}
                  className="px-4 py-8 text-center text-sm text-neutral-400"
                >
                  Nenhum registro ainda.
                </td>
              </tr>
            )}

            {linhas.map((linha: Linha) => (
              <tr key={String(linha.id)}>
                {tabela.colunas.map((c) => (
                  <td key={c} className="px-4 py-3 whitespace-nowrap">
                    {exibir(linha[c], rotulos)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/admin/${tabela.slug}?editar=${String(linha.id)}`}
                    className="text-xs font-medium text-marinho hover:text-azul"
                  >
                    Editar
                  </Link>
                  {/* Formulario proprio: excluir muda o servidor, entao precisa
                      ser POST, e nao um link que qualquer prefetch dispararia. */}
                  <form
                    action={acaoExcluir.bind(
                      null,
                      tabela.slug,
                      String(linha.id),
                    )}
                    className="ml-4 inline"
                  >
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
