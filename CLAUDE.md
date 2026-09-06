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

## CI/CD

`.github/workflows/ci.yml` corre en cada push/PR a `master`/`develop`/`feature/**`: un job de backend (`ruff` + `pyright` + `pytest` sobre `packages/laser_toolkit`) y un job de frontend (`lint` + `typecheck` + `format:check` + `build` sobre `apps/web`). El deploy en sí no vive en GitHub Actions — lo maneja la integración nativa de Vercel con el repo (preview por rama, producción en push a `master`).

## Skills de diseño/frontend (opcionales, no versionadas)

`.claude/skills/` y `.agents/skills/` existen en disco pero están en `.gitignore` — no son código del proyecto (nada de esto es específico de un toolkit de corte/grabado láser), son herramientas de agentes que solo hacen falta si estás trabajando en tareas de UI/diseño del frontend.

- `.claude/skills/` (banner-design, brand, design, design-system, slides, ui-styling, ui-ux-pro-max): skills del marketplace de Claude Code. Instalar bajo demanda vía `/plugin` en Claude Code cuando haga falta alguna, en vez de asumir que ya están.
- `.agents/skills/` + `skills-lock.json`: gestionadas por un instalador con lockfile aparte (convención portable entre agentes, análoga a `AGENTS.md`) — hoy solo tiene `motion-design` (`LottieFiles/motion-design-skill` en GitHub). Reinstalar con la herramienta que gestiona ese lockfile si hace falta.

No las reintroduzcas a git sin avisar — si alguna termina siendo realmente necesaria para todo el equipo (no solo quien toca frontend), es una decisión a discutir, no un commit de rutina.
