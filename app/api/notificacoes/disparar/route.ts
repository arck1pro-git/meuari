import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { consultar } from "@/lib/db";
import { enviarAviso } from "@/lib/notificacoes-envio";

/**
 * O disparo de um aviso automatico.
 *
 * É a unica rota de API do projeto, e existe porque o outro lado é uma maquina:
 * o n8n acorda no horario combinado e bate aqui. Todo o resto do app fala por
 * Server Action, que pressupoe uma pessoa com sessao.
 *
 * O que ela faz é curto: confere a chave, le a automacao e chama `enviarAviso`,
 * o mesmo caminho do botao "Enviar agora" do painel. **O texto vive aqui**, e
 * nao no n8n — editar a automacao no /admin muda o proximo envio sem tocar no
 * fluxo de la.
 */
export const dynamic = "force-dynamic";

function chaveConfere(recebida: string | null): boolean {
  const esperada = process.env.N8N_WEBHOOK_SECRET;
  if (!esperada || !recebida) return false;

  const a = Buffer.from(recebida);
  const b = Buffer.from(esperada);
  // `timingSafeEqual` exige o mesmo tamanho; comparar antes ja vaza o tamanho,
  // que é o unico dado que se pode entregar sem risco.
  return a.length === b.length && timingSafeEqual(a, b);
}

type Automacao = {
  usuarioId: string | null;
  titulo: string;
  corpo: string | null;
  url: string | null;
};

export async function POST(request: NextRequest) {
  if (!chaveConfere(request.headers.get("x-chave"))) {
    // Sem detalhe: quem errou a chave nao precisa saber se ela existe.
    return NextResponse.json({ erro: "nao autorizado" }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as {
    agendamentoId?: string;
  } | null;

  const id = corpo?.agendamentoId;
  if (!id) {
    return NextResponse.json({ erro: "agendamentoId ausente" }, { status: 400 });
  }

  const [automacao] = await consultar<Automacao>(
    `select usuario_id as "usuarioId", titulo, corpo, url
       from notificacoes_agendadas
      where id = $1 and ativa`,
    [id],
  );

  if (!automacao) {
    // 404 tambem para automacao desligada: para quem chama, o efeito é o
    // mesmo — nao ha o que enviar.
    return NextResponse.json(
      { erro: "automacao nao encontrada" },
      { status: 404 },
    );
  }

  const entrega = await enviarAviso(automacao);

  return NextResponse.json({ ok: true, ...entrega });
}
