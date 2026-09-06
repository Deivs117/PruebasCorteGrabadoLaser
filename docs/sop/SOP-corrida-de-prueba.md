# SOP — Corrida de Prueba de Corte/Grabado Láser

**Una página. Imprimir y tener junto a la máquina.** Sigue el orden — no te saltes un paso aunque parezca obvio.

---

## Datos de la corrida (completar antes de empezar)

| Campo | Valor |
|---|---|
| Archivo `.gcode` usado | |
| `corrida_id` (nombre del archivo, sin extensión) | |
| Material / espesor | |
| Operación (corte / grabado) | |
| Lote | |
| Operador | |
| Fecha | |

---

## A. Antes de correr

- [ ] Placa cortada al tamaño del cupón de prueba (ver esquina inferior izquierda del `.gcode` como origen).
- [ ] Placa nivelada y fijada; sin alabeo visible.
- [ ] Foco ajustado con la galga de calibración correspondiente al espesor.
- [ ] Origen de trabajo puesto en X0 Y0 en el software de envío (**Home** o **Set Origin** en LaserGRBL; equivalente en Candle).
- [ ] Asistencia de aire encendida y con flujo audible (mínimo 27 L/min).
- [ ] Extracción de humos encendida.
- [ ] Enchufe inteligente (toma eléctrica) conectado y visible — **obligatorio, no opcional**: es la única forma de medir el kWh de la corrida, ya que no tiene ningún endpoint accesible para leerlo automáticamente.

## B. Justo antes de dar "Run"

- [ ] **Lectura del medidor (kWh acumulados) al inicio:** ______________
  *(Si no hay lectura disponible ese día, escribir "N/D" — el sistema tiene un respaldo automático, no se inventa un número.)*
- [ ] Archivo `.gcode` correcto cargado en LaserGRBL o Candle (verificar nombre en la barra de título / lista de archivo).

## C. Correr

- [ ] Dar **Run**. No dejar la máquina sin supervisión.
- [ ] Si algo se ve mal (llama sostenida, atasco, olor fuera de lo normal): **detener con Reset/Feed Hold**, no esperar a que termine.

## D. Justo al terminar

- [ ] **Tiempo real de la corrida:** ______ segundos *(lo muestra LaserGRBL o Candle al terminar — Candle además lo deja como registro consultable después; en ningún caso hace falta cronometrar aparte).*
- [ ] **Lectura del medidor (kWh acumulados) al final:** ______________
- [ ] **kWh de esta corrida** = lectura final − lectura inicial = ______________
- [ ] Apagar asistencia de aire y extracción solo después de que la placa deje de humear.
- [ ] Retirar la placa y dejarla enfriar antes de manipular.

## E. Evaluar el cupón (con la placa ya fría, sin prisa)

Por cada celda identificada por su ID grabado (`C-001`, `C-002`, ...), completar:

| ID celda | ¿Corte pasante? (si/no) | Carbonización (1-5) | Notas |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

*(Fotocopiar o extender la tabla según el número de celdas de la suite. Escala de carbonización: 1 = sin hollín visible, 5 = negro carbonizado que ensucia al tacto. No hay columna aparte de "calidad de borde": si el corte no pasa, el borde ya queda mal por definición — `corte_pasante` cubre eso.)*

- [ ] Foto general de la placa completa, con buena luz, antes de desarmar/cortar los cupones.

## F. Cargar los resultados

**Vía normal — Hoja de Registro de la app web:**

1. Abrir **Hoja de Registro** (menú lateral) y ubicar esta corrida (por `corrida_id`).
2. Cargar, para **toda la corrida por igual**: `kwh_corrida_medido` y `tiempo_real_corrida_s` (los valores del paso D).
3. Completar, **fila por fila** según la tabla de la sección E: `corte_pasante`, `carbonizacion_1a5`, `notas`, y la foto general.
4. Guardar. Desde ahí, **Costeo** ya puede calcular el costo real de la corrida (si las Tarifas están cargadas).

**Vía CLI — solo si no hay acceso a la app web** (mismo resultado, editando el `_registro.csv` a mano):

```
make prepare-record CSV=data/registros/<corrida>.csv
# completar a mano el _registro.csv resultante (mismos campos que arriba)
make compute-costs CSV=data/registros/<corrida>_registro.csv TARIFAS=configs/tarifas.yaml
```

---

Para el proceso completo (con qué pantalla de la app corresponde a cada paso) y un glosario de términos, ver la sección **Ayuda** de la app web (menú lateral).
