/** Id reservado de "celda" para la foto general de toda la batería (todas
 * las probetas juntas, no una celda puntual) — reutiliza el mismo mecanismo
 * de guardado que las fotos por celda (ver fotos-data.ts) bajo este
 * identificador fijo. Vive fuera de fotos-data.ts (que es server-only) para
 * poder importarse también desde componentes de cliente. */
export const CELDA_ID_BATERIA = "bateria";
