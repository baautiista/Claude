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

- **Mapillary** (CC BY-SA 4.0). Necesita `MAPILLARY_TOKEN`, que se saca con una cuenta gratuita. Se busca por edificio, en un radio de 50 m (`lat`, `lng`, `radius`); si la API rechaza esa consulta, se repite con un bbox de ±60 m (lon mín, lat mín, lon máx, lat máx). Una respuesta vacía no se guarda como consultada: se repite en la siguiente investigación.
- **Wikimedia Commons**. Se filtran las licencias libres.
- **Fotos propias** en `fotos-propias/<id o calle>/manifiesto.json`.

Cada consulta con resultado se guarda por cuadrícula (o edificio) y fuente, así no se repite. Las peticiones llevan pausa entre ellas para respetar los límites de las API.

### Diagnóstico de Mapillary

```
python3 scripts/exploracion/diagnostico_mapillary.py --lote AURORA-01
```

Prueba el token por ID, la búsqueda por radio y por bbox en varias zonas y límites, y consultas mal construidas a propósito. Clasifica cada respuesta como foto encontrada, vacía, error de autenticación, consulta mal construida o bloqueo del proxy. Comprueba también que las coordenadas del lote son WGS84 reales comparando sus huellas con las del Catastro (EPSG:25830, convertido con pyproj). Guarda todo en `diagnostico-mapillary/`, con el token tapado.

### Asociación foto → edificio

Una foto no se asigna solo al edificio más cercano. Para cada edificio se evalúa cada foto cercana por:

- distancia a la fachada (hasta 45 m);
- que la fachada sea a la calle y mire hacia la cámara;
- que la cámara apunte a la fachada (campo de unos 80°; las fotos de 360° ven todo) y su eje no vaya en escorzo a lo largo de la calle;
- que ningún otro edificio tape la línea de visión.

Cada asociación lleva su confianza (0–1). Una foto puede servir a varios edificios, por ejemplo al de enfrente y no al de al lado, y un edificio puede tener varias fotos. `test_asociacion.py` lo comprueba sobre la geometría real del lote con cámaras de prueba que solo existen en memoria.

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
