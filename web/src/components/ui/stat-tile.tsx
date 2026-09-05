import { Card } from "@/components/ui/card";

interface StatTileProps {
  label: string;
  value: number | string;
  unit?: string;
  helpText?: string;
}

/**
 * Cifra de resumen del dashboard. El valor va siempre en la tipografía
 * numérica (DM Mono) para distinguirse visualmente de las etiquetas —
 * ver docs/ui-design/prompts-stitch.md.
 */
export function StatTile({ label, value, unit, helpText }: StatTileProps) {
  return (
    <Card className="p-5">
      <p className="text-text-muted text-sm font-medium">{label}</p>
      <p className="text-navy mt-2 font-mono text-3xl font-medium">
        {value}
        {unit ? (
          <span className="text-text-muted ml-1 text-lg">{unit}</span>
        ) : null}
      </p>
      {helpText ? (
        <p className="text-text-muted mt-1 text-xs">{helpText}</p>
      ) : null}
    </Card>
  );
}
