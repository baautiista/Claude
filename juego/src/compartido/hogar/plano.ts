import { azar } from "./datos.ts";

/**
 * Planos interiores de las viviendas, generados de forma determinista a partir
 * de la superficie, el número de dormitorios y el tipo de vivienda. Los usan el
 * servidor (colisiones, permisos de colocación) y el navegador (escena 3D).
 *
 * Unidades: 1 celda = 1 m. Los muebles se colocan en medias celdas (0,5 m).
 * Lados: "n" hacia z−, "s" hacia z+, "o" hacia x−, "e" hacia x+.
 */

export type TipoHab = "salon" | "cocina" | "dormitorio" | "bano" | "patio" | "estudio" | "terraza";
export type Lado = "n" | "s" | "e" | "o";

export interface Habitacion {
  id: string;
  tipo: TipoHab;
  nombre: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface Hueco {
  /** Celda de la habitación desde la que se mira el hueco. */
  x: number;
  z: number;
  lado: Lado;
  tipo: "puerta" | "ventana" | "entrada";
}

export interface Plano {
  ancho: number;
  fondo: number;
  habitaciones: Habitacion[];
  huecos: Hueco[];
  entrada: { x: number; z: number };
}

export type TipoVivienda = "casa" | "piso" | "atico";

const NOMBRES: Record<TipoHab, string> = {
  salon: "Salón", cocina: "Cocina", dormitorio: "Dormitorio", bano: "Baño", patio: "Patio", estudio: "Estudio", terraza: "Terraza",
};
const PESO: Record<TipoHab, number> = { salon: 3, cocina: 1.6, dormitorio: 1.9, bano: 0.9, estudio: 1.3, patio: 0, terraza: 0 };

interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Reparte un rectángulo entre habitaciones (mapa de árbol proporcional a su peso). */
function repartir(r: Rect, tipos: TipoHab[], rnd: () => number, out: (Rect & { tipo: TipoHab })[]) {
  if (tipos.length === 1) {
    out.push({ ...r, tipo: tipos[0] });
    return;
  }
  const total = tipos.reduce((s, t) => s + PESO[t], 0);
  // Grupo A con la mitad del peso aproximadamente (respetando el orden).
  let acum = 0;
  let corte = 1;
  for (let i = 0; i < tipos.length - 1; i++) {
    acum += PESO[tipos[i]];
    corte = i + 1;
    if (acum >= total / 2) break;
  }
  const pesoA = tipos.slice(0, corte).reduce((s, t) => s + PESO[t], 0);
  const anchoR = r.x1 - r.x0;
  const fondoR = r.z1 - r.z0;
  const vertical = anchoR > fondoR || (anchoR === fondoR && rnd() < 0.5);
  if (vertical) {
    const c = Math.max(r.x0 + 2, Math.min(r.x1 - 2, r.x0 + Math.round(anchoR * (pesoA / total))));
    repartir({ ...r, x1: c }, tipos.slice(0, corte), rnd, out);
    repartir({ ...r, x0: c }, tipos.slice(corte), rnd, out);
  } else {
    const c = Math.max(r.z0 + 2, Math.min(r.z1 - 2, r.z0 + Math.round(fondoR * (pesoA / total))));
    repartir({ ...r, z1: c }, tipos.slice(0, corte), rnd, out);
    repartir({ ...r, z0: c }, tipos.slice(corte), rnd, out);
  }
}

/** Tramo de pared común entre dos habitaciones (si lo hay). */
function comun(a: Rect, b: Rect) {
  if (a.x1 === b.x0 || b.x1 === a.x0) {
    const z0 = Math.max(a.z0, b.z0);
    const z1 = Math.min(a.z1, b.z1);
    if (z1 - z0 >= 1) return { eje: "x" as const, x: a.x1 === b.x0 ? a.x1 : a.x0, d0: z0, d1: z1 };
  }
  if (a.z1 === b.z0 || b.z1 === a.z0) {
    const x0 = Math.max(a.x0, b.x0);
    const x1 = Math.min(a.x1, b.x1);
    if (x1 - x0 >= 1) return { eje: "z" as const, z: a.z1 === b.z0 ? a.z1 : a.z0, d0: x0, d1: x1 };
  }
  return null;
}

export function generarPlano(semilla: number, superficie: number, dormitorios: number, tipo: TipoVivienda): Plano {
  const rnd = azar(semilla);
  const area = Math.max(30, Math.min(220, superficie));
  const ancho = Math.max(6, Math.min(15, Math.round(Math.sqrt(area * 1.2))));
  const fondoTotal = Math.max(6, Math.min(16, Math.round(area / ancho) + (tipo === "piso" ? 0 : 2)));
  const exterior = tipo === "casa" ? "patio" : tipo === "atico" ? "terraza" : null;
  const fondoExt = exterior ? Math.max(3, Math.round(fondoTotal * 0.25)) : 0;
  const fondoCasa = fondoTotal - fondoExt;
  const tipos: TipoHab[] = ["salon", "cocina", "bano"];
  const nd = Math.max(1, Math.min(4, dormitorios));
  for (let i = 0; i < nd; i++) tipos.push("dormitorio");
  if (area > 110) tipos.push("estudio");
  const rects: (Rect & { tipo: TipoHab })[] = [];
  repartir({ x0: 0, z0: 0, x1: ancho, z1: fondoCasa }, tipos, rnd, rects);
  if (exterior) rects.push({ x0: 0, z0: fondoCasa, x1: ancho, z1: fondoTotal, tipo: exterior });
  let nDorm = 0;
  const habitaciones: Habitacion[] = rects.map((r, i) => ({
    id: `h${i}`, tipo: r.tipo, x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1,
    nombre: r.tipo === "dormitorio" ? `${NOMBRES.dormitorio} ${++nDorm}` : NOMBRES[r.tipo],
  }));
  const huecos: Hueco[] = [];
  const ocupado = new Set<string>();
  const marcar = (h: Hueco) => {
    huecos.push(h);
    ocupado.add(`${h.x},${h.z},${h.lado}`);
  };
  // Puertas: árbol de expansión desde el salón (todas las habitaciones conectadas).
  const salon = habitaciones.find((h) => h.tipo === "salon")!;
  const unidas = new Set([salon.id]);
  const cola = [salon];
  while (cola.length) {
    const a = cola.shift()!;
    const vecinas = habitaciones.filter((b) => !unidas.has(b.id) && comun(a, b));
    // El baño y los dormitorios prefieren unirse al salón o a un pasillo; el patio a la cocina.
    for (const b of vecinas) {
      if (unidas.has(b.id)) continue;
      if (b.tipo === "patio" || b.tipo === "terraza") {
        const mejor = habitaciones.find((x) => (x.tipo === "cocina" || x.tipo === "salon") && unidas.has(x.id) && comun(x, b)) ?? a;
        if (mejor !== a && !comun(mejor, b)) continue;
        abrirPuerta(mejor, b);
      } else abrirPuerta(a, b);
      unidas.add(b.id);
      cola.push(b);
    }
  }
  function abrirPuerta(a: Habitacion, b: Habitacion) {
    const c = comun(a, b)!;
    const m = Math.floor((c.d0 + c.d1 - 1) / 2);
    if (c.eje === "x") {
      const desdeA = a.x1 === c.x;
      marcar({ x: desdeA ? c.x - 1 : c.x, z: m, lado: desdeA ? "e" : "o", tipo: "puerta" });
    } else {
      const desdeA = a.z1 === c.z;
      marcar({ x: m, z: desdeA ? c.z - 1 : c.z, lado: desdeA ? "s" : "n", tipo: "puerta" });
    }
  }
  // Por si el reparto dejó alguna habitación aislada: se une a cualquier vecina.
  for (const b of habitaciones) {
    if (unidas.has(b.id)) continue;
    const a = habitaciones.find((x) => unidas.has(x.id) && comun(x, b));
    if (a) {
      abrirPuerta(a, b);
      unidas.add(b.id);
    }
  }
  // Entrada por la fachada (z = 0), en el salón si da a ella.
  const fachada = habitaciones.filter((h) => h.z0 === 0 && h.tipo !== "patio" && h.tipo !== "terraza");
  const conEntrada = fachada.find((h) => h.tipo === "salon") ?? fachada[0] ?? salon;
  const entrada = { x: Math.floor((conEntrada.x0 + conEntrada.x1 - 1) / 2), z: conEntrada.z0 };
  marcar({ ...entrada, lado: "n", tipo: "entrada" });
  // Ventanas en los muros exteriores (y hacia el patio), una cada ~3 m.
  for (const h of habitaciones) {
    if (h.tipo === "patio" || h.tipo === "terraza") continue;
    const lados: Lado[] = [];
    if (h.z0 === 0) lados.push("n");
    if (h.z1 === fondoCasa) lados.push("s");
    if (tipo !== "piso" && h.x0 === 0) lados.push("o");
    if (tipo !== "piso" && h.x1 === ancho) lados.push("e");
    for (const lado of lados) {
      const horizontal = lado === "n" || lado === "s";
      const l0 = horizontal ? h.x0 : h.z0;
      const l1 = horizontal ? h.x1 : h.z1;
      const paso = h.tipo === "bano" ? 99 : 3;
      for (let p = l0 + 1; p < l1 - 0; p += paso) {
        const x = horizontal ? p : lado === "o" ? h.x0 : h.x1 - 1;
        const z = horizontal ? (lado === "n" ? h.z0 : h.z1 - 1) : p;
        if (ocupado.has(`${x},${z},${lado}`)) continue;
        // Hacia el patio: solo si la pared da al patio (z1 = fondoCasa con exterior).
        if (lado === "s" && !exterior && tipo === "piso") continue;
        marcar({ x, z, lado, tipo: "ventana" });
        if (h.tipo === "bano") break;
      }
    }
  }
  return { ancho, fondo: fondoTotal, habitaciones, huecos, entrada };
}

export function habitacionEn(p: Plano, x: number, z: number) {
  return p.habitaciones.find((h) => x >= h.x0 && x < h.x1 && z >= h.z0 && z < h.z1) ?? null;
}

/**
 * Medias celdas (0,5 m) que no se pueden ocupar con muebles de suelo: delante de
 * cada puerta y de la entrada, para que siempre se pueda pasar.
 */
export function pasoLibre(p: Plano) {
  const libre = new Set<string>();
  const marcar = (cx: number, cz: number) => {
    for (const dx of [0, 1]) for (const dz of [0, 1]) libre.add(`${cx * 2 + dx},${cz * 2 + dz}`);
  };
  for (const h of p.huecos) {
    if (h.tipo === "ventana") continue;
    marcar(h.x, h.z);
    const [dx, dz] = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] }[h.lado];
    if (h.tipo !== "entrada") marcar(h.x + dx, h.z + dz);
  }
  return libre;
}
