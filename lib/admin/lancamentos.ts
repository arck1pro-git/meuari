import "server-only";
import { consultar } from "@/lib/db";
import type { DataISO } from "@/lib/portal/dados";
import {
  estimarCiclo,
  type AporteMensal,
  type Estimativa,
} from "@/lib/portal/recebimentos";

/**
 * O painel de lancamento do credito mensal.
 *
 * O portal só mostra o que esta em `recebimentos`; é aqui que essa tabela é
 * alimentada, uma vez por mes. A tela lista quem tem contrato `mensal`, calcula
 * quanto o ciclo renderia e deixa o valor pronto para confirmar ou corrigir.
 *
 * **A unidade é investidor x empreendimento**, e nao só investidor. Dois
 * motivos: o credito é do capital daquela obra, com a participacao contratada
 * nela; e o portal filtra o grafico por empreendimento — um lancamento sem obra
 * atribuida sumiria desse recorte.
 */

export type LinhaDeLancamento = {
  usuarioId: string;
  investidor: string;
  empreendimentoId: string;
  empreendimento: string;
  /** Quantos aportes `mensal` compoem o capital desta linha. */
  aportes: number;
  estimativa: Estimativa;
  /** O que ja foi lancado nesta data, se ja foi. */
  lancado: { id: string; valor: number; observacao: string | null } | null;
};

type LinhaDeContrato = AporteMensal & {
  usuarioId: string;
  investidor: string;
  empreendimentoId: string;
  empreendimento: string;
};

/** Os aportes `mensal` de todo mundo, ja com os nomes que a tela mostra. */
async function contratosMensais(): Promise<LinhaDeContrato[]> {
  return consultar<LinhaDeContrato>(
    `select c.usuario_id        as "usuarioId",
            u.nome              as investidor,
            c.empreendimento_id as "empreendimentoId",
            e.nome              as empreendimento,
            to_char(c.data, 'YYYY-MM-DD') as data,
            c.valor::float8     as valor,
            c.taxa::float8      as "taxaMensal",
            c.modalidade
       from contratos c
       join usuarios u        on u.id = c.usuario_id
       join empreendimentos e on e.id = c.empreendimento_id
      where c.modalidade = 'mensal'
      order by u.nome, e.nome, c.data`,
  );
}

/** Chave do grupo. Os dois ids juntos, porque a linha é o par. */
const chave = (usuarioId: string, empreendimentoId: string) =>
  `${usuarioId}|${empreendimentoId}`;

export async function montarLancamentos(
  data: DataISO,
): Promise<LinhaDeLancamento[]> {
  const [contratos, lancados] = await Promise.all([
    contratosMensais(),
    consultar<{
      id: string;
      usuarioId: string;
      empreendimentoId: string | null;
      valor: number;
      observacao: string | null;
    }>(
      `select id,
              usuario_id        as "usuarioId",
              empreendimento_id as "empreendimentoId",
              valor::float8     as valor,
              observacao
         from recebimentos
        where data = $1`,
      [data],
    ),
  ]);

  const grupos = new Map<string, LinhaDeContrato[]>();
  for (const contrato of contratos) {
    const k = chave(contrato.usuarioId, contrato.empreendimentoId);
    const grupo = grupos.get(k);
    if (grupo) grupo.push(contrato);
    else grupos.set(k, [contrato]);
  }

  return [...grupos.values()].map((aportes) => {
    const [primeiro] = aportes;

    /*
     * Credito sem empreendimento entra aqui tambem: ele é *geral*, e mostra-lo
     * na linha da obra evita o lancamento em duplicidade — que é o unico erro
     * caro desta tela.
     */
    const lancado = lancados.find(
      (l) =>
        l.usuarioId === primeiro.usuarioId &&
        (l.empreendimentoId === primeiro.empreendimentoId ||
          l.empreendimentoId === null),
    );

    return {
      usuarioId: primeiro.usuarioId,
      investidor: primeiro.investidor,
      empreendimentoId: primeiro.empreendimentoId,
      empreendimento: primeiro.empreendimento,
      aportes: aportes.length,
      estimativa: estimarCiclo(aportes, data),
      lancado: lancado
        ? {
            id: lancado.id,
            valor: lancado.valor,
            observacao: lancado.observacao,
          }
        : null,
    };
  });
}

/**
 * A estimativa de um par investidor/empreendimento, refeita no servidor.
 *
 * A acao de lancar nao aceita a estimativa que veio da tela: campo escondido é
 * so um campo, e o valor gravado precisa sair da mesma conta que a pagina
 * mostrou — nao de algo que trafegou pelo navegador.
 */
export async function estimativaDe(
  usuarioId: string,
  empreendimentoId: string,
  data: DataISO,
): Promise<Estimativa> {
  const aportes = await consultar<AporteMensal>(
    `select to_char(data, 'YYYY-MM-DD') as data,
            valor::float8 as valor,
            taxa::float8  as "taxaMensal",
            modalidade
       from contratos
      where usuario_id = $1 and empreendimento_id = $2 and modalidade = 'mensal'
      order by data`,
    [usuarioId, empreendimentoId],
  );

  return estimarCiclo(aportes, data);
}

/** Ja existe credito para esta pessoa nesta data? */
export async function jaLancado(
  usuarioId: string,
  empreendimentoId: string,
  data: DataISO,
): Promise<boolean> {
  const linhas = await consultar<{ id: string }>(
    `select id from recebimentos
      where usuario_id = $1
        and data = $2
        and (empreendimento_id = $3 or empreendimento_id is null)
      limit 1`,
    [usuarioId, data, empreendimentoId],
  );
  return linhas.length > 0;
}

/** Grava o credito e devolve o id da linha — o que a auditoria registra. */
export async function lancarCredito(credito: {
  usuarioId: string;
  empreendimentoId: string;
  data: DataISO;
  valor: number;
  observacao: string | null;
}): Promise<string> {
  const [linha] = await consultar<{ id: string }>(
    `insert into recebimentos
            (usuario_id, empreendimento_id, data, valor, observacao)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [
      credito.usuarioId,
      credito.empreendimentoId,
      credito.data,
      credito.valor,
      credito.observacao,
    ],
  );
  return String(linha?.id ?? "");
}
