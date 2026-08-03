import Image from "next/image";
import { FraseRotativa } from "./frase-rotativa";
import { IconeSetaDireita } from "./icones";
import { Etiqueta } from "./ui";

/** O que so existe quando ha aporte. Sem carteira, nada disso tem valor. */
type Resultado = {
  /** So o percentual, ex.: `2,60%` — o "ao mes" ja esta na frase. */
  participacao: string;
  /** Com sinal, ex.: `+R$ 122.329,03`. */
  rendimento: string;
  /** Sem sinal — entra no meio de uma frase. Ex.: `61,16%`. */
  rentabilidade: string;
  /** Quantos meses a posicao cobre, contados do primeiro aporte. */
  meses: number;
  subiu: boolean;
};

export function CartaoSaldo({
  saldo,
  resultado,
}: {
  saldo: string;
  /** `null` = carteira vazia. */
  resultado: Resultado | null | undefined;
}) {
  return (
    // Sombra em dois degraus e puxada para baixo: a primeira camada assenta o
    // cartao e a segunda, mais aberta, faz a queda. O spread negativo segura as
    // laterais, entao a sombra le como peso na base e nao como halo em volta.
    // Tingida de `tinta` — preto puro sobre branco esverdeia a borda.
    <div className="sombra-cartao hover:sombra-cartao-alta mx-auto w-full max-w-sm animate-surgir rounded-2xl bg-white px-5 py-4 ring-1 ring-tinta/10 transition-shadow duration-300 md:flex md:max-w-none md:items-center md:justify-between md:gap-10 md:px-8 md:py-6 [animation-delay:90ms]">
      {/*
       * `contents` no mobile: o invólucro nao existe para o layout, e as duas
       * partes seguem empilhadas como sempre. A partir do desktop ele vira
       * bloco e passa a ser a coluna da esquerda do cartao. Assim a mudanca é
       * so de CSS — a marcacao é a mesma nos dois tamanhos.
       */}
      <div className="contents md:block">
        {/* O atalho sobe para a linha do saldo e centra com ele; a frase abaixo
            fica com a largura inteira do cartao. */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            {saldo}
          </p>

          {/* Ancora comum: o alvo esta logo abaixo, na mesma pagina. Sem aporte
              nao ha historico para onde levar. */}
          {resultado && (
            <a
              href="#historico"
              className="group inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 md:ml-6"
            >
              Historico
              <IconeSetaDireita className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          )}
        </div>

        {resultado ? (
          <p
            className={`mt-1.5 text-xs font-medium ${
              resultado.subiu ? "text-azul" : "text-neutral-500"
            }`}
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
                    {resultado.rendimento} nos últimos {resultado.meses} meses
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
                  <span>
                    Seus aportes acumularam {resultado.rentabilidade} até agora
                  </span>
                </span>,
              ]}
            />
            {/* As duas frases de uma vez para quem le por audio — a versao
                visivel se reescreve sozinha e por isso é `aria-hidden`. */}
            <span className="sr-only">
              {resultado.rendimento} nos últimos {resultado.meses} meses. Seus
              aportes acumularam {resultado.rentabilidade} até agora.
            </span>
          </p>
        ) : (
          /* Carteira vazia: nada de frase rotativa nem de participacao — nao ha
             numero para girar. */
          <p className="mt-1.5 text-xs font-medium text-neutral-500">
            Você ainda não tem aportes registrados.
          </p>
        )}
      </div>

      {/* A participacao vai para a direita no desktop, e continua embaixo no
          mobile. `shrink-0` para a frase nao ser espremida pelo numero. */}
      {resultado && (
        <p className="mt-2.5 md:mt-0 md:max-w-xs md:shrink-0">
          <Etiqueta tom="destaque">
            {/* Uma taxa só: a participacao vigente vale para o capital
                inteiro, e é a ultima contratada. */}
            Sua participação nos resultados é de{" "}
            <span className="font-semibold">{resultado.participacao}</span> ao
            mês com o <span className="font-bold text-ouro">ARI</span>
          </Etiqueta>
        </p>
      )}
    </div>
  );
}
