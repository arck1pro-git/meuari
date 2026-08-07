"use client";

import { useState } from "react";
import { DIAS_DA_SEMANA } from "@/lib/admin/dias-da-semana";
import { acaoAgendarNotificacao } from "../../acoes";

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
  "mt-1.5 w-full rounded-xl border border-tinta/12 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors duration-200 hover:border-tinta/25 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul";

type Recorrencia = "diaria" | "semanal" | "mensal";

const RECORRENCIAS: { valor: Recorrencia; rotulo: string; apoio: string }[] = [
  { valor: "diaria", rotulo: "Todo dia", apoio: "nos horários abaixo" },
  { valor: "semanal", rotulo: "Toda semana", apoio: "nos dias escolhidos" },
  { valor: "mensal", rotulo: "Todo mês", apoio: "num dia fixo" },
];

export function FormularioDeAgendamento({
  investidores,
}: {
  investidores: { id: string; nome: string }[];
}) {
  const [recorrencia, setRecorrencia] = useState<Recorrencia>("diaria");
  const [dias, setDias] = useState<number[]>([]);
  // Um horario ja aberto: agendamento sem horario nenhum nao existe, e o campo
  // vazio diz melhor que um botao "adicionar horario" sozinho.
  const [horarios, setHorarios] = useState<string[]>(["09:00"]);

  function trocarDia(valor: number) {
    setDias((atuais) =>
      atuais.includes(valor)
        ? atuais.filter((d) => d !== valor)
        : [...atuais, valor],
    );
  }

  return (
    <form
      action={acaoAgendarNotificacao}
      className="sombra-cartao animate-surgir rounded-2xl border border-tinta/12 bg-white p-5 sm:p-7"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-neutral-600">
            Título <span className="text-red-600">*</span>
          </span>
          <input name="titulo" required className={CLASSE_CAMPO} />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-neutral-600">Texto</span>
          <textarea name="corpo" rows={2} className={CLASSE_CAMPO} />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">
            Investidor
          </span>
          <select name="usuario_id" defaultValue="" className={CLASSE_CAMPO}>
            <option value="">Todos os investidores</option>
            {investidores.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-neutral-400">
            Em branco = aviso geral.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">Link</span>
          <input
            name="url"
            placeholder="/portal"
            className={CLASSE_CAMPO}
          />
          <span className="mt-1 block text-xs text-neutral-400">
            Para onde o toque leva.
          </span>
        </label>
      </div>

      <fieldset className="mt-6 border-t border-tinta/[0.08] pt-5">
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
                className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors duration-200 ${
                  ativa
                    ? "border-marinho bg-marinho/[0.04]"
                    : "border-tinta/12 hover:bg-tinta/[0.02]"
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
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                      marcado
                        ? "border-marinho bg-marinho text-white"
                        : "border-tinta/12 text-neutral-600 hover:bg-tinta/[0.03]"
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
              defaultValue={1}
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
                      atuais.map((h, j) =>
                        j === i ? evento.target.value : h,
                      ),
                    )
                  }
                  className="rounded-xl border border-tinta/12 bg-white px-3 py-2 text-sm text-tinta transition-colors duration-200 hover:border-tinta/25 focus:outline-none focus-visible:border-azul focus-visible:ring-2 focus-visible:ring-azul"
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
              className="rounded-full bg-tinta/[0.05] px-3.5 py-1.5 text-xs font-semibold text-neutral-600 transition-colors duration-200 hover:bg-tinta/10 hover:text-tinta focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
            >
              + horário
            </button>
          </div>

          <p className="mt-1.5 text-xs text-neutral-400">
            Fuso de Brasília. Dois horários no mesmo dia disparam dois avisos.
          </p>
        </div>
      </fieldset>

      <button
        type="submit"
        className="mt-6 rounded-xl bg-marinho px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2"
      >
        Agendar e criar automação
      </button>
    </form>
  );
}
