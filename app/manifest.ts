import type { MetadataRoute } from "next";

/**
 * O manifesto que torna o portal instalavel.
 *
 * Em arquivo `.ts`, e nao num `manifest.json` solto em `public/`: assim as
 * cores saem dos mesmos valores da marca em vez de virarem literais soltos, e
 * o Next serve a rota `/manifest.webmanifest` com o tipo certo.
 *
 * `start_url` é o `/portal`, e nao a raiz: quem instalou é investidor, e a
 * primeira tela dele é a carteira. Sem sessao, o `proxy.ts` desvia para o
 * login e volta depois — o caminho continua funcionando.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meu ARI · Portal do Investidor",
    short_name: "Meu ARI",
    description:
      "Acompanhe seus aportes, o que você recebe todo mês e o andamento das obras.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    // O fundo é o branco da pagina; o tema é a tinta do cabecalho, que pinta a
    // barra do sistema no Android e faz a moldura do app parecer parte da tela.
    background_color: "#ffffff",
    theme_color: "#001449",
    categories: ["finance", "business"],
    /*
     * Dois arquivos por tamanho, e nao um com "any maskable".
     *
     * O Android recorta um circulo de 80% do quadrado no icone `maskable`, e a
     * palavra ARI do logo chega perto demais dessa borda. A versao com folga é
     * o mesmo logo a 76% sobre a mesma tinta — sem diferenca visivel, porque o
     * fundo é da mesma cor, e com a zona segura respeitada.
     */
    icons: [
      { src: "/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/app-192-mascara.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/app-512-mascara.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
