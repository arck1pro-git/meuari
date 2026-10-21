/**
 * Cria os usuarios iniciais e, com `--exemplo`, uma carteira de mentira para
 * desenvolvimento. Idempotente no que é cadastro: rodar de novo nao duplica
 * ninguem.
 *
 *   node db/seed.mjs              so o administrador (e o Douglas, sem contrato)
 *   node db/seed.mjs --exemplo    mais obras, investidores, contratos, creditos,
 *                                 etapas e avisos
 *   node db/seed.mjs --prod       contra producao — pede de proposito; e sem
 *                                 `--exemplo`, que la é recusado
 *
 * **Banco de desenvolvimento por padrao** — ver `db/env.mjs`.
 *
 * E-mail e senha do administrador vem de `SEED_ADMIN_EMAIL` e `SEED_SENHA`, no
 * arquivo de ambiente do alvo (`.env.development.local` no dev). Sem `SEED_SENHA`
 * a senha é sorteada e impressa uma unica vez — o banco guarda so o hash. Com
 * ela, os investidores de exemplo entram com a mesma senha, que é o que se quer
 * num banco de brinquedo e nunca em producao.
 *
 * Os creditos de exemplo saem de `estimarCiclo`, a mesma conta que o /admin
 * sugere ao lancar — assim o historico de dev é o que o portal teria produzido,
 * e nao numeros redondos que nenhuma tela reconhece. O Node 23.6+ (aqui, 24)
 * apaga os tipos do `.ts` ao importar; é o que permite usar a funcao daqui em
 * vez de copia-la.
 */
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";
import {
  dataDoCredito,
  estimarCiclo,
  primeiroCreditoDe,
} from "../lib/portal/recebimentos.ts";
import { alvo, anunciar, argumentos, banco, variaveis } from "./env.mjs";

const derivar = promisify(scrypt);

// Mesmo formato de `lib/auth.ts`: scrypt$sal$hash, ambos em hex.
async function gerarHash(senha) {
  const sal = randomBytes(16);
  const hash = await derivar(senha, sal, 64);
  return `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;
}

const exemplo = process.argv.includes("--exemplo");
const qual = alvo();

if (exemplo && qual === "prod") {
  console.error("Dados de exemplo nao entram em producao. Rode sem --prod.");
  process.exit(1);
}

const b = banco(qual);
anunciar(b);

const env = variaveis(qual);
// O argumento solto continua valendo como e-mail do administrador, como antes.
const emailAdmin =
  argumentos()[0] ?? env.SEED_ADMIN_EMAIL?.valor ?? "admin@meuari.com.br";
const senhaFixa = env.SEED_SENHA?.valor;
const senhaAdmin = senhaFixa ?? randomBytes(9).toString("base64url");

const cliente = new pg.Client({ connectionString: b.url });
await cliente.connect();

try {
  // `on conflict` no indice de e-mail sem caixa — o mesmo que garante a
  // unicidade. Sem ele, rodar duas vezes estouraria a restricao.
  const admin = await cliente.query(
    `insert into usuarios (nome, email, tipo, senha_hash)
     values ($1, $2, 'administrador', $3)
     on conflict ((lower(email))) do nothing
     returning id`,
    ["Administrador", emailAdmin, await gerarHash(senhaAdmin)],
  );

  const douglas = await cliente.query(
    `insert into usuarios (nome, email, tipo)
     values ('Douglas', $1, 'investidor')
     on conflict ((lower(email))) do nothing
     returning id`,
    ["douglas@exemplo.com"],
  );

  console.log("");
  if (admin.rowCount) {
    console.log("Administrador criado.");
    console.log("  e-mail:", emailAdmin);
    if (senhaFixa) {
      console.log(`  senha : a de SEED_SENHA em ${env.SEED_SENHA.origem}`);
    } else {
      console.log("  senha :", senhaAdmin, " <- anote agora, nao volta a aparecer");
    }
  } else {
    console.log(`Administrador ${emailAdmin} ja existia — nada alterado.`);
  }

  console.log(
    douglas.rowCount
      ? "Investidor Douglas criado (douglas@exemplo.com), sem contrato."
      : "Investidor Douglas ja existia — nada alterado.",
  );

  if (exemplo) await semearExemplo(cliente, senhaFixa);
  console.log("");
} catch (erro) {
  // Só a mensagem: o objeto do `pg` traz a string de conexao junto.
  console.error(`Falhou: ${erro.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}

/* ------------------------------------------------------------- exemplo -- */

/** `AAAA-MM-DD` de hoje no fuso do portal. */
function hoje() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

/** A competencia seguinte de `AAAA-MM`. */
function mesSeguinte(competencia) {
  const [ano, mes] = competencia.split("-").map(Number);
  return mes === 12
    ? `${ano + 1}-01`
    : `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

/**
 * Uma carteira pequena e verossimil: duas obras, cinco investidores, as duas
 * modalidades, um aditivo, um contrato ainda em carencia e o historico de
 * creditos ate o ultimo dia 17.
 *
 * Nomes e valores sao inventados — dado de investidor real nunca entra aqui.
 * So roda num banco sem obra nenhuma: um seed que "completa" o que ja existe
 * acabaria com duas Anas e tres Mirantes.
 */
async function semearExemplo(cliente, senha) {
  const { rows: [{ n }] } = await cliente.query(
    "select count(*)::int as n from empreendimentos",
  );
  if (n > 0) {
    console.log(
      `\nJa ha ${n} empreendimento(s); os dados de exemplo nao foram inseridos.` +
        "\nPara recomecar do zero: node db/monta.mjs --zerar && node db/seed.mjs --exemplo",
    );
    return;
  }

  const hash = senha ? await gerarHash(senha) : null;

  // ---- obras
  const obras = {};
  for (const o of [
    {
      chave: "mirante",
      nome: "Residencial Mirante",
      descricao:
        "Torre residencial de 18 pavimentos com vista para o mar, 64 unidades de 2 e 3 dormitorios.",
      cidade: "Itapema",
      uf: "SC",
      status: "Em obras",
      inicio: "2025-09-01",
      entrega: "2028-06-30",
      meta: 4_500_000,
    },
    {
      chave: "costaVerde",
      nome: "Edificio Costa Verde",
      descricao:
        "Smart building de uso misto na orla de Porto Belo: studios para short stay, minimercado e lavanderia.",
      cidade: "Porto Belo",
      uf: "SC",
      status: "Lançamento",
      inicio: "2026-11-15",
      entrega: "2029-12-20",
      meta: 6_000_000,
    },
  ]) {
    const { rows } = await cliente.query(
      `insert into empreendimentos
         (nome, descricao, cidade, uf, status, previsao_inicio_obras,
          previsao_entrega, meta_captacao)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [o.nome, o.descricao, o.cidade, o.uf, o.status, o.inicio, o.entrega, o.meta],
    );
    obras[o.chave] = rows[0].id;
  }

  // ---- investidores (o Douglas ja existe; ganha a senha e um contrato)
  const pessoas = {};
  for (const p of [
    { chave: "ana", nome: "Ana Beatriz Souza", email: "ana@exemplo.com" },
    { chave: "carlos", nome: "Carlos Eduardo Lima", email: "carlos@exemplo.com" },
    { chave: "mariana", nome: "Mariana Costa", email: "mariana@exemplo.com" },
    { chave: "rafael", nome: "Rafael Almeida", email: "rafael@exemplo.com" },
    { chave: "douglas", nome: "Douglas", email: "douglas@exemplo.com" },
  ]) {
    const { rows } = await cliente.query(
      `insert into usuarios (nome, email, tipo, senha_hash)
       values ($1, $2, 'investidor', $3)
       on conflict ((lower(email))) do update
         set senha_hash = coalesce(excluded.senha_hash, usuarios.senha_hash)
       returning id`,
      [p.nome, p.email, hash],
    );
    pessoas[p.chave] = rows[0].id;
  }

  // ---- contratos
  //
  // Datas escolhidas para exercitar as regras do portal: entrada no meio do
  // ciclo (quebrado no regime antigo), entrada no dia 18 (ciclo cheio), as
  // duas modalidades, e um contrato depois de 18/10/2026 — este fica em
  // carencia e so recebe o primeiro credito no segundo dia 17.
  const contratos = [
    { chave: "ana", obra: "mirante", data: "2026-03-10", valor: 200_000, taxa: 0.023, modalidade: "mensal", prazo: 36 },
    { chave: "carlos", obra: "mirante", data: "2026-04-05", valor: 150_000, taxa: 0.026, modalidade: "final", prazo: 36 },
    { chave: "mariana", obra: "costaVerde", data: "2026-06-18", valor: 100_000, taxa: 0.021, modalidade: "mensal", prazo: 36 },
    { chave: "douglas", obra: "mirante", data: "2026-08-03", valor: 60_000, taxa: 0.018, modalidade: "mensal", prazo: 18 },
    { chave: "rafael", obra: "costaVerde", data: "2026-10-20", valor: 120_000, taxa: 0.021, modalidade: "mensal", prazo: 36 },
  ];

  for (const c of contratos) {
    const { rows } = await cliente.query(
      `insert into contratos
         (usuario_id, empreendimento_id, data, valor, taxa, modalidade, prazo_meses)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [pessoas[c.chave], obras[c.obra], c.data, c.valor, c.taxa, c.modalidade, c.prazo],
    );
    c.id = rows[0].id;
    c.aportes = [
      { data: c.data, valor: c.valor, taxaMensal: c.taxa, modalidade: c.modalidade },
    ];
  }

  // Um aditivo na Ana, sem taxa: segue a do contrato.
  const ana = contratos[0];
  await cliente.query(
    `insert into aditivos (contrato_id, data, valor, observacao)
     values ($1, $2, $3, $4)`,
    [ana.id, "2026-07-22", 50_000, "Segundo aporte, mesma participacao."],
  );
  ana.aportes.push({
    data: "2026-07-22",
    valor: 50_000,
    taxaMensal: ana.taxa,
    modalidade: "mensal",
  });

  // ---- creditos: do primeiro dia 17 de cada contrato `mensal` ate o ultimo
  //      dia 17 que ja passou, pela conta do portal.
  const agora = hoje();
  const ultimo17 =
    agora >= dataDoCredito(agora.slice(0, 7))
      ? dataDoCredito(agora.slice(0, 7))
      : dataDoCredito(agora.slice(0, 7)).replace(/^(\d{4})-(\d{2})/, (_, a, m) => {
          const anterior = Number(m) === 1 ? `${Number(a) - 1}-12` : `${a}-${String(Number(m) - 1).padStart(2, "0")}`;
          return anterior;
        });

  let creditos = 0;
  for (const c of contratos.filter((c) => c.modalidade === "mensal")) {
    for (
      let data = primeiroCreditoDe(c.data);
      data <= ultimo17;
      data = dataDoCredito(mesSeguinte(data.slice(0, 7)))
    ) {
      const { valor } = estimarCiclo(c.aportes, data);
      if (valor <= 0) continue;
      await cliente.query(
        `insert into recebimentos (contrato_id, empreendimento_id, data, valor, observacao)
         values ($1, $2, $3, $4, $5)`,
        [
          c.id,
          obras[c.obra],
          data,
          valor,
          // Uma anotacao só, para a tela mostrar o que ela faz com observacao.
          c.chave === "ana" && data === "2026-08-17"
            ? "Primeiro ciclo com o aditivo de 22/07, rateado."
            : null,
        ],
      );
      creditos += 1;
    }
  }

  // ---- etapas da obra, nas tres frentes
  const etapas = [
    ["mirante", "Projeto", "Projeto arquitetonico", 100, "2026-02-10", 1],
    ["mirante", "Projeto", "Projeto estrutural", 85, null, 2],
    ["mirante", "Projeto", "Projetos complementares", 40, null, 3],
    ["mirante", "Aprovações", "Alvara de construcao", 100, "2026-05-20", 4],
    ["mirante", "Aprovações", "Registro de incorporacao", 60, null, 5],
    ["mirante", "Marketing", "Stand de vendas", 30, null, 6],
    ["costaVerde", "Projeto", "Estudo de viabilidade", 100, "2026-08-01", 1],
    ["costaVerde", "Projeto", "Projeto arquitetonico", 70, null, 2],
    ["costaVerde", "Aprovações", "Consulta de viabilidade na prefeitura", 50, null, 3],
  ];
  for (const [obra, grupo, nome, percentual, concluida, ordem] of etapas) {
    await cliente.query(
      `insert into etapas
         (empreendimento_id, grupo, nome, percentual, concluida_em, ordem)
       values ($1, $2, $3, $4, $5, $6)`,
      [obras[obra], grupo, nome, percentual, concluida, ordem],
    );
  }

  // ---- locais da galeria (sem fotos: imagem precisa de arquivo no bucket)
  for (const nome of ["Fachada", "Piscina", "Apartamento modelo"]) {
    await cliente.query(
      `insert into locais (empreendimento_id, nome) values ($1, $2)`,
      [obras.mirante, nome],
    );
  }

  // ---- avisos: um geral e um so da Ana
  await cliente.query(
    `insert into notificacoes (usuario_id, titulo, corpo, url) values
       (null, 'Ambiente de desenvolvimento',
        'Esta carteira é de exemplo: nomes, obras e valores sao inventados.', '/portal'),
       ($1, 'Crédito de outubro lançado',
        'O crédito do ciclo de 17/10 já está na sua carteira.', '/portal/historico')`,
    [pessoas.ana],
  );

  console.log(
    `\nDados de exemplo: ${Object.keys(obras).length} obras, ${Object.keys(pessoas).length} investidores, ` +
      `${contratos.length} contratos (1 em carencia), 1 aditivo, ${creditos} creditos ate ${ultimo17}, ` +
      `${etapas.length} etapas, 3 locais, 2 avisos.`,
  );
  console.log(
    senha
      ? "Investidores de exemplo entram com a senha de SEED_SENHA (e-mails *@exemplo.com)."
      : "Investidores de exemplo sem senha: defina SEED_SENHA ou use db/senha.mjs.",
  );
}
