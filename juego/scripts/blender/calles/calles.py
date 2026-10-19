"""
Superficies de calles de La Línea City: calzada, aceras, bordillos, peatonales, senderos y rotondas.

  python3 scripts/blender/calles/calles.py
Lee   city-reconstruction/calles/tramos.json (sección real de cada tramo, exportada del juego con
      scripts/blender/calles/exportar.mjs).
Crea  city-reconstruction/calles/teselas/<tx>_<ty>.json: triángulos por capa y bordes con su altura,
      que scripts/blender/calles/blender_calles.py convierte en mallas de Blender (.blend + GLB).

Reglas:
  · Cada tramo se ensancha desde su eje (uniones redondeadas): las curvas son continuas y los
    cruces quedan cerrados, sin dientes ni manchas.
  · Las esquinas de los cruces se redondean (radio de bordillo ≈ 3 m).
  · Las rotondas (ciclos cortos y casi circulares de la red) se sustituyen por una corona circular
    exacta con su isleta central ajardinada y bordillo.
  · Alturas (sobre el suelo del juego): calzada 0,15 m, acera 0,27 m, isleta 0,30 m, peatonal 0,15 m,
    sendero y pista 0,13 m.
"""
import json
import math
import os
from collections import defaultdict

import shapely
from shapely.geometry import LineString, Point, Polygon, MultiPolygon, box
from shapely.ops import unary_union

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
TES = 400.0
ALTO = {"asfalto": 0.15, "acera": 0.27, "bordillo": 0.272, "peatonal": 0.15, "sendero": 0.13, "pista": 0.13, "isleta": 0.30}


def polys(g):
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [p for p in getattr(g, "geoms", []) if isinstance(p, Polygon)]


def circulo(pts):
    """Ajuste por mínimos cuadrados: centro, radio y error relativo."""
    n = len(pts)
    sx = sum(p[0] for p in pts) / n
    sy = sum(p[1] for p in pts) / n
    u = [(p[0] - sx, p[1] - sy) for p in pts]
    suu = sum(a * a for a, b in u); svv = sum(b * b for a, b in u); suv = sum(a * b for a, b in u)
    suuu = sum(a ** 3 for a, b in u); svvv = sum(b ** 3 for a, b in u)
    suvv = sum(a * b * b for a, b in u); svuu = sum(b * a * a for a, b in u)
    det = suu * svv - suv * suv
    if abs(det) < 1e-9:
        return None
    uc = (0.5 * (suuu + suvv) * svv - 0.5 * (svvv + svuu) * suv) / det
    vc = (0.5 * (svvv + svuu) * suu - 0.5 * (suuu + suvv) * suv) / det
    c = (uc + sx, vc + sy)
    r = math.sqrt(uc * uc + vc * vc + (suu + svv) / n)
    err = math.sqrt(sum((math.dist(p, c) - r) ** 2 for p in pts) / n) / r
    return c, r, err


def rotondas(tramos):
    """Ciclos cortos de la red rodada que se ajustan bien a un círculo."""
    viales = [t for t in tramos if t["grupo"] in ("calle", "servicio") and len(t["eje"]) >= 2]
    ady = defaultdict(list)
    for t in viales:
        L = sum(math.dist(t["eje"][k], t["eje"][k + 1]) for k in range(len(t["eje"]) - 1))
        t["_L"] = L
        ady[t["a"]].append((t["b"], t))
        ady[t["b"]].append((t["a"], t))
    vistos, res = set(), []
    for t in viales:
        if t["a"] == t["b"]:
            ciclo = [t]
        else:
            if t["_L"] > 90:
                continue
            # Camino más corto de b a a sin usar t (BFS por longitud, máx. 12 tramos y 260 m).
            mejor = {t["b"]: (0.0, [])}
            frente = [(0.0, t["b"], [])]
            ciclo = None
            while frente:
                frente.sort(key=lambda q: q[0])
                d, n, camino = frente.pop(0)
                if n == t["a"]:
                    ciclo = [t] + camino
                    break
                if len(camino) >= 12 or d > 260:
                    continue
                for m, q in ady[n]:
                    if q is t or q["_L"] > 90:
                        continue
                    nd = d + q["_L"]
                    if m not in mejor or nd < mejor[m][0]:
                        mejor[m] = (nd, camino + [q])
                        frente.append((nd, m, camino + [q]))
            if not ciclo:
                continue
        clave = frozenset(id(q) for q in ciclo)
        if clave in vistos or len(ciclo) < 1:
            continue
        pts = []
        for q in ciclo:
            e = q["eje"]
            for k in range(len(e) - 1):
                L = math.dist(e[k], e[k + 1])
                for j in range(max(1, int(L))):
                    f = j / max(1, int(L))
                    pts.append((e[k][0] + (e[k + 1][0] - e[k][0]) * f, e[k][1] + (e[k + 1][1] - e[k][1]) * f))
        aj = circulo(pts)
        if not aj:
            continue
        c, r, err = aj
        total = sum(q["_L"] for q in ciclo)
        # Casi circular y cerrado alrededor del centro (perímetro ≈ 2πr).
        angs = sorted(math.atan2(p[1] - c[1], p[0] - c[0]) for p in pts)
        hueco = max([b - a for a, b in zip(angs, angs[1:])] + [angs[0] + 2 * math.pi - angs[-1]])
        nombrada = any(("otonda" in q["nombre"] or "lorieta" in q["nombre"]) for q in ciclo)
        if 5.5 <= r <= 35 and err < (0.09 if nombrada else 0.045) and hueco < math.radians(40) and 0.85 < total / (2 * math.pi * r) < 1.2:
            vistos.add(clave)
            res.append({"c": c, "r": r, "w": min(8.0, max(q["w"] for q in ciclo)), "tramos": [q["i"] for q in ciclo],
                        "nombre": next((q["nombre"] for q in ciclo if q["nombre"]), "")})
    # Fusiona duplicados (mismo centro).
    unicas = []
    for x in sorted(res, key=lambda q: -len(q["tramos"])):
        if all(math.dist(x["c"], y["c"]) > 3 for y in unicas):
            unicas.append(x)
    return unicas


def medianas(tramos):
    """Dobles calzadas: dos tramos casi paralelos, del mismo nombre, más cerca que su ancho. Se estrecha
    cada calzada para que quede una mediana elevada (acera) de ≥ 2,5 m entre ambas."""
    from shapely.strtree import STRtree
    calles = [t for t in tramos if t["grupo"] == "calle" and t["clase"] <= 2 and len(t["eje"]) >= 2]
    lineas = [LineString(t["eje"]) for t in calles]
    arbol = STRtree(lineas)
    n = 0
    for t, L in zip(calles, lineas):
        if L.length < 8:
            continue
        m = L.interpolate(0.5, normalized=True)
        a, b = L.interpolate(0.4, normalized=True), L.interpolate(0.6, normalized=True)
        dir_t = math.atan2(b.y - a.y, b.x - a.x)
        mejor = None
        for k in arbol.query(m.buffer(t["w"])):
            o = calles[k]
            if o is t or (o["nombre"] != t["nombre"]) or not t["nombre"]:
                continue
            Lo = lineas[k]
            d = Lo.distance(m)
            if d < 1.0 or d > t["w"]:
                continue
            p = Lo.project(m)
            q0, q1 = Lo.interpolate(max(0, p - 2)), Lo.interpolate(min(Lo.length, p + 2))
            dir_o = math.atan2(q1.y - q0.y, q1.x - q0.x)
            dd = abs((dir_t - dir_o + math.pi) % (2 * math.pi) - math.pi)
            if dd < math.radians(25) or dd > math.radians(155):
                mejor = d if mejor is None else min(mejor, d)
        if mejor is not None:
            t["w"] = max(5.5, min(t["w"], mejor - 2.5))
            t["mediana"] = True
            n += 1
    return n


def main():
    tramos = json.load(open(os.path.join(RAIZ, "city-reconstruction/calles/tramos.json")))
    print(f"{medianas(tramos)} tramos de doble calzada estrechados para dejar mediana")
    # El juego usa los mismos anchos para árboles, farolas y carriles.
    json.dump({str(t["i"]): round(t["w"], 2) for t in tramos if t.get("mediana")}, open(os.path.join(RAIZ, "src/datos/ciudad/medianas.json"), "w"))
    rot = rotondas(tramos)
    en_rotonda = {i for r in rot for i in r["tramos"]}
    print(f"{len(rot)} rotondas:", ", ".join(f"{r['nombre'] or '—'} (r={r['r']:.1f})" for r in rot))
    calz, aceras, peat, send, pista = [], [], [], [], []
    for t in tramos:
        if len(t["eje"]) < 2 or t["i"] in en_rotonda:
            continue
        L = LineString(t["eje"])
        if L.length < 0.05:
            continue
        g = t["grupo"]
        if g == "calle":
            calz.append(L.buffer(t["w"] / 2, quad_segs=6))
            aceras.append(L.buffer(t["w"] / 2 + t["acera"], quad_segs=6))
        elif g == "servicio":
            calz.append(L.buffer(t["w"] / 2, quad_segs=6))
        elif g == "peatonal":
            peat.append(L.buffer(t["w"] / 2, quad_segs=4))
        elif g == "sendero":
            send.append(L.buffer(t["w"] / 2, quad_segs=3))
        else:
            pista.append(L.buffer(t["w"] / 2, quad_segs=3))
    islas = []
    for r in rot:
        c = Point(r["c"])
        fuera = r["r"] + r["w"] / 2
        dentro = max(1.5, r["r"] - r["w"] / 2)
        calz.append(c.buffer(fuera, quad_segs=24))
        aceras.append(c.buffer(fuera + 2.2, quad_segs=24))
        islas.append(c.buffer(dentro, quad_segs=24))
    A = unary_union(calz)
    # Esquinas de los cruces redondeadas (cierre morfológico) y sin las isletas.
    A = A.buffer(1.8, quad_segs=6).buffer(-1.8, quad_segs=6)
    I = unary_union(islas)
    A = A.difference(I)
    S = unary_union(aceras).buffer(1.0, quad_segs=4).buffer(-1.0, quad_segs=4).difference(A).difference(I)
    P = unary_union(peat).difference(A).difference(S).difference(I)
    SE = unary_union(send).difference(A).difference(S).difference(P).difference(I)
    PI = unary_union(pista).difference(A).difference(S).difference(P).difference(SE).difference(I)
    # Bordillo: franja de 18 cm de la acera junto a la calzada.
    BO = S.intersection(A.buffer(0.18, quad_segs=3)).difference(A)
    capas = {"asfalto": A, "acera": S.difference(BO), "bordillo": BO, "peatonal": P, "sendero": SE, "pista": PI, "isleta": I}
    capas = {k: shapely.make_valid(v.simplify(0.1)) for k, v in capas.items()}
    # Bordes verticales (con su altura) de las capas elevadas.
    xs = [p[0] for t in tramos for p in t["eje"]]
    ys = [p[1] for t in tramos for p in t["eje"]]
    out = os.path.join(RAIZ, "city-reconstruction/calles/teselas")
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    n = 0
    tri_total = 0
    for tx in range(int(min(xs) // TES), int(max(xs) // TES) + 1):
        for ty in range(int(min(ys) // TES), int(max(ys) // TES) + 1):
            caja = box(tx * TES, ty * TES, (tx + 1) * TES, (ty + 1) * TES)
            datos = {"tesela": f"{tx}_{ty}", "origen": [tx * TES + TES / 2, ty * TES + TES / 2], "capas": {}, "bordes": []}
            vacio = True
            for k, g in capas.items():
                parte = g.intersection(caja)
                tris = []
                for p in polys(parte):
                    if p.area < 0.02:
                        continue
                    p = shapely.geometry.polygon.orient(p, 1.0)  # exterior antihorario: normal exterior (dy, −dx)
                    for tr in polys(shapely.constrained_delaunay_triangles(p)):
                        c = list(tr.exterior.coords)[:3]
                        tris.append([round(v, 3) for q in c for v in q])
                    # Bordes verticales hasta el suelo (cara del bordillo, canto de la isleta…).
                    if k in ("acera", "bordillo", "isleta", "asfalto"):
                        for anillo in [p.exterior, *p.interiors]:
                            cs = list(anillo.coords)
                            for a, b in zip(cs, cs[1:]):
                                if math.dist(a, b) < 0.01:
                                    continue
                                # Lado del borde que no está en la caja de la tesela: no se duplica.
                                m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                                if abs(m[0] - tx * TES) < 0.01 or abs(m[0] - (tx + 1) * TES) < 0.01 or abs(m[1] - ty * TES) < 0.01 or abs(m[1] - (ty + 1) * TES) < 0.01:
                                    continue
                                datos["bordes"].append([k, round(a[0], 3), round(a[1], 3), round(b[0], 3), round(b[1], 3), ALTO[k]])
                if tris:
                    datos["capas"][k] = tris
                    tri_total += len(tris)
                    vacio = False
            if not vacio:
                json.dump(datos, open(os.path.join(out, f"{tx}_{ty}.json"), "w"))
                n += 1
    json.dump({"rotondas": rot, "alturas": ALTO, "tesela_m": TES}, open(os.path.join(RAIZ, "city-reconstruction/calles/resumen.json"), "w"), ensure_ascii=False, indent=1)
    print(f"{n} teselas · {tri_total} triángulos de superficie")


if __name__ == "__main__":
    main()
