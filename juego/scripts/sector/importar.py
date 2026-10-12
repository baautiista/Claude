"""
Importa fuentes oficiales descargadas a mano (cuando la red del entorno no permite bajarlas).

Deja los ficheros en:
  fuentes/importar/catastro/   *.zip (descarga ATOM municipal de edificios, 11022 La Línea) o *.gml (INSPIRE BU)
  fuentes/importar/alturas/    *.geojson | *.csv con alturas medidas (polígonos o puntos con campo altura/height)
                               *.laz | *.las (PNOA LiDAR, clasificado: 2 = suelo, 6 = edificio)

  python3 scripts/sector/importar.py

Produce fuentes/catastro/edificios.json y fuentes/alturas/alturas.json (coordenadas lon/lat),
que el generador usa con prioridad sobre OSM/Overture. Nada se estima aquí: solo se leen datos.
"""
import csv
import glob
import io
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMP = os.path.join(RAIZ, "fuentes", "importar")


def _transformador(epsg):
    from pyproj import Transformer

    return Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)


def _epsg(texto, defecto=25830):
    m = re.search(r"EPSG(?:::|:|/)(\d{4,5})", texto or "")
    return int(m.group(1)) if m else defecto


def _local(tag):
    return tag.rsplit("}", 1)[-1]


def leer_gml(datos: bytes):
    """INSPIRE Buildings 2D del Catastro: Building y BuildingPart con plantas sobre rasante."""
    raiz = ET.fromstring(datos)
    epsg = _epsg(raiz.attrib.get("srsName", "") or datos[:4000].decode("utf8", "ignore"))
    tr = _transformador(epsg)
    out = []
    for el in raiz.iter():
        tipo = _local(el.tag)
        if tipo not in ("Building", "BuildingPart"):
            continue
        gid = el.attrib.get("{http://www.opengis.net/gml/3.2}id") or el.attrib.get("gml:id") or ""
        plantas = None
        uso = None
        anillos = []
        for sub in el.iter():
            n = _local(sub.tag)
            if n == "numberOfFloorsAboveGround" and (sub.text or "").strip().isdigit():
                plantas = int(sub.text.strip())
            elif n == "currentUse" and sub.text:
                uso = sub.text.strip()
            elif n == "posList" and sub.text:
                v = [float(x) for x in sub.text.split()]
                dim = int(sub.attrib.get("srsDimension", "2"))
                pts = [tr.transform(v[i], v[i + 1]) for i in range(0, len(v) - dim + 1, dim)]
                anillos.append([[round(x, 7), round(y, 7)] for x, y in pts])
        if not anillos:
            continue
        out.append({"id": gid, "tipo": tipo, "plantas": plantas, "uso": uso, "anillos": anillos})
    return out


def importar_catastro():
    edificios = []
    for f in sorted(glob.glob(os.path.join(IMP, "catastro", "*"))):
        if f.lower().endswith(".zip"):
            with zipfile.ZipFile(f) as z:
                for n in z.namelist():
                    if n.lower().endswith(".gml"):
                        edificios += leer_gml(z.read(n))
        elif f.lower().endswith(".gml"):
            edificios += leer_gml(open(f, "rb").read())
    if not edificios:
        return 0
    os.makedirs(os.path.join(RAIZ, "fuentes", "catastro"), exist_ok=True)
    json.dump(edificios, open(os.path.join(RAIZ, "fuentes", "catastro", "edificios.json"), "w"))
    return len(edificios)


def importar_alturas():
    alturas = []
    for f in sorted(glob.glob(os.path.join(IMP, "alturas", "*"))):
        low = f.lower()
        if low.endswith(".geojson") or low.endswith(".json"):
            g = json.load(open(f))
            for ft in g.get("features", []):
                p = ft.get("properties", {})
                h = p.get("altura", p.get("height", p.get("h")))
                if h is None:
                    continue
                alturas.append({"geom": ft["geometry"], "altura": float(h), "fuente": os.path.basename(f)})
        elif low.endswith(".csv"):
            for r in csv.DictReader(open(f)):
                h = r.get("altura") or r.get("height")
                if h and r.get("lon") and r.get("lat"):
                    alturas.append({"geom": {"type": "Point", "coordinates": [float(r["lon"]), float(r["lat"])]}, "altura": float(h), "fuente": os.path.basename(f)})
        elif low.endswith(".laz") or low.endswith(".las"):
            alturas += lidar(f)
    if not alturas:
        return 0
    os.makedirs(os.path.join(RAIZ, "fuentes", "alturas"), exist_ok=True)
    json.dump(alturas, open(os.path.join(RAIZ, "fuentes", "alturas", "alturas.json"), "w"))
    return len(alturas)


def lidar(ruta, celda=4.0):
    """PNOA LiDAR clasificado: altura sobre el suelo de los puntos de edificio, en celdas de 4 m.

    El generador asigna a cada huella el percentil 90 de las celdas que caen dentro.
    """
    import laspy
    import numpy as np

    las = laspy.read(ruta)
    epsg = 25830
    try:
        crs = las.header.parse_crs()
        if crs is not None and crs.to_epsg():
            epsg = crs.to_epsg()
    except Exception:  # noqa: BLE001
        pass
    x, y, z, c = np.asarray(las.x), np.asarray(las.y), np.asarray(las.z), np.asarray(las.classification)
    suelo = c == 2
    edif = c == 6
    if not suelo.any() or not edif.any():
        return []
    gx = np.floor(x / celda).astype(np.int64)
    gy = np.floor(y / celda).astype(np.int64)
    # Suelo de referencia por celda de 20 m (mediana), para no depender de puntos bajo el edificio.
    sx, sy = np.floor(x[suelo] / 20).astype(np.int64), np.floor(y[suelo] / 20).astype(np.int64)
    ref = {}
    for k, zz in zip(zip(sx.tolist(), sy.tolist()), z[suelo].tolist()):
        ref.setdefault(k, []).append(zz)
    ref = {k: float(np.median(v)) for k, v in ref.items()}
    celdas = {}
    for i in np.nonzero(edif)[0].tolist():
        k = (int(gx[i]), int(gy[i]))
        celdas.setdefault(k, []).append(float(z[i]))
    tr = _transformador(epsg)
    out = []
    for (cx, cy), zs in celdas.items():
        k20 = (int((cx * celda) // 20), int((cy * celda) // 20))
        base = ref.get(k20)
        if base is None:
            continue
        h = float(np.percentile(zs, 90)) - base
        if h < 2:
            continue
        lon, lat = tr.transform((cx + 0.5) * celda, (cy + 0.5) * celda)
        out.append({"geom": {"type": "Point", "coordinates": [lon, lat]}, "altura": round(h, 2), "fuente": "PNOA LiDAR " + os.path.basename(ruta)})
    return out


if __name__ == "__main__":
    n1 = importar_catastro()
    n2 = importar_alturas()
    print(f"Catastro: {n1} edificios/partes · Alturas: {n2} registros")
    if not n1 and not n2:
        print("No hay ficheros en fuentes/importar/. Ver la cabecera de este script.")
        sys.exit(0)
