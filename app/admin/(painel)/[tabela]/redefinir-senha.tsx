"use client";

import { useActionState } from "react";
import { SENHA_MINIMA } from "@/lib/senha";
import { acaoRedefinirSenha } from "../../acoes";

/* O mesmo campo do resto do painel. Ver `CLASSE_CAMPO` em `formulario.tsx` —
   repetido aqui, e nao importado, porque aquele modulo é de servidor. */
const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul";

/**
 * A folha de redefinir a senha de um investidor.
 *
 * Duas caixas e um botao: a senha nova e a confirmacao. Nao ha campo de senha
 * atual — quem redefine aqui nao a conhece, e é por isso que a tela existe.
 *
 * `SENHA_MINIMA` vem de `lib/senha.ts`, e nao de `lib/auth.ts`: aquele é
 * `server-only` e traria o driver do Postgres para o bundle do navegador.
 *
 * O `required` e o `minLength` sao conveniencia do navegador — evitam uma ida
 * ao servidor para dizer o obvio. Quem confere de verdade é a acao.
 */
export function RedefinirSenha({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [estado, acao, enviando] = useActionState(acaoRedefinirSenha, null);
  const deuCerto = estado !== null && "ok" in estado;

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-neutral-600">
        Definindo a senha de{" "}
        <span className="font-semibold text-tinta">{nome}</span>. As sessões
        abertas dele em qualquer aparelho serão encerradas.
      </p>

      <label className="block">
        <span className="text-xs font-medium text-neutral-600">Senha nova</span>
        <input
          type="password"
          name="nova"
          required
          minLength={SENHA_MINIMA}
          // `new-password` para o gerenciador do navegador nao oferecer a senha
          // de *quem administra* no campo — a conta aqui é de outra pessoa.
          autoComplete="new-password"
          className={CLASSE_CAMPO}
        />
        <span className="mt-1 block text-xs text-neutral-400">
          Pelo menos {SENHA_MINIMA} caracteres.
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-neutral-600">
          Repita a senha
        </span>
        <input
          type="password"
          name="confirmacao"
          required
          minLength={SENHA_MINIMA}
          autoComplete="new-password"
          className={CLASSE_CAMPO}
        />
      </label>

      {estado && (
        <p
          aria-live="polite"
          className={`text-xs font-medium ${
            deuCerto ? "text-verde" : "text-red-600"
          }`}
        >
          {deuCerto
            ? "Senha redefinida. Combine a nova com o investidor."
            : estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-marinho px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 disabled:cursor-progress disabled:opacity-60"
      >
        {enviando ? "Salvando…" : "Redefinir senha"}
      </button>
    </form>
  );
}
