"use client";

import { useActionState } from "react";
import { entrar } from "./acoes";

/*
 * Campos brancos dentro do cartao azul, e nao translucidos: o preenchimento
 * automatico do navegador pinta o fundo do input por conta propria, e sobre um
 * campo transparente o resultado sai de outra cor. Branco ja é o destino dele.
 */
const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-transparent bg-white px-3.5 py-2.5 text-sm text-tinta transition-shadow placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marinho";

export function FormularioLogin({ proximo }: { proximo?: string }) {
  // `useActionState` devolve o que a acao retorna — sem estado proprio nem
  // `fetch` na mao. Quando da certo, a acao redireciona e nada volta.
  const [estado, acao, enviando] = useActionState(entrar, null);

  return (
    <form action={acao} className="mt-6 space-y-4">
      {/* Viaja escondido para a acao decidir o destino depois de entrar. É
          peneirado no servidor: valor de fora nunca vira redirecionamento. */}
      {proximo && <input type="hidden" name="proximo" value={proximo} />}

      <label className="block">
        <span className="text-xs font-semibold text-white/75">
          E-mail ou usuário
        </span>
        <input
          // A `key` muda junto com o valor devolvido para o React montar o
          // campo de novo: `defaultValue` sozinho nao reescreve um input que ja
          // existe, e o campo voltaria vazio depois do erro.
          key={estado?.email ?? ""}
          name="email"
          // `text`, e nao `email`: ha conta identificada por usuario simples, e
          // o `type=email` faz o navegador barrar o envio antes de chegar aqui.
          // O `inputMode` mantem o teclado com @ no celular.
          type="text"
          inputMode="email"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={estado?.email ?? ""}
          className={CLASSE_CAMPO}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-white/75">Senha</span>
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className={CLASSE_CAMPO}
        />
      </label>

      {estado?.erro && (
        /* Caixa clara para o vermelho continuar legivel: texto vermelho direto
           sobre o azul do cartao nao alcanca contraste. */
        <p
          role="alert"
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-red-700"
        >
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-marinho transition-all duration-200 hover:bg-ciano hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marinho active:scale-[0.98] disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
