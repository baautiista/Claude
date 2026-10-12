/**
 * Qué edificios existen en la ciudad del juego (compartido por el juego y el servidor).
 *
 * Decisión de diseño (2026-10-12): la ciudad se reduce a lo que está reconstruido
 * con cuidado y a los edificios principales de cada barrio.
 *  - Todas las casas de las tres zonas reconstruidas: Plaza de la Iglesia, Calle Real y
 *    Plaza Cruz Herrera.
 *  - Fuera de ellas, solo los edificios importantes: todas las iglesias y parroquias y,
 *    en cada barrio, los 3 edificios públicos, escolares o deportivos más grandes.
 * Los lugares del juego con modelo propio (Mercado, Fuerte, Estadio, Lonja…) no dependen
 * de esta lista.
 */

export type P = readonly [number, number];

export interface EdificioBase {
  x: number;
  y: number;
  w: number;
  d: number;
  tipo: number;
}

/** Zonas reconstruidas (coordenadas del juego, 1 unidad = 1 m). */
export const ZONAS_RECONSTRUIDAS = {
  plazaIglesia: { c: [1108, 2135] as P, r: 34 },
  cruzHerrera: { c: [1218, 2188] as P, r: 28 },
  calleReal: {
    eje: [[1098.4, 2128.1], [1121.6, 2133.6], [1154.8, 2141.7], [1195.0, 2151.9], [1208.9, 2154.9], [1217.7, 2158.0], [1244.6, 2171.5], [1253.5, 2175.7]] as P[],
    ancho: 16,
  },
};

function distSeg(p: P, a: P, b: P) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** ¿Está el punto dentro de una de las tres zonas reconstruidas? */
export function enZonaReconstruida(x: number, y: number) {
  const z = ZONAS_RECONSTRUIDAS;
  if (Math.hypot(x - z.plazaIglesia.c[0], y - z.plazaIglesia.c[1]) < z.plazaIglesia.r) return true;
  if (Math.hypot(x - z.cruzHerrera.c[0], y - z.cruzHerrera.c[1]) < z.cruzHerrera.r) return true;
  const e = z.calleReal.eje;
  for (let i = 1; i < e.length; i++) if (distSeg([x, y], e[i - 1], e[i]) < z.calleReal.ancho) return true;
  return false;
}

const IGLESIA = 3;
const NOTABLES = new Set([4, 5, 8]); // escuela, público, pabellón
const POR_BARRIO = 3;

let cache: { clave: number; set: Set<number> } | null = null;

/** Índices de los edificios que se conservan, en el orden de `linea.json`. */
export function edificiosConservados(eds: readonly EdificioBase[], barrioDe: (x: number, y: number) => string): Set<number> {
  if (cache && cache.clave === eds.length) return cache.set;
  const set = new Set<number>();
  const porBarrio = new Map<string, { i: number; area: number }[]>();
  eds.forEach((e, i) => {
    if (enZonaReconstruida(e.x, e.y) && e.tipo !== 7) {
      set.add(i);
      return;
    }
    if (e.tipo === IGLESIA) {
      set.add(i);
      return;
    }
    if (!NOTABLES.has(e.tipo)) return;
    const b = barrioDe(e.x, e.y);
    if (!porBarrio.has(b)) porBarrio.set(b, []);
    porBarrio.get(b)!.push({ i, area: e.w * e.d });
  });
  for (const l of porBarrio.values()) {
    l.sort((a, b) => b.area - a.area);
    for (const { i } of l.slice(0, POR_BARRIO)) set.add(i);
  }
  cache = { clave: eds.length, set };
  return set;
}
