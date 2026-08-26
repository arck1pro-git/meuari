import "server-only";
import { consultar } from "@/lib/db";
import type { Periodo } from "@/lib/admin/periodo";

/**
 * As consultas da tela de Acessos do painel.
 *
 * A tabela `acessos` guarda **uma linha por pagina aberta**; tudo o que a tela
 * mostra é agregacao disso. A sessao, em particular, nao existe no banco: ela é
 * o `group by sessao_id`, e é ali que "quando entrou", "quanto tempo ficou" e
 * "por quais abas passou" viram numero.
 *
 * ---
 *
 * **Como a duracao é apurada**, porque é o unico numero desta tela que nao é
 * uma contagem direta e o unico que se pode ler errado.
 *
 * Ha duas medidas, e a tela usa a maior das duas:
 *
 * 1. **O intervalo** entre a primeira e a ultima pagina da sessao. Sempre
 *    existe, e sempre subestima: a ultima tela nao tem uma navegacao seguinte
 *    para marcar o fim dela. Quem entra, olha o saldo por tres minutos e fecha
 *    aparece com duracao zero — houve uma pagina só.
 * 2. **A soma do tempo visivel**, relatada pelo navegador ao sair de cada tela.
 *    É a medida boa e a que pode faltar: aba fechada de repente, celular que
 *    dorme, iOS que encerra o processo (ver `telemetria.tsx`).
 *
 * `greatest` das duas porque cada uma cobre o buraco da outra, e nenhuma delas
 * pode inflar a outra: a soma do visivel nunca é maior que o tempo real, e o
 * intervalo tambem nao. O numero é, portanto, **um piso** — o tempo foi pelo
 * menos aquele.
 */

/** O fuso em que "o dia" é contado. O mesmo do resto do portal. */
const FUSO = "America/Sao_Paulo";

/** Teto de linhas na tabela de sessoes. Acima disso a tela avisa. */
export const TETO_DE_SESSOES = 300;

// -----------------------------------------------------------------------------
// O recorte
// -----------------------------------------------------------------------------

/*
 * O `where` de todas as consultas da tela, com os mesmos quatro parametros.
 *
 * Os limites sao convertidos para `timestamptz` **antes** da comparacao —
 * `$1::date at time zone $3` é o instante da meia-noite de Brasilia daquele
 * dia. O caminho oposto (`criado_em at time zone $3)::date = $1`) daria o mesmo
 * resultado e jogaria fora o indice `acessos_recentes`, porque a coluna estaria
 * dentro de uma funcao.
 *
 * `+ 1` no fim e `<`, em vez de `<=` sobre o proprio dia: assim o ultimo dia
 * entra inteiro, com as 23h59 dele.
 */
const RECORTE = `
  where a.criado_em >= ($1::date at time zone $3)
    and a.criado_em <  (($2::date + 1) at time zone $3)
    and ($4::uuid is null or a.usuario_id = $4)
`;

/** Uuid vindo da URL. Qualquer outra coisa vira "todos". */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usuarioDaUrl(bruto?: string): string | null {
  return bruto && UUID.test(bruto) ? bruto : null;
}

function valores(periodo: Periodo, usuario: string | null) {
  return [periodo.inicio, periodo.fim, FUSO, usuario];
}

// -----------------------------------------------------------------------------
// Consultas
// -----------------------------------------------------------------------------

export type ResumoDeAcessos = {
  sessoes: number;
  pessoas: number;
  paginas: number;
  /** Media da duracao das sessoes, em milissegundos. */
  mediaMs: number;
  /** Sessoes abertas pelo app instalado na tela inicial, e nao pelo navegador. */
  instaladas: number;
};

export async function resumoDeAcessos(
  periodo: Periodo,
  usuario: string | null,
): Promise<ResumoDeAcessos> {
  const [linha] = await consultar<ResumoDeAcessos>(
    `with sessoes as (
       select a.sessao_id,
              min(a.criado_em) as inicio,
              max(a.criado_em) as fim,
              sum(coalesce(a.visivel_ms, 0)) as visivel,
              bool_or(a.standalone) as standalone
         from acessos a
         ${RECORTE}
        group by a.sessao_id
     )
     select (select count(*) from sessoes)::int as sessoes,
            (select count(distinct a.usuario_id) from acessos a ${RECORTE})::int
              as pessoas,
            (select count(*) from acessos a ${RECORTE})::int as paginas,
            coalesce(
              avg(greatest(extract(epoch from (fim - inicio)) * 1000, visivel)),
              0
            )::float8 as "mediaMs",
            (count(*) filter (where standalone))::int as instaladas
       from sessoes`,
    valores(periodo, usuario),
  );

  return (
    linha ?? { sessoes: 0, pessoas: 0, paginas: 0, mediaMs: 0, instaladas: 0 }
  );
}

export type FatiaDeAparelho = {
  dispositivo: string;
  sessoes: number;
  paginas: number;
};

export async function porAparelho(
  periodo: Periodo,
  usuario: string | null,
): Promise<FatiaDeAparelho[]> {
  return consultar<FatiaDeAparelho>(
    `select coalesce(a.dispositivo, 'desconhecido') as dispositivo,
            count(distinct a.sessao_id)::int as sessoes,
            count(*)::int as paginas
       from acessos a
       ${RECORTE}
      group by 1
      order by 2 desc, 1`,
    valores(periodo, usuario),
  );
}

export type UsoDaSecao = {
  secao: string;
  aberturas: number;
  pessoas: number;
};

/** Quais abas foram abertas, e por quantas pessoas diferentes. */
export async function porSecao(
  periodo: Periodo,
  usuario: string | null,
): Promise<UsoDaSecao[]> {
  return consultar<UsoDaSecao>(
    `select a.secao,
            count(*)::int as aberturas,
            count(distinct a.usuario_id)::int as pessoas
       from acessos a
       ${RECORTE}
      group by 1
      order by 2 desc, 1`,
    valores(periodo, usuario),
  );
}

export type FaixaDeHora = { hora: number; aberturas: number };

/**
 * A que horas o portal é aberto, no fuso de Brasilia.
 *
 * As 24 faixas voltam sempre, inclusive as vazias: o eixo é o relogio, e omitir
 * as horas sem acesso faria a madrugada encostar na manha.
 */
export async function porHora(
  periodo: Periodo,
  usuario: string | null,
): Promise<FaixaDeHora[]> {
  const linhas = await consultar<FaixaDeHora>(
    `select extract(hour from (a.criado_em at time zone $3))::int as hora,
            count(*)::int as aberturas
       from acessos a
       ${RECORTE}
      group by 1`,
    valores(periodo, usuario),
  );

  const por = new Map(linhas.map((l) => [l.hora, l.aberturas]));
  return Array.from({ length: 24 }, (_, hora) => ({
    hora,
    aberturas: por.get(hora) ?? 0,
  }));
}

export type SessaoDeAcesso = {
  id: string;
  usuarioId: string | null;
  usuarioNome: string | null;
  /*
   * Ja formatados no fuso de Brasilia pelo `to_char`, como o resto do projeto
   * faz. O driver do Postgres entrega `timestamptz` como `Date` do JavaScript, e
   * ai a hora passaria a depender do fuso da maquina que renderiza — na Vercel,
   * UTC. Uma sessao das 19h apareceria as 22h.
   */
  dia: string;
  hora: string;
  paginas: number;
  duracaoMs: number;
  /** `true` quando o tempo visivel chegou a ser relatado. Ver o topo. */
  medido: boolean;
  dispositivo: string | null;
  sistema: string | null;
  navegador: string | null;
  largura: number | null;
  standalone: boolean | null;
  cidade: string | null;
  regiao: string | null;
  pais: string | null;
  ip: string | null;
  /** As abas por onde passou, sem repetir. */
  secoes: string[];
};

export async function sessoesDeAcesso(
  periodo: Periodo,
  usuario: string | null,
): Promise<SessaoDeAcesso[]> {
  return consultar<SessaoDeAcesso>(
    /*
     * `min()` nas colunas do aparelho: dentro de uma sessao elas nao mudam — é
     * o mesmo cookie no mesmo navegador —, entao qualquer agregado devolve o
     * mesmo valor. `min` é o mais barato que satisfaz o `group by`.
     *
     * `usuario_id::text` porque `min(uuid)` só existe a partir do Postgres 14, e
     * nao ha por que exigir isso do banco por causa de um agregado que só
     * precisa devolver o unico valor que existe.
     */
    `select a.sessao_id::text as id,
            min(a.usuario_id::text) as "usuarioId",
            min(a.usuario_nome) as "usuarioNome",
            to_char(min(a.criado_em) at time zone $3, 'YYYY-MM-DD') as dia,
            to_char(min(a.criado_em) at time zone $3, 'HH24:MI') as hora,
            count(*)::int as paginas,
            greatest(
              extract(epoch from (max(a.criado_em) - min(a.criado_em))) * 1000,
              sum(coalesce(a.visivel_ms, 0))
            )::float8 as "duracaoMs",
            bool_or(a.visivel_ms is not null) as medido,
            min(a.dispositivo) as dispositivo,
            min(a.sistema) as sistema,
            min(a.navegador) as navegador,
            min(a.largura)::int as largura,
            bool_or(a.standalone) as standalone,
            min(a.cidade) as cidade,
            min(a.regiao) as regiao,
            min(a.pais) as pais,
            min(a.ip) as ip,
            array_agg(distinct a.secao) as secoes
       from acessos a
       ${RECORTE}
      group by a.sessao_id
      order by min(a.criado_em) desc
      limit ${TETO_DE_SESSOES}`,
    valores(periodo, usuario),
  );
}

/**
 * Quem aparece no filtro de pessoa.
 *
 * De propósito **sem o recorte de periodo**: a lista tem de continuar completa
 * quando o dia escolhido esta vazio, senao escolher "ontem" esvaziaria o proprio
 * seletor que permitiria sair de la.
 *
 * Só quem tem acesso registrado, e nao a tabela de usuarios inteira: nome que
 * nunca vai devolver linha nenhuma é opcao que só cansa quem procura.
 */
export async function pessoasComAcesso(): Promise<
  { id: string; nome: string }[]
> {
  return consultar<{ id: string; nome: string }>(
    `select distinct a.usuario_id::text as id,
            coalesce(a.usuario_nome, 'Sem nome') as nome
       from acessos a
      where a.usuario_id is not null
      order by 2`,
  );
}
