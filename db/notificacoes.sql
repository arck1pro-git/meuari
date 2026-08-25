-- Amaan Invest — caixa de notificacoes
--
-- Duas tabelas, e nao uma, por causa do aviso geral: `notificacoes.usuario_id`
-- em branco significa "para todos", e uma linha compartilhada nao tem onde
-- guardar que *o Douglas* leu. A marca de leitura vive em `notificacoes_lidas`,
-- uma por pessoa.
--
-- Isto guarda o que aparece na caixinha do sino. Nao se confunde com
-- `push_inscricoes`, que guarda para onde o navegador aceita receber push: uma
-- é o conteudo, a outra é o endereco de entrega.
--
-- Rodar uma vez:  node db/aplica.mjs db/notificacoes.sql

BEGIN;

CREATE TABLE notificacoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Em branco = aviso geral, para todo investidor.
  usuario_id uuid REFERENCES usuarios (id) ON DELETE CASCADE,
  titulo     text NOT NULL,
  corpo      text,
  url        text,  -- para onde levar ao tocar, ex.: /galeria
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notificacoes_lidas (
  notificacao_id uuid NOT NULL REFERENCES notificacoes (id) ON DELETE CASCADE,
  usuario_id     uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  lida_em        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notificacao_id, usuario_id)
);

-- A consulta é sempre "as minhas mais as gerais, da mais nova para a mais
-- velha". `DESC` no indice para o `order by` nao precisar reordenar.
CREATE INDEX notificacoes_destino ON notificacoes (usuario_id, criado_em DESC);
CREATE INDEX notificacoes_lidas_usuario ON notificacoes_lidas (usuario_id);

COMMIT;
