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
 * - **mobile** — cabecalho colado no topo e barra de secoes no rodape, como
 *   sempre foi. Nada aqui mudou.
 * - **desktop** — uma coluna fixa a esquerda com tudo dentro: retrato, secoes,
 *   simulador e sino. Sem cabecalho e sem rodape.
 *
 * A troca é so de CSS (`md:hidden` de um lado, `hidden md:flex` do outro), e nao
 * de JavaScript medindo a janela: medida no cliente muda depois da hidratacao, e
 * a tela piscaria a forma errada antes de acertar.
 */
export function Moldura({
  nome,
  notificacoes,
  ativo = null,
  cabecalho = true,
  children,
}: {
  nome: string;
  notificacoes: Notificacao[];
  /**
   * Qual secao esta aberta. `null` nas telas que nao sao secao — perfil,
   * historico completo, artigo —, e ai o rodape do mobile nao aparece: elas
   * tem "Voltar" proprio, e sempre foi assim.
   */
  ativo?: "/portal" | "/obras" | null;
  /**
   * `false` nas telas que nunca tiveram cabecalho no mobile — o simulador é
   * uma delas. No desktop nao muda nada: la o cabecalho nao existe em tela
   * nenhuma, e quem navega é a coluna da esquerda.
   */
  cabecalho?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <RegistrarSW />
      {cabecalho && <Cabecalho nome={nome} notificacoes={notificacoes} />}
      <BarraLateral nome={nome} notificacoes={notificacoes} ativo={ativo} />

      {/* `md:pl-60` abre o espaco da coluna fixa. O `pb-28` reserva a altura da
          barra do rodape no mobile, e some no desktop, onde ela nao existe. */}
      <div className="flex flex-1 flex-col md:pl-60">
        {children}
        {ativo && <Navegacao ativo={ativo} />}
      </div>
    </div>
  );
}
