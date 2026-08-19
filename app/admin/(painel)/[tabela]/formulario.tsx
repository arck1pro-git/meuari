import { opcoesDeReferencia, type Linha } from "@/lib/admin/crud";
import type { Campo, Tabela } from "@/lib/admin/tabelas";
import { TETOS } from "@/lib/upload";
import { acaoAtualizar, acaoCriar } from "../../acoes";
import { CampoArquivo } from "./campo-arquivo";
import { CampoNumero } from "./campo-numero";

/* O mesmo desenho de campo do login: canto de 12px, borda discreta e o anel
   azul so no foco por teclado. */
const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul";

/**
 * `AAAA-MM-DD` para o `input[type=date]`.
 *
 * O driver do Postgres devolve coluna `date` como objeto `Date`, e
 * `String(data)` vira "Thu May 28 2026 00:00:00 GMT-0300...". Cortar os dez
 * primeiros caracteres disso da "Thu May 28": o input recusa o formato, fica
 * vazio e, sendo obrigatorio, impede salvar o registro inteiro.
 *
 * Partes locais, e nao `toISOString()`: `date` é parseado como meia-noite
 * local, e o UTC jogaria a data para o dia anterior a oeste de Greenwich.
 */
function paraDataISO(bruto: unknown): string {
  if (bruto instanceof Date) {
    const dois = (n: number) => String(n).padStart(2, "0");
    return `${bruto.getFullYear()}-${dois(bruto.getMonth() + 1)}-${dois(bruto.getDate())}`;
  }
  return String(bruto).slice(0, 10);
}

/**
 * Valor que o input espera: `date` quer `AAAA-MM-DD`, nao ISO completo.
 *
 * `percentual` e `dinheiro` voltam **ja formatados**, e nao crus: o banco guarda
 * `0.026` e `50000.00`, e a tela mostra `2,6%` e `50.000,00`. Sem esta volta, o
 * campo abriria na edicao com o numero do banco e a pessoa salvaria `0,026%` —
 * o inverso exato do que se quis consertar.
 *
 * A conta é feita aqui, no servidor, pelo mesmo motivo que a divisao por 100
 * mora em `valorDoCampo`: um lado só faz as duas pontas da conversao, e elas nao
 * podem divergir.
 */
function valorInicial(campo: Campo, linha?: Linha): string {
  if (!linha) return "";
  const bruto = linha[campo.nome];
  if (bruto === null || bruto === undefined) return "";
  if (campo.tipo === "data") return paraDataISO(bruto);

  if (campo.tipo === "percentual") {
    // O driver devolve `numeric` como string, para nao perder precisao.
    const n = Number(bruto);
    if (!Number.isFinite(n)) return "";
    /*
     * `toFixed(3)` antes do parse: `0.026 * 100` em ponto flutuante da
     * 2.6000000000000005, e o campo abriria com essa cauda. Tres casas é o que
     * cabe num `numeric(6,5)` convertido para percentual.
     */
    const percentual = Number((n * 100).toFixed(3));
    return `${percentual.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%`;
  }

  if (campo.tipo === "dinheiro") {
    const n = Number(bruto);
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return String(bruto);
}

async function CampoDoFormulario({
  campo,
  linha,
  slug,
}: {
  campo: Campo;
  linha?: Linha;
  slug: string;
}) {
  const valor = valorInicial(campo, linha);

  // Dinheiro e participacao tem componente proprio: eles se formatam ao sair do
  // campo, o que exige estado no cliente. Ver `CampoNumero`.
  if (campo.tipo === "dinheiro" || campo.tipo === "percentual") {
    return (
      <CampoNumero
        nome={campo.nome}
        rotulo={campo.rotulo}
        valorInicial={valor}
        formato={campo.tipo}
        obrigatorio={campo.obrigatorio}
        ajuda={campo.ajuda}
      />
    );
  }

  // Arquivo tem componente proprio: o envio acontece no browser, antes do
  // `submit`, e o formulario so carrega o caminho de volta.
  if (campo.tipo === "arquivo") {
    return (
      <CampoArquivo
        slug={slug}
        nome={campo.nome}
        rotulo={campo.rotulo}
        valorAtual={valor}
        obrigatorio={campo.obrigatorio}
        aceita={campo.aceita}
        teto={campo.aceita ? TETOS[campo.aceita] : undefined}
        ajuda={campo.ajuda}
      />
    );
  }
  const comum = {
    name: campo.nome,
    id: campo.nome,
    required: campo.obrigatorio && campo.tipo !== "senha",
    className: CLASSE_CAMPO,
  };

  return (
    <label className="block">
      <span className="text-xs font-semibold text-neutral-600">
        {campo.rotulo}
        {campo.obrigatorio && campo.tipo !== "senha" && (
          <span aria-hidden className="text-red-600">
            {" "}
            *
          </span>
        )}
      </span>

      {campo.tipo === "area" ? (
        <textarea {...comum} rows={3} defaultValue={valor} />
      ) : campo.tipo === "escolha" ? (
        <select {...comum} defaultValue={valor}>
          <option value="">—</option>
          {campo.opcoes?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : campo.tipo === "referencia" ? (
        <select {...comum} defaultValue={valor}>
          <option value="">—</option>
          {(await opcoesDeReferencia(campo)).map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...comum}
          /* Sem `dinheiro` nestes dois: ele sai antes, no `CampoNumero`. O
             TypeScript acusou os ramos como inalcancaveis assim que o tipo
             ganhou saida propria — que é exatamente o que se quer dele. */
          type={
            campo.tipo === "senha"
              ? "password"
              : campo.tipo === "email"
                ? "email"
                : campo.tipo === "data"
                  ? "date"
                  : campo.tipo === "numero"
                    ? "number"
                    : "text"
          }
          step={campo.tipo === "numero" ? "any" : undefined}
          // A senha nunca volta preenchida: o banco guarda o hash, e ele nao
          // tem volta. Em branco significa "manter a atual".
          defaultValue={campo.tipo === "senha" ? "" : valor}
          autoComplete={campo.tipo === "senha" ? "new-password" : undefined}
        />
      )}

      {campo.ajuda && (
        <span className="mt-1 block text-xs text-neutral-400">
          {campo.ajuda}
        </span>
      )}
    </label>
  );
}

export async function Formulario({
  tabela,
  linha,
}: {
  tabela: Tabela;
  linha?: Linha;
}) {
  const editando = Boolean(linha);
  // `bind` fixa o slug e o id no servidor: eles nao trafegam pelo formulario e
  // por isso nao podem ser trocados por quem envia.
  const acao = editando
    ? acaoAtualizar.bind(null, tabela.slug, String(linha!.id))
    : acaoCriar.bind(null, tabela.slug);

  return (
    /*
     * Recolhido para criar, aberto para editar.
     *
     * Ele ficava sempre escancarado acima da tabela, e em Contratos sao doze
     * campos: para ver os dados era preciso rolar por um formulario vazio toda
     * vez. `<details>` resolve isso sem estado nem cliente — quem chega para
     * consultar ve a tabela, e quem chega para cadastrar abre.
     *
     * Editar abre sozinho, porque ai o formulario *é* o assunto: veio um id na
     * URL justamente para mexer nele.
     */
    <details
      open={editando}
      className="sombra-cartao group animate-surgir rounded-2xl border border-zinc-200 bg-white [animation-delay:60ms]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-colors duration-200 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul sm:px-8 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-bold tracking-tight text-tinta">
            {editando ? "Editar registro" : `Novo em ${tabela.rotulo}`}
          </span>
          <span className="mt-0.5 block text-xs text-neutral-500">
            {editando
              ? "As alterações valem ao salvar."
              : "Abrir o formulário de cadastro."}
          </span>
        </span>

        {/* A cruz vira "menos" quando abre — a mesma peca dizendo os dois
            estados, sem trocar de icone. */}
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-marinho transition-transform duration-300 ease-[var(--ease-suave)] group-open:rotate-45"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </span>
      </summary>

      <form
        /*
         * A `key` amarra o formulario ao registro. Sem ela, ir da lista para
         * "Editar" é navegacao de cliente: o React reaproveita os mesmos nos do
         * formulario de criar, e `defaultValue` so vale na montagem. Os inputs
         * ainda acompanham, porque o React reescreve o atributo `value`; os
         * `<select>` nao — ficam no vazio do formulario anterior. Como sao
         * obrigatorios, o navegador barra o envio e o registro nao salva.
         */
        key={editando ? String(linha!.id) : "novo"}
        action={acao}
        className="border-t border-zinc-200 px-5 py-6 sm:px-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {tabela.campos.map((campo) => (
            <CampoDoFormulario
              key={campo.nome}
              campo={campo}
              linha={linha}
              slug={tabela.slug}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-marinho px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
          >
            {editando ? "Salvar" : "Criar"}
          </button>
          {editando && (
            <a
              href={`/admin/${tabela.slug}`}
              className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-neutral-600 transition-colors duration-200 hover:bg-zinc-50 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
            >
              Cancelar
            </a>
          )}
        </div>
      </form>
    </details>
  );
}
