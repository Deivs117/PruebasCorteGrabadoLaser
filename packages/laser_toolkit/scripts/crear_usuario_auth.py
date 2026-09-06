#!/usr/bin/env python3
"""Crea (o resetea la contraseña de) una cuenta de Auth para el equipo
(issue #52).

Alternativa al login por magic link: entrar con email+contraseña no manda
ningún correo (el plan free de Supabase manda como máximo 2 correos por
HORA, compartidos entre TODO el equipo -- un solo par de logins casi
simultáneos ya lo agota, visto en carne propia armando #52). La única vez
que hace falta un correo es para avisarle a la persona su contraseña, y eso
se hace por fuera de este script (Slack, en persona, etc.) -- nunca queda
en el repo ni se imprime dos veces.

Usa el Admin API de Supabase (`/auth/v1/admin/users`) con la
`service_role` key -- la misma que ya usa `laser_toolkit.storage.client`,
nunca la `anon` key (esa no tiene permiso para dar de alta usuarios).
`restringir_dominio_signup` (trigger de Postgres, #23) sigue validando el
dominio exactamente igual que con cualquier otro método de alta: la
inserción en `auth.users` pasa por el mismo trigger sin importar qué la
dispare.

Uso:
    export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...

    # cuenta nueva, contraseña generada al azar
    uv run --project packages/laser_toolkit python packages/laser_toolkit/scripts/crear_usuario_auth.py nombre@fluxsolutionscali.com

    # cuenta nueva, contraseña elegida
    uv run --project packages/laser_toolkit python packages/laser_toolkit/scripts/crear_usuario_auth.py \\
        nombre@fluxsolutionscali.com --password "..."

    # resetear la contraseña de una cuenta que ya existe
    uv run --project packages/laser_toolkit python packages/laser_toolkit/scripts/crear_usuario_auth.py \\
        nombre@fluxsolutionscali.com --reset
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import sys
import urllib.error
import urllib.request

ALFABETO_PASSWORD = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _generar_password(longitud: int = 16) -> str:
    return "".join(secrets.choice(ALFABETO_PASSWORD) for _ in range(longitud))


def _pedir(url: str, metodo: str, service_role_key: str, cuerpo: dict | None = None) -> tuple[int, dict]:
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    peticion = urllib.request.Request(
        url,
        data=datos,
        method=metodo,
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(peticion) as respuesta:  # noqa: S310 -- URL fija, viene de env propio
            return respuesta.status, json.loads(respuesta.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())


def _buscar_usuario(supabase_url: str, service_role_key: str, email: str) -> dict | None:
    """Busca por email exacto entre TODOS los usuarios -- el `?email=` de
    `GET /admin/users` no filtra server-side en esta versión de GoTrue
    (devuelve la lista completa igual, con o sin el parámetro): confirmado
    en carne propia, un `usuarios[0]` sin filtrar de acá pisó la cuenta real
    de otra persona en vez de no encontrar nada. Nunca confiar en ese
    parámetro -- comparar el email a mano, siempre."""
    status, cuerpo = _pedir(f"{supabase_url}/auth/v1/admin/users", "GET", service_role_key)
    if status != 200:
        return None
    email_normalizado = email.strip().lower()
    for usuario in cuerpo.get("users", []):
        if usuario.get("email", "").strip().lower() == email_normalizado:
            return usuario
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("email")
    parser.add_argument("--password", help="Si se omite, se genera una segura al azar.")
    parser.add_argument("--reset", action="store_true", help="La cuenta ya existe -- solo cambiarle la contraseña.")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        print("Faltan SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY en el entorno.", file=sys.stderr)
        return 1

    password = args.password or _generar_password()
    existente = _buscar_usuario(supabase_url, service_role_key, args.email)

    if existente:
        if not args.reset:
            print(
                f"Ya existe una cuenta para {args.email} -- pasá --reset si querés cambiarle la contraseña.",
                file=sys.stderr,
            )
            return 1
        status, cuerpo = _pedir(
            f"{supabase_url}/auth/v1/admin/users/{existente['id']}",
            "PUT",
            service_role_key,
            {"password": password},
        )
    else:
        status, cuerpo = _pedir(
            f"{supabase_url}/auth/v1/admin/users",
            "POST",
            service_role_key,
            {"email": args.email, "password": password, "email_confirm": True},
        )

    if status not in (200, 201):
        print(f"Error ({status}): {cuerpo.get('msg') or cuerpo.get('message') or cuerpo}", file=sys.stderr)
        return 1

    accion = "Contraseña actualizada" if existente else "Cuenta creada"
    print(f"{accion} para {args.email}.")
    print(f"Contraseña: {password}")
    print("Compartila con la persona por un canal seguro -- nunca por acá, nunca en el repo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
