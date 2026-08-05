import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Onde a compilacao é gravada.
   *
   * `next dev` e `next build` escrevem na *mesma* pasta. Rodar um build com o
   * servidor de desenvolvimento de pé sobrescreve os arquivos que ele esta
   * servindo, e a aba aberta fica sem CSS — o portal aparece sem as cores do
   * cabecalho e dos cartoes ate recarregar.
   *
   * Com isto, um build de verificacao vai para outra pasta e nao encosta no
   * dev:
   *
   *   NEXT_DIST_DIR=.next-verifica npm run build      (bash)
   *   $env:NEXT_DIST_DIR='.next-verifica'; npm run build   (PowerShell)
   *
   * Sem a variavel, tudo segue em `.next` como antes — deploy nao muda.
   */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  turbopack: {
    // Existe um package-lock.json solto na pasta do usuario, acima daqui. Sem
    // fixar a raiz, o Turbopack elege aquela pasta como raiz do workspace.
    root: import.meta.dirname,
  },

  /*
   * Abrir o `next dev` no celular pela rede local.
   *
   * O servidor de desenvolvimento ja escuta em todas as interfaces, entao a
   * pagina carrega — mas o Next recusa os pedidos a `/_next/*` quando a origem
   * nao é aquela com que ele subiu (`localhost`). Como o JavaScript e o CSS
   * vem justamente dali, o aparelho mostra o HTML sem estilo e sem interacao.
   *
   * Sao os enderecos *desta* maquina, que é o que o outro aparelho digita:
   *   192.168.3.110  -> a placa de rede em uso
   *   192.168.56.1   -> adaptador virtual (VirtualBox/Hyper-V), por garantia
   *
   * Vale so em desenvolvimento; `next build`/`start` ignoram esta lista. Se o
   * IP da maquina mudar, é aqui que se acrescenta o novo.
   */
  allowedDevOrigins: ["192.168.3.110", "192.168.56.1"],

  /*
   * Cabecalhos de seguranca, para todas as rotas.
   *
   * O portal mostra saldo e documentos de contrato, e ate aqui nao mandava
   * nenhum deles. Os cinco primeiros sao instrucoes ao navegador sobre o que
   * *nao* permitir; o ultimo é a politica de conteudo, que é a que realmente
   * limita estrago.
   */
  async headers() {
    /*
     * A politica é escrita por extenso, e cada origem esta aqui por um motivo
     * concreto — nada de curinga:
     *
     * - `script-src 'self' 'unsafe-inline'`: o Next injeta os dados do servidor
     *   em `<script>` inline. Sem nonce por requisicao (que exigiria middleware
     *   reescrevendo o HTML) o `unsafe-inline` é necessario. Ele nao é ideal, e
     *   é justamente por isso que o HTML de terceiros é sanitizado antes de
     *   entrar na pagina — ver `lib/artigos.ts`.
     * - `img-src`: as capas dos artigos vem da Airticles e as fotos de obra do
     *   Supabase, em URL assinada. `data:` fica para os icones embutidos.
     * - `connect-src`: a acao de push fala com o serviço do navegador, e o
     *   upload do /admin manda o arquivo direto ao Supabase.
     * - `frame-ancestors 'none'`: ninguem embute este app num iframe. É a
     *   versao moderna do `X-Frame-Options`, e vale para navegador atual.
     * - `form-action 'self'`: um formulario daqui nao posta em outro dominio.
     */
    /*
     * `unsafe-eval` só em desenvolvimento.
     *
     * O React em modo de desenvolvimento e a troca a quente do Turbopack usam
     * `eval` para recarregar modulo sem recarregar a pagina. Com a politica
     * fechada, a tela morria com "eval() is not supported in this environment".
     * No build de producao nada disso existe, e a brecha nao vai junto.
     */
    const desenvolvimento = process.env.NODE_ENV === "development";

    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://api.airticles.ai https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co",
      "media-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "worker-src 'self'",
      "manifest-src 'self'",
    ].join("; ");

    return [
      {
        source: "/:caminho*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Redundante com `frame-ancestors`, e fica pelos navegadores antigos.
          { key: "X-Frame-Options", value: "DENY" },
          // Impede o navegador de adivinhar o tipo de um arquivo pelo conteudo
          // — um PDF servido como HTML deixaria de ser um PDF.
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          /*
           * Um ano, incluindo subdominios. Diz ao navegador para nunca mais
           * tentar `http` neste dominio. So tem efeito em `https`, entao em
           * desenvolvimento ele é ignorado — e por isso pode ficar sempre
           * ligado.
           */
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
