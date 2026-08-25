-- Amaan Invest — `contratos.tipo` sai do formulario e ganha um padrao
--
-- O campo era texto livre, digitado a cada contrato, e virava a legenda do
-- cartao no historico do investidor. Em tres contratos ele tinha tres grafias —
-- 'Aporte Inicial', 'Aporte inicial' e 'contrato' —, que é o que acontece com
-- todo campo livre que ninguem precisa preencher de um jeito especifico.
--
-- A coluna **continua existindo e continua NOT NULL**: o historico do investidor
-- le ela (`lista-historico.tsx`), e os valores ja gravados seguem intactos. O
-- que muda é que ela deixa de ser perguntada — passa a ter um padrao, e o
-- formulario do /admin nao a mostra mais.
--
-- Sem o DEFAULT, remover o campo do formulario quebraria toda criacao de
-- contrato: o INSERT deixaria de citar a coluna e o banco recusaria a linha.
--
-- Aditiva: nao altera nenhum dado existente.
--
-- Rodar uma vez:  node db/aplica.mjs db/contrato-tipo-padrao.sql

BEGIN;

ALTER TABLE contratos
  ALTER COLUMN tipo SET DEFAULT 'Aporte inicial';

COMMENT ON COLUMN contratos.tipo IS
  'Legenda do aporte no historico do investidor. Nao é mais perguntada no /admin: usa o DEFAULT.';

COMMIT;
