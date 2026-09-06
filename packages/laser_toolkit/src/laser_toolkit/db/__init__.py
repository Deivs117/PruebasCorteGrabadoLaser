"""Acceso a datos (Supabase/Postgres, via SQLAlchemy) -- ver issue #1 y #22.

Este subpaquete define el schema (`models.py`) y la base declarativa/engine
(`base.py`). NO expone sesiones crudas de SQLAlchemy hacia afuera de
`laser_toolkit`: la capa de funciones de alto nivel que sí se usa desde las
funciones serverless del frontend vive en el issue #24 (todavia no
implementado). Este modulo es deliberadamente solo el schema -- diseñarlo
bien primero, antes de escribir una sola query, es el alcance de #22.
"""

from __future__ import annotations
