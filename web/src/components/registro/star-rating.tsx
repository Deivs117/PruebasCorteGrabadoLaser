"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { clsx } from "clsx";

interface StarRatingProps {
  label: string;
  value: "" | "1" | "2" | "3" | "4" | "5";
  onChange: (value: "1" | "2" | "3" | "4" | "5") => void;
}

const VALORES = ["1", "2", "3", "4", "5"] as const;

/** Escala 1-5 del SOP en papel del taller, como grupo de radios accesible
 * (foco y lectura de pantalla nativos), con apariencia de estrellas. Al
 * pasar el mouse sobre una estrella, esa y las anteriores hacen un "pop"
 * en cascada -- un transition-delay creciente hacia atrás desde la
 * estrella bajo el cursor, no una keyframe: no hace falta más para el
 * efecto de "ola". */
export function StarRating({ label, value, onChange }: StarRatingProps) {
  const nombre = useId();
  const [sobreIndice, setSobreIndice] = useState<number | null>(null);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- el hover es puramente decorativo (cascada visual); el control sigue siendo un grupo de radios accesible por teclado/lector de pantalla sin depender de esto.
    <fieldset
      className="flex items-center gap-0.5"
      onMouseLeave={() => setSobreIndice(null)}
    >
      <legend className="sr-only">{label}</legend>
      {VALORES.map((v, indice) => {
        const activa = value !== "" && Number(v) <= Number(value);
        const enCascada = sobreIndice !== null && indice <= sobreIndice;
        return (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- ídem: hover decorativo sobre un <label> que ya envuelve el radio interactivo real.
          <label
            key={v}
            className="cursor-pointer p-0.5"
            title={`${v} de 5`}
            onMouseEnter={() => setSobreIndice(indice)}
          >
            <input
              type="radio"
              name={nombre}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
              className="sr-only"
            />
            <Star
              style={
                enCascada
                  ? { transitionDelay: `${(sobreIndice - indice) * 40}ms` }
                  : undefined
              }
              className={clsx(
                "size-4 transition-[color,fill,transform] duration-150 ease-[var(--ease-motion)]",
                activa ? "fill-orange text-orange" : "text-border",
                enCascada && "scale-125",
              )}
            />
          </label>
        );
      })}
    </fieldset>
  );
}
