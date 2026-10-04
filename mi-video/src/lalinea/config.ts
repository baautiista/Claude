/**
 * CONFIGURACIÓN DEL VÍDEO "Origen del nombre de La Línea"
 * ======================================================
 * Todos los tiempos están en SEGUNDOS desde el inicio del vídeo.
 *
 * Si generas la locución con ElevenLabs (`npm run locucion`), los tiempos
 * se calculan solos a partir del audio y lo de abajo se ignora.
 *
 * Si grabas tú la locución (public/locucion.mp3), ajusta aquí:
 *  - `inicio` y `fin` de cada escena.
 *  - Opcional: el `inicio` de cada frase, para que los subtítulos y las
 *    animaciones caigan justo cuando la dices. Si una frase no tiene
 *    `inicio`, se reparte automáticamente según su longitud.
 *  - Los efectos (MOMENTOS) y los hitos van anclados a palabras del guion,
 *    así que se mueven solos con las frases.
 *
 * La duración total del vídeo es el `fin` de la última escena.
 */

export const FPS = 30;

export type Frase = string | { readonly texto: string; readonly inicio: number };

export type Escena = {
  readonly id: EscenaId;
  readonly nombre: string;
  readonly inicio: number;
  readonly fin: number;
  readonly frases: readonly Frase[];
};

export type EscenaId =
  | "gancho"
  | "origen"
  | "anio1870"
  | "nombre"
  | "curiosidad"
  | "cierre";

export const ESCENAS: readonly Escena[] = [
  {
    id: "gancho",
    nombre: "1. Gancho",
    inicio: 0,
    fin: 6,
    frases: [
      "Seguro que alguna vez te has preguntado por qué nuestra ciudad se llama La Línea… de la Concepción.",
      "Y no, «La Línea» no tiene nada que ver con una línea dibujada en un mapa.",
    ],
  },
  {
    id: "origen",
    nombre: "2. Origen",
    inicio: 6,
    fin: 20,
    frases: [
      "El nombre empieza mucho antes de que La Línea fuese una ciudad independiente.",
      "Esta zona estaba marcada por una línea de fortificaciones españolas levantadas frente a Gibraltar.",
      "Alrededor de ellas fue creciendo un pequeño núcleo de población que terminó siendo conocido como la Línea de Gibraltar.",
    ],
  },
  {
    id: "anio1870",
    nombre: "3. 1870",
    inicio: 20,
    fin: 32,
    frases: [
      "En 1870, aquel núcleo consiguió separarse oficialmente de San Roque.",
      "El nuevo Ayuntamiento se constituyó el 20 de julio,",
      "y solo diez días después tuvo que decidir cómo se llamaría el nuevo municipio.",
    ],
  },
  {
    id: "nombre",
    nombre: "4. El nombre",
    inicio: 32,
    fin: 42,
    frases: [
      "En la sesión del 30 de julio de 1870,",
      "los concejales aprobaron por unanimidad el nombre de La Línea de la Concepción,",
      "en referencia a la Inmaculada Concepción, cuya devoción estaba profundamente vinculada al lugar.",
    ],
  },
  {
    id: "curiosidad",
    nombre: "5. Curiosidad",
    inicio: 42,
    fin: 50,
    frases: [
      "Y pudo llamarse de otra manera.",
      "Entre las propuestas que no prosperaron aparece, por ejemplo, La Línea de la Victoria.",
    ],
  },
  {
    id: "cierre",
    nombre: "6. Cierre",
    inicio: 50,
    fin: 57,
    frases: [
      "Así que nuestro nombre conserva dos partes de nuestra historia:",
      "«La Línea», por aquella línea defensiva frente a Gibraltar,",
      "y «de la Concepción», por la Inmaculada.",
    ],
  },
];

/**
 * Un "momento" se ancla a una palabra del guion, así se mantiene sincronizado
 * aunque cambien los tiempos de la locución.
 *  - escena / frase: qué frase (la primera frase es 0).
 *  - palabra: palabra de esa frase (sin importar mayúsculas ni signos).
 *    Si no se indica, se usa el inicio de la frase.
 *  - mas: segundos a sumar (o restar, si es negativo).
 */
export type Momento = {
  readonly escena: EscenaId;
  readonly frase: number;
  readonly palabra?: string;
  readonly mas?: number;
};

/** Línea de tiempo inferior (visible durante las escenas 2–4). */
export const LINEA_DE_TIEMPO: {
  readonly desde: EscenaId;
  readonly hasta: EscenaId;
  readonly hitos: readonly (Momento & { readonly texto: string })[];
} = {
  desde: "origen",
  hasta: "nombre",
  hitos: [
    { texto: "Línea de Gibraltar", escena: "origen", frase: 2, palabra: "Línea" },
    { texto: "1870", escena: "anio1870", frase: 0, palabra: "1870" },
    { texto: "Municipio independiente", escena: "anio1870", frase: 0, palabra: "separarse" },
    { texto: "La Línea de la Concepción", escena: "nombre", frase: 1, palabra: "Concepción", mas: 0.4 },
  ],
};

/** Momentos concretos para sincronizar efectos con palabras clave. */
export const MOMENTOS: Record<
  "tacharLinea" | "rotuloLineaDeGibraltar" | "escrituraNombre" | "selloAprobado" | "impactoVictoria",
  Momento
> = {
  /** Escena 1: se tacha la línea del mapa. */
  tacharLinea: { escena: "gancho", frase: 1, palabra: "nada" },
  /** Escena 2: aparece el rótulo "Línea de Gibraltar". */
  rotuloLineaDeGibraltar: { escena: "origen", frase: 2, palabra: "Línea" },
  /** Escena 4: empieza a escribirse el nombre en el acta. */
  escrituraNombre: { escena: "nombre", frase: 1, palabra: "Línea", mas: -0.2 },
  /** Escena 4: cae el sello "Aprobado por unanimidad". */
  selloAprobado: { escena: "nombre", frase: 1, palabra: "Concepción", mas: 0.5 },
  /** Escena 5: impacto de "La Línea de la Victoria". */
  impactoVictoria: { escena: "curiosidad", frase: 1, palabra: "Victoria", mas: -0.1 },
};

/**
 * Locución generada con ElevenLabs (npm run locucion).
 * Las palabras que deben leerse de otra forma se sustituyen solo en el audio.
 */
export const ELEVENLABS = {
  modelo: "eleven_multilingual_v2",
  /** Cambia por el ID de la voz que elijas en ElevenLabs (o usa ELEVENLABS_VOICE_ID). */
  vozPorDefecto: "JBFqnCBsd6RMkjVDRZzb",
  ajustes: { stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
  pronunciacion: {
    "1870": "mil ochocientos setenta",
    "20": "veinte",
    "30": "treinta",
  } as Record<string, string>,
  /** Silencio (s) que se deja al final del vídeo tras la última frase. */
  colaFinal: 1.2,
} as const;

/** Audio. Los archivos son opcionales: si no existen, el vídeo funciona sin ellos. */
export const AUDIO = {
  locucion: "locucion.mp3",
  musica: "musica.mp3",
  /** Volumen de la música (0–1) cuando hay locución. */
  volumenMusicaConVoz: 0.08,
  /** Volumen de la música (0–1) cuando no hay locución. */
  volumenMusicaSinVoz: 0.2,
  /** Segundos de fundido de entrada y salida de la música. */
  fundidoMusica: 1.5,
} as const;

/** Subtítulos. */
export const SUBTITULOS = {
  /** Máximo de caracteres por bloque de subtítulo en pantalla. */
  maxCaracteres: 28,
} as const;
