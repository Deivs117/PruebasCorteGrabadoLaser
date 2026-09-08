"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { iconButtonClasses } from "@/lib/button-styles";
import { useEliminar } from "@/lib/use-eliminar";

interface EliminarProyectoButtonProps {
  id: number;
  nombre: string;
}

/** Espejo de `EliminarSuiteButton` -- mismo patrón (`useEliminar` +
 * `ConfirmDialog`), reusando la infraestructura de borrado con animación de
 * salida ya construida para Suites/SVGs/Final Run. */
export function EliminarProyectoButton({
  id,
  nombre,
}: EliminarProyectoButtonProps) {
  const { botonRef, abierto, setAbierto, eliminando, eliminar } = useEliminar({
    url: `/api/proyectos/${id}`,
  });

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Eliminar proyecto ${nombre}`}
        className={iconButtonClasses("danger")}
      >
        <TrashCanAnimado className="size-4" />
      </button>
      <ConfirmDialog
        open={abierto}
        title="Eliminar este proyecto"
        description={`Se va a borrar "${nombre}" y los SVGs/imágenes que tiene guardados -- esto no afecta ningún G-code que ya hayas exportado antes.`}
        onCancel={() => setAbierto(false)}
        onConfirm={eliminar}
        confirmLabel={eliminando ? "Eliminando…" : "Eliminar"}
        confirming={eliminando}
      />
    </>
  );
}
