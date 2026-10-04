/**
 * CONFIGURACIÓN DEL VÍDEO "Origen del nombre de La Línea"
 * ======================================================
 * Todos los tiempos están en SEGUNDOS desde el inicio del vídeo.
 *
 * Cuando grabes la locución (public/locucion.mp3), ajusta aquí:
 *  - `inicio` y `fin` de cada escena.
 *  - Opcional: el `inicio` de cada frase, para que los subtítulos y las
 *    animaciones caigan justo cuando la dices. Si una frase no tiene
 *    `inicio`, se reparte automáticamente según su longitud.
 *  - Los momentos (`en`) de los hitos de la línea de tiempo.
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

/** Línea de tiempo inferior (visible durante las escenas 2–4). */
export const LINEA_DE_TIEMPO = {
  inicio: 6,
  fin: 42,
  hitos: [
    { texto: "Línea de Gibraltar", en: 17.8 },
    { texto: "1870", en: 20.5 },
    { texto: "Municipio independiente", en: 23 },
    { texto: "La Línea de la Concepción", en: 36 },
  ],
} as const;

/** Momentos concretos (segundos) para sincronizar efectos con palabras clave. */
export const MOMENTOS = {
  /** Escena 1: se tacha la línea del mapa ("no tiene nada que ver…"). */
  tacharLinea: 4.4,
  /** Escena 2: aparece el rótulo "Línea de Gibraltar". */
  rotuloLineaDeGibraltar: 17.8,
  /** Escena 4: cae el sello "Aprobado por unanimidad". */
  selloAprobado: 37,
  /** Escena 5: impacto de "La Línea de la Victoria". */
  impactoVictoria: 47.6,
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
