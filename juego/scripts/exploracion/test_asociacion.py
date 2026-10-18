#!/usr/bin/env python3
"""Prueba de la asociación foto → edificio sobre la geometría real de un lote.

Usa una copia en memoria de la base de datos (no toca la real) y coloca cámaras de prueba en la
calle, delante de una fachada, para comprobar los casos que importan:
  1. cámara en la acera de enfrente mirando a la fachada  → se asocia a ese edificio
  2. misma posición, mirando hacia el otro lado            → no se asocia a ese edificio
  3. cámara al lado de la fachada mirando a lo largo de la calle → confianza menor
  4. foto 360°                                              → se asocia sin depender del rumbo
  5. cámara tapada por otro edificio                        → no se asocia
  6. foto sin rumbo                                         → confianza baja
Las fotos son ficticias y solo existen en memoria; no se guardan ni se usan como referencia.

    python3 scripts/exploracion/test_asociacion.py [--lote AURORA-01]
"""
import argparse
import json
import math
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import explorar as X  # noqa: E402


def a_lonlat(x, y):
    return X.L0 + x / X.KX, X.A0 - y / X.KY


def rumbo(desde, hacia):
    return math.degrees(math.atan2(hacia[0] - desde[0], -(hacia[1] - desde[1]))) % 360


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lote", default="AURORA-01")
    a = ap.parse_args()
    disco = sqlite3.connect(X.BD)
    c = sqlite3.connect(":memory:")
    disco.backup(c)
    c.row_factory = sqlite3.Row
    for tabla, col in (("fotos", "pano INTEGER"), ("foto_edificio", "confianza REAL"), ("foto_edificio", "fachada INTEGER")):
        if col.split()[0] not in [r[1] for r in c.execute(f"PRAGMA table_info({tabla})")]:
            c.execute(f"ALTER TABLE {tabla} ADD COLUMN {col}")
    c.execute("DELETE FROM fotos")
    c.execute("DELETE FROM foto_edificio")
    eds = list(c.execute("SELECT * FROM edificios WHERE lote=? ORDER BY area DESC", (a.lote,)))
    # Edificio con la fachada a la calle más larga.
    obj, fach = None, None
    for e in eds:
        d = json.loads(e["datos"])
        for f in X._fachadas(d["huella"], d.get("caras")):
            if not fach or f["largo"] > fach["largo"]:
                obj, fach = e, f
    m, n = fach["m"], fach["n"]
    acera_enfrente = (m[0] + n[0] * 9, m[1] + n[1] * 9)
    pegado = (m[0] + n[0] * 1.5 + (fach["b"][0] - fach["a"][0]) * 0.45, m[1] + n[1] * 1.5 + (fach["b"][1] - fach["a"][1]) * 0.45)
    detras = (m[0] - n[0] * 25, m[1] - n[1] * 25)  # al otro lado del edificio, con él en medio
    casos = [
        ("1 enfrente, mirando a la fachada", acera_enfrente, rumbo(acera_enfrente, m), 0, "sí"),
        ("2 enfrente, de espaldas", acera_enfrente, (rumbo(acera_enfrente, m) + 180) % 360, 0, "no"),
        ("3 pegado, mirando a lo largo de la calle", pegado, rumbo(fach["b"], fach["a"]), 0, "menor"),
        ("4 enfrente, foto 360°", acera_enfrente, None, 1, "sí"),
        ("5 detrás del edificio, tapado", detras, rumbo(detras, m), 0, "no"),
        ("6 enfrente, sin rumbo", acera_enfrente, None, 0, "baja"),
    ]
    for i, (nombre, cam, rb, pano, _esp) in enumerate(casos):
        lon, lat = a_lonlat(*cam)
        c.execute("INSERT INTO fotos (id, fuente, lon, lat, rumbo, pano) VALUES (?,?,?,?,?,?)", (f"prueba:{i + 1}", "prueba", lon, lat, rb, pano))
    for e in eds:
        X.asociar_fotos(c, e)
    print(f"Edificio objetivo: {obj['id']} · fachada {fach['i']} ({fach['largo']:.1f} m) · calles {[r[0] for r in c.execute('SELECT calle FROM edificio_calle WHERE edificio=?', (obj['id'],))]}\n")
    fallos = 0
    for i, (nombre, _cam, _rb, _pano, esperado) in enumerate(casos):
        filas = list(c.execute("SELECT edificio, confianza, distancia, encara FROM foto_edificio WHERE foto=? ORDER BY confianza DESC", (f"prueba:{i + 1}",)))
        conf = next((r["confianza"] for r in filas if r["edificio"] == obj["id"]), None)
        otros = [f"{r['edificio']}:{r['confianza']}" for r in filas if r["edificio"] != obj["id"]]
        ok = {"sí": conf is not None and conf >= 0.6, "no": conf is None, "menor": conf is None or conf < 0.6,
              "baja": conf is not None and conf <= 0.4}[esperado]
        fallos += not ok
        print(f"{'OK ' if ok else 'MAL'} {nombre:42s} objetivo={conf}  esperado={esperado:5s} otros={otros}")
    print(f"\n{len(casos) - fallos}/{len(casos)} casos correctos")
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
