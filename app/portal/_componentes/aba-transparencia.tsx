import type { Documento, Empreendimento, EtapaObra } from "@/lib/portal/dados";
import { Cartao, Etiqueta } from "./ui";

const ROTULO_DO_STATUS: Record<EtapaObra["status"], string> = {
  concluida: "Concluida",
  "em-andamento": "Em andamento",
  prevista: "Prevista",
};

const CATEGORIAS: Documento["categoria"][] = [
  "Contratos",
  "Financeiro",
  "Obra",
  "Juridico",
];

export function AbaTransparencia({
  empreendimento,
}: {
  empreendimento: Empreendimento;
}) {
  return (
    <div className="escalonar space-y-4">
      <Cartao
        id="obra"
        titulo="Andamento da obra"
        apoio={empreendimento.endereco}
        acessorio={
          <Etiqueta>
            Entrega prevista: {empreendimento.previsaoEntrega}
          </Etiqueta>
        }
      >
        <div className="flex items-end justify-between gap-4">
          <p className="text-sm text-neutral-500">Execucao fisica geral</p>
          <p className="text-4xl font-semibold tracking-tight text-tinta">
            {empreendimento.percentualConcluido}%
          </p>
        </div>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-marinho/10"
          role="img"
          aria-label={`Obra ${empreendimento.percentualConcluido}% concluida`}
        >
          <div
            className="h-full origin-left animate-preencher rounded-full bg-marinho [animation-delay:300ms]"
            style={{ width: `${empreendimento.percentualConcluido}%` }}
          />
        </div>

        <ul className="mt-8 space-y-6">
          {empreendimento.etapas.map((etapa) => (
            <li
              key={etapa.id}
              className="border-t border-neutral-100 pt-6 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-tinta">
                  {etapa.nome}
                </h3>
                <Etiqueta>
                  {ROTULO_DO_STATUS[etapa.status]} · {etapa.percentual}%
                </Etiqueta>
              </div>
              <div
                className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-neutral-100"
                aria-hidden
              >
                <div
                  className={`h-full origin-left animate-preencher rounded-full [animation-delay:400ms] ${
                    etapa.status === "concluida" ? "bg-marinho" : "bg-azul"
                  }`}
                  style={{ width: `${etapa.percentual}%` }}
                />
              </div>
              <p className="mt-2.5 text-sm text-neutral-600">
                {etapa.descricao}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{etapa.previsao}</p>
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao
        titulo="Relatorios de andamento"
        apoio="O que aconteceu em obra a cada mes, por escrito."
      >
        <div className="space-y-8">
          {empreendimento.relatorios.map((relatorio) => (
            <article
              key={relatorio.id}
              className="border-t border-neutral-100 pt-8 first:border-0 first:pt-0"
            >
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {relatorio.competencia}
              </p>
              <h3 className="mt-1.5 text-base font-semibold tracking-tight text-tinta">
                {relatorio.titulo}
              </h3>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-600">
                {relatorio.paragrafos.map((paragrafo, indice) => (
                  <p key={indice}>{paragrafo}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Cartao>

      <Cartao
        id="documentos"
        titulo="Documentos"
        apoio={empreendimento.registro}
      >
        <div className="space-y-8">
          {CATEGORIAS.map((categoria) => {
            const documentos = empreendimento.documentos.filter(
              (documento) => documento.categoria === categoria,
            );
            if (documentos.length === 0) return null;

            return (
              <div key={categoria}>
                <h3 className="text-xs uppercase tracking-wide text-neutral-500">
                  {categoria}
                </h3>
                <ul className="mt-3 divide-y divide-neutral-100 border-y border-neutral-100">
                  {documentos.map((documento) => (
                    <li key={documento.id}>
                      <a
                        href={documento.arquivo}
                        download
                        className="group flex items-center gap-4 rounded-lg px-2 py-4 transition-colors duration-200 hover:bg-azul/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-tinta">
                            {documento.nome}
                          </span>
                          <span className="mt-0.5 block text-sm text-neutral-500">
                            {documento.descricao}
                          </span>
                          <span className="mt-1 block text-xs text-neutral-400">
                            {documento.competencia} · {documento.formato} ·{" "}
                            {documento.tamanho}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-neutral-400 transition-colors duration-200 group-hover:text-azul">
                          Baixar
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Cartao>
    </div>
  );
}
