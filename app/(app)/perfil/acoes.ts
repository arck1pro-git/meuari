"use server";

import { revalidatePath } from "next/cache";
import { registrar } from "@/lib/auditoria";
import {
  abrirSessao,
  conferirSenha,
  gerarHash,
  lerSessao,
  SENHA_MINIMA,
} from "@/lib/auth";
import { consultar } from "@/lib/db";
import { emMinutos, limparTentativas, podeTentar } from "@/lib/limite";

/**
 * O que a tela recebe de volta.
 *
 * Tipado, e nao uma string em que `"ok"` significasse sucesso: uma mensagem de
 * erro nova que por acaso fosse `"ok"` passaria despercebida, e a tela nao teria
 * como distinguir "deu certo" de "deu errado assim" olhando texto.
 */
export type ResultadoDaSenha = { ok: true } | { erro: string };

/**
 * A pessoa troca a propria senha.
 *
 * Ate aqui o unico caminho era pedir ao administrador, que digitava a senha
 * nova em `/admin/usuarios` — e passava a conhece-la. Uma senha que duas
 * pessoas sabem nao é senha; é uma combinacao.
 *
 * ---
 *
 * **Tres cuidados que nao sao decorativos:**
 *
 * 1. **Exige a senha atual.** Sem isso, uma sessao sequestrada — aparelho
 *    emprestado, celular esquecido aberto — troca a senha e toma a conta sem
 *    nunca ter sabido a antiga.
 * 2. **Derruba as outras sessoes.** `sessao_versao + 1` invalida todo cookie
 *    emitido antes (ver `exigirSessao`). Trocar senha sem isso é o furo
 *    classico: quem entrou indevidamente continua dentro, e a troca serviu de
 *    nada. É a mesma maquina do "sair de todos os aparelhos".
 * 3. **O aparelho de quem trocou continua dentro.** O item 2 tambem invalida o
 *    cookie de quem esta aqui, entao a sessao é reaberta logo depois, ja com a
 *    versao nova. Sem isso a pessoa trocaria a senha e cairia na tela de login
 *    — o que parece erro, e leva a tentar de novo.
 *
 * O freio de tentativas é o mesmo do login, e pelo mesmo motivo: sem ele, este
 * formulario vira um lugar comodo para adivinhar a senha atual, com a vantagem
 * de nao precisar acertar o e-mail junto.
 */
export async function trocarSenha(
  _anterior: ResultadoDaSenha | null,
  dados: FormData,
): Promise<ResultadoDaSenha> {
  const sessao = await lerSessao();
  if (!sessao) return { erro: "Sua sessão expirou. Entre de novo." };

  const atual = String(dados.get("atual") ?? "");
  const nova = String(dados.get("nova") ?? "");
  const confirmacao = String(dados.get("confirmacao") ?? "");

  /*
   * O freio vem antes de `conferirSenha`, e nao depois: é justamente o custo do
   * `scrypt` (~100 ms de CPU) que se quer evitar pagar num laco de tentativas.
   * A chave é o id, e nao o e-mail — aqui ja se sabe quem é.
   */
  const { liberado, faltamSegundos } = await podeTentar(`senha:${sessao.id}`);
  if (!liberado) {
    return {
      erro: `Muitas tentativas. Tente de novo em ${emMinutos(faltamSegundos)} min.`,
    };
  }

  if (nova.length < SENHA_MINIMA) {
    return {
      erro: `A senha nova precisa de pelo menos ${SENHA_MINIMA} caracteres.`,
    };
  }
  if (nova !== confirmacao) {
    return { erro: "A confirmação não bate com a senha nova." };
  }
  if (nova === atual) {
    return { erro: "A senha nova precisa ser diferente da atual." };
  }

  const [usuario] = await consultar<{ senha_hash: string | null }>(
    "select senha_hash from usuarios where id = $1",
    [sessao.id],
  );
  if (!usuario) return { erro: "Não encontramos a sua conta." };

  if (!(await conferirSenha(atual, usuario.senha_hash))) {
    /*
     * Registrado, e com a acao de recusa: uma sequencia disto numa conta é
     * exatamente o sinal que se quer enxergar depois — alguem tentando a senha
     * de dentro de uma sessao aberta.
     */
    await registrar({
      acao: "login_recusado",
      alvoTabela: "usuarios",
      alvoId: sessao.id,
      detalhe: { motivo: "senha atual errada ao trocar" },
    });
    return { erro: "A senha atual está errada." };
  }

  /*
   * As duas escritas numa consulta só. Fossem duas, uma falha entre elas
   * deixaria a senha nova valendo com as sessoes antigas ainda de pé — o pior
   * dos dois mundos, e em silencio.
   */
  const [linha] = await consultar<{ sessao_versao: number }>(
    `update usuarios
        set senha_hash = $1, sessao_versao = sessao_versao + 1
      where id = $2
      returning sessao_versao`,
    [await gerarHash(nova), sessao.id],
  );

  await limparTentativas(`senha:${sessao.id}`);

  // Reabre a sessao deste aparelho com a versao nova — ver o item 3 do topo.
  await abrirSessao({
    id: sessao.id,
    tipo: sessao.tipo,
    nome: sessao.nome,
    versao: linha.sessao_versao,
  });

  /*
   * `campo`, e nunca o valor. O `peneirar` de `lib/auditoria.ts` ja apagaria
   * qualquer chave com "senha" no nome, mas o que se quer guardar aqui é o
   * fato, e nao o dado: quem trocou, quando, de onde.
   */
  await registrar({
    acao: "atualizar",
    alvoTabela: "usuarios",
    alvoId: sessao.id,
    detalhe: { campo: "senha", por: "o proprio usuario" },
  });

  revalidatePath("/perfil");
  return { ok: true };
}
