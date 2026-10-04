import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const COLORES = {
  fondo: "#120E0A",
  fondoClaro: "#2A2118",
  pergamino: "#EADCBE",
  pergaminoOscuro: "#C9B48A",
  tinta: "#2A1D12",
  oro: "#D9A441",
  rojo: "#A3262A",
  victoria: "#E8573A",
  azulManto: "#8FB3DE",
} as const;

export const FUENTES = {
  titulo: "Playfair Display",
  texto: "Inter",
  acta: "IM Fell English",
  manuscrita: "Pinyon Script",
} as const;

const cargar = (family: string, archivo: string, weight: string, style = "normal") =>
  loadFont({ family, url: staticFile(`fonts/${archivo}`), weight, style });

cargar(FUENTES.titulo, "PlayfairDisplay-700.woff2", "700");
cargar(FUENTES.titulo, "PlayfairDisplay-900.woff2", "900");
cargar(FUENTES.texto, "Inter-400.woff2", "400");
cargar(FUENTES.texto, "Inter-700.woff2", "700");
cargar(FUENTES.texto, "Inter-900.woff2", "900");
cargar(FUENTES.acta, "IMFellEnglish-400.woff2", "400");
cargar(FUENTES.acta, "IMFellEnglish-400-italic.woff2", "400", "italic");
cargar(FUENTES.manuscrita, "PinyonScript-400.woff2", "400");

/**
 * Zona segura para Reels / TikTok / Shorts (1080x1920).
 * Arriba y abajo quedan libres para la interfaz de las apps.
 */
export const ZONA_SEGURA = {
  arriba: 200,
  abajo: 380,
  lados: 80,
} as const;
