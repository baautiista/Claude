"""
Mallas de calles en Blender a partir de city-reconstruction/calles/teselas/*.json (calles.py).

  /opt/blender-venv/bin/python scripts/blender/calles/blender_calles.py
Crea  city-reconstruction/blender/blend/calles/calles.blend   (todas las teselas, una colección por tesela)
      public/modelos/calles/<tesela>.glb                       (geometría, sin texturas)
      public/modelos/calles/materiales.glb                     (materiales con sus texturas, compartidos)
      src/datos/modelos/calles.json                            (índice para el juego)
El juego carga las teselas y sustituye cada material por el de materiales.glb con el mismo nombre
(así las texturas se descargan una sola vez).
"""
import glob
import json
import math
import os
import subprocess
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "singulares"))
import base as B  # noqa: E402
import texturas as T  # noqa: E402

CAPA_MAT = {"calzada_piedra": "AdoquinCalzada", "acera_roja": "AceraRoja", "asfalto": "Asfalto", "acera": "Acera", "bordillo": "Bordillo", "peatonal": "Adoquin", "sendero": "Albero", "pista": "Albero", "isleta": "Cesped"}
BORDE_MAT = {"acera_roja": "Bordillo", "calzada_piedra": "AdoquinCalzada", "asfalto": "Asfalto", "acera": "Bordillo", "bordillo": "Bordillo", "isleta": "Bordillo"}
METROS = {"AdoquinCalzada": 2.0, "AceraRoja": 2.0, "Asfalto": 4.0, "Acera": 2.0, "Bordillo": 1.0, "Adoquin": 2.0, "Albero": 3.0, "Cesped": 3.0}
ALTO = {"calzada_piedra": 0.15, "acera_roja": 0.27, "asfalto": 0.15, "acera": 0.27, "bordillo": 0.272, "peatonal": 0.15, "sendero": 0.13, "pista": 0.13, "isleta": 0.30}


def materiales():
    M = {}
    tex = {"Asfalto": T.asfalto_fino(None), "Acera": T.baldosa(None), "Bordillo": T.granito(None), "Adoquin": T.adoquin_gris(None),
           "Albero": T.albero(None), "Cesped": T.cesped_fino(None), "Arena": T.arena_playa(None),
           "AdoquinCalzada": T.adoquin_gris(None, semilla=41, nombre="T_adoquin_calzada", base="#9A9890"), "AceraRoja": T.baldosa(None, semilla=42, nombre="T_acera_roja", base="#A8796A")}
    rug = {"Asfalto": 0.92, "Acera": 0.85, "Bordillo": 0.8, "Adoquin": 0.86, "Albero": 0.95, "Cesped": 0.96, "Arena": 0.97, "AdoquinCalzada": 0.87, "AceraRoja": 0.84}  # distintos: el optimizador fusiona materiales iguales
    for n, img in tex.items():
        m = bpy.data.materials.new(n)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = img
        nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = rug[n]
        M[n] = m
    return M


def malla(nombre, origen, tris, bordes, M, col):
    """tris: [(mat, x0,y0,x1,y1,x2,y2, z)], bordes: [(mat, ax,ay,bx,by, z)]. UV en metros del mundo."""
    ox, oy = origen
    verts, caras, mats, uvs = [], [], [], []
    idx = {}
    lista = sorted({t[0] for t in tris} | {b[0] for b in bordes})

    def v(x, y, z):
        k = (round(x, 3), round(y, 3), round(z, 3))
        if k not in idx:
            idx[k] = len(verts)
            verts.append((x - ox, -(y - oy), z))
        return idx[k]

    for (m, x0, y0, x1, y1, x2, y2, z) in tris:
        f = [v(x0, y0, z), v(x1, y1, z), v(x2, y2, z)]
        # Cara hacia arriba (Blender: Y invertida → se comprueba en Blender).
        a, b, c = (verts[i] for i in f)
        if (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0:
            f = [f[0], f[2], f[1]]
        caras.append(f)
        mats.append(lista.index(m))
        s = 1 / METROS[m]
        uvs.append([(verts[i][0] + ox, -verts[i][1] + oy) for i in f])
        uvs[-1] = [(p[0] * s, p[1] * s) for p in uvs[-1]]
    for (m, ax, ay, bx, by, z) in bordes:
        # Normal exterior = (dy, −dx) en el juego (anillos orientados en calles.py).
        f = [v(ax, ay, 0.0), v(bx, by, 0.0), v(bx, by, z), v(ax, ay, z)]
        A, Bq, C = verts[f[0]], verts[f[1]], verts[f[2]]
        n = ((Bq[1] - A[1]) * (C[2] - A[2]) - (Bq[2] - A[2]) * (C[1] - A[1]), (Bq[2] - A[2]) * (C[0] - A[0]) - (Bq[0] - A[0]) * (C[2] - A[2]))
        esperado = (by - ay, -(bx - ax))  # en el juego
        esperado_b = (esperado[0], -esperado[1])
        if n[0] * esperado_b[0] + n[1] * esperado_b[1] < 0:
            f.reverse()
        caras.append(f)
        mats.append(lista.index(m))
        s = 1 / METROS[m]
        L = math.dist((ax, ay), (bx, by))
        uvs.append([(0, 0), (L * s, 0), (L * s, z * s), (0, z * s)] if f[0] == idx[(round(ax, 3), round(ay, 3), 0.0)] else [(0, z * s), (L * s, z * s), (L * s, 0), (0, 0)])
    me = bpy.data.meshes.new(nombre)
    me.from_pydata(verts, [], caras)
    for m in lista:
        me.materials.append(M[m])
    uvl = me.uv_layers.new(name="UVMap")
    for i, p in enumerate(me.polygons):
        p.material_index = mats[i]
        for k, li in enumerate(p.loop_indices):
            uvl.data[li].uv = uvs[i][k]
    me.validate()
    me.update()
    ob = bpy.data.objects.new(nombre, me)
    col.objects.link(ob)
    return ob


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    M = materiales()
    salida = B.ruta("public", "modelos", "calles", "x")[:-2]
    indice = {"teselas": {}, "materiales": "modelos/calles/materiales.glb", "alturas": ALTO}
    # Materiales compartidos: un plano diminuto por material.
    colm = bpy.data.collections.new("MATERIALES")
    bpy.context.scene.collection.children.link(colm)
    for k, (n, m) in enumerate(M.items()):
        me = bpy.data.meshes.new(f"mat_{n}")
        me.from_pydata([(k, 0, -5), (k + 0.1, 0, -5), (k, 0.1, -5)], [], [(0, 1, 2)])
        me.materials.append(m)
        me.uv_layers.new(name="UVMap")
        colm.objects.link(bpy.data.objects.new(f"mat_{n}", me))
    cols = {}
    for f in sorted(glob.glob(B.ruta("city-reconstruction", "calles", "teselas", "*.json"))):
        d = json.load(open(f))
        tid = d["tesela"]
        col = bpy.data.collections.new(f"calles_{tid}")
        bpy.context.scene.collection.children.link(col)
        tris = [(CAPA_MAT[k], *t, ALTO[k]) for k, ts in d["capas"].items() for t in ts]
        bordes = [(BORDE_MAT[b[0]], *b[1:5], b[5]) for b in d["bordes"]]
        ob = malla(f"calles_{tid}", d["origen"], tris, bordes, M, col)
        ob["tesela"] = tid
        cols[tid] = (col, d["origen"], len(ob.data.polygons))
    bpy.ops.wm.save_as_mainfile(filepath=B.ruta("city-reconstruction", "blender", "blend", "calles", "calles.blend"), compress=True)

    def exportar(objetos, destino, imagenes):
        for o in bpy.context.scene.objects:
            o.select_set(o in objetos)
        crudo = destino + ".crudo.glb"
        bpy.ops.export_scene.gltf(filepath=crudo, export_format="GLB", use_selection=True, export_extras=True, export_yup=True,
                                  export_image_format="JPEG" if imagenes else "NONE", export_jpeg_quality=80, export_texcoords=imagenes, export_normals=True)
        subprocess.run(["npx", "--no-install", "gltf-transform", "optimize", crudo, destino, "--compress", "meshopt", "--texture-compress", "false",
                        "--simplify", "false", "--join", "false", "--instance", "false", "--flatten", "false", "--prune", "false", "--palette", "false"], cwd=B.RAIZ, check=True, capture_output=True)
        os.remove(crudo)
        return os.path.getsize(destino)

    total = exportar(list(colm.objects), os.path.join(salida, "materiales.glb"), True)
    for tid, (col, origen, n) in cols.items():
        kb = exportar(list(col.objects), os.path.join(salida, f"{tid}.glb"), False)
        total += kb
        indice["teselas"][tid] = {"glb": f"modelos/calles/{tid}.glb", "origen": origen, "caras": n}
    json.dump(indice, open(B.ruta("src", "datos", "modelos", "calles.json"), "w"), indent=1)
    print(f"{len(cols)} teselas · {total // 1024} KB en total")


if __name__ == "__main__":
    main()
