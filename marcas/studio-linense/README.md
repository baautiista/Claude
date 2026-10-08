# Studio Linense — identidad visual (propuesta v1)

- `guia.html`: guía de identidad (concepto, versiones, color, tipografía, estilo, aplicaciones, ecosistema, tono).
- `alternativas.html` y `alternativas/`: 8 caminos alternativos de símbolo (02–09) con el mismo nombre y paleta.
- `horizontal-*`, `vertical-*`, `simbolo-*`: logo principal (01 · Esquina + módulo) en las variantes `noche`, `azul`, `claro`, `negro` y `blanco`. Las de fondo transparente (`claro`, `negro`, `blanco`) no llevan margen.
- `favicon.svg` (64 px, sobre azul noche) y `perfil.svg` (1080 × 1080, sobre azul eléctrico).

El texto del logo va trazado en Space Grotesk (Bold / Medium): no depende de la fuente instalada.

Paleta: azul noche `#061E5C`, azul eléctrico `#1F5EFF`, blanco, gris claro `#F4F6FA`, negro suave `#111318`, lima `#C7FF3D`.

## Regenerar

Los scripts de `fuente/` necesitan `@fontsource/space-grotesk` y `opentype.js` (`npm i` en la carpeta donde se ejecuten):

```bash
node gen.js <salida>/logos            # SVG del logo + piezas.json
node build.js guia.tpl.html <salida>/piezas.json guia.html
node alt.js <salida>/piezas.json alternativas.html <salida>/alternativas
```

## Ronda 2 — exploración de símbolo

`ronda-2.html` presenta 6 direcciones en blanco y negro y desarrolla 3: **A · Desfase** (LINE/NSE, una línea que se parte y baja su propio grosor), **B · Ensamble** (dos bloques unidos por colas de milano opuestas) y **C · Istmo** (dos masas unidas por una línea). En `ronda-2/` están el símbolo, la versión horizontal y la apilada en negro, la horizontal sobre claro y sobre oscuro, y el perfil de cada una, además de los bocetos descartados.

Logotipos trazados con Schibsted Grotesk (A), Syne (B) y Bricolage Grotesque (C). Para regenerar: `node r2page.js ronda-2.html ronda-2/` desde una carpeta con `@fontsource/{schibsted-grotesk,syne,bricolage-grotesque}` y `opentype.js` instalados (las rutas de fuentes son relativas a `r2lib.js`).

## Ronda 3 — la línea y el Peñón

`ronda-3.html`: 6 ideas en blanco y negro construidas sobre la idea de línea (trazo, frontera, horizonte, conexión, La Línea) con el Peñón como referencia abstracta, y 3 desarrolladas: **A · Renglones** (líneas de texto cuyos finales dibujan el perfil del Peñón; la última es el horizonte), **B · Trazo** (una línea que sube por el Peñón, cae por la cara norte y sigue recta como La Línea) y **C · Dos orillas** (ciudad baja, Peñón en cuña y la Verja como hueco). Los SVG están en `ronda-3/`. Logotipos trazados con Familjen Grotesk (A), Schibsted Grotesk (B) y Syne (C). Regenerar con `node r3page.js ronda-3.html ronda-3/` (necesita `r2page.js` al lado, porque reutiliza su hoja de estilos).

## Ronda 4 — lettering a medida

`ronda-4.html`: 6 direcciones de wordmark y 3 desarrolladas, con las letras de LINENSE (L, I, N, E, S) dibujadas desde cero: **A · Sobre la línea** (toda la palabra se apoya en una línea que nace en el pie de la L y sigue hasta el horizonte), **B · El paso** (la I es el poste fronterizo entre la L en positivo y NENSE en negativo) y **C · Roca y mar** (la L es una cuña de roca y el resto de letras son redondas, con la S como ola). Los SVG, con iconos derivados, están en `ronda-4/`. Regenerar con `node r4page.js ronda-4.html ronda-4/` (necesita `r2page.js` al lado).
