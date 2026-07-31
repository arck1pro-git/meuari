import Link from "next/link";

/**
 * Escolhe de qual empreendimento sao os numeros do portal.
 *
 * O estado vive na URL (`?e=<id>`), e nao em `useState`: assim o servidor
 * refaz a conta ja filtrada e todo componente abaixo continua recebendo uma
 * posicao só, sem aprender a trocar de contexto. De quebra, a escolha sobrevive
 * ao recarregar e pode ser compartilhada.
 *
 * Quem decide se ele aparece é a pagina — com um empreendimento só nao ha
 * escolha a fazer.
 */
export function SeletorDeEmpreendimento({
  empreendimentos,
  selecionado,
}: {
  empreendimentos: { id: string; nome: string }[];
  /** `null` = consolidado. */
  selecionado: string | null;
}) {
  const opcoes = [{ id: null, nome: "Todos" }, ...empreendimentos];

  return (
    <nav
      aria-label="Empreendimento"
      className="mx-auto mb-4 w-full max-w-sm animate-surgir"
    >
      {/* Rola na horizontal quando os nomes nao cabem, em vez de quebrar em duas
          linhas e empurrar o saldo para baixo. */}
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {opcoes.map((opcao) => {
          const ativa = opcao.id === selecionado;
          return (
            <li key={opcao.id ?? "todos"}>
              <Link
                href={opcao.id ? `/portal?e=${opcao.id}` : "/portal"}
                // `page` e nao `true`: a opcao ativa é a secao em que se esta,
                // e é assim que o leitor de tela anuncia isso.
                aria-current={ativa ? "page" : undefined}
                // `scroll={false}`: trocar de empreendimento nao deve jogar a
                // pessoa para o topo se ela estava lendo o historico.
                scroll={false}
                className={`block rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${
                  ativa
                    ? "bg-marinho text-white"
                    : "bg-tinta/5 text-neutral-600 hover:bg-tinta/10 hover:text-tinta"
                }`}
              >
                {opcao.nome}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
