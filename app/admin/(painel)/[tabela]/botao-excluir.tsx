"use client";

import { BotaoEnviar } from "../_componentes/botao-enviar";

/**
 * O "Excluir" de cada linha, com uma pergunta antes.
 *
 * Ele fica a um pixel do "Editar", numa tabela de contratos e creditos, e nao
 * tinha nenhuma confirmacao: o clique errado ja era o registro apagado. O
 * `confirm` do navegador é feio, mas é sincrono e bloqueia o envio de verdade —
 * um dialogo proprio aqui exigiria estado por linha para segurar o `submit`.
 *
 * A pergunta diz **qual** registro: "Excluir o contrato de Douglas · Turmalina
 * Tower?". Com "Excluir este registro?" a confirmacao virava reflexo — a mesma
 * frase para toda linha nao ajuda ninguem a perceber que clicou na errada.
 *
 * Neutro ate o ponteiro chegar: vinte botoes vermelhos numa coluna gritam mais
 * que os dados. O vermelho aparece no hover e no foco, que é quando a pessoa ja
 * esta decidindo.
 *
 * Isto nao substitui a guarda do banco: quem tem vinculo continua sendo barrado
 * pelo `ON DELETE RESTRICT`, e a tela explica. Esta pergunta é para o resto, que
 * some sem reclamar.
 */
export function BotaoExcluir({
  oQue,
  consequencia = "Isso não tem volta.",
}: {
  /** "o contrato de Douglas", "esta etapa". */
  oQue: string;
  /** A segunda linha da pergunta, quando ha mais a dizer. */
  consequencia?: string;
}) {
  return (
    <BotaoEnviar
      enviando="Excluindo…"
      onClick={(evento) => {
        if (!confirm(`Excluir ${oQue}?\n\n${consequencia}`)) {
          evento.preventDefault();
        }
      }}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:ring-2 focus-visible:ring-red-400"
    >
      Excluir
    </BotaoEnviar>
  );
}
