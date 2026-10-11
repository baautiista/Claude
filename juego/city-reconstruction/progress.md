# Reconstrucción 3D de La Línea — registro

Trabajo por sectores: documentar → fotografías → análisis → modelado → integración → revisión → aprobado.
Solo se pasa al siguiente sector con la aprobación del usuario.

Ficheros:
- `neighborhoods.json`: barrios y zonas singulares, con el elemento OSM que los sitúa y qué está por confirmar.
- `sectors.json`: sectores con código, calles y estado.
- `landmarks.json`: edificios y elementos de cada sector, fotos necesarias y estado.
- `references/<SECTOR>/`: capturas del usuario (solo como referencia visual; nunca se usan como textura).
- `assets/`: modelos y texturas propias.
- `reports/<SECTOR>.md`: informe de validación con capturas reales del juego.

## Estado

| Sector | Zona | Estado |
|---|---|---|
| CENTRO-01 | Plaza de la Iglesia | esperando fotografías |
| CENTRO-02 … CENTRO-09 | resto del Centro | pendiente de documentación |
| Resto de barrios | — | pendiente de documentación |

## Diario

- 2026-10-11: inventario de barrios y división del Centro a partir del extracto OSM del juego. Pedidas las fotos de CENTRO-01. Sin cambios en el juego.
