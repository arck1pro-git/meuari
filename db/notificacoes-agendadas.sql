-- Amaan Invest — avisos que se repetem
--
-- `notificacoes` guarda o aviso que ja aconteceu: uma linha, uma aparicao na
-- caixinha do sino. O que se repete nao cabe la — um aviso semanal viraria
-- cinquenta e duas linhas iguais, e nenhuma delas saberia dizer que fazem parte
-- da mesma serie.
--
-- Esta tabela guarda a **regra**: o texto, para quem, e quando disparar. Cada
-- disparo cria uma linha nova em `notificacoes` e manda o push. Quem chama o
-- disparo é o n8n, no horario combinado — ver `lib/n8n.ts` e a rota
-- `/api/notificacoes/disparar`.
--
-- Rodar uma vez:  node db/aplica.mjs db/notificacoes-agendadas.sql

BEGIN;

CREATE TABLE IF NOT EXISTS notificacoes_agendadas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Em branco = aviso geral, para todo investidor. Mesma regra de
  -- `notificacoes.usuario_id`.
  usuario_id    uuid REFERENCES usuarios (id) ON DELETE CASCADE,

  titulo        text NOT NULL,
  corpo         text,
  url           text,   -- para onde o toque leva, ex.: /portal

  -- De quanto em quanto tempo. `diaria` ignora dia; `semanal` usa
  -- `dias_semana`; `mensal` usa `dia_mes`.
  recorrencia   text NOT NULL
                CHECK (recorrencia IN ('diaria', 'semanal', 'mensal')),

  -- 0 = domingo ... 6 = sabado, como no `getDay()` do JavaScript e no n8n.
  dias_semana   smallint[],

  dia_mes       smallint CHECK (dia_mes BETWEEN 1 AND 31),

  -- Um ou mais horarios no formato `HH:MM`. Array porque "toda segunda as 9 e
  -- as 18" é um agendamento só, e nao dois.
  horarios      text[] NOT NULL CHECK (cardinality(horarios) > 0),

  ativa         boolean NOT NULL DEFAULT true,

  -- O id do fluxo criado no n8n. É por ele que a automacao é desligada quando
  -- o agendamento é removido daqui; nulo significa que o fluxo nao chegou a
  -- ser criado.
  n8n_workflow_id text,

  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),

  -- Coerencia entre o tipo de recorrencia e o campo que ele exige. Sem isto,
  -- um `semanal` sem dia nenhum viraria um fluxo no n8n que nunca dispara.
  CHECK (recorrencia <> 'semanal'
         OR (dias_semana IS NOT NULL AND cardinality(dias_semana) > 0)),
  CHECK (recorrencia <> 'mensal' OR dia_mes IS NOT NULL)
);

DROP TRIGGER IF EXISTS notificacoes_agendadas_atualizado_em
  ON notificacoes_agendadas;
CREATE TRIGGER notificacoes_agendadas_atualizado_em
  BEFORE UPDATE ON notificacoes_agendadas
  FOR EACH ROW EXECUTE FUNCTION toca_atualizado_em();

COMMIT;
