import type { IconoId } from "./datos/mapa";

/** Iconos lineales (24 × 24, trazo) compartidos entre el mapa y la interfaz. */
export const ICONOS: Record<IconoId | "mochila" | "movil" | "diario" | "menu" | "viento" | "euro" | "cerrar" | "objetivo", string> = {
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
  objetivo: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5v1",
};

export const iconoSvg = (id: keyof typeof ICONOS, tam = 20) =>
  `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONOS[id]}"/></svg>`;

const cache = new Map<string, Path2D>();
export const iconoPath = (id: keyof typeof ICONOS) => {
  if (!cache.has(id)) cache.set(id, new Path2D(ICONOS[id]));
  return cache.get(id)!;
};
