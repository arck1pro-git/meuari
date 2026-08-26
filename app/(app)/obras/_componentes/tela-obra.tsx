import type { Obra } from "@/lib/portal/dados";
import { BotaoDocumentos } from "./botao-documentos";
import { Documentos } from "./documentos";
import { FichaObra } from "./ficha-obra";
import { HeroObra } from "./hero-obra";
import { QuadrosDaObra } from "./quadros-obra";
import { SeletorDeObra } from "./seletor-obra";

/**
 * A tela de uma obra: seletor, fotos, ficha e os projetos em quadros.
 *
 * Vive fora das duas rotas que a desenham — `/obras`, que abre na primeira, e
 * `/obras/<id>`, que abre na escolhida. Uma redirecionar para a outra parecia
 * mais simples e nao era: o `redirect()` acontece depois de o cabecalho ja ter
 * sido enviado, entao o Next cai num `<meta refresh>` de um segundo, e o botao
 * mais usado do rodape ganharia uma piscada branca a cada toque.
 *
 * Uma leitura corrida, e nao abas. O seletor de icones dividia a tela em partes
 * que ninguem escolhia — quem abre a obra quer ver a obra inteira —, e cada
 * troca escondia dois tercos do que ja estava carregado. A rolagem responde na
 * ordem em que se pergunta: que lugar é este, como ele esta, e os projetos um a
 * um.
 *
 * Os papeis sao a excecao: vivem no botao flutuante, porque sao consulta
 * pontual e nao leitura.
 */
export function TelaDaObra({
  obra,
  obras,
}: {
  obra: Obra;
  /** Todas as obras da pessoa, para o seletor. */
  obras: { id: string; nome: string }[];
}) {
  return (
    /*
     * Fundo cinza levissimo só nesta tela, e nao no app inteiro: aqui o
     * conteudo é uma pilha de cartoes, e o cinza é o que faz cada um deles ler
     * como superficie. Nas outras telas o fundo branco continua certo.
     */
    <main className="mx-auto w-full max-w-5xl flex-1 bg-[#F7F8FA] px-5 pt-5 pb-32 sm:px-8 md:pt-8 md:pb-12">
      {/* Fora do `escalonar`: o seletor é a moldura da tela, e nao o primeiro
          degrau do conteudo que entra. Com uma obra só ele nao aparece — nao ha
          escolha a fazer. */}
      {obras.length > 1 && <SeletorDeObra obras={obras} atual={obra.id} />}

      <div className="escalonar">
        <section className="sombra-cartao overflow-hidden rounded-[20px] md:rounded-lg bg-white">
          <HeroObra obra={obra} />
        </section>

        {/* A ficha logo abaixo das fotos, como a apresentacao do lugar: o
            andamento e as datas. */}
        <div className="mt-5">
          <FichaObra obra={obra} />
        </div>

        <div className="mt-6">
          <QuadrosDaObra etapas={obra.etapas} />
        </div>
      </div>

      {/* Fora do `escalonar`: ele é fixo na tela, e nao um degrau da pilha. */}
      <BotaoDocumentos quantos={obra.documentos.length}>
        <Documentos documentos={obra.documentos} />
      </BotaoDocumentos>
    </main>
  );
}
