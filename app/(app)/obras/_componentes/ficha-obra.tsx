import type { Obra } from "@/lib/portal/dados";
import { formatarDataCurta } from "@/lib/portal/formato";
import { mediaDasEtapas } from "./andamento";
import { BarraDeAndamento } from "./barra-andamento";
import { CartaoObra } from "./cartao-obra";

/**
 * A ficha do empreendimento: o contexto antes dos numeros, e depois os numeros.
 *
 * A ordem é a da leitura, e nao a do banco: primeiro o andamento — que é o que
 * a pessoa abriu a tela para ver —, e so entao as datas, em blocos de titulo
 * pequeno, valor grande e apoio curto.
 *
 * **Tudo preto.** A hierarquia aqui é de tamanho e de peso, e nao de cinza: o
 * rotulo é pequeno e em caixa alta, o valor é grande e em negrito, o apoio é
 * miudo. Foi pedido assim, e funciona porque o cartao tem poucas linhas — num
 * texto corrido, preto em tudo viraria um bloco sem entrada.
 *
 * Tudo aqui sai do banco. O que nao existe nao vira linha: sem etapas nao ha
 * barra, sem entrega prevista nao ha bloco de entrega. Preencher buraco de
 * ficha com "a definir" é o comeco de uma tela que ninguem confere.
 */
export function FichaObra({ obra }: { obra: Obra }) {
  const media = mediaDasEtapas(obra.etapas);

  const blocos = [
    obra.previsaoEntrega && {
      rotulo: "Entrega prevista",
      valor: formatarDataCurta(obra.previsaoEntrega),
      apoio: "previsão do incorporador",
    },
    obra.previsaoInicioObras && {
      rotulo: "Início das obras",
      valor: formatarDataCurta(obra.previsaoInicioObras),
      apoio: "previsto",
    },
    /*
     * A data do ultimo movimento desceu de cima da foto para ca: ao lado das
     * outras duas ela é comparavel — o que foi prometido, e quando a obra
     * mexeu pela ultima vez.
     */
    obra.atualizadoEm && {
      rotulo: "Atualizado em",
      valor: formatarDataCurta(obra.atualizadoEm),
      apoio: "última mudança publicada",
    },
    // Contagem de projeto, de arquivo e de foto saiu daqui: "3 de 11" ja esta
    // ao lado da barra, o botao flutuante traz o numero de documentos, e as
    // fotos estao logo acima — para ver, e nao para contar.
  ].filter(
    (bloco): bloco is { rotulo: string; valor: string; apoio: string } =>
      Boolean(bloco),
  );

  return (
    <CartaoObra>
      {/*
       * O andamento é o protagonista do cartao — era uma linha de 1px perdida
       * entre contagens, e é o dado que a pessoa abriu a tela para ver.
       *
       * A chamada do empreendimento abria este bloco e saiu: ela repetia, em
       * frase de venda, o que a foto e o nome logo acima ja dizem.
       */}
      {media !== null && <BarraDeAndamento etapas={obra.etapas} />}

      {blocos.length > 0 && (
        <dl
          className={`grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 ${
            media !== null ? "mt-7 border-t border-tinta/[0.06] pt-7" : ""
          }`}
        >
          {blocos.map((bloco) => (
            <div key={bloco.rotulo}>
              <dt className="text-[0.625rem] font-semibold tracking-[0.08em] text-black uppercase">
                {bloco.rotulo}
              </dt>
              <dd className="mt-1 text-[0.9375rem] leading-tight font-bold tabular-nums text-black">
                {bloco.valor}
              </dd>
              <dd className="mt-0.5 text-[0.6875rem] text-black">
                {bloco.apoio}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </CartaoObra>
  );
}
