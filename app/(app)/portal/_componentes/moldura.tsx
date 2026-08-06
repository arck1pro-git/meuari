"use client";

import { usePathname } from "next/navigation";
import type { Notificacao } from "@/lib/portal/notificacoes";
import { BarraLateral } from "./barra-lateral";
import { Cabecalho } from "./cabecalho";
import { Navegacao } from "./navegacao";
import { RegistrarSW } from "./registrar-sw";

/**
 * A moldura das telas de quem entrou: navegacao em volta, conteudo no meio.
 *
 * Duas formas, uma por tamanho de tela, e nao a mesma peca reposicionada:
 *
 * - **mobile** — cabecalho colado no topo e barra de secoes no rodape.
 * - **desktop** — uma coluna fixa a esquerda com tudo dentro: retrato, secoes,
 *   simulador e sino. Sem cabecalho e sem rodape.
 *
 * A troca é so de CSS (`md:hidden` de um lado, `hidden md:flex` do outro), e nao
 * de JavaScript medindo a janela: medida no cliente muda depois da hidratacao, e
 * a tela piscaria a forma errada antes de acertar.
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
      <RegistrarSW />
      {/* O cabecalho vale para todas as telas de dentro, inclusive o simulador
          — que ja foi tela cheia sem ele. Trocar de secao nao deve trocar a
          moldura. */}
      <Cabecalho nome={nome} notificacoes={notificacoes} />
      <BarraLateral nome={nome} notificacoes={notificacoes} ativo={ativo} />

      {/* `md:pl-60` abre o espaco da coluna fixa. O `pb-28` de cada pagina
          reserva a altura da barra do rodape no mobile. */}
      <div className="flex flex-1 flex-col md:pl-60">
        {children}
        {ativo && <Navegacao ativo={ativo} />}
      </div>
    </div>
  );
}
