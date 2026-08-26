import "server-only";
import { consultar } from "@/lib/db";
import { contextoDaRequisicao } from "@/lib/dispositivo";
import type { Sessao } from "@/lib/sessao";

/**
 * Registra uma pagina aberta no portal.
 *
 * Vale para este arquivo a mesma regra de `lib/auditoria.ts`: **nunca derruba a
 * navegacao**. Se a gravacao falhar, o erro vai para o log do servidor e a
 * pessoa continua usando o app sem perceber. Medicao de uso que quebra a tela
 * que ela mede é desligada na primeira sexta-feira ruim.
 *
 * O que ele nao cobre, e é honesto dizer de uma vez:
 *
 * - **O /admin nao entra.** O gancho vive na moldura do grupo `(app)`, e o
 *   painel tem moldura propria. É de proposito: quem administra passa o dia
 *   nestas telas, e misturar isso afogaria o uso do investidor — que é o que a
 *   medicao existe para enxergar.
 * - **Sem JavaScript nao ha registro.** O gancho é um efeito de cliente. Um
 *   navegador com script desligado usa o portal e nao aparece aqui.
 * - **Robo nao é filtrado na entrada, é marcado.** `dispositivo` recebe o que o
 *   UA disser e `robo` fica no `detalhe` da auditoria; como tudo aqui esta atras
 *   de sessao, robo de busca nao chega. O que chega é monitoramento proprio, e
 *   esse convem ver.
 */

/** Tamanho maximo do caminho guardado. Rota real do app nao chega perto. */
const ROTA_MAX = 120;

/**
 * O que se aceita como caminho.
 *
 * A rota vem do navegador, entao é entrada de fora e nao se confia nela. O
 * estrago possivel é pequeno — a pessoa poluiria a propria linha —, mas o
 * campo vai para uma tela que outra pessoa le, e texto arbitrario de um usuario
 * exibido para outro é exatamente o caminho que nao se deixa aberto.
 */
const ROTA_VALIDA = /^\/[a-zA-Z0-9\-_/]*$/;

function limparRota(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;

  // Query e ancora fora: `?i=<id>` repetiria aqui dado que ja tem coluna
  // propria, e parte dele é identificador de outra pessoa.
  const rota = bruto.split(/[?#]/)[0];

  if (rota.length > ROTA_MAX || !ROTA_VALIDA.test(rota)) return null;
  return rota;
}

/**
 * A aba, a partir do caminho: `/obras/8f3c…` é `obras`.
 *
 * O primeiro segmento e nao a rota inteira porque sao duas perguntas: "quantas
 * vezes abriram Obras" se responde com a secao, "qual obra" com a rota. As duas
 * ficam guardadas, e cada uma serve a sua.
 */
function secaoDa(rota: string): string {
  return rota.split("/")[1] || "portal";
}

/**
 * Grava a visita e devolve o id dela — ou `null` quando nao houve o que gravar.
 *
 * O id volta para o navegador porque é ele que, ao sair da pagina, diz quanto
 * tempo ficou. Ver `encerrarAcesso`.
 */
export async function registrarAcesso(
  sessao: Sessao,
  dados: { rota: unknown; largura?: unknown; standalone?: unknown },
): Promise<string | null> {
  // Cookie emitido antes do `sid` existir. Nao é erro: a sessao vale, só nao
  // tem como ser agrupada. Ver a nota no tipo `Sessao`.
  if (!sessao.sid) return null;

  const rota = limparRota(dados.rota);
  if (!rota) return null;

  try {
    const contexto = await contextoDaRequisicao();

    /*
     * Insere, **menos** quando a mesma sessao ja registrou a mesma rota nos
     * ultimos segundos — nesse caso devolve a linha que ja existe.
     *
     * Nao é zelo excessivo. Em desenvolvimento o StrictMode do React monta o
     * efeito duas vezes de proposito, e sem esta guarda toda navegacao viraria
     * duas linhas na tela do painel. Em producao ela cobre o mesmo caso por
     * outra porta: duplo toque no item do rodape, e a remontagem que o Next faz
     * ao recuperar o foco.
     *
     * Numa consulta só, e nao um `select` seguido de `insert`: sao duas idas ao
     * banco por pagina aberta, e esta é a operacao mais frequente do app.
     *
     * As duas metades leem o mesmo instantaneo, entao `recente` nunca enxerga a
     * linha que `nova` acabou de escrever — que é justamente o que se quer.
     */
    const [linha] = await consultar<{ id: string | null }>(
      `with recente as (
         select id from acessos
          where sessao_id = $1
            and rota = $2
            and criado_em > now() - interval '3 seconds'
          order by criado_em desc
          limit 1
       ), nova as (
         insert into acessos
           (sessao_id, usuario_id, usuario_nome, rota, secao,
            dispositivo, sistema, navegador, largura, standalone,
            ip, cidade, regiao, pais)
         select $1, $3, $4, $2, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14
          where not exists (select 1 from recente)
         returning id
       )
       select coalesce((select id from nova), (select id from recente)) as id`,
      [
        sessao.sid,
        rota,
        sessao.id,
        sessao.nome,
        secaoDa(rota),
        contexto.dispositivo,
        contexto.sistema,
        contexto.navegador,
        inteiro(dados.largura, 10_000),
        typeof dados.standalone === "boolean" ? dados.standalone : null,
        contexto.ip,
        contexto.cidade,
        contexto.regiao,
        contexto.pais,
      ],
    );

    return linha?.id ?? null;
  } catch (erro) {
    console.error("[acessos] nao registrou:", erro);
    return null;
  }
}

/**
 * Anota quanto tempo aquela pagina ficou a frente.
 *
 * Chega num segundo envio, quando a pessoa troca de aba ou fecha o app, e por
 * isso **pode nunca chegar** — celular que dorme, processo encerrado pelo iOS,
 * conexao que cai. O painel nao depende dele: a duracao da sessao tem como piso
 * o intervalo entre a primeira e a ultima pagina, e este numero só refina.
 *
 * `greatest` porque o mesmo id pode ser reportado mais de uma vez (a pagina
 * esconde, volta e esconde de novo) e os envios podem chegar fora de ordem —
 * sem ele, um relato antigo encolheria um tempo maior ja gravado.
 *
 * O `sessao_id` entra na condicao para o id nao bastar sozinho: ele viaja pelo
 * navegador, e sem isso alguem poderia carimbar tempo na linha de outra pessoa.
 */
export async function encerrarAcesso(
  sessao: Sessao,
  dados: { id: unknown; ms: unknown },
): Promise<void> {
  if (!sessao.sid) return;
  if (typeof dados.id !== "string" || !UUID.test(dados.id)) return;

  // Teto de 12 horas: é a duracao do cookie, entao nenhuma pagina pode ter
  // ficado aberta mais que isso dentro da mesma sessao. Acima disso é relogio
  // do aparelho mexendo, e um numero absurdo estragaria a media da tela.
  const ms = inteiro(dados.ms, 12 * 3600_000);
  if (ms === null) return;

  try {
    await consultar(
      `update acessos
          set visivel_ms = greatest(coalesce(visivel_ms, 0), $1)
        where id = $2 and sessao_id = $3`,
      [ms, dados.id, sessao.sid],
    );
  } catch (erro) {
    console.error("[acessos] nao encerrou:", erro);
  }
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Numero inteiro entre zero e um teto, ou `null`. Tudo aqui vem de fora. */
function inteiro(bruto: unknown, teto: number): number | null {
  if (typeof bruto !== "number" || !Number.isFinite(bruto)) return null;
  const valor = Math.round(bruto);
  if (valor < 0 || valor > teto) return null;
  return valor;
}
