/**
 * «La Línea 2026. Una Navidad de película.»
 * Edición del vídeo original del espectáculo de luz y sonido de la Plaza de la Iglesia.
 * Sin locución ni música añadida: suena el audio original del vídeo de principio a fin.
 *
 * 1. Copia el vídeo en public/navidad2026/espectaculo.mp4
 * 2. node --experimental-strip-types scripts/analizar-video.ts navidad2026   (sincroniza con la ópera y las luces)
 * 3. Renderiza la composición NavidadDePelicula2026.
 */

export const VIDEO = "navidad2026/espectaculo.mp4";

/** Cómo pasar el vídeo a 9:16 si no es vertical: "cover" recorta centrado; "contain" lo encaja sobre un fondo desenfocado. */
export const ENCUADRE: "cover" | "contain" = "cover";

/** Segundo en que vuelve el vídeo original (la revelación). */
export const REVELACION = 12.2;

/** Tiempos del título (segundos): aparece con la revelación y se va suavemente. */
export const TITULO = { entra: 12.5, sale: 17.4 } as const;

/** Segundos finales con el logotipo. */
export const LOGO_SEGUNDOS = 2.8;

/** Intensidad general de los efectos (0–1). 1 = la propuesta; bájalo si molestan. */
export const INTENSIDAD_EFECTOS = 1;

type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export type Plano =
  | { readonly tipo: "foto"; readonly archivo: string; readonly enfoque?: string; readonly zoom?: [number, number]; readonly deriva?: [number, number] }
  | {
      readonly tipo: "recorte";
      readonly archivo: string;
      readonly natural: { w: number; h: number };
      readonly fondo: string;
      /** Zona del titular a la que se acerca la cámara (px del original). */
      readonly foco: Rect;
      /** Subrayado dorado discreto (px del original). El titular no se modifica. */
      readonly marcas?: readonly Rect[];
      readonly ancho?: number;
      readonly giro?: number;
    };

/**
 * Primeros 12 s: la Navidad del pasado. Solo material histórico aportado.
 * `inicio` en segundos; si hay análisis, cada corte se ajusta al acento musical más cercano (±0,6 s).
 */
/** Mientras falten estas fotos se usa otra del archivo (las dos que no llegaron al servidor). */
export const RESERVAS: Record<string, string> = {
  "navidad2026/archivo/plaza-esculturas-arboles-azules.jpg": "navidad2026/archivo/iglesia-arboles-azules.jpg",
  "navidad2026/archivo/iglesia-guirnaldas-blancas.jpg": "navidad2026/archivo/calle-adornos.jpg",
};

export const ARCHIVO: readonly (Plano & { readonly inicio: number })[] = [
  { inicio: 0, tipo: "foto", archivo: "navidad2026/archivo/iglesia-arboles-azules.jpg", enfoque: "50% 45%", zoom: [1.18, 1.05], deriva: [0, -40] },
  {
    inicio: 2.2,
    tipo: "recorte",
    archivo: "navidad2026/archivo/prensa-diarioarea.jpg",
    natural: { w: 2000, h: 1522 },
    fondo: "navidad2026/archivo/arco-estrellas-2023.jpg",
    foco: { x: 200, y: 30, w: 1780, h: 200 },
    marcas: [{ x: 1020, y: 204, w: 935, h: 9 }],
    ancho: 980,
    giro: -2,
  },
  {
    inicio: 4.8,
    tipo: "recorte",
    archivo: "navidad2026/archivo/prensa-larazon.jpg",
    natural: { w: 1206, h: 1574 },
    fondo: "navidad2026/archivo/plaza-arbol-anillos.jpg",
    foco: { x: 10, y: 70, w: 1180, h: 320 },
    marcas: [{ x: 22, y: 370, w: 1110, h: 8 }],
    ancho: 900,
    giro: 1.6,
  },
  {
    inicio: 7.6,
    tipo: "recorte",
    archivo: "navidad2026/archivo/recorte-concejal.jpg",
    natural: { w: 1206, h: 304 },
    fondo: "navidad2026/archivo/calle-adornos.jpg",
    foco: { x: 40, y: 20, w: 1140, h: 180 },
    marcas: [{ x: 755, y: 80, w: 340, h: 7 }, { x: 45, y: 150, w: 350, h: 7 }],
    ancho: 960,
    giro: -1.2,
  },
  { inicio: 9.9, tipo: "foto", archivo: "navidad2026/archivo/iglesia-guirnaldas-blancas.jpg", enfoque: "50% 35%", zoom: [1.06, 1.16], deriva: [-20, 10] },
  { inicio: 11.0, tipo: "foto", archivo: "navidad2026/archivo/plaza-esculturas-arboles-azules.jpg", enfoque: "62% 50%", zoom: [1.1, 1.22], deriva: [25, -15] },
];
