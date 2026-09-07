import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freepo",
  description: "Onde sua campanha ganha vida",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}