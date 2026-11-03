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
 * do navegador direto ao armazenamento, e o nosso servidor nunca o ve. O numero
 * abaixo é conferido no navegador e de novo aqui, contra o tamanho que o painel
 * declara ao pedir a URL (`conferirTamanho`) — o que resolve o caso comum, de
 * alguem escolhendo o arquivo errado. No Supabase havia ainda o limite do
 * proprio bucket; no Neon nao ha, e quem manda o tamanho é o administrador.
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

/**
 * Teto do campo, conferido no servidor contra o tamanho que o painel declara.
 *
 * O navegador ja confere antes de pedir a URL; repetir aqui pega a chamada
 * direta a acao, que pula o navegador. O numero continua sendo o declarado — o
 * arquivo em si vai direto ao armazenamento —, entao é trava contra engano, e
 * nao contra o proprio administrador.
 */
export function conferirTamanho(bytes: number, aceita?: string): void {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw new Error("Tamanho do arquivo invalido");
  }
  const teto = aceita ? TETOS[aceita] : undefined;
  if (teto && bytes > teto) {
    throw new Error(
      `Arquivo acima do limite de ${Math.round(teto / (1024 * 1024))} MB`,
    );
  }
}

/** O tipo de cada extensao aceita, no nome que o navegador tambem usa. */
const TIPOS: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
};

/**
 * O `Content-Type` com que o arquivo vai ser gravado, tirado da extensao.
 *
 * Quem decide é o servidor, e nao o navegador: o tipo entra na assinatura do
 * envio (ver `assinarUpload`), e é ele que o armazenamento devolve a quem abre
 * o arquivo. Deixar o navegador escolher permitia gravar HTML com nome de
 * `.pdf`. Extensao sem tipo conhecido vai como binario, que o navegador baixa
 * em vez de abrir.
 */
export function tipoDoArquivo(nome: string): string {
  return TIPOS[extensaoDe(nome)] ?? "application/octet-stream";
}
