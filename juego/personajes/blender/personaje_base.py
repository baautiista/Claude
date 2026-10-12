"""
La Línea Life · personaje base femenino (etapa 1: modelo y renders de revisión).

Se ejecuta con Blender como módulo de Python (bpy 5.2):
    python personaje_base.py --mh <carpeta makehuman> --salida <carpeta> [--muestras 64] [--rapido]

Malla y formas: MakeHuman (base.obj y targets), liberados como CC0 en 2020.
Todo lo demás (estilización, ojos, cejas, pelo, ropa, materiales, luces y
cámaras) se construye aquí, con geometría orgánica de Blender.

Convención: MakeHuman usa Y arriba, Z al frente y decímetros. En Blender:
Z arriba, el personaje mira a −Y y la unidad es el metro.
"""
import argparse
import math
import os
import sys

import bpy  # noqa: E402  (bpy debe importarse antes que bmesh)
import bmesh
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument("--mh", required=True)
ap.add_argument("--salida", required=True)
ap.add_argument("--muestras", type=int, default=64)
ap.add_argument("--rapido", action="store_true")
ap.add_argument("--vistas", default="frente,lado,tres_cuartos,cuerpo,cara")
A = ap.parse_args(argv)
os.makedirs(A.salida, exist_ok=True)
TARGETS = os.path.join(A.mh, "repo", "makehuman", "data", "targets")

# ── 1. Malla base y formas de MakeHuman ────────────────────────────────

V = []
UV = []
grupos = {}
actual = None
for l in open(os.path.join(A.mh, "base.obj")):
    if l.startswith("v "):
        V.append([float(x) for x in l.split()[1:4]])
    elif l.startswith("vt "):
        UV.append([float(x) for x in l.split()[1:3]])
    elif l.startswith("g "):
        actual = l.split()[1]
    elif l.startswith("f "):
        cara = [t.split("/") for t in l.split()[1:]]
        grupos.setdefault(actual, []).append(([int(c[0]) - 1 for c in cara], [int(c[1]) - 1 if len(c) > 1 and c[1] else -1 for c in cara]))
V = np.array(V)
UV = np.array(UV)


def target(ruta, peso):
    ruta = os.path.join(TARGETS, ruta)
    if not os.path.exists(ruta):
        print("  (falta target)", ruta)
        return
    for l in open(ruta):
        if not l.strip() or l.startswith("#"):
            continue
        p = l.split()
        V[int(p[0])] += peso * np.array([float(p[1]), float(p[2]), float(p[3])])


# Mujer joven adulta, mediterránea, proporciones ideales.
target("macrodetails/universal-female-young-averagemuscle-averageweight.target", 1.0)
target("macrodetails/caucasian-female-young.target", 0.8)
target("macrodetails/african-female-young.target", 0.1)
target("macrodetails/asian-female-young.target", 0.1)
target("macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions.target", 1.0)
target("breast/female-young-averagemuscle-averageweight-averagecup-maxfirmness.target", 0.4)
# Cara amable y estilizada: ojos mayores, nariz pequeña, mejillas llenas, barbilla suave.
for lado in "lr":
    target(f"eyes/{lado}-eye-scale-incr.target", 0.9)
    target(f"eyes/{lado}-eye-height2-incr.target", 0.5)
    target(f"eyes/{lado}-eye-corner1-up.target", 0.2)
    target(f"cheek/{lado}-cheek-volume-incr.target", 0.6)
    target(f"cheek/{lado}-cheek-bones-decr.target", 0.4)
target("nose/nose-scale-vert-decr.target", 0.5)
target("nose/nose-scale-horiz-decr.target", 0.35)
target("nose/nose-scale-depth-decr.target", 0.5)
target("nose/nose-point-up.target", 0.4)
target("nose/nose-volume-decr.target", 0.4)
target("nose/nose-hump-decr.target", 0.6)
target("mouth/mouth-angles-up.target", 0.35)
target("mouth/mouth-scale-horiz-decr.target", 0.15)
target("mouth/mouth-upperlip-volume-incr.target", 0.25)
target("mouth/mouth-lowerlip-volume-incr.target", 0.2)
target("chin/chin-width-decr.target", 0.3)
target("chin/chin-prominent-decr.target", 0.3)
target("chin/chin-height-decr.target", 0.2)
target("head/head-round.target", 0.5)
target("head/head-age-decr.target", 0.6)


def verts_de(g):
    return sorted({i for caras, _ in grupos[g] for i in caras})


def junta(nombre):
    return V[verts_de("joint-" + nombre)].mean(0)


# ── 2. Estilización (cabeza algo mayor, ojos más grandes, piernas largas) ──

def suave(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


cuello = junta("neck")
cabeza = junta("head")
ojoL = junta("l-eye")
ojoR = junta("r-eye")
pelvis = junta("pelvis")
suelo = junta("ground")

# Cabeza un 12 % mayor (desde la base del cuello, mezcla suave).
centro_cab = np.array([0, cuello[1] + 0.25, cabeza[2] * 0.6])
k = suave((V[:, 1] - (cuello[1] - 0.15)) / 0.55)[:, None]
V = V + (V - centro_cab) * 0.12 * k
# Ojos un poco más grandes con sus párpados.
for oj in (junta("l-eye"), junta("r-eye")):
    d = np.linalg.norm(V - oj, axis=1)
    k = suave(1 - d / 0.62)[:, None]
    V = V + (V - oj) * 0.13 * k
# Piernas un 4 % más largas (alarga la silueta).
k = suave((pelvis[1] - V[:, 1]) / 1.2)[:, None]
V[:, 1:2] = V[:, 1:2] - (pelvis[1] - V[:, 1:2]).clip(0) * 0.04 * k

# Juntas definitivas (tras formas y estilización).
J = {g[6:]: V[verts_de(g)].mean(0) for g in grupos if g.startswith("joint-")}


def a_blender(p):
    """MakeHuman (dm, Y arriba, Z al frente) → Blender (m, Z arriba, frente −Y), pies en z = 0."""
    p = np.asarray(p, dtype=float)
    return np.stack([p[..., 0] * 0.1, -p[..., 2] * 0.1, (p[..., 1] - J["ground"][1]) * 0.1], -1)


VB = a_blender(V)
JB = {k: a_blender(v) for k, v in J.items()}

# ── 3. Escena limpia ───────────────────────────────────────────────────

bpy.ops.wm.read_factory_settings(use_empty=True)
esc = bpy.context.scene
coleccion = {}
for n in ("Cuerpo", "Cara", "Pelo", "Ropa", "Luces", "Camaras"):
    c = bpy.data.collections.new(n)
    esc.collection.children.link(c)
    coleccion[n] = c


def malla_de_grupos(nombre, gs, col, sin_uv=False):
    caras = [f for g in gs for f in grupos[g]]
    usados = sorted({i for f, _ in caras for i in f})
    mapa = {v: i for i, v in enumerate(usados)}
    me = bpy.data.meshes.new(nombre)
    me.from_pydata([tuple(VB[v]) for v in usados], [], [[mapa[i] for i in f] for f, _ in caras])
    if not sin_uv and len(UV):
        uv = me.uv_layers.new(name="UV")
        k = 0
        for f, t in caras:
            for ti in t:
                uv.data[k].uv = UV[ti] if ti >= 0 else (0, 0)
                k += 1
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(nombre, me)
    coleccion[col].objects.link(ob)
    ob["indices_makehuman"] = len(usados)
    return ob, usados


def subdividir(ob, nivel=1, render=2):
    m = ob.modifiers.new("Subdivision", "SUBSURF")
    m.levels = 0 if A.rapido else nivel
    m.render_levels = nivel if A.rapido else render
    return m


# ── 4. Materiales ──────────────────────────────────────────────────────

def material(nombre, color, rugosidad=0.5, sss=0.0, brillo=0.0, atributo=None, sheen=0.0, metal=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    n = m.node_tree.nodes
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rugosidad
    b.inputs["Metallic"].default_value = metal
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
        b.inputs["Subsurface Scale"].default_value = 0.012
    if brillo:
        b.inputs["Coat Weight"].default_value = brillo
        b.inputs["Coat Roughness"].default_value = 0.05
    if sheen:
        b.inputs["Sheen Weight"].default_value = sheen
        b.inputs["Sheen Roughness"].default_value = 0.4
    if atributo:
        at = n.new("ShaderNodeVertexColor")
        at.layer_name = atributo
        mx = n.new("ShaderNodeMix")
        mx.data_type = "RGBA"
        mx.blend_type = "MULTIPLY"
        mx.inputs["Factor"].default_value = 1.0
        mx.inputs[6].default_value = (*color, 1)
        m.node_tree.links.new(at.outputs["Color"], mx.inputs[7])
        m.node_tree.links.new(mx.outputs[2], b.inputs["Base Color"])
    return m


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def color_vertices(ob, nombre, f):
    """Atributo de color por esquina calculado con f(posición, normal) → (r, g, b)."""
    me = ob.data
    at = me.color_attributes.new(nombre, "BYTE_COLOR", "CORNER")
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index]
            at.data[li].color = (*f(v.co, v.normal), 1)
    return at


# ── 5. Cuerpo y cara ───────────────────────────────────────────────────

cuerpo, idx_cuerpo = malla_de_grupos("Cuerpo", ["body"], "Cuerpo")
PIEL = srgb("#F2C4A6")
nariz_punta = max((VB[i] for i in idx_cuerpo if VB[i][2] > JB["l-eye"][2] - 0.12 and abs(VB[i][0]) < 0.02), key=lambda p: -p[1])
ojo_z = JB["l-eye"][2]
boca_z = nariz_punta[2] - 0.042
print("nariz", nariz_punta, "ojos", ojo_z, "boca", boca_z)


def piel_color(co, no):
    x, y, z = co
    c = Vector((1, 1, 1))
    # Rubor en mejillas.
    for s in (-1, 1):
        d = math.dist((x, z), (s * 0.038, ojo_z - 0.03))
        if y < nariz_punta[1] + 0.06:
            c = c.lerp(Vector((1.0, 0.78, 0.76)), max(0, 1 - d / 0.022) * 0.55)
    # Labios: óvalo bajo la nariz, en la parte delantera.
    dz = (z - boca_z) / 0.0085
    dx = x / 0.024
    if y < nariz_punta[1] + 0.03 and dx * dx + dz * dz < 1:
        k = min(1, (1 - (dx * dx + dz * dz)) * 3)
        c = c.lerp(Vector((0.86, 0.55, 0.55)), k * 0.85)
    # Uñas algo más claras y plantas/cuello sin cambios.
    return tuple(c)


color_vertices(cuerpo, "Pintura", piel_color)
mat_piel = material("Piel", PIEL, 0.55, sss=0.25, atributo="Pintura")
cuerpo.data.materials.append(mat_piel)
subdividir(cuerpo)

# Ojos propios: esfera con esclerótica, iris verde, pupila y córnea brillante.
mat_blanco = material("Ojo_blanco", srgb("#F6F2EC"), 0.3)
mat_iris = material("Ojo_iris", srgb("#3F8A4E"), 0.25)
mat_pupila = material("Ojo_pupila", srgb("#0E0B0A"), 0.2)
mat_cornea = bpy.data.materials.new("Cornea")
mat_cornea.use_nodes = True
cb = mat_cornea.node_tree.nodes["Principled BSDF"]
cb.inputs["Transmission Weight"].default_value = 1.0
cb.inputs["Roughness"].default_value = 0.02
cb.inputs["IOR"].default_value = 1.38
cb.inputs["Alpha"].default_value = 0.15
mat_cornea.surface_render_method = "BLENDED"
for lado in "lr":
    centro = Vector(JB[f"{lado}-eye"])
    ids = verts_de(f"helper-{lado}-eye")
    radio = float(np.mean(np.linalg.norm(VB[ids] - np.array(centro), axis=1)))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=72, v_segments=56, radius=radio)
    me = bpy.data.meshes.new(f"Ojo_{lado}")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(f"Ojo_{lado}", me)
    coleccion["Cara"].objects.link(ob)
    ob.location = centro
    # Mirada ligeramente hacia dentro y al frente (−Y).
    for m in (mat_blanco, mat_iris, mat_pupila):
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
        n = p.center.normalized()
        ang = math.acos(max(-1, min(1, -n.y)))
        p.material_index = 2 if ang < 0.21 else 1 if ang < 0.52 else 0
    # Córnea abombada encima del iris.
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=radio * 1.04)
    me2 = bpy.data.meshes.new(f"Cornea_{lado}")
    bm.to_mesh(me2)
    bm.free()
    c2 = bpy.data.objects.new(f"Cornea_{lado}", me2)
    coleccion["Cara"].objects.link(c2)
    c2.location = centro
    me2.materials.append(mat_cornea)
    for p in me2.polygons:
        p.use_smooth = True

# Pestañas (las de MakeHuman) en marrón muy oscuro.
pest, _ = malla_de_grupos("Pestanas", [g for g in grupos if "eyelashes-1" in g], "Cara", sin_uv=True)
pest.hide_render = True  # las de MakeHuman son tarjetas gruesas: se sustituyen por una línea de párpado
pest.data.materials.append(material("Pestanas", srgb("#2A1810"), 0.6))
for p in pest.data.polygons:
    p.use_smooth = True

# Cejas: tiras curvas apoyadas en la frente (proyectadas sobre la piel).
deps = bpy.context.evaluated_depsgraph_get()
mat_ceja = material("Cejas", srgb("#6E3220"), 0.7)


def sobre_piel(x, z, lejos=0.3):
    """Punto de la piel delantera en (x, z) lanzando un rayo desde delante."""
    origen = Vector((x, -lejos, z))
    ok, loc, nor, _ = cuerpo.ray_cast(origen, Vector((0, 1, 0)))
    return (loc, nor) if ok else (None, None)


for s in (-1, 1):
    cx = s * abs(JB["l-eye"][0])
    pts = []
    for i in range(9):
        t = i / 8
        x = cx + s * (-0.017 + 0.036 * t)
        z = ojo_z + 0.018 + 0.006 * math.sin(math.pi * min(1, t * 1.15)) - 0.002 * t
        loc, nor = sobre_piel(x, z)
        if loc:
            pts.append((loc + nor * 0.0012, 0.0019 * (1 - 0.55 * t) + 0.0008))
    cu = bpy.data.curves.new(f"Ceja_{'l' if s > 0 else 'r'}", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 1
    cu.bevel_resolution = 2
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, (loc, r) in zip(sp.points, pts):
        p.co = (*loc, 1)
        p.radius = r
    ob = bpy.data.objects.new(cu.name, cu)
    ob.scale = (1, 1, 1)
    cu.materials.append(mat_ceja)
    coleccion["Cara"].objects.link(ob)

# ── 6. Pelo: casquete + mechones con volumen ───────────────────────────

centro_c = Vector(JB["head"]) + Vector((0, -0.005, 0.045))
ids_cab = [i for i in idx_cuerpo if VB[i][2] > JB["neck"][2] + 0.035]
radio_c = float(np.percentile([np.linalg.norm(VB[i] - np.array(centro_c)) for i in ids_cab], 92))
print("cabeza", centro_c, radio_c)
PELO = srgb("#9C3B22")
PELO_CLARO = srgb("#C9653A")
mat_pelo = material("Pelo", PELO, 0.42, sheen=0.4, atributo="Pelo")


def linea_pelo(d):
    """¿Está la dirección d (desde el centro de la cabeza) dentro de la zona con pelo?"""
    if d.y < -0.25:  # frente
        return d.z > 0.38
    if abs(d.x) > 0.55 and d.y < 0.15:  # sienes, sobre las orejas
        return d.z > 0.12
    return d.z > -0.55  # nuca


# Casquete: la piel de la cabeza dentro de la línea del pelo, desplazada hacia fuera.
bm = bmesh.new()
bm.from_mesh(cuerpo.data)
borrar = [v for v in bm.verts if not (v.co.z > JB["neck"][2] and linea_pelo((v.co - centro_c).normalized()))]
bmesh.ops.delete(bm, geom=borrar, context="VERTS")
for v in bm.verts:
    v.co += v.normal * 0.0055
me = bpy.data.meshes.new("Pelo_casquete")
bm.to_mesh(me)
bm.free()
casquete = bpy.data.objects.new("Pelo_casquete", me)
coleccion["Pelo"].objects.link(casquete)
casquete.data.materials.append(mat_pelo)
color_vertices(casquete, "Pelo", lambda co, no: (0.92, 0.92, 0.92))
for p in casquete.data.polygons:
    p.use_smooth = True
sol = casquete.modifiers.new("Grosor", "SOLIDIFY")
sol.thickness = 0.004
subdividir(casquete)

# Mechones: curvas con sección aplanada, de la raíz a la punta, en media melena ondulada
# con raya a un lado y flequillo ladeado.
perfil = bpy.data.curves.new("Perfil_mechon", "CURVE")
perfil.dimensions = "2D"
sp = perfil.splines.new("BEZIER")
sp.bezier_points.add(3)
for p, (x, y) in zip(sp.bezier_points, [(1, 0), (0, 0.5), (-1, 0), (0, -0.5)]):
    p.co = (x, y, 0)
    p.handle_left_type = p.handle_right_type = "AUTO"
sp.use_cyclic_u = True
perfil_ob = bpy.data.objects.new("Perfil_mechon", perfil)
coleccion["Pelo"].objects.link(perfil_ob)
perfil_ob.hide_render = True
perfil_ob.hide_viewport = True

rng = np.random.default_rng(7)
RAYA = 0.32  # la raya cae a la derecha del personaje (x < 0 en Blender = su derecha… izquierda del espectador)


def dir_sph(az, el):
    return Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))


mechones = []
# Raíces repartidas sobre el cuero cabelludo (Fibonacci) dentro de la línea del pelo.
N = 170
for i in range(N):
    zz = 1 - (i + 0.5) / N * 1.6
    if zz < -0.6:
        continue
    r = math.sqrt(max(0, 1 - zz * zz))
    phi = i * 2.399963
    d = Vector((r * math.cos(phi), r * math.sin(phi), zz))
    if not linea_pelo(d):
        continue
    az = math.atan2(d.x, -d.y)  # 0 al frente, + hacia la izquierda del personaje (x+)
    el = math.asin(max(-1, min(1, d.z)))
    frente = abs(az) < 0.95 and el > 0.25
    lado = 1 if (math.sin(az) * math.cos(el) > -RAYA * 0.3) else -1
    pts = []
    if frente:
        # Flequillo: barre hacia el lado contrario a la raya y cae a la altura de la ceja.
        az_fin = az + 1.25 * (1 if az > -0.2 else 0.6)
        el_fin = 0.3 + rng.uniform(-0.04, 0.04)
    else:
        az_fin = az * 1.04 + lado * 0.12
        el_fin = -0.78 + rng.uniform(-0.08, 0.06)
    M = 14
    for k in range(M):
        t = k / (M - 1)
        a = az + (az_fin - az) * (t ** 0.9)
        e = el + (el_fin - el) * t
        # Volumen: el mechón se separa de la cabeza y se ahueca abajo (melena con cuerpo).
        rad = radio_c * (1.03 + 0.12 * math.sin(math.pi * min(1, t * 1.2)) + (0.16 * t * t if not frente else 0.03 * t))
        p = Vector(centro_c) + dir_sph(a, e) * rad
        if not frente and e < -0.2:
            # Por debajo de la oreja cae casi recto y ondula.
            p.z = Vector(centro_c).z + math.sin(e) * radio_c * (1.05 + 0.25 * t)
            p += Vector((math.sin(a), -math.cos(a), 0)) * (0.006 * math.sin(t * 9 + i))
        grosor = (0.024 if not frente else 0.019) * (1 - 0.75 * t ** 1.6) + 0.002
        pts.append((p, grosor))
    mechones.append(pts)

cu = bpy.data.curves.new("Pelo_mechones", "CURVE")
cu.dimensions = "3D"
cu.bevel_mode = "OBJECT"
cu.bevel_object = perfil_ob
cu.use_fill_caps = True
cu.resolution_u = 3
for pts in mechones:
    sp = cu.splines.new("NURBS")
    sp.points.add(len(pts) - 1)
    for p, (loc, r) in zip(sp.points, pts):
        p.co = (*loc, 1)
        p.radius = r
    sp.order_u = 4
    sp.use_endpoint_u = True
pelo = bpy.data.objects.new("Pelo_mechones", cu)
coleccion["Pelo"].objects.link(pelo)
cu.materials.append(mat_pelo)
# Convertir a malla para poder pintar el degradado raíz→punta y exportar.
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()
me = bpy.data.meshes.new_from_object(pelo.evaluated_get(deps))
pelo_m = bpy.data.objects.new("Pelo", me)
coleccion["Pelo"].objects.link(pelo_m)
bpy.data.objects.remove(pelo)
for p in me.polygons:
    p.use_smooth = True
zmin = min(v.co.z for v in me.vertices)
zmax = max(v.co.z for v in me.vertices)
color_vertices(pelo_m, "Pelo", lambda co, no: tuple(Vector((0.85, 0.85, 0.85)).lerp(Vector((1.25, 1.18, 1.12)), (zmax - co.z) / (zmax - zmin) * 0.8)))

# ── 7. Ropa: camiseta, vaqueros y zapatillas (prendas con grosor) ───────

hombroL = Vector(JB["l-shoulder"])
codoL = Vector(JB["l-elbow"])
rodillaL = Vector(JB["l-knee"])
tobilloL = Vector(JB["l-ankle"])
pelvisB = Vector(JB["pelvis"])
cuelloB = Vector(JB["neck"])


def a_lo_largo(co, a, b):
    ab = b - a
    return (co - a).dot(ab) / ab.length_squared


def prenda(nombre, dentro, empuje, grosor, mat, pintar=None):
    bm = bmesh.new()
    bm.from_mesh(cuerpo.data)
    fuera = [f for f in bm.faces if not all(dentro(v.co) for v in f.verts)]
    bmesh.ops.delete(bm, geom=fuera, context="FACES")
    sueltos = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=sueltos, context="VERTS")
    for v in bm.verts:
        v.co += v.normal * empuje(v.co)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nombre, me)
    coleccion["Ropa"].objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    if pintar:
        color_vertices(ob, "Tela", pintar)
    s = ob.modifiers.new("Grosor", "SOLIDIFY")
    s.thickness = grosor
    s.offset = 1
    subdividir(ob)
    return ob


def en_camiseta(co):
    if co.z > cuelloB.z - 0.035:
        return False
    # Escote redondo un poco abierto delante.
    if co.y < -0.02 and co.z > cuelloB.z - 0.085 and abs(co.x) < 0.075 - (cuelloB.z - 0.035 - co.z) * 0.2:
        return False
    if co.z < pelvisB.z + 0.07:
        return False
    for s in (-1, 1):
        h = Vector((s * hombroL.x, hombroL.y, hombroL.z))
        c = Vector((s * codoL.x, codoL.y, codoL.z))
        if s * co.x > s * h.x - 0.03:
            return a_lo_largo(co, h, c) < 0.42
    return True


TERRACOTA = srgb("#D8664A")
camiseta = prenda("Camiseta", en_camiseta, lambda co: 0.0045 + 0.004 * max(0, 1 - abs(co.z - (pelvisB.z + 0.2)) / 0.15), 0.0025,
                  material("Camiseta", TERRACOTA, 0.85, sheen=0.5, atributo="Tela"),
                  lambda co, no: (1, 1, 1) if co.z < cuelloB.z - 0.05 else (0.82, 0.82, 0.82))


def en_vaquero(co):
    if co.z > pelvisB.z + 0.1 or co.z < tobilloL.z + 0.045:
        return False
    # Solo cadera y piernas: las manos, en pose A, quedan a la altura de la cadera pero más abiertas.
    return abs(co.x) < abs(JB["l-upper-leg"][0]) + 0.16


VAQUERO = srgb("#5F86B8")


def pintura_vaquero(co, no):
    # Costuras laterales y desgaste más claro en muslos y rodillas.
    c = Vector((1, 1, 1))
    for s in (-1, 1):
        rod = Vector((s * rodillaL.x, rodillaL.y, rodillaL.z))
        if co.y < rod.y and abs(co.z - rod.z) < 0.08:
            c *= 1.12
    if abs(co.y) < 0.01 and co.z < pelvisB.z - 0.05:
        c *= 0.85
    if co.z < tobilloL.z + 0.09:
        c *= 0.92
    return tuple(min(1, x) for x in c)


vaqueros = prenda("Vaqueros", en_vaquero, lambda co: 0.0035 + (0.004 if co.z < rodillaL.z else 0), 0.003,
                  material("Vaqueros", VAQUERO, 0.8, sheen=0.25, atributo="Tela"), pintura_vaquero)
def en_zapatilla(co):
    return co.z < tobilloL.z + 0.03


def pintura_zapatilla(co, no):
    if co.z < 0.022:
        return (0.95, 0.93, 0.88)  # suela
    if co.z < 0.034:
        return (0.55, 0.3, 0.25)  # franja
    return (1, 1, 1)


zapatillas = prenda("Zapatillas", en_zapatilla, lambda co: 0.011 + (0.007 if co.z < 0.02 else 0), 0.005,
                    material("Zapatillas", srgb("#F3F1EC"), 0.6, atributo="Tela"), pintura_zapatilla)

# Ocultar la piel bajo la ropa (evita que asome y aligera el modelo).
bm = bmesh.new()
bm.from_mesh(cuerpo.data)
# Margen generoso: solo se borra la piel que queda claramente dentro de cada prenda.
limite_x = abs(JB["l-upper-leg"][0]) + 0.08
tapadas = [f for f in bm.faces if all(
    (en_camiseta(v.co) and cuelloB.z - 0.09 > v.co.z > pelvisB.z + 0.16 and abs(v.co.x) < abs(hombroL.x) - 0.02)
    or (en_vaquero(v.co) and pelvisB.z - 0.03 > v.co.z > tobilloL.z + 0.1 and abs(v.co.x) < limite_x)
    or (en_zapatilla(v.co) and v.co.z < tobilloL.z - 0.01)
    for v in f.verts)]
bmesh.ops.delete(bm, geom=tapadas, context="FACES")
bm.to_mesh(cuerpo.data)
bm.free()

# ── 8. Luces, fondo y cámaras ──────────────────────────────────────────

esc.render.engine = "CYCLES"
esc.cycles.device = "CPU"
esc.cycles.samples = A.muestras
esc.cycles.use_denoising = True
esc.view_settings.view_transform = "AgX"
esc.view_settings.look = "AgX - Medium High Contrast"
mundo = bpy.data.worlds.new("Mundo")
esc.world = mundo
mundo.use_nodes = True
mundo.node_tree.nodes["Background"].inputs["Color"].default_value = (0.82, 0.86, 0.92, 1)
mundo.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55


def luz(nombre, tipo, energia, loc, mira, tam=1.0, color=(1, 1, 1)):
    d = bpy.data.lights.new(nombre, tipo)
    d.energy = energia
    d.color = color
    if tipo == "AREA":
        d.size = tam
    ob = bpy.data.objects.new(nombre, d)
    coleccion["Luces"].objects.link(ob)
    ob.location = loc
    dirr = Vector(mira) - Vector(loc)
    ob.rotation_euler = dirr.to_track_quat("-Z", "Y").to_euler()
    return ob


luz("Clave", "AREA", 260, (-1.6, -2.4, 2.6), (0, 0, 1.2), 1.6, (1.0, 0.95, 0.88))
luz("Relleno", "AREA", 90, (2.2, -1.8, 1.4), (0, 0, 1.1), 2.0, (0.85, 0.9, 1.0))
luz("Contra", "AREA", 160, (0.6, 2.2, 2.4), (0, 0, 1.4), 1.2, (1.0, 0.92, 0.85))
# Suelo suave para la sombra de contacto.
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
suelo_ob = bpy.context.active_object
suelo_ob.name = "Suelo"
suelo_ob.data.materials.append(material("Suelo", srgb("#E7E3DC"), 0.9))

ALTO = float(max(VB[:, 2]))
cabeza_c = Vector((0, 0, ALTO - 0.11))


def camara(nombre, loc, mira, lente=50):
    d = bpy.data.cameras.new(nombre)
    d.lens = lente
    ob = bpy.data.objects.new(nombre, d)
    coleccion["Camaras"].objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(mira) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


VISTAS = {
    "frente": (camara("Cam_frente", (0, -4.2, 0.95), (0, 0, 0.86), 50), 900, 1200),
    "lado": (camara("Cam_lado", (4.2, 0, 0.95), (0, 0, 0.86), 50), 900, 1200),
    "tres_cuartos": (camara("Cam_tres_cuartos", (-2.4, -3.4, 1.15), (0, 0, 0.88), 50), 900, 1200),
    "cuerpo": (camara("Cam_cuerpo", (1.9, -3.0, 1.6), (0, 0, 0.82), 42), 900, 1200),
    "cara": (camara("Cam_cara", (-0.32, -0.95, ALTO - 0.06), tuple(cabeza_c), 85), 1000, 1000),
}

blend = os.path.join(A.salida, "personaje_base.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("guardado", blend)
for nombre in A.vistas.split(","):
    cam, w, h = VISTAS[nombre]
    esc.camera = cam
    esc.render.resolution_x = w
    esc.render.resolution_y = h
    esc.render.filepath = os.path.join(A.salida, f"render_{nombre}.png")
    bpy.ops.render.render(write_still=True)
    print("render", nombre)
