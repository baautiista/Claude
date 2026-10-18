"""
Reconstrucción automática de La Línea por lotes.

  python3 scripts/sector/ciudad.py --barrio Centro              # todas las manzanas de un barrio
  python3 scripts/sector/ciudad.py --barrio Centro --barrio "La Atunara"
  python3 scripts/sector/ciudad.py --zona 2160,4080,2520,4360   # recuadro (coordenadas del juego)
  python3 scripts/sector/ciudad.py --todo                       # toda la ciudad
  python3 scripts/sector/ciudad.py --punto 2338,4222            # una manzana
  opciones: --forzar (regenera aunque nada haya cambiado)

Para cada manzana: datos (Catastro/LiDAR importados > OSM > Overture), validación sin recortes,
caras, atributos con fuente y confianza, tipología, estado VERDE/AMARILLO/ROJO.
Escribe teselas de 160 m en src/datos/ciudad/teselas/ (el juego las carga según la distancia),
el índice src/datos/ciudad/indice.json, la lista de emblemáticos y un informe del lote.
Las manzanas de las zonas modeladas a mano no se generan.
"""
import argparse
import datetime
import hashlib
import json
import math
import os
import time

from shapely.geometry import Point, box
from shapely.strtree import STRtree

import nucleo as N

DIR_T = os.path.join(N.RAIZ, "public", "ciudad", "teselas")  # el juego las descarga según la distancia
INDICE = os.path.join(N.RAIZ, "src", "datos", "ciudad", "indice.json")
CACHE = os.path.join(N.RAIZ, "fuentes", "cache-lotes.json")


def huella_md5(*partes):
    return hashlib.md5(json.dumps(partes, sort_keys=True, default=str).encode()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--barrio", action="append", default=[])
    ap.add_argument("--zona")
    ap.add_argument("--punto")
    ap.add_argument("--todo", action="store_true")
    ap.add_argument("--forzar", action="store_true")
    ap.add_argument("--anchos", action="store_true", help="solo recalcula el corredor de las calles")
    a = ap.parse_args()
    t0 = time.time()

    calles, pois, etiquetas = N.cargar_osm()
    if a.anchos:
        anchos_calles(calles)
        return
    overture = N.cargar_overture()
    catastro = N.cargar_catastro()
    alturas = N.cargar_alturas()
    anclas = N.cargar_barrios()
    fuentes = N.estado_fuentes()

    # Candidatos: huellas del Catastro si se han importado (enriquecidas con OSM/Overture); si no, Overture.
    if catastro:
        ov_idx = STRtree([o["geo"] for o in overture])
        cand = []
        for c in catastro:
            if c["tipo"] != "Building":
                continue
            par = max((overture[i] for i in ov_idx.query(c["geo"])), key=lambda o: o["geo"].intersection(c["geo"]).area, default=None)
            base = par or {"overture": c["id"], "osm": None, "plantas_ov": None, "altura_ov": None, "cubierta_ov": None, "clase": None, "nombre": None}
            cand.append({**base, "geo": c["geo"], "fuente": "Catastro INSPIRE" + (f" + {par['fuente']}" if par else "")})
    else:
        cand = overture
    cand_idx = STRtree([c["geo"] for c in cand])
    calles_idx = STRtree([c["linea"] for c in calles])
    pois_idx = STRtree([p for p, _ in pois]) if pois else None
    cat_idx = STRtree([c["geo"] for c in catastro]) if catastro else None
    alt_idx = STRtree([g for g, _, _ in alturas]) if alturas else None

    bloques = N.manzanas(calles)
    elegidos = []
    for b in bloques:
        c = b.representative_point()
        barrio = N.barrio_de(c, anclas)
        if a.punto:
            x, y = map(float, a.punto.split(","))
            if not b.contains(Point(x, y)):
                continue
        elif a.zona:
            x0, y0, x1, y1 = map(float, a.zona.split(","))
            if not box(x0, y0, x1, y1).contains(c):
                continue
        elif a.barrio and barrio not in a.barrio:
            continue
        elif not (a.todo or a.barrio):
            continue
        manual = sum(b.intersection(z).area for z in N.ZONAS_MANUALES) > 0.3 * b.area
        elegidos.append((b, barrio, manual))
    print(f"{len(elegidos)} manzanas seleccionadas ({sum(1 for *_, m in elegidos if m)} en zonas modeladas a mano)")

    cache = json.load(open(CACHE)) if os.path.exists(CACHE) and not a.forzar else {}
    mtimes = [os.path.getmtime(p) for p in [os.path.join(N.RAIZ, "fuentes", "la-linea.geojson"), os.path.join(N.RAIZ, "fuentes", "overture", "la-linea-buildings.parquet"),
                                            os.path.join(N.RAIZ, "fuentes", "catastro", "edificios.json"), os.path.join(N.RAIZ, "fuentes", "alturas", "alturas.json"),
                                            os.path.join(N.RAIZ, "scripts", "sector", "nucleo.py"), os.path.join(N.RAIZ, "ciudad", "barrios.json")] if os.path.exists(p)]
    teselas = {}
    stats = {"manzanas": 0, "omitidas_manual": 0, "sin_cambios": 0, "edificios": 0, "avisos": [], "cruces_eje": 0}
    for b, barrio, manual in elegidos:
        if manual:
            stats["omitidas_manual"] += 1
            continue
        c = b.representative_point()
        tk = f"{math.floor(c.x / N.TESELA)}_{math.floor(c.y / N.TESELA)}"
        clave = huella_md5([round(v, 1) for v in b.bounds], mtimes)
        sub = [cand[i] for i in cand_idx.query(b.buffer(1))]
        eds, avisos = N.procesar_manzana(b, sub, calles_idx, calles, pois_idx, pois, etiquetas, cat_idx, catastro, alt_idx, alturas, barrio)
        N.colorear(eds, barrio)
        regs = [N.registro(e, barrio, tk) for e in eds]
        stats["manzanas"] += 1
        stats["edificios"] += len(regs)
        stats["avisos"] += [f"[{barrio}] {x}" for x in avisos]
        stats["cruces_eje"] += sum(1 for r in regs if any("atraviesa" in m for m in r["motivos"]))
        t = teselas.setdefault(tk, {"manzanas": [], "edificios": []})
        t["manzanas"].append({"barrio": barrio, "poligono": [[round(x, 2), round(y, 2)] for x, y in list(b.exterior.coords)[:-1]], "clave": clave})
        t["edificios"] += regs
        if cache.get(clave) == [r["id"] for r in regs]:
            stats["sin_cambios"] += 1
        cache[clave] = [r["id"] for r in regs]

    conflictos_ejes(teselas)
    os.makedirs(DIR_T, exist_ok=True)
    indice = json.load(open(INDICE)) if os.path.exists(INDICE) else {"teselas": {}}
    for tk, t in teselas.items():
        f = os.path.join(DIR_T, f"{tk}.json")
        previo = json.load(open(f)) if os.path.exists(f) else {"manzanas": [], "edificios": []}
        # Se sustituyen solo las manzanas procesadas ahora; el resto de la tesela se conserva.
        nuevas = {m["clave"] for m in t["manzanas"]}
        polis = {json.dumps(m["poligono"]) for m in t["manzanas"]}
        conservar_m = [m for m in previo["manzanas"] if json.dumps(m["poligono"]) not in polis and m["clave"] not in nuevas]
        ids_nuevos = {e["id"] for e in t["edificios"]}
        conservar_e = [e for e in previo["edificios"] if e["id"] not in ids_nuevos and any(N.Point(e["huella"][0]).within(N.Polygon(m["poligono"]).buffer(1)) for m in conservar_m)]
        x, y = map(int, tk.split("_"))
        data = {"id": tk, "bbox": [x * N.TESELA, y * N.TESELA, (x + 1) * N.TESELA, (y + 1) * N.TESELA], "generado": datetime.datetime.now().isoformat(timespec="seconds"),
                "manzanas": conservar_m + t["manzanas"], "edificios": conservar_e + t["edificios"]}
        json.dump(data, open(f, "w"), ensure_ascii=False, separators=(",", ":"))
        est = {k: sum(1 for e in data["edificios"] if e["estado"] == k) for k in ("verde", "amarillo", "rojo")}
        indice["teselas"][tk] = {"bbox": data["bbox"], "edificios": len(data["edificios"]), "estados": est, "barrios": sorted({m["barrio"] for m in data["manzanas"]})}
    indice["sustituidos"] = sustituidos()
    indice["generado"] = datetime.datetime.now().isoformat(timespec="seconds")
    indice["fuentes"] = {k: v.get("estado") for k, v in fuentes.items()} | {"catastro_importado": len(catastro), "alturas_importadas": len(alturas)}
    json.dump(indice, open(INDICE, "w"), ensure_ascii=False, indent=1)
    json.dump(cache, open(CACHE, "w"))

    anchos_calles(calles)
    # Emblemáticos (nivel C) de todo lo generado: para modelado individual.
    todos = [e for tk in indice["teselas"] for e in json.load(open(os.path.join(DIR_T, f"{tk}.json")))["edificios"]]
    emb = [{"id": e["id"], "nombre": e["nombre"], "barrio": e["barrio"], "osm": e["osm"], "centro": [round(sum(p[0] for p in e["huella"]) / len(e["huella"]), 1), round(sum(p[1] for p in e["huella"]) / len(e["huella"]), 1)]} for e in todos if e["nivel"] == "C"]
    json.dump(emb, open(os.path.join(N.RAIZ, "ciudad", "emblematicos.json"), "w"), ensure_ascii=False, indent=1)
    informe(todos, stats, indice, fuentes, catastro, alturas, time.time() - t0, a)


def sustituidos():
    """Índices de los rectángulos antiguos de src/datos/linea.json que caen en manzanas generadas
    (el juego deja de dibujarlos allí)."""
    manz = [N.Polygon(m["poligono"]) for f in os.listdir(DIR_T) for m in json.load(open(os.path.join(DIR_T, f)))["manzanas"]]
    if not manz:
        return []
    idx = STRtree(manz)
    eds = json.load(open(os.path.join(N.RAIZ, "src", "datos", "linea.json")))["edificios"]
    out = []
    for i, e in enumerate(eds):
        p = N.Point(e[0], e[1])
        if any(manz[j].contains(p) for j in idx.query(p)):
            out.append(i)
    return out


def ejes_juego():
    red = json.load(open(os.path.join(N.RAIZ, "src", "datos", "linea.json")))["red"]
    out = []
    for i, (a, b, clase, nombre, medio) in enumerate(red["tramos"]):
        if clase > 4:
            continue
        pts = [red["nodos"][a]] + [medio[k:k + 2] for k in range(0, len(medio), 2)] + [red["nodos"][b]]
        out.append((i, N.LineString(pts), red["nombres"][nombre]))
    return out


def conflictos_ejes(teselas):
    """Un eje de calle del juego que toca o entra en una huella (< 0,45 m) no se resuelve
    recortando: el edificio queda en ROJO (pasaje cubierto o desalineación OSM ↔ huella)."""
    ejes = ejes_juego()
    idx = STRtree([l for _, l, _ in ejes])
    for t in teselas.values():
        for e in t["edificios"]:
            P = N.Polygon(e["huella"])
            for j in idx.query(P.buffer(0.45)):
                i, L, nombre = ejes[j]
                d = L.distance(P)
                if d < 0.45:
                    dentro = L.intersection(P).length
                    e["motivos"].append(f"el eje de {nombre or 'un tramo'} {'entra ' + format(dentro, '.1f') + ' m en' if dentro > 0.05 else 'toca'} la huella (pasaje cubierto o desalineación OSM ↔ huella)")
                    e["estado"] = "rojo"


def anchos_calles(calles):
    """Corredor libre real de cada tramo de calle del juego (red de src/datos/linea.json) junto a
    las manzanas generadas, medido a CADA LADO del eje: cada metro, un rayo perpendicular hasta la
    primera fachada (sin contar los 4 m de cada extremo, donde están las esquinas del cruce).
    Se guarda el percentil 10 de cada lado. El juego centra la calzada en el corredor y reparte
    las aceras, sin recortar ningún edificio.
    Salida por tramo: [libre lado izquierdo, libre lado derecho, tipo OSM], con izquierda en la
    normal (-dy, dx) del sentido a→b."""
    huellas = []
    for f in os.listdir(DIR_T):
        for e in json.load(open(os.path.join(DIR_T, f)))["edificios"]:
            huellas.append(N.Polygon(e["huella"]))
    if not huellas:
        return
    idx = STRtree(huellas)
    osm_idx = STRtree([c["linea"] for c in calles])
    TIPO = {"living_street": 1, "pedestrian": 2}
    red = json.load(open(os.path.join(N.RAIZ, "src", "datos", "linea.json")))["red"]
    ALCANCE = 14.0
    out = {}

    def rayo(px, py, nx, ny):
        r = N.LineString([(px, py), (px + nx * ALCANCE, py + ny * ALCANCE)])
        mejor = ALCANCE
        for j in idx.query(r):
            h = huellas[j]
            if h.contains(N.Point(px, py)):
                return 0.0
            x = h.boundary.intersection(r)
            if not x.is_empty:
                mejor = min(mejor, N.Point(px, py).distance(x))
        return mejor

    for i, (a, b, clase, _nombre, medio) in enumerate(red["tramos"]):
        if clase > 5:
            continue
        pts = [red["nodos"][a]] + [medio[k:k + 2] for k in range(0, len(medio), 2)] + [red["nodos"][b]]
        L = N.LineString(pts)
        if not len(idx.query(L.buffer(ALCANCE))):
            continue
        izq, der = [], []
        total = L.length
        acc = 0.0
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            l = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
            if l < 1e-6:
                continue
            dx, dy = (x1 - x0) / l, (y1 - y0) / l
            s = 0.5
            while s < l:
                g = acc + s
                if 4 <= g <= total - 4 or total < 10:
                    px, py = x0 + dx * s, y0 + dy * s
                    izq.append(rayo(px, py, -dy, dx))
                    der.append(rayo(px, py, dy, -dx))
                s += 1.0
            acc += l
        if not izq:
            continue
        izq.sort()
        der.sort()
        di = izq[int(len(izq) * 0.1)]
        dd = der[int(len(der) * 0.1)]
        if di >= ALCANCE and dd >= ALCANCE:
            continue
        m = L.interpolate(0.5, normalized=True)
        cerca = [calles[j] for j in osm_idx.query(m.buffer(4))]
        tipo = TIPO.get(min(cerca, key=lambda c: c["linea"].distance(m))["highway"], 0) if cerca else 0
        out[i] = [round(di, 2), round(dd, 2), tipo]
    json.dump({"generado": datetime.datetime.now().isoformat(timespec="seconds"), "tramos": out},
              open(os.path.join(N.RAIZ, "src", "datos", "ciudad", "anchos.json"), "w"), separators=(",", ":"))
    print(f"anchos: {len(out)} tramos junto a manzanas generadas")


def informe(todos, stats, indice, fuentes, catastro, alturas, segundos, a):
    n = len(todos)
    cnt = lambda f: sum(1 for e in todos if f(e))  # noqa: E731
    L = [f"# Lote de reconstrucción automática · {datetime.date.today()}", "",
         f"Orden: `ciudad.py {' '.join(f'--barrio {b!r}' for b in a.barrio)}{' --zona ' + a.zona if a.zona else ''}{' --punto ' + a.punto if a.punto else ''}{' --todo' if a.todo else ''}` · {segundos:.1f} s", "",
         "## Fuentes", "",
         f"- Overture Maps (OSM + IGN): usada.",
         f"- OpenStreetMap: calles, etiquetas y comercios.",
         f"- Catastro INSPIRE: red {fuentes.get('catastro', {}).get('estado', '?')}; importados {len(catastro)} edificios/partes.",
         f"- PNOA LiDAR / alturas: red {fuentes.get('pnoa_lidar', {}).get('estado', '?')}; importados {len(alturas)} registros.", "",
         "## Resultado (todas las teselas generadas)", "",
         f"- Edificios: **{n}** en {len(indice['teselas'])} teselas.",
         f"- Este lote: {stats['manzanas']} manzanas, {stats['edificios']} edificios; {stats['omitidas_manual']} manzanas omitidas por estar modeladas a mano; {stats['sin_cambios']} sin cambios respecto a la ejecución anterior.",
         f"- Estados: VERDE {cnt(lambda e: e['estado'] == 'verde')} · AMARILLO {cnt(lambda e: e['estado'] == 'amarillo')} · ROJO {cnt(lambda e: e['estado'] == 'rojo')}.",
         f"- Plantas de fuente real (Catastro/LiDAR/OSM/Overture): {cnt(lambda e: e['confianza']['plantas'] != 'baja')} · estimadas: {cnt(lambda e: e['confianza']['plantas'] == 'baja')}.",
         f"- Reparaciones automáticas (solapes de parcela, huellas inválidas): {sum(len(e['reparado']) for e in todos)}.",
         f"- Ejes de calle que atraviesan huellas (alineación OSM ↔ huella, sin recortar): {cnt(lambda e: any('atraviesa' in m for m in e['motivos']))}.",
         f"- Emblemáticos (nivel C, para modelado individual): {cnt(lambda e: e['nivel'] == 'C')}.", "",
         "## Tipologías", ""]
    tips = {}
    for e in todos:
        tips[e["tipologia"]] = tips.get(e["tipologia"], 0) + 1
    L += [f"- {k}: {v}" for k, v in sorted(tips.items(), key=lambda kv: -kv[1])]
    L += ["", "## Pendientes de revisión (ROJO)", ""]
    rojos = [e for e in todos if e["estado"] == "rojo"]
    L += [f"- {e['id']} ({e['barrio']}): {'; '.join(e['motivos'])}" for e in rojos[:200]] or ["- Ninguno."]
    if stats["avisos"]:
        L += ["", "## Avisos del lote", ""] + [f"- {x}" for x in stats["avisos"][:200]]
    os.makedirs(os.path.join(N.RAIZ, "city-reconstruction", "reports"), exist_ok=True)
    f = os.path.join(N.RAIZ, "city-reconstruction", "reports", "LOTE.md")
    open(f, "w").write("\n".join(L) + "\n")
    print("\n".join(L[:22]))


if __name__ == "__main__":
    main()
