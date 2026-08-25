import "server-only";
import { consultar } from "@/lib/db";
import {
  enviarAvisoParaVarios,
  type EntregaEmLote,
} from "@/lib/notificacoes-envio";

/**
 * Documento publicado numa obra vira aviso para quem investiu nela.
 *
 * O documento entrava no banco em silencio: quem tinha contrato so descobria
 * numa visita a tela da obra, e nada convidava a essa visita. Publicar passa a
 * bater no aparelho.
 *
 * **Quem recebe é quem tem contrato naquele empreendimento** — a mesma juncao
 * que ja decide se a pessoa pode abrir a obra (`getObra`, em
 * `lib/portal/dados.ts`). Nao ha alvo mais largo aqui: aviso geral iria para
 * investidor de outra obra, que abriria o link e receberia um 404.
 */

type Alvo = {
  documento: string;
  obraId: string;
  obra: string;
  investidores: string[];
};

async function alvoDoDocumento(documentoId: string): Promise<Alvo | null> {
  const [linha] = await consultar<{
    documento: string;
    obra_id: string;
    obra: string;
  }>(
    `select d.nome as documento,
            e.id   as obra_id,
            e.nome as obra
       from documentos d
       join empreendimentos e on e.id = d.empreendimento_id
      where d.id = $1`,
    [documentoId],
  );
  if (!linha) return null;

  /*
   * `distinct` porque duas coisas multiplicam a mesma pessoa: mais de um
   * contrato na mesma obra é comum, e sem isto ela receberia dois pushes
   * identicos e duas linhas na caixinha.
   *
   * `tipo = 'investidor'` deixa o administrador de fora. Ele nao é publico deste
   * aviso — foi ele quem acabou de publicar o documento.
   *
   * Nao ha juncao com `aditivos`: aditivo pendura em `contratos`, entao quem tem
   * aditivo na obra ja esta nesta lista pelo contrato de origem.
   */
  const pessoas = await consultar<{ id: string }>(
    `select distinct c.usuario_id as id
       from contratos c
       join usuarios u on u.id = c.usuario_id
      where c.empreendimento_id = $1
        and u.tipo = 'investidor'`,
    [linha.obra_id],
  );

  return {
    documento: linha.documento,
    obraId: String(linha.obra_id),
    obra: linha.obra,
    investidores: pessoas.map((p) => String(p.id)),
  };
}

/**
 * Avisa, e **nunca derruba quem publicou**.
 *
 * O documento ja esta gravado quando esta funcao roda. Se o push falhar — VAPID
 * mal configurada, servico do navegador fora do ar, banco recusando o insert —,
 * deixar a excecao subir daria tela de erro no painel para uma linha que entrou
 * com sucesso, e o administrador tentaria publicar de novo. Mesma escolha que
 * `lib/auditoria.ts` faz pelo mesmo motivo.
 */
export async function avisarNovoDocumento(
  documentoId: string,
): Promise<EntregaEmLote> {
  const vazio: EntregaEmLote = {
    pessoas: 0,
    entregues: 0,
    inscricoes: 0,
    removidas: 0,
  };

  try {
    const alvo = await alvoDoDocumento(documentoId);
    if (!alvo || alvo.investidores.length === 0) return vazio;

    return await enviarAvisoParaVarios(alvo.investidores, {
      /*
       * "em" e nao "no"/"na": o nome do empreendimento pode ser de qualquer
       * genero, e a preposicao neutra evita concordancia errada sem precisar
       * guardar o genero de cada obra.
       */
      titulo: `Novo documento em ${alvo.obra}`,
      /*
       * O nome do arquivo mais onde ele esta. A segunda parte parece obvia e nao
       * é: na tela da obra os documentos ficam atras de um botao flutuante
       * (`BotaoDocumentos`), sem rotulo escrito — quem chega pelo aviso e nao
       * souber disso ve a obra e nao ve o documento.
       */
      corpo: `${alvo.documento} já está nos documentos da obra.`,
      url: `/obras/${alvo.obraId}`,
    });
  } catch (erro) {
    console.error("[aviso-de-documento] falhou ao avisar", erro);
    return vazio;
  }
}
