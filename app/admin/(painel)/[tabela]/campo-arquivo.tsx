"use client";

import { useEffect, useRef, useState } from "react";
import { acaoAssinarUpload } from "../../acoes";
import { paraWebp } from "./webp";

/**
 * `2026/3f9c1a2b-contrato-douglas.pdf` -> `contrato-douglas.pdf`.
 *
 * O ano e o sorteio na frente sao do bucket (ver `assinarUpload`): servem para
 * dois arquivos de mesmo nome nao se sobreporem, e nao dizem nada a quem olha.
 */
function nomeVisivel(caminho: string): string {
  return caminho.replace(/^\d{4}\/[0-9a-f]{8}-/i, "").split("/").pop() ?? "";
}

/** O que o campo aceita, dito como se fala: "PDF, até 15 MB". */
function oQueAceita(aceita: string | undefined, teto: number | undefined) {
  const tipo =
    aceita === "application/pdf"
      ? "PDF"
      : aceita === "image/*"
        ? "Foto (JPG, PNG ou WebP)"
        : "PDF, Word, Excel ou imagem";
  return teto ? `${tipo}, até ${emMB(teto).replace(",0 ", " ")}` : tipo;
}

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
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const trava = useRef<HTMLInputElement>(null);

  const ocupado = estado === "convertendo" || estado === "enviando";

  /*
   * A trava do "Salvar".
   *
   * O caminho viaja num `hidden`, e campo escondido nao entra na validacao do
   * navegador — nem o `required`. Entao dava para salvar com o envio ainda no
   * meio (e gravar o arquivo anterior, ou nenhum), e um documento obrigatorio
   * saia em branco. Esta caixa invisivel fica invalida enquanto houver motivo:
   * o navegador recusa o envio do formulario e mostra a frase ao lado do campo.
   */
  useEffect(() => {
    trava.current?.setCustomValidity(
      ocupado
        ? "Espere o arquivo terminar de subir."
        : obrigatorio && !caminho
          ? "Escolha um arquivo."
          : "",
    );
  }, [ocupado, obrigatorio, caminho]);

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
    <div className="relative">
      <span className="text-xs font-semibold text-neutral-600">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden className="text-red-600">
            {" "}
            *
          </span>
        )}
      </span>

      {/* O que o formulario envia: so o caminho no bucket. */}
      <input type="hidden" name={nome} value={caminho} />

      {/* A trava — ver o efeito acima. `onChange` vazio, e nao `readOnly`:
          campo somente leitura fica fora da validacao, e a trava nao travaria
          nada. O foco que o navegador da a ela volta para o seletor. */}
      <input
        ref={trava}
        tabIndex={-1}
        aria-hidden
        value=""
        onChange={() => {}}
        onFocus={() => entrada.current?.focus()}
        className="sr-only"
      />

      {/*
       * A area de soltar.
       *
       * O seletor de arquivo nativo cobre a area inteira, invisivel: clicar em
       * qualquer ponto abre a janela do sistema, e soltar um arquivo em cima
       * entrega ele ao proprio `input` — o navegador ja faz isso sozinho, sem
       * codigo de arrastar. O que este componente acrescenta é so o realce
       * enquanto o arquivo esta sendo arrastado por cima.
       *
       * Antes era o `input[type=file]` cru: um botao "Escolher arquivo" e, ao
       * lado, o caminho do bucket (`Guardado: 2026/3f9c1a2b-contrato.pdf`).
       */}
      <div
        onDragEnter={() => setArrastando(true)}
        onDragLeave={() => setArrastando(false)}
        onDrop={() => setArrastando(false)}
        className={`relative mt-1.5 flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 transition-colors duration-200 focus-within:border-azul focus-within:ring-2 focus-within:ring-azul ${
          estado === "erro"
            ? "border-red-300 bg-red-50/60"
            : arrastando
              ? "border-azul bg-indigo-50"
              : "border-zinc-300 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50"
        } ${ocupado ? "cursor-progress" : ""}`}
      >
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            caminho && !ocupado && estado !== "erro"
              ? "bg-emerald-100 text-verde"
              : "bg-white text-neutral-500 ring-1 ring-zinc-200"
          }`}
        >
          {ocupado ? (
            <Girando />
          ) : caminho && estado !== "erro" ? (
            <IconeDocumentoPronto />
          ) : (
            <IconeEnviar />
          )}
        </span>

        {/* `aria-live` porque a compressao de uma foto grande leva alguns
            segundos, e ate aqui a unica pista de que algo acontecia era o
            campo desabilitado. */}
        <span className="min-w-0 flex-1" aria-live="polite">
          <span className="block truncate text-sm font-medium text-tinta">
            {estado === "convertendo"
              ? "Convertendo a imagem…"
              : estado === "enviando"
                ? "Enviando…"
                : caminho && estado !== "erro"
                  ? nomeVisivel(caminho)
                  : "Escolher arquivo"}
          </span>
          <span
            className={`block truncate text-xs ${
              estado === "erro" ? "font-medium text-red-700" : "text-neutral-500"
            }`}
          >
            {estado === "erro"
              ? `Não subiu: ${erro}`
              : ocupado
                ? "Não feche o formulário."
                : caminho
                  ? "Clique ou arraste outro para trocar."
                  : `Clique ou arraste até aqui · ${oQueAceita(aceita, teto)}`}
          </span>
        </span>

        <input
          ref={entrada}
          type="file"
          accept={aceita}
          aria-label={rotulo}
          disabled={ocupado}
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) enviar(arquivo);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-progress"
        />
      </div>

      {/* A ajuda do registro, quando ha uma, e o que a conversao fez. Ficam
          separadas da area: quem escolheu um arquivo de 30 MB precisa saber
          que o que subiu nao é bem o que ele escolheu. */}
      {convertida && estado !== "erro" ? (
        <span className="mt-1 block text-xs text-neutral-500">
          {convertida}
        </span>
      ) : (
        ajuda && (
          <span className="mt-1 block text-xs text-neutral-400">{ajuda}</span>
        )
      )}
    </div>
  );
}

/** O mesmo circulo do `BotaoEnviar`, no tamanho do icone da area. */
function Girando() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 animate-spin" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Nuvem com seta: ainda nao ha arquivo. */
function IconeEnviar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V5" />
      <path d="m8 9 4-4 4 4" />
      <path d="M5 15v2.5A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

/** Folha com o visto: o arquivo esta guardado. */
function IconeDocumentoPronto() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5z" />
      <path d="M14 3.5v4h4" />
      <path d="m9.5 14 1.8 1.8 3.4-3.6" />
    </svg>
  );
}
