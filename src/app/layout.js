
import { Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

import BotaoPainelAdmin from "./components/BotaoPainelAdmin";
import CarregamentoGlobal from "./components/CarregamentoGlobal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Observatório Saúde Única",
  description:
    "Plataforma de vigilância epidemiológica integrada à Saúde Humana, Animal e Ambiental.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">

        {/* Carregamento global com animação botânica */}
        <CarregamentoGlobal />

        {/* Conteúdo das páginas */}
        {children}

        {/* Botão de acesso ao painel administrativo */}
        <BotaoPainelAdmin />

      </body>
    </html>
  );
}