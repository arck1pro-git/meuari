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
      className={`sombra-cartao hover:sombra-cartao-alta scroll-mt-24 rounded-2xl border p-5 transition-shadow duration-300 sm:p-8 ${
        escuro
          ? "border-white/10 bg-linear-to-br from-marinho via-azul to-ceu text-white"
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
    <span
      className={`border text-xs font-medium ${
        tom === "destaque"
          ? "inline-block rounded-lg border-ciano/30 bg-ciano/30 px-3 py-1.5 leading-relaxed text-pretty text-tinta"
          : "inline-flex items-center rounded-full border-marinho/15 bg-marinho/5 px-2.5 py-0.5 text-marinho"
      }`}
    >
      {children}
    </span>
  );
}
