import pytest

from laser_toolkit.config import MachineConfig
from laser_toolkit.gcode.writer import sobrerecorrido_mm
from laser_toolkit.svg.gcode import (
    gcode_contorno,
    gcode_relleno,
    longitud_contorno_mm,
    longitud_relleno_mm,
    ordenar_subpaths_por_proximidad,
)
from laser_toolkit.svg.geometry import Subpath


def test_gcode_contorno_cierra_subpath_cerrado():
    sp = Subpath(puntos=((0, 0), (10, 0), (10, 10)), cerrado=True)
    lineas = gcode_contorno([sp], 0, 0, velocidad_mm_min=500, potencia_pct=50, machine=MachineConfig())
    assert lineas[-2] == "G1 X0.000 Y0.000 F500"  # vuelve al punto inicial
    assert lineas[-1] == "M5"


def test_gcode_contorno_no_cierra_subpath_abierto():
    sp = Subpath(puntos=((0, 0), (10, 0), (10, 10)), cerrado=False)
    lineas = gcode_contorno([sp], 0, 0, velocidad_mm_min=500, potencia_pct=50, machine=MachineConfig())
    assert "X0.000 Y0.000 F500" not in lineas[2:]  # no vuelve al origen


def test_gcode_contorno_aplica_offset():
    sp = Subpath(puntos=((0, 0), (10, 0)), cerrado=False)
    lineas = gcode_contorno(
        [sp], x_offset_mm=100, y_offset_mm=50, velocidad_mm_min=500, potencia_pct=100, machine=MachineConfig()
    )
    assert lineas[0].startswith("G0 X100.000 Y50.000")
    assert "X110.000 Y50.000" in lineas[-2]


def test_gcode_relleno_usa_s_segun_potencia():
    machine = MachineConfig(laser_max_s=1000)
    lineas = gcode_relleno(
        [((0.0, 0.0), (10.0, 0.0))], 0, 0, velocidad_mm_min=1000, potencia_pct=25, machine=machine
    )
    # La potencia real se aplica en el G1 que recorre el segmento real
    # (X0.000 -> X10.000), no en el M4 que arma el laser -- ver el
    # sobre-recorrido de entrada/salida a continuacion.
    assert "M4 S0" in lineas
    assert any(linea.startswith("G1 X10.000") and linea.endswith("S250") for linea in lineas)


def test_gcode_relleno_aplica_sobrerrecorrido_con_laser_apagado():
    """Cada segmento entra y sale del area real con overscan a laser apagado
    (S0) -- mismo mecanismo que `grabar_relleno`/`gcode_grabado_raster`, para
    no sobre-quemar los bordes del trazo (ver el comentario de
    `SOBRERECORRIDO_MIN_MM` en `gcode/writer.py`)."""
    machine = MachineConfig()
    velocidad = 1000
    overscan = sobrerecorrido_mm(velocidad, machine)
    lineas = gcode_relleno(
        [((5.0, 2.0), (15.0, 2.0))], 0, 0, velocidad_mm_min=velocidad, potencia_pct=50, machine=machine
    )
    assert lineas[0] == f"G0 X{5.0 - overscan:.3f} Y2.000 F{machine.travel_feed_mm_min}"
    assert lineas[1] == "M4 S0"
    assert lineas[2].endswith("S0") and "X5.000" in lineas[2]
    assert lineas[3].endswith(f"S{round(0.5 * machine.laser_max_s)}") and "X15.000" in lineas[3]
    assert lineas[4] == f"G1 X{15.0 + overscan:.3f} Y2.000 F{velocidad} S0"
    assert lineas[5] == "M5"


def test_gcode_relleno_respeta_sentido_de_fila_de_vuelta():
    """Un segmento en sentido decreciente (fila de "vuelta" del zigzag,
    `generar_segmentos_relleno`) extiende el overscan hacia la IZQUIERDA en
    ambos extremos (misma direccion del recorrido), no hacia la derecha
    como si fuera `x1 <= x2` -- de lo contrario el overscan de salida
    invadiria el segmento real en vez de alejarse de el."""
    machine = MachineConfig()
    velocidad = 1000
    overscan = sobrerecorrido_mm(velocidad, machine)
    lineas = gcode_relleno(
        [((15.0, 2.0), (5.0, 2.0))], 0, 0, velocidad_mm_min=velocidad, potencia_pct=50, machine=machine
    )
    # Entra por la derecha (15 + overscan) y sale por la izquierda (5 - overscan).
    assert lineas[0] == f"G0 X{15.0 + overscan:.3f} Y2.000 F{machine.travel_feed_mm_min}"
    assert lineas[4] == f"G1 X{5.0 - overscan:.3f} Y2.000 F{velocidad} S0"


def test_gcode_relleno_fusiona_varias_islas_de_una_fila_en_un_solo_m4_m5():
    """El hallazgo real de la pieza Serelia: una fila con varias islas de
    tinta separadas (ej. las patas de un dibujo, letras) armaba/desarmaba
    el laser por cada una -- ahora es UN solo M4/M5 para la fila entera,
    con S0 en el hueco entre islas (recorrido continuo, sin parar), igual
    que ya hace `raster.gcode.gcode_grabado_raster` para fotos."""
    machine = MachineConfig(laser_max_s=1000)
    # Misma fila (Y=0), dos islas de tinta: 0->2 y 5->8, con un hueco 2->5.
    fila = [((0.0, 0.0), (2.0, 0.0)), ((5.0, 0.0), (8.0, 0.0))]
    lineas = gcode_relleno(fila, 0, 0, velocidad_mm_min=1000, potencia_pct=40, machine=machine)

    assert lineas.count("M4 S0") == 1
    assert lineas.count("M5") == 1
    # El G1 que atraviesa el hueco (2 -> 5) va con S0 (laser apagado, pero
    # SIN parar -- no hay M4/M5 entre las dos islas).
    assert any(linea == "G1 X5.000 Y0.000 F1000 S0" for linea in lineas)
    # Cada isla se quema con la potencia real (S400 = 40% de 1000).
    assert sum(1 for linea in lineas if linea.endswith("S400")) == 2


def test_gcode_relleno_topa_overscan_al_largo_de_toda_la_fila():
    """El sobre-recorrido de una fila con varias islas se topa al largo de
    TODA la fila (de la primera a la ultima isla), no al de una isla
    individual -- con el arranque/parada unificado por fila ya no hace
    falta proteger cada isla por separado."""
    machine = MachineConfig()
    velocidad = 800
    overscan_maximo = sobrerecorrido_mm(velocidad, machine)
    # Islas muy cortas (1mm cada una) pero la fila entera (0 a 4) es mas
    # larga que el overscan maximo de la maquina -- no debe toparse.
    largo_fila = 4.0
    assert largo_fila > overscan_maximo
    fila = [((0.0, 0.0), (1.0, 0.0)), ((3.0, 0.0), (4.0, 0.0))]
    lineas = gcode_relleno(fila, 0, 0, velocidad_mm_min=velocidad, potencia_pct=50, machine=machine)
    assert lineas[0] == f"G0 X{-overscan_maximo:.3f} Y0.000 F{machine.travel_feed_mm_min}"


def test_gcode_relleno_topa_overscan_al_largo_del_trazo():
    """Un trazo mas corto que el overscan maximo configurado (ej. una pata
    fina de un dibujo) no arrastra el overscan completo -- se topa a su
    propio largo, para no multiplicar por varias veces la distancia real de
    un trazo chico (hallazgo real: llego a ser el 56% del tiempo total de
    grabado de un logo con muchos trazos finos)."""
    machine = MachineConfig()
    velocidad = 2000
    overscan_maximo = sobrerecorrido_mm(velocidad, machine)

    trazo_largo = 30.0
    assert trazo_largo > overscan_maximo  # el caso que no debe cambiar
    lineas_largo = gcode_relleno(
        [((0.0, 0.0), (trazo_largo, 0.0))], 0, 0, velocidad_mm_min=velocidad, potencia_pct=50, machine=machine
    )
    assert lineas_largo[0] == f"G0 X{-overscan_maximo:.3f} Y0.000 F{machine.travel_feed_mm_min}"

    trazo_corto = overscan_maximo / 2  # mas corto que el overscan maximo
    lineas_corto = gcode_relleno(
        [((0.0, 0.0), (trazo_corto, 0.0))], 0, 0, velocidad_mm_min=velocidad, potencia_pct=50, machine=machine
    )
    # El overscan efectivo queda topado al propio largo del trazo, no al
    # maximo de la maquina -- la entrada es `-trazo_corto`, no `-overscan_maximo`.
    assert lineas_corto[0] == f"G0 X{-trazo_corto:.3f} Y0.000 F{machine.travel_feed_mm_min}"


def test_gcode_contorno_repite_pasadas():
    sp = Subpath(puntos=((0, 0), (10, 0)), cerrado=False)
    una_pasada = gcode_contorno([sp], 0, 0, velocidad_mm_min=500, potencia_pct=50, machine=MachineConfig())
    dos_pasadas = gcode_contorno(
        [sp], 0, 0, velocidad_mm_min=500, potencia_pct=50, machine=MachineConfig(), pasadas=2
    )
    # Cada pasada repite el bloque completo G0/M4/G1/M5 del subpath.
    assert dos_pasadas.count("M4 S5000") == 2
    assert len(dos_pasadas) > len(una_pasada)


def test_gcode_contorno_pasadas_invalidas_es_un_error():
    sp = Subpath(puntos=((0, 0), (10, 0)), cerrado=False)
    with pytest.raises(ValueError, match="pasadas"):
        gcode_contorno([sp], 0, 0, velocidad_mm_min=500, potencia_pct=50, machine=MachineConfig(), pasadas=0)


def test_ordenar_subpaths_por_proximidad_vecino_mas_cercano():
    """Tres piezas de corte separadas (ej. tres letras sueltas) en un orden
    "malo" (el del archivo SVG): A en X=0, B en X=100, C en X=10. Arrancando
    desde (0,0), el orden optimo por proximidad es A, C, B (10 esta mucho
    mas cerca de 0 que de 100) -- no A, B, C como vendria del archivo."""
    a = Subpath(puntos=((0, 0), (1, 0)), cerrado=False)
    b = Subpath(puntos=((100, 0), (101, 0)), cerrado=False)
    c = Subpath(puntos=((10, 0), (11, 0)), cerrado=False)
    ordenados = ordenar_subpaths_por_proximidad([a, b, c], punto_inicial=(0.0, 0.0))
    assert ordenados == [a, c, b]


def test_ordenar_subpaths_por_proximidad_usa_punto_de_salida_del_anterior():
    """Un subpath abierto que ya recorrio bastante lejos de su punto de
    entrada deja al cabezal en su punto de SALIDA (el ultimo punto), no en
    el de entrada -- el siguiente salto se mide desde ahi."""
    largo = Subpath(puntos=((0, 0), (0, 100)), cerrado=False)  # entra en (0,0), sale en (0,100)
    cerca_de_la_salida = Subpath(puntos=((0, 105), (1, 105)), cerrado=False)
    cerca_de_la_entrada = Subpath(puntos=((0, 5), (1, 5)), cerrado=False)
    ordenados = ordenar_subpaths_por_proximidad(
        [largo, cerca_de_la_entrada, cerca_de_la_salida], punto_inicial=(0.0, 0.0)
    )
    # Arranca por 'largo' (el mas cerca de (0,0)), y de ahi salta al que esta
    # cerca de su SALIDA (0,100), no al que esta cerca de su entrada.
    assert ordenados == [largo, cerca_de_la_salida, cerca_de_la_entrada]


def test_gcode_contorno_reordena_subpaths_por_proximidad():
    """`gcode_contorno` aplica el reordenamiento de forma transparente --
    sin importar el orden de entrada, el primer bloque emitido es el del
    subpath mas cercano a (0,0)."""
    lejos = Subpath(puntos=((100, 0), (101, 0)), cerrado=False)
    cerca = Subpath(puntos=((1, 0), (2, 0)), cerrado=False)
    lineas = gcode_contorno(
        [lejos, cerca], 0, 0, velocidad_mm_min=500, potencia_pct=50, machine=MachineConfig()
    )
    assert lineas[0] == "G0 X1.000 Y0.000 F3000"  # 'cerca' va primero, no 'lejos'


def test_longitud_contorno_cuadrado_cerrado():
    sp = Subpath(puntos=((0, 0), (10, 0), (10, 10), (0, 10)), cerrado=True)
    assert longitud_contorno_mm([sp]) == pytest.approx(40.0)


def test_longitud_relleno_suma_segmentos():
    segmentos = [((0.0, 0.0), (10.0, 0.0)), ((0.0, 1.0), (5.0, 1.0))]
    assert longitud_relleno_mm(segmentos) == pytest.approx(15.0)
