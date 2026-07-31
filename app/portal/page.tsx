import type { Metadata } from "next";
import { exigirSessao } from "@/lib/auth";
import { apurarPosicao, montarHistorico } from "@/lib/portal/calculo";
import {
  dataDeReferencia,
  getAportes,
  getEmpreendimentos,
  getRecebimentosLancados,
} from "@/lib/portal/dados";
import { formatarMoeda, formatarPercentual } from "@/lib/portal/formato";
import { getNotificacoes } from "@/lib/portal/notificacoes";
import { montarRecebimentos } from "@/lib/portal/recebimentos";
import { AbaAporte } from "./_componentes/aba-aporte";
import { AbaEmpreendimentos } from "./_componentes/aba-empreendimentos";
import { Abas } from "./_componentes/abas";
import { Cabecalho } from "./_componentes/cabecalho";
import { CartaoSaldo } from "./_componentes/cartao-saldo";
import { IconeInvestimento, IconeTransparencia } from "./_componentes/icones";
import { SeletorDeEmpreendimento } from "./_componentes/seletor-empreendimento";
import { Sugestoes } from "./_componentes/sugestoes";

export const metadata: Metadata = {
  title: "Meus aportes · Portal do Investidor Ari",
};

// Tudo vem do banco a cada visita, e a sessao decide de quem sao os dados.
export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  // Nao confio so no `proxy.ts`: a guarda tambem vive aqui, junto de quem le os
  // dados. Ver o comentario em `exigirSessao`.
  const sessao = await exigirSessao("/portal");

  const [
    { e: escolhido },
    referencia,
    todosOsAportes,
    empreendimentos,
    todosOsLancados,
    notificacoes,
  ] = await Promise.all([
    searchParams,
    dataDeReferencia(),
    getAportes(sessao.id),
    getEmpreendimentos(sessao.id),
    getRecebimentosLancados(sessao.id),
    getNotificacoes(sessao.id),
  ]);

  /*
   * O filtro sai da URL, e por isso é validado contra os empreendimentos desta
   * pessoa: id de outro investidor, ou inventado, simplesmente nao é encontrado
   * e a tela volta ao consolidado — nunca mostra dado alheio nem quebra.
   */
  const selecionado =
    empreendimentos.find((emp) => emp.id === escolhido)?.id ?? null;

  const aportes = selecionado
    ? todosOsAportes.filter((a) => a.empreendimentoId === selecionado)
    : todosOsAportes;

  /*
   * Credito sem empreendimento é *geral*: entra no consolidado e fica de fora
   * do filtro, porque nao ha como atribui-lo. Os lancamentos anteriores a esta
   * coluna nasceram assim.
   */
  const lancados = selecionado
    ? todosOsLancados.filter((l) => l.empreendimentoId === selecionado)
    : todosOsLancados;

  const posicao = apurarPosicao(aportes, referencia);
  const historico = montarHistorico(aportes);
  // Os lancados mandam no passado; o calculo assume da data de corte em diante.
  const recebimentos = montarRecebimentos(aportes, referencia, lancados);

  /*
   * O resultado da pessoa vem de dois regimes que nao se somam sozinhos: o que
   * fica retido no saldo (modalidade `final`) e o que é creditado todo dia 17
   * (modalidade `mensal`). Cada um é apurado no seu proprio modulo; aqui eles se
   * juntam uma unica vez, para o cartao de cima mostrar um numero so.
   */
  const rendimento =
    (posicao?.rendimentoAcumulado ?? 0) + recebimentos.totalPago;
  const rentabilidade =
    posicao && posicao.totalAportado > 0
      ? rendimento / posicao.totalAportado
      : 0;

  return (
    <div className="flex flex-1 flex-col">
      <Cabecalho nome={sessao.nome} notificacoes={notificacoes} />

      {/* pb reserva a altura da barra fixa do rodape, que agora existe em
          qualquer largura — sem isso o ultimo cartao fica sob ela. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 sm:px-8">
        <Abas
          abas={[
            {
              id: "investimento",
              rotulo: "Meus aportes",
              icone: <IconeInvestimento className="h-4 w-4 shrink-0" />,
              /*
               * O saldo e o seletor moram dentro desta aba, e nao acima das
               * duas: os dois falam de dinheiro aportado, que é assunto daqui.
               * Na aba de empreendimentos eles seriam ruido — e o seletor,
               * pior: sugeriria filtrar uma lista que nao é filtrada.
               */
              conteudo: (
                <>
                  {/* Com um empreendimento só nao ha escolha a fazer, e o
                      seletor seria uma linha inteira para dizer o obvio. */}
                  {empreendimentos.length > 1 && (
                    <SeletorDeEmpreendimento
                      empreendimentos={empreendimentos.map(({ id, nome }) => ({
                        id,
                        nome,
                      }))}
                      selecionado={selecionado}
                    />
                  )}

                  <CartaoSaldo
                    saldo={formatarMoeda(posicao?.saldoAtual ?? 0)}
                    // `null` quando a carteira esta vazia: sem aporte nao ha
                    // rendimento, participacao nem periodo para contar, e o
                    // cartao troca de texto.
                    resultado={
                      posicao && {
                        participacao: formatarPercentual(
                          posicao.participacaoMensal,
                        ),
                        rendimento: `+${formatarMoeda(rendimento)}`,
                        rentabilidade: formatarPercentual(rentabilidade),
                        // A serie comeca no mes do primeiro aporte, entao o
                        // tamanho dela é o numero de meses que a posicao cobre.
                        meses: posicao.serie.length,
                        subiu: rendimento >= 0,
                      }
                    }
                  />

                  <div className="mt-6">
                    <AbaAporte
                      historico={historico}
                      recebimentos={recebimentos}
                      // `AAAA-MM` do fuso do banco, e nao do navegador: é o
                      // mesmo relogio que decide os creditos.
                      competenciaAtual={referencia.slice(0, 7)}
                      // O filtro viaja junto: a tela cheia mostra o historico
                      // do mesmo empreendimento que esta selecionado aqui.
                      verTudoHref={
                        selecionado
                          ? `/portal/historico?e=${selecionado}`
                          : "/portal/historico"
                      }
                    />

                    {/* Server Component dentro do conteudo de uma aba que é
                        cliente: ele é renderizado aqui e viaja pronto, entao a
                        chave da Airticles nao encosta no navegador. */}
                    <Sugestoes />
                  </div>
                </>
              ),
            },
            {
              id: "obras",
              rotulo: "Obras",
              icone: <IconeTransparencia className="h-4 w-4 shrink-0" />,
              conteudo: (
                <AbaEmpreendimentos empreendimentos={empreendimentos} />
              ),
            },
          ]}
        />
      </main>
    </div>
  );
}
