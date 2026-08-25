import "server-only";
import { consultar } from "@/lib/db";
import type { DataISO } from "@/lib/portal/dados";
import {
  competenciaDe,
  fimDoPrazoDe,
  mesSeguinte,
  PRAZO_PADRAO,
} from "@/lib/admin/investidor";
import {
  dataDoCredito,
  estimarCiclo,
  type AporteMensal,
} from "@/lib/portal/recebimentos";

/**
 * O desembolso da modalidade `mensal`, mes a mes, ate o ultimo contrato vencer.
 *
 * O painel sabia quanto ja *saiu* — a serie de `recebimentos` para tras. O que
 * ele nao respondia é a pergunta de quem paga: **quanto ainda vamos pagar, e
 * quando**. Um contrato de 36 meses assinado hoje é caixa comprometido por tres
 * anos, e isso nao aparecia em lugar nenhum.
 *
 * Por isso a serie atravessa o presente: passado é o que foi lancado, futuro é o
 * que a mesma formula do lancamento estima. A regra de corte é a de
 * `serieMensal` em `lib/admin/investidor.ts`, e de proposito — duas telas que
 * mostram o mesmo mes tem de mostrar o mesmo numero.
 *
 * **Só contrato de investidor.** Contrato em nome de administrador — a conta
 * de demonstracao — fica de fora das tres consultas. Ele nao é compromisso de
 * caixa com terceiro, que é o que este grafico mede.
 *
 * **A conta é por contrato, e nao por investidor.** Parece detalhe e nao é:
 * quem tem dois contratos mensais de prazos diferentes para de receber por um
 * antes do outro, e somar os aportes dos dois numa lista só faria o contrato
 * vencido continuar rendendo ate o vencimento do outro. Cada contrato anda no
 * proprio calendario; a soma por investidor acontece depois, so para o balao.
 */

/** Quanto um investidor recebe num mes. */
export type FatiaDoInvestidor = {
  nome: string;
  valor: number;
};

export type PontoDoPagamento = {
  /** Competencia `AAAA-MM`. */
  competencia: string;
  /** Creditos ja lancados neste mes. Zero nos meses que ainda nao chegaram. */
  realizado: number;
  /** A estimativa dos meses futuros. Zero nos que ja passaram. */
  projetado: number;
  /** `realizado + projetado` — sempre um dos dois, nunca os dois. */
  total: number;
  /** Quem recebe, do maior para o menor. Alimenta o balao do grafico. */
  investidores: FatiaDoInvestidor[];
};

type ContratoMensal = {
  contratoId: string;
  nome: string;
  data: DataISO;
  prazoMeses: number | null;
};

type AporteDoContrato = {
  contratoId: string;
  data: DataISO;
  valor: number;
  taxaMensal: number;
};

export async function pagamentosMensais(
  referencia: DataISO,
): Promise<PontoDoPagamento[]> {
  const [contratos, linhas, lancados] = await Promise.all([
    consultar<ContratoMensal>(
      `select c.id  as "contratoId",
              u.nome,
              to_char(c.data, 'YYYY-MM-DD') as data,
              c.prazo_meses as "prazoMeses"
         from contratos c
         join usuarios u on u.id = c.usuario_id
        where c.modalidade = 'mensal' and u.tipo = 'investidor'
        order by c.data`,
    ),

    /*
     * Entrada do contrato e aditivos na mesma lista: para a conta os dois sao
     * capital que entrou numa data, sob uma participacao. Aditivo sem taxa
     * herda a do contrato — "em branco" significa "segue como esta", e nao
     * "sem taxa".
     */
    consultar<AporteDoContrato>(
      `select c.id            as "contratoId",
              to_char(c.data, 'YYYY-MM-DD') as data,
              c.valor::float8 as valor,
              c.taxa::float8  as "taxaMensal"
         from contratos c
         join usuarios u on u.id = c.usuario_id
        where c.modalidade = 'mensal' and u.tipo = 'investidor'

        union all

       select a.contrato_id,
              to_char(a.data, 'YYYY-MM-DD'),
              a.valor::float8,
              coalesce(a.taxa, c.taxa)::float8
         from aditivos a
         join contratos c on c.id = a.contrato_id
         join usuarios u  on u.id = c.usuario_id
        where c.modalidade = 'mensal' and u.tipo = 'investidor'

        order by data`,
    ),

    /*
     * O que de fato saiu, por contrato e por mes. Credito com data futura fica
     * de fora: o lancamento pode ser preparado antes do dia 17, e conta-lo como
     * realizado adiantaria um mes que ainda nao aconteceu.
     */
    consultar<{ contratoId: string; competencia: string; valor: number }>(
      `select r.contrato_id as "contratoId",
              to_char(r.data, 'YYYY-MM') as competencia,
              sum(r.valor)::float8       as valor
         from recebimentos r
         join contratos c on c.id = r.contrato_id
         join usuarios u  on u.id = c.usuario_id
        where c.modalidade = 'mensal' and r.data <= $1
          and u.tipo = 'investidor'
        group by 1, 2`,
      [referencia],
    ),
  ]);

  if (contratos.length === 0) return [];

  const pago = new Map(
    lancados.map((l) => [`${l.contratoId}|${l.competencia}`, l.valor]),
  );

  const aportesPorContrato = new Map<string, AporteMensal[]>();
  for (const linha of linhas) {
    const lista = aportesPorContrato.get(linha.contratoId) ?? [];
    lista.push({
      data: linha.data,
      valor: linha.valor,
      taxaMensal: linha.taxaMensal,
      modalidade: "mensal",
    });
    aportesPorContrato.set(linha.contratoId, lista);
  }

  const hoje = competenciaDe(referencia);
  /** Competencia -> nome do investidor -> quanto ele recebe nela. */
  const meses = new Map<
    string,
    { realizado: number; projetado: number; porNome: Map<string, number> }
  >();

  for (const contrato of contratos) {
    const aportes = aportesPorContrato.get(contrato.contratoId);
    if (!aportes) continue;

    const inicio = competenciaDe(contrato.data);
    const fim = fimDoPrazoDe(
      contrato.data,
      contrato.prazoMeses ?? PRAZO_PADRAO,
    );

    for (let mes = inicio; mes <= fim; mes = mesSeguinte(mes)) {
      const passado = mes <= hoje;
      const valor = passado
        ? (pago.get(`${contrato.contratoId}|${mes}`) ?? 0)
        : estimarCiclo(aportes, dataDoCredito(mes)).valor;

      const ponto = meses.get(mes) ?? {
        realizado: 0,
        projetado: 0,
        porNome: new Map<string, number>(),
      };
      if (passado) ponto.realizado += valor;
      else ponto.projetado += valor;
      /*
       * Aqui sim por investidor: dois contratos da mesma pessoa viram uma linha
       * só no balao. É o nome que aparece na tela, e ver "Lyara" duas vezes com
       * valores diferentes obrigaria quem le a somar de cabeca.
       */
      if (valor > 0) {
        ponto.porNome.set(
          contrato.nome,
          (ponto.porNome.get(contrato.nome) ?? 0) + valor,
        );
      }
      meses.set(mes, ponto);
    }
  }

  return [...meses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([competencia, ponto]) => ({
      competencia,
      realizado: ponto.realizado,
      projetado: ponto.projetado,
      total: ponto.realizado + ponto.projetado,
      investidores: [...ponto.porNome.entries()]
        .map(([nome, valor]) => ({ nome, valor }))
        // Do maior para o menor: o balao pode nao caber inteiro, e quem for
        // cortado tem de ser quem menos pesa no mes.
        .sort((a, b) => b.valor - a.valor),
    }));
}
