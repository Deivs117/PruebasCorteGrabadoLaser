"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { iconButtonClasses } from "@/lib/button-styles";
import { useEliminar } from "@/lib/use-eliminar";

interface EliminarSuiteButtonProps {
  id: number;
  material: string;
}

export function EliminarSuiteButton({
  id,
  material,
}: EliminarSuiteButtonProps) {
  const { botonRef, abierto, setAbierto, eliminando, eliminar } = useEliminar({
    url: `/api/suites/${id}`,
  });

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Eliminar suite de ${material}`}
        className={iconButtonClasses("danger")}
      >
        <TrashCanAnimado className="size-4" />
      </button>
      <ConfirmDialog
        open={abierto}
        title="Eliminar esta suite"
        description={`Se va a borrar la configuración de "${material}", junto con su registro, mediciones y el G-code ya generado.`}
        onCancel={() => setAbierto(false)}
        onConfirm={eliminar}
        confirmLabel={eliminando ? "Eliminando…" : "Eliminar"}
        confirming={eliminando}
      />
    </>
  );
}
