"""
Utilidades comunes para modelar edificios singulares y su entorno directamente en Blender (bpy).

Se trabaja en coordenadas del juego (x hacia el este, y hacia el SUR, z altura; 1 unidad = 1 m) y
cada vértice se pasa a Blender con  X = x − ox,  Y = −(y − oy),  Z = z.  El exportador glTF (Y arriba)
lo devuelve al sistema del juego: (x − ox, z, y − oy).

Cada pieza (fachada, columnas, césped, farolas…) es un objeto de Blender propio, con nombre, materiales
con textura y UV, para poder editarla a mano en el .blend. Los objetos cuelgan de un vacío por
«edificio y nivel» (`<id>__LOD0`, `<id>__LOD1`) con las propiedades `edificio_id` y `lod`, que el juego
usa para montar su THREE.LOD (src/mundo/ciudad/modelosBlender.ts).
"""
import json
import math
import os
import subprocess
import time

import bmesh
import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def ruta(*p):
    q = os.path.join(RAIZ, *p)
    os.makedirs(os.path.dirname(q), exist_ok=True)
    return q


def srgb_lineal(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def color(h):
    h = h.lstrip("#")
    return tuple(srgb_lineal(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))


# ── Materiales ───────────────────────────────────────────────────────

class Materiales:
    def __init__(self, metros):
        self.m = {}
        self.metros = metros  # metros que cubre la textura de cada material (para las UV)

    def nuevo(self, nombre, hex_color="#FFFFFF", rugosidad=0.8, metal=0.0, textura=None, metros=None, emisivo=None, vertice=False):
        m = bpy.data.materials.new(nombre)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        bsdf.inputs["Roughness"].default_value = rugosidad
        bsdf.inputs["Metallic"].default_value = metal
        if textura is not None:
            t = nt.nodes.new("ShaderNodeTexImage")
            t.image = textura
            nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
        elif vertice:
            ca = nt.nodes.new("ShaderNodeVertexColor")
            ca.layer_name = "Col"
            nt.links.new(ca.outputs["Color"], bsdf.inputs["Base Color"])
        else:
            bsdf.inputs["Base Color"].default_value = (*color(hex_color), 1)
        m.diffuse_color = (*color(hex_color), 1)  # color en la vista de Blender (Workbench)
        if emisivo:
            bsdf.inputs["Emission Color"].default_value = (*color(emisivo[0]), 1)
            bsdf.inputs["Emission Strength"].default_value = emisivo[1]
        self.m[nombre] = m
        self.metros[nombre] = metros or self.metros.get(nombre, 2.0)
        return m


# ── Constructor de piezas ────────────────────────────────────────────

class Pieza:
    """Malla de una pieza: polígonos con material, UV planas en metros y color por vértice opcional."""

    def __init__(self, nombre, origen, mats):
        self.nombre = nombre
        self.ox, self.oy = origen
        self.mats = mats
        self.v = []
        self.f = []  # (índices, material, color, uv)

    def b(self, p):
        return Vector((p[0] - self.ox, -(p[1] - self.oy), p[2] if len(p) > 2 else 0.0))

    def poli(self, pts, mat, normal=None, col=(1, 1, 1)):
        """pts en coordenadas del juego; normal (juego) para orientar la cara hacia fuera."""
        P = [self.b(p) for p in pts]
        if len(P) < 3:
            return
        n = Vector((0, 0, 0))
        for i in range(len(P)):  # normal de Newell (vale para polígonos no convexos)
            a, c = P[i], P[(i + 1) % len(P)]
            n += Vector(((a.y - c.y) * (a.z + c.z), (a.z - c.z) * (a.x + c.x), (a.x - c.x) * (a.y + c.y)))
        if n.length < 1e-10:
            return
        if normal is not None:
            nb = Vector((normal[0], -normal[1], normal[2]))
            if n.dot(nb) < 0:
                P.reverse()
                n = -n
        n.normalize()
        esc = 1.0 / self.mats.metros.get(mat, 2.0)
        if abs(n.z) > 0.7:
            uv = [(p.x * esc, p.y * esc) for p in P]
        else:
            t = Vector((-n.y, n.x, 0)).normalized()
            uv = [(p.dot(t) * esc, p.z * esc) for p in P]
        i0 = len(self.v)
        self.v.extend(P)
        self.f.append((tuple(range(i0, i0 + len(P))), mat, col, uv))

    def tapa(self, poly, z, mat, arriba=True, col=(1, 1, 1)):
        """Polígono horizontal (puede ser cóncavo) triangulado."""
        pts = [Vector((p[0], p[1], z)) for p in poly]
        for tri in tessellate_polygon([pts]):
            self.poli([pts[k] for k in tri], mat, (0, 0, 1 if arriba else -1), col)

    def muro(self, a, b, z0, z1, mat, fuera, col=(1, 1, 1)):
        """Paño vertical entre a y b (juego); `fuera` = punto hacia el que mira."""
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        n = (fuera[0] - m[0], fuera[1] - m[1], 0)
        self.poli([(a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1), (a[0], a[1], z1)], mat, n, col)

    def prisma(self, poly, z0, z1, mat, mat_tapa=None, tapa=True, base=False, col=(1, 1, 1)):
        ccw = area(poly) > 0
        for i in range(len(poly)):
            a, b = poly[i], poly[(i + 1) % len(poly)]
            dx, dy = b[0] - a[0], b[1] - a[1]
            # En el juego (y al sur), un polígono con área positiva gira en sentido horario visto desde arriba.
            n = (dy, -dx, 0) if ccw else (-dy, dx, 0)
            self.poli([(a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1), (a[0], a[1], z1)], mat, n, col)
        if tapa:
            self.tapa(poly, z1, mat_tapa or mat, True, col)
        if base:
            self.tapa(poly, z0, mat_tapa or mat, False, col)

    def caja(self, c, rumbo, largo, ancho, z0, z1, mat, col=(1, 1, 1), base=False):
        """Caja orientada: centro c (x, y), `rumbo` = ángulo (rad) de su eje largo."""
        ux, uy = math.cos(rumbo), math.sin(rumbo)
        vx, vy = -uy, ux
        l, a = largo / 2, ancho / 2
        poly = [(c[0] + ux * sl * l + vx * sa * a, c[1] + uy * sl * l + vy * sa * a) for sl, sa in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        self.prisma(poly, z0, z1, mat, base=base, col=col)

    def cilindro(self, c, r, z0, z1, mat, n=12, tapa=True, r1=None, col=(1, 1, 1)):
        r1 = r if r1 is None else r1
        for k in range(n):
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            am = (a0 + a1) / 2
            self.poli([(c[0] + math.cos(a0) * r, c[1] + math.sin(a0) * r, z0), (c[0] + math.cos(a1) * r, c[1] + math.sin(a1) * r, z0),
                       (c[0] + math.cos(a1) * r1, c[1] + math.sin(a1) * r1, z1), (c[0] + math.cos(a0) * r1, c[1] + math.sin(a0) * r1, z1)],
                      mat, (math.cos(am), math.sin(am), 0), col)
        if tapa and r1 > 0:
            self.tapa([(c[0] + math.cos(2 * math.pi * k / n) * r1, c[1] + math.sin(2 * math.pi * k / n) * r1) for k in range(n)], z1, mat, True, col)

    def esfera(self, c, r, mat, n=10, achatar=1.0, col=(1, 1, 1)):
        """Esfera de baja resolución (c = (x, y, z)); `achatar` escala la altura."""
        anillos = max(4, n // 2)
        for i in range(anillos):
            t0, t1 = math.pi * i / anillos, math.pi * (i + 1) / anillos
            for k in range(n):
                a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
                q = lambda t, a: (c[0] + r * math.sin(t) * math.cos(a), c[1] + r * math.sin(t) * math.sin(a), c[2] + r * math.cos(t) * achatar)  # noqa: E731
                pts = [q(t0, a0), q(t1, a0), q(t1, a1), q(t0, a1)]
                if i == 0:
                    pts = [pts[0], pts[1], pts[2]]
                elif i == anillos - 1:
                    pts = [pts[0], pts[1], pts[3]]
                tm, am = (t0 + t1) / 2, (a0 + a1) / 2
                self.poli(pts, mat, (math.sin(tm) * math.cos(am), math.sin(tm) * math.sin(am), math.cos(tm)), col)

    def tubo(self, a, b, r, mat, n=6, col=(1, 1, 1)):
        """Barra cilíndrica entre dos puntos 3D (juego)."""
        A, B = Vector(a), Vector(b)
        d = (B - A).normalized()
        e = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = d.cross(e).normalized()
        v = d.cross(u)
        for k in range(n):
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            o0 = (u * math.cos(a0) + v * math.sin(a0)) * r
            o1 = (u * math.cos(a1) + v * math.sin(a1)) * r
            om = (u * math.cos((a0 + a1) / 2) + v * math.sin((a0 + a1) / 2))
            self.poli([A + o0, A + o1, B + o1, B + o0], mat, tuple(om), col)

    def triangulos(self):
        return sum(len(f[0]) - 2 for f in self.f)

    def objeto(self, coleccion, padre=None):
        me = bpy.data.meshes.new(self.nombre)
        me.from_pydata([tuple(v) for v in self.v], [], [f[0] for f in self.f])
        usados = []
        for f in self.f:
            if f[1] not in usados:
                usados.append(f[1])
        for nm in usados:
            me.materials.append(self.mats.m[nm])
        uvl = me.uv_layers.new(name="UVMap")
        col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
        for i, p in enumerate(me.polygons):
            idx, mat, c, uv = self.f[i]
            p.material_index = usados.index(mat)
            for k, li in enumerate(p.loop_indices):
                uvl.data[li].uv = uv[k]
                col.data[li].color = (c[0], c[1], c[2], 1.0)
        me.validate()
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = False
        me.update()
        ob = bpy.data.objects.new(self.nombre, me)
        coleccion.objects.link(ob)
        if padre is not None:
            ob.parent = padre
        return ob


def area(poly):
    return sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))) / 2


def arco(C, r, a0, a1, pasos):
    """Puntos de un arco (ángulos en grados, en el sistema del juego)."""
    return [(C[0] + r * math.cos(math.radians(a0 + (a1 - a0) * k / pasos)), C[1] + r * math.sin(math.radians(a0 + (a1 - a0) * k / pasos))) for k in range(pasos + 1)]


def sector(P, C, r0, r1, a0, a1, z, mat, pasos, borde=None, col=(1, 1, 1)):
    """Corona circular horizontal a la altura z (con bordes verticales hasta 0 si `borde`)."""
    A = arco(C, r0, a0, a1, pasos)
    B = arco(C, r1, a0, a1, pasos)
    for k in range(pasos):
        P.poli([(*A[k], z), (*A[k + 1], z), (*B[k + 1], z), (*B[k], z)], mat, (0, 0, 1), col)
    if borde:
        for k in range(pasos):
            P.muro(B[k], B[k + 1], 0, z, borde, (2 * B[k][0] - C[0], 2 * B[k][1] - C[1]), col)
            P.muro(A[k], A[k + 1], 0, z, borde, C if r0 > 0.01 else A[k], col)
        P.muro(A[0], B[0], 0, z, borde, _lado(C, a0, -1), col)
        P.muro(A[-1], B[-1], 0, z, borde, _lado(C, a1, 1), col)


def _lado(C, a, s):
    t = math.radians(a + s * 90)
    return (C[0] + math.cos(math.radians(a)) * 10 + math.cos(t) * 50, C[1] + math.sin(math.radians(a)) * 10 + math.sin(t) * 50)


def texto(nombre, cadena, base, rumbo, alto, mat, coleccion, padre, origen, z, prof=0.03, alinear="CENTER"):
    """Letras en 3D (fuente integrada de Blender) sobre un muro: `base` = punto (juego) donde va el
    centro del texto, `rumbo` = dirección (rad, juego) hacia la que se lee."""
    cu = bpy.data.curves.new(nombre, "FONT")
    cu.body = cadena
    cu.size = alto
    cu.extrude = prof / 2
    cu.align_x = alinear
    cu.align_y = "BOTTOM"
    ob = bpy.data.objects.new(nombre + "_curva", cu)
    coleccion.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    me.materials.clear()
    me.materials.append(mat)
    m = bpy.data.objects.new(nombre, me)
    coleccion.objects.link(m)
    m.parent = padre
    # Texto en el plano XZ, mirando hacia −Y de Blender; se gira para que mire hacia fuera del muro.
    m.rotation_euler = (math.pi / 2, 0, -rumbo)
    m.location = (base[0] - origen[0], -(base[1] - origen[1]), z)
    return m


def vacio(nombre, coleccion, props):
    ob = bpy.data.objects.new(nombre, None)
    coleccion.objects.link(ob)
    for k, v in props.items():
        ob[k] = v
    return ob


def camara(nombre, pos, mira, lente=24):
    cam = bpy.data.cameras.new(nombre)
    cam.lens = lente
    cam.clip_end = 2000
    ob = bpy.data.objects.new(nombre, cam)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = pos
    ob.rotation_euler = (Vector(mira) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    return ob


def renderizar(nombre, vistas, origen, ocultar=lambda ob: False, ancho=1100, alto=760, carpeta="singulares", color="TEXTURE"):
    """Renders de validación con Workbench (texturas y sombras). Posiciones en coordenadas del juego."""
    s = bpy.context.scene
    s.render.engine = "BLENDER_WORKBENCH"
    s.display.shading.light = "STUDIO"
    s.display.shading.color_type = color
    s.display.shading.show_shadows = True
    s.display.shading.shadow_intensity = 0.45
    s.display.shading.show_cavity = True
    s.display.shading.cavity_type = "WORLD"
    s.display.shading.show_specular_highlight = True
    s.render.resolution_x = ancho
    s.render.resolution_y = alto
    s.world = s.world or bpy.data.worlds.new("Mundo")
    s.world.color = (0.55, 0.72, 0.92)
    for ob in s.objects:
        ob.hide_render = ocultar(ob)
    b = lambda p: (p[0] - origen[0], -(p[1] - origen[1]), p[2])  # noqa: E731
    out = []
    for nv, pos, mira, lente in vistas:
        s.camera = camara(f"Cam_{nv}", b(pos), b(mira), lente)
        f = ruta("city-reconstruction", "blender", "render", carpeta, f"{nombre}-{nv}.png")
        s.render.filepath = f
        bpy.ops.render.render(write_still=True)
        out.append(os.path.relpath(f, RAIZ))
    return out


def exportar(nombre, glb_rel, carpeta="singulares"):
    """Guarda el .blend editable y exporta el GLB optimizado (meshopt) para el juego."""
    bpy.context.preferences.filepaths.save_version = 0
    blend = ruta("city-reconstruction", "blender", "blend", carpeta, f"{nombre}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    for ob in bpy.context.scene.objects:
        ob.select_set(ob.type in ("MESH", "EMPTY") and not ob.get("solo_validacion"))
    crudo = ruta("city-reconstruction", "blender", "blend", carpeta, f"{nombre}.crudo.glb")
    bpy.ops.export_scene.gltf(filepath=crudo, export_format="GLB", use_selection=True, export_extras=True, export_yup=True,
                              export_apply=False, export_vertex_color="MATERIAL", export_image_format="JPEG", export_jpeg_quality=82)
    glb = ruta("public", glb_rel)
    subprocess.run(["npx", "--no-install", "gltf-transform", "optimize", crudo, glb, "--compress", "meshopt", "--texture-compress", "false",
                    "--simplify", "false", "--join", "false", "--instance", "false", "--flatten", "false", "--prune", "false"], cwd=RAIZ, check=True, capture_output=True)
    os.remove(crudo)
    return os.path.relpath(blend, RAIZ), glb


def registrar(lote, glb_rel, origen, edificios, informe):
    """Actualiza el índice que lee el juego, el registro de modelos y el informe del singular."""
    idx_f = ruta("src", "datos", "modelos", "indice.json")
    idx = json.load(open(idx_f)) if os.path.exists(idx_f) else {"lotes": {}}
    idx["lotes"][lote] = {"glb": glb_rel, "origen": list(origen), "edificios": edificios, "generador": 1, "singular": True}
    json.dump(idx, open(idx_f, "w"), ensure_ascii=False, indent=1)
    reg_f = ruta("city-reconstruction", "blender", "registro.json")
    reg = json.load(open(reg_f)) if os.path.exists(reg_f) else {"edificios": {}}
    for e in edificios:
        reg["edificios"][e] = {"lote": lote, "generador": "singular", "fecha": time.strftime("%Y-%m-%d"), "triangulos_lod0": informe.get("triangulos_lod0"), "problemas": informe.get("problemas", [])}
    json.dump(reg, open(reg_f, "w"), ensure_ascii=False, indent=1)
    json.dump(informe, open(ruta("city-reconstruction", "blender", "informes", f"{lote}.json"), "w"), ensure_ascii=False, indent=1)
