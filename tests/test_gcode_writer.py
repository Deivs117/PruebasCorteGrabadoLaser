import pytest

from laser_toolkit.config import MachineConfig, SuiteConfig
from laser_toolkit.gcode.grid import Celda
from laser_toolkit.gcode.writer import (
    ALTO_ETIQUETA_MIN_MM,
    ALTO_ETIQUETA_MM,
    MARGEN_ETIQUETA_MIN_MM,
    MARGEN_ETIQUETA_MM,
    SOBRERECORRIDO_MAX_MM,
    cortar_cuadrado,
    dimensiones_totales_mm,
    distancia_aceleracion_mm,
    grabar_relleno,
    margen_seguridad_columna_cero_mm,
    sobrerecorrido_mm,
    tamano_etiqueta_mm,
)


def _suite_config(**overrides: object) -> SuiteConfig:
    base = {
        "material": "MDF Trupan",
        "espesor_mm": 3.0,
        "operacion": "corte",
        "velocidades_mm_min": [200, 220, 240],
        "potencias_pct": [80, 100],
        "tamano_celda_mm": 15.0,
        "espaciado_mm": 5.0,
    }
    base.update(overrides)
    return SuiteConfig.model_validate(base)


def _celda(
    *,
    id: str = "C-001",
    velocidad_mm_min: int = 240,
    potencia_pct: int = 100,
    pasadas: int = 1,
    x_mm: float = 10.0,
    y_mm: float = 10.0,
    tamano_mm: float = 15.0,
) -> Celda:
    return Celda(
        id=id,
        velocidad_mm_min=velocidad_mm_min,
        potencia_pct=potencia_pct,
        pasadas=pasadas,
        x_mm=x_mm,
        y_mm=y_mm,
        tamano_mm=tamano_mm,
    )


def test_cortar_cuadrado_usa_s_maximo_a_100_por_ciento():
    machine = MachineConfig(laser_max_s=1000)
    lineas = cortar_cuadrado(_celda(potencia_pct=100), machine)
    assert "M4 S1000" in lineas


def test_cortar_cuadrado_escala_s_con_potencia():
    machine = MachineConfig(laser_max_s=1000)
    lineas = cortar_cuadrado(_celda(potencia_pct=50), machine)
    assert "M4 S500" in lineas


def test_cortar_cuadrado_repite_bloque_por_cada_pasada():
    machine = MachineConfig()
    lineas_una = cortar_cuadrado(_celda(pasadas=1), machine)
    lineas_dos = cortar_cuadrado(_celda(pasadas=2), machine)
    assert lineas_una.count("M5") == 1
    assert lineas_dos.count("M5") == 2


def test_cortar_cuadrado_apaga_laser_al_final():
    machine = MachineConfig()
    lineas = cortar_cuadrado(_celda(), machine)
    assert lineas[-1] == "M5"


def test_grabar_relleno_apaga_laser_al_final():
    machine = MachineConfig()
    lineas = grabar_relleno(_celda(), machine, resolucion_linea_mm=1.0)
    assert lineas[-1] == "M5"
    assert lineas[1].startswith("M4 S")


def test_distancia_aceleracion_mm_crece_con_la_velocidad():
    machine = MachineConfig(aceleracion_mm_s2=75.0)
    assert distancia_aceleracion_mm(3500, machine) > distancia_aceleracion_mm(1000, machine)


def test_grabar_relleno_apaga_laser_en_el_sobrerecorrido_y_lo_prende_en_la_celda():
    machine = MachineConfig(aceleracion_mm_s2=75.0)
    celda = _celda(velocidad_mm_min=3500, x_mm=10.0, tamano_mm=7.0)
    lineas = grabar_relleno(celda, machine, resolucion_linea_mm=3.5)

    # A esta velocidad la distancia de aceleracion pedida supera el tope --
    # el sobre-recorrido real queda clampeado en SOBRERECORRIDO_MAX_MM.
    assert distancia_aceleracion_mm(3500, machine) > SOBRERECORRIDO_MAX_MM
    x_min_esperado = celda.x_mm - SOBRERECORRIDO_MAX_MM
    x_max_esperado = celda.x_mm + celda.tamano_mm + SOBRERECORRIDO_MAX_MM

    # La primera linea de barrido enciende el laser (S>0) solo al cruzar el
    # borde real de la celda, y lo apaga (S0) antes de llegar al extremo.
    primera_linea_con_potencia = next(linea for linea in lineas if " S" in linea and not linea.endswith("S0"))
    assert f"X{celda.x_mm + celda.tamano_mm:.3f}" in primera_linea_con_potencia

    assert any(f"X{x_min_esperado:.3f}" in linea for linea in lineas)
    assert any(f"X{x_max_esperado:.3f}" in linea for linea in lineas)


def test_grabar_relleno_no_genera_coordenadas_x_negativas_en_la_columna_cero():
    machine = MachineConfig(aceleracion_mm_s2=10.0)  # aceleracion baja -> overscan grande
    celda = _celda(velocidad_mm_min=3500, x_mm=0.0, tamano_mm=7.0)
    lineas = grabar_relleno(celda, machine, resolucion_linea_mm=3.5)
    for linea in lineas:
        if "X-" in linea:
            pytest.fail(f"coordenada X negativa en columna 0: {linea!r}")


def test_margen_seguridad_columna_cero_cubre_la_velocidad_mas_alta():
    machine = MachineConfig(aceleracion_mm_s2=50.0)
    velocidades = [1000, 1500, 2000]
    margen = margen_seguridad_columna_cero_mm(velocidades, machine)
    assert margen == sobrerecorrido_mm(max(velocidades), machine)


def test_columna_cero_con_origen_desplazado_tiene_overscan_simetrico():
    # Bug real: sin desplazar el origen, la columna 0 (x0=0) perdia el
    # sobre-recorrido hacia la izquierda porque grabar_relleno lo recorta
    # contra X=0 -- solo el lado derecho quedaba con overscan.
    machine = MachineConfig(aceleracion_mm_s2=50.0)
    velocidades = [1000, 1500, 2000]
    margen = margen_seguridad_columna_cero_mm(velocidades, machine)

    celda_columna_0 = _celda(velocidad_mm_min=2000, x_mm=margen, tamano_mm=5.0)
    lineas = grabar_relleno(celda_columna_0, machine, resolucion_linea_mm=2.5)

    overscan_real = sobrerecorrido_mm(2000, machine)
    x_min_esperado = celda_columna_0.x_mm - overscan_real
    x_max_esperado = celda_columna_0.x_mm + celda_columna_0.tamano_mm + overscan_real

    assert x_min_esperado >= 0  # el desplazamiento evita el recorte contra X=0
    assert any(f"X{x_min_esperado:.3f}" in linea for linea in lineas)
    assert any(f"X{x_max_esperado:.3f}" in linea for linea in lineas)
    # Overscan simetrico: la misma distancia sobra a cada lado de la celda.
    assert x_min_esperado == pytest.approx(celda_columna_0.x_mm - overscan_real)
    assert x_max_esperado - (celda_columna_0.x_mm + celda_columna_0.tamano_mm) == pytest.approx(
        celda_columna_0.x_mm - x_min_esperado
    )


def test_dimensiones_totales_mm_una_sola_celda():
    config = _suite_config(velocidades_mm_min=[200], potencias_pct=[100])
    ancho_mm, alto_mm = dimensiones_totales_mm(config)
    assert ancho_mm == 15.0
    assert alto_mm == 15.0 + MARGEN_ETIQUETA_MM + ALTO_ETIQUETA_MM


def test_dimensiones_totales_mm_cuenta_pasos_entre_celdas():
    config = _suite_config(velocidades_mm_min=[200, 220, 240], potencias_pct=[80, 100])
    ancho_mm, alto_mm = dimensiones_totales_mm(config)
    paso = config.tamano_celda_mm + config.espaciado_mm
    assert ancho_mm == 2 * paso + config.tamano_celda_mm
    assert alto_mm == 1 * paso + config.tamano_celda_mm + MARGEN_ETIQUETA_MM + ALTO_ETIQUETA_MM


def test_tamano_etiqueta_mm_usa_valores_por_defecto_con_espaciado_amplio():
    # 5.0mm >= 3.0 (margen) + 2.0 (alto) por defecto: no hay que achicar nada.
    assert tamano_etiqueta_mm(5.0) == (MARGEN_ETIQUETA_MM, ALTO_ETIQUETA_MM)


def test_tamano_etiqueta_mm_se_achica_para_no_solapar_la_fila_siguiente():
    # Caso real que motiva el fix: grilla de shades de 7mm de celda con 3mm
    # de separacion -- el margen+alto por defecto (5mm) no entran en 3mm.
    margen_mm, alto_mm = tamano_etiqueta_mm(3.0)
    assert margen_mm < MARGEN_ETIQUETA_MM
    assert alto_mm < ALTO_ETIQUETA_MM
    assert alto_mm >= ALTO_ETIQUETA_MIN_MM
    assert margen_mm >= MARGEN_ETIQUETA_MIN_MM
    # La etiqueta (margen + alto) nunca llega a tocar el borde de la celda
    # de la fila siguiente: siempre queda por debajo del espaciado real.
    assert margen_mm + alto_mm < 3.0


def test_tamano_etiqueta_mm_levanta_error_si_no_entra_ni_el_piso_legible():
    with pytest.raises(ValueError):
        tamano_etiqueta_mm(0.5)
