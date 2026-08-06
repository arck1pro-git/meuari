import type { Arquivo } from "@/lib/portal/dados";
import { formatarData } from "@/lib/portal/formato";
import {
  IconeBaixar,
  IconeTransparencia,
  IconeVideo,
} from "../../portal/_componentes/icones";

/**
 * Os papeis do empreendimento: o que se baixa e o que se assiste.
 *
 * Duas listas juntas, e nao duas secoes: sao a mesma coisa para quem procura —
 * material publicado sobre a obra —, e a diferenca esta no verbo do fim da
 * linha.
 *
 * Sem cartao proprio: hoje quem abre isto é a folha que sobe do botao
 * flutuante, e ela ja é a superficie branca. Cartao dentro de cartao é caixa
 * dentro de caixa.
 */
export function Documentos({
  documentos,
  videos,
}: {
  documentos: Arquivo[];
  videos: Arquivo[];
}) {
  if (documentos.length === 0 && videos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">
        Nada publicado ainda para esta obra.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sem subtitulo na primeira lista: a folha inteira ja se chama
          Documentos, e repetir a palavra logo abaixo do titulo nao separava
          nada. Os videos mantem o deles, que ai sim divide duas coisas. */}
      <Lista arquivos={documentos} acao="Baixar" />
      <Lista titulo="Vídeos" arquivos={videos} acao="Assistir" />
    </div>
  );
}

function Lista({
  titulo,
  arquivos,
  acao,
}: {
  /** Opcional: sem ele a lista comeca direto, sem cabecalho proprio. */
  titulo?: string;
  arquivos: Arquivo[];
  /** `Baixar` guarda o arquivo; `Assistir` abre em outra aba. */
  acao: "Baixar" | "Assistir";
}) {
  if (arquivos.length === 0) return null;
  const baixar = acao === "Baixar";

  return (
    <div>
      {titulo && (
        <h3 className="mb-3 text-xs tracking-wide text-neutral-500 uppercase">
          {titulo}
        </h3>
      )}

      <ul className="divide-y divide-tinta/[0.06]">
        {arquivos.map((arquivo) => (
          <li key={arquivo.id}>
            <a
              href={arquivo.url}
              // O video abre em aba nova porque `download` numa URL assinada de
              // video baixaria o arquivo inteiro em vez de tocar.
              {...(baixar
                ? { download: true }
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-3.5 transition-colors duration-200 hover:bg-tinta/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              {/* A pastilha com o icone diz o tipo do arquivo antes da leitura
                  do nome, e da a linha uma ancora visual no comeco. */}
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-marinho/[0.07] text-marinho transition-colors duration-200 group-hover:bg-marinho/[0.12]"
              >
                {baixar ? (
                  <IconeTransparencia className="h-4.5 w-4.5" />
                ) : (
                  <IconeVideo className="h-4.5 w-4.5" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-tinta">
                  {arquivo.nome}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] text-neutral-400 tabular-nums">
                  {formatarData(arquivo.data)}
                </span>
              </span>
              {/*
               * O verbo virou botao. Ele era um cinza claro no fim da linha, do
               * tamanho da data — a acao principal da folha parecia legenda. Um
               * botao de verdade nao muda o que a linha faz (o alvo continua
               * sendo a linha inteira), muda o que ela promete.
               */}
              <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-marinho px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 group-hover:bg-azul">
                {acao}
                {baixar ? (
                  <IconeBaixar className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />
                ) : (
                  <IconeVideo className="h-3.5 w-3.5" />
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
