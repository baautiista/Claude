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
