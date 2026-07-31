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
};

export default nextConfig;
