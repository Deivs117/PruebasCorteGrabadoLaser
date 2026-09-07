import "server-only";

import { pyGet, pyPost } from "@/lib/py-api";

export interface UsuarioAdmin {
  email: string;
  creadoEn: string;
}

export interface CredencialGenerada {
  email: string;
  password: string;
}

/**
 * Único email con acceso al Panel de Generación de Credenciales (#117) --
 * en variable de entorno, nunca hardcodeado. `apps/api` no conoce este
 * concepto a propósito: el gate se resuelve acá, del lado que ya tiene la
 * sesión (ver `admin_auth.py`).
 */
export function esCuentaMaestra(email: string | null | undefined): boolean {
  const cuentaMaestra = process.env.MASTER_ACCOUNT_EMAIL;
  return (
    !!cuentaMaestra && email?.toLowerCase() === cuentaMaestra.toLowerCase()
  );
}

export async function listarUsuariosAdmin(): Promise<UsuarioAdmin[]> {
  return pyGet<UsuarioAdmin[]>("admin/usuarios");
}

export async function crearUsuarioAdmin(
  email: string,
  password: string,
): Promise<CredencialGenerada> {
  return pyPost<CredencialGenerada>("admin/usuarios", {
    email,
    password: password || null,
  });
}

export async function resetearPasswordAdmin(
  email: string,
  password: string,
): Promise<CredencialGenerada> {
  return pyPost<CredencialGenerada>("admin/usuarios/reset", {
    email,
    password: password || null,
  });
}
