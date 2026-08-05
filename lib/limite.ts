import "server-only";
import { headers } from "next/headers";

/**
 * Freio de tentativas, para o login.
 *
 * Sem ele, o formulario aceita quantas senhas alguem quiser experimentar. E o
 * custo nao é só a chance de acertar: cada tentativa paga um `scrypt`
 * deliberadamente lento (~100 ms de CPU), entao um laco de requisicoes derruba
 * o servidor mesmo sem nunca acertar a senha.
 *
 * **Onde isto nao alcanca**, e é honesto dizer: a contagem vive na memoria do
 * processo. Na Vercel, com varias instancias, o teto passa a valer por
 * instancia — quem distribuir as tentativas entre elas ganha um multiplo do
 * limite. Isso ainda inviabiliza forca bruta de verdade (que precisa de
 * milhares de tentativas), mas nao é um limite global. Para ser global seria
 * preciso um contador fora do processo (Upstash, Redis), e isso é uma
 * dependencia e uma conta a mais — vale quando houver volume que justifique.
 */

const JANELA_MS = 10 * 60 * 1000;
const TENTATIVAS = 5;

type Registro = { contagem: number; expiraEm: number };

/*
 * No `globalThis` pelo mesmo motivo do pool em `lib/db.ts`: em desenvolvimento
 * o Next recarrega os modulos a cada alteracao, e um `Map` de modulo comum
 * seria zerado a cada recarga — o freio sumiria justamente enquanto se testa.
 */
const global_ = globalThis as typeof globalThis & {
  freioDeLogin?: Map<string, Registro>;
};
const registros = (global_.freioDeLogin ??= new Map());

/**
 * Quem esta tentando, na medida do possivel.
 *
 * `x-forwarded-for` é preenchido pela Vercel e traz a cadeia de proxies; o
 * primeiro item é o cliente. Em desenvolvimento nao ha cabecalho nenhum, e ai
 * todos caem no mesmo balde `local` — o que é aceitavel, porque ali só existe
 * uma pessoa.
 */
async function origem(): Promise<string> {
  const cabecalhos = await headers();
  const encaminhado = cabecalhos.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || "local";
}

/** Limpa o que ja venceu. Sem isto o Map cresce para sempre. */
function varrer(agora: number) {
  for (const [chave, registro] of registros) {
    if (registro.expiraEm <= agora) registros.delete(chave);
  }
}

/**
 * Conta mais uma tentativa e diz se ela pode seguir.
 *
 * A chave junta origem e identificador: assim uma pessoa errando a propria
 * senha nao tranca o login de quem esta na mesma rede, e quem varre uma lista
 * de e-mails de um mesmo ponto é freado do mesmo jeito.
 */
export async function podeTentar(
  identificador: string,
): Promise<{ liberado: boolean; faltamSegundos: number }> {
  const agora = Date.now();
  varrer(agora);

  const chave = `${await origem()}:${identificador.trim().toLowerCase()}`;
  const registro = registros.get(chave);

  if (!registro || registro.expiraEm <= agora) {
    registros.set(chave, { contagem: 1, expiraEm: agora + JANELA_MS });
    return { liberado: true, faltamSegundos: 0 };
  }

  registro.contagem += 1;
  if (registro.contagem > TENTATIVAS) {
    return {
      liberado: false,
      faltamSegundos: Math.ceil((registro.expiraEm - agora) / 1000),
    };
  }

  return { liberado: true, faltamSegundos: 0 };
}

/** Entrou: o balde daquela pessoa zera. */
export async function limparTentativas(identificador: string) {
  registros.delete(`${await origem()}:${identificador.trim().toLowerCase()}`);
}

/** A espera em minutos, para a mensagem — segundo exato aqui nao serve a ninguem. */
export function emMinutos(segundos: number): number {
  return Math.max(1, Math.ceil(segundos / 60));
}
