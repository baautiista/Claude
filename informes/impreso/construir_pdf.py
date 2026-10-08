"""Compila el informe impreso en PDF A4 a partir de informe.html, impreso.css y los informes web.

Uso:  python3 informes/impreso/construir_pdf.py
Salida: informes/impreso/La-Linea-con-memoria-InfoLinense.pdf

Reutiliza las figuras y las fichas de proyecto de informes/fuente/*.html para que web e impreso
no se desincronicen. Hace dos pasadas: la primera para localizar en qué página empieza cada
capítulo (con pdftotext) y la segunda para escribir esos números en el índice.
"""
import base64
import io
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
FUENTE = AQUI.parent / "fuente"
RAIZ = AQUI.parent.parent
sys.path.insert(0, str(FUENTE))
import ilustraciones  # noqa: E402

FONTS = RAIZ / "mi-video" / "public" / "fonts"
MARCA = RAIZ / "mi-video" / "public" / "marca"
CHROMIUM = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"
SALIDA = AQUI / "La-Linea-con-memoria-InfoLinense.pdf"

# Capítulo -> texto de su título, para localizar su página en el PDF.
CAPITULOS = {
    "resumen": "Resumen ejecutivo",
    "metodologia": "1. Introducción y metodología",
    "contexto": "2. Contexto histórico",
    "cines": "3. Cines y teatros",
    "patios": "4. Patios de vecinos",
    "fortificada": "5. Ciudad fortificada",
    "transversales": "6. Proyectos transversales",
    "innovadoras": "7. Propuestas innovadoras",
    "implantacion": "8. Plan de implantación",
    "difusion": "9. Difusión",
    "conclusiones": "10. Conclusiones",
    "bibliografia": "Fuentes y bibliografía",
    "anexo": "Anexo · Datos pendientes",
}


def data_uri(datos: bytes, tipo: str) -> str:
    return f"data:{tipo};base64,{base64.b64encode(datos).decode()}"


def isotipo_azul() -> str:
    im = Image.open(MARCA / "isotipo.png").convert("RGBA")
    azul = Image.new("RGBA", im.size, (31, 94, 255, 255))
    azul.putalpha(im.getchannel("A"))
    buf = io.BytesIO()
    azul.save(buf, "PNG")
    return data_uri(buf.getvalue(), "image/png")


def fuentes_css() -> str:
    caras = [("Poppins", w) for w in ("400", "600", "700", "800")] + [("Inter", w) for w in ("400", "600")]
    return "".join(
        f'@font-face{{font-family:"{f}";font-weight:{w};src:url({data_uri((FONTS / f"{f}-{w}.woff2").read_bytes(), "font/woff2")}) format("woff2")}}'
        for f, w in caras
    )


def figuras() -> dict:
    out = {}
    for archivo in FUENTE.glob("*.html"):
        for m in re.finditer(r'<svg[^>]*aria-labelledby="([^"]+)".*?</svg>', archivo.read_text(encoding="utf-8"), re.S):
            out[m.group(1)] = m.group(0)
    return out


def fichas(archivo: str) -> str:
    html = (FUENTE / f"{archivo}.html").read_text(encoding="utf-8")
    tarjetas = []
    for clase, art in re.findall(r'<article class="(proyecto[^"]*)">(.*?)</article>', html, re.S):
        codigo, etiqueta = re.search(r'class="codigo">([A-Z]\d) · ([^<]*)<', art).groups()
        titulo = re.search(r"<h3>(.*?)</h3>", art, re.S).group(1)
        desc = re.search(r'<div class="desc">(.*?)</div>', art, re.S).group(1).strip()
        pie = re.findall(r"<dt>(.*?)</dt><dd>(.*?)</dd>", art)
        bandera = "estrella" in clase
        dl = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in pie)
        marca = "<em>Bandera</em>" if bandera else ""
        tarjetas.append(
            f'<article class="ficha-p{" bandera" if bandera else ""}"><div class="ilus">{ilustraciones.svg(codigo)}</div>'
            f'<div class="cuerpo"><div class="cod"><span>{codigo} · {etiqueta}</span>{marca}</div><h3>{titulo}</h3>{desc}</div>'
            f"<dl>{dl}</dl></article>"
        )
    return f'<div class="proyectos">{"".join(tarjetas)}</div>'


def componer(paginas: dict) -> str:
    cuerpo = (AQUI / "informe.html").read_text(encoding="utf-8")
    cuerpo = re.sub(r"^<!--.*?-->\s*", "", cuerpo, flags=re.S)
    figs = figuras()
    cuerpo = re.sub(r"\{\{FIG:([\w-]+)\}\}", lambda m: figs[m.group(1)], cuerpo)
    cuerpo = re.sub(r"\{\{PROY:([\w-]+)\}\}", lambda m: fichas(m.group(1)), cuerpo)
    cuerpo = re.sub(r"\{\{PAG:(\w+)\}\}", lambda m: str(paginas.get(m.group(1), "–")), cuerpo)
    cuerpo = cuerpo.replace("{{LOGO}}", data_uri((MARCA / "logo.png").read_bytes(), "image/png"))
    cuerpo = cuerpo.replace("{{ISOTIPO_AZUL}}", isotipo_azul())
    css = fuentes_css() + (AQUI / "impreso.css").read_text(encoding="utf-8")
    return (
        '<!doctype html><html lang="es"><head><meta charset="utf-8">'
        "<title>La Línea con memoria · InfoLinense</title>"
        f"<style>{css}</style></head><body>{cuerpo}</body></html>"
    )


def a_pdf(html: str, destino: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        origen = Path(tmp) / "informe.html"
        origen.write_text(html, encoding="utf-8")
        raiz_npm = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
        script = f"""
import {{ chromium }} from '{raiz_npm}/playwright/index.mjs';
const b = await chromium.launch({{ executablePath: {json.dumps(CHROMIUM)} }});
const p = await b.newPage();
await p.goto('file://' + {json.dumps(str(origen))});
await p.evaluate(() => document.fonts.ready);
await p.pdf({{ path: {json.dumps(str(destino))}, preferCSSPageSize: true, printBackground: true }});
await b.close();
"""
        subprocess.run(["node", "--input-type=module", "-e", script], check=True)


def localizar(pdf: Path) -> dict:
    texto = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True).stdout
    paginas = texto.split("\f")
    encontrados = {}
    for clave, titulo in CAPITULOS.items():
        for n, pag in enumerate(paginas[3:], start=4):  # saltar portada, carta e índice
            if titulo in re.sub(r"\s+", " ", pag):
                encontrados[clave] = n
                break
    return encontrados


def main() -> None:
    a_pdf(componer({}), SALIDA)
    paginas = localizar(SALIDA)
    faltan = set(CAPITULOS) - set(paginas)
    if faltan:
        print("Aviso: no se localizaron", sorted(faltan))
    a_pdf(componer(paginas), SALIDA)
    total = subprocess.run(["pdfinfo", str(SALIDA)], capture_output=True, text=True).stdout
    print(re.search(r"Pages:\s+\d+", total).group(0), "·", SALIDA.name)
    print(json.dumps(paginas, ensure_ascii=False))


if __name__ == "__main__":
    main()
