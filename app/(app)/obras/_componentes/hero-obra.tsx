import type { Obra } from "@/lib/portal/dados";
import { IconeLocal, IconeObra } from "../../portal/_componentes/icones";
import { Carrossel } from "./carrossel";

/**
 * O topo da tela da obra: a foto grande com o nome e dois selos.
 *
 * Sobre a foto fica o que situa — onde a obra é e em que pé ela esta. Numero
 * saiu daqui: a porcentagem dos projetos estava neste mesmo lugar e no cartao
 * logo abaixo, e o segundo é onde ela pode ser lida com a barra e a contagem
 * ao lado.
 *
 * Cada selo só existe se o dado existir. Obra sem cidade cadastrada nao ganha
 * um "—" nem um "a definir": ganha uma faixa com um selo a menos.
 */
export function HeroObra({ obra }: { obra: Obra }) {
  const local = [obra.cidade, obra.uf].filter(Boolean).join(" · ");

  const selos = [
    local && { icone: <IconeLocal className="h-3.5 w-3.5" />, texto: local },
    obra.status && {
      icone: <IconeObra className="h-3.5 w-3.5" />,
      texto: obra.status,
    },
  ].filter((selo): selo is { icone: React.ReactElement; texto: string } =>
    Boolean(selo),
  );

  const legenda = (
    /*
     * `pointer-events-none` no bloco inteiro: ele cobre boa parte da foto, e
     * sem isso engoliria o arraste do carrossel que acontece por baixo.
     */
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pr-20 pb-5 sm:px-7 sm:pr-24 sm:pb-6">
      {selos.length > 0 && (
        <ul className="mb-3 flex flex-wrap items-center gap-1.5">
          {selos.map((selo) => (
            <li
              key={selo.texto}
              // Vidro discreto sobre a foto: o selo precisa ser legivel sobre
              // ceu claro e sobre concreto, sem virar uma etiqueta opaca.
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-semibold text-white ring-1 ring-white/25 backdrop-blur-md"
            >
              {selo.icone}
              {selo.texto}
            </li>
          ))}
        </ul>
      )}

      {/* 28px no celular, 32 no resto: é o unico titulo desta tela, e o resto
          da hierarquia foi calibrado abaixo dele. */}
      {/* Sobre a foto fica só o nome. A data da ultima mudanca desceu para o
          cartao de baixo, junto das outras datas — ali ela é comparavel com o
          inicio das obras e com a entrega, e aqui era um rodape sobre a
          imagem. */}
      <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-tight text-balance text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.5)] sm:text-[2rem]">
        {obra.nome}
      </h1>
    </div>
  );

  if (obra.imagens.length === 0) {
    // Sem foto, o hero nao vira um retangulo branco com texto preto: o degrade
    // da marca segura a mesma leitura, e a tela nao perde o topo.
    return (
      <div className="degrade-cabecalho relative aspect-[16/10] w-full sm:aspect-[2/1]">
        {legenda}
      </div>
    );
  }

  return (
    <div className="relative">
      <Carrossel fotos={obra.imagens} />
      {legenda}
    </div>
  );
}
