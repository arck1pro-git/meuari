-- Locais da obra: onde cada foto foi tirada.
--
-- Ate aqui a galeria era uma fila unica em ordem de upload. Numa obra com
-- quarenta fotos isso significa que quem quer ver como esta a fachada precisa
-- arrastar por cima da piscina, do hall e do subsolo — e nao ha como saber
-- quantas faltam ate chegar la.
--
-- O local é o indice dessa fila: "Fachada", "Piscina", "Apartamento modelo".
-- Cadastrado uma vez por obra no /admin, escolhido no cadastro de cada imagem,
-- e mostrado como fila de atalhos no topo da ampliacao.
--
-- **Por que tabela, e nao um texto na propria imagem.** Um campo livre em
-- `imagens.local` daria "Fachada", "fachada" e "Fachada " como tres lugares
-- diferentes na primeira semana. Com tabela, o local existe uma vez e a imagem
-- aponta para ele; corrigir o nome corrige em todas as fotos de uma vez.
--
-- Aditiva: cria uma tabela e acrescenta uma coluna que nasce nula. Nenhuma
-- imagem existente muda, e a galeria continua funcionando sem local nenhum
-- cadastrado.
--
-- Rodar uma vez:  node db/aplica.mjs db/imagens-locais.sql

BEGIN;

CREATE TABLE IF NOT EXISTS locais (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- `CASCADE` como o resto do que pertence a obra (imagens, etapas,
  -- documentos): apagar o empreendimento apaga os locais dele, que fora dali
  -- nao querem dizer nada.
  empreendimento_id uuid NOT NULL REFERENCES empreendimentos (id) ON DELETE CASCADE,

  nome              text NOT NULL,

  -- Nao ha coluna de ordem, e a ausencia é decisao: os atalhos da galeria saem
  -- na ordem em que os locais foram cadastrados, que é a ordem em que alguem os
  -- pensou. Um numero digitado a mao para dizer "este é o terceiro" acaba sendo
  -- sempre a propria sequencia de cadastro, contada de cabeca — foi o que
  -- aconteceu com `etapas.ordem`, que nasceu 1 a 14 e por isso saiu do
  -- formulario.
  criado_em         timestamptz NOT NULL DEFAULT now(),

  -- Dois "Fachada" na mesma obra sao erro de digitacao, nunca intencao: as
  -- fotos se dividiriam entre dois atalhos de nome igual e ninguem entenderia
  -- por que metade sumiu. Entre obras diferentes o nome pode repetir a vontade.
  CONSTRAINT locais_nome_por_obra UNIQUE (empreendimento_id, nome)
);

CREATE INDEX IF NOT EXISTS locais_empreendimento ON locais (empreendimento_id, criado_em);

-- A foto aponta para o local. **Nula é o estado normal**, e nao pendencia: obra
-- sem locais cadastrados continua com a galeria de sempre, e foto que nao cabe
-- em local nenhum nao precisa de um.
--
-- `SET NULL` e nao `CASCADE`: apagar o local "Piscina" nao pode apagar as fotos
-- da piscina. Elas voltam para a fila geral, que é o que estavam antes.
ALTER TABLE imagens
  ADD COLUMN IF NOT EXISTS local_id uuid REFERENCES locais (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS imagens_local ON imagens (local_id);

COMMIT;
