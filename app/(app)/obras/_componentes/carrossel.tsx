"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Foto } from "@/lib/portal/dados";
import {
  IconeExpandir,
  IconeFechar,
  IconeSetaDireita,
  IconeSetaEsquerda,
} from "../../portal/_componentes/icones";

/**
 * As fotos da obra, arrastaveis com o dedo.
 *
 * O arraste é do proprio navegador: uma fila que rola na horizontal, com
 * `snap` para cada foto parar no lugar. Nao ha biblioteca nem `pointermove`
 * escrito a mao, e por isso o toque tem a inercia do sistema, o trackpad
 * funciona, a roda do mouse funciona e o teclado tambem — coisas que uma
 * implementacao propria costuma perder uma a uma.
 *
 * O `useState` aqui serve so aos pontinhos: qual foto esta na frente. Ele
 * acompanha a rolagem, nunca a comanda.
 */
/** Qual foto ocupa a janela de rolagem, pela posicao dela. */
function indiceVisivel(elemento: HTMLDivElement): number {
  const largura = elemento.clientWidth;
  return largura ? Math.round(elemento.scrollLeft / largura) : 0;
}

/**
 * Os locais que aparecem como atalho, na ordem em que foram cadastrados.
 *
 * Sai **das proprias fotos**, e nao de uma lista de locais vinda do banco: local
 * cadastrado que ainda nao recebeu foto nenhuma nao vira atalho. Atalho que abre
 * uma fila vazia é pior do que atalho nenhum — a pessoa toca, nao acontece nada
 * visivel, e conclui que a galeria esta quebrada.
 *
 * A ordem é a de cadastro (`desde`), e nao a alfabetica: a galeria de uma obra
 * se le de fora para dentro — fachada, hall, apartamento —, e é nessa sequencia
 * que quem monta os locais os escreve. Alfabetica poria "Apartamento" na frente
 * de "Fachada" por acaso do alfabeto.
 *
 * Houve aqui uma coluna `ordem` digitada no /admin. Ela saiu junto com a das
 * etapas, e pelo mesmo motivo: era sempre a propria sequencia de cadastro,
 * contada de cabeca. Ver a nota em `lib/admin/tabelas.ts`.
 */
function locaisDas(fotos: Foto[]) {
  const por = new Map<string, NonNullable<Foto["local"]>>();
  for (const foto of fotos) {
    if (foto.local && !por.has(foto.local.id)) por.set(foto.local.id, foto.local);
  }

  return Array.from(por.values()).sort(
    // Nome como desempate: dois locais criados no mesmo instante só acontecem
    // numa carga em lote, e ai o alfabeto é tao bom quanto qualquer criterio.
    (a, b) => a.desde.localeCompare(b.desde) || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

export function Carrossel({ fotos }: { fotos: Foto[] }) {
  const fila = useRef<HTMLDivElement>(null);
  const janela = useRef<HTMLDialogElement>(null);
  const filaAmpliada = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [naAmpliacao, setNaAmpliacao] = useState(0);

  /**
   * Qual local esta escolhido na ampliacao. `null` é "Todas".
   *
   * Só a ampliacao filtra. O carrossel de baixo continua sendo a fila inteira,
   * em ordem de recencia: ele é a vitrine da obra na tela dela, e trocar o que
   * ele mostra a partir de um estado que vive dentro de um dialogo fechado
   * seria mudar a tela sem que ninguem tenha pedido.
   */
  const [local, setLocal] = useState<string | null>(null);

  /**
   * Quantas vezes a ampliacao foi aberta nesta visita. Zero = nunca.
   *
   * **É a maior economia desta tela, e o motivo é contraintuitivo.** O
   * `<dialog>` fechado continua no DOM, e `<img>` dentro de elemento escondido
   * *é baixado do mesmo jeito* — `display: none` esconde, nao cancela. Entao a
   * galeria inteira era buscada duas vezes em toda visita a obra: uma para a
   * fila que aparece, outra para a tela cheia que ninguem tinha aberto.
   *
   * Com esta trava o dialogo nasce sem nenhuma `<img>` dentro. As imagens só
   * entram na primeira abertura, e dali em diante ficam montadas — reabrir nao
   * paga de novo.
   *
   * Contador, e nao um booleano: é ele que dispara o posicionamento da fila a
   * cada abertura, no efeito abaixo. Um booleano so mudaria de valor na
   * primeira vez, e da segunda em diante a ampliacao abriria sempre na foto
   * onde a anterior parou.
   */
  const [aberturas, setAberturas] = useState(0);
  const jaAmpliou = aberturas > 0;

  /** Em que foto a proxima abertura deve comecar. */
  const abrirEm = useRef(0);

  const locais = useMemo(() => locaisDas(fotos), [fotos]);

  /** As fotos que a ampliacao esta mostrando agora. */
  const visiveis = useMemo(
    () => (local ? fotos.filter((f) => f.local?.id === local) : fotos),
    [fotos, local],
  );

  useEffect(() => {
    const elemento = fila.current;
    if (!elemento) return;

    /*
     * Contar por `scrollLeft` dividido pela largura é mais simples e erra no
     * fim da lista, quando a ultima foto nao chega a preencher a tela.
     */
    function aoRolar() {
      setAtual(indiceVisivel(elemento!));
    }

    elemento.addEventListener("scroll", aoRolar, { passive: true });
    return () => elemento.removeEventListener("scroll", aoRolar);
  }, []);

  /*
   * Posiciona a fila ampliada na foto em que ela deve abrir.
   *
   * `useLayoutEffect` e nao `useEffect`: roda antes de o quadro ser pintado,
   * entao ninguem ve a tela cheia abrir na primeira foto e saltar para a certa.
   *
   * Depende só de `aberturas`. `abrirEm` é ref de proposito — se o indice
   * entrasse como dependencia, o efeito rodaria a cada rolagem e brigaria com o
   * dedo de quem esta arrastando.
   */
  useLayoutEffect(() => {
    if (aberturas === 0) return;
    const elemento = filaAmpliada.current;
    if (elemento) elemento.scrollLeft = abrirEm.current * elemento.clientWidth;
  }, [aberturas]);

  function irPara(indice: number) {
    const elemento = fila.current;
    if (!elemento) return;
    elemento.scrollTo({
      left: indice * elemento.clientWidth,
      behavior: "smooth",
    });
  }

  /**
   * Abre a ampliacao ja na foto que estava na frente.
   *
   * O `scrollLeft` é acertado **depois** do `showModal()`: antes disso o
   * dialogo nao tem layout, `clientWidth` é zero e a conta daria sempre a
   * primeira foto.
   */
  function ampliar() {
    /*
     * Abre sempre em "Todas", e nao no local escolhido da vez anterior.
     *
     * `atual` é um indice da fila **inteira** — é ela que roda aqui embaixo —,
     * entao entrar com um filtro de pé apontaria para a foto errada, ou para
     * nenhuma. Reabrir do zero é tambem o que se espera: o filtro é uma escolha
     * feita dentro da ampliacao, e nao um ajuste que a obra guarda.
     */
    setLocal(null);
    setNaAmpliacao(atual);
    abrirEm.current = atual;
    setAberturas((n) => n + 1);
    janela.current?.showModal();
    /*
     * O `scrollLeft` **nao** é acertado aqui, e a razao mudou de lugar: antes
     * bastava chamar depois do `showModal()`, porque o que faltava era layout.
     * Agora, na primeira abertura, o que falta é a propria `<img>` — ela só
     * entra no DOM na renderizacao que este `setAberturas` dispara. Rolar uma
     * fila vazia nao leva a lugar nenhum, e a tela cheia abriria sempre na
     * primeira foto. Quem posiciona é o efeito abaixo.
     */
  }

  /**
   * Troca o local mostrado e volta a fila para a primeira foto dele.
   *
   * O `scrollLeft` é zerado **antes** da re-renderizacao: a fila nova é mais
   * curta, e deixar a posicao antiga faria o navegador encostar no fim dela — a
   * pessoa escolheria "Piscina" e cairia na ultima foto da piscina.
   */
  function escolherLocal(id: string | null) {
    setLocal(id);
    setNaAmpliacao(0);
    const elemento = filaAmpliada.current;
    if (elemento) elemento.scrollLeft = 0;
  }

  /**
   * Anda uma foto na ampliacao — é o que as setas do desktop comandam.
   *
   * Ela **rola a mesma fila** que o arraste rola, em vez de guardar um indice
   * proprio: o `onScroll` continua sendo a unica fonte de qual foto esta na
   * frente, entao seta, arraste e roda do mouse nunca discordam.
   *
   * Sem dar a volta no fim da lista: com `snap-mandatory`, saltar da ultima
   * para a primeira faz a fila varrer todas as fotos no caminho. As setas se
   * desabilitam nas pontas, que diz a mesma coisa sem o efeito colateral.
   */
  function andar(passo: number) {
    const elemento = filaAmpliada.current;
    if (!elemento) return;
    elemento.scrollTo({
      left: (naAmpliacao + passo) * elemento.clientWidth,
      behavior: "smooth",
    });
  }

  /**
   * Devolve o carrossel de baixo na foto em que a ampliacao parou.
   *
   * Sem isto, quem navegou ate a quinta foto na tela cheia voltaria para a
   * primeira ao fechar — e a tela pareceria ter perdido o lugar.
   *
   * **A traducao de indice é o que o filtro acrescentou.** `naAmpliacao` conta
   * dentro do local escolhido; a fila de baixo é a lista inteira. Quem estava
   * na segunda foto da piscina precisa voltar para a posicao *daquela foto* na
   * fila completa, e nao para a segunda posicao dela.
   */
  function acompanharAmpliacao() {
    const elemento = fila.current;
    if (!elemento) return;

    const foto = visiveis[naAmpliacao];
    const indice = foto ? fotos.findIndex((f) => f.id === foto.id) : -1;
    // `-1` só aconteceria com a lista trocando debaixo do dialogo aberto. Fica
    // onde esta, que é melhor do que saltar para a primeira foto.
    if (indice < 0) return;

    elemento.scrollLeft = indice * elemento.clientWidth;
    setAtual(indice);
  }

  function fechar() {
    acompanharAmpliacao();
    janela.current?.close();
  }

  return (
    <div className="relative">
      <div
        ref={fila}
        /*
         * `snap-x snap-mandatory` faz cada foto parar inteira no lugar;
         * `overscroll-x-contain` impede que o arraste no fim da fila vire o
         * gesto de "voltar" do navegador.
         *
         * Sem `gap`: as fotos ficam encostadas, e o arraste passa de uma para a
         * outra sem faixa branca no meio.
         */
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        // Rolagem por teclado precisa de foco, e a fila é uma lista de imagens.
        tabIndex={0}
        role="group"
        aria-label="Fotos da obra"
      >
        {fotos.map((foto, i) => (
          <figure
            key={foto.id}
            className="relative w-full shrink-0 snap-center overflow-hidden bg-neutral-100"
          >
            {/* `<img>` e nao `next/image`: a URL vem assinada, com token que
                muda a cada carga — nao ha o que o otimizador guarde. Quem
                redimensiona é o proprio Supabase, antes de a URL ser assinada:
                o que chega aqui ja vem em WebP na largura de cartao. Ver
                `CARTAO` em `lib/portal/dados.ts`. */}
            {/* O fade é da propria montagem, e nao do `onLoad`: imagem em
                cache dispara `load` antes da hidratacao, e um fade preso nesse
                evento deixaria a foto invisivel para sempre. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt={foto.nome}
              /*
               * Só a primeira foto entra no carregamento inicial. As outras
               * vivem fora da tela — a fila rola na horizontal —, e sem `lazy`
               * o navegador buscava a galeria inteira para mostrar uma foto.
               *
               * `eager` na primeira, e nao `lazy` em todas: ela é o topo da
               * tela da obra, e adiar a imagem que ja esta visivel troca peso
               * por um buraco cinza no primeiro quadro.
               */
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              decoding="async"
              /*
               * As dimensoes reservam o espaco antes de a foto chegar. Sao a
               * proporcao, e nao o tamanho real: o CSS manda no desenho
               * (`aspect-square`), e o que estes numeros evitam é o salto de
               * layout enquanto o arquivo baixa.
               */
              width={1080}
              height={1080}
              className="aspect-square w-full animate-aparecer object-cover"
              draggable={false}
            />

            {/* Só o veu, sem texto: quem ocupa esta faixa é o nome da obra e os
                selos, que vivem no hero e nao rolam junto com as fotos. Vai a
                3/5 da altura porque a legenda cresceu — abaixo disso, o selo de
                cima cairia fora do escuro. */}
            <span
              aria-hidden
              className="veu-foto pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
            />
          </figure>
        ))}
      </div>

      {/* Fora da fila que rola: o botao fica parado no canto enquanto as fotos
          passam por baixo dele. A pastilha escura é o que o mantem legivel
          tanto sobre ceu claro quanto sobre concreto. */}
      <button
        type="button"
        onClick={ampliar}
        aria-label="Ver as fotos em tela cheia"
        title="Expandir"
        className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-tinta/40 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-tinta/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
      >
        <IconeExpandir className="h-4.5 w-4.5" />
      </button>

      {/*
       * O carrossel inteiro ampliado num `<dialog>`, e nao uma foto solta: quem
       * abre uma foto grande quer ver as outras grandes tambem, e fechar para
       * arrastar e abrir de novo é o caminho mais longo entre duas imagens.
       *
       * `<dialog>` nativo com `showModal()`, e nao uma `div` por cima: Esc para
       * fechar, foco preso dentro e o resto da pagina inerte, sem escrever nada
       * disso. E ele sobe para a *top layer*, entao ignora `z-index` e
       * `overflow` de quem estiver por perto.
       */}
      <dialog
        ref={janela}
        aria-label="Fotos da obra em tela cheia"
        onClick={(evento) => {
          // Clique no fundo (o proprio dialog) fecha; na foto, nao.
          if (evento.target === janela.current) fechar();
        }}
        // Esc fecha por fora do nosso botao — o carrossel de baixo precisa
        // acompanhar do mesmo jeito, com a mesma traducao de indice.
        onClose={acompanharAmpliacao}
        className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 backdrop:bg-tinta/90 backdrop:backdrop-blur-sm open:animate-aparecer"
      >
        <div className="relative flex h-full flex-col justify-center">
          {/*
           * Os locais da obra, no topo — o indice da galeria.
           *
           * Só aparece quando ha local cadastrado com foto. Numa obra que ainda
           * nao usa locais, a ampliacao continua exatamente como era: uma fila
           * unica, sem barra nenhuma roubando altura da imagem.
           *
           * `absolute`, e nao no fluxo: a foto usa `max-h-[82dvh]` e é
           * centralizada na tela: uma barra empurrando de cima descentraria a
           * imagem em toda obra que tem locais.
           *
           * `pr-16` abre o espaco do botao de fechar, que mora no mesmo canto.
           * Sem isso o ultimo atalho fica embaixo dele — e o toque escolheria
           * fechar quando a intencao era trocar de lugar.
           */}
          {locais.length > 0 && (
            <div
              role="group"
              aria-label="Locais da obra"
              className="absolute inset-x-0 top-0 z-10 flex gap-2 overflow-x-auto bg-linear-to-b from-tinta/70 to-transparent px-4 pt-4 pb-10 pr-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {/*
               * "Todas" é um atalho como os outros, e nao um "limpar filtro"
               * escondido em outro canto: voltar para a fila inteira é uma
               * escolha tao comum quanto escolher um lugar.
               */}
              <Atalho
                rotulo="Todas"
                quantas={fotos.length}
                ativo={local === null}
                onClick={() => escolherLocal(null)}
              />

              {locais.map((l) => (
                <Atalho
                  key={l.id}
                  rotulo={l.nome}
                  quantas={fotos.filter((f) => f.local?.id === l.id).length}
                  ativo={local === l.id}
                  onClick={() => escolherLocal(l.id)}
                />
              ))}
            </div>
          )}

          {/* A mesma fila de baixo, em tela cheia: `snap` para cada foto parar
              inteira, e `object-contain` para nenhuma ser recortada. */}
          <div
            ref={filaAmpliada}
            onScroll={(evento) =>
              setNaAmpliacao(indiceVisivel(evento.currentTarget))
            }
            tabIndex={0}
            role="group"
            aria-label="Fotos da obra"
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {jaAmpliou &&
              visiveis.map((foto, i) => (
                <figure
                  key={foto.id}
                  className="flex w-screen shrink-0 snap-center items-center justify-center px-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    /*
                     * `srcSet` com as duas larguras que o servidor assinou, e o
                     * navegador escolhe: num celular de 390px a versao de
                     * cartao ja cobre a tela retina, e ele nao baixa a grande a
                     * toa. Num monitor, a grande entra.
                     *
                     * `src` fica na menor: é o que navegador antigo, sem
                     * `srcset`, vai buscar.
                     */
                    src={foto.url}
                    srcSet={`${foto.url} 1080w, ${foto.ampliada} 1600w`}
                    sizes="100vw"
                    alt={foto.nome}
                    /*
                     * Só a foto em que a ampliacao abre entra na hora. As
                     * outras estao fora da tela, na horizontal, e sao buscadas
                     * quando a fila chega nelas.
                     */
                    loading={i === naAmpliacao ? "eager" : "lazy"}
                    decoding="async"
                    className="max-h-[82dvh] w-auto max-w-full rounded-2xl object-contain"
                    draggable={false}
                  />
                </figure>
              ))}
          </div>

          {/*
           * As setas, só a partir do `md`.
           *
           * No celular quem troca de foto é o polegar, e dois botoes de 44px
           * sobre a imagem cobririam justamente as bordas dela. No desktop nao
           * ha arraste: sobrava a roda do mouse na horizontal, que quase
           * ninguem usa, ou as setas do teclado, que exigem saber que a fila
           * tem foco.
           *
           * Desabilitadas nas pontas em vez de escondidas: um botao que some
           * muda a largura util da imagem no meio da navegacao.
           */}
          {visiveis.length > 1 && (
            <>
              <Seta
                lado="esquerda"
                onClick={() => andar(-1)}
                desabilitada={naAmpliacao === 0}
              />
              <Seta
                lado="direita"
                onClick={() => andar(1)}
                desabilitada={naAmpliacao === visiveis.length - 1}
              />
            </>
          )}

          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IconeFechar className="h-5 w-5" />
          </button>

          {/* Contador em vez de pontinhos: em tela cheia, com muitas fotos, a
              fila de bolinhas viraria uma regua ilegivel no pé da imagem. */}
          {visiveis.length > 1 && (
            <p className="absolute inset-x-0 bottom-6 text-center text-sm font-medium text-white/80 tabular-nums">
              {naAmpliacao + 1} / {visiveis.length}
            </p>
          )}
        </div>
      </dialog>

      {/* Os pontinhos so aparecem com mais de uma foto — com uma só, eles
          seriam um controle para lugar nenhum. */}
      {/* No canto direito, e nao no centro: o pé da foto é do nome da obra
          agora, e os pontinhos centrados caiam em cima dele. */}
      {fotos.length > 1 && (
        <div className="absolute right-5 bottom-5 flex justify-end gap-2 sm:right-7 sm:bottom-6">
          {fotos.map((foto, i) => (
            <button
              key={foto.id}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Foto ${i + 1} de ${fotos.length}`}
              aria-current={i === atual}
              // Bolinha cheia na atual, vazada nas outras — ●○○○. A que esta
              // na frente cresce um pouco, o que da a leitura mesmo para quem
              // nao distingue os dois tons.
              // Sobre a foto, entao brancos: a bolinha marinho sumiria numa
              // imagem escura.
              className={`h-2 w-2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                i === atual
                  ? "scale-125 bg-white"
                  : "bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Um atalho de local, no topo da ampliacao.
 *
 * A contagem entra na pastilha porque ela responde antes do toque: "Piscina 3"
 * diz que ha tres fotos ali, e quem procura a fachada nao gasta um toque para
 * descobrir que a piscina tem pouca coisa.
 *
 * Pastilha branca chapada no escolhido, translucida nos outros — o mesmo par de
 * superficies do botao de fechar e das setas, que ja se sustenta sobre foto
 * clara e sobre foto escura sem precisar de moldura.
 */
function Atalho({
  rotulo,
  quantas,
  ativo,
  onClick,
}: {
  rotulo: string;
  quantas: number;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap backdrop-blur-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        ativo
          ? "bg-white text-tinta"
          : "bg-white/15 text-white hover:bg-white/30"
      }`}
    >
      {rotulo}
      <span
        className={`tabular-nums ${ativo ? "text-neutral-400" : "text-white/55"}`}
      >
        {quantas}
      </span>
    </button>
  );
}

/**
 * Uma seta da ampliacao.
 *
 * Fora do corpo do carrossel porque sao duas, e a unica diferenca entre elas é
 * o lado — repetir doze linhas de classe para trocar `left` por `right` é o
 * tipo de copia que envelhece torta.
 *
 * A pastilha translucida com `backdrop-blur` é a mesma do botao de expandir e
 * do de fechar: sobre foto clara ou escura, ela se sustenta sem moldura.
 */
function Seta({
  lado,
  onClick,
  desabilitada,
}: {
  lado: "esquerda" | "direita";
  onClick: () => void;
  desabilitada: boolean;
}) {
  const esquerda = lado === "esquerda";
  const Icone = esquerda ? IconeSetaEsquerda : IconeSetaDireita;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitada}
      aria-label={esquerda ? "Foto anterior" : "Próxima foto"}
      className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 disabled:pointer-events-none disabled:opacity-25 md:flex ${
        esquerda ? "left-4" : "right-4"
      }`}
    >
      <Icone className="h-6 w-6" />
    </button>
  );
}
