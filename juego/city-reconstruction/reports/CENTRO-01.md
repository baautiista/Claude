# CENTRO-01 · Plaza de la Iglesia — informe de validación

Estado: **pendiente de revisión** (esperando la aprobación del usuario para pasar a CENTRO-02).

Código: `src/mundo/sectores/centro01.ts` (modelos del sector) y `src/mundo/sectores/piezas.ts` (piezas reutilizables). Integración en `src/mundo/mundo.ts` (`construirSectores`).

## Referencias usadas

Aportadas por el usuario el 2026-10-11, solo como referencia visual (no se guardan en el repositorio ni se usan como textura):

- 3 capturas de Google Maps: dos vistas 3D inclinadas de la plaza y una vista cenital del entorno.
- 6 capturas de Street View: esquina del edificio verde con La Parada, fachada de la iglesia con el quiosco, iglesia con la torre de ladrillo, edificio blanco con el monumento, edificio rosa del pasaje y chaflán del edificio verde.
- 2 fotos del monumento con la iglesia al fondo.

La geometría (posición, huellas y orientación) sale de OpenStreetMap (© colaboradores de OSM, ODbL).

## 1. Edificios recreados

| Edificio | Huella | Qué se ha modelado | Observado / estimado |
|---|---|---|---|
| Santuario de la Inmaculada Concepción | OSM (fachada 9,4 m, fondo 16,5 m) | Nave encalada con tejado de teja a dos aguas, costados con pilastras ocres y ventanas con reja. Fachada con zócalo y pilastras ocres, frisos de ajedrezado rojo, ventanas laterales con reja y puerta en arco. Hornacina con azulejo de la Virgen, cartel azul, volutas en S con albardilla ocre y pináculos de terracota. Frontón con reloj y rombos rojos. Espadaña de tres campanas más una, con balconcillos de hierro, cornisas, remate curvo con óculo y cruz. Verja negra sobre murete ocre, compás y escalinata. | Composición, colores y elementos: **observados**. Alturas (espadaña ≈ 21 m con la cruz): **estimadas**. |
| Edificio verde de la esquina (Duque de Tetuán) | OSM (chaflán real) | Basamento de sillería de dos alturas, tres plantas verde salvia con pilastras crema, balcones de hierro, cierros en los laterales, portal de forja en el chaflán, cornisa con friso y jarrones en las esquinas. | **Observado** (Street View). Número de plantas: estimado. |
| Edificio crema de cierros (vecino del verde) | OSM | Mismo lenguaje que el verde, en crema. | **Estimado**: solo se ve de refilón en una captura. |
| Casa de Ruperto Toledano Fernández | OSM | Dos plantas de fachada de azulejo/ladrillo, pilastras e impostas blancas, balconeras en arco con balcones blancos, un cierro y pretil de pilares rojos con balaustres blancos. Delante, la terraza cerrada del Café Bar La Parada (paneles granate, cristal y rótulo azul). | **Observado**. El dibujo exacto del azulejo se ha simplificado. |
| Torre de ladrillo (boca de Calle Real) | OSM | Planta baja comercial con rótulo, ocho plantas de ladrillo amarillento con forjados marcados, persianas, toldos y balcones, balcones corridos en la esquina suroeste y ático blanco. | **Observado**. Ocho plantas más ático: contadas en la foto, altura estimada. |
| Edificio blanco del tejado a cuatro aguas | OSM | Bajos con arcos acristalados, toldos verdes festoneados y rótulo magenta. Tres plantas con carpintería de madera, rejas, balcones y contraventanas marrones. Tejado de teja a cuatro aguas con dos chimeneas. | **Observado**. |
| Edificio rosa del pasaje (cara sur) | **Estimada** (no está en OSM) | Bajos de sillería con los dos grandes arcos del pasaje, primera planta crema con balaustres, cuatro plantas rosas con cuerpos salientes rematados por frontoncillos, balaustradas y balcones de hierro. Toldos de las terrazas y dos templetes de teja en la azotea. | Fachada **observada**. Huella y fondo: **estimados** con las vistas aéreas. |
| Edificio verde estrecho de celosías | **Estimada** | Planta baja comercial, cuatro plantas verdes con celosía blanca de piezas cuadradas y balcones. | **Observado** de lejos. Huella estimada. |

## 2. Calles y elementos urbanos

- **Plaza:** pavimento gris con rosa de los vientos de puntas grises y rosadas alrededor del monumento.
- **Monumento a José Cruz Herrera:** tres mujeres de bronce con traje de flamenca, mantón y peineta, sobre pedestal rosado con placa en forma de paleta y rodeadas de un seto circular. OSM lo rotula «Las Tres Gracias»; la placa de las fotos lo identifica como homenaje al pintor linense José Cruz Herrera.
- **Calles laterales de la iglesia:**
  - A poniente, adoquín y plátanos de sombra; se corresponde con la calle Padre Rodríguez Cantizano y su aparcamiento de motos.
  - A levante, ladrillo en espiga con plátanos.
  - Los árboles son los de OSM, ahora como plátanos altos.
- **Quioscos:** dos, con cúpula oscura, cuerpo granate y toldo de rayas rojas y blancas, a los lados del compás de la iglesia (el «Kiosco Inmaculada» de la foto).
- **Mobiliario:**
  - 6 farolas fernandinas de cuatro brazos con farolillo central;
  - 2 bancos granates delante de la verja;
  - 5 bolardos de acero;
  - un macetero con magnolio joven;
  - terrazas con sombrillas blancas (lado sur) y oscuras (lado oeste).
- **Tablón de encargos del juego:** se ha movido a la esquina sureste de la plaza para que no tape las vistas reales. No existe en la plaza real.

## 3. Capturas reales del juego

Hechas con el propio juego (Three.js, render por software en el servidor de pruebas, sin retoques), con la interfaz oculta:

| Vista | Archivo | Referencia comparable |
|---|---|---|
| Aérea desde el sur | `CENTRO-01/aerea_sur.jpg` | Google Maps 3D, segunda captura |
| Aérea desde el noreste | `CENTRO-01/aerea_ne.jpg` | Google Maps 3D, primera captura |
| Cenital | `CENTRO-01/cenital.jpg` | Google Maps, vista cenital |
| La iglesia desde el sureste de la plaza | `CENTRO-01/monumento.jpg` | Foto del monumento con la iglesia (segunda foto) |
| Iglesia, monumento y torre | `CENTRO-01/iglesia_torre.jpg` | Street View 3 |
| Edificio blanco y monumento | `CENTRO-01/blanca.jpg` | Street View 4 |
| Edificio verde (chaflán) | `CENTRO-01/verde.jpg` | Street View 6 |
| Edificio rosa del pasaje | `CENTRO-01/rosa.jpg` | Street View 5 |
| Quiosco, La Parada y plátanos | `CENTRO-01/toledano.jpg` | Street View 2 |
| Cámara normal del juego (dos ángulos) | `CENTRO-01/juego_160_0.jpg`, `juego_160_2.jpg` | — |

## 4. Comparación con las referencias

**Coincide:**
- la disposición de la plaza: iglesia al norte, torre al este, edificio blanco en la boca de Calle Real, edificio rosa del pasaje al sur, edificio verde del chaflán al oeste y Toledano con La Parada al noroeste;
- la silueta y los colores de la fachada de la iglesia: blanco y ocre, ajedrezado rojo, reloj, tres campanas más una y la cruz;
- los quioscos de cúpula, las farolas fernandinas, los bancos granates y la verja;
- el chaflán verde con basamento de piedra;
- los toldos verdes festoneados y las contraventanas del edificio blanco;
- los templetes de teja del edificio rosa, que se ven en la vista aérea.

## 5. Diferencias importantes

1. **Esculturas:** son figuras estilizadas (falda con volantes, mantón y peineta) y no un retrato de las reales. Se distinguen de lejos, pero de cerca se ven muy geométricas.
2. **Iglesia:**
   - La fachada usa el ancho de OSM (9,4 m) y puede ser algo más estrecha que la real.
   - Los costados y la nave se han hecho sin fotos laterales.
3. **Edificio rosa y edificio estrecho:** su huella es estimada (OSM no los tiene).
4. **Fachadas que no se ven en las fotos** (traseras y medianeras): se han dejado lisas.
5. **Azulejos de la casa Toledano:** representados con el material de ladrillo, no con el dibujo real.
6. **Árboles:** se usa el árbol de sombra genérico del juego, más bajo y más denso que los plátanos reales.
7. **Rótulos comerciales:** sin texto (Dentix, La Parada, populares…), solo los colores.

## 6. Pendiente

- Mejorar las esculturas si hacen falta fotos de cerca de cada figura.
- Foto lateral de la iglesia (por la calle Padre Rodríguez Cantizano) para ajustar la nave.
- Confirmar el número de plantas del edificio crema y del rosa.
- Un plátano de sombra específico (tronco claro moteado, copa alta) servirá también para otros sectores.

## 7. Compilación y funcionamiento

- `npm run build` (comprobación de tipos + Vite): correcto.
- `npm run pruebas`: 58 de 58 correctas.
- El juego arranca sin errores en la consola. Las capturas están hechas con el juego en marcha.
- Coste del sector, en triángulos de cerca / de lejos (LOD a 260 m):
  - iglesia: 6k / 3k;
  - resto del sector: 101k / 43k.
- Las huellas OSM sustituidas ya no se dibujan; el resto de la ciudad no cambia.
- Viviendas, economía y profesiones no se tocan.
- La iglesia sigue siendo el punto que abre el lugar «Plaza de la Iglesia» al tocarla.
