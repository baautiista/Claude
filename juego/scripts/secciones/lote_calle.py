"""
Lote de una calle completa (las dos aceras) para modelarla en Blender con fotos.

  python3 scripts/secciones/lote_calle.py <LOTE> "<Nombre de la calle>" x0 x1
Toma los edificios que dan a esa calle entre x0 y x1 (coordenadas del juego):
  · los de la ciudad generada (OSM/Overture);
  · las parcelas del Catastro (INSPIRE BU) que no están en OSM (calles con una acera vacía).
Plantas: las del Catastro (la parte más alta que cubre ≥ 30 % de la huella).
Escribe city-reconstruction/blender/lotes/<LOTE>.json (formato de scripts/blender/lote.py) con
`frente_calle` = posición (x, y), lado (N/S) y longitud de la fachada a esa calle.
"""
import glob
import json
import math
import os
import sys
from collections import defaultdict

from shapely.geometry import LineString, Polygon, Point
from shapely.ops import unary_union

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(RAIZ, "scripts", "exploracion"))
import explorar as X  # noqa: E402

L0, A0, KX, KY = -5.3762, 36.2005, 89842, 110950


def frente(h, eje, maxd=10):
    """Arista más larga casi paralela a la calle y cerca de ella: (centro, lado, longitud, índice)."""
    mejor = None
    for i in range(len(h)):
        a, b = h[i], h[(i + 1) % len(h)]
        S = LineString([a, b])
        ln = S.length
        if ln < 1.2:
            continue
        m = S.interpolate(0.5, normalized=True)
        if eje.distance(m) > maxd:
            continue
        s = eje.project(m)
        q1, q2 = eje.interpolate(max(0, s - 1)), eje.interpolate(min(eje.length, s + 1))
        dx, dy = q2.x - q1.x, q2.y - q1.y
        n = math.hypot(dx, dy) or 1
        if abs(((b[0] - a[0]) * dx + (b[1] - a[1]) * dy) / (ln * n)) < 0.7:
            continue
        q = eje.interpolate(s)
        lado = "S" if (m.x - q.x) * (-dy) + (m.y - q.y) * dx < 0 else "N"
        if not mejor or ln > mejor[2]:
            mejor = ((round(m.x, 2), round(m.y, 2)), lado, round(ln, 2), i)
    return mejor


def main(lote, calle, x0, x1):
    tramos = json.load(open(os.path.join(RAIZ, "city-reconstruction/calles/tramos.json")))
    pts = sorted([p for t in tramos if t["nombre"] == calle for p in t["eje"] if x0 - 30 <= p[0] <= x1 + 30], key=lambda p: p[0])
    eje = LineString(pts)
    caja = eje.buffer(40).bounds
    # Catastro: partes de edificio de la zona (se guardan en caché).
    a = (L0 + caja[0] / KX, A0 - caja[3] / KY)
    b = (L0 + caja[2] / KX, A0 - caja[1] / KY)
    _, partes = X.fuente_catastro(f"lote-{lote}", [a[0], a[1], b[0], b[1]])
    osm = []
    for f in glob.glob(os.path.join(RAIZ, "public/ciudad/teselas/*.json")):
        for e in json.load(open(f))["edificios"]:
            P = Polygon(e["huella"]).buffer(0)
            if P.distance(eje) < 12 and x0 - 10 <= P.centroid.x <= x1 + 10:
                osm.append((e, P))
    todos_osm = unary_union([P for f in glob.glob(os.path.join(RAIZ, "public/ciudad/teselas/*.json")) for e in json.load(open(f))["edificios"]
                             for P in [Polygon(e["huella"]).buffer(0)] if P.distance(eje) < 60])
    edificios = []
    for e, P in osm:
        fr = frente(e["huella"], eje)
        if not fr or not (x0 <= fr[0][0] <= x1):
            continue
        e = dict(e)
        r = X.plantas_catastro({"datos": json.dumps({"huella": e["huella"]})}, partes)
        if r:
            e["plantas"] = r[0]
            e["alturaM"] = round(3.6 + 3.0 * (r[0] - 1), 1) if r[0] > 1 else 3.6
            e["fuentes"] = {**e.get("fuentes", {}), "plantas": f"Catastro (parte {r[2]})"}
        e["frente_calle"] = {"centro": fr[0], "lado": fr[1], "largo": fr[2], "arista": fr[3]}
        edificios.append(e)
    # Parcelas del Catastro que faltan en OSM.
    por_parcela = defaultdict(list)
    for p in partes:
        por_parcela[p["id"].split(".")[-1].split("_")[0]].append(p)
    nuevos = []
    for ref, ps in por_parcela.items():
        U = unary_union([Polygon(p["huella"]).buffer(0) for p in ps]).buffer(0.05).buffer(-0.05)
        if U.geom_type != "Polygon" or U.area < 15:
            continue
        if U.intersection(todos_osm).area > 0.2 * U.area:
            continue
        h = [list(c) for c in U.exterior.simplify(0.15).coords[:-1]]
        fr = frente(h, eje)
        if not fr or not (x0 <= fr[0][0] <= x1):
            continue
        pl = max([p["plantas"] for p in ps if Polygon(p["huella"]).buffer(0).area >= 0.3 * U.area] or [max(p["plantas"] for p in ps)])
        nuevos.append((ref, U, h, pl, fr))
    union_nuevos = unary_union([n[1] for n in nuevos] + [todos_osm])
    for ref, U, h, pl, fr in nuevos:
        caras = []
        for i in range(len(h)):
            a, b = h[i], h[(i + 1) % len(h)]
            S = LineString([a, b])
            m = S.interpolate(0.5, normalized=True)
            ln = S.length or 1
            nx, ny = (b[1] - a[1]) / ln, -(b[0] - a[0]) / ln
            fuera = Point(m.x + nx * 0.6, m.y + ny * 0.6)
            if U.contains(fuera):
                fuera = Point(m.x - nx * 0.6, m.y - ny * 0.6)
            otro = union_nuevos.difference(U.buffer(0.3))
            caras.append("medianera" if otro.contains(fuera) or otro.distance(fuera) < 0.3 else ("calle" if i == fr[3] or eje.distance(m) < 9 else "patio"))
        caras[fr[3]] = "calle"
        pl = max(1, pl)
        edificios.append({
            "id": f"C-{ref}", "fuente": "Catastro", "nombre": None, "barrio": "Centro", "huella": [[round(x, 2), round(y, 2)] for x, y in h], "patios": [],
            "caras": caras, "area": round(U.area, 1), "plantas": pl, "alturaM": round(3.6 + 3.0 * (pl - 1), 1) if pl > 1 else 3.6,
            "cubierta": "azotea", "atico": None, "tipologia": "medianeras" if pl <= 3 else "bloque", "revestimiento": "revoco", "color": "#EFE7D6",
            "zocalo": False, "pb": "comercio", "fuentes": {"huella": "Catastro INSPIRE BU (DGC)", "plantas": "Catastro", "catastro": ref},
            "frente_calle": {"centro": fr[0], "lado": fr[1], "largo": fr[2], "arista": fr[3]},
        })
    xs = [p[0] for e in edificios for p in e["huella"]]
    ys = [p[1] for e in edificios for p in e["huella"]]
    o = [round((min(xs) + max(xs)) / 2), round((min(ys) + max(ys)) / 2)]
    # Lado de cada edificio respecto al eje (en el juego, y crece hacia el sur).
    for e in edificios:
        c = Polygon(e["huella"]).centroid
        q = eje.interpolate(eje.project(c))
        e["frente_calle"]["lado"] = "S" if c.y > q.y else "N"
    # Fuera lo que ya tiene sector propio hecho a mano (zonas: centro, radio, lado).
    excl = [tuple(z) for z in json.loads(os.environ.get("EXCLUIR", "[]"))]
    edificios = [e for e in edificios if not any(math.dist(Polygon(e["huella"]).centroid.coords[0], (zx, zy)) < zr and e["frente_calle"]["lado"] == zl for zx, zy, zr, zl in excl)]
    edificios.sort(key=lambda e: (e["frente_calle"]["lado"], e["frente_calle"]["centro"][0]))
    json.dump({"nombre": lote, "origen": o, "calle": calle, "nota": "Calle completa: OSM + parcelas del Catastro que faltaban.", "edificios": edificios},
              open(os.path.join(RAIZ, "city-reconstruction/blender/lotes", f"{lote}.json"), "w"), ensure_ascii=False, indent=1)
    for e in edificios:
        f = e["frente_calle"]
        print(f["lado"], round(f["centro"][0]), f["largo"], e["id"], e["plantas"], "pl")
    print(f"{lote}: {len(edificios)} edificios ({sum(1 for e in edificios if e['id'].startswith('C-'))} nuevos del Catastro)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]))
