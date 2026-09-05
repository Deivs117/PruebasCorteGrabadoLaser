import { NextResponse } from "next/server";
import { sugerirLoteLibre } from "@/lib/corrida-id";

export async function GET(request: Request) {
  const parametros = new URL(request.url).searchParams;
  const material = parametros.get("material") ?? "";
  const espesorMm = Number(parametros.get("espesorMm"));
  const operacion = parametros.get("operacion");
  const loteActual = parametros.get("loteActual") ?? "";

  if (
    !material.trim() ||
    !Number.isFinite(espesorMm) ||
    (operacion !== "corte" && operacion !== "grabado") ||
    !loteActual.trim()
  ) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos para sugerir un lote." },
      { status: 400 },
    );
  }

  const lote = await sugerirLoteLibre({
    material,
    espesorMm,
    operacion,
    lote: loteActual,
  });
  return NextResponse.json({ ok: true, lote });
}
