import Link from "next/link";
import { montarLancamentos, type LinhaDeLancamento } from "@/lib/admin/lancamentos";
import { dataDeReferencia } from "@/lib/portal/dados";
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { dataDoCredito, type TrechoDeTaxa } from "@/lib/portal/recebimentos";
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

  const pendentes = linhas.filter((l) => !l.lancado);
  const aLancar = pendentes.reduce((soma, l) => soma + l.estimativa.valor, 0);

  return (
    <section className="mb-10">
      <div className="flex animate-surgir flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-black">
            Lançar crédito do mês
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Crédito de {formatarData(data)}, ciclo fechado neste dia.
          </p>
        </div>
        <SeletorDeMes competencia={competencia} />
      </div>

      {ok && (
        <p className="mt-4 animate-surgir rounded-xl border border-verde/30 bg-verde/[0.07] px-4 py-3 text-sm font-medium text-verde">
          Crédito lançado.
        </p>
      )}
      {aviso === "duplicado" && (
        <p className="mt-4 animate-surgir rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Já havia um crédito lançado para este investidor nesta data. Nada foi
          gravado — confira a lista abaixo.
        </p>
      )}

      {/* O resumo do mes: quanto falta lancar, e quanto isso soma. É o que
          responde "acabei?" sem contar cartao por cartao. */}
      <div className="sombra-cartao mt-6 flex animate-surgir flex-wrap items-center gap-x-10 gap-y-3 rounded-2xl border border-tinta/12 bg-white px-5 py-4 [animation-delay:60ms]">
        <Resumo
          rotulo="A lançar"
          valor={`${pendentes.length} de ${linhas.length}`}
        />
        <Resumo rotulo="Soma estimada" valor={formatarMoeda(aLancar)} />
        <Resumo
          rotulo="Já lançado"
          valor={formatarMoeda(
            linhas.reduce((soma, l) => soma + (l.lancado?.valor ?? 0), 0),
          )}
        />
      </div>

      {linhas.length === 0 ? (
        <p className="sombra-cartao mt-6 rounded-2xl border border-tinta/12 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          Nenhum investidor com contrato mensal.
        </p>
      ) : (
        <ul className="escalonar mt-6 grid gap-4 lg:grid-cols-2">
          {linhas.map((linha) => (
            <li key={linha.contratoId}>
              <CartaoDeLancamento linha={linha} competencia={competencia} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p>
      <span className="block text-xs text-neutral-500">{rotulo}</span>
      <span className="mt-0.5 block text-sm font-bold tabular-nums text-tinta">
        {valor}
      </span>
    </p>
  );
}

/**
 * Os dias que entraram na conta, como no grafico do portal: em taxa unica basta
 * a fracao do ciclo; com duas, cada uma com os seus dias.
 */
function contaDoCiclo(trechos: TrechoDeTaxa[]): string {
  if (trechos.length === 0) return "Sem capital no ciclo";
  if (trechos.length === 1) {
    return `${trechos[0].dias} de 30 dias a ${formatarPercentual(trechos[0].taxa)}`;
  }
  return trechos
    .map((t) => `${t.dias} dias a ${formatarPercentual(t.taxa)}`)
    .join(" + ");
}

function CartaoDeLancamento({
  linha,
  competencia,
}: {
  linha: LinhaDeLancamento;
  competencia: string;
}) {
  const { estimativa, lancado } = linha;

  return (
    <div className="sombra-cartao flex h-full flex-col rounded-2xl border border-tinta/12 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-tinta">
            {linha.investidor}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {linha.empreendimento} · {linha.aportes}{" "}
            {linha.aportes === 1 ? "aporte" : "aportes"}
          </p>
        </div>

        {/* O rateio precisa aparecer antes do lancamento, e nao depois: é ele
            que explica um valor menor que o do mes passado. */}
        {estimativa.quebrado && (
          <span className="shrink-0 rounded-full bg-azul/10 px-2.5 py-1 text-[0.625rem] font-semibold tracking-wide text-azul uppercase">
            Ciclo rateado
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-tinta/[0.06] py-4 text-sm">
        <Dado rotulo="Capital" valor={formatarMoeda(estimativa.capital)} />
        <Dado
          rotulo="Participação"
          valor={formatarPercentual(estimativa.taxaVigente)}
        />
        <div className="col-span-2">
          <Dado
            rotulo="Estimativa do ciclo"
            valor={formatarMoeda(estimativa.valor)}
            destaque
          />
          <p className="mt-0.5 text-xs text-neutral-400 tabular-nums">
            {contaDoCiclo(estimativa.trechos)}
          </p>
        </div>
      </dl>

      {lancado ? (
        <div className="mt-4 flex flex-1 flex-wrap items-end justify-between gap-3">
          <p>
            <span className="block text-xs font-semibold text-verde">
              Lançado
            </span>
            <span className="mt-0.5 block text-sm font-bold tabular-nums text-tinta">
              {formatarMoeda(lancado.valor)}
            </span>
            {lancado.observacao && (
              <span className="mt-0.5 block text-xs text-neutral-500">
                {lancado.observacao}
              </span>
            )}
          </p>

          {/* Corrigir e apagar continuam onde sempre estiveram: na tabela. Esta
              pagina lanca, e nao é um segundo CRUD de recebimentos. */}
          <Link
            href={`/admin/recebimentos?editar=${lancado.id}`}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-marinho transition-colors duration-200 hover:bg-marinho/10 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
          >
            Editar
          </Link>
        </div>
      ) : (
        <form
          // `bind` fixa o contrato e a competencia no servidor: eles nao
          // trafegam pelo formulario, e por isso nao ha como trocar de quem é o
          // credito reenviando a requisicao.
          action={acaoLancarCredito.bind(null, {
            contratoId: linha.contratoId,
            competencia,
          })}
          className="mt-4 flex flex-1 flex-col justify-end gap-3"
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-32 flex-1">
              <span className="text-xs font-semibold text-neutral-600">
                Valor
              </span>
              <input
                name="valor"
                type="number"
                step="0.01"
                inputMode="decimal"
                // A estimativa como placeholder, e nao como valor: em branco
                // vale a conta, e o servidor a refaz na hora de gravar.
                placeholder={estimativa.valor.toFixed(2)}
                aria-label={`Valor do crédito de ${linha.investidor} em ${linha.empreendimento}`}
                className="mt-1.5 w-full rounded-xl border border-tinta/12 bg-white px-3.5 py-2.5 text-sm text-tinta tabular-nums transition-colors duration-200 hover:border-tinta/25 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
              />
            </label>

            <label className="min-w-40 flex-1">
              <span className="text-xs font-semibold text-neutral-600">
                Observação
              </span>
              <input
                name="observacao"
                type="text"
                placeholder="Opcional"
                className="mt-1.5 w-full rounded-xl border border-tinta/12 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 hover:border-tinta/25 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
              />
            </label>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-marinho px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
          >
            Lançar crédito
          </button>
        </form>
      )}
    </div>
  );
}

function Dado({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{rotulo}</dt>
      <dd
        className={`mt-0.5 tabular-nums ${
          destaque
            ? "text-base font-bold text-marinho"
            : "text-sm font-semibold text-tinta"
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
