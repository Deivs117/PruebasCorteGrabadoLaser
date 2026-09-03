"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EliminarSvgButtonProps {
  nombre: string;
  seleccionado: boolean;
}

export function EliminarSvgButton({
  nombre,
  seleccionado,
}: EliminarSvgButtonProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    setEliminando(true);
    await fetch(`/api/svgs/${encodeURIComponent(nombre)}`, {
      method: "DELETE",
    });
    setAbierto(false);
    setEliminando(false);
    if (seleccionado) {
      router.push("/grabado-svg");
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Eliminar ${nombre}`}
        className="text-text-muted hover:bg-danger-soft hover:text-danger flex size-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
      <ConfirmDialog
        open={abierto}
        title="Eliminar este SVG"
        description="Se va a borrar el archivo y el G-code que se haya generado a partir de él. No se puede deshacer."
        onCancel={() => setAbierto(false)}
        onConfirm={eliminar}
        confirmLabel={eliminando ? "Eliminando…" : "Eliminar"}
      />
    </>
  );
}
