import "server-only";
import { consultar } from "@/lib/db";
import { enviarPush, type Inscricao } from "@/lib/push";

/**
 * O envio de um aviso: a linha na caixinha e o push nos aparelhos.
 *
 * Existe um caminho só para os dois jeitos de mandar — o botao "Enviar agora"
 * do painel e o disparo que o n8n chama no horario marcado. Sem isto seriam
 * duas copias da mesma sequencia, e a primeira correcao entraria em uma delas.
 */

export type Aviso = {
  /** `null` = aviso geral, para todo investidor. */
  usuarioId: string | null;
  titulo: string;
  corpo: string | null;
  url: string | null;
};

export type Entrega = {
  /** Id da linha criada em `notificacoes`. */
  id: string;
  /** Pushes aceitos pelos servicos de entrega. */
  entregues: number;
  /** Aparelhos inscritos que estavam no alvo. */
  inscricoes: number;
  /** Inscricoes mortas que sairam da tabela. */
  removidas: number;
};

export async function enviarAviso(aviso: Aviso): Promise<Entrega> {
  /*
   * A linha na caixinha primeiro, o push depois. Se o envio falhar — aparelho
   * trocado, servico fora do ar —, o aviso continua la para ser lido quando a
   * pessoa abrir o app. O contrario deixaria push sem lastro.
   */
  const [linha] = await consultar<{ id: string }>(
    `insert into notificacoes (usuario_id, titulo, corpo, url)
     values ($1, $2, $3, $4)
     returning id`,
    [aviso.usuarioId, aviso.titulo, aviso.corpo, aviso.url],
  );

  // Aviso geral vai para todos os aparelhos inscritos; aviso de uma pessoa, so
  // para os dela.
  const inscricoes = await consultar<Inscricao & { id: string }>(
    `select id, endpoint, p256dh, auth
       from push_inscricoes
      where $1::uuid is null or usuario_id = $1`,
    [aviso.usuarioId],
  );

  let entregues = 0;
  const expiradas: string[] = [];

  for (const inscricao of inscricoes) {
    const resultado = await enviarPush(inscricao, {
      titulo: aviso.titulo,
      corpo: aviso.corpo ?? undefined,
      url: aviso.url ?? undefined,
    });

    if (resultado.ok) entregues += 1;
    else if (resultado.expirada) expiradas.push(inscricao.id);
  }

  /*
   * Inscricao que o proprio servico declarou morta (404/410) sai da tabela: ela
   * nunca mais vai receber nada, e mante-la faz cada envio pagar uma ida a rede
   * para ouvir a mesma recusa.
   */
  if (expiradas.length > 0) {
    await consultar(`delete from push_inscricoes where id = any($1)`, [
      expiradas,
    ]);
  }

  return {
    id: String(linha.id),
    entregues,
    inscricoes: inscricoes.length,
    removidas: expiradas.length,
  };
}
