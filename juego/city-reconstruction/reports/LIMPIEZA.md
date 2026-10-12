# Análisis y corrección: suelos, fachadas sueltas, objetos flotantes y limpieza de la ciudad

| Problema | Causa encontrada en el código | Corrección |
|---|---|---|
| El personaje se hunde en la calle | Los personajes iban siempre a la altura del terreno (`SUELO`), pero la calzada se dibuja 0,30-0,38 m más arriba, las aceras a 0,52 m y los pavimentos de plaza a 0,24-0,35 m | `alturaSuelo()`: un rayo vertical contra las superficies pisables (calles, aceras, plazas, pavimentos de los sectores), con caché por celda de 0,4 m. Lo usan el jugador, los vecinos y los jugadores conectados |
| Edificios con solo la fachada | En los sectores, la orientación de cada pared se calculaba hacia el centroide de la huella. En huellas cóncavas (L, U) el centroide cae fuera, las paredes quedaban del revés y el motor las ocultaba | `interiorArista()`: el interior se decide por el sentido de giro del polígono |
| Sillas y mesas flotando | Las terrazas procedurales se ponían a 2,6 m de la fachada y a 0,52 m de altura fija, hubiera acera o no | Retiradas. Las terrazas reales de los sectores se apoyan en su pavimento |
| Casas sobre la calle | La huella OSM se convertía en el rectángulo que la envuelve; además, la calzada tenía una anchura fija | Huella ajustada a la planta real, calles a medida y validador (ver ZONA-PRUEBA.md) |

## Limpieza de la ciudad (`src/compartido/ciudad.ts`, compartido por juego y servidor)

- **Se conservan:**
  - todas las casas de la Plaza de la Iglesia, la Calle Real y la Plaza Cruz Herrera;
  - las 13 iglesias y parroquias;
  - en cada barrio, los 3 edificios públicos, escolares o deportivos más grandes;
  - los lugares del juego con modelo propio (Mercado, Fuerte, Estadio, Lonja, frontera…).
- **Se eliminan:** el resto de casas (más de 10 000).
- **Viviendas a la venta:** el catálogo de Hogar Linense solo ofrece viviendas en edificios que existen.
- **Edificios principales:** nunca se descartan; si estorban, se retranquean.
