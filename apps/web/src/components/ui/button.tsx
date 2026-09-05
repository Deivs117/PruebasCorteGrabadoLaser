"use client";

import type { ButtonHTMLAttributes, PointerEvent } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "@/lib/button-styles";
import { RippleCapa } from "@/components/ui/ripple";
import { Spinner } from "@/components/ui/spinner";
import { useRipple } from "@/lib/use-ripple";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un spinner junto al contenido y deshabilita el botón — el
   * texto del label sigue a cargo de quien llama (ej. "Guardando…"), esto
   * solo agrega la señal visual que antes faltaba. */
  loading?: boolean;
}

/**
 * Acción que cambia el estado de la interfaz. Para navegar a otra ruta usar
 * <LinkButton>, nunca un <button> con un router.push disfrazado.
 */
export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  onPointerDown,
  ...props
}: ButtonOwnProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { ripples, iniciar, quitar } = useRipple();

  function alPresionar(evento: PointerEvent<HTMLButtonElement>) {
    iniciar(evento);
    onPointerDown?.(evento);
  }

  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      onPointerDown={alPresionar}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
      <RippleCapa ripples={ripples} quitar={quitar} />
    </button>
  );
}

interface LinkButtonProps extends ButtonOwnProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/** Navegación real a otra ruta, con la apariencia de un botón. */
export function LinkButton({
  href,
  variant,
  size,
  className,
  children,
}: LinkButtonProps) {
  const { ripples, iniciar, quitar } = useRipple();

  return (
    <Link
      href={href}
      onPointerDown={iniciar}
      className={clsx(buttonClasses(variant, size, className))}
    >
      {children}
      <RippleCapa ripples={ripples} quitar={quitar} />
    </Link>
  );
}
