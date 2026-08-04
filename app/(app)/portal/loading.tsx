import { Esqueleto } from "./_componentes/esqueleto";

/*
 * A casca do /portal enquanto os dados chegam. O cabecalho e a navegacao nao
 * entram aqui: eles vivem na `Moldura`, que é a mesma nas duas rotas e por isso
 * nem sai da tela na troca.
 */
export default function Carregando() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
      <Esqueleto blocos={3} />
    </main>
  );
}
