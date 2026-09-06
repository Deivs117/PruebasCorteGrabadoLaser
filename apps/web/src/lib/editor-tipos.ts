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

export interface ParametrosOperacion {
  velocidadMmMin: number;
  potenciaPct: number;
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
