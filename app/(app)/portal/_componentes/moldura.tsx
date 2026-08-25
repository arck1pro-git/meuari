"use client";

import { usePathname } from "next/navigation";
import type { Notificacao } from "@/lib/portal/notificacoes";
import { Cabecalho } from "./cabecalho";
import { Navegacao } from "./navegacao";

/**
 * A moldura das telas de quem entrou: navegacao em volta, conteudo no meio.
 *
 * Uma moldura só, nos dois tamanhos: o cabecalho no topo, e no celular tambem
 * a barra de secoes no rodape.
 *
 * **Sem coluna a esquerda.** Ela era a forma do desktop — retrato, secoes,
 * simulador e sino numa faixa de 15rem —, e cobrava essa faixa em toda tela
 * larga para oferecer tres links. O conteudo, que é a razao de a tela ser
 * larga, ficava espremido no que sobrava.
 *
 * Chegou a voltar como uma regua de 4rem so com icones, e saiu de novo. No
 * desktop o /portal ja mostra as tres secoes de uma vez — carteira, obra e
 * simulador —, entao nao ha para onde a regua levar.
 *
 * O rodape continua so no celular (`md:hidden` la dentro): no desktop nao ha
 * mais nada disputando o lugar dele, mas tambem nao ha polegar.
 *
 * Ela mora no layout do grupo `(app)`, entao **nao remonta** ao trocar de rota:
 * só o miolo é substituido, e o toque no rodape responde na hora. Por isso é
 * cliente e le a rota com `usePathname` — receber a rota como prop obrigaria o
 * layout a ser refeito a cada navegacao, que é o que se quer evitar.
 */

/**
 * Rotas que sao secao: só nelas o rodape do mobile aparece.
 *
 * O simulador entrou aqui. Ele era tela cheia, sem cabecalho e sem rodape, com
 * um "Voltar" proprio — e o botao do meio da barra levava para fora do app. Sem
 * motivo: ele é uma secao como as outras, e trocar para ele deve ser igual a
 * trocar do portal para as obras, com a moldura parada e só o miolo mudando.
 */
const SECOES = ["/portal", "/obras", "/simulador"] as const;

/** A secao aberta, ou `null` nas telas que nao sao secao — perfil, artigo. */
export type Secao = (typeof SECOES)[number] | null;

export function Moldura({
  nome,
  notificacoes,
  children,
}: {
  nome: string;
  notificacoes: Notificacao[];
  children: React.ReactNode;
}) {
  const rota = usePathname();

  /*
   * `/obras/<id>` conta como a secao Obras.
   *
   * A ficha da obra deixou de ter o link "Obras" no topo, e sem isto ela
   * ficaria sem nenhuma saida visivel no celular — a barra do rodape só
   * aparecia na lista. Com o prefixo, ela aparece tambem na ficha, com Obras
   * marcada, e o toque leva de volta.
   */
  const ativo =
    SECOES.find((secao) => rota === secao || rota.startsWith(`${secao}/`)) ??
    null;

  return (
    <div className="flex flex-1 flex-col">
      {/* O cabecalho vale para todas as telas de dentro, inclusive o simulador
          — que ja foi tela cheia sem ele. Trocar de secao nao deve trocar a
          moldura. */}
      <Cabecalho nome={nome} notificacoes={notificacoes} />

      {/* Sem recuo a esquerda: nao ha coluna fixa para abrir espaco. O
          `pb-28` de cada pagina reserva a altura da barra do rodape no
          mobile, que é quem navega abaixo do `md`. */}
      <div className="flex flex-1 flex-col">
        {children}
        {ativo && <Navegacao ativo={ativo} />}
      </div>
    </div>
  );
}
