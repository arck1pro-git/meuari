import { opcoesDeReferencia, type Linha } from "@/lib/admin/crud";
import type { Campo, Tabela } from "@/lib/admin/tabelas";
import { acaoAtualizar, acaoCriar } from "../../acoes";
import { CampoArquivo } from "./campo-arquivo";

const CLASSE_CAMPO =
  "mt-1 w-full rounded-lg border border-tinta/15 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-azul";

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

/** Valor que o input espera: `date` quer `AAAA-MM-DD`, nao ISO completo. */
function valorInicial(campo: Campo, linha?: Linha): string {
  if (!linha) return "";
  const bruto = linha[campo.nome];
  if (bruto === null || bruto === undefined) return "";
  if (campo.tipo === "data") return paraDataISO(bruto);
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
      <span className="text-xs font-medium text-neutral-600">
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
          type={
            campo.tipo === "senha"
              ? "password"
              : campo.tipo === "email"
                ? "email"
                : campo.tipo === "data"
                  ? "date"
                  : campo.tipo === "numero" || campo.tipo === "dinheiro"
                    ? "number"
                    : "text"
          }
          step={
            campo.tipo === "dinheiro"
              ? "0.01"
              : campo.tipo === "numero"
                ? "any"
                : undefined
          }
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
      className="rounded-xl border border-tinta/10 bg-white p-5"
    >
      <h2 className="text-sm font-semibold">
        {editando ? "Editar registro" : `Novo em ${tabela.rotulo}`}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {tabela.campos.map((campo) => (
          <CampoDoFormulario
            key={campo.nome}
            campo={campo}
            linha={linha}
            slug={tabela.slug}
          />
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-marinho px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-azul"
        >
          {editando ? "Salvar" : "Criar"}
        </button>
        {editando && (
          <a
            href={`/admin/${tabela.slug}`}
            className="rounded-lg border border-tinta/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-tinta/5"
          >
            Cancelar
          </a>
        )}
      </div>
    </form>
  );
}
