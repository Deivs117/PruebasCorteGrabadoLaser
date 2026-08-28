.PHONY: help install test test-coverage lint format generate-cut generate-engrave clean

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
	@echo "  make generate-cut CONFIG=ruta.yaml         - Generar una suite de corte"
	@echo "  make generate-engrave CONFIG=ruta.yaml     - Generar una suite de grabado"
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

# ============================================
# CALIDAD DE CODIGO
# ============================================

lint:
	@echo "Revisando estilo de codigo con ruff..."
	uv run ruff check src tests

format:
	@echo "Formateando codigo con ruff..."
	uv run ruff format src tests

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
