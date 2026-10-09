# Mi Línea · un juego de InfoLinense

Juego narrativo para móvil ambientado en La Línea de la Concepción. Mezcla la producción de Hay Day, el rol de profesiones y la vida de Los Sims, y lo une todo con una historia.

**Temporada 1 · Capítulo 1: «La caja de la abuela».** Vuelves a La Línea a vender la casa de tu abuela Concha, en San Bernardo. En una caja de lata encuentras tres cosas: una foto de 1968 en el Paseo de Poniente, la llave del puesto 14 del Mercado y una carta que nunca cruzó la Verja. Para averiguar quién era «M.», tendrás que trabajar, hablar con los vecinos y tomar una decisión que cambia el final.

## Qué hay en el prototipo

**Un mundo 3D con estilo Hay Day** (Three.js): césped, casas encaladas con persianas, macetas y teja, árboles frondosos, farolas que se encienden de noche, agua turquesa, avión que aterriza en Gibraltar y la nube del levante sobre el Peñón.

| Sistema | Contenido |
|---|---|
| Mapa | Costas y barrios calcados del ortofoto; **calles del plano turístico del Ayuntamiento** con su nombre: Avenida de España, Príncipe de Asturias, Paseo del Mediterráneo, Banqueta, Ejército, Calle Real, Gibraltar, Menéndez Pelayo, etc. La red por la que se anda se genera sola desde las calles. |
| Lugares | Plaza de la Iglesia (como en la foto: espadaña, reloj, monumento con seto), Mercado con el puesto 14, Calle Real, Paseo de Poniente, playa de Levante, Estadio y Ciudad Deportiva, fuerte de Santa Bárbara, La Verja, Parque Princesa Sofía. |
| La Atunara | Dársena con escollera, muelle con barcas como las reales (blancas, borda azul, franja roja y amarilla, pórtico), casetas de pescadores, lonja y fábrica de hielo. |
| El Zabal | Huertos cercados con muro de bloque, casetas, piscinas, caminos de tierra y pinares; polígono industrial. |
| Hay Day | Compras semillas → vas andando al Zabal → plantas en tus bancales → **ves crecer** las plantas → cosechas. La barca **sale al mar** y vuelve con la captura. La cocina tiene cola de 3 platos con humo en la chimenea. El puesto 14 **vende solo** a los clientes. Tablón de encargos en la plaza. Todo en tiempo real (1 s = 1 min de juego). |
| Historia | Capítulo 1 «La caja de la abuela» con 3 finales. |
| Oficios | Pescador/a, hortelano/a o periodista, con su minijuego de jornada. |
| Vida | Energía, comida, ánimo y gente; día y noche; viento diario. |
| InfoLinense | El móvil del personaje es la web de InfoLinense (noticias de la ciudad del juego y, opcionalmente, el feed real). |

La partida se guarda sola en el dispositivo.

## Desarrollo

```bash
npm install
npm run dev      # servidor local (abre en el móvil con la IP que muestra)
npm run build    # dist/index.html: un único archivo autocontenido
```

Código en TypeScript: Three.js para el mundo 3D (modelos y texturas generados por código, sin archivos externos) y HTML para la interfaz.

```
src/
  datos/mapa.ts         mapa, barrios, calles caminables y lugares
  datos/objetos.ts      objetos, cultivos, recetas y precios
  datos/personajes.ts   vecinos
  estado.ts             partida, reloj, viento, necesidades, encargos y guardado
  historia.ts           capítulo 1: objetivos, escenas y decisiones
  juego.ts              bucle principal: HUD, diálogos, desplazamientos
  mundo/mundo.ts        mundo 3D: terreno, ciudad, cámara, gestos, sincronización
  mundo/modelos.ts      modelos low-poly estilo Hay Day (iglesia, barcas, huertos…)
  mundo/texturas.ts     texturas pintadas con canvas (césped, adoquín, teja, fachadas)
  mapa/rutas.ts         camino más corto por las calles reales (Dijkstra con montículo)
  ui/                   lugares, minijuegos, móvil InfoLinense, paneles
  config.ts             conexión con el feed real de InfoLinense
scripts/geojson-a-mapa.mjs  GeoJSON de OSM → geometría del juego (linea.json)
```

## El mapa: La Línea real, en isométrico

El mapa se construye desde **datos reales de OpenStreetMap** (GeoJSON exportado con Overpass), no desde una imagen:

```bash
# El GeoJSON original (22 MB) va en fuentes/ y no se sube al repositorio.
node scripts/geojson-a-mapa.mjs fuentes/la-linea.geojson   # → src/datos/linea.json (1,1 MB)
```

El preprocesador:

- **Reconstruye la costa.** El GeoJSON no trae línea de costa, así que se calcula por franjas de 40 m con la extensión real de playas, puerto, calles y edificios. Resultado: la silueta del istmo entre la Bahía y el Mediterráneo, hasta la Verja.
- **Convierte las calles en caminos.** Unos 5.400 tramos de OSM pasan a ser un grafo caminable con nodos en los cruces reales (6.574) y tramos con su clase (avenida, calle, peatonal, sendero, pista), su nombre y su forma.
- **Simplifica los edificios.** Las 10.674 huellas reales pasan a ser rectángulos orientados con tipo: casa, bloque, nave, iglesia, escuela, edificio público, ruina o caseta. El juego los dibuja con su estilo: fachadas encaladas con persianas, tejas, azoteas y bloques con balcones.
- **Agrupa los usos del suelo** en capas de juego: residencial, parques, césped, matorral, huertos, industrial, plazas, playas, agua, piscinas, campos de fútbol y solares.
- **Extrae los puntos de interés reales:** Plaza de la Iglesia, Santuario de la Inmaculada, Mercado de La Concepción, Lonja y Puerto Pesquero de La Atunara, Estadio, Fuerte de Santa Bárbara, Polígono del Zabal, estación, aduana…

Unidades: 1 unidad = 2 m, norte arriba. Las distancias se respetan; para que se lea como un juego se exageran las alturas, los anchos de calle y los personajes.

### Zonas desbloqueables

| Zona | Nivel |
|---|---|
| Centro y San Bernardo | 1 |
| Mercado, El Zabal | 2 |
| La Atunara | 3 |
| Playas (Poniente y Levante) | 4 |
| Estadio y Santa Bárbara, El Junquillo | 5 |
| La Verja | 6 |

La experiencia se gana cosechando, cocinando, vendiendo en el puesto, entregando encargos, trabajando y avanzando en la historia. Si la historia te lleva a una zona, esa zona se abre aunque no tengas el nivel. Todo lo que tienes y construyes forma parte de un único mundo continuo y se guarda con la partida.

### Fases

1. **Hecho:** forma de la ciudad, costa, calles reales, edificios, usos del suelo, lugares y zonas jugables por nivel.
2. **Construcción** en los solares reales (los terrenos en obras o sin edificar del GeoJSON, ya señalados con cartel lima): churrería, conservera, freiduría, comercios. Cada uno será una cadena de producción nueva.
3. **Más vida:** tráfico, peatones, barcos en la bahía y eventos por barrio (Feria en el recinto ferial real, Carnaval).

## Noticias reales de InfoLinense

Rellena `FEED_URL` (RSS de la web) y `WEB_URL` en `src/config.ts`. El móvil del juego muestra entonces la pestaña «En infolinense». Regla editorial: sucesos, tribunales y política nunca se convierten en eventos de juego.

## Hacia las tiendas (iOS y Android)

El juego ya es una web móvil de un solo archivo. Para publicarlo:

1. Envolverlo con **Capacitor** (`npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`, `npx cap init`, `webDir: "dist"`).
2. Sustituir `localStorage` por guardado en la nube (cuentas) para no perder partidas.
3. Arte final, música, notificaciones («Tus tomates están listos»), compras integradas (cosmética y pase de temporada) y analítica.
4. Clasificación PEGI, política de privacidad (RGPD) y fichas de tienda.

## Próximos pasos de contenido

- **Capítulo 2 · La Feria:** caseta de la peña, decisiones de barrio, temporada de verano y Levante.
- Oficios de hostelería (bar de Lola) y tendero/a (puesto 14 con gestión).
- Más barrios: El Junquillo, San Pedro, Santa Margarita, La Colonia, Alcaidesa.
- **Temporada 3 · La Verja:** Gibraltar jugable y el reencuentro con Manolo.
