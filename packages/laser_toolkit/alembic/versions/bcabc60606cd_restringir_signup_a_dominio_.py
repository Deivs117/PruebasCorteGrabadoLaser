"""restringir signup a dominio fluxsolutionscali.com

Issue #23: Auth del equipo restringido por dominio de email (decisión ya
tomada en #1). Implementado como trigger de Postgres sobre `auth.users`
(la tabla que gestiona Supabase Auth/GoTrue), no como config manual del
dashboard -- así queda versionado junto al resto del schema, en vez de un
ajuste que nadie recuerda haber hecho.

Riesgo aceptado conscientemente (documentado también en el issue #1): es
menos estricto que invitación uno-por-uno, pero suficiente para un equipo
chico. Revisar si el equipo/la superficie de riesgo crece.

Revision ID: bcabc60606cd
Revises: 0c7f863e72da
Create Date: 2026-09-05 21:31:12.712151

"""

from collections.abc import Sequence

from alembic import op

revision: str = "bcabc60606cd"
down_revision: str | Sequence[str] | None = "0c7f863e72da"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DOMINIO = "fluxsolutionscali.com"


def upgrade() -> None:
    op.execute(f"""
        create or replace function public.restringir_dominio_signup()
        returns trigger
        language plpgsql
        security definer
        set search_path = public
        as $$
        begin
            if new.email is not null and new.email !~* '@{DOMINIO}$' then
                raise exception 'Solo se permiten cuentas @{DOMINIO}'
                    using errcode = '23514';
            end if;
            return new;
        end;
        $$;
    """)
    op.execute("""
        create trigger restringir_dominio_signup
        before insert on auth.users
        for each row
        execute function public.restringir_dominio_signup();
    """)


def downgrade() -> None:
    op.execute("drop trigger if exists restringir_dominio_signup on auth.users;")
    op.execute("drop function if exists public.restringir_dominio_signup();")
