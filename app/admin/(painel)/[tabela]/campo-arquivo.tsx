"use client";

import { useRef, useState } from "react";
import { acaoAssinarUpload } from "../../acoes";
import { paraWebp } from "./webp";

/**
 * Envia o arquivo direto do browser para o bucket e guarda no formulario apenas
 * o caminho resultante.
 *
 * O arquivo nao passa pela Server Action de proposito: o limite de corpo dela é
 * de 1 MB por padrao, e os PDFs aqui chegam a 3 MB. A acao entrega so a URL
 * assinada; o `PUT` vai do navegador ao Supabase.
 *
 * Quem viaja no `submit` é o `<input type="hidden">` com o caminho — por isso
 * trocar o arquivo e nao salvar o formulario deixa o objeto orfao no bucket. É
 * o custo de nao passar o arquivo pelo servidor, e a alternativa (apagar o
 * antigo na hora do upload) perderia o arquivo se a edicao fosse abandonada.
 */
/** Bytes em "1,4 MB" — a unidade em que se fala de foto. */
function emMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/**
 * "2-salao-de-festas.png" -> "2-salao-de-festas".
 *
 * Só a extensao sai. O resto fica literal, e é escolha: prettificar — trocar
 * hifen por espaco, subir a inicial — seria decidir o nome no lugar de quem
 * cadastra, que é justamente o que este preenchimento existe para evitar. O
 * campo continua editavel para quem quiser outro texto.
 */
function semExtensao(nome: string): string {
  return nome.replace(/\.[^.]+$/, "") || nome;
}

export function CampoArquivo({
  slug,
  nome,
  rotulo,
  valorAtual,
  obrigatorio,
  aceita,
  teto,
  ajuda,
}: {
  slug: string;
  nome: string;
  rotulo: string;
  valorAtual: string;
  obrigatorio?: boolean;
  aceita?: string;
  /** Teto em bytes, do registro da tabela. Ver a nota em `lib/upload.ts`. */
  teto?: number;
  ajuda?: string;
}) {
  const [caminho, setCaminho] = useState(valorAtual);
  const [estado, setEstado] = useState<
    "parado" | "convertendo" | "enviando" | "erro"
  >("parado");
  const [erro, setErro] = useState<string | null>(null);
  /** O que a conversao fez, para a linha de apoio poder contar. */
  const [convertida, setConvertida] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function enviar(escolhido: File) {
    setErro(null);
    setConvertida(null);

    let arquivo = escolhido;

    /*
     * Todo arquivo de campo de imagem vira WebP aqui, **independente do
     * tamanho** — ver `paraWebp`.
     *
     * Só em campo de imagem: o `aceita` do registro é quem diz. Sem esta
     * guarda, um PNG escolhido por engano num campo de PDF sairia daqui como
     * `.webp` e o servidor recusaria com uma mensagem sobre um formato que a
     * pessoa nunca escolheu.
     *
     * A conferencia de tamanho continua logo abaixo, e continua valendo: ela é
     * quem recusa PDF grande demais, formato que o navegador nao decodifica
     * (HEIC) e a foto que resistiu a conversao.
     */
    if (aceita === "image/*") {
      setEstado("convertendo");
      const webp = await paraWebp(escolhido, teto);
      if (webp) {
        arquivo = webp.arquivo;
        // Só conta quando encolheu de verdade. Converter um arquivo pequeno
        // pode deixa-lo do mesmo tamanho, e anunciar isso é ruido.
        if (webp.depois < webp.antes) {
          setConvertida(
            `Convertida para WebP: ${emMB(webp.antes)} → ${emMB(webp.depois)}.`,
          );
        }
      }
    }

    /*
     * O tamanho é conferido aqui porque o arquivo nao passa pelo servidor — ele
     * vai do navegador direto ao bucket. Isto evita a viagem inutil de um
     * arquivo grande demais; quem garante o limite de verdade é a configuracao
     * do bucket no Supabase.
     */
    if (teto && arquivo.size > teto) {
      setEstado("erro");
      setErro(
        arquivo === escolhido
          ? `o arquivo tem ${emMB(arquivo.size)} e o limite é ${emMB(teto)}`
          : `mesmo convertido o arquivo ficou com ${emMB(arquivo.size)}, acima do limite de ${emMB(teto)}`,
      );
      setConvertida(null);
      if (entrada.current) entrada.current.value = "";
      return;
    }

    setEstado("enviando");
    try {
      const { envio, caminho: destino } = await acaoAssinarUpload(
        slug,
        nome,
        arquivo.name,
      );

      const resposta = await fetch(envio, {
        method: "PUT",
        headers: { "content-type": arquivo.type || "application/octet-stream" },
        body: arquivo,
      });
      if (!resposta.ok)
        throw new Error(`o bucket recusou (${resposta.status})`);

      setCaminho(destino);
      nomearPeloArquivo(arquivo);
      setEstado("parado");
    } catch (e) {
      setEstado("erro");
      setErro(e instanceof Error ? e.message : "falhou");
      if (entrada.current) entrada.current.value = "";
    }
  }

  /**
   * Escreve o nome do arquivo no campo "Nome" do formulario.
   *
   * Cadastrar uma foto era digitar duas vezes a mesma coisa: escolher
   * `fachada-torre-a.png` no seletor e, logo acima, inventar um nome para ela.
   * O nome do arquivo ja é a resposta.
   *
   * **A regra muda com o campo, e é o que o `type` diz:**
   *
   * - **Escondido** (`imagens.nome`, ver `oculto` em `lib/admin/tabelas.ts`):
   *   ele existe só para acompanhar o arquivo, e ninguem digita nele. Trocar a
   *   foto troca o nome, sempre.
   * - **Visivel** (Documentos, e o resto do painel): só preenche o que esta
   *   vazio. Trocar o arquivo de um registro que ja tem nome nao pode apagar o
   *   que alguem escreveu — inclusive porque este nome aparece para o
   *   investidor.
   *
   * Chega no campo pelo DOM, e nao por prop atravessando o formulario: os dois
   * vivem no mesmo `<form>`, e `form.elements` é a ligacao que ja existe entre
   * eles. Os campos sao nao controlados (`defaultValue`), entao o valor escrito
   * aqui é o que o `FormData` le no envio.
   */
  function nomearPeloArquivo(arquivo: File) {
    const campo = entrada.current?.form?.elements.namedItem("nome");
    if (!(campo instanceof HTMLInputElement)) return;
    if (campo.type !== "hidden" && campo.value.trim() !== "") return;
    campo.value = semExtensao(arquivo.name);
  }

  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden className="text-red-600">
            {" "}
            *
          </span>
        )}
      </span>

      {/* O que o formulario envia. `required` aqui, e nao no seletor: o que
          precisa existir é o caminho, e num registro que ja tem arquivo o
          seletor fica legitimamente vazio. */}
      <input type="hidden" name={nome} value={caminho} required={obrigatorio} />

      <input
        ref={entrada}
        type="file"
        accept={aceita}
        disabled={estado === "convertendo" || estado === "enviando"}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) enviar(arquivo);
        }}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-marinho file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul disabled:opacity-60"
      />

      {/* `aria-live` porque a compressao de uma foto grande leva alguns
          segundos, e ate aqui a unica pista de que algo acontecia era o campo
          desabilitado. */}
      <span className="mt-1 block text-xs text-neutral-400" aria-live="polite">
        {estado === "convertendo"
          ? "Convertendo a imagem..."
          : estado === "enviando"
            ? "Enviando..."
            : estado === "erro"
              ? `Nao subiu: ${erro}`
              : caminho
                ? `Guardado: ${caminho}`
                : (ajuda ?? "Nenhum arquivo ainda.")}
      </span>

      {/* Fica separado do resto: quem escolheu um arquivo de 30 MB precisa
          saber que o que subiu nao é bem o que ele escolheu. */}
      {convertida && estado !== "erro" && (
        <span className="mt-0.5 block text-xs text-neutral-500">
          {convertida}
        </span>
      )}
    </label>
  );
}
