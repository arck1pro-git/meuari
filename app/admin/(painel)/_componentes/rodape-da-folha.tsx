import Link from "next/link";
import { BotaoEnviar } from "./botao-enviar";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "./cabecalho";

/**
 * O rodape de todo formulario que sobe numa folha: cancelar e enviar.
 *
 * **Preso na base da folha.** Em Contratos sao oito campos, e o botao de salvar
 * so aparecia depois de rolar ate o fim — num notebook, sempre abaixo da dobra.
 * As margens negativas desfazem o respiro da folha (`p-5 sm:p-6`, em `Folha`)
 * para a faixa encostar nas bordas.
 *
 * O "Cancelar" é um link, e nao `history.back()`: ele volta para a listagem
 * como estava — filtro, mes, painel aberto —, que é o mesmo destino do X e do
 * Esc da folha.
 */
export function RodapeDaFolha({
  fechar,
  enviando,
  nota,
  children,
}: {
  /** Para onde o "Cancelar" leva. */
  fechar: string;
  /** O texto do botao enquanto grava: "Salvando…". */
  enviando: string;
  /** Uma linha curta a esquerda — "* Obrigatório". */
  nota?: React.ReactNode;
  /** O texto do botao principal. */
  children: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-7 -mb-5 flex flex-wrap items-center gap-3 border-t border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
      <span className="mr-auto text-xs text-neutral-400">{nota}</span>
      <Link href={fechar} className={BOTAO_SECUNDARIO}>
        Cancelar
      </Link>
      <BotaoEnviar enviando={enviando} className={BOTAO_PRIMARIO}>
        {children}
      </BotaoEnviar>
    </div>
  );
}

/** A nota de campo obrigatorio, com a mesma estrela dos rotulos. */
export function NotaDeObrigatorio() {
  return (
    <>
      <span aria-hidden className="text-red-600">
        *
      </span>{" "}
      Obrigatório
    </>
  );
}

/**
 * As telas do portal para onde um aviso pode levar.
 *
 * Sugestao, e nao lista fechada: o campo continua aceitando qualquer caminho —
 * uma obra especifica, por exemplo —, mas o caso comum deixa de exigir que
 * alguem lembre que "Meus aportes" mora em `/portal`.
 */
export const DESTINOS_DO_AVISO = [
  { caminho: "/portal", nome: "Meus aportes" },
  { caminho: "/portal/historico", nome: "Histórico de créditos" },
  { caminho: "/obras", nome: "Obras" },
  { caminho: "/galeria", nome: "Galeria" },
  { caminho: "/simulador", nome: "Simulador" },
  { caminho: "/perfil", nome: "Perfil" },
];

/** O `<datalist>` das sugestoes. Um por formulario aberto — e so ha um. */
export function ListaDeDestinos({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {DESTINOS_DO_AVISO.map((d) => (
        <option key={d.caminho} value={d.caminho}>
          {d.nome}
        </option>
      ))}
    </datalist>
  );
}
