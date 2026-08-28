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
- [ ] Origen de trabajo puesto en X0 Y0 en LaserGRBL (**Home** o **Set Origin**, según el flujo del taller).
- [ ] Asistencia de aire encendida y con flujo audible (mínimo 27 L/min).
- [ ] Extracción de humos encendida.
- [ ] Enchufe inteligente conectado y visible (si aplica).

## B. Justo antes de dar "Run"

- [ ] **Hora de inicio:** ______ : ______
- [ ] **Lectura del medidor (kWh acumulados) al inicio:** ______________
  *(Si no hay lectura disponible ese día, escribir "N/D" — el sistema tiene un respaldo automático, no se inventa un número.)*
- [ ] Archivo `.gcode` correcto cargado en LaserGRBL (verificar nombre en la barra de título).

## C. Correr

- [ ] Dar **Run**. No dejar la máquina sin supervisión.
- [ ] Si algo se ve mal (llama sostenida, atasco, olor fuera de lo normal): **detener con Reset/Feed Hold**, no esperar a que termine.

## D. Justo al terminar

- [ ] **Hora de fin:** ______ : ______ → **Tiempo real de la corrida:** ______ segundos *(LaserGRBL lo muestra al terminar; ese es el dato bueno, no lo estimes a ojo)*
- [ ] **Lectura del medidor (kWh acumulados) al final:** ______________
- [ ] **kWh de esta corrida** = lectura final − lectura inicial = ______________
- [ ] Apagar asistencia de aire y extracción solo después de que la placa deje de humear.
- [ ] Retirar la placa y dejarla enfriar antes de manipular.

## E. Evaluar el cupón (con la placa ya fría, sin prisa)

Por cada celda identificada por su ID grabado (`C-001`, `C-002`, ...), completar:

| ID celda | ¿Corte pasante? (si/no) | Calidad de borde (1-5) | Carbonización (1-5) | Notas |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

*(Fotocopiar o extender la tabla según el número de celdas de la suite. Escala de calidad de borde: 1 = inaceptable, 5 = corte limpio tipo tostado uniforme. Escala de carbonización: 1 = sin hollín visible, 5 = negro carbonizado que ensucia al tacto.)*

- [ ] Foto general de la placa completa, con buena luz, antes de desarmar/cortar los cupones.

## F. Cargar los resultados (en el computador)

1. `make prepare-record CSV=<archivo generado por generate-cut/generate-engrave>` (si todavía no se hizo antes de imprimir esta hoja).
2. Abrir el `_registro.csv` resultante y completar, para **todas las filas de esta corrida por igual**:
   - `kwh_corrida_medido` = el valor calculado en el paso D.
   - `tiempo_real_corrida_s` = el valor del paso D.
3. Completar, **fila por fila** según la tabla de la sección E:
   - `corte_pasante`, `calidad_borde_1a5`, `carbonizacion_1a5`, `notas`.
   - `foto` = nombre/ruta del archivo de la foto general.
4. Guardar el archivo.

---

**Referencia rápida (no es parte del checklist del taller, es para quien procesa los datos después):**

```
make prepare-record CSV=data/registros/<corrida>.csv
make compute-costs CSV=data/registros/<corrida>_registro.csv TARIFAS=configs/tarifas.yaml
```

Ver `README.md` y `docs/Plan Maestro - Estandarizacion Pruebas Laser.md` para el detalle completo del flujo.
