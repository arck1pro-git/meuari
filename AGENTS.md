<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Nao derrube o servidor de desenvolvimento

Quem trabalha neste projeto costuma estar com `npm run dev` de pé e uma aba
aberta no portal. Duas coisas quebram essa aba — a pagina perde o CSS e aparece
sem as cores do cabecalho e dos cartoes:

1. **`next build` na pasta padrao.** Build e dev escrevem no mesmo `.next`, e o
   build sobrescreve o que o dev esta servindo. Para verificar uma compilacao,
   mande o build para outra pasta:

   ```
   $env:NEXT_DIST_DIR='.next-verifica'; npm run build     # PowerShell
   NEXT_DIST_DIR=.next-verifica npm run build             # bash
   ```

   `next.config.ts` le essa variavel; sem ela nada muda.

2. **Escrever arquivo dentro do projeto so para teste.** Qualquer `.env*` que
   mude faz o Next recarregar o ambiente e reiniciar; `.bak` e script solto na
   raiz entram no watcher. Arquivo temporario vai para a pasta de scratchpad da
   sessao, nunca para o repositorio.

Para conferir mudanca de tela, use o proprio `npm run dev` — ele ja recompila
sozinho. `lint` e `tsc --noEmit` sao seguros e nao tocam em `.next`.

# Dois bancos: producao e desenvolvimento

- `.env` guarda a `DATABASE_URL` de **producao** — a mesma da Vercel. É o que
  `next build`/`next start` usam nesta pasta, e o que os scripts de `db/`
  acertam só com `--prod` (ou `BANCO=prod`).
- `.env.development.local` guarda a de **desenvolvimento**. O `next dev` le
  esse arquivo antes do `.env` (ordem do proprio Next), e os scripts de `db/`
  tambem: **por padrao eles mexem no banco de dev**. A primeira linha que cada
  um imprime diz em qual banco ele esta. Ver `db/env.mjs`.
- Montar o banco de dev do zero: `node db/monta.mjs` aplica os `.sql` de `db/`
  na ordem certa (`--zerar` apaga tudo antes); `node db/seed.mjs --exemplo`
  cria o administrador e uma carteira de exemplo. E-mail e senha do admin saem
  de `SEED_ADMIN_EMAIL`/`SEED_SENHA`, no proprio `.env.development.local`.
- Dado de investidor real nunca vai para o banco de dev: lá só entra o que o
  seed inventa. Para olhar dado real, é producao — e só leitura.
