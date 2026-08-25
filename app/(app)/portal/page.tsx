import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { exigirSessao } from "@/lib/auth";
import { apurarPosicao, montarHistorico } from "@/lib/portal/calculo";
import {
  dataDeReferencia,
  getAportes,
  getEmpreendimentosBasicos,
  getRecebimentosLancados,
} from "@/lib/portal/dados";
import { formatarMoeda, formatarPercentual } from "@/lib/portal/formato";
import { montarRecebimentos } from "@/lib/portal/recebimentos";
import { AbaAporte } from "./_componentes/aba-aporte";
import { CartaoDeNotificacoes } from "./_componentes/cartao-notificacoes";
import { CartaoSaldo } from "./_componentes/cartao-saldo";
import { IconeSetaDireita } from "./_componentes/icones";
import { SeletorDeEmpreendimento } from "./_componentes/seletor-empreendimento";
import { Sugestoes } from "./_componentes/sugestoes";

export const metadata: Metadata = {
  title: "Meus aportes · Amaan Invest",
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
  ] = await Promise.all([
    searchParams,
    dataDeReferencia(),
    getAportes(sessao.id),
    getEmpreendimentosBasicos(sessao.id),
    getRecebimentosLancados(sessao.id),
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
  // So o que foi lancado no /admin: o portal nao projeta credito nenhum.
  const recebimentos = montarRecebimentos(referencia, lancados);

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

  // pb reserva a altura da barra do rodape no mobile — sem isso o ultimo cartao fica sob ela.
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
      {/*
       * Primeiro no documento, mas nao no fluxo: o cartao é `fixed` e paira
       * sobre a tela. Fica aqui em cima porque esta ordem é a que o leitor de
       * tela segue, e o convite deve ser a primeira coisa anunciada para quem
       * ainda nao decidiu. Ele mesmo se esconde depois — ver o componente.
       */}
      <CartaoDeNotificacoes />

      {/* Com um empreendimento só nao ha escolha a fazer, e o seletor seria
            uma linha inteira para dizer o obvio. */}
      {empreendimentos.length > 1 && (
        <SeletorDeEmpreendimento
          empreendimentos={empreendimentos}
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

      {/* O convite para simular, logo abaixo do saldo: é o momento em que a
            pessoa acabou de ver quanto tem e quanto rendeu, e "e se eu
            aportasse mais" é a pergunta natural que segue. Em ouro porque é
            oferta, e nao a leitura do cartao.
            `mt`/`mb` iguais, e nao o `mt-18` do bloco seguinte: o botao fica
            centralizado entre o cartao de saldo e o "Amaan Invest", nao mais colado
            num dos dois.
            Ouro cheio, sem contorno: rebaixado com opacidade ele perdia a
            presenca de convite e passava a ler como etiqueta. */}
      <Link
        href="/simulador"
        className="group mt-7 mb-7 flex w-full items-center justify-center gap-1.5 rounded-full bg-ouro px-4 py-2 text-xs font-semibold text-tinta shadow-[0_10px_30px_-12px_rgba(247,188,5,0.55)] transition-all duration-200 ease-[var(--ease-suave)] hover:scale-[1.02] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ouro focus-visible:ring-offset-2 active:scale-[0.98] active:brightness-90 sm:w-auto"
      >
        Simule um novo aporte
        <IconeSetaDireita className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>

      <div>
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

        {/*
         * Server Component dentro de um componente de cliente: ele é
         * renderizado aqui e viaja pronto, entao a chave da Airticles nao
         * encosta no navegador.
         *
         * Em `Suspense` porque ele fala com um servico de fora: sem isto, a
         * pagina inteira esperava a Airticles responder — era ela que fazia a
         * troca de aba demorar mais de um segundo. Agora o portal aparece na
         * hora e os artigos entram depois, sozinhos.
         */}
        <Suspense fallback={<EsqueletoDeSugestoes />}>
          <Sugestoes />
        </Suspense>
      </div>
    </main>
  );
}

/** O lugar dos tres cartoes de artigo, enquanto a Airticles responde. */
function EsqueletoDeSugestoes() {
  return (
    <div aria-hidden className="mt-16">
      <div className="mb-5 h-5 w-24 animate-pulse rounded bg-tinta/[0.06]" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="aspect-3/2 animate-pulse rounded-2xl bg-tinta/[0.06]"
          />
        ))}
      </div>
    </div>
  );
}
