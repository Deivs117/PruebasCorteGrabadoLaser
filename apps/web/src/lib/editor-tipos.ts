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
  /** Espejado horizontal/vertical (#107, barra de acciones rápida) —
   * puramente visual en el cliente por ahora, igual que `rotacionDeg` en su
   * momento: `laser_toolkit`/`apps/api` todavía no reciben este campo, así
   * que el G-code exportado no refleja el espejado (ver `aObjetoExportar`
   * en `editor-lienzo.tsx`, fuera del alcance de #107). */
  espejadoH: boolean;
  espejadoV: boolean;
  /** Issue #108: cuando este objeto es el contorno de corte generado
   * automáticamente a partir de una imagen raster, guarda el `id` de esa
   * imagen -- referencia mínima, todavía sin ningún comportamiento de
   * "mover/rotar/escalar juntos" cableado en el lienzo (no existe una
   * mecánica genérica de agrupación de objetos todavía, ver discusión de
   * alcance en el PR de #108). Sirve como base para esa mejora futura sin
   * fingir una funcionalidad que hoy no está. No se persiste todavía en
   * `/api/proyectos` (#18) ni en la exportación de G-code -- vive solo en
   * el estado del lienzo mientras dura la sesión. */
  objetoOrigenId?: string;
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
