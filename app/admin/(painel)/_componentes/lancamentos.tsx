import {
  montarLancamentos,
  type LinhaDeLancamento,
} from "@/lib/admin/lancamentos";
import { dataDeReferencia } from "@/lib/portal/dados";
import { formatarData, formatarMoeda } from "@/lib/portal/formato";
import { dataDoCredito } from "@/lib/portal/recebimentos";
import { acaoLancarCredito } from "../../acoes";
import { BotaoEnviar } from "./botao-enviar";
import { SeletorDeMes } from "./seletor-mes";

const COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * O lancamento do credito mensal, mes a mes.
 *
 * O portal mostra `recebimentos` e mais nada — nao ha projecao em tela. Este é
 * o bloco que preenche a tabela: para cada investidor com contrato `mensal`,
 * quanto o ciclo renderia pela conta do contrato, ja no campo, pronto para
 * confirmar ou corrigir.
 *
 * A estimativa aparece como *placeholder*, e nao como valor preenchido: campo
 * vazio significa "vale a conta" e o servidor a refaz na hora de gravar. Assim
 * o caminho normal é um clique, e ninguem lanca por engano um numero que a tela
 * calculou e o navegador poderia ter mexido.
 *
 * Vive **dentro da tela de Recebimentos**, e nao numa rota propria: lancar é o
 * jeito de criar uma linha ali, e as duas coisas separadas obrigavam a trocar
 * de tela para conferir o que acabou de ser gravado.
 */
export async function PainelDeLancamentos({
  mes,
  ok,
  aviso,
}: {
  mes?: string;
  ok?: string;
  aviso?: string;
}) {
  const hoje = await dataDeReferencia();

  // Mes de fora da URL passa pelo mesmo crivo de sempre; o que nao for
  // `AAAA-MM` cai no mes corrente em vez de virar consulta.
  const competencia = mes && COMPETENCIA.test(mes) ? mes : hoje.slice(0, 7);
  const data = dataDoCredito(competencia);
  const linhas = await montarLancamentos(data);

  /*
   * **Só o que falta lancar.** Antes a folha listava todos os contratos
   * mensais — os lancados junto com os pendentes —, cada um num cartao alto com
   * capital, participacao e a conta do ciclo. Quem abre isto tem uma tarefa, que
   * é lancar o que falta, e o que ja foi lancado é ruido no meio dela.
   *
   * O historico completo continua na tabela por baixo, que é o lugar dele, e o
   * cartao lancado tinha ali o mesmo "Editar" que a listagem ja oferece.
   */
  /*
   * Em carencia fica fora da folha: o contrato ainda nao fechou 30 dias para
   * este ciclo e nao ha o que lancar. Mas ele aparece numa linha a parte, com a
   * data do primeiro credito — senao quem acabou de cadastrar um contrato novo
   * o procuraria aqui e nao entenderia por que sumiu.
   */
  const emCarencia = linhas.flatMap((l) =>
    l.carencia && !l.lancado ? [{ linha: l, primeiroCredito: l.carencia }] : [],
  );
  const doCiclo = linhas.filter((l) => !emCarencia.some((c) => c.linha === l));
  const pendentes = doCiclo.filter((l) => !l.lancado);
  const aLancar = pendentes.reduce((soma, l) => soma + l.estimativa.valor, 0);

  return (
    <section>
      {/* `pr-10` abre espaco para o botao de fechar, que é `absolute` no canto
          e passaria por cima do seletor de mes. */}
      <div className="flex flex-wrap items-start justify-between gap-4 pr-10">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-tinta">
            Créditos a lançar
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ciclo de{" "}
            <span className="font-semibold text-tinta tabular-nums">
              {formatarData(data)}
            </span>
            .{" "}
            {pendentes.length === 0
              ? "Nada pendente."
              : `${pendentes.length} de ${doCiclo.length} ${
                  doCiclo.length === 1 ? "contrato" : "contratos"
                }, ${formatarMoeda(aLancar)} no total.`}
          </p>
          {/* A regra do campo vazio, dita uma vez para a lista toda — antes so
              se descobria lendo o codigo. */}
          {pendentes.length > 0 && (
            <p className="mt-1 text-xs text-neutral-400">
              Campo vazio lança o valor estimado. Digite outro só se o crédito
              fugiu da conta.
            </p>
          )}
          {emCarencia.length > 0 && (
            <p className="mt-2 text-xs text-neutral-500">
              Em carência, sem crédito neste ciclo:{" "}
              {emCarencia.map(({ linha, primeiroCredito }, indice) => (
                <span key={linha.contratoId}>
                  {indice > 0 && "; "}
                  <span className="font-semibold text-tinta">
                    {linha.investidor}
                  </span>{" "}
                  ({linha.empreendimento}), primeiro crédito em{" "}
                  <span className="tabular-nums">
                    {formatarData(primeiroCredito)}
                  </span>
                </span>
              ))}
              .
            </p>
          )}
        </div>
        <SeletorDeMes competencia={competencia} />
      </div>

      {ok && (
        <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-verde">
          Crédito lançado.
        </p>
      )}
      {aviso === "duplicado" && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Já havia um crédito lançado para este investidor nesta data. Nada foi
          gravado.
        </p>
      )}
      {aviso === "valor" && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          O valor digitado não é um número válido. Nada foi gravado — confira
          e lance de novo, ou deixe o campo vazio para usar a estimativa.
        </p>
      )}

      {pendentes.length === 0 ? (
        <p className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-neutral-500">
          {linhas.length === 0
            ? "Nenhum investidor com contrato mensal."
            : doCiclo.length === 0
              ? "Nenhum contrato fechou os 30 dias para este ciclo."
              : "Todos os créditos deste ciclo já foram lançados."}
        </p>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {pendentes.map((linha) => (
            <li key={linha.contratoId}>
              <CartaoDeLancamento linha={linha} competencia={competencia} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Uma linha do que falta lancar: quem, quando, quanto.
 *
 * **Tres campos, e nao dez.** O cartao antigo trazia capital, participacao, a
 * estimativa, a conta que a produziu ("26 de 30 dias a 2,60%"), o selo de ciclo
 * rateado e um campo de observacao. Tudo verdadeiro, e tudo irrelevante no
 * momento de confirmar: quem lanca ja negociou aquele contrato e quer saber se o
 * numero bate. O detalhe continua a um clique, na tabela de baixo.
 *
 * A estimativa é *placeholder*, e nao valor preenchido — como antes, e pelo
 * mesmo motivo: campo em branco significa "vale a conta", e o servidor a refaz
 * na hora de gravar. Assim o caminho normal é um clique, e ninguem lanca por
 * engano um numero que a tela calculou e o navegador poderia ter mexido.
 */
function CartaoDeLancamento({
  linha,
  competencia,
}: {
  linha: LinhaDeLancamento;
  competencia: string;
}) {
  const { estimativa } = linha;

  return (
    <form
      // `bind` fixa o contrato e a competencia no servidor: eles nao trafegam
      // pelo formulario, e por isso nao ha como trocar de quem é o credito
      // reenviando a requisicao.
      action={acaoLancarCredito.bind(null, {
        contratoId: linha.contratoId,
        competencia,
      })}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors duration-200 hover:border-zinc-300"
    >
      {/* O nome ocupa o que sobrar, e o valor e o botao tem largura fixa: assim
          as linhas alinham entre si mesmo com nomes de tamanhos diferentes.

          A obra vem embaixo do nome. Sem ela, quem tem dois contratos mensais
          aparecia em dois cartoes identicos, e nao havia como saber qual
          credito era de qual obra. A data saiu daqui: é a mesma em todos os
          cartoes, e ja esta no topo da folha. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-tinta">
          {linha.investidor}
        </span>
        <span className="mt-0.5 block truncate text-xs text-neutral-500">
          {linha.empreendimento}
          <span className="text-neutral-400">
            {" · "}estimado{" "}
            <span className="tabular-nums">
              {formatarMoeda(estimativa.valor)}
            </span>
          </span>
        </span>
      </span>

      {/*
       * Texto, e nao `type="number"`: o numero recusa `7.316,67`, que é como se
       * escreve dinheiro aqui, e no Firefox devolve vazio sem avisar — vazio
       * que a acao leria como "usar a estimativa". O servidor le os dois
       * formatos (`numeroDeTexto`).
       */}
      <label className="relative w-40 shrink-0">
        <span className="sr-only">
          Valor do crédito de {linha.investidor} em {linha.empreendimento}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-neutral-400"
        >
          R$
        </span>
        <input
          name="valor"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={estimativa.valor.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pr-3 pl-9 text-right text-sm text-tinta tabular-nums transition-colors duration-200 placeholder:text-neutral-400 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
        />
      </label>

      <BotaoEnviar
        enviando="Lançando…"
        className="shrink-0 rounded-lg bg-marinho px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
      >
        Lançar
      </BotaoEnviar>
    </form>
  );
}
