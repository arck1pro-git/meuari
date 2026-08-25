import "server-only";

/**
 * O n8n como agenda do portal.
 *
 * O portal nao tem processo de fundo: ele é um app da Vercel, que acorda para
 * responder e dorme. Quem sabe que sao nove da manha de uma segunda é o n8n, e
 * o combinado entre os dois é curto — ele cria um fluxo por agendamento, e esse
 * fluxo bate numa rota nossa na hora certa.
 *
 * O fluxo tem dois nos:
 *
 *   Agenda (scheduleTrigger) → Disparo (httpRequest)
 *
 * O gatilho carrega os horarios; o disparo chama
 * `/api/notificacoes/disparar` com o id do agendamento e uma chave combinada.
 * Nada do conteudo do aviso viaja para o n8n: o texto fica no nosso banco, e o
 * fluxo la so sabe **quando** e **qual id**. Se o titulo mudar aqui, o proximo
 * disparo ja sai com o texto novo, sem tocar no n8n.
 */

export type Recorrencia = "diaria" | "semanal" | "mensal";

export type Agendamento = {
  id: string;
  titulo: string;
  recorrencia: Recorrencia;
  /** 0 = domingo … 6 = sabado. Só na recorrencia semanal. */
  diasSemana: number[] | null;
  /** Só na recorrencia mensal. */
  diaMes: number | null;
  /** `HH:MM`, um ou mais. */
  horarios: string[];
};

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`${nome} ausente no ambiente`);
  return valor.replace(/\/+$/, "");
}

/** O n8n autentica pela chave no cabecalho, e nao por sessao. */
async function api(
  caminho: string,
  init: RequestInit = {},
): Promise<Response> {
  const resposta = await fetch(`${exigir("N8N_BASE_URL")}/api/v1${caminho}`, {
    ...init,
    headers: {
      "X-N8N-API-KEY": exigir("N8N_API_KEY"),
      "Content-Type": "application/json",
      ...init.headers,
    },
    // Agenda nao é conteudo de pagina: nada disso pode ser guardado.
    cache: "no-store",
  });

  if (!resposta.ok) {
    const detalhe = (await resposta.text()).slice(0, 300);
    throw new Error(`n8n respondeu ${resposta.status}: ${detalhe}`);
  }

  return resposta;
}

/**
 * As regras de disparo, no formato do `scheduleTrigger`.
 *
 * Uma entrada por horario: "toda segunda as 9 e as 18" sao duas regras com o
 * mesmo dia. É assim que o proprio n8n modela — o no aceita uma lista de
 * intervalos e dispara em todos.
 */
function regras(agendamento: Agendamento) {
  return agendamento.horarios.map((horario) => {
    const [hora, minuto] = horario.split(":").map(Number);

    if (agendamento.recorrencia === "diaria") {
      return {
        field: "days",
        triggerAtHour: hora,
        triggerAtMinute: minuto,
      };
    }

    if (agendamento.recorrencia === "semanal") {
      return {
        field: "weeks",
        triggerAtDay: agendamento.diasSemana ?? [],
        triggerAtHour: hora,
        triggerAtMinute: minuto,
      };
    }

    return {
      field: "months",
      triggerAtDayOfMonth: agendamento.diaMes ?? 1,
      triggerAtHour: hora,
      triggerAtMinute: minuto,
    };
  });
}

function fluxo(agendamento: Agendamento) {
  const destino = `${exigir("APP_URL")}/api/notificacoes/disparar`;

  return {
    name: `Amaan Invest · ${agendamento.titulo}`.slice(0, 120),
    settings: {
      // Fuso do contrato, e nao o do servidor do n8n: "as 9" é as 9 aqui.
      timezone: "America/Sao_Paulo",
      executionOrder: "v1",
    },
    nodes: [
      {
        id: "agenda",
        name: "Agenda",
        type: "n8n-nodes-base.scheduleTrigger",
        typeVersion: 1.2,
        position: [0, 0],
        parameters: { rule: { interval: regras(agendamento) } },
      },
      {
        id: "disparo",
        name: "Disparo",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [260, 0],
        parameters: {
          method: "POST",
          url: destino,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "x-chave", value: exigir("N8N_WEBHOOK_SECRET") },
            ],
          },
          sendBody: true,
          specifyBody: "json",
          jsonBody: JSON.stringify({ agendamentoId: agendamento.id }),
          options: {},
        },
      },
    ],
    connections: {
      Agenda: { main: [[{ node: "Disparo", type: "main", index: 0 }]] },
    },
  };
}

/** Cria o fluxo e o deixa ligado. Devolve o id que o n8n atribuiu. */
export async function criarAutomacao(
  agendamento: Agendamento,
): Promise<string> {
  const resposta = await api("/workflows", {
    method: "POST",
    body: JSON.stringify(fluxo(agendamento)),
  });

  const criado = (await resposta.json()) as { id?: string };
  if (!criado.id) throw new Error("n8n nao devolveu o id do fluxo");

  /*
   * Criar e ativar sao duas chamadas: a API publica do n8n ignora `active` no
   * corpo da criacao. Sem a segunda, o fluxo nasce correto e parado.
   */
  await api(`/workflows/${criado.id}/activate`, { method: "POST" });

  return criado.id;
}

/**
 * Apaga o fluxo. Silencioso quando ele ja nao existe — o que importa é o
 * estado final, e um fluxo que sumiu do n8n ja esta no estado desejado.
 */
export async function removerAutomacao(workflowId: string): Promise<void> {
  try {
    await api(`/workflows/${workflowId}`, { method: "DELETE" });
  } catch (erro) {
    if (!String(erro).includes("404")) throw erro;
  }
}
