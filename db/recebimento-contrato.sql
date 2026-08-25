-- Amaan Invest — o credito passa a exigir contrato, e a dispensar o investidor
--
-- Segunda parte de `db/contrato-aditivos.sql`, aplicada depois de conferir que
-- todos os creditos acharam o contrato deles (zero orfaos).
--
-- `contrato_id` vira obrigatorio: credito sem contrato nao tem participacao,
-- prazo nem forma de retorno — nao ha como saber de onde ele saiu.
--
-- `usuario_id` deixa de ser obrigatorio pelo motivo inverso: quem é o
-- investidor ja esta no contrato, e pedir o dado duas vezes é convidar as duas
-- respostas a divergirem. A coluna fica, preenchida no que ja existe, e o app
-- para de escrever nela.
--
-- Rodar uma vez:  node db/aplica.mjs db/recebimento-contrato.sql

BEGIN;

ALTER TABLE recebimentos ALTER COLUMN contrato_id SET NOT NULL;
ALTER TABLE recebimentos ALTER COLUMN usuario_id DROP NOT NULL;

COMMIT;
