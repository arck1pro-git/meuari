import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoValida } from "@/lib/auth";
import { TABELAS } from "@/lib/admin/tabelas";
import { sair } from "../acoes";
import { BarraAdmin } from "./barra-admin";

export const metadata: Metadata = {
  title: "Administracao · Meu ARI",
  // A area nao deve aparecer em busca nenhuma.
  robots: { index: false, follow: false },
};

/*
 * A guarda vive num grupo de rotas — `(painel)` nao aparece na URL — para o
 * login poder ser filho de `/admin` sem herdar a exigencia de sessao. Fosse um
 * layout unico em `/admin`, ou o login exigiria sessao (e ninguem entraria), ou
 * a guarda precisaria adivinhar a rota atual.
 *
 * A navegacao é uma coluna fixa a esquerda, e nao mais um cabecalho com fila de
 * pastilhas: com onze tabelas aquela fila rolava na horizontal, e metade das
 * secoes vivia fora da tela. Ver `BarraAdmin`.
 */
export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `sessaoValida` e nao `lerSessao`: além da assinatura do cookie, ela
  // confere no banco se aquela sessao ainda vale — é o que faz "sair de todos
  // os aparelhos" alcançar tambem o painel.
  const sessao = await sessaoValida();
  if (!sessao) redirect("/admin/login");
  if (sessao.tipo !== "administrador") redirect("/admin/login?erro=restrito");

  return (
    <div className="min-h-dvh bg-white text-tinta">
      {/* Só as tabelas. "Lancamentos" era uma secao a parte e virou o topo da
          tela de Recebimentos: lancar é criar uma linha ali. */}
      <BarraAdmin
        nome={sessao.nome}
        sair={sair}
        secoes={TABELAS.map(({ slug, rotulo }) => ({ slug, rotulo }))}
      />

      {/* O padding abre o espaco da coluna fixa — 64px do trilho de icones,
          240px quando ela expande. O `max-w` centra dentro do que sobrou, e
          nao na tela: senao o conteudo nasceria torto para a direita. */}
      <div className="pl-16 md:pl-60">
        <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
