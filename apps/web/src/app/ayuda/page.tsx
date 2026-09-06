import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/lib/button-styles";
import { HelpCircleAnimado } from "@/components/ui/icons/help-circle-animado";

const REPO_BLOB =
  "https://github.com/Deivs117/PruebasCorteGrabadoLaser/blob/master";
const SOP_HREF = `${REPO_BLOB}/${encodeURI("docs/sop/SOP-corrida-de-prueba.md")}`;

/** Ancla scrolleable sin que la quede tapada por el topbar sticky. */
const SCROLL_MT = "scroll-mt-[calc(var(--shell-topbar-h)+1rem)]";

interface Pantalla {
  href: string;
  label: string;
}

interface PasoFlujo {
  titulo: string;
  descripcion: string;
  pantallas?: Pantalla[];
  /** Paso que ocurre junto a la máquina, sin pantalla propia — enlaza al SOP
   * impreso en vez de una ruta de la app. */
  documentoExterno?: { href: string; label: string };
}

const FLUJO: PasoFlujo[] = [
  {
    titulo: "1. Preparar el material",
    descripcion:
      "Cortar la placa al tamaño del cupón de prueba, nivelarla y ajustar el foco con la galga de calibración del espesor.",
    pantallas: [{ href: "/materiales", label: "Materiales" }],
  },
  {
    titulo: "2. Armar la suite de prueba",
    descripcion:
      "Configurar el barrido de velocidad y potencia (o convertir un diseño SVG a G-code) y generar el archivo listo para la máquina.",
    pantallas: [
      { href: "/suites", label: "Suites de Prueba" },
      { href: "/grabado-svg", label: "Grabado Vectorial (SVG)" },
    ],
  },
  {
    titulo: "3. Correr en la máquina",
    descripcion:
      "Cargar el G-code en LaserGRBL o Candle, seguir el checklist del taller (asistencia de aire, extracción, enchufe inteligente) y anotar las lecturas del medidor al inicio y al final.",
    documentoExterno: { href: SOP_HREF, label: "Ver SOP de corrida" },
  },
  {
    titulo: "4. Evaluar y registrar",
    descripcion:
      "Con la placa ya fría, evaluar cada celda (corte pasante, carbonización) y cargar los datos de la corrida: kWh medido y tiempo real que mostró LaserGRBL/Candle.",
    pantallas: [{ href: "/registro", label: "Hoja de Registro" }],
  },
  {
    titulo: "5. Costear",
    descripcion:
      "Con las Tarifas cargadas, calcular el costo real por celda: energía, material y tiempo de máquina.",
    pantallas: [{ href: "/costeo", label: "Costeo" }],
  },
  {
    titulo: "6. Calibrar para producción (opcional)",
    descripcion:
      "Cuando el barrido ya eligió una combinación ganadora, correrla de nuevo como Final Run — mínimo 3 ejecuciones independientes — para medir su energía exacta, sin el reparto aproximado del barrido.",
    pantallas: [{ href: "/final-run", label: "Final Run (Calibración)" }],
  },
  {
    titulo: "7. Publicar la Ficha de Parámetro Estándar",
    descripcion:
      "La receta oficial de esa combinación (material, espesor, operación) queda documentada con su costo real medido, lista para que cualquier operador la use sin volver a probar.",
    pantallas: [{ href: "/fichas", label: "Fichas de Parámetro Estándar" }],
  },
];

interface Seccion {
  slug: string;
  label: string;
  resumen: string;
  construida: boolean;
}

const SECCIONES: Seccion[] = [
  {
    slug: "inicio",
    label: "Inicio",
    resumen:
      "Panorama general del taller: cuántas suites hay configuradas, cuántas corridas están registradas y cuántas Fichas oficiales existen, con avisos de qué falta (tarifas sin cargar, corridas sin registrar). 'Accesos rápidos' te lleva directo a los pasos más comunes del flujo de arriba.",
    construida: true,
  },
  {
    slug: "suites",
    label: "Suites de Prueba",
    resumen:
      "Cada suite es un barrido: una grilla de celdas que prueba varias combinaciones de velocidad y potencia en una sola corrida, para elegir la mejor. Acá las armás con el asistente paso a paso (o duplicás una existente con otro lote) y descargás el G-code listo para LaserGRBL/Candle.",
    construida: true,
  },
  {
    slug: "grabado-svg",
    label: "Grabado Vectorial (SVG)",
    resumen:
      "Subí un diseño SVG y convertilo a G-code de contorno y/o relleno, viendo el toolpath real antes de correrlo — para usarlo dentro de una suite (en vez del cuadrado genérico) o generarlo suelto.",
    construida: true,
  },
  {
    slug: "editor",
    label: "Editor de Diseño",
    resumen:
      "Lienzo de producción (#3): subí varios SVGs y/o imágenes, arrastralos/rotalos sobre el área de trabajo real de la máquina y generá el toolpath de cada uno por separado. A diferencia de Suites/Grabado Vectorial, esto no alimenta Hoja de Registro/Historial/Costeo — consume Fichas ya aprobadas, no genera datos de prueba. El export a un solo G-code combinado todavía no está disponible.",
    construida: true,
  },
  {
    slug: "registro",
    label: "Hoja de Registro",
    resumen:
      "Acá encontrás las corridas que ya generaste y las evaluás celda por celda: corte pasante (sí/no), carbonización (escala 1 a 5) y notas, más los datos que trae la hoja impresa del SOP (kWh y tiempo real de la corrida). Sin esto completo, Costeo no tiene con qué calcular.",
    construida: true,
  },
  {
    slug: "costeo",
    label: "Costeo",
    resumen:
      "Costo real por celda (energía + material + tiempo de máquina), calculado a partir de una Hoja de Registro ya completada y de las Tarifas cargadas. Si falta un dato o una tarifa, se muestra como pendiente — nunca se inventa un número.",
    construida: true,
  },
  {
    slug: "final-run",
    label: "Final Run (Calibración)",
    resumen:
      "Una vez que un barrido ya eligió la combinación ganadora, acá la corrés de nuevo — como mínimo 3 veces, cada una un job físico independiente — para medir su energía y tiempo con precisión, sin el artefacto del reparto por peso de tiempo que tiene un barrido.",
    construida: true,
  },
  {
    slug: "fichas",
    label: "Fichas de Parámetro Estándar",
    resumen:
      "Las 'recetas' oficiales por material, espesor y operación, respaldadas por un Final Run calibrado: grid, detalle con costo y origen, editor 'Nueva Ficha' y exportación a PDF.",
    construida: true,
  },
  {
    slug: "materiales",
    label: "Materiales",
    resumen:
      "Librería de materiales soportados con su ficha técnica: parámetros optomecánicos, comportamiento térmico y qué operaciones ya tienen datos.",
    construida: false,
  },
  {
    slug: "maquina",
    label: "Máquina",
    resumen:
      "Parámetros del perfil de máquina (CNC 3018 + Laser Tree LT-80W-F45): límite de láser, velocidad, aceleración, potencia del módulo, punto focal y área de trabajo real de la mesa.",
    construida: true,
  },
  {
    slug: "historial",
    label: "Historial",
    resumen:
      "Explorador de todas las corridas de prueba hechas en el taller, filtrable por material, fecha, operación y estado (Generada/Registrada/Costeada/Calibrada).",
    construida: false,
  },
  {
    slug: "reportes",
    label: "Reportes",
    resumen:
      "Vista agregada de costos y calibración a través del tiempo, una vez que existan suficientes corridas registradas y costeadas para que un reporte diga algo real.",
    construida: false,
  },
  {
    slug: "tarifas",
    label: "Tarifas",
    resumen:
      "El único lugar con valores monetarios: tarifa eléctrica, tarifa hora-máquina y precio de material. Mientras un campo quede vacío, Costeo lo muestra como pendiente.",
    construida: true,
  },
];

interface TerminoGlosario {
  termino: string;
  definicion: string;
}

const GLOSARIO: TerminoGlosario[] = [
  {
    termino: "Suite (barrido)",
    definicion:
      "Conjunto de celdas dentro de una misma corrida, cada una con una combinación distinta de velocidad y potencia — sirve para comparar combinaciones entre sí y elegir la mejor.",
  },
  {
    termino: "Celda",
    definicion:
      "Cupón individual dentro de una suite, identificado con un ID grabado (ej. C-001, C-002...).",
  },
  {
    termino: "Corrida / corrida_id",
    definicion:
      "Una ejecución física completa de un archivo .gcode en la máquina, de principio a fin.",
  },
  {
    termino: "Lote",
    definicion:
      "Identificador de tanda de material o de corridas (L01, L02...).",
  },
  {
    termino: "Corte pasante",
    definicion: "Si el corte atravesó el material de lado a lado (sí/no).",
  },
  {
    termino: "Carbonización (1 a 5)",
    definicion:
      "Nivel de quemado/hollín visible en el material: 1 = sin hollín visible, 5 = negro carbonizado que ensucia al tacto. Umbral aceptable: ≤ 3.",
  },
  {
    termino: "Final Run",
    definicion:
      "Corrida de calibración de precisión (mínimo 3 ejecuciones independientes) que mide el kWh y el tiempo exactos de UNA combinación ya elegida por un barrido — a diferencia del barrido, que compara varias combinaciones a la vez.",
  },
  {
    termino: "Grupo de calibración",
    definicion:
      "Agrupador de varias ejecuciones independientes de la misma Final Run (mismo material, espesor, operación, velocidad y potencia), sin importar fecha.",
  },
  {
    termino: "Ficha de Parámetro (Estándar)",
    definicion:
      "Receta oficial por material, espesor y operación, con los parámetros a usar y su costo real medido — no una estimación.",
  },
  {
    termino: "Punto focal",
    definicion:
      "Distancia de foco fija del láser (0.08 mm en el equipo del taller) que determina el paso de línea del relleno de grabado.",
  },
  {
    termino: "Overscan",
    definicion:
      "Margen extra de recorrido en los extremos de una pasada de grabado, para evitar el sobre-quemado que produce la desaceleración de la máquina en los bordes.",
  },
  {
    termino: "Tarifa hora-máquina",
    definicion:
      "Costo asignado por cada hora de uso de la máquina (mantenimiento, depreciación, etc.), aparte del consumo eléctrico.",
  },
  {
    termino: "Toma eléctrica / enchufe inteligente",
    definicion:
      'Dispositivo que mide el consumo eléctrico (kWh) de la máquina. Pese a ser "inteligente", no tiene un endpoint accesible para leerlo automáticamente — la lectura de inicio y de fin de cada corrida se anota a mano.',
  },
];

export default function Ayuda() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Ayuda</h1>
        <p className="text-text-muted mt-1 max-w-2xl text-sm">
          El flujo completo del proceso, y la ayuda específica de cada pantalla
          — todo en un solo lugar, para no tener que buscar la respuesta
          dispersa en otro documento.
        </p>
      </div>

      <section id="flujo" className={`flex flex-col gap-4 ${SCROLL_MT}`}>
        <h2 className="text-navy text-base font-semibold">
          El proceso completo, paso a paso
        </h2>
        <Card className="p-6">
          <ol className="flex flex-col">
            {FLUJO.map((paso, indice) => (
              <li
                key={paso.titulo}
                className="relative flex gap-4 pb-8 last:pb-0"
              >
                {indice < FLUJO.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="bg-border absolute top-8 left-4 w-px -translate-x-1/2"
                    style={{ height: "calc(100% - 2rem)" }}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="bg-blue z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                >
                  {indice + 1}
                </span>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <p className="text-navy text-sm font-semibold">
                    {paso.titulo.replace(/^\d+\.\s*/, "")}
                  </p>
                  <p className="text-text-muted text-sm">{paso.descripcion}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {paso.pantallas?.map((pantalla) => (
                      <Link
                        key={pantalla.href}
                        href={pantalla.href}
                        className="text-blue hover:text-blue-hover inline-flex items-center gap-1 text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
                      >
                        Ir a {pantalla.label}
                        <ArrowRight className="size-3.5" strokeWidth={2} />
                      </Link>
                    ))}
                    {paso.documentoExterno ? (
                      <a
                        href={paso.documentoExterno.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue hover:text-blue-hover inline-flex items-center gap-1 text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
                      >
                        {paso.documentoExterno.label}
                        <ExternalLink className="size-3.5" strokeWidth={2} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section id="secciones" className={`flex flex-col gap-4 ${SCROLL_MT}`}>
        <h2 className="text-navy text-base font-semibold">
          Ayuda de cada pantalla
        </h2>
        <div className="flex flex-col gap-4">
          {SECCIONES.map((seccion) => (
            <Card
              key={seccion.slug}
              id={seccion.slug}
              accent={seccion.construida ? "blue" : "navy"}
              className={`flex flex-col gap-2 p-6 ${SCROLL_MT}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-navy text-sm font-semibold">
                  {seccion.label}
                </p>
                {seccion.construida ? null : (
                  <Badge tone="neutral">Todavía no construida</Badge>
                )}
              </div>
              <p className="text-text-muted text-sm">{seccion.resumen}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="glosario" className={`flex flex-col gap-4 ${SCROLL_MT}`}>
        <h2 className="text-navy text-base font-semibold">Glosario</h2>
        <Card className="p-6">
          <dl className="flex flex-col divide-y divide-[var(--color-border)]">
            {GLOSARIO.map((item) => (
              <div
                key={item.termino}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
              >
                <dt className="text-navy text-sm font-semibold">
                  {item.termino}
                </dt>
                <dd className="text-text-muted text-sm">{item.definicion}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <section id="documentos" className={`flex flex-col gap-4 ${SCROLL_MT}`}>
        <h2 className="text-navy text-base font-semibold">
          Documento del taller
        </h2>
        <Card accent="blue" className="flex flex-col gap-1 p-6">
          <div className="mb-2 flex items-center gap-3">
            <span
              className="bg-blue-soft text-blue flex size-10 shrink-0 items-center justify-center rounded-full"
              aria-hidden="true"
            >
              <HelpCircleAnimado className="size-5" />
            </span>
            <p className="text-navy text-sm font-semibold">
              SOP — Corrida de prueba de corte/grabado láser
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-text-muted text-sm">
              Checklist de una página para imprimir y tener junto a la máquina:
              qué completar antes, durante y después de correr una prueba.
            </p>
            <a
              href={SOP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("outline", "sm", "shrink-0")}
            >
              Ver documento
              <ExternalLink className="size-4" strokeWidth={1.75} />
            </a>
          </div>
        </Card>
      </section>
    </div>
  );
}
