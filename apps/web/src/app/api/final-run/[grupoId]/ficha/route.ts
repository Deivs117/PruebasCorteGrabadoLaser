import { NextResponse } from "next/server";
import { actualizarFichaGrupo, type EstadoFicha } from "@/lib/final-run-data";

interface Contexto {
  params: Promise<{ grupoId: string }>;
}

function estadoValido(valor: unknown): valor is EstadoFicha {
  return valor === "oficial" || valor === "en_revision";
}

export async function POST(request: Request, { params }: Contexto) {
  const { grupoId } = await params;
  const cuerpo: unknown = await request.json().catch(() => null);
  const estado =
    cuerpo && typeof cuerpo === "object" && "estado" in cuerpo
      ? (cuerpo as { estado: unknown }).estado
      : null;
  const notas =
    cuerpo && typeof cuerpo === "object" && "notas" in cuerpo
      ? (cuerpo as { notas: unknown }).notas
      : undefined;

  if (!estadoValido(estado)) {
    return NextResponse.json(
      { ok: false, error: "Estado de ficha inválido." },
      { status: 400 },
    );
  }

  const resultado = await actualizarFichaGrupo(
    decodeURIComponent(grupoId),
    estado,
    typeof notas === "string" ? notas : undefined,
  );
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
