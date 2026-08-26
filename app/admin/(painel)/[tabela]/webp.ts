/**
 * Toda imagem vira WebP no proprio navegador, antes de subir.
 *
 * **Sempre**, e nao só quando é grande demais. O bucket tinha as duas coisas
 * misturadas — tres PNG de ~2 MB ao lado de tres WebP de ~0,4 MB, todos abaixo
 * do teto e portanto todos aceitos como estavam. Formato de arquivo nao é
 * decisao de quem cadastra: depende do programa que exportou o render, e é o
 * tipo de coisa que ninguem confere.
 *
 * O ganho é direto: o mesmo render em PNG ocupa cinco vezes mais que em WebP,
 * e o PNG existe para desenho com poucas cores, nao para foto ou render.
 *
 * **Isto mexe no arquivo guardado, e nao no que o investidor ve.** A entrega ja
 * é redimensionada e convertida pelo Supabase, em 1080px e 1600px (ver `CARTAO`
 * e `CHEIA` em `lib/portal/dados.ts`), entao a tela nao muda. O que muda é o
 * arquivo de origem — e é dele que as duas versoes sao geradas.
 *
 * Nada aqui derruba o envio: qualquer falha de decodificacao devolve `null` e o
 * arquivo original segue o caminho de sempre, para ser aceito ou recusado pelo
 * teto como antes.
 */

/**
 * O maior lado que sobra depois de encolher.
 *
 * 2560px é o dobro da maior largura que a entrega usa (1600). A folga existe
 * porque este arquivo é o **arquivo de origem**: dele saem as versoes de hoje e
 * as de um redesenho futuro, e reduzir ate 1600 fecharia essa porta.
 *
 * Imagem menor que isso nao é esticada — a escala é limitada a 1.
 */
const LADO_MAXIMO = 2560;

/**
 * As qualidades tentadas, em ordem.
 *
 * A primeira é a que quase sempre vale: 0,82 é indistinguivel do original a
 * olho. As de baixo só entram quando o arquivo ainda passa do teto depois de
 * encolhido — foto de obra com muito detalhe (andaime, tela de protecao,
 * folhagem) é o caso que resiste.
 */
const QUALIDADES = [0.82, 0.7, 0.6];

export type Convertida = {
  arquivo: File;
  /** Em bytes, para a tela poder dizer o que aconteceu. */
  antes: number;
  depois: number;
};

/**
 * `canvas.toBlob` como promessa, com uma conferencia que nao é decorativa.
 *
 * O Safari antigo, ao receber um tipo que nao sabe codificar, **nao falha**:
 * devolve PNG em silencio. PNG de uma foto redimensionada costuma sair *maior*
 * que o original, entao sem esta checagem a conversao poderia inchar o arquivo.
 * Se o tipo que voltou nao é o pedido, tenta JPEG, que todo navegador codifica.
 *
 * Nesse plano B o arquivo **nao** sai em WebP, e é o unico caso em que isso
 * acontece: melhor um JPEG que sobe do que um envio recusado.
 */
function paraBlob(
  tela: HTMLCanvasElement,
  tipo: string,
  qualidade: number,
): Promise<Blob | null> {
  return new Promise((resolver) => tela.toBlob(resolver, tipo, qualidade));
}

async function codificar(
  tela: HTMLCanvasElement,
  qualidade: number,
): Promise<Blob | null> {
  const webp = await paraBlob(tela, "image/webp", qualidade);
  if (webp?.type === "image/webp") return webp;
  return paraBlob(tela, "image/jpeg", qualidade);
}

/** "Fachada Torre A.png" -> "Fachada Torre A.webp". */
function renomear(original: string, tipo: string): string {
  const extensao = tipo === "image/webp" ? "webp" : "jpg";
  return `${original.replace(/\.[^.]+$/, "") || original}.${extensao}`;
}

/**
 * Devolve a versao em WebP, ou `null` quando nao ha o que fazer.
 *
 * `null` acontece em quatro casos, e nenhum deles é erro:
 *
 * - o arquivo nao é imagem;
 * - o navegador nao decodifica aquele formato (HEIC do iPhone é o caso comum);
 * - o arquivo **ja é WebP** dentro do teto e dentro do lado maximo — recodificar
 *   um WebP é perder qualidade duas vezes para nao ganhar nada;
 * - nenhuma qualidade produziu um blob.
 */
export async function paraWebp(
  arquivo: File,
  teto = Number.POSITIVE_INFINITY,
): Promise<Convertida | null> {
  if (!arquivo.type.startsWith("image/")) return null;

  let imagem: ImageBitmap;
  try {
    /*
     * `imageOrientation: "from-image"` respeita o EXIF. Sem isso, foto tirada
     * com o celular deitado é desenhada no canvas na orientacao crua do sensor
     * e sobe girada — o `<img>` da tela corrige sozinho na exibicao, mas o
     * canvas nao, e o que este arquivo produz é um arquivo novo, ja achatado.
     */
    imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  try {
    const maiorLado = Math.max(imagem.width, imagem.height);

    // Ja esta pronto: WebP, dentro do teto e sem precisar encolher.
    if (
      arquivo.type === "image/webp" &&
      arquivo.size <= teto &&
      maiorLado <= LADO_MAXIMO
    ) {
      return null;
    }

    const escala = Math.min(1, LADO_MAXIMO / maiorLado);
    const largura = Math.round(imagem.width * escala);
    const altura = Math.round(imagem.height * escala);

    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;

    const pincel = tela.getContext("2d");
    if (!pincel) return null;

    /*
     * Fundo branco antes de desenhar.
     *
     * O canvas nasce transparente, e o JPEG do plano B nao tem canal alfa: sem
     * isto, um PNG com transparencia sairia com o fundo preto. Render de
     * arquitetura raramente tem alfa, mas quando tem, preto seria escandaloso e
     * branco passa despercebido.
     */
    pincel.fillStyle = "#fff";
    pincel.fillRect(0, 0, largura, altura);
    pincel.drawImage(imagem, 0, 0, largura, altura);

    let melhor: Blob | null = null;
    for (const qualidade of QUALIDADES) {
      const blob = await codificar(tela, qualidade);
      if (!blob) continue;
      // Guarda o menor ate agora: se nenhuma qualidade couber no teto, é ele
      // que volta, e quem chamou decide o que dizer.
      if (!melhor || blob.size < melhor.size) melhor = blob;
      if (blob.size <= teto) break;
    }

    if (!melhor) return null;

    return {
      arquivo: new File([melhor], renomear(arquivo.name, melhor.type), {
        type: melhor.type,
        lastModified: arquivo.lastModified,
      }),
      antes: arquivo.size,
      depois: melhor.size,
    };
  } finally {
    // Libera a memoria da imagem decodificada — uma foto de 30 MB ocupa bem
    // mais que isso descompactada, e o coletor sozinho demora a perceber.
    imagem.close();
  }
}
