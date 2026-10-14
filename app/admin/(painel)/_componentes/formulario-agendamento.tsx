"use client";

import Link from "next/link";
import { useState } from "react";
import { DIAS_DA_SEMANA } from "@/lib/admin/dias-da-semana";
import { acaoAgendarNotificacao } from "../../acoes";
import { BotaoEnviar } from "./botao-enviar";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "./cabecalho";
import { DESTINOS_DO_AVISO } from "./rodape-da-folha";
import { Seletor } from "./seletor";

/**
 * O formulario de um aviso que se repete.
 *
 * Cliente por dois motivos, e nenhum deles é enfeite: a lista de horarios
 * cresce e encolhe, e os campos de dia mudam conforme a recorrencia escolhida.
 * Mostrar "dia do mes" para quem escolheu "toda semana" é pedir que a pessoa
 * ignore metade do formulario.
 *
 * O envio é `<form action={acao}>` direto — sem `fetch`, sem estado de envio
 * escrito a mao. A validacao de verdade acontece do outro lado; o que esta aqui
 * é o que ajuda a acertar de primeira.
 */

const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul";

type Recorrencia = "diaria" | "semanal" | "mensal";

const RECORRENCIAS: { valor: Recorrencia; rotulo: string; apoio: string }[] = [
  { valor: "diaria", rotulo: "Todo dia", apoio: "nos horários abaixo" },
  { valor: "semanal", rotulo: "Toda semana", apoio: "nos dias escolhidos" },
  { valor: "mensal", rotulo: "Todo mês", apoio: "num dia fixo" },
];

/**
 * A regra montada, em uma frase — "Toda semana · seg e qua · às 09:00".
 *
 * Tres controles separados (frequencia, dias, horarios) se leem um de cada vez,
 * e a conferencia de "é isso mesmo que eu quero" ficava para depois de salvar,
 * na lista. A frase junta os tres antes do clique.
 */
function emPalavras(
  recorrencia: Recorrencia,
  dias: number[],
  diaDoMes: string,
  horarios: string[],
): string {
  const lista = (itens: string[]) =>
    itens.length <= 1
      ? (itens[0] ?? "")
      : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;

  const quando =
    recorrencia === "diaria"
      ? "Todo dia"
      : recorrencia === "semanal"
        ? dias.length === 0
          ? "Toda semana · escolha os dias"
          : `Toda semana · ${lista(
              DIAS_DA_SEMANA.filter((d) => dias.includes(d.valor)).map(
                (d) => d.curto,
              ),
            )}`
        : `Todo mês · dia ${diaDoMes || "?"}`;

  const horas = [...new Set(horarios.filter(Boolean))].sort();
  return `${quando} · às ${horas.length ? lista(horas) : "?"}`;
}

export function FormularioDeAgendamento({
  investidores,
  fechar,
}: {
  investidores: { id: string; nome: string }[];
  /** Para onde o "Cancelar" leva. */
  fechar: string;
}) {
  const [recorrencia, setRecorrencia] = useState<Recorrencia>("diaria");
  const [dias, setDias] = useState<number[]>([]);
  const [diaDoMes, setDiaDoMes] = useState("1");
  const [faltaDia, setFaltaDia] = useState(false);
  // Um horario ja aberto: agendamento sem horario nenhum nao existe, e o campo
  // vazio diz melhor que um botao "adicionar horario" sozinho.
  const [horarios, setHorarios] = useState<string[]>(["09:00"]);

  function trocarDia(valor: number) {
    setFaltaDia(false);
    setDias((atuais) =>
      atuais.includes(valor)
        ? atuais.filter((d) => d !== valor)
        : [...atuais, valor],
    );
  }

  return (
    /*
     * Sem cartao proprio: a folha ja é a superficie. Antes havia um cartao com
     * sombra dentro da folha — uma caixa dentro da outra.
     */
    <form
      action={acaoAgendarNotificacao}
      /*
       * "Toda semana" sem dia nenhum o servidor recusa — e recusava com a tela
       * de falha, depois de a pessoa preencher tudo. Checar aqui é o que deixa
       * o erro aparecer ao lado dos dias, antes do envio.
       */
      onSubmit={(evento) => {
        if (recorrencia === "semanal" && dias.length === 0) {
          evento.preventDefault();
          setFaltaDia(true);
        }
      }}
    >
      <header className="mb-5 pr-10">
        <h2 className="text-lg font-bold tracking-tight text-tinta">
          Agendar envio
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Um aviso que se repete sozinho, no dia e na hora marcados.
        </p>
      </header>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-neutral-600">
            Título <span className="text-red-600">*</span>
          </span>
          <input
            name="titulo"
            required
            placeholder="Ex.: Seu crédito do mês caiu"
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-neutral-600">Texto</span>
          <textarea
            name="corpo"
            rows={3}
            placeholder="O que a pessoa lê ao abrir o aviso."
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">
            Para quem
          </span>
          <div className="mt-1.5">
            <Seletor
              nome="usuario_id"
              rotuloAcessivel="Para quem"
              opcoes={investidores.map((i) => ({
                valor: i.id,
                rotulo: i.nome,
              }))}
              vazio="Todos os investidores"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">
            Ao tocar, abre
          </span>
          <input
            name="url"
            list="destinos-do-agendamento"
            placeholder="/portal"
            className={CLASSE_CAMPO}
          />
          <datalist id="destinos-do-agendamento">
            {DESTINOS_DO_AVISO.map((d) => (
              <option key={d.caminho} value={d.caminho}>
                {d.nome}
              </option>
            ))}
          </datalist>
          <span className="mt-1 block text-xs text-neutral-400">
            Escolha uma tela ou escreva o caminho.
          </span>
        </label>
      </div>

      <fieldset className="mt-6 border-t border-zinc-200 pt-5">
        <legend className="sr-only">Recorrência</legend>
        <p className="text-xs font-semibold text-neutral-600">
          Com que frequência
        </p>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
          {RECORRENCIAS.map((opcao) => {
            const ativa = opcao.valor === recorrencia;
            return (
              <label
                key={opcao.valor}
                className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul ${
                  ativa
                    ? "border-marinho bg-indigo-50"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <input
                  type="radio"
                  name="recorrencia"
                  value={opcao.valor}
                  checked={ativa}
                  onChange={() => setRecorrencia(opcao.valor)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-tinta">
                  {opcao.rotulo}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {opcao.apoio}
                </span>
              </label>
            );
          })}
        </div>

        {/* Os campos de dia so aparecem para quem precisa deles. */}
        {recorrencia === "semanal" && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-neutral-600">
              Em quais dias
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIAS_DA_SEMANA.map((dia) => {
                const marcado = dias.includes(dia.valor);
                return (
                  <label
                    key={dia.valor}
                    title={dia.nome}
                    // `has-[:focus-visible]`: a caixa de verdade é `sr-only`, e
                    // sem isto quem anda por Tab nao via em que dia estava.
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul ${
                      marcado
                        ? "border-marinho bg-marinho text-white"
                        : faltaDia
                          ? "border-red-300 text-neutral-600 hover:bg-zinc-50"
                          : "border-zinc-200 text-neutral-600 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="dia_semana"
                      value={dia.valor}
                      checked={marcado}
                      onChange={() => trocarDia(dia.valor)}
                      className="sr-only"
                    />
                    {dia.curto}
                  </label>
                );
              })}
            </div>
            {faltaDia && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">
                Escolha ao menos um dia.
              </p>
            )}
          </div>
        )}

        {recorrencia === "mensal" && (
          <label className="mt-4 block max-w-40">
            <span className="text-xs font-semibold text-neutral-600">
              Dia do mês
            </span>
            <input
              type="number"
              name="dia_mes"
              min={1}
              max={31}
              required
              value={diaDoMes}
              onChange={(evento) => setDiaDoMes(evento.target.value)}
              className={CLASSE_CAMPO}
            />
            <span className="mt-1 block text-xs text-neutral-400">
              Meses curtos disparam no último dia.
            </span>
          </label>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold text-neutral-600">
            Em que horário
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {horarios.map((horario, i) => (
              <span key={i} className="flex items-center gap-1">
                <input
                  type="time"
                  name="horario"
                  required
                  value={horario}
                  onChange={(evento) =>
                    setHorarios((atuais) =>
                      atuais.map((h, j) => (j === i ? evento.target.value : h)),
                    )
                  }
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-tinta transition-colors duration-200 hover:border-zinc-300 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
                />
                {horarios.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setHorarios((atuais) => atuais.filter((_, j) => j !== i))
                    }
                    aria-label={`Remover o horário ${horario}`}
                    className="rounded-lg px-1.5 py-1 text-sm text-neutral-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}

            <button
              type="button"
              onClick={() => setHorarios((atuais) => [...atuais, "18:00"])}
              className="rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-600 transition-colors duration-200 hover:bg-zinc-200 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              + horário
            </button>
          </div>

          <p className="mt-1.5 text-xs text-neutral-400">
            Fuso de Brasília. Dois horários no mesmo dia disparam dois avisos.
          </p>
        </div>
      </fieldset>

      {/* O mesmo rodape das outras folhas, com a regra em palavras no lugar
          da nota — é a ultima coisa que se le antes de apertar. Escrito aqui,
          e nao com `RodapeDaFolha`, porque a frase muda a cada clique e aquele
          é de servidor. */}
      <div className="sticky bottom-0 -mx-5 mt-7 -mb-5 flex flex-wrap items-center gap-3 border-t border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
        <p
          className="mr-auto min-w-0 text-xs font-medium text-neutral-600 tabular-nums"
          aria-live="polite"
        >
          {emPalavras(recorrencia, dias, diaDoMes, horarios)}
        </p>
        <Link href={fechar} className={BOTAO_SECUNDARIO}>
          Cancelar
        </Link>
        <BotaoEnviar enviando="Agendando…" className={BOTAO_PRIMARIO}>
          Agendar
        </BotaoEnviar>
      </div>
    </form>
  );
}
