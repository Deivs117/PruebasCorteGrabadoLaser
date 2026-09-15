"""Tests del eje Z automatico entre corte y grabado (issue #195):
`MachineConfig.elevacion_grabado_mm`, los emisores relativos de
`laser_toolkit.gcode.writer` y el agrupador que usa la exportacion combinada
del editor (`apps/api/editor.exportar_gcode_combinado`)."""

from laser_toolkit.config import MachineConfig, Operacion
from laser_toolkit.gcode.writer import (
    bajar_z_para_corte,
    combinar_bloques_por_operacion,
    elevar_z_para_grabado,
)


def _machine(elevacion_grabado_mm: float = 4.0) -> MachineConfig:
    return MachineConfig(elevacion_grabado_mm=elevacion_grabado_mm)


def _lineas_g0_z(gcode: list[str]) -> list[str]:
    """Lineas de movimiento de Z (`G0 Z...`), ignorando cualquier otra."""
    return [linea for linea in gcode if linea.startswith("G0 Z")]


def test_elevar_z_para_grabado_es_relativo_y_usa_el_delta_configurado() -> None:
    gcode = elevar_z_para_grabado(_machine(4.0))
    assert gcode[0].startswith("G91")
    assert gcode[-1].startswith("G90")
    assert "G0 Z4.000" in gcode[1]
    # Nunca Z absoluto: ninguna linea debe llevar coordenadas X/Y, que
    # indicarian un posicionamiento de otro tipo, y el propio G91 alrededor
    # es lo que garantiza que el Z sea relativo al Z actual, no a un cero de
    # maquina.
    assert all("X" not in linea and "Y" not in linea for linea in gcode)


def test_bajar_z_para_corte_es_el_delta_simetrico() -> None:
    gcode = bajar_z_para_corte(_machine(4.0))
    assert gcode[0].startswith("G91")
    assert gcode[-1].startswith("G90")
    assert "G0 Z-4.000" in gcode[1]


def test_bajar_z_usa_la_elevacion_configurada_no_hardcodeada() -> None:
    gcode = bajar_z_para_corte(_machine(6.5))
    assert "G0 Z-6.500" in gcode[1]


def test_combinar_bloques_corte_y_grabado_emite_exactamente_un_ascenso_y_un_descenso() -> None:
    """Varios objetos, cada uno con su propio bloque de corte y de grabado
    (como en una exportacion combinada real del editor): el resultado tiene
    que traer UN solo ascenso y UN solo descenso de Z, no uno por objeto."""
    machine = _machine(4.0)
    bloques = [
        (Operacion.CORTE, ["; corte objeto 1"]),
        (Operacion.GRABADO, ["; grabado objeto 1"]),
        (Operacion.CORTE, ["; corte objeto 2"]),
        (Operacion.GRABADO, ["; grabado objeto 2"]),
        (Operacion.CORTE, ["; corte objeto 3"]),
    ]

    resultado = combinar_bloques_por_operacion(bloques, machine)
    movimientos_z = _lineas_g0_z(resultado)

    # Exactamente un ascenso y un descenso en TODA la exportacion -- no uno
    # por cada uno de los 3 objetos que traen corte o los 2 que traen grabado.
    assert movimientos_z == [
        "G0 Z4.000 ; subir del foco de corte al de grabado",
        "G0 Z-4.000 ; bajar del foco de grabado al de corte",
    ]


def test_combinar_bloques_agrupa_todo_el_corte_junto_y_todo_el_grabado_junto() -> None:
    machine = _machine(4.0)
    bloques = [
        (Operacion.CORTE, ["CORTE_A"]),
        (Operacion.GRABADO, ["GRABADO_A"]),
        (Operacion.CORTE, ["CORTE_B"]),
        (Operacion.GRABADO, ["GRABADO_B"]),
    ]

    resultado = combinar_bloques_por_operacion(bloques, machine)

    assert resultado.index("CORTE_A") < resultado.index("CORTE_B") < resultado.index("GRABADO_A")
    assert resultado.index("GRABADO_A") < resultado.index("GRABADO_B")


def test_combinar_bloques_solo_corte_no_emite_ningun_movimiento_de_z() -> None:
    machine = _machine(4.0)
    bloques = [
        (Operacion.CORTE, ["CORTE_A"]),
        (Operacion.CORTE, ["CORTE_B"]),
    ]

    resultado = combinar_bloques_por_operacion(bloques, machine)

    assert resultado == ["CORTE_A", "CORTE_B"]
    assert not _lineas_g0_z(resultado)
    assert "G91" not in resultado
    assert "G90" not in resultado


def test_combinar_bloques_solo_grabado_no_emite_ningun_movimiento_de_z() -> None:
    machine = _machine(4.0)
    bloques = [
        (Operacion.GRABADO, ["GRABADO_A"]),
        (Operacion.GRABADO, ["GRABADO_B"]),
    ]

    resultado = combinar_bloques_por_operacion(bloques, machine)

    assert resultado == ["GRABADO_A", "GRABADO_B"]
    assert not _lineas_g0_z(resultado)


def test_combinar_bloques_vacios_no_revienta() -> None:
    assert combinar_bloques_por_operacion([], _machine()) == []
