/**
 * Mapa de La Línea de la Concepción para «Mi Línea».
 *
 * Coordenadas del mundo: 1000 × 1750 unidades, norte arriba (x → este, y → sur).
 * 1 unidad ≈ 2,7 m reales; el trazado está comprimido para que cruzar la ciudad
 * no sea eterno.
 *
 * TRAZADO PROVISIONAL: dibujado a mano como esquema. `npm run mapa` descarga el
 * trazado real de OpenStreetMap y genera `mapa-real.json`; si existe, el render
 * usa sus costas y calles como fondo (ver src/mapa/render.ts). La red caminable
 * (NODOS/TRAMOS) y los lugares se mantienen aquí y se recolocan sobre el real.
 */

export type Punto = readonly [number, number];

export const MUNDO = { ancho: 1000, alto: 1750 } as const;

/** Tierra del lado español (Campo de Gibraltar), en sentido horario. */
export const TIERRA: readonly Punto[] = [
  [30, 0], [940, 0], [925, 160], [900, 340], [880, 520], [872, 700], [878, 900],
  [884, 1100], [876, 1300], [862, 1480], [250, 1480], [222, 1360], [196, 1220],
  [176, 1060], [162, 900], [156, 740], [148, 600], [120, 420], [80, 220],
];

/** Gibraltar, al sur de la Verja (no caminable en la Temporada 1). */
export const GIBRALTAR: readonly Punto[] = [
  [250, 1480], [862, 1480], [850, 1600], [800, 1750], [330, 1750], [300, 1640],
];

/** Silueta del Peñón, siempre al fondo. */
export const PENON: readonly Punto[] = [
  [470, 1580], [560, 1560], [700, 1600], [760, 1680], [770, 1750], [380, 1750], [400, 1660],
];

/** Pista del aeropuerto de Gibraltar, cruzando el istmo junto a la frontera. */
export const PISTA = { x: 150, y: 1512, ancho: 740, alto: 26 } as const;

export type BarrioId = "sanBernardo" | "centro" | "atunara" | "zabal" | "poniente" | "levante";

export const BARRIOS: Record<BarrioId, { nombre: string; zona: readonly Punto[]; rotulo: Punto }> = {
  zabal: { nombre: "El Zabal", zona: [[250, 120], [700, 110], [720, 400], [280, 420]], rotulo: [480, 150] },
  atunara: { nombre: "La Atunara", zona: [[660, 380], [900, 360], [880, 600], [650, 600]], rotulo: [770, 410] },
  sanBernardo: { nombre: "San Bernardo", zona: [[200, 640], [430, 620], [440, 900], [210, 920]], rotulo: [310, 660] },
  centro: { nombre: "Centro", zona: [[430, 800], [720, 790], [730, 1160], [440, 1170]], rotulo: [690, 1140] },
  poniente: { nombre: "Poniente", zona: [[160, 920], [330, 930], [360, 1400], [230, 1420]], rotulo: [250, 1180] },
  levante: { nombre: "Levante", zona: [[760, 760], [878, 760], [870, 1420], [760, 1420]], rotulo: [810, 1180] },
};

/** Red caminable: nodos (cruces) del callejero. */
export const NODOS: Record<string, Punto> = {
  estacion: [470, 700],
  casa: [300, 790],
  sbCruce: [370, 860],
  plaza: [510, 930],
  mercado: [630, 880],
  bar: [585, 1000],
  redaccion: [430, 1010],
  realSur: [520, 1070],
  espanaNorte: [540, 1160],
  frontera: [560, 1450],
  sbSur: [330, 1000],
  ponNorte: [175, 730],
  ponCentro: [190, 970],
  ponSur: [225, 1260],
  cruceSur: [390, 1230],
  norte: [500, 520],
  zabalCruce: [520, 300],
  huerta: [400, 220],
  salidaNorte: [520, 30],
  atunaraCruce: [690, 500],
  atunara: [820, 470],
  estadio: [680, 700],
  levNorte: [850, 770],
  levCruce: [760, 930],
  levCentro: [858, 960],
  levSur: [840, 1330],
  fronteraEste: [700, 1420],
};

/** Tramos de calle: [desde, hasta, nombre, principal]. */
export const TRAMOS: readonly (readonly [string, string, string, boolean])[] = [
  ["estacion", "plaza", "Avenida", true],
  ["estacion", "casa", "Calle", false],
  ["casa", "sbCruce", "Calle", false],
  ["sbCruce", "plaza", "Calle", false],
  ["plaza", "mercado", "Calle", false],
  ["plaza", "bar", "Calle Real", true],
  ["bar", "realSur", "Calle Real", true],
  ["plaza", "redaccion", "Calle", false],
  ["redaccion", "realSur", "Calle", false],
  ["realSur", "espanaNorte", "Calle", true],
  ["espanaNorte", "frontera", "Avenida de España", true],
  ["casa", "ponNorte", "Calle", false],
  ["sbCruce", "sbSur", "Calle", false],
  ["sbSur", "redaccion", "Calle", false],
  ["sbSur", "ponCentro", "Calle", false],
  ["ponNorte", "ponCentro", "Paseo Marítimo de Poniente", true],
  ["ponCentro", "ponSur", "Paseo Marítimo de Poniente", true],
  ["ponSur", "cruceSur", "Calle", false],
  ["cruceSur", "espanaNorte", "Calle", false],
  ["estacion", "norte", "Avenida", true],
  ["norte", "zabalCruce", "Carretera", true],
  ["zabalCruce", "huerta", "Camino del Zabal", false],
  ["zabalCruce", "salidaNorte", "Carretera", true],
  ["norte", "atunaraCruce", "Calle", true],
  ["atunaraCruce", "atunara", "Calle", false],
  ["estacion", "estadio", "Calle", false],
  ["estadio", "atunaraCruce", "Calle", false],
  ["estadio", "levNorte", "Calle", false],
  ["mercado", "levCruce", "Calle", false],
  ["levCruce", "levCentro", "Calle", false],
  ["levNorte", "levCentro", "Paseo de Levante", true],
  ["levCentro", "levSur", "Paseo de Levante", true],
  ["levSur", "fronteraEste", "Calle", false],
  ["fronteraEste", "frontera", "Calle", false],
  ["levCruce", "espanaNorte", "Calle", false],
];

export type IconoId =
  | "casa" | "iglesia" | "mercado" | "bar" | "periodico" | "ancla" | "brote"
  | "bandera" | "ola" | "bus" | "balon" | "fuerte";

export type LugarId =
  | "casa" | "plaza" | "mercado" | "bar" | "redaccion" | "atunara" | "huerta"
  | "frontera" | "paseo" | "levante" | "santaBarbara" | "estacion" | "estadio";

export interface Lugar {
  nombre: string;
  nodo: keyof typeof NODOS;
  barrio: BarrioId;
  icono: IconoId;
  /** Etiqueta de sección (estilo InfoLinense). */
  seccion: string;
  descripcion: string;
}

export const LUGARES: Record<LugarId, Lugar> = {
  casa: { nombre: "Casa de la abuela", nodo: "casa", barrio: "sanBernardo", icono: "casa", seccion: "TU CASA", descripcion: "Una casa baja con patio, azulejos y una higuera que nadie ha podado en años." },
  estacion: { nombre: "Estación de autobuses", nodo: "estacion", barrio: "sanBernardo", icono: "bus", seccion: "MOVILIDAD", descripcion: "Aquí te dejó el autobús. Huele a café y a gasoil." },
  plaza: { nombre: "Plaza de la Iglesia", nodo: "plaza", barrio: "centro", icono: "iglesia", seccion: "CIUDAD", descripcion: "El corazón del Centro. En el tablón, los vecinos dejan sus encargos." },
  mercado: { nombre: "Mercado de Abastos", nodo: "mercado", barrio: "centro", icono: "mercado", seccion: "CIUDAD", descripcion: "Pescado, verdura, voces y el puesto 14, cerrado desde hace años." },
  bar: { nombre: "Bar de Lola", nodo: "bar", barrio: "centro", icono: "bar", seccion: "CIUDAD", descripcion: "En la Calle Real. Montaditos, tortillitas y todas las noticias antes que nadie." },
  redaccion: { nombre: "Redacción de InfoLinense", nodo: "redaccion", barrio: "centro", icono: "periodico", seccion: "INFOLINENSE", descripcion: "Una oficina pequeña, tres pantallas y un mapa de La Línea lleno de chinchetas." },
  atunara: { nombre: "Puerto de La Atunara", nodo: "atunara", barrio: "atunara", icono: "ancla", seccion: "LA ATUNARA", descripcion: "Barcas de colores, redes al sol y la lonja." },
  huerta: { nombre: "Huerta de Rafa", nodo: "huerta", barrio: "zabal", icono: "brote", seccion: "EL ZABAL", descripcion: "Bancales de tomate y pimiento, una alberca y un chamizo con radio." },
  frontera: { nombre: "La Verja", nodo: "frontera", barrio: "centro", icono: "bandera", seccion: "GIBRALTAR", descripcion: "La frontera. Colas, motos, prisas y un banco donde siempre está Andrés." },
  paseo: { nombre: "Paseo de Poniente", nodo: "ponCentro", barrio: "poniente", icono: "ola", seccion: "PONIENTE", descripcion: "La bahía, los barcos fondeados y el Peñón a la izquierda." },
  levante: { nombre: "Playa de Levante", nodo: "levCentro", barrio: "levante", icono: "ola", seccion: "LEVANTE", descripcion: "Mar abierto. Cuando sopla levante, esto es otra cosa." },
  santaBarbara: { nombre: "Santa Bárbara", nodo: "levSur", barrio: "levante", icono: "fuerte", seccion: "HISTORIA", descripcion: "Playa a los pies del Peñón y los restos del fuerte que le da nombre." },
  estadio: { nombre: "Estadio Municipal", nodo: "estadio", barrio: "sanBernardo", icono: "balon", seccion: "DEPORTES", descripcion: "La casa de la Balona. Hoy entrenan a puerta abierta." },
};

/** Lugares que se anuncian en el mapa pero llegan en próximas temporadas. */
export const PROXIMAMENTE: readonly { nombre: string; en: Punto; temporada: string }[] = [
  { nombre: "Gibraltar", en: [560, 1640], temporada: "Temporada 3 · La Verja" },
  { nombre: "Hacia San Roque", en: [520, 60], temporada: "Más adelante" },
];
