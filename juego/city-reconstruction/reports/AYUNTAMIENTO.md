# Ayuntamiento de La Línea (Plaza Juan José García Cabreros)

Primer edificio hecho entero con la nueva arquitectura: **se modela en Blender (bpy) → .blend editable → GLB**.
El juego solo lo carga, lo coloca, monta el LOD y usa la huella para las colisiones.

| | |
|---|---|
| Script | `scripts/blender/singulares/ayuntamiento.py` (+ `base.py`, `texturas.py`) |
| Original editable | `city-reconstruction/blender/blend/singulares/ayuntamiento.blend` |
| Para el juego | `public/modelos/singulares/ayuntamiento.glb` (lote `AYUNTAMIENTO` en `src/datos/modelos/indice.json`) |
| Validación | `city-reconstruction/blender/render/singulares/ayuntamiento-*.png`, informe `city-reconstruction/blender/informes/AYUNTAMIENTO.json` |
| Sustituye a | edificio procedural `B-w257431100` (deja de dibujarse; su huella sigue siendo colisión) |

## Qué hay en el .blend

Colección `AYUNTAMIENTO`, con un vacío por nivel y una pieza por objeto (se pueden editar por separado):

- `B-w257431100__LOD0`: `Ayto_vidrio`, `Ayto_perfil` (montantes, travesaños, bandas negras), `Ayto_estructura`
  (sofito del vuelo, visera y columna exenta del cuerpo lateral), `Ayto_cornisa`, `Ayto_cubierta`,
  `Ayto_fachada` (cuerpo lateral y traseras con huecos), `Ayto_planta_baja`, `Ayto_columnas`, `Ayto_detalle`
  (puertas, placa «P», alarma) y las letras `Rotulo_*` (texto real de Blender convertido en malla).
- `B-w257431100__LOD1`: volumen simplificado para lejos.
- `E-ayuntamiento-suelo__LOD0`: adoquín rojizo en espiga, losas grises, rampa de hormigón impreso,
  césped en pendiente y bordillo de ladrillo (siempre visible).
- `E-ayuntamiento-mobiliario__LOD0`: farolas de globo, barandilla de acero, valla granate de aspas,
  muro de ostionera, roca y árbol llorón, maceteros con ficus, bolardos, papelera, mástiles con banderas.

Texturas generadas en Blender con numpy (no IA, no fotos copiadas), repetibles y guardadas también en
`city-reconstruction/blender/texturas/`: estuco, hormigón, adoquín, losa, hormigón impreso, césped,
ladrillo, ostionera y grava.

## Fuentes y grado de certeza

- **Comprobado**: huella de OpenStreetMap (way 257431100); fotos aportadas por el usuario (4, octubre de 2026):
  muro cortina curvo de dos plantas con perfilería negra, planta baja porticada con columnas cilíndricas,
  cornisa crema, cuerpo lateral crema con visera alta y columna exenta, rótulo «EXCMO. AYUNTAMIENTO DE LA
  LÍNEA DE LA CONCEPCIÓN», mástiles, césped con bordillo de ladrillo, rampa con barandilla, adoquín rojizo,
  farolas, maceteros negros, valla granate y muro de piedra.
- **Inferido**: alturas (planta baja 4,4 m; vidrio 5,0–12,2 m; cornisa 13,7 m; cuerpo lateral 13,9 m),
  32 vanos del muro cortina, posición de puertas, farolas, mástiles y mobiliario; bandera municipal azul y
  blanca tal como se ve en la foto; fachadas traseras (no salen en las fotos).
- **Desconocido**: plantas oficiales. El Catastro (INSPIRE BU) no da un dato útil para esta parcela: la parte
  principal figura con 0 plantas sobre rasante.

## Pendiente

- Revisar en el juego con las fotos al lado y ajustar alturas si hace falta (editar el script o el .blend y
  volver a exportar).
- Fachada trasera y edificio amarillo almenado vecino, cuando haya fotos.
