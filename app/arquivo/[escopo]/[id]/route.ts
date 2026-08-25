import { NextResponse } from "next/server";
import { sessaoValida } from "@/lib/auth";
import { registrar } from "@/lib/auditoria";
import { consultar } from "@/lib/db";
import { assinarLeitura, BUCKETS, type Bucket } from "@/lib/storage";

/**
 * A porta de todo documento privado: contrato, aditivo, papel de obra e o
 * comprovante de uma etapa.
 *
 * Antes o link na tela **era** a URL assinada, gerada ao montar a pagina. Duas
 * consequencias:
 *
 * 1. **Nao havia rastro.** A assinatura acontecia dentro de `getAportes`, no
 *    meio de uma consulta de carteira, e ninguem registrava nada. A pergunta
 *    "quem baixou o contrato de quem" nao tinha resposta — num sistema que
 *    guarda contrato de investidor, ela vai ser feita algum dia.
 * 2. **A URL valia uma hora.** Copiada do histórico do navegador, de um print ou
 *    de um log de proxy, ela servia o PDF a qualquer um por 60 minutos, sem
 *    sessao e sem como revogar.
 *
 * Agora o link aponta para ca. Esta rota confere a posse, registra e só entao
 * assina — por 60 segundos, o tempo de o navegador seguir o redirecionamento.
 *
 * **Nao fica sob `/api/`** de proposito: o `DE_MAQUINA` do `proxy.ts` dispensa a
 * guarda de sessao naquele prefixo, porque quem chama a API é o n8n. Aqui
 * queremos as duas camadas — a do proxy e a daqui.
 *
 * **Nao fica em `/documentos/`** porque `public/documentos/` existe, e arquivo
 * estatico ganha da rota.
 *
 * Imagem de obra continua com URL assinada direta, na propria consulta. Nao é
 * esquecimento: uma galeria com dezenas de fotos passando por redirecionamento
 * seria uma ida a mais por foto, e foto de obra nao tem o peso de um contrato.
 */

/** Uma hora era o padrao do Storage. Aqui só precisa durar o redirecionamento. */
const VALIDADE_SEGUNDOS = 60;

/**
 * Os escopos, em lista branca.
 *
 * O `escopo` vem da URL, e por isso nunca entra no texto do SQL: ele só escolhe
 * qual das consultas abaixo roda. É a mesma regra dos nomes de tabela em
 * `lib/admin/tabelas.ts` — identificador nao vem de requisicao.
 */
type Escopo = "aporte" | "obra" | "etapa";

function ehEscopo(valor: string): valor is Escopo {
  return valor === "aporte" || valor === "obra" || valor === "etapa";
}

/** O caminho no bucket, ou `undefined` se aquele arquivo nao é desta pessoa. */
async function caminhoDoArquivo(
  escopo: Escopo,
  id: string,
  usuarioId: string,
): Promise<{ caminho: string; bucket: Bucket; tabela: string } | undefined> {
  if (escopo === "aporte") {
    /*
     * O id pode ser de contrato ou de aditivo: `getAportes` une os dois numa
     * lista só, e a tela nao distingue. As duas metades exigem
     * `c.usuario_id = $2`, entao id de outra pessoa simplesmente nao volta
     * linha.
     */
    const [linha] = await consultar<{ caminho: string; origem: string }>(
      `select c.documento as caminho, 'contratos' as origem
         from contratos c
        where c.id = $1 and c.usuario_id = $2 and c.documento is not null

        union all

       select a.documento, 'aditivos'
         from aditivos a
         join contratos c on c.id = a.contrato_id
        where a.id = $1 and c.usuario_id = $2 and a.documento is not null

        limit 1`,
      [id, usuarioId],
    );

    return linha
      ? {
          caminho: linha.caminho,
          bucket: BUCKETS.contratos,
          tabela: linha.origem,
        }
      : undefined;
  }

  if (escopo === "etapa") {
    /*
     * O papel que comprova uma etapa da obra — laudo, ART, medicao.
     *
     * Mesmo bucket e mesma regra de posse do papel do empreendimento: etapa
     * pertence a uma obra, e quem pode ver a obra pode ver o que comprova o
     * andamento dela. Escopo proprio, e nao um id a mais no de `obra`, porque
     * sao tabelas diferentes e um id de `documentos` nao pode servir de id de
     * `etapas` — nem o contrario.
     */
    const [linha] = await consultar<{ caminho: string }>(
      `select et.documento as caminho
         from etapas et
        where et.id = $1
          and et.documento is not null
          and exists (
            select 1
              from contratos c
             where c.empreendimento_id = et.empreendimento_id
               and c.usuario_id = $2
          )
        limit 1`,
      [id, usuarioId],
    );

    return linha
      ? { caminho: linha.caminho, bucket: BUCKETS.documentos, tabela: "etapas" }
      : undefined;
  }

  /*
   * Papel do empreendimento: vale para quem tem contrato naquela obra. É a
   * mesma regra de `getObra` — o vinculo com `contratos` é o controle de
   * acesso, e nao um filtro de conveniencia.
   */
  const [linha] = await consultar<{ caminho: string }>(
    `select d.url as caminho
       from documentos d
      where d.id = $1
        and exists (
          select 1
            from contratos c
           where c.empreendimento_id = d.empreendimento_id
             and c.usuario_id = $2
        )
      limit 1`,
    [id, usuarioId],
  );

  return linha
    ? {
        caminho: linha.caminho,
        bucket: BUCKETS.documentos,
        tabela: "documentos",
      }
    : undefined;
}

/**
 * 404 para tudo que nao dá certo — sem sessao, escopo torto, id inexistente ou
 * arquivo de outra pessoa.
 *
 * Um 401 ou 403 confirmaria que aquele id existe, e é justamente isso que nao se
 * quer entregar: a diferenca entre "nao existe" e "existe e nao é seu" é a
 * informacao que transforma um palpite em enumeracao.
 */
function naoEncontrado() {
  return new NextResponse("Nao encontrado", {
    status: 404,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ escopo: string; id: string }> },
) {
  const { escopo, id } = await params;

  const sessao = await sessaoValida();
  if (!sessao) return naoEncontrado();
  if (!ehEscopo(escopo)) return naoEncontrado();

  const achado = await caminhoDoArquivo(escopo, id, sessao.id);
  if (!achado) return naoEncontrado();

  const url = await assinarLeitura(
    achado.bucket,
    achado.caminho,
    VALIDADE_SEGUNDOS,
  );
  // Arquivo apagado no bucket: a assinatura falha e `assinarLeitura` devolve
  // `null`. Para quem pediu, o efeito é o mesmo de nao existir.
  if (!url) return naoEncontrado();

  /*
   * O registro vem **antes** do redirecionamento, e sem `await` solto: se a
   * gravacao falhar, `registrar` engole o erro e o download segue — auditoria
   * nao derruba a operacao (ver `lib/auditoria.ts`). O que ela nao pode é
   * acontecer depois de a resposta sair.
   */
  await registrar({
    acao: "download",
    alvoTabela: achado.tabela,
    alvoId: id,
    detalhe: { escopo, caminho: achado.caminho, bucket: achado.bucket },
  });

  /*
   * 302 e nao 307: 307 preserva o metodo, e aqui o destino é sempre um GET no
   * Storage. `no-store` para o navegador nao guardar o redirecionamento — a URL
   * de destino expira em um minuto, e um redirecionamento em cache apontaria
   * para uma assinatura morta.
   */
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "cache-control": "no-store" },
  });
}
