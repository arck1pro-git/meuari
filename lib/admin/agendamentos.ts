import "server-only";
import { consultar } from "@/lib/db";
import {
  criarAutomacao,
  removerAutomacao,
  type Recorrencia,
} from "@/lib/n8n";

/**
 * Avisos que se repetem: o que fica no banco e o que vira automacao no n8n.
 *
 * A divisao de trabalho é a que evita duas verdades: **o conteudo é nosso, o
 * relogio é do n8n**. O fluxo la sabe o id do agendamento e a hora; o texto,
 * o destinatario e o link ficam aqui e sao lidos no momento do disparo.
 */

export type Agendado = {
  id: string;
  usuarioId: string | null;
  /** Nome de quem recebe, ou `null` quando é aviso geral. */
  investidor: string | null;
  titulo: string;
  corpo: string | null;
  url: string | null;
  recorrencia: Recorrencia;
  diasSemana: number[] | null;
  diaMes: number | null;
  horarios: string[];
  ativa: boolean;
  n8nWorkflowId: string | null;
};

export async function listarAgendamentos(): Promise<Agendado[]> {
  return consultar<Agendado>(
    `select a.id,
            a.usuario_id as "usuarioId",
            u.nome       as investidor,
            a.titulo,
            a.corpo,
            a.url,
            a.recorrencia,
            a.dias_semana as "diasSemana",
            a.dia_mes     as "diaMes",
            a.horarios,
            a.ativa,
            a.n8n_workflow_id as "n8nWorkflowId"
       from notificacoes_agendadas a
       left join usuarios u on u.id = a.usuario_id
      order by a.criado_em desc`,
  );
}

export type NovoAgendamento = {
  usuarioId: string | null;
  titulo: string;
  corpo: string | null;
  url: string | null;
  recorrencia: Recorrencia;
  diasSemana: number[];
  diaMes: number | null;
  horarios: string[];
};

/**
 * Grava o agendamento e cria a automacao.
 *
 * Nesta ordem, e nao na inversa: o fluxo do n8n precisa do id da linha para
 * saber o que disparar. Se a criacao la falhar, a linha fica — desligada, com
 * `n8n_workflow_id` vazio — e a tela mostra isso, em vez de sumir com o que a
 * pessoa acabou de escrever.
 */
export async function agendar(novo: NovoAgendamento): Promise<{
  id: string;
  erroDoN8n: string | null;
}> {
  const [linha] = await consultar<{ id: string }>(
    `insert into notificacoes_agendadas
            (usuario_id, titulo, corpo, url, recorrencia,
             dias_semana, dia_mes, horarios, ativa)
     values ($1, $2, $3, $4, $5, $6, $7, $8, false)
     returning id`,
    [
      novo.usuarioId,
      novo.titulo,
      novo.corpo,
      novo.url,
      novo.recorrencia,
      novo.recorrencia === "semanal" ? novo.diasSemana : null,
      novo.recorrencia === "mensal" ? novo.diaMes : null,
      novo.horarios,
    ],
  );

  const id = String(linha.id);

  try {
    const workflowId = await criarAutomacao({
      id,
      titulo: novo.titulo,
      recorrencia: novo.recorrencia,
      diasSemana: novo.diasSemana,
      diaMes: novo.diaMes,
      horarios: novo.horarios,
    });

    await consultar(
      `update notificacoes_agendadas
          set n8n_workflow_id = $2, ativa = true
        where id = $1`,
      [id, workflowId],
    );

    return { id, erroDoN8n: null };
  } catch (erro) {
    // A linha nasce `ativa = false`: sem fluxo no n8n ela nao dispara nada, e
    // dizer que esta ligada seria mentir na listagem.
    return { id, erroDoN8n: String(erro).slice(0, 300) };
  }
}

/**
 * Apaga o agendamento e a automacao dele.
 *
 * O fluxo sai primeiro: um fluxo vivo apontando para uma linha que nao existe
 * mais bateria de hora em hora numa rota que responde 404.
 */
export async function removerAgendamento(id: string): Promise<void> {
  const [linha] = await consultar<{ n8nWorkflowId: string | null }>(
    `select n8n_workflow_id as "n8nWorkflowId"
       from notificacoes_agendadas where id = $1`,
    [id],
  );

  if (linha?.n8nWorkflowId) await removerAutomacao(linha.n8nWorkflowId);

  await consultar(`delete from notificacoes_agendadas where id = $1`, [id]);
}
