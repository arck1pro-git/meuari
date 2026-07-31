"use client";

import { useEffect, useState } from "react";
import {
  chavePublicaDePush,
  removerInscricaoDePush,
  salvarInscricaoDePush,
} from "../acoes";

/**
 * Inscricao em push, do lado do navegador.
 *
 * O caminho é sempre o mesmo: registrar o service worker, pedir permissao,
 * assinar no serviço de push do proprio navegador e mandar o resultado para o
 * servidor guardar. Quem envia a notificacao depois é o backend, com a chave
 * privada VAPID.
 */

export type EstadoDoPush =
  | "verificando" // ainda olhando o que ja existe
  | "indisponivel" // navegador sem suporte (iOS fora da tela de inicio, por ex.)
  | "desligado"
  | "ligando"
  | "ligado"
  | "negado" // a pessoa recusou; so nas configuracoes do navegador volta
  | "erro";

/**
 * A chave VAPID viaja em base64url e o navegador quer bytes.
 *
 * O tipo de retorno é explicito porque `Uint8Array.from` devolve
 * `Uint8Array<ArrayBufferLike>` desde o TypeScript 5.7, e `applicationServerKey`
 * exige um `BufferSource` — que so aceita o respaldado por `ArrayBuffer`.
 */
function base64UrlParaBytes(base64: string): Uint8Array<ArrayBuffer> {
  const preenchido = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const bruto = atob(preenchido.replace(/-/g, "+").replace(/_/g, "/"));

  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

function temSuporte(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Unico nome em ingles do projeto, e nao por gosto: o React e o seu plugin de
 * lint identificam um hook pelo prefixo `use`. Com `usarPush`, as regras de
 * hooks deixam de valer para ele — e ai um `useState` fora de lugar passaria
 * sem aviso.
 */
export function usePush() {
  const [estado, setEstado] = useState<EstadoDoPush>("verificando");

  /*
   * Descobre o estado atual sem pedir nada: so o que ja foi decidido antes.
   *
   * Tudo dentro de uma funcao assincrona, e nao solto no efeito: o React
   * desaconselha `setState` sincrono ali, e a bandeira `vivo` evita atualizar
   * um componente que ja saiu da tela enquanto a consulta corria.
   */
  useEffect(() => {
    let vivo = true;

    (async () => {
      if (!temSuporte()) return vivo && setEstado("indisponivel");
      if (Notification.permission === "denied") return vivo && setEstado("negado");

      try {
        const registro = await navigator.serviceWorker.getRegistration();
        const inscricao = await registro?.pushManager.getSubscription();
        if (vivo) setEstado(inscricao ? "ligado" : "desligado");
      } catch {
        if (vivo) setEstado("desligado");
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  async function ativar() {
    if (!temSuporte()) return setEstado("indisponivel");
    setEstado("ligando");

    try {
      /*
       * A ordem importa: o `requestPermission` precisa acontecer dentro do
       * gesto da pessoa, e o registro do service worker é rapido o bastante
       * para caber antes sem perder essa condicao.
       */
      const registro = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        return setEstado(permissao === "denied" ? "negado" : "desligado");
      }

      const existente = await registro.pushManager.getSubscription();
      const inscricao =
        existente ??
        (await registro.pushManager.subscribe({
          // Obrigatorio nos navegadores atuais: todo push tem de virar uma
          // notificacao visivel, nada de trabalho silencioso em segundo plano.
          userVisibleOnly: true,
          applicationServerKey: base64UrlParaBytes(await chavePublicaDePush()),
        }));

      await salvarInscricaoDePush(
        inscricao.toJSON() as { endpoint: string; keys?: Record<string, string> },
      );
      setEstado("ligado");
    } catch (erro) {
      console.error("push:", erro);
      setEstado("erro");
    }
  }

  async function desativar() {
    try {
      const registro = await navigator.serviceWorker.getRegistration();
      const inscricao = await registro?.pushManager.getSubscription();
      if (inscricao) {
        await removerInscricaoDePush(inscricao.endpoint);
        await inscricao.unsubscribe();
      }
      setEstado("desligado");
    } catch (erro) {
      console.error("push:", erro);
      setEstado("erro");
    }
  }

  return { estado, ativar, desativar };
}
