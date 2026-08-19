"use client";

import { useRouter } from "next/navigation";
import { Seletor } from "../_componentes/seletor";

/**
 * Filtro da listagem, por campo de referencia.
 *
 * O estado é a URL (`?f=<id>`), e nao um `useState`: assim o link pode ser
 * compartilhado, o botao de voltar do navegador funciona e a pagina — que é
 * `force-dynamic` — refaz a consulta ja filtrada no servidor. Guardar isto no
 * cliente exigiria trazer a tabela inteira e filtrar na tela.
 *
 * **Os outros parametros vao junto.** A tela tem mais coisas na URL — o
 * formulario aberto, o painel de lancamento, o mes escolhido —, e trocar de
 * contrato nao pode fechar o que estava aberto. Eles chegam prontos do servidor,
 * em `atuais`, em vez de sairem de um `useSearchParams()`: o hook obriga a
 * pagina a esperar por uma fronteira de Suspense, e aqui a pagina ja tem os
 * valores em maos.
 */
export function FiltroDaListagem({
  rotulo,
  parametro,
  opcoes,
  selecionado,
  destino,
  atuais = {},
}: {
  rotulo: string;
  /** Nome do parametro na URL. */
  parametro: string;
  opcoes: { id: string; rotulo: string }[];
  selecionado: string;
  /** Rota da listagem, sem query. */
  destino: string;
  /** O resto da URL, para nao se perder na troca. */
  atuais?: Record<string, string | undefined>;
}) {
  const router = useRouter();

  function trocar(valor: string) {
    const busca = new URLSearchParams();
    for (const [chave, atual] of Object.entries(atuais)) {
      if (chave !== parametro && atual) busca.set(chave, atual);
    }
    // Sem valor, o parametro simplesmente nao entra: `?f=` vazio seria um
    // estado a mais dizendo a mesma coisa que "sem filtro".
    if (valor) busca.set(parametro, valor);

    const query = busca.toString();
    router.push(query ? `${destino}?${query}` : destino);
  }

  return (
    <span className="flex items-center gap-2">
      <span className="shrink-0 text-xs font-semibold text-neutral-600">
        {rotulo}
      </span>
      {/* `key` no valor: o seletor guarda a escolha em estado proprio, e depois
          da navegacao o servidor manda o valor novo — sem remontar, os dois
          discordariam se alguem usasse o botao de voltar. */}
      <Seletor
        key={selecionado}
        rotuloAcessivel={rotulo}
        opcoes={opcoes.map((o) => ({ valor: o.id, rotulo: o.rotulo }))}
        valorInicial={selecionado}
        vazio="Todos"
        aoEscolher={trocar}
        className="min-w-52 py-1.5"
      />
    </span>
  );
}
