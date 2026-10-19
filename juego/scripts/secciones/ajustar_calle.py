"""
Ajusta la sección de una calle a sus fachadas reales (las dos aceras de un lote de calle).

  python3 scripts/secciones/ajustar_calle.py <LOTE> [calzada_m]
Mide cada 2 m la distancia del eje a la fachada de cada lado, centra el eje entre ambas y reparte
el ancho: calzada (por defecto la de la ficha o 3,2 m, un carril) y aceras con lo que quede.
Escribe city-reconstruction/calles/ajustes.json (lo usan calles.py y el juego).
"""
import glob
import json
import math
import os
import sys

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main(lote, calzada=3.2):
    d = json.load(open(os.path.join(RAIZ, "city-reconstruction/blender/lotes", f"{lote}.json")))
    calle = d["calle"]
    polis = [Polygon(e["huella"]).buffer(0) for e in d["edificios"]]
    for f in glob.glob(os.path.join(RAIZ, "public/ciudad/teselas/*.json")):
        for e in json.load(open(f))["edificios"]:
            polis.append(Polygon(e["huella"]).buffer(0))
    U = unary_union(polis)
    xs = [p[0] for e in d["edificios"] for p in e["huella"]]
    tramos = json.load(open(os.path.join(RAIZ, "city-reconstruction/calles/tramos.json")))
    fa = os.path.join(RAIZ, "city-reconstruction/calles/ajustes.json")
    ajustes = json.load(open(fa)) if os.path.exists(fa) else {}
    for t in tramos:
        if t["nombre"] != calle or not any(min(xs) - 5 <= p[0] <= max(xs) + 5 for p in t["eje"]):
            continue
        L = LineString(t["eje"])
        muestras = []
        for k in range(int(L.length // 2) + 1):
            s_ = min(L.length, k * 2.0)
            p = L.interpolate(s_)
            q1, q2 = L.interpolate(max(0, s_ - 1)), L.interpolate(min(L.length, s_ + 1))
            dx, dy = q2.x - q1.x, q2.y - q1.y
            n = math.hypot(dx, dy) or 1
            nx, ny = -dy / n, dx / n
            libres, ini = [], None
            for kk in range(-150, 151):
                r = kk * 0.1
                dentro = U.contains(Point(p.x + nx * r, p.y + ny * r))
                if not dentro and ini is None:
                    ini = r
                if dentro and ini is not None:
                    libres.append((ini, r))
                    ini = None
            cerr = [(a0, b0) for a0, b0 in libres if a0 > -15 and 3.0 <= b0 - a0 <= 14]
            if cerr:
                a0, b0 = min(cerr, key=lambda iv: abs((iv[0] + iv[1]) / 2))
                muestras.append((s_, (a0 + b0) / 2, b0 - a0, nx, ny, p))
        if len(muestras) < 2:
            continue
        # Desplazamiento medio aplicado a todo el tramo (los extremos caen en cruces sin fachadas).
        off = sorted(m[1] for m in muestras)[len(muestras) // 2]
        anchos = [m[2] for m in muestras]
        nuevos = []
        for q in t["eje"]:
            s_ = L.project(Point(q))
            m = min(muestras, key=lambda mm: abs(mm[0] - s_))
            nuevos.append([round(q[0] + m[3] * off, 2), round(q[1] + m[4] * off, 2)])
        W = sorted(anchos)[len(anchos) // 3]
        if W >= 12:
            continue
        cz = min(calzada, max(2.6, W - 1.6))
        acera = round(max(0.6, min(2.2, (W - cz) / 2 - 0.05)), 2)
        ajustes[str(t["i"])] = {"w": round(cz, 2), "acera": acera, "eje": nuevos, "ancho_entre_fachadas": round(W, 2), "lote": lote}
        print(t["i"], "entre fachadas", round(W, 1), "m → calzada", round(cz, 2), "acera", acera)
    json.dump(ajustes, open(fa, "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 3.2)
