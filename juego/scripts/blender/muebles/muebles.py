"""
Biblioteca de muebles de las viviendas (Hogar Linense), modelada en Blender.

  /opt/blender-venv/bin/python scripts/blender/muebles/muebles.py
Crea  city-reconstruction/blender/blend/muebles/muebles.blend   (un objeto por mueble, editable)
      public/modelos/muebles/muebles.glb                         (lo carga src/interior/modelos.ts)
      city-reconstruction/blender/render/muebles/catalogo.png     (validación)

Convención (la del juego): medidas del catálogo (src/compartido/hogar/catalogo.ts) × 0,5 m; origen
abajo en el centro; frente hacia +y (en three.js, +z); las piezas de pared tienen la espalda en −d/2.
Materiales recoloreables por el juego: «Principal» (liso) y «PrincipalMadera» (veta × color del
catálogo). Mallas con nombre especial: «pantalla» (tele, ordenador) y «pantallaLuz» (lámparas).
Las formas siguen el mueble tipo de cada clase (proporciones, biseles, cojines, patas, tiradores):
no reproducen ningún producto concreto.
"""
import math
import os
import re
import sys

import bpy
import bmesh  # noqa: E402 (después de bpy)
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "singulares"))
import base as B  # noqa: E402
import texturas as T  # noqa: E402


# ── Texturas propias de interior ─────────────────────────────────────

def veta(nombre, base, n=512, semilla=31):
    """Madera clara con vetas (se multiplica por el color del catálogo)."""
    rng = np.random.default_rng(semilla)
    yy, xx = np.mgrid[0:n, 0:n] / n
    ruido = T._fbm(rng, n, (2, 4, 8, 16), (0.5, 0.25, 0.15, 0.1))
    # Vetas finas a lo largo de x, apenas onduladas, y fibra en líneas.
    anillos = np.sin((yy * 38 + ruido * 1.2) * 2 * np.pi) * 0.5 + 0.5
    fibra = np.repeat((rng.random((n, 1)) - 0.5), n, axis=1) * 0.08
    c = T._hex(base)[None, None, :] * (0.9 + anillos[..., None] ** 3 * 0.1 + fibra[..., None] + (T._ruido(rng, n, 64)[..., None] - 0.5) * 0.05)
    return T._imagen(nombre, c, None)


def tela(nombre, base, n=256, semilla=32):
    """Tejido: trama fina y algo de irregularidad."""
    rng = np.random.default_rng(semilla)
    yy, xx = np.mgrid[0:n, 0:n]
    trama = ((xx % 4 < 2) ^ (yy % 4 < 2)) * 0.05
    c = T._hex(base)[None, None, :] * (0.9 + trama[..., None] + (T._fbm(rng, n)[..., None] - 0.5) * 0.08 + (rng.random((n, n, 1)) - 0.5) * 0.05)
    return T._imagen(nombre, c, None)


def libros(nombre, n=256, semilla=33):
    rng = np.random.default_rng(semilla)
    cols = [T._hex(h) for h in ("#8C2F2F", "#2F4F7C", "#3E6B4F", "#C9A64B", "#5B3B24", "#E6DCC8", "#2B2D31", "#9C5B8C")]
    c = np.zeros((n, n, 3))
    x = 0
    while x < n:
        w = int(rng.integers(6, 16))
        col = cols[int(rng.integers(len(cols)))] * (0.85 + rng.random() * 0.25)
        alto = int(n * (0.7 + rng.random() * 0.3))
        c[n - alto:, x:x + w] = col
        c[n - alto + 8:n - alto + 11, x:x + w] *= 0.6
        x += w + 1
    return T._imagen(nombre, c, None)


# ── Constructor ──────────────────────────────────────────────────────

class Mueble:
    """Partes de un mueble en coordenadas «de mueble»: x ancho, y hacia el frente, z arriba."""

    def __init__(self, nombre, mats):
        self.nombre = nombre
        self.mats = mats
        self.partes = []  # (bmesh, material, nombre_malla)

    def _poner(self, bm, mat, malla=None):
        # Del sistema del mueble (y al frente) al de Blender (frente en −Y: el glTF lo lleva a +z).
        bmesh.ops.transform(bm, matrix=Matrix.Scale(-1, 4, Vector((0, 1, 0))), verts=bm.verts)
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
        self.partes.append((bm, mat, malla))

    def caja(self, x, y, z, w, d, h, mat, r=0.0, malla=None, rot=0.0):
        """Caja de w × d × h con su base en z (centro x, y); r = bisel de las aristas."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(w, d, h), verts=bm.verts)
        r = min(r, w / 2 - 1e-3, d / 2 - 1e-3, h / 2 - 1e-3)
        if r > 0.002:
            bmesh.ops.bevel(bm, geom=list(bm.edges), offset=r, segments=2, affect="EDGES", profile=0.5)
        if rot:
            bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rot, 4, "Z"))
        bmesh.ops.translate(bm, vec=(x, y, z + h / 2), verts=bm.verts)
        self._poner(bm, mat, malla)

    def cil(self, x, y, z, r, h, mat, seg=16, r2=None, eje="Z", malla=None, tapa=True):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=tapa, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
        if eje == "X":
            bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 4, "Y"))
            bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
        elif eje == "Y":
            bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 4, "X"))
            bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
        else:
            bmesh.ops.translate(bm, vec=(x, y, z + h / 2), verts=bm.verts)
        self._poner(bm, mat, malla)

    def esfera(self, x, y, z, r, mat, sx=1.0, sy=1.0, sz=1.0, seg=12):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r)
        bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
        bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
        self._poner(bm, mat)

    def barra(self, a, b, r, mat, seg=8):
        A, Bv = Vector(a), Vector(b)
        L = (Bv - A).length
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=L)
        q = Vector((0, 0, 1)).rotation_difference((Bv - A).normalized())
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=q.to_matrix().to_4x4())
        bmesh.ops.translate(bm, vec=(A + Bv) / 2, verts=bm.verts)
        self._poner(bm, mat)

    def patas(self, w, d, h, mat, r=0.022, inset=0.06, conica=False):
        for sx in (-1, 1):
            for sy in (-1, 1):
                self.cil(sx * (w / 2 - inset), sy * (d / 2 - inset), 0, r, h, mat, seg=10, r2=r * 0.7 if conica else None)

    def objeto(self, col, padre):
        partes_por_malla = {}
        for bm, mat, malla in self.partes:
            partes_por_malla.setdefault(malla, []).append((bm, mat))
        obs = []
        for malla, lista in partes_por_malla.items():
            me = bpy.data.meshes.new(f"{self.nombre}_{malla or 'cuerpo'}")
            mats = []
            todo = bmesh.new()
            for bm, mat in lista:
                if mat not in mats:
                    mats.append(mat)
                idx = mats.index(mat)
                for f in bm.faces:
                    f.material_index = idx
                tmp = bpy.data.meshes.new("tmp")
                bm.to_mesh(tmp)
                todo.from_mesh(tmp)
                bpy.data.meshes.remove(tmp)
                bm.free()
            todo.to_mesh(me)
            todo.free()
            for m in mats:
                me.materials.append(self.mats[m])
            # UV en metros (proyección por caras) para vetas y tramas.
            uvl = me.uv_layers.new(name="UVMap")
            for p in me.polygons:
                n = p.normal
                for li in p.loop_indices:
                    v = me.vertices[me.loops[li].vertex_index].co
                    if abs(n.z) > 0.6:
                        uvl.data[li].uv = (v.x * 1.5, v.y * 1.5)
                    elif abs(n.x) > abs(n.y):
                        uvl.data[li].uv = (v.y * 1.5, v.z * 1.5)
                    else:
                        uvl.data[li].uv = (v.x * 1.5, v.z * 1.5)
            for p in me.polygons:
                p.use_smooth = False
            ob = bpy.data.objects.new(malla or f"{self.nombre}_cuerpo", me)
            col.objects.link(ob)
            ob.parent = padre
            obs.append(ob)
        return obs


# ── Muebles ──────────────────────────────────────────────────────────
# Cada función recibe (M, w, d, a) en metros; P = color del catálogo (liso), PM = madera × color.

def cama(M, w, d, a, tapizada=False):
    alto_somier = 0.32
    M.caja(0, 0, 0.06, w - 0.04, d - 0.06, alto_somier - 0.06, "PrincipalMadera" if not tapizada else "Principal", r=0.015)
    M.patas(w - 0.04, d - 0.06, 0.06, "MaderaOscura", r=0.03, inset=0.08)
    M.caja(0, 0.02, alto_somier, w - 0.1, d - 0.16, 0.2, "Colchon", r=0.05)
    # Edredón (recoloreado) que cae por los lados y almohadas.
    M.caja(0, 0.16, alto_somier + 0.12, w - 0.04, d - 0.42, 0.11, "Principal", r=0.05)
    n = 2 if w > 1.3 else 1
    for k in range(n):
        x = (k - (n - 1) / 2) * (w / n)
        M.caja(x, -d / 2 + 0.3, alto_somier + 0.2, w / n - 0.12, 0.34, 0.13, "Sabana", r=0.06)
    # Cabecero.
    if tapizada:
        M.caja(0, -d / 2 + 0.05, 0.06, w + 0.08, 0.1, max(1.1, a), "Principal", r=0.04)
        for k in range(int(w / 0.25)):
            M.caja(-w / 2 + 0.16 + k * 0.25, -d / 2 + 0.105, 0.5, 0.012, 0.01, max(1.1, a) - 0.55, "Sombra")
    else:
        M.caja(0, -d / 2 + 0.03, 0.06, w + 0.02, 0.05, 0.95, "PrincipalMadera", r=0.012)


def mesita(M, w, d, a):
    M.caja(0, 0, 0.08, w - 0.06, d - 0.08, a - 0.08, "PrincipalMadera", r=0.012)
    M.patas(w - 0.06, d - 0.08, 0.08, "MaderaOscura", r=0.016, inset=0.04, conica=True)
    for k, z in enumerate((0.16, 0.36)):
        if z + 0.18 > a:
            break
        M.caja(0, d / 2 - 0.035, z, w - 0.12, 0.012, 0.16, "PrincipalMadera", r=0.004)
        M.caja(0, d / 2 - 0.02, z + 0.08, 0.08, 0.02, 0.012, "Laton", r=0.004)


def armario(M, w, d, a, empotrado=False):
    M.caja(0, 0, 0, w - 0.02, d - 0.04, a, "PrincipalMadera", r=0.01)
    M.caja(0, 0, 0, w - 0.04, d - 0.06, 0.08, "Sombra")
    n = max(2, round(w / 0.5))
    for k in range(n):
        x0 = -w / 2 + 0.02 + k * (w - 0.04) / n
        x1 = x0 + (w - 0.04) / n
        M.caja((x0 + x1) / 2, d / 2 - 0.035, 0.1, x1 - x0 - 0.008, 0.016, a - 0.14, "PrincipalMadera", r=0.004)
        hx = x1 - 0.05 if k % 2 == 0 else x0 + 0.05
        if empotrado:
            M.caja(hx, d / 2 - 0.02, a * 0.45, 0.012, 0.02, 0.5, "Metal", r=0.004)
        else:
            M.cil(hx, d / 2 - 0.01, a * 0.52, 0.012, 0.02, "Laton", seg=8, eje="Y")
    M.caja(0, 0, a - 0.04, w, d - 0.02, 0.04, "PrincipalMadera", r=0.01)


def comoda(M, w, d, a):
    M.caja(0, 0, 0.1, w - 0.02, d - 0.04, a - 0.1, "PrincipalMadera", r=0.012)
    M.patas(w - 0.04, d - 0.06, 0.1, "MaderaOscura", r=0.02, inset=0.05, conica=True)
    filas = 3 if a > 0.7 else 2
    h = (a - 0.18) / filas
    for k in range(filas):
        z = 0.12 + k * h
        M.caja(0, d / 2 - 0.03, z + 0.01, w - 0.06, 0.012, h - 0.02, "PrincipalMadera", r=0.004)
        for sx in (-1, 1):
            M.cil(sx * w / 4, d / 2 - 0.01, z + h / 2, 0.016, 0.025, "Laton", seg=10, eje="Y")
    M.caja(0, 0, a - 0.025, w + 0.02, d, 0.025, "PrincipalMadera", r=0.006)


def sofa(M, w, d, a, chaise=False):
    asiento = 0.42
    M.caja(0, 0, 0.08, w, d, 0.2, "Principal", r=0.04)
    M.patas(w, d, 0.08, "MaderaOscura", r=0.02, inset=0.08, conica=True)
    # Brazos y respaldo acolchados.
    for s in (-1, 1):
        M.caja(s * (w / 2 - 0.1), 0, 0.08, 0.2, d, 0.55, "Principal", r=0.08)
    M.caja(0, -d / 2 + 0.11, 0.08, w - 0.04, 0.22, a - 0.08, "Principal", r=0.08)
    n = 3 if w > 1.6 else 2 if w > 1 else 1
    ancho = (w - 0.4) / n
    prof = d - 0.3 if not chaise else min(d, 1.0) - 0.3
    for k in range(n):
        x = -w / 2 + 0.2 + ancho * (k + 0.5)
        M.caja(x, 0.08, 0.28, ancho - 0.02, prof, 0.16, "Principal", r=0.06)
        M.caja(x, -d / 2 + 0.3, 0.42, ancho - 0.06, 0.18, a - 0.5, "Principal", r=0.08)
    if chaise:
        M.caja(w / 2 - 0.2 - ancho / 2, d / 2 - (d - 1.0) / 2, 0.28, ancho - 0.02, d - 1.0 + 0.2, 0.16, "Principal", r=0.06)
    # Cojines decorativos.
    M.caja(-w / 2 + 0.36, -d / 2 + 0.42, asiento + 0.02, 0.4, 0.14, 0.36, "Cojin", r=0.06, rot=0.12)


def sillon(M, w, d, a):
    M.caja(0, 0, 0.1, w - 0.04, d - 0.04, 0.22, "Principal", r=0.05)
    M.patas(w - 0.04, d - 0.04, 0.1, "MaderaOscura", r=0.02, inset=0.07, conica=True)
    for s in (-1, 1):
        M.caja(s * (w / 2 - 0.1), 0.02, 0.1, 0.18, d - 0.1, 0.52, "Principal", r=0.07)
        # Orejas.
        M.caja(s * (w / 2 - 0.12), -d / 2 + 0.14, a - 0.32, 0.16, 0.2, 0.3, "Principal", r=0.07)
    M.caja(0, -d / 2 + 0.1, 0.1, w - 0.06, 0.2, a - 0.1, "Principal", r=0.08)
    M.caja(0, 0.08, 0.32, w - 0.38, d - 0.3, 0.14, "Principal", r=0.06)


def mesa(M, w, d, a, tablero=0.035, tipo="madera"):
    M.caja(0, 0, a - tablero, w, d, tablero, "PrincipalMadera" if tipo == "madera" else "Principal", r=0.01)
    M.caja(0, 0, a - tablero - 0.08, w - 0.12, d - 0.12, 0.08, "PrincipalMadera" if tipo == "madera" else "Principal", r=0.004)
    M.patas(w - 0.1, d - 0.1, a - tablero, "PrincipalMadera" if tipo == "madera" else "Metal", r=0.025, inset=0.03, conica=True)


def mesa_centro(M, w, d, a):
    M.caja(0, 0, a - 0.04, w, d * 0.9, 0.04, "PrincipalMadera", r=0.012)
    M.caja(0, 0, 0.1, w - 0.1, d * 0.9 - 0.1, 0.025, "PrincipalMadera", r=0.006)
    M.patas(w - 0.06, d * 0.9 - 0.06, a - 0.04, "PrincipalMadera", r=0.022, inset=0.04)
    M.caja(-w * 0.2, 0.0, a, 0.22, 0.16, 0.04, "Libros", r=0.004)
    M.cil(w * 0.22, 0.02, a, 0.05, 0.12, "Ceramica", seg=14, r2=0.035)


def mueble_tele(M, w, d, a):
    M.caja(0, 0, 0.12, w, d - 0.04, a - 0.12, "PrincipalMadera", r=0.01)
    M.patas(w - 0.04, d - 0.08, 0.12, "Metal", r=0.012, inset=0.06)
    n = 3
    for k in range(n):
        x = -w / 2 + (k + 0.5) * w / n
        M.caja(x, d / 2 - 0.03, 0.15, w / n - 0.02, 0.012, a - 0.2, "PrincipalMadera" if k != 1 else "Sombra", r=0.004)


def television(M, w, d, a):
    M.caja(0, 0, 0, 0.36, 0.2, 0.02, "Negro", r=0.006)
    M.caja(0, -0.02, 0.02, 0.06, 0.04, 0.12, "Negro", r=0.01)
    M.caja(0, 0, 0.12, w - 0.02, 0.05, a - 0.14, "Negro", r=0.012)
    M.caja(0, 0.027, 0.14, w - 0.06, 0.004, a - 0.18, "Pantalla", malla="pantalla")


def estanteria(M, w, d, a):
    M.caja(-w / 2 + 0.02, 0, 0, 0.03, d, a, "PrincipalMadera", r=0.004)
    M.caja(w / 2 - 0.02, 0, 0, 0.03, d, a, "PrincipalMadera", r=0.004)
    M.caja(0, -d / 2 + 0.008, 0, w, 0.012, a, "PrincipalMadera")
    n = max(3, int(a / 0.36))
    for k in range(n + 1):
        z = k * (a - 0.03) / n
        M.caja(0, 0, z, w - 0.04, d - 0.02, 0.025, "PrincipalMadera", r=0.004)
        if k < n:
            hl = (a - 0.03) / n - 0.06
            M.caja(-w * 0.12, -0.01, z + 0.025, w * 0.62, d * 0.7, hl * (0.85 if k % 2 else 0.95), "Libros")
            if k % 2:
                M.cil(w * 0.32, 0.0, z + 0.025, 0.05, hl * 0.6, "Ceramica", seg=12)


def silla(M, w, d, a, tapizada=False):
    s = 0.46
    M.caja(0, 0.02, s - 0.04, w * 0.86, d * 0.84, 0.04, "PrincipalMadera" if not tapizada else "Principal", r=0.012)
    if not tapizada:
        # Asiento de enea.
        M.caja(0, 0.02, s - 0.01, w * 0.78, d * 0.76, 0.02, "Enea", r=0.006)
    else:
        M.caja(0, 0.02, s, w * 0.84, d * 0.8, 0.06, "Principal", r=0.025)
    for sx in (-1, 1):
        M.cil(sx * (w * 0.38), d * 0.36, 0, 0.018, s - 0.04, "PrincipalMadera", seg=8)
        M.cil(sx * (w * 0.38), -d * 0.36, 0, 0.018, a, "PrincipalMadera", seg=8)
    if tapizada:
        M.caja(0, -d * 0.38, s + 0.06, w * 0.82, 0.06, a - s - 0.1, "Principal", r=0.025)
    else:
        for z in (a - 0.08, a - 0.22, a - 0.36):
            M.caja(0, -d * 0.36, z, w * 0.72, 0.022, 0.045, "PrincipalMadera", r=0.006)
        M.barra((-w * 0.38, d * 0.36, 0.14), (w * 0.38, d * 0.36, 0.14), 0.01, "PrincipalMadera")


def taburete(M, w, d, a):
    M.cil(0, 0, a - 0.05, w * 0.4, 0.05, "Principal", seg=20)
    M.cil(0, 0, 0, 0.022, a - 0.05, "Metal", seg=10)
    M.cil(0, 0, 0, w * 0.32, 0.02, "Metal", seg=20)
    M.cil(0, 0, a * 0.35, w * 0.28, 0.02, "Metal", seg=20, tapa=False)


def silla_oficina(M, w, d, a):
    for k in range(5):
        t = 2 * math.pi * k / 5
        M.barra((0, 0, 0.08), (math.cos(t) * 0.3, math.sin(t) * 0.3, 0.06), 0.015, "Negro")
        M.esfera(math.cos(t) * 0.3, math.sin(t) * 0.3, 0.03, 0.03, "Negro", seg=8)
    M.cil(0, 0, 0.08, 0.025, 0.36, "Metal", seg=10)
    M.caja(0, 0.02, 0.44, w * 0.9, d * 0.86, 0.08, "Principal", r=0.03)
    M.caja(0, -d * 0.4, 0.55, w * 0.8, 0.06, a - 0.6, "Principal", r=0.04)
    for s in (-1, 1):
        M.caja(s * w * 0.44, 0.0, 0.6, 0.04, d * 0.5, 0.03, "Negro", r=0.01)


def encimera(M, w, d, a, hueco=None):
    """Módulo bajo de cocina: zócalo, frentes con tirador y encimera de piedra."""
    alto = 0.88
    M.caja(0, -0.02, 0, w - 0.01, d - 0.08, 0.1, "Sombra")
    M.caja(0, -0.03, 0.1, w - 0.01, d - 0.08, alto - 0.14, "Principal", r=0.004)
    nf = max(1, round(w / 0.6))
    for k in range(nf):
        x0 = -w / 2 + k * w / nf
        M.caja(x0 + w / nf / 2, d / 2 - 0.05, 0.11, w / nf - 0.006, 0.018, alto - 0.16, "Principal", r=0.003)
        M.caja(x0 + w / nf / 2, d / 2 - 0.035, alto - 0.12, w / nf * 0.5, 0.012, 0.012, "Metal", r=0.003)
    M.caja(0, 0, alto - 0.04, w, d, 0.04, "Encimera", r=0.004)
    return alto


def cocina(M, w, d, a):
    alto = encimera(M, w, d, a)
    # Placa, fregadero y grifo.
    M.caja(-w * 0.22, 0.02, alto, 0.58, 0.5, 0.006, "Pantalla")
    for dx, dy in ((-0.13, -0.1), (0.13, -0.1), (-0.13, 0.12), (0.13, 0.12)):
        M.cil(-w * 0.22 + dx, 0.02 + dy, alto + 0.006, 0.08, 0.002, "Negro", seg=20)
    fregadero(M, w * 0.25, d, alto)
    # Frontal alicatado.
    M.caja(0, -d / 2 + 0.01, alto, w, 0.02, 0.6, "Azulejo")


def fregadero(M, x, d, alto):
    M.caja(x, 0.0, alto - 0.18, 0.5, 0.4, 0.185, "Acero", r=0.02)
    M.caja(x, 0.0, alto - 0.17, 0.44, 0.34, 0.18, "Sombra")
    M.cil(x, -d / 2 + 0.12, alto, 0.025, 0.06, "Metal", seg=10)
    M.cil(x, -d / 2 + 0.12, alto + 0.06, 0.012, 0.28, "Metal", seg=10)
    M.barra((x, -d / 2 + 0.12, alto + 0.33), (x, -d / 2 + 0.3, alto + 0.3), 0.012, "Metal")


def modulo_bajo(M, w, d, a):
    alto = 0.88
    M.caja(0, -0.02, 0, w - 0.01, d - 0.08, 0.1, "Sombra")
    M.caja(0, -0.03, 0.1, w - 0.01, d - 0.08, alto - 0.14, "Principal", r=0.004)
    for k in range(3):
        z = 0.11 + k * (alto - 0.16) / 3
        M.caja(0, d / 2 - 0.05, z, w - 0.006, 0.018, (alto - 0.16) / 3 - 0.006, "Principal", r=0.003)
        M.caja(0, d / 2 - 0.035, z + (alto - 0.16) / 3 - 0.05, w * 0.5, 0.012, 0.012, "Metal", r=0.003)
    M.caja(0, 0, alto - 0.04, w, d, 0.04, "Encimera", r=0.004)


def modulo_fregadero(M, w, d, a):
    alto = encimera(M, w, d, a)
    fregadero(M, 0, d, alto)


def placa_horno(M, w, d, a):
    alto = encimera(M, w, d, a)
    M.caja(0, 0.02, alto, w * 0.9, d * 0.82, 0.006, "Pantalla")
    for dx, dy in ((-0.13, -0.1), (0.13, -0.1), (0, 0.12)):
        M.cil(dx, 0.02 + dy, alto + 0.006, 0.09, 0.002, "Negro", seg=20)
    M.caja(0, d / 2 - 0.035, 0.32, w - 0.04, 0.02, 0.45, "Pantalla")
    M.caja(0, d / 2 - 0.02, 0.72, w * 0.7, 0.02, 0.02, "Metal", r=0.006)


def columna_horno(M, w, d, a):
    M.caja(0, -0.02, 0, w - 0.01, d - 0.06, a, "Principal", r=0.004)
    M.caja(0, d / 2 - 0.035, 0.85, w - 0.06, 0.02, 0.5, "Pantalla")
    M.caja(0, d / 2 - 0.035, 1.4, w - 0.06, 0.02, 0.38, "Pantalla")
    M.caja(0, d / 2 - 0.02, 1.3, w * 0.7, 0.02, 0.02, "Metal", r=0.006)
    for z0, z1 in ((0.1, 0.84), (1.82, a - 0.02)):
        M.caja(0, d / 2 - 0.04, z0, w - 0.01, 0.018, z1 - z0, "Principal", r=0.003)


def frigorifico(M, w, d, a, americano=False):
    M.caja(0, -0.02, 0, w - 0.02, d - 0.06, a, "Principal", r=0.03)
    if americano:
        for s in (-1, 1):
            M.caja(s * (w / 4), d / 2 - 0.035, 0.05, w / 2 - 0.02, 0.03, a - 0.08, "Principal", r=0.01)
            M.caja(s * 0.04, d / 2 - 0.005, a * 0.4, 0.02, 0.03, a * 0.45, "Metal", r=0.008)
        M.caja(-w / 4, d / 2 - 0.018, a * 0.55, 0.2, 0.01, 0.3, "Pantalla")
    else:
        M.caja(0, d / 2 - 0.035, a * 0.62, w - 0.04, 0.03, a * 0.37, "Principal", r=0.01)
        M.caja(0, d / 2 - 0.035, 0.04, w - 0.04, 0.03, a * 0.57, "Principal", r=0.01)
        for z in (a * 0.66, a * 0.5):
            M.caja(w / 2 - 0.08, d / 2 - 0.005, z, 0.02, 0.03, 0.3, "Metal", r=0.008)


def isla(M, w, d, a):
    alto = 0.9
    M.caja(0, -0.08, 0, w - 0.2, d - 0.3, 0.1, "Sombra")
    M.caja(0, -0.08, 0.1, w - 0.2, d - 0.3, alto - 0.14, "Principal", r=0.004)
    M.caja(0, 0.0, alto - 0.04, w, d, 0.04, "Encimera", r=0.006)
    M.caja(-w / 2 + 0.03, 0, 0, 0.04, d, alto - 0.04, "Encimera")


def mueble_alto(M, w, d, a):
    y = -d / 2 + 0.175
    M.caja(0, y, 1.45, w - 0.01, 0.35, 0.7, "Principal", r=0.004)
    M.caja(0, y + 0.17, 1.47, w - 0.02, 0.018, 0.66, "Principal", r=0.003)
    M.caja(0, y + 0.19, 1.5, w * 0.4, 0.012, 0.012, "Metal", r=0.003)
    M.caja(0, y + 0.1, 1.44, w - 0.04, 0.05, 0.01, "Luz")


def lavabo(M, w, d, a, mueble=False, doble=False):
    if mueble or doble:
        M.caja(0, 0, 0.25, w - 0.02, d - 0.04, 0.55, "PrincipalMadera" if mueble or doble else "Principal", r=0.006)
        M.caja(0, d / 2 - 0.035, 0.27, w - 0.06, 0.016, 0.5, "PrincipalMadera", r=0.004)
        M.caja(0, 0, 0.8, w, d, 0.03, "Encimera", r=0.004)
        senos = (-w / 4, w / 4) if doble else (0,)
        for x in senos:
            M.cil(x, 0.02, 0.83, 0.2, 0.12, "Ceramica", seg=24, r2=0.21)
            M.cil(x, -d / 2 + 0.07, 0.83, 0.016, 0.2, "Metal", seg=10)
            M.barra((x, -d / 2 + 0.07, 1.02), (x, -d / 2 + 0.17, 1.0), 0.012, "Metal")
    else:
        M.cil(0, -d * 0.1, 0, 0.09, 0.7, "Ceramica", seg=18, r2=0.07)
        M.caja(0, 0, 0.7, w * 0.8, d * 0.9, 0.16, "Ceramica", r=0.05)
        M.cil(0, -d * 0.3, 0.86, 0.014, 0.18, "Metal", seg=10)
    # Espejo con marco.
    M.caja(0, -d / 2 + 0.01, 1.1, w * 0.86 if not doble else w * 0.92, 0.025, 0.8, "MaderaOscura" if mueble else "Metal", r=0.01)
    M.caja(0, -d / 2 + 0.024, 1.13, (w * 0.86 if not doble else w * 0.92) - 0.05, 0.004, 0.74, "Espejo")


def inodoro(M, w, d, a):
    M.cil(0, 0.08, 0, 0.17, 0.38, "Ceramica", seg=20, r2=0.19)
    M.esfera(0, 0.12, 0.38, 0.2, "Ceramica", sx=0.95, sy=1.25, sz=0.18, seg=18)
    M.caja(0, -d / 2 + 0.11, 0.36, 0.38, 0.18, 0.4, "Ceramica", r=0.04)
    M.caja(0, 0.12, 0.42, 0.36, 0.44, 0.025, "Ceramica", r=0.012)
    M.cil(0, -d / 2 + 0.11, 0.77, 0.03, 0.02, "Metal", seg=10)


def ducha(M, w, d, a, obra=False):
    M.caja(0, 0, 0, w, d, 0.06 if not obra else 0.02, "Ceramica" if not obra else "Principal", r=0.015)
    M.cil(0, 0, 0.06, 0.04, 0.004, "Metal", seg=12)
    # Columna y rociador.
    M.cil(-w / 2 + 0.1, -d / 2 + 0.05, 0.06, 0.012, 1.9, "Metal", seg=8)
    M.barra((-w / 2 + 0.1, -d / 2 + 0.05, 1.96), (-w / 2 + 0.1, -d / 2 + 0.3, 1.96), 0.012, "Metal")
    M.cil(-w / 2 + 0.1, -d / 2 + 0.32, 1.92, 0.1, 0.02, "Metal", seg=20)
    # Mampara.
    M.caja(0, d / 2 - 0.02, 0.06, w * (0.6 if obra else 1.0), 0.01, 1.9, "Cristal")
    M.caja(w / 2 - 0.01, 0, 0.06, 0.01, d, 1.9, "Cristal")
    M.caja(0, d / 2 - 0.02, 1.95, w, 0.02, 0.02, "Metal")


def banera(M, w, d, a, exenta=False):
    if exenta:
        M.esfera(0, 0, 0.32, 1.0, "Ceramica", sx=w / 2, sy=d / 2 - 0.05, sz=0.3, seg=24)
        M.caja(0, 0, 0.0, w * 0.7, d * 0.5, 0.32, "Ceramica", r=0.1)
        M.esfera(0, 0, 0.56, 1.0, "Agua", sx=w / 2 - 0.08, sy=d / 2 - 0.12, sz=0.02, seg=24)
        M.cil(w / 2 + 0.12, 0, 0, 0.02, 0.95, "Metal", seg=10)
        M.barra((w / 2 + 0.12, 0, 0.95), (w / 2 - 0.05, 0, 0.92), 0.015, "Metal")
    else:
        M.caja(0, 0, 0, w, d, 0.56, "Principal", r=0.03)
        M.caja(0, 0.02, 0.2, w - 0.12, d - 0.14, 0.355, "Ceramica", r=0.12)
        M.caja(0, 0.02, 0.548, w - 0.16, d - 0.18, 0.01, "Agua", r=0.004)
        M.cil(-w / 2 + 0.1, -d / 2 + 0.06, 0.56, 0.014, 0.18, "Metal", seg=8)


def escritorio(M, w, d, a):
    M.caja(0, 0, a - 0.035, w, d, 0.035, "PrincipalMadera", r=0.008)
    M.caja(w / 2 - 0.22, 0, 0.0, 0.42, d - 0.06, a - 0.035, "PrincipalMadera", r=0.006)
    for k in range(3):
        M.caja(w / 2 - 0.22, d / 2 - 0.03, 0.04 + k * (a - 0.1) / 3, 0.4, 0.014, (a - 0.1) / 3 - 0.012, "PrincipalMadera", r=0.004)
        M.cil(w / 2 - 0.22, d / 2 - 0.015, 0.04 + (k + 0.5) * (a - 0.1) / 3, 0.012, 0.02, "Metal", seg=8, eje="Y")
    M.cil(-w / 2 + 0.05, -d / 2 + 0.05, 0, 0.022, a - 0.035, "Metal", seg=10)
    M.cil(-w / 2 + 0.05, d / 2 - 0.05, 0, 0.022, a - 0.035, "Metal", seg=10)


def ordenador(M, w, d, a):
    M.caja(0, 0.0, 0, 0.22, 0.16, 0.012, "Negro", r=0.004)
    M.caja(0, -0.04, 0.012, 0.04, 0.03, 0.16, "Negro", r=0.006)
    M.caja(0, -0.02, 0.12, 0.56, 0.03, 0.34, "Negro", r=0.01)
    M.caja(0, -0.004, 0.135, 0.53, 0.004, 0.31, "Pantalla", malla="pantalla")
    M.caja(0, 0.2, 0, 0.42, 0.13, 0.018, "Principal", r=0.006)
    M.caja(0.3, 0.2, 0, 0.06, 0.1, 0.03, "Principal", r=0.015)


def lampara_pie(M, w, d, a):
    M.cil(0, 0, 0, 0.15, 0.025, "Negro", seg=20)
    M.cil(0, 0, 0.025, 0.012, a - 0.36, "Laton", seg=8)
    M.cil(0, 0, a - 0.36, 0.13, 0.32, "Principal", seg=20, r2=0.19, malla="pantallaLuz", tapa=False)
    M.esfera(0, 0, a - 0.22, 0.05, "Luz", seg=8)


def lampara_mesa(M, w, d, a):
    M.esfera(0, 0, 0.1, 0.09, "Ceramica", sx=1, sy=1, sz=1.15, seg=14)
    M.cil(0, 0, 0.2, 0.01, 0.06, "Laton", seg=8)
    M.cil(0, 0, 0.24, 0.09, 0.16, "Principal", seg=18, r2=0.13, malla="pantallaLuz", tapa=False)


def alfombra(M, w, d, a):
    M.caja(0, 0, 0.002, w - 0.1, d - 0.1, 0.012, "Esparto", r=0.004)
    M.caja(0, 0, 0.014, w - 0.4, d - 0.4, 0.002, "Principal")


def maceta(M, w, d, a, olivo=False):
    r = min(w, d) * 0.32
    M.cil(0, 0, 0, r * 0.75, r * 1.3, "Principal", seg=18, r2=r)
    M.cil(0, 0, r * 1.25, r * 0.95, 0.02, "Tierra", seg=18)
    if olivo:
        M.cil(0, 0, r * 1.25, 0.05, a * 0.45, "Tronco", seg=8, r2=0.035)
        for k, (dx, dy, dz, s) in enumerate(((0, 0, 0.62, 0.42), (0.2, 0.1, 0.55, 0.3), (-0.18, -0.08, 0.58, 0.32), (0.05, -0.18, 0.72, 0.28))):
            M.esfera(dx, dy, a * dz + 0.4, s, "Olivo", sz=0.8, seg=10)
    else:
        # Kentia: hojas en abanico.
        for k in range(9):
            t = 2 * math.pi * k / 9
            L = a * (0.45 + 0.12 * (k % 3))
            M.barra((0, 0, r * 1.3), (math.cos(t) * L * 0.45, math.sin(t) * L * 0.45, r * 1.3 + L), 0.012, "Hojas", seg=5)
            M.esfera(math.cos(t) * L * 0.38, math.sin(t) * L * 0.38, r * 1.3 + L * 0.85, L * 0.22, "Hojas", sx=1.0, sy=0.35, sz=0.55, seg=8)


def cuadro(M, w, d, a, grande=False):
    y = -d / 2 + 0.02
    ancho, alto = (w * 0.9, 0.8) if grande else (w * 0.9, 0.6)
    z = 1.15 if grande else 1.2
    M.caja(0, y, z, ancho, 0.04, alto, "MaderaOscura", r=0.008)
    M.caja(0, y + 0.021, z + 0.05, ancho - 0.1, 0.002, alto - 0.1, "Lienzo")
    # Paisaje (el Peñón sobre el mar), en bandas de color.
    M.caja(0, y + 0.023, z + 0.05, ancho - 0.1, 0.002, (alto - 0.1) * 0.35, "Principal")
    M.caja(0.05, y + 0.024, z + 0.05 + (alto - 0.1) * 0.35, (ancho - 0.1) * 0.45, 0.002, (alto - 0.1) * 0.3, "Roca", r=0.0)


def espejo(M, w, d, a):
    y = -d / 2 + 0.02
    M.cil(0, y, 1.45, w * 0.42, 0.03, "Principal", seg=28, eje="Y")
    M.cil(0, y + 0.017, 1.45, w * 0.37, 0.004, "Espejo", seg=28, eje="Y")


def reloj(M, w, d, a):
    y = -d / 2 + 0.03
    M.cil(0, y, 1.8, 0.16, 0.04, "Principal", seg=24, eje="Y")
    M.cil(0, y + 0.021, 1.8, 0.14, 0.004, "Lienzo", seg=24, eje="Y")
    M.barra((0, y + 0.026, 1.8), (0, y + 0.026, 1.9), 0.006, "Negro", seg=4)
    M.barra((0, y + 0.026, 1.8), (0.07, y + 0.026, 1.8), 0.006, "Negro", seg=4)


def jarron(M, w, d, a):
    M.cil(0, 0, 0, 0.06, 0.04, "Principal", seg=16, r2=0.08)
    M.esfera(0, 0, 0.13, 0.1, "Principal", sz=1.0, seg=16)
    M.cil(0, 0, 0.2, 0.045, 0.12, "Principal", seg=16, r2=0.06)
    for k in range(5):
        t = 2 * math.pi * k / 5
        M.barra((0, 0, 0.28), (math.cos(t) * 0.1, math.sin(t) * 0.1, 0.48), 0.004, "Hojas", seg=4)
        M.esfera(math.cos(t) * 0.1, math.sin(t) * 0.1, 0.48, 0.03, "Flor", seg=8)


def banco_patio(M, w, d, a):
    for s in (-1, 1):
        M.caja(s * (w / 2 - 0.05), 0, 0, 0.05, d * 0.9, 0.42, "Principal", r=0.012)
        M.barra((s * (w / 2 - 0.05), -d * 0.4, 0.42), (s * (w / 2 - 0.05), -d * 0.45, 0.85), 0.02, "Principal")
    for k in range(4):
        M.caja(0, -d * 0.35 + k * d * 0.22, 0.42, w - 0.04, d * 0.18, 0.03, "PrincipalMadera", r=0.006)
    for k in range(3):
        M.caja(0, -d * 0.44, 0.52 + k * 0.11, w - 0.04, 0.025, 0.08, "PrincipalMadera", r=0.006, rot=0)


def mesa_patio(M, w, d, a):
    M.cil(0, 0, a - 0.03, min(w, d) * 0.45, 0.03, "Principal", seg=28)
    M.cil(0, 0, 0.02, 0.03, a - 0.05, "Principal", seg=10)
    M.cil(0, 0, 0, 0.22, 0.03, "Principal", seg=20)


def geranios(M, w, d, a):
    y = -d / 2 + 0.12
    M.caja(0, y, 0.9, w * 0.9, 0.22, 0.2, "Barro", r=0.02)
    for k in range(7):
        x = -w * 0.38 + k * w * 0.76 / 6
        M.esfera(x, y + 0.02, 1.13, 0.09, "Hojas", sz=0.8, seg=8)
        M.esfera(x + 0.02, y + 0.05, 1.2, 0.05, "Principal", seg=8)


def toallero(M, w, d, a):
    y = -d / 2 + 0.06
    M.barra((-w * 0.4, y, 1.0), (w * 0.4, y, 1.0), 0.012, "Metal")
    for s in (-1, 1):
        M.barra((s * w * 0.4, -d / 2, 1.0), (s * w * 0.4, y, 1.0), 0.012, "Metal")
    M.caja(0, y + 0.012, 0.5, w * 0.5, 0.03, 0.52, "Principal", r=0.012)


def banqueta(M, w, d, a):
    M.caja(0, 0, 0.12, w, d * 0.8, a - 0.12, "Principal", r=0.05)
    M.patas(w - 0.04, d * 0.8 - 0.04, 0.12, "MaderaOscura", r=0.02, inset=0.06, conica=True)


def vestidor(M, w, d, a):
    for s in (-1, 1):
        M.caja(s * (w / 2 - 0.015), 0, 0, 0.03, d, a, "PrincipalMadera", r=0.004)
    M.caja(0, 0, a - 0.03, w, d, 0.03, "PrincipalMadera")
    M.caja(0, 0, 0.35, w - 0.04, d - 0.02, 0.025, "PrincipalMadera")
    M.barra((-w / 2 + 0.03, 0, a - 0.35), (w / 2 - 0.03, 0, a - 0.35), 0.014, "Metal")
    for k in range(7):
        x = -w / 2 + 0.2 + k * (w - 0.4) / 6
        M.caja(x, 0, a - 1.3, 0.04, d * 0.7, 0.9, ["Principal", "Cojin", "Sabana"][k % 3], r=0.015)
    for k in range(4):
        M.caja(-w / 3 + k * w / 4.5, 0.05, 0.38, 0.22, 0.28, 0.12, "MaderaOscura", r=0.03)


def aparador(M, w, d, a, consola=False):
    if consola:
        M.caja(0, 0, a - 0.04, w, d, 0.04, "PrincipalMadera", r=0.01)
        M.caja(0, 0, a - 0.2, w - 0.06, d - 0.04, 0.14, "PrincipalMadera", r=0.006)
        M.patas(w - 0.06, d - 0.04, a - 0.2, "PrincipalMadera", r=0.018, inset=0.03, conica=True)
        M.caja(0, 0, 0.12, w - 0.08, d - 0.06, 0.02, "PrincipalMadera")
        return
    M.caja(0, 0, 0.14, w, d - 0.02, a - 0.14, "PrincipalMadera", r=0.012)
    M.patas(w - 0.04, d - 0.06, 0.14, "MaderaOscura", r=0.02, inset=0.05, conica=True)
    n = 4
    for k in range(n):
        x = -w / 2 + (k + 0.5) * w / n
        M.caja(x, d / 2 - 0.025, 0.16, w / n - 0.012, 0.012, a - 0.2, "PrincipalMadera", r=0.004)
        M.cil(x + (0.12 if k % 2 == 0 else -0.12), d / 2 - 0.01, a * 0.55, 0.012, 0.02, "Laton", seg=8, eje="Y")


def perchero(M, w, d, a):
    M.cil(0, 0, 0, 0.18, 0.03, "Principal", seg=18)
    M.cil(0, 0, 0.03, 0.02, a - 0.05, "PrincipalMadera", seg=10)
    for k in range(6):
        t = 2 * math.pi * k / 6
        M.barra((0, 0, a - 0.2), (math.cos(t) * 0.14, math.sin(t) * 0.14, a - 0.08), 0.012, "PrincipalMadera")
    M.caja(0.06, 0.0, a - 0.95, 0.12, 0.1, 0.7, "Cojin", r=0.04)


def despensa(M, w, d, a):
    for s in (-1, 1):
        M.caja(s * (w / 2 - 0.02), 0, 0, 0.03, d, a, "PrincipalMadera")
    for k in range(5):
        z = 0.1 + k * (a - 0.15) / 4
        M.caja(0, 0, z, w - 0.04, d - 0.02, 0.02, "PrincipalMadera")
        if k < 4:
            for j in range(4):
                M.cil(-w / 2 + 0.12 + j * (w - 0.2) / 3, 0.0, z + 0.02, 0.05, 0.16, ["Ceramica", "Barro", "Cristal", "Lienzo"][j], seg=12)


def ficha(nombre, fn, *args, **kw):
    return nombre, fn, args, kw


TIPOS = {
    "camaDoble": (cama, {}), "camaIndividual": (cama, {}), "camaTapizada": (cama, {"tapizada": True}),
    "mesitaNoche": (mesita, {}), "armario": (armario, {}), "armarioEmpotrado": (armario, {"empotrado": True}), "comoda": (comoda, {}),
    "sofa": (sofa, {}), "sofaChaise": (sofa, {"chaise": True}), "sillon": (sillon, {}), "mesaCentro": (mesa_centro, {}),
    "muebleTele": (mueble_tele, {}), "television": (television, {}), "estanteria": (estanteria, {}),
    "mesaComedor": (mesa, {}), "mesaComedorGrande": (mesa, {}), "mesaCocina": (mesa, {}), "silla": (silla, {}), "sillaTapizada": (silla, {"tapizada": True}),
    "cocina": (cocina, {}), "frigorifico": (frigorifico, {}), "frigoAmericano": (frigorifico, {"americano": True}),
    "lavabo": (lavabo, {}), "muebleLavabo": (lavabo, {"mueble": True}), "lavaboDoble": (lavabo, {"doble": True}),
    "inodoro": (inodoro, {}), "ducha": (ducha, {}), "duchaObra": (ducha, {"obra": True}), "banera": (banera, {}), "baneraExenta": (banera, {"exenta": True}),
    "escritorio": (escritorio, {}), "ordenador": (ordenador, {}), "sillaOficina": (silla_oficina, {}),
    "lamparaPie": (lampara_pie, {}), "lamparaMesa": (lampara_mesa, {}), "alfombra": (alfombra, {}),
    "maceta": (maceta, {}), "plantaGrande": (maceta, {"olivo": True}), "cuadro": (cuadro, {}), "cuadroGrande": (cuadro, {"grande": True}),
    "espejo": (espejo, {}), "reloj": (reloj, {}), "jarron": (jarron, {}), "bancoPatio": (banco_patio, {}), "mesaPatio": (mesa_patio, {}),
    "geranios": (geranios, {}), "moduloBajo": (modulo_bajo, {}), "fregadero": (modulo_fregadero, {}), "placa": (placa_horno, {}),
    "columnaHorno": (columna_horno, {}), "muebleAlto": (mueble_alto, {}), "isla": (isla, {}), "taburete": (taburete, {}),
    "toallero": (toallero, {}), "banqueta": (banqueta, {}), "vestidor": (vestidor, {}), "aparador": (aparador, {}),
    "consola": (aparador, {"consola": True}), "perchero": (perchero, {}), "estanteDespensa": (despensa, {}),
}


def materiales():
    M = B.Materiales({})
    M.nuevo("Principal", "#FFFFFF", rugosidad=0.72)
    M.nuevo("PrincipalMadera", textura=veta("T_veta", "#E8D2B0"), rugosidad=0.55)
    M.nuevo("MaderaOscura", textura=veta("T_veta_osc", "#6E4A2E", semilla=34), rugosidad=0.5)
    M.nuevo("Metal", "#C3C7CC", rugosidad=0.25, metal=0.9)
    M.nuevo("Acero", "#B9BDC2", rugosidad=0.3, metal=0.85)
    M.nuevo("Laton", "#C9A64B", rugosidad=0.3, metal=0.9)
    M.nuevo("Negro", "#1D1F23", rugosidad=0.45, metal=0.2)
    M.nuevo("Pantalla", "#0E1116", rugosidad=0.08, metal=0.3)
    M.nuevo("Ceramica", "#F7F7F5", rugosidad=0.12)
    M.nuevo("Encimera", "#E4E1DA", rugosidad=0.2)
    M.nuevo("Azulejo", textura=T.estuco(None, base="#EEF1F2", semilla=35, n=128, nombre="T_azulejo"), rugosidad=0.15)
    M.nuevo("Colchon", textura=tela("T_colchon", "#F2F0EA"), rugosidad=0.9)
    M.nuevo("Sabana", textura=tela("T_sabana", "#FBFAF7", semilla=36), rugosidad=0.9)
    M.nuevo("Cojin", textura=tela("T_cojin", "#C7B79A", semilla=37), rugosidad=0.9)
    M.nuevo("Enea", textura=tela("T_enea", "#C8A866", semilla=38), rugosidad=0.95)
    M.nuevo("Esparto", textura=tela("T_esparto", "#D3BC8E", semilla=39), rugosidad=0.95)
    M.nuevo("Libros", textura=libros("T_libros"), rugosidad=0.8)
    M.nuevo("Sombra", "#2A2724", rugosidad=0.9)
    M.nuevo("Cristal", "#D9ECF2", rugosidad=0.05, metal=0.1)
    M.nuevo("Espejo", "#DDE6EC", rugosidad=0.02, metal=1.0)
    M.nuevo("Agua", "#BFE3F0", rugosidad=0.05)
    M.nuevo("Luz", "#FFF4D6", rugosidad=0.4, emisivo=("#FFE2A8", 1.0))
    M.nuevo("Lienzo", "#F2EEE4", rugosidad=0.85)
    M.nuevo("Roca", "#BDB7A8", rugosidad=0.9)
    M.nuevo("Hojas", "#3F7A35", rugosidad=0.75)
    M.nuevo("Olivo", "#7D8B5C", rugosidad=0.8)
    M.nuevo("Tronco", "#5C4633", rugosidad=0.9)
    M.nuevo("Tierra", "#4A3B2C", rugosidad=0.95)
    M.nuevo("Barro", "#B4643F", rugosidad=0.85)
    M.nuevo("Flor", "#E94B6A", rugosidad=0.6)
    # Transparencia del cristal de la mampara.
    m = M.m["Cristal"]
    m.blend_method = "BLEND" if hasattr(m, "blend_method") else m.blend_method
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Alpha"].default_value = 0.28
    # Materiales distintos entre sí (el optimizador fusiona los iguales).
    for k, mm in enumerate(M.m.values()):
        b = mm.node_tree.nodes.get("Principled BSDF")
        b.inputs["Roughness"].default_value += k * 1e-3
    return M


def dims():
    """Medidas del catálogo del juego (× 0,5 m)."""
    txt = open(B.ruta("src", "compartido", "hogar", "catalogo.ts")).read()
    out = {}
    for m in re.finditer(r"^\s+(\w+): \{[^\n]*?w: ([\d.]+), d: ([\d.]+), alto: ([\d.]+)", txt, re.M):
        out[m.group(1)] = tuple(float(m.group(i)) * 0.5 for i in (2, 3, 4))
    return out


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materiales()
    D = dims()
    col = bpy.data.collections.new("MUEBLES")
    bpy.context.scene.collection.children.link(col)
    tri = {}
    faltan = [t for t in D if t not in TIPOS]
    for k, (tipo, (fn, kw)) in enumerate(TIPOS.items()):
        if tipo not in D:
            continue
        w, d, a = D[tipo]
        raiz = B.vacio(f"M_{tipo}", col, {"mueble": tipo, "medidas": [w, d, a]})
        # En el .blend se reparten en rejilla para verlos; en el juego se colocan solos.
        raiz.location = ((k % 10) * 3.0, -(k // 10) * 3.0, 0)
        M = Mueble(tipo, mats.m)
        fn(M, w, d, a, **kw)
        obs = M.objeto(col, raiz)
        tri[tipo] = sum(len(o.data.polygons) for o in obs)
    blend, glb = B.exportar("muebles", "modelos/muebles/muebles.glb", carpeta="muebles")
    print(f"{len(tri)} muebles · {sum(tri.values())} caras · GLB {os.path.getsize(glb) // 1024} KB · sin modelo: {faltan}")
    s = bpy.context.scene
    luz = bpy.data.objects.new("Sol", bpy.data.lights.new("Sol", "SUN"))
    s.collection.objects.link(luz)
    B.renderizar("catalogo", [("vista", (13.5, 32, 13), (13.5, 7.5, 0.4), 30)], (0, 0), carpeta="muebles", ancho=1400, alto=900, color="MATERIAL")


if __name__ == "__main__":
    main()
