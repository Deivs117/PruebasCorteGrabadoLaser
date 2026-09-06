"""Cliente de Supabase Storage compartido entre requests de este servicio --
mismo criterio que `sesiones.py` para el engine de SQLAlchemy: se crea una
sola vez por instancia "caliente" de la función, no una vez por request.
"""

from __future__ import annotations

from laser_toolkit.storage.client import crear_cliente_storage

cliente = crear_cliente_storage()
