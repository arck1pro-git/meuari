"use client";

import { useRouter } from "next/navigation";
// De `periodo` e nao de `acessos`: aquele modulo é `server-only` e traz o
// driver do Postgres junto — importar dele aqui quebra o build do bundle do
// navegador. Ver a nota no topo de `lib/admin/periodo.ts`.
import { ATALHOS, type Periodo } from "@/lib/admin/periodo";
import { Seletor } from "../_componentes/seletor";

/**
 * Que recorte olhar: quando, e de quem.
 *
 * O estado é a URL (`?d=<periodo>&u=<id>`), como em todo filtro do painel. O
 * link vai por mensagem ja apontando para o dia certo, o botao de voltar
 * funciona, e a pagina — `force-dynamic` — refaz as seis consultas no servidor.
 * Num `useState` seria preciso trazer todas as sessoes de todos os dias para o
 * navegador so para filtrar entre elas.
 *
 * **Um parametro só para o tempo.** Os atalhos e o calendario escrevem no mesmo
 * `d`, entao nunca existe o estado "7 dias *e* 20 de agosto" — escolher um
 * apaga o outro por construcao, e nao por uma regra que alguem precise lembrar
 * de manter. Ver `resolverPeriodo`.
 *
 * O filtro escolhido nunca desaparece da tela: o botao fica marcado, ou a data
 * fica escrita no campo. Filtro que se aplica sem deixar marca é a forma mais
 * rapida de alguem ler o numero de um dia achando que é o de todos.
 */
export function FiltrosDeAcesso({
  periodo,
  pessoas,
  usuario,
  hoje,
}: {
  periodo: Periodo;
  pessoas: { id: string; nome: string }[];
  usuario: string | null;
  /** Hoje em Brasilia — o teto do calendario. */
  hoje: string;
}) {
  const router = useRouter();

  function ir(proximo: { d?: string; u?: string }) {
    const busca = new URLSearchParams();
    const d = proximo.d ?? periodo.chave;
    const u = proximo.u ?? usuario ?? "";

    // O padrao fica fora da URL: `/admin/acessos` limpo é o mesmo que
    // `?d=hoje&u=`, e endereco curto é o que se consegue ler antes de mandar.
    if (d !== "hoje") busca.set("d", d);
    if (u) busca.set("u", u);

    const query = busca.toString();
    router.push(query ? `/admin/acessos?${query}` : "/admin/acessos");
  }

  return (
    <section className="mt-4 flex animate-surgir flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      {/* Botoes, e nao um terceiro seletor: sao quatro opcoes fixas e o par
          mostra todas de uma vez. É o mesmo grupo da modalidade no Dashboard. */}
      <div
        role="group"
        aria-label="Período"
        className="flex rounded-xl border border-zinc-200 bg-white p-0.5"
      >
        {ATALHOS.map(({ chave, rotulo }) => {
          const ativo = !periodo.avulso && periodo.chave === chave;
          return (
            <button
              key={chave}
              type="button"
              aria-pressed={ativo}
              onClick={() => ir({ d: chave })}
              className={`rounded-[0.625rem] px-3 py-1 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul ${
                ativo
                  ? "bg-marinho text-white"
                  : "text-neutral-500 hover:bg-zinc-100 hover:text-tinta"
              }`}
            >
              {rotulo}
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-600">Dia</span>
        {/*
         * `key` na chave do periodo porque o campo é nao controlado: quando um
         * dos atalhos acima limpa a data, ele precisa remontar para esvaziar —
         * é o mesmo arranjo do `SeletorDeMes`.
         *
         * `max` em hoje: nao ha acesso futuro para consultar, e um calendario
         * que oferece 2027 convida a um resultado vazio que parece defeito.
         */}
        <input
          key={periodo.chave}
          type="date"
          max={hoje}
          defaultValue={periodo.avulso ? periodo.chave : ""}
          onChange={(evento) => {
            const valor = evento.target.value;
            if (valor) ir({ d: valor });
          }}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm text-tinta transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
        />
      </label>

      <label className="flex min-w-56 flex-1 items-center gap-2 sm:max-w-72">
        <span className="shrink-0 text-xs font-semibold text-neutral-600">
          Pessoa
        </span>
        {/*
         * `vazio` é o "Todos": a opcao entra na lista como qualquer outra, entao
         * ela anda no teclado e aparece na busca — e voltar para todos é uma
         * escolha, e nao um botao de limpar escondido em outro canto.
         *
         * `key` no valor porque o `Seletor` guarda a escolha em estado proprio:
         * sem ela, voltar pelo historico deixaria o campo mostrando o nome
         * antigo com a tela ja filtrada por outro.
         */}
        <Seletor
          key={usuario ?? "todos"}
          rotuloAcessivel="Pessoa"
          opcoes={pessoas.map((p) => ({ valor: p.id, rotulo: p.nome }))}
          valorInicial={usuario ?? ""}
          vazio="Todas as pessoas"
          aoEscolher={(u) => ir({ u })}
          className="py-1.5"
        />
      </label>
    </section>
  );
}
