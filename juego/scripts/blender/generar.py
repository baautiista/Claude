"""
Generador procedural de manzanas de La Línea City en Blender (API bpy, sin interfaz).

Uso:  /opt/blender-venv/bin/python scripts/blender/generar.py <LOTE>
Lee   city-reconstruction/blender/lotes/<LOTE>.json   (scripts/blender/lote.py)
Crea  city-reconstruction/blender/blend/<LOTE>.blend  (original editable)
      public/modelos/manzanas/<LOTE>.glb              (exportado para el juego)
      city-reconstruction/blender/render/<LOTE>-*.png (validación visual)
      city-reconstruction/blender/informes/<LOTE>.json
y actualiza city-reconstruction/blender/registro.json y src/datos/modelos/indice.json.

Cada edificio se construye desde sus datos reales (huella, plantas, altura, caras a calle,
patio o medianera, tipología, planta baja, cubierta, revestimiento y color) en dos niveles:
  LOD0  fachadas con huecos rehundidos, carpintería, persianas, balcones de forja, cierros,
        bajos comerciales, zócalo, cornisa, pretil, casetón, depósito y antena;
  LOD1  volumen con los huecos pintados (lejos).
Materiales compartidos (4) y color por vértice: pocas llamadas de dibujo en el juego.

Coordenadas: Blender X = x − origenX, Y = −(y − origenY), Z = altura. El exportador glTF
(Y arriba) lo convierte en (x − origenX, altura, y − origenY): el sistema del juego.
"""
import bpy
import json
import math
import os
import random
import sys
import time
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VERSION_GENERADOR = 1


def ruta(*p):
    q = os.path.join(RAIZ, *p)
    os.makedirs(os.path.dirname(q), exist_ok=True)
    return q


# ── Color ────────────────────────────────────────────────────────────

def srgb_lineal(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def color(h, k=1.0):
    h = h.lstrip("#")
    return tuple(min(1.0, srgb_lineal(int(h[i:i + 2], 16) / 255) * k) for i in (0, 2, 4))


def mezclar(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


BLANCO = color("#F4F2EC")
CRISTAL = color("#3E4E5A")
CRISTAL_TIENDA = color("#5E7684")
HIERRO = color("#1F2326")
MADERA = color("#5B3A26")
PERSIANA = color("#E9E4D6")
PIEDRA = color("#B8AD98")
GRIS_AZOTEA = color("#BDB6AA")
TEJA = color("#B3573A")
ALUMINIO = color("#9AA0A4")
DEPOSITO = color("#2B2E31")
TOLDOS = [color("#2F6B3F"), color("#9C2F2F"), color("#2D4E8A"), color("#C98F2E"), color("#6A6F74")]
ROTULOS = [color("#1F5EFF"), color("#C42E3B"), color("#2E7D4F"), color("#202020"), color("#E0A526")]

MATS = ("Muro", "Cristal", "Metal", "Teja")


# ── Constructor de mallas ────────────────────────────────────────────

class Malla:
    """Polígonos con material y color por cara (se vuelca a una malla de Blender)."""

    def __init__(self):
        self.v = []
        self.f = []

    def poli(self, pts, mat, col, normal=None):
        pts = [Vector(p) for p in pts]
        if normal is not None and len(pts) >= 3:
            n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
            if n.length < 1e-9 and len(pts) > 3:
                n = (pts[2] - pts[0]).cross(pts[3] - pts[0])
            if n.dot(Vector(normal)) < 0:
                pts.reverse()
        i0 = len(self.v)
        self.v.extend(pts)
        self.f.append((tuple(range(i0, i0 + len(pts))), MATS.index(mat), col))

    def triangulos(self):
        return sum(len(f[0]) - 2 for f in self.f)

    def objeto(self, nombre, mats, coleccion):
        me = bpy.data.meshes.new(nombre)
        me.from_pydata([tuple(v) for v in self.v], [], [f[0] for f in self.f])
        for m in mats:
            me.materials.append(m)
        for i, f in enumerate(self.f):
            me.polygons[i].material_index = f[1]
        attr = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
        for i, p in enumerate(me.polygons):
            c = self.f[i][2]
            for li in p.loop_indices:
                attr.data[li].color = (c[0], c[1], c[2], 1.0)
        me.validate()
        # Fusiona vértices coincidentes (las caras contiguas comparten posición; el color va por esquina).
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
        bm.to_mesh(me)
        bm.free()
        me.update()
        ob = bpy.data.objects.new(nombre, me)
        coleccion.objects.link(ob)
        return ob


class Marco:
    """Sistema local de una fachada: s a lo largo, h altura, w hacia fuera (normal exterior)."""

    def __init__(self, a, b, z0=0.0):
        self.a = Vector((a[0], a[1], z0))
        d = Vector((b[0] - a[0], b[1] - a[1], 0))
        self.L = d.length
        self.u = d.normalized()
        self.n = Vector((self.u.y, -self.u.x, 0))

    def p(self, s, h, w=0.0):
        return self.a + self.u * s + self.n * w + Vector((0, 0, h))


def rect(M, mc, s0, s1, h0, h1, w, mat, col, normal_w=1):
    n = mc.n * normal_w
    M.poli([mc.p(s0, h0, w), mc.p(s1, h0, w), mc.p(s1, h1, w), mc.p(s0, h1, w)], mat, col, n)


def caja(M, mc, s0, s1, h0, h1, w0, w1, mat, col, sin_fondo=True):
    """Caja en el marco de una fachada (sin cara trasera pegada al muro)."""
    P = mc.p
    rect(M, mc, s0, s1, h0, h1, w1, mat, col, 1)
    if not sin_fondo:
        rect(M, mc, s0, s1, h0, h1, w0, mat, col, -1)
    M.poli([P(s0, h1, w0), P(s1, h1, w0), P(s1, h1, w1), P(s0, h1, w1)], mat, col, (0, 0, 1))
    M.poli([P(s0, h0, w0), P(s1, h0, w0), P(s1, h0, w1), P(s0, h0, w1)], mat, mezclar(col, (0, 0, 0), 0.25), (0, 0, -1))
    M.poli([P(s0, h0, w0), P(s0, h0, w1), P(s0, h1, w1), P(s0, h1, w0)], mat, mezclar(col, (0, 0, 0), 0.1), -mc.u)
    M.poli([P(s1, h0, w0), P(s1, h0, w1), P(s1, h1, w1), P(s1, h1, w0)], mat, mezclar(col, (0, 0, 0), 0.1), mc.u)


def hueco(M, mc, s0, s1, h0, h1, prof, col_muro, col_fondo, mat_fondo="Cristal"):
    """Hueco rehundido: mochetas, dintel, alféizar interior y fondo (cristal o puerta)."""
    sombra = mezclar(col_muro, (0, 0, 0), 0.22)
    P = mc.p
    M.poli([P(s0, h0, 0), P(s0, h0, -prof), P(s0, h1, -prof), P(s0, h1, 0)], "Muro", sombra, mc.u)
    M.poli([P(s1, h0, 0), P(s1, h0, -prof), P(s1, h1, -prof), P(s1, h1, 0)], "Muro", sombra, -mc.u)
    M.poli([P(s0, h1, 0), P(s1, h1, 0), P(s1, h1, -prof), P(s0, h1, -prof)], "Muro", mezclar(col_muro, (0, 0, 0), 0.35), (0, 0, -1))
    M.poli([P(s0, h0, 0), P(s1, h0, 0), P(s1, h0, -prof), P(s0, h0, -prof)], "Muro", mezclar(col_muro, (0, 0, 0), 0.08), (0, 0, 1))
    rect(M, mc, s0, s1, h0, h1, -prof, mat_fondo, col_fondo)


def muro_con_huecos(M, mc, s0, s1, h0, h1, huecos, col):
    """Paño de muro entre s0..s1 y h0..h1 con huecos rectangulares [(a, b, c, d)] (sin solapes)."""
    hs = sorted(huecos)
    if not hs:
        rect(M, mc, s0, s1, h0, h1, 0, "Muro", col)
        return
    # Franjas verticales entre huecos y, sobre/bajo cada hueco, su dintel y su antepecho.
    x = s0
    for (a, b, c, d) in hs:
        if a > x + 1e-4:
            rect(M, mc, x, a, h0, h1, 0, "Muro", col)
        if c > h0 + 1e-4:
            rect(M, mc, a, b, h0, c, 0, "Muro", col)
        if d < h1 - 1e-4:
            rect(M, mc, a, b, d, h1, 0, "Muro", col)
        x = b
    if x < s1 - 1e-4:
        rect(M, mc, x, s1, h0, h1, 0, "Muro", col)


# ── Elementos de fachada ─────────────────────────────────────────────

def ventana(M, mc, s0, s1, h0, h1, col_muro, r, persiana=True, reja=False, recercado=None):
    prof = 0.16
    hueco(M, mc, s0, s1, h0, h1, prof, col_muro, CRISTAL)
    w = -prof + 0.02
    t = 0.06
    # Carpintería blanca: marco y parteluz.
    for (a, b, c, d) in [(s0, s0 + t, h0, h1), (s1 - t, s1, h0, h1), (s0, s1, h0, h0 + t), (s0, s1, h1 - t, h1)]:
        rect(M, mc, a, b, c, d, w, "Metal", BLANCO)
    m = (s0 + s1) / 2
    rect(M, mc, m - 0.025, m + 0.025, h0, h1, w, "Metal", BLANCO)
    if persiana:
        baj = r.choice([0.15, 0.3, 0.45, 0.6, 0.9])
        hb = h1 - (h1 - h0) * baj
        rect(M, mc, s0 + t, s1 - t, hb, h1 - t, w + 0.012, "Metal", PERSIANA)
    # Alféizar volado.
    caja(M, mc, s0 - 0.08, s1 + 0.08, h0 - 0.07, h0, 0, 0.09, "Muro", mezclar(col_muro, BLANCO, 0.6))
    if recercado:
        for (a, b, c, d) in [(s0 - 0.14, s0, h0, h1 + 0.14), (s1, s1 + 0.14, h0, h1 + 0.14), (s0 - 0.14, s1 + 0.14, h1, h1 + 0.14)]:
            caja(M, mc, a, b, c, d, 0, 0.04, "Muro", recercado)
    if reja:
        rejas(M, mc, s0 - 0.05, s1 + 0.05, h0, h1 + 0.05, 0.14)


def rejas(M, mc, s0, s1, h0, h1, w):
    # Barrotes como planos de frente (2 triángulos) y pletinas horizontales.
    n = max(2, round((s1 - s0) / 0.14))
    for k in range(n + 1):
        s = s0 + (s1 - s0) * k / n
        rect(M, mc, s - 0.014, s + 0.014, h0, h1, w, "Metal", HIERRO)
    for h in (h0 + 0.05, (h0 + h1) / 2, h1 - 0.03):
        caja(M, mc, s0, s1, h - 0.02, h + 0.02, w - 0.02, w + 0.01, "Metal", HIERRO)


def balcon(M, mc, s0, s1, h, vuelo, col_losa):
    """Balcón de forja: losa con canto y barandilla de barrotes en los tres lados."""
    caja(M, mc, s0, s1, h - 0.14, h, 0, vuelo, "Muro", col_losa)
    alto = 0.95
    n = max(3, round((s1 - s0) / 0.15))
    P = mc.p
    for k in range(n + 1):
        s = s0 + 0.04 + (s1 - s0 - 0.08) * k / n
        rect(M, mc, s - 0.013, s + 0.013, h, h + alto, vuelo - 0.05, "Metal", HIERRO)
    for lado, nrm in ((s0 + 0.04, -mc.u), (s1 - 0.04, mc.u)):
        for k in range(1, 5):
            w = (vuelo - 0.06) * k / 5
            M.poli([P(lado, h, w - 0.013), P(lado, h, w + 0.013), P(lado, h + alto, w + 0.013), P(lado, h + alto, w - 0.013)], "Metal", HIERRO, nrm)
        caja(M, mc, lado - 0.02, lado + 0.02, h + alto - 0.04, h + alto, 0, vuelo - 0.03, "Metal", HIERRO)
    caja(M, mc, s0 + 0.02, s1 - 0.02, h + alto - 0.04, h + alto, vuelo - 0.07, vuelo - 0.02, "Metal", HIERRO)
    caja(M, mc, s0 + 0.02, s1 - 0.02, h + 0.06, h + 0.09, vuelo - 0.07, vuelo - 0.02, "Metal", HIERRO)


def cierro(M, mc, s0, s1, h0, h1, vuelo):
    """Cierro linense: mirador acristalado blanco volado sobre una losa."""
    caja(M, mc, s0 - 0.08, s1 + 0.08, h0 - 0.18, h0, 0, vuelo + 0.08, "Muro", BLANCO)
    caja(M, mc, s0 - 0.1, s1 + 0.1, h1, h1 + 0.2, 0, vuelo + 0.1, "Muro", BLANCO)
    caja(M, mc, s0, s1, h0, h0 + 0.5, vuelo - 0.05, vuelo, "Muro", BLANCO)
    rect(M, mc, s0 + 0.03, s1 - 0.03, h0 + 0.5, h1, vuelo - 0.03, "Cristal", mezclar(CRISTAL, BLANCO, 0.25))
    P = mc.p
    for s, nrm in ((s0, -mc.u), (s1, mc.u)):
        M.poli([P(s, h0 + 0.5, 0), P(s, h0 + 0.5, vuelo), P(s, h1, vuelo), P(s, h1, 0)], "Cristal", mezclar(CRISTAL, BLANCO, 0.2), nrm)
    n = max(2, round((s1 - s0) / 0.45))
    for k in range(n + 1):
        s = s0 + (s1 - s0) * k / n
        caja(M, mc, s - 0.03, s + 0.03, h0 + 0.5, h1, vuelo - 0.04, vuelo + 0.01, "Metal", BLANCO)
    caja(M, mc, s0, s1, (h0 + h1) / 2 + 0.25, (h0 + h1) / 2 + 0.29, vuelo - 0.04, vuelo + 0.01, "Metal", BLANCO)


def aire_acondicionado(M, mc, s, h):
    caja(M, mc, s - 0.4, s + 0.4, h, h + 0.55, 0.05, 0.3, "Metal", color("#E7E7E2"))
    rect(M, mc, s - 0.3, s + 0.15, h + 0.08, h + 0.47, 0.305, "Metal", color("#9A9C9C"))
    caja(M, mc, s - 0.42, s + 0.42, h - 0.04, h, 0.0, 0.32, "Metal", ALUMINIO)


# ── Edificio ─────────────────────────────────────────────────────────

def a_blender(p, o):
    return (p[0] - o[0], -(p[1] - o[1]))


def area_firmada(poly):
    return sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))) / 2


def dentro(p, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > p[1]) != (yj > p[1]) and p[0] < (xj - xi) * (p[1] - yi) / ((yj - yi) or 1e-12) + xi:
            c = not c
        j = i
    return c


def simplificar(poly, caras):
    """Quita vértices casi alineados (conserva el tipo de cara del tramo resultante)."""
    pts = list(poly)
    tipos = list(caras)
    cambiado = True
    while cambiado and len(pts) > 3:
        cambiado = False
        for i in range(len(pts)):
            a, b, c = pts[i - 1], pts[i], pts[(i + 1) % len(pts)]
            ab = Vector((b[0] - a[0], b[1] - a[1]))
            bc = Vector((c[0] - b[0], c[1] - b[1]))
            if ab.length < 0.35 or (ab.length > 1e-6 and bc.length > 1e-6 and abs(ab.normalized().cross(bc.normalized())) < 0.03 and ab.dot(bc) > 0):
                # Fusiona el vértice b: el tramo (a, c) toma el tipo «más a la calle».
                ta, tb = tipos[i - 1], tipos[i]
                orden = {"calle": 0, "patio": 1, "medianera": 2}
                tipos[i - 1] = ta if orden.get(ta, 2) <= orden.get(tb, 2) else tb
                del pts[i]
                del tipos[i]
                cambiado = True
                break
    return pts, tipos


def punto_interior(poly):
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    if dentro((cx, cy), poly):
        return (cx, cy)
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    for k in range(400):
        q = (min(xs) + (max(xs) - min(xs)) * ((k * 0.618) % 1), min(ys) + (max(ys) - min(ys)) * ((k * 0.382) % 1))
        if dentro(q, poly):
            return q
    return (cx, cy)


def lejos_de_bordes(q, poly, d):
    for i in range(len(poly)):
        a = Vector(poly[i])
        b = Vector(poly[(i + 1) % len(poly)])
        ab = b - a
        t = max(0, min(1, (Vector(q) - a).dot(ab) / (ab.length_squared or 1)))
        if (Vector(q) - (a + ab * t)).length < d:
            return False
    return True


def construir(e, o, lod, r):
    """Devuelve la malla de un edificio en el nivel de detalle pedido."""
    M = Malla()
    huella = [a_blender(p, o) for p in e["huella"]]
    caras = list(e.get("caras") or ["calle"] * len(huella))
    caras += ["medianera"] * (len(huella) - len(caras))
    huella, caras = simplificar(huella, caras)
    # Orientación: la normal exterior de cada tramo es (u.y, −u.x) si el polígono gira en sentido horario.
    if area_firmada(huella) > 0:
        huella = list(reversed(huella))
        caras = list(reversed(caras[:-1])) + [caras[-1]] if caras else caras
        caras = [caras[(len(caras) - 2 - i) % len(caras)] for i in range(len(caras))] if False else caras
    patios = [[a_blender(p, o) for p in pt] for pt in (e.get("patios") or [])]

    H = float(e["alturaM"])
    n = max(1, int(e["plantas"]))
    pb = e.get("pb", "vivienda")
    tip = e.get("tipologia", "bloque")
    col = color(e.get("color") or "#F2EEE6")
    col_med = mezclar(col, color("#D8D2C6"), 0.5)
    h_pb = min(H, 3.6 if pb in ("comercio", "portal") and n > 1 else H / n)
    h_alta = (H - h_pb) / (n - 1) if n > 1 else 0
    pisos = [0.0] + [h_pb + k * h_alta for k in range(n - 1)]
    piedra = e.get("revestimiento") == "piedra_pb"
    zocalo = e.get("zocalo") or piedra

    for i in range(len(huella)):
        a, b = huella[i], huella[(i + 1) % len(huella)]
        mc = Marco(a, b)
        if mc.L < 0.05:
            continue
        tipo = caras[i] if i < len(caras) else "medianera"
        if lod == 1:
            rect(M, mc, 0, mc.L, 0, H, 0, "Muro", col if tipo == "calle" else col_med)
            if tipo == "calle" and mc.L > 2.2:
                nb = max(1, round((mc.L - 1.0) / 3.0))
                bw = (mc.L - 1.0) / nb
                for k in range(nb):
                    sc = 0.5 + bw * (k + 0.5)
                    for j, h0 in enumerate(pisos):
                        if j == 0 and pb == "comercio":
                            rect(M, mc, sc - bw / 2 + 0.3, sc + bw / 2 - 0.3, 0.2, 2.9, 0.02, "Cristal", CRISTAL_TIENDA)
                        else:
                            hh = h_pb if j == 0 else h_alta
                            rect(M, mc, sc - 0.6, sc + 0.6, h0 + hh * 0.3, h0 + hh * 0.3 + 1.45, 0.02, "Cristal", CRISTAL)
            continue
        if tipo != "calle" or mc.L < 2.2:
            # Medianera o patio: paño liso (con algún ventanuco al patio).
            huecos = []
            if tipo == "patio" and mc.L > 3:
                for j, h0 in enumerate(pisos[1:]):
                    sc = mc.L / 2
                    huecos.append((sc - 0.45, sc + 0.45, h0 + 1.0, h0 + 2.0))
            muro_con_huecos(M, mc, 0, mc.L, 0, H, huecos, col if tipo == "patio" else col_med)
            for hh in huecos:
                hueco(M, mc, *hh, 0.12, col, CRISTAL)
            continue
        fachada(M, mc, e, H, pisos, h_pb, h_alta, pb, tip, col, piedra, zocalo, r)

    # Cubierta: azotea con patios como huecos, pretil, casetón y depósito; tejaroz si «tejadillo».
    loops = [[Vector((p[0], p[1], H)) for p in huella]] + [[Vector((p[0], p[1], H)) for p in pt] for pt in patios]
    tris = tessellate_polygon(loops)
    todos = [v for lp in loops for v in lp]
    for t in tris:
        M.poli([todos[t[0]], todos[t[1]], todos[t[2]]], "Muro", GRIS_AZOTEA, (0, 0, 1))
    alto_pretil = 1.0 if n > 1 else 0.5
    for i in range(len(huella)):
        a, b = huella[i], huella[(i + 1) % len(huella)]
        mc = Marco(a, b)
        if mc.L < 0.05:
            continue
        if lod == 1:
            rect(M, mc, 0, mc.L, H, H + alto_pretil, 0, "Muro", col if caras[i] == "calle" else col_med)
            continue
        caja(M, mc, 0, mc.L, H, H + alto_pretil, -0.22, 0, "Muro", col if caras[i] == "calle" else col_med, sin_fondo=False)
        caja(M, mc, -0.04, mc.L + 0.04, H + alto_pretil, H + alto_pretil + 0.06, -0.26, 0.04, "Muro", mezclar(col, BLANCO, 0.5))
        if e.get("cubierta") == "tejadillo" and caras[i] == "calle" and mc.L > 1.5:
            P = mc.p
            M.poli([P(0, H + alto_pretil + 0.06, -0.3), P(mc.L, H + alto_pretil + 0.06, -0.3), P(mc.L, H - 0.15, 0.55), P(0, H - 0.15, 0.55)], "Teja", TEJA, (0, 0, 1))
            M.poli([P(0, H - 0.15, 0.55), P(mc.L, H - 0.15, 0.55), P(mc.L, H - 0.3, 0.55), P(0, H - 0.3, 0.55)], "Teja", mezclar(TEJA, (0, 0, 0), 0.3), mc.n)
    for pt in patios:
        for i in range(len(pt)):
            a, b = pt[i], pt[(i + 1) % len(pt)]
            mc = Marco(b, a)  # el patio se recorre al revés: sus muros miran hacia dentro del patio
            if mc.L < 0.05:
                continue
            rect(M, mc, 0, mc.L, 0, H + alto_pretil, 0, "Muro", mezclar(col, BLANCO, 0.3), -1)
    area = abs(area_firmada(huella))
    if lod == 0 and n > 1 and area > 45:
        q = punto_interior(huella)
        if lejos_de_bordes(q, huella, 2.0):
            mc = Marco((q[0] - 1.3, q[1]), (q[0] + 1.3, q[1]))
            caja(M, mc, 0, 2.6, H, H + 2.5, -1.3, 1.3, "Muro", mezclar(col, BLANCO, 0.4))
            rect(M, mc, 0.8, 1.7, H + 0.05, H + 2.1, 1.31, "Muro", MADERA)
            # Depósito de agua y antena.
            c = mc.p(3.6, H, 0)
            if dentro((c.x, c.y), huella) and lejos_de_bordes((c.x, c.y), huella, 0.9):
                cilindro(M, c, 0.55, H, H + 1.1, DEPOSITO)
            mast = mc.p(1.3, H + 2.5, 0)
            mt = Marco((mast.x - 0.03, mast.y), (mast.x + 0.03, mast.y))
            caja(M, mt, 0, 0.06, H + 2.5, H + 4.2, -0.03, 0.03, "Metal", ALUMINIO)
            caja(M, mt, -0.6, 0.66, H + 3.9, H + 3.94, -0.02, 0.02, "Metal", ALUMINIO)
    return M, H, alto_pretil


def cilindro(M, c, r, z0, z1, col, n=10):
    for k in range(n):
        a0 = 2 * math.pi * k / n
        a1 = 2 * math.pi * (k + 1) / n
        p0 = Vector((c.x + math.cos(a0) * r, c.y + math.sin(a0) * r, z0))
        p1 = Vector((c.x + math.cos(a1) * r, c.y + math.sin(a1) * r, z0))
        nm = Vector((math.cos((a0 + a1) / 2), math.sin((a0 + a1) / 2), 0))
        M.poli([p0, p1, Vector((p1.x, p1.y, z1)), Vector((p0.x, p0.y, z1))], "Metal", col, nm)
    M.poli([Vector((c.x + math.cos(2 * math.pi * k / n) * r, c.y + math.sin(2 * math.pi * k / n) * r, z1)) for k in range(n)], "Metal", mezclar(col, BLANCO, 0.15), (0, 0, 1))


def fachada(M, mc, e, H, pisos, h_pb, h_alta, pb, tip, col, piedra, zocalo, r):
    L = mc.L
    margen = 0.5
    nb = max(1, round((L - 2 * margen) / (3.2 if tip == "bloque" else 2.8)))
    bw = (L - 2 * margen) / nb
    centros = [margen + bw * (k + 0.5) for k in range(nb)]
    col_pb = PIEDRA if piedra else col
    # Planta baja.
    huecos_pb = []
    puerta = nb // 2 if pb in ("portal", "vivienda") else -1
    for k, sc in enumerate(centros):
        if pb == "comercio":
            huecos_pb.append((sc - bw / 2 + 0.3, sc + bw / 2 - 0.3, 0.15, min(h_pb - 0.6, 3.0)))
        elif k == puerta:
            huecos_pb.append((sc - 0.7, sc + 0.7, 0.0, min(h_pb - 0.3, 2.7)))
        else:
            huecos_pb.append((sc - 0.6, sc + 0.6, 0.9, min(h_pb - 0.5, 2.5)))
    muro_con_huecos(M, mc, 0, L, 0, h_pb, huecos_pb, col_pb)
    for k, (a, b, c, d) in enumerate(huecos_pb):
        if pb == "comercio":
            hueco(M, mc, a, b, c, d, 0.25, col_pb, CRISTAL_TIENDA)
            for s in (a + 0.05, b - 0.05, (a + b) / 2):
                caja(M, mc, s - 0.03, s + 0.03, c, d, -0.24, -0.2, "Metal", ALUMINIO)
            # Cajón de la persiana metálica y rótulo del comercio sobre el escaparate.
            caja(M, mc, a, b, d, d + 0.28, -0.05, 0.12, "Metal", ALUMINIO)
            caja(M, mc, a + 0.2, b - 0.2, d + 0.32, min(h_pb - 0.05, d + 0.85), 0, 0.06, "Metal", r.choice(ROTULOS))
            if r.random() < 0.45:
                tl = r.choice(TOLDOS)
                P = mc.p
                M.poli([P(a, d + 0.3, 0.12), P(b, d + 0.3, 0.12), P(b, d - 0.25, 1.15), P(a, d - 0.25, 1.15)], "Teja", tl, (0, 0, 1))
                M.poli([P(a, d + 0.3, 0.1), P(b, d + 0.3, 0.1), P(b, d - 0.25, 1.13), P(a, d - 0.25, 1.13)], "Teja", mezclar(tl, (0, 0, 0), 0.4), (0, 0, -1))
                rect(M, mc, a, b, d - 0.55, d - 0.25, 1.15, "Teja", tl)
        elif k == puerta:
            hueco(M, mc, a, b, c, d, 0.3, col_pb, MADERA, "Muro")
            caja(M, mc, a - 0.12, b + 0.12, d, d + 0.14, 0, 0.06, "Muro", mezclar(col_pb, BLANCO, 0.6))
            if pb == "portal":
                rect(M, mc, a + 0.15, b - 0.15, d - 0.75, d - 0.15, -0.29, "Cristal", CRISTAL)
        else:
            ventana(M, mc, a, b, c, d, col_pb, r, persiana=False, reja=True)
    if zocalo and not piedra:
        caja(M, mc, -0.02, L + 0.02, 0, 0.8, 0, 0.05, "Muro", PIEDRA)
    if piedra:
        caja(M, mc, -0.02, L + 0.02, h_pb - 0.2, h_pb, 0, 0.12, "Muro", mezclar(PIEDRA, BLANCO, 0.3))
    # Plantas altas.
    balconeras = tip in ("burguesa", "comercial")
    for j in range(1, len(pisos)):
        h0 = pisos[j]
        h1 = h0 + h_alta
        huecos = []
        for k, sc in enumerate(centros):
            w = 1.15 if balconeras else (1.25 if tip == "bloque" else 1.1)
            if balconeras:
                huecos.append((sc - w / 2, sc + w / 2, h0 + 0.05, min(h1 - 0.45, h0 + 2.35)))
            else:
                huecos.append((sc - w / 2, sc + w / 2, h0 + 0.95, min(h1 - 0.4, h0 + 2.45)))
        muro_con_huecos(M, mc, 0, L, h0, h1, huecos, col)
        for k, (a, b, c, d) in enumerate(huecos):
            cierro_aqui = tip == "medianeras" and j == 1 and k == len(centros) // 2 and len(pisos) > 1
            ventana(M, mc, a, b, c, d, col, r, persiana=True, recercado=mezclar(col, BLANCO, 0.55) if tip in ("burguesa", "comercial") else None)
            if cierro_aqui:
                cierro(M, mc, a - 0.25, b + 0.25, c + 0.9 if not balconeras else c, d, 0.55)
            elif balconeras:
                balcon(M, mc, a - 0.25, b + 0.25, c, 0.55, mezclar(col, BLANCO, 0.5))
            elif tip == "bloque" and (k + j) % 2 == 0 and len(centros) > 1:
                balcon(M, mc, a - 0.3, b + 0.3, h0 + 0.1, 0.8, mezclar(col, BLANCO, 0.4))
            if r.random() < 0.18 and not cierro_aqui:
                aire_acondicionado(M, mc, b + 0.65 if b + 1.1 < L else a - 0.65, c + 0.2)
        # Imposta entre plantas.
        caja(M, mc, -0.02, L + 0.02, h0 - 0.12, h0 + 0.02, 0, 0.07, "Muro", mezclar(col, BLANCO, 0.45))
    caja(M, mc, -0.05, L + 0.05, H - 0.3, H, 0, 0.18, "Muro", mezclar(col, BLANCO, 0.5))


# ── Escena, validación, exportación ──────────────────────────────────

def materiales():
    res = []
    props = {"Muro": (0.92, 0.0), "Cristal": (0.18, 0.35), "Metal": (0.45, 0.55), "Teja": (0.85, 0.0)}
    for nombre in MATS:
        m = bpy.data.materials.new(nombre)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        ca = nt.nodes.new("ShaderNodeVertexColor")
        ca.layer_name = "Col"
        nt.links.new(ca.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = props[nombre][0]
        bsdf.inputs["Metallic"].default_value = props[nombre][1]
        res.append(m)
    return res


def validar(e, ob, H, pretil):
    me = ob.data
    zs = [v.co.z for v in me.vertices]
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    problemas = []
    alto = max(zs)
    if min(zs) < -0.05:
        problemas.append(f"geometría bajo el suelo ({min(zs):.2f} m)")
    if alto > H + pretil + 4.5:
        problemas.append(f"demasiado alto ({alto:.1f} m para {H} m)")
    if alto < H:
        problemas.append(f"más bajo que su altura ({alto:.1f} < {H})")
    if any(math.isnan(z) for z in zs):
        problemas.append("NaN")
    dx = max(xs) - min(xs)
    dy = max(ys) - min(ys)
    hx = [p[0] for p in e["huella"]]
    hy = [p[1] for p in e["huella"]]
    if dx > (max(hx) - min(hx)) + 3.5 or dy > (max(hy) - min(hy)) + 3.5:
        problemas.append(f"vuela demasiado fuera de la huella ({dx:.1f}×{dy:.1f})")
    return {"triangulos": sum(len(p.vertices) - 2 for p in me.polygons), "alto": round(alto, 2), "problemas": problemas}


def camara(nombre, pos, mira, lente=28):
    cam = bpy.data.cameras.new(nombre)
    cam.lens = lente
    cam.clip_end = 2000
    ob = bpy.data.objects.new(nombre, cam)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = pos
    d = Vector(mira) - Vector(pos)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return ob


def renderizar(lote, vistas, ocultar_lod):
    s = bpy.context.scene
    s.render.engine = "BLENDER_WORKBENCH"
    s.display.shading.light = "STUDIO"
    s.display.shading.color_type = "VERTEX"
    s.display.shading.show_shadows = True
    s.display.shading.show_cavity = True
    s.display.shading.cavity_type = "WORLD"
    s.display.shading.show_object_outline = False
    s.render.resolution_x = 1100
    s.render.resolution_y = 760
    s.render.film_transparent = False
    s.world = s.world or bpy.data.worlds.new("Mundo")
    s.world.color = (0.62, 0.74, 0.86)
    for ob in s.objects:
        if ob.type == "MESH":
            ob.hide_render = ob.get("lod") == ocultar_lod
    salidas = []
    for nombre, pos, mira, lente in vistas:
        cam = camara(f"Cam_{nombre}", pos, mira, lente)
        s.camera = cam
        f = ruta("city-reconstruction", "blender", "render", f"{lote}-{nombre}.png")
        s.render.filepath = f
        bpy.ops.render.render(write_still=True)
        salidas.append(os.path.relpath(f, RAIZ))
    return salidas


def suelo(o, lote_json, coleccion):
    """Plano de referencia (solo para el render de validación; no se exporta)."""
    me = bpy.data.meshes.new("SueloValidacion")
    me.from_pydata([(-160, -160, -0.01), (160, -160, -0.01), (160, 160, -0.01), (-160, 160, -0.01)], [], [(0, 1, 2, 3)])
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    for d in attr.data:
        d.color = (0.42, 0.42, 0.40, 1)
    ob = bpy.data.objects.new("SueloValidacion", me)
    coleccion.objects.link(ob)
    return ob


def main(lote):
    t0 = time.time()
    datos = json.load(open(ruta("city-reconstruction", "blender", "lotes", f"{lote}.json")))
    o = datos["origen"]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materiales()
    col = bpy.data.collections.new(lote)
    bpy.context.scene.collection.children.link(col)
    raiz = bpy.data.objects.new(lote, None)
    col.objects.link(raiz)
    raiz["origen"] = o
    raiz["generador"] = VERSION_GENERADOR
    informe = {"lote": lote, "origen": o, "generador": VERSION_GENERADOR, "edificios": []}
    for e in datos["edificios"]:
        r = random.Random(e["id"])
        fila = {"id": e["id"], "plantas": e["plantas"], "alturaM": e["alturaM"], "tipologia": e["tipologia"], "fuente_plantas": e["fuentes"]["plantas"]}
        for lod in (0, 1):
            M, H, pretil = construir(e, o, lod, r)
            ob = M.objeto(f"{e['id']}__LOD{lod}", mats, col)
            ob.parent = raiz
            ob["edificio_id"] = e["id"]
            ob["lod"] = lod
            ob["osm"] = e.get("osm") or ""
            fila[f"lod{lod}"] = validar(e, ob, H, pretil)
        informe["edificios"].append(fila)
        print(f"  {e['id']}: LOD0 {fila['lod0']['triangulos']} tri · LOD1 {fila['lod1']['triangulos']} tri {fila['lod0']['problemas'] or ''}")
    # Guardar el .blend original y exportar el GLB (sin el suelo de validación).
    bpy.context.preferences.filepaths.save_version = 0  # sin copias .blend1
    bpy.ops.wm.save_as_mainfile(filepath=ruta("city-reconstruction", "blender", "blend", f"{lote}.blend"), compress=True)
    glb = ruta("public", "modelos", "manzanas", f"{lote}.glb")
    for ob in bpy.context.scene.objects:
        ob.select_set(ob.type in ("MESH", "EMPTY"))
    crudo = ruta("city-reconstruction", "blender", "blend", f"{lote}.crudo.glb")
    bpy.ops.export_scene.gltf(filepath=crudo, export_format="GLB", use_selection=True, export_extras=True, export_yup=True, export_apply=False, export_vertex_color="MATERIAL")
    # Optimización local y libre: cuantización + compresión meshopt (three.js la decodifica).
    import subprocess
    subprocess.run(["npx", "--no-install", "gltf-transform", "optimize", crudo, glb, "--compress", "meshopt", "--texture-compress", "false",
                    "--simplify", "false", "--join", "false", "--instance", "false", "--flatten", "false", "--prune", "false"], cwd=RAIZ, check=True, capture_output=True)
    os.remove(crudo)
    # Validación visual: vista aérea, a pie de calle y el nivel lejano.
    suelo(o, datos, col)
    xs = [p[0] - o[0] for e in datos["edificios"] for p in e["huella"]]
    ys = [-(p[1] - o[1]) for e in datos["edificios"] for p in e["huella"]]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    ext = max(max(xs) - min(xs), max(ys) - min(ys))
    vistas = [
        ("aerea", (cx + ext * 0.8, cy - ext * 0.9, ext * 0.75), (cx, cy, 4), 30),
        ("aerea2", (cx - ext * 0.85, cy + ext * 0.7, ext * 0.6), (cx, cy, 4), 30),
    ]
    # A pie de calle: frente a la fachada más larga a calle del lote.
    mejor = None
    for e in datos["edificios"]:
        h = [a_blender(p, o) for p in e["huella"]]
        for i, t in enumerate(e.get("caras") or []):
            if t != "calle" or i >= len(h):
                continue
            a, b = h[i], h[(i + 1) % len(h)]
            L = math.dist(a, b)
            if not mejor or L > mejor[0]:
                mejor = (L, a, b, h)
    if mejor:
        L, a, b, h = mejor
        m = Vector(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0))
        u = Vector((b[0] - a[0], b[1] - a[1], 0)).normalized()
        nn = Vector((u.y, -u.x, 0))
        if dentro((m.x + nn.x, m.y + nn.y), h):
            nn = -nn
        vistas.append(("calle", tuple(m + nn * 9 + u * 10 + Vector((0, 0, 1.7))), tuple(m - u * 6 + Vector((0, 0, 6))), 22))
    informe["render_lod0"] = renderizar(lote, vistas, ocultar_lod=1)
    informe["render_lod1"] = renderizar(lote, [("lejos", (cx + ext * 2.2, cy - ext * 2.2, ext * 1.6), (cx, cy, 4), 30)], ocultar_lod=0)
    informe["glb"] = os.path.relpath(glb, RAIZ)
    informe["glb_kb"] = round(os.path.getsize(glb) / 1024)
    informe["segundos"] = round(time.time() - t0, 1)
    informe["problemas"] = sum(len(f["lod0"]["problemas"]) + len(f["lod1"]["problemas"]) for f in informe["edificios"])
    json.dump(informe, open(ruta("city-reconstruction", "blender", "informes", f"{lote}.json"), "w"), ensure_ascii=False, indent=1)
    # Registro de edificios completados e índice para el juego.
    reg_f = ruta("city-reconstruction", "blender", "registro.json")
    reg = json.load(open(reg_f)) if os.path.exists(reg_f) else {"edificios": {}}
    for f in informe["edificios"]:
        reg["edificios"][f["id"]] = {"lote": lote, "generador": VERSION_GENERADOR, "fecha": time.strftime("%Y-%m-%d"), "triangulos_lod0": f["lod0"]["triangulos"], "problemas": f["lod0"]["problemas"]}
    json.dump(reg, open(reg_f, "w"), ensure_ascii=False, indent=1)
    idx_f = ruta("src", "datos", "modelos", "indice.json")
    idx = json.load(open(idx_f)) if os.path.exists(idx_f) else {"lotes": {}}
    idx["lotes"][lote] = {"glb": f"modelos/manzanas/{lote}.glb", "origen": o, "edificios": [e["id"] for e in datos["edificios"]], "generador": VERSION_GENERADOR}
    json.dump(idx, open(idx_f, "w"), ensure_ascii=False, indent=1)
    print(f"{lote}: {len(datos['edificios'])} edificios · GLB {informe['glb_kb']} KB · {informe['problemas']} problemas · {informe['segundos']} s")


if __name__ == "__main__":
    main(sys.argv[-1])
