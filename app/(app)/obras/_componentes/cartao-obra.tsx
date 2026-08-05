/**
 * O cartao da ficha da obra.
 *
 * Existe separado do `Cartao` do portal por causa do fundo: aqui a tela é um
 * cinza levissimo, e o cartao branco ja se separa dele sozinho. A sombra pode
 * entao ser mais aberta e clara, o canto um pouco maior e o respiro interno
 * maior — o desenho de um app financeiro, em que o cartao é uma superficie e
 * nao uma caixa.
 *
 * Mudar o `Cartao` comum daria isto de graca aqui e estragaria as outras telas,
 * onde o fundo é branco e o cartao precisa do peso que ele tem hoje.
 */
export function CartaoObra({ children }: { children: React.ReactNode }) {
  return (
    <section className="sombra-suave hover:sombra-suave-alta rounded-[20px] bg-white p-6 transition-shadow duration-300 sm:p-7">
      {children}
    </section>
  );
}
