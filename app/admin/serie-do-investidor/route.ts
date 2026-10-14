import { NextResponse, type NextRequest } from "next/server";
import { sessaoValida } from "@/lib/auth";
import { serieDoInvestidor } from "@/lib/admin/investidor";
import { dataDeReferencia } from "@/lib/portal/dados";

/**
 * A serie de um investidor, sozinha — o bloco "Contrato do investidor" do
 * Dashboard.
 *
 * **Existe para a troca de investidor nao refazer o Dashboard inteiro.** O
 * seletor navegava para `/admin?i=…&m=…`, e a pagina, que é `force-dynamic`,
 * recalculava tudo a cada clique: a carteira, as metas, os creditos e a
 * projecao de pagamento de todos os contratos ate 2029 — para trocar o grafico
 * de um bloco só. Agora o bloco pede so o que é dele.
 *
 * GET, e nao Server Action: é leitura. Acao de servidor existe para escrever, e
 * o Next as enfileira uma por vez — dois cliques rapidos no seletor esperariam
 * um pelo outro em vez de o segundo cancelar o primeiro.
 *
 * A guarda mora aqui, como em toda rota de manipulador do painel: rota nao
 * passa por layout nenhum, e o `proxy.ts` so confere que ha cookie.
 */

const SEM_CACHE = { "cache-control": "no-store" };

/** O formato de um id de usuario. O que nao tiver esta cara nao vira consulta. */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(requisicao: NextRequest) {
  const sessao = await sessaoValida();
  if (sessao?.tipo !== "administrador") {
    return NextResponse.json(
      { erro: "restrito" },
      { status: 403, headers: SEM_CACHE },
    );
  }

  const busca = requisicao.nextUrl.searchParams;
  const id = busca.get("i") ?? "";
  // A mesma regra da pagina: o que nao for `final` é `mensal`.
  const modalidade = busca.get("m") === "final" ? "final" : "mensal";

  if (!ID.test(id)) {
    return NextResponse.json(
      { erro: "investidor" },
      { status: 400, headers: SEM_CACHE },
    );
  }

  const serie = await serieDoInvestidor(
    id,
    modalidade,
    await dataDeReferencia(),
  );

  return NextResponse.json({ serie }, { headers: SEM_CACHE });
}
