"""
Placas con el nombre de las calles: una en el primer edificio y otra en el último de cada vía.

  python3 scripts/blender/calles/placas.py
Lee   city-reconstruction/calles/tramos.json y las huellas de public/ciudad/teselas/*.json
Crea  src/datos/ciudad/placas.json: [[prefijo, nombre, x, y, nx, ny, z], …] (z = altura sobre la acera)

Reglas:
  · Vías con nombre (calle, avenida, pasaje, plaza, paseo, travesía, callejón, ronda, glorieta…);
    no los aparcamientos, accesos ni nombres de lugares.
  · Los extremos de la vía son los nudos donde termina su red (grado 1 dentro de esa vía).
  · En cada extremo, la placa va en la fachada más cercana que da a esa calle (paralela a ella,
    mirando hacia la calzada y a menos de 14 m del cruce), a 2,9 m de altura, cerca de la esquina.
  · Si no hay fachada (descampado, parque) no se pone placa.
"""
import glob
import json
import math
import os
from collections import defaultdict

from shapely.geometry import LineString, Point, Polygon
from shapely.strtree import STRtree

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
PREFIJOS = ["Avenida", "Calle", "Pasaje", "Plaza", "Paseo", "Travesía", "Callejón", "Ronda", "Glorieta", "Rotonda", "Camino", "Carretera",
            "Barriada", "Urbanización", "Pasillo", "Plazoleta", "Bulevar", "Calzada", "Cuesta", "Muelle", "Explanada"]


def separar(nombre):
    for p in PREFIJOS:
        if nombre.startswith(p + " "):
            resto = nombre[len(p) + 1:]
            return p, resto
    return None, None


def main():
    tramos = json.load(open(os.path.join(RAIZ, "city-reconstruction/calles/tramos.json")))
    # Fachadas: aristas de todas las huellas, con su normal exterior.
    aristas, datos = [], []
    for f in glob.glob(os.path.join(RAIZ, "public/ciudad/teselas/*.json")):
        for e in json.load(open(f))["edificios"]:
            h = e["huella"]
            if len(h) < 3:
                continue
            area = sum(h[i][0] * h[(i + 1) % len(h)][1] - h[(i + 1) % len(h)][0] * h[i][1] for i in range(len(h))) / 2
            for i in range(len(h)):
                a, b = h[i], h[(i + 1) % len(h)]
                L = math.dist(a, b)
                if L < 1.4:
                    continue
                dx, dy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
                n = (dy, -dx) if area > 0 else (-dy, dx)
                aristas.append(LineString([a, b]))
                datos.append((a, b, n, e.get("plantas", 2)))
    arbol = STRtree(aristas)
    por_nombre = defaultdict(list)
    for t in tramos:
        if t["nombre"] and t["grupo"] in ("calle", "servicio", "peatonal") and len(t["eje"]) >= 2:
            por_nombre[t["nombre"]].append(t)
    placas = []
    sin_fachada = 0
    for nombre, ts in por_nombre.items():
        pre, resto = separar(nombre)
        if not pre:
            continue
        grado = defaultdict(int)
        for t in ts:
            grado[t["a"]] += 1
            grado[t["b"]] += 1
        extremos = []
        for t in ts:
            for nodo, p, q in ((t["a"], t["eje"][0], t["eje"][1]), (t["b"], t["eje"][-1], t["eje"][-2])):
                if grado[nodo] == 1:
                    extremos.append((p, q, t))
        if not extremos:  # vía cerrada: una sola placa
            t = ts[0]
            extremos = [(t["eje"][0], t["eje"][1], t)]
        # Si hay muchos trozos, solo los dos extremos más alejados entre sí.
        if len(extremos) > 2:
            mejor = max(((i, j) for i in range(len(extremos)) for j in range(i + 1, len(extremos))), key=lambda ij: math.dist(extremos[ij[0]][0], extremos[ij[1]][0]))
            extremos = [extremos[mejor[0]], extremos[mejor[1]]]
        puestas = []
        for (p, q, t) in extremos:
            L = math.dist(p, q) or 1
            d = ((q[0] - p[0]) / L, (q[1] - p[1]) / L)
            Q = Point(p[0] + d[0] * 4, p[1] + d[1] * 4)
            mejor = None
            for k in arbol.query(Q.buffer(14)):
                a, b, n, plantas = datos[k]
                ln = aristas[k]
                ux, uy = (b[0] - a[0]) / ln.length, (b[1] - a[1]) / ln.length
                if abs(ux * d[0] + uy * d[1]) < 0.75:  # la fachada debe ir a lo largo de la calle
                    continue
                s = ln.project(Q)
                s = min(max(s, 0.5), ln.length - 0.5)
                c = ln.interpolate(s)
                # Mira hacia la calle: el eje queda delante de la fachada.
                if (Q.x - c.x) * n[0] + (Q.y - c.y) * n[1] <= 0.3:
                    continue
                dist = c.distance(Q)
                if dist > t["w"] / 2 + t.get("acera", 0) + 7:
                    continue
                if not mejor or dist < mejor[0]:
                    mejor = (dist, c, n, plantas)
            if not mejor:
                sin_fachada += 1
                continue
            _, c, n, plantas = mejor
            if any(math.dist((c.x, c.y), x) < 25 for x in puestas):
                continue
            puestas.append((c.x, c.y))
            placas.append([pre, resto, round(c.x + n[0] * 0.04, 2), round(c.y + n[1] * 0.04, 2), round(n[0], 3), round(n[1], 3), 2.9 if plantas > 1 else 2.3])
    json.dump(placas, open(os.path.join(RAIZ, "src/datos/ciudad/placas.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(placas)} placas en {len({(p[0], p[1]) for p in placas})} vías · {sin_fachada} extremos sin fachada cerca")


if __name__ == "__main__":
    main()
