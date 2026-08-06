-- Meu ARI — o contrato passa a ser o contrato, e o aporte seguinte vira aditivo
--
-- Ate aqui `contratos` guardava um *aporte* por linha: o primeiro e todos os
-- seguintes, lado a lado, sem nada dizendo que os seis ultimos entraram dentro
-- do primeiro. Quem lia a tabela via sete contratos onde havia um.
--
-- O modelo passa a ser o do papel:
--
--   contratos  — um por investidor, obra e modalidade. Tem o valor de entrada,
--                a participacao contratada, o prazo e o instrumento assinado.
--   aditivos   — cada aporte posterior, apontando para o contrato em que ele
--                entra (`contrato_id`).
--   recebimentos — o credito é **do contrato**, e nao do empreendimento: é o
--                contrato que define participacao, prazo e forma de retorno.
--
-- Nada é perdido. As duas tabelas mexidas sao copiadas inteiras antes, e as
-- linhas que saem de `contratos` reaparecem em `aditivos` com os mesmos
-- valores. As colunas antigas de `recebimentos` continuam onde estao.
--
-- Rodar uma vez:  node db/aplica.mjs db/contrato-aditivos.sql

BEGIN;

-- 1. Copia de seguranca, byte a byte, do que vai mudar.
CREATE TABLE IF NOT EXISTS backup_contratos_20260806 AS SELECT * FROM contratos;
CREATE TABLE IF NOT EXISTS backup_recebimentos_20260806 AS
  SELECT * FROM recebimentos;

-- 2. Os aditivos.
CREATE TABLE IF NOT EXISTS aditivos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cascata de proposito: aditivo nao existe sem o contrato dele. Quem segura
  -- a exclusao do contrato é `recebimentos`, que é dinheiro pago.
  contrato_id   uuid NOT NULL REFERENCES contratos (id) ON DELETE CASCADE,

  data          date NOT NULL,
  valor         numeric(14, 2) NOT NULL,  -- numeric, nao float

  -- Participacao que o aditivo traz. Nulo = segue a do contrato; preenchida,
  -- passa a valer para o capital inteiro a partir desta data, que é a regra ja
  -- aplicada em `lib/portal/recebimentos.ts`.
  taxa          numeric(6, 5),

  documento     text,   -- url do instrumento assinado
  observacao    text,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aditivos_contrato ON aditivos (contrato_id, data);

DROP TRIGGER IF EXISTS aditivos_atualizado_em ON aditivos;
CREATE TRIGGER aditivos_atualizado_em BEFORE UPDATE ON aditivos
  FOR EACH ROW EXECUTE FUNCTION toca_atualizado_em();

-- 3. Do segundo aporte em diante, cada linha vira aditivo do primeiro.
--
-- O primeiro é o de data mais antiga dentro de investidor + obra + modalidade;
-- empate de data desempata pela criacao, que é a ordem em que foram digitados.
CREATE TEMP TABLE mudanca AS
SELECT id,
       first_value(id) OVER janela AS contrato,
       row_number()    OVER janela AS pos
  FROM contratos
WINDOW janela AS (
  PARTITION BY usuario_id, empreendimento_id, modalidade
  ORDER BY data, criado_em
);

INSERT INTO aditivos (contrato_id, data, valor, taxa, documento, observacao)
SELECT m.contrato, c.data, c.valor, c.taxa, c.documento, c.observacao
  FROM contratos c
  JOIN mudanca m ON m.id = c.id
 WHERE m.pos > 1;

DELETE FROM contratos WHERE id IN (SELECT id FROM mudanca WHERE pos > 1);

-- 4. O credito passa a apontar para o contrato.
ALTER TABLE recebimentos
  ADD COLUMN IF NOT EXISTS contrato_id uuid REFERENCES contratos (id)
  ON DELETE RESTRICT;

/*
 * Preenchimento: o contrato daquele investidor na obra do credito. Credito sem
 * empreendimento — o caso de todos os antigos — cai no contrato `mensal`, que é
 * o unico regime que paga durante o percurso.
 */
UPDATE recebimentos r
   SET contrato_id = (
     SELECT c.id
       FROM contratos c
      WHERE c.usuario_id = r.usuario_id
        AND (r.empreendimento_id IS NULL
             OR c.empreendimento_id = r.empreendimento_id)
      ORDER BY (c.modalidade = 'mensal') DESC, c.data
      LIMIT 1
   )
 WHERE contrato_id IS NULL;

CREATE INDEX IF NOT EXISTS recebimentos_contrato ON recebimentos (contrato_id, data);

/*
 * A unicidade acompanha: um credito por contrato por dia. A antiga era por
 * investidor + empreendimento + data, e com o contrato no lugar ela deixa de
 * distinguir modalidade — um investidor com os dois regimes na mesma obra
 * receberia dois creditos no mesmo dia 17, e a regra antiga barraria o segundo.
 */
ALTER TABLE recebimentos
  DROP CONSTRAINT IF EXISTS recebimentos_usuario_empreendimento_data_key;

ALTER TABLE recebimentos
  ADD CONSTRAINT recebimentos_contrato_data_key UNIQUE (contrato_id, data);

COMMIT;
