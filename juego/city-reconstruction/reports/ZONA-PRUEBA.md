# Zona de prueba: interfaz limpia y construcción coherente

Zona de prueba: manzanas alrededor del Mercado de la Concepción, en un círculo de 95 m de radio centrado en (1165, 2045). Fuera de ella la ciudad sigue con el sistema anterior hasta que se apruebe.

## 1. Interfaz

### Qué saturaba la pantalla

| Elemento | Antes | Ahora |
|---|---|---|
| Perfil | avatar de 58 px, panel con nombre, barra de XP y texto «0 / 15 XP» | avatar de 46 px y barra de XP fina (el nombre y la XP exacta, al pasar el ratón o en el Diario) |
| Recursos | 3 cápsulas (dinero, día y hora, «N en línea») y botón de ajustes | 1 cápsula: dinero · día y hora. Los ajustes pasan a «Más» |
| Indicadores | 4 anillos de 38 px con su número debajo | 4 anillos de 30 px; el número solo aparece si un indicador está bajo |
| Objetivo | tarjeta de dos líneas abajo, tapada por el joystick | una línea bajo el HUD |
| Cámara | 5 botones fijos a la derecha | 1 botón que despliega girar, zoom, vista a pie de calle y el nuevo modo información |
| Dock | 6 botones | 4: Mochila, Autobús, Hogar y «Más» (Diario, InfoLinense, Vecinos, Ajustes). Los avisos se suman en un punto sobre «Más» |
| Joystick | siempre visible, también con ratón | solo en pantallas táctiles, más pequeño y translúcido |
| Nombres del mapa | lugares, calles, barrios, vecinos y personajes a la vez, según el zoom | solo cerca del jugador (lugares a 70 m, personajes a 22 m, jugadores a 40 m), el objetivo, lo seleccionado, o todo con el modo información |

### Jerarquía

- **Nivel 1 (siempre):** perfil, dinero y hora, 4 indicadores, objetivo, dock y cámara.
- **Nivel 2 (contexto):** nombres del mundo al acercarse, al seleccionar o al ser el objetivo.
- **Nivel 3 (paneles):** Diario, InfoLinense, Vecinos, Ajustes y el modo información.

## 2. Construcción de edificios

### Errores encontrados en el generador

1. **Huellas mal convertidas.** Cada huella de OpenStreetMap se convertía en el rectángulo mínimo que la envuelve. En manzanas en L o trapezoidales, ese rectángulo sobresalía sobre la calle. Esta era la causa de las «casas en medio de la calle».
2. **Calzada fija.** Cada calle se dibujaba con una anchura fija según su clase (hasta 12 m), aunque entre las fachadas reales del casco antiguo no cabe. El asfalto pasaba por debajo de las casas.
3. **Huecos en todas las caras.** Ventanas, balcones, escaparates, toldos y aparatos de aire se ponían en las cuatro caras. En las medianeras quedaban metidos en el edificio vecino: las «ventanas y balcones flotando».
4. **Molduras invasoras.** Cornisas, zócalos y aleros sobresalían por igual en las cuatro caras y atravesaban la pared del vecino.
5. **Sin control de solapes.** Nada impedía que dos edificios ocuparan el mismo sitio.

### Reglas nuevas, en orden

1. **Parcela.** El rectángulo se ajusta a la huella real: cada lado entra hasta que al menos el 70 % de su borde queda sobre la huella. Se hace en `scripts/geojson-a-mapa.mjs` y solo para la zona de prueba.
2. **Calle a medida.** Cada calle mide lo que cabe de verdad entre sus fachadas, con 3,2 m de calzada como mínimo y la anchura de su clase como máximo.
3. **Calzada libre.** Ninguna fachada puede pisar la calzada. Si la pisa, se retranquea. Si al retranquearla el edificio quedara con menos de 3 m de lado, no se construye.
4. **Acera.** Si queda volumen, la fachada se retranquea un poco más para dejar 1,2 m de acera, con un máximo de 2,2 m por cara.
5. **Calle que atraviesa.** Si una calle pasa por dentro de una huella, el edificio no se construye.
6. **Solapes.** Si dos edificios se solapan, se recorta el menor; si no cabe, se descarta. También se tienen en cuenta las huellas de los sectores reconstruidos a mano.
7. **Medianeras.** Las caras pegadas a otro edificio se marcan como ciegas. En ellas no hay ventanas, balcones, escaparates ni aparatos, y las cornisas, zócalos y aleros no sobresalen.
8. **Puerta.** La puerta y el escaparate van siempre a una cara abierta. Si todas las caras son ciegas, el edificio no tiene comercio.

### Resultado de la validación en la zona de prueba

Cifras que da el propio juego al arrancar (`globalThis.__validacion`):

| | |
|---|---|
| Edificios revisados | 281 |
| Retranqueados para dejar calzada y acera | 177 |
| Descartados por invadir la calzada sin volumen suficiente | 89 |
| Descartados porque una calle atraviesa la huella | 4 |
| Solapes corregidos / descartados | 2 / 15 |
| Caras marcadas como medianera | 61 |

Antes del ajuste de huellas, 27 calles atravesaban edificios y prácticamente todos invadían la calzada.

### Consecuencia visible

Donde un edificio se descarta queda un solar pavimentado vacío. Muchos están en calles muy estrechas del casco antiguo, donde el eje de la calle de OpenStreetMap pasa a apenas 1 m de las fachadas. Hay dos opciones:
- dejar esos huecos como plazuelas o solares;
- más adelante, reconstruir a mano esas manzanas con fotos, como se hizo en CENTRO-01 y CENTRO-02.

## Capturas

Todas son capturas reales del juego, con la misma cámara antes y después:
- `comparativa-ui.jpg`
- `comparativa-calle2.jpg`
- `antes-*.jpg` y `despues-*.jpg`
- `despues-zona.jpg`
