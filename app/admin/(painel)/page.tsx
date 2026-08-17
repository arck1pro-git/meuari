import Link from "next/link";
import { montarPainel, type ResumoDeModalidade } from "@/lib/admin/painel";
import { dataDeReferencia } from "@/lib/portal/dados";
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { IconeSetaDireita } from "@/app/(app)/portal/_componentes/icones";
import { CabecalhoDaSecao } from "./_componentes/cabecalho";
import {
  BarraDeModalidades,
  COR_DA_MODALIDADE,
  GraficoDeCreditos,
  GraficoDeObras,
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

export default async function AdminPage() {
  const hoje = await dataDeReferencia();
  const painel = await montarPainel(hoje);

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

      {/* A faixa: larga, baixa e dividida por filetes. Nao sao quatro cartoes —
          é uma peca só, e os numeros dela se leem numa passada horizontal. */}
      <dl className="mt-6 grid animate-surgir grid-cols-2 divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x">
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

      {/* Assimetrico de proposito: a rosca é uma proporcao e cabe em pouco; a
          serie precisa de largura para os meses nao se encostarem. Meio a meio
          daria uma rosca gigante ao lado de um grafico apertado. */}
      <div className="escalonar mt-4 grid gap-4 lg:grid-cols-12">
        <Bloco
          titulo="Composição do captado"
          /* Encolhe de 5 para 4 colunas na tela larga: a rosca tem diametro
             fixo, entao largura a mais nela é branco em volta do circulo — a
             serie, que ganha as colunas, usa cada pixel para separar os meses. */
          className="lg:col-span-5 xl:col-span-4"
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
          titulo="Créditos pagos por mês"
          className="lg:col-span-7 xl:col-span-8"
          acessorio={
            /* O estado do ciclo mora aqui, e nao num bloco proprio: "faltam 2"
               só quer dizer alguma coisa ao lado do que ja foi pago. */
            <Link
              href="/admin/recebimentos"
              className="group flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-marinho transition-colors duration-200 hover:bg-indigo-100 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              {faltamLancar > 0
                ? `Faltam ${faltamLancar} de ${painel.ciclo.contratos} em ${formatarData(painel.ciclo.data)}`
                : `Ciclo de ${formatarData(painel.ciclo.data)} lançado`}
              <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          }
        >
          {painel.serie.length === 0 ? (
            <p className="py-20 text-center text-sm text-neutral-500">
              Nenhum crédito lançado ainda.
            </p>
          ) : (
            <GraficoDeCreditos
              pontos={painel.serie}
              competenciaAtual={hoje.slice(0, 7)}
            />
          )}
        </Bloco>
      </div>

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
          apoio="Capital de todos os contratos de cada empreendimento."
        >
          <GraficoDeObras obras={painel.obras} />
        </Bloco>
      </div>
    </>
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
