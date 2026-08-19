import { consultar } from "@/lib/db";
import { BotaoEnviar } from "./botao-enviar";
import { Seletor } from "./seletor";
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
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul";

/*
 * O aviso de "enviado" saiu daqui e foi para a pagina.
 *
 * A acao redireciona para `/admin/notificacoes?ok=enviado`, **sem** o parametro
 * que abre esta folha — ou seja, quando a confirmacao chega, este componente ja
 * nao esta na tela. Deixado aqui, o aviso nunca apareceria.
 */
export async function EnviarAgora() {
  const investidores = await consultar<{ id: string; nome: string }>(
    `select id, nome from usuarios where tipo = 'investidor' order by nome`,
  );

  return (
    <section>
      <header className="mb-5 pr-10">
        <h2 className="text-base font-bold tracking-tight text-tinta">
          Enviar agora
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Vai na hora: aparece no sino e chega como push em quem tem o app
          instalado.
        </p>
      </header>

      <form
        action={acaoEnviarNotificacao}
        className="sombra-cartao mt-5 animate-surgir rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 [animation-delay:60ms]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-neutral-600">
              Título <span className="text-red-600">*</span>
            </span>
            <input name="titulo" required className={CLASSE_CAMPO} />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-neutral-600">
              Texto
            </span>
            <textarea name="corpo" rows={2} className={CLASSE_CAMPO} />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-600">
              Investidor
            </span>
            <div className="mt-1.5">
              <Seletor
                nome="usuario_id"
                rotuloAcessivel="Investidor"
                opcoes={investidores.map((i) => ({
                  valor: i.id,
                  rotulo: i.nome,
                }))}
                vazio="Todos os investidores"
              />
            </div>
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

        <BotaoEnviar
          enviando="Enviando…"
          className="mt-6 rounded-xl bg-marinho px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
        >
          Enviar agora
        </BotaoEnviar>
      </form>
    </section>
  );
}
