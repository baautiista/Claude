"""
Exploración urbana y reconstrucción por lotes de La Línea City.

Recorre la ciudad por barrios, cuadrículas (las teselas del juego) y calles; para cada edificio
busca referencias visuales con licencia reutilizable, guarda una ficha con lo comprobado, lo
inferido y lo desconocido, y alimenta al generador de Blender (scripts/blender/generar.py).

    python3 scripts/exploracion/explorar.py iniciar                  # base de datos desde la ciudad generada
    python3 scripts/exploracion/explorar.py fuentes                  # qué fuentes responden desde esta máquina
    python3 scripts/exploracion/explorar.py investigar --lote AURORA-01
    python3 scripts/exploracion/explorar.py investigar --calle "Calle Aurora"
    python3 scripts/exploracion/explorar.py investigar --barrio Centro --max 40
    python3 scripts/exploracion/explorar.py observar B-w123 plantas=4 --foto mapillary:123 --confianza 0.8
    python3 scripts/exploracion/explorar.py modelar --lote AURORA-01   # fichas → Blender → GLB → juego
    python3 scripts/exploracion/explorar.py integrar --lote AURORA-01  # tras comprobarlo en el juego
    python3 scripts/exploracion/explorar.py prioridad Centro 1
    python3 scripts/exploracion/explorar.py siguiente                 # trabaja la cola por prioridad
    python3 scripts/exploracion/explorar.py panel [--puerto 8765]     # panel local de seguimiento

Cola: PENDIENTE → INVESTIGANDO → REFERENCIAS_ENCONTRADAS | SIN_REFERENCIAS → MODELANDO → VALIDANDO
→ INTEGRADO (o ERROR, con el error guardado; el trabajo sigue con el siguiente).

Fuentes de imágenes (solo con licencia que permita reutilizarlas como referencia):
  · Mapillary API v4 (CC BY-SA 4.0) — necesita la variable MAPILLARY_TOKEN (cuenta gratuita).
  · Wikimedia Commons (geosearch; se guarda la licencia de cada archivo, solo libres).
  · Fotos propias del usuario en city-reconstruction/exploracion/fotos-propias/<calle o id>/
    con un manifiesto (autor, fecha, licencia).
No se descargan capturas de Google Maps/Earth ni modelos 3D propietarios.
"""
import argparse
import glob
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
import time
import urllib.parse
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.join(RAIZ, "city-reconstruction", "exploracion")
BD = os.path.join(DIR, "la-linea.sqlite")
FICHAS = os.path.join(DIR, "fichas")
CACHE = os.path.join(DIR, "cache")
FOTOS = os.path.join(DIR, "fotos")
PROPIAS = os.path.join(DIR, "fotos-propias")
L0, A0, KX, KY = -5.3762, 36.2005, 89842, 110950  # proyección del juego (1 unidad = 1 m)

ESTADOS = ["PENDIENTE", "INVESTIGANDO", "REFERENCIAS_ENCONTRADAS", "SIN_REFERENCIAS", "MODELANDO", "VALIDANDO", "INTEGRADO", "ERROR"]
LICENCIAS_LIBRES = ("cc0", "cc-by", "cc by", "public domain", "dominio público", "pdm", "cc-by-sa", "cc by-sa")


def a_lonlat(x, y):
    return (L0 + x / KX, A0 - y / KY)


def ahora():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def conectar():
    os.makedirs(DIR, exist_ok=True)
    c = sqlite3.connect(BD)
    c.row_factory = sqlite3.Row
    c.executescript(
        """
        CREATE TABLE IF NOT EXISTS sectores (barrio TEXT PRIMARY KEY, prioridad INTEGER DEFAULT 9);
        CREATE TABLE IF NOT EXISTS cuadriculas (id TEXT PRIMARY KEY, bbox TEXT);
        CREATE TABLE IF NOT EXISTS calles (nombre TEXT PRIMARY KEY, barrio TEXT, edificios INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS edificios (
            id TEXT PRIMARY KEY, osm TEXT, overture TEXT, barrio TEXT, cuadricula TEXT, calle TEXT,
            x REAL, y REAL, lon REAL, lat REAL, area REAL, datos TEXT,
            estado TEXT DEFAULT 'PENDIENTE', intentos INTEGER DEFAULT 0, error TEXT, lote TEXT,
            revisar INTEGER DEFAULT 0, actualizado TEXT);
        CREATE TABLE IF NOT EXISTS edificio_calle (edificio TEXT, calle TEXT, PRIMARY KEY (edificio, calle));
        CREATE TABLE IF NOT EXISTS consultas (clave TEXT PRIMARY KEY, fuente TEXT, fecha TEXT, resultado TEXT, n INTEGER);
        CREATE TABLE IF NOT EXISTS fotos (
            id TEXT PRIMARY KEY, fuente TEXT, url TEXT, pagina TEXT, licencia TEXT, autor TEXT, fecha TEXT,
            lon REAL, lat REAL, rumbo REAL, archivo TEXT, sha1 TEXT);
        CREATE TABLE IF NOT EXISTS foto_edificio (foto TEXT, edificio TEXT, distancia REAL, encara REAL, PRIMARY KEY (foto, edificio));
        CREATE TABLE IF NOT EXISTS observaciones (
            edificio TEXT, campo TEXT, valor TEXT, estado TEXT, confianza REAL, foto TEXT, autor TEXT, fecha TEXT,
            PRIMARY KEY (edificio, campo, foto));
        CREATE TABLE IF NOT EXISTS eventos (fecha TEXT, edificio TEXT, de TEXT, a TEXT, nota TEXT);
        """
    )
    for tabla, col in (("fotos", "pano INTEGER"), ("foto_edificio", "confianza REAL"), ("foto_edificio", "fachada INTEGER")):
        if col.split()[0] not in [r[1] for r in c.execute(f"PRAGMA table_info({tabla})")]:
            c.execute(f"ALTER TABLE {tabla} ADD COLUMN {col}")
    return c


PROGRESO = os.path.join(DIR, "progreso.json")


def guardar_progreso(c):
    """Lo que no se puede regenerar (estados, observaciones, consultas, fotos, prioridades) va a un JSON en git."""
    d = {
        "edificios": {r["id"]: {k: r[k] for k in ("estado", "intentos", "error", "lote", "revisar", "actualizado")} for r in c.execute("SELECT * FROM edificios WHERE estado!='PENDIENTE' OR lote IS NOT NULL")},
        "sectores": {r[0]: r[1] for r in c.execute("SELECT barrio, prioridad FROM sectores WHERE prioridad!=9")},
        "consultas": [dict(r) for r in c.execute("SELECT * FROM consultas")],
        "fotos": [dict(r) for r in c.execute("SELECT * FROM fotos")],
        "foto_edificio": [dict(r) for r in c.execute("SELECT * FROM foto_edificio")],
        "observaciones": [dict(r) for r in c.execute("SELECT * FROM observaciones")],
        "eventos": [dict(r) for r in c.execute("SELECT * FROM eventos ORDER BY rowid DESC LIMIT 2000")],
    }
    json.dump(d, open(PROGRESO, "w"), ensure_ascii=False, indent=0)


def cargar_progreso(c):
    if not os.path.exists(PROGRESO):
        return
    d = json.load(open(PROGRESO))
    for eid, v in d["edificios"].items():
        c.execute("UPDATE edificios SET estado=?, intentos=?, error=?, lote=?, revisar=?, actualizado=? WHERE id=?", (v["estado"], v["intentos"], v["error"], v["lote"], v["revisar"], v["actualizado"], eid))
    for b, pr in d["sectores"].items():
        c.execute("INSERT INTO sectores (barrio, prioridad) VALUES (?,?) ON CONFLICT(barrio) DO UPDATE SET prioridad=excluded.prioridad", (b, pr))
    for tabla in ("consultas", "fotos", "foto_edificio", "observaciones"):
        for r in d[tabla]:
            c.execute(f"INSERT OR REPLACE INTO {tabla} ({','.join(r)}) VALUES ({','.join('?' * len(r))})", tuple(r.values()))
    if not c.execute("SELECT COUNT(*) FROM eventos").fetchone()[0]:
        for r in reversed(d["eventos"]):
            c.execute("INSERT INTO eventos VALUES (?,?,?,?,?)", (r["fecha"], r["edificio"], r["de"], r["a"], r["nota"]))


def mover(c, eid, estado, nota="", error=None):
    prev = c.execute("SELECT estado FROM edificios WHERE id=?", (eid,)).fetchone()
    c.execute("UPDATE edificios SET estado=?, error=?, actualizado=?, intentos=intentos+(?='ERROR') WHERE id=?", (estado, error, ahora(), estado, eid))
    c.execute("INSERT INTO eventos VALUES (?,?,?,?,?)", (ahora(), eid, prev[0] if prev else None, estado, nota or (error or "")))


# ── Iniciar: la ciudad generada ya reúne OSM + Overture + IGN (scripts/sector) ─────────────

def iniciar(_a):
    c = conectar()
    barrios = json.load(open(os.path.join(RAIZ, "ciudad", "barrios.json")))
    for b in (barrios if isinstance(barrios, list) else barrios.get("barrios", [])):
        c.execute("INSERT OR IGNORE INTO sectores (barrio) VALUES (?)", (b.get("nombre"),))
    indice = json.load(open(os.path.join(RAIZ, "src", "datos", "ciudad", "indice.json")))
    n = 0
    for tid, t in indice["teselas"].items():
        c.execute("INSERT OR REPLACE INTO cuadriculas VALUES (?,?)", (tid, json.dumps(t.get("bbox"))))
        f = os.path.join(RAIZ, "public", "ciudad", "teselas", f"{tid}.json")
        if not os.path.exists(f):
            continue
        for e in json.load(open(f))["edificios"]:
            xs = [p[0] for p in e["huella"]]
            ys = [p[1] for p in e["huella"]]
            x, y = sum(xs) / len(xs), sum(ys) / len(ys)
            lon, lat = a_lonlat(x, y)
            calles = [k for k in dict.fromkeys(e.get("calles") or []) if k]
            datos = {k: e.get(k) for k in ("plantas", "alturaM", "tipologia", "revestimiento", "color", "pb", "cubierta", "zocalo", "fuentes", "confianza", "estado", "nombre", "caras", "huella")}
            c.execute(
                """INSERT INTO edificios (id, osm, overture, barrio, cuadricula, calle, x, y, lon, lat, area, datos, actualizado)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET datos=excluded.datos, barrio=excluded.barrio, cuadricula=excluded.cuadricula, calle=excluded.calle""",
                (e["id"], e.get("osm"), e.get("overture"), e.get("barrio"), tid, calles[0] if calles else None, x, y, lon, lat, e.get("area"), json.dumps(datos, ensure_ascii=False), ahora()),
            )
            for k in calles:
                c.execute("INSERT OR IGNORE INTO edificio_calle VALUES (?,?)", (e["id"], k))
                c.execute("INSERT OR IGNORE INTO calles (nombre, barrio) VALUES (?,?)", (k, e.get("barrio")))
            n += 1
    c.execute("UPDATE calles SET edificios=(SELECT COUNT(*) FROM edificio_calle WHERE calle=calles.nombre)")
    cargar_progreso(c)
    # Lo ya modelado en Blender e incorporado al juego.
    idx_f = os.path.join(RAIZ, "src", "datos", "modelos", "indice.json")
    if os.path.exists(idx_f):
        for lote, l in json.load(open(idx_f))["lotes"].items():
            for eid in l["edificios"]:
                c.execute("UPDATE edificios SET lote=? WHERE id=?", (lote, eid))
    c.commit()
    print(f"{n} edificios · {c.execute('SELECT COUNT(*) FROM calles').fetchone()[0]} calles · {c.execute('SELECT COUNT(*) FROM cuadriculas').fetchone()[0]} cuadrículas")


# ── Fuentes ──────────────────────────────────────────────────────────

def http_json(url, cabeceras=None, espera=1.0):
    """GET con caché en disco (no se repite una consulta) y pausa entre llamadas (límites de las API)."""
    os.makedirs(CACHE, exist_ok=True)
    clave = hashlib.sha1(url.encode()).hexdigest()
    f = os.path.join(CACHE, clave + ".json")
    if os.path.exists(f):
        return json.load(open(f))
    req = urllib.request.Request(url, headers={"User-Agent": "LaLineaCity/1.0 (juego de InfoLinense; contacto en el repositorio)", **(cabeceras or {})})
    with urllib.request.urlopen(req, timeout=25) as r:
        d = json.loads(r.read().decode())
    json.dump(d, open(f, "w"))
    time.sleep(espera)
    return d


def descargar(url, destino):
    """Descarga una imagen una sola vez (el sha1 evita duplicados)."""
    if os.path.exists(destino):
        return destino
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "LaLineaCity/1.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        open(destino, "wb").write(r.read())
    return destino


MAPILLARY_API = "https://graph.mapillary.com"
MAPILLARY_CAMPOS = "id,computed_geometry,geometry,captured_at,computed_compass_angle,compass_angle,is_pano,thumb_1024_url,creator"
MAPILLARY_RADIO = 50  # metros; la API no admite más de 50 en la búsqueda por radio


def mapillary_token():
    # MMAPILLARY_TOKEN: nombre con la errata con que está guardado en el entorno actual.
    return os.environ.get("MAPILLARY_TOKEN") or os.environ.get("MMAPILLARY_TOKEN")


class MapillaryError(Exception):
    def __init__(self, clase, detalle):
        super().__init__(f"{clase}: {detalle}")
        self.clase = clase


def mapillary_clasificar(codigo, cuerpo, red=None):
    """Distingue: ok_con_fotos · vacia · ok_objeto · error_autenticacion · consulta_mal_construida ·
    bloqueo_proxy · error_servidor · error_red. Devuelve (clase, datos JSON o None)."""
    if red:
        return ("bloqueo_proxy" if ("403" in red or "Tunnel" in red or "CONNECT" in red) else "error_red"), None
    try:
        d = json.loads(cuerpo)
    except ValueError:
        # Respuesta que no es JSON de Mapillary: la da el proxy de salida («upstream request failed», 403, 502…).
        return ("bloqueo_proxy" if codigo in (403, 407, 502, 503) or "upstream" in cuerpo else "error_servidor"), None
    if isinstance(d, dict) and "error" in d:
        err = d["error"]
        if err.get("code") in (190, 102, 10, 200) or err.get("type") == "OAuthException":
            return "error_autenticacion", d
        if err.get("code") in (100, 2500) or codigo == 400:
            return "consulta_mal_construida", d
        return "error_servidor", d
    if isinstance(d, dict) and "data" in d:
        return ("ok_con_fotos" if d["data"] else "vacia"), d
    if isinstance(d, dict) and "id" in d:
        return "ok_objeto", d
    return "error_servidor", d


def mapillary_get(ruta, params, intentos=3):
    """GET a la API Graph de Mapillary. Devuelve (clase, datos, http, ms). Sin caché: una respuesta vacía
    no es prueba de que no haya fotos y debe poder repetirse. Nunca registra el token."""
    import ssl
    import urllib.error
    tok = mapillary_token()
    url = f"{MAPILLARY_API}/{ruta}?" + urllib.parse.urlencode({**params, "access_token": tok or ""})
    for i in range(intentos):
        t0 = time.time()
        codigo, cuerpo, red = None, "", None
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LaLineaCity/1.0 (juego de InfoLinense)"})
            with urllib.request.urlopen(req, timeout=40, context=ssl.create_default_context()) as r:
                codigo, cuerpo = r.status, r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            codigo, cuerpo = e.code, e.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            red = f"{type(e).__name__}: {e}"
        ms = round((time.time() - t0) * 1000)
        clase, d = mapillary_clasificar(codigo, cuerpo, red)
        transitorio = clase == "error_servidor" and isinstance(d, dict) and d.get("error", {}).get("is_transient")
        if not transitorio:
            break
        time.sleep(2 ** i)
    return clase, d, codigo, ms


def _mapillary_foto(im):
    g = (im.get("computed_geometry") or im.get("geometry") or {}).get("coordinates")
    if not g:
        return None
    rumbo = im.get("computed_compass_angle")
    if rumbo is None:
        rumbo = im.get("compass_angle")
    return {
        "id": f"mapillary:{im['id']}", "fuente": "Mapillary", "url": im.get("thumb_1024_url"),
        "pagina": f"https://www.mapillary.com/app/?pKey={im['id']}", "licencia": "CC BY-SA 4.0",
        "autor": (im.get("creator") or {}).get("username", ""),
        "fecha": time.strftime("%Y-%m-%d", time.gmtime(im["captured_at"] / 1000)) if im.get("captured_at") else "",
        "lon": g[0], "lat": g[1], "rumbo": rumbo, "pano": 1 if im.get("is_pano") else 0,
    }


def fuente_mapillary(c, e):
    """Fotos a pie de calle de Mapillary (CC BY-SA 4.0) en un radio de 50 m alrededor del edificio.
    Conector principal: búsqueda por radio (lat, lng, radius). Si la API rechaza la consulta por radio,
    se repite con un bbox pequeño (lon mín, lat mín, lon máx, lat máx) de ±60 m."""
    if not mapillary_token():
        return "sin_token", []
    clase, d, http, _ms = mapillary_get("images", {"lat": f"{e['lat']:.6f}", "lng": f"{e['lon']:.6f}",
                                                    "radius": MAPILLARY_RADIO, "limit": 100, "fields": MAPILLARY_CAMPOS})
    metodo = "radio"
    if clase == "consulta_mal_construida":
        dlat, dlon = 60 / KY, 60 / KX
        bbox = f"{e['lon'] - dlon:.6f},{e['lat'] - dlat:.6f},{e['lon'] + dlon:.6f},{e['lat'] + dlat:.6f}"
        clase, d, http, _ms = mapillary_get("images", {"bbox": bbox, "limit": 100, "fields": MAPILLARY_CAMPOS})
        metodo = "bbox"
    if clase in ("error_autenticacion", "bloqueo_proxy", "error_red", "error_servidor", "consulta_mal_construida"):
        msg = (d or {}).get("error", {}).get("message", "") if isinstance(d, dict) else ""
        raise MapillaryError(clase, f"http {http} {msg}"[:120])
    fotos = [f for f in (_mapillary_foto(im) for im in d.get("data", [])) if f]
    # «vacia» no se da por consultada (no queda en caché): se repetirá en la siguiente investigación.
    return ("ok" if fotos else f"vacia ({metodo})"), fotos


def fuente_commons(c, cuad, centro_lonlat, radio=250):
    """Fotos geolocalizadas de Wikimedia Commons con licencia libre."""
    lon, lat = centro_lonlat
    d = http_json("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "generator": "geosearch", "ggscoord": f"{lat}|{lon}", "ggsradius": radio, "ggsnamespace": 6, "ggslimit": 50,
        "prop": "imageinfo|coordinates", "iiprop": "url|extmetadata", "iiurlwidth": 1024, "format": "json"}))
    out = []
    for p in (d.get("query", {}).get("pages", {}) or {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata", {})
        lic = (meta.get("LicenseShortName", {}) or {}).get("value", "")
        if not any(k in lic.lower() for k in LICENCIAS_LIBRES):
            continue
        co = (p.get("coordinates") or [{}])[0]
        out.append({
            "id": f"commons:{p.get('pageid')}", "fuente": "Wikimedia Commons", "url": ii.get("thumburl") or ii.get("url"),
            "pagina": ii.get("descriptionurl"), "licencia": lic, "autor": (meta.get("Artist", {}) or {}).get("value", "")[:200],
            "fecha": (meta.get("DateTimeOriginal", {}) or {}).get("value", "")[:10], "lon": co.get("lon"), "lat": co.get("lat"), "rumbo": None,
        })
    return "ok", out


def fuente_catastro(cuad, bbox_lonlat):
    """Partes de edificio del Catastro (INSPIRE BU, DGC; reutilización libre citando la fuente):
    contorno y número oficial de plantas sobre rasante. Se guardan en caché por cuadrícula."""
    import re
    import xml.etree.ElementTree as ET
    from pyproj import Transformer
    a_utm = Transformer.from_crs(4326, 25830, always_xy=True)
    a_geo = Transformer.from_crs(25830, 4326, always_xy=True)
    x0, y0 = a_utm.transform(bbox_lonlat[0], bbox_lonlat[1])
    x1, y1 = a_utm.transform(bbox_lonlat[2], bbox_lonlat[3])
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, f"catastro-bu-{cuad}.json")
    if os.path.exists(f):
        return "ok", json.load(open(f))
    url = ("https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=WFS&version=2.0.0&request=GetFeature"
           f"&typeNames=BU:BuildingPart&srsName=EPSG::25830&bbox={x0:.0f},{y0:.0f},{x1:.0f},{y1:.0f}")
    req = urllib.request.Request(url, headers={"User-Agent": "LaLineaCity/1.0 (https://github.com/baautiista/claude)"})
    # La salida a internet cambia de IP: a veces el Catastro bloquea una (403) o el proxy falla (502). Se reintenta.
    for i in range(5):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                xml = r.read()
            if b"ExceptionReport" not in xml[:400]:
                break
            err = xml[:300].decode("latin-1")
        except Exception as ex:  # noqa: BLE001
            err = str(ex)
        time.sleep(2 + 2 * i)
    else:
        raise RuntimeError(f"Catastro sin respuesta válida tras 5 intentos: {err[:120]}")
    time.sleep(1.5)
    ns = {"gml": "http://www.opengis.net/gml/3.2", "bu-ext2d": "http://inspire.jrc.ec.europa.eu/schemas/bu-ext2d/2.0"}
    raiz = ET.fromstring(xml)
    partes = []
    for bp in raiz.iter("{http://inspire.jrc.ec.europa.eu/schemas/bu-ext2d/2.0}BuildingPart"):
        pid = bp.get("{http://www.opengis.net/gml/3.2}id", "")
        nf = bp.find(".//bu-ext2d:numberOfFloorsAboveGround", ns)
        pl = bp.find(".//gml:posList", ns)
        if nf is None or pl is None or not (nf.text or "").strip():
            continue
        v = [float(t) for t in pl.text.split()]
        anillo = []
        for i in range(0, len(v) - 1, 2):
            lon, lat = a_geo.transform(v[i], v[i + 1])
            anillo.append([round((lon - L0) * KX, 2), round((A0 - lat) * KY, 2)])
        partes.append({"id": pid, "plantas": int(nf.text), "huella": anillo})
    json.dump(partes, open(f, "w"))
    return "ok", partes


def plantas_catastro(e, partes):
    """Plantas oficiales del edificio: la de la parte catastral que más superficie comparte con su huella."""
    from shapely.geometry import Polygon
    try:
        h = Polygon(json.loads(e["datos"])["huella"]).buffer(0)
    except Exception:  # noqa: BLE001
        return None
    # Catastro parte cada edificio en volúmenes (un bajo comercial que ocupa toda la parcela es «1 planta»
    # aunque encima haya más): se toma la parte más alta entre las que cubren al menos un 30 % de la huella.
    cand = []
    for p in partes:
        try:
            q = Polygon(p["huella"]).buffer(0)
        except Exception:  # noqa: BLE001
            continue
        if p["plantas"] < 1 or not q.intersects(h):
            continue
        a = q.intersection(h).area
        cand.append((a, p))
    if not cand:
        return None
    buenos = [t for t in cand if t[0] >= 0.3 * h.area] or [max(cand, key=lambda t: t[0])]
    a, p = max(buenos, key=lambda t: (t[1]["plantas"], t[0]))
    if a < 0.15 * h.area:
        return None
    return p["plantas"], round(a / h.area, 2), p["id"]


def fuente_propias(c, eid, calles):
    """Fotos del usuario: fotos-propias/<id o calle>/manifiesto.json [{archivo, autor, fecha, licencia, lon, lat, rumbo}]."""
    out = []
    for nombre in [eid, *calles]:
        d = os.path.join(PROPIAS, nombre)
        man = os.path.join(d, "manifiesto.json")
        if not os.path.exists(man):
            continue
        for m in json.load(open(man)):
            f = os.path.join(d, m["archivo"])
            if not os.path.exists(f):
                continue
            out.append({"id": f"propia:{hashlib.sha1(open(f, 'rb').read()).hexdigest()[:16]}", "fuente": "Foto propia", "url": None, "pagina": None,
                        "licencia": m.get("licencia", "propia"), "autor": m.get("autor", ""), "fecha": m.get("fecha", ""),
                        "lon": m.get("lon"), "lat": m.get("lat"), "rumbo": m.get("rumbo"), "archivo": os.path.relpath(f, RAIZ)})
    return ("ok" if out else "sin_fotos"), out


def consultar(c, clave, fuente, fn):
    """Una consulta por cuadrícula y fuente: el resultado (o el fallo) se guarda y no se repite."""
    hecho = c.execute("SELECT resultado FROM consultas WHERE clave=?", (clave,)).fetchone()
    if hecho and hecho[0] == "ok":
        return hecho[0], None  # ya consultada: sus fotos están en la tabla «fotos»
    try:
        res, fotos = fn()
    except Exception as e:  # noqa: BLE001 — red bloqueada, cuota, etc.: se registra y se sigue
        res, fotos = f"sin_acceso: {str(e)[:140]}", []
    c.execute("INSERT OR REPLACE INTO consultas VALUES (?,?,?,?,?)", (clave, fuente, ahora(), res, len(fotos)))
    for f in fotos:
        c.execute("INSERT OR IGNORE INTO fotos (id, fuente, url, pagina, licencia, autor, fecha, lon, lat, rumbo, archivo, pano) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                  (f["id"], f["fuente"], f["url"], f["pagina"], f["licencia"], f["autor"], f["fecha"], f["lon"], f["lat"], f["rumbo"], f.get("archivo"), f.get("pano")))
    return res, fotos


def _fachadas(huella, caras):
    """Aristas de la huella con su punto medio y normal hacia fuera; solo las que dan a la calle
    (las medianeras no se ven desde la calle). Si no hay datos de caras, se usan todas."""
    import math
    n = len(huella)
    area2 = sum(huella[i][0] * huella[(i + 1) % n][1] - huella[(i + 1) % n][0] * huella[i][1] for i in range(n))
    out = []
    for i in range(n):
        if caras and i < len(caras) and caras[i] != "calle":
            continue
        (x0, y0), (x1, y1) = huella[i], huella[(i + 1) % n]
        lx, ly = x1 - x0, y1 - y0
        lar = math.hypot(lx, ly)
        if lar < 1.5:
            continue
        # normal exterior: depende del sentido de giro del anillo
        nx, ny = (ly / lar, -lx / lar) if area2 > 0 else (-ly / lar, lx / lar)
        out.append({"i": i, "a": (x0, y0), "b": (x1, y1), "m": ((x0 + x1) / 2, (y0 + y1) / 2), "n": (nx, ny), "largo": lar})
    return out


ASOC_MAX_M = 45      # más lejos, la fachada ocupa poco en la foto y el detalle no sirve
ASOC_MEDIO_FOV = 40  # semiángulo horizontal de una cámara normal (~80° de campo); las 360° lo ven todo


def evaluar_foto(cam, rumbo, pano, ed, obstaculos):
    """Confianza (0–1) de que la foto tomada en `cam` (coords del juego) con `rumbo` (0 = norte) muestre
    alguna fachada a la calle del edificio `ed` ({id, huella, caras}). Criterios: distancia, la fachada
    mira a la cámara, la cámara apunta a la fachada (salvo 360°) y no hay otro edificio en medio.
    Devuelve (confianza, distancia, desvío angular, índice de fachada) o None."""
    import math
    from shapely.geometry import LineString
    mejor = None
    for f in _fachadas(ed["huella"], ed.get("caras")):
        # Punto de la fachada más cercano a la cámara (no solo el medio: en fachadas largas importa).
        ax, ay = f["a"]
        bx, by = f["b"]
        t = max(0.1, min(0.9, ((cam[0] - ax) * (bx - ax) + (cam[1] - ay) * (by - ay)) / (f["largo"] ** 2)))
        px, py = ax + t * (bx - ax), ay + t * (by - ay)
        vx, vy = px - cam[0], py - cam[1]
        dist = math.hypot(vx, vy)
        if dist > ASOC_MAX_M or dist < 0.5:
            continue
        incid = -(vx * f["n"][0] + vy * f["n"][1]) / dist  # 1 = de frente, 0 = rasante, <0 = por detrás
        if incid < 0.12:
            continue
        # ¿Algún otro edificio tapa la línea de visión? (se recorta 0,4 m al final para no tocar la propia fachada)
        k = (dist - 0.4) / dist
        rayo = LineString([cam, (cam[0] + vx * k, cam[1] + vy * k)])
        if any(o.intersects(rayo) for o in obstaculos):
            continue
        if pano:
            desvio, w_ang = 0.0, 1.0
        elif rumbo is None:
            desvio, w_ang = None, 0.35  # sin orientación: posible, pero poco fiable
        else:
            # Desvío entre el rumbo y la parte más cercana de la fachada (punto medio y extremos).
            def rumbo_a(x, y):
                return math.degrees(math.atan2(x - cam[0], -(y - cam[1]))) % 360  # y del juego crece hacia el sur
            desvio = min(abs((rumbo_a(x, y) - rumbo + 180) % 360 - 180) for x, y in (f["a"], f["b"], f["m"], (px, py)))
            if desvio > ASOC_MEDIO_FOV:
                continue
            w_ang = 1 - 0.6 * desvio / ASOC_MEDIO_FOV
            # Ángulo entre el eje de la cámara y la fachada: mirando a lo largo de la calle se ve muy
            # en escorzo aunque la cámara esté pegada a ella.
            dx, dy = math.sin(math.radians(rumbo)), -math.cos(math.radians(rumbo))
            incid = min(incid, max(0.0, -(dx * f["n"][0] + dy * f["n"][1])))
        w_dist = 1 - (max(dist, 6) - 6) / (ASOC_MAX_M - 6) * 0.7
        conf = round(max(0.0, min(1.0, w_ang * w_dist * (0.3 + 0.7 * incid))), 2)
        if not mejor or conf > mejor[0]:
            mejor = (conf, round(dist, 1), None if desvio is None else round(desvio, 1), f["i"])
    return mejor


def asociar_fotos(c, e):
    """Asocia al edificio cada foto cercana que probablemente muestre una de sus fachadas a la calle,
    con una confianza por asociación. No se asigna cada foto solo al edificio más cercano: una misma foto
    puede servir para varios edificios (o para el de enfrente y no para el de al lado), y un edificio
    puede tener varias fotos."""
    from shapely.geometry import Polygon
    datos = json.loads(e["datos"])
    ed = {"id": e["id"], "huella": datos.get("huella") or [], "caras": datos.get("caras")}
    if len(ed["huella"]) < 3:
        return 0
    r = 0.0009  # ~80–100 m
    vecinos = []
    for v in c.execute("SELECT id, datos FROM edificios WHERE id!=? AND lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?",
                       (e["id"], e["lon"] - r, e["lon"] + r, e["lat"] - r, e["lat"] + r)):
        h = json.loads(v["datos"]).get("huella") or []
        if len(h) >= 3:
            try:
                vecinos.append(Polygon(h).buffer(-0.3))  # se encoge un poco: el ruido de la huella no debe tapar la calle
            except Exception:  # noqa: BLE001
                pass
    n = 0
    c.execute("DELETE FROM foto_edificio WHERE edificio=?", (e["id"],))
    for f in c.execute("SELECT id, lon, lat, rumbo, pano FROM fotos WHERE lon IS NOT NULL AND lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?",
                       (e["lon"] - 0.0007, e["lon"] + 0.0007, e["lat"] - 0.0006, e["lat"] + 0.0006)).fetchall():
        cam = ((f["lon"] - L0) * KX, (A0 - f["lat"]) * KY)
        if any(o.contains(Polygon([(cam[0] - .1, cam[1] - .1), (cam[0] + .1, cam[1] - .1), (cam[0], cam[1] + .1)])) for o in vecinos):
            continue  # cámara dentro de otro edificio (posición mal calculada o foto de interior)
        res = evaluar_foto(cam, f["rumbo"], bool(f["pano"]), ed, vecinos)
        if not res or res[0] < 0.2:
            continue
        conf, dist, desvio, fachada = res
        c.execute("INSERT OR REPLACE INTO foto_edificio (foto, edificio, distancia, encara, confianza, fachada) VALUES (?,?,?,?,?,?)",
                  (f["id"], e["id"], dist, desvio, conf, fachada))
        n += 1
    return n


def seleccion(c, a):
    q = "SELECT * FROM edificios"
    if a.lote:
        ids = [e["id"] for e in json.load(open(os.path.join(RAIZ, "city-reconstruction", "blender", "lotes", f"{a.lote}.json")))["edificios"]]
        return [r for r in c.execute(f"{q} WHERE id IN ({','.join('?' * len(ids))})", ids)]
    if a.calle:
        return list(c.execute(f"{q} WHERE id IN (SELECT edificio FROM edificio_calle WHERE calle=?)", (a.calle,)))
    if a.barrio:
        return list(c.execute(f"{q} WHERE barrio=? AND estado IN ('PENDIENTE','ERROR') ORDER BY area DESC LIMIT ?", (a.barrio, a.max)))
    return list(c.execute(f"{q} WHERE estado='PENDIENTE' LIMIT ?", (a.max,)))


def investigar(a):
    c = conectar()
    eds = seleccion(c, a)
    indice = json.load(open(os.path.join(RAIZ, "src", "datos", "ciudad", "indice.json")))["teselas"]
    for e in eds:
        mover(c, e["id"], "INVESTIGANDO")
        try:
            cuad = e["cuadricula"]
            bb = indice[cuad]["bbox"]
            lo0, la1 = a_lonlat(bb[0], bb[1])
            lo1, la0 = a_lonlat(bb[2], bb[3])
            r1, _ = consultar(c, f"mapillary:{e['id']}", "Mapillary", lambda: fuente_mapillary(c, e))
            r2, _ = consultar(c, f"commons:{cuad}", "Wikimedia Commons", lambda: fuente_commons(c, cuad, ((lo0 + lo1) / 2, (la0 + la1) / 2)))
            calles = [r[0] for r in c.execute("SELECT calle FROM edificio_calle WHERE edificio=?", (e["id"],))]
            r3, _ = consultar(c, f"propias:{e['id']}", "Foto propia", lambda: fuente_propias(c, e["id"], calles))
            # Datos oficiales del Catastro: plantas comprobadas.
            try:
                rc, partes = fuente_catastro(cuad, (lo0, la0, lo1, la1))
                pc = plantas_catastro(e, partes)
                if pc:
                    pl, cobertura, pid = pc
                    c.execute("INSERT OR IGNORE INTO fotos (id, fuente, url, pagina, licencia, autor, fecha) VALUES (?,?,?,?,?,?,?)",
                              (f"catastro:{pid}", "Catastro INSPIRE BU", None, "https://www.catastro.hacienda.gob.es/", "Reutilización libre citando a la DG del Catastro", "Dirección General del Catastro", time.strftime("%Y-%m-%d")))
                    c.execute("INSERT OR REPLACE INTO observaciones VALUES (?,?,?,?,?,?,?,?)",
                              (e["id"], "plantas", str(pl), "comprobado", round(0.75 + 0.2 * min(1, cobertura), 2), f"catastro:{pid}", "Catastro", ahora()))
                c.execute("INSERT OR REPLACE INTO consultas VALUES (?,?,?,?,?)", (f"catastro:{cuad}", "Catastro INSPIRE BU", ahora(), rc, len(partes)))
            except Exception as ex:  # noqa: BLE001
                c.execute("INSERT OR REPLACE INTO consultas VALUES (?,?,?,?,?)", (f"catastro:{cuad}", "Catastro INSPIRE BU", ahora(), f"sin_acceso: {str(ex)[:120]}", 0))
            n = asociar_fotos(c, e)
            if n:
                mover(c, e["id"], "REFERENCIAS_ENCONTRADAS", f"{n} fotos")
            elif e["estado"] in ("MODELANDO", "VALIDANDO", "INTEGRADO"):
                # Sin fotos nuevas no se retrocede un edificio ya modelado: sigue la generación procedural.
                mover(c, e["id"], e["estado"], "investigado de nuevo: 0 fotos")
            else:
                mover(c, e["id"], "SIN_REFERENCIAS", "0 fotos")
            rcat = c.execute("SELECT resultado FROM consultas WHERE clave=?", (f"catastro:{cuad}",)).fetchone()
            ficha(c, e["id"], {"Catastro": rcat[0] if rcat else None, "Mapillary": r1, "Wikimedia Commons": r2, "Fotos propias": r3})
        except Exception as ex:  # noqa: BLE001
            mover(c, e["id"], "ERROR", error=str(ex)[:300])
        c.commit()
    resumen(c, eds)


# ── Fichas: comprobado / inferido / desconocido ─────────────────────

CAMPOS = ("plantas", "alturaM", "tipologia", "revestimiento", "color", "pb", "cubierta", "balcones", "ventanas", "singular")


def ficha(c, eid, consultas=None):
    e = c.execute("SELECT * FROM edificios WHERE id=?", (eid,)).fetchone()
    d = json.loads(e["datos"])
    obs = {}
    for o in c.execute("SELECT * FROM observaciones WHERE edificio=? ORDER BY confianza DESC", (eid,)):
        obs.setdefault(o["campo"], dict(o))
    fuentes_dato = d.get("fuentes") or {}
    conf = d.get("confianza") or {}
    atributos = {}
    for k in CAMPOS:
        if k in obs:
            o = obs[k]
            atributos[k] = {"valor": o["valor"], "estado": o["estado"], "confianza": o["confianza"], "fuente": o["foto"], "autor": o["autor"], "fecha": o["fecha"]}
        elif k in ("plantas", "alturaM") and d.get(k) is not None:
            # «Comprobado» solo si viene de un dato real (Catastro, OSM building:levels, Overture con fuente).
            fuente = fuentes_dato.get("plantas" if k == "plantas" else "altura", "")
            real = any(t in fuente.lower() for t in ("catastro", "building:levels", "osm levels", "overture num_floors"))
            atributos[k] = {"valor": d.get(k), "estado": "comprobado" if real else "inferido", "confianza": conf.get("plantas" if k == "plantas" else "altura"), "fuente": fuente}
        elif d.get(k) is not None:
            atributos[k] = {"valor": d.get(k), "estado": "inferido", "confianza": conf.get(k, "baja"), "fuente": "reglas del generador (scripts/sector/nucleo.py)"}
        else:
            atributos[k] = {"valor": None, "estado": "desconocido"}
    fotos = [dict(r) for r in c.execute("SELECT f.*, fe.distancia, fe.encara, fe.confianza, fe.fachada FROM foto_edificio fe JOIN fotos f ON f.id=fe.foto WHERE fe.edificio=? ORDER BY fe.confianza DESC, fe.distancia", (eid,))]
    previa = {}
    fp = os.path.join(FICHAS, f"{eid}.json")
    if os.path.exists(fp):
        previa = json.load(open(fp))
    out = {
        "id": eid, "osm": e["osm"], "overture": e["overture"], "barrio": e["barrio"], "cuadricula": e["cuadricula"],
        "calles": [r[0] for r in c.execute("SELECT calle FROM edificio_calle WHERE edificio=?", (eid,))],
        "coordenadas": {"juego": [round(e["x"], 1), round(e["y"], 1)], "lon": round(e["lon"], 6), "lat": round(e["lat"], 6)},
        "geometria": {"huella": d.get("huella"), "area_m2": e["area"], "caras": d.get("caras")},
        "atributos": atributos,
        "fotos": [{k: f[k] for k in ("id", "fuente", "pagina", "licencia", "autor", "fecha", "distancia", "encara", "confianza", "fachada", "archivo")} for f in fotos],
        "consultas": consultas or previa.get("consultas", {}),
        "estado": c.execute("SELECT estado FROM edificios WHERE id=?", (eid,)).fetchone()[0],
        "actualizada": ahora(),
        "nota": "comprobado = dato oficial u observado en una foto con licencia; inferido = reglas del generador; desconocido = sin información.",
    }
    os.makedirs(FICHAS, exist_ok=True)
    json.dump(out, open(fp, "w"), ensure_ascii=False, indent=1)
    return out


def observar(a):
    """Registra una observación hecha sobre una foto con licencia (la hace el agente analista o una persona)."""
    c = conectar()
    for kv in a.pares:
        k, v = kv.split("=", 1)
        if k not in CAMPOS:
            sys.exit(f"campo desconocido: {k} (válidos: {', '.join(CAMPOS)})")
        if a.foto and not c.execute("SELECT 1 FROM fotos WHERE id=?", (a.foto,)).fetchone():
            sys.exit(f"la foto {a.foto} no está en la base de datos: solo se observa sobre fuentes registradas")
        c.execute("INSERT OR REPLACE INTO observaciones VALUES (?,?,?,?,?,?,?,?)",
                  (a.edificio, k, v, "comprobado" if a.foto else "inferido", a.confianza, a.foto or "", a.autor, ahora()))
    ficha(c, a.edificio)
    c.commit()
    print("ficha actualizada:", os.path.relpath(os.path.join(FICHAS, f"{a.edificio}.json"), RAIZ))


# ── Modelado e integración (agente de Blender) ──────────────────────

BLENDER = os.environ.get("BLENDER_PY", "/opt/blender-venv/bin/python")
MAPA_OBS = {"plantas": int, "alturaM": float, "tipologia": str, "revestimiento": str, "color": str, "pb": str, "cubierta": str}


def modelar(a):
    c = conectar()
    lf = os.path.join(RAIZ, "city-reconstruction", "blender", "lotes", f"{a.lote}.json")
    if not os.path.exists(lf):
        sys.exit(f"no existe el lote {a.lote}: créalo con scripts/blender/lote.py")
    lote = json.load(open(lf))
    ids = [e["id"] for e in lote["edificios"]]
    for eid in ids:
        mover(c, eid, "MODELANDO", f"lote {a.lote}")
    c.commit()
    # Las observaciones comprobadas pasan por delante de lo inferido por el generador.
    aplicadas = 0
    for e in lote["edificios"]:
        for o in c.execute("SELECT campo, valor FROM observaciones WHERE edificio=? AND estado='comprobado' ORDER BY confianza", (e["id"],)):
            if o["campo"] in MAPA_OBS:
                e[o["campo"]] = MAPA_OBS[o["campo"]](o["valor"])
                aplicadas += 1
        campos_obs = [r[0] for r in c.execute("SELECT campo FROM observaciones WHERE edificio=? AND estado='comprobado'", (e["id"],))]
        if "plantas" in campos_obs and "alturaM" not in campos_obs:
            e["alturaM"] = round(e["plantas"] * 3.0 + 0.6, 1)
    json.dump(lote, open(lf, "w"), ensure_ascii=False, indent=1)
    r = subprocess.run([BLENDER, os.path.join(RAIZ, "scripts", "blender", "generar.py"), a.lote], cwd=RAIZ, capture_output=True, text=True)
    informe_f = os.path.join(RAIZ, "city-reconstruction", "blender", "informes", f"{a.lote}.json")
    if r.returncode != 0 or not os.path.exists(informe_f):
        for eid in ids:
            mover(c, eid, "ERROR", error=(r.stderr or r.stdout)[-300:])
        c.commit()
        sys.exit("Blender falló; el error queda registrado en la cola")
    inf = json.load(open(informe_f))
    for f in inf["edificios"]:
        probl = f["lod0"]["problemas"] + f["lod1"]["problemas"]
        c.execute("UPDATE edificios SET lote=?, revisar=? WHERE id=?", (a.lote, 1 if probl else 0, f["id"]))
        mover(c, f["id"], "VALIDANDO", "; ".join(probl) or f"GLB {inf['glb_kb']} KB")
    c.commit()
    print(f"{a.lote}: {len(ids)} edificios modelados ({aplicadas} observaciones aplicadas) · {inf['problemas']} problemas · {inf['glb']}")
    print("Siguiente paso: comprobar en el juego y ejecutar  explorar.py integrar --lote", a.lote)


def integrar(a):
    """Marca INTEGRADO lo que el juego ha cargado bien (comprobación en el navegador)."""
    c = conectar()
    est = json.load(open(a.verificacion)) if a.verificacion else None
    lote = json.load(open(os.path.join(RAIZ, "src", "datos", "modelos", "indice.json")))["lotes"].get(a.lote)
    if not lote:
        sys.exit("el lote no está en el índice del juego")
    ok = est is None or (est.get(a.lote, {}).get("edificios", 0) == len(lote["edificios"]) and not est.get(a.lote, {}).get("error"))
    for eid in lote["edificios"]:
        if ok:
            mover(c, eid, "INTEGRADO", "comprobado en el juego" if est else "integrado")
        else:
            mover(c, eid, "ERROR", error=f"el juego no cargó el lote: {est.get(a.lote)}")
    c.commit()
    print(f"{a.lote}: {'INTEGRADO' if ok else 'ERROR'} ({len(lote['edificios'])} edificios)")


def prioridad(a):
    c = conectar()
    c.execute("INSERT INTO sectores (barrio, prioridad) VALUES (?,?) ON CONFLICT(barrio) DO UPDATE SET prioridad=excluded.prioridad", (a.barrio, a.valor))
    c.commit()
    print(f"{a.barrio}: prioridad {a.valor}")


def siguiente(a):
    """Investiga los siguientes edificios pendientes del barrio más prioritario."""
    c = conectar()
    fila = c.execute("""SELECT e.barrio FROM edificios e LEFT JOIN sectores s ON s.barrio=e.barrio
                        WHERE e.estado IN ('PENDIENTE') GROUP BY e.barrio ORDER BY MIN(COALESCE(s.prioridad, 9)), COUNT(*) DESC LIMIT 1""").fetchone()
    if not fila:
        print("No queda nada pendiente.")
        return
    a.barrio, a.lote, a.calle = fila[0], None, None
    investigar(a)


# ── Panel ────────────────────────────────────────────────────────────

def estadisticas(c):
    t = lambda q, *p: c.execute(q, p).fetchone()[0]  # noqa: E731
    por_barrio = []
    for r in c.execute("""SELECT e.barrio, COUNT(*) n, SUM(e.estado!='PENDIENTE') inv, SUM(e.estado='INTEGRADO') integ,
                                 SUM(e.id IN (SELECT edificio FROM foto_edificio)) conref, COALESCE(s.prioridad, 9) pri
                          FROM edificios e LEFT JOIN sectores s ON s.barrio=e.barrio GROUP BY e.barrio ORDER BY pri, n DESC"""):
        por_barrio.append({"barrio": r["barrio"], "edificios": r["n"], "investigados": r["inv"], "con_referencias": r["conref"], "integrados": r["integ"], "prioridad": r["pri"],
                           "avance": round(100 * (r["integ"] or 0) / r["n"], 1)})
    calles_ok = t("""SELECT COUNT(*) FROM calles k WHERE edificios>0 AND NOT EXISTS (
                     SELECT 1 FROM edificio_calle ec JOIN edificios e ON e.id=ec.edificio WHERE ec.calle=k.nombre AND e.estado!='INTEGRADO')""")
    return {
        "total": t("SELECT COUNT(*) FROM edificios"),
        "investigados": t("SELECT COUNT(*) FROM edificios WHERE estado!='PENDIENTE'"),
        "con_referencias": t("SELECT COUNT(DISTINCT edificio) FROM foto_edificio"),
        "con_datos_oficiales": t("SELECT COUNT(DISTINCT edificio) FROM observaciones WHERE autor='Catastro'"),
        "modelados": t("SELECT COUNT(*) FROM edificios WHERE lote IS NOT NULL"),
        "integrados": t("SELECT COUNT(*) FROM edificios WHERE estado='INTEGRADO'"),
        "calles": t("SELECT COUNT(*) FROM calles WHERE edificios>0"),
        "calles_completadas": calles_ok,
        "revisar": t("SELECT COUNT(*) FROM edificios WHERE revisar=1"),
        "errores": [dict(r) for r in c.execute("SELECT id, barrio, error, actualizado FROM edificios WHERE estado='ERROR' ORDER BY actualizado DESC LIMIT 50")],
        "estados": {r[0]: r[1] for r in c.execute("SELECT estado, COUNT(*) FROM edificios GROUP BY estado")},
        "consultas": [dict(r) for r in c.execute("SELECT fuente, resultado, COUNT(*) n FROM consultas GROUP BY fuente, resultado")],
        "barrios": por_barrio,
        "eventos": [dict(r) for r in c.execute("SELECT * FROM eventos ORDER BY rowid DESC LIMIT 40")],
    }


def resumen(c, eds):
    est = {}
    for e in eds:
        s = c.execute("SELECT estado FROM edificios WHERE id=?", (e["id"],)).fetchone()[0]
        est[s] = est.get(s, 0) + 1
    print(f"{len(eds)} edificios investigados: {est}")
    for r in c.execute("SELECT fuente, resultado, COUNT(*) FROM consultas GROUP BY fuente, resultado"):
        print(f"  {r[0]}: {r[1]} ×{r[2]}")


def panel(a):
    import http.server
    import socketserver

    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *k, **kw):
            super().__init__(*k, directory=os.path.join(RAIZ, "scripts", "exploracion"), **kw)

        def log_message(self, *k):
            pass

        def do_GET(self):  # noqa: N802
            if self.path.startswith("/api/estado"):
                d = json.dumps(estadisticas(conectar()), ensure_ascii=False).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(d)
                return
            if self.path in ("/", "/index.html"):
                self.path = "/panel.html"
            return super().do_GET()

        def do_POST(self):  # noqa: N802
            n = int(self.headers.get("Content-Length", 0))
            d = json.loads(self.rfile.read(n) or b"{}")
            if self.path == "/api/prioridad":
                c = conectar()
                c.execute("INSERT INTO sectores (barrio, prioridad) VALUES (?,?) ON CONFLICT(barrio) DO UPDATE SET prioridad=excluded.prioridad", (d["barrio"], int(d["prioridad"])))
                c.commit()
            self.send_response(204)
            self.end_headers()

    with socketserver.TCPServer(("127.0.0.1", a.puerto), H) as s:
        print(f"Panel en http://127.0.0.1:{a.puerto}/")
        s.serve_forever()


def fuentes(_a):
    import ssl  # noqa: F401
    tok = mapillary_token()
    print(f"  Token de Mapillary: {'definido' if tok else 'no definido'}" + ("" if os.environ.get("MAPILLARY_TOKEN") or not tok else " (como MMAPILLARY_TOKEN)"))
    if tok:
        clase, _d, http, ms = mapillary_get("images", {"lat": 36.1644, "lng": -5.3506, "radius": 50, "limit": 10, "fields": "id"})
        print(f"  Mapillary (radio 50 m): {clase} · http {http} · {ms} ms")
        clase2, _d, http2, _ = mapillary_get("1", {"fields": "id"})
        print(f"  Mapillary (token por ID): {'token aceptado' if clase2 == 'consulta_mal_construida' else clase2} · http {http2}")
    pruebas = {
        "Wikimedia Commons": "https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json",
        "Overpass (OSM)": "https://overpass-api.de/api/status",
        "IGN/CNIG": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&REQUEST=GetCapabilities",
        "Catastro": "https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=WFS&request=GetCapabilities",
    }
    for k, u in pruebas.items():
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "LaLineaCity/1.0"}), timeout=15) as r:
                print(f"  {k}: responde ({r.status})")
        except Exception as e:  # noqa: BLE001
            print(f"  {k}: no accesible ({str(e)[:90]})")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="orden", required=True)
    s.add_parser("iniciar").set_defaults(fn=iniciar)
    s.add_parser("fuentes").set_defaults(fn=fuentes)
    for nombre, fn in (("investigar", investigar), ("siguiente", siguiente)):
        q = s.add_parser(nombre)
        q.add_argument("--lote")
        q.add_argument("--calle")
        q.add_argument("--barrio")
        q.add_argument("--max", type=int, default=30)
        q.set_defaults(fn=fn)
    q = s.add_parser("observar")
    q.add_argument("edificio")
    q.add_argument("pares", nargs="+")
    q.add_argument("--foto")
    q.add_argument("--confianza", type=float, default=0.7)
    q.add_argument("--autor", default="agente")
    q.set_defaults(fn=observar)
    for nombre, fn in (("modelar", modelar), ("integrar", integrar)):
        q = s.add_parser(nombre)
        q.add_argument("--lote", required=True)
        q.add_argument("--verificacion")
        q.set_defaults(fn=fn)
    q = s.add_parser("prioridad")
    q.add_argument("barrio")
    q.add_argument("valor", type=int)
    q.set_defaults(fn=prioridad)
    q = s.add_parser("panel")
    q.add_argument("--puerto", type=int, default=8765)
    q.set_defaults(fn=panel)
    a = p.parse_args()
    a.fn(a)
    if a.orden not in ("panel", "fuentes"):
        guardar_progreso(conectar())


if __name__ == "__main__":
    main()
