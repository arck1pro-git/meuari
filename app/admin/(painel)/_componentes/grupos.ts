/**
 * As secoes do painel em grupos, na ordem em que aparecem.
 *
 * Nove itens numa lista corrida se leem um a um: para achar "Aditivos" é
 * preciso passar o olho por tudo. Em quatro blocos de dois ou tres, o olho
 * escolhe o bloco primeiro — e os blocos sao os assuntos do painel, que é como
 * quem administra ja pensa: gente, dinheiro, obra, recado.
 *
 * A ordem daqui manda na ordem da coluna e da tela inicial, e nao a do registro
 * de `lib/admin/tabelas.ts` — aquele é a fonte dos identificadores do SQL, e o
 * que ele ordena é outra coisa.
 *
 * Modulo proprio porque a coluna é componente de cliente e a tela inicial é de
 * servidor: os dois precisam da mesma divisao, e ela nao pode morar em nenhum
 * dos dois lados.
 */
export const GRUPOS: { titulo: string; slugs: string[] }[] = [
  { titulo: "Pessoas", slugs: ["usuarios"] },
  { titulo: "Investimento", slugs: ["contratos", "aditivos", "recebimentos"] },
  {
    titulo: "Obra",
    slugs: ["empreendimentos", "etapas", "imagens", "documentos"],
  },
  { titulo: "Comunicação", slugs: ["notificacoes"] },
];

/**
 * Distribui as secoes nos grupos, guardando as sobras para o fim.
 *
 * Slug que nao estiver em grupo nenhum cai num bloco sem titulo, para uma
 * tabela nova nunca sumir da navegacao por esquecimento de quem a criou.
 */
export function agrupar<T extends { slug: string }>(secoes: T[]) {
  const por = new Map(secoes.map((s) => [s.slug, s]));

  const blocos = GRUPOS.map(({ titulo, slugs }) => ({
    titulo,
    itens: slugs.map((s) => por.get(s)).filter((s): s is T => Boolean(s)),
  })).filter((b) => b.itens.length > 0);

  const colocados = new Set(GRUPOS.flatMap((g) => g.slugs));
  const sobras = secoes.filter((s) => !colocados.has(s.slug));
  if (sobras.length > 0) blocos.push({ titulo: "", itens: sobras });

  return blocos;
}
