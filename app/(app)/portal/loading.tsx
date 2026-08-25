import { Esqueleto } from "./_componentes/esqueleto";

/*
 * A casca do /portal enquanto os dados chegam. O cabecalho e a navegacao nao
 * entram aqui: eles vivem na `Moldura`, que é a mesma nas duas rotas e por isso
 * nem sai da tela na troca.
 */
export default function Carregando() {
  // A mesma largura do `page.tsx`: com `max-w-5xl` aqui, a tela nascia
  // estreita e pulava para a largura cheia quando o conteudo chegava.
  return (
    <main className="w-full flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
      <Esqueleto blocos={3} />
    </main>
  );
}
