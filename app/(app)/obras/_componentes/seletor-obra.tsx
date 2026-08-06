import Link from "next/link";

/**
 * De qual empreendimento é esta tela.
 *
 * Sao chips e nao um `<select>`: com duas ou tres obras, a lista aberta ja é a
 * resposta inteira, e trocar custa um toque em vez de tres. A fila rola na
 * horizontal quando os nomes nao cabem, em vez de quebrar em duas linhas e
 * empurrar a foto para baixo.
 *
 * `<Link>` e nao estado de cliente: cada obra é um endereco proprio, entao a
 * escolha sobrevive ao recarregar, volta com o botao do navegador e pode ser
 * mandada para alguem. É o mesmo desenho do seletor do `/portal`.
 *
 * Quem decide se ele aparece é a pagina — com uma obra só nao ha escolha a
 * fazer.
 */
export function SeletorDeObra({
  obras,
  atual,
}: {
  obras: { id: string; nome: string }[];
  atual: string;
}) {
  return (
    <nav aria-label="Empreendimento" className="mb-4 animate-surgir">
      <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {obras.map((obra) => {
          const ativa = obra.id === atual;
          return (
            <li key={obra.id}>
              <Link
                href={`/obras/${obra.id}`}
                // `page` e nao `true`: a opcao ativa é a secao em que se esta,
                // e é assim que o leitor de tela anuncia isso.
                aria-current={ativa ? "page" : undefined}
                className={`block rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${
                  ativa
                    ? "bg-marinho text-white"
                    : "bg-tinta/5 text-neutral-600 hover:bg-tinta/10 hover:text-tinta"
                }`}
              >
                {obra.nome}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
