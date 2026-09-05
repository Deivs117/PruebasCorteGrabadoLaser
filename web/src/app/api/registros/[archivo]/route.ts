import { NextResponse } from "next/server";
import { guardarRegistro, leerRegistro } from "@/lib/registro-data";
import {
  filaEditableSchema,
  filasComparten,
  type FilaRegistro,
} from "@/lib/registro-schema";

interface Contexto {
  params: Promise<{ archivo: string }>;
}

export async function PUT(request: Request, { params }: Contexto) {
  const { archivo } = await params;
  const nombreArchivo = decodeURIComponent(archivo);
  const filasActuales = await leerRegistro(nombreArchivo);
  if (!filasActuales) {
    return NextResponse.json(
      { ok: false, error: "Registro no encontrado." },
      { status: 404 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const filasEnviadas =
    cuerpo && typeof cuerpo === "object" && "filas" in cuerpo
      ? (cuerpo as { filas: unknown }).filas
      : null;

  if (
    !Array.isArray(filasEnviadas) ||
    filasEnviadas.length !== filasActuales.length
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "El número de celdas no coincide con el registro guardado.",
      },
      { status: 400 },
    );
  }

  const filasFinales: FilaRegistro[] = [];
  for (let i = 0; i < filasActuales.length; i++) {
    const filaActual = filasActuales[i];
    const analisis = filaEditableSchema.safeParse(filasEnviadas[i]);
    if (!filaActual || !analisis.success) {
      const detalle = analisis.success
        ? "Fila inesperada."
        : analisis.error.issues.map((e) => e.message).join(" ");
      return NextResponse.json(
        { ok: false, error: `Fila ${i + 1}: ${detalle}` },
        { status: 400 },
      );
    }
    filasFinales.push({ ...filaActual, ...analisis.data });
  }

  if (!filasComparten(filasFinales)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "El kWh medido y el tiempo real son de la corrida completa: deben ser el mismo valor en todas las celdas.",
      },
      { status: 400 },
    );
  }

  const guardado = await guardarRegistro(nombreArchivo, filasFinales);
  if (!guardado) {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar el registro." },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true });
}
