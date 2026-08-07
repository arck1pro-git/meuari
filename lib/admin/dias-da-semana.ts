/**
 * Os dias da semana, na numeracao de `Date.getDay()` — 0 é domingo.
 *
 * Vive num arquivo proprio, sem `server-only`, porque as duas pontas precisam
 * dele: o formulario, que roda no navegador e desenha os botoes, e a listagem,
 * que roda no servidor e escreve a regra por extenso. Deixa-lo em
 * `lib/admin/agendamentos.ts` arrastava aquele modulo — com banco e chave do
 * n8n dentro — para o pacote do cliente, e o Next barra isso na hora.
 *
 * A mesma numeracao vale no `scheduleTrigger` do n8n, entao o valor viaja daqui
 * ate la sem conversao.
 */
export const DIAS_DA_SEMANA = [
  { valor: 0, curto: "Dom", nome: "domingo" },
  { valor: 1, curto: "Seg", nome: "segunda" },
  { valor: 2, curto: "Ter", nome: "terça" },
  { valor: 3, curto: "Qua", nome: "quarta" },
  { valor: 4, curto: "Qui", nome: "quinta" },
  { valor: 5, curto: "Sex", nome: "sexta" },
  { valor: 6, curto: "Sáb", nome: "sábado" },
] as const;
