"""
Extrae una manzana real de la ciudad generada (public/ciudad/teselas) a un lote para Blender.

Uso: python3 scripts/blender/lote.py <NOMBRE> <id_de_un_edificio_de_la_manzana>
Escribe city-reconstruction/blender/lotes/<NOMBRE>.json con los edificios contiguos
(huellas que se tocan), sus datos (plantas, altura, tipología, caras a calle/patio/medianera,
colores, cubierta…) y el origen local del lote en coordenadas del juego (1 unidad = 1 m).
"""
import glob, json, os, sys
from shapely.geometry import Polygon
from shapely.strtree import STRtree

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main(nombre, semilla):
    eds = []
    for f in sorted(glob.glob(os.path.join(RAIZ, "public", "ciudad", "teselas", "*.json"))):
        for e in json.load(open(f))["edificios"]:
            try:
                p = Polygon(e["huella"]).buffer(0)
            except Exception:
                continue
            if p.is_empty:
                continue
            eds.append((e, p))
    geoms = [p.buffer(0.6) for _, p in eds]
    arbol = STRtree(geoms)
    ini = next(i for i, (e, _) in enumerate(eds) if e["id"] == semilla)
    vistos, pila = {ini}, [ini]
    while pila:
        i = pila.pop()
        for j in arbol.query(geoms[i]):
            j = int(j)
            if j not in vistos and geoms[i].intersects(geoms[j]):
                vistos.add(j)
                pila.append(j)
    sel = [eds[i] for i in sorted(vistos)]
    cx = round(sum(p.centroid.x for _, p in sel) / len(sel))
    cy = round(sum(p.centroid.y for _, p in sel) / len(sel))
    lote = {
        "nombre": nombre,
        "origen": [cx, cy],
        "nota": "Coordenadas del juego (x, y del mapa; 1 unidad = 1 m). Datos: OSM/Overture/IGN vía scripts/sector.",
        "edificios": [e for e, _ in sel],
    }
    destino = os.path.join(RAIZ, "city-reconstruction", "blender", "lotes", f"{nombre}.json")
    json.dump(lote, open(destino, "w"), ensure_ascii=False, indent=1)
    print(f"{nombre}: {len(sel)} edificios, origen {cx},{cy} → {destino}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
