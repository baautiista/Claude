/**
 * Tokens de marca InfoLinense para el juego. Son los mismos valores que
 * mi-video/src/marca/marca.ts (allí dependen de Remotion, así que no se importan).
 */
export const COLOR = {
  azul: "#1F5EFF",
  azulOscuro: "#061E5C",
  lima: "#C4E910",
  rosa: "#FF1254",
  blanco: "#FFFFFF",
  negro: "#0A0A0A",
  grisClaro: "#F2F3F5",
  grisOscuro: "#2B2D31",
} as const;

/** Colores del mapa, derivados del azul de marca. */
export const MAPA = {
  mar: COLOR.azulOscuro,
  marLuz: "#0B2B7A",
  tierra: COLOR.azul,
  gibraltar: "#3A6BEF",
  penon: "rgba(255,255,255,0.16)",
  barrio: "rgba(255,255,255,0.05)",
  calle: "rgba(255,255,255,0.38)",
  callePrincipal: "rgba(255,255,255,0.85)",
} as const;

export const FUENTE = {
  display: "Poppins, system-ui, sans-serif",
  texto: "Inter, system-ui, sans-serif",
} as const;
