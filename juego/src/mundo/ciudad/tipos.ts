import type { P2 } from "../sectores/piezas";

/** Datos de un edificio generado (scripts/sector/nucleo.py → src/datos/ciudad/teselas/*.json). */
export type Cara = "calle" | "medianera" | "patio";
export type Tipologia = "atunara" | "casa_baja" | "casa_dos" | "medianeras" | "burguesa" | "comercial" | "bloque" | "singular" | "anexo";
export type Cubierta = "azotea" | "dos_aguas" | "cuatro_aguas" | "tejadillo";
export type Revestimiento = "encalado" | "revoco" | "ladrillo" | "ceramico" | "piedra_pb";
export type Confianza = "alta" | "media" | "baja";
export type Estado = "verde" | "amarillo" | "rojo";

export interface EdificioCiudad {
  id: string;
  osm: string | null;
  overture: string;
  fuente: string;
  nombre: string | null;
  barrio: string;
  tesela: string;
  huella: P2[];
  patios: P2[][];
  caras: Cara[];
  calles: string[];
  area: number;
  frente: number;
  esquina: boolean;
  plantas: number;
  alturaM: number;
  cubierta: Cubierta;
  atico: P2[] | null;
  tipologia: Tipologia;
  revestimiento: Revestimiento;
  color: string;
  zocalo: boolean;
  pb: "comercio" | "portal" | "vivienda";
  nivel: "A" | "B" | "C";
  fuentes: { huella: string; plantas: string; altura: string; catastro: string | null };
  confianza: { huella: Confianza; plantas: Confianza; altura: Confianza; cubierta: Confianza; tipologia: Confianza };
  estado: Estado;
  motivos: string[];
  reparado: string[];
}

export interface Tesela {
  id: string;
  bbox: [number, number, number, number];
  generado: string;
  manzanas: { barrio: string; poligono: P2[]; clave: string }[];
  edificios: EdificioCiudad[];
}

export interface IndiceCiudad {
  generado: string;
  fuentes: Record<string, unknown>;
  teselas: Record<string, { bbox: [number, number, number, number]; edificios: number; estados: Record<Estado, number>; barrios: string[] }>;
  /** Índices de rectángulos de linea.json que caen en manzanas generadas. */
  sustituidos?: number[];
}

/** Corrección manual (capa aparte: nunca se escribe en los datos generados). */
export interface Correccion {
  plantas?: number;
  alturaM?: number;
  color?: string;
  tipologia?: Tipologia;
  revestimiento?: Revestimiento;
  ventanas?: "auto" | "persiana" | "recercado" | "arco" | "sencilla";
  balcones?: "auto" | "ninguno" | "forja" | "corrido" | "cierro";
  cubierta?: Cubierta;
  pb?: EdificioCiudad["pb"];
  modelo?: "generado" | "oculto";
  revision?: "pendiente" | "correcto";
  nota?: string;
  fecha?: string;
  autor?: string;
}
export type Correcciones = Record<string, Correccion>;

export interface Efectivo extends EdificioCiudad {
  ventanas: NonNullable<Correccion["ventanas"]>;
  balcones: NonNullable<Correccion["balcones"]>;
  modelo: NonNullable<Correccion["modelo"]>;
  revision: NonNullable<Correccion["revision"]>;
  corregido: string[];
}

export function aplicar(e: EdificioCiudad, c: Correccion | undefined): Efectivo {
  const k = c ?? {};
  const plantas = k.plantas ?? e.plantas;
  return {
    ...e,
    plantas,
    alturaM: k.alturaM ?? (k.plantas ? 3.6 + (plantas - 1) * 3 : e.alturaM),
    color: k.color ?? e.color,
    tipologia: k.tipologia ?? e.tipologia,
    revestimiento: k.revestimiento ?? e.revestimiento,
    cubierta: k.cubierta ?? e.cubierta,
    pb: k.pb ?? e.pb,
    // Un edificio revisado y marcado como correcto deja de ser amarillo.
    estado: k.revision === "correcto" && e.estado === "amarillo" ? "verde" : e.estado,
    ventanas: k.ventanas ?? "auto",
    balcones: k.balcones ?? "auto",
    modelo: k.modelo ?? "generado",
    revision: k.revision ?? "pendiente",
    corregido: Object.keys(k).filter((x) => !["revision", "nota", "fecha", "autor"].includes(x)),
  };
}
