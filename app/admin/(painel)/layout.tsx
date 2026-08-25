import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoValida } from "@/lib/auth";
import { TABELAS } from "@/lib/admin/tabelas";
import { sair } from "../acoes";
import { BarraAdmin } from "./barra-admin";

export const metadata: Metadata = {
  title: "Administração · Amaan Invest",
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
    // `tema-painel` troca os tokens de cor para toda a arvore abaixo — é o que
    // faz o painel nao ter a paleta do portal. Ver o bloco em `globals.css`.
    // Precisa ficar aqui, no ancestral de tudo: a coluna da esquerda e cada
    // bloco leem as variaveis por heranca.
    <div className="tema-painel min-h-dvh bg-fundo-painel text-tinta">
      {/* Só as tabelas. "Lancamentos" era uma secao a parte e virou o topo da
          tela de Recebimentos: lancar é criar uma linha ali. */}
      <BarraAdmin
        nome={sessao.nome}
        sair={sair}
        secoes={TABELAS.map(({ slug, rotulo }) => ({ slug, rotulo }))}
      />

      {/* O padding abre o espaco da coluna fixa — 64px do trilho de icones,
          208px quando ela expande. Os dois numeros sao os da `BarraAdmin`, que
          é `fixed` e por isso nao empurra nada: se um sair do lugar sem o
          outro, ou o conteudo passa por baixo da coluna ou abre um vao ao lado
          dela. O `max-w` centra dentro do que sobrou, e nao na tela: senao o
          conteudo nasceria torto para a direita.

          O teto era `max-w-6xl` (1152px), largura de texto corrido. Numa tela
          de 1920 isso deixava mais de 500px de branco nas laterais, e o que
          vive aqui nao é texto: é tabela de seis colunas, grafico e listagem de
          registro, tudo coisa que se le comparando de um lado ao outro. Agora o
          conteudo ocupa o que houver.

          O teto continua existindo, alto, so para tela ultralarga: sem nenhum,
          as seis colunas da tabela se espalhariam por 3000px e o numero ficaria
          longe do rotulo que o nomeia. */}
      <div className="pl-16 md:pl-52">
        <main className="mx-auto w-full max-w-[110rem] px-5 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
