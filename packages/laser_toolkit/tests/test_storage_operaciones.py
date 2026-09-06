"""Tests de `operaciones.py` con un cliente falso -- verifican que se llame
al bucket/ruta correctos con los parámetros esperados, sin tocar red. La
prueba de que esto funciona de verdad contra Supabase real se corrió a mano
durante el desarrollo de #25 (subida/descarga/URL firmada/borrado real);
acá se deja la garantía automática de que no se rompe la integración con
`storage3` en un refactor futuro.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from laser_toolkit.storage import operaciones as ops


def _cliente_falso():
    cliente = MagicMock()
    bucket = MagicMock()
    cliente.storage.from_.return_value = bucket
    return cliente, bucket


def test_subir_gcode_usa_bucket_y_ruta_correctos():
    cliente, bucket = _cliente_falso()
    key = ops.subir_gcode(cliente, "MDF Trupan", "CORRIDA-1", b"contenido")
    cliente.storage.from_.assert_called_once_with(ops.BUCKET_GCODE)
    bucket.upload.assert_called_once()
    ruta_llamada = bucket.upload.call_args.args[0]
    assert ruta_llamada == key == "MDF-Trupan/CORRIDA-1.gcode"


def test_subir_svg_usa_bucket_y_ruta_correctos():
    cliente, bucket = _cliente_falso()
    key = ops.subir_svg(cliente, "MDF Comercial", 7, b"<svg/>")
    cliente.storage.from_.assert_called_once_with(ops.BUCKET_SVG)
    assert key == "MDF-Comercial/suite-7.svg"


def test_subir_foto_usa_bucket_y_ruta_correctos():
    cliente, bucket = _cliente_falso()
    key = ops.subir_foto(cliente, "MDF Trupan", "CORRIDA-1", "C-003", b"jpg")
    cliente.storage.from_.assert_called_once_with(ops.BUCKET_FOTOS)
    assert key == "MDF-Trupan/CORRIDA-1/C-003.jpg"


def test_upload_pide_upsert_para_permitir_regenerar():
    cliente, bucket = _cliente_falso()
    ops.subir_gcode(cliente, "MDF Trupan", "CORRIDA-1", b"contenido")
    opciones = bucket.upload.call_args.kwargs["file_options"]
    assert opciones["upsert"] == "true"


def test_eliminar_llama_remove_con_lista_de_una_key():
    cliente, bucket = _cliente_falso()
    ops.eliminar(cliente, ops.BUCKET_GCODE, "MDF-Trupan/CORRIDA-1.gcode")
    bucket.remove.assert_called_once_with(["MDF-Trupan/CORRIDA-1.gcode"])


def test_url_firmada_extrae_signedurl_de_la_respuesta():
    cliente, bucket = _cliente_falso()
    bucket.create_signed_url.return_value = {"signedURL": "https://ejemplo/firmada"}
    url = ops.url_firmada(cliente, ops.BUCKET_GCODE, "k", expiracion_s=120)
    bucket.create_signed_url.assert_called_once_with("k", 120)
    assert url == "https://ejemplo/firmada"
