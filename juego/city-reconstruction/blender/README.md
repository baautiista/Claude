# Agente de Blender · La Línea City

Blender 5.2.2 LTS funciona en segundo plano como módulo de Python (`bpy`, PyPI). No necesita interfaz ni GPU: renderiza con Mesa por software.

## Instalación (una vez por máquina)

```
python3.13 -m venv /opt/blender-venv
/opt/blender-venv/bin/pip install bpy==5.2.2
apt-get install -y libegl1 libgl1 libegl-mesa0 libgles2 libxkbcommon0 libsm6 libxi6 libxxf86vm1 libxfixes3 libxrender1
npm i            # incluye @gltf-transform/cli (compresión meshopt)
```

## Uso

```
python3 scripts/blender/lote.py AURORA-01 B-w1259462248      # manzana contigua a ese edificio → lote
/opt/blender-venv/bin/python scripts/blender/generar.py AURORA-01
```

## Qué genera

| Ruta | Contenido |
|---|---|
| `blend/<lote>.blend` | Original editable: un objeto por edificio y nivel, con `edificio_id`, `lod` y `osm` |
| `public/modelos/manzanas/<lote>.glb` | GLB optimizado (cuantización + meshopt) que carga el juego |
| `render/<lote>-*.png` | Validación visual: aérea, a pie de calle y nivel lejano |
| `informes/<lote>.json` | Triángulos, altura comprobada y problemas por edificio |
| `registro.json` | Edificios completados, para no repetir trabajo |
| `src/datos/modelos/indice.json` | Lo que importa el juego (`src/mundo/ciudad/modelosBlender.ts`) |

## Sobre el MCP de Blender

Los MCP de Blender que existen (por ejemplo `blender-mcp`) necesitan Blender abierto con interfaz y un complemento escuchando por socket. Aquí no hay pantalla, así que se usa la API `bpy` directamente: es más fiable para trabajar por lotes.
