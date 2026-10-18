# Edificios singulares modelados en Blender

Generador: `scripts/blender/singulares/singular.py` (paramétrico por tipo) sobre `city-reconstruction/blender/singulares/lista.json`
(`lista.py`: ids OSM comprobados a mano contra el catálogo + plantas del Catastro INSPIRE).
Cada edificio tiene su `.blend` editable en `city-reconstruction/blender/blend/singulares/<id>.blend`, su GLB en
`public/modelos/singulares/<id>.glb`, su render en `city-reconstruction/blender/render/singulares/` y su informe en
`city-reconstruction/blender/informes/S-<id>.json`.

**Certeza.** Comprobado: huella, caras a calle y nombre (OSM); plantas cuando la columna dice «Catastro».
Inferido: todo lo demás (colores, huecos, cubierta, campanario, espadaña, marquesina, bóveda…). Las fotos del
catálogo están en dominios bloqueados por la red de este entorno, así que no se han podido consultar: estos
modelos son aproximaciones por tipo y deben revisarse con fotos.

| Edificio | Tipo | Plantas | Altura (m) | Fuente de la altura | Cubierta | GLB (KB) |
|---|---|---|---|---|---|---|
| Parroquia de Santiago Apóstol | iglesia | 3 | 11.0 | por tipo (inferida) | azotea | 79 |
| Iglesia de San Miguel Arcángel | iglesia | 3 | 11.0 | por tipo (inferida) | dos aguas (inferida) | 60 |
| Parroquia San Pío X | iglesia | 3 | 11.0 | por tipo (inferida) | dos aguas (inferida) | 72 |
| Parroquia de San Bernardo Abad | iglesia | 3 | 11.0 | por tipo (inferida) | dos aguas (inferida) | 69 |
| Parroquia de San Pedro Apóstol | iglesia | 3 | 11.0 | por tipo (inferida) | dos aguas (inferida) | 71 |
| Santuario Diocesano del Sagrado Corazón de Jesús | iglesia | 3 | 11.0 | por tipo (inferida) | dos aguas (inferida) | 77 |
| Ermita de la Virgen de Fátima | ermita | 1 | 4.2 | por tipo (inferida) | dos aguas (inferida) | 48 |
| Hermandad de la Amargura | hermandad | 3 | 10.0 | Catastro | azotea | 45 |
| Hermandad Amor y Esperanza | hermandad | 1 | 3.6 | Catastro | azotea | 35 |
| Casa Hermandad de Nuestra Señora del Rocío | hermandad | 1 | 3.6 | Catastro | azotea | 38 |
| Iglesia Evangélica Esperanza de Vida | equipamiento | 1 | 3.6 | Catastro | azotea | 39 |
| Palacio de Congresos y Exposiciones | palacio | 2 | 6.8 | Catastro | azotea | 171 |
| Estación de Autobuses de La Línea de La Concepción | estacion | 2 | 7.0 | Catastro | azotea | 73 |
| Oficina Local de Tráfico | equipamiento | 1 | 3.6 | Catastro | azotea | 37 |
| Protección Civil de La Línea de la Concepción | equipamiento | 1 | 3.6 | Catastro | azotea | 31 |
| Hotel de Asociaciones La Cátedra | equipamiento | 2 | 6.8 | Catastro | azotea | 40 |
| Concejalía de Deportes | equipamiento | 1 | 3.6 | Catastro | azotea | 27 |
| Concejalía de Asuntos Sociales "Levante" | equipamiento | 2 | 6.8 | Catastro | azotea | 55 |
| Centro Atención Integral al Mayor María Luisa Escribano | residencia | 4 | 13.2 | Catastro | azotea | 58 |
| Centro Residencial José Luis Herrero | residencia | 4 | 13.2 | Catastro | azotea | 38 |
| Residencia La Velada | residencia | 2 | 6.8 | Catastro | azotea | 39 |
| Casa de la Cultura | equipamiento | 5 | 16.4 | Catastro | azotea | 59 |
| Teatro Paseo de La Velada | teatro | 4 | 12.0 | por tipo (inferida) | azotea | 39 |
| Mercado El Junquillo | mercado | 2 | 8.0 | Catastro | azotea | 56 |
| Chalet Villa María Luisa | villa | 2 | 6.8 | Catastro | cuatro aguas (inferida) | 75 |
| Chalet D'Amato | villa | 3 | 10.0 | Catastro | azotea | 99 |
| Búnker 149 (Registro 3) | bunker | 1 | 2.1 | por tipo (inferida) | azotea | 36 |
| Búnker 162 | bunker | 1 | 2.1 | por tipo (inferida) | azotea | 35 |
| Polideportivo Municipal de La Línea | pabellon | 3 | 10.5 | por tipo (inferida) | bóveda de chapa (inferida) | 46 |

Ya hechos aparte: Ayuntamiento (`scripts/blender/singulares/ayuntamiento.py`, con fotos del usuario), y en TS anteriores a
la arquitectura Blender: Plaza de Toros, Jardines Saccone, Museo Cruz Herrera, Sociedad Musical, Colegio Providencia y Mercado de Abastos.

## Pendientes (sin huella identificable en el mapa o sin coincidencia segura)

- Parroquia Nuestra Señora del Carmen
- Santuario del Sagrado Corazón de Jesús
- Otra iglesia evangélica (pendiente de identificar)
- Mezquita Badr (solo ubicación)
- Mezquita Al-Takwa (solo ubicación)
- Iglesia Adventista del Séptimo Día (solo ubicación)
- Capilla de María Auxiliadora (solo ubicación)
- CEIP Isabel La Católica
- CEIP Nuestra Señora de las Mercedes
- CEIP Velada
- CEIP Carlos V
- CEIP Inmaculada Concepción
- CEIP Pedro Simón Abril
- CEIP La Atunara
- CEIP Santa Ana
- CEIP Huerta Fava
- CEIP San Felipe
- CEPR Andalucía
- CEIP Santiago
- CEIP Gibraltar
- CEIP Pablo Picasso
- CEIP Buenos Aires
- Escuela Infantil El Rocío
- CEEE Virgen del Amparo
- IES Antonio Machado
- IES Virgen de la Esperanza
- IES Mar de Poniente
- IES Mediterráneo
- IES Menéndez Tolosa
- Colegio San Juan Bosco (Salesianos)
- Colegio Providencia Sagrado Corazón
- Colegio Juan Pablo II - San Pedro
- CEPER Juan Ramón Jiménez
- CEPER Almadraba
- Conservatorio de Música (anexo, pendiente de precisar)
- Oficina de Correos
- Casa Cuartel Guardia Civil
- Agencia Tributaria
- Juzgados de La Línea
- Policía Local La Alcaidesa
- Edificio SIT
- Centro Servicios Sociales Levante
- Residencia María Luisa Escribano
- Centro José Luis Herrero
- Residencia o centro de mayores La Velada
- Museo del Istmo / Edificio La Comandancia
- Círculo Mercantil
- Unión Cultural y Deportiva Linense
- Lonja del Puerto Pesquero de La Atunara
- Chalet D’Amato
- Villa Laura
- Casa de Maximiliano Rodríguez
- Casa de la Tabacalera (ruinas)
- Búnker 087
- Búnker 091
- Búnker 165B
- Estadio de Atletismo
- Pabellón Padre Diego
- Pabellón Punto Ribot
- Piscina Cubierta
- Ciudad Deportiva Antonio Reyes
- Linense Tenis Club
- Real Club Náutico
- Club de Remo
- Club Marítimo Linense
