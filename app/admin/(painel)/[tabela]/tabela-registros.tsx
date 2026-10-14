"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * A listagem de uma tabela do painel: busca, ordenacao e as linhas.
 *
 * **O servidor monta, o cliente so arruma.** Cada celula chega pronta — dinheiro
 * formatado, legenda no lugar do id, pastilha, barra, o link de editar e o
 * formulario de excluir com a acao de servidor dentro. O que vem junto, em
 * texto, é so o necessario para buscar (`busca`) e para ordenar (`ordem`). Assim
 * a formatacao continua num lugar só, no servidor, e esta tela nao precisa
 * saber o que é uma referencia nem como se escreve real.
 *
 * **Busca e ordem sao do cliente, e de proposito.** A lista ja veio inteira —
 * ate 200 linhas —, e filtrar isso a cada tecla no navegador é instantaneo. Pela
 * URL, cada letra seria uma ida ao banco. O filtro por investidor, contrato ou
 * obra continua na URL, porque esse muda a consulta e merece link proprio.
 */

export type ColunaDaTabela = {
  chave: string;
  rotulo: string;
  /** Numero alinha a direita, para a virgula de uma linha cair sob a da outra. */
  numero: boolean;
};

export type LinhaDaTabela = {
  id: string;
  /** O texto da linha inteira, ja sem acento e em minusculas. */
  busca: string;
  /** Um valor por coluna, para ordenar: numero, data em ISO ou texto. */
  ordem: (string | number | null)[];
  celulas: React.ReactNode[];
  acoes: React.ReactNode;
};

type Ordenacao = { coluna: number; sentido: 1 | -1 } | null;

/** "Fundação" e "fundacao" sao a mesma busca. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function comparar(
  a: string | number | null,
  b: string | number | null,
): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true });
}

export function TabelaDeRegistros({
  colunas,
  linhas,
  singular,
  plural,
  filtro,
  vazio,
  cortada,
}: {
  colunas: ColunaDaTabela[];
  linhas: LinhaDaTabela[];
  /** "contrato" — para a contagem: "1 contrato". */
  singular: string;
  /** "contratos" — para a contagem: "12 contratos". */
  plural: string;
  /** O seletor de filtro da tabela, quando ela tem um. */
  filtro?: React.ReactNode;
  /** O que mostrar quando nao ha linha nenhuma — ja com a saida certa. */
  vazio: React.ReactNode;
  /** `true` quando a consulta bateu no teto e ha mais linhas no banco. */
  cortada: boolean;
}) {
  const [termo, setTermo] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(null);
  const campo = useRef<HTMLInputElement>(null);

  /*
   * `/` leva para a busca, como no GitHub e no Gmail — de qualquer lugar da
   * tela, menos de dentro de um campo, onde a barra é so uma barra.
   */
  useEffect(() => {
    function atalho(evento: KeyboardEvent) {
      if (evento.key !== "/" || evento.metaKey || evento.ctrlKey) return;
      const alvo = evento.target as HTMLElement | null;
      if (alvo?.closest("input, textarea, select, [contenteditable=true]")) {
        return;
      }
      // Com uma folha aberta, a pagina por baixo esta inerte.
      if (document.querySelector("dialog[open]")) return;
      evento.preventDefault();
      campo.current?.focus();
    }
    document.addEventListener("keydown", atalho);
    return () => document.removeEventListener("keydown", atalho);
  }, []);

  const visiveis = useMemo(() => {
    const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
    const achadas =
      palavras.length === 0
        ? linhas
        : linhas.filter((l) => palavras.every((p) => l.busca.includes(p)));

    if (!ordenacao) return achadas;

    const { coluna, sentido } = ordenacao;
    return [...achadas].sort((a, b) => {
      const x = a.ordem[coluna];
      const y = b.ordem[coluna];
      // Vazio vai sempre para o fim, nos dois sentidos: o que se quer ver ao
      // ordenar é quem tem o valor, e nao uma fila de travessoes.
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return comparar(x, y) * sentido;
    });
  }, [linhas, termo, ordenacao]);

  /** Crescente, decrescente, e de volta a ordem que o servidor mandou. */
  function ordenarPor(coluna: number) {
    setOrdenacao((atual) =>
      atual?.coluna !== coluna
        ? { coluna, sentido: 1 }
        : atual.sentido === 1
          ? { coluna, sentido: -1 }
          : null,
    );
  }

  const buscando = termo.trim() !== "";
  const nome = (n: number) => (n === 1 ? singular : plural);

  return (
    <>
      {/* A barra de ferramentas: buscar, filtrar e quanto ha. Fica fora do
          cabecalho porque é sobre a lista, e nao sobre a tela. */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-56 sm:max-w-sm">
          <span className="sr-only">Buscar</span>
          <IconeLupa className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            ref={campo}
            type="search"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Escape") setTermo("");
            }}
            placeholder={`Buscar em ${plural}`}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-9 pl-9 text-sm text-tinta transition-colors duration-200 placeholder:text-neutral-400 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul [&::-webkit-search-cancel-button]:hidden"
          />
          {/* A dica do atalho some quando ha texto: ali o lugar é do "limpar". */}
          {buscando ? (
            <button
              type="button"
              onClick={() => {
                setTermo("");
                campo.current?.focus();
              }}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition-colors duration-200 hover:bg-zinc-100 hover:text-tinta"
            >
              <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          ) : (
            <kbd
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 text-[0.6875rem] font-medium text-neutral-400 sm:block"
            >
              /
            </kbd>
          )}
        </label>

        {filtro}

        <p
          className="ml-auto text-xs text-neutral-500 tabular-nums"
          aria-live="polite"
        >
          {buscando ? (
            <>
              <span className="font-semibold text-tinta">
                {visiveis.length}
              </span>{" "}
              de {linhas.length} {nome(linhas.length)}
            </>
          ) : (
            <>
              <span className="font-semibold text-tinta">{linhas.length}</span>{" "}
              {nome(linhas.length)}
            </>
          )}
        </p>
      </div>

      {/* A tabela é larga por natureza; o `overflow-x-auto` deixa ela rolar
          dentro do cartao em vez de empurrar a pagina inteira de lado. */}
      <div className="mt-3 animate-surgir overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/70">
            <tr>
              {colunas.map((coluna, indice) => {
                const ativa = ordenacao?.coluna === indice;
                return (
                  <th
                    key={coluna.chave}
                    scope="col"
                    aria-sort={
                      ativa
                        ? ordenacao.sentido === 1
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={`px-2 py-1.5 whitespace-nowrap ${
                      coluna.numero ? "text-right" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => ordenarPor(indice)}
                      title={`Ordenar por ${coluna.rotulo.toLowerCase()}`}
                      className={`group/ordem inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[0.6875rem] font-semibold tracking-wider uppercase transition-colors duration-200 hover:bg-zinc-200/60 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul ${
                        coluna.numero ? "flex-row-reverse" : ""
                      } ${ativa ? "text-tinta" : "text-neutral-500"}`}
                    >
                      {coluna.rotulo}
                      <SetaDeOrdem sentido={ativa ? ordenacao.sentido : 0} />
                    </button>
                  </th>
                );
              })}
              {/* A coluna das acoes nao tem nome, mas tem funcao: sem o
                  `sr-only` ela é uma celula vazia no cabecalho. */}
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={colunas.length + 1} className="px-4 py-16">
                  {vazio}
                </td>
              </tr>
            ) : visiveis.length === 0 ? (
              <tr>
                <td
                  colSpan={colunas.length + 1}
                  className="px-4 py-16 text-center"
                >
                  <span className="block text-sm font-medium text-tinta">
                    Nada encontrado para “{termo.trim()}”.
                  </span>
                  <button
                    type="button"
                    onClick={() => setTermo("")}
                    className="mt-1 text-sm font-semibold text-marinho underline-offset-2 hover:underline"
                  >
                    Limpar a busca
                  </button>
                </td>
              </tr>
            ) : (
              visiveis.map((linha) => (
                <tr
                  key={linha.id}
                  className="transition-colors duration-150 hover:bg-zinc-50"
                >
                  {linha.celulas.map((celula, indice) => (
                    <td
                      key={colunas[indice]?.chave ?? indice}
                      className={`px-4 py-3 align-middle whitespace-nowrap ${
                        colunas[indice]?.numero
                          ? "text-right font-medium tabular-nums"
                          : ""
                      }`}
                    >
                      {celula}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-0.5">
                      {linha.acoes}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* O teto da consulta, dito em vez de escondido: sem isto a lista
          parecia completa e a linha 201 simplesmente nao existia. */}
      {cortada && (
        <p className="mt-2 text-xs text-neutral-500">
          Mostrando as primeiras {linhas.length} linhas. Use o filtro para
          chegar nas demais.
        </p>
      )}
    </>
  );
}

/** As duas setinhas da coluna: apagadas, ou a do sentido escolhido. */
function SetaDeOrdem({ sentido }: { sentido: 1 | -1 | 0 }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={`h-3 w-3 shrink-0 transition-opacity duration-200 ${
        sentido === 0
          ? "opacity-0 group-hover/ordem:opacity-50 group-focus-visible/ordem:opacity-50"
          : "opacity-100"
      }`}
      fill="currentColor"
    >
      {sentido !== -1 && <path d="M6 2.5 9 6H3z" />}
      {sentido !== 1 && <path d="M6 9.5 3 6h6z" />}
    </svg>
  );
}

function IconeLupa({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}
