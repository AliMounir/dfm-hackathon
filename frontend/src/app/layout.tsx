import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DFM M&E Assistant",
  description:
    "Prototype assistant for Doctors for Madagascar monitoring, evaluation, data quality, and reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-100">{children}</body>
    </html>
  );
}
