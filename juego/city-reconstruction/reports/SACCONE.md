# SACCONE · Jardines Saccone, Museo Cruz Herrera y Colegio Providencia del Sagrado Corazón

Código: `src/mundo/sectores/saccone.ts` (modelos) y `saccone.datos.ts` (datos de OSM).
Árboles nuevos: araucaria y drago en `src/mundo/vegetacion.ts`.

## Fuentes

- **Geometría**: OpenStreetMap (© colaboradores de OSM, ODbL), `fuentes/la-linea.geojson`.
  - Recinto de los jardines: `way/297040658` (Av. de España, 7; alt_name «Villa de San José»).
  - Museo Cruz Herrera: `relation/19040558`, con su fachada de dos torres y el cuerpo central retranqueado 2,1 m.
  - Sociedad Musical Linense: `way/1229253734`.
  - Colegio Providencia del Sagrado Corazón: `relation/17017391`, esquina de Av. de España con Av. del Mar (Av. de España, 9).
  - Caminos, entradas, fuente, monumento a la Inmaculada, busto de Luis Ramírez, estatuas y bancos: nodos y vías de OSM dentro del recinto.
- **Aspecto**: fotos, Street View y Google Maps que aportó el usuario. Solo sirven de referencia visual; no se usan como textura.
  - Museo: fachada, lateral, ampliación trasera y vista nocturna con el monumento.
  - Jardín: verja, puertas, interior, glorieta, estanques, castillito, fuente, busto y estatuas.
  - Colegio: torreón de la esquina.
  - Vistas aéreas.
- La dirección del museo (Villa San José, Av. de España, 7) y la del colegio (Av. de España, 9) están contrastadas en la web.

## Qué es dato y qué es estimación

| Elemento | Origen |
|---|---|
| Huellas del museo, colegio y Sociedad Musical | OSM |
| Caminos, fuente, monumento, busto, 2 estatuas y 3 bancos | OSM |
| Puertas de la verja | extremos de los caminos de OSM en el borde del recinto |
| Alturas del museo (≈10,4 m + ático), colegio (2 plantas, torreón de 3) y Sociedad Musical (≈4,2 m) | estimadas en las fotos |
| Fondo de la parte histórica del museo (25 m) frente a la ampliación (12 m) | estimado en las fotos y la vista aérea |
| Glorieta, estanques y escenario | posición aproximada (vista aérea y fotos) |
| Arcos de trepadoras en el Paseo de los Rocking Boys | tramo aproximado |
| Dos estatuas junto a la explanada del museo | posición aproximada |
| Arbolado | reparto generado: especies y densidad según fotos y vista aérea, no árbol a árbol |

## Pendiente de revisión

- Posición exacta de la glorieta, los estanques y el escenario.
- Interior del colegio (patios y pista cubierta): solo se ha modelado lo que se ve desde la calle.
- Edificios vecinos del colegio (`w1239125023` y `w769126775`): siguen siendo los generados.
