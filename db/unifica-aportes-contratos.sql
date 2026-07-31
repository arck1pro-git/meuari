-- Meu ARI — aporte e contrato viram uma tabela só
--
-- `aportes_historicos` existiu por um motivo: `contratos` nao tinha data do
-- aporte, so `criado_em`. A unificacao leva essa coluna junto — sem ela, voltar
-- para `contratos` traria de volta o problema que separou as duas.
--
-- Rodar uma vez:  node db/aplica.mjs db/unifica-aportes-contratos.sql

BEGIN;

-- O que `contratos` nao tinha e o aporte precisa.
ALTER TABLE contratos ADD COLUMN data date;
ALTER TABLE contratos ADD COLUMN observacao text;

-- Linhas que ja existiam em contratos ganham a data do cadastro, que é a unica
-- informacao de tempo que elas tem.
UPDATE contratos
   SET data = (criado_em AT TIME ZONE 'America/Sao_Paulo')::date
 WHERE data IS NULL;

-- Traz os aportes de volta. `prazo_meses` fica nulo: é campo de contrato, e o
-- aporte nunca teve.
INSERT INTO contratos
  (usuario_id, empreendimento_id, data, valor, taxa, modalidade, tipo,
   documento, observacao, criado_em)
SELECT
   usuario_id, empreendimento_id, data, valor, taxa, modalidade, tipo,
   documento, observacao, criado_em
  FROM aportes_historicos;

-- Agora que toda linha tem data, ela passa a ser obrigatoria.
ALTER TABLE contratos ALTER COLUMN data SET NOT NULL;

-- A consulta do portal é "os aportes de fulano, em ordem de data". O indice
-- antigo, so por usuario, vira redundante.
DROP INDEX IF EXISTS contratos_usuario;
CREATE INDEX contratos_usuario_data ON contratos (usuario_id, data);

DROP TABLE aportes_historicos;

COMMIT;
