"""Cliente de Supabase Storage (issue #23, #25).

Lee `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` del entorno -- nunca
hardcodeadas. Usa la `service_role` key (no la `anon` key que sí se expone
al frontend) porque el backend Python es el único que escribe archivos,
misma decisión de arquitectura que `laser_toolkit.db` para la base de datos.
"""

from __future__ import annotations

import os

from dotenv import find_dotenv, load_dotenv
from supabase import Client, create_client

# Mismo criterio que laser_toolkit.db.base: carga .env buscando hacia arriba
# desde el cwd real del proceso, no desde la ubicacion de este archivo.
load_dotenv(find_dotenv(usecwd=True))


def crear_cliente_storage(supabase_url: str | None = None, service_role_key: str | None = None) -> Client:
    """Crea el cliente de Supabase. Falla ruidosamente si faltan las
    variables de entorno -- nunca sube un archivo a un proyecto equivocado
    ni falla en silencio."""
    url = supabase_url or os.environ.get("SUPABASE_URL")
    key = service_role_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no están configuradas. "
            "Cada entorno (dev/preview vs producción, ver issue #23) debe "
            "inyectarlas por su cuenta -- nunca hardcodear estas credenciales."
        )
    return create_client(url, key)
