"""Acceso a datos (Supabase/Postgres, via SQLAlchemy) -- ver issues #1, #22, #24.

- `base.py`: base declarativa + factory de engine/sesion (lee `DATABASE_URL`).
- `models.py`: el schema (11 tablas).
- `repo_materiales.py`, `repo_pruebas.py`, `repo_calibracion.py`,
  `repo_negocio.py`: funciones de alto nivel (issue #24) -- la UNICA forma en
  que el resto del sistema (funciones serverless de #2, futuros comandos del
  CLI) toca la base. Nunca se espera que quien llama escriba una query de
  SQLAlchemy por su cuenta.
"""

from __future__ import annotations
