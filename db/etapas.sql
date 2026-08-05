-- Etapas da obra, com o quanto cada uma andou.
--
-- Ate aqui o portal nao tinha onde guardar isso: havia texto de exemplo
-- ("fundacao 100%", "estrutura 60%") que foi removido justamente por nao ter
-- tabela por tras. Inventar numero de obra é pior do que nao mostrar.
--
-- Aditiva: cria tabela e indice, nao toca em nada existente.

BEGIN;

CREATE TABLE IF NOT EXISTS etapas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid NOT NULL REFERENCES empreendimentos (id) ON DELETE CASCADE,

  nome              text NOT NULL,

  -- Quanto da etapa esta pronto, de 0 a 100. `numeric` e nao `int` porque a
  -- medicao da obra costuma vir com casa decimal (37,5%).
  percentual        numeric(5, 2) NOT NULL DEFAULT 0
                    CHECK (percentual >= 0 AND percentual <= 100),

  -- Quando ela fechou. Nulo enquanto estiver em andamento — é o que separa
  -- "etapa ja feita" de "etapa em curso".
  concluida_em      date,

  -- A ordem da obra nao é a ordem alfabetica nem a de cadastro: fundacao vem
  -- antes de estrutura, que vem antes de acabamento.
  ordem             integer NOT NULL DEFAULT 0,

  observacao        text,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS etapas_empreendimento
  ON etapas (empreendimento_id, ordem);

-- O mesmo gatilho das outras tabelas, para `atualizado_em` nao depender de
-- ninguem lembrar.
DROP TRIGGER IF EXISTS etapas_atualizado_em ON etapas;
CREATE TRIGGER etapas_atualizado_em BEFORE UPDATE ON etapas
  FOR EACH ROW EXECUTE FUNCTION toca_atualizado_em();

COMMIT;
