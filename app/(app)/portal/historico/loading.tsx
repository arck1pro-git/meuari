import { Esqueleto } from "../_componentes/esqueleto";

export default function Carregando() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 bg-[#F7F8FA] px-5 pt-6 pb-28 sm:px-8 md:pt-10 md:pb-12">
      <div className="mb-6 h-5 w-20 animate-pulse rounded bg-tinta/[0.06]" />
      <Esqueleto blocos={4} />
    </main>
  );
}
