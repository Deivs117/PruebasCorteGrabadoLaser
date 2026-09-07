import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { MaterialIcon } from "@/components/suites/material-icon";
import type { FamiliaMaterial } from "@/lib/materiales-catalog";
import type { PanoramaFamilia } from "@/lib/historial-data";

const ETIQUETA_FAMILIA: Record<FamiliaMaterial, string> = {
  madera: "Madera",
  polimero: "Polímero",
  metal: "Metal",
  otro: "Otro",
};

// Color fijo por familia (no el hash de `colorDeMaterial`, que identifica UN
// material puntual) -- acá cada tarjeta representa la familia entera.
const COLOR_POR_FAMILIA: Record<
  FamiliaMaterial,
  "blue" | "teal" | "orange" | "purple"
> = {
  madera: "blue",
  polimero: "teal",
  metal: "orange",
  otro: "purple",
};

function rango(min: string, max: string): string {
  if (!min || !max) return "Sin datos todavía";
  return min === max ? min : `${min} – ${max}`;
}

/**
 * Panel de una familia de material (issue #12): panorama sin filtros/export
 * (eso es #13/Reportes) — cuántas pruebas tiene, en qué rango se mueve, cuál
 * es su costo promedio. Reusa `StatTile` (mismo patrón visual del Dashboard)
 * para las cuatro cifras simples; rango/promedio de costo y calibración van
 * en su propia sección porque no son un número suelto.
 */
export function FamiliaPanel({ panorama }: { panorama: PanoramaFamilia }) {
  const color = COLOR_POR_FAMILIA[panorama.familia];
  const encabezado = (
    <div className="flex items-center gap-2">
      <MaterialIcon
        material={ETIQUETA_FAMILIA[panorama.familia]}
        familia={panorama.familia}
        color={color}
      />
      <p className="text-navy text-base font-semibold">
        {ETIQUETA_FAMILIA[panorama.familia]}
      </p>
    </div>
  );

  if (panorama.corridas === 0) {
    return (
      <Card accent={color} className="flex flex-col gap-3 p-5">
        {encabezado}
        <p className="text-text-muted text-sm">
          Sin pruebas todavía
          {panorama.materialesDistintos > 0
            ? ` (${panorama.materialesDistintos} material${panorama.materialesDistintos === 1 ? "" : "es"} en el catálogo, ninguna corrida todavía).`
            : "."}
        </p>
      </Card>
    );
  }

  return (
    <Card accent={color} className="flex flex-col gap-4 p-5">
      {encabezado}

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Materiales" value={panorama.materialesDistintos} />
        <StatTile label="Corridas" value={panorama.corridas} />
        <StatTile
          label="Evaluadas"
          value={panorama.pruebasEvaluadas}
          unit="pruebas"
        />
        <StatTile
          label="Costeadas"
          value={panorama.pruebasCosteadas}
          unit="pruebas"
        />
      </div>

      <div className="border-border flex flex-col gap-2 border-t pt-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">kWh/unidad calibrado</span>
          <span className="text-navy font-mono">
            {rango(panorama.kwhPorUnidadMin, panorama.kwhPorUnidadMax)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">Costo por celda</span>
          <span className="text-navy font-mono">
            {rango(panorama.costoPorCeldaMin, panorama.costoPorCeldaMax)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">Costo promedio por celda</span>
          <span className="text-navy font-mono font-medium">
            {panorama.costoPorCeldaPromedio || "Sin datos todavía"}
          </span>
        </div>
      </div>
    </Card>
  );
}
