"use client";

import { useActionState } from "react";
import { entrar } from "./acoes";

/*
 * O cartao agora é branco, entao o campo precisa de contorno proprio para
 * existir: sem a borda ele sumiria no fundo. `bg-white` explicito, e nao
 * herdado, porque o preenchimento automatico do navegador pinta o fundo do
 * input por conta propria — branco ja é o destino dele.
 *
 * O foco é o azul da marca, o mesmo do resto do app, e nao o anel branco de
 * antes, que so fazia sentido contra o azul do cartao escuro.
 */
const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-tinta/15 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 placeholder:text-neutral-400 hover:border-tinta/25 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul/25";

/* O rotulo em maiusculas miudas: com o cartao claro, `text-xs` em cinza ficava
   perto demais do texto de apoio logo acima. O espacejamento é o que separa
   rotulo de frase sem precisar de mais peso. */
const CLASSE_ROTULO =
  "text-[0.6875rem] font-semibold tracking-wider text-neutral-500 uppercase";

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
        <span className={CLASSE_ROTULO}>E-mail ou usuário</span>
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
        <span className={CLASSE_ROTULO}>Senha</span>
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className={CLASSE_CAMPO}
        />
      </label>

      {estado?.erro && (
        /* Fundo vermelho palido e contorno da mesma familia: sobre o cartao
           branco, o texto vermelho sozinho seria facil de nao ver — e este é
           justamente o aviso que precisa ser lido antes de tentar de novo. */
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {estado.erro}
        </p>
      )}

      {/* O botao segue o CTA do simulador: marinho que vira azul, sombra na cor
          e um recuo de 1,5% no toque. É a acao principal da tela e a unica
          area cheia dela — por isso pesa mais que os campos. */}
      <button
        type="submit"
        disabled={enviando}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-marinho px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,20,73,0.6)] transition-all duration-200 ease-[var(--ease-suave)] hover:bg-azul hover:shadow-[0_14px_34px_-10px_rgba(0,91,197,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 active:scale-[0.985] disabled:opacity-60 disabled:shadow-none"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
