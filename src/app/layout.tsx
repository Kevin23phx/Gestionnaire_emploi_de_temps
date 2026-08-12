import type { Metadata } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Manager — UJKZ",
  description:
    "Gestion en temps réel des emplois du temps universitaires — Université Joseph Ki-Zerbo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface-muted text-text">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
