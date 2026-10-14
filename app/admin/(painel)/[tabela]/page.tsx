import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CAMPO_DO_FILTRO,
  listar,
  MOTIVOS,
  obter,
  opcoesDeReferencia,
  opcoesDoFiltro,
  TETO_DA_LISTAGEM,
  textoDeDuplicado,
  type Linha,
  type Motivo,
} from "@/lib/admin/crud";
import { pendentesDoCiclo } from "@/lib/admin/lancamentos";
import { acharTabela, TABELAS, type Tabela } from "@/lib/admin/tabelas";
import { formatarMoeda } from "@/lib/portal/formato";
import { IconeMais } from "@/app/(app)/portal/_componentes/icones";
import { acaoExcluir } from "../../acoes";
import {
  investidoresParaAviso,
  PainelDeAgendamentos,
} from "../_componentes/agendamentos";
import { AvisoPassageiro } from "../_componentes/aviso";
import { FormularioDeAgendamento } from "../_componentes/formulario-agendamento";
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CabecalhoDaSecao,
} from "../_componentes/cabecalho";
import { EnviarAgora } from "../_componentes/enviar-agora";
import { Folha } from "../_componentes/folha";
import { GRUPOS } from "../_componentes/grupos";
import { PainelDeLancamentos } from "../_componentes/lancamentos";
import { BotaoExcluir } from "./botao-excluir";
import { RedefinirSenha } from "./redefinir-senha";
import { FiltroDaListagem } from "./filtro";
import { Formulario } from "./formulario";
import {
  TabelaDeRegistros,
  type ColunaDaTabela,
  type LinhaDaTabela,
} from "./tabela-registros";

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

/* ------------------------------------------------------------ celulas -- */

/**
 * Como cada coluna se desenha. Sai do tipo do campo no registro, e nao de uma
 * lista por tabela: o "Valor" do contrato, do aditivo e do credito sao o mesmo
 * dinheiro, e a regra de formatar real mora num lugar só.
 *
 * Ate aqui so as colunas listadas em `colunasMoeda` saiam formatadas. O resto
 * ia cru do banco: `50000.00` no valor do contrato, `0.02300` na participacao.
 */
type Formato =
  | "moeda"
  | "percentual"
  | "data"
  | "numero"
  | "referencia"
  | "escolha"
  | "progresso"
  | "selo"
  | "texto";

function formatoDe(tabela: Tabela, coluna: string): Formato {
  const campo = tabela.campos.find((c) => c.nome === coluna);
  if (tabela.progresso?.includes(coluna)) return "progresso";
  if (tabela.selos?.[coluna]) return "selo";
  if (tabela.colunasMoeda?.includes(coluna) || campo?.tipo === "dinheiro") {
    return "moeda";
  }
  if (campo?.tipo === "percentual") return "percentual";
  if (campo?.tipo === "data") return "data";
  if (campo?.tipo === "numero") return "numero";
  if (campo?.tipo === "referencia") return "referencia";
  if (campo?.tipo === "escolha") return "escolha";
  return "texto";
}

/** O titulo da coluna: o rotulo do campo, ou o declarado no registro. */
function cabecalhoDe(tabela: Tabela, coluna: string): string {
  return (
    tabela.campos.find((c) => c.nome === coluna)?.rotulo ??
    tabela.cabecalhos?.[coluna] ??
    (coluna === "criado_em" ? "Criado em" : coluna)
  );
}

/** "Fundação" e "fundacao" sao a mesma busca — a mesma regra do cliente. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * Coluna `date` chega como `Date` a meia-noite **local** do servidor. As partes
 * locais devolvem o dia gravado; um `toLocaleDateString` com outro fuso o
 * empurraria para a vespera.
 */
function partesDaData(data: Date) {
  const iso = `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
  const texto = `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
  return { iso, texto };
}

/** "2,6%" — sem os zeros que o `numeric(6,5)` do banco carrega. */
function percentual(decimal: number): string {
  return `${Number((decimal * 100).toFixed(3)).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  })}%`;
}

const comInicial = (texto: string) =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

type Celula = {
  no: React.ReactNode;
  /** O que a celula diz, em texto — para a busca e para o contexto. */
  texto: string;
  ordem: string | number | null;
};

function celula(
  tabela: Tabela,
  coluna: string,
  valor: unknown,
  rotulos: Map<string, string>,
): Celula {
  if (valor === null || valor === undefined || valor === "") {
    const vazio = tabela.vazios?.[coluna];
    return {
      no: <span className="text-neutral-400">{vazio ?? "—"}</span>,
      texto: vazio ?? "",
      ordem: null,
    };
  }

  const formato = formatoDe(tabela, coluna);

  if (valor instanceof Date) {
    if (formato === "data") {
      const { iso, texto } = partesDaData(valor);
      return { no: <span className="tabular-nums">{texto}</span>, texto, ordem: iso };
    }
    // Carimbo de hora (`criado_em`): o dia de Brasilia, e nao o do servidor.
    const texto = valor.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    return {
      no: <span className="text-neutral-600 tabular-nums">{texto}</span>,
      texto,
      ordem: valor.getTime(),
    };
  }

  // O driver devolve `numeric` como texto, para nao perder precisao.
  const numero = Number(valor);

  if (formato === "moeda" && Number.isFinite(numero)) {
    const texto = formatarMoeda(numero);
    return { no: texto, texto, ordem: numero };
  }

  if (formato === "percentual" && Number.isFinite(numero)) {
    const texto = percentual(numero);
    return { no: texto, texto, ordem: numero };
  }

  if (formato === "numero" && Number.isFinite(numero)) {
    const texto = numero.toLocaleString("pt-BR");
    return { no: texto, texto, ordem: numero };
  }

  /*
   * O percentual da etapa como barra: a lista de etapas se le de relance pelo
   * comprimento, e "37,5" sozinho pede para ser comparado de cabeca com os
   * vizinhos.
   */
  if (formato === "progresso" && Number.isFinite(numero)) {
    const texto = `${numero.toLocaleString("pt-BR")}%`;
    const cheio = numero >= 100;
    return {
      no: (
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-100"
          >
            <span
              className={`block h-full rounded-full ${cheio ? "bg-verde" : "bg-marinho"}`}
              style={{ width: `${Math.min(100, Math.max(0, numero))}%` }}
            />
          </span>
          <span className="w-12 font-medium tabular-nums text-tinta">
            {texto}
          </span>
        </span>
      ),
      texto,
      ordem: numero,
    };
  }

  const bruto = String(valor);

  if (formato === "selo") {
    const regra = tabela.selos?.[coluna];
    const tom = regra?.ok?.includes(bruto)
      ? "bg-emerald-50 text-verde ring-emerald-200"
      : regra?.alerta?.includes(bruto)
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-zinc-50 text-neutral-600 ring-zinc-200";
    const texto = comInicial(bruto);
    return {
      no: (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tom}`}
        >
          {texto}
        </span>
      ),
      texto,
      ordem: normalizar(texto),
    };
  }

  if (formato === "referencia") {
    const texto = rotulos.get(bruto) ?? bruto;
    return { no: texto, texto, ordem: normalizar(texto) };
  }

  if (formato === "escolha") {
    const texto = comInicial(bruto);
    return { no: texto, texto, ordem: normalizar(texto) };
  }

  /*
   * Texto livre — observacao, titulo de aviso — corta numa largura e mostra o
   * resto no `title`. Sem teto, uma observacao comprida esticava a coluna e
   * empurrava as acoes para fora da tela.
   */
  return {
    no: (
      <span className="block max-w-[22rem] truncate" title={bruto}>
        {bruto}
      </span>
    ),
    texto: bruto,
    ordem: normalizar(bruto),
  };
}

/**
 * De quem é o registro, em uma linha: as primeiras colunas da listagem.
 *
 * "Douglas · Turmalina Tower · 10/09/2025" diz qual contrato é, no titulo da
 * edicao e na pergunta de excluir. As colunas da frente sao as que o registro
 * escolheu para identificar a linha — é por isso que estao na frente.
 */
function contextoDe(celulas: Celula[]): string {
  return celulas
    .slice(0, 3)
    .map((c) => c.texto)
    .filter(Boolean)
    .join(" · ");
}

/* ------------------------------------------------------------- acoes -- */

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

/** As acoes da linha: link discreto, que ganha fundo no hover. */
const ACAO =
  "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-marinho transition-colors duration-200 hover:bg-indigo-50 hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul";

/** A frase da recusa que voltou na URL — montada aqui, nunca lida dela. */
function textoDaRecusa(
  tabela: Tabela,
  erro?: string,
  onde?: string,
  campo?: string,
  motivo?: string,
): { texto: string; campo?: string } | undefined {
  if (erro === "duplicado") return { texto: textoDeDuplicado(onde) };
  if (erro !== "invalido") return undefined;

  const alvo = tabela.campos.find((c) => c.nome === campo);
  const frase =
    motivo && motivo in MOTIVOS ? MOTIVOS[motivo as Motivo] : MOTIVOS.formato;
  return alvo
    ? { texto: `${alvo.rotulo} ${frase}.`, campo: alvo.nome }
    : { texto: `Um dos campos ${frase}.` };
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
    /** O id do investidor cuja senha vai ser redefinida, em Investidores. */
    senha?: string;
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
    /** O campo e o motivo de um valor recusado. Ver `MOTIVOS`. */
    campo?: string;
    motivo?: string;
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
    senha,
    lancar,
    enviar,
    agendar,
    f,
    mes,
    ok,
    aviso,
    erro,
    onde,
    campo,
    motivo,
    entregues,
    aparelhos,
    pessoas,
  } = await searchParams;

  // Slug desconhecido vira 404 — nunca chega ao SQL.
  const tabela = acharTabela(slug);
  if (!tabela) notFound();

  const singular = tabela.singular ?? "registro";
  const feminino = Boolean(tabela.feminino);

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
      senha,
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

  const [linhas, rotulos, emEdicao, opcoesDoSeletor, ciclo] = await Promise.all(
    [
      listar(tabela, filtro),
      mapaDeRotulos(tabela),
      editar ? obter(tabela, editar) : Promise.resolve(undefined),
      /*
       * `opcoesDoFiltro`, e nao `opcoesDeReferencia`: o seletor do topo so
       * oferece o que tem linha. O formulario continua com a lista inteira —
       * ver a nota da funcao em `lib/admin/crud.ts`.
       */
      campoReferencia
        ? opcoesDoFiltro(tabela, campoReferencia)
        : Promise.resolve([]),
      // So Recebimentos mostra quantos faltam lancar.
      tabela.slug === "recebimentos"
        ? pendentesDoCiclo()
        : Promise.resolve(null),
    ],
  );

  /*
   * O formulario aparece ao criar e ao editar. Fechado, sobra a listagem.
   *
   * Editar so abre se o registro existe: um id que nao é de ninguem (apagado
   * em outra aba, colado errado) abria o formulario de *criar* com o titulo de
   * editar — e salvar ali cadastrava uma linha nova.
   */
  const formularioAberto =
    !tabela.semFormulario && (Boolean(novo) || Boolean(emEdicao));

  /*
   * Quem vai ter a senha redefinida — achado na lista que ja veio, e nao numa
   * consulta nova.
   *
   * Duas coisas de graca: uma ida a menos ao banco, e a checagem de escopo. A
   * listagem de Investidores ja aplica `tipo = 'investidor'` (o `onde` do
   * registro), entao um id que nao esteja nela nao é encontrado aqui e a folha
   * nao abre — sem consulta extra e sem revelar que aquele id existe.
   *
   * Vale como conveniencia, e nao como a guarda: quem barra de verdade é o
   * `where` da propria acao, porque Server Action responde a POST direto, sem
   * passar por esta pagina.
   */
  const investidorDaSenha =
    senha && tabela.tabela === "usuarios"
      ? linhas.find((l: Linha) => String(l.id) === senha)
      : undefined;

  /* -------------------------------------------------- a listagem -- */

  const colunas: ColunaDaTabela[] = tabela.colunas.map((c) => {
    const formato = formatoDe(tabela, c);
    return {
      chave: c,
      rotulo: cabecalhoDe(tabela, c),
      numero:
        formato === "moeda" || formato === "percentual" || formato === "numero",
    };
  });

  const linhasDaTabela: LinhaDaTabela[] = linhas.map((linha: Linha) => {
    const id = String(linha.id);
    const celulas = tabela.colunas.map((c) =>
      celula(tabela, c, linha[c], rotulos),
    );
    const contexto = contextoDe(celulas);
    const editarHref = comParametros({ editar: id, senha: null, novo: null });

    /*
     * A primeira celula abre a edicao. Era preciso caçar o "Editar" no fim da
     * linha, a uma tabela inteira de distancia do nome que se estava lendo — e
     * clicar no nome é o que se tenta primeiro.
     */
    const [primeira, ...resto] = celulas.map((c) => c.no);
    const abertura = tabela.semFormulario ? (
      <span className="font-medium text-tinta">{primeira}</span>
    ) : (
      <Link
        href={editarHref}
        className="font-semibold text-tinta underline-offset-2 transition-colors duration-200 hover:text-marinho hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-azul"
      >
        {primeira}
      </Link>
    );

    return {
      id,
      busca: normalizar(celulas.map((c) => c.texto).join(" ")),
      ordem: celulas.map((c) => c.ordem),
      celulas: [abertura, ...resto],
      acoes: (
        <>
          {/*
           * O arquivo anexado, quando ha um.
           *
           * So aparece na linha que tem: um "Ver documento" apagado em vinte
           * contratos sem PDF seria uma promessa falsa vinte vezes, e a
           * ausencia do botao ja é a resposta de que nao ha o que ver.
           *
           * `<a>` cru, e nao `<Link>`: o destino nao é uma pagina do app, é um
           * 302 para o Storage. O `Link` faria prefetch dele, e cada prefetch
           * gastaria uma assinatura de 60s e uma linha de auditoria dizendo que
           * alguem abriu um contrato que ninguem abriu.
           *
           * Aba nova para a listagem nao se perder — quem confere documento
           * costuma conferir varios seguidos —, com `noopener` porque `_blank`
           * sem ele entrega `window.opener` ao destino.
           */}
          {arquivo && linha[arquivo.nome] ? (
            <a
              href={`/admin/arquivo/${tabela.slug}/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={ACAO}
            >
              {verboDe(arquivo.aceita)}
            </a>
          ) : null}
          {/*
           * Só em Investidores: é a unica tabela com senha, e o recorte da
           * listagem (`onde`) ja garante que aqui só ha investidor. A acao
           * repete essa condicao no `where`, para um id colado na URL nao
           * alcancar um administrador.
           */}
          {tabela.tabela === "usuarios" && (
            <Link
              href={comParametros({ senha: id, editar: null, novo: null })}
              className={ACAO}
            >
              Redefinir senha
            </Link>
          )}
          {!tabela.semFormulario && (
            <Link href={editarHref} className={ACAO}>
              Editar
            </Link>
          )}
          {/* Formulario proprio: excluir muda o servidor, entao precisa ser
              POST, e nao um link que qualquer prefetch dispararia. */}
          <form
            action={acaoExcluir.bind(null, tabela.slug, id)}
            className="inline"
          >
            {f && <input type="hidden" name={CAMPO_DO_FILTRO} value={f} />}
            <BotaoExcluir
              oQue={`${feminino ? "a" : "o"} ${singular}${
                contexto ? ` “${contexto}”` : ""
              }`}
            />
          </form>
        </>
      ),
    };
  });

  /* ------------------------------------------------------ avisos -- */

  const recusa = textoDaRecusa(tabela, erro, onde, campo, motivo);

  /*
   * O aviso passageiro de sucesso. O genero vem do registro: "Contrato
   * criado", "Etapa criada".
   */
  const Singular = comInicial(singular);
  const sucesso =
    ok === "criado"
      ? `${Singular} ${feminino ? "cadastrada" : "cadastrado"}.`
      : ok === "salvo"
        ? "Alterações salvas."
        : ok === "excluido"
          ? `${Singular} ${feminino ? "excluída" : "excluído"}.`
          : null;

  /** A tabela que segurou a exclusao, pelo nome que a coluna da esquerda usa. */
  const ondeEsta =
    TABELAS.find((t) => t.tabela === onde)?.rotulo.toLowerCase() ??
    "outra tabela";

  const grupo = GRUPOS.find((g) => g.slugs.includes(tabela.slug))?.titulo;

  /*
   * O vazio com a saida certa. Filtrado e vazio é uma situacao; tabela sem
   * linha nenhuma é outra, e o caminho de cada uma é diferente.
   */
  const vazio = (
    <div className="text-center">
      <span className="block text-sm font-semibold text-tinta">
        {filtro
          ? "Nada com esse filtro."
          : `${feminino ? "Nenhuma" : "Nenhum"} ${singular} ainda.`}
      </span>
      <span className="mt-1 block text-sm text-neutral-500">
        {filtro
          ? "Escolha outra opção no filtro, ou veja a lista inteira."
          : tabela.semFormulario
            ? "As linhas aparecem aqui conforme forem sendo criadas."
            : `Comece ${feminino ? "pela primeira" : "pelo primeiro"}.`}
      </span>
      {filtro ? (
        <Link
          href={`/admin/${tabela.slug}`}
          className={`${BOTAO_SECUNDARIO} mt-4`}
        >
          Ver todos
        </Link>
      ) : (
        !tabela.semFormulario && (
          <Link
            href={comParametros({ novo: "1", editar: null })}
            className={`${BOTAO_PRIMARIO} mt-4`}
          >
            <IconeMais className="h-4 w-4" />
            {tabela.rotuloNovo ?? "Novo registro"}
          </Link>
        )
      )}
    </div>
  );

  return (
    <>
      {/*
       * O titulo da secao vem primeiro, sempre — mesmo nas telas que abrem com
       * um painel de trabalho. Ele estava depois deles em Recebimentos e
       * Notificacoes, e a pagina comecava por um `<h2>`.
       */}
      <CabecalhoDaSecao
        titulo={tabela.rotulo}
        grupo={grupo}
        acessorio={
          <>
            {/*
             * Recebimentos: lancar o ciclo é a tarefa do mes, e por isso é o
             * botao cheio — com quantos faltam ao lado. O cadastro avulso
             * continua existindo, para o credito que fugiu da regra, mas
             * recuado.
             */}
            {ciclo && (
              <Link
                href={comParametros({ lancar: "1" })}
                className={
                  ciclo.pendentes > 0 ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO
                }
              >
                Lançar créditos
                {ciclo.pendentes > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 text-xs font-bold tabular-nums">
                    {ciclo.pendentes}
                  </span>
                )}
              </Link>
            )}

            {/* Notificacoes nao tem CRUD — o "novo" dela sao estes dois jeitos
                de mandar, e cada um abre a propria folha. */}
            {tabela.slug === "notificacoes" && (
              <>
                <Link
                  href={comParametros({ agendar: "1", enviar: null })}
                  className={BOTAO_SECUNDARIO}
                >
                  Agendar envio
                </Link>
                <Link
                  href={comParametros({ enviar: "1", agendar: null })}
                  className={BOTAO_PRIMARIO}
                >
                  Enviar aviso agora
                </Link>
              </>
            )}

            {!tabela.semFormulario && (
              <Link
                href={comParametros({ novo: "1", editar: null })}
                className={ciclo ? BOTAO_SECUNDARIO : BOTAO_PRIMARIO}
              >
                <IconeMais className="h-4 w-4" />
                {tabela.rotuloNovo ?? "Novo registro"}
              </Link>
            )}
          </>
        }
      />

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
       * Notificacoes: as duas folhas de envio, e a lista do que ja esta
       * agendado. A lista fica na pagina — é dado, como a tabela de baixo; os
       * formularios sobem por cima, como todo "novo" do painel.
       */}
      {tabela.slug === "notificacoes" && (
        <>
          {enviar && (
            <Folha
              titulo="Enviar aviso agora"
              fechar={comParametros({ enviar: null })}
            >
              <EnviarAgora fechar={comParametros({ enviar: null })} />
            </Folha>
          )}

          {agendar && (
            <Folha
              titulo="Agendar envio"
              fechar={comParametros({ agendar: null })}
            >
              <FormularioDeAgendamento
                investidores={await investidoresParaAviso()}
                fechar={comParametros({ agendar: null })}
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
        <p
          role="alert"
          className="mt-6 animate-surgir rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
        >
          <span className="font-semibold">Não foi possível excluir.</span> Há
          registros em <span className="font-semibold">{ondeEsta}</span> que
          dependem {feminino ? "desta" : "deste"} {singular}, e o banco recusa a
          exclusão para não levar esses registros junto. Apague ou mude esses
          registros primeiro.
        </p>
      )}

      {/* A recusa de um formulario mora dentro da folha (ver `Formulario`).
          Aqui so cai a que voltou sem folha para abrir. */}
      {recusa && !formularioAberto && (
        <p
          role="alert"
          className="mt-6 animate-surgir rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
        >
          <span className="font-semibold">Não foi possível salvar.</span>{" "}
          {recusa.texto}
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

      {sucesso && (
        <AvisoPassageiro
          // `key` no texto: duas exclusoes seguidas tem a mesma frase, e sem
          // remontar o segundo aviso nao apareceria.
          key={`${ok}-${linhas.length}`}
          texto={sucesso}
          limpar={["ok"]}
        />
      )}

      {/*
       * O formulario sobe por cima de tudo, e nao mais acima da tabela.
       *
       * Vale para criar e para editar: é o mesmo componente, e um formulario que
       * abre num lugar ao criar e em outro ao editar seria a mesma peca com duas
       * gramaticas. Fechar volta para a listagem com o filtro e o resto da URL
       * intactos — ver `comParametros`.
       */}
      {formularioAberto && (
        <Folha
          titulo={
            editar
              ? `Editar ${singular}`
              : (tabela.rotuloNovo ?? "Novo registro")
          }
          fechar={comParametros({ novo: null, editar: null })}
        >
          <Formulario
            tabela={tabela}
            linha={emEdicao}
            filtro={filtro}
            contexto={
              emEdicao
                ? contextoDe(
                    tabela.colunas.map((c) =>
                      celula(tabela, c, emEdicao[c], rotulos),
                    ),
                  )
                : undefined
            }
            recusa={recusa}
            fechar={comParametros({ novo: null, editar: null })}
          />
        </Folha>
      )}

      {/*
       * A folha de redefinir senha, na mesma gramatica das outras: sobe por
       * cima, e fechar volta para a listagem com o filtro intacto.
       *
       * `investidorDaSenha` sai da lista ja carregada, e nao de uma consulta
       * nova: a linha esta ali. Se o id da URL nao for de ninguem que a
       * listagem mostra, a folha simplesmente nao abre — o mesmo silencio que
       * um `editar` invalido produz.
       */}
      {investidorDaSenha && (
        <Folha
          titulo="Redefinir senha"
          fechar={comParametros({ senha: null })}
        >
          <RedefinirSenha
            id={String(investidorDaSenha.id)}
            nome={String(investidorDaSenha.nome ?? "este investidor")}
          />
        </Folha>
      )}

      {/* Em Notificacoes a tabela é o historico, e vem depois dos envios
          automaticos — sem um titulo, ela parecia continuacao deles. */}
      {tabela.slug === "notificacoes" && (
        <h2 className="mt-10 text-base font-bold tracking-tight text-tinta">
          Histórico de envios
        </h2>
      )}

      <TabelaDeRegistros
        colunas={colunas}
        linhas={linhasDaTabela}
        singular={singular}
        plural={tabela.rotulo.toLowerCase()}
        vazio={vazio}
        cortada={linhas.length >= TETO_DA_LISTAGEM}
        filtro={
          campoReferencia ? (
            <FiltroDaListagem
              rotulo={campoReferencia.rotulo}
              parametro="f"
              opcoes={opcoesDoSeletor}
              selecionado={f ?? ""}
              destino={`/admin/${tabela.slug}`}
              // Trocar de contrato nao fecha o formulario nem o painel.
              atuais={{ editar, novo, lancar, mes }}
            />
          ) : undefined
        }
      />
    </>
  );
}
