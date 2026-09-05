# Propuesta: animar todos los íconos de la app

**Estado: implementado.** Todo el backlog de esta tanda (navegación +
acciones/feedback) quedó construido, salvo los íconos decorativos de
familia de material (`Atom`/`TreePine`/`Magnet`), que el técnico dejó
explícitamente afuera por ahora. Nace de la primera tanda de íconos
animados (papelera, tijera, fuego, duplicar, lápiz), que salió bien y se
extendió a toda la app.

## Cómo se construyen (mecánica)

Sin librerías nuevas:

- El ícono se reconstruye como SVG propio (no el de `lucide-react`), con
  las partes que se van a mover separadas en sus propios `<g>` -- salvo
  cuando el movimiento es del ícono completo (ej. rotar, deslizar), donde
  alcanza con envolver el SVG en una sola clase de transición.
- El botón/tarjeta/ítem que lo contiene lleva la clase `group` (la traen
  `iconButtonClasses` y `buttonClasses`; se agregó a mano donde el
  contenedor no pasa por esos helpers); el ícono reacciona con
  `group-hover:`.
- Movimiento simple (una sola apertura/cierre, un giro) →
  `transition-transform` + clase condicional. Movimiento en loop mientras
  dura el hover (parpadeo, meneo, burbujas) → `@keyframes` en
  `globals.css` + `group-hover:animate-[nombre_duración_easing_infinite]`.
  Movimiento de una vez al **montarse** (no al hover) -- confirmaciones de
  éxito, errores, un paso que se completa -- usa la misma keyframe pero
  aplicada directo vía `style={{ animation: ... }}`, sin `group-hover`: el
  componente que lo usa solo monta el ícono cuando el evento real ocurrió.
- Todo respeta `prefers-reduced-motion` automáticamente (la regla global
  en `globals.css` ya frena cualquier animación/transición a ~0ms).

## Implementado

### Primera tanda

| Ícono | Dónde | Animación |
|---|---|---|
| Papelera (`Trash2`) | Botones "Eliminar" (Suites, SVGs, corridas, Final Run) | La tapa se abre al pasar el mouse. |
| Tijera (`Scissors`) | Selector de operación "Corte" | Cerrada en reposo; al pasar el mouse, abre y cierra en loop (tijeretazo repetido). |
| Fuego (`Flame`) | Selector de operación "Grabado" | Parpadea/flamea en loop y cambia gradualmente a color naranja, como prendiéndose. |
| Duplicar (`Copy`) | Botón "Duplicar suite" | El cuadro de atrás se desliza y se separa del de adelante. |
| Lápiz (`Pencil`) | Botón "Editar suite" | Meneo muy sutil, como escribiendo. |

### Navegación (sidebar)

| Ícono | Dónde | Animación |
|---|---|---|
| `Home` | Inicio | El techo+paredes baja 1-2px y vuelve al pasar el mouse; la puerta queda fija. |
| `FlaskConical` | Suites de Prueba | Dos burbujas suben y desvanecen en loop dentro del frasco mientras dura el hover. |
| `Shapes` | Grabado Vectorial (SVG) | El triángulo y el cuadrado rotan escalonados; el círculo (simétrico, rotarlo no se nota) se agranda en su lugar. |
| `ClipboardList` | Hoja de Registro | La última línea de la lista se oculta y en su lugar aparece un check chico con un "pop". |
| `Calculator` | Costeo | La tecla central se hunde (translateY) al pasar el mouse. |
| `Gauge` | Final Run (Calibración) | **Pedido explícito del técnico:** la aguja barre una vez hasta el máximo y, recién al terminar (`transition-delay`), aparece un check chico debajo -- animación de dos actos. |
| `FileBadge` | Fichas de Parámetro | Un brillo diagonal recorre la medalla una vez, recortado a su círculo con un `clipPath`. |
| `Layers` | Materiales | Las capas se separan en el eje Y (vista explotada) al pasar el mouse. |
| `Settings2` | Máquina | Es un par de controles deslizantes, no engranajes con dientes -- la perilla derecha se desliza en vaivén sobre su riel en loop; la izquierda queda fija. |
| `History` | Historial | La manecilla del reloj da una vuelta completa (una vez) al pasar el mouse. |
| `BarChart3` | Reportes | Las 3 barras "crecen" de nuevo desde la base, escalonadas, al pasar el mouse. |
| `CircleDollarSign` | Tarifas | El símbolo completo rebota verticalmente una vez, como una moneda cayendo. |
| `HelpCircle` | Ayuda | El signo de pregunta se balancea suave en loop lento mientras dura el hover. |

### Acciones y feedback

| Ícono | Dónde | Animación |
|---|---|---|
| `ArrowLeft` | Volver (BackLink) | Se desliza hacia la izquierda al pasar el mouse. |
| `Download` | Descargar CSV/G-code | La flecha (separada de la bandeja) cae hacia ella al pasar el mouse. |
| `Filter` | Leyenda de chips de filtro por material (Suites, Hoja de Registro) | Vibración/goteo sutil en loop sobre la leyenda completa. |
| `Check` | Paso completado del wizard | Se dibuja progresivamente con `stroke-dashoffset` (`pathLength={1}` normaliza el largo del trazo) al quedar listo. |
| `CircleCheck` | Confirmaciones de éxito (suite generada, ejecución de Final Run generada) | "Pop" con rebote chico al montarse -- no depende de hover, solo se monta cuando el éxito es real. |
| `TriangleAlert` | Errores y advertencias (8 puntos: banner, botones de generar/calcular/preparar, resumen de calibración, tabla de costeo, wizard, SVG workspace) | Temblor horizontal corto al aparecer (patrón "Error Shake"), reemplazado por un único componente reusable. |
| `X` | Quitar foto (Hoja de Registro), quitar chip de velocidad/potencia, quitar fila de material (Tarifas) | Gira 90° al pasar el mouse. |
| `Minus` / `Plus` | Contador de pasadas (`NumberStepper`) | Al hacer click, un "+1"/"-1" flota hacia arriba y se desvanece (`useContadorFeedback`, se retira solo del DOM al terminar la animación). |
| `Square` | Paso "Geometría genérica" del wizard | Gira 90° suave al pasar el mouse. |
| `Star` | Calificación de carbonización | Al pasar el mouse sobre una estrella, esa y las anteriores escalan con un `transition-delay` creciente hacia atrás -- efecto cascada sin necesitar una keyframe. |
| `Camera` | Subir/reemplazar foto en Hoja de Registro | El diafragma tiene un flash breve (círculo que aparece y desvanece) al pasar el mouse. |
| `UploadCloud` | Subir SVG (dropzone) | La flecha sube hacia la nube en loop mientras se arrastra un archivo encima (`sobreZona`, estado real); rebote chico al soltarlo/elegirlo. |

### Ajustes hechos sobre la propuesta original

- **`Settings2`**: la propuesta hablaba de "engranaje", pero el ícono de
  lucide es en realidad dos controles deslizantes (círculo + riel, sin
  dientes) -- se implementó como deslizamiento, no como giro.
- **Círculo de `Shapes`**: un círculo es simétrico, así que "rotarlo" no
  se nota -- se cambió por un agrandamiento (`scale`) en su lugar.
- **`Plus` de Tarifas**: el documento agrupaba "Contador de pasadas,
  Tarifas" bajo un mismo ícono, pero el `Plus` de Tarifas es "agregar una
  fila de material" (no un contador +/-) -- se dejó sin el feedback
  flotante, que sí se implementó en `NumberStepper` (pasadas del láser).

### Fuera de esta tanda

`Atom` (polímero), `TreePine` (madera) y `Magnet` (metal) en los chips de
`MaterialIcon`: decorativos, prioridad baja, el técnico los dejó afuera al
confirmar el alcance de esta tanda.

`Loader2` (spinner) ya estaba siempre animado -- no necesitaba nada nuevo.
