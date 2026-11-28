# «La Línea 2026. Una Navidad de película»

Composición `NavidadDePelicula2026`, en la carpeta *Navidad* de Remotion Studio. Es vertical, 1080 × 1920, y usa los fotogramas por segundo y la duración del vídeo original.

## Pasos

1. Copia el vídeo del espectáculo en `public/navidad2026/espectaculo.mp4`.
2. `node --experimental-strip-types scripts/analizar-video.ts navidad2026`
   Mide la intensidad de la ópera fotograma a fotograma, detecta sus acentos y localiza las luces reales del espectáculo cada medio segundo. Con eso:
   - los cortes de la hemeroteca se ajustan al acento más cercano,
   - los destellos estrellados caen sobre luces reales,
   - los reflejos y las estelas de polvo dorado acompañan los acentos de la música.
3. Renderiza:
   `npx remotion render NavidadDePelicula2026 out/navidad2026/navidad-de-pelicula-2026.mp4 --crf=16 --browser-executable=…`

## Estructura

| Tiempo | Qué ocurre |
|---|---|
| 0–12,2 s | **Hemeroteca.** Fotos antiguas con parallax y recortes de prensa superpuestos, con sombra y papel. La cámara se acerca a los titulares y hay un subrayado dorado discreto. Los titulares no se tocan. Suena ya el audio original. |
| 10,8–13,8 s | **Resplandor dorado** que llena la pantalla y revela el vídeo original. |
| 12,5–18,9 s | **Título.** «La Línea» en Cinzel con brillo metálico; «2026» en Cormorant entre filetes; «Una Navidad de película» en Great Vibes, escrita con un hilo de luz. Se va con un desenfoque suave. |
| 12,2 s–final | **Vídeo original** con etalonaje (negros profundos, contraste de cine, dorados cálidos, color del espectáculo intacto) y resplandor solo en las luces altas. Encima: partículas suspendidas a tres profundidades, hilos de luz, estelas de polvo dorado (algunas pasan cerca de la cámara), destellos sobre luces reales y reflejos en los acentos de la ópera. |
| Últimos 2,8 s | **Logo** de InfoLinense en blanco con un pequeño destello. |

Los parámetros están en `config.ts`:

- `REVELACION`: el segundo en que vuelve el vídeo.
- `TITULO`: cuándo entra y cuándo sale el título.
- `INTENSIDAD_EFECTOS`: de 0 a 1; bájalo si algún efecto molesta.
- `ENCUADRE`: `cover` recorta el vídeo para llenar el formato; `contain` lo encaja sobre un fondo desenfocado.
- `ARCHIVO`: el orden y los tiempos de la hemeroteca.

## Material de archivo (`public/navidad2026/archivo/`)

| Archivo | Origen |
|---|---|
| `prensa-diarioarea.jpg` | Captura de Diario Área: «El alcalde de La Línea responde a las críticas por el alumbrado de Navidad: «Es el que podemos pagar»» |
| `prensa-larazon.jpg` | Captura de La Razón: «El alcalde de La Línea y las luces de Navidad: "Me encantaría tener un BMW 525…"» |
| `recorte-concejal.jpg` | Recorte aportado: «Recuerda el concejal que hubo un año sin luz municipal…». El medio no figura |
| `arco-estrellas-2023.jpg` | Foto de 2023, recortada de la captura de Diario Área |
| `iglesia-arboles-azules.jpg`, `plaza-arbol-anillos.jpg`, `calle-adornos.jpg` | Fotos antiguas aportadas, sin fecha |
| `plaza-esculturas-arboles-azules.jpg`, `iglesia-guirnaldas-blancas.jpg` | Fotos antiguas aportadas, sin fecha |

No se ha añadido música, locución ni texto inventado.

## Tipografías (licencia SIL OFL)

Cinzel, Cormorant Garamond y Great Vibes, de Fontsource, en `public/navidad2026/fonts/`.
