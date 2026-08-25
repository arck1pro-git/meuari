-- Amaan Invest — credito passa a saber de qual empreendimento é
--
-- Com o seletor de empreendimento no portal, o total de Recebimentos precisa
-- acompanhar o filtro. Ate aqui a tabela so sabia de quem era o credito, nao de
-- onde ele veio.
--
-- A coluna é opcional de proposito: credito sem empreendimento é *geral*. Ele
-- entra no consolidado e fica de fora quando ha um empreendimento selecionado,
-- porque nao ha como atribui-lo. Os creditos ja lancados nascem assim.
--
-- Rodar uma vez:  node db/aplica.mjs db/recebimentos-empreendimento.sql

BEGIN;

ALTER TABLE recebimentos
  ADD COLUMN empreendimento_id uuid REFERENCES empreendimentos (id) ON DELETE RESTRICT;

/*
 * A unicidade tinha de mudar junto. `UNIQUE (usuario_id, data)` fazia sentido
 * quando o credito era um por pessoa por dia; agora dois empreendimentos pagam
 * no mesmo dia 17, e a restricao antiga recusaria o segundo.
 *
 * `NULLS NOT DISTINCT` (PostgreSQL 15+) preserva a garantia antiga para o
 * credito geral: sem ele, o Postgres trata cada NULL como valor unico e
 * deixaria lancar o mesmo credito geral duas vezes na mesma data.
 */
ALTER TABLE recebimentos DROP CONSTRAINT recebimentos_usuario_id_data_key;
ALTER TABLE recebimentos
  ADD CONSTRAINT recebimentos_usuario_empreendimento_data_key
  UNIQUE NULLS NOT DISTINCT (usuario_id, empreendimento_id, data);

-- A consulta do portal é "os creditos de fulano, deste empreendimento, em ordem
-- de data". O indice antigo, so por usuario e data, vira redundante.
DROP INDEX IF EXISTS recebimentos_usuario;
CREATE INDEX recebimentos_usuario_empreendimento
  ON recebimentos (usuario_id, empreendimento_id, data);

COMMIT;
