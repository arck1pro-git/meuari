"use client";

import { useRef, useState } from "react";
import { acaoAssinarUpload } from "../../acoes";

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
export function CampoArquivo({
  slug,
  nome,
  rotulo,
  valorAtual,
  obrigatorio,
  aceita,
  ajuda,
}: {
  slug: string;
  nome: string;
  rotulo: string;
  valorAtual: string;
  obrigatorio?: boolean;
  aceita?: string;
  ajuda?: string;
}) {
  const [caminho, setCaminho] = useState(valorAtual);
  const [estado, setEstado] = useState<"parado" | "enviando" | "erro">("parado");
  const [erro, setErro] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function enviar(arquivo: File) {
    setEstado("enviando");
    setErro(null);
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
      if (!resposta.ok) throw new Error(`o bucket recusou (${resposta.status})`);

      setCaminho(destino);
      setEstado("parado");
    } catch (e) {
      setEstado("erro");
      setErro(e instanceof Error ? e.message : "falhou");
      if (entrada.current) entrada.current.value = "";
    }
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
        disabled={estado === "enviando"}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) enviar(arquivo);
        }}
        className="mt-1 w-full rounded-lg border border-tinta/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-marinho file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul disabled:opacity-60"
      />

      <span
        className="mt-1 block text-xs text-neutral-400"
        aria-live="polite"
      >
        {estado === "enviando"
          ? "Enviando..."
          : estado === "erro"
            ? `Nao subiu: ${erro}`
            : caminho
              ? `Guardado: ${caminho}`
              : (ajuda ?? "Nenhum arquivo ainda.")}
      </span>
    </label>
  );
}
