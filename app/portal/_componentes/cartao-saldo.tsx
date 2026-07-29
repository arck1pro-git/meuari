import Image from "next/image";
import { FraseRotativa } from "./frase-rotativa";
import { IconeSetaDireita } from "./icones";
import { Etiqueta } from "./ui";

export function CartaoSaldo({
  taxa,
  saldo,
  rendimento,
  rentabilidade,
  meses,
  subiu,
}: {
  /** So o percentual, ex.: `2,60%` — o "ao mes" ja esta na frase. */
  taxa: string;
  saldo: string;
  /** Com sinal, ex.: `+R$ 122.329,03`. */
  rendimento: string;
  /** Sem sinal — entra no meio de uma frase. Ex.: `61,16%`. */
  rentabilidade: string;
  /** Quantos meses a posicao cobre, contados do primeiro aporte. */
  meses: number;
  subiu: boolean;
}) {
  return (
    // Sombra em dois degraus e puxada para baixo: a primeira camada assenta o
    // cartao e a segunda, mais aberta, faz a queda. O spread negativo segura as
    // laterais, entao a sombra le como peso na base e nao como halo em volta.
    // Tingida de `tinta` — preto puro sobre branco esverdeia a borda.
    // O `id` é o gatilho do cabecalho: ele observa este cartao para saber
    // quando assumir o saldo.
    <div
      id="saldo"
      className="sombra-cartao hover:sombra-cartao-alta mx-auto w-full max-w-sm animate-surgir rounded-2xl bg-white px-5 py-4 ring-1 ring-tinta/10 transition-shadow duration-300 [animation-delay:90ms]">
      {/* O atalho sobe para a linha do saldo e centra com ele; a frase abaixo
          fica com a largura inteira do cartao. */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
          {saldo}
        </p>

        {/* Ancora comum: o alvo esta na mesma pagina. Quem cuida de abrir a aba
            certa antes de rolar é o componente `Abas`. */}
        <a
          href="#historico"
          className="group inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
        >
          Historico
          <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>
      </div>

      <p
        className={`mt-1.5 text-xs font-medium ${subiu ? "text-azul" : "text-neutral-500"}`}
      >
          {/* O icone entra dentro da frase, e nao ao lado do bloco: assim ele
              troca no mesmo movimento do texto, e nao fica parado enquanto a
              frase desliza por baixo. */}
          <FraseRotativa
            intervaloMs={10000}
            frases={[
              <span key="valor" className="flex items-start gap-1.5">
                <Image
                  src="/icons/3dicons-rocket-dynamic-color.png"
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0"
                />
                <span>
                  {rendimento} nos últimos {meses} meses
                </span>
              </span>,
              <span key="percentual" className="flex items-start gap-1.5">
                <Image
                  src="/icons/3dicons-dollar-dynamic-color.png"
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0"
                />
                <span>Seus aportes acumularam {rentabilidade} até agora</span>
              </span>,
            ]}
          />
          {/* As duas frases de uma vez para quem le por audio — a versao
              visivel se reescreve sozinha e por isso é `aria-hidden`. */}
          <span className="sr-only">
            {rendimento} nos últimos {meses} meses. Seus aportes acumularam{" "}
            {rentabilidade} até agora.
          </span>
      </p>

      <p className="mt-2.5">
        <Etiqueta tom="destaque">
          Sua participação nos resultados é de{" "}
          <span className="font-semibold">{taxa}</span> ao mês com o ARI
        </Etiqueta>
      </p>
    </div>
  );
}
