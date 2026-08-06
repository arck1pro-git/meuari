import type { Etapa } from "@/lib/portal/dados";

/**
 * O andamento dos projetos, em uma linha: a media simples das disciplinas.
 *
 * Media, e nao percentual de obra — cada etapa mede em que fase aquele projeto
 * esta, entao o que este numero diz é o quanto o conjunto andou. O rotulo na
 * tela é literal sobre isso; chamar de "obra concluida" seria prometer predio
 * de pé.
 *
 * Vive fora dos componentes porque o hero e a ficha mostram o mesmo numero, e
 * dois calculos iguais em lugares diferentes acabam divergindo.
 */
export function mediaDasEtapas(etapas: Etapa[]): number | null {
  if (etapas.length === 0) return null;
  return etapas.reduce((soma, e) => soma + e.percentual, 0) / etapas.length;
}

/** Quantas ja fecharam. */
export function etapasConcluidas(etapas: Etapa[]): number {
  return etapas.filter((e) => e.percentual >= 100).length;
}
