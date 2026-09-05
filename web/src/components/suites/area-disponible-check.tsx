import { dimensionesTotalesMm } from "@/lib/suite-schema";

interface AreaDisponibleCheckProps {
  velocidadesMmMin: number[];
  potenciasPct: number[];
  tamanoCeldaMm: number;
  espaciadoMm: number;
}

function formatoMm(valor: number): string {
  return `${Number(valor.toFixed(1))}mm`;
}

/**
 * Solo informa el tamaño real que va a ocupar la grilla sobre el material —
 * útil en piezas de área restringida (ej. una carcasa de teléfono en
 * TPU/silicona), donde el margen de error es de milímetros. No compara
 * contra ningún área ni bloquea nada: el técnico hace esa cuenta a ojo.
 */
export function AreaDisponibleCheck({
  velocidadesMmMin,
  potenciasPct,
  tamanoCeldaMm,
  espaciadoMm,
}: AreaDisponibleCheckProps) {
  if (
    velocidadesMmMin.length === 0 ||
    potenciasPct.length === 0 ||
    tamanoCeldaMm <= 0
  ) {
    return null;
  }

  const { anchoMm, altoMm } = dimensionesTotalesMm({
    velocidadesMmMin,
    potenciasPct,
    tamanoCeldaMm,
    espaciadoMm,
  });

  return (
    <p className="text-text-muted text-xs">
      Esta grilla va a ocupar{" "}
      <span className="text-navy font-mono">{formatoMm(anchoMm)}</span> ×{" "}
      <span className="text-navy font-mono">{formatoMm(altoMm)}</span> reales
      sobre el material.
    </p>
  );
}
