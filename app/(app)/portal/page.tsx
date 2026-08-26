import type { Metadata } from "next";
import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { apurarPosicao, montarHistorico } from "@/lib/portal/calculo";
import {
  dataDeReferencia,
  getAportes,
  getContratosParaSimular,
  getEmpreendimentos,
  getObra,
  getRecebimentosLancados,
} from "@/lib/portal/dados";
import { formatarMoeda, formatarPercentual } from "@/lib/portal/formato";
import { montarRecebimentos } from "@/lib/portal/recebimentos";
import { AbaAporte } from "./_componentes/aba-aporte";
import { CartaoDeNotificacoes } from "./_componentes/cartao-notificacoes";
import { CartaoSaldo } from "./_componentes/cartao-saldo";
import { BotaoDocumentos } from "@/app/(app)/obras/_componentes/botao-documentos";
import { Documentos } from "@/app/(app)/obras/_componentes/documentos";
import { FichaObra } from "@/app/(app)/obras/_componentes/ficha-obra";
import { HeroObra } from "@/app/(app)/obras/_componentes/hero-obra";
import { QuadrosDaObra } from "@/app/(app)/obras/_componentes/quadros-obra";
import { Simulador } from "@/app/(app)/simulador/_componentes/simulador";
import { IconeSetaDireita } from "./_componentes/icones";
import { SeletorDeEmpreendimento } from "./_componentes/seletor-empreendimento";

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
    paraSimular,
  ] = await Promise.all([
    searchParams,
    dataDeReferencia(),
    getAportes(sessao.id),
    /*
     * A versao completa, e nao a `Basicos`: a coluna da direita mostra as
     * fotos, e elas vem daqui ja com URL assinada. O seletor de empreendimento
     * continua servido pelas mesmas linhas — id e nome estao nelas.
     */
    getEmpreendimentos(sessao.id),
    getRecebimentosLancados(sessao.id),
    /*
     * O simulador projeta sobre o contrato da propria pessoa — capital e
     * participacao. É a mesma consulta que a rota /simulador faz.
     */
    getContratosParaSimular(sessao.id),
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

  /*
   * A obra da coluna da direita: a selecionada no topo, ou a primeira.
   *
   * **É buscada tambem no celular, onde a coluna nao aparece.** O servidor
   * nao sabe a largura da tela — descobrir isso exigiria adiar a consulta
   * para depois da hidratacao, e ai a coluna chegaria piscando. O custo é
   * uma ida ao banco e a assinatura das fotos; a alternativa custava a tela
   * montando em duas etapas na frente de quem usa desktop, que é justamente
   * quem esta sendo servido aqui.
   */
  const idDaObra = selecionado ?? empreendimentos[0]?.id;
  const obra = idDaObra ? await getObra(sessao.id, idDaObra) : null;

  // pb reserva a altura da barra do rodape no mobile — sem isso o ultimo cartao fica sob ela.
  return (
    /*
     * Largura inteira, e nao mais uma coluna de 64rem centrada.
     *
     * O `mx-auto max-w-5xl` prendia tudo no meio: com a barra lateral fora, a
     * tela larga passou a ter espaco de verdade, e mante-lo faria sobrar
     * margem dos dois lados para nada. O `px` continua — sem ele o texto
     * encosta na borda do monitor —, e o cabecalho perdeu o `max-w` dele no
     * mesmo movimento, entao as duas faixas comecam e terminam juntas.
     */
    /*
     * O mesmo cinza de `/obras` e `/simulador`, agora na tela inteira.
     *
     * Ele ja era a superficie das outras duas secoes, e aqui aparecia so em
     * dois retangulos no desktop — a coluna da obra e o bloco do simulador —,
     * justamente para lembrar de onde aquele conteudo vinha. Com a carteira
     * tambem em cinza, as tres secoes do app passam a ter o mesmo chao, e o
     * branco volta a significar uma coisa so: cartao.
     */
    <main className="w-full flex-1 bg-[#F7F8FA] px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
      {/*
       * Primeiro no documento, mas nao no fluxo: o cartao é `fixed` e paira
       * sobre a tela. Fica aqui em cima porque esta ordem é a que o leitor de
       * tela segue, e o convite deve ser a primeira coisa anunciada para quem
       * ainda nao decidiu. Ele mesmo se esconde depois — ver o componente.
       */}
      <CartaoDeNotificacoes />

      {/*
       * **No desktop o app inteiro cabe nesta tela.**
       *
       * A esquerda a carteira — saldo, grafico, historico. A direita a obra
       * inteira: fotos, ficha e os projetos. Abaixo das duas, o simulador.
       * Sao as tres secoes que existiam em rotas separadas, e no desktop nao
       * ha motivo para elas se revezarem: a tela comporta as tres, e trocar
       * de rota so escondia duas para mostrar uma.
       *
       * **Abaixo do `lg` nada disso vale.** A coluna da direita e o simulador
       * se escondem, e `/obras` e `/simulador` seguem sendo rotas de verdade,
       * alcancadas pela barra do rodape. Empilhar tudo num celular daria uma
       * pagina de rolagem infinita onde hoje ha tres telas curtas.
       *
       * `items-start` para as colunas nao se esticarem ate a altura da mais
       * alta — a mais curta ficaria com espaco morto no pé.
       */}
      <div className="lg:flex lg:items-start lg:gap-6">
        <div className="min-w-0 lg:flex-1">
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
            className="group mt-7 mb-7 flex w-full items-center justify-center gap-1.5 rounded-full bg-ouro lg:hidden px-4 py-2 text-xs font-semibold text-tinta shadow-[0_10px_30px_-12px_rgba(247,188,5,0.55)] transition-all duration-200 ease-[var(--ease-suave)] hover:scale-[1.02] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ouro focus-visible:ring-offset-2 active:scale-[0.98] active:brightness-90 sm:w-auto"
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
             * O simulador fecha a coluna da carteira.
             *
             * Ele estava embaixo das duas colunas, na largura inteira, e trocou
             * de lugar com as sugestoes de leitura, que sairam. O lugar faz
             * sentido: ele simula **sobre o contrato desta pessoa**, e a coluna
             * onde isso mora é justamente esta — o saldo em cima, o rendimento
             * no meio, e no pé a pergunta que segue de tudo isso.
             *
             * O `bg-[#F7F8FA]` saiu daqui: a tela inteira passou a ser cinza,
             * e a classe pintava a mesma cor do proprio fundo. O `p-4` fica —
             * era ele, e nao a cor, que dava o respiro em volta do simulador.
             */}
            {paraSimular.length > 0 && (
              <section className="mt-10 hidden rounded-[20px] p-4 md:rounded-lg lg:block">
                <div className="mb-4 text-center">
                  <h2 className="sr-only">Simulador</h2>
                  <p className="mx-auto max-w-xs text-[0.8125rem] leading-relaxed text-balance text-neutral-500">
                    Veja como um novo aporte impacta sua renda mensal.
                  </p>
                </div>
                <Simulador contratos={paraSimular} />
              </section>
            )}
          </div>
        </div>

        {/*
         * A obra, na largura de uma coluna.
         *
         * Sao as mesmas pecas de `/obras`, na mesma ordem — fotos, ficha,
         * projetos —, com uma troca: os documentos, que la vivem num botao
         * flutuante, aqui viram um cartao no fim da pilha. Um botao `fixed`
         * pairando sobre um painel de duas colunas nao pertence a coluna
         * nenhuma.
         *
         * **O fundo cinza vem junto.** Em `/obras` ele nao é enfeite: aquela
         * tela é uma pilha de cartoes brancos, e o cinza é o que faz cada um
         * deles ler como superficie. Sem ele, aqui, os cartoes caiam sobre o
         * branco da pagina e a pilha virava uma mancha só.
         *
         * Largura fixa e nao fracao — a ficha e os quadros tem largura minima
         * propria —, mas crescendo por degrau: em 1024 uma coluna de 34rem
         * deixava menos de 400px para o saldo e o grafico, que sao o assunto
         * principal da tela.
         */}
        {obra && (
          /*
           * Sem `bg-[#F7F8FA]`, pelo mesmo motivo do bloco do simulador: a cor
           * agora vem da pagina.
           *
           * **O recuo de cima é o alinhamento com o cartao de saldo**, e por
           * isso ele nao é `p-4` como os outros tres lados. As duas colunas
           * comecam na mesma linha (`lg:items-start`), mas o que ha no topo de
           * cada uma é diferente:
           *
           * - sem seletor de empreendimento, a esquerda abre direto no cartao
           *   de saldo. Qualquer recuo aqui em cima jogaria a foto para baixo
           *   dele — daí `lg:pt-0`;
           * - com seletor, a esquerda abre 52px mais baixo. Sao os 32px da
           *   pastilha (`py-1.5` sobre `text-sm`), mais 4px do `pb-1` da fila,
           *   mais os 16px do `mb-4` do bloco. `lg:pt-13` é exatamente esse
           *   valor.
           *
           * O numero é copia de uma medida que mora em `SeletorDeEmpreendimento`
           * — se o desenho daquele bloco mudar, este recuo precisa mudar junto,
           * e nao ha compilador que cobre isso. Hoje o caso nem se apresenta:
           * ha um empreendimento no banco, e o seletor so aparece a partir de
           * dois.
           */
          <div
            className={`hidden rounded-[20px] px-4 pb-4 md:rounded-lg lg:block lg:w-[25rem] lg:shrink-0 xl:w-[31rem] 2xl:w-[36rem] ${
              empreendimentos.length > 1 ? "lg:pt-13" : "lg:pt-0"
            }`}
          >
            <div className="escalonar space-y-5">
              <section className="sombra-cartao overflow-hidden rounded-[20px] md:rounded-lg bg-white">
                <HeroObra obra={obra} />
              </section>

              <FichaObra obra={obra} />

              <QuadrosDaObra etapas={obra.etapas} />

              {/*
               * Os papeis no botao flutuante, a mesma peca de `/obras`.
               *
               * Eram um cartao no pé desta coluna, e viraram botao: papel de
               * obra é consulta pontual, e nao leitura corrida — como cartao
               * ele fechava a coluna com uma lista que quase ninguem abre,
               * empurrando para baixo o que se le de verdade.
               *
               * **Ele é `fixed`, mas nao vaza para o celular.** O pai é
               * `hidden lg:block`, e `display: none` leva os descendentes
               * junto — inclusive os posicionados. Abaixo do `lg` quem mostra
               * os papeis é o botao da propria `/obras`, e nunca os dois.
               *
               * O componente ja se apaga sozinho quando nao ha papel nenhum
               * (`quantos === 0`), entao aqui nao ha condicao a escrever.
               */}
              <BotaoDocumentos quantos={obra.documentos.length}>
                <Documentos documentos={obra.documentos} />
              </BotaoDocumentos>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
