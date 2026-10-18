"""
Ayuntamiento de La Línea de la Concepción (Plaza Juan José García Cabreros) y su entorno,
modelado directamente en Blender.

Uso:  /opt/blender-venv/bin/python scripts/blender/singulares/ayuntamiento.py
Crea  city-reconstruction/blender/blend/singulares/ayuntamiento.blend  (original editable)
      public/modelos/singulares/ayuntamiento.glb                      (para el juego)
      city-reconstruction/blender/render/singulares/ayuntamiento-*.png (validación)
      city-reconstruction/blender/informes/AYUNTAMIENTO.json
y añade el lote AYUNTAMIENTO a src/datos/modelos/indice.json (el juego deja de dibujar el
edificio procedural B-w257431100; su huella sigue sirviendo de colisión).

Fuentes (ver city-reconstruction/reports/AYUNTAMIENTO.md):
  · comprobado  huella de OpenStreetMap (w257431100): frente curvo de 18,8 m de radio que mira al
                suroeste y cuerpo macizo al este; fotografías del usuario (2026-10): muro cortina
                curvo de dos plantas con perfilería negra, planta baja porticada con columnas
                cilíndricas, cornisa crema, cuerpo lateral crema con visera y columna exenta,
                mástiles con banderas, césped con bordillo de ladrillo, rampa con barandilla,
                adoquín rojizo, farolas de globo, maceteros negros, valla granate, muro de piedra.
  · inferido    alturas (PB 4,4 m; muro cortina 5,0–12,2 m; cornisa hasta 13,7 m) a partir de las
                fotos; número de montantes; posición exacta de puertas, farolas y mobiliario;
                trasera (no aparece en las fotos).
  · desconocido Catastro no da plantas útiles para esta parcela (la parte principal figura con 0).
"""
import math
import os
import sys
import time

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B  # noqa: E402
import texturas as T  # noqa: E402

ID = "B-w257431100"
LOTE = "AYUNTAMIENTO"
GLB = "modelos/singulares/ayuntamiento.glb"

# ── Geometría de partida (OSM, coordenadas del juego) ────────────────
C = (2277.2271, 4528.2984)      # centro del frente curvo (ajuste por mínimos cuadrados a la huella)
R = 18.84                       # radio exterior (borde de la cornisa)
ORIGEN = (2277.0, 4528.0)
V5, V6, V7, V8 = (2261.78, 4516.02), (2273.4, 4523.75), (2277.38, 4526.11), (2279.33, 4523.2)
V9, V10, V11, V12, V13 = (2287.0, 4528.42), (2291.44, 4531.04), (2287.83, 4536.41), (2292.43, 4539.25), (2286.12, 4544.62)
A0 = math.degrees(math.atan2(V13[1] - C[1], V13[0] - C[0]))   # arranque del arco junto al cuerpo lateral (≈61°)
A1 = math.degrees(math.atan2(V5[1] - C[1], V5[0] - C[0])) % 360  # extremo oeste (≈218°)

# ── Alturas (inferidas de las fotos) ─────────────────────────────────
Z_PB = 4.4          # canto inferior del vuelo
Z_V0 = 5.0          # arranque del muro cortina
Z_B1 = (8.3, 8.9)   # banda negra entre plantas
Z_V1 = 12.2         # fin del muro cortina
Z_CUB = 12.9        # azotea
Z_TOP = 13.7        # remate de la cornisa
Z_TORRE = 13.9
RG = R - 0.42       # plano del vidrio
RI = R - 5.5        # muro de planta baja (fondo del porche)
RC = RG - 0.75      # eje de las columnas


def pt(r, a, z=None):
    p = (C[0] + r * math.cos(math.radians(a)), C[1] + r * math.sin(math.radians(a)))
    return p if z is None else (*p, z)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def corte_radio(p, q, r):
    """Punto del segmento p→q a distancia r del centro."""
    lo, hi = 0.0, 1.0
    dentro = math.dist(p, C) < r
    for _ in range(50):
        m = (lo + hi) / 2
        if (math.dist(lerp(p, q, m), C) < r) == dentro:
            lo = m
        else:
            hi = m
    return lerp(p, q, lo)


def angulo(p):
    return math.degrees(math.atan2(p[1] - C[1], p[0] - C[0])) % 360


PT = corte_radio(V8, V13, RI)   # donde el muro de planta baja toca el cuerpo lateral
AG0 = angulo(PT)
N_VANOS = 32                    # montantes del muro cortina (≈1,55 m)


def materiales():
    carpeta = B.ruta("city-reconstruction", "blender", "texturas", "x")[:-2]
    M = B.Materiales(dict(T.METROS))
    M.nuevo("Estuco", textura=T.estuco(carpeta), rugosidad=0.9, metros=T.METROS["estuco"])
    M.nuevo("Hormigon", textura=T.hormigon(carpeta), rugosidad=0.9, metros=T.METROS["hormigon"])
    M.nuevo("Adoquin", textura=T.adoquin(carpeta), rugosidad=0.85, metros=T.METROS["adoquin"])
    M.nuevo("Losa", textura=T.losa(carpeta), rugosidad=0.85, metros=T.METROS["losa"])
    M.nuevo("Impreso", textura=T.impreso(carpeta), rugosidad=0.8, metros=T.METROS["impreso"])
    M.nuevo("Cesped", textura=T.cesped(carpeta), rugosidad=0.95, metros=T.METROS["cesped"])
    M.nuevo("Ladrillo", textura=T.ladrillo(carpeta), rugosidad=0.9, metros=T.METROS["ladrillo"])
    M.nuevo("Ostionera", textura=T.ostionera(carpeta), rugosidad=0.95, metros=T.METROS["ostionera"])
    M.nuevo("Grava", textura=T.grava(carpeta), rugosidad=0.95, metros=T.METROS["grava"])
    M.nuevo("Vidrio", "#8FAFD0", rugosidad=0.05, metal=0.7)
    M.nuevo("Perfil", "#15181C", rugosidad=0.35, metal=0.6)
    M.nuevo("Puerta", "#1C2228", rugosidad=0.2, metal=0.5)
    M.nuevo("Forja", "#1A1C1F", rugosidad=0.5, metal=0.5)
    M.nuevo("Granate", "#5B2A24", rugosidad=0.55, metal=0.4)
    M.nuevo("Acero", "#A9AEB2", rugosidad=0.35, metal=0.8)
    M.nuevo("Globo", "#F4F1E6", rugosidad=0.3, emisivo=("#FFE7B0", 0.6))
    M.nuevo("Hoja", "#3F7A2E", rugosidad=0.85)
    M.nuevo("Tronco", "#5A4636", rugosidad=0.9)
    M.nuevo("Roca", "#CFCBC0", rugosidad=0.95)
    M.nuevo("Tela", rugosidad=0.85, vertice=True)
    M.nuevo("Letras", "#3A3A3A", rugosidad=0.4, metal=0.6)
    M.nuevo("Rotulo", "#1F4FB8", rugosidad=0.4)
    M.nuevo("Alarma", "#C0262D", rugosidad=0.4)
    M.nuevo("Blanco", "#F4F4F0", rugosidad=0.5)
    return M


# ── Edificio, LOD0 ───────────────────────────────────────────────────

def poligono_superior(r=R):
    return B.arco(C, r, A0, A1, 64) + [V6, V7, V8]


def muro_cortina(P):
    """Vidrio facetado, montantes, travesaños y bandas negras."""
    angs = [A0 + (A1 - A0) * k / N_VANOS for k in range(N_VANOS + 1)]
    for k in range(N_VANOS):
        a, b = pt(RG, angs[k]), pt(RG, angs[k + 1])
        fuera = pt(RG + 5, (angs[k] + angs[k + 1]) / 2)
        for z0, z1 in ((Z_V0, Z_B1[0]), (Z_B1[1], Z_V1)):
            P["vidrio"].muro(a, b, z0, z1, "Vidrio", fuera)
        # Bandas negras (canto del forjado y antepechos), algo por delante del vidrio.
        a2, b2 = pt(RG + 0.06, angs[k]), pt(RG + 0.06, angs[k + 1])
        for z0, z1 in ((Z_PB, Z_V0), Z_B1, (Z_V1 - 0.12, Z_V1)):
            P["perfil"].muro(a2, b2, z0, z1, "Perfil", fuera)
        # Travesaños: dos por planta.
        a3, b3 = pt(RG + 0.05, angs[k]), pt(RG + 0.05, angs[k + 1])
        for zt in (6.1, 7.2, 10.0, 11.1):
            P["perfil"].muro(a3, b3, zt - 0.04, zt + 0.04, "Perfil", fuera)
            P["perfil"].poli([(*a3, zt + 0.04), (*b3, zt + 0.04), (*b, zt + 0.04), (*a, zt + 0.04)], "Perfil", (0, 0, 1))
    for a in angs:
        u = math.radians(a + 90)
        P["perfil"].caja(pt(RG + 0.05, a), u, 0.08, 0.12, Z_V0, Z_V1, "Perfil")
    # Canto inferior del vuelo (sofito de hormigón) y su cara inferior.
    B.sector(P["estructura"], C, RI, RG + 0.06, AG0, A1, Z_PB, "Hormigon", 48)
    for f in P["estructura"].f[-48:]:
        pass
    # La cara del sofito debe mirar hacia abajo: se rehace orientada.
    P["estructura"].f = P["estructura"].f[:-48]
    A = B.arco(C, RI, AG0, A1, 48)
    Bq = B.arco(C, RG + 0.06, AG0, A1, 48)
    for k in range(48):
        P["estructura"].poli([(*A[k], Z_PB), (*A[k + 1], Z_PB), (*Bq[k + 1], Z_PB), (*Bq[k], Z_PB)], "Hormigon", (0, 0, -1))
    # Tramo del sofito junto al cuerpo lateral (entre el arranque del arco y el muro de planta baja).
    P["estructura"].poli([(*V13, Z_PB), (*PT, Z_PB), (*pt(RG + 0.06, AG0), Z_PB), (*pt(RG + 0.06, A0), Z_PB)], "Hormigon", (0, 0, -1))


def cornisa(P):
    n = 64
    A = B.arco(C, R, A0, A1, n)
    G = B.arco(C, RG, A0, A1, n)
    I = B.arco(C, R - 0.35, A0, A1, n)
    for k in range(n):
        f = pt(R + 5, A0 + (A1 - A0) * (k + 0.5) / n)
        P["cornisa"].muro(A[k], A[k + 1], Z_V1, Z_TOP, "Estuco", f)
        P["cornisa"].poli([(*G[k], Z_V1), (*G[k + 1], Z_V1), (*A[k + 1], Z_V1), (*A[k], Z_V1)], "Estuco", (0, 0, -1))
        P["cornisa"].poli([(*I[k], Z_TOP), (*I[k + 1], Z_TOP), (*A[k + 1], Z_TOP), (*A[k], Z_TOP)], "Estuco", (0, 0, 1))
        P["cornisa"].muro(I[k], I[k + 1], Z_CUB, Z_TOP, "Estuco", C)
    # Azotea de grava.
    P["cubierta"].tapa(poligono_superior(R - 0.3), Z_CUB, "Grava")


def traseras(P):
    """Fachadas traseras y extremo oeste (no salen en las fotos: crema lisa con huecos regulares)."""
    a1 = pt(R, A1)
    lados = [(a1, V6), (V6, V7), (V7, V8)]
    for a, b in lados:
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        # Hacia fuera = lejos del centro del arco.
        nrm = (dy / L, -dx / L)
        if math.dist((m[0] + nrm[0], m[1] + nrm[1]), C) < math.dist(m, C):
            nrm = (-nrm[0], -nrm[1])
        fuera = (m[0] + nrm[0] * 5, m[1] + nrm[1] * 5)
        huecos = []
        if L > 4:
            nv = int(L // 3.2)
            for i in range(nv):
                s = (i + 0.5) * L / nv
                for z0 in (5.6, 9.4):
                    huecos.append((s - 0.6, s + 0.6, z0, z0 + 1.5))
        muro_huecos(P["fachada"], a, b, 0, Z_TOP, huecos, fuera, nrm)


def muro_huecos(P, a, b, z0, z1, huecos, fuera, nrm, prof=0.18):
    """Paño de estuco con huecos rehundidos (vidrio oscuro al fondo)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    u = (dx / L, dy / L)
    q = lambda s, w=0.0: (a[0] + u[0] * s + nrm[0] * w, a[1] + u[1] * s + nrm[1] * w)  # noqa: E731
    xs = sorted(huecos)
    x = 0.0
    for (s0, s1, h0, h1) in xs:
        if s0 > x:
            P.muro(q(x), q(s0), z0, z1, "Estuco", fuera)
        P.muro(q(s0), q(s1), z0, h0, "Estuco", fuera)
        P.muro(q(s0), q(s1), h1, z1, "Estuco", fuera)
        # Mochetas, dintel, alféizar y vidrio.
        P.poli([(*q(s0), h0), (*q(s0, -prof), h0), (*q(s0, -prof), h1), (*q(s0), h1)], "Estuco", (u[0], u[1], 0))
        P.poli([(*q(s1), h0), (*q(s1, -prof), h0), (*q(s1, -prof), h1), (*q(s1), h1)], "Estuco", (-u[0], -u[1], 0))
        P.poli([(*q(s0), h1), (*q(s1), h1), (*q(s1, -prof), h1), (*q(s0, -prof), h1)], "Estuco", (0, 0, -1))
        P.poli([(*q(s0), h0), (*q(s1), h0), (*q(s1, -prof), h0), (*q(s0, -prof), h0)], "Estuco", (0, 0, 1))
        P.muro(q(s0, -prof), q(s1, -prof), h0, h1, "Vidrio", fuera)
        x = s1
    if x < L:
        P.muro(q(x), q(L), z0, z1, "Estuco", fuera)


def cuerpo_lateral(P):
    """Cuerpo macizo crema del este: ventanas estrechas, visera superior y columna exenta."""
    poly = [V8, V9, V10, V11, V12, V13]
    c = (sum(p[0] for p in poly) / 6, sum(p[1] for p in poly) / 6)
    ventanas = {1: [(0.33,), (0.72,)], 2: [(0.5,)], 0: [(0.5,)]}  # por cara: posiciones relativas
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]
        if (a, b) == (V13, V8):
            # Cara hacia el interior del cuerpo curvo: solo se ve bajo el porche (planta baja).
            m = ((PT[0] + V13[0]) / 2, (PT[1] + V13[1]) / 2)
            P["fachada"].muro(V13, PT, 0, Z_PB, "Estuco", (m[0] - (c[0] - m[0]), m[1] - (c[1] - m[1])))
            continue
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        nrm = (dy / L, -dx / L)
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        if math.dist((m[0] + nrm[0], m[1] + nrm[1]), c) < math.dist(m, c):
            nrm = (-nrm[0], -nrm[1])
        fuera = (m[0] + nrm[0] * 5, m[1] + nrm[1] * 5)
        huecos = []
        for (t,) in ventanas.get(i, []):
            s = t * L
            for z0, h in ((1.0, 1.5), (5.3, 1.5), (8.7, 1.5), (11.3, 1.2)):
                huecos.append((s - 0.45, s + 0.45, z0, z0 + h))
        muro_huecos(P["fachada"], a, b, 0, Z_TORRE, huecos, fuera, nrm)
    P["cubierta"].tapa(poly, Z_TORRE, "Grava")
    # Pretil del cuerpo lateral.
    P["cubierta"].prisma(poly, Z_TORRE, Z_TORRE + 0.05, "Estuco", tapa=False)
    # Frente (V12→V13): visera en lo alto y columna exenta con su losa a media altura.
    dx, dy = V12[0] - V13[0], V12[1] - V13[1]
    L = math.hypot(dx, dy)
    u = (dx / L, dy / L)
    n = (dy / L, -dx / L)
    m = ((V12[0] + V13[0]) / 2, (V12[1] + V13[1]) / 2)
    if math.dist((m[0] + n[0], m[1] + n[1]), c) < math.dist(m, c):
        n = (-n[0], -n[1])
    q = lambda s, w: (V13[0] + u[0] * s + n[0] * w, V13[1] + u[1] * s + n[1] * w)  # noqa: E731
    rumbo = math.atan2(u[1], u[0])
    P["estructura"].caja(q(2.3, 0.85), rumbo, 4.6, 1.7, Z_TORRE - 0.9, Z_TORRE + 0.1, "Estuco", base=True)
    P["estructura"].cilindro(q(1.0, 2.4), 0.26, 0, 10.4, "Estuco", n=14)
    P["estructura"].caja(q(1.0, 1.25), rumbo, 1.5, 2.5, 10.4, 10.8, "Estuco", base=True)
    # Caja de alarma roja.
    P["detalle"].caja(q(5.6, 0.05), rumbo, 0.35, 0.12, 6.3, 6.75, "Alarma")


def planta_baja(P):
    """Fondo del porche, puertas, rótulo, columnas."""
    n = 46
    A = B.arco(C, RI, AG0, A1, n)
    for k in range(n):
        P["planta_baja"].muro(A[k], A[k + 1], 0, Z_PB, "Estuco", pt(RI + 5, AG0 + (A1 - AG0) * (k + 0.5) / n))
    # Cierre del extremo oeste del porche.
    P["planta_baja"].muro(pt(RI, A1), pt(RG, A1), 0, Z_PB, "Estuco", pt(R, A1 + 10))
    # Puertas: acceso principal acristalado (cuadrícula negra) y puerta oscura con el rótulo a su lado.
    for (a, ancho, alto, tipo) in ((150, 2.6, 3.0, "vidrio"), (121.4, 2.0, 2.9, "oscura")):
        da = math.degrees(ancho / RI) / 2
        p0, p1 = pt(RI + 0.04, a + da), pt(RI + 0.04, a - da)
        fuera = pt(RI + 5, a)
        P["detalle"].muro(p0, p1, 0, alto, "Puerta", fuera)
        rumbo = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
        for s in ([0, 0.5, 1] if tipo == "vidrio" else [0, 1]):
            P["detalle"].caja(lerp(pt(RI + 0.07, a + da), pt(RI + 0.07, a - da), s), rumbo, 0.09, 0.08, 0, alto, "Perfil")
        for z in ([alto, 1.05, 2.1] if tipo == "vidrio" else [alto]):
            P["detalle"].caja(pt(RI + 0.07, a), rumbo, ancho + 0.09, 0.08, z - 0.05, z + 0.05, "Perfil")
    # Placa azul de aparcamiento («P»).
    a = 134.6
    P["detalle"].caja(pt(RI + 0.03, a), math.radians(a + 90), 0.55, 0.04, 2.15, 2.7, "Rotulo")
    # Columnas cilíndricas.
    angs = []
    a = AG0 + 5
    while a < A1 - 3:
        angs.append(a)
        a += 13.2
    for a in angs:
        P["columnas"].cilindro(pt(RC, a), 0.3, 0, Z_PB, "Estuco", n=14, tapa=False)
    return angs


def letras(col, padre, mats):
    """Rótulo «EXCMO. AYUNTAMIENTO DE LA LÍNEA DE LA CONCEPCIÓN» y la «P»."""
    out = []
    for (txt, z, a, alto) in (("EXCMO. AYUNTAMIENTO DE LA LÍNEA", 2.55, 108.2, 0.17), ("DE LA CONCEPCIÓN", 2.29, 108.2, 0.17)):
        p = pt(RI + 0.13, a)
        rumbo = math.radians(a - 90)  # se lee de izquierda a derecha mirando el muro desde fuera
        out.append(B.texto(f"Rotulo_{len(out)}", txt, p, rumbo, alto, mats.m["Letras"], col, padre, ORIGEN, z))
    p = pt(RI + 0.07, 134.6)
    out.append(B.texto("Rotulo_P", "P", (p[0], p[1]), math.radians(134.6 - 90), 0.42, mats.m["Blanco"], col, padre, ORIGEN, 2.22, prof=0.02))
    return out


# ── Edificio, LOD1 (lejos) ───────────────────────────────────────────

def lod1(P):
    G = B.arco(C, RI, AG0, A1, 24) + [pt(RG, A1), V6, V7, V8, PT]
    P.prisma(G, 0, Z_PB, "Estuco")
    U = B.arco(C, R, A0, A1, 24)
    n = len(U) - 1
    for k in range(n):
        f = pt(R + 5, A0 + (A1 - A0) * (k + 0.5) / n)
        P.muro(U[k], U[k + 1], Z_PB, Z_V1, "Vidrio", f)
        P.muro(U[k], U[k + 1], Z_V1, Z_TOP, "Estuco", f)
        P.poli([(*V8, Z_PB), (*U[k + 1], Z_PB), (*U[k], Z_PB)], "Hormigon", (0, 0, -1))
    for a, b in ((U[-1], V6), (V6, V7), (V7, V8)):
        P.muro(a, b, Z_PB, Z_TOP, "Estuco", (2 * a[0] - C[0], 2 * a[1] - C[1]))
    P.tapa(U + [V6, V7, V8], Z_TOP, "Grava")
    P.prisma([V8, V9, V10, V11, V12, V13], 0, Z_TORRE, "Estuco", "Grava")


# ── Entorno ──────────────────────────────────────────────────────────

R_APRON = R + 4.0      # fin del adoquín rojizo
R_CESPED = R + 15.0
A_RAMPA = (111.0, 121.0)
A_CESPED = (122.0, 212.0)


def suelo(P):
    z = 0.035
    # Adoquín rojizo bajo el porche y delante del frente.
    B.sector(P["adoquin"], C, RI, R_APRON, AG0, A1, z, "Adoquin", 60)
    P["adoquin"].poli([(*V13, z), (*PT, z), (*pt(RI, AG0), z)], "Adoquin", (0, 0, 1))
    P["adoquin"].poli([(*V13, z), (*pt(RI, AG0), z), (*pt(R_APRON, AG0), z), (*pt(R_APRON, A0), z)], "Adoquin", (0, 0, 1))
    # Explanada este (mástiles) en adoquín, delante del cuerpo lateral.
    este = [V13, V12, V11, V10, (2299.0, 4531.5), (2300.5, 4545.0), (2291.5, 4552.0), pt(R_APRON, A0)]
    P["adoquin"].tapa(este, z, "Adoquin")
    # Losas grises a la derecha de la rampa.
    B.sector(P["losas"], C, R_APRON, R_CESPED - 1, A0, A_RAMPA[0], z, "Losa", 24)
    # Rampa de hormigón impreso.
    B.sector(P["rampa"], C, R_APRON, R_CESPED + 2, A_RAMPA[0], A_RAMPA[1], z + 0.01, "Impreso", 6)
    # Franja de adoquín delante del parterre (paso) y al otro lado del césped.
    B.sector(P["adoquin"], C, R_APRON, R_CESPED + 2, A_RAMPA[1], A_CESPED[0], z, "Adoquin", 2)
    B.sector(P["adoquin"], C, R_APRON, R_CESPED, A_CESPED[1], A1 + 4, z, "Adoquin", 4)


def parterre(P):
    """Césped elevado con bordillo de ladrillo: alto junto al porche, enrasado hacia la avenida."""
    a0, a1 = A_CESPED
    n = 40
    radios = [R_APRON + 0.35 + (R_CESPED - R_APRON - 0.35) * k / 6 for k in range(7)]
    alt = lambda r: 0.5 - 0.42 * ((r - radios[0]) / (radios[-1] - radios[0])) ** 1.4  # noqa: E731
    for j in range(6):
        A = B.arco(C, radios[j], a0, a1, n)
        Bq = B.arco(C, radios[j + 1], a0, a1, n)
        for k in range(n):
            P["cesped"].poli([(*A[k], alt(radios[j])), (*A[k + 1], alt(radios[j])), (*Bq[k + 1], alt(radios[j + 1])), (*Bq[k], alt(radios[j + 1]))], "Cesped", (0, 0, 1))
    # Lado de la rampa: el césped cae en un murete de ladrillo.
    for j in range(6):
        p, q = pt(radios[j], a0), pt(radios[j + 1], a0)
        P["cesped"].poli([(*p, 0), (*q, 0), (*q, alt(radios[j + 1])), (*p, alt(radios[j]))], "Ladrillo", (*_tang(a0, -1), 0))
        p, q = pt(radios[j], a1), pt(radios[j + 1], a1)
        P["cesped"].poli([(*p, 0), (*q, 0), (*q, alt(radios[j + 1])), (*p, alt(radios[j]))], "Ladrillo", (*_tang(a1, 1), 0))
    # Bordillo de ladrillo (25 cm) a lo largo del frente y del lado de la rampa.
    B.sector(P["bordillo"], C, R_APRON, R_APRON + 0.35, a0 - 0.6, a1, 0.62, "Ladrillo", n, borde="Ladrillo")
    for j in range(6):
        p0, p1 = pt(radios[j], a0 - 0.55), pt(radios[j + 1], a0 - 0.55)
        q0, q1 = pt(radios[j], a0 + 0.3), pt(radios[j + 1], a0 + 0.3)
        h0, h1 = alt(radios[j]) + 0.12, alt(radios[j + 1]) + 0.12
        P["bordillo"].poli([(*p0, h0), (*p1, h1), (*q1, h1), (*q0, h0)], "Ladrillo", (0, 0, 1))
        P["bordillo"].poli([(*p0, 0), (*p1, 0), (*p1, h1), (*p0, h0)], "Ladrillo", (*_tang(a0, -1), 0))


def _tang(a, s):
    t = math.radians(a + s * 90)
    return (math.cos(t), math.sin(t))


def farola(P, p):
    """Farola de fundición negra con globo blanco (≈4,3 m)."""
    P.cilindro(p, 0.2, 0, 0.5, "Forja", n=8)
    P.cilindro(p, 0.13, 0.5, 0.7, "Forja", n=8, r1=0.09)
    P.cilindro(p, 0.07, 0.7, 3.5, "Forja", n=8, r1=0.05)
    P.cilindro(p, 0.1, 3.5, 3.75, "Forja", n=8, r1=0.14)
    P.esfera((p[0], p[1], 4.05), 0.3, "Globo", n=10)
    P.cilindro(p, 0.05, 4.33, 4.45, "Forja", n=6)


def arbolito(P, p, z0, alto=1.9, copa=0.55):
    P.cilindro(p, 0.05, z0, z0 + alto - copa, "Tronco", n=6)
    P.esfera((p[0], p[1], z0 + alto - copa * 0.6), copa, "Hoja", n=9, achatar=1.1)


def macetero(P, p):
    """Macetero negro en forma de cuenco con un ficus pequeño."""
    P.cilindro(p, 0.28, 0, 0.12, "Forja", n=12, r1=0.5, tapa=False)
    P.cilindro(p, 0.5, 0.12, 0.42, "Forja", n=12, r1=0.62, tapa=False)
    P.tapa([(p[0] + 0.58 * math.cos(2 * math.pi * k / 12), p[1] + 0.58 * math.sin(2 * math.pi * k / 12)) for k in range(12)], 0.36, "Grava")
    arbolito(P, p, 0.36)


def bandera(P, mastil, dir_ondea, colores, ancho=1.5, alto=1.0, z_top=8.7, estrellas=False):
    """Paño de bandera (dos caras) con franjas horizontales de color por vértice."""
    u = dir_ondea
    total = sum(f for f, _ in colores)
    z = z_top
    for frac, hexc in colores:
        h = alto * frac / total
        col = B.color(hexc)
        pts = [(mastil[0] + u[0] * 0.06, mastil[1] + u[1] * 0.06, z - h), (mastil[0] + u[0] * (ancho + 0.06), mastil[1] + u[1] * (ancho + 0.06), z - h),
               (mastil[0] + u[0] * (ancho + 0.06), mastil[1] + u[1] * (ancho + 0.06), z), (mastil[0] + u[0] * 0.06, mastil[1] + u[1] * 0.06, z)]
        nrm = (-u[1], u[0], 0)
        P.poli(pts, "Tela", nrm, col)
        P.poli([(x + nrm[0] * 0.004, y + nrm[1] * 0.004, zz) for x, y, zz in pts], "Tela", (-nrm[0], -nrm[1], 0), col)
        z -= h
    if estrellas:
        cx, cy, cz = mastil[0] + u[0] * (0.06 + ancho / 2), mastil[1] + u[1] * (0.06 + ancho / 2), z_top - alto / 2
        nrm = (-u[1], u[0], 0)
        for k in range(12):
            t = 2 * math.pi * k / 12
            ex, ez = math.cos(t) * alto * 0.33, math.sin(t) * alto * 0.33
            for s in (1, -1):
                off = 0.008 * s
                q = [(cx + u[0] * (ex + dx) + nrm[0] * off, cy + u[1] * (ex + dx) + nrm[1] * off, cz + ez + dz) for dx, dz in ((-0.035, -0.035), (0.035, -0.035), (0.035, 0.035), (-0.035, 0.035))]
                P.poli(q, "Tela", (nrm[0] * s, nrm[1] * s, 0), B.color("#FFCC00"))


def mobiliario(P):
    # Farolas: delante del césped y a lo largo de la rampa.
    for a, r in ((150, R_CESPED - 3.5), (178, R_CESPED - 2.5), (A_RAMPA[0] - 0.8, R_APRON + 2.5), (A_RAMPA[0] - 0.8, R_CESPED - 1.0)):
        farola(P["farolas"], pt(r, a))
    # Barandilla de acero entre la rampa y las losas.
    a = A_RAMPA[0] - 0.3
    r = R_APRON + 0.3
    pasos = []
    while r <= R_CESPED + 1.8:
        pasos.append(r)
        r += 1.6
    for r in pasos:
        p = pt(r, a)
        P["barandilla"].tubo((*p, 0), (*p, 1.0), 0.03, "Acero")
    for zt in (0.5, 1.0):
        P["barandilla"].tubo((*pt(pasos[0], a), zt), (*pt(pasos[-1], a), zt), 0.025, "Acero")
    # Valla de forja granate (aspas) en el borde exterior del césped.
    a0, a1 = A_CESPED[0], 176.0
    n = int((a1 - a0) / 2.6)
    for k in range(n + 1):
        aa = a0 + (a1 - a0) * k / n
        p = pt(R_CESPED + 0.2, aa)
        P["valla"].tubo((*p, 0), (*p, 0.95), 0.035, "Granate", n=4)
        if k < n:
            q = pt(R_CESPED + 0.2, a0 + (a1 - a0) * (k + 1) / n)
            for z in (0.12, 0.92):
                P["valla"].tubo((*p, z), (*q, z), 0.025, "Granate", n=4)
            P["valla"].tubo((*p, 0.12), (*q, 0.92), 0.02, "Granate", n=4)
            P["valla"].tubo((*p, 0.92), (*q, 0.12), 0.02, "Granate", n=4)
    # Muro bajo de piedra ostionera al oeste del césped.
    for k in range(4):
        aa, bb = 188 + k * 5.5, 188 + (k + 1) * 5.5
        P["muro_piedra"].caja(pt(R_CESPED - 2.2, (aa + bb) / 2), math.radians((aa + bb) / 2 + 90), math.radians(5.6) * (R_CESPED - 2.2), 0.7, 0, 1.05, "Ostionera")
    # Roca y árbol llorón sobre el césped.
    P["jardin"].esfera((*pt(R_CESPED - 5.5, 168), 0.5), 0.75, "Roca", n=7, achatar=0.6)
    tp = pt(R_APRON + 5.0, 147)
    P["jardin"].cilindro(tp, 0.12, 0.3, 1.8, "Tronco", n=7)
    for (dx, dy, z, r) in ((0, 0, 2.1, 1.25), (0.6, 0.3, 1.5, 1.0), (-0.6, -0.2, 1.4, 1.0), (0.1, 0.7, 1.2, 0.9), (-0.2, -0.7, 1.3, 0.9)):
        P["jardin"].esfera((tp[0] + dx, tp[1] + dy, z), r, "Hoja", n=10, achatar=0.95)
    # Maceteros con ficus junto a las columnas.
    for a in (98, 127, 160, 190):
        macetero(P["maceteros"], pt(R + 1.3, a))
    # Bolardos en el borde de la explanada.
    a = A0 + 2
    while a < A_RAMPA[0] - 2:
        P["bolardos"].cilindro(pt(R_APRON + 0.2, a), 0.08, 0, 0.75, "Forja", n=8)
        a += 4.2
    # Papelera junto a la puerta.
    P["bolardos"].cilindro(pt(RI + 0.9, 126), 0.24, 0, 0.9, "Forja", n=10)
    # Mástiles con banderas sobre su basamento de piedra, delante del cuerpo lateral.
    dx, dy = V11[0] - V10[0], V11[1] - V10[1]
    L = math.hypot(dx, dy)
    u = (dx / L, dy / L)
    nrm = (u[1], -u[0])
    m = ((V10[0] + V11[0]) / 2, (V10[1] + V11[1]) / 2)
    if math.dist((m[0] + nrm[0], m[1] + nrm[1]), C) < math.dist(m, C):
        nrm = (-nrm[0], -nrm[1])
    base = (m[0] + nrm[0] * 4.8, m[1] + nrm[1] * 4.8)
    P["mastiles"].caja(base, math.atan2(u[1], u[0]), 5.2, 1.1, 0, 0.45, "Hormigon")
    banderas = [
        [(1, "#1F57A8"), (1, "#FFFFFF")],                     # municipal (azul y blanca, según la foto)
        [(1, "#AA151B"), (2, "#F1BF00"), (1, "#AA151B")],     # España
        [(1, "#007A3D"), (1, "#FFFFFF"), (1, "#007A3D")],     # Andalucía
        [(1, "#003399")],                                     # Unión Europea
    ]
    ondea = (-nrm[0] * 0.3 + u[0] * 0.95, -nrm[1] * 0.3 + u[1] * 0.95)
    lo = math.hypot(*ondea)
    ondea = (ondea[0] / lo, ondea[1] / lo)
    for k, cols in enumerate(banderas):
        p = (base[0] + u[0] * (k - 1.5) * 1.25, base[1] + u[1] * (k - 1.5) * 1.25)
        P["mastiles"].cilindro(p, 0.05, 0.45, 9.0, "Acero", n=6, r1=0.035)
        P["mastiles"].esfera((p[0], p[1], 9.05), 0.06, "Acero", n=6)
        bandera(P["mastiles"], p, ondea, cols, estrellas=(k == 3))


# ── Validación ───────────────────────────────────────────────────────

def validar(obs, H):
    problemas = []
    tri = 0
    zmin, zmax = 1e9, -1e9
    for ob in obs:
        if ob.type != "MESH":
            continue
        me = ob.data
        me.calc_loop_triangles()
        tri += len(me.loop_triangles)
        for v in me.vertices:
            w = ob.matrix_world @ v.co
            zmin, zmax = min(zmin, w.z), max(zmax, w.z)
    if zmin < -0.02:
        problemas.append(f"vértices bajo el suelo ({zmin:.2f} m)")
    if zmax > H + 0.6:
        problemas.append(f"vértices por encima de la altura prevista ({zmax:.2f} m)")
    return {"triangulos": tri, "z_min": round(zmin, 2), "z_max": round(zmax, 2), "problemas": problemas}


def main():
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materiales()
    col = bpy.data.collections.new(LOTE)
    bpy.context.scene.collection.children.link(col)
    raiz = B.vacio(LOTE, col, {"origen": list(ORIGEN), "fuente": "OSM w257431100 + fotos del usuario"})

    def piezas(nombres, prefijo):
        return {n: B.Pieza(f"{prefijo}_{n}", ORIGEN, mats) for n in nombres}

    # Edificio LOD0
    lod0 = B.vacio(f"{ID}__LOD0", col, {"edificio_id": ID, "lod": 0})
    lod0.parent = raiz
    P = piezas(["vidrio", "perfil", "estructura", "cornisa", "cubierta", "fachada", "planta_baja", "columnas", "detalle"], "Ayto")
    muro_cortina(P)
    cornisa(P)
    traseras(P)
    cuerpo_lateral(P)
    columnas = planta_baja(P)
    obs0 = [p.objeto(col, lod0) for p in P.values() if p.f]
    obs0 += letras(col, lod0, mats)
    # Edificio LOD1
    lod1_v = B.vacio(f"{ID}__LOD1", col, {"edificio_id": ID, "lod": 1})
    lod1_v.parent = raiz
    P1 = B.Pieza("Ayto_volumen_lejos", ORIGEN, mats)
    lod1(P1)
    obs1 = [P1.objeto(col, lod1_v)]
    # Entorno: suelo (siempre visible) y mobiliario (solo cerca).
    suelo_v = B.vacio("E-ayuntamiento-suelo__LOD0", col, {"edificio_id": "E-ayuntamiento-suelo", "lod": 0})
    suelo_v.parent = raiz
    S = piezas(["adoquin", "losas", "rampa", "cesped", "bordillo"], "Entorno")
    suelo(S)
    parterre(S)
    obs_s = [p.objeto(col, suelo_v) for p in S.values() if p.f]
    mob_v = B.vacio("E-ayuntamiento-mobiliario__LOD0", col, {"edificio_id": "E-ayuntamiento-mobiliario", "lod": 0})
    mob_v.parent = raiz
    mob_lejos = B.vacio("E-ayuntamiento-mobiliario__LOD1", col, {"edificio_id": "E-ayuntamiento-mobiliario", "lod": 1})
    mob_lejos.parent = raiz
    Mo = piezas(["farolas", "barandilla", "valla", "muro_piedra", "jardin", "maceteros", "bolardos", "mastiles"], "Entorno")
    mobiliario(Mo)
    obs_m = [p.objeto(col, mob_v) for p in Mo.values() if p.f]

    informe = {
        "lote": LOTE, "edificio": ID, "nombre": "Ayuntamiento de La Línea de la Concepción", "origen": list(ORIGEN),
        "generador": "scripts/blender/singulares/ayuntamiento.py",
        "geometria": {"centro_arco": C, "radio": R, "arco_grados": [round(A0, 1), round(A1, 1)], "vanos_muro_cortina": N_VANOS, "columnas": len(columnas),
                      "alturas_m": {"planta_baja": Z_PB, "muro_cortina": [Z_V0, Z_V1], "cornisa": Z_TOP, "cuerpo_lateral": Z_TORRE}},
        "lod0": validar(obs0, Z_TORRE), "lod1": validar(obs1, Z_TORRE),
        "entorno_suelo": validar(obs_s, 1.0), "entorno_mobiliario": validar(obs_m, 9.2),
        "piezas": sorted(ob.name for ob in obs0 + obs1 + obs_s + obs_m),
    }
    informe["triangulos_lod0"] = informe["lod0"]["triangulos"]
    informe["problemas"] = sum((informe[k]["problemas"] for k in ("lod0", "lod1", "entorno_suelo", "entorno_mobiliario")), [])
    blend, glb = B.exportar("ayuntamiento", GLB)
    informe["blend"] = blend
    informe["glb"] = os.path.relpath(glb, B.RAIZ)
    informe["glb_kb"] = round(os.path.getsize(glb) / 1024)
    # Validación visual: los mismos encuadres que las fotos de referencia.
    vref = B.Pieza("SueloValidacion", ORIGEN, mats)
    vref.poli([(C[0] - 120, C[1] - 120, -0.01), (C[0] + 120, C[1] - 120, -0.01), (C[0] + 120, C[1] + 120, -0.01), (C[0] - 120, C[1] + 120, -0.01)], "Losa", (0, 0, 1))
    ob = vref.objeto(col)
    ob["solo_validacion"] = True
    vistas = [
        ("frente", (*pt(R + 34, 152), 1.7), (*C, 7.0), 26),          # como la foto con el césped delante
        ("sureste", (*pt(R + 30, 92), 1.7), (*pt(4, 125), 6.5), 24),   # como la foto con los mástiles
        ("porche", (*pt(R + 9, 124), 1.6), (*pt(RI, 140), 8.5), 14),  # bajo el vuelo, mirando arriba
        ("aerea", (*pt(R + 55, 135), 45), (*C, 3), 28),
        ("lateral", (*pt(R + 26, 40), 1.7), (*V11, 6.0), 26),
        ("rotulo", (*pt(RI + 6, 110), 1.8), (*pt(RI, 110), 2.3), 30),
    ]
    informe["render"] = B.renderizar("ayuntamiento", vistas, ORIGEN, ocultar=lambda o: o.parent is not None and o.parent.get("lod") == 1)
    informe["render_lejos"] = B.renderizar("ayuntamiento-lod1", [("lejos", (*pt(R + 140, 140), 60), (*C, 5), 30)], ORIGEN,
                                           ocultar=lambda o: o.parent is not None and o.parent.get("lod") == 0 and o.parent.get("edificio_id") == ID)
    informe["segundos"] = round(time.time() - t0, 1)
    B.registrar(LOTE, GLB, ORIGEN, [ID], informe)
    print(f"{LOTE}: LOD0 {informe['lod0']['triangulos']} tri · LOD1 {informe['lod1']['triangulos']} tri · suelo {informe['entorno_suelo']['triangulos']} · "
          f"mobiliario {informe['entorno_mobiliario']['triangulos']} · GLB {informe['glb_kb']} KB · problemas {informe['problemas']} · {informe['segundos']} s")


if __name__ == "__main__":
    main()
