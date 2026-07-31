"use client";

import { useActionState } from "react";
import { entrar } from "../acoes";

export function FormularioLogin() {
  // `useActionState` traz de volta a mensagem que a acao devolve, sem precisar
  // de estado proprio nem de `fetch` na mao.
  const [erro, acao, enviando] = useActionState(entrar, null);

  return (
    <form action={acao} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-xs font-medium text-neutral-600">
          E-mail ou usuário
        </span>
        <input
          name="email"
          // `text`, e nao `email`: o administrador entra por usuario simples, e
          // o `type=email` faria o navegador barrar o envio.
          type="text"
          inputMode="email"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="mt-1 w-full rounded-lg border border-tinta/15 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-neutral-600">Senha</span>
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-tinta/15 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
        />
      </label>

      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-marinho px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-azul disabled:opacity-60"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
