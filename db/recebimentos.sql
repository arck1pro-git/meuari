-- Meu ARI — creditos ja pagos, lancados a mao
--
-- O portal calcula a agenda de creditos a partir dos contratos, mas o passado
-- nem sempre seguiu a formula: houve creditos fora da conta. Esta tabela guarda
-- o que de fato caiu na conta ate a data de corte; dali em diante o portal
-- calcula (ver PRIMEIRO_CICLO_CALCULADO em lib/portal/recebimentos.ts).
--
-- Rodar uma vez:  psql "$DATABASE_URL" -f db/recebimentos.sql

BEGIN;

CREATE TABLE recebimentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  data          date NOT NULL,            -- dia em que o credito caiu
  valor         numeric(14, 2) NOT NULL,  -- numeric, nao float
  observacao    text,                     -- por que fugiu da formula, quando fugir
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),

  -- Um credito por pessoa por dia: sem isso, rodar o seed duas vezes dobraria o
  -- historico, e o total exibido dobraria junto.
  UNIQUE (usuario_id, data)
);

CREATE INDEX recebimentos_usuario ON recebimentos (usuario_id, data);

CREATE TRIGGER recebimentos_atualizado_em BEFORE UPDATE ON recebimentos
  FOR EACH ROW EXECUTE FUNCTION toca_atualizado_em();

COMMIT;
