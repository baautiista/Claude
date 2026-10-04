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

import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId =
  | "gancho"
  | "origen"
  | "anio1870"
  | "nombre"
  | "curiosidad"
  | "cierre";

export type Momento = MomentoGuion<EscenaId>;

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
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
 * Los "momentos" (efectos e hitos) se anclan a una palabra del guion:
 * escena, frase (0 = primera), palabra y, opcionalmente, segundos a sumar (mas).
 */
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

/** Palabras que deben leerse de otra forma en la locución (solo afecta al audio). */
export const PRONUNCIACION: Record<string, string> = {
  "1870": "mil ochocientos setenta",
  "20": "veinte",
  "30": "treinta",
};

/** Audio. Los archivos son opcionales: si no existen, el vídeo funciona sin ellos. */
export const AUDIO = {
  locucion: "lalinea/locucion.mp3",
  musica: "lalinea/musica.mp3",
  /** Volumen de la música (0–1) cuando hay locución. */
  volumenMusicaConVoz: 0.08,
  /** Volumen de la música (0–1) cuando no hay locución. */
  volumenMusicaSinVoz: 0.2,
  /** Segundos de fundido de entrada y salida de la música. */
  fundidoMusica: 1.5,
} as const;

/** Firma final de InfoLinense (segundos), después de la última escena. */
export const FIRMA_SEGUNDOS = 0.9;

/** Subtítulos. */
export const SUBTITULOS = {
  /** Máximo de caracteres por bloque de subtítulo en pantalla. */
  maxCaracteres: 28,
} as const;
