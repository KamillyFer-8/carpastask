import type { Metadata } from "next";
import { Providers } from "@/lib/trpc";
import "./globals.css";
export const metadata: Metadata = {
  title: "CarpasTask — Simple tasks. Clear focus.",
  description: "A calm, focused place for your tasks.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
