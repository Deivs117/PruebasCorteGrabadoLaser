# Propuesta: animar todos los íconos de la app

**Estado: backlog, sin implementar.** Esto es una lista de ideas para que el
técnico las revise y refine — no se construye nada de esto hasta que se
confirme cuáles quedan y con qué ajustes. Nace de la primera tanda de
íconos animados (papelera, tijera, fuego, duplicar, lápiz), que salió bien
y se quiere extender a toda la app.

## Cómo se construyen (mecánica, ya probada)

Sin librerías nuevas — mismo mecanismo en los 5 ya hechos:

- El ícono se reconstruye como SVG propio (no el de `lucide-react`), con
  las partes que se van a mover separadas en sus propios `<g>`.
- El botón/tarjeta que lo contiene lleva la clase `group` (ya la trae
  `iconButtonClasses`); el ícono reacciona con `group-hover:`.
- Movimiento simple (una sola apertura/cierre) → `transition-transform` +
  clase condicional. Movimiento en loop mientras dura el hover (parpadeo,
  meneo, tijeretazo repetido) → `@keyframes` en `globals.css` +
  `group-hover:animate-[nombre_duración_easing_infinite]`.
- Todo respeta `prefers-reduced-motion` automáticamente (la regla global
  en `globals.css` ya frena cualquier animación/transición a ~0ms).

## Ya implementado

| Ícono | Dónde | Animación |
|---|---|---|
| Papelera (`Trash2`) | Botones "Eliminar" (Suites, SVGs, corridas, Final Run) | La tapa se abre al pasar el mouse. |
| Tijera (`Scissors`) | Selector de operación "Corte" | Cerrada en reposo; al pasar el mouse, abre y cierra en loop (tijeretazo repetido). |
| Fuego (`Flame`) | Selector de operación "Grabado" | Parpadea/flamea en loop y cambia gradualmente a color naranja, como prendiéndose. |
| Duplicar (`Copy`) | Botón "Duplicar suite" | El cuadro de atrás se desliza y se separa del de adelante. |
| Lápiz (`Pencil`) | Botón "Editar suite" | Meneo muy sutil, como escribiendo. |

## Propuestas para el resto

Agrupadas por dónde aparecen. La columna "Esfuerzo" es una estimación
gruesa de cuánto trabajo de "afinar a ojo" lleva cada uno (bajo = un par de
iteraciones, alto = necesita varias vueltas para que se vea bien).

### Navegación (sidebar)

| Ícono | Dónde | Propuesta | Esfuerzo |
|---|---|---|---|
| `Home` | Inicio | Al pasar el mouse, un leve "asentamiento" (el techo baja 1-2px y vuelve), como si la casa se posara. | Bajo |
| `FlaskConical` | Suites de Prueba | Una o dos burbujas chiquitas suben dentro del frasco en loop mientras dura el hover. | Medio |
| `Shapes` | Grabado Vectorial (SVG) | Las 2-3 formas rotan levemente y de forma escalonada (stagger chico), como "tomando forma". | Medio |
| `ClipboardList` | Hoja de Registro | Una de las líneas de la lista se "tilda" (aparece un check chico al lado) al pasar el mouse. | Medio |
| `Calculator` | Costeo | Una de las teclas del teclado numérico se hunde (translateY chico) al pasar el mouse, como si se presionara. | Bajo |
| `Gauge` | Final Run (Calibración) | **Pedido explícito del técnico:** la aguja arranca baja y barre hasta el máximo: al llegar, se transforma en (o aparece) un check chico — referencia visual a "calibración cumplida". Animación de dos actos (barrido + confirmación), no solo un movimiento continuo. | Alto |
| `FileBadge` | Fichas de Parámetro | Un destello (brillo diagonal) recorre la medalla una vez al pasar el mouse. | Bajo |
| `Layers` | Materiales | Las capas se separan levemente en el eje Y (efecto "vista explotada") al pasar el mouse. | Medio |
| `Settings2` | Máquina | El control deslizante/engranaje gira o se desliza levemente en loop mientras dura el hover, como ajustando. | Medio |
| `History` | Historial | La manecilla del reloj da una vuelta completa al pasar el mouse. | Bajo |
| `BarChart3` | Reportes | Las barras "crecen" de abajo hacia arriba, escalonadas, al pasar el mouse. | Medio |
| `CircleDollarSign` | Tarifas | El símbolo de moneda hace un pequeño rebote vertical (como si cayera una moneda) al pasar el mouse. | Bajo |
| `HelpCircle` | Ayuda | El signo de pregunta se balancea suave (rotate chico, loop lento) — invita a hacer click. | Bajo |

### Acciones y feedback (usados en varias pantallas)

| Ícono | Dónde | Propuesta | Esfuerzo |
|---|---|---|---|
| `ArrowLeft` | Volver (BackLink) | Se desliza 2-3px hacia la izquierda al pasar el mouse, reforzando la dirección. | Bajo |
| `Download` | Descargar CSV/G-code | La flecha "cae" hacia la bandeja (translateY) al pasar el mouse. | Bajo |
| `Filter` | Chips de filtro por material | Vibración/goteo muy sutil al pasar el mouse sobre la leyenda. | Bajo |
| `Check` | Paso completado del wizard | Se dibuja progresivamente (stroke-dashoffset) en vez de aparecer de golpe, la primera vez que el paso se marca como listo. | Medio |
| `CircleCheck` | Confirmaciones de éxito (suite generada, registro guardado) | Aparece con un "pop" (scale-in con rebote chico) — sigue el patrón "Success State" que ya usa el skill de motion. | Bajo |
| `TriangleAlert` | Errores y advertencias | Al aparecer, un temblor horizontal corto (2-3 oscilaciones, sin rebote) — patrón "Error Shake". | Bajo |
| `X` | Cerrar foto / quitar chip | Gira 90° al pasar el mouse, como "confirmando" el cierre antes del click. | Bajo |
| `Minus` / `Plus` | Contador de pasadas, Tarifas | Al hacer click, un "+1"/"-1" chico aparece y flota hacia arriba/abajo desvaneciéndose (feedback tipo contador). | Medio |
| `Square` | Paso "Geometría genérica" del wizard | Gira 90° suave al pasar el mouse. | Bajo |
| `Star` | Calificación de carbonización | Al pasar el mouse sobre una estrella, esa y las anteriores hacen un "pop" en cascada (patrón común de rating). | Medio |
| `Camera` | Subir foto en Hoja de Registro | El diafragma "parpadea" (flash breve) al pasar el mouse. | Medio |
| `UploadCloud` | Subir SVG | La flecha sube hacia la nube en loop lento mientras se arrastra un archivo encima; rebote chico al soltarlo. | Medio |

### Íconos de familia de material (decorativos, prioridad baja)

`Atom` (polímero), `TreePine` (madera) y `Magnet` (metal) en los chips de
`MaterialIcon` ya llevan color e identidad — son indicadores, no botones de
acción, así que una animación acá es puramente decorativa. Si se quiere de
todos modos: `Atom` con un electrón orbitando lento, `TreePine` con una
hoja cayendo, `Magnet` con líneas de campo pulsando. Baja prioridad frente
al resto de la lista.

`Loader2` (spinner) ya está siempre animado (gira mientras dura la carga)
— no necesita una propuesta nueva.

## Siguiente paso

Ninguno todavía — esto queda para que el técnico marque cuáles quiere
(todos, algunos, o ninguno por ahora) y en qué orden, antes de construir
nada.
