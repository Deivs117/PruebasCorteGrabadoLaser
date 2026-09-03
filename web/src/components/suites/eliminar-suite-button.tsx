"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EliminarSuiteButtonProps {
  archivo: string;
  material: string;
}

export function EliminarSuiteButton({
  archivo,
  material,
}: EliminarSuiteButtonProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    setEliminando(true);
    await fetch(`/api/suites/${encodeURIComponent(archivo)}`, {
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
        aria-label={`Eliminar suite de ${material}`}
        className="text-text-muted hover:bg-danger-soft hover:text-danger flex size-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
      <ConfirmDialog
        open={abierto}
        title="Eliminar esta suite"
        description={`Se va a borrar la configuración de "${material}". Esto no borra ningún G-code ya generado.`}
        onCancel={() => setAbierto(false)}
        onConfirm={eliminar}
        confirmLabel={eliminando ? "Eliminando…" : "Eliminar"}
      />
    </>
  );
}
