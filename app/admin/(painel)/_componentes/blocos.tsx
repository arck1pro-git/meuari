/**
 * As duas pecas de moldura que mais de uma tela do painel usa.
 *
 * Nasceram dentro do Dashboard e sairam de la quando a tela de Acessos passou a
 * precisar das mesmas. Copiar as trinta linhas seria copiar junto a nota sobre
 * o `z-index` abaixo — que custou um diagnostico — e garantir que as duas
 * versoes divergissem no primeiro ajuste de espacamento.
 *
 * Só a moldura mora aqui. O que cada tela poe dentro (as linhas da tabela de
 * modalidades, as celulas da lista de sessoes) continua onde é usado: sao
 * pecas de uma tela só, e trazer tudo para ca faria deste arquivo um deposito.
 */

/**
 * A moldura de cada bloco: filete de 1px e raio pequeno, sem elevacao.
 *
 * O cartao do portal tem sombra em duas camadas — ele flutua sobre o fundo,
 * porque ali cada um é uma coisa a ser notada. Aqui sao seis blocos na mesma
 * tela; seis sombras seriam seis pedidos de atencao simultaneos, e o filete
 * separa igual sem pedir nada.
 */
export function Bloco({
  titulo,
  apoio,
  acessorio,
  className = "",
  children,
}: {
  titulo: string;
  apoio?: string;
  acessorio?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    /*
     * `relative` mais `z` no hover: é o que tira o balao do grafico de tras do
     * bloco vizinho.
     *
     * A causa nao é o balao — é a animacao de entrada. `--animate-surgir` anima
     * `transform` e `opacity` com `fill-mode: both`, e enquanto ela vale o
     * navegador mantem **cada bloco como um contexto de empilhamento proprio**.
     * O balao do Recharts é posicionado dentro do bloco dele, entao nao tem como
     * escapar desse contexto: dois blocos irmaos empatam em camada, e quem vem
     * depois na arvore pinta por cima — sempre.
     *
     * Subir o `z-index` do proprio balao nao resolveria: ele so ordena dentro do
     * contexto onde ja esta preso. Quem precisa subir é o bloco inteiro.
     *
     * No hover, e nao fixo, porque fixo apenas move o empate: se todos os
     * blocos ficassem em `z-20`, a ordem da arvore voltaria a decidir. Como o
     * balao só existe enquanto o ponteiro esta no grafico, levantar o bloco
     * exatamente nesse momento resolve sem criar camada permanente nenhuma.
     *
     * `focus-within` pelo mesmo motivo, para quem navega por teclado: o
     * `accessibilityLayer` do Recharts abre o mesmo balao no foco.
     */
    <section
      className={`relative rounded-xl border border-zinc-200 bg-white p-4 focus-within:z-20 hover:z-20 sm:p-5 ${className}`}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-sm font-bold tracking-tight text-tinta">
            {titulo}
          </h2>
          {apoio && <p className="mt-0.5 text-xs text-neutral-500">{apoio}</p>}
        </div>
        {acessorio}
      </header>
      {children}
    </section>
  );
}

/**
 * Uma celula da faixa de indicadores.
 *
 * O `destaque` é do numero que responde pelos outros — no Dashboard, o total
 * captado; nos Acessos, as sessoes. Sem diferenca de corpo a faixa lê como
 * quatro numeros de igual peso, e nenhum deles é a pergunta da tela.
 */
export function Indicador({
  rotulo,
  valor,
  apoio,
  destaque,
}: {
  rotulo: string;
  valor: string;
  apoio: string;
  destaque?: boolean;
}) {
  return (
    // O filete horizontal fecha a primeira fila no telefone, onde a grade cai
    // para duas colunas e o `divide-x` do container nao alcanca.
    <div className="border-b border-zinc-200 p-4 last:border-b-0 sm:border-b-0 sm:p-5">
      <dt className="text-[0.6875rem] font-semibold tracking-wider text-neutral-400 uppercase">
        {rotulo}
      </dt>
      <dd
        className={`mt-1.5 font-bold tracking-tight tabular-nums text-tinta ${
          destaque ? "text-2xl" : "text-lg"
        }`}
      >
        {valor}
      </dd>
      <p className="mt-1 text-xs leading-snug text-neutral-500">{apoio}</p>
    </div>
  );
}
