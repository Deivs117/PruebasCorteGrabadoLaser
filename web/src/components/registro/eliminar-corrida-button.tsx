"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { iconButtonClasses } from "@/lib/button-styles";
import { useEliminar } from "@/lib/use-eliminar";

interface EliminarCorridaButtonProps {
  corridaId: string;
}

/** Borra la corrida completa (G-code, csv y su registro, si existe). */
export function EliminarCorridaButton({
  corridaId,
}: EliminarCorridaButtonProps) {
  const { botonRef, abierto, setAbierto, eliminando, eliminar } = useEliminar({
    url: `/api/corridas/${encodeURIComponent(corridaId)}`,
  });

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Eliminar esta corrida"
        className={iconButtonClasses("danger")}
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
        confirming={eliminando}
      />
    </>
  );
}
