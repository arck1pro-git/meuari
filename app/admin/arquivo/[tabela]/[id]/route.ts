import { NextResponse } from "next/server";
import { sessaoValida } from "@/lib/auth";
import { ident } from "@/lib/admin/crud";
import { acharTabela } from "@/lib/admin/tabelas";
import { registrar } from "@/lib/auditoria";
import { consultar } from "@/lib/db";
import { assinarLeitura } from "@/lib/storage";

/**
 * O arquivo de um registro do painel — o contrato assinado, o aditivo, o papel
 * da obra, a foto.
 *
 * O painel guardava esses arquivos e nao os mostrava: a coluna existia no
 * formulario, entao dava para *trocar* o PDF de um contrato, mas nao para abrir
 * o que ja estava la sem antes enviar outro por cima.
 *
 * **Rota separada da do investidor** (`app/arquivo/[escopo]/[id]`), e nao um
 * parametro dentro dela. As duas dao no mesmo bucket, mas por autorizacoes
 * diferentes: la o direito vem da *posse* — a consulta exige
 * `usuario_id = sessao.id` —, aqui vem do *papel*. Juntar as duas seria escrever
 * um `if (admin)` que pula a clausula de posse, e um dia alguem chama esse
 * caminho com o booleano errado. Separadas, cada uma diz a sua regra inteira.
 *
 * **Nada vem da requisicao para o SQL.** O slug escolhe uma linha do registro de
 * `lib/admin/tabelas.ts`; dele saem o nome da tabela, o nome da coluna e o
 * bucket, e os dois nomes ainda passam por `ident()`. O que nao estiver no
 * registro nao existe aqui — mesma regra do CRUD.
 */

/** O tempo de o navegador seguir o redirecionamento, e nada alem disso. */
const VALIDADE_SEGUNDOS = 60;

/**
 * 404 para tudo que nao dá certo — sem sessao, sem ser administrador, slug
 * torto, id inexistente, registro sem arquivo.
 *
 * O mesmo criterio da rota do investidor: um 403 confirmaria que aquele id
 * existe. Aqui a diferenca importa menos, porque quem chega ja é administrador
 * ou nao chega — mas uma porta que responde igual em todos os casos é uma porta
 * a menos para ler.
 */
function naoEncontrado() {
  return new NextResponse("Nao encontrado", {
    status: 404,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ tabela: string; id: string }> },
) {
  const { tabela: slug, id } = await params;

  /*
   * A guarda mora aqui, e nao só no layout do painel: rota de manipulador nao
   * passa por layout nenhum. É a mesma razao pela qual toda Server Action do
   * admin repete a checagem — ver `exigirAdmin` em `app/admin/acoes.ts`.
   */
  const sessao = await sessaoValida();
  if (sessao?.tipo !== "administrador") return naoEncontrado();

  const tabela = acharTabela(slug);
  if (!tabela) return naoEncontrado();

  /*
   * O campo de arquivo é declarado, nao adivinhado: quem diz em que bucket
   * aquele registro guarda o arquivo é o registro. Tabela sem campo de arquivo
   * — investidores, recebimentos — nao tem o que servir.
   */
  const campo = tabela.campos.find((c) => c.tipo === "arquivo");
  if (!campo?.bucket) return naoEncontrado();

  const [linha] = await consultar<{ caminho: string | null }>(
    `select ${ident(campo.nome)} as caminho
       from ${ident(tabela.tabela)}
      where id = $1`,
    [id],
  );
  if (!linha?.caminho) return naoEncontrado();

  const url = await assinarLeitura(
    campo.bucket,
    linha.caminho,
    VALIDADE_SEGUNDOS,
  );
  // Arquivo apagado no bucket: a assinatura falha e o efeito, para quem pediu,
  // é o mesmo de nao existir.
  if (!url) return naoEncontrado();

  /*
   * Registrado como leitura de documento, igual ao download do investidor.
   *
   * "Quem abriu o contrato de quem" é a pergunta que essa trilha responde, e a
   * resposta tem de valer tambem quando quem abriu foi o administrador —
   * especialmente quando foi ele, que alcanca o arquivo de todo mundo.
   */
  await registrar({
    acao: "download",
    alvoTabela: tabela.tabela,
    alvoId: id,
    detalhe: { por: "admin", campo: campo.nome, bucket: campo.bucket },
  });

  /*
   * 302 e nao 307: o destino é sempre um GET no Storage. `no-store` para o
   * navegador nao guardar o redirecionamento — a assinatura morre em um minuto,
   * e um redirecionamento em cache apontaria para ela depois de morta.
   */
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "cache-control": "no-store" },
  });
}
