import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RolagemSuave } from "./_componentes/rolagem-suave";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal do Investidor · Ari",
  description:
    "Acompanhe seus aportes, sua participacao nos resultados e a transparencia da obra do empreendimento Ari.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* No layout, e nao numa pagina: a rolagem suave vale para o app
            inteiro, e montada so em `/portal` a home ficava sem ela. */}
        <RolagemSuave />
        {children}
      </body>
    </html>
  );
}
