import type { Metadata } from "next";
import { Providers } from "@/lib/trpc";
import { AppHeader } from "@/components/app-header";
import "@fontsource-variable/nunito/wght.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "CarpasTask — Tasks and calendar",
  description: "Create tasks, schedule dates and review upcoming commitments.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US">
      <body>
        <Providers>
          <a className="skip-link" href="#conteudo">
            Skip to content
          </a>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
