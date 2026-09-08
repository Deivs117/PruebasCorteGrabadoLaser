/** Mismo vocabulario que `fs-data.ts` (`Operacion`) — redefinido acá en vez
 * de importado porque ese módulo es `server-only` y este archivo lo
 * consumen componentes de cliente. */
export type Operacion = "corte" | "grabado";

/** Un objeto puede pedir corte, grabado, o ambos (#3) — nunca vacío. Cuando
 * pide ambos, el corte sigue el outline del diseño (equivalente a
 * `ModoGrabadoSvg.CONTORNO`) y el grabado es el relleno detallado
 * (`RELLENO`) — cada uno con su propio par velocidad/potencia, porque en
 * modo Producción (#17, todavía no integrado acá) cada operación busca su
 * propia Ficha aprobada aunque el material sea el mismo. */
/** Nunca vacío en la práctica (`panel-objeto.tsx` no deja destildar la
 * última operación que queda) — se modela como array simple y no como
 * tupla porque el código que la arma/filtra (`.filter`, `.map`) ya asume un
 * array normal en todos lados. */
export type Operaciones = Operacion[];

/** Referencia a la Ficha de Parámetro Estándar que bloqueó estos valores en
 * modo Producción (#17) -- puramente informativa para la UI (mostrar de
 * dónde salió el número, permitir "cambiar de Ficha"): el G-code exportado
 * se sigue armando a partir de `velocidadMmMin`/`potenciaPct` (o
 * `potenciaBajaPct`/`potenciaAltaPct`), nunca de este id, así que no hace
 * falta que viaje a `editor-export-schema.ts`. Si viaja o no a un proyecto
 * guardado (#18) es decisión de cada schema que lo declare.
 *
 * `svg` (o un objeto raster en `corte`) usa una sola Ficha (`fichaGrupoId`).
 * Un objeto raster en `grabado` (#17, ampliación de #95) necesita DOS
 * Fichas GRABADO del mismo material+espesor como extremos del rango de
 * intensidad -- `fichaBajaGrupoId`/`fichaAltaGrupoId`, cuyos
 * `potenciaPct` calibrados llenan `potenciaBajaPct`/`potenciaAltaPct`. */
export interface ParametrosOperacion {
  velocidadMmMin: number;
  potenciaPct: number;
  /** Rango real de potencia calibrado para grabado raster (#95/#17) -- se
   * usa EN VEZ de `potenciaPct` cuando está presente (ver
   * `_rango_potencia_grabado` en `apps/api/editor.py`); `potenciaPct` queda
   * igual para no romper el toolpath de un solo valor de SVG/Prueba. */
  potenciaBajaPct?: number;
  potenciaAltaPct?: number;
  fichaGrupoId?: string;
  fichaBajaGrupoId?: string;
  fichaAltaGrupoId?: string;
}

/** Estado de la conversión a G-code de una operación puntual de un objeto —
 * se pide bajo demanda (botón "Ver toolpath"), no en cada cambio, porque
 * cada llamada es un round-trip al backend Python. */
export type EstadoToolpath =
  | { estado: "idle" }
  | { estado: "generando" }
  | { estado: "ok"; gcode: string }
  | { estado: "error"; mensaje: string };

interface ObjetoLienzoBase {
  id: string;
  /** Nombre para mostrar en el panel y la lista de capas — nombre de
   * archivo original, no un id técnico. */
  nombre: string;
  /** Centro del objeto, en mm, en el sistema del resto del toolkit (Y
   * creciente hacia arriba, origen abajo-a-la-izquierda del área de
   * trabajo). */
  xMm: number;
  yMm: number;
  anchoMm: number;
  altoMm: number;
  /** Grados en sentido horario tal como se ve en el lienzo. Es un concepto
   * puramente visual del cliente por ahora — #15/#16 todavía no generan
   * G-code con rotación real, ver nota en el PR de #16. */
  rotacionDeg: number;
  operaciones: Operaciones;
  parametros: Record<Operacion, ParametrosOperacion>;
  /** Si se ajusta ancho/alto preservando la proporción original del
   * archivo (por defecto sí — la mayoría de los casos de uso reales no
   * quiere deformar el diseño). */
  mantenerProporcion: boolean;
  /** Espejado horizontal/vertical (#107, barra de acciones rápida) —
   * puramente visual en el cliente por ahora, igual que `rotacionDeg` en su
   * momento: `laser_toolkit`/`apps/api` todavía no reciben este campo, así
   * que el G-code exportado no refleja el espejado (ver `aObjetoExportar`
   * en `editor-lienzo.tsx`, fuera del alcance de #107). */
  espejadoH: boolean;
  espejadoV: boolean;
  /** Material+espesor elegido para modo Producción (#17) -- decisión: POR
   * OBJETO, no global del lienzo, mismo criterio que `operaciones`/
   * `parametros` (ya modelados por objeto): un mismo diseño puede combinar
   * piezas de materiales distintos (ej. una base de MDF con un detalle de
   * acrílico), así que atarlo al lienzo entero habría sido más restrictivo
   * de lo que el modelo actual ya permite. El toggle Producción/Prueba en sí
   * SÍ es global (`EditorLienzo`, no acá): es una intención de todo el
   * trabajo ("¿esto es una prueba de parámetros o una pieza real?"), no una
   * propiedad de un objeto puntual. `null` = todavía sin elegir. */
  materialProduccion: { material: string; espesorMm: number | null } | null;
}

export interface ObjetoSvgLienzo extends ObjetoLienzoBase {
  tipo: "svg";
  /** Nombre ya persistido vía `/api/svgs` (reusa el almacenamiento que ya
   * usa "Grabado Vectorial") — hace falta para pedir la conversión. */
  nombreArchivoSvg: string;
  contenidoSvg: string;
  resolucionRellenoMm: number;
  /** Un resultado por operación pedida — se combinan ambos al dibujar el
   * toolpath si el objeto pide corte y grabado. */
  toolpath: Partial<Record<Operacion, EstadoToolpath>>;
}

export interface ObjetoRasterLienzo extends ObjetoLienzoBase {
  tipo: "raster";
  /** Sin persistencia en el backend todavía (#15 no existe) — vive solo en
   * el navegador como data URI mientras dure la sesión del lienzo. */
  dataUri: string;
}

export type ObjetoLienzo = ObjetoSvgLienzo | ObjetoRasterLienzo;

export const PARAMETROS_POR_DEFECTO: Record<Operacion, ParametrosOperacion> = {
  corte: { velocidadMmMin: 1200, potenciaPct: 25 },
  grabado: { velocidadMmMin: 1200, potenciaPct: 25 },
};
