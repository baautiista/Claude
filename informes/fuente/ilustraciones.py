"""Ilustraciones conceptuales de las propuestas (SVG vectorial, estilo InfoLinense).

No reproducen edificios reales: son escenas esquemáticas que explican cada proyecto.
Cada función devuelve el contenido de un lienzo de 600 × 400. `svg(codigo)` devuelve el SVG completo.
"""
import math
import random

AZUL = "#1F5EFF"
OSCURO = "#061E5C"
MEDIO = "#3D74FF"
CLARO = "#7FA2FF"
TINTE = "#E8EEFF"
LIMA = "#C4E910"
ROSA = "#FF1254"
BLANCO = "#FFFFFF"
NEGRO = "#0A0A0A"
GRIS = "#B9C3DA"
PIEDRA = "#D9D2C3"
ARENA = "#EADFC6"
HORMIGON = "#9AA3B5"


# ---------- primitivas ----------
def R(x, y, w, h, f, rx=0, extra=""):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{f}" {extra}/>'


def C(cx, cy, r, f, extra=""):
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{f}" {extra}/>'


def E(cx, cy, rx, ry, f, extra=""):
    return f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{f}" {extra}/>'


def P(d, f, extra=""):
    return f'<path d="{d}" fill="{f}" {extra}/>'


def L(x1, y1, x2, y2, s, w=2, extra=""):
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{s}" stroke-width="{w}" {extra}/>'


def T(x, y, txt, size, f, weight=800, anchor="middle", extra=""):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="Poppins, sans-serif" font-size="{size}" '
            f'font-weight="{weight}" fill="{f}" text-anchor="{anchor}" {extra}>{txt}</text>')


def fondo(c=AZUL):
    return R(0, 0, 600, 400, c)


def persona(x, y, h, f=BLANCO, brazo=None):
    """Pictograma de persona con los pies en (x, y)."""
    r = h * 0.12
    w = h * 0.34
    s = C(x, y - h + r, r, f)
    s += R(x - w / 2, y - h + 2.3 * r, w, h * 0.42, f, rx=w * 0.35)
    s += R(x - w * 0.42, y - h * 0.36, w * 0.36, h * 0.36, f, rx=w * 0.15)
    s += R(x + w * 0.06, y - h * 0.36, w * 0.36, h * 0.36, f, rx=w * 0.15)
    if brazo == "arriba":
        s += R(x + w * 0.38, y - h * 0.98, w * 0.24, h * 0.36, f, rx=w * 0.12)
    elif brazo == "frente":
        s += R(x + w * 0.4, y - h * 0.68, h * 0.26, w * 0.24, f, rx=w * 0.12)
    return s


def cabeza_espalda(x, y, r, f=OSCURO):
    """Silueta de público visto de espaldas (cabeza + hombros)."""
    return C(x, y - r * 2.1, r, f) + P(f"M{x - r * 1.7:.1f} {y:.1f} Q{x:.1f} {y - r * 2.6:.1f} {x + r * 1.7:.1f} {y:.1f} Z", f)


def qr(x, y, s, f=NEGRO, bg=BLANCO, semilla=7):
    rnd = random.Random(semilla)
    n = 9
    c = s / n
    out = R(x - c * 0.5, y - c * 0.5, s + c, s + c, bg)
    for i in range(n):
        for j in range(n):
            esquina = (i < 3 and j < 3) or (i < 3 and j > 5) or (i > 5 and j < 3)
            if esquina:
                continue
            if rnd.random() < 0.5:
                out += R(x + i * c, y + j * c, c, c, f)
    for (i, j) in [(0, 0), (6, 0), (0, 6)]:
        out += R(x + i * c, y + j * c, 3 * c, 3 * c, f) + R(x + (i + 0.5) * c, y + (j + 0.5) * c, 2 * c, 2 * c, bg)
        out += R(x + (i + 1) * c, y + (j + 1) * c, c, c, f)
    return out


def movil(x, y, w, h, pantalla=BLANCO, marco=NEGRO):
    return R(x, y, w, h, marco, rx=w * 0.16) + R(x + w * 0.07, y + w * 0.12, w * 0.86, h - w * 0.24, pantalla, rx=w * 0.06)


def edificio(x, base, w, h, f=MEDIO, ventana=CLARO, cols=3, filas=3):
    s = R(x, base - h, w, h, f)
    vw = w / (cols * 2 + 1)
    vh = (h - 20) / (filas * 2 + 1)
    for i in range(cols):
        for j in range(filas):
            s += R(x + vw * (1 + 2 * i), base - h + 8 + vh * (1 + 2 * j), vw, vh, ventana)
    return s


def fachada_cine(x, base, w, h, nombre, f=TINTE, letrero=LIMA, texto=OSCURO):
    s = R(x, base - h, w, h, f)
    s += R(x + w * 0.15, base - h - 18, w * 0.7, 30, letrero)
    s += T(x + w / 2, base - h + 4, nombre, 17, texto)
    s += R(x - 8, base - h * 0.5, w + 16, 10, OSCURO)
    for i in range(3):
        s += R(x + w * (0.1 + 0.3 * i), base - h * 0.42, w * 0.2, h * 0.42, OSCURO if i == 1 else MEDIO)
    s += R(x + w * 0.12, base - h * 0.88, w * 0.2, h * 0.28, ROSA) + R(x + w * 0.68, base - h * 0.88, w * 0.2, h * 0.28, ROSA)
    s += R(x + w * 0.4, base - h * 0.88, w * 0.2, h * 0.28, MEDIO)
    return s


def penon(x0=330, base=300, escala=1.0, f=CLARO, extra=""):
    pts = [(0, 0), (40, -60), (80, -95), (120, -150), (150, -165), (175, -150), (215, -110), (250, -60), (270, 0)]
    d = "M" + " L".join(f"{x0 + px * escala:.1f} {base + py * escala:.1f}" for px, py in pts) + " Z"
    return P(d, f, extra)


def maceta(x, y, f=ROSA, flor=ROSA):
    s = P(f"M{x - 9} {y - 16} L{x + 9} {y - 16} L{x + 6} {y} L{x - 6} {y} Z", "#C0623A")
    for dx, dy in [(-7, -22), (0, -27), (7, -22)]:
        s += C(x + dx, y + dy, 6, flor)
    s += C(x, y - 23, 3, LIMA)
    return s


def bombillas(x1, y1, x2, y2, comba=25, n=10, f=LIMA):
    s = P(f"M{x1} {y1} Q{(x1 + x2) / 2} {max(y1, y2) + comba} {x2} {y2}", "none", f'stroke="{GRIS}" stroke-width="1.5"')
    for i in range(1, n):
        t = i / n
        mx, my = (x1 + x2) / 2, max(y1, y2) + comba
        bx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t ** 2 * x2
        by = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t ** 2 * y2
        s += C(bx, by + 4, 4.5, f) + C(bx, by + 4, 9, f, 'fill-opacity=".25"')
    return s


def estrellas(n=30, semilla=3, alto=200):
    rnd = random.Random(semilla)
    return "".join(C(rnd.uniform(0, 600), rnd.uniform(0, alto), rnd.uniform(0.8, 2), BLANCO, f'fill-opacity="{rnd.uniform(.3, .9):.2f}"') for _ in range(n))


def onda(x, y, ancho, alto, f=LIMA, barras=14, semilla=1):
    rnd = random.Random(semilla)
    s = ""
    paso = ancho / barras
    for i in range(barras):
        h = alto * (0.25 + 0.75 * abs(math.sin(i * 0.9 + semilla)) * rnd.uniform(0.6, 1))
        s += R(x + i * paso, y - h / 2, paso * 0.55, h, f, rx=paso * 0.27)
    return s


def bocadillo(x, y, w, h, f=BLANCO, cola="izq"):
    cx = x + (w * 0.2 if cola == "izq" else w * 0.8)
    return R(x, y, w, h, f, rx=14) + P(f"M{cx - 10} {y + h - 1} L{cx} {y + h + 16} L{cx + 12} {y + h - 1} Z", f)


def silla(x, y, f=OSCURO):
    return R(x, y - 34, 6, 34, f) + R(x, y - 18, 26, 5, f) + R(x + 20, y - 18, 6, 18, f)


def cupula_bunker(x, y, r, f=HORMIGON):
    return (P(f"M{x - r} {y} A{r} {r * 0.8} 0 0 1 {x + r} {y} Z", f)
            + R(x - r * 0.55, y - r * 0.42, r * 1.1, r * 0.12, OSCURO, rx=3)
            + P(f"M{x - r * 0.65} {y - r * 0.55} A{r * 0.7} {r * 0.5} 0 0 1 {x + r * 0.2} {y - r * 0.78}", "none", f'stroke="{BLANCO}" stroke-opacity=".35" stroke-width="4"'))


def baluarte(x, y, s=1.0, f=PIEDRA, borde=OSCURO):
    d = f"M{x} {y} L{x + 60 * s} {y} L{x + 90 * s} {y - 34 * s} L{x + 120 * s} {y} L{x + 180 * s} {y} L{x + 180 * s} {y + 22 * s} L{x} {y + 22 * s} Z"
    return P(d, f, f'stroke="{borde}" stroke-width="2"')


def zigzag(x0, y, ancho, f=LIMA, w=6, dientes=4):
    paso = ancho / dientes
    pts = []
    for i in range(dientes):
        a = x0 + i * paso
        pts += [(a, y), (a + paso * 0.35, y), (a + paso * 0.5, y - paso * 0.22), (a + paso * 0.65, y)]
    pts.append((x0 + ancho, y))
    d = "M" + " L".join(f"{px:.1f} {py:.1f}" for px, py in pts)
    return P(d, "none", f'stroke="{f}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"')


def placa(x, y, w, h, titulo="", borde=LIMA, semilla=5):
    s = R(x, y, w, h, OSCURO, rx=6) + R(x + 3, y + 3, w - 6, h - 6, "none", rx=4, extra=f'stroke="{borde}" stroke-width="3"')
    s += R(x + 12, y + 12, w * 0.42, h * 0.5, CLARO)
    s += P(f"M{x + 12} {y + 12 + h * 0.5} L{x + 12 + w * 0.15} {y + 12 + h * 0.25} L{x + 12 + w * 0.27} {y + 12 + h * 0.4} L{x + 12 + w * 0.42} {y + 12 + h * 0.2} L{x + 12 + w * 0.42} {y + 12 + h * 0.5} Z", MEDIO)
    if titulo:
        s += T(x + w * 0.5 + 18, y + 30, titulo, 14, LIMA, anchor="start")
    for i in range(3):
        s += R(x + w * 0.5 + 18, y + 42 + i * 11, w * 0.38 - i * 14, 5, BLANCO, rx=2, extra='fill-opacity=".8"')
    s += qr(x + w - 48, y + h - 50, 34, semilla=semilla)
    return s


def suelo(y=320, f=OSCURO, op=".35"):
    return R(0, y, 600, 400 - y, f, extra=f'fill-opacity="{op}"')


def flecha(x1, y1, x2, y2, f=LIMA, w=4, discont=False):
    ang = math.atan2(y2 - y1, x2 - x1)
    a1 = (x2 - 14 * math.cos(ang - 0.45), y2 - 14 * math.sin(ang - 0.45))
    a2 = (x2 - 14 * math.cos(ang + 0.45), y2 - 14 * math.sin(ang + 0.45))
    extra = f'stroke-linecap="round"' + (' stroke-dasharray="8 8"' if discont else "")
    return L(x1, y1, x2, y2, f, w, extra) + P(f"M{x2} {y2} L{a1[0]:.1f} {a1[1]:.1f} L{a2[0]:.1f} {a2[1]:.1f} Z", f)


def lupa(x, y, r, f=BLANCO):
    return C(x, y, r, "none", f'stroke="{f}" stroke-width="{r * 0.25:.1f}"') + L(x + r * 0.7, y + r * 0.7, x + r * 1.6, y + r * 1.6, f, r * 0.3, 'stroke-linecap="round"')


def pin(x, y, s=1.0, f=LIMA):
    return P(f"M{x} {y} C{x - 14 * s} {y - 16 * s} {x - 14 * s} {y - 36 * s} {x} {y - 36 * s} C{x + 14 * s} {y - 36 * s} {x + 14 * s} {y - 16 * s} {x} {y} Z", f) + C(x, y - 24 * s, 5 * s, OSCURO)


def planta_patio(x, y, s, linea=OSCURO, patio=LIMA, fondo_=TINTE):
    w, h = 200 * s, 200 * s
    out = R(x, y, w, h, fondo_, extra=f'stroke="{linea}" stroke-width="{3 * s:.1f}"')
    out += R(x + w * 0.27, y + w * 0.25, w * 0.46, h * 0.5, patio, extra=f'fill-opacity=".55" stroke="{linea}" stroke-width="{2 * s:.1f}"')
    for k in range(1, 4):
        out += L(x, y + h * 0.25 * k, x + w * 0.27, y + h * 0.25 * k, linea, 2 * s)
        out += L(x + w * 0.73, y + h * 0.25 * k, x + w, y + h * 0.25 * k, linea, 2 * s)
    out += L(x + w * 0.27, y, x + w * 0.27, y + h, linea, 2 * s) + L(x + w * 0.73, y, x + w * 0.73, y + h, linea, 2 * s)
    out += R(x + w * 0.44, y + h * 0.75, w * 0.12, h * 0.25, AZUL)
    out += C(x + w * 0.5, y + h * 0.5, w * 0.06, AZUL)
    return out


def isometrico_patio(cx, cy, s, f=LIMA):
    """Patio en perspectiva isométrica en alámbrico."""
    def p(x, y, z):
        return (cx + (x - y) * 0.87 * s, cy + (x + y) * 0.5 * s - z * s)
    lineas = []
    caja = [(0, 0), (100, 0), (100, 100), (0, 100)]
    hueco = [(30, 30), (70, 30), (70, 70), (30, 70)]
    for poligono, z in [(caja, 0), (caja, 40), (hueco, 40), (hueco, 0)]:
        pts = [p(x, y, z) for x, y in poligono]
        lineas.append("M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in pts) + " Z")
    for (x, y) in caja + hueco:
        a, b = p(x, y, 0), p(x, y, 40)
        lineas.append(f"M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}")
    for k in (0, 1):
        for t in (55, 80):
            a, b = p(t, 0 if k else 100, 40), p(t, 30 if k else 70, 40)
    suelo_pts = [p(x, y, 0) for x, y in hueco]
    s_out = P("M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in suelo_pts) + " Z", f, 'fill-opacity=".35"')
    s_out += P(" ".join(lineas), "none", f'stroke="{f}" stroke-width="2.5" stroke-linejoin="round"')
    rnd = random.Random(9)
    for _ in range(60):
        x, y, z = rnd.uniform(0, 100), rnd.uniform(0, 100), rnd.choice([0, 40, rnd.uniform(0, 40)])
        a = p(x, y, z)
        s_out += C(a[0], a[1], 1.4, BLANCO, 'fill-opacity=".7"')
    return s_out


# ---------- escenas: cines y teatros ----------
def C1():
    s = fondo()
    s += edificio(20, 300, 110, 150) + fachada_cine(160, 300, 150, 140, "CINE") + edificio(350, 300, 100, 190) + edificio(470, 300, 120, 130)
    s += suelo(300)
    s += P("M-10 360 C120 330 200 380 320 350 S520 330 610 352", "none", f'stroke="{LIMA}" stroke-width="10" stroke-linecap="round"')
    for x, y in [(60, 344), (190, 360), (330, 349), (470, 340)]:
        s += C(x, y, 11, BLANCO, f'stroke="{LIMA}" stroke-width="5"')
    s += R(498, 170, 6, 150, OSCURO) + placa(430, 175, 145, 95, "1896", semilla=11)
    s += persona(395, 320, 92, OSCURO) + movil(408, 236, 20, 34, LIMA)
    return s


def C2():
    s = fondo(OSCURO)
    s += R(0, 300, 600, 100, "#0B2A78")
    s += R(40, 60, 250, 240, "#0E3290") + R(310, 60, 250, 240, "#0E3290")
    for x, nombre in [(40, "IMPERIAL"), (310, "TRIMOPE")]:
        s += R(x + 60, 140, 130, 160, OSCURO, extra=f'stroke="{LIMA}" stroke-width="3"')
        s += R(x + 20, 82, 210, 44, LIMA)
        s += T(x + 125, 104, "SALA", 11, OSCURO, extra='letter-spacing="3"')
        s += T(x + 125, 121, nombre, 17, OSCURO)
        s += flecha(x + 100, 220, x + 150, 220, BLANCO, 3)
    s += persona(160, 330, 95) + persona(205, 330, 80, CLARO) + persona(450, 330, 90, CLARO, "arriba")
    return s


def C3():
    s = fondo(OSCURO)
    s += P("M300 400 L120 70 L480 70 Z", BLANCO, 'fill-opacity=".06"')
    s += R(110, 40, 380, 170, BLANCO, rx=4)
    s += R(110, 40, 380, 170, AZUL, rx=4, extra='fill-opacity=".9"')
    s += penon(250, 210, 0.9, MEDIO) + C(410, 90, 22, LIMA) + R(110, 180, 380, 30, OSCURO, extra='fill-opacity=".5"')
    s += R(80, 30, 30, 200, ROSA) + R(490, 30, 30, 200, ROSA)
    for fila, (y, r) in enumerate([(300, 15), (345, 18), (395, 22)]):
        for i in range(9 - fila):
            x = 60 + i * (480 / (8 - fila)) + (fila * 10)
            s += cabeza_espalda(x, y, r, "#020B24")
    return s


def C4():
    s = fondo()
    s += R(0, 250, 600, 150, "#1648D6")
    s += R(320, 120, 230, 150, OSCURO, rx=8) + R(332, 132, 206, 120, BLANCO)
    for i in range(3):
        for j in range(2):
            s += R(342 + i * 66, 142 + j * 54, 58, 46, [ROSA, LIMA, CLARO, MEDIO, LIMA, ROSA][i + 3 * j])
    s += R(300, 270, 270, 12, OSCURO, rx=4)
    s += f'<g transform="rotate(-10 120 230)">{R(50, 150, 120, 160, BLANCO)}{R(62, 162, 96, 70, ROSA)}{T(110, 260, "PROGRAMA", 13, OSCURO)}{R(70, 272, 80, 6, GRIS)}{R(70, 284, 60, 6, GRIS)}</g>'
    s += f'<g transform="rotate(8 220 250)">{R(170, 190, 110, 80, BLANCO)}{R(178, 198, 94, 56, CLARO)}{penon(185, 254, 0.3, MEDIO)}</g>'
    s += f'<g transform="rotate(-4 120 340)">{R(60, 320, 120, 46, LIMA)}{T(120, 349, "ENTRADA", 15, OSCURO)}</g>'
    s += flecha(260, 200, 315, 180, LIMA, 5)
    return s


def C5():
    s = fondo()
    s += suelo(320)
    s += silla(120, 320) + persona(150, 304, 120, BLANCO)
    s += R(118, 290, 70, 8, BLANCO, rx=4)
    s += silla(440, 320, OSCURO) + persona(452, 304, 110, LIMA)
    s += R(292, 220, 8, 100, OSCURO) + R(282, 180, 28, 50, OSCURO, rx=14) + R(287, 186, 18, 20, CLARO, rx=8)
    s += onda(200, 150, 200, 70, LIMA, 16)
    s += bocadillo(70, 40, 160, 62) + T(150, 82, "1955…", 28, AZUL)
    s += bocadillo(380, 50, 150, 54, LIMA, "der") + T(455, 86, "¿Y el cine?", 18, OSCURO)
    return s


def C6():
    s = fondo(OSCURO) + estrellas() + C(520, 60, 24, TINTE)
    for x, w, h in [(0, 90, 190), (90, 70, 150), (480, 120, 170)]:
        s += edificio(x, 330, w, h, "#0B2A78", "#2A4FB5", 2, 3)
    s += R(150, 90, 300, 160, BLANCO) + R(158, 98, 284, 144, AZUL) + C(300, 170, 34, LIMA) + R(158, 210, 284, 32, MEDIO)
    s += R(165, 250, 8, 80, GRIS) + R(427, 250, 8, 80, GRIS)
    s += bombillas(0, 70, 150, 92, 30, 7) + bombillas(450, 92, 600, 70, 30, 7)
    s += R(0, 330, 600, 70, "#04153F")
    for i in range(12):
        s += cabeza_espalda(30 + i * 50, 400, 16 + (i % 3) * 2, "#020B24")
    return s


def C7():
    s = fondo()
    s += edificio(150, 330, 300, 230, TINTE, GRIS, 4, 3) + suelo(330)
    s += L(275, 175, 160, 130, LIMA, 2, 'stroke-dasharray="6 6"') + L(275, 300, 450, 330, LIMA, 2, 'stroke-dasharray="6 6"')
    s += f'<g transform="rotate(-6 330 240)">{movil(250, 140, 150, 250, OSCURO)}'
    s += fachada_cine(278, 340, 94, 120, "CINE", AZUL, LIMA, OSCURO)
    s += R(270, 160, 110, 20, LIMA) + T(325, 175, "1950", 13, OSCURO) + "</g>"
    s += C(222, 330, 22, BLANCO) + R(200, 330, 44, 70, BLANCO, rx=20)
    return s


def C8():
    s = fondo(OSCURO) + estrellas(20, 8, 120)
    s += R(120, 70, 360, 270, "#0E3290")
    s += P("M300 400 L120 70 L480 70 Z", LIMA, 'fill-opacity=".12"')
    s += R(140, 90, 320, 60, LIMA) + T(300, 132, "IMPERIAL", 40, OSCURO)
    for i in range(5):
        s += R(150 + i * 62, 170, 52, 70, ROSA if i % 2 else BLANCO, extra='fill-opacity=".85"')
        s += R(150 + i * 62, 162, 52, 6, BLANCO) + R(150 + i * 62, 242, 52, 6, BLANCO)
    s += R(250, 260, 100, 80, OSCURO)
    s += R(275, 360, 50, 26, NEGRO, rx=4) + C(300, 360, 8, LIMA)
    for i in range(10):
        if 4 <= i <= 5:
            continue
        s += cabeza_espalda(30 + i * 60, 400, 18, "#020B24")
    return s


def C9():
    s = fondo()
    s += R(70, 60, 460, 220, OSCURO, rx=6) + R(84, 74, 432, 192, MEDIO)
    s += penon(310, 266, 1.0, CLARO) + R(84, 230, 432, 36, AZUL)
    s += L(300, 74, 300, 266, LIMA, 4, 'stroke-dasharray="10 8"')
    s += edificio(110, 266, 50, 90, OSCURO, CLARO, 2, 3) + edificio(170, 266, 40, 60, OSCURO, CLARO, 1, 2)
    s += R(150, 300, 300, 50, LIMA) + T(300, 334, "CINE DE FRONTERA", 24, OSCURO)
    for i, x in enumerate([40, 545]):
        s += C(x, 340, 30, OSCURO) + C(x, 340, 10, LIMA)
        for k in range(5):
            a = k * 2 * math.pi / 5
            s += C(x + 19 * math.cos(a), 340 + 19 * math.sin(a), 5, CLARO)
    return s


# ---------- escenas: patios de vecinos ----------
def P1():
    s = fondo(OSCURO)
    for i in range(7):
        s += L(0, 40 + i * 55, 600, 20 + i * 60, "#2346A8", 10)
        s += L(40 + i * 85, 0, 20 + i * 90, 400, "#2346A8", 8)
    rnd = random.Random(4)
    for _ in range(14):
        s += R(rnd.uniform(20, 340), rnd.uniform(20, 360), 30, 24, MEDIO, extra='fill-opacity=".8"')
    for x, y in [(80, 120), (160, 230), (250, 100), (300, 300), (120, 330), (210, 180)]:
        s += pin(x, y, 1.0, LIMA)
    s += R(380, 60, 180, 280, BLANCO, rx=8) + R(440, 48, 60, 24, GRIS, rx=6)
    for i in range(6):
        y = 100 + i * 38
        ok = i < 4
        s += R(400, y, 22, 22, LIMA if ok else TINTE, rx=4)
        if ok:
            s += P(f"M404 {y + 11} L410 {y + 17} L419 {y + 5}", "none", f'stroke="{OSCURO}" stroke-width="3"')
        s += R(432, y + 6, 110 - (i % 3) * 18, 9, GRIS, rx=4)
    s += lupa(330, 230, 26, LIMA)
    return s


def P2():
    s = fondo()
    s += R(0, 60, 600, 280, BLANCO)
    for i, x in enumerate([30, 160, 410, 530]):
        s += R(x, 150, 50, 110, AZUL, rx=25 if i % 2 else 0) + R(x + 10, 100, 30, 30, AZUL)
    s += R(0, 260, 600, 140, ARENA) + R(0, 60, 600, 18, OSCURO)
    s += E(300, 300, 70, 18, GRIS) + R(240, 270, 120, 30, TINTE, rx=6) + E(300, 270, 60, 10, CLARO)
    for x in [20, 95, 140, 220, 380, 470, 520, 580]:
        s += maceta(x, 262, flor=ROSA if x % 3 else LIMA)
    for x in [60, 200, 420]:
        s += maceta(x, 148, flor=ROSA)
    s += R(235, 100, 130, 36, LIMA) + T(300, 124, "PATIO ABIERTO", 15, OSCURO)
    s += persona(130, 380, 90, OSCURO) + persona(165, 380, 70, MEDIO) + persona(470, 380, 92, OSCURO, "arriba")
    return s


def P3():
    s = fondo()
    s += R(60, 230, 480, 18, OSCURO) + R(80, 248, 14, 120, OSCURO) + R(506, 248, 14, 120, OSCURO)
    s += f'<g transform="rotate(-4 300 180)">{planta_patio(200, 110, 0.6, OSCURO, LIMA, BLANCO)}</g>'
    s += R(345, 200, 120, 8, LIMA, extra='transform="rotate(-20 405 204)"')
    s += P("M110 228 A30 26 0 0 1 170 228 Z", LIMA) + R(104, 224, 72, 6, LIMA)
    s += persona(470, 330, 120, BLANCO) + persona(90, 330, 110, CLARO) + persona(130, 330, 90, CLARO)
    s += bocadillo(390, 40, 110, 60) + P("M425 70 L440 85 L468 55", "none", f'stroke="{LIMA}" stroke-width="8" stroke-linecap="round"')
    return s


def P4():
    s = fondo()
    s += R(0, 70, 600, 250, TINTE)
    for x in [40, 180, 440]:
        s += R(x, 150, 60, 170, AZUL)
    s += maceta(130, 320, flor=ROSA) + maceta(400, 320, flor=LIMA)
    s += suelo(320, ARENA, "1")
    s += persona(240, 360, 110, OSCURO) + L(268, 300, 285, 360, OSCURO, 5, 'stroke-linecap="round"')
    s += persona(370, 360, 104, MEDIO, "frente") + movil(398, 255, 22, 36, LIMA)
    s += bocadillo(150, 20, 260, 60) + T(280, 58, "Aquí aprendí a andar", 18, AZUL)
    s += onda(430, 110, 140, 60, LIMA, 10, 3)
    return s


def P5():
    s = fondo(TINTE)
    s += R(0, 300, 600, 100, GRIS)
    for i, x in enumerate([40, 150, 470]):
        s += R(x, 70, 90, 70, OSCURO) + R(x + 6, 76, 78, 58, [CLARO, ROSA, LIMA][i])
    s += R(250, 80, 190, 210, BLANCO, extra=f'stroke="{OSCURO}" stroke-width="3"')
    s += R(270, 210, 70, 60, ROSA) + R(272, 190, 66, 20, AZUL, rx=6)
    s += R(360, 220, 60, 8, OSCURO) + R(365, 228, 6, 42, OSCURO) + R(409, 228, 6, 42, OSCURO)
    s += R(372, 195, 34, 25, MEDIO, rx=4) + C(381, 207, 5, LIMA)
    s += R(290, 110, 50, 60, AZUL)
    s += R(250, 290, 190, 10, LIMA)
    s += persona(110, 360, 110, AZUL) + persona(510, 360, 96, OSCURO, "arriba")
    return s


def P6():
    s = fondo()
    s += R(60, 60, 480, 270, "none", extra=f'stroke="{LIMA}" stroke-width="3" stroke-dasharray="10 9"')
    s += R(200, 150, 200, 120, "none", extra=f'stroke="{LIMA}" stroke-width="3" stroke-dasharray="10 9"')
    s += edificio(110, 330, 380, 200, MEDIO, CLARO, 5, 3) + suelo(330)
    s += R(230, 205, 140, 90, OSCURO, rx=6, extra=f'stroke="{ROSA}" stroke-width="4"')
    s += T(300, 232, "AQUÍ HUBO", 12, ROSA) + T(300, 252, "UN PATIO", 17, BLANCO)
    s += qr(281, 260, 26, semilla=3)
    s += persona(460, 380, 90, OSCURO, "frente")
    return s


def P7():
    s = fondo(OSCURO)
    s += R(80, 60, 440, 280, "#0B2A78", rx=16) + R(96, 76, 408, 248, "#020B24", rx=8)
    s += isometrico_patio(300, 120, 1.55)
    s += P("M470 270 A40 16 0 1 1 430 250", "none", f'stroke="{BLANCO}" stroke-width="3"') + P("M430 250 l-2 -12 l10 8 Z", BLANCO)
    s += T(125, 110, "3D", 26, LIMA, anchor="start")
    return s


def P8():
    s = fondo(OSCURO) + estrellas(16, 2, 90)
    s += R(0, 90, 600, 230, "#0E3290")
    for x in [40, 170, 430, 530]:
        s += R(x, 150, 46, 120, "#081F5E")
    s += bombillas(0, 100, 300, 110, 40, 9) + bombillas(300, 110, 600, 100, 40, 9)
    s += R(0, 300, 600, 100, "#3A2F55")
    s += silla(280, 300, LIMA) + persona(292, 288, 100, LIMA)
    s += E(316, 256, 30, 18, ROSA) + R(318, 248, 70, 6, ROSA, extra='transform="rotate(-18 318 251)"')
    for i, x in enumerate([60, 130, 450, 520]):
        s += silla(x, 380, BLANCO) + cabeza_espalda(x + 14, 360, 12, BLANCO)
    s += maceta(220, 300, flor=ROSA) + maceta(380, 300, flor=LIMA)
    return s


def P9():
    s = fondo()
    s += R(70, 40, 460, 220, "#0F3D2E", rx=6) + R(70, 40, 460, 220, "none", rx=6, extra=f'stroke="#8A5A2B" stroke-width="10"')
    s += planta_patio(110, 70, 0.8, BLANCO, LIMA, "none")
    s += T(400, 120, "Mi calle", 24, BLANCO, 600) + T(400, 152, "tenía", 24, BLANCO, 600) + T(400, 184, "un patio", 24, LIMA, 800)
    s += persona(560, 360, 120, OSCURO, "frente")
    for i, x in enumerate([90, 170, 250, 330, 410]):
        s += cabeza_espalda(x, 400, 22, OSCURO if i % 2 else "#0B2A78")
        if i in (1, 3):
            s += R(x + 16, 300, 12, 60, OSCURO if i % 2 else "#0B2A78", rx=6)
    return s


# ---------- escenas: ciudad fortificada ----------
def F1():
    s = fondo()
    for x, w, h, cols in [(-10, 110, 110, 3), (100, 90, 80, 2), (190, 130, 120, 3), (320, 90, 95, 2), (410, 100, 130, 3), (510, 110, 90, 3)]:
        s += edificio(x, 200, w, h, MEDIO, CLARO, cols, 2)
    s += R(0, 200, 600, 200, TINTE)
    for k in range(-8, 9):
        s += L(300 + k * 30, 200, 300 + k * 120, 400, GRIS, 1.5)
    for y in [212, 228, 250, 280, 320, 370]:
        s += L(0, y, 600, y, GRIS, 1.5)
    s += P("M0 262 L600 262 L600 300 L0 300 Z", LIMA, 'fill-opacity=".3"')
    s += P("M0 270 L600 270 L600 292 L0 292 Z", LIMA)
    for x in range(20, 600, 60):
        s += E(x, 281, 6, 3, "#8A6A1E")
    s += P("M240 318 L360 318 L372 352 L228 352 Z", OSCURO) + T(300, 343, "1735", 20, LIMA)
    s += persona(130, 300, 70, OSCURO) + persona(160, 300, 56, ROSA)
    s += persona(470, 395, 120, OSCURO, "frente")
    s += R(180, 40, 240, 40, LIMA) + T(300, 67, "POR AQUÍ PASABA LA LÍNEA", 15, OSCURO)
    return s


def F2():
    s = fondo()
    s += penon(330, 230, 0.8, CLARO) + R(0, 230, 600, 170, "#5A9A4A")
    s += baluarte(40, 290, 1.4) + baluarte(330, 300, 1.1)
    s += R(0, 340, 600, 20, "#B07C4A") + "".join(L(i * 30, 340, i * 30, 360, "#8A5A2B", 2) for i in range(21))
    s += R(470, 250, 6, 90, OSCURO) + R(430, 220, 90, 60, OSCURO, rx=4) + R(438, 228, 74, 44, LIMA)
    s += T(475, 256, "1735", 16, OSCURO)
    s += persona(250, 345, 80, OSCURO) + persona(280, 345, 62, BLANCO)
    return s


def F3():
    s = fondo("#7FB8FF")
    s += R(0, 170, 600, 70, AZUL) + R(0, 230, 600, 170, ARENA)
    s += P("M0 240 Q150 225 300 240 T600 240 L600 250 L0 250 Z", BLANCO, 'fill-opacity=".7"')
    s += cupula_bunker(140, 320, 70) + cupula_bunker(330, 290, 50) + cupula_bunker(470, 300, 40)
    s += R(540, 230, 8, 140, OSCURO) + P("M500 240 L580 240 L596 256 L580 272 L500 272 Z", LIMA) + T(540, 263, "RUTA", 14, OSCURO)
    s += persona(260, 390, 92, OSCURO, "arriba") + persona(300, 390, 76, ROSA) + persona(330, 390, 80, AZUL)
    return s


def F4():
    s = fondo()
    s += penon(360, 260, 0.9, CLARO) + R(0, 260, 600, 140, "#5A9A4A")
    s += f'<g transform="rotate(5 300 230)">{movil(200, 70, 200, 320, OSCURO)}'
    s += R(214, 84, 172, 292, "#0B2A78", rx=10)
    s += penon(250, 230, 0.55, MEDIO) + R(214, 230, 172, 146, "#3E7A34")
    s += baluarte(214, 250, 0.95, PIEDRA) + zigzag(216, 246, 168, LIMA, 4, 2)
    s += R(230, 100, 72, 24, LIMA, rx=4) + T(266, 117, "1735", 13, OSCURO) + "</g>"
    s += L(400, 200, 560, 220, LIMA, 2, 'stroke-dasharray="6 6"')
    return s


def F5():
    s = fondo(TINTE)
    s += R(0, 290, 600, 110, GRIS)
    s += R(380, 50, 180, 130, OSCURO) + R(388, 58, 164, 114, ARENA)
    s += P("M430 172 L450 110 L470 70 L500 90 L520 172 Z", "#C9B48A") + zigzag(395, 110, 150, ROSA, 3, 3)
    s += P("M90 260 L510 260 L560 330 L40 330 Z", OSCURO)
    s += P("M110 268 L490 268 L530 322 L70 322 Z", AZUL)
    s += P("M250 268 L350 268 L380 322 L220 322 Z", MEDIO)
    s += zigzag(160, 290, 280, LIMA, 5, 4)
    s += persona(80, 270, 120, OSCURO) + persona(530, 270, 110, MEDIO, "frente")
    return s


def F6():
    s = fondo(OSCURO)
    nodos = [(130, 120), (250, 70), (420, 90), (500, 200), (430, 320), (230, 330), (100, 250)]
    centro = (300, 210)
    for x, y in nodos:
        s += L(x, y, centro[0], centro[1], CLARO, 2, 'stroke-opacity=".6"')
    for i in range(len(nodos)):
        a, b = nodos[i], nodos[(i + 1) % len(nodos)]
        s += L(a[0], a[1], b[0], b[1], CLARO, 1.5, 'stroke-opacity=".35" stroke-dasharray="4 6"')
    for x, y in nodos:
        s += estrella_fuerte(x, y, 22, MEDIO)
    s += C(centro[0], centro[1], 58, LIMA, 'fill-opacity=".18"') + estrella_fuerte(centro[0], centro[1], 40, LIMA)
    s += T(300, 300, "LA LÍNEA", 18, LIMA) + T(300, 380, "RUTA EUROPEA DE FORTIFICACIONES", 13, BLANCO, 600, extra='letter-spacing="1"')
    return s


def estrella_fuerte(x, y, r, f):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.55
        pts.append(f"{x + rr * math.cos(a):.1f} {y + rr * math.sin(a):.1f}")
    return P("M" + " L".join(pts) + " Z", f)


def F7():
    s = fondo()
    s += penon(310, 300, 1.05, CLARO)
    for x, w, h in [(20, 70, 120), (95, 60, 90), (160, 80, 140), (245, 40, 70)]:
        s += edificio(x, 300, w, h, MEDIO, CLARO, 2, 3)
    s += R(0, 300, 600, 100, OSCURO, extra='fill-opacity=".35"')
    s += L(300, 120, 300, 400, BLANCO, 3, 'stroke-dasharray="10 8"')
    s += P("M90 350 C200 250 400 250 510 350", "none", f'stroke="{LIMA}" stroke-width="6" stroke-linecap="round"')
    s += flecha(470, 318, 512, 352, LIMA, 6)
    s += flecha(130, 318, 88, 352, LIMA, 6)
    s += persona(80, 390, 70, BLANCO) + persona(520, 390, 70, BLANCO)
    s += R(180, 40, 240, 40, LIMA) + T(300, 67, "DOS LADOS DE UN ASEDIO", 16, OSCURO)
    return s


def F8():
    s = fondo(OSCURO) + estrellas(18, 6, 120) + penon(340, 270, 0.9, "#0E3290")
    s += baluarte(60, 270, 2.6, PIEDRA)
    s += P("M130 270 L180 270 L190 252 L150 252 Z", "#4A4A4A") + C(150, 268, 12, "#2B2D31") + R(170, 244, 70, 12, "#2B2D31", rx=6, extra='transform="rotate(-12 170 250)"')
    s += persona(300, 270, 120, ROSA, "arriba")
    s += P("M268 160 L332 160 L320 146 L300 140 L280 146 Z", NEGRO)
    s += P("M0 400 L200 120 L260 120 L300 400 Z", LIMA, 'fill-opacity=".08"')
    for i in range(9):
        s += cabeza_espalda(40 + i * 65, 400, 18, "#020B24")
    return s


def F9():
    s = fondo("#7FB8FF")
    s += R(0, 140, 600, 260, "#B07C4A")
    s += R(0, 140, 600, 30, "#5A9A4A")
    s += R(120, 200, 360, 160, "#8A5A2B")
    for i in range(5):
        s += L(120 + i * 90, 200, 120 + i * 90, 360, BLANCO, 2)
    for j in range(3):
        s += L(120, 200 + j * 80, 480, 200 + j * 80, BLANCO, 2)
    s += R(180, 290, 120, 30, PIEDRA, extra=f'stroke="{OSCURO}" stroke-width="2"')
    s += R(320, 230, 50, 26, PIEDRA, extra=f'stroke="{OSCURO}" stroke-width="2"')
    s += P("M420 330 L470 300 L478 312 L430 340 Z", GRIS) + R(470, 296, 30, 8, "#8A5A2B", extra='transform="rotate(-30 470 300)"')
    s += P("M520 230 L580 230 L572 290 L528 290 Z", LIMA)
    s += persona(60, 200, 90, OSCURO, "frente") + persona(540, 200, 76, ROSA) + persona(570, 200, 64, AZUL)
    return s


# ---------- escenas: proyecto paraguas ----------
def T1():
    s = fondo()
    s += R(0, 320, 600, 80, OSCURO, extra='fill-opacity=".35"')
    s += placa(60, 70, 360, 230, "LA LÍNEA", semilla=21)
    s += P("M372 250 a10 10 0 0 1 0 -14 M378 256 a18 18 0 0 1 0 -26 M384 262 a26 26 0 0 1 0 -38", "none", f'stroke="{LIMA}" stroke-width="3"')
    s += f'<g transform="rotate(14 500 220)">{movil(450, 140, 100, 180, OSCURO, )}{R(466, 160, 68, 120, AZUL, rx=6)}{T(500, 230, "IL", 26, LIMA)}</g>'
    s += T(150, 340, "ES", 13, BLANCO, 700) + T(190, 340, "EN", 13, LIMA, 700)
    return s


def T2():
    s = fondo(OSCURO)
    s += R(60, 50, 480, 300, "#0B2A78", rx=12) + R(74, 64, 452, 272, "#13358F", rx=6)
    for i in range(6):
        s += L(74, 90 + i * 45, 526, 70 + i * 50, "#2A4FB5", 6)
        s += L(100 + i * 80, 64, 90 + i * 85, 336, "#2A4FB5", 5)
    s += P("M90 260 L200 210 L260 230 L330 170 L420 190 L500 120", "none", f'stroke="{LIMA}" stroke-width="5" stroke-linecap="round"')
    for (x, y, c) in [(150, 120, ROSA), (230, 280, ROSA), (360, 240, BLANCO), (430, 290, BLANCO), (300, 110, LIMA), (480, 220, ROSA)]:
        s += pin(x, y, 0.9, c)
    for k, c in enumerate([ROSA, BLANCO, LIMA]):
        s += P(f"M480 {80 + k * 16} L520 {70 + k * 16} L560 {80 + k * 16} L520 {90 + k * 16} Z", c)
    return s


def T3():
    s = fondo()
    s += P("M40 240 L180 240 L170 340 L50 340 Z", "#C08A5A") + R(34, 228, 152, 18, "#A8744A")
    rnd = random.Random(2)
    for i in range(5):
        s += f'<g transform="rotate({rnd.uniform(-20, 20):.0f} {70 + i * 22} 220)">{R(55 + i * 22, 180, 50, 60, BLANCO)}{R(60 + i * 22, 185, 40, 38, [ROSA, CLARO, LIMA, MEDIO, ROSA][i])}</g>'
    s += R(230, 230, 140, 50, OSCURO, rx=8) + R(240, 220, 120, 14, LIMA, rx=4) + R(240, 262, 120, 6, LIMA)
    s += flecha(190, 260, 225, 260, LIMA, 5) + flecha(375, 220, 410, 180, LIMA, 5)
    s += R(410, 70, 160, 190, BLANCO, rx=10)
    for i in range(3):
        for j in range(3):
            s += R(422 + i * 50, 84 + j * 56, 42, 46, [CLARO, ROSA, LIMA, MEDIO, CLARO, ROSA, LIMA, MEDIO, CLARO][i + 3 * j])
    s += P("M460 320 a30 30 0 0 1 50 -20 a24 24 0 0 1 40 22 a18 18 0 0 1 -6 34 h-80 a18 18 0 0 1 -4 -36 Z", BLANCO)
    return s


def T4():
    s = fondo()
    s += edificio(60, 330, 120, 180, MEDIO, CLARO, 3, 3) + edificio(420, 330, 130, 210, MEDIO, CLARO, 3, 4) + suelo(330)
    s += movil(215, 50, 170, 300, OSCURO)
    s += R(229, 66, 142, 268, "#0B2A78", rx=8)
    cx, cy = 300, 190
    cubo = P(f"M{cx} {cy - 60} L{cx + 52} {cy - 30} L{cx} {cy} L{cx - 52} {cy - 30} Z", LIMA)
    cubo += P(f"M{cx - 52} {cy - 30} L{cx} {cy} L{cx} {cy + 60} L{cx - 52} {cy + 30} Z", "#9CBA0C")
    cubo += P(f"M{cx + 52} {cy - 30} L{cx} {cy} L{cx} {cy + 60} L{cx + 52} {cy + 30} Z", "#7E970A")
    s += cubo + T(300, 300, "RA", 22, BLANCO)
    for x1, y1, x2, y2 in [(229, 100, 120, 160), (371, 100, 480, 140)]:
        s += L(x1, y1, x2, y2, LIMA, 2, 'stroke-dasharray="6 6"')
    return s


def T5():
    s = fondo(OSCURO)
    s += P("M170 230 A130 130 0 0 1 430 230", "none", f'stroke="{BLANCO}" stroke-width="22" stroke-linecap="round"')
    s += R(140, 210, 70, 120, LIMA, rx=30) + R(390, 210, 70, 120, LIMA, rx=30)
    s += onda(230, 270, 140, 90, BLANCO, 12, 5)
    s += pin(520, 130, 1.6, ROSA) + pin(80, 120, 1.2, CLARO)
    s += T(300, 380, "2 MIN · CADA PARADA", 16, LIMA, 700, extra='letter-spacing="1"')
    return s


def T6():
    s = fondo()
    s += R(110, 60, 380, 240, OSCURO, rx=12) + R(124, 74, 352, 212, BLANCO, rx=4) + P("M70 300 L530 300 L560 330 L40 330 Z", OSCURO)
    s += C(200, 150, 48, TINTE, f'stroke="{OSCURO}" stroke-width="3"') + T(200, 168, "W", 50, OSCURO, 700)
    for i in range(6):
        s += R(270, 110 + i * 22, 180 - (i % 3) * 30, 9, GRIS, rx=4)
    s += R(150, 220, 120, 54, CLARO) + penon(160, 274, 0.4, MEDIO)
    s += R(290, 238, 160, 30, LIMA, rx=6) + T(370, 259, "+ foto libre", 15, OSCURO)
    return s


ESCENAS = {k: v for k, v in globals().items() if len(k) == 2 and k[0] in "CPFT" and k[1].isdigit() and callable(v)}


def svg(codigo: str, etiqueta: str = "") -> str:
    contenido = ESCENAS[codigo]()
    titulo = f"<title>{etiqueta}</title>" if etiqueta else ""
    return (f'<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'preserveAspectRatio="xMidYMid slice">{titulo}{contenido}</svg>')


if __name__ == "__main__":
    print(sorted(ESCENAS))
