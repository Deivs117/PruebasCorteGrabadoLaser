"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { iconButtonClasses } from "@/lib/button-styles";
import { crearClienteBrowser } from "@/lib/supabase/client";

/** Cierra la sesión (issue #52) y navega a /login -- `router.refresh()`
 * fuerza a los Server Components del árbol a re-evaluar la sesión (si no,
 * quedarían cacheados con el `userEmail` de la sesión ya cerrada). */
export function CerrarSesionButton() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    const supabase = crearClienteBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={saliendo}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className={iconButtonClasses("neutral")}
    >
      <LogOut className="size-4" strokeWidth={1.75} />
    </button>
  );
}
