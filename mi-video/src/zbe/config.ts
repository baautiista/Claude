/**
 * CONFIGURACIÓN DEL VÍDEO "¿Por qué La Línea está obligada a tener una ZBE?" (100–110 s)
 * Motion graphics de periodismo digital: sin fotos, todo vectorial y editable.
 * Datos contrastados (nov. 2026): Ley 7/2021 art. 14.3; RD 1052/2022; Málaga (TSJA, multas
 * suspendidas el 14/10/2026); Madrid (Ordenanza 2/2026, de 24 de marzo); autorizaciones de zbe.lalinea.es.
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId = "criticas" | "estado" | "contradiccion" | "ciudades" | "ayuntamiento" | "excepciones" | "comarca" | "reflexion";
export type Momento = MomentoGuion<EscenaId>;

/** Cierre de marca sin locución (s). */
export const CIERRE_SEGUNDOS = 3.6;

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  {
    id: "criticas",
    nombre: "1. Las críticas de los vecinos",
    inicio: 0,
    fin: 12,
    frases: [
      "La Zona de Bajas Emisiones ha desatado críticas, insultos y numerosas dudas en La Línea.",
      "Pero hay algo fundamental que debemos explicar.",
    ],
  },
  {
    id: "estado",
    nombre: "2. La responsabilidad del Estado",
    inicio: 12,
    fin: 25,
    frases: [
      "No es una medida que el Ayuntamiento haya elegido implantar voluntariamente.",
      "Es una obligación de la Ley de Cambio Climático aprobada en España en 2021, impulsada por el Gobierno de España y desarrollada mediante normativa estatal.",
    ],
  },
  {
    id: "contradiccion",
    nombre: "3. La contradicción ambiental",
    inicio: 25,
    fin: 39,
    frases: [
      "Y es aquí donde surge una pregunta comprensible.",
      "La Línea convive con la influencia ambiental de grandes industrias, instalaciones portuarias y el tráfico marítimo de la Bahía de Algeciras.",
      "Sin embargo, la ley estatal no contempla una exención general para municipios situados junto a esos focos de emisiones.",
    ],
  },
  {
    id: "ciudades",
    nombre: "4. ¿Y Málaga y Madrid?",
    inicio: 39,
    fin: 50,
    frases: [
      "Es cierto que la justicia ha anulado regulaciones concretas en Málaga y Madrid.",
      "Málaga dejó de sancionar y Madrid aprobó una nueva normativa.",
      "Pero esas sentencias no han eliminado la obligación que establece la legislación estatal.",
    ],
  },
  {
    id: "ayuntamiento",
    nombre: "5. ¿Qué ha hecho el Ayuntamiento?",
    inicio: 50,
    fin: 64,
    frases: [
      "Para facilitar el acceso y reducir las molestias, el Ayuntamiento ha previsto autorizaciones para residentes, propietarios, negocios, personas con movilidad reducida, servicios esenciales y otras situaciones justificadas.",
    ],
  },
  {
    id: "excepciones",
    nombre: "6. Las excepciones, explicadas",
    inicio: 64,
    fin: 79,
    frases: [
      "Las autorizaciones permiten atender necesidades cotidianas.",
      "Hay permisos para residentes y propietarios, excepciones por movilidad o servicios esenciales y accesos temporales por motivos profesionales, médicos o de otro tipo.",
    ],
  },
  {
    id: "comarca",
    nombre: "7. La Línea no es la única",
    inicio: 79,
    fin: 90,
    frases: [
      "La obligación tampoco es exclusiva de La Línea.",
      "Afecta también a Algeciras y a otros municipios de más de 50.000 habitantes.",
      "San Roque no supera ese umbral, aunque la ley contempla otros supuestos de obligatoriedad.",
    ],
  },
  {
    id: "reflexion",
    nombre: "8. Reflexión final",
    inicio: 90,
    fin: 106,
    frases: [
      "El Gobierno de España y las Cortes Generales establecen un marco que también obliga a La Línea.",
      "Pero nuestra realidad ambiental merece ser examinada:",
      "¿se han tenido suficientemente en cuenta las circunstancias de una ciudad vecina de grandes instalaciones industriales y portuarias?",
      "La obligación existe, pero también existe el derecho a plantear esa pregunta.",
    ],
  },
];

const m = (escena: EscenaId, frase: number, palabra?: string, mas?: number): Momento => ({ escena, frase, palabra, mas });

export const MOMENTOS = {
  // 1
  pero: m("criticas", 1),
  // 2
  obligacion: m("estado", 1, "obligación"),
  anio: m("estado", 1, "2021,"),
  impulsada: m("estado", 1, "impulsada"),
  desarrollada: m("estado", 1, "desarrollada"),
  // 3
  convive: m("contradiccion", 1, "convive"),
  industrias: m("contradiccion", 1, "industrias,"),
  portuarias: m("contradiccion", 1, "portuarias"),
  maritimo: m("contradiccion", 1, "marítimo"),
  sinEmbargo: m("contradiccion", 2, "Sin"),
  exencion: m("contradiccion", 2, "exención"),
  // 4
  malaga: m("ciudades", 0, "Málaga"),
  madrid: m("ciudades", 0, "Madrid."),
  peroSentencias: m("ciudades", 2, "Pero"),
  // 5
  residentes: m("ayuntamiento", 0, "residentes,"),
  propietarios: m("ayuntamiento", 0, "propietarios,"),
  negocios: m("ayuntamiento", 0, "negocios,"),
  movilidad: m("ayuntamiento", 0, "movilidad"),
  servicios: m("ayuntamiento", 0, "servicios"),
  situaciones: m("ayuntamiento", 0, "situaciones"),
  // 6
  permisos: m("excepciones", 1, "permisos"),
  excepcionesMov: m("excepciones", 1, "excepciones"),
  accesos: m("excepciones", 1, "accesos"),
  medicos: m("excepciones", 1, "médicos"),
  // 7
  algeciras: m("comarca", 1, "Algeciras"),
  sanRoque: m("comarca", 2, "San"),
  supuestos: m("comarca", 2, "supuestos"),
  // 8
  gobierno: m("reflexion", 0, "Gobierno"),
  obliga: m("reflexion", 0, "obliga"),
  realidad: m("reflexion", 1, "realidad"),
  pregunta: m("reflexion", 2),
  existe: m("reflexion", 3, "existe,"),
  derecho: m("reflexion", 3, "derecho"),
} satisfies Record<string, Momento>;

/** Comentarios reales de Facebook, literales y anónimos (sin nombres ni fotos). */
export const COMENTARIOS = [
  "A robarr",
  "Vaya GILIPOLLEZ mas gorda os habeis inventao",
  "Otro robo para el pobre como siempre esto al rico no le repercute",
  "Una trola más...en Madrid ya lo han kitado ..pot ke aki no",
  "Que verguenza de Alcalde 💩💩💩💩💩💩",
];

export const URL_AUTORIZACIONES = "zbe.lalinea.es/autorizaciones/";

export const PRONUNCIACION: Record<string, string> = {
  "2021,": "dos mil veintiuno,",
  "50.000": "cincuenta mil",
};

/** Escenas con mucho texto en pantalla: se les deja tiempo de lectura. */
export const DURACION_MINIMA_ESCENA: Record<string, number> = {
  criticas: 9,
  estado: 12.5,
  contradiccion: 16.6,
  ciudades: 11.8,
  ayuntamiento: 12.6,
  excepciones: 12.5,
  comarca: 10.3,
};

/** Voz algo más ágil para que el vídeo quede entre 100 y 110 s. */
export const AJUSTES_VOZ = { speed: 1.2 };

export const PAUSAS_ENTRE_FRASES: Record<string, number> = { criticas: 0.7, reflexion: 0.45 };

export const AUDIO = {
  locucion: "zbe/locucion.mp3",
  musica: "zbe/musica.mp3",
  volumenMusicaConVoz: 0.1,
  volumenMusicaSinVoz: 0.22,
  fundidoMusica: 1.0,
} as const;
