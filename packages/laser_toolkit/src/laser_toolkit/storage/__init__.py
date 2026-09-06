"""Archivos binarios en Supabase Storage (issue #25) -- G-code, SVG, fotos.

A diferencia de `laser_toolkit.db` (Postgres, siempre vía SQLAlchemy por la
decisión de #1), Storage no es una base de datos relacional: no hay riesgo
de inyección SQL, así que acá SÍ se usa el cliente oficial `supabase-py` en
vez de reimplementar llamadas HTTP a mano.

- `client.py`: `crear_cliente_storage()`, con la `service_role` key (el
  backend es el único que sube/baja archivos -- nunca el frontend directo,
  misma decisión de arquitectura que la base de datos).
- `rutas.py`: funciones puras que calculan la key/ruta dentro de cada bucket
  -- testeables sin red.
- `operaciones.py`: subir/descargar/eliminar/generar URL firmada, uno por
  cada bucket (`gcode`, `svg`, `fotos`, creados en #23).
"""

from __future__ import annotations
