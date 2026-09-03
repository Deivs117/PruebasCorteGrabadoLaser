"use client";

import { useId, useState } from "react";
import { MorphIcon } from "morphicons/react";
import { ChevronDown, ChevronUp } from "lucide";
import { TriangleAlert } from "lucide-react";

interface AlertBannerProps {
  title: string;
  items: string[];
}

/**
 * Panel de avisos accionables (tono naranja = advertencia real, nunca
 * decorativo). Se despliega/colapsa con una transición de altura, y el
 * ícono de estado hace morph en vez de reemplazarse de golpe.
 */
export function AlertBanner({ title, items }: AlertBannerProps) {
  const [abierto, setAbierto] = useState(true);
  const contenidoId = useId();

  if (items.length === 0) return null;

  return (
    <div className="border-orange/30 bg-orange-soft rounded-[var(--radius-lg)] border">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={contenidoId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <TriangleAlert
          className="text-orange size-5 shrink-0"
          aria-hidden="true"
        />
        <span className="text-navy flex-1 text-sm font-semibold">{title}</span>
        <MorphIcon
          icon={abierto ? ChevronUp : ChevronDown}
          spring="smooth"
          size={18}
          className="text-navy"
        />
      </button>
      <div
        id={contenidoId}
        className="grid transition-[grid-template-rows] duration-[var(--duration-standard)] ease-[var(--ease-motion)]"
        style={{ gridTemplateRows: abierto ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <ul className="text-text-muted flex flex-col gap-2 px-4 pb-4 pl-11 text-sm">
            {items.map((item) => (
              <li key={item} className="list-disc">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
