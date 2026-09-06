"""area de trabajo real como default no nulo (issue 11)

Revision ID: 6df74a2f0955
Revises: f770b9e70c4e
Create Date: 2026-09-06 15:15:43.155666

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6df74a2f0955'
down_revision: Union[str, Sequence[str], None] = 'f770b9e70c4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Area real de la CNC 3018 + LT-80W-F45 de este taller (issue #11), confirmada
# por el usuario. Estas columnas se agregaron nullable en #22 (schema
# adelantado antes de que #11 tuviera el dato real) -- ahora que existe, se
# backfillea la fila existente y se fija como server_default para que futuras
# filas creadas directo en SQL (fuera del ORM) tampoco queden en NULL.
_ANCHO_MM = 300.0
_ALTO_MM = 180.0


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        f"UPDATE configuracion_maquina SET area_trabajo_ancho_mm = {_ANCHO_MM} "
        "WHERE area_trabajo_ancho_mm IS NULL"
    )
    op.execute(
        f"UPDATE configuracion_maquina SET area_trabajo_alto_mm = {_ALTO_MM} "
        "WHERE area_trabajo_alto_mm IS NULL"
    )
    op.alter_column(
        'configuracion_maquina', 'area_trabajo_ancho_mm',
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        nullable=False,
        server_default=str(_ANCHO_MM),
    )
    op.alter_column(
        'configuracion_maquina', 'area_trabajo_alto_mm',
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        nullable=False,
        server_default=str(_ALTO_MM),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'configuracion_maquina', 'area_trabajo_alto_mm',
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        nullable=True,
        server_default=None,
    )
    op.alter_column(
        'configuracion_maquina', 'area_trabajo_ancho_mm',
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        nullable=True,
        server_default=None,
    )
