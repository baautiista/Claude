"""
Generador automático de sectores de La Línea.

  python3 scripts/sector/generar.py CENTRO-T01

1. Comprueba las fuentes (fuentes/estado.json, ver fuentes.py).
2. Delimita el sector (manzana cerrada por calles reales de OSM).
3. Toma las huellas de Overture (que incluye OSM e IGN) y las etiquetas de OSM.
4. Valida y repara: huellas cerradas, solapes, invasión de calzada y acera.
5. Clasifica cada arista: calle, medianera o patio.
6. Plantas y altura: dato de fuente si existe; si no, estimación por reglas, marcada.
7. Tipología, cubierta, planta baja, material y color por reglas arquitectónicas.
8. Nivel A (automático), B (característico) o C (singular).
9. Escribe src/datos/sectores/<ID>.json y city-reconstruction/reports/<ID>.md.

No toca las correcciones manuales (src/datos/correcciones/<ID>.json): el juego las
aplica encima al cargar, así que regenerar un sector nunca las pierde.
"""
import datetime
import hashlib
import json
import math
import os
import sys

import pyarrow.parquet as pq
from shapely import wkb
from shapely.geometry import LineString, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import polygonize, unary_union

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KX, KY, LON0, LAT0 = 44921, 55475, -5.3762, 36.2005

# Mismas reglas que el juego (src/datos/mapa.ts y scripts/geojson-a-mapa.mjs).
CLASE = {
    "motorway": 0, "trunk": 0, "primary": 0, "motorway_link": 0, "trunk_link": 0, "primary_link": 0,
    "secondary": 1, "secondary_link": 1, "tertiary": 2, "tertiary_link": 2, "unclassified": 2,
    "residential": 3, "living_street": 3, "pedestrian": 4, "service": 5,
}
ANCHO_VIA = [14, 12, 10, 8.5, 8.5, 5.5, 2.5, 4.5]
ACERA = 1.2
# Paso mínimo que se garantiza desde el eje de cada calle. Las huellas reales se respetan:
# el juego estrecha la calle hasta las fachadas (y quita la acera si no cabe), en vez de
# recortar las casas para meter un ancho nominal que la calle real no tiene.
PASO_MIN = {0: 6.0, 1: 4.5, 2: 1.5, 3: 1.5, 4: 1.2, 5: 1.2}
PB, PLANTA = 3.6, 3.0

# Calles comerciales del Centro: planta baja de comercio.
COMERCIALES = {"Calle Real", "Calle Clavel", "Calle Sol", "Calle Teatro", "Calle Jardines", "Calle Gibraltar", "Calle Aurora", "Calle San Pablo"}

# Paletas por tipología (colores de La Línea: encalado, albero, salmón, almagra, crema).
PALETAS = {
    "casa_baja": ["#F6F3EC", "#F3E7C9", "#EED9A8", "#F2D6C9", "#E9C9A3", "#F7F1E3"],
    "casa_dos": ["#F6F3EC", "#EFE3C6", "#E8C35A", "#E9B38F", "#D9A37A", "#F2EBDD", "#E6CFA0"],
    "burguesa": ["#EFE3C6", "#E9B38F", "#D98A6A", "#E8C35A", "#F2EBDD", "#C9533E", "#EBC9B8"],
    "bloque": ["#F2F0EA", "#EADFB8", "#E3CFA8", "#E9E4D6", "#D9C7A8", "#F1EDE4"],
    "anexo": ["#EDE9E0"],
}


def juego(lon, lat):
    return ((lon - LON0) * KX, -(lat - LAT0) * KY)


def h(s, n):
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % n


def cargar_osm():
    g = json.load(open(os.path.join(RAIZ, "fuentes", "la-linea.geojson")))
    calles, pois, etiquetas = [], [], {}
    for f in g["features"]:
        p, geo = f["properties"], f["geometry"]
        if geo["type"] == "LineString" and p.get("highway") in CLASE:
            calles.append({"nombre": p.get("name", ""), "clase": CLASE[p["highway"]], "linea": LineString([juego(*c) for c in geo["coordinates"]])})
        elif geo["type"] == "Point" and (p.get("shop") or p.get("amenity") or p.get("office")):
            pois.append((Point(juego(*geo["coordinates"])), p))
        if "building" in p:
            etiquetas[p.get("@id", "").replace("way/", "w").replace("relation/", "r")] = p
    return calles, pois, etiquetas


def cargar_overture(zona):
    t = pq.read_table(os.path.join(RAIZ, "fuentes", "overture", "la-linea-buildings.parquet"))
    out = []
    for r in t.to_pylist():
        geo = wkb.loads(r["geometry"])
        if geo.geom_type == "MultiPolygon":
            geo = max(geo.geoms, key=lambda g: g.area)
        if geo.geom_type != "Polygon":
            continue
        P = Polygon([juego(x, y) for x, y in geo.exterior.coords])
        if not zona.intersects(P):
            continue
        osm = next((s.get("record_id", "").split("@")[0] for s in r["sources"] or [] if s["dataset"] == "OpenStreetMap"), None)
        out.append({
            "overture": r["id"], "osm": osm, "geo": P, "plantas": r.get("num_floors"), "altura": r.get("height"),
            "cubierta": r.get("roof_shape"), "clase": r.get("class"), "nombre": (r.get("names") or {}).get("primary"),
            "fuente": ", ".join(sorted({s["dataset"] for s in r["sources"] or []})),
        })
    return out


def manzana(calles, punto):
    cerca = [c["linea"] for c in calles if c["clase"] <= 5 and c["linea"].distance(punto) < 120]
    for b in polygonize(unary_union(cerca)):
        if b.contains(punto):
            return b
    raise SystemExit("No se encontró una manzana cerrada que contenga el punto del sector")


def generar(sid):
    defs = json.load(open(os.path.join(RAIZ, "ciudad", "sectores.json")))
    d = defs[sid]
    estado = json.load(open(os.path.join(RAIZ, "fuentes", "estado.json"))) if os.path.exists(os.path.join(RAIZ, "fuentes", "estado.json")) else {}
    calles, pois, etiquetas = cargar_osm()
    bloque = manzana(calles, Point(d["punto"]))
    cand = cargar_overture(bloque.buffer(2))
    avisos_sector = []

    # Paso mínimo libre alrededor del eje de las calles que cierran la manzana.
    vecinas = [c for c in calles if c["linea"].distance(bloque) < 1.5 and c["clase"] <= 5]
    calzada = unary_union([c["linea"].buffer(PASO_MIN[c["clase"]], cap_style=2) for c in vecinas])
    util = bloque.difference(calzada)

    # 1) Dentro de la manzana y sin duplicados (Overture puede traer OSM e IGN superpuestos).
    cand = [c for c in cand if bloque.contains(c["geo"].centroid)]
    cand.sort(key=lambda c: -c["geo"].area)
    sel = []
    for c in cand:
        if any(c["geo"].intersection(s["geo"]).area > 0.5 * c["geo"].area for s in sel):
            continue
        sel.append(c)

    # 2) Recorte por calzada/acera y solapes; huellas válidas y orientadas.
    ocupado = None
    eds = []
    for i, c in enumerate(sel):
        av = []
        g = c["geo"].buffer(0)
        if not g.is_valid or g.is_empty:
            av.append("huella no válida en la fuente")
            continue
        a0 = g.area
        g2 = g.intersection(util)
        if ocupado is not None:
            g2 = g2.difference(ocupado)
        if g2.geom_type != "Polygon":
            partes = [p for p in getattr(g2, "geoms", []) if p.geom_type == "Polygon"]
            if not partes:
                continue
            g2 = max(partes, key=lambda p: p.area)
        if g2.area < 6:
            avisos_sector.append(f"{c['overture'][:8]}: descartado, queda {g2.area:.1f} m² tras recortar calzada/solapes")
            continue
        perdida = 1 - g2.area / a0
        if perdida > 0.03:
            av.append(f"recortado {perdida * 100:.0f}% (paso mínimo de la calle o solape con otra huella)")
        g2 = orient(g2.simplify(0.12), 1.0)
        ocupado = g2 if ocupado is None else ocupado.union(g2)
        eds.append({**c, "geo": g2, "avisos": av})

    # 3) Aristas: calle, medianera o patio.
    for e in eds:
        pts = list(e["geo"].exterior.coords)[:-1]
        caras, nombres = [], []
        otros = unary_union([o["geo"] for o in eds if o is not e]).buffer(0.35) if len(eds) > 1 else Polygon()
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            L = math.dist(a, b)
            if L < 0.25:
                caras.append("patio"); nombres.append(""); continue
            nx, ny = (b[1] - a[1]) / L, -(b[0] - a[0]) / L  # normal exterior (anillo antihorario)
            m = Point((a[0] + b[0]) / 2 + nx * 0.8, (a[1] + b[1]) / 2 + ny * 0.8)
            if otros.contains(m):
                caras.append("medianera"); nombres.append(""); continue
            best = None
            for cl in vecinas:
                dd = cl["linea"].distance(m)
                if dd < ANCHO_VIA[cl["clase"]] / 2 + ACERA + 4.5 and (best is None or dd < best[0]):
                    best = (dd, cl)
            if best:
                caras.append("calle"); nombres.append(best[1]["nombre"])
            else:
                caras.append("patio"); nombres.append("")
        e["caras"], e["calles"] = caras, nombres
        e["frente"] = sum(math.dist(pts[i], pts[(i + 1) % len(pts)]) for i in range(len(pts)) if caras[i] == "calle")

    # 4) Plantas, altura, tipología, cubierta, planta baja y nivel.
    conocidas = [e["plantas"] for e in eds if e["plantas"]]
    for e in eds:
        tags = etiquetas.get(e["osm"] or "", {})
        area = e["geo"].area
        if not e["plantas"] and tags.get("building:levels"):
            try:
                e["plantas"] = int(float(tags["building:levels"]))
                e["origen"] = "OSM building:levels"
            except ValueError:
                pass
        if e["plantas"]:
            e.setdefault("origen", f"fuente ({e['fuente']})")
        else:
            # Estimación por reglas (Centro): tamaño de huella, frente y contexto. Se marca siempre.
            if e["frente"] < 0.5:
                n = 1
            elif area <= 45:
                n = 2
            elif area <= 120:
                n = 3
            elif area <= 220:
                n = 4
            else:
                n = 5
            if (e["nombre"] or tags.get("name", "")).lower().startswith("edificio"):
                n = max(n, 6)
            if conocidas:
                n = round((n + sorted(conocidas)[len(conocidas) // 2]) / 2)
            e["plantas"] = n
            e["origen"] = "estimada (reglas: huella, frente y nombre)"
            e["avisos"].append("altura estimada: sin plantas en OSM/Overture; Catastro y LiDAR no accesibles")
        e["alturaM"] = round(e["altura"] if e["altura"] else PB + (e["plantas"] - 1) * PLANTA, 1)
        e["nombre"] = e["nombre"] or tags.get("name")

        if e["frente"] < 0.5:
            tip = "anexo"
        elif e["plantas"] == 1:
            tip = "casa_baja"
        elif e["plantas"] == 2:
            tip = "casa_dos"
        elif e["plantas"] == 3 and e["frente"] < 14:
            tip = "burguesa"
        else:
            tip = "bloque"
        e["tipologia"] = tip
        pts = list(e["geo"].exterior.coords)[:-1]
        rect = len(pts) <= 5 and area / e["geo"].minimum_rotated_rectangle.area > 0.9
        cub = e["cubierta"] or tags.get("roof:shape")
        if cub in ("gabled", "hipped"):
            e["cubierta"] = "tejado"
        elif cub == "flat":
            e["cubierta"] = "azotea"
        else:
            e["cubierta"] = "tejado" if tip == "casa_baja" and rect and e["frente"] <= 9 else "azotea"
        tienda = any(e["geo"].buffer(1.0).contains(p) for p, t in pois if t.get("shop") or t.get("amenity") in ("bar", "cafe", "restaurant", "pharmacy", "bank"))
        principal = any(n in COMERCIALES for n in e["calles"]) or any(
            cl["clase"] <= 2 for cl in vecinas for n in e["calles"] if n and cl["nombre"] == n
        )
        e["pb"] = "comercio" if tip != "anexo" and (tienda or principal) else ("portal" if tip == "bloque" else "vivienda")
        sing = tags.get("historic") or tags.get("amenity") == "place_of_worship" or tags.get("building") in ("church", "chapel", "cathedral")
        e["nivel"] = "C" if sing else ("B" if e["nombre"] or tienda or e["clase"] in ("school", "public", "commercial") else "A")

    # 5) Material y color: reglas por tipología y vecinos distintos (las medianeras no repiten color).
    eds.sort(key=lambda e: (-e["geo"].centroid.y, e["geo"].centroid.x))
    for i, e in enumerate(eds):
        e["id"] = f"{sid}-{i + 1:03d}"
    for e in eds:
        pal = PALETAS[e["tipologia"]]
        vec = {o.get("color") for o in eds if o is not e and o.get("color") and o["geo"].distance(e["geo"]) < 0.5}
        k = h(e["overture"], len(pal))
        for j in range(len(pal)):
            if pal[(k + j) % len(pal)] not in vec:
                k = (k + j) % len(pal)
                break
        e["color"] = pal[k]
        if e["tipologia"] == "bloque":
            e["material"] = "ladrillo" if h(e["overture"] + "m", 10) < 3 else "revoco"
        elif e["tipologia"] in ("casa_baja", "casa_dos"):
            e["material"] = "encalado" if e["color"] in ("#F6F3EC", "#F7F1E3") else "revoco"
        else:
            e["material"] = "revoco"
        e["zocalo"] = e["tipologia"] in ("casa_baja", "casa_dos") and h(e["overture"] + "z", 3) > 0  # azulejo o piedra

    salida = {
        "id": sid,
        "nombre": d["nombre"],
        "generado": datetime.datetime.now().isoformat(timespec="seconds"),
        "manzana": [[round(x, 2), round(y, 2)] for x, y in list(bloque.exterior.coords)[:-1]],
        "calles": sorted({c["nombre"] for c in vecinas if c["nombre"]}),
        "fuentes": {
            "huellas": "Overture Maps (OSM + IGN), release 2026-09-23.1",
            "calles": "OpenStreetMap (fuentes/la-linea.geojson)",
            "catastro": estado.get("catastro", {}).get("estado", "sin comprobar"),
            "lidar": estado.get("pnoa_lidar", {}).get("estado", "sin comprobar"),
        },
        "edificios": [
            {
                "id": e["id"], "overture": e["overture"], "osm": e["osm"], "fuente": e["fuente"], "nombre": e["nombre"],
                "huella": [[round(x, 2), round(y, 2)] for x, y in list(e["geo"].exterior.coords)[:-1]],
                "caras": e["caras"], "calles": e["calles"], "area": round(e["geo"].area, 1), "frente": round(e["frente"], 1),
                "plantas": e["plantas"], "alturaM": e["alturaM"], "origenAltura": e["origen"], "cubierta": e["cubierta"],
                "tipologia": e["tipologia"], "material": e["material"], "color": e["color"], "zocalo": e["zocalo"],
                "pb": e["pb"], "nivel": e["nivel"], "avisos": e["avisos"],
            }
            for e in eds
        ],
        "avisos": avisos_sector,
    }
    destino = os.path.join(RAIZ, "src", "datos", "sectores", f"{sid}.json")
    json.dump(salida, open(destino, "w"), ensure_ascii=False, indent=1)
    informe(salida)
    print(f"{sid}: {len(eds)} edificios → {os.path.relpath(destino, RAIZ)}")


def informe(s):
    eds = s["edificios"]
    L = [f"# {s['id']} · {s['nombre']}", "", f"Generado automáticamente el {s['generado']} con `python3 scripts/sector/generar.py {s['id']}`.", ""]
    L += ["## Fuentes", "", "| Fuente | Uso | Estado |", "|---|---|---|"]
    L += [f"| Overture Maps (buildings) | Huellas, clase, nombre, plantas si existen | Usada (release 2026-09-23.1) |"]
    L += [f"| OpenStreetMap | Calles, nombres de vía, etiquetas, comercios | Usada (extracto local) |"]
    L += [f"| Catastro INSPIRE (WFS/ATOM) | Huellas oficiales y plantas | {s['fuentes']['catastro']} |"]
    L += [f"| PNOA LiDAR (CNIG) | Alturas y cubiertas | {s['fuentes']['lidar']} |", ""]
    L += ["## Resumen", ""]
    tot = len(eds)
    est = sum(1 for e in eds if e["origenAltura"].startswith("estimada"))
    L += [f"- Calles que cierran la manzana: {', '.join(s['calles'])}.", f"- Edificios: {tot}. Alturas de fuente: {tot - est}. Alturas estimadas: {est}."]
    for nivel in "ABC":
        L += [f"- Nivel {nivel}: {sum(1 for e in eds if e['nivel'] == nivel)}"]
    L += ["", "## Edificios", "", "| Id | Nombre | Tipología | Plantas | Altura | Origen | Cubierta | PB | Nivel | Avisos |", "|---|---|---|---|---|---|---|---|---|---|"]
    for e in eds:
        L += [f"| {e['id']} | {e['nombre'] or ''} | {e['tipologia']} | {e['plantas']} | {e['alturaM']} m | {e['origenAltura']} | {e['cubierta']} | {e['pb']} | {e['nivel']} | {'; '.join(e['avisos'])} |"]
    if s["avisos"]:
        L += ["", "## Avisos del sector", ""] + [f"- {a}" for a in s["avisos"]]
    os.makedirs(os.path.join(RAIZ, "city-reconstruction", "reports"), exist_ok=True)
    open(os.path.join(RAIZ, "city-reconstruction", "reports", f"{s['id']}.md"), "w").write("\n".join(L) + "\n")


if __name__ == "__main__":
    generar(sys.argv[1] if len(sys.argv) > 1 else "CENTRO-T01")
