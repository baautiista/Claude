/**
 * CONFIGURACIÓN DEL VÍDEO "El antiguo hospital comarcal de La Línea"
 * ===================================================================
 * Tiempos en SEGUNDOS desde el inicio del vídeo.
 *
 * - Locución propia: public/hospital/locucion.mp3 → ajusta aquí `inicio`/`fin`
 *   de cada escena (y si quieres el `inicio` de cada frase).
 * - Con ElevenLabs (npm run locucion -- hospital) los tiempos salen solos.
 * - Los efectos (MOMENTOS) van anclados a palabras del guion.
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId =
  | "gancho"
  | "propietario"
  | "cifras"
  | "cesion"
  | "transicion"
  | "carrusel"
  | "pregunta"
  | "noConfundir"
  | "situacion"
  | "cierre";

export type Momento = MomentoGuion<EscenaId>;

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  {
    id: "gancho",
    nombre: "1. Gancho",
    inicio: 0,
    fin: 12,
    frases: [
      "¿Qué va a pasar con el antiguo hospital de La Línea?",
      "Lleva cerrado desde 2018 y, ocho años después, sigue sin una solución definitiva.",
    ],
  },
  {
    id: "propietario",
    nombre: "2. El propietario",
    inicio: 12,
    fin: 22,
    frases: [
      "El principal problema está aquí: el edificio no es del Ayuntamiento.",
      "Pertenece a la Tesorería General de la Seguridad Social.",
    ],
  },
  {
    id: "cifras",
    nombre: "3. Las cifras",
    inicio: 22,
    fin: 42,
    frases: [
      "Y hay dos cifras que explican buena parte del bloqueo.",
      "6 millones de euros.",
      "Es la valoración que se ha trasladado para el inmueble.",
      "Y aproximadamente otros 12 millones serían necesarios para rehabilitarlo.",
      "Es decir: adquirirlo y recuperarlo podría suponer una operación cercana a los 18 millones de euros.",
    ],
  },
  {
    id: "cesion",
    nombre: "4. La cesión y las dos vías",
    inicio: 42,
    fin: 65,
    frases: [
      "Por eso, una de las alternativas planteadas por el alcalde, Juan Franco, es evitar que el Ayuntamiento tenga que comprar directamente el edificio y buscar una fórmula de cesión.",
      "¿Para hacer qué?",
      "Una de las posibilidades planteadas es convertirlo en alrededor de 120 viviendas, con una fórmula en la que una empresa asumiera la rehabilitación y recuperara posteriormente la inversión mediante los alquileres.",
      "También se ha estudiado el interés de una empresa por instalar un centro sanitario privado.",
    ],
  },
  {
    id: "transicion",
    nombre: "5. Transición",
    inicio: 65,
    fin: 72,
    frases: ["Pero estas no son las únicas ideas que se han puesto sobre la mesa durante todos estos años."],
  },
  {
    id: "carrusel",
    nombre: "6. Carrusel de propuestas",
    inicio: 72,
    fin: 88,
    frases: [
      "Formación profesional y universitaria.",
      "Una facultad vinculada a Ciencias de la Salud.",
      "Una residencia de mayores.",
      "Un centro sanitario.",
      "Viviendas y comercios.",
      "Instalaciones relacionadas con el deporte y la investigación.",
    ],
  },
  {
    id: "pregunta",
    nombre: "7. La pregunta y el matiz",
    inicio: 88,
    fin: 100,
    frases: [
      "Son distintas posibilidades para responder a una misma pregunta:",
      "¿cómo recuperamos uno de los mayores edificios vacíos de La Línea?",
      "Eso sí, hay que diferenciar entre ideas o propuestas de posibles usos y actuaciones que realmente estén aprobadas.",
    ],
  },
  {
    id: "noConfundir",
    nombre: "8. No confundir",
    inicio: 100,
    fin: 115,
    frases: [
      "Y hay otro detalle importante.",
      "No hay que confundir este edificio con el antiguo Hospital Municipal, porque son inmuebles diferentes.",
      "El antiguo Hospital Municipal sí ha sido destinado al proyecto de los nuevos juzgados y su cesión a la Junta ha avanzado por otra vía.",
    ],
  },
  {
    id: "situacion",
    nombre: "9. Situación actual",
    inicio: 115,
    fin: 125,
    frases: [
      "En el caso del antiguo hospital comarcal, el proceso sigue dependiendo en buena medida de resolver su situación con la Seguridad Social.",
      "En septiembre, Ayuntamiento y Junta seguían trabajando precisamente para desbloquear la situación administrativa del inmueble.",
    ],
  },
  {
    id: "cierre",
    nombre: "10. Cierre",
    inicio: 125,
    fin: 135,
    frases: [
      "Así que la pregunta ya no es si este enorme edificio podría tener una segunda vida.",
      "Opciones hay.",
      "La cuestión es quién asume el coste, qué uso termina siendo viable y, sobre todo, cuándo llegará una solución definitiva.",
      "¿Y tú qué harías aquí?",
    ],
  },
];

const m = (escena: EscenaId, frase: number, palabra?: string, mas?: number): Momento => ({ escena, frase, palabra, mas });

/** Momentos anclados a palabras del guion (frase 0 = primera de la escena). */
export const MOMENTOS = {
  // 1. Gancho
  golpe1: m("gancho", 1, "2018"),
  golpe2: m("gancho", 1, "años"),
  golpe3: m("gancho", 1, "solución"),
  // 2. Propietario
  aqui: m("propietario", 0, "aquí:"),
  etiquetaAyto: m("propietario", 0, "edificio"),
  tacharAyto: m("propietario", 0, "Ayuntamiento.", 0.3),
  tesoreria: m("propietario", 1, "Tesorería"),
  // 3. Cifras
  seis: m("cifras", 1, "6"),
  valoracion: m("cifras", 2, "valoración"),
  doce: m("cifras", 3, "12"),
  rehabilitar: m("cifras", 3, "rehabilitarlo."),
  suma: m("cifras", 4, "operación"),
  dieciocho: m("cifras", 4, "18"),
  // 4. Cesión
  alcalde: m("cesion", 0, "alcalde,"),
  comprar: m("cesion", 0, "comprar"),
  cesion: m("cesion", 0, "cesión."),
  viviendas120: m("cesion", 2, "120"),
  empresa: m("cesion", 2, "empresa"),
  rehabilitacion: m("cesion", 2, "rehabilitación"),
  alquileres: m("cesion", 2, "alquileres."),
  sanitarioPrivado: m("cesion", 3, "centro"),
  // 5. Transición
  ideas: m("transicion", 0, "ideas"),
  mesa: m("transicion", 0, "mesa"),
  // 7. Pregunta
  columnaIdeas: m("pregunta", 2, "ideas"),
  columnaAprobado: m("pregunta", 2, "aprobadas."),
  // 8. No confundir
  comarcal: m("noConfundir", 1, "edificio"),
  municipal: m("noConfundir", 1, "Municipal,"),
  distinto: m("noConfundir", 1, "diferentes."),
  juzgados: m("noConfundir", 2, "juzgados"),
  // 9. Situación
  seguridadSocial: m("situacion", 0, "Seguridad"),
  septiembre: m("situacion", 1, "septiembre,"),
  ayuntamiento: m("situacion", 1, "Ayuntamiento"),
  junta: m("situacion", 1, "Junta"),
  desbloquear: m("situacion", 1, "desbloquear"),
  // 10. Cierre
  opciones: m("cierre", 1, "Opciones"),
  quien: m("cierre", 2, "quién"),
  queUso: m("cierre", 2, "uso"),
  cuando: m("cierre", 2, "cuándo"),
  mosaico: m("cierre", 3, "tú"),
} satisfies Record<string, Momento>;

export const DATOS = {
  cerradoDesde: 2018,
  valoracionMillones: 6,
  rehabilitacionMillones: 12,
  totalMillones: 18,
  viviendas: 120,
  septiembre: 2026,
} as const;

/** Fotos del hospital actual (opcionales: si faltan, se usa la silueta dibujada). */
export const FOTOS_HOSPITAL = ["hospital/hospital-1.jpg", "hospital/hospital-2.jpg", "hospital/hospital-3.jpg"] as const;

/**
 * Renders de propuestas (ideas, no aprobadas), en el orden en que se nombran.
 * `palabra` = palabra de la frase del carrusel en la que aparece cada uno.
 * Los renders llevan su rótulo en la parte inferior: se recorta la parte superior.
 */
export const RENDERS = [
  { id: "campus", archivo: "hospital/render-campus.jpg", nombre: "Campus de FP y universitario", frase: 0, palabra: "Formación" },
  { id: "facultad", archivo: "hospital/render-facultad.jpg", nombre: "Facultad de Medicina y CC. de la Salud", frase: 1, palabra: "facultad" },
  { id: "residencia", archivo: "hospital/render-residencia.jpg", nombre: "Residencia de mayores y centro de día", frase: 2, palabra: "residencia" },
  { id: "sanitario", archivo: "hospital/render-centro-sanitario.jpg", nombre: "Hospital materno-infantil", frase: 3, palabra: "centro" },
  { id: "mixto", archivo: "hospital/render-mixto.jpg", nombre: "Viviendas y comercios", frase: 4, palabra: "Viviendas" },
  { id: "deporte", archivo: "hospital/render-deporte.jpg", nombre: "Alto rendimiento y biomecánica", frase: 5, palabra: "deporte" },
  { id: "justicia", archivo: "hospital/render-justicia.jpg", nombre: "Ciudad de la Justicia y comisaría", frase: 5, palabra: "investigación." },
] as const;

/** Palabras que deben leerse de otra forma en la locución (solo afecta al audio). */
export const PRONUNCIACION: Record<string, string> = {
  "2018": "dos mil dieciocho",
  "6": "seis",
  "12": "doce",
  "18": "dieciocho",
  "120": "ciento veinte",
};

export const AUDIO = {
  locucion: "hospital/locucion.mp3",
  musica: "hospital/musica.mp3",
  volumenMusicaConVoz: 0.08,
  volumenMusicaSinVoz: 0.18,
  fundidoMusica: 1.5,
} as const;

export const FIRMA_SEGUNDOS = 0.9;

export const SUBTITULOS = { maxCaracteres: 30 } as const;
