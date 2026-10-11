import type { IconoId } from "./datos/mapa";

/** Iconos lineales (24 × 24, trazo) compartidos entre el mapa y la interfaz. */
export const ICONOS: Record<IconoId | "mochila" | "movil" | "diario" | "menu" | "viento" | "euro" | "cerrar" | "objetivo" | "rayo" | "cubiertos" | "cara" | "gente" | "ajustes" | "reloj" | "martillo" | "rodillo" | "salir" | "llave" | "sofa" | "lupa", string> = {
  casa: "M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10",
  iglesia: "M12 2v5M10 4h4M5 21V12l7-5 7 5v9zM10 21v-5h4v5",
  mercado: "M3 9h18l-2 11H5zM8 9l4-6 4 6M9 13v4M15 13v4",
  bar: "M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9.5h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v3M12 2.5v3",
  periodico: "M4 4h13v15a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2zM17 8h3v11a1 1 0 0 1-2 0M8 8h5M8 12h5M8 16h3",
  ancla: "M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 8v13M8 12h8M4 13a8 8 0 0 0 16 0",
  brote: "M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 7-8 7zM12 14c0-3-2-5-7-5 0 4 2 5 7 5zM7 21h10",
  bandera: "M5 21V3M5 4h12l-2.5 4L17 12H5",
  ola: "M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0",
  bus: "M5 4h14v13H5zM5 11h14M7.5 20v-3M16.5 20v-3M8 14h.01M16 14h.01",
  balon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5l4 3-1.5 4.5h-5L8 10.5z",
  fuerte: "M4 21V9h3v3h3V9h4v3h3V9h3v12zM10 21v-4h4v4",
  mochila: "M8 7V5a4 4 0 0 1 8 0v2M5 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11H5zM9 13h6",
  movil: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2",
  diario: "M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3zM5 18a3 3 0 0 1 3-3h11M9 7h6",
  menu: "M4 7h16M4 12h16M4 17h16",
  viento: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8",
  euro: "M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9",
  cerrar: "M6 6l12 12M18 6 6 18",
  rayo: "M13 2 4 14h7l-1 8 9-12h-7z",
  cubiertos: "M7 2v8M4 2v5a3 3 0 0 0 6 0V2M7 10v12M17 2c-2 2-3 5-3 8h3v12",
  cara: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 14.5q3.5 3 7 0M9 9.5h.01M15 9.5h.01",
  gente: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a5.5 5.5 0 0 1 3.5 6",
  ajustes: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  reloj: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  objetivo: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5v1",
  martillo: "M14 6l4 4M10.5 9.5 4 16a2.1 2.1 0 0 0 3 3l6.5-6.5M12 4l2-2 6 6-2 2-2.5-.5L11 5z",
  rodillo: "M4 3h13v5H4zM17 5.5h2.5V11H11v3M10 14h2v7h-2z",
  salir: "M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M15 16l4-4-4-4M19 12H9",
  llave: "M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 11h10M18 11v3M15 11v2",
  sofa: "M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 12a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v6H2zM5 18v2M19 18v2",
  lupa: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
};

export const iconoSvg = (id: keyof typeof ICONOS, tam = 20) =>
  `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONOS[id]}"/></svg>`;

const cache = new Map<string, Path2D>();
export const iconoPath = (id: keyof typeof ICONOS) => {
  if (!cache.has(id)) cache.set(id, new Path2D(ICONOS[id]));
  return cache.get(id)!;
};

/**
 * Iconos de juego rellenos a dos tonos (sin emojis): recursos, saludos y fichas.
 * Usan currentColor para la forma y `--acento` para el detalle.
 */
const RELLENOS = {
  moneda: '<circle cx="12" cy="12" r="10" fill="#F5C842"/><circle cx="12" cy="12" r="7.4" fill="#FFDD66" stroke="#D9A21E" stroke-width="1.4"/><path d="M14.6 8.6a4 4 0 1 0 0 6.8M7.8 11h5.4M7.8 13.2h5.4" fill="none" stroke="#9A6A08" stroke-width="1.6" stroke-linecap="round"/>',
  rayo: '<path d="M13.5 2 5 13.4h5.6L9.6 22 19 9.8h-5.7z" fill="#FFD23F" stroke="#C99A00" stroke-width="1.2" stroke-linejoin="round"/>',
  cubiertos: '<path d="M7 2v7.5a2 2 0 0 0 1 1.7V22h2V11.2a2 2 0 0 0 1-1.7V2h-1.3v6H9.3V2H8.1v6H7.9V2z" fill="#F4F1EA"/><path d="M16.5 2c-2 1.6-3 4.5-3 8h2.5v12h2V2z" fill="#F4F1EA"/>',
  cara: '<circle cx="12" cy="12" r="10" fill="#FFC94D"/><circle cx="8.7" cy="10" r="1.4" fill="#5B3B24"/><circle cx="15.3" cy="10" r="1.4" fill="#5B3B24"/><path d="M7.5 14q4.5 4.2 9 0" fill="none" stroke="#5B3B24" stroke-width="1.8" stroke-linecap="round"/>',
  gente: '<circle cx="9" cy="7.5" r="3.6" fill="#8FD3FF"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0z" fill="#8FD3FF"/><circle cx="16.8" cy="8.5" r="2.9" fill="#C4E910"/><path d="M13.6 20.2a5.4 5.4 0 0 1 8.9-4.6V20.2z" fill="#C4E910"/>',
  reloj: '<circle cx="12" cy="12" r="10" fill="#FFFFFF"/><circle cx="12" cy="12" r="10" fill="none" stroke="#1F5EFF" stroke-width="2"/><path d="M12 6.5V12l3.6 2.2" fill="none" stroke="#061E5C" stroke-width="2" stroke-linecap="round"/>',
  estrella: '<path d="m12 2 2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 16.8l-6.1 3.4 1.5-6.7L2.3 8.9l6.8-.7z" fill="#C4E910" stroke="#7F9A00" stroke-width="1.2" stroke-linejoin="round"/>',
  edificio: '<path d="M4 21V7l8-4 8 4v14z" fill="#F4F1EA"/><path d="M4 7l8-4 8 4" fill="none" stroke="#C9603A" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 10h2.4v2.4H8zM13.6 10H16v2.4h-2.6zM8 15h2.4v2.4H8zM13.6 15H16v2.4h-2.6z" fill="#4F7598"/><path d="M10.5 21v-3h3v3" fill="#6B3F22"/>',
  calle: '<path d="M8 2h8l4 20H4z" fill="#676D78"/><path d="M12 4v3M12 10v3M12 16v4" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>',
  plantas: '<path d="M5 3h14v18H5z" fill="#F7E3A1"/><path d="M5 9h14M5 15h14" stroke="#C99A00" stroke-width="1.4"/><path d="M8 5.2h2v2H8zM14 5.2h2v2h-2zM8 11.2h2v2H8zM14 11.2h2v2h-2zM8 17.2h2v2H8zM14 17.2h2v2h-2z" fill="#4F7598"/>',
  tienda: '<path d="M3 9h18v12H3z" fill="#F4F1EA"/><path d="M2 4h20l-1 5H3z" fill="#E8423C"/><path d="M6 4l-1 5M10 4v5M14 4v5M18 4l1 5" stroke="#FFFFFF" stroke-width="1.6"/><path d="M6 12h6v5H6z" fill="#7FA6C7"/><path d="M14 12h4v9h-4z" fill="#6B3F22"/>',
  ir: '<circle cx="12" cy="12" r="10" fill="#C4E910"/><path d="M12 6c-2.5 0-4.4 1.9-4.4 4.3C7.6 13.5 12 18 12 18s4.4-4.5 4.4-7.7C16.4 7.9 14.5 6 12 6zm0 6a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z" fill="#061E5C"/>',
  // Saludos
  hola: '<path d="M7.5 11V5.2a1.5 1.5 0 0 1 3 0V10m0-.5V3.8a1.5 1.5 0 0 1 3 0V10m0-.6V5a1.5 1.5 0 0 1 3 0v6.5m0-3.2a1.5 1.5 0 0 1 3 0V14a8 8 0 0 1-8 8h-.5a7.5 7.5 0 0 1-6-3l-3-4.2a1.6 1.6 0 0 1 2.4-2l1.6 1.4V11" fill="#FFC94D" stroke="#C98A00" stroke-width="1.3" stroke-linejoin="round"/>',
  risa: '<circle cx="12" cy="12" r="10" fill="#FFC94D"/><path d="M7.3 9.6q1.4-1.6 2.8 0M13.9 9.6q1.4-1.6 2.8 0" fill="none" stroke="#5B3B24" stroke-width="1.6" stroke-linecap="round"/><path d="M6.8 13h10.4a5.2 5.2 0 0 1-10.4 0z" fill="#5B3B24"/><path d="M8.8 16.5a4 2 0 0 0 6.4 0" fill="#E9546B"/>',
  bien: '<path d="M7 10h3.5l2.3-6.4a1.9 1.9 0 0 1 3.6 1.1L15.6 9H20a2 2 0 0 1 2 2.3l-1.2 7.8A2.4 2.4 0 0 1 18.4 21H7z" fill="#FFC94D" stroke="#C98A00" stroke-width="1.3" stroke-linejoin="round"/><path d="M2 10h4v11H2z" fill="#1F5EFF"/>',
  corazon: '<path d="M12 21s-8.5-5.2-8.5-11.3A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.5 2.9C20.5 15.8 12 21 12 21z" fill="#FF1254"/><path d="M7 8.6a2.4 2.4 0 0 1 2.6-1.4" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>',
  pez: '<path d="M2.5 12c3-5 9.5-6.5 14.5-2.2L21.5 6v12L17 14.2C12 18.5 5.5 17 2.5 12z" fill="#4FA3E0"/><circle cx="7.5" cy="11" r="1.3" fill="#061E5C"/><path d="M10.5 9.2q1.6 2.8 0 5.6" fill="none" stroke="#FFFFFF" stroke-width="1.3" opacity=".8"/>',
  tomate: '<circle cx="12" cy="13.5" r="8" fill="#E8423C"/><path d="M12 5.5c-1.6-1.8-4-1.6-4-1.6s1 2 2.6 2.4C9 7 7 8 7 8s3 .6 5-.6c2 1.2 5 .6 5 .6s-2-1-3.6-1.7C15 5.9 16 3.9 16 3.9s-2.4-.2-4 1.6z" fill="#3FA046"/><ellipse cx="9" cy="11" rx="1.6" ry="2.4" fill="#FFFFFF" opacity=".35"/>',
  balon: '<circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="#061E5C" stroke-width="1.4"/><path d="m12 7.2 3.4 2.5-1.3 4h-4.2l-1.3-4z" fill="#061E5C"/><path d="M12 7.2V2.4M15.4 9.7l4.4-1.5M14.1 13.7l2.7 3.8M9.9 13.7l-2.7 3.8M8.6 9.7 4.2 8.2" stroke="#061E5C" stroke-width="1.3"/>',
  sol: '<circle cx="12" cy="12" r="5" fill="#FFC94D"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="#F2A93B" stroke-width="2" stroke-linecap="round"/>',
} as const;

export type IconoJuego = keyof typeof RELLENOS;
export const iconoJuego = (id: IconoJuego, tam = 22) =>
  `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" aria-hidden="true">${RELLENOS[id]}</svg>`;
export const esIconoJuego = (id: string): id is IconoJuego => id in RELLENOS;
