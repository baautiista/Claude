/**
 * Datos del mapa que necesita la autoridad de viviendas. El servidor los lee
 * de linea.json; el navegador los toma del mapa ya cargado.
 */
export interface EdificioMapa {
  x: number;
  y: number;
  w: number;
  d: number;
  ang: number;
  /** 0 casa, 1 bloque, 2 nave, 3 iglesia, 4 escuela, 5 público, 6 ruina, 7 caseta, 8 pabellón */
  tipo: number;
  plantas: number;
}

export interface DatosMapa {
  edificios: EdificioMapa[];
  barrios: { id: string; nombre: string; x: number; y: number }[];
  casaAbuela: [number, number];
}

/** Barrios con su punto de referencia (lon, lat). */
export const BARRIOS_GEO = [
  { id: "centro", nombre: "Centro", lon: -5.353, lat: 36.164 },
  { id: "sanBernardo", nombre: "San Bernardo", lon: -5.3405, lat: 36.17 },
  { id: "atunara", nombre: "La Atunara", lon: -5.339, lat: 36.18 },
  { id: "zabal", nombre: "El Zabal", lon: -5.346, lat: 36.189 },
  { id: "poniente", nombre: "Poniente", lon: -5.364, lat: 36.166 },
  { id: "levante", nombre: "Levante", lon: -5.3365, lat: 36.162 },
];
export const CASA_ABUELA_GEO = { lon: -5.3418, lat: 36.1676 };

/** Construye los datos desde el contenido de linea.json. */
export function datosDesdeLinea(linea: { proy: { lon0: number; lat0: number; kx: number; ky: number }; edificios: number[][] }): DatosMapa {
  const p = linea.proy;
  const geo = (lon: number, lat: number): [number, number] => [(lon - p.lon0) * p.kx, (p.lat0 - lat) * p.ky];
  return {
    edificios: linea.edificios.map(([x, y, w, d, ang, tipo, plantas]) => ({ x, y, w, d, ang, tipo, plantas })),
    barrios: BARRIOS_GEO.map((b) => {
      const [x, y] = geo(b.lon, b.lat);
      return { id: b.id, nombre: b.nombre, x, y };
    }),
    casaAbuela: geo(CASA_ABUELA_GEO.lon, CASA_ABUELA_GEO.lat),
  };
}

let datos: DatosMapa | null = null;
export const fijarMapa = (d: DatosMapa) => {
  datos = d;
};
export const mapa = () => {
  if (!datos) throw new Error("Datos del mapa sin cargar");
  return datos;
};

/** Pseudoaleatorio determinista (mismos resultados en servidor y navegador). */
export function azar(semilla: number) {
  let v = (Math.abs(Math.floor(semilla)) % 2147483646) + 1;
  return () => ((v = (v * 16807) % 2147483647) / 2147483647);
}
export const hashTexto = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
