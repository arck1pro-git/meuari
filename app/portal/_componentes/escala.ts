/** Helpers de escala compartilhados pelos graficos do portal. */

/** Arredonda o topo do eixo para um numero "limpo" (1/2/2,5/5 x 10^n). */
export function topoLimpo(maximo: number): number {
  if (maximo <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(maximo));
  const normalizado = maximo / magnitude;
  const passo = [1, 2, 2.5, 5, 10].find((p) => normalizado <= p) ?? 10;
  return passo * magnitude;
}

/** `quantidade + 1` marcas de 0 ao topo, inclusive. */
export function marcasDoEixo(topo: number, quantidade = 4): number[] {
  return Array.from({ length: quantidade + 1 }, (_, i) => (topo / quantidade) * i);
}
