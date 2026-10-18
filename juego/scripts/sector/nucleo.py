"""
Núcleo del generador automático de La Línea (lo usan ciudad.py y generar.py).

Principios:
  - La huella real manda: ningún edificio se recorta para ensanchar una calle. Si una calle
    atraviesa una huella, el edificio queda en ROJO para revisión (no se toca).
  - Cada atributo sale de la fuente más fiable disponible y lleva su confianza:
      plantas: Catastro (alta) > LiDAR (alta) > OSM building:levels (media) > Overture (media) > reglas (baja)
      altura:  LiDAR (alta) > OSM/Overture height (media) > plantas × 3 m (según la confianza de las plantas)
      cubierta: OSM/Overture roof:shape (media) > reglas (baja)
      huella:  Catastro (alta) > OSM/Overture (media)
  - Estado: VERDE (datos fiables y geometría validada), AMARILLO (geometría válida, algo estimado),
    ROJO (errores o conflictos sin resolver).
  - Nunca se estiman plantas por el nombre de un edificio.
"""
import hashlib
import json
import math
import os

from shapely import wkb
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, shape
from shapely.geometry.polygon import orient
from shapely.ops import polygonize, unary_union
from shapely.strtree import STRtree

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Escala real: 1 unidad del juego = 1 m (igual que src/datos/linea.json).
KX, KY, LON0, LAT0 = 89842, 110950, -5.3762, 36.2005
CLASE = {
    "motorway": 0, "trunk": 0, "primary": 0, "motorway_link": 0, "trunk_link": 0, "primary_link": 0,
    "secondary": 1, "secondary_link": 1, "tertiary": 2, "tertiary_link": 2, "unclassified": 2,
    "residential": 3, "living_street": 3, "pedestrian": 4, "service": 5,
}
PB, PLANTA = 3.6, 3.0
TESELA = 160.0
COMERCIALES = {"Calle Real", "Calle Clavel", "Calle Sol", "Calle del Sol", "Calle Teatro", "Calle Jardines", "Calle Gibraltar", "Calle Aurora", "Calle San Pablo", "Calle Jardines"}
# Zonas modeladas a mano (no se generan automáticamente): ver src/compartido/ciudad.ts y sectores/.
ZONAS_MANUALES = [Point(2216, 4270).buffer(68), Point(2436, 4376).buffer(56), Polygon([(2472, 4320), (2600, 4320), (2600, 4524), (2410, 4524), (2410, 4360)]),
                  LineString([(2196.8, 4256.2), (2243.2, 4267.2), (2309.6, 4283.4), (2390, 4303.8), (2417.8, 4309.8), (2435.4, 4316), (2489.2, 4343), (2507, 4351.4)]).buffer(32)]
EMBLEMA_TAGS = {"amenity": {"place_of_worship", "townhall", "courthouse", "theatre", "library", "arts_centre", "marketplace"},
                "building": {"church", "cathedral", "chapel", "government", "civic", "train_station", "bullring"},
                "tourism": {"museum", "attraction"}, "historic": None, "heritage": None, "wikidata": None, "wikipedia": None}

PALETAS = {
    "Centro": ["#F6F3EC", "#EFE3C6", "#E9B38F", "#E8C35A", "#D98A6A", "#F2EBDD", "#EBC9B8", "#C9533E", "#E6CFA0"],
    "La Atunara": ["#FFFFFF", "#F7F4EC", "#F2EDE0", "#EAF0F2", "#F5EBD3"],
    "_": ["#F2F0EA", "#EADFB8", "#E3CFA8", "#E9E4D6", "#F1EDE4", "#EFE3C6", "#E9B38F", "#F6F3EC"],
}


def juego(lon, lat):
    return ((lon - LON0) * KX, -(lat - LAT0) * KY)


def h(s, n):
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % n


def a_juego(geo):
    """Polígono lon/lat (con huecos) a coordenadas del juego."""
    if geo.geom_type == "MultiPolygon":
        geo = max(geo.geoms, key=lambda g: g.area)
    ext = [juego(x, y) for x, y in geo.exterior.coords]
    hue = [[juego(x, y) for x, y in r.coords] for r in geo.interiors]
    return Polygon(ext, hue)


# ── Fuentes ──────────────────────────────────────────────────────────

def cargar_osm():
    g = json.load(open(os.path.join(RAIZ, "fuentes", "la-linea.geojson")))
    calles, pois, etiquetas = [], [], {}
    for f in g["features"]:
        p, geo = f["properties"], f["geometry"]
        if geo["type"] == "LineString" and p.get("highway") in CLASE:
            if p.get("tunnel") or p.get("covered") == "yes" or p.get("layer", "0").startswith("-"):
                continue
            calles.append({"nombre": p.get("name", ""), "clase": CLASE[p["highway"]], "highway": p["highway"], "acera": p.get("sidewalk"), "ancho": p.get("width"), "linea": LineString([juego(*c) for c in geo["coordinates"]])})
        elif geo["type"] == "Point" and (p.get("shop") or p.get("amenity") or p.get("office")):
            pois.append((Point(juego(*geo["coordinates"])), p))
        if "building" in p:
            etiquetas[p.get("@id", "").replace("way/", "w").replace("relation/", "r")] = p
    return calles, pois, etiquetas


def cargar_overture():
    import pyarrow.parquet as pq

    t = pq.read_table(os.path.join(RAIZ, "fuentes", "overture", "la-linea-buildings.parquet"))
    out = []
    for r in t.to_pylist():
        geo = wkb.loads(r["geometry"])
        if geo.geom_type not in ("Polygon", "MultiPolygon"):
            continue
        P = a_juego(geo).buffer(0)
        if P.is_empty or P.geom_type != "Polygon":
            continue
        srcs = r["sources"] or []
        osm = next((s.get("record_id", "").split("@")[0] for s in srcs if s["dataset"] == "OpenStreetMap"), None)
        out.append({
            "overture": r["id"], "osm": osm, "geo": P,
            "plantas_ov": r.get("num_floors"), "altura_ov": r.get("height"), "cubierta_ov": r.get("roof_shape"),
            "clase": r.get("class"), "nombre": (r.get("names") or {}).get("primary"),
            "fuente": " + ".join(sorted({s["dataset"] for s in srcs})) or "Overture",
        })
    return out


def cargar_catastro():
    f = os.path.join(RAIZ, "fuentes", "catastro", "edificios.json")
    if not os.path.exists(f):
        return []
    out = []
    for e in json.load(open(f)):
        try:
            anillos = [[juego(x, y) for x, y in a] for a in e["anillos"]]
            P = Polygon(anillos[0], anillos[1:]).buffer(0)
        except Exception:  # noqa: BLE001
            continue
        if P.geom_type == "Polygon" and P.area > 2:
            out.append({**e, "geo": P})
    return out


def cargar_alturas():
    f = os.path.join(RAIZ, "fuentes", "alturas", "alturas.json")
    if not os.path.exists(f):
        return []
    out = []
    for a in json.load(open(f)):
        g = shape(a["geom"])
        if g.geom_type == "Point":
            out.append((Point(juego(g.x, g.y)), a["altura"], a["fuente"]))
        else:
            out.append((a_juego(g), a["altura"], a["fuente"]))
    return out


def estado_fuentes():
    f = os.path.join(RAIZ, "fuentes", "estado.json")
    return json.load(open(f)) if os.path.exists(f) else {}


# ── Barrios y manzanas ───────────────────────────────────────────────

def cargar_barrios():
    d = json.load(open(os.path.join(RAIZ, "ciudad", "barrios.json")))
    return [(n, Point(p)) for n, v in d.items() if not n.startswith("_") for p in v["anclas"]]


def barrio_de(p, anclas):
    return min(anclas, key=lambda a: a[1].distance(p))[0]


def manzanas(calles):
    """Manzanas: polígonos cerrados por calles reales (sin sendas ni accesos de servicio)."""
    lineas = [c["linea"] for c in calles if c["clase"] <= 4]
    return [b for b in polygonize(unary_union(lineas)) if 60 < b.area < 320000]


# ── Edificios de una manzana ─────────────────────────────────────────

def procesar_manzana(bloque, cand, calles_idx, calles, pois_idx, pois, etiquetas, catastro_idx, catastro, alturas_idx, alturas, barrio):
    """Devuelve (edificios, avisos) de una manzana. No recorta huellas para ensanchar calles."""
    avisos = []
    vecinas = [calles[i] for i in calles_idx.query(bloque.buffer(1.5)) if calles[i]["linea"].distance(bloque) < 1.5]
    sel = [c for c in cand if bloque.buffer(0.5).contains(c["geo"].centroid)]
    sel.sort(key=lambda c: -c["geo"].area)
    eds = []
    for c in sel:
        g = c["geo"]
        motivos, reparado = [], []
        # 1) Duplicados (Overture puede traer OSM e IGN superpuestos): se queda la huella mayor.
        dup = next((e for e in eds if g.intersection(e["geo"]).area > 0.5 * g.area), None)
        if dup:
            avisos.append(f"duplicado descartado ({c['fuente']}, {g.area:.0f} m²) sobre {dup['osm'] or dup['overture'][:8]}")
            continue
        # 2) Solape parcial con una huella mayor ya aceptada: se resuelve a favor de la mayor.
        sol = sum(g.intersection(e["geo"]).area for e in eds)
        if sol > 0.5:
            g2 = g.difference(unary_union([e["geo"] for e in eds])).buffer(0)
            if g2.geom_type == "MultiPolygon":
                g2 = max(g2.geoms, key=lambda p: p.area)
            if g2.is_empty or g2.area < 4:
                avisos.append(f"descartado: solapa casi por completo con otra huella ({g.area:.0f} m²)")
                continue
            perdida = 1 - g2.area / g.area
            reparado.append(f"solape de {sol:.1f} m² con otra parcela resuelto a favor de la huella mayor")
            if perdida > 0.2:
                motivos.append(f"conflicto de parcelas: perdería el {perdida * 100:.0f}% de su huella")
            g = g2
        if not g.is_valid:
            g = g.buffer(0)
            reparado.append("huella inválida reparada (auto-intersección)")
        if g.geom_type != "Polygon" or g.area < 4:
            avisos.append(f"descartado: huella degenerada ({g.area:.1f} m²)")
            continue
        # 3) Una calle que atraviesa la huella no se resuelve recortando: queda en rojo.
        for cl in vecinas:
            cruce = cl["linea"].intersection(g.buffer(-0.6))
            if not cruce.is_empty and cruce.length > 1.0:
                motivos.append(f"el eje de {cl['nombre'] or 'una calle'} atraviesa la huella {cruce.length:.1f} m (alineación OSM/huella)")
        g = orient(g.simplify(0.1), 1.0)
        eds.append({**c, "geo": g, "motivos": motivos, "reparado": reparado})

    # Caras: calle, medianera o patio (anillo exterior); los huecos interiores son patios.
    for e in eds:
        pts = list(e["geo"].exterior.coords)[:-1]
        otros = unary_union([o["geo"] for o in eds if o is not e]).buffer(0.35) if len(eds) > 1 else Polygon()
        caras, nombres = [], []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            L = math.dist(a, b)
            if L < 0.25:
                caras.append("patio"); nombres.append(""); continue
            nx, ny = (b[1] - a[1]) / L, -(b[0] - a[0]) / L
            m = Point((a[0] + b[0]) / 2 + nx * 0.8, (a[1] + b[1]) / 2 + ny * 0.8)
            if otros.contains(m):
                caras.append("medianera"); nombres.append(""); continue
            best = None
            for cl in vecinas:
                dd = cl["linea"].distance(m)
                if dd < 12 and (best is None or dd < best[0]):
                    best = (dd, cl)
            if best:
                caras.append("calle"); nombres.append(best[1]["nombre"])
            else:
                caras.append("patio"); nombres.append("")
        e["caras"], e["calles"] = caras, nombres
        e["frente"] = sum(math.dist(pts[i], pts[(i + 1) % len(pts)]) for i in range(len(pts)) if caras[i] == "calle")

    # Datos oficiales y medidos que caen sobre cada huella.
    for e in eds:
        g = e["geo"]
        e["catastro"] = None
        if catastro_idx is not None:
            mejores = [catastro[i] for i in catastro_idx.query(g) if catastro[i]["geo"].intersection(g).area > 0.5 * min(g.area, catastro[i]["geo"].area)]
            if mejores:
                partes = [m for m in mejores if m.get("plantas") is not None]
                e["catastro"] = {"plantas": max((m["plantas"] for m in partes), default=None), "uso": next((m["uso"] for m in mejores if m.get("uso")), None), "ref": mejores[0]["id"]}
        e["lidar"] = None
        if alturas_idx is not None:
            hs = [alturas[i] for i in alturas_idx.query(g) if g.contains(alturas[i][0].representative_point())]
            if hs:
                vals = sorted(a[1] for a in hs)
                e["lidar"] = (vals[int(len(vals) * 0.9) - 1 if len(vals) > 1 else 0], hs[0][2])

    # Atributos con su fuente y confianza.
    reales = [(e["geo"].centroid, p) for e in eds for p in [plantas_reales(e, etiquetas)[0]] if p]
    for e in eds:
        tags = etiquetas.get(e["osm"] or "", {})
        atributos(e, tags, barrio, reales, pois_idx, pois, vecinas)
    return eds, avisos


def plantas_reales(e, tags_por_id):
    tags = tags_por_id.get(e["osm"] or "", {})
    if e.get("catastro") and e["catastro"].get("plantas"):
        return e["catastro"]["plantas"], "Catastro INSPIRE (numberOfFloorsAboveGround)", "alta"
    if e.get("lidar"):
        return max(1, round((e["lidar"][0] - 0.6) / PLANTA)), f"LiDAR ({e['lidar'][1]})", "alta"
    if tags.get("building:levels"):
        try:
            return int(float(tags["building:levels"])), "OSM building:levels", "media"
        except ValueError:
            pass
    if e.get("plantas_ov"):
        return int(e["plantas_ov"]), f"Overture num_floors ({e['fuente']})", "media"
    return None, None, None


def atributos(e, tags, barrio, reales, pois_idx, pois, vecinas):
    area = e["geo"].area
    p, fuente, conf = plantas_reales(e, {e["osm"] or "": tags})
    if p is None:
        # Estimación por reglas: tamaño de huella, frente a calle, barrio y mediana de vecinos con dato real.
        if e["frente"] < 0.5:
            p = 1
        elif barrio == "La Atunara":
            p = 1 if area < 70 else 2
        elif area <= 45:
            p = 2
        elif area <= 120:
            p = 3
        elif area <= 260:
            p = 4
        else:
            p = 5
        cerca = sorted(pl for c, pl in reales if c.distance(e["geo"].centroid) < 60)
        if len(cerca) >= 3:
            p = round((p + cerca[len(cerca) // 2]) / 2)
        fuente, conf = "estimada por reglas (huella, frente, barrio y vecinos con dato real)", "baja"
    e["plantas"], e["fuentePlantas"], e["confPlantas"] = p, fuente, conf

    if e.get("lidar"):
        e["alturaM"], e["fuenteAltura"], e["confAltura"] = round(e["lidar"][0], 1), f"LiDAR ({e['lidar'][1]})", "alta"
    elif tags.get("height") or e.get("altura_ov"):
        try:
            e["alturaM"] = round(float(str(tags.get("height") or e["altura_ov"]).split()[0]), 1)
            e["fuenteAltura"], e["confAltura"] = "OSM/Overture height", "media"
        except ValueError:
            e["alturaM"] = None
    if not e.get("alturaM"):
        e["alturaM"] = round(PB + (p - 1) * PLANTA, 1)
        e["fuenteAltura"], e["confAltura"] = f"plantas × 3 m ({conf})", conf

    pts = list(e["geo"].exterior.coords)[:-1]
    rect = e["geo"].minimum_rotated_rectangle
    rectangular = len(pts) <= 5 and area / max(rect.area, 1e-6) > 0.88
    medianeras = sum(1 for k in e["caras"] if k == "medianera")
    nivel_c = es_emblematico(tags)
    tienda = bool(pois_idx is not None and any(e["geo"].buffer(1.0).contains(pois[i][0]) for i in pois_idx.query(e["geo"].buffer(1.0))
                                              if pois[i][1].get("shop") or pois[i][1].get("amenity") in ("bar", "cafe", "restaurant", "pharmacy", "bank", "fast_food")))
    calle_comercial = any(n in COMERCIALES for n in e["calles"])
    via_principal = any(cl["clase"] <= 2 and cl["nombre"] in e["calles"] for cl in vecinas if cl["nombre"])
    comercial = calle_comercial or via_principal

    # Tipología por reglas (dimensiones, contexto y barrio).
    if nivel_c:
        tip = "singular"
    elif e["frente"] < 0.5:
        tip = "anexo"
    elif barrio == "La Atunara" and p <= 2 and area < 160:
        tip = "atunara"
    elif p == 1:
        tip = "casa_baja"
    elif p >= 5 or area > 320:
        tip = "bloque"
    elif barrio == "Centro" and (tienda or calle_comercial) and e["frente"] >= 8 and p >= 2:
        tip = "comercial"
    elif e["frente"] <= 7.5 and medianeras >= 2 and p <= 3:
        tip = "medianeras"
    elif p in (2, 3, 4) and 7 <= e["frente"] <= 18 and barrio in ("Centro", "San Pedro", "La Velada", "San José", "Santiago"):
        tip = "burguesa"
    elif p >= 4:
        tip = "bloque"
    else:
        tip = "medianeras" if medianeras >= 1 else "casa_dos"
    e["tipologia"], e["confTipologia"] = tip, ("media" if conf != "baja" else "baja")
    e["pb"] = "comercio" if tip not in ("anexo", "singular") and (tienda or calle_comercial or (via_principal and e["frente"] >= 6)) else ("portal" if tip == "bloque" else "vivienda")

    cub = (tags.get("roof:shape") or e.get("cubierta_ov") or "").lower()
    if cub in ("gabled", "hipped", "pyramidal", "flat"):
        e["cubierta"] = {"gabled": "dos_aguas", "hipped": "cuatro_aguas", "pyramidal": "cuatro_aguas", "flat": "azotea"}[cub]
        e["confCubierta"] = "media"
    else:
        if tip in ("atunara", "casa_baja") and rectangular:
            e["cubierta"] = "cuatro_aguas" if medianeras == 0 and max(rect.length / 4, 1) > 0 and rect_ratio(rect) < 1.5 else "dos_aguas"
        elif tip in ("atunara", "casa_baja", "medianeras") and not rectangular and e["frente"] >= 4:
            e["cubierta"] = "tejadillo"  # azotea con faldón de teja hacia la calle (huella irregular)
        else:
            e["cubierta"] = "azotea"
        e["confCubierta"] = "baja"
    # Ático retranqueado: bloques y comerciales desde 5 plantas con fondo suficiente.
    e["atico"] = None
    if tip in ("bloque", "comercial") and p >= 5 and area >= 90:
        calle = unary_union([LineString([pts[i], pts[(i + 1) % len(pts)]]) for i in range(len(pts)) if e["caras"][i] == "calle"]) if e["frente"] else None
        if calle is not None and not calle.is_empty:
            at = e["geo"].difference(calle.buffer(2.6, cap_style=2)).buffer(-0.05).buffer(0.05)
            if at.geom_type == "MultiPolygon":
                at = max(at.geoms, key=lambda q: q.area)
            if at.geom_type == "Polygon" and at.area >= 0.3 * area:
                e["atico"] = [[round(x, 2), round(y, 2)] for x, y in list(orient(at.simplify(0.1), 1.0).exterior.coords)[:-1]]
    e["nivel"] = "C" if nivel_c else ("B" if (e.get("nombre") or tags.get("name") or tienda or e.get("clase") in ("school", "public", "commercial", "retail")) else "A")
    e["nombre"] = e.get("nombre") or tags.get("name")
    e["esquina"] = sum(1 for k in e["caras"] if k == "calle") >= 2 and len({n for n in e["calles"] if n}) >= 2


def rect_ratio(rect):
    c = list(rect.exterior.coords)
    a, b = math.dist(c[0], c[1]), math.dist(c[1], c[2])
    return max(a, b) / max(min(a, b), 0.01)


def es_emblematico(tags):
    for k, vals in EMBLEMA_TAGS.items():
        v = tags.get(k)
        if v and (vals is None or v in vals):
            return True
    return False


def estado(e):
    """VERDE / AMARILLO / ROJO."""
    if e["motivos"]:
        return "rojo"
    huella_ok = True
    datos_ok = e["confPlantas"] in ("alta", "media") and e["confAltura"] in ("alta", "media")
    return "verde" if huella_ok and datos_ok and e["confTipologia"] != "baja" else "amarillo"


def colorear(eds, barrio):
    """Colores por paleta de barrio y tipología; vecinos en contacto no repiten color."""
    pal = PALETAS.get(barrio, PALETAS["_"])
    for e in eds:
        if e["tipologia"] == "atunara":
            opciones = PALETAS["La Atunara"]
        elif e["tipologia"] == "anexo":
            opciones = ["#EDE9E0"]
        else:
            opciones = pal
        usados = {o.get("color") for o in eds if o is not e and o.get("color") and o["geo"].distance(e["geo"]) < 0.5}
        k = h(e["overture"], len(opciones))
        for j in range(len(opciones)):
            if opciones[(k + j) % len(opciones)] not in usados:
                k = (k + j) % len(opciones)
                break
        e["color"] = opciones[k]
        # Revestimiento por reglas: casas encaladas o de revoco; bloques altos con gresite o ladrillo.
        t, p = e["tipologia"], e["plantas"]
        if t in ("atunara", "casa_baja"):
            e["revestimiento"] = "encalado"
        elif t == "bloque":
            e["revestimiento"] = "ceramico" if p >= 7 else ("ladrillo" if barrio not in ("Centro",) and h(e["overture"] + "r", 2) else "revoco")
        elif t == "comercial":
            e["revestimiento"] = "piedra_pb"
        else:
            e["revestimiento"] = "revoco"
        e["zocalo"] = t in ("atunara", "casa_baja", "casa_dos", "medianeras", "burguesa")


def registro(e, barrio, tesela):
    g = e["geo"]
    bid = ("B-" + e["osm"]) if e["osm"] else ("B-ov" + e["overture"].replace("-", "")[:12])
    return {
        "id": bid, "osm": e["osm"], "overture": e["overture"], "fuente": e["fuente"], "nombre": e["nombre"], "barrio": barrio, "tesela": tesela,
        "huella": [[round(x, 2), round(y, 2)] for x, y in list(g.exterior.coords)[:-1]],
        "patios": [[[round(x, 2), round(y, 2)] for x, y in list(r.coords)[:-1]] for r in g.interiors],
        "caras": e["caras"], "calles": e["calles"], "area": round(g.area, 1), "frente": round(e["frente"], 1), "esquina": e["esquina"],
        "plantas": e["plantas"], "alturaM": e["alturaM"], "cubierta": e["cubierta"], "atico": e["atico"],
        "tipologia": e["tipologia"], "revestimiento": e["revestimiento"], "color": e["color"], "zocalo": e["zocalo"], "pb": e["pb"], "nivel": e["nivel"],
        "fuentes": {"huella": "Catastro" if e.get("catastro") else e["fuente"], "plantas": e["fuentePlantas"], "altura": e["fuenteAltura"],
                    "catastro": (e.get("catastro") or {}).get("ref")},
        "confianza": {"huella": "alta" if e.get("catastro") else "media", "plantas": e["confPlantas"], "altura": e["confAltura"], "cubierta": e["confCubierta"], "tipologia": e["confTipologia"]},
        "estado": estado(e), "motivos": e["motivos"], "reparado": e["reparado"],
    }


def en_zona_manual(p):
    return any(z.contains(p) for z in ZONAS_MANUALES)
