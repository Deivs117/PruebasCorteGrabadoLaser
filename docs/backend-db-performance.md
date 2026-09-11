# Reglas de rendimiento en queries a la base de datos (issue #165)

Este documento existe porque en septiembre de 2026 las páginas de listado (Suites, Historial, Dashboard, Reportes, Calibración) tardaban varios segundos en cargar en producción. La causa raíz **no era falta de índices** — era N+1 queries generalizado: cada función de `apps/api/lectura.py` hacía un `select(...)` y por cada fila accedía a relaciones de SQLAlchemy sin ningún eager loading configurado, disparando una query nueva por fila y por relación. Confirmado con `grep -rn "joinedload\|selectinload\|lazy=" apps/api/ packages/laser_toolkit/` antes del fix: **cero resultados en todo el repo**.

Contra Supabase (pooler en `sa-east-1`, São Paulo — round-trip de red real desde donde sea que corra la app, no una DB local), docenas de queries adicionales por página se traducen directo en segundos de carga.

## La regla

**Toda query que itera sobre una colección de filas y accede a una relación de esas filas (`fila.relacion`, `fila.relacion.sub_relacion`, etc.) tiene que declarar esa relación con `joinedload`/`selectinload` en el propio `select(...)`.** Nunca confiar en el lazy loading por defecto de SQLAlchemy para un loop — funciona para 1 fila, es un problema real a partir de la segunda.

Cuándo usar cada uno (regla de `sqlalchemy.orm`, no específica de este repo, pero vale repetirla):

- **`joinedload`**: para relaciones escalares (many-to-one / one-to-one) — `Registro.suite`, `Suite.material`, `GrupoCalibracion.material`. Un solo `JOIN`, no duplica filas porque el lado "many" no está en el SELECT principal.
- **`selectinload`**: para relaciones de colección (one-to-many) — `Registro.mediciones`, `Suite.registros`, `GrupoCalibracion.final_runs`. Un `JOIN` acá multiplicaría filas (una por cada hijo); `selectinload` hace un segundo `SELECT ... WHERE fk IN (...)` en su lugar — sigue siendo O(1) queries, no O(n).
- Encadenar con `.joinedload(...)`/`.selectinload(...)` sucesivos para relaciones anidadas (ej. `joinedload(Registro.final_run).joinedload(FinalRun.grupo_calibracion).joinedload(GrupoCalibracion.material)`).

`apps/api/lectura.py` centraliza las combinaciones que se repiten en dos constantes a nivel de módulo, `_OPCIONES_REGISTRO` y `_OPCIONES_GRUPO_CALIBRACION` — si una función nueva itera `Registro` o `GrupoCalibracion`, reusar esas constantes en vez de escribir la cadena de opciones de nuevo (y si hace falta una relación que no cubren, ampliarlas ahí, no como un caso especial en la función).

## Cómo verificarlo vos mismo (no confiar solo en la lectura del código)

Contar cuántas queries reales dispara una función, contra una sesión de verdad, es la única prueba que realmente confirma que no queda un N+1 — leer el código y "parecer" que está bien no alcanza (así se nos había pasado el caso de `candidatos_final_run` la primera vez: el `joinedload` estaba bien puesto en `repo_pruebas.listar_candidatos`, pero `apps/api` seguía usando una copia vieja de `laser_toolkit` sin resincronizar — ver la sección de abajo).

```python
from sqlalchemy import event

contador = {"n": 0}

@event.listens_for(engine, "before_cursor_execute")
def _contar(conn, cursor, statement, parameters, context, executemany):
    contador["n"] += 1

contador["n"] = 0
with Session(engine) as sesion:
    resultado = lectura.registros(sesion)
print(contador["n"], "queries para", len(resultado), "filas")
```

Si el conteo crece proporcional al número de filas devueltas, hay un N+1 sin resolver. El número correcto es una constante pequeña (una query por cada nivel de relación tocado), sin importar si el resultado trae 5 filas o 5000.

## Gotcha real: `apps/api` no ve los cambios de `packages/laser_toolkit` sin resincronizar

`apps/api/pyproject.toml` declara `laser-toolkit` como dependencia de path (`{ path = "../../packages/laser_toolkit" }`), pero **no es una instalación editable/symlink** — `uv sync` copia los archivos del paquete al `.venv` de `apps/api` en ese momento. Editar `packages/laser_toolkit/src/...` después de eso **no se refleja solo**, ni con un `uv sync` normal (no siempre detecta el cambio de contenido si la versión del paquete no cambió).

Si vas a probar un cambio de `laser_toolkit` corriendo `apps/api` localmente (o un script que lo importe), resincronizar forzando la reinstalación del paquete:

```
(cd apps/api && uv sync --reinstall-package laser-toolkit)
```

Esto no afecta producción (Vercel siempre instala fresco en cada deploy) — es puramente un footgun de desarrollo/testing local, pero real: nos hizo medir "sin cambios" en `candidatos_final_run` la primera vez, cuando el fix ya estaba en el código fuente.

## Qué falta (fuera de alcance de #165, paso 1)

- `grupos_calibracion()` sigue llamando a `obtener_ficha_vigente(sesion, grupo)` por cada grupo en vez de una relación con eager loading (`GrupoCalibracion.ficha_parametro` ya existe como relación 1:1, pero no se usó acá para no tocar el contrato de `obtener_ficha_vigente`, que también lo usan los tests). Bajo impacto real: Calibración nunca lista muchos grupos a la vez.
- Falta perfilar con `EXPLAIN ANALYZE` las consultas reales una vez el N+1 dejó de ser el cuello de botella dominante, y evaluar índices compuestos si aparece algo. Eso es el paso 2 documentado en el propio ticket #165.
- El job `backend` de `.github/workflows/ci.yml` corre `ruff`/`pyright`/`pytest` solo sobre `packages/laser_toolkit` — `apps/api` no tiene lint/typecheck/tests propios en CI todavía. Se verificó manualmente para este cambio (`python -c "import lectura"` sin errores, más el conteo de queries de arriba contra la base de dev real), pero es una brecha real si alguien más toca `apps/api` sin revisarlo a mano.
