"use client";

/**
 * O "Excluir" de cada linha, com uma pergunta antes.
 *
 * Ele fica a um pixel do "Editar", numa tabela de contratos e creditos, e nao
 * tinha nenhuma confirmacao: o clique errado ja era o registro apagado. O
 * `confirm` do navegador é feio, mas é sincrono e bloqueia o envio de verdade —
 * um dialogo proprio aqui exigiria estado por linha para segurar o `submit`.
 *
 * Isto nao substitui a guarda do banco: quem tem vinculo continua sendo barrado
 * pelo `ON DELETE RESTRICT`, e a tela explica. Esta pergunta é para o resto, que
 * some sem reclamar.
 */
export function BotaoExcluir({ oQue }: { oQue: string }) {
  return (
    <button
      type="submit"
      onClick={(evento) => {
        if (!confirm(`Excluir ${oQue}?\n\nIsso não tem volta.`)) {
          evento.preventDefault();
        }
      }}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
    >
      Excluir
    </button>
  );
}
