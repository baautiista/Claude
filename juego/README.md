# Mi Línea · un juego de InfoLinense

Juego narrativo para móvil ambientado en La Línea de la Concepción. Mezcla la producción de Hay Day, el rol de profesiones y la vida de Los Sims, y lo une todo con una historia.

**Temporada 1 · Capítulo 1: «La caja de la abuela».** Vuelves a La Línea a vender la casa de tu abuela Concha, en San Bernardo. En una caja de lata encuentras tres cosas: una foto de 1968 en el Paseo de Poniente, la llave del puesto 14 del Mercado y una carta que nunca cruzó la Verja. Para averiguar quién era «M.», tendrás que trabajar, hablar con los vecinos y tomar una decisión que cambia el final.

## Qué hay en el prototipo

| Sistema | Contenido |
|---|---|
| Mapa | Istmo con la bahía, el Mediterráneo, la Verja, la pista y el Peñón. 13 lugares en 6 barrios. Se toca un lugar y el personaje va andando por las calles. |
| Historia | Capítulo 1 completo, 11 pasos y 3 finales (publicar en InfoLinense, buscar con discreción o guardar la carta). Incluye la historia del cierre de la Verja (1969–1982). |
| Oficios | Pescador/a en La Atunara (pesca por tiempo), hortelano/a en El Zabal (plagas) y periodista en InfoLinense (contrastar fuentes y elegir titular, sin sensacionalismo). |
| Producción | Huerto en el patio (tomate, lechuga, pimiento), cocina con 5 recetas locales (tortillitas, pescaíto, pipirrana…), tiendas, venta en el Mercado y puesto 14 propio. |
| Vida | Energía, comida, ánimo y gente. Siesta y sueño, bar de Lola, paseos, baño, Balona. |
| Vecinos | 7 personajes con horarios, charlas diarias y nivel de amistad. Reputación por barrio. |
| Viento | Poniente, levante, levante fuerte o calma cada día, con previsión. Cambia la pesca, la huerta, la playa y los precios. |
| InfoLinense | El móvil del personaje es la web de InfoLinense: portada con las noticias de la ciudad del juego (incluidas las que publicas tú), el tiempo, encargos y, opcionalmente, el feed real. |
| Encargos | Tablón de la Plaza de la Iglesia con 3 pedidos diarios de vecinos. |

La partida se guarda sola en el dispositivo.

## Desarrollo

```bash
npm install
npm run dev      # servidor local (abre en el móvil con la IP que muestra)
npm run build    # dist/index.html: un único archivo autocontenido
```

Código en TypeScript sin framework: un canvas para el mapa y HTML para la interfaz.

```
src/
  datos/mapa.ts         mapa, barrios, calles caminables y lugares
  datos/objetos.ts      objetos, cultivos, recetas y precios
  datos/personajes.ts   vecinos
  estado.ts             partida, reloj, viento, necesidades, encargos y guardado
  historia.ts           capítulo 1: objetivos, escenas y decisiones
  juego.ts              bucle principal: HUD, diálogos, desplazamientos
  mapa/render.ts        dibujo del mapa, cámara, gestos
  mapa/rutas.ts         camino más corto por las calles
  ui/                   lugares, minijuegos, móvil InfoLinense, paneles
  config.ts             conexión con el feed real de InfoLinense
scripts/mapa-osm.mjs    importador del trazado real (OpenStreetMap)
```

## El mapa real

El trazado actual es un **esquema provisional** dibujado a mano: respeta la geografía general (la bahía al oeste, el Mediterráneo al este, la Verja al sur, La Atunara al noreste, El Zabal al norte), pero no las calles reales. Para pasar al callejero real:

1. Ejecuta `npm run mapa` con acceso de red a `overpass-api.de`. Genera `src/datos/mapa-real.json` con el contorno del término municipal y las calles de OpenStreetMap, y saca por pantalla la posición real de los lugares clave.
2. El render usa ese archivo automáticamente como fondo.
3. Recoloca `NODOS` en `src/datos/mapa.ts` con esas posiciones (y revisa `GIBRALTAR`, `PENON`, `PISTA` y la línea de la Verja).
4. **Valida barrios y lugares con la redacción.** En un juego de InfoLinense, un error de calle se nota.

Licencia de los datos: © colaboradores de OpenStreetMap (ODbL). Ya se cita en los créditos del menú.

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
