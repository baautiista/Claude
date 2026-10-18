#!/usr/bin/env python3
"""Diagnóstico del acceso a Mapillary (API Graph v4).

Lanza una batería de peticiones y clasifica cada respuesta en:
  ok_con_fotos · vacia · error_autenticacion · consulta_mal_construida ·
  bloqueo_proxy · error_servidor · error_red

Guarda todo (código HTTP, JSON real recortado, tiempo, nº de imágenes) en
city-reconstruction/exploracion/diagnostico-mapillary/AAAAMMDD-HHMMSS.json
con el token tapado. Nunca imprime el token.

Uso: python3 scripts/exploracion/diagnostico_mapillary.py [--lote AURORA-01]
"""
import argparse
import json
import math
import os
import sys
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from explorar import fuente_catastro, mapillary_clasificar  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.join(RAIZ, "city-reconstruction", "exploracion")
API = "https://graph.mapillary.com"
CAMPOS = "id,computed_geometry,captured_at,computed_compass_angle,is_pano"


def token():
    for v in ("MAPILLARY_TOKEN", "MMAPILLARY_TOKEN"):
        if os.environ.get(v):
            return v, os.environ[v]
    return None, None


def tapar(texto, tok):
    return texto.replace(tok, "***TOKEN***") if tok else texto


def peticion(url, cabeceras=None, tok=None):
    t0 = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": "LaLineaCity/0.1 diagnostico", **(cabeceras or {})})
    codigo, cuerpo, red = None, "", None
    try:
        with urllib.request.urlopen(req, timeout=40, context=ssl.create_default_context()) as r:
            codigo, cuerpo = r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        codigo, cuerpo = e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        red = f"{type(e).__name__}: {e}"
    ms = round((time.time() - t0) * 1000)
    return codigo, cuerpo, red, ms


def clasificar(codigo, cuerpo, red):
    clase, d = mapillary_clasificar(codigo, cuerpo, red)
    n = len(d["data"]) if isinstance(d, dict) and isinstance(d.get("data"), list) else (1 if clase == "ok_objeto" else 0)
    return clase, n


def verificar_coordenadas(lote):
    """Comprueba que las coordenadas de los edificios del lote son geográficas reales (WGS84) y no del juego:
    1) lon/lat dentro del término de La Línea; 2) las huellas del juego coinciden con las del Catastro
    (EPSG:25830, convertidas a WGS84 con pyproj y luego al juego); 3) error de la proyección lineal
    del juego frente a pyproj en distancias entre edificios."""
    import sqlite3
    from pyproj import Geod, Transformer
    from shapely.geometry import Polygon
    c = sqlite3.connect(os.path.join(DIR, "la-linea.sqlite"))
    c.row_factory = sqlite3.Row
    eds = list(c.execute("SELECT * FROM edificios WHERE lote=?", (lote,)))
    dentro = all(36.14 < e["lat"] < 36.19 and -5.37 < e["lon"] < -5.32 for e in eds)
    lons, lats = [e["lon"] for e in eds], [e["lat"] for e in eds]
    m = 0.0006
    bbox = (min(lons) - m, min(lats) - m, max(lons) + m, max(lats) + m)
    _, partes = fuente_catastro(f"diag-{lote}", bbox)
    cat = [Polygon(p["huella"]).buffer(0) for p in partes if len(p["huella"]) >= 3]
    solape = []
    for e in eds:
        h = Polygon(json.loads(e["datos"])["huella"]).buffer(0)
        mejor = max((h.intersection(q).area / h.union(q).area for q in cat if q.intersects(h)), default=0)
        solape.append((e["id"], round(mejor, 2)))
    geod = Geod(ellps="WGS84")
    a_utm = Transformer.from_crs(4326, 25830, always_xy=True)
    err = []
    for i in range(len(eds)):
        for j in range(i + 1, len(eds)):
            _, _, dg = geod.inv(eds[i]["lon"], eds[i]["lat"], eds[j]["lon"], eds[j]["lat"])
            dj = math.hypot(eds[i]["x"] - eds[j]["x"], eds[i]["y"] - eds[j]["y"])
            err.append(abs(dg - dj))
    e0 = eds[0]
    utm = a_utm.transform(e0["lon"], e0["lat"])
    return {"edificios": len(eds), "lon_lat_en_la_linea": dentro, "ejemplo": {"id": e0["id"], "juego": [e0["x"], e0["y"]],
            "wgs84": [e0["lon"], e0["lat"]], "epsg25830": [round(utm[0], 1), round(utm[1], 1)]},
            "partes_catastro": len(partes), "iou_huella_juego_vs_catastro": solape,
            "iou_mediana": sorted(s for _, s in solape)[len(solape) // 2],
            "error_max_distancias_m": round(max(err), 2) if err else None}


def bbox_metros(lat, lon, m):
    dlat = m / 111320
    dlon = m / (111320 * math.cos(math.radians(lat)))
    return f"{lon - dlon:.6f},{lat - dlat:.6f},{lon + dlon:.6f},{lat + dlat:.6f}"  # lonmin,latmin,lonmax,latmax


def centro_lote(lote):
    prog = json.load(open(os.path.join(DIR, "progreso.json"))).get("edificios", {})
    ids = [k for k, v in prog.items() if isinstance(v, dict) and v.get("lote") == lote]
    pts = []
    for i in ids:
        f = os.path.join(DIR, "fichas", f"{i}.json")
        if os.path.exists(f):
            co = json.load(open(f))["coordenadas"]
            pts.append((co["lat"], co["lon"]))
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)), len(pts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lote", default="AURORA-01")
    a = ap.parse_args()
    var, tok = token()
    coords = verificar_coordenadas(a.lote)
    print("Coordenadas:", json.dumps({k: v for k, v in coords.items() if k != "iou_huella_juego_vs_catastro"}, ensure_ascii=False))
    (clat, clon), neds = centro_lote(a.lote)
    zonas = {
        f"{a.lote} (centro de {neds} edificios)": (clat, clon),
        "La Línea, Calle Real": (36.1625, -5.3480),
        "La Línea, frontera": (36.1530, -5.3470),
        "Madrid, Puerta del Sol": (40.4169, -3.7035),
        "Barcelona, Pl. Catalunya": (41.3870, 2.1700),
        "Malmö, Stortorget": (55.6059, 13.0007),
        "San Francisco, Market St": (37.7890, -122.4010),
    }
    pruebas = []

    def prueba(nombre, url, cab=None, tipo="busqueda"):
        codigo, cuerpo, red, ms = peticion(url, cab, tok)
        clase, n = clasificar(codigo, cuerpo, red)
        pruebas.append({"prueba": nombre, "tipo": tipo, "url": tapar(url, tok), "http": codigo, "ms": ms,
                        "imagenes": n, "clase": clase, "error_red": red, "respuesta": tapar(cuerpo[:600], tok)})
        print(f"{clase:24s} http={codigo} {ms:5d}ms n={n:3d}  {nombre}")

    q = lambda **p: urllib.parse.urlencode({**p, "access_token": tok})  # noqa: E731
    # 1. Validez del token, por ID (sin coste de cobertura).
    prueba("token: /me", f"{API}/me?{q(fields='id,username')}", tipo="token")
    prueba("token: ID inexistente (espera error 100, no 190)", f"{API}/1?{q(fields='id')}", tipo="token")
    prueba("token: inventado (espera error 190)", f"{API}/images?" + urllib.parse.urlencode(
        {"access_token": "MLY|0|0", "bbox": bbox_metros(clat, clon, 50), "fields": "id"}), tipo="token")
    prueba("token: en cabecera Authorization: OAuth", f"{API}/images?" + urllib.parse.urlencode(
        {"bbox": bbox_metros(clat, clon, 50), "fields": "id", "limit": 10}), {"Authorization": f"OAuth {tok}"}, tipo="token")
    # 2. Búsqueda por radio: primero mínima, luego con todos los campos y varios límites.
    for zona, (lat, lon) in zonas.items():
        prueba(f"radio 50 m, fields=id · {zona}", f"{API}/images?{q(lat=lat, lng=lon, radius=50, fields='id')}")
        for lim in (10, 100):
            prueba(f"radio 50 m, limit={lim}, campos completos · {zona}",
                   f"{API}/images?{q(lat=lat, lng=lon, radius=50, limit=lim, fields=CAMPOS)}")
        # 3. Comparación con bbox pequeño (±50 m y ±150 m).
        for m in (50, 150):
            prueba(f"bbox ±{m} m, limit=100 · {zona}",
                   f"{API}/images?{q(bbox=bbox_metros(lat, lon, m), limit=100, fields=CAMPOS)}")
    # 4. Consultas deliberadamente mal construidas, para ver cómo responde.
    prueba("mal: radio sin lng", f"{API}/images?{q(lat=clat, radius=50, fields='id')}", tipo="control")
    prueba("mal: lat/lng + bbox juntos", f"{API}/images?{q(lat=clat, lng=clon, radius=50, bbox=bbox_metros(clat, clon, 50), fields='id')}", tipo="control")
    prueba("mal: bbox con lat/lon invertidos", f"{API}/images?{q(bbox=f'{clat - 0.001},{clon - 0.001},{clat + 0.001},{clon + 0.001}', fields='id')}", tipo="control")

    resumen = {}
    for p in pruebas:
        resumen[p["clase"]] = resumen.get(p["clase"], 0) + 1
    os.makedirs(os.path.join(DIR, "diagnostico-mapillary"), exist_ok=True)
    out = os.path.join(DIR, "diagnostico-mapillary", time.strftime("%Y%m%d-%H%M%S") + ".json")
    json.dump({"fecha": time.strftime("%Y-%m-%d %H:%M:%S"), "variable_token": var, "centro": [clat, clon], "coordenadas": coords,
               "resumen": resumen, "pruebas": pruebas}, open(out, "w"), ensure_ascii=False, indent=1)
    print("\nResumen:", resumen, "\nGuardado en", os.path.relpath(out, RAIZ))


if __name__ == "__main__":
    main()
