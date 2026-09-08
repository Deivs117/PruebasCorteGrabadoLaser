/**
 * Puerto a JS/Canvas de `laser_toolkit.raster.canal.calcular_matriz_intensidad`
 * (ver ese módulo -- es la referencia línea por línea de este archivo) para
 * el preview en vivo del modal de preprocesamiento de imagen (#109): mismo
 * pipeline y mismo orden -- redimensionar a la grilla de muestreo real ->
 * extraer canal/mezcla -> gamma -> invertir -> posterizar.
 *
 * No es pixel-a-pixel idéntico al resultado real del servidor: el downscale
 * usa el escalador nativo del canvas (bilinear/bicúbico según el navegador)
 * en vez de Lanczos (Pillow), y el cálculo de aquí nunca se envía al
 * servidor -- el cálculo real para exportar lo hace `ConfiguracionRaster`
 * en Python con la imagen original. Pero sigue exactamente la misma
 * matemática (mismos pesos de canal, misma curva de gamma, mismo orden de
 * pasos) sobre la misma grilla de muestreo, así que el preview nunca se ve
 * contradictorio con lo que el servidor va a generar de verdad.
 */

export type CanalRaster = "luminancia" | "rojo" | "verde" | "azul" | "mezcla";

/** Espejo de los campos de `ConfiguracionRaster`
 * (`packages/laser_toolkit/src/laser_toolkit/raster/config.py`) que expone
 * este modal (#109) -- `resolucion_mm` y el rango de potencia calibrado
 * (`potencia_baja_pct`/`potencia_alta_pct`, #95/#17) quedan fuera de este
 * alcance a propósito. */
export interface PreprocesamientoRaster {
  canal: CanalRaster;
  /** Solo tienen efecto con `canal: "mezcla"` -- mismo validador que
   * `ConfiguracionRaster._pesos_solo_tienen_sentido_en_mezcla` en el
   * servidor (pesos distintos del default en un canal fijo es un error). */
  pesoRojo: number;
  pesoVerde: number;
  pesoAzul: number;
  /** Curva de contraste sobre la claridad, antes de invertir/posterizar.
   * 1 = sin cambio. */
  gamma: number;
  /** Por defecto "pixel más oscuro = más potencia" (negativo fotográfico);
   * con `true` se invierte: pixel más claro = más potencia. */
  invertir: boolean;
  /** Reduce la intensidad a N niveles discretos entre 2 y 256. `null` =
   * modulación continua (sin reducir) -- ver decisión de #109: sin
   * dithering/tramado, la modulación continua ya aprovecha mejor el rango
   * real del láser. */
  nivelesPosterizado: number | null;
}

/** Mismos defaults que `ConfiguracionRaster()` sin argumentos -- un objeto
 * raster recién subido, antes de pasar por el modal, se comporta igual que
 * el pipeline de siempre. */
export const PREPROCESAMIENTO_POR_DEFECTO: PreprocesamientoRaster = {
  canal: "luminancia",
  pesoRojo: 1 / 3,
  pesoVerde: 1 / 3,
  pesoAzul: 1 / 3,
  gamma: 1,
  invertir: false,
  nivelesPosterizado: null,
};

/** Extrae solo los 7 campos de `PreprocesamientoRaster` de un objeto que
 * los tiene planos entre otros campos (ej. `ObjetoRasterLienzo`, que
 * `extends PreprocesamientoRaster` -- ver `editor-tipos.ts`) -- útil para
 * armar el body plano que esperan `ObjetoExportarBody`/`ObjetoProyectoBody`
 * en `apps/api/main.py` sin arrastrar el resto de los campos del objeto. */
export function preprocesamientoDe(
  o: PreprocesamientoRaster,
): PreprocesamientoRaster {
  return {
    canal: o.canal,
    pesoRojo: o.pesoRojo,
    pesoVerde: o.pesoVerde,
    pesoAzul: o.pesoAzul,
    gamma: o.gamma,
    invertir: o.invertir,
    nivelesPosterizado: o.nivelesPosterizado,
  };
}

/** Mismo valor que `RESOLUCION_RASTER_MM_POR_DEFECTO` en `config.py` -- el
 * objeto del lienzo todavía no expone su propia resolución de muestreo en
 * la UI (fuera del alcance de #109), así que el preview arma la grilla con
 * este valor fijo, igual que hace el servidor cuando no se le pasa nada
 * distinto en `ConfiguracionRaster`. */
const RESOLUCION_RASTER_MM_POR_DEFECTO = 0.3;

/** Tamaño de grilla real (columnas x filas) para `anchoMm`/`altoMm` --
 * mismo cálculo que `calcular_matriz_intensidad`
 * (`round(mm / resolucion_mm)`, mínimo 1 en cada eje). */
export function tamanoGrilla(
  anchoMm: number,
  altoMm: number,
  resolucionMm: number = RESOLUCION_RASTER_MM_POR_DEFECTO,
): { columnas: number; filas: number } {
  return {
    columnas: Math.max(1, Math.round(anchoMm / resolucionMm)),
    filas: Math.max(1, Math.round(altoMm / resolucionMm)),
  };
}

function tablaGamma(gamma: number): Uint8ClampedArray {
  const tabla = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    tabla[i] = gamma === 1 ? i : Math.round(255 * (i / 255) ** (1 / gamma));
  }
  return tabla;
}

function tablaPosterizado(niveles: number): Uint8ClampedArray {
  const tabla = new Uint8ClampedArray(256);
  const paso = 255 / (niveles - 1);
  for (let i = 0; i < 256; i++) {
    tabla[i] = Math.round(Math.round(i / paso) * paso);
  }
  return tabla;
}

/** Claridad (0-255) del canal/mezcla elegido para cada pixel de `datos` --
 * espejo de `_extraer_canal`. La fórmula de "luminancia" es la misma que
 * usa `Image.convert("L")` de Pillow (ITU-R 601-2). */
function extraerClaridad(
  datos: ImageData,
  config: PreprocesamientoRaster,
): Uint8ClampedArray {
  const { data, width, height } = datos;
  const n = width * height;
  const claridad = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {
    // `data` es un `Uint8ClampedArray` de un `ImageData` real, siempre
    // tiene 4 componentes por pixel -- el acceso nunca cae fuera de rango,
    // el `?? 0` solo satisface `noUncheckedIndexedAccess`.
    const r = data[i * 4] ?? 0;
    const g = data[i * 4 + 1] ?? 0;
    const b = data[i * 4 + 2] ?? 0;
    switch (config.canal) {
      case "luminancia":
        claridad[i] = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
        break;
      case "rojo":
        claridad[i] = r;
        break;
      case "verde":
        claridad[i] = g;
        break;
      case "azul":
        claridad[i] = b;
        break;
      case "mezcla":
        // `ImageChops.add` en Python clampea a 255 -- `Uint8ClampedArray`
        // hace exactamente eso al asignar.
        claridad[i] =
          r * config.pesoRojo + g * config.pesoVerde + b * config.pesoAzul;
        break;
    }
  }
  return claridad;
}

/**
 * Intensidad (0-255, mayor = pixel más oscuro = más potencia salvo
 * `invertir`) de cada pixel de `imagenGrilla` -- espejo exacto de
 * `calcular_matriz_intensidad` a partir de "extraer canal" en adelante
 * (canal -> gamma -> invertir -> posterizar), sobre una imagen que ya se
 * asume redimensionada a la grilla de muestreo real.
 */
export function calcularIntensidadGrilla(
  imagenGrilla: ImageData,
  config: PreprocesamientoRaster,
): Uint8ClampedArray {
  const claridad = extraerClaridad(imagenGrilla, config);
  const gamma = tablaGamma(config.gamma);
  const n = claridad.length;
  const intensidad = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {
    // Misma razón que en `extraerClaridad`: índices siempre dentro de rango
    // (tablas de 256 entradas, `claridad[i]` es un byte 0-255).
    const c = gamma[claridad[i] ?? 0] ?? 0;
    intensidad[i] = config.invertir ? c : 255 - c;
  }
  if (config.nivelesPosterizado !== null) {
    const posterizado = tablaPosterizado(config.nivelesPosterizado);
    for (let i = 0; i < n; i++) {
      intensidad[i] = posterizado[intensidad[i] ?? 0] ?? 0;
    }
  }
  return intensidad;
}

/**
 * Dibuja en `ctxDestino` (tamaño `anchoDestinoPx`x`altoDestinoPx`) el
 * preview de cómo quedaría `imagen` grabada con `config`: redimensiona a la
 * grilla real primero (mismo orden que el servidor -- importa para que el
 * posterizado se vea nítido por celda, no difuminado por una interpolación
 * posterior), calcula la intensidad de cada celda y la dibuja como "qué tan
 * oscura queda la marca" (a más intensidad, marca más oscura -- para que el
 * preview se lea como "así va a quedar grabado" y no como un mapa de
 * potencia invertido), reescalada sin suavizado al tamaño de destino: una
 * celda de grilla = un cuadrado visible, igual que una línea de barrido
 * real del láser.
 */
export function dibujarPreviewGrabado(
  ctxDestino: CanvasRenderingContext2D,
  imagen: CanvasImageSource,
  anchoMm: number,
  altoMm: number,
  config: PreprocesamientoRaster,
  anchoDestinoPx: number,
  altoDestinoPx: number,
): void {
  const { columnas, filas } = tamanoGrilla(anchoMm, altoMm);

  const grilla = document.createElement("canvas");
  grilla.width = columnas;
  grilla.height = filas;
  const ctxGrilla = grilla.getContext("2d");
  if (!ctxGrilla) return;
  ctxGrilla.drawImage(imagen, 0, 0, columnas, filas);
  const datosGrilla = ctxGrilla.getImageData(0, 0, columnas, filas);

  const intensidad = calcularIntensidadGrilla(datosGrilla, config);
  const salida = ctxGrilla.createImageData(columnas, filas);
  for (let i = 0; i < intensidad.length; i++) {
    const gris = 255 - (intensidad[i] ?? 0);
    salida.data[i * 4] = gris;
    salida.data[i * 4 + 1] = gris;
    salida.data[i * 4 + 2] = gris;
    salida.data[i * 4 + 3] = 255;
  }
  ctxGrilla.putImageData(salida, 0, 0);

  ctxDestino.imageSmoothingEnabled = false;
  ctxDestino.clearRect(0, 0, anchoDestinoPx, altoDestinoPx);
  ctxDestino.drawImage(grilla, 0, 0, anchoDestinoPx, altoDestinoPx);
}
