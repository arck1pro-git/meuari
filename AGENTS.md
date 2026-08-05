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
