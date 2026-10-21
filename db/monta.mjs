/**
 * Monta a estrutura do banco do zero, aplicando os `.sql` de `db/` na ordem em
 * que producao os recebeu.
 *
 *   node db/monta.mjs            num banco vazio
 *   node db/monta.mjs --zerar    apaga tudo que houver e monta de novo
 *
 * **So no banco de desenvolvimento.** Producao ja tem a estrutura — ela nasceu
 * exatamente destes arquivos, um por vez, e refaze-la la seria destruir dados.
 * Por isso `--prod` é recusado aqui, e nao só desaconselhado.
 *
 * Os arquivos nao tem numero no nome; a ordem vem do historico do git (a data
 * em que cada um entrou) e das dependencias entre eles — `contrato-aditivos`
 * precisa da coluna que `recebimentos-empreendimento` cria, e assim por diante.
 * Esta lista é a unica definicao dessa ordem.
 *
 * Fora da lista, de proposito:
 * - `notificacoes-limpar.sql`: faxina de uma vez, nao migracao.
 *
 * Cada arquivo abre com BEGIN e fecha com COMMIT, entao um erro no meio de um
 * deles nao deixa tabela pela metade — e o script para ali, dizendo qual foi.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { alvo, anunciar, banco } from "./env.mjs";

const ORDEM = [
  "schema.sql",
  "unifica-aportes-contratos.sql",
  "recebimentos.sql",
  "recebimentos-empreendimento.sql",
  "recebimentos-unicidade.sql",
  "notificacoes.sql",
  "audit-logs.sql",
  "etapas.sql",
  "sessao-versao.sql",
  "empreendimento-ficha.sql",
  "etapas-grupo.sql",
  "etapas-frentes.sql",
  "contrato-aditivos.sql",
  "recebimento-contrato.sql",
  "notificacoes-agendadas.sql",
  "contrato-tipo-padrao.sql",
  "meta-captacao.sql",
  "etapa-documento.sql",
  "acessos.sql",
  "imagens-locais.sql",
];

if (alvo() === "prod") {
  console.error(
    "Este script monta a estrutura do zero e nao roda em producao, que ja a tem.",
  );
  process.exit(1);
}

const zerar = process.argv.includes("--zerar");
const b = banco("dev");
anunciar(b);

const cliente = new pg.Client({ connectionString: b.url });
await cliente.connect();

try {
  const { rows: tabelas } = await cliente.query(
    `select tablename from pg_tables where schemaname = 'public' order by 1`,
  );

  if (tabelas.length > 0 && !zerar) {
    console.error(
      `O banco ja tem ${tabelas.length} tabela(s): ${tabelas.map((t) => t.tablename).join(", ")}.\n` +
        "Para apagar tudo e montar de novo: node db/monta.mjs --zerar",
    );
    process.exitCode = 1;
  } else {
    if (tabelas.length > 0) {
      // Tabela a tabela, e nao `drop schema public`: no Neon o schema pode nao
      // ser do usuario do pooler, e as tabelas sao.
      await cliente.query(
        `drop table if exists ${tabelas.map((t) => `"${t.tablename}"`).join(", ")} cascade`,
      );
      await cliente.query("drop function if exists toca_atualizado_em() cascade");
      console.log(`Apagadas ${tabelas.length} tabelas.`);
    }

    for (const nome of ORDEM) {
      await cliente.query(
        readFileSync(new URL(nome, import.meta.url), "utf8"),
      );
      console.log(`  ok  ${nome}`);
    }

    /*
     * `contrato-aditivos.sql` copia `contratos` e `recebimentos` antes de
     * mexer nelas — em producao essas copias guardam dados de verdade. Num
     * banco recem-montado elas nascem vazias, e ficar com duas tabelas
     * `backup_*` sem nada dentro so confunde quem abre o banco.
     */
    for (const copia of ["backup_contratos_20260806", "backup_recebimentos_20260806"]) {
      const { rows } = await cliente.query(
        `select count(*)::int as n from ${copia}`,
      );
      if (rows[0].n === 0) await cliente.query(`drop table ${copia}`);
    }

    const { rows: prontas } = await cliente.query(
      `select tablename from pg_tables where schemaname = 'public' order by 1`,
    );
    console.log(
      `\nEstrutura montada: ${prontas.length} tabelas — ${prontas.map((t) => t.tablename).join(", ")}.`,
    );
    console.log("Proximo passo: node db/seed.mjs --exemplo");
  }
} catch (erro) {
  // So a mensagem: o objeto do `pg` traz a string de conexao junto.
  console.error(`Falhou: ${erro.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
