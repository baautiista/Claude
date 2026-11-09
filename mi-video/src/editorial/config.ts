/**
 * EDITORIAL "¿AHORA TAMBIÉN MOLESTA QUE LA LÍNEA AVANCE?" (≈2 min).
 * Voz habitual de InfoLinense (VOZ.vozPorDefecto y VOZ.ajustes de src/marca/voz.ts, sin cambios).
 * Guion completo, sin resumir. Fotos reales en public/editorial/ (si faltan, se ve el hueco con su nombre).
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId =
  | "gancho"
  | "centroComercial"
  | "criticas"
  | "empleo"
  | "ayuntamiento"
  | "eventos"
  | "centro"
  | "arbol"
  | "distancias"
  | "drones"
  | "oportunidad"
  | "compatibles"
  | "cierre";
export type Momento = MomentoGuion<EscenaId>;

export const TITULO = "¿AHORA TAMBIÉN MOLESTA QUE LA LÍNEA AVANCE?";

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  { id: "gancho", nombre: "1. Gancho", inicio: 0, fin: 4, frases: ["¿De verdad nos molesta tanto que La Línea avance?"] },
  {
    id: "centroComercial",
    nombre: "2. El centro comercial",
    inicio: 4,
    fin: 11,
    frases: ["Durante años nos quejábamos de no tener un centro comercial.", "Ahora que lo tenemos, resulta que también es un problema."],
  },
  {
    id: "criticas",
    nombre: "3. Las críticas",
    inicio: 11,
    fin: 18,
    frases: ["Que si va a destruir el comercio local.", "Que si vendrán trabajadores de fuera...", "¿Perdona?"],
  },
  {
    id: "empleo",
    nombre: "4. El empleo",
    inicio: 18,
    fin: 30,
    frases: [
      "¿Y las decenas de linenses que van a trabajar allí?",
      "¿Ya nos hemos olvidado de la bolsa pública de empleo?",
      "¿O es que ahora tampoco podemos trabajar en Gibraltar, en la refinería o en Acerinox?",
    ],
  },
  {
    id: "ayuntamiento",
    nombre: "5. ¿Qué hace el Ayuntamiento?",
    inicio: 30,
    fin: 37,
    frases: ["Y luego está aquello de: «¿Qué hace el Ayuntamiento por los comerciantes del centro?».", "Pues vamos a recordar algunas cositas."],
  },
  {
    id: "eventos",
    nombre: "6. Los eventos",
    inicio: 37,
    fin: 49,
    frases: [
      "La Ruta de la Tapa.",
      "El Mercado Pirata.",
      "Los carnavales.",
      "El Oktoberfest.",
      "La Noche de las Velas.",
      "Halloween.",
      "La iluminación navideña.",
      "Nuestra Semana Santa...",
    ],
  },
  {
    id: "centro",
    nombre: "7. El centro no está muerto",
    inicio: 49,
    fin: 56,
    frases: ["¿Todo eso dónde se celebra?", "¡EN EL CENTRO DE LA LÍNEA!", "Que no, que nuestro centro no está muerto."],
  },
  {
    id: "arbol",
    nombre: "8. El árbol",
    inicio: 56,
    fin: 68,
    frases: [
      "Y ahora, la última: que el árbol de Navidad se ha colocado junto a Camarón para favorecer al centro comercial.",
      "Vamos a ver...",
      "¡Que el árbol mide DIECISÉIS METROS DE ALTURA!",
    ],
  },
  {
    id: "distancias",
    nombre: "9. Las distancias",
    inicio: 68,
    fin: 78,
    frases: ["Está a unos quinientos metros del centro comercial y a menos de cincuenta de cuatro restaurantes linenses.", "¿Esos negocios no cuentan?"],
  },
  {
    id: "drones",
    nombre: "10. Los drones",
    inicio: 78,
    fin: 88,
    frases: [
      "Por esa regla de tres, el espectáculo de drones también favorece a las franquicias que tiene alrededor.",
      "¿Dejamos entonces de celebrar la Navidad para que nadie venda nada?",
    ],
  },
  {
    id: "oportunidad",
    nombre: "11. Oportunidades",
    inicio: 88,
    fin: 100,
    frases: [
      "¿Y si resulta que el centro comercial también atrae visitantes, clientes y oportunidades para La Línea?",
      "Hace unos años ni soñábamos con tener algo así.",
      "Y ahora parece que tenemos que pedir perdón por ello.",
    ],
  },
  {
    id: "compatibles",
    nombre: "12. No son incompatibles",
    inicio: 100,
    fin: 110,
    frases: [
      "Podemos defender el comercio tradicional y celebrar las nuevas inversiones.",
      "¡No son incompatibles!",
      "Dejemos de tirar piedras contra nuestro propio tejado.",
    ],
  },
  {
    id: "cierre",
    nombre: "13. Cierre",
    inicio: 110,
    fin: 120,
    frases: ["Y esta Navidad, háganse una foto con nuestro árbol, junto a Camarón y con el mar de fondo.", "Porque eso también es La Línea."],
  },
];

/** El TTS lee mejor en minúsculas lo que en pantalla va en mayúsculas. */
export const PRONUNCIACION: Record<string, string> = {
  EN: "en",
  EL: "el",
  CENTRO: "centro",
  DE: "de",
  LA: "la",
  LÍNEA: "Línea",
  DIECISÉIS: "dieciséis",
  METROS: "metros",
  ALTURA: "altura",
};

/** Pausas expresivas dentro de algunas escenas (ritmo de editorial, preguntas retóricas). */
export const PAUSAS_ENTRE_FRASES: Record<string, number> = { criticas: 0.5, eventos: 0.25, centro: 0.45, arbol: 0.5, distancias: 0.5, compatibles: 0.5, cierre: 0.55 };

export const AUDIO = {
  locucion: "editorial/locucion.mp3",
  musica: "editorial/musica.mp3",
  golpe: "encuesta/golpe.mp3",
  barrido: "encuesta/barrido.mp3",
  volumenMusica: 0.12,
  volumenEfectos: 0.35,
} as const;
