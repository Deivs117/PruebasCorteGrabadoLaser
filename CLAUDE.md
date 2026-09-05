# Reglas agénticas del repositorio

Estas reglas aplican a todo el repositorio (paquete Python `laser_toolkit` en `src/`, tests, docs, y el frontend en `web/`). El frontend tiene además su propio `web/CLAUDE.md` con particularidades de Next.js — esas no reemplazan lo de aquí, lo complementan.

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
