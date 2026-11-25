# Vídeos de los Premios InfoLinense 2026

Sistema que genera un vídeo vertical (1080 × 1920, 30 fps) por cada categoría con votación, a partir de los datos oficiales del repositorio `baautiista/premios-infolinense`.

## Cómo funciona

1. **Datos** — `scripts/premios-datos.py` aplica las migraciones del repositorio de los premios (la misma base de datos que usa la web) y escribe:
   - `src/premios/datos.json`: categorías publicadas con votación y sus candidaturas publicadas, sin suplentes, en orden alfabético.
   - `src/premios/<categoría>/config.ts`: guion de locución de cada vídeo. Todas las candidaturas tienen la misma frase (nombre y ámbito oficial) y el mismo tiempo en pantalla.
   - `src/premios/tiempos-locucion.ts`: índice de guiones y tiempos.
2. **Locución** — `npm run locucion -- premios/<categoría>`. Es la voz habitual de InfoLinense, a velocidad 1,18.
3. **Igualar tiempos** — `python3 -I scripts/premios-datos.py <repo> --igualar` mide la candidatura más larga de cada categoría y asigna ese tiempo a todas. Después hay que volver a generar la locución.
4. **Vídeo** — `PremiosCategoria.tsx` es el componente maestro. Las composiciones `Premios-<categoría>` se registran solas en `Root.tsx`.

```bash
python3 -I scripts/premios-datos.py ../premios-infolinense            # actualizar datos
npm run locucion -- premios/merito-deportivo                           # locución
npx remotion render Premios-merito-deportivo out/premios/merito-deportivo.mp4 --browser-executable=…
python3 scripts/srt.py premios/merito-deportivo out/premios/merito-deportivo.srt   # subtítulos
```

## Fotografías

El repositorio no incluye las fotos de las candidaturas, que están en Cloudflare R2. Mientras no haya foto, el retrato muestra las iniciales, igual que la web.

Para añadir la foto oficial, se guarda sin retocar en `public/premios/fotos/<slug-de-la-candidatura>.jpg`, usando el `slug` que figura en `datos.json`. El vídeo la usa automáticamente.

## Recursos

- **Logotipos:** el de los premios, el de InfoLinense, el de Carnavalinense y el de El Cofrade Linense, copiados de `public/brand/` del repositorio de los premios.
- **Tipografías:** Raleway (licencia SIL OFL) y Poppins Bold, las mismas de la web.
- **Música:** instrumental original generada con ElevenLabs para estos vídeos (`public/premios/musica.mp3`). Se recorta por el principio para que su cierre coincida con el final de cada vídeo.
