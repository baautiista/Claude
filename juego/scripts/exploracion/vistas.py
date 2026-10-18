"""
Punto de vista común de un edificio: el mismo encuadre en Google Earth, en el juego y en Blender.

La cámara se coloca frente a la fachada a calle más larga del edificio, a `dist` metros y a
`alto` metros del suelo, mirando al centro de la fachada. Solo depende de la huella (coordenadas
del juego) y de las caras (calle/patio/medianera), así que sirve igual desde Python normal y
desde el Python de Blender (no usa librerías externas).
"""
import math
from urllib.parse import quote

L0, A0, KX, KY = -5.3762, 36.2005, 89842, 110950  # proyección del juego (1 unidad = 1 m)


def a_lonlat(x, y):
    return (L0 + x / KX, A0 - y / KY)


def _dentro(p, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > p[1]) != (yj > p[1]) and p[0] < (xj - xi) * (p[1] - yi) / ((yj - yi) or 1e-12) + xi:
            c = not c
        j = i
    return c


def fachada_principal(huella, caras):
    """(centro, normal exterior, longitud) de la fachada a calle más larga (o del lado más largo)."""
    mejor = None
    for i in range(len(huella)):
        a, b = huella[i], huella[(i + 1) % len(huella)]
        L = math.dist(a, b)
        calle = caras and i < len(caras) and caras[i] == "calle"
        clave = (1 if calle else 0, L)
        if not mejor or clave > mejor[0]:
            mejor = (clave, a, b, L)
    _, a, b, L = mejor
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    ux, uy = (b[0] - a[0]) / (L or 1), (b[1] - a[1]) / (L or 1)
    n = (uy, -ux)
    if _dentro((m[0] + n[0] * 0.5, m[1] + n[1] * 0.5), huella):
        n = (-n[0], -n[1])
    return m, n, L


def vista(huella, caras, altura, dist=None):
    """Cámara (x, y, z) y objetivo (x, y, z) en coordenadas del juego (z = altura sobre el suelo)."""
    m, n, L = fachada_principal(huella, caras)
    d = dist or max(14.0, min(40.0, L * 0.9 + altura * 0.6))
    cam = (m[0] + n[0] * d, m[1] + n[1] * d, min(1.7 + altura * 0.35, 9.0))
    obj = (m[0], m[1], altura * 0.45)
    return cam, obj


def rumbo(desde, hacia):
    """Rumbo en grados desde el norte (sentido horario); en el juego +y es el sur."""
    return math.degrees(math.atan2(hacia[0] - desde[0], -(hacia[1] - desde[1]))) % 360


def url_google_earth(huella, caras, altura):
    """Enlace a Google Earth Web con la cámara frente a la fachada (abre en el navegador del usuario)."""
    cam, obj = vista(huella, caras, altura)
    lon, lat = a_lonlat(obj[0], obj[1])
    dist = math.dist(cam[:2], obj[:2])
    h = rumbo(cam, obj)
    inclinacion = 75  # casi horizontal, como a pie de calle
    return f"https://earth.google.com/web/@{lat:.6f},{lon:.6f},{obj[2]:.1f}a,{dist * 1.6:.0f}d,35y,{h:.1f}h,{inclinacion}t,0r"


def url_juego(base, huella, caras, altura, etiqueta=""):
    """Enlace al juego en modo revisión, con la misma cámara (vista a pie de calle)."""
    cam, obj = vista(huella, caras, altura)
    return f"{base}?revisar={cam[0]:.1f},{cam[1]:.1f}&mira={obj[0]:.1f},{obj[1]:.1f}&etiqueta={quote(etiqueta)}"
