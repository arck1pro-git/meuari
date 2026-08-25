-- Amaan Invest — a unicidade dos creditos acompanha o empreendimento
--
-- Correcao de `db/recebimentos-empreendimento.sql`, que adicionou a coluna mas
-- deixou de pe a restricao `UNIQUE (usuario_id, data)`. Com dois
-- empreendimentos pagando no mesmo dia 17, o segundo credito era recusado.
--
-- Ja aplicado no banco; este arquivo existe para quem for montar o schema do
-- zero seguir a mesma ordem.
--
-- Rodar uma vez:  node db/aplica.mjs db/recebimentos-unicidade.sql

BEGIN;

ALTER TABLE recebimentos DROP CONSTRAINT IF EXISTS recebimentos_usuario_id_data_key;

-- `NULLS NOT DISTINCT` (PostgreSQL 15+) mantem a garantia antiga para o credito
-- geral: sem ele, cada NULL conta como valor unico e o mesmo credito sem
-- empreendimento poderia ser lancado duas vezes na mesma data.
ALTER TABLE recebimentos
  ADD CONSTRAINT recebimentos_usuario_empreendimento_data_key
  UNIQUE NULLS NOT DISTINCT (usuario_id, empreendimento_id, data);

COMMIT;
