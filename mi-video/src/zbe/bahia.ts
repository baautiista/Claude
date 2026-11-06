/**
 * Bahía de Algeciras calcada del mapa de referencia enviado (lienzo 1500 × 1895, norte arriba).
 * MAR: un solo contorno que recorre la costa desde el Mediterráneo, rodea Gibraltar,
 * sigue la bahía (La Línea → San Roque → Los Barrios → Algeciras) y sale al Estrecho.
 */
export const LIENZO = { ancho: 1500, alto: 1895 } as const;

export const MAR =
  "M1440 0 L1400 140 L1365 290 L1345 450 L1325 560 L1312 700 L1320 820 L1312 920 L1290 1000 L1262 1060 L1238 1040 L1215 960 L1198 880 L1190 800 L1195 700 L1215 600 L1205 555 L1185 525 L1140 485 L1080 450 L1030 420 L1000 395 L965 355 L920 325 L860 308 L800 306 L730 308 L680 318 L630 335 L590 352 L545 385 L500 425 L465 470 L440 520 L415 580 L402 640 L396 700 L398 760 L405 815 L422 860 L445 905 L468 950 L482 995 L500 1045 L520 1095 L500 1130 L465 1160 L438 1200 L425 1255 L440 1295 L500 1325 L560 1360 L565 1410 L530 1460 L480 1510 L430 1560 L390 1600 L310 1635 L200 1655 L95 1660 L0 1690 L0 1895 L1500 1895 L1500 0 Z";

/** Frontera aproximada en el istmo (entre La Línea y Gibraltar). */
export const FRONTERA = { x1: 1205, y1: 575, x2: 1325, y2: 575 } as const;

/** Pista del aeropuerto de Gibraltar, cruzando el istmo hacia la bahía. */
export const PISTA = { x: 1150, y: 596, ancho: 168, alto: 16 } as const;

/** Puntos de interés sobre el lienzo. */
export const PUNTOS = {
  laLinea: { x: 1265, y: 430 },
  refineria: { x: 780, y: 245 },
  acerinox: { x: 525, y: 320 },
  puerto: { x: 470, y: 790 },
  aeropuerto: { x: 1235, y: 605 },
  gibraltar: { x: 1262, y: 850 },
} as const;

/** Rótulos geográficos discretos. */
export const ROTULOS = [
  { texto: "BAHÍA DE ALGECIRAS", x: 800, y: 760 },
  { texto: "SAN ROQUE", x: 940, y: 150 },
  { texto: "LOS BARRIOS", x: 330, y: 250 },
  { texto: "ALGECIRAS", x: 240, y: 820 },
  { texto: "GIBRALTAR", x: 1262, y: 1130 },
  { texto: "MEDITERRÁNEO", x: 1340, y: 1250 },
] as const;

/** Solo la línea de costa (sin los bordes del lienzo), para dibujarla como trazo. */
export const COSTA = MAR.split(" L0 1895")[0];
