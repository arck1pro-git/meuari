/**
 * Camada de dados do Portal do Investidor.
 *
 * Hoje as informacoes vivem aqui como seed. Quando houver banco/API, troque
 * apenas os corpos de `getInvestidorAtual` e `getEmpreendimento` — o restante do
 * portal consome os tipos abaixo e nao precisa mudar.
 */

/** Data no formato `AAAA-MM-DD`. Evitamos `Date` para nao depender de fuso. */
export type DataISO = string;

export type Aporte = {
  id: string;
  data: DataISO;
  valor: number;
  /** Como o dinheiro entrou — aparece no historico. */
  origem: "Aporte inicial" | "Aporte adicional" | "Reinvestimento";
  observacao?: string;
};

export type FaixaDeTaxa = {
  id: string;
  vigenteDesde: DataISO;
  /** Taxa mensal em decimal: 0.0105 = 1,05% a.m. */
  taxaMensal: number;
  motivo: string;
};

/**
 * Como o rendimento é pago.
 * - `final`: acumula no saldo e é recebido de uma vez no resgate.
 * - `mensal`: é retirado a cada competencia, sem acumular.
 */
export type ModalidadeDeRecebimento = "final" | "mensal";

export type Investidor = {
  id: string;
  nome: string;
  email: string;
  documento: string;
  /** Codigo do contrato de participacao. */
  contrato: string;
  cotas: number;
  desde: DataISO;
  modalidade: ModalidadeDeRecebimento;
  aportes: Aporte[];
  taxas: FaixaDeTaxa[];
};

export type EtapaObra = {
  id: string;
  nome: string;
  status: "concluida" | "em-andamento" | "prevista";
  /** Percentual concluido da propria etapa, 0–100. */
  percentual: number;
  previsao: string;
  descricao: string;
};

export type RelatorioObra = {
  id: string;
  competencia: string;
  titulo: string;
  /** Andamento por escrito — um paragrafo por item. */
  paragrafos: string[];
};

export type Documento = {
  id: string;
  nome: string;
  descricao: string;
  categoria: "Contratos" | "Financeiro" | "Obra" | "Juridico";
  competencia: string;
  formato: "PDF";
  tamanho: string;
  arquivo: string;
};

export type Empreendimento = {
  nome: string;
  incorporadora: string;
  endereco: string;
  registro: string;
  /** Percentual fisico geral da obra, 0–100. */
  percentualConcluido: number;
  previsaoEntrega: string;
  etapas: EtapaObra[];
  relatorios: RelatorioObra[];
  documentos: Documento[];
};

/**
 * Data de posicao da carteira. Fixa de proposito: todo o portal (saldo, series
 * do grafico, mes parcial) é derivado dela, entao servidor e cliente sempre
 * calculam o mesmo numero. Um feed real substitui esta constante pela data do
 * ultimo fechamento.
 */
export const DATA_REFERENCIA: DataISO = "2026-07-27";

const INVESTIDOR: Investidor = {
  id: "inv-0417",
  nome: "Fabricio Nogueira",
  email: "fabricio@fabricio.arq.br",
  documento: "***.418.220-**",
  contrato: "ARI-2023-0417",
  cotas: 20,
  desde: "2023-08-01",
  modalidade: "final",
  aportes: [
    {
      id: "ap-1",
      data: "2023-08-01",
      valor: 50000,
      origem: "Aporte inicial",
      observacao:
        "Entrada na rodada de captacao do empreendimento, a 2,30% a.m. fixos.",
    },
    {
      id: "ap-2",
      data: "2024-08-01",
      valor: 100000,
      origem: "Aporte adicional",
      observacao:
        "Ampliacao de participacao no primeiro aniversario do contrato, com nova taxa acordada.",
    },
    {
      id: "ap-3",
      data: "2025-08-01",
      valor: 50000,
      origem: "Aporte adicional",
      observacao:
        "Terceiro aporte do plano de entrada. A taxa foi mantida em 2,60% a.m.",
    },
  ],
  taxas: [
    {
      id: "tx-1",
      vigenteDesde: "2023-08-01",
      taxaMensal: 0.023,
      motivo: "Taxa fixa contratada no aporte inicial.",
    },
    {
      id: "tx-2",
      vigenteDesde: "2024-08-01",
      taxaMensal: 0.026,
      motivo:
        "Nova taxa fixa acordada junto ao segundo aporte, conforme clausula 6.2 do contrato. Vale para as competencias seguintes, sem efeito retroativo.",
    },
  ],
};

const EMPREENDIMENTO: Empreendimento = {
  nome: "Ari",
  incorporadora: "Ari Incorporacoes",
  endereco: "Rua das Acacias, 1.240 — Bairro Jardim, Belo Horizonte / MG",
  registro: "Memorial de incorporacao R-4 na matricula 118.402 — 7o CRI",
  percentualConcluido: 62,
  previsaoEntrega: "Novembro de 2027",
  etapas: [
    {
      id: "et-1",
      nome: "Terraplanagem e contencao",
      status: "concluida",
      percentual: 100,
      previsao: "Concluida em fevereiro de 2025",
      descricao:
        "Movimentacao de terra, contencao em cortina atirantada no lado leste e drenagem provisoria do canteiro finalizadas sem intercorrencias.",
    },
    {
      id: "et-2",
      nome: "Fundacoes",
      status: "concluida",
      percentual: 100,
      previsao: "Concluida em maio de 2025",
      descricao:
        "Estacas hélice continua executadas nas 96 posicoes previstas em projeto, com blocos e vigas baldrame concluidos e laudo de integridade aprovado.",
    },
    {
      id: "et-3",
      nome: "Estrutura",
      status: "concluida",
      percentual: 100,
      previsao: "Concluida em janeiro de 2026",
      descricao:
        "Estrutura em concreto armado concluida ate a cobertura, 14 pavimentos, com desforma total e cura verificada por ensaio de corpo de prova.",
    },
    {
      id: "et-4",
      nome: "Alvenaria e vedacoes",
      status: "em-andamento",
      percentual: 78,
      previsao: "Previsao de conclusao em outubro de 2026",
      descricao:
        "Alvenaria concluida do 1o ao 11o pavimento. Em execucao nos pavimentos 12 a 14, com contramarcos ja instalados ate o 9o pavimento.",
    },
    {
      id: "et-5",
      nome: "Instalacoes eletricas e hidraulicas",
      status: "em-andamento",
      percentual: 41,
      previsao: "Previsao de conclusao em marco de 2027",
      descricao:
        "Prumadas hidraulicas e eletricas executadas ate o 9o pavimento. Shafts liberados e ramais internos iniciados nos pavimentos baixos.",
    },
    {
      id: "et-6",
      nome: "Revestimentos e fachada",
      status: "prevista",
      percentual: 0,
      previsao: "Inicio previsto para janeiro de 2027",
      descricao:
        "Contratacao da fachada ventilada em fase final de concorrencia, com tres propostas em analise tecnica e comercial.",
    },
    {
      id: "et-7",
      nome: "Acabamentos e areas comuns",
      status: "prevista",
      percentual: 0,
      previsao: "Inicio previsto para maio de 2027",
      descricao:
        "Projeto executivo de interiores das areas comuns aprovado; compra de louças, metais e pisos programada para o 1o trimestre de 2027.",
    },
  ],
  relatorios: [
    {
      id: "rel-2026-07",
      competencia: "Julho de 2026",
      titulo: "Alvenaria nos pavimentos altos e inicio dos ramais internos",
      paragrafos: [
        "A alvenaria de vedacao avancou do 10o ao 11o pavimento no periodo e a equipe iniciou a marcacao do 12o. Com isso, a etapa chega a 78% de execucao, dois pontos acima do previsto no cronograma fisico.",
        "As instalacoes eletricas e hidraulicas seguem em prumada ate o 9o pavimento. Os ramais internos comecaram nos pavimentos 1 a 4, atividade que passa a correr em paralelo com a alvenaria dos pavimentos altos.",
        "A concorrencia da fachada ventilada recebeu tres propostas. A analise tecnica foi concluida e a definicao comercial esta prevista para agosto, dentro da janela necessaria para nao impactar o inicio dos revestimentos.",
        "Nao houve acidentes com afastamento no periodo. O efetivo medio em canteiro foi de 84 profissionais.",
      ],
    },
    {
      id: "rel-2026-06",
      competencia: "Junho de 2026",
      titulo: "Contramarcos e liberacao dos shafts",
      paragrafos: [
        "Foram instalados contramarcos do 7o ao 9o pavimento, liberando as esquadrias para producao. A alvenaria fechou o mes no 10o pavimento.",
        "Os shafts de instalacoes foram liberados apos inspecao conjunta com o gerenciamento, permitindo o inicio das prumadas nos pavimentos intermediarios.",
        "A rodada de captacao encerrada em agosto do ano passado foi integralmente liquidada pelos investidores, sem inadimplencia registrada.",
      ],
    },
    {
      id: "rel-2026-05",
      competencia: "Maio de 2026",
      titulo: "Desmobilizacao da grua e reorganizacao do canteiro",
      paragrafos: [
        "Com a estrutura concluida, a grua foi desmobilizada e substituida por cremalheira, reduzindo o custo mensal de equipamentos em aproximadamente 18%.",
        "O canteiro foi reorganizado para a fase de vedacoes, com nova central de argamassa e ampliacao da area de estoque coberto.",
        "As vendas atingiram 57% das unidades, acima da meta de 50% prevista para esta fase da obra.",
      ],
    },
  ],
  documentos: [
    {
      id: "doc-1",
      nome: "Contrato de participacao — ARI-2023-0417",
      descricao:
        "Instrumento particular de participacao, com as clausulas de remuneracao, de recebimento no final e de mudanca de taxa.",
      categoria: "Contratos",
      competencia: "Agosto de 2023",
      formato: "PDF",
      tamanho: "412 KB",
      arquivo: "/documentos/contrato-participacao-ari-2023-0417.pdf",
    },
    {
      id: "doc-2",
      nome: "Aditivo de mudanca de taxa — agosto de 2024",
      descricao:
        "Aditivo que formaliza a taxa fixa de 2,60% a.m. a partir do segundo aporte.",
      categoria: "Contratos",
      competencia: "Agosto de 2024",
      formato: "PDF",
      tamanho: "188 KB",
      arquivo: "/documentos/aditivo-mudanca-taxa-2024-08.pdf",
    },
    {
      id: "doc-3",
      nome: "Demonstrativo financeiro — 1o semestre de 2026",
      descricao:
        "Posicao consolidada de aportes, rendimentos e saldo do periodo, por investidor.",
      categoria: "Financeiro",
      competencia: "Junho de 2026",
      formato: "PDF",
      tamanho: "624 KB",
      arquivo: "/documentos/demonstrativo-financeiro-2026-s1.pdf",
    },
    {
      id: "doc-4",
      nome: "Prestacao de contas da obra — 2o trimestre de 2026",
      descricao:
        "Uso dos recursos por rubrica, com notas fiscais agrupadas e comparativo orcado x realizado.",
      categoria: "Financeiro",
      competencia: "Junho de 2026",
      formato: "PDF",
      tamanho: "1,2 MB",
      arquivo: "/documentos/prestacao-de-contas-2026-t2.pdf",
    },
    {
      id: "doc-5",
      nome: "Relatorio fotografico da obra — julho de 2026",
      descricao:
        "Registro fotografico datado por pavimento e frente de servico do mes.",
      categoria: "Obra",
      competencia: "Julho de 2026",
      formato: "PDF",
      tamanho: "3,4 MB",
      arquivo: "/documentos/relatorio-fotografico-2026-07.pdf",
    },
    {
      id: "doc-6",
      nome: "Cronograma fisico-financeiro atualizado",
      descricao:
        "Cronograma vigente com as curvas prevista e realizada ate a competencia.",
      categoria: "Obra",
      competencia: "Julho de 2026",
      formato: "PDF",
      tamanho: "540 KB",
      arquivo: "/documentos/cronograma-fisico-financeiro-2026-07.pdf",
    },
    {
      id: "doc-7",
      nome: "Memorial de incorporacao registrado",
      descricao:
        "Memorial registrado sob R-4 na matricula 118.402 do 7o Registro de Imoveis.",
      categoria: "Juridico",
      competencia: "Julho de 2023",
      formato: "PDF",
      tamanho: "2,1 MB",
      arquivo: "/documentos/memorial-de-incorporacao.pdf",
    },
    {
      id: "doc-8",
      nome: "Certidoes negativas da incorporadora",
      descricao:
        "Certidoes federais, estaduais, municipais e trabalhistas em vigor.",
      categoria: "Juridico",
      competencia: "Julho de 2026",
      formato: "PDF",
      tamanho: "760 KB",
      arquivo: "/documentos/certidoes-negativas-2026-07.pdf",
    },
  ],
};

/**
 * Investidor da sessao. Ponto unico de integracao com autenticacao: troque o
 * corpo por uma leitura de sessao (`await cookies()` / provedor de auth) e um
 * SELECT por `investidor.id`.
 */
export async function getInvestidorAtual(): Promise<Investidor> {
  return INVESTIDOR;
}

export async function getEmpreendimento(): Promise<Empreendimento> {
  return EMPREENDIMENTO;
}
