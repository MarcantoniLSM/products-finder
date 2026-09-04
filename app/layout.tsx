import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Products Finder",
  description: "Painel pessoal para acompanhar produtos e oportunidades em marketplaces."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
