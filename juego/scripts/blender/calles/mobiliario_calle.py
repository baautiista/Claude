"""
Mobiliario de una calle ajustada (bolardos, canaletas, bancos, papeleras y maceteros), en Blender.

  /opt/blender-venv/bin/python scripts/blender/calles/mobiliario_calle.py <LOTE>
Usa los tramos de city-reconstruction/calles/ajustes.json con ese lote. Crea
city-reconstruction/blender/blend/mobiliario/<LOTE>-mob.blend, public/modelos/manzanas/<LOTE>-MOB.glb
y su entrada en src/datos/modelos/indice.json. Alturas sobre el suelo del juego: calzada 0,15, acera 0,27.
"""
import json
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "singulares"))
import base as B  # noqa: E402

CALZADA, ACERA = 0.15, 0.27


def puntos(eje, paso, desde=1.5):
    L = [math.dist(eje[i], eje[i + 1]) for i in range(len(eje) - 1)]
    total = sum(L)
    s = desde
    while s < total - desde:
        acc = 0
        for i, l in enumerate(L):
            if acc + l >= s:
                f = (s - acc) / (l or 1)
                a, b = eje[i], eje[i + 1]
                d = ((b[0] - a[0]) / (l or 1), (b[1] - a[1]) / (l or 1))
                yield (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), d
                break
            acc += l
        s += paso


def main(lote):
    aj = json.load(open(B.ruta("city-reconstruction", "calles", "ajustes.json")))
    tramos = [a for a in aj.values() if a.get("lote") == lote]
    xs = [p[0] for t in tramos for p in t["eje"]]
    ys = [p[1] for t in tramos for p in t["eje"]]
    O = (round((min(xs) + max(xs)) / 2), round((min(ys) + max(ys)) / 2))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = B.Materiales({})
    M.nuevo("Forja", "#1B1D20", rugosidad=0.45, metal=0.5)
    M.nuevo("Rejilla", "#2E3134", rugosidad=0.6, metal=0.6)
    M.nuevo("Madera", "#5A3A26", rugosidad=0.7)
    M.nuevo("Hoja", "#3F7A35", rugosidad=0.8)
    M.nuevo("Flor", "#8E2F6E", rugosidad=0.7)
    M.nuevo("Tierra", "#3A2E24", rugosidad=0.95)
    col = bpy.data.collections.new(f"{lote}-MOB")
    bpy.context.scene.collection.children.link(col)
    raiz = B.vacio(f"{lote}-MOB", col, {"origen": list(O)})
    nodo = B.vacio(f"E-{lote}-mobiliario__LOD0", col, {"edificio_id": f"E-{lote}-mobiliario", "lod": 0})
    nodo.parent = raiz
    P = {n: B.Pieza(f"Sol_{n}", O, M) for n in ("bolardos", "canaletas", "bancos", "maceteros")}
    r = random.Random(lote)
    n_bol = 0
    for t in tramos:
        e, w = t["eje"], t["w"]
        # Canaletas con rejilla a los dos lados de la calzada (30 cm).
        for sg in (1, -1):
            for p, d in puntos(e, 1.0, 0.5):
                nx, ny = -d[1] * sg, d[0] * sg
                c = (p[0] + nx * (w / 2 - 0.18), p[1] + ny * (w / 2 - 0.18))
                P["canaletas"].caja(c, math.atan2(d[1], d[0]), 0.98, 0.3, CALZADA, CALZADA + 0.006, "Rejilla")
        # Bolardos negros al borde de la acera, cada 3 m y alternando un poco.
        for sg in (1, -1):
            for p, d in puntos(e, 3.0, 2.0):
                nx, ny = -d[1] * sg, d[0] * sg
                c = (p[0] + nx * (w / 2 + 0.25), p[1] + ny * (w / 2 + 0.25))
                P["bolardos"].cilindro(c, 0.06, ACERA, ACERA + 0.82, "Forja", n=8)
                P["bolardos"].esfera((c[0], c[1], ACERA + 0.85), 0.065, "Forja", n=8)
                n_bol += 1
        # Un banco de forja con papelera y un par de maceteros por tramo largo.
        largo = sum(math.dist(e[i], e[i + 1]) for i in range(len(e) - 1))
        if largo > 25:
            p, d = next(puntos(e, largo, largo * 0.45))
            sg = 1 if r.random() < 0.5 else -1
            nx, ny = -d[1] * sg, d[0] * sg
            c = (p[0] + nx * (w / 2 + t["acera"] * 0.5), p[1] + ny * (w / 2 + t["acera"] * 0.5))
            rumbo = math.atan2(d[1], d[0])
            ux, uy = d
            for k in range(4):
                P["bancos"].caja((c[0] + nx * (k * 0.11 - 0.17), c[1] + ny * (k * 0.11 - 0.17)), rumbo, 1.6, 0.08, ACERA + 0.42, ACERA + 0.46, "Madera")
            for k in range(3):
                P["bancos"].caja((c[0] - nx * 0.25, c[1] - ny * 0.25), rumbo, 1.6, 0.03, ACERA + 0.55 + k * 0.12, ACERA + 0.63 + k * 0.12, "Madera")
            for s in (-0.7, 0.7):
                q = (c[0] + ux * s, c[1] + uy * s)
                P["bancos"].caja(q, rumbo, 0.06, 0.5, ACERA, ACERA + 0.42, "Forja")
                P["bancos"].tubo((q[0] - nx * 0.25, q[1] - ny * 0.25, ACERA + 0.42), (q[0] - nx * 0.3, q[1] - ny * 0.3, ACERA + 0.85), 0.025, "Forja")
            q = (c[0] + ux * 1.4, c[1] + uy * 1.4)
            P["bancos"].cilindro(q, 0.2, ACERA, ACERA + 0.85, "Forja", n=10)
            for k in range(2):
                p2, d2 = next(puntos(e, largo, largo * (0.2 + 0.25 * k)))
                q = (p2[0] - d2[1] * -sg * (w / 2 + 0.5), p2[1] + d2[0] * -sg * (w / 2 + 0.5))
                P["maceteros"].caja(q, math.atan2(d2[1], d2[0]), 0.45, 0.45, ACERA, ACERA + 0.4, "Forja")
                P["maceteros"].caja(q, math.atan2(d2[1], d2[0]), 0.4, 0.4, ACERA + 0.4, ACERA + 0.41, "Tierra")
                P["maceteros"].esfera((q[0], q[1], ACERA + 0.6), 0.3, "Hoja", n=8, achatar=0.8)
                P["maceteros"].esfera((q[0] + 0.1, q[1], ACERA + 0.78), 0.1, "Flor", n=6)
    for p in P.values():
        if p.f:
            p.objeto(col, nodo)
    blend, glb = B.exportar(f"{lote}-mob", f"modelos/manzanas/{lote}-MOB.glb", carpeta="mobiliario")
    idx_f = B.ruta("src", "datos", "modelos", "indice.json")
    idx = json.load(open(idx_f))
    idx["lotes"][f"{lote}-MOB"] = {"glb": f"modelos/manzanas/{lote}-MOB.glb", "origen": list(O), "edificios": [], "generador": 1, "mobiliario": True}
    json.dump(idx, open(idx_f, "w"), ensure_ascii=False, indent=1)
    print(f"{lote}-MOB: {n_bol} bolardos · GLB {os.path.getsize(glb) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
