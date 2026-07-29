"use client";

import { useEffect, useState } from "react";

/**
 * Alterna frases em intervalo fixo.
 *
 * Todas as frases ocupam a mesma celula de grid, e nao uma de cada vez: assim a
 * altura do bloco é sempre a da frase mais alta e nao muda na troca. Se so a
 * frase ativa existisse, o cartao mudaria de altura a cada 5s e empurraria o
 * resto da pagina.
 *
 * O bloco todo é `aria-hidden`: um texto que se reescreve sozinho viraria
 * repeticao para quem le por audio. Quem usa o componente entrega as frases
 * tambem em `sr-only`, de uma vez.
 *
 * Nao depende de `prefers-reduced-motion` para alternar — ver o comentario do
 * efeito. Depender disso ja escondeu metade da informacao uma vez.
 */
export function FraseRotativa({
  frases,
  intervaloMs = 5000,
  className,
}: {
  frases: React.ReactNode[];
  intervaloMs?: number;
  className?: string;
}) {
  // Atual e anterior no mesmo estado, e nao em dois `useState`: sao definidos
  // pela mesma troca, e separa-los deixaria um quadro com o par inconsistente.
  const [par, setPar] = useState({ atual: 0, anterior: -1 });

  useEffect(() => {
    if (frases.length < 2) return;

    // A troca roda sempre: cada frase traz um dado que a outra nao tem, entao
    // parar no primeiro esconderia informacao. Quem pede menos movimento perde
    // so o movimento, zerado pela regra global de `prefers-reduced-motion`.
    const id = setInterval(() => {
      setPar((p) => ({
        atual: (p.atual + 1) % frases.length,
        anterior: p.atual,
      }));
    }, intervaloMs);
    return () => clearInterval(id);
  }, [frases.length, intervaloMs]);

  return (
    <span aria-hidden className={`grid ${className ?? ""}`}>
      {frases.map((frase, i) => (
        <span
          key={i}
          // A saida sobe e a entrada vem de baixo, entao as frases correm sempre
          // no mesmo sentido — sem direcao a troca vira um pisca-pisca. Quem
          // ainda nao entrou espera embaixo, no ponto de onde vai subir.
          className={`col-start-1 row-start-1 transition-[opacity,transform] duration-1200 ease-macia ${
            i === par.atual
              ? "translate-y-0 opacity-100"
              : i === par.anterior
                ? "pointer-events-none -translate-y-2 opacity-0"
                : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          {frase}
        </span>
      ))}
    </span>
  );
}
