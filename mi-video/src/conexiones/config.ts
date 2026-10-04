/**
 * CONFIGURACIÓN DEL VÍDEO "Conexiones viarias en La Línea"
 * =========================================================
 * Tiempos en SEGUNDOS desde el inicio del vídeo.
 *
 * - Si grabas tu locución, ponla en public/conexiones/locucion.mp3 y ajusta
 *   aquí el `inicio`/`fin` de cada escena (y si quieres, el `inicio` de cada
 *   frase: { texto: "…", inicio: 12.3 }).
 * - Si la generas con ElevenLabs (npm run locucion -- conexiones), los tiempos
 *   salen solos del audio y lo de abajo se ignora.
 * - Los efectos (MOMENTOS) van anclados a palabras del guion.
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId =
  | "intro"
  | "filomenaProblema"
  | "filomenaDemolicion"
  | "colonProblema"
  | "colonExpropiacion"
  | "conclusion";

export type Momento = MomentoGuion<EscenaId>;

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  {
    id: "intro",
    nombre: "1. Intro",
    inicio: 0,
    fin: 8,
    frases: [
      "Hay dos puntos de La Línea donde el Ayuntamiento acaba de dar pasos importantes para desbloquear nuevas conexiones viarias.",
    ],
  },
  {
    id: "filomenaProblema",
    nombre: "2. Santa Filomena: el problema",
    inicio: 8,
    fin: 22,
    frases: [
      "El primero está en Santa Filomena.",
      "Entre esta calle y Giralda se encuentran las últimas viviendas que impiden prolongar Punto Ribot hasta Calderón de la Barca.",
      "Y ahora la actuación entra en una fase decisiva.",
    ],
  },
  {
    id: "filomenaDemolicion",
    nombre: "3. Santa Filomena: la demolición",
    inicio: 22,
    fin: 45,
    frases: [
      "El Ayuntamiento ya ha adjudicado la demolición por 48.000 euros, con un plazo previsto de dos meses.",
      "¿Qué significa esto?",
      "Que después de años de planeamiento, expropiaciones y trámites, por fin se está despejando físicamente el espacio necesario para abrir esa futura conexión.",
      "Si se cumplen los plazos, antes de final de año debería haber desaparecido este obstáculo.",
      "Después tocará urbanizar el espacio y convertirlo en el nuevo viario.",
    ],
  },
  {
    id: "colonProblema",
    nombre: "4. Calle Colón: el problema",
    inicio: 45,
    fin: 58,
    frases: [
      "Y hay otro caso muy parecido en calle Colón.",
      "En el número 92 hay una única finca que, según el expediente municipal, es la que impide conectar dos viales públicos.",
    ],
  },
  {
    id: "colonExpropiacion",
    nombre: "5. Calle Colón: la expropiación",
    inicio: 58,
    fin: 85,
    frases: [
      "El Ayuntamiento ya ha aprobado definitivamente su expropiación y además ha declarado la ocupación urgente.",
      "La finca tiene 83 metros cuadrados y está valorada inicialmente en unos 31.800 euros.",
      "El siguiente paso será el 15 de octubre, cuando está previsto levantar el acta previa a la ocupación.",
      "A partir de ahí podrá avanzar la ocupación del inmueble y desbloquearse también esta futura conexión.",
    ],
  },
  {
    id: "conclusion",
    nombre: "6. Conclusión",
    inicio: 85,
    fin: 115,
    frases: [
      "Son actuaciones pequeñas si las miramos solo por el tamaño de las parcelas.",
      "Pero urbanísticamente tienen bastante importancia.",
      "Porque en ambos casos se está eliminando el último obstáculo que impedía dar continuidad a calles que llevan años pendientes.",
      "Y eso permite que proyectos que hasta ahora estaban sobre el papel empiecen, por fin, a convertirse en cambios reales sobre el terreno.",
    ],
  },
];

/** Momentos anclados a palabras del guion (frase 0 = primera de la escena). */
const m = (escena: EscenaId, frase: number, palabra?: string, mas?: number): Momento => ({ escena, frase, palabra, mas });

export const MOMENTOS = {
  // 1. Intro
  puntos: m("intro", 0, "puntos"),
  fotosIntro: m("intro", 0, "Ayuntamiento"),
  zoomIntro: m("intro", 0, "conexiones"),
  // 2. Santa Filomena: el problema
  calleSantaFilomena: m("filomenaProblema", 1, "calle"),
  giralda: m("filomenaProblema", 1, "Giralda"),
  viviendas: m("filomenaProblema", 1, "viviendas"),
  puntoRibot: m("filomenaProblema", 1, "Punto"),
  calderon: m("filomenaProblema", 1, "Calderón"),
  rotuloObstaculo: m("filomenaProblema", 2, "decisiva"),
  // 3. Santa Filomena: la demolición
  euros48: m("filomenaDemolicion", 0, "48.000"),
  dosMeses: m("filomenaDemolicion", 0, "dos"),
  planeamiento: m("filomenaDemolicion", 2, "planeamiento"),
  expropiaciones: m("filomenaDemolicion", 2, "expropiaciones"),
  despejando: m("filomenaDemolicion", 2, "despejando"),
  finDeAnio: m("filomenaDemolicion", 3, "final"),
  demoler: m("filomenaDemolicion", 3, "desaparecido"),
  urbanizar: m("filomenaDemolicion", 4, "urbanizar"),
  nuevoViario: m("filomenaDemolicion", 4, "nuevo"),
  // 4. Calle Colón: el problema
  esquemaColon: m("colonProblema", 1, "expediente"),
  conectar: m("colonProblema", 1, "conectar"),
  viales: m("colonProblema", 1, "viales"),
  // 5. Calle Colón: la expropiación
  sello1: m("colonExpropiacion", 0, "expropiación"),
  sello2: m("colonExpropiacion", 0, "ocupación"),
  metros: m("colonExpropiacion", 1, "83"),
  euros: m("colonExpropiacion", 1, "31.800"),
  dia15: m("colonExpropiacion", 2, "15"),
  acta: m("colonExpropiacion", 2, "acta"),
  ocupacion: m("colonExpropiacion", 3, "ocupación"),
  conexionColon: m("colonExpropiacion", 3, "desbloquearse"),
  // 6. Conclusión
  tamano: m("conclusion", 0, "tamaño"),
  granImpacto: m("conclusion", 1, "importancia"),
  eliminando: m("conclusion", 2, "eliminando"),
  continuidad: m("conclusion", 2, "continuidad"),
  terreno: m("conclusion", 3, "empiecen,"),
  fotoFinal: m("conclusion", 3, "convertirse"),
} satisfies Record<string, Momento>;

/** Datos de la noticia (cifras y fechas que aparecen en pantalla). */
export const DATOS = {
  demolicionEuros: 48000,
  demolicionMeses: 2,
  colonMetros: 83,
  colonEuros: 31800,
  acta: { anio: 2026, mes: 10, dia: 15 },
} as const;

/** Fotos (opcionales: si no existen, se usan solo los esquemas). */
export const FOTOS = {
  /** Santa Filomena / Calderón de la Barca (prolongación de Punto Ribot). */
  santaFilomena: "conexiones/santa-filomena.jpg",
  santaFilomenaSatelite: "conexiones/santa-filomena-satelite.jpg",
  puntoRibotAntesDespues: "conexiones/punto-ribot-antes-despues.jpg",
  /** Calle Colón, 92 (conexión con Urb. Doña Curra y San Pedro de Alcántara). */
  colon: "conexiones/colon-92.jpg",
  colonCalle: "conexiones/colon-92-calle.jpg",
} as const;

/** Palabras que deben leerse de otra forma en la locución (solo afecta al audio). */
export const PRONUNCIACION: Record<string, string> = {
  "48.000": "cuarenta y ocho mil",
  "83": "ochenta y tres",
  "31.800": "treinta y un mil ochocientos",
  "15": "quince",
  "92": "noventa y dos",
};

export const AUDIO = {
  locucion: "conexiones/locucion.mp3",
  musica: "conexiones/musica.mp3",
  volumenMusicaConVoz: 0.08,
  volumenMusicaSinVoz: 0.18,
  fundidoMusica: 1.5,
} as const;

export const FIRMA_SEGUNDOS = 0.9;

export const SUBTITULOS = { maxCaracteres: 30 } as const;
