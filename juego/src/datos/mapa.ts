/**
 * Mapa de La Línea de la Concepción para «Mi Línea».
 *
 * Calcado de la vista de satélite: coordenadas del mundo = píxeles del
 * ortofoto de referencia desplazados (x − 100, y + 85). Norte arriba
 * (x → este, y → sur), 1 unidad ≈ 4 m. La Verja queda en y = 1506.
 *
 *   - Costa este: playa recta de Levante, con la dársena de La Atunara.
 *   - Costa oeste: la curva de la bahía (Poniente) hasta la Verja.
 *   - Norte: El Zabal (polígono y huertos cercados).
 *   - Sur: la Verja, el aeropuerto (pista que entra en la bahía) y el Peñón.
 *
 * `npm run mapa` puede afinarlo con OpenStreetMap (ver scripts/mapa-osm.mjs).
 */

export type Punto = readonly [number, number];

export const MUNDO = { ancho: 1000, alto: 1750 } as const;

/** Tierra del lado español, en sentido horario desde el noroeste. */
export const TIERRA: readonly Punto[] = [
  [-400, -300], [1100, -300], [990, 85], [955, 335], [915, 505], [898, 645], [884, 785],
  [866, 985], [850, 1185], [830, 1335], [808, 1506], [346, 1506], [372, 1285], [334, 1236],
  [214, 1180], [110, 1092], [10, 1050], [-100, 1018], [-400, 1010],
];

/** Gibraltar: del istmo (aeropuerto) al Peñón. */
export const GIBRALTAR: readonly Punto[] = [
  [346, 1506], [808, 1506], [796, 1720], [816, 1860], [770, 2120], [600, 2340], [470, 2300],
  [380, 2050], [300, 1820], [318, 1650], [326, 1560],
];

/** Pista del aeropuerto: cruza el istmo y entra en la bahía. */
export const PISTA = { x0: 190, x1: 800, y: 1635, ancho: 34 } as const;

export type BarrioId = "sanBernardo" | "centro" | "atunara" | "zabal" | "poniente" | "levante";

export const BARRIOS: Record<BarrioId, { nombre: string; zona: readonly Punto[]; rotulo: Punto }> = {
  zabal: { nombre: "El Zabal", zona: [[420, 220], [940, 230], [905, 560], [420, 600]], rotulo: [640, 250] },
  atunara: { nombre: "La Atunara", zona: [[780, 560], [900, 570], [880, 760], [780, 760]], rotulo: [830, 600] },
  sanBernardo: { nombre: "San Bernardo", zona: [[250, 780], [560, 770], [560, 1120], [250, 1120]], rotulo: [400, 960] },
  centro: { nombre: "Centro", zona: [[400, 1120], [620, 1120], [620, 1300], [400, 1300]], rotulo: [560, 1150] },
  poniente: { nombre: "Poniente", zona: [[100, 1050], [300, 1150], [440, 1330], [330, 1330]], rotulo: [230, 1120] },
  levante: { nombre: "Levante", zona: [[620, 780], [860, 780], [830, 1460], [620, 1460]], rotulo: [740, 1000] },
};

/** Plano turístico (píxeles) → mundo. Calibrado con la Aduana, el Estadio y la Marina. */
const P = (u: number, v: number): Punto => [Math.round(552 + (u - 705) * 0.745), Math.round(1478 + (v - 975) * 0.745)];

export interface Calle {
  nombre: string;
  principal: boolean;
  puntos: Punto[];
}

/** Calles del centro, trazadas sobre el plano turístico del Ayuntamiento. */
const PLANO: [string, boolean, [number, number][]][] = [
  ["Avenida de España", true, [[40, 345], [150, 420], [250, 505], [330, 578], [410, 640], [490, 690], [545, 735]]],
  ["Avenida Príncipe de Asturias", true, [[545, 735], [565, 800], [590, 865], [635, 910], [700, 930], [790, 935], [880, 950], [960, 975], [1010, 990], [1045, 965], [1052, 880], [1058, 780], [1060, 690]]],
  ["Paseo del Mediterráneo", true, [[1060, 690], [1060, 630], [1062, 560], [1065, 420], [1065, 372], [1068, 260], [1072, 120], [1076, 0]]],
  ["Avenida de la Banqueta", true, [[750, 682], [830, 680], [915, 682], [1000, 682], [1060, 690]]],
  ["Avenida del Ejército", true, [[565, 800], [640, 770], [705, 750], [750, 745], [830, 745], [912, 745]]],
  ["Calle Gibraltar", true, [[745, 930], [745, 850], [748, 790], [750, 745], [750, 682], [752, 630], [756, 560]]],
  ["Avenida Menéndez Pelayo", true, [[756, 560], [790, 500], [830, 430], [870, 350], [910, 280], [950, 210], [990, 150], [1030, 80], [1060, 30]]],
  ["Calle Real", true, [[612, 612], [650, 630], [700, 650], [750, 682]]],
  ["Calle del Sol", false, [[470, 575], [530, 595], [612, 612]]],
  ["Calle Granada", false, [[540, 500], [620, 505], [700, 512], [760, 520], [790, 500]]],
  ["Calle Feria", false, [[700, 512], [705, 440], [720, 400], [755, 345]]],
  ["Calle Alemania", false, [[560, 355], [650, 355], [755, 345]]],
  ["Calle San Pedro", false, [[480, 270], [490, 350], [510, 420], [540, 500]]],
  ["Avenida María Guerrero", false, [[700, 160], [705, 260], [720, 330], [755, 345]]],
  ["Calle Blanca de los Ríos", false, [[620, 155], [700, 160], [820, 148], [920, 135], [1068, 118]]],
  ["Ronda Norte", true, [[240, 40], [330, 30], [450, 22], [560, 18], [700, 15], [800, 20]]],
  ["Avenida Torres Quevedo", false, [[150, 420], [175, 330], [190, 200], [200, 110], [240, 40]]],
  ["Calle Andalucía", false, [[150, 420], [240, 375], [330, 330], [420, 300], [480, 270]]],
  ["Calle Prim", false, [[420, 170], [540, 165], [620, 155]]],
  ["Calle Virgen del Rosario", false, [[190, 250], [260, 215], [330, 185], [420, 170]]],
  ["Calle Jardines", false, [[900, 630], [1000, 630], [1060, 630]]],
  ["Calle Pavía", false, [[880, 372], [980, 372], [1065, 372]]],
  ["Calle Pinzones", false, [[790, 500], [850, 488], [895, 490]]],
  ["Calle Espronceda", false, [[880, 372], [890, 450], [895, 490], [898, 560], [900, 630], [915, 682]]],
  ["Calle Aurora", false, [[600, 560], [650, 570], [700, 580], [756, 590]]],
  ["Calle López de Ayala", false, [[540, 500], [565, 555], [600, 560], [612, 612]]],
  ["Calle Méndez Núñez", false, [[470, 682], [540, 674], [605, 682], [650, 712], [705, 750]]],
  ["Avenida de Europa", false, [[640, 770], [648, 850], [660, 925]]],
  ["Paseo de Santa Bárbara", false, [[915, 682], [912, 745], [910, 850], [905, 945]]],
  ["Calle del Estadio", false, [[912, 760], [985, 760]]],
  ["Calle Duque de Tetuán", false, [[410, 640], [470, 620], [530, 600]]],
  ["Calle San José", false, [[612, 612], [612, 560], [620, 505]]],
  ["Calle González de la Vega", false, [[540, 455], [600, 452], [650, 450], [705, 440]]],
  ["Calle Maestro Muñoz Molleda", false, [[700, 580], [760, 595], [830, 610], [900, 630]]],
  ["Calle San Pablo", false, [[690, 505], [688, 580], [690, 655]]],
  ["Calle Teatro", false, [[720, 505], [725, 580], [728, 668]]],
  ["Calle Galileo", false, [[898, 575], [980, 575], [1062, 575]]],
  ["Calle Mateo Inurria", false, [[755, 345], [800, 385], [875, 385]]],
  ["Calle Santa Ana", false, [[440, 350], [450, 420], [470, 500], [470, 575]]],
];

/** Calles del norte (El Zabal y La Atunara), sobre el ortofoto, ya en coordenadas del mundo. */
const NORTE: Calle[] = [
  { nombre: "Carretera del Zabal (A-383)", principal: true, puntos: [P(700, 15), [545, 640], [540, 505], [525, 380], [500, 90]] },
  { nombre: "Camino del Zabal", principal: false, puntos: [[525, 380], [640, 372], [700, 372]] },
  { nombre: "Ronda Norte", principal: true, puntos: [P(800, 20), [720, 770], P(1060, 30)] },
  { nombre: "Paseo del Mediterráneo", principal: true, puntos: [P(1076, 0), [850, 700], [866, 645], [878, 560], [895, 450]] },
  { nombre: "Avenida Menéndez Pelayo", principal: true, puntos: [P(1060, 30), P(1076, 0)] },
];

export const CALLES: Calle[] = [
  ...PLANO.map(([nombre, principal, pts]) => ({ nombre, principal, puntos: pts.map(([u, v]) => P(u, v)) })),
  ...NORTE,
];

/**
 * Red caminable generada desde las calles: cada vértice es un nodo, los que
 * caen a menos de 7 unidades se funden y los cruces entre tramos se parten.
 */
function construirRed() {
  const nodos: Punto[] = [];
  const idDe = (p: Punto) => {
    let i = nodos.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 7);
    if (i < 0) {
      nodos.push(p);
      i = nodos.length - 1;
    }
    return i;
  };
  type Seg = { a: Punto; b: Punto; nombre: string; principal: boolean; cortes: Punto[] };
  const segs: Seg[] = [];
  for (const c of CALLES) for (let i = 0; i < c.puntos.length - 1; i++) segs.push({ a: c.puntos[i], b: c.puntos[i + 1], nombre: c.nombre, principal: c.principal, cortes: [] });
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i];
      const t = segs[j];
      const d1: Punto = [s.b[0] - s.a[0], s.b[1] - s.a[1]];
      const d2: Punto = [t.b[0] - t.a[0], t.b[1] - t.a[1]];
      const den = d1[0] * d2[1] - d1[1] * d2[0];
      if (Math.abs(den) < 1e-6) continue;
      const u = ((t.a[0] - s.a[0]) * d2[1] - (t.a[1] - s.a[1]) * d2[0]) / den;
      const v = ((t.a[0] - s.a[0]) * d1[1] - (t.a[1] - s.a[1]) * d1[0]) / den;
      if (u > 0.02 && u < 0.98 && v > 0.02 && v < 0.98) {
        const x: Punto = [Math.round(s.a[0] + d1[0] * u), Math.round(s.a[1] + d1[1] * u)];
        s.cortes.push(x);
        t.cortes.push(x);
      }
    }
  }
  const tramos: [string, string, string, boolean][] = [];
  const vistos = new Set<string>();
  for (const s of segs) {
    const largo = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    const t = (p: Punto) => ((p[0] - s.a[0]) * (s.b[0] - s.a[0]) + (p[1] - s.a[1]) * (s.b[1] - s.a[1])) / (largo * largo);
    const pts = [s.a, ...s.cortes.sort((p, q) => t(p) - t(q)), s.b];
    for (let k = 0; k < pts.length - 1; k++) {
      const a = idDe(pts[k]);
      const b = idDe(pts[k + 1]);
      const clave = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (a === b || vistos.has(clave)) continue;
      vistos.add(clave);
      tramos.push([`n${a}`, `n${b}`, s.nombre, s.principal]);
    }
  }
  return { nodos: Object.fromEntries(nodos.map((p, i) => [`n${i}`, p])) as Record<string, Punto>, tramos };
}

const RED = construirRed();

/** Red caminable: cruces del callejero. */
export const NODOS: Record<string, Punto> = RED.nodos;

/** Tramos de calle: [desde, hasta, nombre, principal]. */
export const TRAMOS: readonly (readonly [string, string, string, boolean])[] = RED.tramos;

/** Nodo más cercano a un punto del mundo. */
export function nodoCercano(p: Punto) {
  let mejor = "";
  let d = Infinity;
  for (const [id, q] of Object.entries(NODOS)) {
    const dd = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (dd < d) {
      d = dd;
      mejor = id;
    }
  }
  return mejor;
}

/** Posiciones de los lugares (en el plano o en el ortofoto). */
export const POSICION = {
  casa: P(490, 350),
  plaza: P(612, 612),
  mercado: P(650, 570),
  bar: P(700, 650),
  redaccion: P(530, 595),
  estacion: P(640, 770),
  frontera: P(700, 930),
  paseo: P(330, 578),
  levante: P(1065, 420),
  santaBarbara: P(1060, 690),
  estadio: P(985, 760),
  atunara: [866, 645] as Punto,
  huerta: [640, 372] as Punto,
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

export const LUGARES: Record<LugarId, Lugar> = {
  casa: { nombre: "Casa de la abuela", nodo: nodoCercano(POSICION.casa), barrio: "sanBernardo", icono: "casa", seccion: "TU CASA", descripcion: "Una casa baja con patio, azulejos y una higuera que nadie ha podado en años." },
  estacion: { nombre: "Estación de autobuses", nodo: nodoCercano(POSICION.estacion), barrio: "poniente", icono: "bus", seccion: "MOVILIDAD", descripcion: "Aquí te dejó el autobús. Huele a café y a gasoil." },
  plaza: { nombre: "Plaza de la Iglesia", nodo: nodoCercano(POSICION.plaza), barrio: "centro", icono: "iglesia", seccion: "CIUDAD", descripcion: "El corazón del Centro: la Inmaculada, el monumento y, en el tablón, los encargos de los vecinos." },
  mercado: { nombre: "Mercado de Abastos", nodo: nodoCercano(POSICION.mercado), barrio: "centro", icono: "mercado", seccion: "CIUDAD", descripcion: "Pescado, verdura, voces y el puesto 14, cerrado desde hace años." },
  bar: { nombre: "Bar de Lola", nodo: nodoCercano(POSICION.bar), barrio: "centro", icono: "bar", seccion: "CIUDAD", descripcion: "En la Calle Real. Montaditos, tortillitas y todas las noticias antes que nadie." },
  redaccion: { nombre: "Redacción de InfoLinense", nodo: nodoCercano(POSICION.redaccion), barrio: "centro", icono: "periodico", seccion: "INFOLINENSE", descripcion: "Una oficina pequeña, tres pantallas y un mapa de La Línea lleno de chinchetas." },
  atunara: { nombre: "Puerto de La Atunara", nodo: nodoCercano(POSICION.atunara), barrio: "atunara", icono: "ancla", seccion: "LA ATUNARA", descripcion: "La dársena, la escollera, las barcas blancas y azules y la lonja." },
  huerta: { nombre: "Huertos del Zabal", nodo: nodoCercano(POSICION.huerta), barrio: "zabal", icono: "brote", seccion: "EL ZABAL", descripcion: "Parcelas cercadas con su caseta, pinos alrededor y Rafa con la radio puesta." },
  frontera: { nombre: "La Verja", nodo: nodoCercano(POSICION.frontera), barrio: "centro", icono: "bandera", seccion: "GIBRALTAR", descripcion: "La frontera. Colas, motos, prisas y un banco donde siempre está Andrés." },
  paseo: { nombre: "Paseo de Poniente", nodo: nodoCercano(POSICION.paseo), barrio: "poniente", icono: "ola", seccion: "PONIENTE", descripcion: "La bahía, los barcos fondeados y el Peñón a la izquierda." },
  levante: { nombre: "Playa de Levante", nodo: nodoCercano(POSICION.levante), barrio: "levante", icono: "ola", seccion: "LEVANTE", descripcion: "Kilómetros de arena oscura y mar abierto. Cuando sopla levante, esto es otra cosa." },
  santaBarbara: { nombre: "Santa Bárbara", nodo: nodoCercano(POSICION.santaBarbara), barrio: "levante", icono: "fuerte", seccion: "HISTORIA", descripcion: "Playa a los pies del Peñón y los restos del fuerte que le da nombre." },
  estadio: { nombre: "Estadio Municipal", nodo: nodoCercano(POSICION.estadio), barrio: "levante", icono: "balon", seccion: "DEPORTES", descripcion: "La casa de la Balona, junto a la playa. Hoy entrenan a puerta abierta." },
};
