.PHONY: help install test test-coverage lint format typecheck check generate-cut generate-engrave prepare-record compute-costs generate-final-run summarize-final-run svg-to-gcode clean

# Deteccion de SO
ifeq ($(OS),Windows_NT)
	RM_DIR := rmdir /s /q
else
	RM_DIR := rm -rf
endif

# ============================================
# AYUDA
# ============================================

help:
	@echo "Comandos disponibles:"
	@echo "  make install                              - Instalar dependencias (uv sync)"
	@echo "  make test                                 - Ejecutar todos los tests con pytest"
	@echo "  make test-coverage                        - Ejecutar tests con reporte de cobertura HTML"
	@echo "  make lint                                 - Revisar estilo de codigo con ruff"
	@echo "  make format                                - Formatear codigo con ruff"
	@echo "  make typecheck                              - Revisar tipos con pyright"
	@echo "  make check                                  - lint + typecheck + test (todo antes de commitear)"
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
	@echo "Instalando dependencias con uv..."
	uv sync

# ============================================
# GENERADOR DE G-CODE
# ============================================

generate-cut:
	@echo "Generando suite de corte desde $(CONFIG)..."
	uv run laser-toolkit generate-cut $(CONFIG)

generate-engrave:
	@echo "Generando suite de grabado desde $(CONFIG)..."
	uv run laser-toolkit generate-engrave $(CONFIG)

prepare-record:
	@echo "Preparando registro desde $(CSV)..."
	uv run laser-toolkit prepare-record $(CSV)

compute-costs:
	@echo "Calculando costeo de $(CSV) con tarifas $(TARIFAS)..."
	uv run laser-toolkit compute-costs $(CSV) --tarifas $(TARIFAS)

generate-final-run:
	@echo "Generando Final Run desde $(CONFIG)..."
ifdef EJECUCION
	uv run laser-toolkit generate-final-run $(CONFIG) --ejecucion $(EJECUCION)
else
	uv run laser-toolkit generate-final-run $(CONFIG)
endif

summarize-final-run:
	@echo "Resumiendo ejecuciones: $(CSVS)..."
	uv run laser-toolkit summarize-final-run $(CSVS)

svg-to-gcode:
	@echo "Convirtiendo $(SVG) a G-code..."
	uv run laser-toolkit svg-to-gcode $(SVG) --ancho-mm $(ANCHO) --alto-mm $(ALTO) \
		--velocidad $(VELOCIDAD) --potencia $(POTENCIA) -o $(SALIDA)

# ============================================
# CALIDAD DE CODIGO
# ============================================

lint:
	@echo "Revisando estilo de codigo con ruff..."
	uv run ruff check src tests

format:
	@echo "Formateando codigo con ruff..."
	uv run ruff format src tests

typecheck:
	@echo "Revisando tipos con pyright..."
	uv run pyright

check: lint typecheck test
	@echo "lint + typecheck + test: todo en orden."

# ============================================
# TESTS
# ============================================

test:
	@echo "Ejecutando todos los tests con pytest..."
	uv run pytest tests/ -v

test-coverage:
	@echo "Ejecutando tests con cobertura..."
	uv run pytest tests/ --cov=src/laser_toolkit --cov-report=html

# ============================================
# LIMPIEZA
# ============================================

clean:
	@echo "Limpiando cache de Python y artefactos de test..."
ifeq ($(OS),Windows_NT)
	@if exist .pytest_cache $(RM_DIR) .pytest_cache
	@if exist htmlcov $(RM_DIR) htmlcov
	@if exist .ruff_cache $(RM_DIR) .ruff_cache
else
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@$(RM_DIR) .pytest_cache htmlcov .ruff_cache 2>/dev/null || true
endif
	@echo "Limpieza completada."
