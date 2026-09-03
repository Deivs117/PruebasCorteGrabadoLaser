"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EliminarCorridaButtonProps {
  corridaId: string;
}

/** Borra la corrida completa (G-code, csv y su registro, si existe). */
export function EliminarCorridaButton({
  corridaId,
}: EliminarCorridaButtonProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    setEliminando(true);
    await fetch(`/api/corridas/${encodeURIComponent(corridaId)}`, {
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
        aria-label="Eliminar esta corrida"
        className="text-text-muted hover:bg-danger-soft hover:text-danger flex size-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
      <ConfirmDialog
        open={abierto}
        title="Eliminar esta corrida"
        description="Se va a borrar el G-code, el csv y la Hoja de Registro de esta corrida (si existe), junto con sus fotos. No se puede deshacer."
        onCancel={() => setAbierto(false)}
        onConfirm={eliminar}
        confirmLabel={eliminando ? "Eliminando…" : "Eliminar"}
      />
    </>
  );
}
