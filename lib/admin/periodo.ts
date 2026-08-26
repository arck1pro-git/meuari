/*
 * O periodo da tela de Acessos: o vocabulario, e a traducao do `?d=` da URL.
 *
 * Vive separado de `lib/admin/acessos.ts` pelo mesmo motivo que `lib/sessao.ts`
 * vive separado de `lib/auth.ts`: **os dois lados precisam disto**. O servidor,
 * para montar o `where`; a barra de filtros, que é componente de cliente, para
 * desenhar os botoes e saber qual esta marcado.
 *
 * Aquele arquivo abre com `import "server-only"` e puxa `lib/db.ts` — e o driver
 * do Postgres junto. Importar dali de um `"use client"` nao dá erro de tipo nem
 * de lint: o build é que recusa, com um rastro que termina em "pg [Client
 * Component Browser]". Aqui nao ha nada de banco, e nada que só exista no
 * servidor.
 *
 * Sem `import "server-only"`, portanto, e sem nenhuma consulta: `resolverPeriodo`
 * recebe o dia de hoje pronto em vez de ir busca-lo. Fica puro, e quem chama é
 * quem ja tinha o dado.
 */

export type Periodo = {
  /** O que vai e volta na URL (`?d=`). */
  chave: string;
  rotulo: string;
  /** Primeiro e ultimo dia, inclusive, em `AAAA-MM-DD` no fuso de Brasilia. */
  inicio: string;
  fim: string;
  /** Um dia especifico escolhido no calendario, e nao um dos atalhos. */
  avulso: boolean;
  /** Hoje em Brasilia — o teto do calendario, e o fim de todo atalho. */
  hoje: string;
};

/** Os atalhos, na ordem em que aparecem na tela. */
export const ATALHOS = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "7", rotulo: "7 dias" },
  { chave: "30", rotulo: "30 dias" },
  { chave: "tudo", rotulo: "Tudo" },
] as const;

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function menosDias(iso: string, dias: number): string {
  // Em UTC de proposito: a conta é sobre o rotulo do dia, nao sobre um
  // instante. Somar horas locais aqui erraria na virada do horario de verao.
  const data = new Date(`${iso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() - dias);
  return data.toISOString().slice(0, 10);
}

/**
 * Traduz o `?d=` da URL num intervalo de dias.
 *
 * Um parametro só para as duas formas de escolher tempo — atalho e data — em
 * vez de dois que precisariam se anular. Assim nao existe o estado "7 dias *e*
 * 20 de agosto", que teria de ser desempatado em algum lugar.
 *
 * Valor desconhecido cai em "hoje", que é como a tela abre.
 */
export function resolverPeriodo(bruto: string | undefined, hoje: string): Periodo {
  if (bruto && DIA.test(bruto)) {
    return {
      chave: bruto,
      rotulo: bruto === hoje ? "Hoje" : "Dia escolhido",
      inicio: bruto,
      fim: bruto,
      // Uma data que por acaso é hoje nao vira "dia avulso": ela é o atalho
      // "Hoje", e é o botao que tem de ficar marcado.
      avulso: bruto !== hoje,
      hoje,
    };
  }

  const comum = { avulso: false, fim: hoje, hoje };
  switch (bruto) {
    case "7":
      return {
        chave: "7",
        rotulo: "7 dias",
        inicio: menosDias(hoje, 6),
        ...comum,
      };
    case "30":
      return {
        chave: "30",
        rotulo: "30 dias",
        inicio: menosDias(hoje, 29),
        ...comum,
      };
    case "tudo":
      // Anterior a qualquer linha que possa existir. Mais barato e mais claro
      // que um `where` condicional a menos.
      return { chave: "tudo", rotulo: "Tudo", inicio: "2000-01-01", ...comum };
    default:
      return { chave: "hoje", rotulo: "Hoje", inicio: hoje, ...comum };
  }
}
