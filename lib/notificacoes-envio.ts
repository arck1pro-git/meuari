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

export type EntregaEmLote = {
  /** Quantas pessoas ganharam a linha na caixinha. */
  pessoas: number;
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

  const { entregues, removidas } = await empurrar(inscricoes, aviso);

  return {
    id: String(linha.id),
    entregues,
    inscricoes: inscricoes.length,
    removidas,
  };
}

/**
 * O mesmo aviso para um grupo de pessoas — hoje, os investidores de uma obra.
 *
 * Nao é `enviarAviso` num laco, e a diferenca importa: aquele faz um `insert` e
 * uma consulta de inscricoes **por pessoa**, entao avisar vinte investidores
 * seriam quarenta idas ao banco. Aqui sao duas, em qualquer tamanho de grupo.
 *
 * Uma linha por pessoa, e nao uma linha para o grupo: `notificacoes.usuario_id`
 * guarda um uuid, e a caixinha le por igualdade (`lib/portal/notificacoes.ts`).
 * Nao existe aviso "de turma" no modelo — o `null` ali significa *todos*, que é
 * coisa diferente de *estes*.
 */
export async function enviarAvisoParaVarios(
  usuarioIds: string[],
  aviso: Omit<Aviso, "usuarioId">,
): Promise<EntregaEmLote> {
  // Sem ninguem no alvo nao se grava nada: uma linha de aviso sem dono ficaria
  // invisivel para sempre, e `any(array vazio)` ainda custaria a viagem.
  if (usuarioIds.length === 0) {
    return { pessoas: 0, entregues: 0, inscricoes: 0, removidas: 0 };
  }

  /*
   * `unnest` transforma o vetor de ids em linhas, e o `insert ... select` grava
   * todas de uma vez. O `::uuid[]` é obrigatorio: sem ele o driver manda o
   * vetor como texto e o Postgres recusa a comparacao com a coluna uuid.
   */
  const linhas = await consultar<{ id: string }>(
    `insert into notificacoes (usuario_id, titulo, corpo, url)
     select alvo.id, $2, $3, $4
       from unnest($1::uuid[]) as alvo(id)
     returning id`,
    [usuarioIds, aviso.titulo, aviso.corpo, aviso.url],
  );

  const inscricoes = await consultar<Inscricao & { id: string }>(
    `select id, endpoint, p256dh, auth
       from push_inscricoes
      where usuario_id = any($1::uuid[])`,
    [usuarioIds],
  );

  const { entregues, removidas } = await empurrar(inscricoes, aviso);

  return {
    pessoas: linhas.length,
    entregues,
    inscricoes: inscricoes.length,
    removidas,
  };
}

/**
 * Manda o push para uma lista de aparelhos e tira da tabela os que morreram.
 *
 * Sozinha porque é o que os dois envios fazem depois de gravar a caixinha, e a
 * limpeza da inscricao expirada é o tipo de detalhe que so se acerta uma vez se
 * mora num lugar so.
 */
async function empurrar(
  inscricoes: (Inscricao & { id: string })[],
  aviso: Omit<Aviso, "usuarioId">,
): Promise<{ entregues: number; removidas: number }> {
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

  return { entregues, removidas: expiradas.length };
}
