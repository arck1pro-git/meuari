"use client";

import { useRouter } from "next/navigation";

/**
 * Filtro da listagem, por campo de referencia.
 *
 * O estado é a URL (`?u=<id>`), e nao um `useState`: assim o link pode ser
 * compartilhado, o botao de voltar do navegador funciona e a pagina — que é
 * `force-dynamic` — refaz a consulta ja filtrada no servidor. Guardar isto no
 * cliente exigiria trazer a tabela inteira e filtrar na tela.
 */
export function FiltroDaListagem({
  rotulo,
  parametro,
  opcoes,
  selecionado,
  destino,
}: {
  rotulo: string;
  /** Nome do parametro na URL. */
  parametro: string;
  opcoes: { id: string; rotulo: string }[];
  selecionado: string;
  /** Rota da listagem, sem query. */
  destino: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-semibold text-neutral-600">{rotulo}</span>
      <select
        value={selecionado}
        onChange={(evento) => {
          const valor = evento.target.value;
          // Sem valor, volta para a listagem limpa: `?u=` vazio na URL seria
          // um estado a mais dizendo a mesma coisa que "sem filtro".
          router.push(valor ? `${destino}?${parametro}=${valor}` : destino);
        }}
        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm text-tinta transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
      >
        <option value="">Todos</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
