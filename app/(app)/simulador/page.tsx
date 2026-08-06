import type { Metadata } from "next";
import Image from "next/image";
import { exigirSessao } from "@/lib/auth";
import { getContratosParaSimular } from "@/lib/portal/dados";
import { Simulador } from "./_componentes/simulador";

export const metadata: Metadata = {
  title: "Simulador ARI · Meu ARI",
};

// Le a sessao e os contratos de quem entrou: nada de resposta guardada.
export const dynamic = "force-dynamic";

/**
 * O simulador de aporte.
 *
 * Mesma casca da tela do empreendimento — fundo cinza levissimo, pilha de
 * cartoes brancos, tudo em preto —, com outro conteudo. Duas telas do mesmo app
 * que se parecem sao duas telas que a pessoa ja sabe ler na primeira vez.
 *
 * Ele simula sobre o que a pessoa ja tem — capital e participacao do proprio
 * contrato —, e nao sobre um cenario em branco. É o que separa um simulador de
 * uma calculadora: aqui a resposta ja é a dela.
 *
 * É secao, como o portal e as obras: a moldura fica de pé e só o miolo troca —
 * ver `SECOES` em `Moldura`. Antes era tela cheia com "Voltar" proprio, e o
 * botao do meio da barra levava para fora do app.
 */
export default async function SimuladorPage() {
  const sessao = await exigirSessao("/simulador");

  /*
   * Do banco vem só o que é da pessoa: capital e participacao de cada contrato.
   * A tabela de taxas é regra de produto e mora no codigo — ver `TAXAS`, em
   * `lib/portal/simulacao.ts`.
   */
  const contratos = await getContratosParaSimular(sessao.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 bg-[#F7F8FA] px-5 pt-5 pb-28 sm:px-8 md:pt-8 md:pb-12">
      {/* Sem "Voltar": o simulador virou secao, entao a saida é a mesma das
          outras — a barra do rodape no celular, a coluna da esquerda no
          desktop. */}
      {/* Centrado e sozinho: a tela tem uma pergunta só, e o titulo é a capa
          dela — nao o comeco de um texto. */}
      <h1 className="mb-5 animate-surgir text-center text-[1.75rem] leading-tight font-bold tracking-tight text-balance text-black">
        Simulador ARI
      </h1>

      {contratos.length > 0 ? (
        <Simulador contratos={contratos} />
      ) : (
        /*
         * Sem contrato nao ha o que simular: o simulador projeta sobre capital
         * e participacao existentes, e sem eles a tela viraria uma calculadora
         * de numeros inventados.
         */
        <div className="sombra-cartao flex animate-surgir flex-col items-center rounded-[20px] bg-white px-6 py-10 text-center [animation-delay:60ms]">
          <Image
            src="/icons/3dicons-rocket-dynamic-color.png"
            alt=""
            width={160}
            height={160}
            className="h-20 w-20 animate-boiar drop-shadow-[0_12px_18px_rgba(0,20,73,0.3)]"
          />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-balance text-neutral-500">
            A simulação parte do seu contrato — capital e participação. Assim
            que o seu primeiro aporte entrar, ela aparece aqui.
          </p>
        </div>
      )}
    </main>
  );
}
