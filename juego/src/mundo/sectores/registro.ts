import type { Correccion, Correcciones, SectorDatos } from "./generador";
import type { P2 } from "./piezas";

/**
 * Sectores generados automáticamente (src/datos/sectores/*.json, escritos por
 * scripts/sector/generar.py) y su capa de correcciones manuales
 * (src/datos/correcciones/*.json). La capa de correcciones nunca la toca el generador:
 * regenerar un sector conserva todo lo corregido.
 *
 * En desarrollo, el editor guarda en el fichero del repositorio (middleware de Vite).
 * En la versión publicada no hay servidor: se guarda en este navegador y se puede exportar.
 */

const datos = import.meta.glob<SectorDatos>("../../datos/sectores/*.json", { eager: true, import: "default" });
const ficheros = import.meta.glob<Correcciones>("../../datos/correcciones/*.json", { eager: true, import: "default" });

export const SECTORES: SectorDatos[] = Object.values(datos);

const CLAVE = (id: string) => `infolinense-correcciones-${id}`;

function locales(id: string): Correcciones {
  try {
    return JSON.parse(localStorage.getItem(CLAVE(id)) ?? "{}");
  } catch {
    return {};
  }
}

/** Correcciones vigentes: las del repositorio y, encima, las guardadas en este navegador. */
export function correccionesDe(id: string): Correcciones {
  const base = Object.entries(ficheros).find(([k]) => k.endsWith(`/${id}.json`))?.[1] ?? {};
  const loc = locales(id);
  const out: Correcciones = { ...base };
  for (const [k, v] of Object.entries(loc)) out[k] = { ...out[k], ...v };
  return out;
}

/** Guarda la corrección de un edificio. Devuelve dónde quedó guardada. */
export async function guardarCorreccion(sector: string, edificio: string, cambios: Correccion): Promise<"repositorio" | "navegador"> {
  const loc = locales(sector);
  loc[edificio] = { ...loc[edificio], ...cambios };
  try {
    localStorage.setItem(CLAVE(sector), JSON.stringify(loc));
  } catch {
    /* sin almacenamiento local */
  }
  if (import.meta.env.DEV) {
    const r = await fetch("/__editor/correcciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sector, edificio, cambios }),
    }).catch(() => null);
    if (r?.ok) return "repositorio";
  }
  return "navegador";
}

/** Borra una corrección (vuelve a los datos generados). */
export async function borrarCorreccion(sector: string, edificio: string) {
  const loc = locales(sector);
  delete loc[edificio];
  try {
    localStorage.setItem(CLAVE(sector), JSON.stringify(loc));
  } catch {
    /* sin almacenamiento local */
  }
  if (import.meta.env.DEV) await fetch("/__editor/correcciones", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sector, edificio, borrar: true }) }).catch(() => null);
}

export function exportarCorrecciones(sector: string) {
  return JSON.stringify(correccionesDe(sector), null, 1);
}

function dentro(p: P2, poli: P2[]) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** ¿Cae el punto en una manzana generada? (sus rectángulos de linea.json se sustituyen). */
export function enSectorGenerado(x: number, y: number) {
  return SECTORES.some((s) => dentro([x, y], s.manzana));
}
