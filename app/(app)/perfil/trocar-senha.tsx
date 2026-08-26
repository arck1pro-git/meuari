"use client";

import { useActionState } from "react";
import { SENHA_MINIMA } from "@/lib/senha";
import { trocarSenha } from "./acoes";

/*
 * O mesmo campo da tela de login: cartao branco, entao a borda é o que faz o
 * campo existir. `bg-white` explicito porque o preenchimento automatico do
 * navegador pinta o fundo por conta propria.
 */
const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-tinta/15 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 placeholder:text-neutral-400 hover:border-tinta/25 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul/25";

const CLASSE_ROTULO =
  "text-[0.6875rem] font-semibold tracking-wider text-neutral-500 uppercase";

/**
 * Trocar a propria senha, dentro do perfil.
 *
 * A conferencia de verdade mora toda no servidor (`trocarSenha`): o que ha aqui
 * é o `required` e o `minLength` do navegador, que sao conveniencia — evitam
 * uma ida ao servidor para dizer o obvio, e nao valem como validacao. Regra que
 * so existe no cliente é regra que nao existe.
 *
 * `autoComplete` nos tres campos, e com os valores que os gerenciadores de
 * senha entendem: sem eles o navegador oferece a senha antiga nos tres, ou nao
 * oferece guardar a nova. `current-password` no primeiro e `new-password` nos
 * outros dois é o par que o padrao define.
 */
export function TrocarSenha() {
  // `useActionState` devolve o que a acao retorna. Sem `useState`, sem `fetch`
  // na mao, e o formulario continua enviando antes de o JavaScript carregar.
  const [estado, acao, enviando] = useActionState(trocarSenha, null);
  const deuCerto = estado !== null && "ok" in estado;

  return (
    <form action={acao} className="mt-4 space-y-4">
      <label className="block">
        <span className={CLASSE_ROTULO}>Senha atual</span>
        <input
          type="password"
          name="atual"
          required
          autoComplete="current-password"
          className={CLASSE_CAMPO}
        />
      </label>

      <label className="block">
        <span className={CLASSE_ROTULO}>Senha nova</span>
        <input
          type="password"
          name="nova"
          required
          minLength={SENHA_MINIMA}
          autoComplete="new-password"
          className={CLASSE_CAMPO}
        />
        <span className="mt-1 block text-xs text-neutral-500">
          Pelo menos {SENHA_MINIMA} caracteres.
        </span>
      </label>

      <label className="block">
        <span className={CLASSE_ROTULO}>Repita a senha nova</span>
        <input
          type="password"
          name="confirmacao"
          required
          minLength={SENHA_MINIMA}
          autoComplete="new-password"
          className={CLASSE_CAMPO}
        />
      </label>

      {/* `aria-live` porque a resposta chega depois do envio, longe do foco:
          quem le por audio precisa ser avisado de que algo mudou na tela. */}
      {estado && (
        <p
          aria-live="polite"
          className={`text-xs font-medium ${
            deuCerto ? "text-verde" : "text-red-600"
          }`}
        >
          {deuCerto
            ? "Senha trocada. As sessões dos outros aparelhos foram encerradas."
            : estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-marinho px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 disabled:cursor-progress disabled:opacity-60"
      >
        {enviando ? "Trocando…" : "Trocar senha"}
      </button>
    </form>
  );
}
