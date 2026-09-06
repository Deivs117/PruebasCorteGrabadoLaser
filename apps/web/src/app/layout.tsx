import type { Metadata } from "next";
import { Urbanist, DM_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { crearClienteServidor } from "@/lib/supabase/server";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Issue #52: se resuelve acá (Server Component, corre en cada request)
  // para pasárselo al Topbar sin un round-trip extra al cliente. El
  // middleware ya garantiza que si llegamos hasta acá con una ruta privada
  // hay sesión -- este `null` solo aplica a /login y /auth/*, donde
  // AppShell ni siquiera lo usa.
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="es"
      className={`${urbanist.variable} ${dmMono.variable} h-full`}
    >
      <body className="flex h-full min-h-screen flex-col antialiased">
        <AppShell userEmail={user?.email ?? null}>{children}</AppShell>
      </body>
    </html>
  );
}
