import type { Metadata } from "next";
import { apurarPosicao, montarHistorico } from "@/lib/portal/calculo";
import {
  DATA_REFERENCIA,
  getEmpreendimento,
  getInvestidorAtual,
} from "@/lib/portal/dados";
import {
  formatarMoeda,
  formatarPercentual,
} from "@/lib/portal/formato";
import { AbaAporte } from "./_componentes/aba-aporte";
import { AbaTransparencia } from "./_componentes/aba-transparencia";
import { Abas } from "./_componentes/abas";
import { Cabecalho } from "./_componentes/cabecalho";
import { CartaoSaldo } from "./_componentes/cartao-saldo";
import {
  IconeInvestimento,
  IconeTransparencia,
} from "./_componentes/icones";

export const metadata: Metadata = {
  title: "Meus aportes · Portal do Investidor Ari",
};

export default async function PortalPage() {
  const investidor = await getInvestidorAtual();
  const empreendimento = await getEmpreendimento();
  const posicao = apurarPosicao(investidor, DATA_REFERENCIA);
  const historico = montarHistorico(investidor);

  return (
    <div className="flex flex-1 flex-col">

      <Cabecalho
        nome={investidor.nome}
        saldo={formatarMoeda(posicao.saldoAtual)}
      />

      {/* pb reserva a altura da barra fixa do rodape, que agora existe em
          qualquer largura — sem isso o ultimo cartao fica sob ela. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 sm:px-8">
        <CartaoSaldo
          taxa={formatarPercentual(posicao.taxaAtual.taxaMensal)}
          saldo={formatarMoeda(posicao.saldoAtual)}
          rendimento={`+${formatarMoeda(posicao.rendimentoAcumulado)}`}
          rentabilidade={formatarPercentual(posicao.rentabilidadeAcumulada)}
          // A serie comeca no mes do primeiro aporte, entao o tamanho dela é o
          // numero de meses que a posicao cobre.
          meses={posicao.serie.length}
          subiu={posicao.rendimentoAcumulado >= 0}
        />

        <Abas
          className="mt-6"
          abas={[
            {
              id: "investimento",
              rotulo: "Meus aportes",
              icone: <IconeInvestimento className="h-4 w-4 shrink-0" />,
              conteudo: <AbaAporte posicao={posicao} historico={historico} />,
            },
            {
              id: "transparencia",
              rotulo: "Transparencia",
              icone: <IconeTransparencia className="h-4 w-4 shrink-0" />,
              conteudo: <AbaTransparencia empreendimento={empreendimento} />,
            },
          ]}
        />
      </main>
    </div>
  );
}
