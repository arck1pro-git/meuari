"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Pixels de rolagem que a abertura ocupa. Maior = abre mais devagar. */
const CURSO = 130;

export function Cabecalho({ nome, saldo }: { nome: string; saldo: string }) {
  const primeiroNome = nome.split(" ")[0];
  const [compacto, setCompacto] = useState(false);
  const cabecalho = useRef<HTMLElement>(null);
  const pilula = useRef<HTMLSpanElement>(null);
  const saudacao = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const alvo = document.getElementById("saldo");
    const faixa = cabecalho.current;
    const pil = pilula.current;
    const sau = saudacao.current;
    if (!alvo || !faixa || !pil || !sau) return;

    let pendente = false;

    /*
     * A abertura acompanha a rolagem em vez de disparar de uma vez: o progresso
     * sai da distancia que falta para o cartao do saldo sumir atras deste
     * cabecalho. Medir a altura dele a cada quadro, e nao fixar um numero,
     * mantem a conta certa nos dois breakpoints de padding.
     *
     * Escrevo direto no DOM: com `setState` a cada quadro de rolagem, a arvore
     * inteira re-renderizaria dezenas de vezes por segundo. O estado so muda na
     * virada dos 50%, que é o que o `aria-hidden` precisa saber.
     */
    const medir = () => {
      pendente = false;
      const altura = faixa.offsetHeight;
      const caixa = alvo.getBoundingClientRect();

      // Quanto falta para o cartao sumir atras do cabecalho.
      const restante = caixa.bottom - altura;

      /*
       * E quanto existe de rolagem entre o topo da pagina e esse ponto. O curso
       * nunca pode passar disso: se o cartao nasce a menos de `CURSO` pixels do
       * cabecalho, uma fracao da abertura ficaria "antes" do inicio da pagina e
       * a pilula apareceria meio aberta com a tela ainda no topo.
       */
      const disponivel = caixa.bottom + window.scrollY - altura;
      const curso = Math.max(1, Math.min(CURSO, disponivel));

      const progresso = Math.min(1, Math.max(0, 1 - restante / curso));

      const lado = 50 * (1 - progresso);
      pil.style.clipPath = `inset(0 ${lado}% 0 ${lado}% round 9999px)`;
      pil.style.opacity = String(progresso);

      sau.style.opacity = String(1 - progresso);
      sau.style.transform = `translateY(${-4 * progresso}px)`;

      setCompacto(progresso > 0.5);
    };

    const aoRolar = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, []);

  return (
    // `sticky` e nao `fixed`: assim o header continua ocupando altura no fluxo
    // e o conteudo abaixo nao precisa de padding de compensacao. `isolate` +
    // `overflow-hidden` prendem as luzes dentro do canto arredondado.
    <header
      ref={cabecalho}
      className="sticky top-0 z-50 isolate animate-surgir overflow-hidden rounded-b-4xl bg-linear-to-br from-marinho via-azul to-ceu text-white">
      {/* Camadas decorativas: sem z-index proprio, ficam acima do fundo da
          faixa e abaixo do conteudo, que sobe com `relative`. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-deriva brilho-ciano"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-brilho bg-linear-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-3">
          {/* `object-contain`: a marca é horizontal (1526x859), entao recortar
              para preencher o circulo comeria o "A" e o "I" e sobraria o meio
              da palavra. Fundo translucido so para destacar do degrade. */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1.5">
            <Image
              src="/ARI.png"
              alt="ARI"
              width={1526}
              height={859}
              className="h-auto w-full object-contain"
              priority
            />
          </span>

          {/* Sem classes de transicao: opacidade e deslocamento sao escritos a
              cada quadro pelo efeito, seguindo a rolagem. */}
          <p
            ref={saudacao}
            aria-hidden={compacto}
            className="text-sm font-semibold"
          >
            Olá, <span className="font-bold">{primeiroNome}</span>
          </p>
        </div>

        {/* Centrado no cabecalho inteiro, e nao no espaco entre a saudacao e o
            botao — por isso `absolute inset-0` com centro proprio. Em fluxo, a
            largura desigual dos dois lados deslocaria a pilula do meio. */}
        <div
          aria-hidden={!compacto}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-5 sm:px-8"
        >
          {/* Abre do meio para fora por `clip-path`, e nao por `scale-x`: o
              recorte revela a pilula no tamanho real, enquanto escalar
              espremeria o texto e o deixaria esticando ate assentar. O `round`
              acompanha o `rounded-full`, senao o recorte sai em canto vivo. */}
          {/* Estado fechado tambem nas classes: é o que vale no HTML servido,
              antes do efeito rodar, entao a pilula nunca pisca aberta. */}
          <span
            ref={pilula}
            className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-tinta opacity-0 shadow-sm [clip-path:inset(0_50%_0_50%_round_9999px)]"
          >
            {saldo}
          </span>
        </div>

        <button
          type="button"
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/30 text-white transition-colors hover:bg-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marinho"
        >
          <IconeTresPontos />
        </button>
      </div>
    </header>
  );
}

function IconeTresPontos() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}
