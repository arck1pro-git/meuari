import "server-only";

/**
 * O que pode subir para os buckets.
 *
 * Ate aqui o `accept` do `<input type="file">` era a unica barreira, e ele é
 * dica de interface: some com um `curl`, ou com a Server Action chamada
 * direto. A conferencia de verdade acontece no servidor, antes de assinar a
 * URL — sem assinatura, o navegador nao tem para onde enviar.
 *
 * O teto de tamanho é o unico que **nao** dá para garantir aqui: o arquivo vai
 * do navegador direto ao Supabase, e o nosso servidor nunca o ve. O numero
 * abaixo é conferido no navegador antes de pedir a URL, o que resolve o caso
 * comum (alguem escolhendo o arquivo errado). O limite que ninguem contorna é o
 * do proprio bucket, no painel do Supabase — vale configurar la tambem.
 */

/** Extensoes que nao entram, mesmo em bucket privado e com o tipo certo. */
const PROIBIDAS = new Set([
  // Executam no navegador de quem abrir a URL assinada.
  "html", "htm", "xhtml", "svg", "js", "mjs", "xml", "xsl",
  // Executam na maquina de quem baixar.
  "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "sh", "jar", "app", "dmg",
  // Rodam no servidor, se algum dia o bucket virar origem de um site.
  "php", "phtml", "asp", "aspx", "jsp", "cgi",
]);

/** Por familia de `aceita`, o que é legitimo. */
const POR_TIPO: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/*": ["jpg", "jpeg", "png", "webp", "avif", "gif", "heic"],
  "video/*": ["mp4", "webm", "mov", "m4v"],
};

/** Teto por familia, em bytes. Conferido no navegador — ver a nota do topo. */
export const TETOS: Record<string, number> = {
  "application/pdf": 15 * 1024 * 1024,
  "image/*": 8 * 1024 * 1024,
  "video/*": 200 * 1024 * 1024,
};

/** Sem `aceita` declarado, o campo aceita documento comum. */
const PADRAO = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "png", "jpg", "jpeg"];

export function extensaoDe(nome: string): string {
  const pedaco = nome.toLowerCase().split(".").pop() ?? "";
  return pedaco === nome.toLowerCase() ? "" : pedaco;
}

/**
 * Confere o nome do arquivo contra o que o campo aceita.
 *
 * Lanca com mensagem curta — ela chega ao `/admin` como erro da acao, e nao
 * precisa explicar a lista inteira.
 */
export function conferirArquivo(nomeArquivo: string, aceita?: string): void {
  const extensao = extensaoDe(nomeArquivo);

  if (!extensao) throw new Error("Arquivo sem extensao");
  if (PROIBIDAS.has(extensao)) {
    throw new Error(`Arquivo .${extensao} nao é permitido`);
  }

  // `aceita` pode nem existir, e pode existir sem lista propria — os dois casos
  // caem na lista padrao.
  const permitidas = (aceita ? POR_TIPO[aceita] : undefined) ?? PADRAO;
  if (!permitidas.includes(extensao)) {
    throw new Error(
      `Arquivo .${extensao} nao serve para este campo (esperado: ${permitidas.join(", ")})`,
    );
  }
}
