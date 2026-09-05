# Reglas Irrompibles de Frontend — Fase 0
> Derivadas de auditoría real de código. Aplicar antes de escribir cualquier línea en sesiones agénticas.

---

## 0. La Regla de Oro (antes de cualquier otra)

> **Antes de escribir cualquier elemento, pregúntate: ¿qué ES esto, qué función cumple?**
> La respuesta determina la etiqueta, la estructura y el patrón. Si no puedes responderla, no escribas el elemento todavía.

`<div>` es la respuesta por defecto cuando no te hiciste esa pregunta — no es una etiqueta neutral, es la ausencia de una decisión.

---

## 1. HTML Semántico

### 1.1 Etiquetas por función, no por apariencia
| Si el contenido ES... | Usa |
|---|---|
| Contenido principal único de la página | `<main>` (uno solo por página) |
| Bloque de navegación con links | `<nav>` |
| Encabezado de página o sección | `<header>` |
| Pie de página o sección | `<footer>` |
| Grupo temático de contenido con heading | `<section>` |
| Contenido autocontenido (tarjeta, post, proyecto) | `<article>` |
| Acción que cambia el estado de la UI | `<button>` |
| Navegación a otro lugar (ruta o ancla) | `<a href="...">` con URL real |
| Contenedor sin función semántica propia | `<div>` o `<span>` — último recurso |

### 1.2 Regla de interactividad
- **¿La acción lleva al usuario a otro lugar?** → `<a href="ruta-real">`
- **¿La acción cambia el estado de la interfaz (abre/cierra/activa)?** → `<button>`
- **`cursor-pointer` en CSS es una promesa visual sin respaldo funcional.** Si necesitas decirle a CSS que algo parece clickeable, primero asegúrate de que sea genuinamente interactivo en HTML.

### 1.3 Jerarquía de headings
- Un solo `<h1>` por página.
- No saltar niveles (`<h1>` → `<h3>` sin `<h2>` intermedio).
- Los headings definen estructura de documento, no tamaño visual — el tamaño lo controla CSS.

### 1.4 `<div>` y `<span>` no tienen significado
Úsalos solo cuando ninguna etiqueta semántica describe correctamente ese bloque.

---

## 2. Accesibilidad — Reglas mínimas no negociables

### 2.1 Elementos interactivos
- Solo `<button>` y `<a>` son focuseables con `Tab` por defecto.
- Un `<div onClick>` excluye completamente a usuarios de teclado y lectores de pantalla.

### 2.2 Imágenes
- Toda `<img>` / `<Image>` necesita `alt` descriptivo del contenido real, no `alt="imagen"` ni `alt=""` (salvo que sea puramente decorativa — en ese caso `alt=""` explícito).

### 2.3 Canvas
- `<canvas>` es invisible para lectores de pantalla — todo lo dibujado con JS son píxeles puros.
- Si el canvas es **decorativo**: agregar `aria-hidden="true"` al contenedor.
- Si el canvas es **contenido**: agregar texto alternativo descriptivo entre `<canvas>...</canvas>`.

### 2.4 Contenido dinámico inyectado por JS
- Si JS modifica contenido visible después de la carga inicial sin que el usuario lo solicitara explícitamente, el contenedor necesita `aria-live="polite"`.
- Agregar `aria-atomic="true"` si el contenido se actualiza incrementalmente (efecto máquina de escribir) para que el lector anuncie el bloque completo, no letra por letra.

### 2.5 Tamaño de fuente y contraste
- Nunca usar texto por debajo de `12px` — ni para contenido secundario.
- Opacidad reducida (ej. `text-bio-text/40`) combinada con fuente pequeña destruye la legibilidad. Son dos penalizaciones acumuladas, no una.

---

## 3. CSS — Reglas del Modelo Real

### 3.1 Especificidad y Cascada
- **Especificidad primero, cascada solo como desempate.**
- Pesos: inline `style=""` (1000) > `#id` (100) > `.clase / [atributo] / :pseudo-clase` (10) > `elemento / ::pseudo-elemento` (1).
- En empate exacto de peso, **gana la regla que aparece después** en el documento (no la primera).
- `!important` ignora toda la jerarquía — usarlo crea deuda técnica. Úsalo solo como último recurso documentado.

### 3.2 Box Model
- Por defecto (`content-box`): `width` define solo el contenido. Padding y border se suman encima.
- Con `border-box`: `width` es el total incluyendo padding y border. Es el estándar moderno (Tailwind lo aplica globalmente).
- **Fórmula `border-box`:** `contenido = width - (padding × 2) - (border × 2)`
- `margin` no es parte del elemento — es espacio externo que empuja vecinos, sin color ni fondo.

### 3.3 Posicionamiento
| Valor | Sale del flujo | Se posiciona respecto a |
|---|---|---|
| `static` (default) | No | N/A — `top/left/etc.` no tienen efecto |
| `relative` | No (deja hueco) | Su propia posición original |
| `absolute` | Sí | Ancestro más cercano con `position` ≠ `static` |
| `fixed` | Sí | El viewport — ignora el scroll siempre |
| `sticky` | Parcial | Fluye normal hasta un punto de scroll, luego se pega |

- **Regla de `absolute`:** si ningún ancestro tiene `position` distinto de `static`, el elemento se posiciona respecto al `<html>` completo — fuente del 90% de los "¿por qué está ahí ese elemento?" en código vibe-codeado.
- **Debuggear "no se ve":** sospechar en orden — (1) tamaño/opacidad/color invisible, (2) `position` que lo saca del área visible, (3) `display:none` / `visibility:hidden`.

### 3.4 Unidades
- `px` = valor absoluto, fijo, sordo a la configuración de accesibilidad del usuario.
- `rem` = relativo al `font-size` de `<html>` — respeta zoom y configuración del navegador. Preferir para fuentes, spacing, gaps.
- `em` = relativo al `font-size` del padre inmediato — se multiplica en anidamiento, usar con cuidado.
- `fr` = fracción del espacio disponible — exclusivo de CSS Grid.

---

## 4. Layout — Flexbox y Grid

### 4.1 Cuándo usar cada uno
- **Flexbox** → alinear elementos en **una sola dirección** (fila o columna). Ideal para componentes internos: navbars, footers, grupos de botones.
- **Grid** → layout **bidimensional** donde filas Y columnas deben alinearse entre sí. Ideal para colecciones de tarjetas, layouts de página.
- Con exactamente 3 elementos fijos, ambos funcionan igual — la diferencia se vuelve crítica cuando la cantidad varía o se necesita alineación bidimensional estricta.

### 4.2 Los dos ejes de Flexbox
- `justify-content` → distribuye en el **eje principal** (definido por `flex-direction`).
- `align-items` → alinea en el **eje cruzado** (perpendicular al principal).
- **Si cambias `flex-direction`, los dos ejes se intercambian** — `justify-content` que antes movía horizontal ahora mueve vertical.
- `justify-content` solo tiene efecto visible si hay **espacio sobrante** en el contenedor — sin espacio sobrante, no tiene nada que distribuir.

### 4.3 flex-grow / flex-shrink / flex-basis
- `flex-basis` → tamaño natural de partida antes de grow/shrink.
- `flex-grow` → proporción de espacio **sobrante** que absorbe cada elemento.
- `flex-shrink` → disposición a encogerse cuando **falta** espacio. `flex-shrink: 0` = nunca encoger.
- `flex: 1` = `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` → reparto igual del espacio disponible.

### 4.4 Grid con fr
- `grid-template-columns: 1fr 2fr 1fr` → divide el espacio en 4 partes (1+2+1), la del medio recibe el doble.
- `repeat(3, 1fr)` → 3 columnas iguales, equivalente a `1fr 1fr 1fr`.

---

## 5. JavaScript del Navegador

### 5.1 DOM
- El DOM no es el código fuente — es el árbol de objetos vivo en memoria que el navegador construyó a partir del HTML.
- El DOM se modifica en tiempo real mientras el usuario interactúa. No es un artefacto estático entregado una vez.
- **Regla de debugging:** cuando algo no se comporta como esperas, la pregunta es "¿qué hay realmente en el DOM ahora mismo?", no "¿qué escribí?".

### 5.2 Eventos y Bubbling
- Los eventos ocurren primero en el elemento más profundo donde se hizo clic (el `target`), y luego **burbujean hacia arriba** por cada ancestro hasta `<html>`.
- El orden de ejecución de los handlers sigue el bubbling (de adentro hacia afuera), **no** el orden en que se registraron con `addEventListener`.
- `event.stopPropagation()` detiene el bubbling — usarlo solo cuando hay un conflicto real confirmado, no "por las dudas".

### 5.3 Closures
- Una función definida dentro de otra **captura** las variables del scope externo y las mantiene vivas en memoria aunque ese scope ya haya terminado.
- **`var`** tiene scope de función — una sola variable compartida por todas las iteraciones de un loop. Todos los closures del loop capturan la misma referencia.
- **`let` / `const`** tienen scope de bloque — una variable nueva por cada iteración. Cada closure captura su propia copia independiente. Preferir siempre.
- Cuando veas una función definida dentro de otra, una función devuelta como valor, o una función pasada como argumento — casi siempre hay un closure en juego.

### 5.4 Async/Await
- JavaScript tiene un solo hilo, pero delega operaciones lentas (fetch, timers, eventos) al navegador — el hilo queda libre para seguir ejecutando código.
- `await` no congela el hilo — lo libera. El código síncrono que viene después de llamar una función `async` se ejecuta antes de que los `await` internos resuelvan.
- Orden de ejecución con `await`:
  ```
  console.log('D');
  miFuncionAsync(); // → ejecuta hasta el primer await, luego pausa
  console.log('E'); // → E se ejecuta ANTES de que los awaits resuelvan
  ```
- Siempre envolver `await` en `try/catch` — las Promises pueden fallar.

---

## 6. Arquitectura — Reglas para sesiones agénticas

### 6.1 Antes de generar cualquier componente
1. **Diagrama antes de código** — definir el árbol de componentes y el flujo de datos antes de escribir una línea.
2. **Una responsabilidad por componente** — si un componente hace más de una cosa, dividirlo.
3. **No duplicar lógica** — si la misma animación/función/comportamiento existe en otro lugar, reutilizarla con parámetros, no copiarla.

### 6.2 Etiquetas para detectar código problemático
| Etiqueta | Señal de alerta |
|---|---|
| `[SEMÁNTICA]` | `<div>` donde debería haber una etiqueta con significado |
| `[LAYOUT]` | CSS que no hace lo que parece, posicionamiento inesperado |
| `[ESTADO]` | Estado en el lugar equivocado, re-renders innecesarios |
| `[TIPADO]` | `any` innecesario, tipos incorrectos, evasión del sistema de tipos |
| `[ARQUITECTURA]` | Componente hace demasiado, lógica duplicada |
| `[PERFORMANCE]` | Renders costosos, animaciones sin cleanup |
| `[ACCESIBILIDAD]` | Falta de `alt`, `aria-live`, elementos no focuseables, contraste insuficiente |
| `[VIBE]` | Código que funciona pero nadie puede explicar por qué |

### 6.3 Checklist antes de aceptar código generado por IA
- [ ] ¿Cada elemento interactivo es `<button>` o `<a>`, no `<div onClick>`?
- [ ] ¿Hay un solo `<h1>` y la jerarquía de headings es correcta?
- [ ] ¿Las imágenes tienen `alt` descriptivo?
- [ ] ¿Los `<canvas>` tienen fallback o `aria-hidden`?
- [ ] ¿El contenido dinámico inyectado por JS tiene `aria-live`?
- [ ] ¿Hay lógica duplicada que debería ser un componente reutilizable?
- [ ] ¿Hay algún `any` en TypeScript que se pueda tipar correctamente?
- [ ] ¿Puedo explicar en una oración qué hace cada función/componente?

---

*Generado al cierre de Fase 0 — Auditoría y Fundamentos Reales*
