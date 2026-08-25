-- Amaan Invest — quanto se pretende captar em cada empreendimento
--
-- O painel sabia quanto ja entrou, e nada sobre a meta: "R$ 400 mil captados"
-- nao responde se a obra esta perto ou longe do que precisa. Com a meta, o mesmo
-- numero vira progresso.
--
-- **Este dado é do administrador, e nao do investidor.** Ele diz quanto a
-- incorporadora ainda precisa levantar — informacao de negocio, que no portal
-- de quem ja aportou nao tem uso e pode ser lida como sinal de risco. A coluna
-- é lida so pelo /admin; `lib/portal/dados.ts` monta a ficha do investidor a
-- partir de uma lista fixa de colunas (`COLUNAS_DA_FICHA`), e esta nao esta
-- nela — de proposito, e com comentario la dizendo isso.
--
-- `numeric(14,2)` como todo dinheiro do schema: nunca float, para o centavo nao
-- virar sorteio de arredondamento.
--
-- Nulavel: obra sem meta definida simplesmente nao mostra progresso, em vez de
-- fingir uma meta de zero — que daria "infinito por cento captado".
--
-- Aditiva: so acrescenta uma coluna nulavel, nao toca em dado nenhum.
--
-- Rodar uma vez:  node db/aplica.mjs db/meta-captacao.sql

BEGIN;

ALTER TABLE empreendimentos
  ADD COLUMN IF NOT EXISTS meta_captacao numeric(14, 2)
  -- Meta negativa nao existe, e zero é o mesmo que nao ter meta — para esse
  -- caso ha o NULL, que a tela ja trata.
  CHECK (meta_captacao IS NULL OR meta_captacao > 0);

COMMENT ON COLUMN empreendimentos.meta_captacao IS
  'Quanto se pretende captar nesta obra. Interno: nunca vai ao portal do investidor.';

-- O Tourmaline Tower: 6,2 milhoes.
--
-- Pelo nome, e nao por id: o id é um uuid gerado, diferente em cada banco, e
-- este arquivo precisa rodar tanto aqui quanto em producao. `where meta_captacao
-- is null` faz a linha ser idempotente — rodar duas vezes nao sobrescreve uma
-- meta que alguem tenha ajustado no /admin depois.
UPDATE empreendimentos
   SET meta_captacao = 6200000.00
 WHERE nome ILIKE '%tourmaline%'
   AND meta_captacao IS NULL;

COMMIT;
