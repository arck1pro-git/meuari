-- "Sair de todos os aparelhos".
--
-- A sessao é um cookie assinado, sem tabela: o servidor nao guarda quais estao
-- abertas, entao nao havia como encerrar as outras. O unico jeito era trocar o
-- AUTH_SECRET, que derruba todo mundo de uma vez — incluindo quem nao pediu.
--
-- Com um contador por usuario, o cookie passa a carregar a versao em que
-- nasceu. Subir o contador invalida, de uma vez, todos os cookies emitidos
-- antes — e só os daquela pessoa.
--
-- Aditiva: acrescenta coluna com valor padrao. Nenhuma linha é apagada, e as
-- sessoes abertas hoje continuam validas (todas nascem na versao 1).

BEGIN;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS sessao_versao integer NOT NULL DEFAULT 1;

COMMIT;
