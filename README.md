# Pruebas de Corte y Grabado Láser

Proyecto interno para estandarizar, documentar y costear los procesos de corte y grabado láser (CNC 3018 + módulo Laser Tree LT-80W-F45, controlado con LaserGRBL).

## Objetivo

Que ejecutar una prueba sea solo **"abrir un G-code y enviarlo"**, que cada corrida quede documentada y costeada (energía + material + tiempo de máquina), y que el resultado se convierta en **Fichas de Parámetro Estándar** oficiales por material/espesor/operación — reemplazando el ajuste "a ojo" por un proceso repetible y auditable.

El sistema está diseñado para ser **agnóstico al material**: hoy arranca con MDF, pero la estructura (script generador, hoja de registro, fichas) escala a acrílico, contrachapado, cuero, cartón, etc. sin rediseñar nada.

## Estructura del repositorio

```
.
├── docs/
│   ├── Plan Maestro - Estandarizacion Pruebas Laser.md   ← arquitectura completa del sistema
│   ├── sop/                                               ← protocolos de una página para el taller
│   └── materiales/
│       └── MDF/
│           ├── Analisis Tecnico MDF - LT-80W-F45.md       ← análisis técnico base (parámetros teóricos)
│           └── fichas-parametro/                          ← "recetas" oficiales validadas con datos reales
├── scripts/
│   └── gcode_generator/                                   ← script que arma las grillas de prueba (G-code + csv)
└── data/
    ├── registros/                                         ← hojas de registro / exports de resultados por corrida
    └── fotos/                                              ← fotos de cupones de prueba evaluados
```

## Estado del proyecto

Ver **[Plan Maestro](docs/Plan%20Maestro%20-%20Estandarizacion%20Pruebas%20Laser.md)** para el detalle de arquitectura, roadmap de fases (F1–F7) y pendientes de negocio (tarifa eléctrica, costo de material, tarifa hora-máquina — hoy configurables como parámetros editables).

| Fase | Entregable | Estado |
|---|---|---|
| F1 | Script generador de G-code | En construcción |
| F2 | Plantilla de Hoja de Registro + motor de costeo | Pendiente |
| F3 | SOP de una página para el taller | Pendiente |
| F4 | Corrida piloto MDF 3mm | Pendiente |
| F5 | Calibración de energía (medidor manual/API) | Pendiente |
| F6 | Ficha de Parámetro Estándar v1 — MDF | Pendiente |
| F7 | Extensión a un segundo material | Pendiente |

## Material de referencia

- [Análisis Técnico MDF](docs/materiales/MDF/Analisis%20Tecnico%20MDF%20-%20LT-80W-F45.md): parámetros optomecánicos del módulo LT-80W-F45, comportamiento térmico del MDF, matriz de decisión comercial por línea de producto.
