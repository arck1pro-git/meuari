"use server";

import { exigirSessao } from "@/lib/auth";
import { consultar } from "@/lib/db";
import { marcarTudoComoLido } from "@/lib/portal/notificacoes";

/** Chamada quando a caixa do sino é aberta. */
export async function marcarNotificacoesComoLidas(): Promise<void> {
  const sessao = await exigirSessao("/portal");
  await marcarTudoComoLido(sessao.id);
}

/**
 * A chave publica do servidor de aplicacao (VAPID), que o navegador precisa ter
 * em maos antes de se inscrever.
 *
 * Vem por acao, e nao por `NEXT_PUBLIC_`: assim ela nao entra no pacote que
 * todo mundo baixa, e sim na resposta de quem ja tem sessao. Ela nao é segredo —
 * o que a protege é a privada, que fica so no servidor —, mas nao ha motivo
 * para publica-la a quem nem entrou.
 */
export async function chavePublicaDePush(): Promise<string> {
  await exigirSessao("/portal");

  const chave = process.env.VAPID_PUBLIC_KEY;
  if (!chave) throw new Error("VAPID_PUBLIC_KEY ausente no ambiente");
  return chave;
}

/** O que o navegador devolve em `PushSubscription.toJSON()`. */
export type InscricaoDoNavegador = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

/**
 * Guarda a inscricao deste aparelho para o usuario da sessao.
 *
 * Um usuario tem varias: celular e notebook sao duas. A chave é o `endpoint`,
 * que o proprio navegador garante unico — e por isso o conflito atualiza em vez
 * de inserir: trocar de conta no mesmo aparelho deve mudar o dono da inscricao,
 * senao o push do investidor anterior continuaria caindo ali.
 */
export async function salvarInscricaoDePush(
  inscricao: InscricaoDoNavegador,
): Promise<{ ok: true }> {
  const sessao = await exigirSessao("/portal");

  const { endpoint, keys } = inscricao;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error("Inscricao incompleta");
  }

  await consultar(
    `insert into push_inscricoes (usuario_id, endpoint, p256dh, auth)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update
        set usuario_id = excluded.usuario_id,
            p256dh     = excluded.p256dh,
            auth       = excluded.auth`,
    [sessao.id, endpoint, keys.p256dh, keys.auth],
  );

  return { ok: true };
}

/** Some com a inscricao deste aparelho — usado quando o navegador a revoga. */
export async function removerInscricaoDePush(endpoint: string): Promise<void> {
  const sessao = await exigirSessao("/portal");
  await consultar(
    "delete from push_inscricoes where endpoint = $1 and usuario_id = $2",
    [endpoint, sessao.id],
  );
}
