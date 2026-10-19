"""
Placa de nombre de calle (chapa de 60 × 40 cm, esquinas redondeadas), modelada en Blender.

  /opt/blender-venv/bin/python scripts/blender/mobiliario/placa_calle.py
Crea  city-reconstruction/blender/blend/mobiliario/placa_calle.blend y public/modelos/mobiliario/placa_calle.glb
Materiales: «Rotulo» (frontal, con UV 0–1 para el rótulo que dibuja el juego) y «Chapa» (canto y trasera).
Origen en el centro de la trasera, pegada a la pared; frente hacia −Y (en three.js, +z).
"""
import math
import os
import sys

import bpy
import bmesh  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "singulares"))
import base as B  # noqa: E402

W, H, F, R = 0.6, 0.406, 0.012, 0.035


def contorno(n=6):
    pts = []
    for cx, cz, a0 in ((W / 2 - R, H / 2 - R, 0), (-W / 2 + R, H / 2 - R, 90), (-W / 2 + R, -H / 2 + R, 180), (W / 2 - R, -H / 2 + R, 270)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((cx + R * math.cos(a), cz + R * math.sin(a)))
    return pts


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = B.Materiales({})
    M.nuevo("Rotulo", "#FFFFFF", rugosidad=0.35)
    M.nuevo("Chapa", "#4A62B0", rugosidad=0.4, metal=0.3)
    bm = bmesh.new()
    c = contorno()
    frente = [bm.verts.new((x, -F, z + H / 2)) for x, z in c]
    tras = [bm.verts.new((x, 0, z + H / 2)) for x, z in c]
    ff = bm.faces.new(frente)
    ff.material_index = 0
    bt = bm.faces.new(list(reversed(tras)))
    bt.material_index = 1
    for i in range(len(c)):
        j = (i + 1) % len(c)
        f = bm.faces.new([frente[i], frente[j], tras[j], tras[i]])
        f.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    me = bpy.data.meshes.new("Placa")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M.m["Rotulo"])
    me.materials.append(M.m["Chapa"])
    uv = me.uv_layers.new(name="UVMap")
    for p in me.polygons:
        for li in p.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = ((v.x + W / 2) / W, v.z / H)
    col = bpy.data.collections.new("PLACA")
    bpy.context.scene.collection.children.link(col)
    ob = bpy.data.objects.new("Placa", me)
    col.objects.link(ob)
    blend, glb = B.exportar("placa_calle", "modelos/mobiliario/placa_calle.glb", carpeta="mobiliario")
    print("placa:", os.path.getsize(glb), "bytes")


if __name__ == "__main__":
    main()
