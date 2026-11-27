# Documental «El alumbrado navideño de La Línea, 2023 → 2026»

- **Formato:** vertical, 1080 × 1920, 30 fps, 61 s.
- **Composición:** `AlumbradoNavidadLaLinea`, en la carpeta *Documentales* de Remotion Studio.
- **Portada:** `Miniatura`. La portada anterior pasa a llamarse `MiniaturaEstacionAutobusesLaLinea`.

## Montaje

| Tiempo | Escena | Material |
|---|---|---|
| 0:00–0:04 | **Gancho.** Texto «Hace solo tres años…» y entrada del año **2023** | Foto de archivo de 2023, en blanco y negro con grano |
| 0:04–0:18 | **Hemeroteca.** Los recortes entran como papel y la cámara busca el titular; el subrayado dorado marca «Es el que podemos pagar», la cita del BMW y la «deuda de 127 millones» | Capturas de Diario Área y La Razón |
| 0:18–0:26 | **Palabras del alcalde** | Clip original si existe; si no, las dos citas publicadas sobre un fotograma de su vídeo |
| 0:26–0:31 | **2024.** El contador pasa de 2023 a 2024 y aparece «Comienza el cambio»; las imágenes recuperan el color | Fotos del encendido de 2024 (pendientes) |
| 0:31–0:38,5 | **2025.** Comparativa 2023 → 2025, «Nuevos espacios», «Nuevos elementos decorativos» y «Espectáculo de drones» | Encendido de 2025 y dos fotos de drones |
| 0:38,5–0:54 | **2026, clímax.** Más calles iluminadas, cota del árbol (0 → 16 m), tres relojes «3 pases diarios», antes/después 2023 → 2026 y destellos sincronizados | Fotos y vídeo de 2026 (pendientes) |
| 0:54–1:01 | **Cierre.** «La misma ciudad. / Tres años después. / Una Navidad diferente.», logo e INFOLINENSE.COM | Mejor imagen de 2026 (pendiente) |

La identidad es la de InfoLinense con dorado navideño `#E4D27B` en lugar de lima. Las tipografías son Bricolage Grotesque para los titulares, Poppins como equivalente libre de Object Sans e Inter para los subtítulos.

## Material pendiente

Basta con copiar cada archivo en `public/alumbrado/` con estos nombres y volver a renderizar. Mientras falta, en su lugar aparece un hueco que dice «MATERIAL PENDIENTE».

| Archivo | Qué es |
|---|---|
| `2026-plaza-iglesia.jpg` | Apertura de 2026 (debajo del contador 2025 → 2026) |
| `2026-calles.jpg` | Calles iluminadas de 2026 |
| `2026-arbol.jpg` | Árbol de 16 m. Mejor si es vertical y se ve entero |
| `2026-espectaculo.mp4` (o `.jpg`, cambiando la extensión en `config.ts`) | Espectáculo de luz y sonido |
| `2026-mismo-lugar.jpg` | El mismo encuadre que `archivo-2023.jpg` (arco de estrellas junto al grupo escultórico), para el antes/después |
| `2026-cierre.jpg` | La mejor imagen de 2026, para el cierre |
| `encendido-2024-1.jpg`, `encendido-2024-2.jpg` | Encendido y nuevos motivos de 2024 (vídeo de Europa Sur) |
| `alcalde-2023.mp4` | Unos 8 s del vídeo de Juan Franco del 4 de diciembre de 2023 (Facebook). Ver abajo |

**Clip del alcalde.** Recorta el fragmento y guárdalo como `alcalde-2023.mp4`. En `config.ts`, dentro de `ALCALDE.subtitulos`, escribe la transcripción literal por tramos, con este formato: `{ desde: 0, hasta: 3.2, texto: "Me *encantaría* tener…" }`. Las palabras entre asteriscos salen en dorado. El vídeo suena con su audio original y la música baja sola. No escribas en los subtítulos nada que no se oiga.

Los créditos de cada imagen están en `MEDIOS`, en `config.ts`.

## Fuentes

| Recurso | Fuente | Estado |
|---|---|---|
| Titular «El alcalde de La Línea responde a las críticas por el alumbrado de Navidad: «Es el que podemos pagar»» | Diario Área, https://www.diarioarea.com/la-linea/la-linea-alumbrado-de-navidad-1/ | Captura aportada por InfoLinense. Fecha exacta sin comprobar: dice «diciembre de 2023» |
| Titular «El alcalde de La Línea y las luces de Navidad: "Me encantaría tener un BMW 525 y tengo un Toyota Auris de segunda mano"» y entradilla con la «deuda de 127 millones» | La Razón, https://www.larazon.es/andalucia/alcalde-linea-luces-navidad-encantaria-tener-bmw-525-tengo-toyota-auris-segunda-mano_20231205656ef19262c50d0001b8f7bc.html | Captura aportada. La fecha, 5 de diciembre de 2023, sale de la URL |
| Foto de archivo de 2023 (arco de estrellas) | Recortada de la captura de Diario Área | Crédito: Diario Área |
| Fotograma del alcalde | Recortado de la captura de La Razón, que lo toma de su vídeo | Crédito: vídeo de Juan Franco vía La Razón |
| Encendido de 2025 (Plaza de la Iglesia, regalos luminosos) | Aportada por InfoLinense | Crédito asignado: Diario Área. **Hay que confirmarlo** |
| Drones de 2025 (adornos y «Feliz Año Nuevo») | Aportadas por InfoLinense | Crédito asignado: Europa Sur. **Hay que confirmarlo** |
| Datos de 2026: árbol de 16 m, tres pases diarios, espectáculo de luz y sonido | Briefing de InfoLinense | Sin contrastar con una fuente publicada |

Las webs de Diario Área, La Razón y Europa Sur, y el vídeo de Facebook, no se pudieron abrir desde el entorno de producción porque la red estaba bloqueada. Por eso no se descargó material de esas webs: todo el material real viene de las imágenes aportadas.

## Audio

- **Locución:** voz habitual de InfoLinense (ElevenLabs, Jacobo Montoro), velocidad 1,06. `npm run locucion -- alumbrado`.
- **Música:** instrumental original generada con ElevenLabs a partir de un plan en cinco tramos: piano nostálgico, pausa, crecimiento, clímax orquestal y resolución. El clímax coincide con 2026.
- **Efectos:** proyector, papel, subrayado, barridos, contador, destellos y ambiente de plaza, generados con ElevenLabs. Son originales.
- **Mezcla final:** normalizada a −14 LUFS con pico de −1,5 dBTP.

## Render

```bash
npx remotion render AlumbradoNavidadLaLinea out/alumbrado/bruto.mp4 --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --crf=18
ffmpeg -i out/alumbrado/bruto.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/alumbrado/alumbrado-navidad-la-linea.mp4
npx remotion still Miniatura out/alumbrado/portada.png --browser-executable=…
```
