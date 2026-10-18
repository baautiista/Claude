"""
Texturas procedurales para los edificios singulares (se generan en Blender con numpy, sin IA).

Cada función devuelve una imagen de Blender empaquetada en el .blend (y se guarda una copia en
city-reconstruction/blender/texturas/ para poder editarla). Todas son repetibles (tileables):
el tamaño real que cubre cada una lo fija el mapeado UV del modelo (`METROS`).
"""
import os
import bpy
import numpy as np

# Metros que cubre cada textura (lo usa el mapeado UV).
METROS = {
    "estuco": 3.0, "hormigon": 3.0, "adoquin": 1.6, "losa": 2.4, "impreso": 2.0, "cesped": 3.0,
    "ladrillo": 1.0, "ostionera": 2.0, "grava": 2.0, "asfalto": 4.0,
}


def _ruido(rng, n, celdas):
    """Ruido de valor repetible: rejilla aleatoria interpolada (bilineal, con vuelta)."""
    g = rng.random((celdas, celdas))
    t = np.arange(n) * celdas / n
    i0 = np.floor(t).astype(int)
    f = t - i0
    f = f * f * (3 - 2 * f)
    i1 = (i0 + 1) % celdas
    a = g[i0][:, i0] * (1 - f)[None, :] + g[i0][:, i1] * f[None, :]
    b = g[i1][:, i0] * (1 - f)[None, :] + g[i1][:, i1] * f[None, :]
    return a * (1 - f)[:, None] + b * f[:, None]


def _fbm(rng, n, octavas=(4, 8, 16, 32, 64), pesos=(0.4, 0.25, 0.15, 0.12, 0.08)):
    return sum(p * _ruido(rng, n, c) for c, p in zip(octavas, pesos))


def _hex(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def _voronoi(rng, n, puntos):
    """Distancia al punto más cercano y al segundo (para juntas) y el índice de celda (con vuelta)."""
    p = rng.random((puntos, 2)) * n
    yy, xx = np.mgrid[0:n, 0:n]
    d1 = np.full((n, n), 1e9)
    d2 = np.full((n, n), 1e9)
    idx = np.zeros((n, n), int)
    for k, (px, py) in enumerate(p):
        dx = np.abs(xx - px)
        dx = np.minimum(dx, n - dx)
        dy = np.abs(yy - py)
        dy = np.minimum(dy, n - dy)
        d = np.hypot(dx, dy)
        m = d < d1
        d2 = np.where(m, d1, np.minimum(d2, d))
        idx = np.where(m, k, idx)
        d1 = np.where(m, d, d1)
    return d1, d2, idx


def _imagen(nombre, rgb, carpeta):
    n = rgb.shape[0]
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((n, n, 1))], axis=2)
    img = bpy.data.images.new(nombre, n, n, alpha=False)
    # Blender guarda las filas de abajo arriba.
    img.pixels.foreach_set(rgba[::-1].astype(np.float32).ravel())
    img.file_format = "JPEG"
    if carpeta:
        os.makedirs(carpeta, exist_ok=True)
        img.filepath_raw = os.path.join(carpeta, f"{nombre}.jpg")
        img.save()
    img.pack()
    return img


def estuco(carpeta, base="#E9D5A9", semilla=1, n=512, nombre="T_estuco"):
    rng = np.random.default_rng(semilla)
    v = _fbm(rng, n) - 0.5
    grano = rng.random((n, n)) - 0.5
    c = _hex(base)[None, None, :] * (1 + v[..., None] * 0.07 + grano[..., None] * 0.035)
    return _imagen(nombre, c, carpeta)


def hormigon(carpeta, semilla=2, n=512, nombre="T_hormigon"):
    rng = np.random.default_rng(semilla)
    v = _fbm(rng, n) - 0.5
    poros = (rng.random((n, n)) > 0.985) * -0.12
    c = _hex("#B8B1A3")[None, None, :] * (1 + v[..., None] * 0.16 + poros[..., None] + (rng.random((n, n, 1)) - 0.5) * 0.05)
    return _imagen(nombre, c, carpeta)


def adoquin(carpeta, semilla=3, n=512):
    """Adoquín cerámico rojizo en espiga (20 × 10 cm), como el de la plaza del Ayuntamiento."""
    rng = np.random.default_rng(semilla)
    # La textura cubre 1,6 m: 16 unidades de 10 cm.
    u = n / 16
    yy, xx = np.mgrid[0:n, 0:n] / u
    # Espiga a 90°: bloques de 2 × 1 alternando orientación en diagonal.
    k = np.floor((xx + yy) / 2) % 2
    a = np.where(k == 0, xx, yy)
    b = np.where(k == 0, yy, xx)
    fila = np.floor(b)
    col = np.floor((a - fila) / 2)
    fa = ((a - fila) / 2) - col
    fb = b - fila
    junta = (np.minimum(fa, 1 - fa) * 2 < 0.06) | (np.minimum(fb, 1 - fb) < 0.06)
    pieza = (col * 7919 + fila * 104729 + k * 31) % 997
    tono = (pieza / 997)[..., None]
    rojos = [_hex("#A65645"), _hex("#B86A52"), _hex("#8F4A3D"), _hex("#C07A5E"), _hex("#9C5B4C")]
    c = np.zeros((n, n, 3))
    for i, r in enumerate(rojos):
        m = ((tono[..., 0] * len(rojos)).astype(int) == i)[..., None]
        c = np.where(m, r[None, None, :], c)
    c *= 1 + (_fbm(rng, n)[..., None] - 0.5) * 0.25 + (rng.random((n, n, 1)) - 0.5) * 0.06
    c = np.where(junta[..., None], _hex("#6E5A50")[None, None, :], c)
    return _imagen("T_adoquin", c, carpeta)


def losa(carpeta, semilla=4, n=512):
    """Losas de hormigón gris (60 × 40 cm) de la explanada lateral."""
    rng = np.random.default_rng(semilla)
    yy, xx = np.mgrid[0:n, 0:n] / (n / 2.4)
    fx = (xx / 0.6) % 1
    fila = np.floor(yy / 0.4)
    fx = ((xx + (fila % 2) * 0.3) / 0.6) % 1
    fy = (yy / 0.4) % 1
    junta = (np.minimum(fx, 1 - fx) < 0.012) | (np.minimum(fy, 1 - fy) < 0.018)
    pieza = (np.floor((xx + (fila % 2) * 0.3) / 0.6) * 13 + fila * 7) % 5
    c = _hex("#9C9C98")[None, None, :] * (1 + (pieza[..., None] - 2) * 0.025 + (_fbm(rng, n)[..., None] - 0.5) * 0.18)
    c = np.where(junta[..., None], _hex("#6B6B68")[None, None, :], c)
    return _imagen("T_losa", c, carpeta)


def impreso(carpeta, semilla=5, n=512):
    """Hormigón impreso gris con dibujo de piedras irregulares (la rampa de acceso)."""
    rng = np.random.default_rng(semilla)
    d1, d2, idx = _voronoi(rng, n, 60)
    junta = (d2 - d1) < 3.0
    tono = ((idx * 37) % 11 / 11)[..., None]
    c = _hex("#8E918F")[None, None, :] * (0.92 + tono * 0.14 + (_fbm(rng, n)[..., None] - 0.5) * 0.15)
    c = np.where(junta[..., None], _hex("#5E605F")[None, None, :], c)
    return _imagen("T_impreso", c, carpeta)


def cesped(carpeta, semilla=6, n=512):
    rng = np.random.default_rng(semilla)
    v = _fbm(rng, n, (4, 8, 16, 64, 128), (0.35, 0.25, 0.15, 0.15, 0.1))
    hebras = rng.random((n, n))
    c = _hex("#5E9A35")[None, None, :] * (0.85 + v[..., None] * 0.35) + (hebras[..., None] - 0.5) * np.array([0.06, 0.09, 0.03])
    claros = (hebras > 0.93)[..., None] * np.array([0.08, 0.1, 0.02])
    return _imagen("T_cesped", c + claros, carpeta)


def ladrillo(carpeta, semilla=7, n=512, nombre="T_ladrillo"):
    """Ladrillo visto rojo (24 × 6 cm, llaga 1 cm): bordillo del parterre."""
    rng = np.random.default_rng(semilla)
    yy, xx = np.mgrid[0:n, 0:n] / n  # 1 m
    fila = np.floor(yy / 0.07)
    fx = ((xx + (fila % 2) * 0.125) / 0.25) % 1
    fy = (yy / 0.07) % 1
    junta = (np.minimum(fx, 1 - fx) < 0.02) | (fy < 0.14)
    pieza = (np.floor((xx + (fila % 2) * 0.125) / 0.25) * 17 + fila * 5) % 7
    c = _hex("#A9533A")[None, None, :] * (0.88 + pieza[..., None] * 0.035 + (_fbm(rng, n)[..., None] - 0.5) * 0.2)
    c = np.where(junta[..., None], _hex("#CDBFAE")[None, None, :], c)
    return _imagen(nombre, c, carpeta)


def ostionera(carpeta, semilla=8, n=512):
    """Mampostería de piedra ostionera (muro bajo del jardín)."""
    rng = np.random.default_rng(semilla)
    d1, d2, idx = _voronoi(rng, n, 45)
    junta = (d2 - d1) < 5.0
    tono = ((idx * 53) % 9 / 9)[..., None]
    poros = (rng.random((n, n, 1)) > 0.9) * -0.15
    c = _hex("#BDB29A")[None, None, :] * (0.85 + tono * 0.2 + (_fbm(rng, n)[..., None] - 0.5) * 0.3 + poros)
    c = np.where(junta[..., None], _hex("#8A8070")[None, None, :], c)
    return _imagen("T_ostionera", c, carpeta)


def grava(carpeta, semilla=9, n=256):
    rng = np.random.default_rng(semilla)
    c = _hex("#A8A296")[None, None, :] * (0.8 + rng.random((n, n, 1)) * 0.35 + (_fbm(rng, n)[..., None] - 0.5) * 0.2)
    return _imagen("T_grava", c, carpeta)


def asfalto(carpeta, semilla=10, n=256):
    rng = np.random.default_rng(semilla)
    c = _hex("#55585B")[None, None, :] * (0.85 + rng.random((n, n, 1)) * 0.25 + (_fbm(rng, n)[..., None] - 0.5) * 0.2)
    return _imagen("T_asfalto", c, carpeta)


def teja(carpeta, semilla=11, n=256, nombre="T_teja"):
    """Teja árabe vista desde arriba: canales en filas (cubre 2 m)."""
    rng = np.random.default_rng(semilla)
    yy, xx = np.mgrid[0:n, 0:n] / n * 2.0
    fx = (xx / 0.2) % 1
    fila = np.floor(yy / 0.4)
    fy = (yy / 0.4) % 1
    luz = 0.75 + 0.35 * np.sin(fx * np.pi) - 0.25 * (fy > 0.85)
    tono = ((np.floor(xx / 0.2) * 7 + fila * 13) % 5)[..., None] * 0.03
    c = _hex("#B3573A")[None, None, :] * (luz[..., None] + tono + (_fbm(rng, n)[..., None] - 0.5) * 0.25)
    return _imagen(nombre, c, carpeta)


def chapa(carpeta, base="#C9D2DA", semilla=12, n=256, nombre="T_chapa"):
    """Chapa grecada (nervios cada 25 cm; cubre 2 m)."""
    rng = np.random.default_rng(semilla)
    yy, xx = np.mgrid[0:n, 0:n] / n * 2.0
    f = (xx / 0.25) % 1
    luz = 0.85 + 0.2 * (f < 0.2) - 0.12 * ((f > 0.2) & (f < 0.27))
    c = _hex(base)[None, None, :] * (luz[..., None] + (_fbm(rng, n)[..., None] - 0.5) * 0.06)
    return _imagen(nombre, c, carpeta)
