-- Rastro de quem fez o que.
--
-- Ate aqui, uma taxa alterada no /admin nao deixava marca nenhuma: o registro
-- passava a valer e ninguem sabia quem mudou, quando, nem qual era o valor
-- anterior. Numa base que decide quanto cada investidor recebe, isso é o
-- primeiro item que falta quando alguem pergunta "por que este numero mudou".
--
-- Aditiva: só cria tabela e indice, nao altera nem apaga nada do que existe.

BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quem. `SET NULL` e nao `CASCADE`: apagar um usuario nao pode apagar o
  -- rastro do que ele fez — é justamente aí que o registro vale mais.
  usuario_id   uuid REFERENCES usuarios (id) ON DELETE SET NULL,
  -- Guardado a parte porque o usuario pode deixar de existir, e "quem era"
  -- continua sendo a informacao.
  usuario_nome text,

  -- O que: `login`, `login_recusado`, `logout`, `criar`, `atualizar`,
  -- `excluir`, `upload`. Texto livre de proposito — a lista cresce sem
  -- migracao.
  acao         text NOT NULL,

  -- Onde: a tabela e o id do registro tocado, quando houver.
  alvo_tabela  text,
  alvo_id      text,

  -- Detalhe em JSON: quais campos mudaram, o nome do arquivo enviado. NUNCA
  -- senha, hash ou token — ver `lib/auditoria.ts`.
  detalhe      jsonb,

  ip           text,
  user_agent   text,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- A consulta natural é "o que aconteceu, do mais recente para tras", e
-- "o que fulano fez".
CREATE INDEX IF NOT EXISTS audit_logs_recentes ON audit_logs (criado_em DESC);
CREATE INDEX IF NOT EXISTS audit_logs_usuario  ON audit_logs (usuario_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS audit_logs_alvo     ON audit_logs (alvo_tabela, alvo_id);

COMMIT;
