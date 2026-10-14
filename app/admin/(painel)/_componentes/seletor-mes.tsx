"use client";

import { useRouter } from "next/navigation";

/**
 * De que mes é o credito.
 *
 * O estado é a URL (`?mes=AAAA-MM`), como no filtro das listagens: o link pode
 * ser guardado, o botao de voltar funciona e a pagina — `force-dynamic` — refaz
 * as estimativas no servidor. `key` na competencia porque o input é nao
 * controlado: quando a navegacao troca o mes, o campo precisa remontar para
 * acompanhar.
 *
 * Trocar o mes leva junto o `lancar=1`. Sem ele a URL nova nao abria a folha,
 * e escolher o mes anterior **fechava** a tela em que a escolha acabara de ser
 * feita — a pessoa via a listagem e precisava reabrir o painel para continuar.
 */
export function SeletorDeMes({ competencia }: { competencia: string }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-semibold text-neutral-600">
        Competência
      </span>
      <input
        key={competencia}
        type="month"
        defaultValue={competencia}
        onChange={(evento) => {
          const valor = evento.target.value;
          if (valor) router.push(`/admin/recebimentos?lancar=1&mes=${valor}`);
        }}
        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm text-tinta transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
      />
    </label>
  );
}
