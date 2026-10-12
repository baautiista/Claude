# Generador automático de edificios reales — arquitectura y primera prueba

Fecha: 2026-10-12 · Prueba: manzana **CENTRO-T01** (Calle Doctor Villar, Edificio Iberia, Centro).

## Cómo se usa

```bash
npm run fuentes            # estado de las fuentes (escribe fuentes/estado.json)
npm run fuentes overture   # descarga los edificios de Overture para La Línea (S3 público)
npm run sector CENTRO-T01  # genera src/datos/sectores/CENTRO-T01.json + informe
npm run dev                # y abrir http://localhost:5173/?editor=1 para revisar
```

Los sectores se definen en `ciudad/sectores.json`; cada uno es una manzana real cerrada por calles de OSM.

## Arquitectura

1. **Datos (Python, `scripts/sector/`)**
   - `fuentes.py`: comprueba las fuentes y descarga los datos (Overture desde S3, solo los grupos de filas que tocan La Línea; Catastro WFS preparado).
   - `generar.py`:
     - delimita la manzana a partir de las calles reales y toma las huellas de Overture (que combina OSM e IGN) con las etiquetas de OSM;
     - valida y repara: huellas cerradas, duplicados, solapes y paso mínimo libre junto a cada calle;
     - clasifica cada arista (calle, medianera o patio);
     - asigna plantas y altura: dato de fuente o estimación marcada;
     - aplica las reglas de tipología, cubierta, uso de la planta baja, material, color y nivel A/B/C;
     - escribe el JSON del sector y su informe.
2. **Geometría (TypeScript, `src/mundo/sectores/generador.ts`)**: construye cada edificio con reglas arquitectónicas, usando las piezas de la biblioteca modular (`piezas.ts`):
   - muros, ventanas con carpintería y persiana, balcones de forja o corridos, cierros, rejas, toldos, molduras y cornisas;
   - azotea con pretil y casetón, o tejado.

   Cada módulo se comprueba antes de colocarse (que quepa en su cara y en su planta). Los que no caben se rechazan y se cuentan, nunca flotan.
3. **Correcciones (`src/datos/correcciones/<sector>.json`)**: es una capa independiente que el generador nunca escribe. El juego la aplica encima al cargar, así que regenerar un sector no pierde nada.
4. **Editor (`?editor=1`, `src/editor/editor.ts`)**:
   - al tocar un edificio se abre su ficha con fuente, origen de la altura, avisos y nivel;
   - se pueden cambiar plantas, altura, color, tipología, material, ventanas, balcones, cubierta, planta baja, modelo (generado u oculto) y estado (pendiente o correcto);
   - en desarrollo guarda en el fichero del repositorio a través del servidor de Vite; en la versión publicada guarda en el navegador y permite exportar.
5. **Escena**:
   - cada sector es un LOD propio (detalle cerca, versión ligera a 260 m), con una malla por material (unas 9 *draw calls* por sector);
   - comparte materiales y texturas con el resto de la ciudad;
   - sus huellas entran en las colisiones y en el validador;
   - sustituye a los rectángulos antiguos del mapa en esa manzana.

## Fuentes e integraciones (comprobadas desde este entorno)

| Fuente / herramienta | Estado | Uso |
|---|---|---|
| Overture Maps · buildings (release 2026-09-23.1) | **Accesible y usada** | 16.163 edificios de La Línea descargados: 12.615 de OSM y 3.548 del IGN. Solo 3.190 traen plantas, casi todas «1» y del IGN. |
| OpenStreetMap (extracto local) | **Usada** | Calles, nombres de vía, etiquetas de edificios y comercios. En el Centro no hay `building:levels`. |
| Catastro INSPIRE (WFS BU / ATOM) | **Bloqueado por la red del entorno** (403 en `ovc.catastro.meh.es` y `www.catastro.hacienda.gob.es`) | La descarga está programada en `fuentes.py catastro` pero **no se ha podido probar**. Daría huellas oficiales y número de plantas. |
| PNOA LiDAR (CNIG) | **Bloqueado** (`centrodedescargas.cnig.es`) | Sin alturas medidas ni cubiertas. |
| Overpass API | Bloqueado | No hace falta (hay extracto local de OSM). |
| Blender MCP | **No conectado** (no hay servidores MCP configurados) | — |
| Blender (bpy 5.2.2 sin interfaz) | Disponible en el entorno | Reservado para los modelos de nivel C (GLB). No interviene en el nivel A. |
| Blosm / OSM2World | No integrados | Hacen lo mismo que este generador, pero fuera del juego. Aquí la geometría se genera en el motor, con los mismos materiales, LOD y validador. |

**Para obtener alturas reales** hay que permitir en la configuración de red del entorno los dominios `ovc.catastro.meh.es`, `www.catastro.hacienda.gob.es` y `centrodedescargas.cnig.es`, o subir la descarga ATOM del municipio a `fuentes/catastro/`.

## Resultado de la prueba CENTRO-T01

- 16 edificios, todos con huella real de OSM (vía Overture), sin descartar ninguno. Uno recortado un 4 % para dejar paso en la calle.
- **Alturas: las 16 son estimadas** por reglas (tamaño de huella, frente a la calle y nombre «Edificio…») y así figuran en el JSON, el informe y la ficha del editor.
- Validación en el juego: 215 módulos colocados, 0 rechazados, 0 huellas inválidas y 3 caras demasiado cortas para llevar fachada (quedan como muro liso).
- Calles: las fachadas reales están a 1–3 m del eje (calles peatonales de 3–6 m). El juego ajusta esas calles a las fachadas y quita la acera donde no cabe, en vez de recortar las casas.
- Correcciones probadas de principio a fin:
  1. editar en el editor;
  2. guardar en `src/datos/correcciones/CENTRO-T01.json`;
  3. recargar y comprobar que se aplica;
  4. regenerar el sector con `npm run sector` y comprobar que se sigue aplicando.

  La corrección de prueba se retiró después.

## Pendiente

- Alturas reales (Catastro o LiDAR): necesitan acceso de red.
- Ampliar las tipologías: patios visibles, áticos retranqueados y cubiertas de varias aguas en huellas no rectangulares.
- Nivel C: modelos singulares en Blender y GLB.
- Generación por lotes de varios sectores y carga o descarga según la distancia (ahora todos los sectores generados se cargan al inicio).
