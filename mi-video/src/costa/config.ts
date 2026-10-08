/**
 * CONFIGURACIÓN DEL VÍDEO "Rellenos y puertos en el entorno de La Línea" (60 s)
 * Tiempos en segundos; con `npm run locucion -- costa` salen del audio.
 * Los efectos van anclados a palabras del guion.
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId = "apertura" | "eastside" | "westside" | "crinavis" | "atunara" | "cierre";
export type Momento = MomentoGuion<EscenaId>;

/** Duración exacta del vídeo (s). */
export const DURACION_TOTAL = 60;
export const FIRMA_SEGUNDOS = 0.9;

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  {
    id: "apertura",
    nombre: "0. Apertura: el litoral",
    inicio: 0,
    fin: 8,
    frases: ["¿Qué está pasando con el mar que rodea La Línea?", "Cuatro proyectos, pero no todos son iguales."],
  },
  {
    id: "eastside",
    nombre: "1. Eastside, Gibraltar",
    inicio: 8,
    fin: 21,
    frases: [
      "En Eastside, Gibraltar ha depositado, según los promotores, más de un millón y medio de toneladas de materiales para construir viviendas, un hotel y un puerto deportivo.",
      "Ecologistas advierten de posibles efectos sobre la Atunara.",
    ],
  },
  {
    id: "westside",
    nombre: "2. Westside, Gibraltar",
    inicio: 21,
    fin: 31,
    frases: [
      "En Westside, proyecta otros 47.000 metros cuadrados de rellenos para unas 2.300 viviendas.",
      "¿Qué consecuencias tendrá para nuestra bahía?",
    ],
  },
  {
    id: "crinavis",
    nombre: "3. Crinavis, San Roque",
    inicio: 31,
    fin: 42,
    frases: [
      "En Crinavis, San Roque, los rellenos portuarios tienen décadas de historia.",
      "Ya en el año 2000, 174 vecinos de Príncipe Alfonso presentaron alegaciones por sus posibles impactos.",
    ],
  },
  {
    id: "atunara",
    nombre: "4. Puerto de la Atunara",
    inicio: 42,
    fin: 54,
    frases: [
      "Y en la Atunara se prevén hasta 250 atraques mediante nuevos pantalanes dentro del puerto existente.",
      "Y que quede muy claro: el nuevo puerto deportivo de la Atunara no contempla rellenos para ganar terreno al mar.",
    ],
  },
  {
    id: "cierre",
    nombre: "5. Reflexión final",
    inicio: 54,
    fin: 59.1,
    frases: ["Ampliar los amarres no es lo mismo que rellenar la costa."],
  },
];

const m = (escena: EscenaId, frase: number, palabra?: string, mas?: number): Momento => ({ escena, frase, palabra, mas });

export const MOMENTOS = {
  cuatro: m("apertura", 1, "Cuatro"),
  // Eastside
  depositado: m("eastside", 0, "depositado,"),
  millon: m("eastside", 0, "millón"),
  viviendasEast: m("eastside", 0, "viviendas,"),
  hotel: m("eastside", 0, "hotel"),
  puertoEast: m("eastside", 0, "puerto"),
  ecologistas: m("eastside", 1, "Ecologistas"),
  atunaraEast: m("eastside", 1, "Atunara."),
  // Westside
  proyecta: m("westside", 0, "proyecta"),
  metros: m("westside", 0, "47.000"),
  viviendasWest: m("westside", 0, "2.300"),
  bahia: m("westside", 1, "bahía?"),
  // Crinavis
  portuarios: m("crinavis", 0, "portuarios"),
  anio2000: m("crinavis", 1, "2000,"),
  vecinos: m("crinavis", 1, "174"),
  alegaciones: m("crinavis", 1, "alegaciones"),
  // Atunara
  atraques: m("atunara", 0, "250"),
  pantalanes: m("atunara", 0, "pantalanes"),
  existente: m("atunara", 0, "existente."),
  claro: m("atunara", 1, "claro:"),
  noContempla: m("atunara", 1, "contempla"),
  // Cierre
  rellenar: m("cierre", 0, "rellenar"),
} satisfies Record<string, Momento>;

/** Fotos. Las del litoral son de apertura; las de proyectos se sustituyen solas al añadirlas. */
export const FOTOS = {
  litoral: [
    { archivo: "costa/litoral-1-general.jpg", rotulo: "La Línea" },
    { archivo: "costa/litoral-2-levante.jpg", rotulo: "Levante" },
    { archivo: "costa/litoral-3-poniente.jpg", rotulo: "Poniente" },
    { archivo: "costa/litoral-4-gibraltar.jpg", rotulo: "Frente a Gibraltar" },
  ],
  eastside: "costa/eastside.jpg",
  westside: "costa/westside.jpg",
  crinavis: "costa/crinavis.jpg",
  expediente: "costa/expediente-2000.jpg",
  atunara: "costa/atunara.jpg",
} as const;

export const PRONUNCIACION: Record<string, string> = {
  "47.000": "cuarenta y siete mil",
  "2.300": "dos mil trescientas",
  "2000,": "dos mil,",
  "174": "ciento setenta y cuatro",
  "250": "doscientos cincuenta",
};

/** La apertura deja respirar las imágenes del litoral. */
export const PAUSAS_ENTRE_FRASES: Record<string, number> = { apertura: 1.2, eastside: 0.4, westside: 0.4, crinavis: 0.4, atunara: 0.4 };

/** Ritmo natural ajustado para que el guion quepa en 60 s. */
export const AJUSTES_VOZ = { speed: 1.15 };

export const AUDIO = {
  locucion: "costa/locucion.mp3",
  musica: "costa/musica.mp3",
  volumenMusicaConVoz: 0.1,
  volumenMusicaSinVoz: 0.22,
  fundidoMusica: 1.0,
} as const;
