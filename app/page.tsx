import { redirect } from "next/navigation";

/**
 * A raiz nao tem tela propria.
 *
 * Ela era um "Portal do Investidor ARI" com um botao Entrar — uma parada a
 * mais entre quem ja entrou e o que veio ver. Agora quem chega aqui vai direto
 * para a carteira; sem sessao, o `proxy.ts` desvia para o login e devolve para
 * o `/portal` depois.
 *
 * Sem `exigirSessao` aqui: seria uma ida ao cookie para decidir o mesmo desvio
 * que a guarda ja faz, e o `/portal` confere de novo do outro lado.
 */
export default function Home() {
  redirect("/portal");
}
