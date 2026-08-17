import "server-only";
import { headers } from "next/headers";
import { consultar } from "@/lib/db";
import { lerSessao } from "@/lib/sessao";

/**
 * Registra no banco o que foi feito, por quem.
 *
 * Duas regras que valem mais que o resto do arquivo:
 *
 * 1. **Nunca derruba a acao.** Se o registro falhar, a operacao segue e o erro
 *    vai para o log do servidor. Auditoria que impede o trabalho de acontecer é
 *    trocada por outra coisa na primeira sexta-feira ruim.
 * 2. **Nunca grava segredo.** Senha, hash e token nao entram no `detalhe` — o
 *    que se guarda é o *nome* do campo alterado, nao o valor. A funcao abaixo
 *    peneira isso, e nao confia em quem chama.
 */

export type Acao =
  | "login"
  | "login_recusado"
  | "logout"
  | "criar"
  | "atualizar"
  | "excluir"
  | "upload"
  /**
   * Leitura de documento privado — contrato, aditivo ou papel da obra.
   *
   * É a unica acao de *leitura* registrada, e ela existe porque é a unica em que
   * a pergunta "quem viu o contrato de quem" pode ser feita a serio. Ver
   * `app/arquivo/[escopo]/[id]/route.ts`.
   */
  | "download";

/** Campos cujo valor nunca é guardado, seja qual for o nome da coluna. */
const SIGILOSOS = /senha|password|hash|token|secret|chave|auth/i;

function peneirar(detalhe: Record<string, unknown>): Record<string, unknown> {
  const limpo: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(detalhe)) {
    limpo[chave] = SIGILOSOS.test(chave) ? "[oculto]" : valor;
  }
  return limpo;
}

export async function registrar(evento: {
  acao: Acao;
  alvoTabela?: string;
  alvoId?: string;
  detalhe?: Record<string, unknown>;
  /** Para o login, em que a sessao ainda nao existe no momento do registro. */
  usuario?: { id?: string; nome?: string };
}): Promise<void> {
  try {
    const sessao = evento.usuario ? null : await lerSessao();
    const cabecalhos = await headers();

    await consultar(
      `insert into audit_logs
         (usuario_id, usuario_nome, acao, alvo_tabela, alvo_id, detalhe, ip, user_agent)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        evento.usuario?.id ?? sessao?.id ?? null,
        evento.usuario?.nome ?? sessao?.nome ?? null,
        evento.acao,
        evento.alvoTabela ?? null,
        evento.alvoId ?? null,
        evento.detalhe ? JSON.stringify(peneirar(evento.detalhe)) : null,
        cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        cabecalhos.get("user-agent")?.slice(0, 300) ?? null,
      ],
    );
  } catch (erro) {
    console.error("[auditoria] nao registrou:", erro);
  }
}
