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
import { CartaoDeNotificacoes } from "./_componentes/cartao-notificacoes";
import { CartaoSaldo } from "./_componentes/cartao-saldo";
import { Moldura } from "./_componentes/moldura";
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
    <Moldura nome={sessao.nome} notificacoes={notificacoes} ativo="/portal">
      {/* pb reserva a altura da barra do rodape no mobile — sem isso o ultimo
          cartao fica sob ela. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
        {/* Primeira coisa da tela para quem ainda nao decidiu sobre avisos.
            Ele mesmo se esconde depois — ver o componente. */}
        <CartaoDeNotificacoes />

        {/* Com um empreendimento só nao ha escolha a fazer, e o seletor seria
            uma linha inteira para dizer o obvio. */}
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
          // `null` quando a carteira esta vazia: sem aporte nao ha rendimento,
          // participacao nem periodo para contar, e o cartao troca de texto.
          resultado={
            posicao && {
              participacao: formatarPercentual(posicao.participacaoMensal),
              rendimento: `+${formatarMoeda(rendimento)}`,
              rentabilidade: formatarPercentual(rentabilidade),
              // A serie comeca no mes do primeiro aporte, entao o tamanho dela
              // é o numero de meses que a posicao cobre.
              meses: posicao.serie.length,
              subiu: rendimento >= 0,
            }
          }
        />

        {/* 72px entre o cartao de saldo e o Meu ARI. Eram 24; passaram por 34 e
            56 ate aqui — a distancia separa dois assuntos, e nao dois cartoes
            do mesmo bloco. */}
        <div className="mt-18">
          <AbaAporte
            historico={historico}
            recebimentos={recebimentos}
            /*
             * O grafico do cartao segue a modalidade do que a pessoa tem em
             * mãos. No `final` o resultado fica retido e o saldo sobe: o que
             * conta é o progresso, mes a mes. No `mensal` ele cai na conta todo
             * dia 17, e ai o que conta é o credito de cada mes.
             *
             * A carteira precisa ser inteira `final` para trocar de grafico —
             * com um aporte `mensal` no meio, a serie de progresso deixaria de
             * fora justamente o dinheiro que saiu, e o grafico mentiria por
             * omissao.
             */
            serie={
              aportes.length > 0 &&
              aportes.every((a) => a.modalidade === "final") &&
              posicao
                ? posicao.serie
                : null
            }
            // `AAAA-MM` do fuso do banco, e nao do navegador: é o mesmo
            // relogio que decide os creditos.
            competenciaAtual={referencia.slice(0, 7)}
            // O filtro viaja junto: a tela cheia mostra o historico do mesmo
            // empreendimento que esta selecionado aqui.
            verTudoHref={
              selecionado
                ? `/portal/historico?e=${selecionado}`
                : "/portal/historico"
            }
          />

          {/* Server Component dentro de um componente de cliente: ele é
              renderizado aqui e viaja pronto, entao a chave da Airticles nao
              encosta no navegador. */}
          <Sugestoes />
        </div>
      </main>
    </Moldura>
  );
}
