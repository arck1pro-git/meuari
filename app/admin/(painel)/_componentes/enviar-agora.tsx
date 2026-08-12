import { consultar } from "@/lib/db";
import { acaoEnviarNotificacao } from "../../acoes";

/**
 * O envio imediato: escreveu, apertou, chegou.
 *
 * Nao passa pelo n8n — ele só existe para o que se repete sozinho. Aqui o
 * clique é o gatilho, e o efeito é na hora: a linha entra na caixinha do sino e
 * o push sai para os aparelhos inscritos.
 *
 * Server Component com `<form action={acao}>`: nao ha estado nenhum a guardar
 * entre um envio e o proximo.
 */

const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-tinta/12 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 hover:border-tinta/25 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul";

export async function EnviarAgora({
  ok,
  entregues,
  aparelhos,
}: {
  ok?: string;
  entregues?: string;
  aparelhos?: string;
}) {
  const investidores = await consultar<{ id: string; nome: string }>(
    `select id, nome from usuarios where tipo = 'investidor' order by nome`,
  );

  return (
    <section className="mt-10">
      <h2 className="animate-surgir text-base font-bold tracking-tight text-black">
        Enviar agora
      </h2>
      <p className="mt-1 animate-surgir text-sm text-neutral-500">
        Vai na hora: aparece no sino e chega como push em quem tem o app
        instalado.
      </p>

      {ok === "enviado" && (
        <p className="mt-4 animate-surgir rounded-xl border border-verde/30 bg-verde/[0.07] px-4 py-3 text-sm font-medium text-verde">
          Aviso enviado.{" "}
          {Number(aparelhos ?? 0) === 0
            ? "Nenhum aparelho está inscrito para push — ele aparece no sino quando o investidor abrir o app."
            : `Push entregue em ${entregues} de ${aparelhos} ${
                Number(aparelhos) === 1 ? "aparelho" : "aparelhos"
              }.`}
        </p>
      )}

      <form
        action={acaoEnviarNotificacao}
        className="sombra-cartao mt-5 animate-surgir rounded-2xl border border-tinta/12 bg-white p-5 sm:p-7 [animation-delay:60ms]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-neutral-600">
              Título <span className="text-red-600">*</span>
            </span>
            <input name="titulo" required className={CLASSE_CAMPO} />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-neutral-600">Texto</span>
            <textarea name="corpo" rows={2} className={CLASSE_CAMPO} />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-600">
              Investidor
            </span>
            <select name="usuario_id" defaultValue="" className={CLASSE_CAMPO}>
              <option value="">Todos os investidores</option>
              {investidores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-neutral-400">
              Em branco = aviso geral.
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-600">Link</span>
            <input name="url" placeholder="/portal" className={CLASSE_CAMPO} />
            <span className="mt-1 block text-xs text-neutral-400">
              Para onde o toque leva.
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="mt-6 rounded-xl bg-marinho px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
        >
          Enviar agora
        </button>
      </form>
    </section>
  );
}
