/*
 * Sessao: cookie assinado, sem tabela.
 *
 * Vive separado de `lib/auth.ts` de proposito. O `proxy.ts` precisa conferir a
 * sessao a cada requisicao, e importar de `auth` traria `lib/db.ts` — e o pool
 * do Postgres — para dentro do proxy, que roda antes de qualquer rota. Aqui
 * nao ha nada de banco: so `node:crypto` e o cookie.
 *
 * Sem `import "server-only"`: o proxy tem bundle proprio, que nao passa pela
 * condicao `react-server` que aquele pacote usa. A protecao na pratica vem do
 * `next/headers` abaixo, que ja estoura se alguem importar isto num componente
 * de cliente.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_SESSAO = "sessao";
const DURACAO_HORAS = 12;

/**
 * O que vai dentro do cookie.
 *
 * `versao` é o contador de sessoes do usuario, copiado no momento em que ela
 * nasce. Quem clica em "sair de todos os aparelhos" incrementa o contador no
 * banco, e todo cookie emitido antes passa a nao valer — ver `exigirSessao`,
 * que é quem compara. Aqui nao ha banco de proposito: este modulo é o mesmo
 * que o `proxy.ts` importa.
 */
export type Sessao = {
  id: string;
  tipo: string;
  nome: string;
  versao: number;
  /**
   * Identificador desta visita, sorteado em `abrirSessao`.
   *
   * Nao tem papel nenhum na autenticacao — quem responde "é esta pessoa" sao o
   * `id` e a `versao`. Ele existe para o registro de acesso: é o que amarra as
   * paginas de uma mesma sessao, e sem ele a mesma pessoa em dois aparelhos ao
   * mesmo tempo viraria uma visita só, com duracao inventada. Ver
   * `lib/acessos.ts`.
   *
   * `null` em cookie emitido antes desta mudanca. Nao invalida ninguem: quem ja
   * estava dentro segue navegando e só nao tem a visita registrada, ate o
   * cookie de 12h vencer e o proximo login sortear um `sid`. Trocar isso por um
   * logout geral custaria uma sessao a cada investidor para ganhar meio dia de
   * dado.
   */
  sid: string | null;
};

/**
 * O que se sabe de quem entrou, antes de a sessao existir.
 *
 * `autenticar` devolve isto, e nao uma `Sessao`: o `sid` nasce em
 * `abrirSessao`, que é o momento em que a visita comeca. Quem autentica nao
 * teria como sorteá-lo sem saber se o cookie chegou a ser emitido.
 */
export type DadosDaSessao = Omit<Sessao, "sid">;

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET ausente no ambiente");
  return s;
}

function assinar(corpo: string): string {
  return createHmac("sha256", segredo()).update(corpo).digest("base64url");
}

/**
 * O cookie carrega os dados e uma assinatura. Sem a assinatura, qualquer um
 * editaria o proprio cookie para virar administrador.
 */
export async function abrirSessao(sessao: DadosDaSessao) {
  const corpo = Buffer.from(
    JSON.stringify({
      ...sessao,
      // Aqui, e nao em `autenticar`: o `sid` identifica *esta* visita, e ela
      // comeca quando o cookie é emitido. Entrar de novo no outro aparelho
      // sorteia outro, que é exatamente o que separa as duas na contagem.
      sid: randomUUID(),
      exp: Date.now() + DURACAO_HORAS * 3600_000,
    }),
  ).toString("base64url");

  (await cookies()).set(COOKIE_SESSAO, `${corpo}.${assinar(corpo)}`, {
    httpOnly: true, // fora do alcance de JavaScript na pagina
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_HORAS * 3600,
  });
}

export async function fecharSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}

/**
 * Confere assinatura e validade do valor cru do cookie. Sincrona e sem acesso a
 * requisicao para servir tanto ao `proxy.ts` (que le de `request.cookies`)
 * quanto ao `lerSessao()` abaixo.
 */
export function conferirCookie(bruto: string | undefined): Sessao | null {
  if (!bruto) return null;

  const [corpo, assinatura] = bruto.split(".");
  if (!corpo || !assinatura) return null;

  const esperada = Buffer.from(assinar(corpo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length) return null;
  if (!timingSafeEqual(esperada, recebida)) return null;

  try {
    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString());
    if (typeof dados.exp !== "number" || dados.exp < Date.now()) return null;
    return {
      id: dados.id,
      tipo: dados.tipo,
      nome: dados.nome,
      // Cookie emitido antes desta mudanca nao tem o campo; ele vale como
      // versao 1, que é o padrao da coluna nova — ninguem é deslogado a toa.
      versao: typeof dados.versao === "number" ? dados.versao : 1,
      // Mesma ideia, e mesmo motivo de nao recusar o cookie sem ele: a ausencia
      // custa o registro de uma visita, e recusar custaria a sessao inteira.
      sid: typeof dados.sid === "string" ? dados.sid : null,
    };
  } catch {
    return null;
  }
}

export async function lerSessao(): Promise<Sessao | null> {
  return conferirCookie((await cookies()).get(COOKIE_SESSAO)?.value);
}

/** Para onde cada papel vai depois de entrar. */
export function inicioDe(tipo: string): string {
  return tipo === "administrador" ? "/admin" : "/portal";
}
