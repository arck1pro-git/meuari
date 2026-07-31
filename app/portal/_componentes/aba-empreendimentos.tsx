"use client";

import Link from "next/link";
import { useState } from "react";
import type { Arquivo, Empreendimento } from "@/lib/portal/dados";
import { formatarData } from "@/lib/portal/formato";
import { IconeGaleria, IconeSetaDireita, IconeSetaEsquerda } from "./icones";
import { Cartao, Etiqueta } from "./ui";

/*
 * As obras em que a pessoa aportou, e a ficha de cada uma.
 *
 * Dois niveis, e nao tudo aberto de uma vez: a lista responde "onde eu estou" e
 * a ficha responde "o que tem aqui". Com uma obra só a lista parece supérflua,
 * mas ela é o que faz a segunda caber sem redesenho.
 *
 * As fotos voltaram para ca — nao como grade dentro da ficha, mas como porta
 * para a galeria daquela obra. Elas sairam do botao do meio do rodape, que
 * mostrava todas juntas: foto pertence a uma obra, e o lugar dela é junto do
 * resto do que aquela obra tem a mostrar.
 */

export function AbaEmpreendimentos({
  empreendimentos,
}: {
  empreendimentos: Empreendimento[];
}) {
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const aberto = empreendimentos.find((e) => e.id === abertoId);

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

  if (aberto) return <Ficha empreendimento={aberto} voltar={() => setAbertoId(null)} />;

  return (
    <div className="escalonar space-y-3">
      {empreendimentos.map((empreendimento) => (
        <button
          key={empreendimento.id}
          type="button"
          onClick={() => setAbertoId(empreendimento.id)}
          className="sombra-cartao hover:sombra-cartao-alta group block w-full rounded-2xl border border-tinta/12 bg-white p-5 text-left transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 sm:p-8"
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
        </button>
      ))}
    </div>
  );
}

function Ficha({
  empreendimento,
  voltar,
}: {
  empreendimento: Empreendimento;
  voltar: () => void;
}) {
  return (
    <div className="escalonar space-y-4">
      <button
        type="button"
        onClick={voltar}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-marinho transition-colors hover:text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
      >
        <IconeSetaEsquerda className="h-4 w-4" />
        Obras
      </button>

      <Cartao
        titulo={empreendimento.nome}
        apoio={empreendimento.descricao ?? undefined}
        acessorio={
          empreendimento.previsaoInicioObras ? (
            <Etiqueta>
              Início das obras:{" "}
              {formatarData(empreendimento.previsaoInicioObras)}
            </Etiqueta>
          ) : undefined
        }
      >
        <div className="space-y-8">
          {/* A galeria abre em pagina propria, e nao aqui dentro: foto de obra
              pede tela inteira, e a ficha continua sendo a lista do que existe
              para ver e baixar. */}
          {empreendimento.imagens.length > 0 && (
            <Link
              href={`/galeria/${empreendimento.id}`}
              className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-4 transition-colors duration-200 hover:bg-azul/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ciano/20 text-marinho">
                <IconeGaleria className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-tinta">
                  Fotos da obra
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {empreendimento.imagens.length}{" "}
                  {empreendimento.imagens.length === 1 ? "foto" : "fotos"} ·
                  atualizado em{" "}
                  {formatarData(empreendimento.imagens[0].data)}
                </span>
              </span>
              <IconeSetaDireita className="h-5 w-5 shrink-0 text-marinho transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}

          <Documentos arquivos={empreendimento.documentos} />
          <Videos arquivos={empreendimento.videos} />

          {empreendimento.documentos.length === 0 &&
            empreendimento.videos.length === 0 &&
            empreendimento.imagens.length === 0 && (
              <p className="text-sm text-neutral-500">
                Nada publicado ainda para esta obra.
              </p>
            )}
        </div>
      </Cartao>
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs tracking-wide text-neutral-500 uppercase">
      {children}
    </h3>
  );
}

function Documentos({ arquivos }: { arquivos: Arquivo[] }) {
  if (arquivos.length === 0) return null;

  return (
    <div>
      <Titulo>Documentos</Titulo>
      <ul className="mt-3 divide-y divide-neutral-100 border-y border-neutral-100">
        {arquivos.map((arquivo) => (
          <li key={arquivo.id}>
            <a
              href={arquivo.url}
              download
              className="group flex items-center gap-4 rounded-lg px-2 py-4 transition-colors duration-200 hover:bg-azul/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-tinta">
                  {arquivo.nome}
                </span>
                <span className="mt-1 block text-xs text-neutral-400 tabular-nums">
                  {formatarData(arquivo.data)}
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
}

function Videos({ arquivos }: { arquivos: Arquivo[] }) {
  if (arquivos.length === 0) return null;

  return (
    <div>
      <Titulo>Vídeos</Titulo>
      <ul className="mt-3 divide-y divide-neutral-100 border-y border-neutral-100">
        {arquivos.map((arquivo) => (
          <li key={arquivo.id}>
            <a
              href={arquivo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-lg px-2 py-4 transition-colors duration-200 hover:bg-azul/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-tinta">
                  {arquivo.nome}
                </span>
                <span className="mt-1 block text-xs text-neutral-400 tabular-nums">
                  {formatarData(arquivo.data)}
                </span>
              </span>
              <span className="shrink-0 text-sm text-neutral-400 transition-colors duration-200 group-hover:text-azul">
                Assistir
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
