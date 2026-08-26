/*
 * A regra de senha que os dois lados precisam saber.
 *
 * Vive separado de `lib/auth.ts` pelo mesmo motivo que `lib/admin/periodo.ts`
 * vive separado de `lib/admin/acessos.ts`: aquele arquivo abre com
 * `import "server-only"` e puxa `lib/db.ts` — e o driver do Postgres junto.
 * O formulario do perfil é componente de cliente e precisa do mesmo numero,
 * para o `minLength` do campo e para a frase de apoio.
 *
 * Importar de `auth` num `"use client"` nao da erro de tipo nem de lint: o
 * build é que recusa, com um rastro que termina em "pg [Client Component
 * Browser]".
 */

/**
 * O menor tamanho aceito numa senha nova.
 *
 * Oito é o piso do NIST, e é onde a conta de forca bruta deixa de ser trivial.
 *
 * **Vale só onde é conferido**: hoje, na troca feita pela propria pessoa
 * (`app/(app)/perfil/acoes.ts`). O formulario do /admin continua sem piso —
 * mexer nele mudaria o comportamento de uma tela que ninguem pediu para mudar,
 * e é uma linha quando se quiser.
 */
export const SENHA_MINIMA = 8;
