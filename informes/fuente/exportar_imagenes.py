"""Exporta cada propuesta como imagen PNG para redes (1080 × 1350, formato 4:5).

Uso:  python3 informes/fuente/exportar_imagenes.py
Requiere Node con Playwright global y el Chromium del entorno (ver CLAUDE.md).
Escribe informes/imagenes/<código>-<título>.png
"""
import base64
import html
import json
import re
import subprocess
import tempfile
import unicodedata
from pathlib import Path

import ilustraciones

FUENTE = Path(__file__).resolve().parent
SALIDA = FUENTE.parent / "imagenes"
RAIZ = FUENTE.parent.parent
FONTS = RAIZ / "mi-video" / "public" / "fonts"
ISOTIPO = RAIZ / "mi-video" / "public" / "marca" / "isotipo.png"
CHROMIUM = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"

INFORMES = {
    "cines-y-teatros.html": "Cines y teatros",
    "patios-de-vecinos.html": "Patios de vecinos",
    "ciudad-fortificada.html": "Ciudad fortificada",
    "index.html": "Proyecto paraguas",
}


def texto_plano(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def propuestas():
    for archivo, tema in INFORMES.items():
        fuente = (FUENTE / archivo).read_text(encoding="utf-8")
        for art in re.findall(r'<article class="proyecto[^"]*">(.*?)</article>', fuente, re.S):
            codigo, etiqueta = re.search(r'class="codigo">([A-Z]\d) · ([^<]*)<', art).groups()
            titulo = texto_plano(re.search(r"<h3>(.*?)</h3>", art, re.S).group(1))
            desc = texto_plano(re.search(r'<div class="desc">\s*<p>(.*?)</p>', art, re.S).group(1))
            yield {"codigo": codigo, "etiqueta": etiqueta, "tema": tema, "titulo": titulo, "desc": desc}


def pagina(p, fuentes_css, isotipo):
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
{fuentes_css}
*{{box-sizing:border-box;margin:0}}
body{{width:1080px;height:1350px;background:#1F5EFF;color:#fff;font-family:Inter,sans-serif;overflow:hidden}}
.ilus{{width:1080px;height:720px;overflow:hidden}} .ilus svg{{display:block;width:100%;height:100%}}
.panel{{height:630px;padding:56px 80px 64px;display:flex;flex-direction:column;gap:26px;position:relative}}
.panel::before{{content:"";position:absolute;left:0;top:0;width:100%;height:14px;background:#C4E910}}
.eti{{align-self:flex-start;background:#fff;color:#1F5EFF;font:800 24px Poppins,sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:8px 16px}}
h1{{font:800 68px/1.04 Poppins,sans-serif;letter-spacing:-.02em;text-wrap:balance}}
p{{font-size:31px;line-height:1.4;color:rgba(255,255,255,.92);max-width:30ch}}
.pie{{margin-top:auto;display:flex;align-items:center;justify-content:space-between;font:700 26px Poppins,sans-serif}}
.pie .m{{display:flex;align-items:center;gap:14px;font-weight:800;font-size:30px}} .pie img{{height:44px}}
.pie .c{{color:#C4E910}}
</style></head><body>
<div class="ilus">{ilustraciones.svg(p["codigo"])}</div>
<div class="panel"><span class="eti">{html.escape(p["tema"])} · {p["codigo"]}</span>
<h1>{html.escape(p["titulo"])}</h1><p>{html.escape(p["desc"])}</p>
<div class="pie"><span class="m"><img src="{isotipo}" alt="">InfoLinense</span><span class="c">Propuesta para La Línea</span></div></div>
</body></html>"""


def main():
    fuentes_css = "".join(
        f'@font-face{{font-family:"{fam}";font-weight:{w};src:url(data:font/woff2;base64,'
        f'{base64.b64encode((FONTS / f"{fam}-{w}.woff2").read_bytes()).decode()})}}'
        for fam, w in [("Poppins", "700"), ("Poppins", "800"), ("Inter", "400")]
    )
    isotipo = "data:image/png;base64," + base64.b64encode(ISOTIPO.read_bytes()).decode()
    SALIDA.mkdir(exist_ok=True)
    trabajos = []
    with tempfile.TemporaryDirectory() as tmp:
        for p in propuestas():
            origen = Path(tmp) / f"{p['codigo']}.html"
            origen.write_text(pagina(p, fuentes_css, isotipo), encoding="utf-8")
            trabajos.append([str(origen), str(SALIDA / f"{p['codigo']}-{slug(p['titulo'])}.png")])
        raiz_npm = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
        script = f"""
import {{ chromium }} from '{raiz_npm}/playwright/index.mjs';
const b = await chromium.launch({{ executablePath: {json.dumps(CHROMIUM)} }});
const p = await b.newPage({{ viewport: {{ width: 1080, height: 1350 }} }});
for (const [src, out] of {json.dumps(trabajos)}) {{
  await p.goto('file://' + src); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({{ path: out }});
}}
await b.close();
"""
        subprocess.run(["node", "--input-type=module", "-e", script], check=True)
    for _, out in trabajos:
        print(Path(out).name)


if __name__ == "__main__":
    main()
