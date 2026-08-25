-- Amaan Invest — schema PostgreSQL
-- Requer PG 13+ (gen_random_uuid nativo). Antes disso: CREATE EXTENSION pgcrypto;

BEGIN;

-- Mantem `atualizado_em` em dia sem a aplicacao precisar lembrar.
CREATE FUNCTION toca_atualizado_em() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

CREATE TABLE usuarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          text NOT NULL DEFAULT 'investidor'
                CHECK (tipo IN ('investidor', 'administrador')),
  nome          text NOT NULL,
  email         text NOT NULL,
  senha_hash    text,  -- hash, nunca a senha
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Um usuario tem varios dispositivos: celular e notebook sao duas inscricoes.
CREATE TABLE push_inscricoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE empreendimentos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text NOT NULL,
  descricao             text,
  previsao_inicio_obras date,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contratos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid NOT NULL REFERENCES empreendimentos (id) ON DELETE RESTRICT,
  usuario_id        uuid NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
  tipo              text NOT NULL,
  valor             numeric(14, 2) NOT NULL,  -- numeric, nao float
  modalidade        text NOT NULL CHECK (modalidade IN ('final', 'mensal')),
  documento         text,        -- url do instrumento assinado
  prazo_meses       integer,     -- "tempo", com unidade explicita
  taxa              numeric(6, 5) NOT NULL,  -- 0.02600 = 2,6% ao mes
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documentos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid NOT NULL REFERENCES empreendimentos (id) ON DELETE CASCADE,
  nome              text NOT NULL,
  url               text NOT NULL,
  criado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE imagens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid NOT NULL REFERENCES empreendimentos (id) ON DELETE CASCADE,
  nome              text NOT NULL,
  url               text NOT NULL,
  criado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE videos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid NOT NULL REFERENCES empreendimentos (id) ON DELETE CASCADE,
  nome              text NOT NULL,
  url               text NOT NULL,
  criado_em         timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indices
-- -----------------------------------------------------------------------------

-- Sem diferenciar caixa: "Ana@x.com" e "ana@x.com" sao a mesma pessoa.
CREATE UNIQUE INDEX usuarios_email_unico ON usuarios (lower(email));

CREATE INDEX push_inscricoes_usuario   ON push_inscricoes (usuario_id);
CREATE INDEX contratos_usuario         ON contratos (usuario_id);
CREATE INDEX contratos_empreendimento  ON contratos (empreendimento_id);
CREATE INDEX documentos_empreendimento ON documentos (empreendimento_id);
CREATE INDEX imagens_empreendimento    ON imagens (empreendimento_id);
CREATE INDEX videos_empreendimento     ON videos (empreendimento_id);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

CREATE TRIGGER usuarios_atualizado_em BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION toca_atualizado_em();

CREATE TRIGGER empreendimentos_atualizado_em BEFORE UPDATE ON empreendimentos
  FOR EACH ROW EXECUTE FUNCTION toca_atualizado_em();

CREATE TRIGGER contratos_atualizado_em BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION toca_atualizado_em();

COMMIT;
