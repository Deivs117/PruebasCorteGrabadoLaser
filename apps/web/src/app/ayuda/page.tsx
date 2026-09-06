import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/lib/button-styles";
import { HelpCircleAnimado } from "@/components/ui/icons/help-circle-animado";

const REPO_BLOB =
  "https://github.com/Deivs117/PruebasCorteGrabadoLaser/blob/master";

interface Documento {
  titulo: string;
  descripcion: string;
  /** Ruta relativa a la raíz del repo (se linkea siempre contra `master`,
   * así el enlace nunca queda apuntando a una versión vieja del documento). */
  ruta: string;
}

const DOCUMENTOS: Documento[] = [
  {
    titulo: "SOP — Corrida de prueba de corte/grabado láser",
    descripcion:
      "Protocolo de una página para ejecutar una corrida en el taller: qué completar antes, durante y después de enviar el G-code.",
    ruta: "docs/sop/SOP-corrida-de-prueba.md",
  },
  {
    titulo: "Plan Maestro — Estandarización de Pruebas Láser",
    descripcion:
      "Visión completa del sistema: objetivo, arquitectura de 5 piezas y alcance por fases (F1–F7).",
    ruta: "docs/Plan Maestro - Estandarizacion Pruebas Laser.md",
  },
];

export default function Ayuda() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Ayuda</h1>
        <p className="text-text-muted mt-1 max-w-2xl text-sm">
          En vez de duplicar contenido a mano en la interfaz, esta sección
          enlaza directo la documentación del proyecto — así nunca queda
          desactualizada respecto al repositorio.
        </p>
      </div>

      <Card accent="blue" className="flex flex-col gap-1 p-6">
        <div className="mb-2 flex items-center gap-3">
          <span
            className="bg-blue-soft text-blue flex size-10 shrink-0 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <HelpCircleAnimado className="size-5" />
          </span>
          <p className="text-navy text-sm font-semibold">
            Documentos disponibles
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {DOCUMENTOS.map((doc) => (
            <li
              key={doc.ruta}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-navy text-sm font-medium">{doc.titulo}</p>
                <p className="text-text-muted mt-0.5 text-sm">
                  {doc.descripcion}
                </p>
              </div>
              <a
                href={`${REPO_BLOB}/${encodeURI(doc.ruta)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("outline", "sm", "shrink-0")}
              >
                Ver documento
                <ExternalLink className="size-4" strokeWidth={1.75} />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card accent="navy" className="flex flex-col gap-2 p-6">
        <p className="text-navy text-sm font-semibold">
          Todavía no está construido
        </p>
        <ul className="text-text-muted flex flex-col gap-1.5 text-sm">
          <li className="marker:text-navy list-disc pl-1">
            Glosario de términos (barrido, Final Run, Ficha de Parámetro)
          </li>
          <li className="marker:text-navy list-disc pl-1">
            Enlaces de contexto desde cada pantalla hacia su sección de ayuda
          </li>
          <li className="marker:text-navy list-disc pl-1">
            Tooltips y guía de uso específicos de la UI (pendiente de confirmar
            alcance)
          </li>
        </ul>
      </Card>
    </div>
  );
}
