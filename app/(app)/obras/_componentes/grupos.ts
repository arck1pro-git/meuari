import type { Etapa } from "@/lib/portal/dados";

/**
 * As frentes em que os projetos de uma obra correm.
 *
 * A media dos onze juntos escondia o que mais importa: engenharia e cartorio
 * andam em ritmos diferentes, e uma incorporacao em 40% sumia no meio de nove
 * projetos em 75%. Separadas, cada frente mostra o proprio atraso.
 *
 * A ordem aqui é a ordem dos quadros na tela — do que se desenha para o que
 * autoriza, e a venda por ultimo.
 */
export const GRUPOS = ["Projeto", "Aprovações", "Marketing"] as const;

export type Grupo = (typeof GRUPOS)[number];

/**
 * Como cada quadro se explica em uma linha, para o titulo nao precisar carregar
 * sozinho o que ele reune.
 */
export const DESCRICAO_DO_GRUPO: Record<Grupo, string> = {
  Projeto: "Engenharia e arquitetura",
  Aprovações: "Licenças, órgãos e registros",
  Marketing: "Lançamento e material de vendas",
};

/**
 * O palpite pelo nome, para quando a etapa nao tiver frente escolhida.
 *
 * Nome de etapa é texto livre — "Hidro", "Hidráulico", "Hidrossanitário" sao a
 * mesma coisa —, entao aqui é raiz de palavra e nao nome inteiro. A ordem
 * importa: quem casa primeiro leva.
 *
 * Nenhum palpite acerta sempre. Por isso existe a coluna `grupo`, e por isso
 * ela vence: quando errar, o conserto é no /admin, e nao neste arquivo.
 */
const PALPITE: [Grupo, RegExp][] = [
  [
    "Aprovações",
    /ambient|incorpora|licen|prefeit|cart[óo]rio|registr|retifica|unifica|bombeir|ppci|inc[êe]ndio|alvar|habite|matr[íi]cula|aprova[çc]|outorga|averba|vistoria|due|eiv|lai/i,
  ],
  [
    "Marketing",
    /marketing|vendas|comercial|lan[çc]amento|stand|maquete|publicidad|corretor|campanha/i,
  ],
  [
    "Projeto",
    /estrutur|arquitet|el[ée]tric|hidro|hidr[áa]ul|funda[çc]|compatibiliza|instala|paisag|luminot|clim|ac[úu]stic|impermeab|terraplen|geot[ée]cn|topogr/i,
  ],
];

/**
 * A frente de uma etapa: a escolhida no /admin, ou o palpite pelo nome.
 *
 * Nome que nao casa com nada cai em `Projeto` — numa obra é o que mais existe,
 * e é a aposta que erra menos vezes.
 */
export function grupoDaEtapa(etapa: Etapa): Grupo {
  const escolhido = GRUPOS.find((g) => g === etapa.grupo);
  if (escolhido) return escolhido;

  for (const [grupo, padrao] of PALPITE) {
    if (padrao.test(etapa.nome)) return grupo;
  }
  return "Projeto";
}

/**
 * As etapas repartidas nas frentes, na ordem de `GRUPOS`.
 *
 * Frente sem etapa nenhuma nao vira quadro vazio: ela simplesmente nao aparece.
 */
export function porGrupo(etapas: Etapa[]): { grupo: Grupo; etapas: Etapa[] }[] {
  return GRUPOS.map((grupo) => ({
    grupo,
    etapas: etapas.filter((e) => grupoDaEtapa(e) === grupo),
  })).filter((secao) => secao.etapas.length > 0);
}
