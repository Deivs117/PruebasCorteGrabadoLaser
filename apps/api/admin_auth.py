"""Admin API de Supabase Auth como funciones invocables (#117), no un
script -- reemplaza el uso interactivo de
`packages/laser_toolkit/scripts/crear_usuario_auth.py` (#52) para dar de
alta cuentas o resetear contraseñas desde el propio Panel de Generación de
Credenciales de la web.

Usa `cliente.auth.admin` (supabase-py) en vez de las llamadas urllib a mano
del script original -- mismo endpoint (`/auth/v1/admin/users` con la
`service_role` key), pero ya envuelto por el SDK. `cliente` es el mismo
cliente de Storage (`storage_cliente.py`): comparte la `service_role` key,
no hace falta un cliente aparte.

Sin dependencia de FastAPI a propósito (mismo patrón que `lectura.py`/
`escritura.py`): funciones que levantan `ValueError` en errores de negocio,
`main.py` las traduce a HTTP. El gate de "solo cuenta maestra" NO vive acá
-- lo valida el route handler de Next.js, que ya conoce la sesión (ver
issue #117); este módulo no necesita saber qué es una "cuenta maestra".

El dominio (`@fluxsolutionscali.com`) lo sigue validando el trigger de
Postgres `restringir_dominio_signup` (#23) -- la inserción en `auth.users`
pasa por él sin importar qué la dispare, así que no hay que revalidarlo acá.
"""

from __future__ import annotations

import secrets

from supabase import Client
from supabase_auth.errors import AuthApiError
from supabase_auth.types import AdminUserAttributes, User

ALFABETO_PASSWORD = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _generar_password(longitud: int = 16) -> str:
    return "".join(secrets.choice(ALFABETO_PASSWORD) for _ in range(longitud))


def _buscar_usuario(cliente: Client, email: str) -> User | None:
    """Busca por email exacto, paginando toda la lista -- el filtro
    server-side de `list_users` no existe en esta versión de GoTrue
    (devuelve la página completa igual, con o sin filtro): confirmado en
    carne propia en el script original (`crear_usuario_auth.py`, #52), un
    resultado sin filtrar de acá pisó la cuenta real de otra persona en vez
    de no encontrar nada. Nunca confiar en un parámetro de filtro -- comparar
    el email a mano, siempre."""
    email_normalizado = email.strip().lower()
    pagina = 1
    while True:
        usuarios = cliente.auth.admin.list_users(page=pagina, per_page=200)
        if not usuarios:
            return None
        for usuario in usuarios:
            if (usuario.email or "").strip().lower() == email_normalizado:
                return usuario
        pagina += 1


def _usuario_resumen(usuario: User) -> dict:
    return {"email": usuario.email, "creadoEn": usuario.created_at.isoformat()}


def listar_usuarios(cliente: Client) -> list[dict]:
    """Todas las cuentas de Auth existentes, ordenadas por fecha de alta
    (más reciente primero) -- solo email y fecha, nunca nada de la
    contraseña (no hay nada que mostrar: Supabase nunca la devuelve)."""
    resumenes: list[dict] = []
    pagina = 1
    while True:
        usuarios = cliente.auth.admin.list_users(page=pagina, per_page=200)
        if not usuarios:
            break
        resumenes.extend(_usuario_resumen(u) for u in usuarios)
        pagina += 1
    resumenes.sort(key=lambda u: u["creadoEn"], reverse=True)
    return resumenes


def crear_usuario(cliente: Client, email: str, password: str | None = None) -> dict:
    """Da de alta una cuenta nueva. Si no se pasa contraseña, se genera una
    segura al azar -- se devuelve una sola vez acá, nunca se persiste en
    texto plano ni se puede volver a consultar después (ni Supabase la
    guarda, ni este módulo la loguea)."""
    if _buscar_usuario(cliente, email) is not None:
        raise ValueError(f"Ya existe una cuenta para {email}.")

    password_final = password or _generar_password()
    try:
        respuesta = cliente.auth.admin.create_user(
            AdminUserAttributes(email=email, password=password_final, email_confirm=True)
        )
    except AuthApiError as error:
        raise ValueError(error.message) from error

    if respuesta.user is None:
        raise ValueError(f"No se pudo crear la cuenta para {email}.")
    return {"email": respuesta.user.email, "password": password_final}


def resetear_password(cliente: Client, email: str, password: str | None = None) -> dict:
    """Cambia la contraseña de una cuenta existente. Mismo criterio que
    `crear_usuario`: si no se pasa una, se genera al azar y se devuelve una
    sola vez."""
    usuario = _buscar_usuario(cliente, email)
    if usuario is None:
        raise ValueError(f"No existe una cuenta para {email}.")

    password_final = password or _generar_password()
    try:
        cliente.auth.admin.update_user_by_id(usuario.id, AdminUserAttributes(password=password_final))
    except AuthApiError as error:
        raise ValueError(error.message) from error

    return {"email": email, "password": password_final}
