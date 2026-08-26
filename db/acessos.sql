-- Quem abriu o portal, quando, em que aparelho e de onde.
--
-- Ate aqui o rastro de uso era `audit_logs`, e ele responde a outra pergunta:
-- "quem *mudou* este numero". Nao havia nada dizendo que o investidor entrou
-- terca de manha pelo celular, ficou seis minutos e passou por Carteira e
-- Obras — e essa é a pergunta que se faz quando se decide o que melhorar.
--
-- **Tabela propria, e nao mais uma acao em `audit_logs`.** Sao dois volumes
-- muito diferentes: escrita no /admin acontece algumas vezes por dia, page view
-- acontece a cada toque. Misturados, a consulta "o que aconteceu" — que é
-- forense, e a razao de `audit_logs` existir — passaria a varrer dezenas de
-- milhares de linhas de navegacao para achar a alteracao de uma taxa. Separados,
-- cada uma tem o indice que serve a ela, e os prazos de descarte podem ser
-- diferentes: rastro de auditoria se guarda por anos, navegacao nao.
--
-- **Uma linha por pagina aberta, e nao por sessao.** A sessao é derivada:
-- agrupar por `sessao_id` devolve inicio, fim, duracao e por quais abas se
-- passou. Guardar a sessao pronta obrigaria a reescrever a mesma linha a cada
-- navegacao, e uma escrita perdida corromperia o registro inteiro em vez de
-- faltar um passo.
--
-- Aditiva: só cria tabela e indice, nao altera nem apaga nada do que existe.

BEGIN;

CREATE TABLE IF NOT EXISTS acessos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A sessao a que esta pagina pertence: o `sid` do cookie, sorteado no login.
  -- É o que amarra as paginas de uma visita — sem ele, a mesma pessoa em dois
  -- aparelhos ao mesmo tempo viraria uma sessao só, com duracao inventada.
  --
  -- Sem FK: nao ha tabela de sessoes. O cookie é assinado e nao guardado em
  -- lugar nenhum (ver `lib/sessao.ts`), entao o `sid` é um identificador que
  -- só existe aqui.
  sessao_id    uuid NOT NULL,

  -- Quem. `SET NULL` pelo mesmo motivo de `audit_logs`: apagar um usuario nao
  -- apaga o rastro do que ele fez, e o nome fica a parte para "quem era"
  -- continuar legivel depois.
  usuario_id   uuid REFERENCES usuarios (id) ON DELETE SET NULL,
  usuario_nome text,

  -- Onde no app. `rota` é o caminho cheio (`/obras/8f3c…`), `secao` é a aba
  -- (`obras`). As duas porque servem a perguntas distintas: a secao agrega —
  -- "quantas vezes abriram Obras" —, e a rota diz *qual* obra.
  --
  -- A rota nunca traz query string: `?i=<id>` e afins repetiriam, aqui, dados
  -- que ja estao nas colunas proprias, e alguns deles sao identificadores de
  -- outras pessoas.
  rota         text NOT NULL,
  secao        text NOT NULL,

  -- O aparelho, lido do `user-agent` pelo helper `userAgent()` do Next.
  -- `mobile`, `tablet` ou `desktop`.
  dispositivo  text,
  sistema      text,
  navegador    text,

  -- A largura da janela, em px, medida no proprio navegador.
  --
  -- Existe porque o `user-agent` mente e a largura nao: iPad com "Solicitar
  -- site para computador" se anuncia como Mac, e é o caso mais comum de um
  -- tablet contado como desktop. Quando as duas discordam, esta coluna é a que
  -- descreve a tela que a pessoa tinha na frente.
  largura      integer,

  -- App instalado na tela inicial (`display-mode: standalone`) ou aba do
  -- navegador. Só o cliente sabe dizer — nao ha cabecalho que conte isso.
  standalone   boolean,

  -- De onde. A cidade e o pais vem dos cabecalhos `x-vercel-ip-*`, que a
  -- hospedagem preenche; em desenvolvimento eles nao existem e ficam nulos.
  ip           text,
  cidade       text,
  regiao       text,
  pais         text,

  -- Quanto tempo esta pagina ficou a frente, em milissegundos.
  --
  -- Nulo é o normal e nao é defeito: o valor chega num segundo envio, quando a
  -- pessoa sai da pagina, e esse envio é a parte menos confiavel do conjunto
  -- (aba fechada no meio, celular que dorme, iOS que encerra o processo). A
  -- duracao da sessao nao depende dele — ver `lib/admin/acessos.ts`, que usa o
  -- intervalo entre a primeira e a ultima pagina como piso.
  visivel_ms   integer,

  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- "O que aconteceu hoje", que é como a tela abre.
CREATE INDEX IF NOT EXISTS acessos_recentes ON acessos (criado_em DESC);
-- "O que fulano fez", o filtro por usuario.
CREATE INDEX IF NOT EXISTS acessos_usuario  ON acessos (usuario_id, criado_em DESC);
-- O agrupamento por sessao, que é o que monta cada linha da tabela de sessoes.
CREATE INDEX IF NOT EXISTS acessos_sessao   ON acessos (sessao_id, criado_em);

COMMIT;
