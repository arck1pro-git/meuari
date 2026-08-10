/** Pecas visuais reaproveitadas pelas duas secoes. Tudo Server Component. */

export function Cartao({
  id,
  titulo,
  apoio,
  acessorio,
  tom = "claro",
  children,
}: {
  /** Alvo de ancora: `#id` na mesma pagina rola ate este cartao. */
  id?: string;
  titulo?: string;
  apoio?: string;
  acessorio?: React.ReactNode;
  /** `escuro` traz o mesmo degrade do cabecalho e corre o conteudo em branco. */
  tom?: "claro" | "escuro";
  children: React.ReactNode;
}) {
  const escuro = tom === "escuro";

  return (
    // A borda fica nos dois tons, so mudando de cor: sem ela o cartao escuro
    // perderia 1px de cada lado e nao alinharia com os claros da mesma pilha.
    // `scroll-mt` reserva a altura do cabecalho, que é sticky e cobriria o topo
    // do cartao quando uma ancora rolasse ate aqui.
    <section
      id={id}
      // A mesma elevacao do cartao de saldo, nos dois toms — foi decisao de
      // desenho que todo cartao caia com o mesmo peso.
      //
      // A cor do tom escuro vem da classe `degrade-cartao`, escrita em CSS puro
      // no `globals.css`: `tinta → marinho → azul`, os tres a 80%. O degrade
      // para em `azul`, e nao em `ceu`, porque o `ceu` a 70% sobre branco
      // virava um azul-claro lavado, onde o texto e as barras brancas caiam
      // para 1,86:1 de contraste. Assim o pior ponto fica em 4,25:1.
      // No tom escuro a borda é o `marinho` cheio — a mesma cor que o degrade
      // por dentro serve a 80%. É o desenho do botao do simulador: miolo
      // rebaixado, contorno na cor original, e o cartao ganha um limite firme
      // em vez de se dissolver no branco da pagina.
      className={`sombra-cartao hover:sombra-cartao-alta scroll-mt-24 rounded-2xl border p-5 transition-shadow duration-300 sm:p-8 ${
        escuro
          ? "degrade-cartao border-marinho text-white"
          : "border-tinta/12 bg-white"
      }`}
    >
      {(titulo || acessorio) && (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            {titulo && (
              <h2
                className={`text-base font-semibold tracking-tight ${
                  escuro ? "text-white" : "text-tinta"
                }`}
              >
                {titulo}
              </h2>
            )}
            {apoio && (
              <p
                className={`mt-1 text-sm ${
                  escuro ? "text-white/75" : "text-neutral-500"
                }`}
              >
                {apoio}
              </p>
            )}
          </div>
          {acessorio}
        </header>
      )}
      {children}
    </section>
  );
}

export function Etiqueta({
  children,
  tom = "suave",
}: {
  children: React.ReactNode;
  /** `destaque` puxa o ciano, que so funciona com texto escuro em cima. */
  tom?: "suave" | "destaque";
}) {
  return (
    // O `suave` rotula em uma palavra: `inline-flex` centraliza bem e o texto
    // nunca quebra. O `destaque` carrega frase, e ai flex atrapalha — cada
    // trecho solto viraria um item anonimo, quebrando a frase em caixas que nao
    // fluem entre si. `inline-block` deixa o texto correr e quebrar de verdade.
    // A borda saiu da base e ficou so no `suave`. Ela existia para os dois toms
    // terem a mesma altura, o que deixou de importar quando eles passaram a ter
    // formas e respiros diferentes.
    <span
      className={`text-xs ${
        tom === "destaque"
          ? "inline-block rounded-xl bg-ciano/15 px-3 py-1.5 leading-snug font-normal text-pretty text-black"
          : "inline-flex items-center rounded-full border border-marinho/15 bg-marinho/5 px-2.5 py-0.5 font-medium text-marinho"
      }`}
    >
      {children}
    </span>
  );
}
