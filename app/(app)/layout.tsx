import { exigirSessao } from "@/lib/auth";
import { getNotificacoes } from "@/lib/portal/notificacoes";
import { Moldura } from "./portal/_componentes/moldura";

/**
 * A casca de tudo que fica atras da sessao.
 *
 * `(app)` é grupo de rotas: nao aparece no endereco. `/portal`, `/obras`,
 * `/perfil` e `/simulador` continuam onde estavam.
 *
 * Ela existe por causa da troca de tela. Antes cada pagina montava a propria
 * moldura, entao ir do /portal para /obras desmontava cabecalho, barra lateral
 * e rodape para montar tudo de novo — e a navegacao so respondia quando o
 * servidor terminava de responder, cerca de um segundo depois. Como layout, a
 * moldura **nao remonta**: só o miolo troca, e o `loading.tsx` de cada rota
 * preenche o lugar do conteudo enquanto ele vem.
 *
 * De quebra, a sessao e as notificacoes sao lidas **uma vez** para as quatro
 * rotas, em vez de uma vez por pagina.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A guarda tambem vive aqui, e nao so no `proxy.ts` — ver o comentario em
  // `exigirSessao`. O destino é generico: quem sabe a rota é o proxy.
  const sessao = await exigirSessao("/portal");
  const notificacoes = await getNotificacoes(sessao.id);

  return (
    <Moldura nome={sessao.nome} notificacoes={notificacoes}>
      {children}
    </Moldura>
  );
}
