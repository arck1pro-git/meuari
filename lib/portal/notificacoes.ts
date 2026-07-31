import "server-only";
import { consultar } from "@/lib/db";
import type { DataISO } from "./dados";

/**
 * A caixa do sino: o que foi escrito para esta pessoa, mais os avisos gerais.
 *
 * Nao confundir com `push_inscricoes`: aquela guarda para onde o navegador
 * aceita receber push; esta guarda o conteudo que o portal mostra.
 */
export type Notificacao = {
  id: string;
  titulo: string;
  corpo: string | null;
  url: string | null;
  data: DataISO;
  lida: boolean;
};

const FUSO = "America/Sao_Paulo";

/** As 50 mais recentes — a caixa nao é arquivo, é o que aconteceu ha pouco. */
export async function getNotificacoes(
  usuarioId: string,
): Promise<Notificacao[]> {
  /*
   * O `usuario_id` da leitura entra na condicao da juncao, e nao no `where`:
   * ali ele viraria filtro e sumiria justamente com as nao lidas, que sao as
   * que nao tem linha em `notificacoes_lidas`.
   *
   * (Comentario aqui fora porque crase dentro de template literal o encerra.)
   */
  return consultar<Notificacao>(
    `select n.id,
            n.titulo,
            n.corpo,
            n.url,
            to_char(n.criado_em at time zone $2, 'YYYY-MM-DD') as data,
            (l.usuario_id is not null) as lida
       from notificacoes n
       left join notificacoes_lidas l
              on l.notificacao_id = n.id and l.usuario_id = $1
      where n.usuario_id = $1 or n.usuario_id is null
      order by n.criado_em desc
      limit 50`,
    [usuarioId, FUSO],
  );
}

/**
 * Marca tudo o que esta pessoa pode ver como lido.
 *
 * `on conflict do nothing` porque abrir a caixa duas vezes é normal, e a
 * segunda nao deve estourar nem mudar a data da primeira leitura.
 */
export async function marcarTudoComoLido(usuarioId: string): Promise<void> {
  await consultar(
    `insert into notificacoes_lidas (notificacao_id, usuario_id)
     select n.id, $1
       from notificacoes n
      where n.usuario_id = $1 or n.usuario_id is null
     on conflict do nothing`,
    [usuarioId],
  );
}
