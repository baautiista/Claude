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

/** Momentos anclados a palabras del guion. */
export const MOMENTOS: Record<
  | "puntos"
  | "fotosIntro"
  | "viviendas"
  | "rotuloObstaculo"
  | "dosMeses"
  | "demoler"
  | "sello2"
  | "metros"
  | "euros"
  | "dia15"
  | "conexionColon"
  | "granImpacto"
  | "papel"
  | "terreno"
  | "fotoFinal",
  Momento
> = {
  puntos: { escena: "intro", frase: 0, palabra: "puntos" },
  fotosIntro: { escena: "intro", frase: 0, palabra: "desbloquear" },
  viviendas: { escena: "filomenaProblema", frase: 1, palabra: "viviendas" },
  rotuloObstaculo: { escena: "filomenaProblema", frase: 2, palabra: "decisiva" },
  dosMeses: { escena: "filomenaDemolicion", frase: 0, palabra: "plazo" },
  demoler: { escena: "filomenaDemolicion", frase: 3, palabra: "desaparecido" },
  sello2: { escena: "colonExpropiacion", frase: 0, palabra: "ocupación" },
  metros: { escena: "colonExpropiacion", frase: 1, palabra: "83" },
  euros: { escena: "colonExpropiacion", frase: 1, palabra: "31.800" },
  dia15: { escena: "colonExpropiacion", frase: 2, palabra: "15" },
  conexionColon: { escena: "colonExpropiacion", frase: 3, palabra: "desbloquearse" },
  granImpacto: { escena: "conclusion", frase: 1, palabra: "importancia" },
  papel: { escena: "conclusion", frase: 3, palabra: "papel" },
  terreno: { escena: "conclusion", frase: 3, palabra: "convertirse" },
  fotoFinal: { escena: "conclusion", frase: 3, palabra: "reales" },
};

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
  santaFilomena: "conexiones/santa-filomena.jpg",
  santaFilomenaCalle: "conexiones/santa-filomena-calle.jpg",
  colon: "conexiones/colon-92.jpg",
  colonSatelite: "conexiones/colon-92-satelite.jpg",
  antesDespues: "conexiones/antes-despues.jpg",
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
