-- Meu ARI — a que frente pertence cada etapa
--
-- A tela da obra passou a mostrar o andamento por secao: os projetos de
-- engenharia correm num ritmo, as licencas e registros em outro, e a media dos
-- onze juntos escondia essa diferenca — uma incorporacao em 40% desaparecia no
-- meio de nove projetos em 75%.
--
-- A coluna é opcional. Vazia, a tela agrupa pelo nome da etapa (ver
-- `grupoDaEtapa`, em app/(app)/obras/_componentes/grupos.ts); preenchida no
-- /admin, ela manda — nome de etapa é texto livre, e nenhum palpite acerta
-- sempre.
--
-- Aditiva: so acrescenta uma coluna nulavel, nao toca em dado nenhum.
--
-- Rodar uma vez:  node db/aplica.mjs db/etapas-grupo.sql

BEGIN;

-- Lista fechada: o grupo vira titulo de secao na tela, e texto livre daria
-- "Burocracia", "burocracias" e "Burocrático" como tres secoes distintas. Para
-- acrescentar uma frente, mude o CHECK aqui, `GRUPOS` no modulo citado acima e
-- as opcoes em `lib/admin/tabelas.ts` — os tres juntos, sempre.
ALTER TABLE etapas
  ADD COLUMN IF NOT EXISTS grupo text
  CHECK (grupo IN ('Estrutura', 'Burocracia', 'Outros'));

COMMIT;
