# Prompts para Stitch AI — GUI de Laser Toolkit

Pega los prompts **en orden**, uno a la vez, en el mismo proyecto de Stitch. El
**Prompt 0** fija el sistema de diseño (paleta Flux) y genera el Dashboard; los
siguientes reutilizan ese mismo sistema para que todas las pantallas salgan
consistentes.

Paleta tomada de `UNEyRoles.html` (manual de marca Flux):

| Token | Hex | Uso sugerido en Laser Toolkit |
|---|---|---|
| `--color-deep-space` | `#003452` | Navy principal — headers, texto principal, sidebar |
| `--color-sapphire-sky` | `#246BCE` | Azul primario — acciones, links, acentos de sección |
| `--color-light-sea-green` | `#1FC1B1` | Teal — estados "OK / Calibrado / Listo" |
| `--color-juan` (naranja) | `#FF9F43` | Advertencias — "Pendiente", tarifas sin definir |
| `--color-ktalyna` (púrpura) | `#E056FD` | Acento de rol financiero / Tarifas |
| `--bg-canvas` | `#F4F7F9` | Fondo general de la app |
| `--bg-surface` | `#FFFFFF` | Fondo de cards/paneles |
| `--border-color` | `#E2E8F0` | Bordes sutiles |
| `--text-main` | `#003452` | Texto principal |
| `--text-muted` | `#5A7184` | Texto secundario |
| Tipografía UI | `Urbanist` (300–800) | Textos, títulos |
| Tipografía numérica | `DM Mono` | Velocidades, potencias, costos, datos técnicos |
| Radios | `6px / 12px / 18px` | sm / md / lg |

---

## Prompt 0 — Sistema de diseño + Dashboard

```
Diseña una aplicación web de escritorio (no móvil) llamada "Laser Toolkit" para
un taller industrial que opera una CNC láser (corte y grabado). Es una
herramienta de uso interno para técnicos de taller y un rol financiero.

PALETA DE COLOR EXACTA (usar estos hex, no inventar otros):
- Navy principal (headers, sidebar, texto principal): #003452
- Azul primario (botones de acción, links, acentos): #246BCE
- Teal (estados positivos: "Listo", "Calibrado", "OK"): #1FC1B1
- Naranja (estados de advertencia: "Pendiente", "Sin definir"): #FF9F43
- Púrpura (acento del módulo financiero/Tarifas, uso puntual): #E056FD
- Fondo general de la app: #F4F7F9
- Fondo de tarjetas/paneles: #FFFFFF
- Bordes sutiles: #E2E8F0
- Texto principal: #003452 · Texto secundario/muted: #5A7184

Tipografía: "Urbanist" (pesos 300 a 800) para toda la interfaz, y "DM Mono"
específicamente para datos numéricos (velocidades mm/min, potencias %, costos,
coordenadas) para que se distingan visualmente de las etiquetas.

Estilo visual: TEMA CLARO, limpio y técnico-industrial (no oscuro, no
genérico tipo SaaS). Tarjetas blancas con bordes redondeados suaves (12-18px),
sombra sutil, borde izquierdo de 4px en color de acento para encabezados de
sección (igual que un "section-header" con barra lateral azul). Headers de
tarjeta con fondo navy (#003452) o degradado navy→azul (#003452 a #246BCE) y
texto blanco. Badges de rol/estado tipo píldora redondeada. Iconografía
lineal/técnica, sin ilustraciones decorativas.

Layout general: sidebar izquierdo fijo color navy (#003452) con ítems de
navegación en texto blanco/gris claro e ícono, resaltando el activo con un
fondo azul (#246BCE) sutil. Top bar blanco con breadcrumb y buscador global.
Contenido principal sobre fondo #F4F7F9 con tarjetas blancas.

Genera la pantalla de DASHBOARD / INICIO con:
- Sidebar con estas secciones: Inicio, Suites de Prueba, Grabado Vectorial (SVG),
  Hoja de Registro, Costeo, Final Run (Calibración), Fichas de Parámetro,
  Materiales, Máquina, Historial, Reportes, Tarifas, Ayuda.
- 4 tarjetas de resumen arriba: "Suites generadas esta semana", "Registros
  pendientes de completar", "Final Runs en curso (ej. 2/3 ejecuciones)",
  "Fichas calibradas vs pendientes" — cada número en tipografía DM Mono grande.
- Tabla de estado de roadmap (fases F1 a F7) con badges: teal (#1FC1B1) para
  "Listo", naranja (#FF9F43) para "Pendiente".
- Panel de alertas con avisos en tono naranja: "3 registros con celdas sin
  evaluar", "tarifa_hora_maquina sin definir".
- Botones de acceso rápido en azul (#246BCE): "Nueva Suite de Corte", "Nueva
  Suite de Grabado", "Importar SVG", "Nueva Final Run".
```

---

## Prompt 1 — Wizard de nueva suite

```
Mismo sistema de diseño y paleta de "Laser Toolkit" (navy #003452, azul
#246BCE, teal #1FC1B1, naranja #FF9F43, fondo #F4F7F9, tipografía Urbanist +
DM Mono para datos). Diseña un wizard de varios pasos (stepper horizontal
arriba, paso activo en azul #246BCE, pasos completados en teal #1FC1B1) para
"Nueva Suite de Prueba":

Paso 1: toggle Corte/Grabado.
Paso 2: dropdown de material + input numérico de espesor (mm).
Paso 3: grid de barrido — chips editables (fondo azul claro, texto navy) para
lista de velocidades (mm/min) y lista de potencias (%), stepper de pasadas.
Paso 4: tamaño de celda (mm) y espaciado (mm), con preview en vivo de la
grilla resultante como un canvas con celdas rotuladas en DM Mono.
Paso 5 (solo si Grabado): radio "Relleno genérico" vs "Importar SVG", con
dropdown de modo (contorno / relleno / contorno y relleno) y slider de
resolución de relleno.
Paso 6: resumen — total de celdas, tiempo estimado total, botón "Generar"
grande en azul (#246BCE) con hover más oscuro.
```

---

## Prompt 2 — Visor de G-code 2D

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla de
"Detalle de Suite" con un canvas grande a la izquierda sobre fondo blanco
mostrando un toolpath 2D: líneas sólidas de color (degradado de azul a
naranja según potencia) para corte/grabado y líneas punteadas gris claro para
desplazamiento en vacío. Controles de zoom/pan flotantes sobre el canvas
(botones circulares blancos con borde sutil). A la derecha, panel lateral con
tabla de celdas (velocidad, potencia, pasadas, área mm², tiempo estimado) en
tipografía DM Mono, ordenable por columna. Botones "Descargar G-code",
"Descargar CSV" en azul, "Preparar Registro" como botón primario destacado.
```

---

## Prompt 3 — Importador SVG

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla
"Grabado Vectorial (SVG)" con zona de drag&drop arriba (borde punteado azul
#246BCE, ícono de subida). Debajo, preview dividido en dos columnas
sincronizadas sobre fondo blanco: "SVG original" a la izquierda y "Toolpath
resultante" (contorno + trama de relleno) a la derecha, con línea divisoria
sutil. Panel de parámetros abajo: ancho/alto mm, velocidad, potencia (inputs
en DM Mono), modo de grabado (dropdown), resolución de relleno (slider azul).
Un banner de advertencia con fondo naranja claro (#FF9F43 al 15% de opacidad)
y borde naranja para errores de conversión (ej. "arco SVG no soportado").
Galería de miniaturas de SVGs guardados al final, en tarjetas pequeñas
blancas con borde redondeado.
```

---

## Prompt 4 — Hoja de Registro (grid editable)

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla
"Hoja de Registro" con una tabla tipo hoja de cálculo, una fila por celda de
prueba: columnas "corte pasante" (toggle azul), "calidad de borde" (rating
1-5 con estrellas en naranja), "carbonización" (rating 1-5), "foto"
(thumbnail circular + botón subir), "notas" (texto). Barra de progreso arriba
en teal (#1FC1B1) "12/20 celdas evaluadas". Panel inferior fijo (sticky, fondo
navy claro) con dos campos de corrida completa: kWh medido y tiempo real
(segundos), en DM Mono.
```

---

## Prompt 5 — Costeo

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla
"Costeo" con selectores arriba (registro + archivo de tarifas) y una tabla en
DM Mono con columnas: costo energía, costo material, costo tiempo máquina,
costo total por celda — las celdas sin tarifa definida se ven vacías/gris
claro con un ícono de advertencia naranja y tooltip "tarifa no definida".
Debajo, un heatmap velocidad x potencia coloreado con una escala que va de
teal (#1FC1B1, más barato) a naranja (#FF9F43, más caro).
```

---

## Prompt 6 — Final Run / Calibración

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla
"Final Run" con una lista de grupos de calibración en tarjetas blancas, cada
una mostrando progreso "2/3 ejecuciones" con un badge píldora: teal
(#1FC1B1) para "CALIBRADO", naranja (#FF9F43) para "PENDIENTE". Al
seleccionar un grupo, panel de detalle con gráfico de barras con error bars
(barras en azul #246BCE, error bars en navy) mostrando kWh por unidad y
tiempo por unidad entre ejecuciones, con su desviación estándar y CV% en
etiquetas DM Mono.
```

---

## Prompt 7 — Tarifas (rol financiero)

```
Mismo sistema de diseño y paleta de "Laser Toolkit", pero con un indicador
visual de "acceso restringido" (ícono de candado + badge púrpura #E056FD
"Rol Financiero" junto al título de la pantalla). Diseña un formulario
simple: moneda, tarifa eléctrica por kWh, tarifa hora-máquina (inputs en DM
Mono con prefijo de moneda). Tabla de precio de material por m² indexada por
material+espesor, con filas donde el valor puede estar "sin definir" (texto
gris itálico en vez de un número). Historial de cambios abajo tipo timeline
vertical con línea navy y puntos púrpura.
```

---

## Prompt 8 — Materiales

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla
"Materiales" con una librería en grid de tarjetas (grid-4 tipo las
executive-card: borde superior de color, avatar/ícono circular con la
inicial del material, ej. "MDF" en navy). Cada tarjeta muestra: nombre del
material, espesores disponibles (chips pequeños), y badges indicando qué
operaciones tienen datos (Corte / Grabado) en azul o gris según si ya hay
suite/ficha generada. Al hacer click, un panel de detalle lateral (drawer
deslizante desde la derecha) con la "ficha técnica" del material: parámetros
optomecánicos, comportamiento térmico, notas — en formato de texto con
subtítulos navy y cuerpo en gris muted.
```

---

## Prompt 9 — Máquina

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla de
configuración "Máquina" con un formulario centrado en una tarjeta blanca
ancha: laser_max_s, travel_feed_mm_min, potencia_modulo_w,
factor_utilizacion_laser — cada campo con su descripción técnica en texto
muted debajo (tamaño pequeño), inputs numéricos en DM Mono con unidades como
sufijo (mm/min, W, %). Arriba, un selector de "Perfil de máquina" tipo tabs
(por si hay más de una CNC en el futuro), con el perfil activo resaltado en
azul. Al final, una sección atenuada/deshabilitada (opacidad reducida, con
badge "Próximamente") para "Conexión directa a LaserGRBL — enviar G-code y
ver progreso".
```

---

## Prompt 10 — Historial de datos

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla
"Historial" tipo explorador de archivos con panel de filtros a la izquierda
(material, fecha con date-range picker, operación, estado: Generada/
Registrada/Costeada/Calibrada como checkboxes con badges de color) y una
tabla/grid principal a la derecha con miniaturas de las corridas: nombre de
archivo en DM Mono, fecha, material+espesor, badge de estado, y un ícono de
foto si tiene evidencia fotográfica adjunta. Barra de búsqueda global arriba
con ícono de lupa.
```

---

## Prompt 11 — Reportes

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña un dashboard de
"Reportes" con: un gráfico de barras comparando costo promedio por material y
operación (barras en azul #246BCE y teal #1FC1B1 alternadas), un gráfico de
líneas mostrando evolución de calibración de energía (kWh por unidad) en el
tiempo por combinación material/operación, y una tabla resumen exportable
abajo con totales de corridas, costo acumulado y ahorro estimado tras
calibrar. Botones de exportar a Excel/PDF en la esquina superior derecha, en
azul con ícono de descarga.
```

---

## Prompt 12 — Fichas de Parámetro Estándar

```
Mismo sistema de diseño y paleta de "Laser Toolkit". Diseña una pantalla
"Fichas de Parámetro Estándar" con un grid de tarjetas por material/espesor/
operación: cada tarjeta con un badge de estado (teal "Oficial" / naranja "En
revisión"), velocidad y potencia oficiales en DM Mono grande, y un pequeño
ícono de link hacia el Final Run que la respalda. Al seleccionar una, un
panel de detalle con: parámetros oficiales en una tabla, origen (grupo de
calibración con link), costo estándar resultante, fecha de validación, y un
botón "Exportar a PDF" en azul. Incluye también, en la parte superior, un
botón "Nueva Ficha" que abre un editor con formulario a la izquierda y
preview en Markdown renderizado a la derecha.
```

---

## Consejos de uso en Stitch

- Pega el **Prompt 0 primero** y espera a que genere; recién ahí sigue con
  los siguientes en el mismo hilo/proyecto, para que reutilice la paleta y
  componentes ya creados en vez de reinventar el estilo en cada pantalla.
- Si alguna pantalla sale desviada de la paleta, agrega al final del prompt:
  `"mantén exactamente los mismos colores hex, tipografía y sidebar que la
  pantalla anterior"`.
- Los hex están fijados a propósito (Stitch a veces "interpreta" un color en
  vez de usarlo literal) — si el resultado se aleja mucho, repite el prompt
  citando el hex entre backticks.
- Deja fuera de este lote las pantallas que dependen de features que el
  backend aún no tiene (envío directo a LaserGRBL, importar imagen raster) —
  ya están marcadas como "Próximamente" dentro del Prompt 9 y no vale la pena
  bocetarlas a fondo todavía.
