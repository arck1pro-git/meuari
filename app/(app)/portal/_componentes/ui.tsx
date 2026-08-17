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
      // O tom escuro era o degrade `tinta → marinho → azul` (`degrade-cartao`,
      // em `globals.css`); virou `azul` puro e cheio. A borda continua o
      // `marinho` cheio — o mesmo contorno de sempre, so que agora sobre um
      // miolo de uma cor so.
      className={`sombra-cartao hover:sombra-cartao-alta scroll-mt-24 rounded-2xl border p-5 transition-shadow duration-300 sm:p-8 ${
        escuro
          ? "border-marinho bg-azul text-white"
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
    // A borda do `destaque` volta a existir aqui: mesma proporcao do `suave`,
    // tres vezes a opacidade do fundo, so que na cor do proprio acento.
    <span
      className={`text-xs ${
        tom === "destaque"
          ? "inline-block rounded-xl border border-ciano/40 bg-ciano/15 px-3 py-1.5 leading-snug font-normal text-pretty text-black"
          : "inline-flex items-center rounded-full border border-marinho/15 bg-marinho/5 px-2.5 py-0.5 font-medium text-marinho"
      }`}
    >
      {children}
    </span>
  );
}
