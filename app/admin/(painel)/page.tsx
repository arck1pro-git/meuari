import Link from "next/link";
import { consultar } from "@/lib/db";
import { TABELAS } from "@/lib/admin/tabelas";
import {
  IconeInvestimento,
  IconeSetaDireita,
  IconeSino,
} from "@/app/(app)/portal/_componentes/icones";
import { CabecalhoDaSecao } from "./_componentes/cabecalho";
import { agrupar } from "./_componentes/grupos";

// Contagem por tabela, sempre do banco — nada de cache entre visitas.
export const dynamic = "force-dynamic";

/**
 * A tela inicial do painel.
 *
 * Ela era a mesma lista da coluna da esquerda, em cartoes: quem ja estava na
 * coluna nao tinha o que fazer aqui. O que ela tem de proprio, e a coluna nao
 * tem, é *quanto* ha em cada tabela — entao é isso que ela mostra, nos mesmos
 * grupos da navegacao, com as duas tarefas recorrentes em cima.
 *
 * As duas tarefas nao sao tabelas: lancar o credito do mes e mandar um aviso
 * sao o que se vem fazer no painel, e ate agora exigiam saber que a primeira
 * mora dentro de Recebimentos e a segunda dentro de Notificacoes.
 */
const TAREFAS = [
  {
    href: "/admin/recebimentos",
    Icone: IconeInvestimento,
    titulo: "Lançar crédito do mês",
    apoio: "A estimativa de cada contrato mensal, pronta para confirmar.",
  },
  {
    href: "/admin/notificacoes",
    Icone: IconeSino,
    titulo: "Enviar um aviso",
    apoio: "Na hora, ou repetindo sozinho no dia e na hora que marcar.",
  },
];

export default async function AdminPage() {
  const contagens = await Promise.all(
    TABELAS.map(async (t) => {
      // O nome da tabela vem do registro, nunca da requisicao.
      const [linha] = await consultar<{ total: string }>(
        `select count(*)::text as total from "${t.tabela}"`,
      );
      return { ...t, total: Number(linha?.total ?? 0) };
    }),
  );

  const blocos = agrupar(contagens);

  return (
    <>
      <CabecalhoDaSecao
        titulo="Administração"
        apoio="O que fazer hoje, e o que já está guardado em cada tabela."
      />

      <ul className="escalonar mt-6 grid gap-3 sm:grid-cols-2">
        {TAREFAS.map(({ href, Icone, titulo, apoio }) => (
          <li key={href}>
            <Link
              href={href}
              /* Tinta chapada nas duas tarefas: elas sao o unico bloco escuro
                 da tela, e é isso que as separa da parede de cartoes brancos
                 logo abaixo sem precisar de tamanho maior. */
              className="group flex h-full items-center gap-4 rounded-2xl bg-tinta p-5 text-white transition-colors duration-200 hover:bg-marinho focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
            >
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ouro"
              >
                <Icone className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-white/60">
                  {apoio}
                </span>
              </span>

              <IconeSetaDireita className="h-5 w-5 shrink-0 text-white/50 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>

      {blocos.map((bloco) => (
        <section key={bloco.titulo || "outras"} className="mt-10">
          <h2 className="text-[0.6875rem] font-semibold tracking-wider text-neutral-400 uppercase">
            {bloco.titulo || "Outras"}
          </h2>

          <ul className="escalonar mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bloco.itens.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/admin/${t.slug}`}
                  className="sombra-cartao hover:sombra-cartao-alta group flex h-full items-center justify-between gap-4 rounded-2xl border border-tinta/12 bg-white p-5 transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-tinta">
                      {t.rotulo}
                    </span>
                    {/* O numero em primeiro e grande: é o unico dado que esta
                        tela tem e a coluna da esquerda nao. */}
                    <span className="mt-1 block text-xs text-neutral-500">
                      <span className="text-base font-bold tabular-nums text-tinta">
                        {t.total}
                      </span>{" "}
                      {t.total === 1 ? "registro" : "registros"}
                    </span>
                  </span>

                  <IconeSetaDireita className="h-5 w-5 shrink-0 text-marinho transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
