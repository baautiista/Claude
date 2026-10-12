# Reconstrucción automática de La Línea · informe · 2026-10-12

Sustituye al prototipo CENTRO-T01. Toda la ciudad se genera con `npm run ciudad`, organizada en teselas de 160 m. El juego carga en cada momento solo las teselas cercanas al jugador.

## 1. Fuentes de datos

| Fuente | Estado | Uso |
|---|---|---|
| Overture Maps 2026-09-23.1 (OSM + IGN) | **usada** (S3 público) | huellas, `num_floors`, `height` |
| OpenStreetMap (linea.json del juego) | **usada** | ejes de calle, nombres, comercios, `building:levels` |
| Catastro INSPIRE (WFS) | **bloqueada por la red del entorno** (proxy 403) | importador listo |
| PNOA LiDAR / IGN / CNIG | **bloqueada por la red del entorno** (proxy 403) | importador listo |

- **Para activar Catastro e IGN** hay dos caminos:
  - Añadir `ovc.catastro.meh.es`, `www.catastro.hacienda.gob.es`, `centrodedescargas.cnig.es` y `www.ign.es` a la lista de hosts permitidos del entorno.
  - O descargar los ficheros desde sus webs oficiales y dejarlos en `fuentes/importar/catastro/` (ZIP/GML INSPIRE) y `fuentes/importar/alturas/` (LAZ, GeoJSON o CSV). Después hay que ejecutar `npm run importar && npm run ciudad`.
- **Prioridad de fuentes** (siempre se usa la más fiable disponible; cada edificio guarda la fuente y la confianza de cada dato):
  - Plantas: Catastro (alta) > LiDAR (alta) > OSM `building:levels` (media) > Overture `num_floors` (media) > reglas (baja).
  - Altura: LiDAR > altura OSM/Overture > plantas × 3 m.
- **Las plantas nunca se deducen del nombre de la calle.** Cuando no hay dato, se estiman por reglas de manzana y tipología, y el edificio queda con confianza **baja** y estado AMARILLO.

## 2. Resultado de toda la ciudad

- **Edificios generados:** 12.589 en 142 teselas (90 con edificios). Hay 976 manzanas; se omiten 22 porque están modeladas a mano.
- **Plantas con dato real:** 2.076. De ellas, 2.043 vienen de Overture/IGN y 33 de OSM.
  - **Ojo:** el 91 % de esos datos reales dice "1 planta". Es coherente en La Atunara, El Zabal y Santa Margarita, pero conviene contrastarlo con Catastro en cuanto esté accesible.
- **Plantas estimadas por reglas:** 10.513 (confianza baja).
- **Alturas:** 19 tienen altura medida; el resto se calcula a partir de las plantas.
- **Estados:**
  - VERDE: **2.029**
  - AMARILLO: **10.346** (casi siempre por plantas estimadas)
  - ROJO: **214**
- **Errores detectados y reparados automáticamente:** 12 (solapes de parcela y huellas inválidas).
- **Recortes de edificios para ensanchar calles:** **0**.
  - El antiguo 4 % de recortes se ha eliminado.
  - El caso que lo justificaba era una huella a 0,97 m del eje de Calle de las Flores. Ahora la sección de calle se ajusta al ancho libre real.
- **Ejes de calle que entran en una huella:** 19. Son pasajes cubiertos (Pasaje Centro, del Teatro, Velada…) o desalineaciones entre OSM y la huella. No se recorta nada: quedan en ROJO.
- **Emblemáticos detectados:** 33, en `ciudad/emblematicos.json`. Quedan en nivel C para modelarlos uno a uno.

### Por barrio

| Barrio | Edificios | Verde | Amarillo | Rojo |
|---|---:|---:|---:|---:|
| San José | 1.969 | 34 | 1.896 | 39 |
| San Pedro | 1.499 | 20 | 1.470 | 9 |
| La Atunara | 1.363 | 435 | 897 | 31 |
| La Velada | 1.119 | 13 | 1.088 | 18 |
| San Bernardo | 1.104 | 2 | 1.079 | 23 |
| Santiago | 1.016 | 16 | 985 | 15 |
| Santa Margarita | 913 | 778 | 115 | 20 |
| El Zabal | 870 | 674 | 185 | 11 |
| La Colonia | 808 | 15 | 792 | 1 |
| Centro | 725 | 17 | 689 | 19 |
| Las Pedreras | 467 | 4 | 446 | 17 |
| Los Junquillos | 361 | 11 | 350 | 0 |
| Mondéjar | 272 | 3 | 264 | 5 |
| San Felipe | 60 | 7 | 51 | 2 |
| Bellavista | 43 | 0 | 39 | 4 |

## 3. Calles

La sección de cada tramo del juego se calcula con la distancia exacta entre su eje y la huella más cercana (`src/datos/ciudad/anchos.json`). Las aceras ya no se eliminan automáticamente.

Tramos en la zona cargada del Centro:

| Sección | Tramos |
|---|---:|
| Plataforma única | 1.910 |
| Acera estrecha | 1.496 |
| Peatonal | 609 |
| Convencional | 264 |

La auditoría en el navegador encontró 31 contactos entre calzada y edificio en el Centro. **Todos corresponden a edificios ya marcados en ROJO**, es decir, pasajes cubiertos. Ninguno es un edificio dado por válido.

## 4. Arquitectura

Las reglas por tipología son: Atunara, casa baja, casa de dos plantas, entre medianeras, burguesa, comercial del Centro, bloque, singular y anexo.

| Tipología | Edificios |
|---|---:|
| Entre medianeras | 5.468 |
| Burguesa | 2.569 |
| Casa baja | 1.220 |
| Atunara | 1.182 |
| Casa de dos plantas | 718 |
| Anexo | 652 |
| Bloque | 572 |
| Comercial | 175 |
| Singular | 33 |

Elementos que se generan:

- **Fachadas:** zócalo, recercados, persianas, balcones de forja, corridos y cierros.
- **Cubiertas:** azotea con pretil, dos y cuatro aguas, faldón de teja a la calle y almenillas en La Atunara.
- **Volumen:** áticos retranqueados y patios interiores.
- **Planta baja:** comercios con toldos según la orientación.
- **Variedad:** paletas de color por barrio.

## 5. Rendimiento (medido)

Medido en el Centro con streaming real: el jugador se coloca allí y se deja cargar solo. El renderizado del entorno es por **software** (SwiftShader), así que los FPS no representan un móvil real; sirven para comparar.

| Medida | Valor |
|---|---|
| Teselas cargadas a la vez | 9 de 142 (nunca toda la ciudad) |
| Edificios en escena | 3.535 |
| Carga progresiva completa | 341 s en software (en GPU real es muy inferior) |
| Construcción por bloque de 60 edificios | p50 135 ms · p95 603 ms · máx. 1,49 s |
| Llamadas de dibujo | 2.293 |
| Geometrías | 1.054 |
| Triángulos en pantalla | 10,2 M (escena completa con el mapa base) |
| Memoria JS | 1,8 GB (navegador sin GPU) |

Optimizaciones activas:

- Teselas cercanas en LOD0 (< 90 m), LOD1 (< 240 m) y LOD2 (más lejos).
- Descarga de las teselas lejanas.
- Presupuesto de unos 10 ms por fotograma.
- Materiales compartidos y geometría fusionada por tesela.
- Colisiones por tesela.
- Una corrección del editor reconstruye solo su tesela.

**Pendiente:** los 10 M de triángulos son demasiados para móvil. Habría que acortar las distancias de LOD o simplificar más el LOD1, y medirlo en un dispositivo real.

## 6. Validación automática

Comprobaciones por edificio (`auditarEdificio`):

- vértices dentro de la huella (± 1,6 m);
- nada por debajo del suelo;
- nada por encima de la altura + 6 m;
- cubierta presente.

**Resultado en el Centro:** 0 errores de geometría y 0 errores de página. Hay 85 módulos rechazados por falta de espacio, de 42.133 colocados.

Un edificio no se da por válido solo por no tener módulos rechazados: además cuentan sus fuentes, su confianza y el cruce de ejes de calle.

Capturas reales en `city-reconstruction/reports/capturas/` (Centro, vista alta y media). Las pruebas de La Atunara y San Bernardo se interrumpieron antes de terminar y quedan pendientes de repetir.


## 7. Editor y correcciones

- Se abre con `?editor=1` o desde **Ajustes → Editor de ciudad**.
- **Filtros** ROJO / AMARILLO / VERDE, contornos por estado y ficha con fuentes y confianza.
- **Campos editables:** plantas, altura, color, tipología, revestimiento, ventanas, balcones, cubierta, planta baja, ocultar y revisado.
- **Dónde se guarda cada corrección:**
  - en el servidor de Mi Línea (`correccionesCiudad`, solo para usuarios en `EDITORES`);
  - en la versión publicada, en la base de datos del artifact (colección `correcciones`, escritura solo para editores);
  - siempre, como respaldo, en el navegador.
- **Exportación** a JSON mediante descarga.
- Los datos generados nunca se sobrescriben: regenerar la ciudad conserva las correcciones.

## 8. Pendiente

1. Abrir la red a Catastro e IGN (o subir los ficheros) para convertir AMARILLO en VERDE con datos reales.
2. Revisar los 214 ROJO, sobre todo los pasajes cubiertos, que necesitan un modelo con soportal.
3. Modelar a mano los 33 emblemáticos.
4. Reducir los triángulos de LOD1/LOD2 y medir en un móvil real.
5. Fase 3 (Linense Jobs): sigue en espera.
