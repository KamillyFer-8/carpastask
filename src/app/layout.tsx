import type { Metadata } from "next";
import { Providers } from "@/lib/trpc";
import { AppHeader } from "@/components/app-header";
import "@fontsource-variable/nunito/wght.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "CarpasTask — Tarefas e calendário",
  description:
    "Crie tarefas, marque datas e acompanhe os próximos compromissos.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <a className="skip-link" href="#conteudo">
            Pular para o conteúdo
          </a>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
