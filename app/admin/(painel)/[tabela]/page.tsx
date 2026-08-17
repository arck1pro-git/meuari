import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listar,
  obter,
  opcoesDeReferencia,
  type Linha,
} from "@/lib/admin/crud";
import { acharTabela, type Tabela } from "@/lib/admin/tabelas";
import { acaoExcluir } from "../../acoes";
import { PainelDeAgendamentos } from "../_componentes/agendamentos";
import { CabecalhoDaSecao, Contagem } from "../_componentes/cabecalho";
import { EnviarAgora } from "../_componentes/enviar-agora";
import { PainelDeLancamentos } from "../_componentes/lancamentos";
import { BotaoExcluir } from "./botao-excluir";
import { FiltroDaListagem } from "./filtro";
import { Formulario } from "./formulario";

export const dynamic = "force-dynamic";

/*
 * Aqui morava um `APOIOS`: uma frase por tabela, embaixo do titulo, dizendo o
 * que ela guarda. Saiu porque para quem administra ela nao dizia nada — "Fotos
 * da obra" abaixo de um titulo "Imagens" é o mesmo nome duas vezes, e ocupava a
 * primeira linha de toda tela do painel. O titulo basta.
 */

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
  /**
   * `f` é o valor do filtro declarado no registro da tabela. `mes`, `ok` e
   * `aviso` sao do painel de lancamento, que só aparece em Recebimentos.
   */
  searchParams: Promise<{
    editar?: string;
    f?: string;
    mes?: string;
    ok?: string;
    aviso?: string;
    erro?: string;
    onde?: string;
    entregues?: string;
    aparelhos?: string;
  }>;
}) {
  const { tabela: slug } = await params;
  const { editar, f, mes, ok, aviso, erro, onde, entregues, aparelhos } =
    await searchParams;

  // Slug desconhecido vira 404 — nunca chega ao SQL.
  const tabela = acharTabela(slug);
  if (!tabela) notFound();

  /*
   * So a primeira coluna declarada em `filtros` — hoje nenhuma tabela pede
   * duas, e uma fila de seletores para um caso hipotetico seria peso morto.
   */
  const campoDoFiltro = tabela.filtros?.[0];
  const campoReferencia = tabela.campos.find((c) => c.nome === campoDoFiltro);
  const filtro =
    campoDoFiltro && f ? { campo: campoDoFiltro, valor: f } : undefined;

  const [linhas, rotulos, emEdicao, opcoesDoFiltro] = await Promise.all([
    listar(tabela, filtro),
    mapaDeRotulos(tabela),
    editar ? obter(tabela, editar) : Promise.resolve(undefined),
    campoReferencia ? opcoesDeReferencia(campoReferencia) : Promise.resolve([]),
  ]);

  return (
    <>
      {/*
       * O titulo da secao vem primeiro, sempre — mesmo nas telas que abrem com
       * um painel de trabalho. Ele estava depois deles em Recebimentos e
       * Notificacoes, e a pagina comecava por um `<h2>`.
       */}
      <CabecalhoDaSecao
        titulo={tabela.rotulo}
        acessorio={
          <>
            {campoReferencia && (
              <FiltroDaListagem
                rotulo={campoReferencia.rotulo}
                parametro="f"
                opcoes={opcoesDoFiltro}
                selecionado={f ?? ""}
                destino={`/admin/${tabela.slug}`}
              />
            )}
            <Contagem total={linhas.length} />
          </>
        }
      />

      {/*
       * Recebimentos abre com o painel de lancamento do mes. Lancar é o jeito
       * de criar uma linha nesta tabela — separado numa rota propria, obrigava
       * a trocar de tela para conferir o que acabou de ser gravado.
       */}
      {tabela.slug === "recebimentos" && (
        <PainelDeLancamentos mes={mes} ok={ok} aviso={aviso} />
      )}

      {/*
       * Notificacoes abre com os dois jeitos de mandar — na hora e por
       * repeticao —, nesta ordem. A tabela de baixo é o historico do que saiu
       * por qualquer um dos dois.
       */}
      {tabela.slug === "notificacoes" && (
        <>
          <EnviarAgora ok={ok} entregues={entregues} aparelhos={aparelhos} />
          <PainelDeAgendamentos ok={ok} aviso={aviso} />
        </>
      )}

      {/*
       * Exclusao barrada por vinculo. Nao é erro de sistema: é o
       * `ON DELETE RESTRICT` das tabelas de dinheiro fazendo o trabalho dele —
       * apagar um investidor nao pode levar junto os contratos e os creditos
       * dele. A tela diz onde estao os registros que seguram, porque é de la
       * que a pessoa precisa comecar.
       */}
      {erro === "vinculo" && (
        <p className="mt-6 animate-surgir rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <span className="font-semibold">Não foi possível excluir.</span> Há
          registros em{" "}
          <span className="font-semibold">{onde ?? "outra tabela"}</span>{" "}
          apontando para este — o banco recusa a exclusão para não levar essas
          linhas junto. Apague ou reatribua esses registros primeiro.
        </p>
      )}

      {/* Tabela de registro nao tem formulario: ver `semFormulario` no
          registro das tabelas. */}
      {!tabela.semFormulario && (
        <div className="mt-6">
          <Formulario tabela={tabela} linha={emEdicao} />
        </div>
      )}

      {/* A tabela é larga por natureza; o `overflow-x-auto` deixa ela rolar
          dentro do cartao em vez de empurrar a pagina inteira de lado. */}
      <div className="sombra-cartao mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-neutral-500">
            <tr>
              {tabela.colunas.map((c) => (
                <th
                  key={c}
                  className="px-4 py-3 font-semibold tracking-wider whitespace-nowrap uppercase"
                >
                  {c}
                </th>
              ))}
              {/* A coluna das acoes nao tem nome, mas tem funcao: sem o
                  `sr-only` ela é uma celula vazia no cabecalho. */}
              <th className="px-4 py-3 text-right">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {linhas.length === 0 && (
              <tr>
                <td
                  colSpan={tabela.colunas.length + 1}
                  className="px-4 py-14 text-center"
                >
                  {/* Vazio com motivo: filtrado e vazio é outra situacao de
                      "ainda nao ha nada", e a saida de cada uma é diferente. */}
                  <span className="block text-sm font-medium text-tinta">
                    {filtro
                      ? "Nada com esse filtro."
                      : "Nenhum registro ainda."}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-500">
                    {filtro ? (
                      <Link
                        href={`/admin/${tabela.slug}`}
                        className="font-semibold text-marinho underline-offset-2 hover:underline"
                      >
                        Limpar o filtro
                      </Link>
                    ) : tabela.semFormulario ? (
                      "As linhas aparecem aqui conforme forem sendo criadas."
                    ) : (
                      "Use o formulário acima para criar o primeiro."
                    )}
                  </span>
                </td>
              </tr>
            )}

            {linhas.map((linha: Linha) => (
              <tr
                key={String(linha.id)}
                /* `group` para as acoes: elas ficam apagadas ate o ponteiro
                   entrar na linha, o que tira 20 botoes vermelhos da vista sem
                   escondê-los de quem navega por teclado — o `focus-within`
                   traz os dois de volta. */
                className="group transition-colors duration-200 hover:bg-indigo-50"
              >
                {tabela.colunas.map((c) => (
                  <td key={c} className="px-4 py-3 whitespace-nowrap">
                    {exibir(linha[c], rotulos)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 opacity-45 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
                    {!tabela.semFormulario && (
                      <Link
                        href={`/admin/${tabela.slug}?editar=${String(linha.id)}`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-marinho transition-colors duration-200 hover:bg-indigo-100 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                      >
                        Editar
                      </Link>
                    )}
                    {/* Formulario proprio: excluir muda o servidor, entao
                        precisa ser POST, e nao um link que qualquer prefetch
                        dispararia. */}
                    <form
                      action={acaoExcluir.bind(
                        null,
                        tabela.slug,
                        String(linha.id),
                      )}
                      className="inline"
                    >
                      <BotaoExcluir
                        oQue={`este registro de ${tabela.rotulo.toLowerCase()}`}
                      />
                    </form>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
