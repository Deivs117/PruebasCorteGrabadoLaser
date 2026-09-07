# Reglas agénticas del repositorio

Estas reglas aplican a todo el repositorio: monorepo con `apps/web` (frontend Next.js) y `packages/laser_toolkit` (paquete Python). El frontend tiene además su propio `apps/web/CLAUDE.md` con particularidades de Next.js — esas no reemplazan lo de aquí, lo complementan.

Para el contexto de negocio, arquitectura y comandos del proyecto, ver `README.md` (es la fuente de verdad y se mantiene actualizado; no lo dupliques aquí).

## Usar el CLI de GitHub (`gh`) siempre que se pueda

Cuando una tarea implique GitHub (issues, PRs, labels, milestones, releases, revisar workflows/CI, comentarios, revisar el estado de un PR, etc.), usa el comando `gh` en vez de:

- Pedirle al usuario que abra el navegador o describa manualmente lo que ve en GitHub.
- Intentar reconstruir esa información a partir de `git log`/`git diff` cuando `gh` la da directo.
- Hacer scraping o fetch de páginas web de github.com.

`gh` ya está autenticado en este entorno (`gh auth status`). Ejemplos de uso frecuente en este repo:

```
gh issue list / create / view / edit / close
gh pr list / create / view / diff / checks / merge
gh pr comment <n> --body "..."
gh run list / view / watch      # workflows de CI
gh api ...                       # cuando no hay subcomando dedicado
```

**Por qué:** es más rápido, no gasta tokens explorando o adivinando estado vía web, y evita respuestas desactualizadas. Esto importa especialmente en gestión de tareas (issues/proyectos): antes de crear una tarea nueva a mano, revisa con `gh issue list` si ya existe algo relacionado.

Si `gh` no tiene un subcomando para lo que hace falta, cae a `gh api` antes que a soluciones manuales.

## Flujo de ramas

```
master                              ← producción, deploy automático (Vercel)
 └── develop                        ← espejo/staging de master, "primera comprobación"
       ├── feature/frontend
       ├── feature/backend
       ├── feature/data
       └── feature/deploy
             └── <sub-rama por tarea puntual>   ej. feature/data/schema-supabase
```

(Nota: originalmente se pensó nombrar la rama de staging `feat`, pero Git no permite que coexistan una rama `feat` y ramas `feat/algo` — el nombre colisiona con el propio namespace de refs. `develop` es además el nombre estándar de la industria para este rol exacto, ver GitFlow.)

- Las tareas puntuales (agénticas o no) salen de la rama de categoría correspondiente (`feature/frontend`, `feature/backend`, `feature/data`, `feature/deploy`), nunca directo de `master` ni de `develop`.
- Orden de promoción, siempre por PR: sub-rama → `feature/<categoría>` → `develop` → `master`. Cada salto corre el CI completo (`.github/workflows/ci.yml`); no saltarse ninguno.
- `master` tiene branch protection: requiere que el CI esté en verde antes de mergear.
- **Todo commit sigue Conventional Commits** (`tipo(área): mensaje`, ver `.pre-commit-config.yaml`) y **todo PR referencia un ticket** (`Closes #N` o `Refs #N`, ver `.github/PULL_REQUEST_TEMPLATE.md`) — es lo que da trazabilidad entre código y el [GitHub Project](https://github.com/orgs/Flux-Solutions-Cali/projects/1).

## Worktrees para sesiones agénticas

**Toda tarea que implique crear una rama/commits (agéntica o no) se hace en su propio `git worktree`, nunca directo en el directorio principal del repo.**

```
git fetch origin
git worktree add ../wt-<algo-descriptivo> -b <categoría>-<slug>-<issue> origin/<categoría>
```

**Por qué es obligatorio, no una preferencia:** ya pasó en este repo que dos sesiones trabajando en el mismo directorio (una haciendo `git checkout` de una rama mientras la otra tenía cambios sin commitear) hicieron que un commit cayera en la rama equivocada — un problema real de datos, no hipotético. Un worktree aísla físicamente los archivos de cada tarea; dos sesiones (agénticas o humanas) pueden trabajar en paralelo sin pisarse.

Al abrir un worktree nuevo:

- Copiarle `.env` (raíz) y `apps/web/.env.local` desde el directorio principal — no se heredan solos.
- Instalar dependencias ahí mismo (`uv sync` en `packages/laser_toolkit`/`apps/api`, `pnpm install` en `apps/web`) — cada worktree tiene su propio `.venv`/`node_modules`, no se comparten.
- El comando `cd` de una sesión no puede salir del directorio de trabajo principal asignado a la sesión — para correr comandos dentro de un worktree hermano hace falta un subshell explícito: `(cd ../wt-algo && comando)`.

Al terminar y mergear la tarea: `git worktree remove ../wt-<algo>` para no acumular directorios muertos — pero solo cuando el ticket ya cumplió su propósito (mergeado hasta donde correspondía), nunca a mitad de camino.

## Estado del ticket en el GitHub Project (Kanban)

El [Project](https://github.com/orgs/Flux-Solutions-Cali/projects/1) tiene 5 columnas (campo `Status`) y el estado de un ticket **tiene que reflejar en qué paso real está**, nunca saltar directo de `Backlog` a `Hecho` — eso es lo que ha estado pasando y deja de ser información útil para saber qué se está haciendo en paralelo:

| Columna | Cuándo mover el ticket acá |
|---|---|
| **Backlog** | Existe pero todavía no está lo bastante delimitado o priorizado para empezar. |
| **Listo para hacer** | Alcance claro, sin bloqueos — el siguiente que se toma. |
| **En progreso** | Apenas se abre el worktree/rama de la tarea — no al terminarla. |
| **En revisión** | Código completo, PR(s) abiertos, subiendo por la cadena de ramas (sub-rama → `feature/<categoría>` → `develop`) pero todavía no en `master`. |
| **Hecho** | Recién cuando llegó a `master` (desplegado a producción) — nunca antes, aunque el código ya esté "terminado" en `develop`. |

`gh issue create` **no** agrega el issue al Project — es un paso aparte, siempre después de crear el ticket:

```
gh project item-add 1 --owner Flux-Solutions-Cali --url <url-del-issue>
```

Para mover el estado (`Status`, campo `PVTSSF_lADOEb5pbM4Bik5dzhhcbyc` del proyecto `PVT_kwDOEb5pbM4Bik5d`):

```
gh project item-edit --project-id PVT_kwDOEb5pbM4Bik5d --id <item-id> \
  --field-id PVTSSF_lADOEb5pbM4Bik5dzhhcbyc --single-select-option-id <option-id>
```

IDs de las opciones: Backlog `54671fca` · Listo para hacer `1c4b27fa` · En progreso `47fc9ee4` · En revision `ec817748` · Hecho `98236657`. El `item-id` (no es el número del issue) sale del `item-add` de arriba o de `gh project item-list 1 --owner Flux-Solutions-Cali`.

Si además se sabe quién/qué sesión lo está trabajando, completar también el campo `Responsable` — ayuda a que dos sesiones no tomen el mismo ticket sin saberlo.

## CI/CD

`.github/workflows/ci.yml` corre en cada push/PR a `master`/`develop`/`feature/**`: un job de backend (`ruff` + `pyright` + `pytest` sobre `packages/laser_toolkit`) y un job de frontend (`lint` + `typecheck` + `format:check` + `build` sobre `apps/web`). El deploy en sí no vive en GitHub Actions — lo maneja la integración nativa de Vercel con el repo (preview por rama, producción en push a `master`).

## Skills de diseño/frontend (opcionales, no versionadas)

`.claude/skills/` y `.agents/skills/` existen en disco pero están en `.gitignore` — no son código del proyecto (nada de esto es específico de un toolkit de corte/grabado láser), son herramientas de agentes que solo hacen falta si estás trabajando en tareas de UI/diseño del frontend.

- `.claude/skills/` (banner-design, brand, design, design-system, slides, ui-styling, ui-ux-pro-max): skills del marketplace de Claude Code. Instalar bajo demanda vía `/plugin` en Claude Code cuando haga falta alguna, en vez de asumir que ya están.
- `.agents/skills/` + `skills-lock.json`: gestionadas por un instalador con lockfile aparte (convención portable entre agentes, análoga a `AGENTS.md`) — hoy solo tiene `motion-design` (`LottieFiles/motion-design-skill` en GitHub). Reinstalar con la herramienta que gestiona ese lockfile si hace falta.

No las reintroduzcas a git sin avisar — si alguna termina siendo realmente necesaria para todo el equipo (no solo quien toca frontend), es una decisión a discutir, no un commit de rutina.

## Credenciales de Supabase (issue #1/#23)

Nunca hardcodeadas, nunca committeadas. `.env.example` en la raíz documenta qué variables hacen falta; cada quien copia eso a su propio `.env` local (gitignored) con los valores reales del proyecto Supabase de **dev/preview** (nunca los de producción, para desarrollo local).

Dos proyectos Supabase separados (decisión de #1): uno de dev/preview, otro de producción — región `sa-east-1` (São Paulo, la más cercana a Colombia). Las credenciales de producción viven solo como variables de entorno de Vercel (#2), nunca en un `.env` de ningún dev.

`laser_toolkit.db.base.crear_engine()` lee `DATABASE_URL` del entorno y falla ruidosamente si no está seteada — nunca conecta a una base por defecto/adivinada.
