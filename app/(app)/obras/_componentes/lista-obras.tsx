import Link from "next/link";
import type { Empreendimento } from "@/lib/portal/dados";
import { formatarData } from "@/lib/portal/formato";
import { IconeSetaDireita } from "../../portal/_componentes/icones";
import { Cartao, Etiqueta } from "../../portal/_componentes/ui";

/*
 * As obras em que a pessoa aportou.
 *
 * Eram dois niveis no mesmo lugar: clicar trocava um estado e a ficha aparecia
 * por cima da lista. Agora cada obra é um endereco — `/obras/[id]` —, o que da
 * link para compartilhar, botao de voltar do navegador, e uma ficha com espaco
 * para o que ela ganhou: carrossel de fotos, andamento e documentos.
 *
 * Com isso o componente perdeu o `useState` e voltou a ser Server Component.
 */
export function ListaDeObras({
  empreendimentos,
}: {
  empreendimentos: Empreendimento[];
}) {
  if (empreendimentos.length === 0) {
    return (
      <div className="escalonar space-y-4">
        <Cartao titulo="Obras">
          <p className="text-sm text-neutral-500">
            Nenhuma obra vinculada ao seu contrato ainda. Quando o seu primeiro
            aporte for registrado, os documentos e as fotos aparecem aqui.
          </p>
        </Cartao>
      </div>
    );
  }

  return (
    <div className="escalonar space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
      {empreendimentos.map((empreendimento) => (
        <Link
          key={empreendimento.id}
          href={`/obras/${empreendimento.id}`}
          className="sombra-cartao hover:sombra-cartao-alta group block rounded-2xl border border-tinta/12 bg-white p-5 transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-tinta">
                {empreendimento.nome}
              </h2>
              {empreendimento.descricao && (
                <p className="mt-1 text-sm text-neutral-500">
                  {empreendimento.descricao}
                </p>
              )}
            </div>
            <IconeSetaDireita className="mt-0.5 h-5 w-5 shrink-0 text-marinho transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Etiqueta>
              {empreendimento.documentos.length}{" "}
              {empreendimento.documentos.length === 1
                ? "documento"
                : "documentos"}
            </Etiqueta>
            {empreendimento.imagens.length > 0 && (
              <Etiqueta>
                {empreendimento.imagens.length}{" "}
                {empreendimento.imagens.length === 1 ? "foto" : "fotos"}
              </Etiqueta>
            )}
            {empreendimento.previsaoInicioObras && (
              <Etiqueta>
                Início das obras:{" "}
                {formatarData(empreendimento.previsaoInicioObras)}
              </Etiqueta>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
