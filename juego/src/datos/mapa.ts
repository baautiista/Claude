import linea from "./linea.json";

/**
 * Mapa de La Línea de la Concepción, construido desde el GeoJSON real de
 * OpenStreetMap (ver scripts/geojson-a-mapa.mjs → linea.json).
 *
 * Unidades del juego: 1 unidad = 2 m. Norte arriba: x hacia el este, y hacia
 * el sur. La Verja está en y = DATOS.verja. Los edificios y las calles son
 * los reales; el juego los dibuja con su propio estilo.
 */

export type Punto = readonly [number, number];
type Anillo = Punto[];

export interface Linea {
  proy: { lon0: number; lat0: number; kx: number; ky: number };
  verja: number;
  costa: Punto[];
  capas: Record<string, Anillo[][]>;
  /** [x, y, ancho, fondo, ángulo, tipo, plantas] */
  edificios: [number, number, number, number, number, number, number][];
  red: { nodos: Punto[]; tramos: [number, number, number, number, number[]][]; nombres: string[] };
  arboles: [number, number, number][];
  solares: [number, number, number][];
  puerto: Anillo[];
  poi: Record<string, Punto>;
}

export const DATOS = linea as unknown as Linea;

/** Longitud/latitud → coordenadas del juego. */
export const geo = (lon: number, lat: number): Punto => [
  (lon - DATOS.proy.lon0) * DATOS.proy.kx,
  (DATOS.proy.lat0 - lat) * DATOS.proy.ky,
];

export const TIERRA: readonly Punto[] = DATOS.costa;
export const VERJA = DATOS.verja;

/** Gibraltar (no jugable en la Temporada 1): istmo, aeropuerto y Peñón. */
export const GIBRALTAR: readonly Punto[] = [
  geo(-5.3605, 36.1552), geo(-5.3388, 36.1552), geo(-5.3392, 36.148), geo(-5.3405, 36.135),
  geo(-5.3425, 36.118), geo(-5.352, 36.112), geo(-5.3575, 36.125), geo(-5.358, 36.14), geo(-5.3615, 36.15),
];
export const PISTA = { x0: geo(-5.3645, 0)[0], x1: geo(-5.3388, 0)[0], y: geo(0, 36.1512)[1], ancho: 24 } as const;
/** Cresta del Peñón (de norte a sur). */
export const PENON = { x: geo(-5.3462, 0)[0], yNorte: geo(0, 36.1455)[1], ySur: geo(0, 36.118)[1] } as const;

/* ── Red de calles ──────────────────────────────────────────────────── */

/** Clases de vía: 0 tronco, 1 secundaria, 2 terciaria, 3 residencial, 4 peatonal, 5 servicio, 6 sendero, 7 pista. */
export const ANCHO_VIA = [11, 9, 7.5, 6, 5.5, 4, 2, 3.5] as const;

export interface Tramo {
  a: string;
  b: string;
  clase: number;
  nombre: string;
  puntos: Punto[];
  largo: number;
}

export const NODOS: Record<string, Punto> = Object.fromEntries(DATOS.red.nodos.map((p, i) => [`n${i}`, p]));

export const TRAMOS: Tramo[] = DATOS.red.tramos.map(([a, b, clase, nombre, medio]) => {
  const puntos: Punto[] = [DATOS.red.nodos[a]];
  for (let i = 0; i < medio.length; i += 2) puntos.push([medio[i], medio[i + 1]]);
  puntos.push(DATOS.red.nodos[b]);
  let largo = 0;
  for (let i = 1; i < puntos.length; i++) largo += Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]);
  return { a: `n${a}`, b: `n${b}`, clase, nombre: DATOS.red.nombres[nombre], puntos, largo };
});

/** Componente conexa principal: los lugares se enganchan solo a ella. */
const PRINCIPAL = (() => {
  const vec = new Map<string, string[]>();
  for (const t of TRAMOS) {
    if (!vec.has(t.a)) vec.set(t.a, []);
    if (!vec.has(t.b)) vec.set(t.b, []);
    vec.get(t.a)!.push(t.b);
    vec.get(t.b)!.push(t.a);
  }
  let mejor = new Set<string>();
  const visto = new Set<string>();
  for (const inicio of vec.keys()) {
    if (visto.has(inicio)) continue;
    const comp = new Set([inicio]);
    const pila = [inicio];
    visto.add(inicio);
    while (pila.length) {
      for (const v of vec.get(pila.pop()!) ?? []) {
        if (!visto.has(v)) {
          visto.add(v);
          comp.add(v);
          pila.push(v);
        }
      }
    }
    if (comp.size > mejor.size) mejor = comp;
  }
  return mejor;
})();

/** Nodo caminable más cercano a un punto. */
export function nodoCercano(p: Punto) {
  let mejor = "";
  let d = Infinity;
  for (const id of PRINCIPAL) {
    const q = NODOS[id];
    const dd = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    if (dd < d) {
      d = dd;
      mejor = id;
    }
  }
  return mejor;
}

/* ── Lugares y barrios ──────────────────────────────────────────────── */

const poi = (n: string) => DATOS.poi[n];

/** Posición real de cada lugar del juego. */
export const POSICION = {
  casa: geo(-5.3418, 36.1676),
  plaza: poi("Plaza de la Iglesia"),
  mercado: poi("Mercado de Abastos La Concepción"),
  bar: geo(-5.3500, 36.1617),
  redaccion: geo(-5.3487, 36.1612),
  estacion: poi("Estación de Autobuses de La Línea de La Concepción"),
  frontera: poi("Puesto de aduana Frontera de Gibraltar"),
  paseo: poi("Paseo Marítimo de Poniente"),
  levante: poi("Playa de Levante"),
  santaBarbara: poi("Fuerte de Santa Barbara"),
  estadio: poi("Estadio Ciudad de La Línea"),
  atunara: poi("Lonja del Puerto Pesquero"),
  huerta: geo(-5.3402, 36.1893),
} satisfies Record<string, Punto>;

export type BarrioId = "sanBernardo" | "centro" | "atunara" | "zabal" | "poniente" | "levante";

export const BARRIOS: Record<BarrioId, { nombre: string; rotulo: Punto }> = {
  centro: { nombre: "Centro", rotulo: geo(-5.3530, 36.1640) },
  sanBernardo: { nombre: "San Bernardo", rotulo: geo(-5.3405, 36.1700) },
  atunara: { nombre: "La Atunara", rotulo: geo(-5.3390, 36.1800) },
  zabal: { nombre: "El Zabal", rotulo: geo(-5.3460, 36.1890) },
  poniente: { nombre: "Poniente", rotulo: geo(-5.3640, 36.1660) },
  levante: { nombre: "Levante", rotulo: geo(-5.3365, 36.1620) },
};

export type IconoId =
  | "casa" | "iglesia" | "mercado" | "bar" | "periodico" | "ancla" | "brote"
  | "bandera" | "ola" | "bus" | "balon" | "fuerte";

export type LugarId =
  | "casa" | "plaza" | "mercado" | "bar" | "redaccion" | "atunara" | "huerta"
  | "frontera" | "paseo" | "levante" | "santaBarbara" | "estacion" | "estadio";

export interface Lugar {
  nombre: string;
  nodo: string;
  barrio: BarrioId;
  icono: IconoId;
  /** Etiqueta de sección (estilo InfoLinense). */
  seccion: string;
  descripcion: string;
}

const lugar = (id: keyof typeof POSICION, l: Omit<Lugar, "nodo">): Lugar => ({ ...l, nodo: nodoCercano(POSICION[id]) });

export const LUGARES: Record<LugarId, Lugar> = {
  casa: lugar("casa", { nombre: "Casa de la abuela", barrio: "sanBernardo", icono: "casa", seccion: "TU CASA", descripcion: "Una casa baja en San Bernardo, con patio, azulejos y una higuera que nadie ha podado en años." }),
  estacion: lugar("estacion", { nombre: "Estación de autobuses", barrio: "centro", icono: "bus", seccion: "MOVILIDAD", descripcion: "Aquí te dejó el autobús. Huele a café y a gasoil." }),
  plaza: lugar("plaza", { nombre: "Plaza de la Iglesia", barrio: "centro", icono: "iglesia", seccion: "CIUDAD", descripcion: "El corazón del Centro: el Santuario de la Inmaculada y, en el tablón, los encargos de los vecinos." }),
  mercado: lugar("mercado", { nombre: "Mercado de Abastos", barrio: "centro", icono: "mercado", seccion: "CIUDAD", descripcion: "El Mercado de La Concepción: pescado, verdura, voces y el puesto 14, cerrado desde hace años." }),
  bar: lugar("bar", { nombre: "Bar de Lola", barrio: "centro", icono: "bar", seccion: "CIUDAD", descripcion: "En la Calle Real. Montaditos, tortillitas y todas las noticias antes que nadie." }),
  redaccion: lugar("redaccion", { nombre: "Redacción de InfoLinense", barrio: "centro", icono: "periodico", seccion: "INFOLINENSE", descripcion: "Una oficina pequeña, tres pantallas y un mapa de La Línea lleno de chinchetas." }),
  atunara: lugar("atunara", { nombre: "Puerto de La Atunara", barrio: "atunara", icono: "ancla", seccion: "LA ATUNARA", descripcion: "El puerto pesquero: la dársena, las barcas blancas y azules y la lonja." }),
  huerta: lugar("huerta", { nombre: "Huertos del Zabal", barrio: "zabal", icono: "brote", seccion: "EL ZABAL", descripcion: "Parcelas cercadas con su caseta y Rafa con la radio puesta." }),
  frontera: lugar("frontera", { nombre: "La Verja", barrio: "centro", icono: "bandera", seccion: "GIBRALTAR", descripcion: "La frontera. Colas, motos, prisas y un banco donde siempre está Andrés." }),
  paseo: lugar("paseo", { nombre: "Paseo de Poniente", barrio: "poniente", icono: "ola", seccion: "PONIENTE", descripcion: "La bahía, los barcos fondeados y el Peñón a la izquierda." }),
  levante: lugar("levante", { nombre: "Playa de Levante", barrio: "levante", icono: "ola", seccion: "LEVANTE", descripcion: "Kilómetros de arena oscura y mar abierto. Cuando sopla levante, esto es otra cosa." }),
  santaBarbara: lugar("santaBarbara", { nombre: "Fuerte de Santa Bárbara", barrio: "levante", icono: "fuerte", seccion: "HISTORIA", descripcion: "Los restos del fuerte que dio nombre a la línea de fortificaciones, junto a la playa." }),
  estadio: lugar("estadio", { nombre: "Estadio Municipal", barrio: "levante", icono: "balon", seccion: "DEPORTES", descripcion: "El Estadio Ciudad de La Línea, casa de la Balona. Hoy entrenan a puerta abierta." }),
};

/* ── Zonas desbloqueables ───────────────────────────────────────────── */

export type ZonaId = "centro" | "sanBernardo" | "mercado" | "zabal" | "atunara" | "playas" | "estadio" | "junquillo" | "frontera";

export interface Zona {
  id: ZonaId;
  nombre: string;
  nivel: number;
  /** Rectángulos [x0, y0, x1, y1] en coordenadas del juego. */
  zonas: [number, number, number, number][];
}

const rect = (lonO: number, latS: number, lonE: number, latN: number): [number, number, number, number] => {
  const [x0, y1] = geo(lonO, latS);
  const [x1, y0] = geo(lonE, latN);
  return [x0, y0, x1, y1];
};

/** En orden de prioridad: la primera que contiene un punto es su zona. */
export const ZONAS: Zona[] = [
  { id: "mercado", nombre: "Mercado", nivel: 2, zonas: [rect(-5.3525, 36.1622, -5.3483, 36.1652)] },
  { id: "centro", nombre: "Centro", nivel: 1, zonas: [rect(-5.3600, 36.1580, -5.3440, 36.1680)] },
  { id: "sanBernardo", nombre: "San Bernardo", nivel: 1, zonas: [rect(-5.3440, 36.1640, -5.3385, 36.1745)] },
  { id: "frontera", nombre: "La Verja", nivel: 6, zonas: [rect(-5.3620, 36.1530, -5.3385, 36.1580)] },
  { id: "estadio", nombre: "Estadio y Santa Bárbara", nivel: 5, zonas: [rect(-5.3440, 36.1580, -5.3385, 36.1640)] },
  { id: "playas", nombre: "Playas", nivel: 4, zonas: [rect(-5.3720, 36.1580, -5.3600, 36.1720), rect(-5.3385, 36.1580, -5.3290, 36.1745)] },
  { id: "atunara", nombre: "La Atunara", nivel: 3, zonas: [rect(-5.3460, 36.1745, -5.3290, 36.1840)] },
  { id: "zabal", nombre: "El Zabal", nivel: 2, zonas: [rect(-5.3620, 36.1840, -5.3290, 36.2005)] },
  { id: "junquillo", nombre: "El Junquillo", nivel: 5, zonas: [rect(-5.3720, 36.1680, -5.3460, 36.1840)] },
];

export function zonaDe(p: Punto): Zona | null {
  for (const z of ZONAS) for (const [x0, y0, x1, y1] of z.zonas) if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1) return z;
  return null;
}

export const zonaDeLugar = (l: LugarId) => zonaDe(NODOS[LUGARES[l].nodo]);
