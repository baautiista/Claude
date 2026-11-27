# Reel «Alumbrado de Navidad de La Línea: 2023 → 2025 → 2026»

`montar_video.py` monta automáticamente el vídeo vertical (1080 × 1920, 30 fps, 42 s, H.264 + AAC) con FFmpeg. No hace falta MoviePy.

## 1. Instalar

**Python 3.8 o superior** — https://www.python.org/downloads/ (en Windows, marca «Add Python to PATH»).

**FFmpeg**

| Sistema | Comando |
|---|---|
| Windows | `winget install Gyan.FFmpeg` (después cierra y vuelve a abrir la terminal) |
| macOS | `brew install ffmpeg` (si no tienes Homebrew: https://brew.sh) |
| Linux (Debian/Ubuntu) | `sudo apt install ffmpeg` |

Para comprobar que todo funciona:

```
python --version
ffmpeg -version
```

(En macOS y Linux puede ser `python3` en lugar de `python`.)

## 2. Estructura de carpetas

```
alumbrado-navidad/
├── montar_video.py
├── fuentes/                  (opcional) pon aquí un .ttf, p. ej. Poppins-Bold.ttf
└── medios/
    ├── noticia_2023_1.png
    ├── noticia_2023_2.png
    ├── alcalde_2023.mp4
    ├── luces_2025_1.mp4
    ├── luces_2025_2.mp4
    ├── luces_2025_3.mp4
    ├── encendido_2026.mp4
    ├── mi_recorrido_2026.mp4
    ├── cierre_2026.mp4
    └── musica.mp3
```

Los nombres tienen que ser exactamente estos. Valen vídeos horizontales o verticales, de cualquier resolución.

## 3. Ejecutar

Desde la carpeta `alumbrado-navidad`:

```
python montar_video.py
```

El resultado es `alumbrado_navidad_la_linea_2026.mp4`. Tarda entre medio minuto y unos pocos minutos, según el ordenador.

Opciones:

```
python montar_video.py --rotulo "Calle Real"           # cambia el rótulo del recorrido
python montar_video.py --inicio-recorrido 12           # empieza el recorrido en su segundo 12
python montar_video.py --salida reel_final.mp4         # cambia el nombre del archivo final
```

Los textos, las duraciones y el volumen de la música están al principio de `montar_video.py`, en la sección «CONFIGURACIÓN EDITABLE».

## Qué hace, tramo a tramo

| Tiempo | Contenido | Tratamiento |
|---|---|---|
| 0:00–0:05 | `noticia_2023_1.png`, `noticia_2023_2.png`, `alcalde_2023.mp4` (1,7 + 1,7 + 1,6 s) | Ken Burns (zoom lento), desaturado y texto 2023 con fondo semitransparente. Las capturas de noticias se encajan enteras sobre un fondo desenfocado: con recorte vertical se perdería el titular. |
| 0:05–0:09 | `luces_2025_1/2/3.mp4` (1,33 s cada uno) | A todo color y texto 2025. |
| 0:09–0:12 | 0,5 s en negro + `encendido_2026.mp4` (2,5 s) | Zoom de impacto y texto 2026. |
| 0:12–0:36 | `mi_recorrido_2026.mp4` recortado a 24 s exactos | Solo el rótulo discreto abajo a la izquierda. Si el vídeo dura menos de 24 s, se congela el último fotograma. |
| 0:36–0:42 | `cierre_2026.mp4` | Texto centrado y fundido a negro. |
| Música | `musica.mp3` | Suave hasta el segundo 10, sube en el *drop* y hace fundido en los 3 últimos segundos. Se repite si dura menos de 42 s. |

Todo se pasa a vertical 9:16 con recorte centrado, sin deformar.

Los tramos intermedios quedan en la carpeta `tmp/`; si algo sale mal, ahí puedes ver cuál falla. El sonido original de los clips se descarta y solo suena la música.

## Problemas habituales

- **«No encuentro ffmpeg»**: FFmpeg no está en el PATH. Cierra y vuelve a abrir la terminal después de instalarlo.
- **«Falta el archivo: medios/…»**: revisa el nombre y la extensión, incluidas mayúsculas, `.MP4` frente a `.mp4`, etc.
- **No encuentra ninguna tipografía**: copia cualquier archivo `.ttf` en la carpeta `fuentes/`.
- **Error de `drawtext`**: tu FFmpeg está compilado sin textos. Instala la versión completa con los comandos de arriba.
