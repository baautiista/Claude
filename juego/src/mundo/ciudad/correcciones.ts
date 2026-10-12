import { con } from "../../red/conexion";
import type { Correccion, Correcciones } from "./tipos";

/**
 * Correcciones del editor de ciudad: capa aparte de los datos generados.
 *
 * Se leen y combinan, de menos a más prioritario:
 *   1. src/datos/correcciones/ciudad.json (las consolidadas en el repositorio),
 *   2. el backend: servidor de Mi Línea (SQLite) o, en la versión publicada en claude.ai,
 *      la base de datos compartida del artifact (colección «correcciones»),
 *   3. las de este navegador que aún no se hayan podido subir.
 * Al guardar se escribe en el backend disponible (y en desarrollo también en el fichero del
 * repositorio); la copia local es solo un respaldo. Exportar descarga el JSON completo.
 */

const base = import.meta.glob<Correcciones>("../../datos/correcciones/ciudad.json", { eager: true, import: "default" });
const CLAVE = "infolinense-correcciones-ciudad";

type Doc = { id: string; data(): Record<string, unknown> };
type Db = {
  collection(p: string): { get(): Promise<{ docs: Doc[] }> };
  doc(p: string): { set(d: Record<string, unknown>, o?: { merge?: boolean }): Promise<unknown>; delete(): Promise<unknown> };
};
type Claude = { use(n: string): Promise<unknown> };

let memoria: Correcciones = { ...(Object.values(base)[0] ?? {}) };
let remotas: Correcciones = {};
let locales: Correcciones = leerLocal();
let db: Db | null = null;
let destino: "servidor" | "artifact" | "repositorio" | "navegador" = import.meta.env.DEV ? "repositorio" : "navegador";
const oyentes = new Set<(ids: string[]) => void>();

function leerLocal(): Correcciones {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
  } catch {
    return {};
  }
}
function escribirLocal() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(locales));
  } catch {
    /* sin almacenamiento local */
  }
}

/** Corrección vigente de un edificio. */
export function correccionDe(id: string): Correccion | undefined {
  const a = memoria[id];
  const b = remotas[id];
  const c = locales[id];
  return a || b || c ? { ...a, ...b, ...c } : undefined;
}
export function todasLasCorrecciones(): Correcciones {
  const ids = new Set([...Object.keys(memoria), ...Object.keys(remotas), ...Object.keys(locales)]);
  return Object.fromEntries([...ids].map((id) => [id, correccionDe(id)!]));
}
export const dondeSeGuarda = () => destino;
export function alCambiar(f: (ids: string[]) => void) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}
const avisar = (ids: string[]) => oyentes.forEach((f) => f(ids));

/** Conecta con el backend disponible y trae sus correcciones (no bloquea el arranque). */
export async function conectarBackend() {
  try {
    if (con.modo === "servidor") {
      const r = await con.llamar<{ correcciones: Correcciones }>("correccionesCiudad", {});
      remotas = r.correcciones ?? {};
      destino = "servidor";
    } else {
      const c = (window as unknown as { claude?: Claude }).claude;
      db = c?.use ? ((await c.use("db").catch(() => null)) as Db | null) : null;
      if (db) {
        const s = await db.collection("correcciones").get();
        remotas = Object.fromEntries(s.docs.map((d) => [d.id, d.data() as Correccion]));
        destino = "artifact";
      }
    }
  } catch {
    /* sin backend: quedan el fichero y la copia local */
  }
  // Lo que se guardó sin conexión y el backend ya tiene se retira de la copia local.
  for (const id of Object.keys(locales)) if (remotas[id] && JSON.stringify({ ...remotas[id], ...locales[id] }) === JSON.stringify(remotas[id])) delete locales[id];
  escribirLocal();
  avisar(Object.keys(remotas));
}

/** Guarda una corrección. Devuelve dónde quedó guardada de forma permanente. */
export async function guardarCorreccion(id: string, cambios: Correccion): Promise<string> {
  locales[id] = { ...locales[id], ...cambios };
  escribirLocal();
  avisar([id]);
  let guardado = "navegador";
  try {
    if (destino === "servidor") {
      await con.llamar("guardarCorreccionCiudad", { id, cambios });
      remotas[id] = { ...remotas[id], ...cambios };
      guardado = "servidor";
    } else if (destino === "artifact" && db) {
      await db.doc(`correcciones/${id}`).set({ ...cambios, fecha: new Date().toISOString() }, { merge: true });
      remotas[id] = { ...remotas[id], ...cambios };
      guardado = "artifact";
    }
  } catch (e) {
    guardado = `navegador (el backend lo rechazó: ${(e as Error).message})`;
  }
  if (import.meta.env.DEV) {
    const r = await fetch("/__editor/correcciones", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ edificio: id, cambios }) }).catch(() => null);
    if (r?.ok) {
      memoria[id] = { ...memoria[id], ...cambios };
      guardado = guardado === "navegador" ? "repositorio" : `${guardado} + repositorio`;
    }
  }
  if (guardado !== "navegador" && !guardado.startsWith("navegador")) {
    delete locales[id];
    escribirLocal();
  }
  return guardado;
}

export async function borrarCorreccion(id: string) {
  delete locales[id];
  delete remotas[id];
  delete memoria[id];
  escribirLocal();
  try {
    if (destino === "servidor") await con.llamar("borrarCorreccionCiudad", { id });
    else if (destino === "artifact" && db) await db.doc(`correcciones/${id}`).delete();
  } catch {
    /* se reintentará al volver a borrar */
  }
  if (import.meta.env.DEV) await fetch("/__editor/correcciones", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ edificio: id, borrar: true }) }).catch(() => null);
  avisar([id]);
}

/** Exporta todas las correcciones como JSON (descarga mediada por el visor en claude.ai). */
export async function exportarCorrecciones(): Promise<string> {
  const texto = JSON.stringify(todasLasCorrecciones(), null, 1);
  const c = (window as unknown as { claude?: Claude }).claude;
  const descargas = c?.use ? ((await c.use("downloads").catch(() => null)) as { save(f: { filename: string; data: string }): Promise<unknown> } | null) : null;
  if (descargas) {
    await descargas.save({ filename: "correcciones-ciudad.json", data: texto });
    return "descargado";
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  a.download = "correcciones-ciudad.json";
  a.click();
  return "descargado";
}
