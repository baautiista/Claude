"""
Farola fernandina de fundición (la de las calles del centro de La Línea), modelada en Blender.

  /opt/blender-venv/bin/python scripts/blender/mobiliario/farola.py
Crea  city-reconstruction/blender/blend/mobiliario/farola.blend y public/modelos/mobiliario/farola.glb
Dos materiales: «Fundicion» (cuerpo) y «Farol» (cristales; el juego le pone el brillo nocturno).
Medidas inferidas del modelo tipo: 4,6 m en total (columna 3,6 m + farol hexagonal).
"""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "singulares"))
import base as B  # noqa: E402


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = B.Materiales({})
    M.nuevo("Fundicion", "#22252A", rugosidad=0.45, metal=0.6)
    M.nuevo("Farol", "#FFF3D2", rugosidad=0.15, emisivo=("#FFC64D", 0.4))
    col = bpy.data.collections.new("FAROLA")
    bpy.context.scene.collection.children.link(col)
    raiz = B.vacio("farola_fernandina", col, {"mobiliario": "farola"})
    P = B.Pieza("Farola_cuerpo", (0, 0), M)
    F = B.Pieza("Farola_cristal", (0, 0), M)
    c = (0.0, 0.0)
    # Basa escalonada octogonal y pedestal.
    P.cilindro(c, 0.30, 0.0, 0.10, "Fundicion", n=8)
    P.cilindro(c, 0.24, 0.10, 0.22, "Fundicion", n=8, r1=0.21)
    P.cilindro(c, 0.20, 0.22, 0.95, "Fundicion", n=8, r1=0.15)
    P.cilindro(c, 0.18, 0.95, 1.05, "Fundicion", n=12)
    # Fuste estriado (16 caras) que se estrecha, con anillos.
    P.cilindro(c, 0.10, 1.05, 3.25, "Fundicion", n=16, r1=0.075)
    for z in (1.6, 2.4):
        P.cilindro(c, 0.11, z, z + 0.05, "Fundicion", n=12)
    # Capitel y cruz de apoyo del farol.
    P.cilindro(c, 0.085, 3.25, 3.4, "Fundicion", n=12, r1=0.15)
    P.cilindro(c, 0.15, 3.4, 3.48, "Fundicion", n=12)
    for k in range(4):
        a = k * math.pi / 2
        P.tubo((0, 0, 3.42), (math.cos(a) * 0.2, math.sin(a) * 0.2, 3.62), 0.018, "Fundicion", n=4)
    # Farol hexagonal: base, montantes, cristales que se abren hacia arriba y sombrerete.
    zb, zt = 3.62, 4.25
    rb, rt = 0.16, 0.27
    P.cilindro(c, rb + 0.02, zb - 0.04, zb, "Fundicion", n=6)
    for k in range(6):
        a0, a1 = 2 * math.pi * k / 6, 2 * math.pi * (k + 1) / 6
        q = lambda a, r, z: (math.cos(a) * r, math.sin(a) * r, z)  # noqa: E731
        am = (a0 + a1) / 2
        F.poli([q(a0, rb, zb), q(a1, rb, zb), q(a1, rt, zt), q(a0, rt, zt)], "Farol", (math.cos(am), math.sin(am), -0.2))
        P.tubo(q(a0, rb, zb), q(a0, rt, zt), 0.012, "Fundicion", n=4)
    P.cilindro(c, rt + 0.03, zt, zt + 0.04, "Fundicion", n=6)
    P.cilindro(c, rt + 0.05, zt + 0.04, zt + 0.26, "Fundicion", n=6, r1=0.05)
    P.cilindro(c, 0.03, zt + 0.26, zt + 0.36, "Fundicion", n=6, r1=0.01)
    P.esfera((0, 0, zt + 0.38), 0.03, "Fundicion", n=6)
    F.tapa([(math.cos(2 * math.pi * k / 6) * rb, math.sin(2 * math.pi * k / 6) * rb) for k in range(6)], zb + 0.01, "Farol", arriba=False)
    obs = [P.objeto(col, raiz), F.objeto(col, raiz)]
    tri = 0
    for ob in obs:
        ob.data.calc_loop_triangles()
        tri += len(ob.data.loop_triangles)
    blend, glb = B.exportar("farola", "modelos/mobiliario/farola.glb", carpeta="mobiliario")
    print(f"farola: {tri} triángulos · {os.path.getsize(glb) // 1024} KB")


if __name__ == "__main__":
    main()
