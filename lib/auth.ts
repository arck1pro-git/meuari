import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { redirect } from "next/navigation";
import { consultar } from "./db";
import { lerSessao, type Sessao } from "./sessao";

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
} from "./sessao";

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
export async function exigirSessao(destino?: string): Promise<Sessao> {
  const sessao = await lerSessao();
  if (!sessao) {
    redirect(
      destino ? `/login?proximo=${encodeURIComponent(destino)}` : "/login",
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
};

export async function autenticar(
  email: string,
  senha: string,
): Promise<Sessao | null> {
  const [usuario] = await consultar<LinhaUsuario>(
    "select id, nome, tipo, senha_hash from usuarios where lower(email) = lower($1)",
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
  return { id: usuario.id, tipo: usuario.tipo, nome: usuario.nome };
}
