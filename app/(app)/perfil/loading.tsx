import { Esqueleto } from "../portal/_componentes/esqueleto";

export default function Carregando() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
      <Esqueleto blocos={1} />
    </main>
  );
}
