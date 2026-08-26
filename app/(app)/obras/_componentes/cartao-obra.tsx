/**
 * O cartao da ficha da obra.
 *
 * Mesma elevacao dos cartoes de aporte do `/portal` — `sombra-cartao` —, e nao
 * uma mais clara: o fundo cinza desta tela pedia menos peso na teoria, mas na
 * pratica o app inteiro passou a ter duas profundidades diferentes para a mesma
 * coisa, e as telas nao pareciam do mesmo produto.
 *
 * O que continua proprio daqui é a forma: canto de 20px e respiro interno
 * maior, porque este cartao carrega texto corrido e nao uma linha de numeros.
 */
export function CartaoObra({ children }: { children: React.ReactNode }) {
  return (
    <section className="sombra-cartao hover:sombra-cartao-alta rounded-[20px] md:rounded-lg bg-white p-6 transition-shadow duration-300 sm:p-7">
      {children}
    </section>
  );
}
