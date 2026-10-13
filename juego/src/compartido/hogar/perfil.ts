import { azar } from "./datos.ts";

/**
 * Perfil de una vivienda: de qué gama es, qué programa de espacios le corresponde
 * por su tamaño y tipo, y con qué estilo y acabados está hecha. Todo se deduce de
 * los datos de la unidad (precio, superficie, tipo, barrio y conservación), de
 * forma determinista: lo calculan igual el servidor y el navegador.
 *
 * El perfil decide la arquitectura interior (altura de techos, pasillos, puertas,
 * ventanas, molduras, alicatados, iluminación), la distribución y el mobiliario.
 */

export type Gama = "economica" | "media" | "alta";
export type Programa = "estudio" | "pisoPequeno" | "pisoMediano" | "pisoGrande" | "casaPequena" | "casa" | "casaGrande";
export type Estilo = "basico" | "mediterraneo" | "tradicional" | "moderno" | "reformado" | "antiguo";

export interface Acabados {
  /** Altura libre de los techos (m). */
  techo: number;
  /** Puertas interiores: hoja lisa barata, de cuarterones o lacada con molduras; acceso al salón. */
  puerta: "lisa" | "cuarterones" | "lacada";
  puertaSalon: "simple" | "doble" | "arco";
  /** Ventanas: aluminio sencillo, madera con persiana o balconera hasta el techo. */
  ventana: "aluminio" | "madera" | "balconera";
  cortinas: boolean;
  /** Rodapié (alto en m, 0 = sin rodapié) y moldura de techo. */
  rodapie: number;
  moldura: boolean;
  /** Alicatado de cocina y baño: altura (m) y pieza. */
  alicatado: { alto: number; pieza: "azulejo" | "metro" | "gran" | "sevillano" };
  /** Iluminación: bombilla, plafón o lámparas de diseño con focos. */
  luz: "bombilla" | "plafon" | "diseno";
  /** Suelos por zona (claves de SUELOS). */
  sueloDia: string;
  sueloNoche: string;
  sueloHumedo: string;
  /** Pintura base de las paredes por zona. */
  pintura: { dia: string; noche: string; humedo: string };
  /** Carpintería (puertas, marcos, rodapié de madera). */
  madera: string;
  /** Color de los muebles de cocina y del textil principal. */
  cocina: string;
  textil: string;
}

export interface Perfil {
  gama: Gama;
  programa: Programa;
  estilo: Estilo;
  dormitorios: number;
  banos: number;
  /** Pasillo: 0 = las habitaciones abren al salón; 1 = pasillo estándar; 2 = galería amplia con recibidor. */
  pasillo: 0 | 1 | 2;
  cocinaAbierta: boolean;
  enSuite: boolean;
  vestidor: boolean;
  despacho: boolean;
  despensa: boolean;
  acabados: Acabados;
}

export interface DatosUnidad {
  tipo: "casa" | "piso" | "atico";
  superficie: number;
  precio: number;
  estadoBase: number;
  barrioId: string;
  semilla: number;
}

export const NOMBRE_GAMA: Record<Gama, string> = { economica: "Económica", media: "Media", alta: "Alta" };
export const NOMBRE_ESTILO: Record<Estilo, string> = {
  basico: "Básico", mediterraneo: "Mediterráneo", tradicional: "Tradicional", moderno: "Moderno", reformado: "Reformado", antiguo: "Antiguo",
};
export const NOMBRE_PROGRAMA: Record<Programa, string> = {
  estudio: "Estudio", pisoPequeno: "Piso pequeño", pisoMediano: "Piso mediano", pisoGrande: "Piso grande",
  casaPequena: "Casa pequeña", casa: "Casa", casaGrande: "Casa grande",
};

/** Gama por precio por metro (recoge barrio y conservación) y por precio total. */
export function gamaDe(u: DatosUnidad): Gama {
  if (u.precio <= 0) return u.estadoBase < 50 ? "economica" : "media";
  const m2 = u.precio / u.superficie;
  if (m2 >= 38 || (m2 >= 35 && u.precio >= 6500)) return "alta";
  if (m2 < 31) return "economica";
  return "media";
}

function programaDe(u: DatosUnidad): Programa {
  const s = u.superficie;
  if (u.tipo === "casa") return s < 72 ? "casaPequena" : s < 125 ? "casa" : "casaGrande";
  if (s < 46) return "estudio";
  if (s < 64) return "pisoPequeno";
  if (s < 95) return "pisoMediano";
  return "pisoGrande";
}

function estiloDe(u: DatosUnidad, gama: Gama, r: () => number): Estilo {
  // Sin reformar: la casa conserva lo antiguo.
  if (u.estadoBase < 38) return "antiguo";
  const casaPopular = u.tipo === "casa" && ["sanBernardo", "atunara", "zabal"].includes(u.barrioId);
  if (gama === "economica") return casaPopular && r() < 0.5 ? "tradicional" : "basico";
  if (gama === "media") {
    if (casaPopular) return r() < 0.6 ? "mediterraneo" : "tradicional";
    return u.estadoBase > 75 ? "reformado" : r() < 0.5 ? "mediterraneo" : "basico";
  }
  if (u.tipo === "atico" || u.estadoBase > 80) return "moderno";
  return casaPopular || r() < 0.4 ? "tradicional" : "reformado";
}

const ACABADOS_GAMA: Record<Gama, Pick<Acabados, "techo" | "puerta" | "puertaSalon" | "ventana" | "cortinas" | "rodapie" | "moldura" | "alicatado" | "luz">> = {
  economica: { techo: 2.5, puerta: "lisa", puertaSalon: "simple", ventana: "aluminio", cortinas: false, rodapie: 0.07, moldura: false, alicatado: { alto: 1.5, pieza: "azulejo" }, luz: "bombilla" },
  media: { techo: 2.7, puerta: "cuarterones", puertaSalon: "simple", ventana: "madera", cortinas: true, rodapie: 0.09, moldura: false, alicatado: { alto: 2.1, pieza: "metro" }, luz: "plafon" },
  alta: { techo: 3.0, puerta: "lacada", puertaSalon: "doble", ventana: "balconera", cortinas: true, rodapie: 0.13, moldura: true, alicatado: { alto: 3.0, pieza: "gran" }, luz: "diseno" },
};

/** Paletas por estilo: suelos, pinturas, carpintería, cocina y textiles. */
const PALETA_ESTILO: Record<Estilo, Pick<Acabados, "sueloDia" | "sueloNoche" | "sueloHumedo" | "pintura" | "madera" | "cocina" | "textil">> = {
  basico: { sueloDia: "gres", sueloNoche: "gres", sueloHumedo: "gres", pintura: { dia: "#EDEAE3", noche: "#E8E6E1", humedo: "#F2F2EF" }, madera: "#C9B79A", cocina: "#F2F1EC", textil: "#8D99A6" },
  mediterraneo: { sueloDia: "barro", sueloNoche: "terrazo", sueloHumedo: "hidraulico", pintura: { dia: "#FBFAF6", noche: "#F3EEE3", humedo: "#FBFAF6" }, madera: "#9C6B43", cocina: "#5E8FB8", textil: "#2F6DB5" },
  tradicional: { sueloDia: "hidraulico", sueloNoche: "terrazo", sueloHumedo: "hidraulico", pintura: { dia: "#F4EAD5", noche: "#EFE3CC", humedo: "#FBFAF6" }, madera: "#6B4A2E", cocina: "#3E6B4F", textil: "#9C3B32" },
  moderno: { sueloDia: "microcemento", sueloNoche: "parquet", sueloHumedo: "porcelanico", pintura: { dia: "#F4F4F2", noche: "#E9E6E1", humedo: "#EDEDEB" }, madera: "#F4F4F2", cocina: "#2B2D31", textil: "#B8B2A7" },
  reformado: { sueloDia: "parquet", sueloNoche: "parquet", sueloHumedo: "porcelanico", pintura: { dia: "#F6F3EC", noche: "#E7EDF0", humedo: "#F6F3EC" }, madera: "#FFFFFF", cocina: "#E9E4DA", textil: "#4F6B7A" },
  antiguo: { sueloDia: "terrazo", sueloNoche: "terrazo", sueloHumedo: "hidraulico", pintura: { dia: "#E6DCC6", noche: "#E2D7C0", humedo: "#E9E2D3" }, madera: "#6B4A2E", cocina: "#C9B48C", textil: "#7E6A55" },
};

export function perfilDe(u: DatosUnidad): Perfil {
  const r = azar(u.semilla * 7 + 3);
  const gama = gamaDe(u);
  const programa = programaDe(u);
  const estilo = estiloDe(u, gama, r);
  const s = u.superficie;
  // Dormitorios: a igual superficie, una vivienda barata mete más habitaciones y más pequeñas;
  // una cara prefiere menos habitaciones, más amplias y con más baños.
  const porDorm = { economica: 17, media: 22, alta: 30 }[gama];
  const fijo = { economica: 26, media: 34, alta: 48 }[gama];
  let dormitorios = Math.max(1, Math.min(4, Math.floor((s - fijo) / porDorm)));
  if (programa === "estudio") dormitorios = 0;
  if (programa === "pisoPequeno" || programa === "casaPequena") dormitorios = Math.min(dormitorios, gama === "economica" ? 2 : 1);
  const grande = programa === "pisoGrande" || programa === "casaGrande";
  const banos = programa === "estudio" ? 1 : gama === "alta" && s >= 85 ? 2 : grande && gama !== "economica" ? 2 : 1;
  const pasillo: 0 | 1 | 2 = programa === "estudio" || programa === "pisoPequeno" || programa === "casaPequena" ? 0 : gama === "alta" && s >= 90 ? 2 : 1;
  const cocinaAbierta = programa === "estudio" || programa === "pisoPequeno" || estilo === "moderno";
  const enSuite = banos >= 2 && dormitorios >= 2;
  const vestidor = gama === "alta" && s >= 120;
  const despacho = gama !== "economica" && s >= 140;
  const despensa = u.tipo === "casa" && s >= 110 && gama !== "alta" ? true : gama === "alta" && s >= 150;
  const acabados: Acabados = { ...ACABADOS_GAMA[gama], ...PALETA_ESTILO[estilo] };
  // El estilo matiza los acabados de la gama.
  if (estilo === "tradicional" || estilo === "antiguo") {
    acabados.alicatado = { ...acabados.alicatado, pieza: "sevillano" };
    if (gama === "alta") acabados.puertaSalon = "arco";
  }
  if (estilo === "moderno") {
    acabados.moldura = false;
    acabados.puertaSalon = cocinaAbierta ? "simple" : "doble";
  }
  if (estilo === "antiguo") {
    acabados.techo = Math.max(acabados.techo, 2.9);
    acabados.luz = "bombilla";
    acabados.cortinas = false;
  }
  return { gama, programa, estilo, dormitorios, banos, pasillo, cocinaAbierta, enSuite, vestidor, despacho, despensa, acabados };
}
