.PHONY: help install test test-coverage lint format typecheck check generate-cut generate-engrave prepare-record compute-costs generate-final-run summarize-final-run svg-to-gcode clean web-install web-check

# Deteccion de SO
ifeq ($(OS),Windows_NT)
	RM_DIR := rmdir /s /q
else
	RM_DIR := rm -rf
endif

# Monorepo: apps/web (Next.js) + packages/laser_toolkit (paquete Python).
# --project le dice a uv DONDE esta el pyproject/venv SIN cambiar el
# directorio de trabajo -- asi los comandos de generacion (que reciben rutas
# de configs/ y data/ relativas a la raiz del repo) siguen funcionando igual
# que antes de mover el paquete.
PY_PKG := packages/laser_toolkit
UV_RUN := uv run --project $(PY_PKG)
# --directory SI cambia el directorio de trabajo -- para lint/typecheck/test,
# que ya asumen rutas relativas a la raiz del paquete (src, tests, .venv);
# moverse ahi evita tener que reescribir esas rutas.
UV_RUN_PKG := uv run --directory $(PY_PKG)
WEB_DIR := apps/web

# ============================================
# AYUDA
# ============================================

help:
	@echo "Comandos disponibles:"
	@echo "  make install                              - Instalar dependencias Python (uv sync)"
	@echo "  make web-install                          - Instalar dependencias del frontend (pnpm install)"
	@echo "  make test                                 - Ejecutar todos los tests con pytest"
	@echo "  make test-coverage                        - Ejecutar tests con reporte de cobertura HTML"
	@echo "  make lint                                 - Revisar estilo de codigo con ruff"
	@echo "  make format                                - Formatear codigo con ruff"
	@echo "  make typecheck                              - Revisar tipos con pyright"
	@echo "  make check                                  - lint + typecheck + test (todo antes de commitear)"
	@echo "  make web-check                             - lint + typecheck + format:check del frontend (pnpm)"
	@echo "  make generate-cut CONFIG=ruta.yaml         - Generar una suite de corte"
	@echo "  make generate-engrave CONFIG=ruta.yaml     - Generar una suite de grabado"
	@echo "  make prepare-record CSV=ruta.csv           - Agregar columnas manuales al csv generado"
	@echo "  make compute-costs CSV=ruta.csv TARIFAS=ruta.yaml"
	@echo "                                              - Calcular costeo granular de un registro completado"
	@echo "  make generate-final-run CONFIG=ruta.yaml [EJECUCION=2]"
	@echo "                                              - Generar UNA ejecucion de Final Run (energia exacta)"
	@echo "  make summarize-final-run CSVS=\"a.csv b.csv c.csv\""
	@echo "                                              - Resumir varias ejecuciones de una misma Final Run"
	@echo "  make svg-to-gcode SVG=ruta.svg ANCHO=30 ALTO=30 VELOCIDAD=1200 POTENCIA=25 SALIDA=ruta.gcode"
	@echo "                                              - Convertir un SVG suelto a .gcode (herramienta atomica)"
	@echo "  make clean                                - Limpiar cache de Python y artefactos de test"

# ============================================
# INSTALACION Y DEPENDENCIAS
# ============================================

install:
	@echo "Instalando dependencias Python con uv..."
	cd $(PY_PKG) && uv sync

web-install:
	@echo "Instalando dependencias del frontend con pnpm..."
	cd $(WEB_DIR) && pnpm install

# ============================================
# GENERADOR DE G-CODE
# ============================================

generate-cut:
	@echo "Generando suite de corte desde $(CONFIG)..."
	$(UV_RUN) laser-toolkit generate-cut $(CONFIG)

generate-engrave:
	@echo "Generando suite de grabado desde $(CONFIG)..."
	$(UV_RUN) laser-toolkit generate-engrave $(CONFIG)

prepare-record:
	@echo "Preparando registro desde $(CSV)..."
	$(UV_RUN) laser-toolkit prepare-record $(CSV)

compute-costs:
	@echo "Calculando costeo de $(CSV) con tarifas $(TARIFAS)..."
	$(UV_RUN) laser-toolkit compute-costs $(CSV) --tarifas $(TARIFAS)

generate-final-run:
	@echo "Generando Final Run desde $(CONFIG)..."
ifdef EJECUCION
	$(UV_RUN) laser-toolkit generate-final-run $(CONFIG) --ejecucion $(EJECUCION)
else
	$(UV_RUN) laser-toolkit generate-final-run $(CONFIG)
endif

summarize-final-run:
	@echo "Resumiendo ejecuciones: $(CSVS)..."
	$(UV_RUN) laser-toolkit summarize-final-run $(CSVS)

svg-to-gcode:
	@echo "Convirtiendo $(SVG) a G-code..."
	$(UV_RUN) laser-toolkit svg-to-gcode $(SVG) --ancho-mm $(ANCHO) --alto-mm $(ALTO) \
		--velocidad $(VELOCIDAD) --potencia $(POTENCIA) -o $(SALIDA)

# ============================================
# CALIDAD DE CODIGO (Python)
# ============================================

lint:
	@echo "Revisando estilo de codigo con ruff..."
	$(UV_RUN_PKG) ruff check src tests

format:
	@echo "Formateando codigo con ruff..."
	$(UV_RUN_PKG) ruff format src tests

typecheck:
	@echo "Revisando tipos con pyright..."
	$(UV_RUN_PKG) pyright

check: lint typecheck test
	@echo "lint + typecheck + test: todo en orden."

# ============================================
# CALIDAD DE CODIGO (frontend)
# ============================================

web-check:
	@echo "Revisando el frontend (lint + typecheck + format:check)..."
	cd $(WEB_DIR) && pnpm run check

# ============================================
# TESTS
# ============================================

test:
	@echo "Ejecutando todos los tests con pytest..."
	$(UV_RUN_PKG) pytest tests/ -v

test-coverage:
	@echo "Ejecutando tests con cobertura..."
	$(UV_RUN_PKG) pytest tests/ --cov=src/laser_toolkit --cov-report=html

# ============================================
# LIMPIEZA
# ============================================

clean:
	@echo "Limpiando cache de Python y artefactos de test..."
ifeq ($(OS),Windows_NT)
	@if exist $(PY_PKG)\.pytest_cache $(RM_DIR) $(PY_PKG)\.pytest_cache
	@if exist $(PY_PKG)\htmlcov $(RM_DIR) $(PY_PKG)\htmlcov
	@if exist $(PY_PKG)\.ruff_cache $(RM_DIR) $(PY_PKG)\.ruff_cache
else
	@find $(PY_PKG) -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@$(RM_DIR) $(PY_PKG)/.pytest_cache $(PY_PKG)/htmlcov $(PY_PKG)/.ruff_cache 2>/dev/null || true
endif
	@echo "Limpieza completada."
