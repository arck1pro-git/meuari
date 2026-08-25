-- Amaan Invest — a ficha do empreendimento: onde fica, em que pé esta, quando entrega
--
-- A tela da obra passou a mostrar cidade, estado, status e entrega prevista.
-- Nada disso existia como coluna: `previsao_inicio_obras` é o *inicio* das
-- obras, e nao a entrega — sao duas datas diferentes, e usar uma pela outra
-- seria dizer ao investidor que a chave sai tres anos antes.
--
-- Enquanto uma coluna estiver vazia, a tela simplesmente nao mostra aquela
-- linha. Preencher é trabalho do /admin, em Empreendimentos.
--
-- Aditiva: so acrescenta colunas nulaveis, nao toca em dado nenhum.
--
-- Rodar uma vez:  node db/aplica.mjs db/empreendimento-ficha.sql

BEGIN;

ALTER TABLE empreendimentos
  ADD COLUMN IF NOT EXISTS cidade text,
  -- Duas letras, e maiusculas: o chip mostra "Itapema · SC" e nao "itapema/sc".
  ADD COLUMN IF NOT EXISTS uf text CHECK (uf ~ '^[A-Z]{2}$'),
  ADD COLUMN IF NOT EXISTS previsao_entrega date;

-- Lista fechada de propositio: status é o que a tela promete em uma palavra, e
-- texto livre viraria "Em obras", "em construcao" e "EM CONSTRUÇÃO" na mesma
-- lista. Para acrescentar um estagio, mude o CHECK aqui e as opcoes em
-- `lib/admin/tabelas.ts` — os dois juntos, sempre.
ALTER TABLE empreendimentos
  ADD COLUMN IF NOT EXISTS status text
  CHECK (
    status IN ('Lançamento', 'Em obras', 'Em construção', 'Entregue')
  );

COMMIT;
