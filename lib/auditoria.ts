import "server-only";
import { headers } from "next/headers";
import { consultar } from "@/lib/db";
import { contextoDaRequisicao } from "@/lib/dispositivo";
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
    const contexto = await contextoDaRequisicao();

    /*
     * O aparelho e a cidade entram no `detalhe`, e nao em colunas novas.
     *
     * Cabem aqui porque a coluna ja é `jsonb` e ja guarda o acessorio de cada
     * acao — nao ha migracao a aplicar, e a tabela nao ganha sete colunas que
     * ficariam nulas na maioria das linhas. O que se ganha em troca é o que
     * faltava no `login_recusado`: uma sequencia de tentativas passa a dizer de
     * que aparelho e de que cidade veio, e essas linhas nunca aparecem em
     * `acessos` — tentativa recusada nao abre sessao.
     *
     * Depois do `peneirar`, e nao antes: o que se filtra ali é o que o chamador
     * mandou. Isto aqui é nosso, e nao passa por campo de senha nenhum.
     */
    const detalhe = {
      ...(evento.detalhe ? peneirar(evento.detalhe) : {}),
      dispositivo: contexto.dispositivo,
      sistema: contexto.sistema,
      navegador: contexto.navegador,
      cidade: contexto.cidade,
      pais: contexto.pais,
      ...(contexto.robo ? { robo: true } : {}),
    };

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
        JSON.stringify(detalhe),
        contexto.ip,
        // O UA cru continua guardado: o `dispositivo` acima é interpretacao, e
        // quando ela erra é a string original que permite descobrir por que.
        cabecalhos.get("user-agent")?.slice(0, 300) ?? null,
      ],
    );
  } catch (erro) {
    console.error("[auditoria] nao registrou:", erro);
  }
}
