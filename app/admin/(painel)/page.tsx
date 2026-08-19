import Link from "next/link";
import {
  investidoresComContrato,
  serieDoInvestidor,
} from "@/lib/admin/investidor";
import {
  montarPainel,
  type PainelDoAdmin,
  type ResumoDeModalidade,
} from "@/lib/admin/painel";
import { dataDeReferencia, type Modalidade } from "@/lib/portal/dados";
import {
  formatarCompetencia,
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { IconeSetaDireita } from "@/app/(app)/portal/_componentes/icones";
import { CabecalhoDaSecao } from "./_componentes/cabecalho";
import { SeletorDeInvestidor } from "./_componentes/seletor-investidor";
import {
  BarraDeModalidades,
  COR_DA_MODALIDADE,
  GraficoDaCaptacao,
  GraficoDeObras,
  GraficoDeRendimento,
  GraficoDoCaptado,
  GraficoDoInvestidor,
} from "./_componentes/graficos";

// Os numeros da carteira, sempre do banco — nada de cache entre visitas.
export const dynamic = "force-dynamic";

/**
 * A tela inicial do painel: quanto foi captado, onde esta e quanto sai por mes.
 *
 * Ela era a lista de tabelas em cartoes, com a contagem de linhas de cada uma —
 * a mesma coluna da esquerda, repetida em outro formato. "11 contratos" nao
 * responde nenhuma pergunta de quem administra; a navegacao ja esta na coluna, e
 * o que faltava era o dinheiro.
 *
 * **A proporcao é outra, e de proposito.** O portal do investidor é uma pilha de
 * cartoes altos, com elevacao em cada um, feita para o polegar numa tela de
 * telefone: ali cada cartao é uma noticia, e o espaco em volta é o que a deixa
 * respirar. Aqui é o contrario — sao muitos numeros de uma vez, numa tela larga
 * de computador, e o que se faz é comparar. Entao: faixa larga e baixa em cima,
 * filete de 1px em vez de sombra, raio menor, tabela onde o portal usaria
 * cartao. Uma parede de cartoes flutuantes com trinta numeros dentro nao é um
 * painel, é um mural.
 */

/** Como cada modalidade se apresenta. O banco guarda `mensal` e `final`. */
const MODALIDADES = {
  mensal: {
    nome: "Retorno mensal",
    apoio: "Crédito na conta todo dia 17.",
    /* O destino do valor mensal muda com a modalidade, e a conta é a mesma: num
       caso o dinheiro sai do caixa, no outro ele fica devendo. Sem esta
       distincao a coluna "Por mes" somaria desembolso com provisao. */
    destino: "Sai do caixa",
    saiDoCaixa: true,
  },
  final: {
    nome: "Retorno no final",
    apoio: "Retido no saldo até o resgate.",
    destino: "Retido",
    saiDoCaixa: false,
  },
} as const;

/** Só as duas modalidades entram; o resto da URL cai no padrao. */
function modalidadeDaUrl(bruto?: string): Modalidade {
  return bruto === "final" ? "final" : "mensal";
}

export default async function AdminPage({
  searchParams,
}: {
  /** `i` = investidor, `m` = modalidade. Ver `SeletorDeInvestidor`. */
  searchParams: Promise<{ i?: string; m?: string }>;
}) {
  const { i, m } = await searchParams;
  const hoje = await dataDeReferencia();

  const [painel, investidores] = await Promise.all([
    montarPainel(hoje),
    investidoresComContrato(),
  ]);

  const modalidade = modalidadeDaUrl(m);
  /*
   * O id da URL só vale se for de alguem que tem contrato: sem esta conferencia,
   * um id inventado iria direto para a consulta. Sem escolha, abre no primeiro
   * da lista — bloco vazio esperando um clique nao ensina nada.
   */
  const escolhido =
    investidores.find((investidor) => investidor.id === i)?.id ??
    investidores[0]?.id;

  const serie = escolhido
    ? await serieDoInvestidor(escolhido, modalidade, hoje)
    : null;

  if (painel.quantosContratos === 0) {
    return (
      <>
        <CabecalhoDaSecao titulo="Painel" />
        <p className="mt-6 animate-surgir rounded-xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-neutral-500">
          Nenhum contrato cadastrado ainda. Os números aparecem aqui assim que o
          primeiro for lançado em{" "}
          <Link
            href="/admin/contratos"
            className="font-semibold text-marinho underline-offset-2 hover:underline"
          >
            Contratos
          </Link>
          .
        </p>
      </>
    );
  }

  /* Só o `mensal` sai de caixa. Somar o `final` aqui daria um desembolso mensal
     que nao existe: naquela modalidade o resultado fica retido no saldo. */
  const saiPorMes = painel.modalidades
    .filter((m) => MODALIDADES[m.modalidade].saiDoCaixa)
    .reduce((soma, m) => soma + m.porMes, 0);

  const faltamLancar = painel.ciclo.contratos - painel.ciclo.lancados;

  return (
    <>
      <CabecalhoDaSecao titulo="Painel" />

      {/* A captação abre a tela, e sozinha: ela é a unica pergunta que o painel
          responde com um numero contra outro — quanto entrou de quanto se quer.
          O resto é composição do que ja entrou. */}
      {painel.progresso !== null && (
        <ProgressoDaCaptacao painel={painel} />
      )}

      {/* A faixa: larga, baixa e dividida por filetes. Nao sao quatro cartoes —
          é uma peca só, e os numeros dela se leem numa passada horizontal. */}
      <dl className="mt-4 grid animate-surgir grid-cols-2 divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x">
        <Indicador
          rotulo="Total captado"
          valor={formatarMoeda(painel.totalCaptado)}
          apoio={`${painel.quantosContratos + painel.quantosAditivos} aportes em ${painel.quantosContratos} ${
            painel.quantosContratos === 1 ? "contrato" : "contratos"
          }`}
          destaque
        />
        <Indicador
          rotulo="Sai por mês"
          valor={formatarMoeda(saiPorMes)}
          apoio="Desembolso do ciclo cheio, só o retorno mensal."
        />
        <Indicador
          rotulo="Já pago em créditos"
          valor={formatarMoeda(painel.totalPago)}
          apoio={`${painel.serie.length} ${
            painel.serie.length === 1 ? "mês com crédito" : "meses com crédito"
          }`}
        />
        <Indicador
          rotulo="Investidores"
          valor={String(painel.investidores)}
          apoio={`em ${painel.obras.length} ${
            painel.obras.length === 1 ? "obra" : "obras"
          }`}
        />
      </dl>

      {/* A curva de captacao ocupa a linha inteira: ela é a versao no tempo do
          bloco de cima, e é a unica da tela que se le da esquerda para a
          direita. Espremida ao lado de outra coisa, os meses se encostam. */}
      <div className="escalonar mt-4">
        <Bloco
          titulo="Captação acumulada"
          apoio="Tudo que já entrou, mês a mês. O tracejado é a meta."
        >
          {painel.captacao.length === 0 ? (
            <p className="py-20 text-center text-sm text-neutral-500">
              Nenhum aporte registrado ainda.
            </p>
          ) : (
            <GraficoDaCaptacao
              pontos={painel.captacao}
              meta={painel.metaTotal > 0 ? painel.metaTotal : null}
            />
          )}
        </Bloco>
      </div>

      {/* Os dois cortes do mesmo bolo, lado a lado: de onde o dinheiro veio, e
          sob que regra ele entrou. Separados em blocos distantes, ninguem
          repara que somam o mesmo total. */}
      <div className="escalonar mt-4 grid gap-4 lg:grid-cols-2">
        <Bloco
          titulo="Captado por origem"
          apoio="A entrada de cada contrato mais os aportes feitos depois."
        >
          <GraficoDoCaptado
            fatias={[
              { nome: "Entradas de contrato", valor: painel.entradas },
              { nome: "Aditivos", valor: painel.aditivos },
            ]}
            total={painel.totalCaptado}
          />

          <dl className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200">
            <Linha
              rotulo="Entradas de contrato"
              valor={formatarMoeda(painel.entradas)}
              apoio={`${painel.quantosContratos} ${
                painel.quantosContratos === 1 ? "contrato" : "contratos"
              }`}
            />
            <Linha
              rotulo="Aditivos"
              valor={formatarMoeda(painel.aditivos)}
              apoio={`${painel.quantosAditivos} ${
                painel.quantosAditivos === 1 ? "aporte" : "aportes"
              }`}
            />
          </dl>
        </Bloco>

        <Bloco
          titulo="Captado por modalidade"
          apoio="Quanto do capital rende por mês e quanto rende no resgate."
        >
          {/* As cores sao as mesmas da barra e da tabela de modalidades, logo
              abaixo: a mesma coisa com duas cores em blocos vizinhos lê como
              duas coisas diferentes. */}
          <GraficoDoCaptado
            rotulo="Capital"
            fatias={painel.modalidades.map((m) => ({
              nome: MODALIDADES[m.modalidade].nome,
              valor: m.capital,
            }))}
            cores={painel.modalidades.map((m) => COR_DA_MODALIDADE[m.modalidade])}
            total={painel.totalCaptado}
          />

          <dl className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200">
            {painel.modalidades.map((m) => (
              <Linha
                key={m.modalidade}
                rotulo={MODALIDADES[m.modalidade].nome}
                valor={formatarMoeda(m.capital)}
                apoio={`${m.contratos} ${m.contratos === 1 ? "contrato" : "contratos"}`}
              />
            ))}
          </dl>
        </Bloco>
      </div>

      <div className="escalonar mt-4">
        <Bloco
          titulo="Rendimento por mês"
          apoio="O que saiu do caixa no mensal, e o que ficou devendo no final."
          acessorio={
            /* O estado do ciclo mora aqui, e nao num bloco proprio: "faltam 2"
               só quer dizer alguma coisa ao lado do que ja foi pago. */
            <Link
              href="/admin/recebimentos?lancar=1"
              className="group flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-marinho transition-colors duration-200 hover:bg-indigo-100 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              {faltamLancar > 0
                ? `Faltam ${faltamLancar} de ${painel.ciclo.contratos} em ${formatarData(painel.ciclo.data)}`
                : `Ciclo de ${formatarData(painel.ciclo.data)} lançado`}
              <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          }
        >
          {painel.rendimento.length === 0 ? (
            <p className="py-20 text-center text-sm text-neutral-500">
              Nenhum rendimento apurado ainda.
            </p>
          ) : (
            <>
              <GraficoDeRendimento pontos={painel.rendimento} />

              {/* A legenda diz a diferenca que as cores sozinhas nao dizem: um
                  ja saiu do caixa, o outro ainda vai sair. Sem esta linha, duas
                  barras vizinhas leem como duas parcelas da mesma coisa. */}
              <dl className="mt-4 grid gap-3 border-t border-zinc-200 pt-4 sm:grid-cols-2">
                <LegendaDoRendimento
                  cor={COR_DA_MODALIDADE.mensal}
                  rotulo="Pago no mensal"
                  valor={formatarMoeda(painel.totalPago)}
                  apoio="Crédito que já caiu na conta dos investidores."
                />
                <LegendaDoRendimento
                  cor={COR_DA_MODALIDADE.final}
                  rotulo="Provisionado no final"
                  valor={formatarMoeda(painel.totalProvisionado)}
                  apoio="Retido no saldo, a pagar no resgate."
                />
              </dl>
            </>
          )}
        </Bloco>
      </div>

      {/* Um investidor por vez. É o unico bloco da tela que olha para uma
          pessoa; todos os outros somam a carteira. */}
      {escolhido && (
        <div id="investidor" className="escalonar mt-4 scroll-mt-6">
          <Bloco
            titulo="Contrato do investidor"
            apoio={
              serie
                ? serie.modalidade === "mensal"
                  ? "O crédito de cada ciclo. Cheio o que foi lançado, âmbar a projeção."
                  : "O saldo mês a mês — capital mais o resultado retido até o resgate."
                : undefined
            }
            acessorio={
              <SeletorDeInvestidor
                investidores={investidores}
                selecionado={escolhido}
                modalidade={modalidade}
                destino="/admin"
              />
            }
          >
            {serie ? (
              <>
                <dl className="mb-5 flex flex-wrap gap-x-8 gap-y-3">
                  <Resumo
                    rotulo="Capital"
                    valor={formatarMoeda(serie.capital)}
                    apoio={`${serie.contratos} ${serie.contratos === 1 ? "contrato" : "contratos"}`}
                  />
                  <Resumo
                    rotulo="Participação"
                    valor={formatarPercentual(serie.taxa)}
                    apoio="vigente hoje"
                  />
                  <Resumo
                    rotulo={serie.modalidade === "mensal" ? "Já pago" : "Saldo hoje"}
                    valor={formatarMoeda(serie.ateAgora)}
                    apoio={
                      serie.modalidade === "mensal"
                        ? "créditos lançados"
                        : "capital + retido"
                    }
                  />
                  <Resumo
                    rotulo={
                      serie.modalidade === "mensal" ? "Total no prazo" : "No resgate"
                    }
                    valor={formatarMoeda(serie.aoFim)}
                    apoio={`projetado até ${formatarCompetencia(serie.fimDoPrazo)}`}
                  />
                </dl>

                <GraficoDoInvestidor
                  pontos={serie.pontos}
                  modalidade={serie.modalidade}
                  competenciaAtual={hoje.slice(0, 7)}
                />
              </>
            ) : (
              /* Vazio explicando, e nao grafico de zeros: hoje ninguem tem
                 contrato `final`, e um eixo achatado no zero pareceria defeito
                 em vez de ausencia. */
              <p className="py-16 text-center text-sm text-neutral-500">
                Este investidor não tem contrato{" "}
                <span className="font-semibold text-tinta">
                  {modalidade === "mensal" ? "mensal" : "no final"}
                </span>
                .{" "}
                {modalidade === "final"
                  ? "Nenhum contrato dessa modalidade foi cadastrado ainda."
                  : "Veja a outra modalidade acima."}
              </p>
            )}
          </Bloco>
        </div>
      )}

      <div className="escalonar mt-4 grid gap-4">
        <Bloco
          titulo="Por modalidade de contrato"
          apoio="Quanto há em cada tipo, e quanto ele movimenta num mês cheio."
        >
          <BarraDeModalidades
            fatias={painel.modalidades.map((m) => ({
              nome: MODALIDADES[m.modalidade].nome,
              valor: m.capital,
              cor: COR_DA_MODALIDADE[m.modalidade],
            }))}
          />

          {/* Tabela, e nao cartoes: sao seis numeros por modalidade, e o que se
              faz com eles é comparar coluna por coluna. Em cartoes, "capital"
              de um fica a duas alturas do "capital" do outro. */}
          <div className="-mx-1 mt-5 overflow-x-auto px-1">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left">
                  <Cabeca>Modalidade</Cabeca>
                  <Cabeca numero>Contratos</Cabeca>
                  <Cabeca numero>Investidores</Cabeca>
                  <Cabeca numero>Capital</Cabeca>
                  <Cabeca numero>Participação</Cabeca>
                  <Cabeca numero>Por mês</Cabeca>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {painel.modalidades.map((modalidade) => (
                  <LinhaDaModalidade
                    key={modalidade.modalidade}
                    resumo={modalidade}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Bloco>

        <Bloco
          titulo="Captação por obra"
          apoio="A barra inteira é a meta; a parte cheia é o que já entrou."
          acessorio={
            <span className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full bg-marinho"
                />
                Captado
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full bg-tinta/10"
                />
                Falta
              </span>
            </span>
          }
        >
          <GraficoDeObras obras={painel.obras} />
        </Bloco>
      </div>
    </>
  );
}

/**
 * Quanto já entrou, de quanto se pretende captar.
 *
 * O bloco de abertura do painel. É o unico numero da tela que compara duas
 * grandezas — todos os outros descrevem o que ja aconteceu —, e por isso ganha a
 * barra e o corpo maior.
 *
 * **A meta é dado interno.** Ela nunca sai daqui para o portal: a consulta do
 * investidor monta a ficha da obra a partir de uma lista fixa de colunas, e
 * `meta_captacao` nao esta nela. Ver a nota em `COLUNAS_DA_FICHA`, em
 * `lib/portal/dados.ts`.
 */
function ProgressoDaCaptacao({ painel }: { painel: PainelDoAdmin }) {
  // A barra para em 100% mesmo quando se capta acima da meta: barra passando do
  // trilho lê como defeito de layout. O excedente aparece no percentual, que
  // continua crescendo, e na frase de baixo.
  const largura = Math.min(1, painel.progresso ?? 0) * 100;
  const bateu = painel.faltaCaptar === 0;

  return (
    <section className="mt-6 animate-surgir rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-[0.6875rem] font-semibold tracking-wider text-neutral-400 uppercase">
          Captação
        </h2>
        <p className="text-sm font-bold tabular-nums text-marinho">
          {formatarPercentual(painel.progresso ?? 0, 1)} da meta
        </p>
      </div>

      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-bold tracking-tight tabular-nums text-tinta sm:text-3xl">
          {formatarMoeda(painel.totalCaptado)}
        </span>
        <span className="text-sm text-neutral-500 tabular-nums">
          de {formatarMoeda(painel.metaTotal)}
        </span>
      </p>

      <div
        aria-hidden
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-100"
      >
        <div
          className="h-full rounded-full bg-marinho transition-[width] duration-500 ease-[var(--ease-suave)]"
          style={{ width: `${largura}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        {bateu ? (
          <span className="font-semibold text-verde">Meta atingida.</span>
        ) : (
          <>
            Faltam{" "}
            <span className="font-semibold tabular-nums text-tinta">
              {formatarMoeda(painel.faltaCaptar)}
            </span>{" "}
            para a meta.
          </>
        )}
        {/* A obra sem meta mexe no denominador, e quem le precisa saber disso
            antes de tirar conclusao do percentual. */}
        {painel.obrasSemMeta > 0 && (
          <>
            {" "}
            {painel.obrasSemMeta === 1
              ? "Uma obra ainda não tem meta definida e está fora desta conta."
              : `${painel.obrasSemMeta} obras ainda não têm meta definida e estão fora desta conta.`}
          </>
        )}
      </p>
    </section>
  );
}

/**
 * Uma celula da faixa de indicadores.
 *
 * O `destaque` é só do total captado: ele responde por todos os outros, e sem
 * diferenca de corpo a faixa lê como quatro numeros de igual peso.
 */
function Indicador({
  rotulo,
  valor,
  apoio,
  destaque,
}: {
  rotulo: string;
  valor: string;
  apoio: string;
  destaque?: boolean;
}) {
  return (
    // O filete horizontal fecha a primeira fila no telefone, onde a grade cai
    // para duas colunas e o `divide-x` do container nao alcanca.
    <div className="border-b border-zinc-200 p-4 last:border-b-0 sm:border-b-0 sm:p-5">
      <dt className="text-[0.6875rem] font-semibold tracking-wider text-neutral-400 uppercase">
        {rotulo}
      </dt>
      <dd
        className={`mt-1.5 font-bold tracking-tight tabular-nums text-tinta ${
          destaque ? "text-2xl" : "text-lg"
        }`}
      >
        {valor}
      </dd>
      <p className="mt-1 text-xs leading-snug text-neutral-500">{apoio}</p>
    </div>
  );
}

/**
 * A moldura de cada bloco: filete de 1px e raio pequeno, sem elevacao.
 *
 * O cartao do portal tem sombra em duas camadas — ele flutua sobre o fundo,
 * porque ali cada um é uma coisa a ser notada. Aqui sao seis blocos na mesma
 * tela; seis sombras seriam seis pedidos de atencao simultaneos, e o filete
 * separa igual sem pedir nada.
 */
function Bloco({
  titulo,
  apoio,
  acessorio,
  className = "",
  children,
}: {
  titulo: string;
  apoio?: string;
  acessorio?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 ${className}`}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-sm font-bold tracking-tight text-tinta">
            {titulo}
          </h2>
          {apoio && (
            <p className="mt-0.5 text-xs text-neutral-500">{apoio}</p>
          )}
        </div>
        {acessorio}
      </header>
      {children}
    </section>
  );
}

/**
 * Uma metade da legenda do rendimento.
 *
 * Existe porque a diferenca entre as duas barras nao é de grandeza, é de
 * natureza: uma ja saiu do caixa e a outra ainda vai sair. Cor sozinha nao diz
 * isso, e o total ao lado é o que ancora cada barra num numero.
 */
function LegendaDoRendimento({
  cor,
  rotulo,
  valor,
  apoio,
}: {
  cor: string;
  rotulo: string;
  valor: string;
  apoio: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: cor }}
      />
      <div className="min-w-0">
        <dt className="text-xs text-neutral-500">{rotulo}</dt>
        <dd className="mt-0.5 text-sm font-bold tabular-nums text-tinta">
          {valor}
        </dd>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
          {apoio}
        </p>
      </div>
    </div>
  );
}

/**
 * Um numero da faixa que abre o bloco do investidor.
 *
 * Em linha, e nao na grade dividida da faixa do topo: sao quatro numeros sobre
 * uma pessoa só, e eles se leem como uma frase — capital, participacao, o que ja
 * saiu, o que ainda sai.
 */
function Resumo({
  rotulo,
  valor,
  apoio,
}: {
  rotulo: string;
  valor: string;
  apoio: string;
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold tracking-wider text-neutral-400 uppercase">
        {rotulo}
      </dt>
      <dd className="mt-1 text-lg font-bold tabular-nums text-tinta">{valor}</dd>
      <p className="text-xs text-neutral-400">{apoio}</p>
    </div>
  );
}

/** Uma linha de rotulo e valor, para o detalhe embaixo da rosca. */
function Linha({
  rotulo,
  valor,
  apoio,
}: {
  rotulo: string;
  valor: string;
  apoio: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs text-neutral-500">
        {rotulo}
        <span className="ml-1.5 text-neutral-400">· {apoio}</span>
      </dt>
      <dd className="text-sm font-semibold tabular-nums text-tinta">{valor}</dd>
    </div>
  );
}

function Cabeca({
  children,
  numero,
}: {
  children: React.ReactNode;
  numero?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`pb-2 text-[0.6875rem] font-semibold tracking-wider text-neutral-400 uppercase ${
        numero ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function LinhaDaModalidade({ resumo }: { resumo: ResumoDeModalidade }) {
  const texto = MODALIDADES[resumo.modalidade];

  return (
    <tr>
      <td className="py-3 pr-4">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: COR_DA_MODALIDADE[resumo.modalidade] }}
          />
          <span className="font-semibold text-tinta">{texto.nome}</span>
        </span>
        <span className="mt-0.5 block pl-4 text-xs text-neutral-500">
          {texto.apoio}
        </span>
      </td>

      <Celula>{resumo.contratos}</Celula>
      <Celula>{resumo.investidores}</Celula>
      <Celula forte>{formatarMoeda(resumo.capital)}</Celula>
      <Celula>
        {formatarPercentual(resumo.taxaMedia)}
        {/* Ponderada pelo capital, e é preciso dizer: com dois contratos de
            tamanhos diferentes ela nao é a media das duas taxas, e quem confere
            a conta a mao chegaria em outro numero. */}
        <span className="mt-0.5 block text-xs font-normal text-neutral-400">
          média ponderada
        </span>
      </Celula>
      <Celula forte>
        {formatarMoeda(resumo.porMes)}
        <span className="mt-0.5 block text-xs font-normal text-neutral-400">
          {texto.destino}
        </span>
      </Celula>
    </tr>
  );
}

function Celula({
  children,
  forte,
}: {
  children: React.ReactNode;
  forte?: boolean;
}) {
  return (
    <td
      className={`py-3 pl-4 text-right align-top tabular-nums ${
        forte ? "font-bold text-tinta" : "font-medium text-neutral-600"
      }`}
    >
      {children}
    </td>
  );
}
