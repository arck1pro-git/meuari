/**
 * O contorno da tela enquanto os dados vem.
 *
 * O portal é `force-dynamic`: cada visita consulta o banco e assina URLs no
 * Supabase, e isso custa algumas centenas de milissegundos. Sem um `loading`,
 * o Next segura a navegacao inteira ate a pagina ficar pronta — a pessoa toca
 * no rodape e nada acontece por um segundo, o que le como travamento.
 *
 * Com ele, a casca aparece na hora e o conteudo entra em seguida. O tempo total
 * é o mesmo; o que muda é ter ou nao resposta ao toque.
 *
 * Sao blocos cinza com a forma do que vai chegar — nao um rodopio no meio da
 * tela: o salto de layout é menor quando o vazio ja tem o tamanho certo.
 */
export function Esqueleto({ blocos = 3 }: { blocos?: number }) {
  return (
    <div aria-hidden className="animate-pulse space-y-6">
      {Array.from({ length: blocos }, (_, i) => (
        <div
          key={i}
          className="h-32 rounded-2xl bg-tinta/[0.06]"
          // O primeiro bloco é mais alto: no /portal ele é o cartao do saldo
          // mais o grafico, que juntos ocupam bem mais que um cartao de lista.
          style={i === 0 ? { height: "13rem" } : undefined}
        />
      ))}
    </div>
  );
}
