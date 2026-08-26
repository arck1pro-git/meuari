-- Esvazia a caixa de notificacoes.
--
-- Nao é migracao: é uma faxina de uma vez só, e por isso pode ser rodada de
-- novo no dia em que a caixa voltar a encher de teste.
--
-- **O que havia quando isto foi escrito**, e vale registrar porque parece bug e
-- nao é: 207 linhas, das quais 201 eram "Novo documento em Tourmaline Tower".
-- A conta fecha — 8 documentos publicados entre 24 e 25/08, cada um avisando os
-- 20 investidores daquela obra. `avisarNovoDocumento` fez exatamente o que deve
-- fazer; o que houve foi teste de upload repetido, e nao disparo em duplicidade.
-- As outras 6 eram "teste", "tste" e um "RELATÓRIO DISPONÍVEL" de 07/08.
--
-- `notificacoes_lidas` se esvazia junto, pelo `ON DELETE CASCADE` da chave
-- estrangeira — nao ha o que apagar a mao. `notificacoes_agendadas` **nao é
-- tocada**: ela guarda as automacoes que o n8n dispara, e sao cadastro, nao
-- caixa de entrada.
--
-- Rodar:  node db/aplica.mjs db/notificacoes-limpar.sql

BEGIN;

DELETE FROM notificacoes;

COMMIT;
