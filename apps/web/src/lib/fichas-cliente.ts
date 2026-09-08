/**
 * Contraparte de cliente de `fichas-data.ts` (`server-only`) para el modo
 * Producción del Editor de Diseño (#17): un componente de cliente
 * (`panel-objeto.tsx`) no puede importar ese módulo directo, así que este
 * pega contra el proxy `GET /api/fichas-parametro` (mismo patrón que
 * `MaterialSelect` con `/api/materiales`).
 *
 * Tipo redefinido acá (no importado de `fichas-data.ts`) por el mismo
 * motivo que `Operacion` está redefinido en `editor-tipos.ts`: ese archivo
 * es `server-only` y este lo consume un componente de cliente.
 */
export interface FichaCliente {
  grupoId: string;
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  velocidadMmMin: string;
  potenciaPct: string;
  estado: "oficial" | "en_revision";
}

export async function listarFichasCliente(): Promise<FichaCliente[]> {
  const respuesta = await fetch("/api/fichas-parametro");
  const cuerpo = (await respuesta.json()) as {
    ok: boolean;
    fichas?: FichaCliente[];
    error?: string;
  };
  if (!cuerpo.ok || !cuerpo.fichas) {
    throw new Error(
      cuerpo.error ?? "No se pudieron cargar las Fichas de Parámetro.",
    );
  }
  return cuerpo.fichas;
}

/** Compara espesores como número, no como string ("3" === "3.0"), porque
 * `espesorMm` viaja como texto desde Python (ver `fichas_parametro` en
 * `apps/api/lectura.py`) y un objeto del lienzo lo guarda como número. */
function mismoEspesor(espesorFicha: string, espesorMm: number): boolean {
  return Number(espesorFicha) === espesorMm;
}

/** Fichas OFICIALES de un material+espesor+operación puntual -- la única
 * fuente válida para bloquear velocidad/potencia en modo Producción (#17).
 * Una Ficha "en_revision" nunca cuenta, aunque exista: todavía no está
 * validada como el parámetro estándar real. */
export function fichasOficialesDe(
  fichas: FichaCliente[],
  material: string,
  espesorMm: number,
  operacion: "corte" | "grabado",
): FichaCliente[] {
  return fichas.filter(
    (f) =>
      f.estado === "oficial" &&
      f.material === material &&
      f.operacion === operacion &&
      mismoEspesor(f.espesorMm, espesorMm),
  );
}

/** Materiales distintos con al menos una Ficha oficial de CUALQUIER
 * operación -- opciones del selector de material+espesor en modo
 * Producción, que es por-objeto y no por-operación (un objeto puede pedir
 * corte y grabado a la vez). No se filtra por operación acá a propósito:
 * el objeto puede terminar sin Ficha para alguna de sus operaciones
 * puntuales, y ese caso lo cubre el mensaje de "no hay Ficha" de
 * `fichasOficialesDe`, no este selector. */
export function materialesConFichaOficial(fichas: FichaCliente[]): string[] {
  const materiales = new Set(
    fichas.filter((f) => f.estado === "oficial").map((f) => f.material),
  );
  return [...materiales].sort((a, b) => a.localeCompare(b));
}

/** Espesores con alguna Ficha oficial de un material puntual (cualquier
 * operación) -- ver nota de `materialesConFichaOficial`. */
export function espesoresConFichaOficial(
  fichas: FichaCliente[],
  material: string,
): number[] {
  const espesores = new Set(
    fichas
      .filter((f) => f.estado === "oficial" && f.material === material)
      .map((f) => Number(f.espesorMm)),
  );
  return [...espesores].sort((a, b) => a - b);
}
