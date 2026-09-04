"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { iconButtonClasses } from "@/lib/button-styles";
import { useEliminar } from "@/lib/use-eliminar";

interface EliminarSvgButtonProps {
  nombre: string;
  seleccionado: boolean;
}

export function EliminarSvgButton({
  nombre,
  seleccionado,
}: EliminarSvgButtonProps) {
  const { botonRef, abierto, setAbierto, eliminando, eliminar } = useEliminar({
    url: `/api/svgs/${encodeURIComponent(nombre)}`,
    alTerminar: (router) => {
      if (seleccionado) {
        router.push("/grabado-svg");
      } else {
        router.refresh();
      }
    },
  });

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Eliminar ${nombre}`}
        className={iconButtonClasses("danger")}
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
        confirming={eliminando}
      />
    </>
  );
}
