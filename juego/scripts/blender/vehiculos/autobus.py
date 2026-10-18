"""
Autobús urbano de La Línea (midibús tipo Otokar Vectio con la librea municipal), modelado en Blender.

Uso:  /opt/blender-venv/bin/python scripts/blender/vehiculos/autobus.py
Crea  city-reconstruction/blender/blend/vehiculos/autobus.blend   (original editable)
      public/modelos/vehiculos/autobus.glb                        (lo carga el juego)
      city-reconstruction/blender/render/vehiculos/autobus-*.png

Referencia: fotos del usuario (2026-10). Librea blanca con franjas diagonales azul celeste, banda
de ventanas negra, techo blanco con filo azul, frontal con parabrisas negro y cartel LED naranja
«12 JUNQUILLO CENTRO», paragolpes azul, «www.lalinea.es» en los costados.
Medidas inferidas: 10,0 × 2,5 × 3,1 m (el juego usa 10,2 × 3,1 para las colisiones).

Ejes locales (coordenadas «del juego» de base.py con origen 0,0): x a lo ancho (+x = izquierda del
conductor), y a lo largo (+y = frente), z altura. En three.js el frente queda hacia +z.
"""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "singulares"))
import base as B  # noqa: E402

L, W = 10.0, 2.5
X = W / 2
Y = L / 2
Z0, ZV0, ZV1, ZT = 0.32, 1.25, 2.72, 3.05
CH = 0.16  # chaflán de las esquinas
AZUL = "#4FB3E8"


def materiales():
    M = B.Materiales({})
    M.nuevo("Blanco", "#F4F6F7", rugosidad=0.35, metal=0.1)
    M.nuevo("Azul", AZUL, rugosidad=0.35, metal=0.1)
    M.nuevo("Cristal", "#121519", rugosidad=0.06, metal=0.8)
    M.nuevo("Negro", "#1A1C1F", rugosidad=0.6)
    M.nuevo("Goma", "#151515", rugosidad=0.9)
    M.nuevo("Llanta", "#B9BEC2", rugosidad=0.3, metal=0.85)
    M.nuevo("Faro", "#F2F4F6", rugosidad=0.1, emisivo=("#FFFFFF", 0.4))
    M.nuevo("Piloto", "#C0141B", rugosidad=0.3, emisivo=("#FF2020", 0.3))
    M.nuevo("Intermitente", "#F29A1A", rugosidad=0.3)
    M.nuevo("LED", "#FF9A1E", rugosidad=0.5, emisivo=("#FF8A10", 2.5))
    M.nuevo("Texto", "#2A6FB0", rugosidad=0.5)
    return M


def huella(x, y):
    return [(-x + CH, -y), (x - CH, -y), (x, -y + CH), (x, y - CH), (x - CH, y), (-x + CH, y), (-x, y - CH), (-x, -y + CH)]


def costado(P, s):
    """Decoración de un costado (s = +1 izquierda, −1 derecha/puertas): todo pegado a 1 cm."""
    x = s * (X + 0.012)
    out = (s, 0, 0)

    def rect(y0, y1, z0, z1, mat, inclina=0.0):
        P["librea"].poli([(x, y0, z0), (x, y1, z0), (x, y1 + inclina, z1), (x, y0 + inclina, z1)], mat, out)

    # Banda de ventanas negra y filo azul encima.
    rect(-Y + CH, Y - CH, ZV0, ZV1, "Cristal")
    rect(-Y + CH, Y - CH, ZV1, ZV1 + 0.09, "Azul")
    # Franjas diagonales azules (inclinadas hacia atrás) en la parte baja blanca.
    for (y0, y1) in ((-Y + CH, -Y + 1.3), (-2.0, -1.35), (0.6, 2.3), (Y - 1.55, Y - CH)):
        rect(y0, y1, Z0 + 0.05, ZV0, "Azul", inclina=-0.55 if y0 > -Y + CH and y1 < Y - CH else 0.0)
    # Faldón negro.
    rect(-Y + CH, Y - CH, Z0, Z0 + 0.06, "Negro")
    # Montantes de las ventanas.
    for yy in (-3.6, -1.6, 0.4, 2.4):
        rect(yy - 0.05, yy + 0.05, ZV0, ZV1, "Negro")
    if s < 0:
        # Puertas acristaladas (delantera y central) con marco negro.
        for (y0, y1) in ((Y - 1.35, Y - 0.25), (-0.15, 1.15)):
            P["librea"].poli([(x * 1.002, y0, Z0 + 0.02), (x * 1.002, y1, Z0 + 0.02), (x * 1.002, y1, ZV1 - 0.05), (x * 1.002, y0, ZV1 - 0.05)], "Cristal", out)
            for yy in (y0, (y0 + y1) / 2, y1):
                P["librea"].poli([(x * 1.004, yy - 0.04, Z0 + 0.02), (x * 1.004, yy + 0.04, Z0 + 0.02), (x * 1.004, yy + 0.04, ZV1 - 0.05), (x * 1.004, yy - 0.04, ZV1 - 0.05)], "Negro", out)
    # Pilotos laterales naranjas.
    rect(Y - 2.6, Y - 2.45, 0.75, 0.85, "Intermitente")


def frente(P):
    y = Y + 0.012
    out = (0, 1, 0)
    xi, xd = -X + CH, X - CH

    def rect(x0, x1, z0, z1, mat, dy=0.0):
        P["librea"].poli([(x0, y + dy, z0), (x1, y + dy, z0), (x1, y + dy, z1), (x0, y + dy, z1)], mat, out)

    rect(xi, xd, 0.95, ZV1 + 0.15, "Cristal")             # parabrisas y zona del cartel
    rect(xi + 0.25, xd - 0.25, ZV1 - 0.22, ZV1 + 0.08, "Negro", 0.004)
    rect(xi, xd, Z0, 0.62, "Azul")                       # paragolpes azul
    rect(-0.75, 0.75, Z0 + 0.05, 0.6, "Blanco", 0.004)   # panel blanco central
    for sx in (-1, 1):
        rect(sx * 0.82, sx * 1.07, 0.68, 0.84, "Faro", 0.004)
        rect(sx * 0.82, sx * 1.07, 0.6, 0.66, "Intermitente", 0.004)
    rect(xi, xd, ZV1 + 0.15, ZT, "Blanco")


def trasera(P):
    y = -Y - 0.012
    out = (0, -1, 0)
    xi, xd = -X + CH, X - CH

    def rect(x0, x1, z0, z1, mat, dy=0.0):
        P["librea"].poli([(x0, y - dy, z0), (x1, y - dy, z0), (x1, y - dy, z1), (x0, y - dy, z1)], mat, out)

    rect(xi, xd, 1.6, ZV1, "Cristal")
    rect(xi, xd, Z0, 1.1, "Azul")
    for sx in (-1, 1):
        rect(sx * 0.85, sx * 1.1, 0.75, 1.35, "Piloto", 0.004)


def ruedas(P):
    for y in (Y - 1.9, -Y + 2.1):
        for s in (-1, 1):
            c = (s * (X - 0.12), y)
            # Rueda: cilindro en el eje x (se monta con tubos cortos).
            P["ruedas"].tubo((c[0] - s * 0.12, c[1], 0.48), (c[0] + s * 0.16, c[1], 0.48), 0.48, "Goma", n=14)
            P["ruedas"].tubo((c[0] + s * 0.16, c[1], 0.48), (c[0] + s * 0.17, c[1], 0.48), 0.3, "Llanta", n=12)
            # Tapas de la rueda.
            for xx, r, mat in ((c[0] + s * 0.16, 0.48, "Goma"), (c[0] + s * 0.17, 0.3, "Llanta")):
                pts = [(xx, c[1] + r * math.cos(2 * math.pi * k / 14), 0.48 + r * math.sin(2 * math.pi * k / 14)) for k in range(14)]
                P["ruedas"].poli(pts, mat, (s, 0, 0))
            # Paso de rueda negro sobre la carrocería.
            x = s * (X + 0.014)
            P["librea"].poli([(x, c[1] - 0.62, Z0), (x, c[1] + 0.62, Z0), (x, c[1] + 0.5, 1.02), (x, c[1] - 0.5, 1.02)], "Negro", (s, 0, 0))


def retrovisores(P):
    for s in (-1, 1):
        base = (s * (X - 0.05), Y - 0.05, 2.55)
        punta = (s * (X + 0.32), Y + 0.32, 2.5)
        P["detalle"].tubo(base, punta, 0.03, "Negro")
        P["detalle"].caja((punta[0], punta[1]), 0.0, 0.25, 0.08, 1.75, 2.5, "Negro")
        P["detalle"].tubo(punta, (punta[0], punta[1], 2.5), 0.03, "Negro")


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materiales()
    col = bpy.data.collections.new("AUTOBUS")
    bpy.context.scene.collection.children.link(col)
    raiz = B.vacio("autobus_urbano", col, {"vehiculo": "autobus_urbano", "fuente": "fotos del usuario 2026-10"})
    P = {n: B.Pieza(f"Bus_{n}", (0, 0), mats) for n in ("carroceria", "librea", "ruedas", "detalle")}
    # Carrocería: caja con esquinas achaflanadas, techo con equipo de aire.
    P["carroceria"].prisma(huella(X, Y), Z0, ZT, "Blanco", base=True)
    P["carroceria"].prisma(huella(0.9, 1.6), ZT, ZT + 0.28, "Blanco")
    P["carroceria"].caja((0, Y - 0.6), 0, 1.4, 0.8, ZT, ZT + 0.12, "Blanco")
    for s in (-1, 1):
        costado(P, s)
    frente(P)
    trasera(P)
    ruedas(P)
    retrovisores(P)
    obs = [p.objeto(col, raiz) for p in P.values() if p.f]
    # Letreros: cartel LED del frente y web en los costados (texto real de Blender).
    obs.append(B.texto("Bus_cartel", "12  JUNQUILLO CENTRO", (0, Y + 0.02), 0.0, 0.17, mats.m["LED"], col, raiz, (0, 0), ZV1 - 0.16, prof=0.01))
    obs.append(B.texto("Bus_web_izq", "www.lalinea.es", (X + 0.03, -0.6), -math.pi / 2, 0.16, mats.m["Texto"], col, raiz, (0, 0), ZV0 - 0.24, prof=0.01))
    obs.append(B.texto("Bus_web_der", "www.lalinea.es", (-X - 0.03, -0.6), math.pi / 2, 0.16, mats.m["Texto"], col, raiz, (0, 0), ZV0 - 0.24, prof=0.01))
    obs.append(B.texto("Bus_numero", "515", (0.95, Y + 0.02), 0.0, 0.12, mats.m["Texto"], col, raiz, (0, 0), 0.85, prof=0.01))
    tri = 0
    for ob in obs:
        ob.data.calc_loop_triangles()
        tri += len(ob.data.loop_triangles)
    blend, glb = B.exportar("autobus", "modelos/vehiculos/autobus.glb", carpeta="vehiculos")
    suelo = B.Pieza("Suelo", (0, 0), mats)
    suelo.poli([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], "Negro", (0, 0, 1))
    suelo.objeto(col)["solo_validacion"] = True
    B.renderizar("autobus", [("lado", (-9, 2.5, 1.8), (0, 0.5, 1.6), 30), ("frente", (5, 12, 2.0), (0, 2, 1.6), 30), ("izq", (9, -4, 2.2), (0, 0, 1.5), 30)],
                 (0, 0), carpeta="vehiculos", ancho=900, alto=560, color="MATERIAL")
    print(f"autobús: {tri} triángulos · GLB {os.path.getsize(glb) // 1024} KB · {blend}")


if __name__ == "__main__":
    main()
