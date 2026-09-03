"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EliminarGrupoButtonProps {
  grupoId: string;
  material: string;
}

/** Borra todas las ejecuciones del grupo (G-code + csv + registro + fotos
 * de cada una) y su configuración original. */
export function EliminarGrupoButton({
  grupoId,
  material,
}: EliminarGrupoButtonProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    setEliminando(true);
    await fetch(`/api/final-run/${encodeURIComponent(grupoId)}`, {
      method: "DELETE",
    });
    setAbierto(false);
    setEliminando(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Eliminar grupo de calibración de ${material}`}
        className="text-text-muted hover:bg-danger-soft hover:text-danger flex size-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
      <ConfirmDialog
        open={abierto}
        title="Eliminar este grupo de calibración"
        description="Se van a borrar todas sus ejecuciones (G-code, csv y Hoja de Registro de cada una) y la configuración original. No se puede deshacer."
        onCancel={() => setAbierto(false)}
        onConfirm={eliminar}
        confirmLabel={eliminando ? "Eliminando…" : "Eliminar"}
      />
    </>
  );
}
