"""
Generador paramétrico de edificios singulares en Blender (iglesias, ermitas, casas de hermandad,
equipamientos, residencias, teatro, estación, mercado, palacio, villas, búnkeres y pabellón).

Uso:  /opt/blender-venv/bin/python scripts/blender/singulares/singular.py [id ...]
Lee   city-reconstruction/blender/singulares/lista.json   (scripts/blender/singulares/lista.py)
Crea  por edificio: city-reconstruction/blender/blend/singulares/<id>.blend (editable),
      public/modelos/singulares/<id>.glb, un render de validación y su entrada en el índice.

Qué es comprobado y qué no (se guarda en el informe de cada edificio):
  · comprobado  huella y caras (OpenStreetMap), nombre, plantas del Catastro cuando las hay.
  · inferido    alturas sin dato oficial, colores, ritmo de huecos, cubierta y elementos propios del
                tipo (campanario y portada en iglesias, espadaña en ermitas, marquesina en la
                estación, bóveda en el pabellón…). No hay fotos consultables de estos edificios en
                este entorno: son aproximaciones por tipo, a sustituir cuando haya referencias.
"""
import json
import math
import os
import sys
import time

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B  # noqa: E402
import texturas as T  # noqa: E402

PB, PLANTA = 3.6, 3.2

# Parámetros por tipo (todo inferido salvo lo que diga el catálogo).
TIPOS = {
    "iglesia":      dict(muro="#F4EFE3", recerco="#D6A13F", zocalo="#9A8F7E", estilo="trad", paso=4.0, vent=(1.1, 2.2), cubierta="dos_aguas", alto=11.0),
    "ermita":       dict(muro="#F6F2E8", recerco="#D6A13F", zocalo="#9A8F7E", estilo="trad", paso=3.0, vent=(0.7, 1.0), cubierta="dos_aguas", alto=4.2),
    "hermandad":    dict(muro="#F6F1E6", recerco="#C9973A", zocalo="#8E8577", estilo="trad", paso=2.8, vent=(1.0, 1.5), cubierta="plana", max_plantas=3),
    "equipamiento": dict(muro="#ECE5D5", recerco="#7B7F84", zocalo="#9C978C", estilo="moderno", paso=3.0, vent=(1.6, 1.6), cubierta="plana", max_plantas=4),
    "residencia":   dict(muro="#F1E8D8", recerco="#A9643F", zocalo="#9C978C", estilo="moderno", paso=3.2, vent=(1.4, 1.5), cubierta="plana"),
    "teatro":       dict(muro="#E6DAC6", recerco="#6F6A62", zocalo="#8B857B", estilo="moderno", paso=6.0, vent=(1.2, 2.4), cubierta="plana", alto=12.0),
    "estacion":     dict(muro="#E3E2DD", recerco="#4D6E8F", zocalo="#8B8B86", estilo="moderno", paso=4.0, vent=(2.4, 2.2), cubierta="plana", alto=7.0),
    "mercado":      dict(muro="#F0E1BF", recerco="#9A6B3C", zocalo="#8B857B", estilo="trad", paso=4.0, vent=(2.0, 2.4), cubierta="plana", alto=8.0),
    "palacio":      dict(muro="#EBD6A6", recerco="#F6F2EA", zocalo="#9A8F7E", estilo="trad", paso=3.6, vent=(1.3, 2.0), cubierta="plana", max_plantas=3),
    "villa":        dict(muro="#F1DAB7", recerco="#FBF8F2", zocalo="#9A8F7E", estilo="trad", paso=2.8, vent=(1.0, 1.7), cubierta="cuatro_aguas", max_plantas=2),
    "bunker":       dict(muro="#A8A398", recerco="#8F8A80", zocalo="#8F8A80", estilo="bunker", paso=3.0, vent=(0.9, 0.18), cubierta="plana", alto=2.1),
    "pabellon":     dict(muro="#F2F3F1", recerco="#2C6FB7", zocalo="#2C6FB7", estilo="pabellon", paso=5.0, vent=(3.0, 1.2), cubierta="boveda", alto=10.5),
}


# ── Geometría auxiliar ───────────────────────────────────────────────

def limpiar(h, caras):
    """Quita vértices repetidos o casi alineados (la huella de OSM trae ruido)."""
    pts, cs = list(h), list(caras)
    cambio = True
    while cambio and len(pts) > 3:
        cambio = False
        for i in range(len(pts)):
            a, b, c = pts[i - 1], pts[i], pts[(i + 1) % len(pts)]
            ab, bc = math.dist(a, b), math.dist(b, c)
            cr = abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]))
            if ab < 0.25 or cr / max(ab * bc, 1e-9) < 0.03:
                pts.pop(i)
                cs.pop(i)  # la cara a→b desaparece; queda la b→c (renumerada) que ahora empieza en a
                cambio = True
                break
    return pts, cs


def rectangulo(h):
    """Rectángulo orientado mínimo: centro, eje largo u, semilargo a, semiancho b y relleno."""
    P = sorted(set(map(tuple, h)))
    cruz = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])  # noqa: E731
    lo, hi = [], []
    for p in P:
        while len(lo) >= 2 and cruz(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(hi) >= 2 and cruz(hi[-2], hi[-1], p) <= 0:
            hi.pop()
        hi.append(p)
    hull = lo[:-1] + hi[:-1]
    mejor = None
    for i in range(len(hull)):
        a, b = hull[i], hull[(i + 1) % len(hull)]
        L = math.dist(a, b) or 1
        u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
        v = (-u[1], u[0])
        su = [p[0] * u[0] + p[1] * u[1] for p in hull]
        sv = [p[0] * v[0] + p[1] * v[1] for p in hull]
        ar = (max(su) - min(su)) * (max(sv) - min(sv))
        if not mejor or ar < mejor[0]:
            mejor = (ar, u, v, su, sv)
    ar, u, v, su, sv = mejor
    a, b = (max(su) - min(su)) / 2, (max(sv) - min(sv)) / 2
    cu, cv = (max(su) + min(su)) / 2, (max(sv) + min(sv)) / 2
    c = (u[0] * cu + v[0] * cv, u[1] * cu + v[1] * cv)
    if b > a:
        u, v, a, b = v, (-v[1], v[0]), b, a
    return c, u, (-u[1], u[0]), a, b, abs(B.area(h)) / max(ar, 1e-6)


def dentro(p, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        if (poly[i][1] > p[1]) != (poly[j][1] > p[1]) and p[0] < (poly[j][0] - poly[i][0]) * (p[1] - poly[i][1]) / ((poly[j][1] - poly[i][1]) or 1e-12) + poly[i][0]:
            c = not c
        j = i
    return c


class Cara:
    def __init__(self, a, b, poly):
        self.a, self.b = a, b
        dx, dy = b[0] - a[0], b[1] - a[1]
        self.L = math.hypot(dx, dy)
        self.u = (dx / self.L, dy / self.L)
        n = (self.u[1], -self.u[0])
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        if dentro((m[0] + n[0] * 0.3, m[1] + n[1] * 0.3), poly):
            n = (-n[0], -n[1])
        self.n = n
        self.m = m

    def p(self, s, w=0.0):
        return (self.a[0] + self.u[0] * s + self.n[0] * w, self.a[1] + self.u[1] * s + self.n[1] * w)

    def fuera(self):
        return (self.m[0] + self.n[0] * 5, self.m[1] + self.n[1] * 5)


def muro_huecos(P, c, z0, z1, huecos, mat="Muro", fondo="Vidrio", prof=0.2):
    hs = sorted(huecos)
    x = 0.0
    f = c.fuera()
    n3 = (c.u[0], c.u[1], 0)
    for (s0, s1, h0, h1, mf) in hs:
        if s0 > x + 1e-3:
            P.muro(c.p(x), c.p(s0), z0, z1, mat, f)
        if h0 > z0 + 1e-3:
            P.muro(c.p(s0), c.p(s1), z0, h0, mat, f)
        if h1 < z1 - 1e-3:
            P.muro(c.p(s0), c.p(s1), h1, z1, mat, f)
        q = c.p
        P.poli([(*q(s0), h0), (*q(s0, -prof), h0), (*q(s0, -prof), h1), (*q(s0), h1)], mat, n3)
        P.poli([(*q(s1), h0), (*q(s1, -prof), h0), (*q(s1, -prof), h1), (*q(s1), h1)], mat, (-n3[0], -n3[1], 0))
        P.poli([(*q(s0), h1), (*q(s1), h1), (*q(s1, -prof), h1), (*q(s0, -prof), h1)], mat, (0, 0, -1))
        if h0 > z0 + 1e-3:
            P.poli([(*q(s0), h0), (*q(s1), h0), (*q(s1, -prof), h0), (*q(s0, -prof), h0)], mat, (0, 0, 1))
        P.muro(q(s0, -prof), q(s1, -prof), h0, h1, mf or fondo, f)
        x = s1
    if x < c.L - 1e-3:
        P.muro(c.p(x), c.p(c.L), z0, z1, mat, f)


def franja(P, c, z0, z1, vuelo, mat):
    """Moldura, cornisa o zócalo corrido sobre una cara."""
    a, b = c.p(-vuelo * 0.5, vuelo), c.p(c.L + vuelo * 0.5, vuelo)
    a0, b0 = c.p(-vuelo * 0.5, 0), c.p(c.L + vuelo * 0.5, 0)
    P.muro(a, b, z0, z1, mat, c.fuera())
    P.poli([(*a0, z1), (*b0, z1), (*b, z1), (*a, z1)], mat, (0, 0, 1))
    P.poli([(*a0, z0), (*b0, z0), (*b, z0), (*a, z0)], mat, (0, 0, -1))


def recerco(P, c, s0, s1, h0, h1, mat, g=0.12, w=0.05):
    for (a, b, z0, z1) in ((s0 - g, s0, h0 - g, h1 + g), (s1, s1 + g, h0 - g, h1 + g), (s0, s1, h1, h1 + g), (s0 - g * 1.5, s1 + g * 1.5, h0 - g, h0)):
        p0, p1 = c.p(a, w), c.p(b, w)
        P.muro(p0, p1, z0, z1, mat, c.fuera())
        q0, q1 = c.p(a, 0), c.p(b, 0)
        P.poli([(*q0, z1), (*q1, z1), (*p1, z1), (*p0, z1)], mat, (0, 0, 1))


def altura_piso(k):
    return 0.0 if k == 0 else PB + (k - 1) * PLANTA


# ── Construcción ─────────────────────────────────────────────────────

def construir(e, M):
    t = TIPOS[e["arquetipo"]]
    arq = e["arquetipo"]
    huella, caras = limpiar(e["huella"], e["caras"])
    pl_cat = e.get("plantas_catastro")
    if arq in ("iglesia", "ermita", "teatro", "estacion", "mercado", "bunker", "pabellon"):
        H = t["alto"] if not (pl_cat and arq in ("teatro", "estacion", "mercado")) else max(t["alto"], altura_piso(pl_cat))
        plantas = max(1, round((H - PB) / PLANTA) + 1) if arq not in ("bunker",) else 1
        fuente_h = "por tipo (inferida)" if not pl_cat or arq in ("iglesia", "ermita", "bunker", "pabellon") else "Catastro"
    else:
        plantas = pl_cat or min(e["plantas_estimadas"], t.get("max_plantas", 9))
        H = altura_piso(plantas)
        fuente_h = "Catastro" if pl_cat else "estimada y limitada por tipo (inferida)"
    c0, u, v, a, b, relleno = rectangulo(huella)
    P = {n: B.Pieza(f"{e['id']}_{n}", ORIG, M) for n in ("muros", "huecos", "molduras", "cubierta", "remates")}
    caras_o = [Cara(huella[i], huella[(i + 1) % len(huella)], huella) for i in range(len(huella))]
    calles = [i for i, cc in enumerate(caras_o) if i < len(caras) and caras[i] == "calle" and cc.L >= 2.5]
    principal = max(calles or range(len(caras_o)), key=lambda i: caras_o[i].L)
    ancho_v, alto_v = t["vent"]
    sobre = 0.0 if t["cubierta"] in ("dos_aguas", "cuatro_aguas", "boveda") else (0.9 if arq != "bunker" else 0.2)
    for i, c in enumerate(caras_o):
        tipo = caras[i] if i < len(caras) else "calle"
        huecos = []
        if c.L >= 1.6 and tipo != "medianera":
            paso = t["paso"] if tipo == "calle" else t["paso"] * 1.3
            n = max(1, int((c.L - 0.8) / paso))
            w = min(ancho_v, c.L / n - 0.6) if tipo == "calle" else min(0.9, c.L / n - 0.6)
            if w >= 0.4:
                for k in range(n):
                    s = (k + 0.5) * c.L / n
                    puerta = i == principal and k == n // 2
                    for piso in range(plantas):
                        z = altura_piso(piso)
                        zt = H if piso == plantas - 1 else altura_piso(piso + 1)
                        if arq == "bunker":
                            huecos.append((s - w / 2, s + w / 2, 1.1, 1.1 + alto_v, "Negro"))
                            continue
                        if arq in ("iglesia", "teatro", "pabellon", "mercado", "estacion") and piso > 0:
                            continue
                        if puerta and piso == 0:
                            ap = 2.6 if arq == "iglesia" else (3.2 if arq in ("hermandad", "estacion", "mercado", "pabellon") else 1.8)
                            hp = min(4.2 if arq == "iglesia" else 3.0, H - 0.5)
                            huecos.append((s - ap / 2, s + ap / 2, 0.0, hp, "Madera" if t["estilo"] == "trad" else "Vidrio"))
                            continue
                        if arq in ("iglesia",):
                            h0, h1 = 4.2, min(H - 1.2, 4.2 + alto_v)
                        elif arq == "pabellon":
                            h0, h1 = H - 2.6, H - 2.6 + alto_v
                        elif arq in ("teatro", "estacion", "mercado"):
                            h0, h1 = 1.0, min(H - 1.0, 1.0 + alto_v)
                        else:
                            h0 = z + (0.9 if piso else 1.0)
                            h1 = min(zt - 0.5, h0 + (alto_v if tipo == "calle" else 1.1))
                        if h1 - h0 > 0.15:
                            huecos.append((s - w / 2, s + w / 2, h0, h1, None))
                huecos = [hh for hh in huecos if hh[0] > 0.3 and hh[1] < c.L - 0.3]
        muro_huecos(P["muros"], c, 0, H + sobre, huecos, prof=0.22 if t["estilo"] != "bunker" else 0.35)
        if t["estilo"] == "trad" and tipo != "medianera":
            for (s0, s1, h0, h1, _) in huecos:
                recerco(P["molduras"], c, s0, s1, h0, h1, "Recerco")
            for piso in range(1, plantas):
                if arq not in ("iglesia",):
                    franja(P["molduras"], c, altura_piso(piso) - 0.12, altura_piso(piso) + 0.08, 0.08, "Recerco")
            franja(P["molduras"], c, H - 0.35 + sobre, H + sobre, 0.22, "Recerco")
        if tipo != "medianera" and arq not in ("bunker",):
            franja(P["molduras"], c, 0, 0.7 if t["estilo"] == "trad" else 0.45, 0.04, "Zocalo")
        if arq == "pabellon":
            franja(P["molduras"], c, H - 3.2, H - 2.6, 0.03, "Recerco")
            franja(P["molduras"], c, H - 1.2, H + sobre, 0.03, "Recerco")
        if t["estilo"] == "moderno" and tipo == "calle":
            for piso in range(1, plantas):
                franja(P["molduras"], c, altura_piso(piso) - 0.1, altura_piso(piso) + 0.15, 0.05, "Recerco")
        # Balcones de forja en la planta principal (hermandad, villa, palacio).
        if arq in ("hermandad", "villa", "palacio") and tipo == "calle" and plantas > 1:
            for (s0, s1, h0, h1, mf) in huecos:
                if abs(h0 - (altura_piso(1) + 0.9)) < 0.05:
                    zb = altura_piso(1)
                    P["remates"].caja(c.p((s0 + s1) / 2, 0.4), math.atan2(c.u[1], c.u[0]), s1 - s0 + 0.6, 0.8, zb - 0.12, zb, "Recerco")
                    for ss in (s0 - 0.25, s1 + 0.25):
                        P["remates"].tubo((*c.p(ss, 0.75), zb), (*c.p(ss, 0.75), zb + 1.0), 0.02, "Negro", n=4)
                    P["remates"].tubo((*c.p(s0 - 0.25, 0.75), zb + 1.0), (*c.p(s1 + 0.25, 0.75), zb + 1.0), 0.025, "Negro", n=4)
                    P["remates"].tubo((*c.p(s0 - 0.25, 0.75), zb + 0.1), (*c.p(s1 + 0.25, 0.75), zb + 0.1), 0.02, "Negro", n=4)
                    for k in range(int((s1 - s0 + 0.5) / 0.14)):
                        ss = s0 - 0.25 + k * 0.14
                        P["remates"].tubo((*c.p(ss, 0.75), zb + 0.1), (*c.p(ss, 0.75), zb + 1.0), 0.008, "Negro", n=3)
    cub = cubierta(P, e, t, huella, H, sobre, c0, u, v, a, b, relleno)
    extras(P, e, t, arq, huella, caras_o, principal, H, c0, u, v, a, b, relleno)
    return P, {"plantas": plantas, "altura_m": round(H, 2), "fuente_altura": fuente_h, "cubierta": cub, "relleno_rectangulo": round(relleno, 2)}


def cubierta(P, e, t, huella, H, sobre, c0, u, v, a, b, relleno):
    tipo = t["cubierta"]
    if tipo != "plana" and relleno < 0.8:
        tipo = "plana"  # huella irregular: azotea (la cubierta inclinada no casaría)
    pt = lambda su, sv: (c0[0] + u[0] * su + v[0] * sv, c0[1] + u[1] * su + v[1] * sv)  # noqa: E731
    R = P["cubierta"]
    if tipo == "plana":
        if sobre < 0.5:
            sobre_ = max(sobre, 0.0)
        R.tapa(huella, H, "Grava" if e["arquetipo"] != "bunker" else "Muro")
        if sobre > 0:
            for i in range(len(huella)):
                c = Cara(huella[i], huella[(i + 1) % len(huella)], huella)
                if c.L < 0.3:
                    continue
                R.muro(c.p(0, -0.25), c.p(c.L, -0.25), H, H + sobre, "Muro", c.p(c.L / 2, -3))
                R.poli([(*c.p(0), H + sobre), (*c.p(c.L), H + sobre), (*c.p(c.L, -0.25), H + sobre), (*c.p(0, -0.25), H + sobre)], "Recerco", (0, 0, 1))
        return "azotea"
    al, aa = a + 0.35, b + 0.35  # alero
    if tipo == "dos_aguas":
        hc = H + b * 0.45
        for s in (-1, 1):
            R.poli([(*pt(-al, s * aa), H - 0.1), (*pt(al, s * aa), H - 0.1), (*pt(al, 0), hc), (*pt(-al, 0), hc)], "Teja", (0, 0, 1))
            R.poli([(*pt(s * a, -b), H), (*pt(s * a, b), H), (*pt(s * a, 0), hc)], "Muro", (u[0] * s, u[1] * s, 0))
        return "dos aguas (inferida)"
    if tipo == "cuatro_aguas":
        hc = H + b * 0.55
        r0, r1 = pt(-(a - b), 0), pt(a - b, 0)
        for s in (-1, 1):
            R.poli([(*pt(-al, s * aa), H - 0.1), (*pt(al, s * aa), H - 0.1), (*(r1 if s else r0), hc), (*r0, hc)] if False else
                   [(*pt(-al, s * aa), H - 0.1), (*pt(al, s * aa), H - 0.1), (*r1, hc), (*r0, hc)], "Teja", (0, 0, 1))
            R.poli([(*pt(s * al, -aa), H - 0.1), (*pt(s * al, aa), H - 0.1), (*(r1 if s > 0 else r0), hc)], "Teja", (0, 0, 1))
        return "cuatro aguas (inferida)"
    # Bóveda de chapa a lo largo del eje largo.
    n = 12
    sube = min(5.0, b * 0.35)
    perf = [(-b + 2 * b * k / n, H + sube * (1 - ((-b + 2 * b * k / n) / b) ** 2)) for k in range(n + 1)]
    for k in range(n):
        (v0, z0), (v1, z1) = perf[k], perf[k + 1]
        R.poli([(*pt(-a - 0.3, v0), z0), (*pt(a + 0.3, v0), z0), (*pt(a + 0.3, v1), z1), (*pt(-a - 0.3, v1), z1)], "Chapa", (0, 0, 1))
    for s in (-1, 1):
        R.poli([(*pt(s * a, vv), zz) for vv, zz in perf], "Muro", (u[0] * s, u[1] * s, 0))
    return "bóveda de chapa (inferida)"


def extras(P, e, t, arq, huella, caras_o, principal, H, c0, u, v, a, b, relleno):
    R = P["remates"]
    cp = caras_o[principal]
    rumbo = math.atan2(cp.u[1], cp.u[0])
    if arq == "iglesia":
        # Campanario en la esquina de la fachada principal (inferido) con cruz.
        lado = max(3.2, min(4.6, b * 0.6))
        for s in (lado / 2 + 0.3, cp.L - lado / 2 - 0.3):
            q = cp.p(s, -lado / 2 - 0.05)
            if dentro(q, huella):
                break
        tz = H + 8.0
        torre = [cp.p(s - lado / 2, 0.0), cp.p(s + lado / 2, 0.0), cp.p(s + lado / 2, -lado), cp.p(s - lado / 2, -lado)]
        for i in range(4):
            c = Cara(torre[i], torre[(i + 1) % 4], torre)
            muro_huecos(R, c, 0, tz, [(lado / 2 - 0.6, lado / 2 + 0.6, tz - 3.4, tz - 1.0, "Negro")], prof=0.3)
            franja(R, c, tz - 0.35, tz, 0.2, "Recerco")
            franja(R, c, tz - 4.0, tz - 3.75, 0.12, "Recerco")
        cen = cp.p(s, -lado / 2)
        R.cilindro(cen, lado * 0.62, tz, tz + 2.6, "Teja", n=4, r1=0.05)
        R.caja(cen, rumbo, 0.12, 0.12, tz + 2.5, tz + 4.3, "Hierro")
        R.caja((cen[0], cen[1]), rumbo, 0.9, 0.12, tz + 3.55, tz + 3.7, "Hierro")
        # Campana.
        R.cilindro(cen, 0.45, tz - 3.0, tz - 2.1, "Bronce", n=10, r1=0.2)
        # Rosetón sobre la puerta y recerco de la portada.
        m = cp.L / 2
        ros = [(*cp.p(m + math.cos(2 * math.pi * k / 16) * 0.9, 0.04), 6.6 + math.sin(2 * math.pi * k / 16) * 0.9) for k in range(16)]
        R.poli(ros, "Recerco", (cp.n[0], cp.n[1], 0))
        R.poli([(x + cp.n[0] * 0.02, y + cp.n[1] * 0.02, z) for x, y, z in [(*cp.p(m + math.cos(2 * math.pi * k / 16) * 0.7, 0.04), 6.6 + math.sin(2 * math.pi * k / 16) * 0.7) for k in range(16)]], "Vidrio", (cp.n[0], cp.n[1], 0))
        for (s0, s1, z0, z1) in ((m - 1.75, m - 1.35, 0, 5.0), (m + 1.35, m + 1.75, 0, 5.0), (m - 1.75, m + 1.75, 4.6, 5.0)):
            R.caja(cp.p((s0 + s1) / 2, 0.12), rumbo, s1 - s0, 0.24, z0, z1, "Recerco")
    elif arq == "ermita":
        # Espadaña sobre la fachada con campana y cruz.
        m = cp.L / 2
        z0 = H + b * 0.45
        R.caja(cp.p(m, -0.15), rumbo, 1.6, 0.3, H, z0 + 1.8, "Muro")
        R.cilindro(cp.p(m, -0.15), 0.22, z0 + 0.3, z0 + 0.8, "Bronce", n=8, r1=0.1)
        R.caja(cp.p(m, -0.15), rumbo, 0.08, 0.08, z0 + 1.8, z0 + 2.6, "Hierro")
        R.caja(cp.p(m, -0.15), rumbo, 0.5, 0.08, z0 + 2.25, z0 + 2.35, "Hierro")
    elif arq == "estacion":
        # Marquesina corrida en la fachada principal sobre pilares.
        z = 3.6
        q0, q1 = cp.p(0.0, 0), cp.p(cp.L, 0)
        r0, r1 = cp.p(0.0, 4.0), cp.p(cp.L, 4.0)
        R.poli([(*q0, z + 0.25), (*q1, z + 0.25), (*r1, z + 0.25), (*r0, z + 0.25)], "Recerco", (0, 0, 1))
        R.poli([(*q0, z), (*q1, z), (*r1, z), (*r0, z)], "Recerco", (0, 0, -1))
        R.muro(r0, r1, z, z + 0.25, "Recerco", cp.p(cp.L / 2, 9))
        k = 0.0
        while k <= cp.L:
            R.cilindro(cp.p(k, 3.7), 0.14, 0, z, "Hierro", n=8)
            k += 5.0
    elif arq == "teatro":
        # Caja escénica más alta en el fondo y marquesina de acceso.
        pt = lambda su, sv: (c0[0] + u[0] * su + v[0] * sv, c0[1] + u[1] * su + v[1] * sv)  # noqa: E731
        lejos = -1 if math.dist(pt(a, 0), cp.m) < math.dist(pt(-a, 0), cp.m) else 1
        caja = [pt(lejos * a * 0.15, -b * 0.75), pt(lejos * a * 0.85, -b * 0.75), pt(lejos * a * 0.85, b * 0.75), pt(lejos * a * 0.15, b * 0.75)]
        if all(dentro(p, huella) for p in caja):
            R.prisma(caja, H, H + 5.0, "Muro", "Grava")
        m = cp.L / 2
        R.caja(cp.p(m, 1.2), rumbo, min(cp.L - 1, 8.0), 2.4, 3.6, 3.85, "Recerco", base=True)
    elif arq == "mercado":
        # Linterna central acristalada para la luz cenital.
        pt = lambda su, sv: (c0[0] + u[0] * su + v[0] * sv, c0[1] + u[1] * su + v[1] * sv)  # noqa: E731
        lin = [pt(-a * 0.6, -b * 0.3), pt(a * 0.6, -b * 0.3), pt(a * 0.6, b * 0.3), pt(-a * 0.6, b * 0.3)]
        if all(dentro(p, huella) for p in lin):
            R.prisma(lin, H + 0.9, H + 2.3, "Vidrio", "Chapa")
            R.prisma(lin, H + 2.3, H + 2.45, "Recerco")
    elif arq == "palacio":
        # Escalinata ante la puerta principal (el catálogo cita «escalinata y fachada»).
        m = cp.L / 2
        for k in range(5):
            R.caja(cp.p(m, 0.4 + (4 - k) * 0.4), rumbo, 7.0, 0.42, 0, 0.18 * (k + 1), "Piedra")
    elif arq in ("equipamiento", "residencia", "hermandad"):
        # Marquesina o dintel sobre la puerta principal.
        m = cp.L / 2
        R.caja(cp.p(m, 0.6), rumbo, 3.4 if arq != "hermandad" else 3.8, 1.2, 3.05, 3.25, "Recerco", base=True)


def materiales(e, carpeta=None):
    t = TIPOS[e["arquetipo"]]
    M = B.Materiales({})
    sem = abs(hash(e["id"])) % 1000
    if e["arquetipo"] == "bunker":
        M.nuevo("Muro", textura=T.hormigon(carpeta, semilla=sem, n=256, nombre="T_muro"), rugosidad=0.95, metros=3.0)
    else:
        M.nuevo("Muro", textura=T.estuco(carpeta, base=t["muro"], semilla=sem, n=256, nombre="T_muro"), rugosidad=0.9, metros=3.0)
    M.nuevo("Recerco", t["recerco"], rugosidad=0.7)
    M.nuevo("Zocalo", t["zocalo"], rugosidad=0.85)
    M.nuevo("Vidrio", "#4A6178", rugosidad=0.08, metal=0.7)
    M.nuevo("Madera", "#4A2E1C", rugosidad=0.6)
    M.nuevo("Negro", "#1B1D20", rugosidad=0.7)
    M.nuevo("Hierro", "#24272B", rugosidad=0.5, metal=0.6)
    M.nuevo("Bronce", "#8C6A2E", rugosidad=0.4, metal=0.8)
    M.nuevo("Piedra", "#CFC6B4", rugosidad=0.9)
    M.nuevo("Grava", textura=T.grava(carpeta, n=128), rugosidad=0.95, metros=2.0)
    M.nuevo("Teja", textura=T.teja(carpeta), rugosidad=0.8, metros=2.0)
    M.nuevo("Chapa", textura=T.chapa(carpeta), rugosidad=0.45, metal=0.5, metros=2.0)
    return M


def lod1(e, H, M):
    P = B.Pieza(f"{e['id']}_lejos", ORIG, M)
    P.prisma(limpiar(e["huella"], e["caras"])[0], 0, H, "Muro", "Grava")
    return P


ORIG = (0, 0)


def generar(e):
    global ORIG
    t0 = time.time()
    xs = [p[0] for p in e["huella"]]
    ys = [p[1] for p in e["huella"]]
    ORIG = (round((min(xs) + max(xs)) / 2), round((min(ys) + max(ys)) / 2))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = materiales(e)
    col = bpy.data.collections.new(e["id"])
    bpy.context.scene.collection.children.link(col)
    raiz = B.vacio(e["id"], col, {"origen": list(ORIG), "nombre": e["nombre"], "arquetipo": e["arquetipo"]})
    v0 = B.vacio(f"{e['id']}__LOD0", col, {"edificio_id": e["id"], "lod": 0})
    v0.parent = raiz
    P, datos = construir(e, M)
    obs = [p.objeto(col, v0) for p in P.values() if p.f]
    v1 = B.vacio(f"{e['id']}__LOD1", col, {"edificio_id": e["id"], "lod": 1})
    v1.parent = raiz
    lod1(e, datos["altura_m"], M).objeto(col, v1)
    tri = 0
    for ob in obs:
        ob.data.calc_loop_triangles()
        tri += len(ob.data.loop_triangles)
    slug = e["id"]
    rel = f"modelos/singulares/{slug}.glb"
    blend, glb = B.exportar(slug, rel)
    # Render de validación (vista a pie de calle frente a la fachada principal).
    huella, caras = limpiar(e["huella"], e["caras"])
    co = [Cara(huella[i], huella[(i + 1) % len(huella)], huella) for i in range(len(huella))]
    cp = max(co, key=lambda c: c.L)
    d = max(18.0, cp.L * 1.1 + datos["altura_m"])
    cam = (*cp.p(cp.L / 2 + d * 0.35, d), 1.7 + datos["altura_m"] * 0.25)
    obj = (*cp.p(cp.L / 2, -2), datos["altura_m"] * 0.45)
    suelo = B.Pieza("Suelo", ORIG, M)
    suelo.poli([(ORIG[0] - 150, ORIG[1] - 150, -0.02), (ORIG[0] + 150, ORIG[1] - 150, -0.02), (ORIG[0] + 150, ORIG[1] + 150, -0.02), (ORIG[0] - 150, ORIG[1] + 150, -0.02)], "Piedra", (0, 0, 1))
    suelo.objeto(col)["solo_validacion"] = True
    render = B.renderizar(slug, [("calle", cam, obj, 26)], ORIG, ocultar=lambda o: o.parent is not None and o.parent.get("lod") == 1,
                          ancho=720, alto=520, color="MATERIAL")
    informe = {"lote": f"S-{slug}", "edificio": slug, "nombre": e["nombre"], "arquetipo": e["arquetipo"], "categoria": e["categoria"], "origen": list(ORIG),
               "generador": "scripts/blender/singulares/singular.py", **datos, "triangulos_lod0": tri, "problemas": [],
               "certeza": {"comprobado": ["huella y caras (OpenStreetMap)", "nombre"] + (["plantas (Catastro)"] if e.get("plantas_catastro") else []),
                           "inferido": ["colores, huecos, cubierta y elementos del tipo «%s»" % e["arquetipo"]] + ([] if e.get("plantas_catastro") else ["plantas"])},
               "blend": blend, "glb": rel, "glb_kb": round(os.path.getsize(glb) / 1024), "render": render, "segundos": round(time.time() - t0, 1)}
    B.registrar(f"S-{slug}", rel, ORIG, [slug], informe)
    print(f"{slug} {e['nombre']}: {e['arquetipo']} · {datos['plantas']} pl · {datos['altura_m']} m ({datos['fuente_altura']}) · {datos['cubierta']} · {tri} tri · {informe['glb_kb']} KB")
    return informe


def main(ids):
    lista = json.load(open(B.ruta("city-reconstruction", "blender", "singulares", "lista.json")))
    for e in lista:
        if ids and e["id"] not in ids:
            continue
        generar(e)


if __name__ == "__main__":
    main([a for a in sys.argv[1:] if a.startswith("B-")])
