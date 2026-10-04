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
    fin: 7,
    frases: [
      "¿Qué va a pasar con el antiguo hospital de La Línea?",
      "Cerrado desde 2018, ocho años después sigue sin solución.",
    ],
  },
  {
    id: "propietario",
    nombre: "2. El propietario",
    inicio: 7,
    fin: 14,
    frases: [
      "El problema principal: el edificio no es del Ayuntamiento.",
      "Es de la Tesorería General de la Seguridad Social.",
    ],
  },
  {
    id: "cifras",
    nombre: "3. Las cifras",
    inicio: 14,
    fin: 27,
    frases: [
      "Y hay dos cifras clave.",
      "6 millones: su valoración.",
      "Y unos 12 millones más para rehabilitarlo.",
      "En total, una operación cercana a los 18 millones.",
    ],
  },
  {
    id: "cesion",
    nombre: "4. La cesión y las dos vías",
    inicio: 27,
    fin: 44,
    frases: [
      "Por eso, el alcalde, Juan Franco, plantea no comprar el edificio, sino buscar una cesión.",
      "¿Para hacer qué?",
      "Una opción: unas 120 viviendas, rehabilitadas por una empresa que recuperaría la inversión con los alquileres.",
      "Otra: un centro sanitario privado.",
    ],
  },
  {
    id: "transicion",
    nombre: "5. Transición",
    inicio: 44,
    fin: 48,
    frases: [
      "Pero no son las únicas ideas que se han puesto sobre la mesa.",
    ],
  },
  {
    id: "carrusel",
    nombre: "6. Carrusel de propuestas",
    inicio: 48,
    fin: 68,
    frases: [
      "Campus de Formación Profesional y Universitario Transfronterizo.",
      "Hospital Materno-Infantil Comarcal.",
      "Centro de Alto Rendimiento y Biomecánica.",
      "Ciudad de la Justicia y Comisaría de la Policía Nacional.",
      "Complejo mixto residencial y comercial.",
      "Facultad de Medicina y Ciencias de la Salud.",
      "Residencia de Mayores y Centro de Día.",
    ],
  },
  {
    id: "pregunta",
    nombre: "7. La pregunta y el matiz",
    inicio: 68,
    fin: 77,
    frases: [
      "Todas buscan responder a una pregunta:",
      "¿cómo recuperamos uno de los mayores edificios vacíos de La Línea?",
      "Eso sí: son ideas, no proyectos aprobados.",
    ],
  },
  {
    id: "noConfundir",
    nombre: "8. No confundir",
    inicio: 77,
    fin: 88,
    frases: [
      "Y ojo:",
      "no hay que confundirlo con el antiguo Hospital Municipal, que es otro edificio.",
      "Ese sí se ha destinado a los nuevos juzgados, y su cesión a la Junta avanza por otra vía.",
    ],
  },
  {
    id: "situacion",
    nombre: "9. Situación actual",
    inicio: 88,
    fin: 96,
    frases: [
      "El hospital comarcal sigue dependiendo de resolver su situación con la Seguridad Social.",
      "En septiembre, Ayuntamiento y Junta seguían trabajando para desbloquearlo.",
    ],
  },
  {
    id: "cierre",
    nombre: "10. Cierre",
    inicio: 96,
    fin: 105,
    frases: [
      "Así que la pregunta ya no es si este edificio puede tener una segunda vida.",
      "Opciones hay.",
      "La cuestión es quién paga, qué uso es viable y cuándo llegará una solución.",
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
  aqui: m("propietario", 0, "principal:"),
  etiquetaAyto: m("propietario", 0, "edificio"),
  tacharAyto: m("propietario", 0, "Ayuntamiento.", 0.3),
  tesoreria: m("propietario", 1, "Tesorería"),
  // 3. Cifras
  seis: m("cifras", 1, "6"),
  valoracion: m("cifras", 1, "valoración."),
  doce: m("cifras", 2, "12"),
  rehabilitar: m("cifras", 2, "rehabilitarlo."),
  suma: m("cifras", 3, "operación"),
  dieciocho: m("cifras", 3, "18"),
  // 4. Cesión
  alcalde: m("cesion", 0, "alcalde,"),
  comprar: m("cesion", 0, "comprar"),
  cesion: m("cesion", 0, "cesión."),
  viviendas120: m("cesion", 2, "120"),
  empresa: m("cesion", 2, "empresa"),
  rehabilitacion: m("cesion", 2, "rehabilitadas"),
  alquileres: m("cesion", 2, "alquileres."),
  sanitarioPrivado: m("cesion", 3, "centro"),
  // 5. Transición
  ideas: m("transicion", 0, "ideas"),
  mesa: m("transicion", 0, "mesa."),
  // 7. Pregunta
  columnaIdeas: m("pregunta", 2, "ideas,"),
  columnaAprobado: m("pregunta", 2, "aprobados."),
  // 8. No confundir
  comarcal: m("noConfundir", 1, "confundirlo"),
  municipal: m("noConfundir", 1, "Municipal,"),
  distinto: m("noConfundir", 1, "otro"),
  juzgados: m("noConfundir", 2, "juzgados,"),
  // 9. Situación
  seguridadSocial: m("situacion", 0, "Seguridad"),
  septiembre: m("situacion", 1, "septiembre,"),
  ayuntamiento: m("situacion", 1, "Ayuntamiento"),
  junta: m("situacion", 1, "Junta"),
  desbloquear: m("situacion", 1, "desbloquearlo."),
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
 * Renders de propuestas (ideas, no aprobadas), en el orden de los carteles.
 * Cada uno aparece al empezar su frase del carrusel. Los renders llevan su
 * rótulo en la parte inferior: se recorta la parte superior.
 */
export const RENDERS = [
  { id: "campus", archivo: "hospital/render-campus.jpg", nombre: "Campus de FP y Universitario Transfronterizo", detalle: "Polo educativo UCA + University of Gibraltar" },
  { id: "materno", archivo: "hospital/render-centro-sanitario.jpg", nombre: "Hospital Materno-Infantil Comarcal", detalle: "Urgencias pediátricas y maternales" },
  { id: "deporte", archivo: "hospital/render-deporte.jpg", nombre: "Centro de Alto Rendimiento y Biomecánica", detalle: "Deporte, salud y medicina deportiva" },
  { id: "justicia", archivo: "hospital/render-justicia.jpg", nombre: "Ciudad de la Justicia y Comisaría", detalle: "Juzgados y Policía Nacional en un solo enclave" },
  { id: "mixto", archivo: "hospital/render-mixto.jpg", nombre: "Complejo mixto residencial y comercial", detalle: "Viviendas con comercio en planta baja" },
  { id: "facultad", archivo: "hospital/render-facultad.jpg", nombre: "Facultad de Medicina y CC. de la Salud", detalle: "Formación de médicos y sanitarios" },
  { id: "residencia", archivo: "hospital/render-residencia.jpg", nombre: "Residencia de Mayores y Centro de Día", detalle: "Cuidado de mayores y nuevas plazas" },
] as const;

/** Palabras que deben leerse de otra forma en la locución (solo afecta al audio). */
export const PRONUNCIACION: Record<string, string> = {
  "2018": "dos mil dieciocho",
  "6": "seis",
  "12": "doce",
  "18": "dieciocho",
  "120": "ciento veinte",
};

/** Pausas (s) entre frases dentro de una escena: el carrusel respira entre propuestas. */
export const PAUSAS_ENTRE_FRASES: Record<string, number> = { carrusel: 1.2 };

export const AUDIO = {
  locucion: "hospital/locucion.mp3",
  musica: "hospital/musica.mp3",
  volumenMusicaConVoz: 0.08,
  volumenMusicaSinVoz: 0.18,
  fundidoMusica: 1.5,
} as const;

export const FIRMA_SEGUNDOS = 0.9;

export const SUBTITULOS = { maxCaracteres: 30 } as const;
