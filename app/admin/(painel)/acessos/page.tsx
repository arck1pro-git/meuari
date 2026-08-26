import {
  pessoasComAcesso,
  porAparelho,
  porHora,
  porSecao,
  resumoDeAcessos,
  sessoesDeAcesso,
  usuarioDaUrl,
  TETO_DE_SESSOES,
  type SessaoDeAcesso,
} from "@/lib/admin/acessos";
import { resolverPeriodo } from "@/lib/admin/periodo";
import { dataDeReferencia } from "@/lib/portal/dados";
import { formatarDataCurta } from "@/lib/portal/formato";
import { Bloco, Indicador } from "../_componentes/blocos";
import { CabecalhoDaSecao } from "../_componentes/cabecalho";
import { GraficoDeHoras } from "../_componentes/graficos";
import { FiltrosDeAcesso } from "./filtros";

/**
 * Como o portal esta sendo usado: quem entrou, quando, por quanto tempo, por
 * quais abas e de que aparelho.
 *
 * É a contraparte do Dashboard. Aquele responde sobre o dinheiro; este responde
 * sobre as pessoas — e as duas perguntas viviam sem tela: ate aqui o banco
 * guardava `audit_logs`, que registra **escrita** ("quem mudou esta taxa"), e
 * nada dizia que o investidor abriu o app terca de manha pelo celular.
 *
 * Tudo o que aparece vem de `acessos`, uma linha por tela aberta. A sessao é
 * derivada no `group by` — ver `lib/admin/acessos.ts`, que explica em detalhe
 * como a duracao é apurada e por que ela é **um piso**, e nunca um numero
 * exato.
 *
 * ---
 *
 * **O que esta tela nao mostra, e convem saber antes de tirar conclusao:**
 *
 * - **O /admin nao é medido.** Quem administra passa o dia nestas telas, e
 *   contar isso junto afogaria o uso do investidor, que é o que se quer ver.
 * - **Sem JavaScript nao ha linha.** O registro parte do navegador.
 * - **Cidade e aparelho sao palpite informado.** O `user-agent` é declarado
 *   pelo proprio navegador e a cidade vem do IP, que erra e some atras de VPN.
 *   Serve para ler tendencia, nunca como prova de quem estava onde.
 *
 * **E uma nota que nao é tecnica:** IP, cidade e trilha de navegacao amarrados
 * a uma pessoa nomeada sao dado pessoal na LGPD. Vale definir por quanto tempo
 * `acessos` guarda linha — um `delete` por `criado_em` mais velho que doze
 * meses resolve — e dizer isso na politica de privacidade.
 */
export const dynamic = "force-dynamic";

/** O nome de cada aba, como a pessoa a ve no portal. */
const NOME_DA_SECAO: Record<string, string> = {
  portal: "Meus aportes",
  obras: "Obras",
  simulador: "Simulador",
  perfil: "Perfil",
  galeria: "Galeria",
};

const NOME_DO_APARELHO: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
  desconhecido: "Não identificado",
};

function nomeDaSecao(slug: string): string {
  // A rota nova que ninguem lembrou de nomear aparece pelo slug, e nao some.
  return NOME_DA_SECAO[slug] ?? slug;
}

function nomeDoAparelho(slug: string | null): string {
  if (!slug) return NOME_DO_APARELHO.desconhecido;
  return NOME_DO_APARELHO[slug] ?? slug;
}

/**
 * Duracao em palavra curta.
 *
 * Sem segundos acima de um minuto: "6 min 12 s" sugere uma precisao que a
 * medida nao tem — ver a nota sobre o piso em `lib/admin/acessos.ts`. Abaixo de
 * um minuto os segundos aparecem, porque ali a diferenca entre 5 s e 50 s é a
 * diferenca entre passar pela tela e olhar para ela.
 */
function formatarDuracao(ms: number): string {
  const segundos = Math.round(ms / 1000);
  if (segundos < 60) return `${segundos} s`;

  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** "Goiânia · GO", ou o que houver. */
function lugarDe(sessao: SessaoDeAcesso): string | null {
  const partes = [sessao.cidade, sessao.regiao ?? sessao.pais].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

export default async function AcessosPage({
  searchParams,
}: {
  /** `d` = periodo ou dia, `u` = pessoa. Ver `FiltrosDeAcesso`. */
  searchParams: Promise<{ d?: string; u?: string }>;
}) {
  const { d, u } = await searchParams;
  // O "hoje" vem do banco, no fuso de Brasilia — o mesmo `dataDeReferencia` que
  // o Dashboard usa. `resolverPeriodo` é pura e o recebe pronto.
  const periodo = resolverPeriodo(d, await dataDeReferencia());
  const usuario = usuarioDaUrl(u);

  /*
   * As seis de uma vez: nenhuma depende do resultado da outra, e em serie a
   * tela pagaria seis idas ao banco somadas. O `loading.tsx` ao lado cobre a
   * espera.
   */
  const [resumo, aparelhos, secoes, horas, sessoes, pessoas] = await Promise.all(
    [
      resumoDeAcessos(periodo, usuario),
      porAparelho(periodo, usuario),
      porSecao(periodo, usuario),
      porHora(periodo, usuario),
      sessoesDeAcesso(periodo, usuario),
      pessoasComAcesso(),
    ],
  );

  const filtros = (
    <FiltrosDeAcesso
      periodo={periodo}
      pessoas={pessoas}
      usuario={usuario}
      hoje={periodo.hoje}
    />
  );

  if (resumo.paginas === 0) {
    return (
      <>
        <CabecalhoDaSecao titulo="Acessos" />
        {filtros}
        <p className="mt-4 animate-surgir rounded-xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-neutral-500">
          {/* Duas ausencias diferentes, e a diferenca importa: "ninguem entrou
              terca" é um dado, "nada foi registrado ainda" é uma tela que
              acabou de nascer. Uma frase só para as duas faria quem acabou de
              ligar a medicao achar que ela nao funciona. */}
          {pessoas.length === 0 ? (
            <>
              Nenhum acesso registrado ainda. As visitas ao portal aparecem aqui
              a partir do próximo login — cada tela aberta vira uma linha.
            </>
          ) : (
            <>
              Nenhum acesso em <strong>{periodo.rotulo.toLowerCase()}</strong>
              {usuario && " para esta pessoa"}. Experimente um período maior.
            </>
          )}
        </p>
      </>
    );
  }

  // Para as barras proporcionais dos dois blocos do meio.
  const maiorAparelho = Math.max(...aparelhos.map((a) => a.sessoes));
  const maiorSecao = Math.max(...secoes.map((s) => s.aberturas));

  return (
    <>
      <CabecalhoDaSecao titulo="Acessos" />
      {filtros}

      {/* A faixa: larga, baixa e dividida por filetes — a mesma do Dashboard, e
          pelo mesmo motivo. Os quatro numeros se leem numa passada horizontal. */}
      <dl className="mt-4 grid animate-surgir grid-cols-2 divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x">
        <Indicador
          rotulo="Sessões"
          valor={String(resumo.sessoes)}
          apoio={`${resumo.pessoas} ${
            resumo.pessoas === 1 ? "pessoa diferente" : "pessoas diferentes"
          }`}
          destaque
        />
        <Indicador
          rotulo="Tempo médio"
          valor={formatarDuracao(resumo.mediaMs)}
          apoio="por sessão, no mínimo"
        />
        <Indicador
          rotulo="Telas abertas"
          valor={String(resumo.paginas)}
          apoio={
            resumo.sessoes > 0
              ? `${(resumo.paginas / resumo.sessoes).toFixed(1)} por sessão`
              : "—"
          }
        />
        <Indicador
          rotulo="Pelo app instalado"
          valor={String(resumo.instaladas)}
          apoio={`de ${resumo.sessoes} ${
            resumo.sessoes === 1 ? "sessão" : "sessões"
          }`}
        />
      </dl>

      {/*
       * A que horas se entra. Linha inteira porque se le da esquerda para a
       * direita, como a curva de captacao do Dashboard: espremido ao lado de
       * outro bloco, as vinte e quatro barras se encostam.
       *
       * É o bloco com a consequencia mais direta: o portal dispara notificacao,
       * e o horario em que as pessoas ja estao olhando nao é o mesmo em que é
       * comodo agendar o envio.
       */}
      <div className="escalonar mt-4">
        <Bloco
          titulo="Por hora do dia"
          apoio="Quando as telas são abertas, no horário de Brasília."
        >
          <GraficoDeHoras faixas={horas} />
        </Bloco>
      </div>

      {/* Os dois cortes do mesmo uso, lado a lado: em que aparelho, e para
          fazer o quê. Separados em blocos distantes, ninguem repara que a
          coluna da direita é o que aconteceu dentro da esquerda. */}
      <div className="escalonar mt-4 grid gap-4 lg:grid-cols-2">
        <Bloco
          titulo="Por aparelho"
          apoio="Sessões em cada tipo de tela, pelo que o navegador declara."
        >
          <dl className="divide-y divide-zinc-200 border-t border-zinc-200">
            {aparelhos.map((aparelho) => (
              <LinhaComBarra
                key={aparelho.dispositivo}
                rotulo={nomeDoAparelho(aparelho.dispositivo)}
                valor={aparelho.sessoes}
                apoio={`${aparelho.paginas} ${
                  aparelho.paginas === 1 ? "tela" : "telas"
                }`}
                proporcao={aparelho.sessoes / maiorAparelho}
              />
            ))}
          </dl>
        </Bloco>

        <Bloco
          titulo="Abas abertas"
          apoio="Quantas vezes cada seção do portal foi aberta."
        >
          <dl className="divide-y divide-zinc-200 border-t border-zinc-200">
            {secoes.map((secao) => (
              <LinhaComBarra
                key={secao.secao}
                rotulo={nomeDaSecao(secao.secao)}
                valor={secao.aberturas}
                apoio={`${secao.pessoas} ${
                  secao.pessoas === 1 ? "pessoa" : "pessoas"
                }`}
                proporcao={secao.aberturas / maiorSecao}
              />
            ))}
          </dl>
        </Bloco>
      </div>

      {/*
       * Uma linha por sessao, da mais recente para tras.
       *
       * É o unico bloco da tela que nao agrega: tudo acima soma o periodo, e
       * aqui se olha uma visita de cada vez — que é o que se quer quando alguem
       * pergunta "o que fulano andou vendo".
       */}
      <div className="escalonar mt-4">
        <Bloco
          titulo="Sessões"
          apoio="Cada visita ao portal, da mais recente para trás."
          acessorio={
            sessoes.length >= TETO_DE_SESSOES ? (
              <span className="shrink-0 text-xs text-neutral-500">
                Mostrando as {TETO_DE_SESSOES} mais recentes de {resumo.sessoes}
              </span>
            ) : undefined
          }
        >
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[54rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left">
                  <Cabeca>Pessoa</Cabeca>
                  <Cabeca>Início</Cabeca>
                  <Cabeca numero>Duração</Cabeca>
                  <Cabeca numero>Telas</Cabeca>
                  <Cabeca>Abas</Cabeca>
                  <Cabeca>Aparelho</Cabeca>
                  <Cabeca>Lugar</Cabeca>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {sessoes.map((sessao) => (
                  <LinhaDaSessao key={sessao.id} sessao={sessao} />
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
 * Rotulo, numero e uma barra proporcional ao maior da lista.
 *
 * Barra e nao rosca: sao listas curtas em que o que interessa é a ordem e a
 * distancia entre o primeiro e o resto. Uma rosca de tres fatias obriga a
 * comparar angulos para dizer qual é maior; a barra ja diz.
 *
 * A proporcao é contra **o maior item**, e nao contra o total: com o total, uma
 * lista bem distribuida vira cinco tocos curtos e nao se le nada.
 */
function LinhaComBarra({
  rotulo,
  valor,
  apoio,
  proporcao,
}: {
  rotulo: string;
  valor: number;
  apoio: string;
  proporcao: number;
}) {
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="min-w-0 truncate text-xs text-neutral-600">
          <span className="font-semibold text-tinta">{rotulo}</span>
          <span className="ml-1.5 text-neutral-400">· {apoio}</span>
        </dt>
        <dd className="shrink-0 text-sm font-bold tabular-nums text-tinta">
          {valor}
        </dd>
      </div>

      <div
        aria-hidden
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"
      >
        <div
          className="h-full rounded-full bg-marinho"
          // `Math.max` com um fio: proporcao muito baixa desenharia uma barra de
          // largura zero, que lê como ausencia em vez de "pouco".
          style={{ width: `${Math.max(2, proporcao * 100)}%` }}
        />
      </div>
    </div>
  );
}

function LinhaDaSessao({ sessao }: { sessao: SessaoDeAcesso }) {
  const lugar = lugarDe(sessao);

  return (
    <tr>
      <td className="py-3 pr-4">
        <span className="font-semibold text-tinta">
          {sessao.usuarioNome ?? "—"}
        </span>
      </td>

      <td className="py-3 pr-4 whitespace-nowrap text-neutral-600 tabular-nums">
        <span className="font-medium text-tinta">{sessao.hora}</span>
        <span className="ml-1.5 text-xs text-neutral-400">
          {formatarDataCurta(sessao.dia)}
        </span>
      </td>

      <td className="py-3 pr-4 text-right align-top whitespace-nowrap tabular-nums">
        <span className="font-bold text-tinta">
          {formatarDuracao(sessao.duracaoMs)}
        </span>
        {/*
         * O asterisco de quando o navegador nunca relatou o tempo visivel: ali a
         * duracao é só o intervalo entre a primeira e a ultima tela, e uma
         * sessao de uma tela só aparece como zero. Sem a marca, esse zero lê
         * como "entrou e saiu na hora", que é uma conclusao errada.
         */}
        {!sessao.medido && (
          <span
            className="ml-0.5 cursor-help text-neutral-400"
            title="O navegador não relatou o tempo de tela. O valor é só o intervalo entre a primeira e a última tela aberta."
          >
            *
          </span>
        )}
      </td>

      <td className="py-3 pr-4 text-right align-top font-medium text-neutral-600 tabular-nums">
        {sessao.paginas}
      </td>

      <td className="py-3 pr-4">
        <span className="flex flex-wrap gap-1">
          {sessao.secoes.map((secao) => (
            <span
              key={secao}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap text-neutral-600"
            >
              {nomeDaSecao(secao)}
            </span>
          ))}
        </span>
      </td>

      <td className="py-3 pr-4 align-top">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-neutral-600">
          {nomeDoAparelho(sessao.dispositivo)}
          {/* A pastilha só aparece quando é o app instalado: marcar tambem o
              caso comum encheria a coluna de rotulo que nao distingue nada. */}
          {sessao.standalone && (
            <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-marinho">
              app
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-neutral-400">
          {[sessao.sistema, sessao.navegador].filter(Boolean).join(" · ") ||
            "—"}
          {sessao.largura ? ` · ${sessao.largura}px` : ""}
        </span>
      </td>

      <td className="py-3 align-top">
        {/* O IP fica no `title`, e nao na coluna: ele responde uma pergunta que
            se faz raramente — "foi mesmo daqui?" — e ocupa largura em todas as
            linhas para isso. Acessivel a um passo, fora do caminho no resto. */}
        <span
          className="whitespace-nowrap text-neutral-600"
          title={sessao.ip ?? undefined}
        >
          {lugar ?? "—"}
        </span>
      </td>
    </tr>
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
