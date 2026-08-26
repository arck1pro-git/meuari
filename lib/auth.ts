import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { redirect } from "next/navigation";
import { consultar } from "./db";
import { lerSessao, type DadosDaSessao, type Sessao } from "./sessao";

/*
 * A sessao propriamente dita mora em `lib/sessao.ts`, que nao toca no banco —
 * o `proxy.ts` importa de lá. Aqui fica o que precisa do banco (autenticar) e o
 * que precisa da senha (hash). Reexporto para quem ja importava de `@/lib/auth`
 * continuar funcionando sem saber da divisao.
 */
export {
  abrirSessao,
  fecharSessao,
  lerSessao,
  conferirCookie,
  inicioDe,
  COOKIE_SESSAO,
  type Sessao,
  type DadosDaSessao,
} from "./sessao";

// A regra de tamanho mora em `lib/senha.ts`, que nao é `server-only` — o
// formulario do perfil roda no navegador e le o mesmo numero.
export { SENHA_MINIMA } from "./senha";

const scrypt = promisify(scryptCb) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
) => Promise<Buffer>;

/*
 * Senha guardada como `scrypt$sal$hash`, ambos em hex. Uso o `scrypt` do proprio
 * Node em vez de bcrypt/argon2: nao precisa de dependencia nativa (que costuma
 * quebrar em Windows) e é uma funcao deliberadamente lenta, feita para senha.
 * Cada senha ganha sal proprio, entao duas iguais nao produzem o mesmo hash.
 */
export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(senha, sal, 64);
  return `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;
}

export async function conferirSenha(
  senha: string,
  guardado: string | null,
): Promise<boolean> {
  if (!guardado) return false;
  const [algoritmo, salHex, hashHex] = guardado.split("$");
  if (algoritmo !== "scrypt" || !salHex || !hashHex) return false;

  const esperado = Buffer.from(hashHex, "hex");
  const obtido = await scrypt(senha, Buffer.from(salHex, "hex"), esperado.length);
  // Comparacao em tempo constante: `===` vazaria, pelo tempo de resposta,
  // quantos bytes iniciais bateram.
  return timingSafeEqual(esperado, obtido);
}

// -----------------------------------------------------------------------------
// Guarda de pagina
// -----------------------------------------------------------------------------

/**
 * Exige sessao dentro da propria pagina, e nao so no `proxy.ts`.
 *
 * Duas razoes para ser aqui e nao apenas no proxy: os docs do Next chamam a
 * checagem do proxy de "otimista" (ela roda longe dos dados e vale para a
 * navegacao), e um layout nao re-renderiza a cada troca de rota — a verificacao
 * precisa ficar perto de quem le os dados.
 *
 * `destino` volta na URL para o login devolver a pessoa onde ela estava.
 */
/*
 * A versao de sessao daquele usuario, uma vez por requisicao.
 *
 * `cache` do React memoriza por requisicao: o layout e a pagina chamam
 * `exigirSessao` no mesmo ciclo, e sem isto seriam duas idas ao banco para a
 * mesma resposta.
 */
const versaoAtual = cache(async (usuarioId: string): Promise<number | null> => {
  const [linha] = await consultar<{ sessao_versao: number }>(
    "select sessao_versao from usuarios where id = $1",
    [usuarioId],
  );
  return linha?.sessao_versao ?? null;
});

/**
 * A sessao do cookie, ja conferida contra o banco — ou `null`.
 *
 * Existe separada de `exigirSessao` porque nem todo lugar quer redirecionar: o
 * layout do /admin manda para outra tela de entrada, e as Server Actions
 * precisam recusar sem navegar para lugar nenhum. Todos passam por aqui, e é
 * isso que garante que "sair de todos os aparelhos" vale em toda porta.
 */
export async function sessaoValida(): Promise<Sessao | null> {
  const sessao = await lerSessao();
  if (!sessao) return null;

  const versao = await versaoAtual(sessao.id);
  return versao !== null && versao === sessao.versao ? sessao : null;
}

export async function exigirSessao(destino?: string): Promise<Sessao> {
  const sessao = await lerSessao();
  if (!sessao) {
    redirect(
      destino ? `/login?proximo=${encodeURIComponent(destino)}` : "/login",
    );
  }

  /*
   * O cookie prova que a sessao foi emitida por nos e ainda nao venceu. Esta
   * consulta responde a outra pergunta: ela continua valendo? Um "sair de
   * todos os aparelhos" — ou um usuario apagado — muda a resposta sem tocar no
   * cookie que a pessoa tem em maos.
   *
   * Fica aqui, e nao no `proxy.ts`, porque o proxy roda em toda requisicao,
   * inclusive nos prefetch, e nao deve abrir conexao com o banco. Ali a guarda
   * é otimista, como os docs do Next chamam; a checagem real mora junto de quem
   * le os dados.
   */
  const versao = await versaoAtual(sessao.id);
  if (versao === null || versao !== sessao.versao) {
    redirect(
      destino
        ? `/login?proximo=${encodeURIComponent(destino)}&expirou=1`
        : "/login?expirou=1",
    );
  }

  return sessao;
}

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

type LinhaUsuario = {
  id: string;
  nome: string;
  tipo: string;
  senha_hash: string | null;
  sessao_versao: number;
};

/*
 * `DadosDaSessao`, e nao `Sessao`: o `sid` da visita é sorteado em
 * `abrirSessao`. Conferir a senha e abrir a sessao sao dois momentos — quem
 * autentica ainda nao sabe se o cookie chegara a ser emitido (o /admin, por
 * exemplo, ainda recusa quem nao é administrador depois desta linha).
 */
export async function autenticar(
  email: string,
  senha: string,
): Promise<DadosDaSessao | null> {
  const [usuario] = await consultar<LinhaUsuario>(
    "select id, nome, tipo, senha_hash, sessao_versao from usuarios where lower(email) = lower($1)",
    [email],
  );

  // Sem atalho quando o usuario nao existe: conferimos contra um hash de
  // descarte para o tempo de resposta nao revelar quais e-mails estao
  // cadastrados.
  if (!usuario) {
    await conferirSenha(senha, `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`);
    return null;
  }

  if (!(await conferirSenha(senha, usuario.senha_hash))) return null;
  return {
    id: usuario.id,
    tipo: usuario.tipo,
    nome: usuario.nome,
    versao: usuario.sessao_versao,
  };
}
