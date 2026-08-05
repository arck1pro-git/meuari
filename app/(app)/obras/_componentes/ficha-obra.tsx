import type { Obra } from "@/lib/portal/dados";
import { formatarData } from "@/lib/portal/formato";
import { CartaoObra } from "./cartao-obra";

/**
 * A ficha do empreendimento: o que vale saber antes de escolher entre andamento
 * e documentos.
 *
 * Fica fora das abas de proposito. As duas abas respondem perguntas diferentes —
 * "como esta" e "onde estao os papeis" —, e a ficha é o que continua verdade nas
 * duas; escondê-la atras de uma terceira aba obrigaria a sair de uma resposta
 * para ler o contexto dela.
 *
 * Tudo aqui sai do banco. O que nao existe nao vira linha: sem descricao
 * cadastrada nao ha paragrafo, sem etapas nao ha andamento. Preencher buraco de
 * ficha com texto generico é o comeco de uma tela que ninguem confere.
 */
export function FichaObra({ obra }: { obra: Obra }) {
  const concluidos = obra.etapas.filter((e) => e.percentual >= 100).length;

  /*
   * A media das disciplinas, e nao "percentual da obra": cada etapa mede em que
   * fase aquele projeto esta, entao o que a media diz é o quanto o conjunto dos
   * projetos andou. O rotulo abaixo é literal sobre isso — chamar de "obra
   * concluida" seria dizer que o predio esta 74% de pe.
   */
  const media =
    obra.etapas.length > 0
      ? obra.etapas.reduce((soma, e) => soma + e.percentual, 0) /
        obra.etapas.length
      : null;

  const materiais = obra.documentos.length + obra.videos.length;

  return (
    <CartaoObra>
      {obra.descricao && (
        <p className="text-sm leading-relaxed text-neutral-600">
          {obra.descricao}
        </p>
      )}

      <dl
        className={`grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 ${
          obra.descricao ? "mt-6 border-t border-tinta/[0.06] pt-6" : ""
        }`}
      >
        {obra.previsaoInicioObras && (
          <Dado
            rotulo="Início das obras"
            valor={formatarData(obra.previsaoInicioObras)}
            apoio="previsto"
          />
        )}

        {obra.etapas.length > 0 && (
          <>
            <Dado
              rotulo="Projetos"
              valor={`${concluidos} de ${obra.etapas.length}`}
              apoio="finalizados"
            />
            <div className="col-span-2">
              <Dado
                rotulo="Média dos projetos"
                valor={`${media!.toFixed(0)}%`}
                apoio="das disciplinas do empreendimento"
              />
              {/* A mesma barra fina da lista de etapas, para as duas leituras
                  serem a mesma leitura. */}
              <div
                aria-hidden
                className="mt-2 h-1 overflow-hidden rounded-full bg-tinta/[0.06]"
              >
                <div
                  className="barra-ate h-full origin-left rounded-full bg-marinho/70"
                  style={
                    { "--preenchimento": media! / 100 } as React.CSSProperties
                  }
                />
              </div>
            </div>
          </>
        )}

        {materiais > 0 && (
          <Dado
            rotulo="Publicado"
            valor={String(materiais)}
            apoio={materiais === 1 ? "arquivo" : "arquivos"}
          />
        )}

        {obra.imagens.length > 0 && (
          <Dado
            rotulo="Fotos"
            valor={String(obra.imagens.length)}
            apoio={obra.imagens.length === 1 ? "imagem" : "imagens"}
          />
        )}
      </dl>
    </CartaoObra>
  );
}

function Dado({
  rotulo,
  valor,
  apoio,
}: {
  rotulo: string;
  valor: string;
  apoio: string;
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] tracking-wide text-neutral-400 uppercase">
        {rotulo}
      </dt>
      <dd className="mt-1 text-base font-bold tabular-nums text-tinta">
        {valor}{" "}
        <span className="text-xs font-normal text-neutral-500">{apoio}</span>
      </dd>
    </div>
  );
}
