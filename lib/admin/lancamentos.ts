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
 * alimentada, uma vez por mes. A tela lista os contratos `mensal`, calcula
 * quanto o ciclo renderia e deixa o valor pronto para confirmar ou corrigir.
 *
 * **A unidade é o contrato.** Antes era investidor x empreendimento, porque
 * cada aporte era uma linha de `contratos` e nao havia contrato a que se
 * referir. Agora o credito aponta para ele: é o contrato que define
 * participacao, prazo e forma de retorno, e é dele que sai a conta.
 */

export type LinhaDeLancamento = {
  contratoId: string;
  investidor: string;
  empreendimento: string;
  /** Quantos aportes compoem o capital: a entrada mais os aditivos. */
  aportes: number;
  estimativa: Estimativa;
  /** O que ja foi lancado nesta data, se ja foi. */
  lancado: { id: string; valor: number; observacao: string | null } | null;
};

type AporteDoContrato = AporteMensal & {
  contratoId: string;
  investidor: string;
  empreendimento: string;
};

/**
 * A entrada de cada contrato `mensal` e todos os aditivos dele, em uma lista só.
 *
 * Sao a mesma coisa para a conta do ciclo — capital que entrou numa data, sob
 * uma participacao —, e é assim que `estimarCiclo` os espera.
 */
async function aportesDosContratos(): Promise<AporteDoContrato[]> {
  return consultar<AporteDoContrato>(
    `select c.id   as "contratoId",
            u.nome as investidor,
            e.nome as empreendimento,
            to_char(c.data, 'YYYY-MM-DD') as data,
            c.valor::float8 as valor,
            c.taxa::float8  as "taxaMensal",
            c.modalidade
       from contratos c
       join usuarios u        on u.id = c.usuario_id
       join empreendimentos e on e.id = c.empreendimento_id
      where c.modalidade = 'mensal'

      union all

     select c.id   as "contratoId",
            u.nome as investidor,
            e.nome as empreendimento,
            to_char(a.data, 'YYYY-MM-DD') as data,
            a.valor::float8 as valor,
            coalesce(a.taxa, c.taxa)::float8 as "taxaMensal",
            c.modalidade
       from aditivos a
       join contratos c       on c.id = a.contrato_id
       join usuarios u        on u.id = c.usuario_id
       join empreendimentos e on e.id = c.empreendimento_id
      where c.modalidade = 'mensal'

      order by investidor, empreendimento, data`,
  );
}

export async function montarLancamentos(
  data: DataISO,
): Promise<LinhaDeLancamento[]> {
  const [aportes, lancados] = await Promise.all([
    aportesDosContratos(),
    consultar<{
      id: string;
      contratoId: string;
      valor: number;
      observacao: string | null;
    }>(
      `select id,
              contrato_id   as "contratoId",
              valor::float8 as valor,
              observacao
         from recebimentos
        where data = $1`,
      [data],
    ),
  ]);

  const porContrato = new Map<string, AporteDoContrato[]>();
  for (const aporte of aportes) {
    const lista = porContrato.get(aporte.contratoId);
    if (lista) lista.push(aporte);
    else porContrato.set(aporte.contratoId, [aporte]);
  }

  return [...porContrato.values()].map((doContrato) => {
    const [primeiro] = doContrato;
    const lancado = lancados.find((l) => l.contratoId === primeiro.contratoId);

    return {
      contratoId: primeiro.contratoId,
      investidor: primeiro.investidor,
      empreendimento: primeiro.empreendimento,
      aportes: doContrato.length,
      estimativa: estimarCiclo(doContrato, data),
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
 * A estimativa de um contrato, refeita no servidor.
 *
 * A acao de lancar nao aceita a estimativa que veio da tela: campo escondido é
 * so um campo, e o valor gravado precisa sair da mesma conta que a pagina
 * mostrou — nao de algo que trafegou pelo navegador.
 */
export async function estimativaDe(
  contratoId: string,
  data: DataISO,
): Promise<Estimativa> {
  const aportes = await consultar<AporteMensal>(
    `select to_char(data, 'YYYY-MM-DD') as data,
            valor::float8 as valor,
            taxa::float8  as "taxaMensal",
            modalidade
       from contratos
      where id = $1

      union all

     select to_char(a.data, 'YYYY-MM-DD') as data,
            a.valor::float8 as valor,
            coalesce(a.taxa, c.taxa)::float8 as "taxaMensal",
            c.modalidade
       from aditivos a
       join contratos c on c.id = a.contrato_id
      where a.contrato_id = $1

      order by data`,
    [contratoId],
  );

  return estimarCiclo(aportes, data);
}

/** Ja existe credito para este contrato nesta data? */
export async function jaLancado(
  contratoId: string,
  data: DataISO,
): Promise<boolean> {
  const linhas = await consultar<{ id: string }>(
    `select id from recebimentos
      where contrato_id = $1 and data = $2
      limit 1`,
    [contratoId, data],
  );
  return linhas.length > 0;
}

/** Grava o credito e devolve o id da linha — o que a auditoria registra. */
export async function lancarCredito(credito: {
  contratoId: string;
  data: DataISO;
  valor: number;
  observacao: string | null;
}): Promise<string> {
  const [linha] = await consultar<{ id: string }>(
    `insert into recebimentos (contrato_id, data, valor, observacao)
     values ($1, $2, $3, $4)
     returning id`,
    [credito.contratoId, credito.data, credito.valor, credito.observacao],
  );
  return String(linha?.id ?? "");
}
