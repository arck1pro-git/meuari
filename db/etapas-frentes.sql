-- Meu ARI — os nomes das frentes, como eles sao ditos na obra
--
-- Correcao de `db/etapas-grupo.sql`, que criou a coluna com os nomes que a tela
-- usava no rascunho: Estrutura, Burocracia, Outros. Na obra elas se chamam
-- Projeto, Aprovações e Marketing — e "Burocracia" ainda descrevia como se
-- sente o processo, e nao o que ele é.
--
-- O `UPDATE` traduz o que ja estivesse preenchido; hoje nao ha linha com grupo,
-- entao ele nao toca em nada. Fica no arquivo para o caso de este script rodar
-- num banco onde alguem ja tinha escolhido a frente no /admin.
--
-- Rodar uma vez:  node db/aplica.mjs db/etapas-frentes.sql

BEGIN;

ALTER TABLE etapas DROP CONSTRAINT IF EXISTS etapas_grupo_check;

UPDATE etapas
   SET grupo = CASE grupo
                 WHEN 'Estrutura'  THEN 'Projeto'
                 WHEN 'Burocracia' THEN 'Aprovações'
                 WHEN 'Outros'     THEN 'Marketing'
                 ELSE grupo
               END
 WHERE grupo IS NOT NULL;

-- Lista fechada: o grupo vira titulo de quadro na tela, e texto livre daria
-- "Aprovações", "aprovacoes" e "Aprovação" como tres quadros distintos. Para
-- acrescentar uma frente, mude o CHECK aqui, `GRUPOS` em
-- app/(app)/obras/_componentes/grupos.ts e as opcoes em lib/admin/tabelas.ts —
-- os tres juntos, sempre.
ALTER TABLE etapas
  ADD CONSTRAINT etapas_grupo_check
  CHECK (grupo IN ('Projeto', 'Aprovações', 'Marketing'));

COMMIT;
