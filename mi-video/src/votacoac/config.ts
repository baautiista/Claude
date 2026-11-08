/**
 * VÍDEO PROMOCIONAL "Las cinco del público" — VotaCOAC 2027 (30–40 s).
 * Identidad tomada del repositorio de la web (baautiista/votacoac): colores de globals.css,
 * tipografías Bricolage Grotesque y DM Sans, wordmark "votaCOAC ✦", textos reales de la interfaz.
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId = "gancho" | "funcion" | "modalidades" | "interfaz" | "premio" | "cta";
export type Momento = MomentoGuion<EscenaId>;

/** Colores reales de votacoac.es (src/app/globals.css). */
export const V = {
  azul: "#3B84FA",
  azulProfundo: "#1E5ED1",
  azulSuave: "#E7EFFF",
  tinta: "#171344",
  tinta2: "#2E2766",
  tintaSuave: "#4A4670",
  textoApagado: "#5F5B7A",
  amarillo: "#F2BE26",
  amarilloSuave: "#FFF4D1",
  rosa: "#C92168",
  rosaSuave: "#FCE8F0",
  verde: "#8BD557",
  verdeSuave: "#EDF8E4",
  papel: "#FBF8F2",
  blanco: "#FFFFFF",
} as const;

export type Modalidad = "Coro" | "Comparsa" | "Chirigota" | "Cuarteto";
/** Igual que categoryDesign en src/lib/design.ts. */
export const MODALIDADES: Record<Modalidad, { plural: string; color: string; ink: string; pale: string }> = {
  Coro: { plural: "Coros", color: "#C92168", ink: "#A11450", pale: "#FCEAF1" },
  Comparsa: { plural: "Comparsas", color: "#3B84FA", ink: "#2465BE", pale: "#E6EEFF" },
  Chirigota: { plural: "Chirigotas", color: "#F2BE26", ink: "#7A5A00", pale: "#FFF6DA" },
  Cuarteto: { plural: "Cuartetos", color: "#8BD557", ink: "#244D0D", pale: "#EFF8E7" },
};
export const ORDEN: Modalidad[] = ["Coro", "Comparsa", "Chirigota", "Cuarteto"];

export const FUENTES = { display: "Bricolage Grotesque", texto: "DM Sans" } as const;

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  { id: "gancho", nombre: "1. ¿Sabes quién va a ganar?", inicio: 0, fin: 4, frases: ["¿Sabes quién va a ganar el COAC 2027?"] },
  { id: "funcion", nombre: "2. Las cinco del público", inicio: 4, fin: 8, frases: ["Demuestra cuánto sabes de carnaval con Las cinco del público, en VotaCOAC."] },
  {
    id: "modalidades",
    nombre: "3. Cinco por modalidad",
    inicio: 8,
    fin: 17,
    frases: ["Elige cinco coros, cinco comparsas, cinco chirigotas y cinco cuartetos que creas que llegarán más lejos."],
  },
  { id: "interfaz", nombre: "4. Elige y guarda", inicio: 17, fin: 24, frases: ["Guarda tu selección y descubre cuántas has acertado cuando termine el concurso."] },
  { id: "premio", nombre: "5. Habrá premio", inicio: 24, fin: 30, frases: ["¡Y habrá un premio para el ganador!", "Muy pronto anunciaremos todos los detalles."] },
  { id: "cta", nombre: "6. Llamada a la acción", inicio: 30, fin: 36, frases: ["Entra en votacoac.es y haz tu quiniela.", "¿Te atreves a acertar?"] },
];

const m = (escena: EscenaId, frase: number, palabra?: string, ocurrencia?: number): Momento => ({ escena, frase, palabra, ocurrencia });

export const MOMENTOS = {
  ganar: m("gancho", 0, "ganar"),
  cinco: m("funcion", 0, "Las"),
  coros: m("modalidades", 0, "coros,"),
  comparsas: m("modalidades", 0, "comparsas,"),
  chirigotas: m("modalidades", 0, "chirigotas"),
  cuartetos: m("modalidades", 0, "cuartetos"),
  lejos: m("modalidades", 0, "lejos."),
  guarda: m("interfaz", 0, "Guarda"),
  descubre: m("interfaz", 0, "descubre"),
  acertado: m("interfaz", 0, "acertado"),
  premio: m("premio", 0, "premio"),
  detalles: m("premio", 1, "detalles."),
  quiniela: m("cta", 0, "quiniela."),
  atreves: m("cta", 1, "atreves"),
} satisfies Record<string, Momento>;

/** Primeras comparsas del catálogo 2027 por orden alfabético (solo para la demostración de la selección). */
export const DEMO_COMPARSAS = [
  { nombre: "A caparreo", autor: "Lolo Sevilla Pecci y Marcos Nogueroles" },
  { nombre: "Al alba", autor: "Javier Vargas" },
  { nombre: "Aquí vive un comparsista", autor: "Marcos García y Antonio Pedrosa" },
  { nombre: "Coser y Cantar", autor: "Fran Millán, Rubén Vallejo y M. Á. Márquez" },
  { nombre: "De puerta en puerta", autor: "Dos Hermanas" },
  { nombre: "El cántaro y la fuente", autor: "José Luis Bustelo" },
];

export const PRONUNCIACION: Record<string, string> = {
  "COAC": "Coac",
  "2027": "dos mil veintisiete",
  "VotaCOAC": "Vota Coac",
  "votacoac.es": "vota coac punto es",
};

/** Voz joven y con energía publicitaria (ElevenLabs: "Juanka Dominguez - Actor"). */
export const VOZ_ID = "svj03RH3i7SeP6ikII3q";
export const AJUSTES_VOZ = { stability: 0.4, style: 0.4, speed: 1.05 };

export const DURACION_MINIMA_ESCENA: Record<string, number> = { gancho: 3.6, funcion: 4.2, modalidades: 7.8, interfaz: 7, premio: 5.6 };
export const PAUSAS_ENTRE_FRASES: Record<string, number> = { premio: 0.4, cta: 0.45 };

export const CIERRE_SEGUNDOS = 2.4;

export const AUDIO = {
  locucion: "votacoac/locucion.mp3",
  musica: "votacoac/musica.mp3",
  clic: "votacoac/clic.mp3",
  barrido: "votacoac/barrido.mp3",
  premio: "votacoac/premio.mp3",
  tic: "votacoac/tic.mp3",
  volumenMusica: 0.16,
  volumenEfectos: 0.4,
} as const;
