"use client";

import { useId } from "react";
import { Star } from "lucide-react";
import { clsx } from "clsx";

interface StarRatingProps {
  label: string;
  value: "" | "1" | "2" | "3" | "4" | "5";
  onChange: (value: "1" | "2" | "3" | "4" | "5") => void;
}

const VALORES = ["1", "2", "3", "4", "5"] as const;

/** Escala 1-5 del SOP en papel del taller, como grupo de radios accesible
 * (foco y lectura de pantalla nativos), con apariencia de estrellas. */
export function StarRating({ label, value, onChange }: StarRatingProps) {
  const nombre = useId();

  return (
    <fieldset className="flex items-center gap-0.5">
      <legend className="sr-only">{label}</legend>
      {VALORES.map((v) => {
        const activa = value !== "" && Number(v) <= Number(value);
        return (
          <label key={v} className="cursor-pointer p-0.5" title={`${v} de 5`}>
            <input
              type="radio"
              name={nombre}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
              className="sr-only"
            />
            <Star
              className={clsx(
                "size-4 transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                activa ? "fill-orange text-orange" : "text-border",
              )}
            />
          </label>
        );
      })}
    </fieldset>
  );
}
