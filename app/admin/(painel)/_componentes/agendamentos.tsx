import { listarAgendamentos, type Agendado } from "@/lib/admin/agendamentos";
import { DIAS_DA_SEMANA } from "@/lib/admin/dias-da-semana";
import { consultar } from "@/lib/db";
import { acaoRemoverAgendamento } from "../../acoes";
import { BotaoEnviar } from "./botao-enviar";

/**
 * As automacoes: avisos que se repetem sozinhos.
 *
 * A diferenca para o "Enviar agora" logo acima é o gatilho, e nao o conteudo.
 * La quem aperta é a pessoa, e o efeito é imediato. Aqui quem aperta é o
 * relogio do n8n, no dia e na hora combinados, e cada toque cria uma linha nova
 * na tabela de baixo.
 */

/** "Toda semana · seg, qua · 09:00 e 18:00" — a regra em uma linha. */
function emPalavras(a: Agendado): string {
  const quando =
    a.recorrencia === "diaria"
      ? "Todo dia"
      : a.recorrencia === "semanal"
        ? `Toda semana · ${(a.diasSemana ?? [])
            .map(
              (d) => DIAS_DA_SEMANA.find((dia) => dia.valor === d)?.curto ?? d,
            )
            .join(", ")}`
        : `Todo mês · dia ${a.diaMes}`;

  const horas =
    a.horarios.length === 1
      ? a.horarios[0]
      : `${a.horarios.slice(0, -1).join(", ")} e ${a.horarios.at(-1)}`;

  return `${quando} · ${horas}`;
}

/** Os investidores, para o `<select>` dos formularios de aviso. */
export async function investidoresParaAviso() {
  return consultar<{ id: string; nome: string }>(
    `select id, nome from usuarios where tipo = 'investidor' order by nome`,
  );
}

export async function PainelDeAgendamentos({
  ok,
  aviso,
}: {
  ok?: string;
  aviso?: string;
}) {
  // Só a lista: o `<select>` de investidor foi junto com o formulario, para a
  // folha. Uma consulta a menos por visita a esta tela.
  const agendamentos = await listarAgendamentos();

  const naoConfigurado = !process.env.N8N_BASE_URL || !process.env.N8N_API_KEY;

  return (
    <section className="mt-10">
      <h2 className="animate-surgir text-base font-bold tracking-tight text-tinta">
        Envio automático
      </h2>
      <p className="mt-1 animate-surgir text-sm text-neutral-500">
        O que repete sozinho, no dia e na hora marcados.
      </p>

      {ok === "agendado" && (
        <p className="mt-4 animate-surgir rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-verde">
          Agendado, e a automação foi criada e ligada no n8n.
        </p>
      )}

      {aviso === "n8n" && (
        <p className="mt-4 animate-surgir rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <span className="font-semibold">O agendamento foi salvo</span>, mas a
          automação não pôde ser criada no n8n — ele ficou desligado, e nada
          será disparado. Confira <code>N8N_BASE_URL</code> e{" "}
          <code>N8N_API_KEY</code>, apague a linha abaixo e crie de novo.
        </p>
      )}

      {/* Sem as chaves do n8n nao ha relogio nenhum do outro lado, e criar a
          automacao só produziria uma linha desligada. Dizer isso antes é mais
          honesto do que deixar a pessoa preencher para receber um aviso. */}
      {naoConfigurado && (
        <p className="mt-4 animate-surgir rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          O n8n não está configurado neste ambiente (<code>N8N_BASE_URL</code> e{" "}
          <code>N8N_API_KEY</code>). Sem ele o envio automático não dispara —
          use o campo acima para mandar na hora.
        </p>
      )}

      {/*
       * O formulario saiu daqui: ele mora numa folha, aberta pelo botao do topo
       * da tela (`?agendar=1`). O que sobra nesta secao é a **lista** do que ja
       * esta agendado — dado, e nao tarefa, como a tabela de baixo.
       */}

      {agendamentos.length > 0 && (
        <ul className="escalonar mt-5 grid gap-3 lg:grid-cols-2">
          {agendamentos.map((a) => (
            <li
              key={a.id}
              className="sombra-cartao flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold text-tinta">
                  <span className="truncate">{a.titulo}</span>

                  {/* Sem fluxo no n8n o aviso nao sai — e a lista precisa
                      dizer isso antes de alguem esperar por ele. */}
                  {!a.ativa && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-amber-800 uppercase">
                      Desligado
                    </span>
                  )}
                </p>

                <p className="mt-1 text-xs text-neutral-600 tabular-nums">
                  {emPalavras(a)}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-400">
                  {a.investidor ?? "Todos os investidores"}
                  {a.url ? ` · ${a.url}` : ""}
                </p>
              </div>

              {/* Apagar aqui apaga tambem o fluxo la: um fluxo vivo apontando
                  para uma linha que sumiu bateria de hora em hora num 404. */}
              <form action={acaoRemoverAgendamento.bind(null, a.id)}>
                <BotaoEnviar
                  enviando="Excluindo…"
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  Excluir
                </BotaoEnviar>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
