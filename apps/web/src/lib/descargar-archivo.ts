/**
 * Descarga un archivo ya generado por el sistema (en data/registros/),
 * dejando que el técnico elija dónde guardarlo — nunca reemplaza la copia
 * que el sistema ya guardó, es siempre una copia adicional.
 *
 * Usa el selector de carpeta nativo (File System Access API) cuando el
 * navegador lo soporta; si no, cae a la descarga estándar del navegador.
 */

interface SelectorArchivoOpciones {
  suggestedName?: string;
}

interface ManejadorArchivo {
  createWritable(): Promise<{
    write(datos: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
}

declare global {
  interface Window {
    showSaveFilePicker?: (
      opciones?: SelectorArchivoOpciones,
    ) => Promise<ManejadorArchivo>;
  }
}

export async function descargarArchivo(
  nombre: string,
  endpointBase = "/api/registros/descargar",
): Promise<void> {
  const respuesta = await fetch(
    `${endpointBase}/${encodeURIComponent(nombre)}`,
  );
  if (!respuesta.ok) {
    throw new Error("No se pudo descargar el archivo.");
  }
  const blob = await respuesta.blob();

  if (typeof window.showSaveFilePicker === "function") {
    try {
      const manejador = await window.showSaveFilePicker({
        suggestedName: nombre,
      });
      const escritor = await manejador.createWritable();
      await escritor.write(blob);
      await escritor.close();
      return;
    } catch (error) {
      // El técnico cerró el selector: no es un error, no hacer nada más.
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Cualquier otro problema con el selector: seguir con la descarga clásica.
    }
  }

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
