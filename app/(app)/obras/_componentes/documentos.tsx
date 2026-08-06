import type { Arquivo } from "@/lib/portal/dados";
import { formatarData } from "@/lib/portal/formato";
import {
  IconeBaixar,
  IconeTransparencia,
} from "../../portal/_componentes/icones";

/**
 * Os papeis do empreendimento.
 *
 * Havia uma segunda lista aqui, de videos, com "Assistir" no fim da linha. Ela
 * saiu junto com o modulo: nunca teve um video sequer, e uma secao que so
 * existe para dizer que esta vazia é peso.
 *
 * Sem cartao proprio: quem abre isto é a folha que sobe do botao flutuante, e
 * ela ja é a superficie branca. Cartao dentro de cartao é caixa dentro de
 * caixa.
 */
export function Documentos({ documentos }: { documentos: Arquivo[] }) {
  if (documentos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">
        Nada publicado ainda para esta obra.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-tinta/[0.06]">
      {documentos.map((arquivo) => (
        <li key={arquivo.id}>
          <a
            href={arquivo.url}
            download
            className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-3.5 transition-colors duration-200 hover:bg-tinta/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
          >
            {/* A pastilha com o icone diz o tipo do arquivo antes da leitura do
                nome, e da a linha uma ancora visual no comeco. */}
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-marinho/[0.07] text-marinho transition-colors duration-200 group-hover:bg-marinho/[0.12]"
            >
              <IconeTransparencia className="h-4.5 w-4.5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-tinta">
                {arquivo.nome}
              </span>
              <span className="mt-0.5 block text-[0.6875rem] text-neutral-400 tabular-nums">
                {formatarData(arquivo.data)}
              </span>
            </span>

            {/* O verbo é botao: ele era um cinza claro do tamanho da data, e a
                acao principal da folha lia como legenda. */}
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-marinho px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 group-hover:bg-azul">
              Baixar
              <IconeBaixar className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
