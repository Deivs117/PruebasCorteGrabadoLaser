"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { iconButtonClasses } from "@/lib/button-styles";
import { useEliminar } from "@/lib/use-eliminar";

interface EliminarCorridaButtonProps {
  corridaId: string;
}

/** Borra la corrida completa (Suite, Registro, Mediciones, fotos y `.gcode`
 * -- ver el docstring de `eliminar_registro_por_corrida` en Python). */
export function EliminarCorridaButton({
  corridaId,
}: EliminarCorridaButtonProps) {
  const { botonRef, abierto, setAbierto, eliminando, eliminar } = useEliminar({
    url: `/api/registros/${encodeURIComponent(corridaId)}`,
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
        <TrashCanAnimado className="size-4" />
      </button>
      <ConfirmDialog
        open={abierto}
        title="Eliminar esta corrida"
        description="Se va a borrar el G-code, la Hoja de Registro y las fotos de esta corrida. No se puede deshacer."
        onCancel={() => setAbierto(false)}
        onConfirm={eliminar}
        confirmLabel={eliminando ? "Eliminando…" : "Eliminar"}
        confirming={eliminando}
      />
    </>
  );
}
