import { consultar } from "@/lib/db";
import {
  ListaDeDestinos,
  NotaDeObrigatorio,
  RodapeDaFolha,
} from "./rodape-da-folha";
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
 *
 * Sem cartao proprio: a folha que o envolve ja é a superficie. Antes havia um
 * cartao com sombra **dentro** da folha — uma caixa dentro da outra, com dois
 * respiros somados nas bordas.
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
export async function EnviarAgora({ fechar }: { fechar: string }) {
  const investidores = await consultar<{ id: string; nome: string }>(
    `select id, nome from usuarios where tipo = 'investidor' order by nome`,
  );

  return (
    <form action={acaoEnviarNotificacao}>
      <header className="mb-5 pr-10">
        <h2 className="text-lg font-bold tracking-tight text-tinta">
          Enviar aviso agora
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Aparece no sino na hora e chega como push em quem tem o app
          instalado.
        </p>
      </header>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-neutral-600">
            Título <span className="text-red-600">*</span>
          </span>
          <input
            name="titulo"
            required
            placeholder="Ex.: Novas fotos da obra"
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-neutral-600">Texto</span>
          <textarea
            name="corpo"
            rows={3}
            placeholder="O que a pessoa lê ao abrir o aviso."
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">
            Para quem
          </span>
          <div className="mt-1.5">
            <Seletor
              nome="usuario_id"
              rotuloAcessivel="Para quem"
              opcoes={investidores.map((i) => ({
                valor: i.id,
                rotulo: i.nome,
              }))}
              vazio="Todos os investidores"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">
            Ao tocar, abre
          </span>
          <input
            name="url"
            list="destinos-do-aviso"
            placeholder="/portal"
            className={CLASSE_CAMPO}
          />
          <ListaDeDestinos id="destinos-do-aviso" />
          <span className="mt-1 block text-xs text-neutral-400">
            Escolha uma tela ou escreva o caminho.
          </span>
        </label>
      </div>

      <RodapeDaFolha
        fechar={fechar}
        enviando="Enviando…"
        nota={<NotaDeObrigatorio />}
      >
        Enviar agora
      </RodapeDaFolha>
    </form>
  );
}
