import type { Metadata } from "next";
import { Urbanist, DM_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Laser Toolkit",
  description:
    "Herramienta interna para estandarizar, registrar y costear pruebas de corte y grabado láser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${urbanist.variable} ${dmMono.variable} h-full`}
    >
      <body className="flex h-full min-h-screen flex-col antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
