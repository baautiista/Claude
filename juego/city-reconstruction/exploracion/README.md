# Exploración urbana y reconstrucción por lotes

Script: `scripts/exploracion/explorar.py`. Su ayuda (`-h`) lista todas las órdenes.

- **Base de datos**: `la-linea.sqlite`, que es local y se regenera con `iniciar`. El progreso persistente va en `progreso.json`, dentro de git.
- **Sectores**: los barrios.
- **Cuadrículas**: las teselas del juego.
- **Calles y edificios**: salen de la ciudad generada, que ya reúne OSM, Overture e IGN, sin duplicar sistemas.

## Cola de trabajo

PENDIENTE → INVESTIGANDO → REFERENCIAS_ENCONTRADAS | SIN_REFERENCIAS → MODELANDO → VALIDANDO → INTEGRADO

Si algo falla, el edificio pasa a ERROR con el mensaje guardado y la cola sigue con el siguiente.

## Fuentes de imágenes

Solo se usan fuentes con licencia reutilizable:

- **Mapillary** (CC BY-SA 4.0). Necesita `MAPILLARY_TOKEN`, que se saca con una cuenta gratuita.
- **Wikimedia Commons**. Se filtran las licencias libres.
- **Fotos propias** en `fotos-propias/<id o calle>/manifiesto.json`.

Cada consulta se guarda por cuadrícula y fuente, así no se repite. Las peticiones llevan pausa entre ellas para respetar los límites de las API.

## Fichas

Cada edificio tiene su ficha en `fichas/<id>.json`. Cada atributo lleva un estado:

- **comprobado**: dato oficial, u observado en una foto registrada;
- **inferido**: viene de las reglas del generador;
- **desconocido**: no hay información.

Las observaciones se registran con `observar`, citando una foto que ya esté en la base de datos. `modelar` aplica las observaciones comprobadas antes de llamar a Blender.

## Panel local

```
python3 scripts/exploracion/explorar.py panel   # http://127.0.0.1:8765/
```

Muestra:

- edificios investigados, con referencias, modelados e integrados;
- calles completadas;
- avance por barrio, con la prioridad editable;
- fuentes consultadas;
- errores;
- últimos movimientos.
