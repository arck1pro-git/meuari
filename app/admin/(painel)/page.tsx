import Link from "next/link";
import { Suspense } from "react";
import {
  investidoresComContrato,
  serieDoInvestidor,
} from "@/lib/admin/investidor";
import {
  montarPainel,
  type PainelDoAdmin,
  type ResumoDeModalidade,
} from "@/lib/admin/painel";
import {
  pagamentosMensais,
  type PontoDoPagamento,
} from "@/lib/admin/pagamentos";
import {
  dataDeReferencia,
  type DataISO,
  type Modalidade,
} from "@/lib/portal/dados";
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { IconeConfere } from "@/app/(app)/portal/_componentes/icones";
import { Bloco, Indicador } from "./_componentes/blocos";
import { BlocoDoInvestidor } from "./_componentes/bloco-do-investidor";
import { BOTAO_PRIMARIO, CabecalhoDaSecao } from "./_componentes/cabecalho";
import { BlocoVazio } from "./_componentes/esqueleto";
import {
  GraficoDaCaptacao,
  GraficoDeEntradas,
  GraficoDePagamentos,
  GraficoDoCaptado,
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
  /**
   * `i` = investidor, `m` = modalidade — so a primeira abertura le daqui. As
   * trocas seguintes acontecem no proprio bloco, sem navegar; ver
   * `BlocoDoInvestidor`.
   */
  searchParams: Promise<{ i?: string; m?: string }>;
}) {
  const { i, m } = await searchParams;
  const hoje = await dataDeReferencia();

  /*
   * **Tudo comeca agora, e so o placar segura a tela.**
   *
   * Antes a pagina esperava as tres consultas juntas e, depois delas, a serie do
   * investidor — e só entao desenhava alguma coisa. A projecao de pagamentos é a
   * conta mais cara do painel (todo contrato mensal, mes a mes, ate 2029), e era
   * ela quem decidia quando o total captado aparecia.
   *
   * Agora as tres partem juntas. O placar e os blocos da carteira (`painel`)
   * saem assim que ele chega; pagamentos e investidor chegam depois, cada um no
   * seu `<Suspense>`, com o esqueleto no lugar enquanto isso.
   *
   * O `catch` vazio nao engole erro: ele so marca a promessa como observada,
   * para a carteira vazia — que retorna antes de esperar por elas — nao virar
   * "rejeicao nao tratada" no log. Quem espera por elas mais abaixo recebe a
   * falha normalmente, e a tela de erro do painel a mostra.
   */
  const pagamentos = pagamentosMensais(hoje);
  const investidores = investidoresComContrato();
  pagamentos.catch(() => {});
  investidores.catch(() => {});

  const painel = await montarPainel(hoje);

  if (painel.quantosContratos === 0) {
    return (
      <>
        <CabecalhoDaSecao titulo="Dashboard" />
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

  // Nunca negativo: um credito lancado a mao para contrato ainda em carencia
  // conta em `lancados` sem contar em `contratos`.
  const faltamLancar = Math.max(
    0,
    painel.ciclo.contratos - painel.ciclo.lancados,
  );

  return (
    <>
      {/*
       * O estado do ciclo vive no cabecalho desde que o bloco "Rendimento por
       * mes" saiu: ele era o `acessorio` daquele bloco, e é a unica porta do
       * painel para a folha de lancamento. Perde-lo junto com o grafico teria
       * escondido a tarefa mais recorrente do /admin.
       *
       * Com pendencia ele é **o botao** da tela, cheio e com a contagem — a
       * mesma forma do "Lançar créditos" de Recebimentos. Era um link de texto
       * pequeno no canto, com o mesmo peso de "ciclo lançado": a tarefa do mes
       * e a confirmacao de que nao ha tarefa se liam igual.
       */}
      <CabecalhoDaSecao
        titulo="Dashboard"
        acessorio={
          faltamLancar > 0 ? (
            <Link
              href="/admin/recebimentos?lancar=1"
              className={BOTAO_PRIMARIO}
              title={`Ciclo de ${formatarData(painel.ciclo.data)}: faltam ${faltamLancar} de ${painel.ciclo.contratos}`}
            >
              Lançar créditos de {formatarData(painel.ciclo.data).slice(0, 5)}
              <span className="rounded-full bg-white/20 px-1.5 text-xs font-bold tabular-nums">
                {faltamLancar}
              </span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-verde ring-1 ring-emerald-200 ring-inset">
              <IconeConfere className="h-3.5 w-3.5" />
              Ciclo de {formatarData(painel.ciclo.data)} lançado
            </span>
          )
        }
      />

      {/*
       * A abertura é o placar: quanto entrou contra a meta, e os quatro numeros
       * da carteira. Antes os dois graficos grandes vinham primeiro, e o total
       * captado — a pergunta que traz alguem ao Dashboard — ficava abaixo da
       * primeira dobra.
       */}
      {painel.progresso !== null && <ProgressoDaCaptacao painel={painel} />}

      {/* A faixa: larga, baixa e dividida por filetes. Nao sao quatro cartoes —
          é uma peca só, e os numeros dela se leem numa passada horizontal. */}
      <dl
        className={`grid animate-surgir grid-cols-2 divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x ${
          painel.progresso !== null ? "mt-4" : "mt-6"
        }`}
      >
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

      {/*
       * Depois do placar, o movimento: quanto entrou em cada mes.
       *
       * Tudo o que vem depois é recorte disso — quanto do total ja foi, de onde
       * veio, sob que regra entrou, quanto rende. Aqui é só o movimento bruto,
       * mes a mes.
       */}
      <div className="escalonar mt-4">
        <Bloco
          titulo="Entradas por mês"
          apoio="O que entrou em cada mês, entre contratos novos e aditivos."
          acessorio={
            <span className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 rounded-full bg-marinho" />
                Contratos
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 rounded-full bg-ceu" />
                Aditivos
              </span>
            </span>
          }
        >
          {painel.captacao.length === 0 ? (
            <p className="py-20 text-center text-sm text-neutral-500">
              Nenhum aporte registrado ainda.
            </p>
          ) : (
            <GraficoDeEntradas pontos={painel.captacao} />
          )}
        </Bloco>
      </div>

      {/*
       * O contrario do bloco de cima, e por isso logo abaixo dele: um mostra o
       * dinheiro entrando, o outro o mesmo dinheiro saindo em participacao.
       *
       * Este é o unico do painel que passa de hoje. A metade da direita nao é
       * historico — é compromisso: contrato de 36 meses ja assinado é caixa
       * reservado ate 2029, e ate aqui isso nao aparecia em tela nenhuma.
       */}
      <Suspense
        fallback={
          <div className="mt-4">
            <BlocoVazio altura="h-64" titulo="w-48" />
          </div>
        }
      >
        <BlocoDePagamentos pagamentos={pagamentos} hoje={hoje} />
      </Suspense>

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
          {/* As cores sao as mesmas do pontinho da tabela de modalidades, logo
              abaixo: a mesma coisa com duas cores em blocos vizinhos lê como
              duas coisas diferentes. */}
          <GraficoDoCaptado
            rotulo="Capital"
            fatias={painel.modalidades.map((m) => ({
              nome: MODALIDADES[m.modalidade].nome,
              valor: m.capital,
            }))}
            paleta="modalidade"
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

      {/* Um investidor por vez. É o unico bloco da tela que olha para uma
          pessoa; todos os outros somam a carteira. */}
      <Suspense
        fallback={
          <div className="mt-4">
            <BlocoVazio altura="h-72" titulo="w-44" />
          </div>
        }
      >
        <SecaoDoInvestidor
          investidores={investidores}
          i={i}
          modalidade={modalidadeDaUrl(m)}
          hoje={hoje}
        />
      </Suspense>

      {/* Sozinho na linha: o `grid gap-4` daqui existia para dividir o espaco
          com o bloco de captacao por obra, que saiu. */}
      <div className="escalonar mt-4">
        <Bloco
          titulo="Por modalidade de contrato"
          apoio="Quanto há em cada tipo, e quanto ele movimenta num mês cheio."
        >
          {/*
           * Tabela, e nao cartoes: sao seis numeros por modalidade, e o que se
           * faz com eles é comparar coluna por coluna. Em cartoes, "capital" de
           * um fica a duas alturas do "capital" do outro.
           *
           * Havia uma barra empilhada acima dela, dividindo o capital entre as
           * duas modalidades. Saiu por ser a terceira vez que a tela dizia a
           * mesma coisa: a rosca de "Captado por modalidade" ja mostra essa
           * divisao, e a coluna Capital desta tabela a mostra em numero.
           */}
          <div className="-mx-1 overflow-x-auto px-1">
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
 * O desembolso do mensal, ate o ultimo contrato vencer.
 *
 * O contrario do bloco de entradas, e por isso logo abaixo dele: um mostra o
 * dinheiro entrando, o outro o mesmo dinheiro saindo em participacao.
 *
 * Este é o unico do painel que passa de hoje. A metade da direita nao é
 * historico — é compromisso: contrato de 36 meses ja assinado é caixa reservado
 * ate 2029, e ate aqui isso nao aparecia em tela nenhuma.
 *
 * Componente proprio, e assincrono, para poder chegar depois do resto: a
 * projecao é a conta mais cara do Dashboard, e o `<Suspense>` em volta mostra o
 * esqueleto no lugar enquanto ela corre.
 */
async function BlocoDePagamentos({
  pagamentos,
  hoje,
}: {
  pagamentos: Promise<PontoDoPagamento[]>;
  hoje: DataISO;
}) {
  const pontos = await pagamentos;

  return (
    <div className="escalonar mt-4">
      <Bloco
        titulo="Pagamentos do mensal"
        apoio="O que sai por mês até o último contrato vencer. Passe o mouse para ver quanto cabe a cada investidor."
        acessorio={
          <span className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-marinho" />
              Pago
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-ceu" />
              Previsto
            </span>
          </span>
        }
      >
        {pontos.length === 0 ? (
          <p className="py-20 text-center text-sm text-neutral-500">
            Nenhum contrato na modalidade mensal.
          </p>
        ) : (
          <GraficoDePagamentos
            pontos={pontos}
            competenciaAtual={hoje.slice(0, 7)}
          />
        )}
      </Bloco>
    </div>
  );
}

/**
 * O bloco do investidor, com a primeira serie ja pronta.
 *
 * A primeira vem daqui, do servidor, para o bloco abrir cheio. As trocas
 * seguintes o proprio bloco busca, sem refazer a pagina — ver
 * `BlocoDoInvestidor`.
 */
async function SecaoDoInvestidor({
  investidores,
  i,
  modalidade,
  hoje,
}: {
  investidores: Promise<{ id: string; nome: string }[]>;
  i?: string;
  modalidade: Modalidade;
  hoje: DataISO;
}) {
  const lista = await investidores;

  /*
   * O id da URL só vale se for de alguem que tem contrato: sem esta conferencia,
   * um id inventado iria direto para a consulta. Sem escolha, abre no primeiro
   * da lista — bloco vazio esperando um clique nao ensina nada.
   */
  const escolhido =
    lista.find((investidor) => investidor.id === i)?.id ?? lista[0]?.id;
  if (!escolhido) return null;

  const serie = await serieDoInvestidor(escolhido, modalidade, hoje);

  return (
    <BlocoDoInvestidor
      investidores={lista}
      inicial={{ id: escolhido, modalidade, serie }}
      competenciaAtual={hoje.slice(0, 7)}
    />
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
          {/* Classe, e nao `style` com o hex: a cor mora no modulo cliente e
              nao chega ate aqui. Estas duas sao as mesmas de "Captado por
              origem", entao os tokens da marca ja as expressam. */}
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 rounded-full ${
              resumo.modalidade === "mensal" ? "bg-marinho" : "bg-ceu"
            }`}
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
