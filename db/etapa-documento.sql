-- Amaan Invest — o papel que comprova a etapa da obra
--
-- A etapa dizia o quanto foi feito ("Estrutura, 60%") e nada mais. O que
-- sustenta esse numero — laudo, ART, medicao, relatorio fotografico — ficava
-- fora do sistema, no e-mail de quem acompanhava a obra. Com a coluna, o
-- comprovante passa a viver junto do percentual que ele comprova.
--
-- `text` e nulavel, como `contratos.documento` e `aditivos.documento`: guarda o
-- *caminho no bucket*, nao a URL. A URL é assinada na hora da leitura e vale 60
-- segundos — ver `app/admin/arquivo/[tabela]/[id]/route.ts`. Guardar URL aqui
-- seria guardar uma assinatura vencida.
--
-- Nulavel porque a maioria das etapas nao tem papel nenhum, e nao ter é o estado
-- normal — nao uma pendencia.
--
-- Bucket `docs`, o mesmo dos documentos do empreendimento: etapa pertence a uma
-- obra, e o papel dela é da mesma familia dos outros papeis daquela obra.
--
-- Aditiva: so acrescenta uma coluna nulavel, nao toca em dado nenhum.
--
-- Rodar uma vez:  node db/aplica.mjs db/etapa-documento.sql

BEGIN;

ALTER TABLE etapas
  ADD COLUMN IF NOT EXISTS documento text;

COMMENT ON COLUMN etapas.documento IS
  'Caminho no bucket docs do papel que comprova a etapa. Nunca a URL assinada.';

COMMIT;
