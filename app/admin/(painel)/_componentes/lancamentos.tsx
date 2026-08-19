import { montarLancamentos, type LinhaDeLancamento } from "@/lib/admin/lancamentos";
import { dataDeReferencia } from "@/lib/portal/dados";
import { formatarData, formatarMoeda } from "@/lib/portal/formato";
import { dataDoCredito } from "@/lib/portal/recebimentos";
import { acaoLancarCredito } from "../../acoes";
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
  const pendentes = linhas.filter((l) => !l.lancado);
  const aLancar = pendentes.reduce((soma, l) => soma + l.estimativa.valor, 0);

  return (
    <section>
      {/* `pr-10` abre espaco para o botao de fechar, que é `absolute` no canto
          e passaria por cima do seletor de mes. */}
      <div className="flex flex-wrap items-start justify-between gap-4 pr-10">
        <div>
          <h2 className="text-base font-bold tracking-tight text-tinta">
            Créditos a lançar
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ciclo de {formatarData(data)}.{" "}
            {pendentes.length === 0
              ? "Nada pendente."
              : `${pendentes.length} de ${linhas.length} ${
                  linhas.length === 1 ? "contrato" : "contratos"
                }, ${formatarMoeda(aLancar)} no total.`}
          </p>
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

      {pendentes.length === 0 ? (
        <p className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-neutral-500">
          {linhas.length === 0
            ? "Nenhum investidor com contrato mensal."
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
          as linhas alinham entre si mesmo com nomes de tamanhos diferentes. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-tinta">
          {linha.investidor}
        </span>
        <span className="mt-0.5 block text-xs text-neutral-500 tabular-nums">
          {formatarData(dataDoCredito(competencia))}
        </span>
      </span>

      <label className="w-36 shrink-0">
        <span className="sr-only">
          Valor do crédito de {linha.investidor}
        </span>
        <input
          name="valor"
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder={estimativa.valor.toFixed(2)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-right text-sm text-tinta tabular-nums transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
        />
      </label>

      <button
        type="submit"
        className="shrink-0 rounded-lg bg-marinho px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
      >
        Lançar
      </button>
    </form>
  );
}
