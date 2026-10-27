/**
 * CONFIGURACIÓN DEL VÍDEO "Así cambiará la Plaza de la Constitución" (58 s exactos)
 * Recursos en public/plaza/. Los que faltan se ven como huecos (Placeholder) hasta añadirlos.
 * Los efectos van anclados a palabras del guion.
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId = "gancho" | "datos" | "superficie" | "pergolas" | "sombra" | "infra" | "infantil" | "vegetacion";
export type Momento = MomentoGuion<EscenaId>;

/** Duración exacta del vídeo (s). */
export const DURACION_TOTAL = 58;
/** Cierre sin narración: vista general + firma. */
export const CIERRE_SEGUNDOS = 2;
export const FIRMA_SEGUNDOS = 1;

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  { id: "gancho", nombre: "0. Gancho", inicio: 0, fin: 3, frases: ["Así cambiará la Plaza de la Constitución."] },
  {
    id: "datos",
    nombre: "1. Presupuesto y plazo",
    inicio: 3,
    fin: 10,
    frases: ["Mañana comienzan unas obras presupuestadas en 4,9 millones de euros, IVA incluido, con un plazo previsto de doce meses."],
  },
  {
    id: "superficie",
    nombre: "2. Fast motion POV",
    inicio: 10,
    fin: 18,
    frases: ["La actuación transformará unos 18.200 metros cuadrados, con prioridad peatonal, plataformas continuas, pavimentos claros y recorridos curvos."],
  },
  {
    id: "pergolas",
    nombre: "3. Las pérgolas",
    inicio: 18,
    fin: 27,
    frases: ["El elemento más reconocible serán trece pérgolas metálicas, con copas de doce y dieciséis metros de diámetro."],
  },
  {
    id: "sombra",
    nombre: "4. Fast motion cenital",
    inicio: 27,
    fin: 35,
    frases: ["Algunas quedarán conectadas por mallas para vegetación trepadora, creando nuevas zonas de sombra y estancia."],
  },
  {
    id: "infra",
    nombre: "5. Drenaje y fuente",
    inicio: 35,
    fin: 43,
    frases: [
      "También se renovarán la impermeabilización y el drenaje sobre el aparcamiento subterráneo.",
      "La fuente circular se conservará con un nuevo revestimiento.",
    ],
  },
  {
    id: "infantil",
    nombre: "6. Zona infantil",
    inicio: 43,
    fin: 49,
    frases: ["Habrá una zona infantil con pavimento de seguridad, juegos, bancos de madera y nueva iluminación."],
  },
  {
    id: "vegetacion",
    nombre: "7. Más vegetación",
    inicio: 49,
    fin: 56,
    frases: [
      "El proyecto incorporará veinte árboles, además de arbustos, plantas herbáceas y hiedra.",
      "El objetivo: convertir un espacio de paso en un lugar para descansar, jugar y encontrarnos.",
    ],
  },
];

const m = (escena: EscenaId, frase: number, palabra?: string, mas?: number): Momento => ({ escena, frase, palabra, mas });

export const MOMENTOS = {
  millones: m("datos", 0, "4,9"),
  meses: m("datos", 0, "doce"),
  metros: m("superficie", 0, "18.200"),
  peatonal: m("superficie", 0, "peatonal,"),
  curvos: m("superficie", 0, "curvos."),
  trece: m("pergolas", 0, "trece"),
  copas: m("pergolas", 0, "copas"),
  diametro: m("pergolas", 0, "diámetro."),
  mallas: m("sombra", 0, "mallas"),
  sombraPalabra: m("sombra", 0, "sombra"),
  drenaje: m("infra", 0, "drenaje"),
  fuente: m("infra", 1, "fuente"),
  revestimiento: m("infra", 1, "revestimiento."),
  pavimento: m("infantil", 0, "pavimento"),
  juegos: m("infantil", 0, "juegos,"),
  bancos: m("infantil", 0, "bancos"),
  iluminacion: m("infantil", 0, "iluminación."),
  arboles: m("vegetacion", 0, "veinte"),
  objetivo: m("vegetacion", 1, "objetivo:"),
  descansar: m("vegetacion", 1, "descansar,"),
  jugar: m("vegetacion", 1, "jugar"),
  encontrarnos: m("vegetacion", 1, "encontrarnos."),
} satisfies Record<string, Momento>;

/** Recursos. Los marcados como pendientes se ven como hueco hasta que estén en public/plaza/. */
export const RECURSOS = {
  // Aportados
  renderFinal: "plaza/render-final.jpg",
  pergolas: "plaza/pergolas.jpg",
  actual: ["plaza/actual-1.jpg", "plaza/actual-2.jpg", "plaza/actual-3.jpg"],
  fastMotionPov: "plaza/fastmotion-pov.mp4",
  fastMotionCenital: "plaza/fastmotion-cenital.mp4",
  /** Primer y último fotograma de los fast motion (extraídos tal cual, sin retocar). */
  povInicio: "plaza/pov-inicio.jpg",
  cenitalInicio: "plaza/cenital-inicio.jpg",
  cenitalFinal: "plaza/cenital-final.jpg",
  // Pendientes
  documento: "plaza/documento-presupuesto.jpg",
  planoPavimentos: "plaza/plano-pavimentos.jpg",
  planoJardineria: "plaza/plano-jardineria.jpg",
  planoDrenaje: "plaza/plano-drenaje.jpg",
  fuenteActual: "plaza/fuente-actual.jpg",
  renderFuente: "plaza/render-fuente.jpg",
  infantilActual: "plaza/infantil-actual.jpg",
  planoInfantil: "plaza/plano-infantil.jpg",
  renderInfantil: "plaza/render-infantil.jpg",
} as const;

/**
 * Documento: resumen del presupuesto (Memoria, pág. 54). Posiciones en % de la página.
 * Línea "PRESUPUESTO BASE DE LICITACIÓN ... 4.902.301,54" (IVA incluido).
 */
export const DOCUMENTO_ZONAS = {
  licitacion: { x: 42.5, y: 41.1, ancho: 39.5 },
  enfoque: { x: 62, y: 40 },
} as const;

/** Duración de los fast motion (s): se ven enteros. */
export const DURACION_FAST_MOTION = 8;

export const PRONUNCIACION: Record<string, string> = {
  "4,9": "cuatro coma nueve",
  "18.200": "dieciocho mil doscientos",
};

/** Los dos fast motion (8 s cada uno) se ven enteros: sus escenas duran al menos eso. */
export const DURACION_MINIMA_ESCENA: Record<string, number> = {
  gancho: 2.3,
  datos: 5.8,
  infra: 7.4,
  superficie: 8.15,
  sombra: 8.15,
};

/** Voz algo más ágil para que el guion quepa en 58 s. */
export const AJUSTES_VOZ = { speed: 1.2 };

/** Cifras y palabras clave que los subtítulos marcan en azul. */
export const CLAVES_SUBTITULOS =
  /^(\d[\d.,]*|millones|euros|meses|doce|dieciséis|trece|metros|cuadrados|peatonal|pérgolas|sombra|drenaje|impermeabilización|fuente|infantil|veinte|árboles)$/i;

export const PAUSAS_ENTRE_FRASES: Record<string, number> = { infra: 0.5, vegetacion: 0.45 };

export const AUDIO = {
  locucion: "plaza/locucion.mp3",
  musica: "plaza/musica.mp3",
  volumenMusicaConVoz: 0.1,
  volumenMusicaSinVoz: 0.22,
  fundidoMusica: 1.0,
  /** Sonido propio de los fast motion (ambiente de obra), muy por debajo de la voz. */
  volumenAmbienteObra: 0.9,
} as const;
