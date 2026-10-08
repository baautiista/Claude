"""Genera los informes HTML autónomos (estilos, fuentes e isotipo incrustados).

Uso:  python3 informes/fuente/construir.py [carpeta_artefacto]

Escribe informes/<nombre>.html, que se abren sin conexión y se pueden enviar por correo.
Si se indica carpeta_artefacto, deja también allí la versión para publicar como Artifact:
index.html sin esqueleto <html> (lo añade la plataforma) y los informes completos.
"""
import base64
import re
import sys
from pathlib import Path

import ilustraciones

FUENTE = Path(__file__).resolve().parent
INFORMES = FUENTE.parent
RAIZ = INFORMES.parent
FONTS = RAIZ / "mi-video" / "public" / "fonts"
ISOTIPO = RAIZ / "mi-video" / "public" / "marca" / "isotipo.png"

PAGINAS = ["index", "cines-y-teatros", "patios-de-vecinos", "ciudad-fortificada"]
FUENTES = [("Poppins", "600"), ("Poppins", "700"), ("Poppins", "800"), ("Inter", "400"), ("Inter", "600")]


def b64(ruta: Path) -> str:
    return base64.b64encode(ruta.read_bytes()).decode()


def font_faces() -> str:
    return "\n".join(
        f'@font-face{{font-family:"{fam}";font-weight:{w};font-style:normal;font-display:swap;'
        f'src:url(data:font/woff2;base64,{b64(FONTS / f"{fam}-{w}.woff2")}) format("woff2")}}'
        for fam, w in FUENTES
    )


def main() -> None:
    estilos = font_faces() + "\n" + (FUENTE / "estilos.css").read_text(encoding="utf-8")
    isotipo = "data:image/png;base64," + b64(ISOTIPO)
    destino_artefacto = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if destino_artefacto:
        destino_artefacto.mkdir(parents=True, exist_ok=True)

    for nombre in PAGINAS:
        fuente = (FUENTE / f"{nombre}.html").read_text(encoding="utf-8")
        titulo = re.search(r"<title>(.*?)</title>", fuente).group(1)
        cuerpo = re.sub(r"<title>.*?</title>\s*", "", fuente, count=1).replace("{{ISOTIPO}}", isotipo)
        cuerpo = re.sub(r"\{\{ILUS:([A-Z]\d)\}\}", lambda m: ilustraciones.svg(m.group(1)), cuerpo)
        completo = (
            '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f"<title>{titulo} · InfoLinense</title>\n<style>\n{estilos}\n</style>\n</head>\n<body>\n"
            f"{cuerpo}</body>\n</html>\n"
        )
        (INFORMES / f"{nombre}.html").write_text(completo, encoding="utf-8")
        if destino_artefacto:
            if nombre == "index":
                pagina = f"<title>{titulo}</title>\n<style>\n{estilos}\n</style>\n{cuerpo}"
            else:
                pagina = completo
            (destino_artefacto / f"{nombre}.html").write_text(pagina, encoding="utf-8")
        print(f"{nombre}.html  {len(completo) // 1024} KB")


if __name__ == "__main__":
    main()
