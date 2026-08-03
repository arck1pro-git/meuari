import Link from "next/link";
import { notFound } from "next/navigation";
import { listar, obter, opcoesDeReferencia, type Linha } from "@/lib/admin/crud";
import { acharTabela, type Tabela } from "@/lib/admin/tabelas";
import { acaoExcluir } from "../../acoes";
import { FiltroDaListagem } from "./filtro";
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
  /** `f` é o valor do filtro declarado no registro da tabela. */
  searchParams: Promise<{ editar?: string; f?: string }>;
}) {
  const { tabela: slug } = await params;
  const { editar, f } = await searchParams;

  // Slug desconhecido vira 404 — nunca chega ao SQL.
  const tabela = acharTabela(slug);
  if (!tabela) notFound();

  /*
   * So a primeira coluna declarada em `filtros` — hoje nenhuma tabela pede
   * duas, e uma fila de seletores para um caso hipotetico seria peso morto.
   */
  const campoDoFiltro = tabela.filtros?.[0];
  const campoReferencia = tabela.campos.find((c) => c.nome === campoDoFiltro);
  const filtro = campoDoFiltro && f ? { campo: campoDoFiltro, valor: f } : undefined;

  const [linhas, rotulos, emEdicao, opcoesDoFiltro] = await Promise.all([
    listar(tabela, filtro),
    mapaDeRotulos(tabela),
    editar ? obter(tabela, editar) : Promise.resolve(undefined),
    campoReferencia ? opcoesDeReferencia(campoReferencia) : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="flex animate-surgir flex-wrap items-center justify-between gap-4">
        <h1 className="text-base font-bold tracking-tight text-black">
          {tabela.rotulo}
        </h1>
        <div className="flex shrink-0 items-center gap-4">
          {campoReferencia && (
            <FiltroDaListagem
              rotulo={campoReferencia.rotulo}
              parametro="f"
              opcoes={opcoesDoFiltro}
              selecionado={f ?? ""}
              destino={`/admin/${tabela.slug}`}
            />
          )}

          <span className="text-xs text-neutral-500">
            <span className="font-bold tabular-nums text-ouro">
              {linhas.length}
            </span>{" "}
            {linhas.length === 1 ? "registro" : "registros"}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <Formulario tabela={tabela} linha={emEdicao} />
      </div>

      {/* A tabela é larga por natureza; o `overflow-x-auto` deixa ela rolar
          dentro do cartao em vez de empurrar a pagina inteira de lado. */}
      <div className="sombra-cartao mt-6 overflow-x-auto rounded-2xl border border-tinta/12 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-tinta/10 bg-tinta/[0.03] text-xs text-neutral-500">
            <tr>
              {tabela.colunas.map((c) => (
                <th
                  key={c}
                  className="px-4 py-3 font-medium tracking-wide whitespace-nowrap uppercase"
                >
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
                  className="px-4 py-10 text-center text-sm text-neutral-500"
                >
                  Nenhum registro ainda.
                </td>
              </tr>
            )}

            {linhas.map((linha: Linha) => (
              <tr
                key={String(linha.id)}
                className="transition-colors duration-200 hover:bg-azul/[0.04]"
              >
                {tabela.colunas.map((c) => (
                  <td key={c} className="px-4 py-3 whitespace-nowrap">
                    {exibir(linha[c], rotulos)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/admin/${tabela.slug}?editar=${String(linha.id)}`}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-marinho transition-colors duration-200 hover:bg-marinho/10 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
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
                    className="ml-1 inline"
                  >
                    <button
                      type="submit"
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
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
