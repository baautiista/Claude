#!/usr/bin/env python3
"""
Monta el Reel «Alumbrado de Navidad de La Línea: 2023 → 2025 → 2026».
Vertical 1080 × 1920, 30 fps, 42 s, H.264 + AAC.

Uso:
    python montar_video.py                    # usa la carpeta «medios» junto a este script
    python montar_video.py --rotulo "Calle Real" --inicio-recorrido 5

Solo necesita Python 3.8+ y FFmpeg (con drawtext, incluido en las compilaciones habituales).
Cada tramo se renderiza por separado con el mismo formato y después se unen sin recodificar,
así que es estable y fácil de depurar (los tramos quedan en la carpeta «tmp»).
"""
import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

# ----------------------------------------------------------------------------
# CONFIGURACIÓN EDITABLE
# ----------------------------------------------------------------------------
ANCHO, ALTO, FPS = 1080, 1920, 30

TEXTOS = {
    # Ojo: los titulares que tenemos de 2023 citan «Es el que podemos pagar» y
    # «Me encantaría tener un BMW 525 y tengo un Toyota Auris de segunda mano».
    # Si cambias esta frase, entre comillas pon solo palabras que el alcalde dijera literalmente.
    "2023": "2023: «Es el que podemos pagar»",
    "2025": "2025: Empezamos a callar bocas.",
    "2026": "2026: Ahora le ponemos banda sonora.",
    "rotulo": "Plaza de la Iglesia",
    "cierre": "De las críticas… a esto.\nNavidad 2026 en La Línea",
}

# Escaleta: (archivo, duración en s, modo).
#   modo "recortar": llena la pantalla vertical con recorte centrado (sin deformar).
#   modo "encajar": la imagen entera sobre un fondo desenfocado de sí misma
#                   (para capturas de noticias: con recorte se perdería el titular).
TRAMO_2023 = [
    ("noticia_2023_1.png", 1.7, "encajar"),
    ("noticia_2023_2.png", 1.7, "encajar"),
    ("alcalde_2023.mp4", 1.6, "recortar"),
]
TRAMO_2025 = [
    ("luces_2025_1.mp4", 4.0 / 3, "recortar"),
    ("luces_2025_2.mp4", 4.0 / 3, "recortar"),
    ("luces_2025_3.mp4", 4.0 / 3, "recortar"),
]
NEGRO_2026 = 0.5
ENCENDIDO_2026 = ("encendido_2026.mp4", 2.5, "recortar")
RECORRIDO = ("mi_recorrido_2026.mp4", 24.0, "recortar")
CIERRE = ("cierre_2026.mp4", 6.0, "recortar")
MUSICA = "musica.mp3"

# Música: volumen bajo hasta el «drop» del segundo 10, subida rápida y fundido final de 3 s.
VOLUMEN_INICIAL, VOLUMEN_DROP, SEGUNDO_DROP, SUBIDA = 0.35, 1.0, 10.0, 0.4
FUNDIDO_FINAL = 3.0
DURACION_TOTAL = 42.0

# ----------------------------------------------------------------------------

BASE = Path(__file__).resolve().parent
TMP = BASE / "tmp"
ES_IMAGEN = {".png", ".jpg", ".jpeg", ".webp"}


def ejecutar(cmd):
    print("  $ " + " ".join(str(c) for c in cmd[:6]) + " …")
    r = subprocess.run([str(c) for c in cmd], cwd=TMP, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-3000:])
        sys.exit(f"Error al ejecutar FFmpeg (código {r.returncode}). Arriba tienes el detalle.")


def duracion_de(ruta):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ruta)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def buscar_fuente():
    """Busca una tipografía gruesa y la copia como tmp/fuente.ttf (evita rutas con espacios o «C:»)."""
    propia = sorted((BASE / "fuentes").glob("*.[ot]tf")) if (BASE / "fuentes").exists() else []
    candidatas = [str(p) for p in propia] + [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ]
    for c in candidatas:
        if os.path.exists(c):
            shutil.copy(c, TMP / "fuente.ttf")
            print(f"Tipografía: {c}")
            return
    sys.exit("No encuentro ninguna tipografía. Copia un archivo .ttf (p. ej. Poppins-Bold.ttf) en la carpeta «fuentes».")


def partir(contenido, max_car):
    """Parte el texto en líneas de como mucho max_car caracteres (respeta los saltos de línea puestos a mano)."""
    lineas = []
    for parrafo in contenido.split("\n"):
        actual = ""
        for palabra in parrafo.split():
            if actual and len(actual) + 1 + len(palabra) > max_car:
                lineas.append(actual)
                actual = palabra
            else:
                actual = f"{actual} {palabra}".strip()
        lineas.append(actual)
    return lineas


def texto(nombre, contenido, tam, y, caja=True, x=None, alfa_caja=0.55, max_car=24):
    """Texto con fondo semitransparente, ajustado al ancho vertical: una línea por drawtext, centradas.
    Cada línea se lee de un archivo (así « » … no dan problemas de escape). `y` es la posición de la primera
    línea; si es "centro", el bloque se centra en la pantalla."""
    lineas = partir(contenido, max_car)
    alto_linea = int(tam * 1.55)
    filtros = []
    for k, linea in enumerate(lineas):
        (TMP / f"{nombre}{k}.txt").write_text(linea, encoding="utf-8")
        if y == "centro":
            yk = f"(h/2)-{len(lineas) * alto_linea / 2:.0f}+{k * alto_linea}"
        else:
            yk = f"{y}+{k * alto_linea}"
        partes = ["drawtext=fontfile=fuente.ttf", f"textfile={nombre}{k}.txt", "fontcolor=white", f"fontsize={tam}",
                  f"x={x if x is not None else '(w-text_w)/2'}", f"y={yk}"]
        if caja:
            partes += ["box=1", f"boxcolor=black@{alfa_caja}", f"boxborderw={int(tam * 0.35)}"]
        filtros.append(":".join(partes))
    return ",".join(filtros)


def encuadre(modo, duracion, zoom=0.0):
    """Filtros para pasar cualquier clip o imagen a 1080 × 1920 sin deformarlo, con zoom opcional (Ken Burns)."""
    llenar = f"scale={ANCHO}:{ALTO}:force_original_aspect_ratio=increase,crop={ANCHO}:{ALTO}"
    if zoom:
        # Ken Burns: acercamiento progresivo al centro (zoompan fotograma a fotograma, con margen 2× para que sea suave)
        total = max(1, round(duracion * FPS))
        llenar = (f"scale={ANCHO * 2}:{ALTO * 2}:force_original_aspect_ratio=increase,crop={ANCHO * 2}:{ALTO * 2},"
                  f"zoompan=z='1+{zoom}*on/{total}':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':s={ANCHO}x{ALTO}:fps={FPS}")
    if modo == "recortar":
        return f"[0:v]{llenar},fps={FPS},setsar=1[v]"
    # encajar: fondo desenfocado + imagen completa centrada
    fondo = f"scale={ANCHO}:{ALTO}:force_original_aspect_ratio=increase,crop={ANCHO}:{ALTO},gblur=sigma=40,eq=brightness=-0.15"
    frente = f"scale={ANCHO - 80}:{ALTO}:force_original_aspect_ratio=decrease"
    if zoom:
        frente += f",scale=w='iw*(1+{zoom}*t/{duracion:.3f})':h=-2:eval=frame"
    return f"[0:v]split[a][b];[a]{fondo}[f];[b]{frente}[i];[f][i]overlay=(W-w)/2:(H-h)/2,fps={FPS},setsar=1[v]"


def tramo(salida, archivo, duracion, modo, extra="", zoom=0.0, inicio=0.0, alargar=False):
    """Renderiza un tramo sin audio con el formato común."""
    origen = BASE / "medios" / archivo
    if not origen.exists():
        sys.exit(f"Falta el archivo: medios/{archivo}")
    entrada = ["-loop", "1", "-framerate", str(FPS), "-t", f"{duracion:.3f}", "-i", str(origen)] \
        if origen.suffix.lower() in ES_IMAGEN else ["-ss", f"{inicio:.3f}", "-i", str(origen)]
    grafo = encuadre(modo, duracion, zoom)
    if alargar:
        # Si el vídeo es más corto que el hueco, se congela el último fotograma hasta completarlo
        grafo = grafo.replace("[v]", f",tpad=stop_mode=clone:stop_duration={duracion:.3f}[v]", 1)
    if extra:
        grafo = grafo.replace("[v]", f",{extra}[v]", 1)
    ejecutar(["ffmpeg", "-y", *entrada, "-filter_complex", grafo, "-map", "[v]", "-t", f"{duracion:.3f}", "-an",
              "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), salida])
    return salida


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rotulo", default=TEXTOS["rotulo"], help="rótulo discreto del recorrido (esquina inferior izquierda)")
    ap.add_argument("--inicio-recorrido", type=float, default=0.0, help="segundo de mi_recorrido_2026.mp4 desde el que empezar")
    ap.add_argument("--salida", default="alumbrado_navidad_la_linea_2026.mp4")
    args = ap.parse_args()

    for herramienta in ("ffmpeg", "ffprobe"):
        if not shutil.which(herramienta):
            sys.exit(f"No encuentro «{herramienta}». Instala FFmpeg (ver LEEME.md) y vuelve a intentarlo.")
    TMP.mkdir(exist_ok=True)
    buscar_fuente()
    partes = []

    # 0:00–0:05 · Archivo 2023: Ken Burns, desaturado, texto con fondo semitransparente
    print("Tramo 2023…")
    t2023 = texto("t2023", TEXTOS["2023"], 64, "300")
    for i, (archivo, dur, modo) in enumerate(TRAMO_2023):
        partes.append(tramo(f"a{i}.mp4", archivo, dur, modo, extra=f"eq=saturation=0.55:contrast=0.95,{t2023}", zoom=0.08))

    # 0:05–0:09 · Archivo 2025: cortes rápidos a todo color
    print("Tramo 2025…")
    t2025 = texto("t2025", TEXTOS["2025"], 70, "300")
    for i, (archivo, dur, modo) in enumerate(TRAMO_2025):
        partes.append(tramo(f"b{i}.mp4", archivo, dur, modo, extra=t2025, alargar=True))

    # 0:09–0:12 · Corte a negro 0,5 s + plano de impacto 2026
    print("Tramo 2026…")
    ejecutar(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c=black:s={ANCHO}x{ALTO}:r={FPS}:d={NEGRO_2026}",
              "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "negro.mp4"])
    partes.append("negro.mp4")
    t2026 = texto("t2026", TEXTOS["2026"], 70, "300")
    archivo, dur, modo = ENCENDIDO_2026
    # impacto: el plano entra con un ligero zoom de golpe
    partes.append(tramo("c.mp4", archivo, dur, modo, extra=t2026, zoom=0.06, alargar=True))

    # 0:12–0:36 · Mi recorrido (24 s exactos), solo rótulo discreto abajo a la izquierda
    print("Recorrido…")
    archivo, dur, modo = RECORRIDO
    real = duracion_de(BASE / "medios" / archivo) - args.inicio_recorrido
    if real < dur:
        print(f"  Aviso: el recorrido dura {real:.1f} s; se congela el último fotograma hasta completar {dur:.0f} s.")
    rotulo = texto("rotulo", args.rotulo, 38, "h-460", x="80", alfa_caja=0.4, max_car=40)
    partes.append(tramo("d.mp4", archivo, dur, modo, extra=rotulo, inicio=args.inicio_recorrido, alargar=True))

    # 0:36–0:42 · Cierre con texto centrado y fundido a negro
    print("Cierre…")
    archivo, dur, modo = CIERRE
    tcierre = texto("tcierre", TEXTOS["cierre"], 64, "centro", alfa_caja=0.45)
    partes.append(tramo("e.mp4", archivo, dur, modo, extra=f"{tcierre},fade=t=out:st={dur - 1.2:.2f}:d=1.2", alargar=True))

    # Unión sin recodificar + música
    print("Uniendo y añadiendo música…")
    (TMP / "lista.txt").write_text("".join(f"file '{p}'\n" for p in partes), encoding="utf-8")
    ejecutar(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "lista.txt", "-c", "copy", "video.mp4"])
    musica = BASE / "medios" / MUSICA
    if not musica.exists():
        sys.exit("Falta medios/musica.mp3")
    rampa = (f"volume='if(lt(t,{SEGUNDO_DROP - SUBIDA}),{VOLUMEN_INICIAL},"
             f"if(lt(t,{SEGUNDO_DROP}),{VOLUMEN_INICIAL}+(t-{SEGUNDO_DROP - SUBIDA})/{SUBIDA}*{VOLUMEN_DROP - VOLUMEN_INICIAL},"
             f"{VOLUMEN_DROP}))':eval=frame")
    audio = f"[1:a]atrim=0:{DURACION_TOTAL},asetpts=PTS-STARTPTS,{rampa},afade=t=out:st={DURACION_TOTAL - FUNDIDO_FINAL}:d={FUNDIDO_FINAL}[a]"
    destino = BASE / args.salida
    ejecutar(["ffmpeg", "-y", "-i", "video.mp4", "-stream_loop", "-1", "-i", str(musica), "-filter_complex", audio,
              "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
              "-t", f"{DURACION_TOTAL}", "-movflags", "+faststart", str(destino)])
    print(f"\nListo: {destino}  ({duracion_de(destino):.1f} s, {ANCHO}×{ALTO}, {FPS} fps)")


if __name__ == "__main__":
    main()
