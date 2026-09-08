"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { iconButtonClasses } from "@/lib/button-styles";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import {
  CLASES_ACTIVAS_POR_CATEGORIA,
  categoriaDeOperacion,
} from "@/lib/editor-colores";
import { ModalPreprocesamientoImagen } from "@/components/editor/modal-preprocesamiento-imagen";
import type {
  CanalRaster,
  PreprocesamientoRaster,
} from "@/lib/raster-preprocesamiento";
import {
  espesoresConFichaOficial,
  fichasOficialesDe,
  materialesConFichaOficial,
  type FichaCliente,
} from "@/lib/fichas-cliente";
import { MARGEN_CONTORNO_MM_POR_DEFECTO } from "@/lib/editor-contorno-schema";
import type {
  ObjetoLienzo,
  Operacion,
  ParametrosOperacion,
} from "@/lib/editor-tipos";

/** Espejo de las etiquetas de `OPCIONES_CANAL` en
 * `modal-preprocesamiento-imagen.tsx` -- versión corta para el resumen de
 * una línea que se muestra sin abrir el modal (#109). */
const ETIQUETA_CANAL_CORTA: Record<CanalRaster, string> = {
  luminancia: "Luminancia",
  rojo: "Rojo",
  verde: "Verde",
  azul: "Azul",
  mezcla: "Mezcla",
};

interface PanelObjetoProps {
  objeto: ObjetoLienzo;
  excedeArea: boolean;
  onCambiar: (cambios: Partial<ObjetoLienzo>) => void;
  onEliminar: () => void;
  onGenerarToolpath: (operacion: Operacion) => void;
  /** #109 -- aparte de `onCambiar` (que solo admite los campos comunes a
   * ambas variantes de `ObjetoLienzo`, ver el comentario de
   * `actualizarCampos` en `editor-lienzo.tsx`): `preprocesamiento` es
   * exclusivo de los objetos raster, así que necesita su propio callback ya
   * narrowado al tipo concreto en vez de forzarlo por `Partial<ObjetoLienzo>`. */
  onCambiarPreprocesamiento: (preprocesamiento: PreprocesamientoRaster) => void;
  /** Modo Producción/Prueba (#17) -- estado GLOBAL del editor, ver la nota
   * de diseño en `editor-tipos.ts` (`materialProduccion` sí es por-objeto,
   * el modo en sí no). */
  modoProduccion: boolean;
  /** Escape hatch cuando la combinación elegida no tiene (suficiente) Ficha
   * oficial -- vuelve TODO el editor a Prueba, nunca solo este objeto. */
  onSalirDeProduccion: () => void;
  fichas: FichaCliente[];
  cargandoFichas: boolean;
  errorFichas: string | null;
  /** Issue #108: solo aplica a objetos `tipo="raster"`. */
  onGenerarContorno: (margenMm: number) => void;
  generandoContorno: boolean;
  errorContorno: string | null;
}

const OPERACIONES: { valor: Operacion; etiqueta: string }[] = [
  { valor: "corte", etiqueta: "Corte" },
  { valor: "grabado", etiqueta: "Grabado" },
];

function numeroODefault(valor: string, actual: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : actual;
}

/**
 * Panel de propiedades del objeto seleccionado — la fuente de verdad
 * "precisa" del lienzo: mover/rotar con el mouse es cómodo para acomodar a
 * ojo, pero el trabajo de láser necesita números exactos (posición,
 * rotación, velocidad/potencia por operación), así que todo lo que el mouse
 * puede hacer también se puede escribir acá.
 */
export function PanelObjeto({
  objeto,
  excedeArea,
  onCambiar,
  onEliminar,
  onGenerarToolpath,
  onCambiarPreprocesamiento,
  modoProduccion,
  onSalirDeProduccion,
  fichas,
  cargandoFichas,
  errorFichas,
  onGenerarContorno,
  generandoContorno,
  errorContorno,
}: PanelObjetoProps) {
  const proporcionOriginal = objeto.anchoMm / objeto.altoMm;
  // #109 -- estado propio del modal de preprocesamiento de imagen, sección
  // delimitada a continuación (ver el bloque "Preprocesamiento de imagen"
  // más abajo); no interactúa con el resto del estado del panel.
  const [modalPreprocesamientoAbierto, setModalPreprocesamientoAbierto] =
    useState(false);
  const [margenContornoMm, setMargenContornoMm] = useState(
    MARGEN_CONTORNO_MM_POR_DEFECTO,
  );

  function alternarOperacion(operacion: Operacion) {
    const tiene = objeto.operaciones.includes(operacion);
    if (tiene && objeto.operaciones.length === 1) return; // nunca vacío
    const nuevas = tiene
      ? objeto.operaciones.filter((o) => o !== operacion)
      : [...objeto.operaciones, operacion];
    onCambiar({ operaciones: nuevas });
  }

  function actualizarParametro(
    operacion: Operacion,
    cambios: Partial<ParametrosOperacion>,
  ) {
    onCambiar({
      parametros: {
        ...objeto.parametros,
        [operacion]: { ...objeto.parametros[operacion], ...cambios },
      },
    });
  }

  /** Cambiar material o espesor invalida cualquier Ficha ya elegida (son
   * específicas de una combinación material+espesor) -- se limpian las
   * referencias de las TRES operaciones de una, no solo la que se esté
   * mirando ahora mismo, para no dejar una operación con un candado que ya
   * no corresponde a nada. Los valores numéricos (`velocidadMmMin`/
   * `potenciaPct`) quedan como estaban: vuelven a ser editables (dejaron de
   * estar bloqueados) hasta que se elija la Ficha nueva. */
  function cambiarMaterialProduccion(
    material: string,
    espesorMm: number | null,
  ) {
    const parametrosLimpios = Object.fromEntries(
      Object.entries(objeto.parametros).map(([op, p]) => [
        op,
        {
          ...p,
          fichaGrupoId: undefined,
          fichaBajaGrupoId: undefined,
          fichaAltaGrupoId: undefined,
        },
      ]),
    ) as Record<Operacion, ParametrosOperacion>;
    onCambiar({
      materialProduccion: { material, espesorMm },
      parametros: parametrosLimpios,
    });
  }

  /** Aplica una única Ficha aprobada (svg cualquier operación, o raster en
   * corte) -- bloquea velocidad/potencia al valor calibrado exacto. */
  function aplicarFichaUnica(operacion: Operacion, ficha: FichaCliente) {
    actualizarParametro(operacion, {
      velocidadMmMin: Number(ficha.velocidadMmMin),
      potenciaPct: Number(ficha.potenciaPct),
      potenciaBajaPct: undefined,
      potenciaAltaPct: undefined,
      fichaGrupoId: ficha.grupoId,
      fichaBajaGrupoId: undefined,
      fichaAltaGrupoId: undefined,
    });
  }

  /** Aplica el extremo de potencia baja del rango de grabado raster (#95),
   * sin tocar la potencia alta si ya estaba elegida. */
  function aplicarFichaBaja(ficha: FichaCliente) {
    actualizarParametro("grabado", {
      potenciaBajaPct: Number(ficha.potenciaPct),
      potenciaPct: undefined,
      fichaBajaGrupoId: ficha.grupoId,
      fichaGrupoId: undefined,
    });
  }

  /** Aplica el extremo de potencia alta -- la velocidad del objeto sigue la
   * de ESTA Ficha (decisión: cada Ficha GRABADO trae su propia velocidad
   * calibrada, y el rango de #95 solo interpola potencia, nunca velocidad;
   * se necesita una sola velocidad para toda la pasada de grabado, así que
   * se usa la del extremo de potencia alta, el que domina el tiempo real
   * de la pasada). */
  function aplicarFichaAlta(ficha: FichaCliente) {
    actualizarParametro("grabado", {
      velocidadMmMin: Number(ficha.velocidadMmMin),
      potenciaAltaPct: Number(ficha.potenciaPct),
      potenciaPct: undefined,
      fichaAltaGrupoId: ficha.grupoId,
      fichaGrupoId: undefined,
    });
  }

  function actualizarAncho(valor: string) {
    const anchoMm = numeroODefault(valor, objeto.anchoMm);
    onCambiar(
      objeto.mantenerProporcion
        ? { anchoMm, altoMm: anchoMm / proporcionOriginal }
        : { anchoMm },
    );
  }

  function actualizarAlto(valor: string) {
    const altoMm = numeroODefault(valor, objeto.altoMm);
    onCambiar(
      objeto.mantenerProporcion
        ? { altoMm, anchoMm: altoMm * proporcionOriginal }
        : { altoMm },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-navy truncate text-sm font-semibold"
          title={objeto.nombre}
        >
          {objeto.nombre}
        </p>
        <button
          type="button"
          onClick={onEliminar}
          aria-label={`Eliminar ${objeto.nombre} del lienzo`}
          className={iconButtonClasses("danger")}
        >
          <TrashCanAnimado className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* === #109: preprocesamiento de imagen (solo objetos raster) ===
          Sección propia y delimitada -- no depende de ni interfiere con
          otros cambios en este archivo (modo Producción, contorno de corte
          para raster). */}
      {objeto.tipo === "raster" ? (
        <div className="border-border bg-navy-soft flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border p-2.5">
          <div className="min-w-0">
            <p className="text-navy text-sm font-medium">
              Preprocesamiento de imagen
            </p>
            <p className="text-text-muted truncate text-xs">
              {ETIQUETA_CANAL_CORTA[objeto.canal]}
              {objeto.gamma !== 1 ? ` · gamma ${objeto.gamma.toFixed(1)}` : ""}
              {objeto.invertir ? " · invertido" : ""}
              {objeto.nivelesPosterizado !== null
                ? ` · ${objeto.nivelesPosterizado} niveles`
                : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalPreprocesamientoAbierto(true)}
          >
            Editar
          </Button>
          <ModalPreprocesamientoImagen
            abierto={modalPreprocesamientoAbierto}
            dataUri={objeto.dataUri}
            anchoMm={objeto.anchoMm}
            altoMm={objeto.altoMm}
            valorInicial={objeto}
            confirmarLabel="Aplicar cambios"
            onConfirmar={(preprocesamiento) => {
              onCambiarPreprocesamiento(preprocesamiento);
              setModalPreprocesamientoAbierto(false);
            }}
            onCancelar={() => setModalPreprocesamientoAbierto(false)}
          />
        </div>
      ) : null}
      {/* === fin #109 === */}

      {excedeArea ? (
        <div className="border-orange/30 bg-orange-soft flex items-start gap-2 rounded-[var(--radius-sm)] border p-2.5">
          <TriangleAlertAnimado className="text-orange mt-0.5 size-4 shrink-0" />
          <p className="text-navy text-xs">
            Este objeto no cabe en el área de trabajo en su posición/tamaño
            actual.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Posición X (mm)">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={objeto.xMm}
              onChange={(e) =>
                onCambiar({ xMm: numeroODefault(e.target.value, objeto.xMm) })
              }
              className={clsx(INPUT_CLASSES, "font-mono")}
            />
          )}
        </Field>
        <Field label="Posición Y (mm)">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={objeto.yMm}
              onChange={(e) =>
                onCambiar({ yMm: numeroODefault(e.target.value, objeto.yMm) })
              }
              className={clsx(INPUT_CLASSES, "font-mono")}
            />
          )}
        </Field>
        <Field label="Ancho (mm)">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={1}
              step="0.5"
              value={Math.round(objeto.anchoMm * 100) / 100}
              onChange={(e) => actualizarAncho(e.target.value)}
              className={clsx(INPUT_CLASSES, "font-mono")}
            />
          )}
        </Field>
        <Field label="Alto (mm)">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={1}
              step="0.5"
              value={Math.round(objeto.altoMm * 100) / 100}
              onChange={(e) => actualizarAlto(e.target.value)}
              className={clsx(INPUT_CLASSES, "font-mono")}
            />
          )}
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={objeto.mantenerProporcion}
          onChange={(e) => onCambiar({ mantenerProporcion: e.target.checked })}
          className="accent-blue size-4"
        />
        <span className="text-navy">Mantener proporción al redimensionar</span>
      </label>

      <Field
        label="Rotación (°)"
        hint="Sentido horario, tal como se ve en el lienzo."
      >
        {(id) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onCambiar({ rotacionDeg: (objeto.rotacionDeg + 345) % 360 })
              }
              className={clsx(INPUT_CLASSES, "px-2.5 font-mono")}
              aria-label="Rotar 15 grados en sentido antihorario"
            >
              −15°
            </button>
            <input
              id={id}
              type="number"
              inputMode="numeric"
              value={objeto.rotacionDeg}
              onChange={(e) =>
                onCambiar({
                  rotacionDeg:
                    ((numeroODefault(e.target.value, objeto.rotacionDeg) %
                      360) +
                      360) %
                    360,
                })
              }
              className={clsx(INPUT_CLASSES, "w-full text-center font-mono")}
            />
            <button
              type="button"
              onClick={() =>
                onCambiar({ rotacionDeg: (objeto.rotacionDeg + 15) % 360 })
              }
              className={clsx(INPUT_CLASSES, "px-2.5 font-mono")}
              aria-label="Rotar 15 grados en sentido horario"
            >
              +15°
            </button>
          </div>
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-navy text-sm font-medium">Operación</legend>
        <div className="flex gap-2">
          {OPERACIONES.map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => alternarOperacion(op.valor)}
              aria-pressed={objeto.operaciones.includes(op.valor)}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                objeto.operaciones.includes(op.valor)
                  ? CLASES_ACTIVAS_POR_CATEGORIA[
                      categoriaDeOperacion(objeto, op.valor)
                    ]
                  : "border-border text-text-muted hover:bg-navy-soft",
              )}
            >
              {op.etiqueta}
            </button>
          ))}
        </div>
        {objeto.operaciones.length > 1 ? (
          <p className="text-text-muted text-xs">
            El corte va a seguir el contorno del diseño; el grabado, el relleno
            detallado — cada uno con su propia velocidad/potencia.
          </p>
        ) : null}
      </fieldset>

      {/* Modo Producción (#17): material+espesor es POR OBJETO (ver nota de
       * diseño en `editor-tipos.ts`), así que se elige una sola vez acá
       * arriba y aplica a todas las operaciones de este objeto — cada
       * operación busca su propia Ficha aprobada para esa combinación más
       * abajo, en su propia sección. */}
      {modoProduccion ? (
        <div className="border-border bg-navy-soft flex flex-col gap-3 rounded-[var(--radius-sm)] border p-3">
          <p className="text-navy text-xs font-semibold uppercase">
            Material de producción
          </p>
          {cargandoFichas ? (
            <p className="text-text-muted text-xs">
              Cargando Fichas de Parámetro…
            </p>
          ) : errorFichas ? (
            <p role="alert" className="text-danger text-xs">
              {errorFichas}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Material">
                  {(id) => (
                    <select
                      id={id}
                      value={objeto.materialProduccion?.material ?? ""}
                      onChange={(e) =>
                        cambiarMaterialProduccion(e.target.value, null)
                      }
                      className={clsx(INPUT_CLASSES, "bg-surface")}
                    >
                      <option value="" disabled>
                        Elegir material…
                      </option>
                      {materialesConFichaOficial(fichas).map((material) => (
                        <option key={material} value={material}>
                          {material}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Espesor (mm)">
                  {(id) => (
                    <select
                      id={id}
                      value={objeto.materialProduccion?.espesorMm ?? ""}
                      disabled={!objeto.materialProduccion?.material}
                      onChange={(e) =>
                        cambiarMaterialProduccion(
                          objeto.materialProduccion?.material ?? "",
                          Number(e.target.value),
                        )
                      }
                      className={clsx(INPUT_CLASSES, "bg-surface")}
                    >
                      <option value="" disabled>
                        Elegir espesor…
                      </option>
                      {espesoresConFichaOficial(
                        fichas,
                        objeto.materialProduccion?.material ?? "",
                      ).map((espesorMm) => (
                        <option key={espesorMm} value={espesorMm}>
                          {espesorMm} mm
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
              {materialesConFichaOficial(fichas).length === 0 ? (
                <p className="text-text-muted text-xs">
                  Todavía no hay ninguna Ficha de Parámetro oficial cargada — no
                  hay nada para bloquear. Podés seguir en modo Prueba mientras
                  tanto.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {objeto.operaciones.map((operacion) => {
        const resultadoToolpath =
          objeto.tipo === "svg" ? objeto.toolpath[operacion] : undefined;
        const parametros = objeto.parametros[operacion];
        // El rango de potencia (#95) solo aplica a grabado raster (imagen
        // por intensidad) -- corte y grabado de SVG (relleno constante)
        // siguen usando una sola Ficha/valor, como siempre.
        const esRango = objeto.tipo === "raster" && operacion === "grabado";
        const bloqueada =
          modoProduccion &&
          (esRango
            ? parametros.fichaBajaGrupoId !== undefined &&
              parametros.fichaAltaGrupoId !== undefined
            : parametros.fichaGrupoId !== undefined);
        const material = objeto.materialProduccion;
        const fichasDisponibles =
          material && material.espesorMm !== null
            ? fichasOficialesDe(
                fichas,
                material.material,
                material.espesorMm,
                operacion,
              )
            : [];
        return (
          <div
            key={operacion}
            className="border-border flex flex-col gap-3 border-t pt-3"
          >
            <p className="text-navy text-xs font-semibold uppercase">
              Parámetros de {operacion}
            </p>

            {modoProduccion ? (
              !material || material.espesorMm === null ? (
                <p className="text-text-muted text-xs">
                  Elegí material y espesor arriba para bloquear esta operación a
                  una Ficha aprobada.
                </p>
              ) : esRango ? (
                fichasDisponibles.length < 2 ? (
                  <div className="border-orange/30 bg-orange-soft flex flex-col gap-2 rounded-[var(--radius-sm)] border p-2.5">
                    <p className="text-navy text-xs">
                      Hacen falta al menos 2 Fichas de grabado oficiales de{" "}
                      {material.material} {material.espesorMm}mm para armar el
                      rango de intensidad (hay {fichasDisponibles.length}).
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSalirDeProduccion}
                    >
                      Cambiar a modo Prueba
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ficha potencia baja">
                      {(id) => (
                        <select
                          id={id}
                          value={parametros.fichaBajaGrupoId ?? ""}
                          onChange={(e) => {
                            const ficha = fichasDisponibles.find(
                              (f) => f.grupoId === e.target.value,
                            );
                            if (ficha) aplicarFichaBaja(ficha);
                          }}
                          className={clsx(INPUT_CLASSES, "bg-surface")}
                        >
                          <option value="" disabled>
                            Elegir Ficha…
                          </option>
                          {fichasDisponibles.map((f) => (
                            <option key={f.grupoId} value={f.grupoId}>
                              {f.velocidadMmMin} mm/min · {f.potenciaPct}%
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                    <Field label="Ficha potencia alta">
                      {(id) => (
                        <select
                          id={id}
                          value={parametros.fichaAltaGrupoId ?? ""}
                          onChange={(e) => {
                            const ficha = fichasDisponibles.find(
                              (f) => f.grupoId === e.target.value,
                            );
                            if (ficha) aplicarFichaAlta(ficha);
                          }}
                          className={clsx(INPUT_CLASSES, "bg-surface")}
                        >
                          <option value="" disabled>
                            Elegir Ficha…
                          </option>
                          {fichasDisponibles.map((f) => (
                            <option key={f.grupoId} value={f.grupoId}>
                              {f.velocidadMmMin} mm/min · {f.potenciaPct}%
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  </div>
                )
              ) : fichasDisponibles.length === 0 ? (
                <div className="border-orange/30 bg-orange-soft flex flex-col gap-2 rounded-[var(--radius-sm)] border p-2.5">
                  <p className="text-navy text-xs">
                    No hay Ficha aprobada para {material.material}{" "}
                    {material.espesorMm}mm en {operacion}.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSalirDeProduccion}
                  >
                    Cambiar a modo Prueba
                  </Button>
                </div>
              ) : (
                <Field label="Ficha aprobada">
                  {(id) => (
                    <select
                      id={id}
                      value={parametros.fichaGrupoId ?? ""}
                      onChange={(e) => {
                        const ficha = fichasDisponibles.find(
                          (f) => f.grupoId === e.target.value,
                        );
                        if (ficha) aplicarFichaUnica(operacion, ficha);
                      }}
                      className={clsx(INPUT_CLASSES, "bg-surface")}
                    >
                      <option value="" disabled>
                        Elegir Ficha…
                      </option>
                      {fichasDisponibles.map((f) => (
                        <option key={f.grupoId} value={f.grupoId}>
                          {f.velocidadMmMin} mm/min · {f.potenciaPct}%
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              )
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Velocidad (mm/min)">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    disabled={bloqueada}
                    value={objeto.parametros[operacion].velocidadMmMin}
                    onChange={(e) =>
                      actualizarParametro(operacion, {
                        velocidadMmMin: numeroODefault(
                          e.target.value,
                          objeto.parametros[operacion].velocidadMmMin,
                        ),
                      })
                    }
                    className={clsx(
                      INPUT_CLASSES,
                      "font-mono",
                      bloqueada && "opacity-60",
                    )}
                  />
                )}
              </Field>
              {esRango ? (
                <Field label="Potencia alta (%)">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      disabled={bloqueada}
                      value={parametros.potenciaAltaPct ?? ""}
                      onChange={(e) =>
                        actualizarParametro(operacion, {
                          potenciaAltaPct: numeroODefault(
                            e.target.value,
                            parametros.potenciaAltaPct ?? 0,
                          ),
                        })
                      }
                      className={clsx(
                        INPUT_CLASSES,
                        "font-mono",
                        bloqueada && "opacity-60",
                      )}
                    />
                  )}
                </Field>
              ) : (
                <Field label="Potencia (%)">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      disabled={bloqueada}
                      value={objeto.parametros[operacion].potenciaPct}
                      onChange={(e) =>
                        actualizarParametro(operacion, {
                          potenciaPct: numeroODefault(
                            e.target.value,
                            objeto.parametros[operacion].potenciaPct,
                          ),
                        })
                      }
                      className={clsx(
                        INPUT_CLASSES,
                        "font-mono",
                        bloqueada && "opacity-60",
                      )}
                    />
                  )}
                </Field>
              )}
            </div>
            {esRango ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Potencia baja (%)">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      disabled={bloqueada}
                      value={parametros.potenciaBajaPct ?? ""}
                      onChange={(e) =>
                        actualizarParametro(operacion, {
                          potenciaBajaPct: numeroODefault(
                            e.target.value,
                            parametros.potenciaBajaPct ?? 0,
                          ),
                        })
                      }
                      className={clsx(
                        INPUT_CLASSES,
                        "font-mono",
                        bloqueada && "opacity-60",
                      )}
                    />
                  )}
                </Field>
              </div>
            ) : null}
            {bloqueada ? (
              <p className="text-teal text-xs">
                Bloqueado por Ficha de Parámetro aprobada — cambiá de
                material/espesor o de Ficha arriba para modificarlo.
              </p>
            ) : null}

            {objeto.tipo === "svg" ? (
              <div className="flex flex-col gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  loading={resultadoToolpath?.estado === "generando"}
                  onClick={() => onGenerarToolpath(operacion)}
                >
                  {resultadoToolpath?.estado === "generando"
                    ? "Generando…"
                    : `Ver toolpath de ${operacion}`}
                </Button>
                {resultadoToolpath?.estado === "error" ? (
                  <p role="alert" className="text-danger text-xs">
                    {resultadoToolpath.mensaje}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-text-muted text-xs">
                El toolpath de imágenes raster todavía no está disponible —
                depende de <code>laser_toolkit.raster</code> (#15), en curso.
              </p>
            )}
          </div>
        );
      })}

      {objeto.tipo === "raster" ? (
        <div className="border-border flex flex-col gap-2 border-t pt-3">
          <p className="text-navy text-xs font-semibold uppercase">
            Contorno de corte automático
          </p>
          <p className="text-text-muted text-xs">
            Traza la silueta real de la imagen (o su rectángulo si no tiene
            transparencia) y la agrega al lienzo como un objeto de corte nuevo,
            separado de esta imagen.
          </p>
          <div className="flex items-end gap-2">
            <Field label="Margen (mm)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  value={margenContornoMm}
                  onChange={(e) =>
                    setMargenContornoMm(
                      numeroODefault(e.target.value, margenContornoMm),
                    )
                  }
                  className={clsx(INPUT_CLASSES, "font-mono")}
                />
              )}
            </Field>
            <Button
              variant="outline"
              size="sm"
              loading={generandoContorno}
              disabled={margenContornoMm < 0}
              onClick={() => onGenerarContorno(margenContornoMm)}
            >
              {generandoContorno ? "Generando…" : "Generar contorno de corte"}
            </Button>
          </div>
          {errorContorno ? (
            <p role="alert" className="text-danger text-xs">
              {errorContorno}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
