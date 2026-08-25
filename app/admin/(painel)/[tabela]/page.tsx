import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listar,
  obter,
  opcoesDeReferencia,
  textoDeDuplicado,
  type Linha,
} from "@/lib/admin/crud";
import { acharTabela, type Tabela } from "@/lib/admin/tabelas";
import { formatarMoeda } from "@/lib/portal/formato";
import { acaoExcluir } from "../../acoes";
import {
  investidoresParaAviso,
  PainelDeAgendamentos,
} from "../_componentes/agendamentos";
import { FormularioDeAgendamento } from "../_componentes/formulario-agendamento";
import { CabecalhoDaSecao, Contagem } from "../_componentes/cabecalho";
import { EnviarAgora } from "../_componentes/enviar-agora";
import { Folha } from "../_componentes/folha";
import { PainelDeLancamentos } from "../_componentes/lancamentos";
import { BotaoExcluir } from "./botao-excluir";
import { FiltroDaListagem } from "./filtro";
import { Formulario } from "./formulario";

export const dynamic = "force-dynamic";

/*
 * Aqui morava um `APOIOS`: uma frase por tabela, embaixo do titulo, dizendo o
 * que ela guarda. Saiu porque para quem administra ela nao dizia nada — "Fotos
 * da obra" abaixo de um titulo "Imagens" é o mesmo nome duas vezes, e ocupava a
 * primeira linha de toda tela do painel. O titulo basta.
 */

/** Legenda das chaves estrangeiras: id cru nao diz nada em tela. */
async function mapaDeRotulos(tabela: Tabela) {
  const mapa = new Map<string, string>();
  for (const campo of tabela.campos) {
    if (campo.tipo !== "referencia") continue;
    for (const o of await opcoesDeReferencia(campo)) mapa.set(o.id, o.rotulo);
  }
  return mapa;
}

/**
 * O valor de uma celula, pronto para ler.
 *
 * `moeda` formata em reais no padrao daqui — ponto no milhar, virgula no
 * decimal: `3.025.000,00`. Sem ela, o driver do Postgres entrega `numeric` como
 * a string crua do banco (`"3025000.00"`), que é o formato de quem escreve SQL e
 * nao o de quem le dinheiro.
 *
 * A conta fica aqui e nao no SQL de proposito: `to_char` do Postgres decide o
 * separador de milhar por `lc_numeric`, que no servidor nao é o do Brasil — a
 * mesma consulta sairia `3,025,000.00` em produção e certa aqui.
 */
function exibir(
  valor: unknown,
  rotulos: Map<string, string>,
  moeda = false,
): string {
  if (valor === null || valor === undefined) return "—";
  if (valor instanceof Date) return valor.toLocaleDateString("pt-BR");

  if (moeda) {
    // O driver devolve `numeric` como texto para nao perder precisao.
    const n = Number(valor);
    return Number.isFinite(n) ? formatarMoeda(n) : String(valor);
  }

  const texto = String(valor);
  return rotulos.get(texto) ?? texto;
}

/**
 * O campo de arquivo da tabela, se houver um.
 *
 * Sai do registro, e nao de um `if (slug === "contratos")`: a mesma pergunta —
 * "este registro tem arquivo anexado?" — vale para contrato, aditivo, papel de
 * obra e foto, e as quatro declaram o campo do mesmo jeito. Tabela sem campo de
 * arquivo devolve `undefined` e nao ganha coluna nenhuma.
 */
function campoDeArquivo(tabela: Tabela) {
  return tabela.campos.find((c) => c.tipo === "arquivo" && c.bucket);
}

/**
 * O que o botao diz.
 *
 * O rotulo do campo nao serve de texto de botao — "Instrumento assinado" é o
 * nome da coisa, nao a acao. O que separa um caso do outro é o `aceita`, que o
 * registro ja declara para o seletor de arquivo.
 */
function verboDe(aceita: string | undefined) {
  return aceita?.startsWith("image/") ? "Ver imagem" : "Ver documento";
}

export default async function TabelaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tabela: string }>;
  /**
   * `f` é o valor do filtro declarado no registro da tabela. `mes`, `ok` e
   * `aviso` sao do painel de lancamento, que só aparece em Recebimentos.
   */
  searchParams: Promise<{
    editar?: string;
    /** `1` abre o formulario de criar. Ver `href` mais abaixo. */
    novo?: string;
    /** `1` abre o painel de lancamento do mes, em Recebimentos. */
    lancar?: string;
    /** `1` abre o formulario de aviso imediato, em Notificacoes. */
    enviar?: string;
    /** `1` abre o formulario de envio automatico, em Notificacoes. */
    agendar?: string;
    f?: string;
    mes?: string;
    ok?: string;
    aviso?: string;
    erro?: string;
    onde?: string;
    entregues?: string;
    aparelhos?: string;
    /** Quantos investidores foram avisados ao publicar um documento. */
    pessoas?: string;
  }>;
}) {
  const { tabela: slug } = await params;
  const {
    editar,
    novo,
    lancar,
    enviar,
    agendar,
    f,
    mes,
    ok,
    aviso,
    erro,
    onde,
    entregues,
    aparelhos,
    pessoas,
  } = await searchParams;

  // Slug desconhecido vira 404 — nunca chega ao SQL.
  const tabela = acharTabela(slug);
  if (!tabela) notFound();

  // Resolvido uma vez, e nao por linha: o registro nao muda no meio da lista.
  const arquivo = campoDeArquivo(tabela);

  /*
   * So a primeira coluna declarada em `filtros` — hoje nenhuma tabela pede
   * duas, e uma fila de seletores para um caso hipotetico seria peso morto.
   */
  const campoDoFiltro = tabela.filtros?.[0];
  const campoReferencia = tabela.campos.find((c) => c.nome === campoDoFiltro);
  const filtro =
    campoDoFiltro && f ? { campo: campoDoFiltro, valor: f } : undefined;

  /*
   * Os controles do topo sao `<Link>`, e nao botoes com estado no cliente.
   *
   * O que eles fazem é mudar a URL — abrir o formulario, abrir o painel de
   * lancamento, filtrar por contrato —, e a pagina é `force-dynamic`: ela ja
   * refaz a consulta a cada navegacao. Estado no cliente aqui exigiria trazer
   * para o navegador dados que o servidor ja tem, e perderia o link
   * compartilhavel e o botao de voltar.
   *
   * Cada link **preserva o resto**: abrir o formulario nao pode zerar o filtro
   * de contrato, nem fechar o painel de lancamento.
   */
  const comParametros = (mudanca: Record<string, string | null>) => {
    const busca = new URLSearchParams();
    const atual: Record<string, string | undefined> = {
      editar,
      novo,
      lancar,
      enviar,
      agendar,
      f,
      mes,
    };
    for (const [chave, valor] of Object.entries({ ...atual, ...mudanca })) {
      if (valor) busca.set(chave, valor);
    }
    const query = busca.toString();
    return `/admin/${slug}${query ? `?${query}` : ""}`;
  };

  // O formulario aparece ao criar e ao editar. Fechado, sobra a listagem.
  const formularioAberto = Boolean(novo) || Boolean(editar);

  const [linhas, rotulos, emEdicao, opcoesDoFiltro] = await Promise.all([
    listar(tabela, filtro),
    mapaDeRotulos(tabela),
    editar ? obter(tabela, editar) : Promise.resolve(undefined),
    campoReferencia ? opcoesDeReferencia(campoReferencia) : Promise.resolve([]),
  ]);

  return (
    <>
      {/*
       * O titulo da secao vem primeiro, sempre — mesmo nas telas que abrem com
       * um painel de trabalho. Ele estava depois deles em Recebimentos e
       * Notificacoes, e a pagina comecava por um `<h2>`.
       */}
      <CabecalhoDaSecao
        titulo={tabela.rotulo}
        acessorio={
          <>
            {campoReferencia && (
              <FiltroDaListagem
                rotulo={campoReferencia.rotulo}
                parametro="f"
                opcoes={opcoesDoFiltro}
                selecionado={f ?? ""}
                destino={`/admin/${tabela.slug}`}
                // Trocar de contrato nao fecha o formulario nem o painel.
                atuais={{ editar, novo, lancar, mes }}
              />
            )}
            <Contagem total={linhas.length} />

            {/* Só em Recebimentos: é a unica tabela que tem o que lancar. O
                painel é alto — um cartao por contrato —, e abria sempre,
                empurrando a listagem para fora da tela. */}
            {tabela.slug === "recebimentos" && (
              <Link
                href={comParametros({ lancar: lancar ? null : "1" })}
                aria-pressed={Boolean(lancar)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul ${
                  lancar
                    ? "border-marinho bg-marinho text-white hover:bg-azul"
                    : "border-zinc-200 bg-white text-neutral-600 hover:border-zinc-300 hover:text-tinta"
                }`}
              >
                Para lançar
              </Link>
            )}

            {/* Notificacoes nao tem CRUD — o "novo" dela sao estes dois jeitos
                de mandar, e cada um abre a propria folha. */}
            {tabela.slug === "notificacoes" && (
              <>
                <Link
                  href={comParametros({ enviar: "1", agendar: null })}
                  className="rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-600 transition-colors duration-200 hover:border-zinc-300 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                >
                  Enviar agora
                </Link>
                <Link
                  href={comParametros({ agendar: "1", enviar: null })}
                  className="rounded-xl bg-marinho px-3.5 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
                >
                  Novo agendamento
                </Link>
              </>
            )}

            {!tabela.semFormulario && (
              <Link
                href={
                  formularioAberto
                    ? comParametros({ novo: null, editar: null })
                    : comParametros({ novo: "1", editar: null })
                }
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${
                  formularioAberto
                    ? "border border-zinc-200 bg-white text-neutral-600 hover:border-zinc-300 hover:text-tinta"
                    : "bg-marinho text-white hover:bg-azul"
                }`}
              >
                {formularioAberto
                  ? "Fechar"
                  : (tabela.rotuloNovo ?? "Novo registro")}
              </Link>
            )}
          </>
        }
      />

      {/*
       * Recebimentos abre com o painel de lancamento do mes. Lancar é o jeito
       * de criar uma linha nesta tabela — separado numa rota propria, obrigava
       * a trocar de tela para conferir o que acabou de ser gravado.
       */}
      {/*
       * O que falta lancar sobe numa folha por cima da tela, e nao mais como uma
       * secao empurrando a listagem para baixo. Sao duas leituras diferentes: a
       * listagem é o historico do que ja caiu, a folha é uma tarefa a executar —
       * e tarefa em cima de historico fazia a tela abrir por um formulario.
       *
       * O conteudo é montado no servidor e entregue como `children`: a folha nao
       * busca nada ao abrir.
       */}
      {tabela.slug === "recebimentos" && lancar && (
        <Folha
          titulo="Créditos a lançar"
          largura="max-w-3xl"
          fechar={comParametros({ lancar: null })}
        >
          <PainelDeLancamentos mes={mes} ok={ok} aviso={aviso} />
        </Folha>
      )}

      {/*
       * Notificacoes abre com os dois jeitos de mandar — na hora e por
       * repeticao —, nesta ordem. A tabela de baixo é o historico do que saiu
       * por qualquer um dos dois.
       */}
      {/*
       * Notificacoes: as duas folhas de envio, e a lista do que ja esta
       * agendado. A lista fica na pagina — é dado, como a tabela de baixo; os
       * formularios sobem por cima, como todo "novo" do painel.
       */}
      {tabela.slug === "notificacoes" && (
        <>
          {enviar && (
            <Folha
              titulo="Enviar agora"
              fechar={comParametros({ enviar: null })}
            >
              <EnviarAgora />
            </Folha>
          )}

          {agendar && (
            <Folha
              titulo="Envio automático"
              fechar={comParametros({ agendar: null })}
            >
              <FormularioDeAgendamento
                investidores={await investidoresParaAviso()}
              />
            </Folha>
          )}

          <PainelDeAgendamentos ok={ok} aviso={aviso} />
        </>
      )}

      {/*
       * Exclusao barrada por vinculo. Nao é erro de sistema: é o
       * `ON DELETE RESTRICT` das tabelas de dinheiro fazendo o trabalho dele —
       * apagar um investidor nao pode levar junto os contratos e os creditos
       * dele. A tela diz onde estao os registros que seguram, porque é de la
       * que a pessoa precisa comecar.
       */}
      {erro === "vinculo" && (
        <p className="mt-6 animate-surgir rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <span className="font-semibold">Não foi possível excluir.</span> Há
          registros em{" "}
          <span className="font-semibold">{onde ?? "outra tabela"}</span>{" "}
          apontando para este — o banco recusa a exclusão para não levar essas
          linhas junto. Apague ou reatribua esses registros primeiro.
        </p>
      )}

      {/*
       * Ja existe uma linha assim.
       *
       * Como o de vinculo acima, nao é falha de sistema: é uma restricao de
       * unicidade fazendo o trabalho dela. O caso comum é lancar o credito do
       * mes duas vezes, com uma aba aberta desde antes do primeiro lancamento —
       * e ate aqui isso dava tela de erro 500.
       *
       * A frase sai de `textoDeDuplicado`, que traduz o nome da restricao. É a
       * mesma fonte que a acao usou para decidir que o erro era tratavel.
       */}
      {erro === "duplicado" && (
        <p className="mt-6 animate-surgir rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <span className="font-semibold">Não foi possível salvar.</span>{" "}
          {textoDeDuplicado(onde)}
        </p>
      )}

      {/* O aviso chega depois de a folha fechar — ver a nota em `EnviarAgora`. */}
      {ok === "enviado" && (
        <p className="mt-6 animate-surgir rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-relaxed font-medium text-verde">
          Aviso enviado.{" "}
          {Number(aparelhos ?? 0) === 0
            ? "Nenhum aparelho está inscrito para push — ele aparece no sino quando o investidor abrir o app."
            : `Push entregue em ${entregues} de ${aparelhos} ${
                Number(aparelhos) === 1 ? "aparelho" : "aparelhos"
              }.`}
        </p>
      )}

      {/*
       * Documento publicado: quem foi avisado.
       *
       * A linha nova aparece sozinha na tabela; o push nao aparece em lugar
       * nenhum, e sem esta frase publicar um documento e publicar um documento
       * *que avisou catorze pessoas* seriam a mesma tela.
       *
       * Os dois numeros respondem perguntas diferentes: `pessoas` é quem vai
       * ver no sino ao abrir o app — todos —, e `aparelhos` é quem recebeu a
       * batida na hora. O segundo é sempre menor, e quem le precisa saber que
       * isso é normal, e nao falha.
       */}
      {ok === "avisado" && (
        <p className="mt-6 animate-surgir rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-relaxed font-medium text-verde">
          Documento publicado.{" "}
          {Number(pessoas ?? 0) === 0
            ? "Nenhum investidor tem contrato nesta obra ainda, então não havia quem avisar."
            : `${pessoas} ${
                Number(pessoas) === 1
                  ? "investidor foi avisado"
                  : "investidores foram avisados"
              } no sino${
                Number(aparelhos ?? 0) === 0
                  ? " — nenhum aparelho está inscrito para push."
                  : `, e o push saiu para ${entregues} de ${aparelhos} ${
                      Number(aparelhos) === 1 ? "aparelho" : "aparelhos"
                    }.`
              }`}
        </p>
      )}

      {/* Tabela de registro nao tem formulario: ver `semFormulario` no
          registro das tabelas. */}
      {/*
       * O formulario sobe por cima de tudo, e nao mais acima da tabela.
       *
       * Vale para criar e para editar: é o mesmo componente, e um formulario que
       * abre num lugar ao criar e em outro ao editar seria a mesma peca com duas
       * gramaticas. Fechar volta para a listagem com o filtro e o resto da URL
       * intactos — ver `comParametros`.
       */}
      {!tabela.semFormulario && formularioAberto && (
        <Folha
          titulo={
            editar ? "Editar registro" : (tabela.rotuloNovo ?? "Novo registro")
          }
          fechar={comParametros({ novo: null, editar: null })}
        >
          <Formulario tabela={tabela} linha={emEdicao} />
        </Folha>
      )}

      {/* A tabela é larga por natureza; o `overflow-x-auto` deixa ela rolar
          dentro do cartao em vez de empurrar a pagina inteira de lado. */}
      <div className="sombra-cartao mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-neutral-500">
            <tr>
              {tabela.colunas.map((c) => (
                <th
                  key={c}
                  className={`px-4 py-3 font-semibold tracking-wider whitespace-nowrap uppercase ${
                    tabela.colunasMoeda?.includes(c) ? "text-right" : ""
                  }`}
                >
                  {c}
                </th>
              ))}
              {/* A coluna das acoes nao tem nome, mas tem funcao: sem o
                  `sr-only` ela é uma celula vazia no cabecalho. */}
              <th className="px-4 py-3 text-right">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {linhas.length === 0 && (
              <tr>
                <td
                  colSpan={tabela.colunas.length + 1}
                  className="px-4 py-14 text-center"
                >
                  {/* Vazio com motivo: filtrado e vazio é outra situacao de
                      "ainda nao ha nada", e a saida de cada uma é diferente. */}
                  <span className="block text-sm font-medium text-tinta">
                    {filtro
                      ? "Nada com esse filtro."
                      : "Nenhum registro ainda."}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-500">
                    {filtro ? (
                      <Link
                        href={`/admin/${tabela.slug}`}
                        className="font-semibold text-marinho underline-offset-2 hover:underline"
                      >
                        Limpar o filtro
                      </Link>
                    ) : tabela.semFormulario ? (
                      "As linhas aparecem aqui conforme forem sendo criadas."
                    ) : (
                      "Use o formulário acima para criar o primeiro."
                    )}
                  </span>
                </td>
              </tr>
            )}

            {linhas.map((linha: Linha) => (
              <tr
                key={String(linha.id)}
                /* `group` para as acoes: elas ficam apagadas ate o ponteiro
                   entrar na linha, o que tira 20 botoes vermelhos da vista sem
                   escondê-los de quem navega por teclado — o `focus-within`
                   traz os dois de volta. */
                className="group transition-colors duration-200 hover:bg-indigo-50"
              >
                {tabela.colunas.map((c) => {
                  const dinheiro = tabela.colunasMoeda?.includes(c) ?? false;
                  return (
                    <td
                      key={c}
                      /* Dinheiro alinhado a direita e em `tabular-nums`: é assim
                         que a virgula de uma linha fica embaixo da da outra, e a
                         coluna se compara de relance. */
                      className={`px-4 py-3 whitespace-nowrap ${
                        dinheiro ? "text-right font-medium tabular-nums" : ""
                      }`}
                    >
                      {exibir(linha[c], rotulos, dinheiro)}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 opacity-45 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
                    {/*
                     * O arquivo anexado, quando ha um.
                     *
                     * So aparece na linha que tem: um "Ver documento" apagado em
                     * vinte contratos sem PDF seria uma promessa falsa vinte
                     * vezes, e a ausencia do botao ja é a resposta de que nao ha
                     * o que ver.
                     *
                     * `<a>` cru, e nao `<Link>`: o destino nao é uma pagina do
                     * app, é um 302 para o Storage. O `Link` faria prefetch
                     * dele, e cada prefetch gastaria uma assinatura de 60s e
                     * uma linha de auditoria dizendo que alguem abriu um
                     * contrato que ninguem abriu.
                     *
                     * Aba nova para a listagem nao se perder — quem confere
                     * documento costuma conferir varios seguidos —, com
                     * `noopener` porque `_blank` sem ele entrega `window.opener`
                     * ao destino.
                     */}
                    {arquivo && linha[arquivo.nome] ? (
                      <a
                        href={`/admin/arquivo/${tabela.slug}/${String(linha.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-marinho transition-colors duration-200 hover:bg-indigo-100 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                      >
                        {verboDe(arquivo.aceita)}
                      </a>
                    ) : null}
                    {!tabela.semFormulario && (
                      <Link
                        href={comParametros({
                          editar: String(linha.id),
                          novo: null,
                        })}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-marinho transition-colors duration-200 hover:bg-indigo-100 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                      >
                        Editar
                      </Link>
                    )}
                    {/* Formulario proprio: excluir muda o servidor, entao
                        precisa ser POST, e nao um link que qualquer prefetch
                        dispararia. */}
                    <form
                      action={acaoExcluir.bind(
                        null,
                        tabela.slug,
                        String(linha.id),
                      )}
                      className="inline"
                    >
                      <BotaoExcluir
                        oQue={`este registro de ${tabela.rotulo.toLowerCase()}`}
                      />
                    </form>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
