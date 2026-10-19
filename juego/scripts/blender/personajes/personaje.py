"""
Personaje base de La Línea City (vecinos y jugadores), modelado y animado en Blender.

  /opt/blender-venv/bin/python scripts/blender/personajes/personaje.py
Crea  city-reconstruction/blender/blend/personajes/personaje.blend  (editable: esqueleto, cuerpo, ropa, pelo)
      public/modelos/personajes/personaje.glb                       (lo carga src/mundo/personajeBlender.ts)
      city-reconstruction/blender/render/personajes/*.png            (validación)

· Un esqueleto (Hips, Spine, Chest, Neck, Head, brazos y piernas .L/.R).
· Cuerpo continuo (modificador Skin + subdivisión) con morphs «Mujer» y «Corpulento».
· Cabeza con ojos, cejas, nariz, orejas y boca; peinados (Pelo_*), gafas y gorra.
· Ropa por capas, derivada del propio cuerpo y algo inflada para que no lo atraviese:
  Camiseta (manga corta), Camisa (manga larga), Chaleco, Pantalon, Short, Falda, Zapatos.
· Materiales recoloreables por el juego: Piel, Ropa, Ropa2, Pantalon, Calzado, Pelo.
· Animaciones (acciones de Blender → glTF): Quieto, Andar, Correr, Sentado, Saludar, Hablar,
  Trabajar, Usar.
Frente del personaje hacia −Y en Blender (hacia +z en three.js). Altura 1,74 m.
"""
import math
import os
import sys

import bpy
import bmesh  # noqa: E402
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "singulares"))
import base as B  # noqa: E402

# ── Esqueleto: (nombre, cabeza, cola, padre) en metros; x = izquierda del personaje (+x) ──
HUESOS = [
    ("Hips", (0, 0, 0.94), (0, 0, 1.04), None),
    ("Spine", (0, 0, 1.04), (0, 0, 1.2), "Hips"),
    ("Chest", (0, 0, 1.2), (0, 0, 1.43), "Spine"),
    ("Neck", (0, -0.01, 1.43), (0, -0.015, 1.53), "Chest"),
    ("Head", (0, -0.015, 1.53), (0, -0.015, 1.74), "Neck"),
]
for s, lado in ((1, "L"), (-1, "R")):
    HUESOS += [
        (f"Shoulder.{lado}", (s * 0.03, 0, 1.4), (s * 0.17, 0.01, 1.42), "Chest"),
        (f"UpperArm.{lado}", (s * 0.17, 0.01, 1.42), (s * 0.22, 0.02, 1.15), f"Shoulder.{lado}"),
        (f"LowerArm.{lado}", (s * 0.22, 0.02, 1.15), (s * 0.25, 0.0, 0.9), f"UpperArm.{lado}"),
        (f"Hand.{lado}", (s * 0.25, 0.0, 0.9), (s * 0.26, -0.005, 0.79), f"LowerArm.{lado}"),
        (f"UpperLeg.{lado}", (s * 0.09, 0, 0.93), (s * 0.095, 0.0, 0.5), "Hips"),
        (f"LowerLeg.{lado}", (s * 0.095, 0.0, 0.5), (s * 0.1, 0.02, 0.09), f"UpperLeg.{lado}"),
        (f"Foot.{lado}", (s * 0.1, 0.02, 0.09), (s * 0.1, -0.11, 0.03), f"LowerLeg.{lado}"),
    ]
H = {n: (Vector(a), Vector(b), p) for n, a, b, p in HUESOS}

# ── Grafo del cuerpo para el modificador Skin: punto, radio (x, y) hombre / mujer / corpulento ──
NUDOS = {
    "pelvis": ((0, 0.01, 0.9), (0.155, 0.11), (0.175, 0.12), (0.18, 0.13)),
    "cintura": ((0, 0.0, 1.06), (0.13, 0.095), (0.11, 0.085), (0.165, 0.13)),
    "pecho": ((0, 0.0, 1.25), (0.165, 0.11), (0.145, 0.105), (0.19, 0.135)),
    "hombros": ((0, 0.005, 1.4), (0.13, 0.085), (0.11, 0.08), (0.145, 0.095)),
    "cuello": ((0, -0.012, 1.5), (0.052, 0.052), (0.045, 0.045), (0.06, 0.06)),
    "nuca": ((0, -0.015, 1.56), (0.05, 0.05), (0.043, 0.043), (0.055, 0.055)),
}
for s, lado in ((1, "L"), (-1, "R")):
    NUDOS.update({
        f"hombro.{lado}": ((s * 0.175, 0.01, 1.415), (0.058, 0.058), (0.048, 0.048), (0.068, 0.068)),
        f"biceps.{lado}": ((s * 0.198, 0.015, 1.29), (0.048, 0.048), (0.04, 0.04), (0.058, 0.058)),
        f"codo.{lado}": ((s * 0.22, 0.02, 1.15), (0.038, 0.038), (0.033, 0.033), (0.045, 0.045)),
        f"antebrazo.{lado}": ((s * 0.235, 0.012, 1.04), (0.037, 0.035), (0.031, 0.03), (0.043, 0.04)),
        f"muneca.{lado}": ((s * 0.25, 0.0, 0.9), (0.026, 0.02), (0.022, 0.018), (0.029, 0.023)),
        f"mano.{lado}": ((s * 0.256, -0.004, 0.84), (0.038, 0.016), (0.033, 0.014), (0.04, 0.018)),
        f"dedos.{lado}": ((s * 0.26, -0.006, 0.78), (0.03, 0.012), (0.026, 0.011), (0.032, 0.013)),
        f"cadera.{lado}": ((s * 0.09, 0.005, 0.86), (0.088, 0.088), (0.095, 0.09), (0.105, 0.1)),
        f"muslo.{lado}": ((s * 0.093, 0.0, 0.7), (0.075, 0.075), (0.077, 0.077), (0.09, 0.09)),
        f"rodilla.{lado}": ((s * 0.095, 0.002, 0.5), (0.052, 0.052), (0.05, 0.05), (0.062, 0.062)),
        f"gemelo.{lado}": ((s * 0.097, 0.018, 0.36), (0.053, 0.055), (0.05, 0.052), (0.062, 0.064)),
        f"tobillo.{lado}": ((s * 0.1, 0.02, 0.1), (0.033, 0.033), (0.03, 0.03), (0.038, 0.038)),
        f"talon.{lado}": ((s * 0.1, 0.035, 0.05), (0.035, 0.035), (0.031, 0.031), (0.039, 0.039)),
        f"pie.{lado}": ((s * 0.1, -0.1, 0.035), (0.042, 0.022), (0.037, 0.02), (0.046, 0.024)),
    })
ARISTAS = [("pelvis", "cintura"), ("cintura", "pecho"), ("pecho", "hombros"), ("hombros", "cuello"), ("cuello", "nuca")]
for lado in "LR":
    ARISTAS += [("hombros", f"hombro.{lado}"), (f"hombro.{lado}", f"biceps.{lado}"), (f"biceps.{lado}", f"codo.{lado}"), (f"codo.{lado}", f"antebrazo.{lado}"),
                (f"antebrazo.{lado}", f"muneca.{lado}"), (f"muneca.{lado}", f"mano.{lado}"), (f"mano.{lado}", f"dedos.{lado}"),
                ("pelvis", f"cadera.{lado}"), (f"cadera.{lado}", f"muslo.{lado}"), (f"muslo.{lado}", f"rodilla.{lado}"), (f"rodilla.{lado}", f"gemelo.{lado}"),
                (f"gemelo.{lado}", f"tobillo.{lado}"), (f"tobillo.{lado}", f"talon.{lado}"), (f"talon.{lado}", f"pie.{lado}")]


def ctx_activo(ob):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.view_layer.objects:
        o.select_set(o is ob)


def esqueleto(col):
    arm_d = bpy.data.armatures.new("Esqueleto")
    arm = bpy.data.objects.new("Esqueleto", arm_d)
    col.objects.link(arm)
    ctx_activo(arm)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = {}
    for n, a, b, p in HUESOS:
        e = arm_d.edit_bones.new(n)
        e.head, e.tail = Vector(a), Vector(b)
        e.roll = 0
        if p:
            e.parent = eb[p]
            e.use_connect = (Vector(a) - eb[p].tail).length < 1e-4
        eb[n] = e
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def cuerpo_skin(col, k):
    """Malla del cuerpo con el modificador Skin (k = 1 hombre, 2 mujer, 3 corpulento)."""
    nombres = list(NUDOS)
    me = bpy.data.meshes.new("skin")
    me.from_pydata([NUDOS[n][0] for n in nombres], [(nombres.index(a), nombres.index(b)) for a, b in ARISTAS], [])
    ob = bpy.data.objects.new(f"skin{k}", me)
    col.objects.link(ob)
    sk = ob.modifiers.new("Skin", "SKIN")
    sk.use_smooth_shade = True
    sk.branch_smoothing = 0.6
    for i, n in enumerate(nombres):
        rx, ry = NUDOS[n][k]
        me.skin_vertices[0].data[i].radius = (rx, ry)
    me.skin_vertices[0].data[nombres.index("pelvis")].use_root = True
    sub = ob.modifiers.new("Sub", "SUBSURF")
    sub.levels = 2
    dg = bpy.context.evaluated_depsgraph_get()
    m2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    return m2


def segmento_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (a + ab * t - p).length


def pesos(ob, arm, rigidos=None):
    """Pesos por distancia a cada hueso (los dos más cercanos, con caída suave)."""
    grupos = {n: ob.vertex_groups.new(name=n) for n in H}
    for v in ob.data.vertices:
        p = ob.matrix_world @ v.co
        if rigidos:
            grupos[rigidos].add([v.index], 1.0, "REPLACE")
            continue
        ds = []
        for n, (a, b, _) in H.items():
            if n.startswith("Shoulder"):
                continue
            d = segmento_dist(p, a, b)
            # Las piernas no tiran del torso ni al revés (la entrepierna separa lados).
            if n.startswith(("UpperLeg", "LowerLeg", "Foot")) and p.z > 0.95:
                d += 1
            if n.startswith(("UpperArm", "LowerArm", "Hand")) and abs(p.x) < 0.14:
                d += 1
            ds.append((d, n))
        ds.sort()
        (d1, n1), (d2, n2) = ds[0], ds[1]
        w1 = 1 / max(d1, 1e-3) ** 4
        w2 = 1 / max(d2, 1e-3) ** 4
        if d2 > d1 * 2.2:
            w2 = 0
        t = w1 + w2
        grupos[n1].add([v.index], w1 / t, "REPLACE")
        if w2:
            grupos[n2].add([v.index], w2 / t, "REPLACE")
    mod = ob.modifiers.new("Esqueleto", "ARMATURE")
    mod.object = arm
    ob.parent = arm


def materiales():
    M = B.Materiales({})
    for n, c, r in (("Piel", "#E2B193", 0.55), ("Ropa", "#2F6DB5", 0.8), ("Ropa2", "#2B2D31", 0.75), ("Pantalon", "#3B4A63", 0.85),
                    ("Calzado", "#2A2622", 0.5), ("Pelo", "#3A2A1E", 0.6), ("Ojo", "#F4F2EE", 0.2), ("Iris", "#3A2A1E", 0.15),
                    ("Labios", "#B66A5E", 0.5), ("Gafas", "#1B1D20", 0.3), ("Gorra", "#1F5EFF", 0.7), ("Suela", "#E9E5DC", 0.8)):
        M.nuevo(n, c, rugosidad=r)
    for k, mm in enumerate(M.m.values()):
        mm.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value += k * 1e-3
    return M


def malla_desde(me_base, nombre, mat, M, filtro, inflar, col, arm, morphs):
    """Prenda: caras del cuerpo que cumplen `filtro(p)` (centro de la cara), infladas `inflar` m.
    Los pesos se calculan antes de inflar, sobre los mismos puntos que el cuerpo (no lo atraviesa al moverse)."""
    bm = bmesh.new()
    bm.from_mesh(me_base)
    quitar = [f for f in bm.faces if not filtro(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=quitar, context="FACES")
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M.m[mat])
    ob = bpy.data.objects.new(nombre, me)
    col.objects.link(ob)
    pesos(ob, arm)
    # Normales del cuerpo original (los bordes de la prenda no se doblan hacia dentro).
    nb = {tuple(round(c, 5) for c in v.co): v.normal.copy() for v in me_base.vertices}
    for v in me.vertices:
        n = nb.get(tuple(round(c, 5) for c in v.co), v.normal)
        v.co += n * inflar
    return ob


def deformar(me_base, k):
    """Copia de la malla base con los radios de la variante k (2 mujer, 3 corpulento): cada vértice
    se aleja o acerca a su tramo del grafo en la proporción de radios."""
    segs = []
    for a, b in ARISTAS:
        pa, pb = Vector(NUDOS[a][0]), Vector(NUDOS[b][0])
        segs.append((pa, pb, NUDOS[a][1], NUDOS[b][1], NUDOS[a][k], NUDOS[b][k]))
    me = me_base.copy()
    for v in me.vertices:
        p = v.co
        mejor = None
        for (pa, pb, ra, rb, ta, tb) in segs:
            ab = pb - pa
            t = max(0.0, min(1.0, (p - pa).dot(ab) / max(ab.length_squared, 1e-9)))
            c = pa + ab * t
            d = (p - c).length
            if not mejor or d < mejor[0]:
                mejor = (d, c, t, ra, rb, ta, tb)
        d, c, t, ra, rb, ta, tb = mejor
        fx = (ta[0] + (tb[0] - ta[0]) * t) / max(1e-4, ra[0] + (rb[0] - ra[0]) * t)
        fy = (ta[1] + (tb[1] - ta[1]) * t) / max(1e-4, ra[1] + (rb[1] - ra[1]) * t)
        o = p - c
        v.co = c + Vector((o.x * fx, o.y * fy, o.z * (fx + fy) / 2))
    return me


def cuerpo(col, arm, M):
    base = cuerpo_skin(col, 1)
    mujer = deformar(base, 2)
    gordo = deformar(base, 3)
    ob = bpy.data.objects.new("Cuerpo", base)
    col.objects.link(ob)
    base.materials.append(M.m["Piel"])
    pesos(ob, arm)
    # Morphs: «Mujer» y «Corpulento».
    ob.shape_key_add(name="Basis")
    for nombre, me in (("Mujer", mujer), ("Corpulento", gordo)):
        sk = ob.shape_key_add(name=nombre)
        for i, v in enumerate(me.vertices):
            sk.data[i].co = v.co
    # Prendas a partir del cuerpo (con los mismos morphs).
    prendas = []

    def prenda(nombre, mat, filtro, inflar):
        o = malla_desde(base, nombre, mat, M, filtro, inflar, col, arm, None)
        # Los morphs de la prenda: la misma deformación por radios que el cuerpo.
        o.shape_key_add(name="Basis")
        for nk, k in (("Mujer", 2), ("Corpulento", 3)):
            me = deformar(o.data, k)
            sk = o.shape_key_add(name=nk)
            for i, v in enumerate(me.vertices):
                sk.data[i].co = v.co
            bpy.data.meshes.remove(me)
        prendas.append(o)
        return o

    torso = lambda p: 0.93 < p.z < 1.47 and not (abs(p.x) > 0.16 and p.z < 1.3)  # noqa: E731
    prenda("Camiseta", "Ropa", lambda p: (0.9 < p.z < 1.47 and abs(p.x) < 0.17) or (abs(p.x) >= 0.14 and 1.25 < p.z < 1.47), 0.016)
    prenda("Camisa", "Ropa", lambda p: (0.9 < p.z < 1.47 and abs(p.x) < 0.17) or (abs(p.x) >= 0.14 and 0.93 < p.z < 1.47), 0.016)
    prenda("Chaleco", "Ropa2", lambda p: 0.92 < p.z < 1.44 and abs(p.x) < 0.155, 0.026)
    prenda("Pantalon", "Pantalon", lambda p: 0.1 < p.z < 1.0 and abs(p.x) < 0.2, 0.013)
    prenda("Short", "Pantalon", lambda p: 0.55 < p.z < 1.0 and abs(p.x) < 0.2, 0.014)
    prenda("Falda", "Pantalon", lambda p: 0.5 < p.z < 1.0 and abs(p.x) < 0.2, 0.03)
    return ob, prendas


def rigido(col, arm, M, nombre, mat, hueso, constructor):
    """Pieza rígida (cara, pelo, zapatos, gafas…) pesada al 100 % a un hueso."""
    bm = bmesh.new()
    constructor(bm)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    for m in (mat if isinstance(mat, list) else [mat]):
        me.materials.append(M.m[m])
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(nombre, me)
    col.objects.link(ob)
    pesos(ob, arm, rigidos=hueso)
    return ob


def esfera(bm, c, r, esc=(1, 1, 1), seg=16, mat=0):
    g = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(8, seg * 2 // 3), radius=r)
    vs = g["verts"]
    bmesh.ops.scale(bm, vec=esc, verts=vs)
    bmesh.ops.translate(bm, vec=c, verts=vs)
    for f in {f for v in vs for f in v.link_faces}:
        f.material_index = mat
    return vs


CAB = Vector((0, -0.012, 1.645))  # centro de la cabeza


def cabeza(bm):
    # Cráneo y cara (mandíbula algo más estrecha), nariz, orejas, ojos, cejas y boca.
    vs = esfera(bm, CAB, 0.1, (0.86, 0.97, 1.08), seg=24, mat=0)
    for v in vs:
        d = v.co - CAB
        if d.z < -0.02:  # mandíbula
            k = 1 - min(0.22, (-d.z - 0.02) * 2.2)
            v.co.x = CAB.x + d.x * k
            if d.y < 0:
                v.co.y = CAB.y + d.y * (1 - min(0.08, (-d.z - 0.02)))
        if d.y < -0.06 and abs(d.x) < 0.035 and -0.02 < d.z < 0.02:
            pass
    esfera(bm, CAB + Vector((0, -0.097, -0.012)), 0.017, (0.75, 1.0, 1.5), seg=10, mat=0)  # nariz
    for s in (-1, 1):
        esfera(bm, CAB + Vector((s * 0.087, 0.004, -0.004)), 0.024, (0.4, 0.8, 1.15), seg=10, mat=0)  # oreja
        esfera(bm, CAB + Vector((s * 0.033, -0.082, 0.012)), 0.0125, (1.15, 0.6, 0.85), seg=10, mat=1)  # ojo
        esfera(bm, CAB + Vector((s * 0.033, -0.0885, 0.012)), 0.0062, (1, 0.5, 1), seg=8, mat=2)  # iris
        g = bmesh.ops.create_cube(bm, size=1)  # ceja
        bmesh.ops.scale(bm, vec=(0.03, 0.006, 0.006), verts=g["verts"])
        bmesh.ops.rotate(bm, verts=g["verts"], cent=(0, 0, 0), matrix=Matrix.Rotation(-s * 0.12, 4, "Y"))
        bmesh.ops.translate(bm, vec=CAB + Vector((s * 0.034, -0.088, 0.036)), verts=g["verts"])
        for f in {f for v in g["verts"] for f in v.link_faces}:
            f.material_index = 3
    esfera(bm, CAB + Vector((0, -0.088, -0.045)), 0.019, (1.0, 0.35, 0.3), seg=10, mat=4)  # boca


def pelo(estilo):
    def c(bm):
        if estilo == "calvo":
            return
        # Casquete sobre el cráneo (deja la cara libre).
        vs = esfera(bm, CAB + Vector((0, 0.008, 0.012)), 0.106, (0.9, 1.0, 1.06), seg=22)
        quitar = [v for v in vs if (v.co - CAB).y < -0.05 and (v.co - CAB).z < 0.045 or (v.co - CAB).z < -0.035]
        bmesh.ops.delete(bm, geom=quitar, context="VERTS")
        if estilo == "tupe":
            esfera(bm, CAB + Vector((0, -0.06, 0.085)), 0.05, (1.2, 0.8, 0.5), seg=12)
        elif estilo == "largo":
            esfera(bm, CAB + Vector((0, 0.03, -0.06)), 0.1, (0.95, 0.6, 1.35), seg=16)
            for s in (-1, 1):
                esfera(bm, CAB + Vector((s * 0.075, -0.01, -0.07)), 0.045, (0.6, 0.9, 1.9), seg=12)
        elif estilo == "coleta":
            esfera(bm, CAB + Vector((0, 0.1, -0.02)), 0.035, (1, 1, 1), seg=10)
            esfera(bm, CAB + Vector((0, 0.13, -0.1)), 0.035, (0.9, 0.9, 2.2), seg=12)
        elif estilo == "mono":
            esfera(bm, CAB + Vector((0, 0.07, 0.08)), 0.05, (1, 1, 0.9), seg=12)
        elif estilo == "rizado":
            for k in range(16):
                t = 2 * math.pi * k / 16
                for z in (0.03, 0.075):
                    esfera(bm, CAB + Vector((math.cos(t) * 0.085, math.sin(t) * 0.085 + 0.015, z)), 0.03, (1, 1, 1), seg=8)
            esfera(bm, CAB + Vector((0, 0.01, 0.1)), 0.06, (1.2, 1.2, 0.6), seg=12)
    return c


def gafas(bm):
    for s in (-1, 1):
        g = bmesh.ops.create_circle(bm, cap_ends=False, segments=14, radius=0.02)
        bmesh.ops.rotate(bm, verts=g["verts"], cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 4, "X"))
        bmesh.ops.translate(bm, vec=CAB + Vector((s * 0.034, -0.097, 0.012)), verts=g["verts"])
        ext = bmesh.ops.extrude_edge_only(bm, edges=list({e for v in g["verts"] for e in v.link_edges}))
        bmesh.ops.translate(bm, vec=(0, 0.004, 0), verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)])
    g = bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(0.03, 0.004, 0.004), verts=g["verts"])
    bmesh.ops.translate(bm, vec=CAB + Vector((0, -0.098, 0.016)), verts=g["verts"])
    for s in (-1, 1):
        g = bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.scale(bm, vec=(0.004, 0.09, 0.004), verts=g["verts"])
        bmesh.ops.translate(bm, vec=CAB + Vector((s * 0.056, -0.05, 0.016)), verts=g["verts"])


def gorra(bm):
    vs = esfera(bm, CAB + Vector((0, 0.005, 0.03)), 0.108, (0.92, 1.0, 0.8), seg=20)
    bmesh.ops.delete(bm, geom=[v for v in vs if (v.co - CAB).z < 0.0], context="VERTS")
    g = bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(0.15, 0.09, 0.008), verts=g["verts"])
    bmesh.ops.translate(bm, vec=CAB + Vector((0, -0.12, 0.035)), verts=g["verts"])


# ── Animaciones ──────────────────────────────────────────────────────

def accion(arm, nombre, fps, frames, claves):
    """claves(f) → {hueso: (rx, ry, rz)} en grados (ejes locales del hueso) y opcional 'raiz_z'."""
    act = bpy.data.actions.new(nombre)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
    for f in range(frames + 1):
        pose = claves(f / frames)
        for pb in arm.pose.bones:
            r = pose.get(pb.name, (0, 0, 0))
            pb.rotation_euler = tuple(math.radians(x) for x in r)
            pb.keyframe_insert("rotation_euler", frame=f + 1)
            if pb.name == "Hips":
                pb.location = (0, pose.get("raiz", (0, 0, 0))[1] if False else 0, 0)
                dz = pose.get("raiz_z", 0.0)
                dy = pose.get("raiz_y", 0.0)
                pb.location = (0, dz, dy)  # en el hueso Hips (vertical): y local = arriba, z local = atrás
                pb.keyframe_insert("location", frame=f + 1)
    tr = arm.animation_data.nla_tracks.new()
    tr.name = nombre
    tr.strips.new(nombre, 1, act)
    tr.mute = True
    arm.animation_data.action = None
    return act


def animaciones(arm):
    s = math.sin
    pi2 = 2 * math.pi
    # Convención (ejes locales con roll 0): en brazos y piernas, rotar X positivo lleva el hueso hacia atrás.

    def quieto(t):
        b = s(t * pi2) * 1.5
        return {"Chest": (b, 0, 0), "Neck": (-b * 0.5, 0, 0), "UpperArm.L": (0, 0, 6 + b * 0.5), "UpperArm.R": (0, 0, -6 - b * 0.5),
                "LowerArm.L": (-8, 0, 0), "LowerArm.R": (-8, 0, 0), "raiz_z": 0.004 * s(t * pi2)}

    def andar(t, k=1.0):
        a = s(t * pi2)
        c = math.cos(t * pi2)
        return {
            "UpperLeg.L": (-28 * a * k, 0, 0), "UpperLeg.R": (28 * a * k, 0, 0),
            "LowerLeg.L": (max(0, -c) * 40 * k + 5, 0, 0), "LowerLeg.R": (max(0, c) * 40 * k + 5, 0, 0),
            "Foot.L": (-10 * a * k, 0, 0), "Foot.R": (10 * a * k, 0, 0),
            "UpperArm.L": (22 * a * k, 0, 6), "UpperArm.R": (-22 * a * k, 0, -6),
            "LowerArm.L": (-15 - 10 * max(0, -a) * k, 0, 0), "LowerArm.R": (-15 - 10 * max(0, a) * k, 0, 0),
            "Spine": (3 * k, 4 * a * k, 0), "Chest": (0, -6 * a * k, 0), "Hips": (0, -4 * a * k, 0),
            "raiz_z": -0.02 * k * abs(c) + 0.01,
        }

    def correr(t):
        p = andar(t, 1.7)
        p["Spine"] = (12, p["Spine"][1], 0)
        p["LowerArm.L"] = (-75, 0, 0)
        p["LowerArm.R"] = (-75, 0, 0)
        p["raiz_z"] = 0.04 * abs(s(t * pi2))
        return p

    def sentado(t):
        b = s(t * pi2) * 1.2
        return {"UpperLeg.L": (-88, 0, 3), "UpperLeg.R": (-88, 0, -3), "LowerLeg.L": (88, 0, 0), "LowerLeg.R": (88, 0, 0),
                "Foot.L": (0, 0, 0), "Foot.R": (0, 0, 0), "Spine": (-4 + b, 0, 0), "UpperArm.L": (-25, 0, 8), "UpperArm.R": (-25, 0, -8),
                "LowerArm.L": (-55, 0, 0), "LowerArm.R": (-55, 0, 0), "raiz_z": -0.44, "raiz_y": 0.0}

    def saludar(t):
        p = quieto(t)
        w = s(t * pi2 * 2)
        p.update({"UpperArm.R": (0, 0, -150), "LowerArm.R": (0, 0, -25 + 25 * w), "Hand.R": (0, 0, 10 * w), "Neck": (0, 0, -6)})
        return p

    def hablar(t):
        p = quieto(t)
        g = s(t * pi2)
        p.update({"UpperArm.R": (-25 - 10 * g, 0, -12), "LowerArm.R": (-55 - 15 * g, 0, 0), "UpperArm.L": (-15 + 8 * g, 0, 10),
                  "LowerArm.L": (-40, 0, 0), "Head": (3 * s(t * pi2 * 2), 5 * g, 0)})
        return p

    def trabajar(t):
        g = s(t * pi2)
        return {"Spine": (14, 0, 0), "Chest": (6, 0, 0), "UpperArm.R": (-60 - 35 * g, 0, -10), "LowerArm.R": (-50 + 30 * g, 0, 0),
                "UpperArm.L": (-40, 0, 12), "LowerArm.L": (-60, 0, 0), "UpperLeg.L": (-8, 0, 0), "UpperLeg.R": (6, 0, 0), "LowerLeg.L": (10, 0, 0)}

    def usar(t):
        g = s(t * pi2 * 2)
        return {"Spine": (8, 0, 0), "UpperArm.R": (-45, 0, -8), "LowerArm.R": (-45 + 8 * g, 0, 0), "UpperArm.L": (-45, 0, 8), "LowerArm.L": (-45 - 8 * g, 0, 0),
                "Head": (10, 0, 0)}

    for nombre, fn, frames in (("Quieto", quieto, 72), ("Andar", andar, 32), ("Correr", correr, 20), ("Sentado", sentado, 72), ("Saludar", saludar, 40),
                               ("Hablar", hablar, 48), ("Trabajar", trabajar, 30), ("Usar", usar, 40)):
        accion(arm, nombre, 30, frames, fn)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.fps = 30
    M = materiales()
    col = bpy.data.collections.new("PERSONAJE")
    s.collection.children.link(col)
    arm = esqueleto(col)
    ob, prendas = cuerpo(col, arm, M)
    rigido(col, arm, M, "Cabeza", ["Piel", "Ojo", "Iris", "Pelo", "Labios"], "Head", cabeza)
    for e in ("corto", "tupe", "largo", "coleta", "mono", "rizado"):
        rigido(col, arm, M, f"Pelo_{e}", "Pelo", "Head", pelo(e))
    for lado, sgn in (("L", 1), ("R", -1)):
        def z(bm, sgn=sgn):
            tmp = bmesh.new()
            bmesh.ops.create_cube(tmp, size=1)
            bmesh.ops.scale(tmp, vec=(0.105, 0.275, 0.12), verts=tmp.verts)
            bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=0.032, segments=3, affect="EDGES")
            for v in tmp.verts:
                if v.co.y < -0.04 and v.co.z > 0:
                    v.co.z -= 0.02 * min(1, (-v.co.y - 0.04) / 0.09)
            bmesh.ops.translate(tmp, vec=(sgn * 0.1, -0.045, 0.06), verts=tmp.verts)
            for f in tmp.faces:
                f.material_index = 1 if f.calc_center_median().z < 0.012 else 0
            me = bpy.data.meshes.new("t")
            tmp.to_mesh(me)
            tmp.free()
            bm.from_mesh(me)
            bpy.data.meshes.remove(me)
        rigido(col, arm, M, f"Zapato.{lado}", ["Calzado", "Suela"], f"Foot.{lado}", z)
    rigido(col, arm, M, "Gafas", "Gafas", "Head", gafas)
    rigido(col, arm, M, "Gorra", "Gorra", "Head", gorra)
    animaciones(arm)
    for pb in arm.pose.bones:  # pose de reposo
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    # Pose de reposo para el .blend y el render.
    bpy.context.preferences.filepaths.save_version = 0
    blend, glb = exportar()
    arm.animation_data.action = None
    for tr in arm.animation_data.nla_tracks:
        tr.mute = True
    for pb in arm.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
    print(f"personaje: {sum(len(o.data.polygons) for o in col.objects if o.type == 'MESH')} caras · GLB {os.path.getsize(glb) // 1024} KB")
    # Renders de validación: de frente y de lado, y un fotograma de andar.
    vistas = [("frente", (0.0, 3.2, 1.2), (0, 0, 0.95), 50), ("lado", (3.2, 0.3, 1.2), (0, 0, 0.95), 50)]
    for o in col.objects:
        if o.name.startswith(("Pelo_", "Gafas", "Gorra", "Camisa", "Chaleco", "Short", "Falda")) and o.name not in ("Pelo_corto",):
            o.hide_render = True
    B.renderizar("personaje", vistas, (0, 0), carpeta="personajes", ancho=700, alto=700, color="MATERIAL", ocultar=lambda o: o.hide_render)
    arm.animation_data.action = bpy.data.actions["Andar"]
    s.frame_set(8)
    B.renderizar("personaje-andar", [("lado", (3.2, 0.3, 1.2), (0, 0, 0.95), 50)], (0, 0), carpeta="personajes", ancho=700, alto=700, color="MATERIAL", ocultar=lambda o: o.hide_render)


def exportar():
    blend = B.ruta("city-reconstruction", "blender", "blend", "personajes", "personaje.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    for o in bpy.context.scene.objects:
        o.select_set(o.type in ("MESH", "ARMATURE"))
    crudo = blend.replace(".blend", ".crudo.glb")
    bpy.ops.export_scene.gltf(filepath=crudo, export_format="GLB", use_selection=True, export_yup=True, export_apply=False,
                              export_animations=True, export_animation_mode="NLA_TRACKS", export_morph=True, export_skins=True,
                              export_extras=True, export_image_format="NONE")
    glb = B.ruta("public", "modelos", "personajes", "personaje.glb")
    import subprocess
    subprocess.run(["npx", "--no-install", "gltf-transform", "optimize", crudo, glb, "--compress", "meshopt", "--texture-compress", "false",
                    "--simplify", "false", "--join", "false", "--instance", "false", "--flatten", "false", "--prune", "false", "--palette", "false"],
                   cwd=B.RAIZ, check=True, capture_output=True)
    os.remove(crudo)
    return blend, glb


if __name__ == "__main__":
    main()
