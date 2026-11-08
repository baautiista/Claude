/**
 * VÍDEO "¿CUÁNDO CANTAN LOS GRANDES DEL COAC 2027?" para @carnavalinense (45–55 s).
 * Identidad de Carnavalinense (no InfoLinense): colores por modalidad y azul noche.
 * Fechas y nombres: los de la locución facilitada. Las modalidades marcadas `null`
 * están pendientes de confirmar con el calendario del sorteo (la tarjeta sale en blanco, sin color).
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId = "gancho" | "bloque1" | "bloque2" | "bloque3" | "bloque4" | "final";
export type Momento = MomentoGuion<EscenaId>;

export const C = {
  coro: "#FF0A68",
  comparsa: "#3888FF",
  chirigota: "#FFBE0B",
  cuarteto: "#43B978",
  noche: "#1D2E43",
  blanco: "#FFFFFF",
  azulClaro: "#96BEFA",
  amarilloClaro: "#FFDF87",
  rosaClaro: "#FFA0C4",
} as const;

export type Modalidad = "coro" | "comparsa" | "chirigota" | "cuarteto";
export const NOMBRE_MODALIDAD: Record<Modalidad, string> = { coro: "CORO", comparsa: "COMPARSA", chirigota: "CHIRIGOTA", cuarteto: "CUARTETO" };

export const USUARIO = "@carnavalinense";

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  { id: "gancho", nombre: "0. Gancho", inicio: 0, fin: 3, frases: ["¡Ya tenemos las fechas de los nombres más esperados del COAC 2027!"] },
  {
    id: "bloque1",
    nombre: "1. Del 8 al 11",
    inicio: 3,
    fin: 12,
    frases: [
      "El 8 de enero arranca el concurso con Luis Rivero, Molina y Jona.",
      "El 9, turno para los Villegas y Gago.",
      "El 10, Carlitos Pérez y los Pastrana.",
      "El 11 llega Yoly Álvarez junto a Subiela,",
    ],
  },
  {
    id: "bloque2",
    nombre: "2. El 12 y el 13",
    inicio: 12,
    fin: 21,
    frases: [
      "y el 12 será el turno de los Molina e Iván Romero.",
      "¡Ojo al 13 de enero!",
      "El Patriota, el Bizcocho y los Carapapas coinciden en una de las sesiones más esperadas.",
    ],
  },
  {
    id: "bloque3",
    nombre: "3. Del 15 al 18",
    inicio: 21,
    fin: 32,
    frases: ["El 15 llegan Julio Pardo y OBDC.", "El 16, Los Pibes y el Chapa.", "El 17 canta Llull y el 18, Antoñito Molina."],
  },
  {
    id: "bloque4",
    nombre: "4. Del 19 al 21",
    inicio: 32,
    fin: 43,
    frases: ["El 19, Peluca y Bustelo.", "El 20, Cornejo y Martínez Ares.", "Y el 21 de enero, Piru y Tomate, junto al Sheriff, cerrarán las preliminares."],
  },
  { id: "final", nombre: "5. Calendario y pregunta", inicio: 43, fin: 50, frases: ["¿Cuál es la sesión que más ganas tienes de ver?", "¡Te leo en comentarios!"] },
];

const m = (escena: EscenaId, frase: number, palabra?: string, ocurrencia?: number): Momento => ({ escena, frase, palabra, ocurrencia });

export type Agrupacion = {
  readonly nombre: string;
  readonly modalidad: Modalidad | null;
  readonly momento: Momento;
  /** Protagonista: se destaca más (tamaño y sello). */
  readonly destacada?: boolean;
};

export type Sesion = {
  readonly dia: number;
  readonly semana: string;
  readonly momento: Momento;
  readonly agrupaciones: readonly Agrupacion[];
  readonly estrella?: boolean;
};

/** Sesiones de preliminares con los nombres de la locución (enero de 2027). */
export const SESIONES: readonly Sesion[] = [
  {
    dia: 8,
    semana: "VIERNES",
    momento: m("bloque1", 0, "8"),
    agrupaciones: [
      { nombre: "Luis Rivero", modalidad: "coro", momento: m("bloque1", 0, "Luis") },
      { nombre: "Molina", modalidad: null, momento: m("bloque1", 0, "Molina") },
      { nombre: "Jona", modalidad: null, momento: m("bloque1", 0, "Jona") },
    ],
  },
  {
    dia: 9,
    semana: "SÁBADO",
    momento: m("bloque1", 1, "9"),
    agrupaciones: [
      { nombre: "Los Villegas", modalidad: "comparsa", momento: m("bloque1", 1, "Villegas") },
      { nombre: "Gago", modalidad: null, momento: m("bloque1", 1, "Gago") },
    ],
  },
  {
    dia: 10,
    semana: "DOMINGO",
    momento: m("bloque1", 2, "10"),
    agrupaciones: [
      { nombre: "Carlitos Pérez", modalidad: null, momento: m("bloque1", 2, "Carlitos") },
      { nombre: "Los Pastrana", modalidad: null, momento: m("bloque1", 2, "Pastrana") },
    ],
  },
  {
    dia: 11,
    semana: "LUNES",
    momento: m("bloque1", 3, "11"),
    agrupaciones: [
      { nombre: "Yoly Álvarez", modalidad: null, momento: m("bloque1", 3, "Yoly") },
      { nombre: "Subiela", modalidad: null, momento: m("bloque1", 3, "Subiela") },
    ],
  },
  {
    dia: 12,
    semana: "MARTES",
    momento: m("bloque2", 0, "12"),
    agrupaciones: [
      { nombre: "Los Molina", modalidad: null, momento: m("bloque2", 0, "Molina") },
      { nombre: "Iván Romero", modalidad: null, momento: m("bloque2", 0, "Iván") },
    ],
  },
  {
    dia: 13,
    semana: "MIÉRCOLES",
    momento: m("bloque2", 1, "13"),
    estrella: true,
    agrupaciones: [
      { nombre: "El Patriota", modalidad: null, momento: m("bloque2", 2, "Patriota") },
      { nombre: "El Bizcocho", modalidad: "chirigota", momento: m("bloque2", 2, "Bizcocho"), destacada: true },
      { nombre: "Los Carapapas", modalidad: "chirigota", momento: m("bloque2", 2, "Carapapas"), destacada: true },
    ],
  },
  {
    dia: 15,
    semana: "VIERNES",
    momento: m("bloque3", 0, "15"),
    agrupaciones: [
      { nombre: "Julio Pardo", modalidad: "coro", momento: m("bloque3", 0, "Julio") },
      { nombre: "OBDC", modalidad: "comparsa", momento: m("bloque3", 0, "OBDC") },
    ],
  },
  {
    dia: 16,
    semana: "SÁBADO",
    momento: m("bloque3", 1, "16"),
    agrupaciones: [
      { nombre: "Los Pibes", modalidad: null, momento: m("bloque3", 1, "Pibes") },
      { nombre: "El Chapa", modalidad: "chirigota", momento: m("bloque3", 1, "Chapa") },
    ],
  },
  {
    dia: 17,
    semana: "DOMINGO",
    momento: m("bloque3", 2, "17"),
    agrupaciones: [{ nombre: "Llull", modalidad: null, momento: m("bloque3", 2, "Llull") }],
  },
  {
    dia: 18,
    semana: "LUNES",
    momento: m("bloque3", 2, "18"),
    agrupaciones: [{ nombre: "Antoñito Molina", modalidad: null, momento: m("bloque3", 2, "Antoñito") }],
  },
  {
    dia: 19,
    semana: "MARTES",
    momento: m("bloque4", 0, "19"),
    agrupaciones: [
      { nombre: "Peluca", modalidad: "chirigota", momento: m("bloque4", 0, "Peluca") },
      { nombre: "Bustelo", modalidad: null, momento: m("bloque4", 0, "Bustelo") },
    ],
  },
  {
    dia: 20,
    semana: "MIÉRCOLES",
    momento: m("bloque4", 1, "20"),
    agrupaciones: [
      { nombre: "Cornejo", modalidad: null, momento: m("bloque4", 1, "Cornejo") },
      { nombre: "Martínez Ares", modalidad: "comparsa", momento: m("bloque4", 1, "Martínez"), destacada: true },
    ],
  },
  {
    dia: 21,
    semana: "JUEVES",
    momento: m("bloque4", 2, "21"),
    agrupaciones: [
      { nombre: "Piru y Tomate", modalidad: null, momento: m("bloque4", 2, "Piru"), destacada: true },
      { nombre: "El Sheriff", modalidad: null, momento: m("bloque4", 2, "Sheriff"), destacada: true },
    ],
  },
];

export const MOMENTOS = {
  preguntaFinal: m("final", 0),
  comentarios: m("final", 1),
} satisfies Record<string, Momento>;

export const FOTOS = {
  fachada: "coac/falla-fachada.jpg",
  interior: "coac/falla-interior.jpg",
  logo: "coac/logo-carnaval-linense.jpg",
} as const;

export const PRONUNCIACION: Record<string, string> = {
  "COAC": "Coac",
  "2027": "dos mil veintisiete",
  "8": "ocho",
  "9": "nueve",
  "10": "diez",
  "11": "once",
  "12": "doce",
  "13": "trece",
  "15": "quince",
  "16": "dieciséis",
  "17": "diecisiete",
  "18": "dieciocho",
  "19": "diecinueve",
  "20": "veinte",
  "21": "veintiuno",
  "OBDC": "O B D C",
};

/** Voz juvenil y con energía (ElevenLabs: "Ismael - Andalusian from Málaga"). */
export const VOZ_ID = "LFPjn8ZBg3VjrjHxRH89";
export const AJUSTES_VOZ = { stability: 0.38, style: 0.45, speed: 1.08 };

export const PAUSAS_ENTRE_FRASES: Record<string, number> = { bloque2: 0.3, final: 0.35 };

/** El gancho deja respirar el titular y el final deja ver el calendario completo. */
export const DURACION_MINIMA_ESCENA: Record<string, number> = { gancho: 3 };

/** Cola final tras la última frase (pantalla de cierre). */
export const CIERRE_SEGUNDOS = 3;

export const AUDIO = {
  locucion: "coac/locucion.mp3",
  musica: "coac/musica.mp3",
  golpe: "coac/golpe.mp3",
  barrido: "coac/barrido.mp3",
  volumenMusica: 0.14,
  volumenEfectos: 0.35,
} as const;
