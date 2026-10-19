"""
Divide la ciudad en secciones para fotografiarlas a pie (unas pocas manzanas cada una).

  python3 scripts/exploracion/secciones.py
Crea  city-reconstruction/secciones/secciones.json: id, barrio, centro, caja, calles, edificios,
      comercios y estado (pendiente / fotos / modelada). Orden: Centro primero y luego por
      distancia al centro. Las secciones ya existentes conservan su estado.
"""
import glob
import json
import math
import os
from collections import defaultdict

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CELDA = 160.0
MIN_EDIF = 20
CODIGO = {"Centro": "CEN", "San José": "SJO", "San Pedro": "SPE", "La Atunara": "ATU", "La Velada": "VEL", "San Bernardo": "SBE", "Santa Margarita": "SMA",
          "Santiago": "SAN", "El Zabal": "ZAB", "La Colonia": "COL", "Las Pedreras": "PED", "Los Junquillos": "JUN", "Mondéjar": "MON", "San Felipe": "SFE", "Bellavista": "BEL"}


def main():
    eds = []
    for f in glob.glob(os.path.join(RAIZ, "public/ciudad/teselas/*.json")):
        for e in json.load(open(f))["edificios"]:
            h = e["huella"]
            c = (sum(p[0] for p in h) / len(h), sum(p[1] for p in h) / len(h))
            eds.append((e.get("barrio") or "Otros", c, e.get("pb") == "comercio" or e.get("tipologia") == "comercial", e["id"]))
    # Celdas por barrio.
    celdas = defaultdict(list)
    for b, c, com, i in eds:
        celdas[(b, int(c[0] // CELDA), int(c[1] // CELDA))].append((c, com, i))
    # Las celdas pequeñas se juntan con la vecina más poblada del mismo barrio.
    cambio = True
    while cambio:
        cambio = False
        for k in sorted(celdas, key=lambda k: len(celdas[k])):
            if len(celdas[k]) >= MIN_EDIF:
                continue
            b, x, y = k
            vecinas = [(b, x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (b, x + dx, y + dy) in celdas]
            if not vecinas:
                continue
            v = max(vecinas, key=lambda q: len(celdas[q]))
            celdas[v] += celdas.pop(k)
            cambio = True
            break
    tramos = json.load(open(os.path.join(RAIZ, "city-reconstruction/calles/tramos.json")))
    centro = (2330, 4150)
    previas = {}
    fsal = os.path.join(RAIZ, "city-reconstruction/secciones/secciones.json")
    if os.path.exists(fsal):
        for s in json.load(open(fsal))["secciones"]:
            previas[s["clave"]] = s
    lista = []
    for (b, x, y), es in celdas.items():
        xs = [c[0] for c, _, _ in es]
        ys = [c[1] for c, _, _ in es]
        caja = [min(xs) - 6, min(ys) - 6, max(xs) + 6, max(ys) + 6]
        cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        largo = defaultdict(float)
        for t in tramos:
            if not t["nombre"] or t["grupo"] not in ("calle", "peatonal", "servicio"):
                continue
            for p, q in zip(t["eje"], t["eje"][1:]):
                m = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
                if caja[0] <= m[0] <= caja[2] and caja[1] <= m[1] <= caja[3]:
                    largo[t["nombre"]] += math.dist(p, q)
        calles = [n for n, L in sorted(largo.items(), key=lambda kv: -kv[1]) if L > 15][:12]
        clave = f"{b}|{x}|{y}"
        lista.append({"clave": clave, "barrio": b, "centro": [round(cx, 1), round(cy, 1)], "caja": [round(v, 1) for v in caja], "calles": calles,
                      "edificios": len(es), "comercios": sum(1 for _, com, _ in es if com), "ids": [i for _, _, i in es],
                      "estado": previas.get(clave, {}).get("estado", "pendiente")})
    lista.sort(key=lambda s: (s["barrio"] != "Centro", math.dist(s["centro"], centro)))
    cuenta = defaultdict(int)
    for s in lista:
        cuenta[s["barrio"]] += 1
        s["id"] = f"{CODIGO.get(s['barrio'], 'OTR')}-{cuenta[s['barrio']]:02d}"
        s["orden"] = lista.index(s) + 1
    json.dump({"generado": "2026-10-19", "celda_m": CELDA, "secciones": lista}, open(fsal, "w"), ensure_ascii=False, indent=1)
    print(len(lista), "secciones;", ", ".join(f"{b}: {n}" for b, n in cuenta.items()))
    for s in lista[:6]:
        print(s["id"], s["edificios"], "edif.", s["comercios"], "com.", "·", ", ".join(s["calles"][:5]))


if __name__ == "__main__":
    main()
