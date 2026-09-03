import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "@/lib/button-styles";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Acción que cambia el estado de la interfaz. Para navegar a otra ruta usar
 * <LinkButton>, nunca un <button> con un router.push disfrazado.
 */
export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonOwnProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props} />
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
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
