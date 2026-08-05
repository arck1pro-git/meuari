"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * O seletor da obra: ficha, andamento e documentos.
 *
 * Os blocos vinham empilhados, e a lista de projetos empurrava os papeis para
 * bem longe do topo. Como sao assuntos que ninguem le ao mesmo tempo, eles
 * dividem o mesmo espaco.
 *
 * Estado no cliente, e nao na URL: aqui a escolha nao vale a pena ser
 * compartilhada nem sobreviver ao "voltar" — é a mesma tela vista de tres
 * angulos, e a troca precisa ser instantanea. Os tres conteudos chegam
 * renderizados do servidor, como props; nada é buscado de novo ao trocar.
 *
 * Os icones sao os 3D de `public/icons`, como no login e no cartao de saldo — e
 * nao os tracos do resto do app. Aqui eles sao o unico ornamento da tela: a
 * folha, o alvo e a pasta dizem "o que é", "onde esta" e "os papeis dela".
 */
const ABAS = [
  {
    id: "informacoes",
    rotulo: "Informações",
    icone: "/icons/3dicons-file-text-dynamic-color.png",
  },
  {
    id: "progresso",
    rotulo: "Andamento",
    icone: "/icons/3dicons-target-dynamic-color.png",
  },
  {
    id: "documentos",
    rotulo: "Documentos",
    icone: "/icons/3dicons-folder-dynamic-color.png",
  },
] as const;

type Aba = (typeof ABAS)[number]["id"];

export function AbasDaObra({
  informacoes,
  progresso,
  documentos,
}: {
  informacoes: React.ReactNode;
  progresso: React.ReactNode;
  documentos: React.ReactNode;
}) {
  /*
   * A ficha abre a tela. Ela era o bloco fixo acima do seletor, e virar aba nao
   * deveria custar uma escolha a mais para quem chega: quem abre a obra quer
   * primeiro saber que obra é.
   */
  const [aberta, setAberta] = useState<Aba>("informacoes");

  const conteudo: Record<Aba, React.ReactNode> = {
    informacoes,
    progresso,
    documentos,
  };

  return (
    <div>
      {/*
       * O trilho ocupa a largura do cartao abaixo dele: encolhido ao tamanho
       * dos icones, ele ficava solto no meio de uma pilha em que tudo mais
       * corre de borda a borda, e a coluna da tela perdia a linha reta.
       *
       * O nome de cada aba continua existindo para leitor de tela (`sr-only`) e
       * no `title`, que responde ao mouse parado — quem nao reconhecer a folha,
       * o alvo ou a pasta tem onde conferir.
       */}
      <div
        role="tablist"
        aria-label="O que ver desta obra"
        className="mb-[22px] grid grid-cols-3 gap-1 rounded-2xl bg-tinta/[0.045] p-1"
      >
        {ABAS.map(({ id, rotulo, icone }) => {
          const ativa = id === aberta;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`aba-${id}`}
              aria-selected={ativa}
              aria-controls={`painel-${id}`}
              title={rotulo}
              onClick={() => setAberta(id)}
              // Cada botao é um terco do trilho; a altura fixa é o que mantem o
              // alvo de toque que o rotulo dava antes.
              className={`flex h-11 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul ${
                ativa ? "sombra-suave bg-white" : "hover:bg-white/60"
              }`}
            >
              {/* O icone da aba fechada fica meio apagado: ele tem cor propria
                  e forte, e dois deles acesos ao mesmo tempo nao diriam qual
                  esta aberta. Sem rotulo, é ele quem carrega o estado. */}
              <Image
                src={icone}
                alt=""
                width={64}
                height={64}
                className={`h-6 w-6 shrink-0 transition-all duration-200 ${
                  ativa ? "opacity-100" : "opacity-40 grayscale"
                }`}
              />
              <span className="sr-only">{rotulo}</span>
            </button>
          );
        })}
      </div>

      {/* Os tres paineis existem no HTML; o escondido sai da arvore com
          `hidden`, e nao com `display:none` no CSS, para o leitor de tela nao
          anunciar o que nao esta a vista. A animacao entra por seletor de
          atributo, entao ela roda a cada troca — e nao so na carga. */}
      {ABAS.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`painel-${id}`}
          aria-labelledby={`aba-${id}`}
          hidden={id !== aberta}
          className="[&:not([hidden])]:animate-aparecer"
        >
          {conteudo[id]}
        </div>
      ))}
    </div>
  );
}
