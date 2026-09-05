"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { iconButtonClasses } from "@/lib/button-styles";
import { useEliminar } from "@/lib/use-eliminar";

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
  const { botonRef, abierto, setAbierto, eliminando, eliminar } = useEliminar({
    url: `/api/final-run/${encodeURIComponent(grupoId)}`,
  });

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Eliminar grupo de calibración de ${material}`}
        className={iconButtonClasses("danger")}
      >
        <TrashCanAnimado className="size-4" />
      </button>
      <ConfirmDialog
        open={abierto}
        title="Eliminar este grupo de calibración"
        description="Se van a borrar todas sus ejecuciones (G-code, csv y Hoja de Registro de cada una) y la configuración original. No se puede deshacer."
        onCancel={() => setAbierto(false)}
        onConfirm={eliminar}
        confirmLabel={eliminando ? "Eliminando…" : "Eliminar"}
        confirming={eliminando}
      />
    </>
  );
}
