import { definirModulo, type Extra } from "../modulos.ts";
import { ErrorJuego, nivelDe, type Contexto, type Servicio } from "../servicio.ts";
import { CATEGORIAS, MUEBLES, PINTURAS, PLANTAS_JARDIN, precioCaja, precioReventa, PRECIO_PINTURA, SUELOS } from "./catalogo.ts";
import { azar, hashTexto, mapa } from "./datos.ts";
import { generarPlano, habitacionEn, pasoLibre, type Plano, type TipoVivienda } from "./plano.ts";
import { comprobarPuzle, generarPuzle, girar, type Puzle } from "./puzles.ts";

/**
 * Hogar Linense: autoridad de viviendas, interiores, muebles y reformas.
 *
 * - Catálogo: unidades virtuales generadas de los edificios reales (casas,
 *   pisos y áticos), así nunca se agota. Solo se guarda lo que tiene dueño.
 * - La Casa de la abuela es una instancia propia de cada jugador.
 * - Toda compra, venta, alquiler, colocación y reforma se valida aquí.
 */

const fallo = (codigo: string, msg: string): never => {
  throw new ErrorJuego(codigo, msg);
};
const SEMANA = 7 * 24 * 3600 * 1000;
const DIA = 24 * 3600 * 1000;

export interface Unidad {
  id: string;
  edificio: number;
  tipo: TipoVivienda;
  nombre: string;
  barrio: string;
  barrioId: string;
  x: number;
  y: number;
  superficie: number;
  dormitorios: number;
  planta: number;
  estadoBase: number;
  precio: number;
  alquiler: number;
  semilla: number;
}

export interface Titularidad {
  modo: "propiedad" | "alquiler";
  titular: string;
  desde: number;
  precio: number;
  renta?: number;
  pagadoHasta?: number;
  enVenta?: number | null;
  /** Convivientes (editan y reforman) y ayudantes (solo reforman). */
  roles: Record<string, "conviviente" | "ayudante">;
  /** Invitados con acceso temporal (hasta). */
  invitados: Record<string, number>;
}

export interface MuebleColocado {
  uid: string;
  tipo: string;
  x: number;
  z: number;
  rot: number;
  color: string;
  /** Mueble viejo y roto (trasto) que hay que retirar. */
  roto?: boolean;
}

export interface InteriorDoc {
  v: number;
  unidad: string;
  plano: Plano;
  pintura: Record<string, string>;
  /** Paredes desconchadas que piden una mano de pintura. */
  pinturaVieja: Record<string, boolean>;
  suelo: Record<string, string>;
  /** Suelo roto (baldosas levantadas) por habitación. */
  sueloRoto: Record<string, boolean>;
  muebles: MuebleColocado[];
  manchas: { id: string; x: number; z: number; r: number }[];
  basura: { id: string; x: number; z: number; tipo: number }[];
  grietas: { id: string; hab: string; lado: "n" | "s" | "e" | "o"; u: number; puntos: [number, number][] }[];
  electricidad: { semilla: number; resuelto: boolean };
  fontaneria: { semilla: number; resuelto: boolean };
  jardin: { x: number; z: number; planta: string | null; plantado: number; regado: number; mala?: boolean; cavado?: boolean }[];
  /** Historial de reformas hechas (para encargos y valor). */
  hechas: Record<string, number>;
}

/* ── Catálogo de unidades ──────────────────────────────────────────── */

const PRECIO_M2: Record<string, number> = { centro: 38, sanBernardo: 30, atunara: 27, zabal: 22, poniente: 44, levante: 40 };
let cacheUnidades: Unidad[] | null = null;
let indice: Map<string, Unidad> | null = null;

function barrioDe(x: number, y: number) {
  let mejor = mapa().barrios[0];
  let d = Infinity;
  for (const b of mapa().barrios) {
    const dd = (b.x - x) ** 2 + (b.y - y) ** 2;
    if (dd < d) (d = dd), (mejor = b);
  }
  return mejor;
}

export function unidades(): Unidad[] {
  if (cacheUnidades) return cacheUnidades;
  const out: Unidad[] = [];
  mapa().edificios.forEach((e, idx) => {
    if (e.tipo !== 0 && e.tipo !== 1) return;
    const huella = e.w * e.d * 4; // m² (1 unidad = 2 m)
    if (huella < 40) return;
    const h = hashTexto(`e${idx}`);
    const b = barrioDe(e.x, e.y);
    const precioM2 = PRECIO_M2[b.id] ?? 30;
    const crear = (n: number, tipo: TipoVivienda, superficie: number, planta: number) => {
      const semilla = hashTexto(`u${idx}-${n}`);
      const estadoBase = 22 + (semilla % 74);
      const sup = Math.round(Math.max(38, Math.min(200, superficie)));
      const dormitorios = sup < 55 ? 1 : sup < 80 ? 2 : sup < 115 ? 3 : 4;
      const precio = Math.round((sup * precioM2 * (0.55 + (estadoBase / 100) * 0.6)) / 10) * 10 + (tipo === "atico" ? 400 : 0);
      out.push({
        id: `u${idx}-${n}`, edificio: idx, tipo, barrio: b.nombre, barrioId: b.id, x: e.x, y: e.y,
        nombre: tipo === "casa" ? `Casa en ${b.nombre}` : tipo === "atico" ? `Ático en ${b.nombre}` : `Piso ${planta}º en ${b.nombre}`,
        superficie: sup, dormitorios, planta, estadoBase, precio, alquiler: Math.max(15, Math.round(precio / 45)), semilla,
      });
    };
    if (e.tipo === 0) {
      const plantas = e.plantas || 1 + (h % 10 < 4 ? 1 : 0);
      crear(0, "casa", huella * 0.85 * Math.min(2, plantas), 0);
    } else {
      const plantas = Math.max(2, e.plantas || 3 + (h % 5));
      const porPlanta = huella > 320 ? 4 : 2;
      let n = 0;
      for (let p = 1; p < plantas; p++) for (let k = 0; k < porPlanta; k++) crear(n++, "piso", (huella * 0.8) / porPlanta, p);
      crear(n, "atico", (huella * 0.7) / 2, plantas);
    }
  });
  cacheUnidades = out;
  indice = new Map(out.map((u) => [u.id, u]));
  return out;
}

/** La Casa de la abuela: instancia propia de cada jugador. */
function unidadAbuela(jugador: string): Unidad {
  const [x, y] = mapa().casaAbuela;
  return {
    id: `abuela:${jugador}`, edificio: -1, tipo: "casa", nombre: "Casa de la abuela", barrio: "San Bernardo", barrioId: "sanBernardo",
    x, y, superficie: 84, dormitorios: 2, planta: 0, estadoBase: 34, precio: 0, alquiler: 0, semilla: 77123,
  };
}

export function unidad(id: string): Unidad {
  if (id.startsWith("abuela:")) return unidadAbuela(id.slice(7));
  unidades();
  return indice!.get(id) ?? fallo("vivienda", "Vivienda inexistente.");
}

/* ── Interiores ───────────────────────────────────────────────────── */

const NOMBRES_MUEBLES_INICIALES: Record<string, string[]> = {
  salon: ["sofa", "mesaCentro", "muebleTele", "estanteria", "sillon"],
  cocina: ["cocina", "frigorifico", "mesaComedor", "silla", "silla"],
  dormitorio: ["camaDoble", "armario", "mesitaNoche"],
  bano: ["lavabo", "inodoro", "ducha"],
  estudio: ["escritorio", "sillaOficina", "estanteria"],
};

/** Plano y estado inicial de una vivienda, según su estado de conservación. */
export function crearInterior(u: Unidad): InteriorDoc {
  const r = azar(u.semilla);
  const plano = generarPlano(u.semilla, u.superficie, u.dormitorios, u.tipo);
  const deterioro = (100 - u.estadoBase) / 100;
  const doc: InteriorDoc = {
    v: 1, unidad: u.id, plano, pintura: {}, pinturaVieja: {}, suelo: {}, sueloRoto: {}, muebles: [], manchas: [], basura: [], grietas: [],
    electricidad: { semilla: u.semilla + 11, resuelto: u.estadoBase > 70 },
    fontaneria: { semilla: u.semilla + 23, resuelto: u.estadoBase > 60 },
    jardin: [], hechas: {},
  };
  let n = 0;
  const uid = () => `m${(n++).toString(36)}`;
  for (const h of plano.habitaciones) {
    const exterior = h.tipo === "patio" || h.tipo === "terraza";
    doc.pintura[h.id] = exterior ? "#FBFAF6" : ["#F2EBDD", "#E9E2D3", "#EFE6D2", "#E6E0D8"][Math.floor(r() * 4)];
    doc.pinturaVieja[h.id] = !exterior && r() < deterioro * 1.2;
    doc.suelo[h.id] = exterior ? (h.tipo === "patio" ? "barro" : "terrazo") : h.tipo === "bano" || h.tipo === "cocina" ? "hidraulico" : r() < 0.5 ? "terrazo" : "barro";
    doc.sueloRoto[h.id] = !exterior && r() < deterioro * 0.6;
    // Muebles de partida: los de una casa vieja; algunos rotos (trastos).
    if (!exterior) {
      for (const tipo of NOMBRES_MUEBLES_INICIALES[h.tipo] ?? []) {
        if (r() < 0.25) continue;
        const def = MUEBLES[tipo];
        for (let intento = 0; intento < 25; intento++) {
          const rot = Math.floor(r() * 4);
          const [w, d] = rot % 2 ? [def.d, def.w] : [def.w, def.d];
          const x = h.x0 * 2 + Math.floor(r() * Math.max(1, (h.x1 - h.x0) * 2 - w + 1));
          const z = h.z0 * 2 + Math.floor(r() * Math.max(1, (h.z1 - h.z0) * 2 - d + 1));
          const m: MuebleColocado = { uid: uid(), tipo, x, z, rot, color: def.colores[Math.floor(r() * def.colores.length)], roto: r() < deterioro * 0.7 };
          if (!errorColocacion(doc, m)) {
            doc.muebles.push(m);
            break;
          }
        }
      }
    }
    // Suciedad, basura y grietas.
    const area = (h.x1 - h.x0) * (h.z1 - h.z0);
    const nm = Math.round(area * deterioro * 0.35);
    for (let i = 0; i < nm; i++) doc.manchas.push({ id: `s${doc.manchas.length}`, x: h.x0 + 0.4 + r() * (h.x1 - h.x0 - 0.8), z: h.z0 + 0.4 + r() * (h.z1 - h.z0 - 0.8), r: 0.3 + r() * 0.35 });
    const nb = Math.round(area * deterioro * 0.18);
    for (let i = 0; i < nb; i++) doc.basura.push({ id: `b${doc.basura.length}`, x: h.x0 + 0.3 + r() * (h.x1 - h.x0 - 0.6), z: h.z0 + 0.3 + r() * (h.z1 - h.z0 - 0.6), tipo: Math.floor(r() * 4) });
    if (!exterior && r() < deterioro * 1.3) {
      const lado = (["n", "s", "e", "o"] as const)[Math.floor(r() * 4)];
      const largo = lado === "n" || lado === "s" ? h.x1 - h.x0 : h.z1 - h.z0;
      const u0 = 0.4 + r() * Math.max(0.2, largo - 1.6);
      // Grieta en zigzag (coordenadas en la pared: u a lo largo, v en altura).
      const puntos: [number, number][] = [];
      let uu = u0;
      let vv = 0.4 + r() * 0.6;
      for (let k = 0; k < 7; k++) {
        puntos.push([Math.round(uu * 100) / 100, Math.round(vv * 100) / 100]);
        uu += 0.12 + r() * 0.14;
        vv += 0.14 + (r() - 0.3) * 0.12;
      }
      doc.grietas.push({ id: `g${doc.grietas.length}`, hab: h.id, lado, u: u0, puntos });
    }
    if (h.tipo === "patio" || h.tipo === "terraza") {
      // Arriates del patio: casillas de tierra a lo largo de las tapias.
      for (let x = h.x0; x < h.x1; x++) {
        doc.jardin.push({ x, z: h.z1 - 1, planta: null, plantado: 0, regado: 0, mala: r() < deterioro });
      }
    }
  }
  return doc;
}

/** Estado de conservación actual (0-100) según lo que queda por reformar. */
export function estadoDe(doc: InteriorDoc) {
  const trastos = doc.muebles.filter((m) => m.roto).length;
  const vieja = Object.values(doc.pinturaVieja).filter(Boolean).length;
  const roto = Object.values(doc.sueloRoto).filter(Boolean).length;
  const malas = doc.jardin.filter((j) => j.mala).length;
  const p = doc.manchas.length * 1.5 + doc.basura.length * 1.5 + doc.grietas.length * 6 + trastos * 4 + vieja * 5 + roto * 6 + malas * 1 + (doc.electricidad.resuelto ? 0 : 10) + (doc.fontaneria.resuelto ? 0 : 8);
  return Math.max(5, Math.min(100, Math.round(100 - p)));
}

/** Huella (medias celdas) de un mueble girado. */
export function huella(m: { tipo: string; x: number; z: number; rot: number }) {
  const def = MUEBLES[m.tipo];
  const [w, d] = m.rot % 2 ? [def.d, def.w] : [def.w, def.d];
  return { x0: m.x, z0: m.z, x1: m.x + w, z1: m.z + d };
}
const solapan = (a: ReturnType<typeof huella>, b: ReturnType<typeof huella>) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

/** Devuelve el motivo por el que no se puede colocar (o null si se puede). */
export function errorColocacion(doc: InteriorDoc, m: MuebleColocado, ignorar?: string) {
  const def = MUEBLES[m.tipo];
  if (!def) return "Mueble desconocido.";
  if (![0, 1, 2, 3].includes(m.rot) || !Number.isInteger(m.x) || !Number.isInteger(m.z)) return "Posición no válida.";
  const f = huella(m);
  // Todo dentro de una sola habitación.
  const hab = habitacionEn(doc.plano, Math.floor(f.x0 / 2), Math.floor(f.z0 / 2));
  if (!hab) return "Fuera de la vivienda.";
  if (f.x0 < hab.x0 * 2 || f.z0 < hab.z0 * 2 || f.x1 > hab.x1 * 2 || f.z1 > hab.z1 * 2) return "Tiene que caber entero en una habitación.";
  const otros = doc.muebles.filter((o) => o.uid !== ignorar && o.uid !== m.uid);
  if (def.capa === "suelo") {
    const libre = pasoLibre(doc.plano);
    for (let x = f.x0; x < f.x1; x++) for (let z = f.z0; z < f.z1; z++) if (libre.has(`${x},${z}`)) return "Taparía una puerta.";
    if (otros.some((o) => MUEBLES[o.tipo].capa === "suelo" && solapan(f, huella(o)))) return "Choca con otro mueble.";
  } else if (def.capa === "alfombra") {
    if (otros.some((o) => MUEBLES[o.tipo].capa === "alfombra" && solapan(f, huella(o)))) return "Ya hay una alfombra ahí.";
  } else if (def.capa === "pared") {
    const pegado = f.x0 === hab.x0 * 2 || f.z0 === hab.z0 * 2 || f.x1 === hab.x1 * 2 || f.z1 === hab.z1 * 2;
    if (!pegado) return "Tiene que ir contra una pared.";
    if (otros.some((o) => MUEBLES[o.tipo].capa === "pared" && solapan(f, huella(o)))) return "Ya hay algo colgado ahí.";
  } else if (def.capa === "encima") {
    const base = otros.find((o) => MUEBLES[o.tipo].superficie && (() => {
      const b = huella(o);
      return f.x0 >= b.x0 && f.z0 >= b.z0 && f.x1 <= b.x1 && f.z1 <= b.z1;
    })());
    if (!base) return "Tiene que ir encima de una mesa o un mueble.";
    if (otros.some((o) => MUEBLES[o.tipo].capa === "encima" && solapan(f, huella(o)))) return "Ya hay algo encima.";
  }
  return null;
}

/** Puzle que ve el jugador (sin la solución). */
export function puzleVisible(p: Puzle) {
  return { ancho: p.ancho, alto: p.alto, origen: p.origen, destinos: p.destinos, piezas: p.piezas.map((m, i) => girar(m, -p.giros[i])) };
}
export const puzleDe = (doc: InteriorDoc, tipo: "electricidad" | "fontaneria") =>
  tipo === "electricidad" ? generarPuzle(doc.electricidad.semilla, 5, 5, 3) : generarPuzle(doc.fontaneria.semilla, 6, 5, 2);

/** Pasos de montaje: piezas y orden obligatorio (cada pieza exige las anteriores de su lista). */
export const MONTAJE: Record<string, { piezas: string[]; requiere: Record<string, string[]> }> = {
  _general: {
    piezas: ["base", "lateralI", "lateralD", "trasera", "estante", "techo", "puertas", "tiradores"],
    requiere: { lateralI: ["base"], lateralD: ["base"], trasera: ["lateralI", "lateralD"], estante: ["lateralI", "lateralD"], techo: ["trasera"], puertas: ["techo"], tiradores: ["puertas"] },
  },
  _mesa: {
    piezas: ["tablero", "pata1", "pata2", "pata3", "pata4", "travesano"],
    requiere: { pata1: ["tablero"], pata2: ["tablero"], pata3: ["tablero"], pata4: ["tablero"], travesano: ["pata1", "pata2", "pata3", "pata4"] },
  },
  _cama: {
    piezas: ["patas", "laterales", "somier", "cabecero", "colchon"],
    requiere: { laterales: ["patas"], somier: ["laterales"], cabecero: ["laterales"], colchon: ["somier"] },
  },
};
export const montajeDe = (tipo: string) =>
  tipo.startsWith("cama") ? MONTAJE._cama : ["mesaCentro", "mesaComedor", "escritorio", "mesaPatio", "mesitaNoche"].includes(tipo) ? MONTAJE._mesa : MONTAJE._general;

export function ordenValido(tipo: string, orden: unknown) {
  const m = montajeDe(tipo);
  if (!Array.isArray(orden) || orden.length !== m.piezas.length) return false;
  const puestas = new Set<string>();
  for (const p of orden) {
    if (typeof p !== "string" || !m.piezas.includes(p) || puestas.has(p)) return false;
    if ((m.requiere[p] ?? []).some((q) => !puestas.has(q))) return false;
    puestas.add(p);
  }
  return true;
}

/* ── Módulo ───────────────────────────────────────────────────────── */

interface Encargo {
  inmueble: string;
  propietario: string;
  tareas: string[];
  pago: number;
  estado: "abierto" | "aceptado" | "completado" | "cancelado";
  reformista: string | null;
  t: number;
}

definirModulo((s: Servicio) => {
  const bd = s.bd;
  const bloqueos = new Map<string, { jugador: string; hasta: number }>();
  const visitasVenta = new Set<string>();

  const titularidad = (id: string) => bd.leer<Titularidad>("inmuebles", id);

  /** Rol del jugador en la vivienda. */
  function rol(id: string, jugador: string): "titular" | "conviviente" | "ayudante" | "invitado" | "visita" | null {
    if (id.startsWith("abuela:")) {
      if (id === `abuela:${jugador}`) return "titular";
    }
    const t = id.startsWith("abuela:") ? bd.leer<Titularidad>("inmuebles", id) : titularidad(id);
    if (t) {
      if (t.titular === jugador) return "titular";
      if (t.roles[jugador]) return t.roles[jugador];
      if ((t.invitados[jugador] ?? 0) > Date.now()) return "invitado";
      if (t.enVenta) return "visita";
      return null;
    }
    // Sin dueño: cualquiera puede visitarla antes de comprar (sin tocar nada).
    return id.startsWith("abuela:") ? null : "visita";
  }

  function interior(id: string): InteriorDoc {
    let doc = bd.leer<InteriorDoc>("interiores", id);
    if (!doc) {
      doc = crearInterior(unidad(id));
      bd.escribir("interiores", id, doc);
    }
    return doc;
  }

  function guardarInterior(id: string, doc: InteriorDoc, extra: Extra | null, cambio: string) {
    doc.v++;
    bd.escribir("interiores", id, doc);
    extra?.aviso({ t: "interior", id, v: doc.v, cambio, interior: publicoInterior(doc) });
  }

  function publicoInterior(doc: InteriorDoc) {
    // Las semillas de los puzles no salen del servidor (la solución se deduce de ellas).
    return { ...doc, electricidad: { resuelto: doc.electricidad.resuelto }, fontaneria: { resuelto: doc.fontaneria.resuelto }, estado: estadoDe(doc) };
  }

  const exigir = (id: string, jugador: string, nivel: "ver" | "reformar" | "editar") => {
    const r = rol(id, jugador);
    const ok = nivel === "ver" ? !!r : nivel === "reformar" ? r === "titular" || r === "conviviente" || r === "ayudante" : r === "titular" || r === "conviviente";
    if (!ok) fallo("permiso", nivel === "ver" ? "No tienes permiso para entrar en esta vivienda." : "No tienes permiso para hacer cambios en esta vivienda.");
    return r!;
  };

  const yo = (ctx: Contexto) => s.yo(ctx);
  const ganarXP = (jugador: string, n: number) => {
    const j = s.jugador(jugador);
    j.xp += n;
    j.nivel = nivelDe(j.xp);
    bd.escribir("jugadores", jugador, j);
    s.avisar(jugador, { t: "xp", xp: j.xp, ganada: n });
  };

  /** Cobra los alquileres vencidos; si no hay saldo, termina el contrato. */
  function alquileres(jugador: string) {
    const ahora = Date.now();
    for (const t of bd.listar<Titularidad>("inmuebles", (x) => x.modo === "alquiler" && x.titular === jugador)) {
      let pagado = t.pagadoHasta ?? ahora;
      try {
        bd.transaccion(() => {
          while (pagado < ahora) {
            s.mover(jugador, -(t.renta ?? 0), "alquiler", `Alquiler semanal: ${unidad(t.id).nombre}`);
            pagado += SEMANA;
          }
          bd.escribir("inmuebles", t.id, { ...t, id: undefined, pagadoHasta: pagado });
        });
      } catch {
        bd.borrar("inmuebles", t.id);
        bd.escribir("contratos", s.nuevoId("c"), { tipo: "fin-alquiler", inmueble: t.id, jugador, t: ahora, motivo: "impago" });
        s.avisar(jugador, { t: "aviso", texto: `Se ha terminado tu alquiler de ${unidad(t.id).nombre} por falta de pago.` });
      }
    }
  }

  const ficha = (u: Unidad, jugador: string) => {
    const t = titularidad(u.id);
    const doc = bd.leer<InteriorDoc>("interiores", u.id);
    const estado = doc ? estadoDe(doc) : u.estadoBase;
    const valor = Math.round((u.precio * (0.55 + (estado / 100) * 0.6)) / (0.55 + (u.estadoBase / 100) * 0.6) / 10) * 10;
    return {
      ...u, estado, valor,
      situacion: !t ? "libre" : t.titular === jugador ? "tuya" : t.enVenta ? "en venta" : t.modo === "alquiler" ? "alquilada" : "vendida",
      precioVenta: t?.enVenta ?? null,
      modo: t?.titular === jugador ? t.modo : null,
      rol: rol(u.id, jugador),
    };
  };

  function cambiarMueble(ctx: Contexto, args: Record<string, unknown>, extra: Extra, fn: (doc: InteriorDoc, jugador: string) => string) {
    const jugador = yo(ctx);
    const id = String(args.id ?? "");
    exigir(id, jugador, "editar");
    return bd.transaccion(() => {
      const doc = interior(id);
      const cambio = fn(doc, jugador);
      guardarInterior(id, doc, extra, cambio);
      return { v: doc.v, interior: publicoInterior(doc) };
    });
  }

  const inventario = (jugador: string) => bd.leer<Record<string, number>>("inventarios", jugador) ?? {};
  const sumarInv = (jugador: string, clave: string, n: number) => {
    const inv = inventario(jugador);
    const v = (inv[clave] ?? 0) + n;
    if (v < 0) fallo("inventario", "No lo tienes en el inventario.");
    if (v === 0) delete inv[clave];
    else inv[clave] = v;
    bd.escribir("inventarios", jugador, inv);
  };

  const libreBloqueo = (uid: string, jugador: string) => {
    const b = bloqueos.get(uid);
    if (b && b.jugador !== jugador && b.hasta > Date.now()) fallo("bloqueado", "Otro jugador está moviendo ese mueble.");
  };

  /** Recompensa por una tarea de reforma: XP siempre; en casa ajena con encargo cobra el encargo al final. */
  const reformado = (doc: InteriorDoc, jugador: string, tarea: string, xp: number) => {
    doc.hechas[tarea] = (doc.hechas[tarea] ?? 0) + 1;
    ganarXP(jugador, xp);
  };

  const ops = {
    hogarCatalogo(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      let lista = unidades();
      if (typeof a.edificio === "number") lista = lista.filter((u) => u.edificio === a.edificio);
      if (a.barrio) lista = lista.filter((u) => u.barrioId === a.barrio);
      if (a.tipo) lista = lista.filter((u) => u.tipo === a.tipo);
      if (typeof a.precioMax === "number") lista = lista.filter((u) => u.precio <= Number(a.precioMax));
      if (typeof a.dormMin === "number") lista = lista.filter((u) => u.dormitorios >= Number(a.dormMin));
      // Solo las disponibles (libres o en venta por otro jugador) salvo en la vista de un edificio.
      const ocupadas = new Map(bd.listar<Titularidad>("inmuebles").map((t) => [t.id, t]));
      if (typeof a.edificio !== "number") lista = lista.filter((u) => !ocupadas.has(u.id) || ocupadas.get(u.id)!.enVenta);
      const cerca = a.cerca as [number, number] | undefined;
      const orden = String(a.orden ?? "precio");
      lista = [...lista].sort((x, y) =>
        orden === "cerca" && cerca ? Math.hypot(x.x - cerca[0], x.y - cerca[1]) - Math.hypot(y.x - cerca[0], y.y - cerca[1])
        : orden === "superficie" ? y.superficie - x.superficie
        : orden === "estado" ? y.estadoBase - x.estadoBase
        : x.precio - y.precio);
      const pagina = Math.max(0, Number(a.pagina) || 0);
      return { total: lista.length, lista: lista.slice(pagina * 20, pagina * 20 + 20).map((u) => ficha(u, jugador)) };
    },

    hogarFicha(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const u = unidad(String(a.id ?? ""));
      const doc = bd.leer<InteriorDoc>("interiores", u.id) ?? crearInterior(u);
      const t = titularidad(u.id);
      return {
        ...ficha(u, jugador),
        habitaciones: doc.plano.habitaciones.map((h) => ({ nombre: h.nombre, tipo: h.tipo, m2: (h.x1 - h.x0) * (h.z1 - h.z0) })),
        incluye: doc.muebles.filter((m) => !m.roto).map((m) => MUEBLES[m.tipo]?.nombre ?? m.tipo),
        inspeccion: {
          manchas: doc.manchas.length, basura: doc.basura.length, grietas: doc.grietas.length, trastos: doc.muebles.filter((m) => m.roto).length,
          pinturaVieja: Object.values(doc.pinturaVieja).filter(Boolean).length, sueloRoto: Object.values(doc.sueloRoto).filter(Boolean).length,
          electricidad: doc.electricidad.resuelto, fontaneria: doc.fontaneria.resuelto,
        },
        materiales: Object.entries(doc.suelo).map(([h, m]) => `${doc.plano.habitaciones.find((x) => x.id === h)?.nombre}: ${SUELOS[m]?.nombre ?? m}`),
        permisos: t && t.titular === jugador ? { roles: Object.entries(t.roles).map(([id, r]) => ({ id, nombre: s.perfil(id).nombre, rol: r })) } : null,
      };
    },

    /** Compra atómica: cobra, registra la titularidad y el contrato. */
    hogarComprar(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const u = unidad(String(a.id ?? ""));
      if (u.id.startsWith("abuela:")) fallo("vivienda", "Esta casa ya es tuya.");
      return bd.transaccion(() => {
        const t = titularidad(u.id);
        if (t && !t.enVenta) fallo("ocupada", "Esta vivienda ya no está disponible.");
        if (t?.titular === jugador) fallo("ocupada", "Ya es tuya.");
        const precio = t?.enVenta ?? u.precio;
        const dinero = s.mover(jugador, -precio, "vivienda", `Compra: ${u.nombre}`);
        if (t) {
          // Compraventa entre jugadores: el vendedor cobra en la misma transacción.
          s.mover(t.titular, precio, "vivienda", `Venta: ${u.nombre}`);
          s.avisar(t.titular, { t: "aviso", texto: `Has vendido ${u.nombre} por ${precio} €.` });
        }
        bd.escribir<Titularidad>("inmuebles", u.id, { modo: "propiedad", titular: jugador, desde: Date.now(), precio, enVenta: null, roles: {}, invitados: {} });
        bd.escribir("contratos", s.nuevoId("c"), { tipo: "compraventa", inmueble: u.id, comprador: jugador, vendedor: t?.titular ?? "banco", precio, t: Date.now() });
        interior(u.id);
        ganarXP(jugador, 25);
        return { dinero, id: u.id };
      });
    },

    hogarAlquilar(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const u = unidad(String(a.id ?? ""));
      if (u.id.startsWith("abuela:")) fallo("vivienda", "Esta casa ya es tuya.");
      return bd.transaccion(() => {
        if (titularidad(u.id)) fallo("ocupada", "Esta vivienda no se alquila ahora.");
        // Fianza (una semana) + primera semana.
        const dinero = s.mover(jugador, -u.alquiler * 2, "alquiler", `Fianza y primera semana: ${u.nombre}`);
        bd.escribir<Titularidad>("inmuebles", u.id, { modo: "alquiler", titular: jugador, desde: Date.now(), precio: 0, renta: u.alquiler, pagadoHasta: Date.now() + SEMANA, enVenta: null, roles: {}, invitados: {} });
        bd.escribir("contratos", s.nuevoId("c"), { tipo: "alquiler", inmueble: u.id, inquilino: jugador, renta: u.alquiler, t: Date.now() });
        interior(u.id);
        return { dinero, id: u.id };
      });
    },

    /** Venta inmediata al banco: el valor depende del estado (las reformas suben el precio). */
    hogarVenderBanco(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const u = unidad(String(a.id ?? ""));
      return bd.transaccion(() => {
        const t = titularidad(u.id);
        if (!t || t.titular !== jugador) fallo("permiso", "No es tuya.");
        if (t!.modo === "alquiler") {
          // Dejar un alquiler: se devuelve la fianza.
          bd.borrar("inmuebles", u.id);
          const dinero = s.mover(jugador, t!.renta ?? 0, "alquiler", `Devolución de fianza: ${u.nombre}`);
          return { dinero };
        }
        const f = ficha(u, jugador);
        const precio = Math.round(f.valor * 0.9);
        bd.borrar("inmuebles", u.id);
        bd.escribir("contratos", s.nuevoId("c"), { tipo: "venta-banco", inmueble: u.id, vendedor: jugador, precio, t: Date.now() });
        const j = s.jugador(jugador) as unknown as { residencia?: string };
        if (j.residencia === u.id) {
          j.residencia = `abuela:${jugador}`;
          bd.escribir("jugadores", jugador, j);
        }
        return { dinero: s.mover(jugador, precio, "vivienda", `Venta al banco: ${u.nombre}`) };
      });
    },

    hogarPonerEnVenta(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      const precio = Math.round(Number(a.precio));
      if (!(precio >= 100 && precio <= 200000)) fallo("precio", "Precio no válido.");
      const t = titularidad(id);
      if (!t || t.titular !== jugador || t.modo !== "propiedad") fallo("permiso", "No es tuya.");
      bd.escribir("inmuebles", id, { ...t, id: undefined, enVenta: precio });
      return { ok: true };
    },

    hogarQuitarVenta(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      const t = titularidad(id);
      if (!t || t.titular !== jugador) fallo("permiso", "No es tuya.");
      bd.escribir("inmuebles", id, { ...t, id: undefined, enVenta: null });
      return { ok: true };
    },

    hogarMias(ctx: Contexto) {
      const jugador = yo(ctx);
      alquileres(jugador);
      const j = s.jugador(jugador) as unknown as { residencia?: string };
      const propias = bd.listar<Titularidad>("inmuebles", (t) => t.titular === jugador).map((t) => ({ ...ficha(unidad(t.id), jugador), modo: t.modo, renta: t.renta, pagadoHasta: t.pagadoHasta, enVenta: t.enVenta }));
      const compartidas = bd.listar<Titularidad>("inmuebles", (t) => !!t.roles[jugador]).map((t) => ({ ...ficha(unidad(t.id), jugador), compartida: t.roles[jugador], titularNombre: s.perfil(t.titular).nombre }));
      const abuela = ficha(unidadAbuela(jugador), jugador);
      return { residencia: j.residencia ?? `abuela:${jugador}`, viviendas: [abuela, ...propias], compartidas };
    },

    hogarMudarse(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      if (rol(id, jugador) !== "titular" && rol(id, jugador) !== "conviviente") fallo("permiso", "Solo puedes vivir en una casa tuya o compartida.");
      const j = s.jugador(jugador) as unknown as Record<string, unknown>;
      j.residencia = id;
      bd.escribir("jugadores", jugador, j);
      return { residencia: id };
    },

    /** Llaves: conviviente (edita y reforma), ayudante (solo reforma) o quitar. */
    hogarPermiso(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      const otro = String(a.jugador ?? "");
      s.jugador(otro);
      const doc = id.startsWith("abuela:") ? null : titularidad(id);
      if (id.startsWith("abuela:") ? id !== `abuela:${jugador}` : !doc || doc.titular !== jugador) fallo("permiso", "Solo el titular da llaves.");
      const t: Titularidad = doc ?? bd.leer<Titularidad>("inmuebles", id) ?? { modo: "propiedad", titular: jugador, desde: Date.now(), precio: 0, roles: {}, invitados: {} };
      if (a.rol === "conviviente" || a.rol === "ayudante") t.roles[otro] = a.rol;
      else delete t.roles[otro];
      bd.escribir("inmuebles", id, { ...t, id: undefined });
      s.avisar(otro, { t: "aviso", texto: a.rol ? `Te han dado llave (${a.rol}) de una vivienda.` : "Te han retirado una llave." });
      return { ok: true };
    },

    hogarExpulsar(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      const otro = String(a.jugador ?? "");
      if (rol(id, jugador) !== "titular") fallo("permiso", "Solo el titular puede echar a alguien.");
      const t = bd.leer<Titularidad>("inmuebles", id);
      if (t) {
        delete t.invitados[otro];
        delete t.roles[otro];
        bd.escribir("inmuebles", id, { ...t, id: undefined });
      }
      if (a.bloquear) s.bloquear(ctx, { a: otro });
      s.avisar(otro, { t: "expulsado", escena: `casa:${id}` });
      return { ok: true };
    },

    hogarInterior(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      const r = exigir(id, jugador, "ver");
      alquileres(jugador);
      return { interior: publicoInterior(interior(id)), rol: r, unidad: unidad(id) };
    },

    hogarInventario(ctx: Contexto) {
      return inventario(yo(ctx));
    },

    hogarComprarMueble(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const tipo = String(a.tipo ?? "");
      const def = MUEBLES[tipo] ?? fallo("mueble", "No está en el catálogo.");
      const caja = !!a.caja && !!def.montable;
      const n = Math.max(1, Math.min(10, Math.round(Number(a.cantidad) || 1)));
      return bd.transaccion(() => {
        const dinero = s.mover(jugador, -(caja ? precioCaja(tipo) : def.precio) * n, "muebles", `${n} × ${def.nombre}${caja ? " (en caja)" : ""}`);
        sumarInv(jugador, caja ? `caja:${tipo}` : `mueble:${tipo}`, n);
        return { dinero, inventario: inventario(jugador) };
      });
    },

    hogarComprarMaterial(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const tipo = String(a.tipo ?? "");
      const id = String(a.id ?? "");
      return bd.transaccion(() => {
        let precio = 0;
        let clave = "";
        if (tipo === "pintura") {
          if (!PINTURAS[String(a.color)]) fallo("material", "Color desconocido.");
          precio = PRECIO_PINTURA;
          clave = `pintura:${a.color}`;
        } else if (tipo === "suelo") {
          const m = SUELOS[String(a.material)] ?? fallo("material", "Suelo desconocido.");
          const doc = interior(id);
          const h = doc.plano.habitaciones.find((x) => x.id === a.hab) ?? fallo("material", "Habitación desconocida.");
          precio = m.precioM2 * (h.x1 - h.x0) * (h.z1 - h.z0);
          clave = `suelo:${a.material}:${(h.x1 - h.x0) * (h.z1 - h.z0)}`;
        } else if (tipo === "planta") {
          const p = PLANTAS_JARDIN[String(a.planta)] ?? fallo("material", "Planta desconocida.");
          precio = p.precio;
          clave = `planta:${a.planta}`;
        } else fallo("material", "Material desconocido.");
        const dinero = s.mover(jugador, -precio, "materiales", clave);
        sumarInv(jugador, clave, 1);
        return { dinero, inventario: inventario(jugador) };
      });
    },

    hogarVenderMueble(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const tipo = String(a.tipo ?? "");
      if (!MUEBLES[tipo]) fallo("mueble", "Mueble desconocido.");
      return bd.transaccion(() => {
        sumarInv(jugador, `mueble:${tipo}`, -1);
        return { dinero: s.mover(jugador, precioReventa(tipo), "muebles", `Venta de ${MUEBLES[tipo].nombre}`), inventario: inventario(jugador) };
      });
    },

    /** Coloca un mueble del inventario (o lo compra al vuelo si `comprar`). */
    hogarColocar(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const tipo = String(a.tipo ?? "");
      const def = MUEBLES[tipo] ?? fallo("mueble", "Mueble desconocido.");
      const color = def.colores.includes(String(a.color)) ? String(a.color) : def.colores[0];
      return cambiarMueble(ctx, a, extra, (doc, jugador) => {
        const m: MuebleColocado = { uid: s.nuevoId("m"), tipo, x: Math.round(Number(a.x)), z: Math.round(Number(a.z)), rot: Math.round(Number(a.rot)) & 3, color };
        const err = errorColocacion(doc, m);
        if (err) fallo("colocacion", err);
        const inv = inventario(jugador);
        if ((inv[`mueble:${tipo}`] ?? 0) > 0) sumarInv(jugador, `mueble:${tipo}`, -1);
        else if (a.comprar) s.mover(jugador, -def.precio, "muebles", `${def.nombre} (colocado)`);
        else fallo("inventario", "No tienes ese mueble. Cómpralo en la tienda.");
        doc.muebles.push(m);
        if (def.categoria === "Decoración" || def.categoria === "Iluminación" || def.categoria === "Patio") {
          // Decoración libre: XP por los primeros adornos de cada casa.
          doc.hechas.decoracion = (doc.hechas.decoracion ?? 0) + 1;
          if (doc.hechas.decoracion <= 12) ganarXP(jugador, 2);
        }
        return `colocar:${m.uid}`;
      });
    },

    hogarMover(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      return cambiarMueble(ctx, a, extra, (doc, jugador) => {
        const m = doc.muebles.find((x) => x.uid === a.uid) ?? fallo("mueble", "Ese mueble ya no está.");
        libreBloqueo(m.uid, jugador);
        const nuevo = { ...m, x: Math.round(Number(a.x)), z: Math.round(Number(a.z)), rot: Math.round(Number(a.rot)) & 3 };
        const err = errorColocacion(doc, nuevo, m.uid);
        if (err) fallo("colocacion", err);
        Object.assign(m, nuevo);
        bloqueos.delete(m.uid);
        return `mover:${m.uid}`;
      });
    },

    hogarColor(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      return cambiarMueble(ctx, a, extra, (doc) => {
        const m = doc.muebles.find((x) => x.uid === a.uid) ?? fallo("mueble", "Ese mueble ya no está.");
        if (!MUEBLES[m.tipo].colores.includes(String(a.color))) fallo("color", "Color no disponible para ese mueble.");
        m.color = String(a.color);
        return `color:${m.uid}`;
      });
    },

    /** Retira un mueble al inventario (los rotos van al contenedor). */
    hogarRetirar(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      return cambiarMueble(ctx, a, extra, (doc, jugador) => {
        const i = doc.muebles.findIndex((x) => x.uid === a.uid);
        if (i < 0) fallo("mueble", "Ese mueble ya no está.");
        const m = doc.muebles[i];
        libreBloqueo(m.uid, jugador);
        // Lo que estaba encima vuelve también al inventario.
        const f = huella(m);
        const encima = MUEBLES[m.tipo].superficie ? doc.muebles.filter((o) => MUEBLES[o.tipo].capa === "encima" && (() => { const b = huella(o); return b.x0 >= f.x0 && b.z0 >= f.z0 && b.x1 <= f.x1 && b.z1 <= f.z1; })()) : [];
        doc.muebles = doc.muebles.filter((o) => o !== m && !encima.includes(o));
        for (const o of [m, ...encima]) if (!o.roto) sumarInv(jugador, `mueble:${o.tipo}`, 1);
        return `retirar:${m.uid}`;
      });
    },

    /** Bloqueo de edición mientras un jugador arrastra un mueble (cooperativo). */
    hogarBloquear(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      exigir(String(a.id ?? ""), jugador, "editar");
      const uid = String(a.uid ?? "");
      libreBloqueo(uid, jugador);
      if (a.soltar) bloqueos.delete(uid);
      else bloqueos.set(uid, { jugador, hasta: Date.now() + 15000 });
      extra.aviso({ t: "bloqueo", id: a.id, uid, jugador: a.soltar ? null : jugador });
      return { ok: true };
    },

    /** Usar un mueble: dormir, descansar, cocinar, ducharse, guardar, ordenador… */
    hogarUsar(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      const r = exigir(id, jugador, "ver");
      const doc = interior(id);
      const m = doc.muebles.find((x) => x.uid === a.uid) ?? fallo("mueble", "Ese mueble ya no está.");
      if (m.roto) fallo("roto", "Está roto: retíralo o cámbialo.");
      const f = MUEBLES[m.tipo].funcion;
      if (f === "dormir" && r !== "titular" && r !== "conviviente") fallo("permiso", "Solo puedes dormir en tu casa.");
      if ((f === "ducharse" || f === "asearse") && !doc.fontaneria.resuelto) fallo("averia", "No sale agua: hay que arreglar la fontanería.");
      if ((f === "tele" || f === "ordenador" || f === "luz" || f === "cocinar") && !doc.electricidad.resuelto) fallo("averia", "No hay luz: hay que arreglar la electricidad.");
      extra.aviso({ t: "uso", id, uid: m.uid, jugador, funcion: f });
      return { funcion: f };
    },

    /* ── Reformas ──────────────────────────────────────────────── */

    hogarLimpiar(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      exigir(id, jugador, "reformar");
      return bd.transaccion(() => {
        const doc = interior(id);
        const i = doc.manchas.findIndex((m) => m.id === a.mancha);
        if (i < 0) fallo("hecho", "Ya está limpio.");
        doc.manchas.splice(i, 1);
        reformado(doc, jugador, "limpieza", 1);
        guardarInterior(id, doc, extra, `limpiar:${a.mancha}`);
        return { quedan: doc.manchas.length + doc.basura.length, estado: estadoDe(doc) };
      });
    },

    hogarBasura(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      exigir(id, jugador, "reformar");
      return bd.transaccion(() => {
        const doc = interior(id);
        const i = doc.basura.findIndex((m) => m.id === a.basura);
        if (i < 0) fallo("hecho", "Ya está recogido.");
        doc.basura.splice(i, 1);
        reformado(doc, jugador, "limpieza", 1);
        guardarInterior(id, doc, extra, `basura:${a.basura}`);
        return { quedan: doc.manchas.length + doc.basura.length, estado: estadoDe(doc) };
      });
    },

    /** Saca un trasto roto hasta el contenedor de la puerta. */
    hogarTrasto(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      exigir(id, jugador, "reformar");
      return bd.transaccion(() => {
        const doc = interior(id);
        const m = doc.muebles.find((x) => x.uid === a.uid && x.roto) ?? fallo("hecho", "Ese trasto ya no está.");
        doc.muebles = doc.muebles.filter((x) => x !== m);
        reformado(doc, jugador, "trastos", 3);
        guardarInterior(id, doc, extra, `trasto:${m.uid}`);
        return { estado: estadoDe(doc) };
      });
    },

    /** Grieta reparada con la llana: la precisión del trazo decide si queda bien. */
    hogarGrieta(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      const precision = Number(a.precision);
      exigir(id, jugador, "reformar");
      if (!(precision >= 0.75 && precision <= 1)) fallo("precision", "La masilla no ha cubierto bien la grieta. Vuelve a pasar la llana siguiendo la línea.");
      return bd.transaccion(() => {
        const doc = interior(id);
        const i = doc.grietas.findIndex((g) => g.id === a.grieta);
        if (i < 0) fallo("hecho", "Esa grieta ya está reparada.");
        doc.grietas.splice(i, 1);
        reformado(doc, jugador, "grietas", Math.round(4 + precision * 4));
        guardarInterior(id, doc, extra, `grieta:${a.grieta}`);
        return { estado: estadoDe(doc) };
      });
    },

    /** Pared pintada: exige un bote del color y una cobertura del 95 %. */
    hogarPintar(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      const color = String(a.color ?? "");
      const cobertura = Number(a.cobertura);
      const manchas = Math.max(0, Math.round(Number(a.manchas) || 0));
      exigir(id, jugador, "reformar");
      if (!PINTURAS[color]) fallo("color", "Color desconocido.");
      if (!(cobertura >= 0.95 && cobertura <= 1)) fallo("cobertura", "Quedan zonas sin pintar.");
      return bd.transaccion(() => {
        const doc = interior(id);
        const h = doc.plano.habitaciones.find((x) => x.id === a.hab) ?? fallo("hab", "Habitación desconocida.");
        const inv = inventario(jugador);
        if ((inv[`pintura:${color}`] ?? 0) > 0) sumarInv(jugador, `pintura:${color}`, -1);
        else s.mover(jugador, -PRECIO_PINTURA, "materiales", `Pintura ${PINTURAS[color].nombre}`);
        doc.pintura[h.id] = PINTURAS[color].color;
        doc.pinturaVieja[h.id] = false;
        reformado(doc, jugador, "pintura", Math.max(4, 12 - manchas * 2));
        guardarInterior(id, doc, extra, `pintar:${h.id}`);
        return { estado: estadoDe(doc), manchas };
      });
    },

    /** Suelo nuevo: el cliente ha levantado y colocado todas las baldosas; se cobra el material. */
    hogarSuelo(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      exigir(id, jugador, "reformar");
      const material = String(a.material ?? "");
      const m = SUELOS[material] ?? fallo("material", "Suelo desconocido.");
      return bd.transaccion(() => {
        const doc = interior(id);
        const h = doc.plano.habitaciones.find((x) => x.id === a.hab) ?? fallo("hab", "Habitación desconocida.");
        const area = (h.x1 - h.x0) * (h.z1 - h.z0);
        if (Number(a.colocadas) !== area) fallo("incompleto", "Faltan baldosas por colocar.");
        const clave = `suelo:${material}:${area}`;
        if ((inventario(jugador)[clave] ?? 0) > 0) sumarInv(jugador, clave, -1);
        else s.mover(jugador, -m.precioM2 * area, "materiales", `${m.nombre} (${area} m²)`);
        doc.suelo[h.id] = material;
        doc.sueloRoto[h.id] = false;
        reformado(doc, jugador, "suelo", 10);
        guardarInterior(id, doc, extra, `suelo:${h.id}`);
        return { estado: estadoDe(doc) };
      });
    },

    hogarPuzle(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      exigir(id, jugador, "reformar");
      const tipo = a.tipo === "fontaneria" ? "fontaneria" : "electricidad";
      const doc = interior(id);
      return { resuelto: doc[tipo].resuelto, puzle: puzleVisible(puzleDe(doc, tipo)) };
    },

    /** El servidor comprueba el circuito con los giros del jugador. */
    hogarResolver(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      exigir(id, jugador, "reformar");
      const tipo = a.tipo === "fontaneria" ? "fontaneria" : "electricidad";
      return bd.transaccion(() => {
        const doc = interior(id);
        if (doc[tipo].resuelto) fallo("hecho", "Ya funciona.");
        const r = comprobarPuzle(puzleDe(doc, tipo), a.giros as number[]);
        if (!r.resuelto) return { ...r };
        doc[tipo].resuelto = true;
        reformado(doc, jugador, tipo, 15);
        guardarInterior(id, doc, extra, `${tipo}:ok`);
        return { ...r, estado: estadoDe(doc) };
      });
    },

    /** Montaje de un mueble en caja: el orden de las piezas debe respetar el manual. */
    hogarMontar(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const tipo = String(a.tipo ?? "");
      if (!MUEBLES[tipo]) fallo("mueble", "Mueble desconocido.");
      if (!ordenValido(tipo, a.orden)) fallo("orden", "Ese orden no cuadra con el manual de montaje.");
      return bd.transaccion(() => {
        sumarInv(jugador, `caja:${tipo}`, -1);
        sumarInv(jugador, `mueble:${tipo}`, 1);
        ganarXP(jugador, 6);
        return { inventario: inventario(jugador) };
      });
    },

    /** Jardinería del patio: cavar, arrancar malas hierbas, plantar, regar y recoger. */
    hogarJardin(ctx: Contexto, a: Record<string, unknown>, extra: Extra) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      exigir(id, jugador, "reformar");
      return bd.transaccion(() => {
        const doc = interior(id);
        const c = doc.jardin.find((j) => j.x === Number(a.x) && j.z === Number(a.z)) ?? fallo("jardin", "Ahí no hay arriate.");
        const ahora = Date.now();
        switch (a.accion) {
          case "arrancar":
            if (!c.mala) fallo("jardin", "No hay malas hierbas.");
            c.mala = false;
            reformado(doc, jugador, "jardin", 1);
            break;
          case "cavar":
            if (c.mala) fallo("jardin", "Primero arranca las malas hierbas.");
            if (c.planta) fallo("jardin", "Ya hay una planta.");
            c.cavado = true;
            break;
          case "plantar": {
            const p = String(a.planta ?? "");
            if (!PLANTAS_JARDIN[p]) fallo("jardin", "Planta desconocida.");
            if (!c.cavado) fallo("jardin", "Cava antes la tierra.");
            if ((inventario(jugador)[`planta:${p}`] ?? 0) > 0) sumarInv(jugador, `planta:${p}`, -1);
            else s.mover(jugador, -PLANTAS_JARDIN[p].precio, "materiales", `Planta: ${PLANTAS_JARDIN[p].nombre}`);
            Object.assign(c, { planta: p, plantado: ahora, regado: ahora, cavado: false });
            reformado(doc, jugador, "jardin", 2);
            break;
          }
          case "regar":
            if (!c.planta) fallo("jardin", "No hay nada que regar.");
            c.regado = ahora;
            break;
          case "recoger": {
            if (!c.planta) fallo("jardin", "No hay planta.");
            const p = PLANTAS_JARDIN[c.planta!];
            if (ahora - c.plantado < p.horas * 3600 * 1000) fallo("jardin", "Todavía está creciendo.");
            ganarXP(jugador, 4);
            Object.assign(c, { planta: null, plantado: 0, regado: 0 });
            break;
          }
          default:
            fallo("jardin", "Acción desconocida.");
        }
        guardarInterior(id, doc, extra, `jardin:${c.x},${c.z}`);
        return { estado: estadoDe(doc) };
      });
    },

    /* ── Encargos de reforma entre jugadores (pago en depósito) ── */

    hogarPublicarEncargo(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      const id = String(a.id ?? "");
      if (rol(id, jugador) !== "titular") fallo("permiso", "Solo el titular encarga reformas.");
      const validas = ["limpieza", "trastos", "grietas", "pintura", "suelo", "electricidad", "fontaneria", "jardin"];
      const tareas = (Array.isArray(a.tareas) ? a.tareas : []).map(String).filter((t) => validas.includes(t));
      if (!tareas.length) fallo("tareas", "Elige qué hay que hacer.");
      const pago = Math.round(Number(a.pago));
      if (!(pago >= 10 && pago <= 5000)) fallo("pago", "Pago no válido.");
      return bd.transaccion(() => {
        // El dinero queda en depósito hasta que el trabajo esté comprobado.
        const dinero = s.mover(jugador, -pago, "deposito", `Depósito de encargo: ${unidad(id).nombre}`);
        const eid = s.nuevoId("r");
        bd.escribir<Encargo>("encargos", eid, { inmueble: id, propietario: jugador, tareas, pago, estado: "abierto", reformista: null, t: Date.now() });
        return { id: eid, dinero };
      });
    },

    hogarEncargos(ctx: Contexto) {
      const jugador = yo(ctx);
      return bd.listar<Encargo>("encargos", (e) => e.estado === "abierto" || ((e.estado === "aceptado") && (e.reformista === jugador || e.propietario === jugador)))
        .map((e) => ({ ...e, vivienda: unidad(e.inmueble).nombre, barrio: unidad(e.inmueble).barrio, propietarioNombre: s.perfil(e.propietario).nombre, mio: e.propietario === jugador, aceptadoPorMi: e.reformista === jugador }))
        .sort((x, y) => y.t - x.t)
        .slice(0, 40);
    },

    hogarAceptarEncargo(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      return bd.transaccion(() => {
        const e = bd.leer<Encargo>("encargos", String(a.encargo ?? "")) ?? fallo("encargo", "Encargo no encontrado.");
        if (e.estado !== "abierto") fallo("encargo", "Ya lo ha aceptado otra persona.");
        if (e.propietario === jugador) fallo("encargo", "Es tu propio encargo.");
        e.estado = "aceptado";
        e.reformista = jugador;
        bd.escribir("encargos", String(a.encargo), e);
        // Llave de ayudante mientras dure el encargo.
        const t = bd.leer<Titularidad>("inmuebles", e.inmueble) ?? { modo: "propiedad", titular: e.propietario, desde: Date.now(), precio: 0, roles: {}, invitados: {} };
        t.roles[jugador] = "ayudante";
        bd.escribir("inmuebles", e.inmueble, { ...t, id: undefined });
        s.avisar(e.propietario, { t: "aviso", texto: `${s.perfil(jugador).nombre} ha aceptado tu encargo de reforma.` });
        return { ok: true, inmueble: e.inmueble };
      });
    },

    /** El servidor comprueba en la vivienda que cada tarea esté hecha y paga desde el depósito. */
    hogarCompletarEncargo(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      return bd.transaccion(() => {
        const eid = String(a.encargo ?? "");
        const e = bd.leer<Encargo>("encargos", eid) ?? fallo("encargo", "Encargo no encontrado.");
        if (e.estado !== "aceptado" || e.reformista !== jugador) fallo("encargo", "No es tu encargo.");
        const doc = interior(e.inmueble);
        const pendiente: Record<string, boolean> = {
          limpieza: doc.manchas.length + doc.basura.length > 0,
          trastos: doc.muebles.some((m) => m.roto),
          grietas: doc.grietas.length > 0,
          pintura: Object.values(doc.pinturaVieja).some(Boolean),
          suelo: Object.values(doc.sueloRoto).some(Boolean),
          electricidad: !doc.electricidad.resuelto,
          fontaneria: !doc.fontaneria.resuelto,
          jardin: doc.jardin.some((j) => j.mala),
        };
        const faltan = e.tareas.filter((t) => pendiente[t]);
        if (faltan.length) fallo("incompleto", `Falta: ${faltan.join(", ")}.`);
        e.estado = "completado";
        bd.escribir("encargos", eid, e);
        const t = bd.leer<Titularidad>("inmuebles", e.inmueble);
        if (t?.roles[jugador] === "ayudante") {
          delete t.roles[jugador];
          bd.escribir("inmuebles", e.inmueble, { ...t, id: undefined });
        }
        const dinero = s.mover(jugador, e.pago, "encargo-reforma", `Reforma terminada: ${unidad(e.inmueble).nombre}`);
        ganarXP(jugador, 20);
        s.avisar(e.propietario, { t: "aviso", texto: `${s.perfil(jugador).nombre} ha terminado la reforma. Se le han pagado ${e.pago} € del depósito.` });
        return { dinero };
      });
    },

    hogarCancelarEncargo(ctx: Contexto, a: Record<string, unknown>) {
      const jugador = yo(ctx);
      return bd.transaccion(() => {
        const eid = String(a.encargo ?? "");
        const e = bd.leer<Encargo>("encargos", eid) ?? fallo("encargo", "Encargo no encontrado.");
        if (e.propietario !== jugador) fallo("permiso", "No es tu encargo.");
        if (e.estado === "aceptado" && Date.now() - e.t < 3 * DIA) fallo("encargo", "Ya está aceptado: espera a que lo terminen (o 3 días).");
        if (e.estado !== "abierto" && e.estado !== "aceptado") fallo("encargo", "Ya está cerrado.");
        e.estado = "cancelado";
        bd.escribir("encargos", eid, e);
        return { dinero: s.mover(jugador, e.pago, "deposito", "Devolución de depósito de encargo") };
      });
    },

    hogarCategorias() {
      return CATEGORIAS;
    },
  };

  return {
    ops: ops as unknown as Record<string, (c: Contexto, a: Record<string, unknown>, e: Extra) => unknown>,
    puedeEntrar(jugador: string, escena: string) {
      if (!escena.startsWith("casa:")) fallo("escena", "Escena desconocida.");
      const id = escena.slice(5);
      unidad(id);
      if (!rol(id, jugador)) fallo("permiso", "No tienes permiso para entrar en esta vivienda.");
      visitasVenta.add(id);
    },
    permitirVisita(anfitrion: string, invitado: string, escena: string) {
      if (!escena.startsWith("casa:")) return;
      const id = escena.slice(5);
      const r = rol(id, anfitrion);
      if (r !== "titular" && r !== "conviviente") return;
      const t: Titularidad = bd.leer<Titularidad>("inmuebles", id) ?? { modo: "propiedad", titular: anfitrion, desde: Date.now(), precio: 0, roles: {}, invitados: {} };
      t.invitados[invitado] = Date.now() + DIA;
      bd.escribir("inmuebles", id, { ...t, id: undefined });
    },
    tiempoReal(jugador: string, escena: string, m: Record<string, unknown>, difundir: (ev: Record<string, unknown>) => void) {
      // Trazos de pintura, arrastres y herramientas en directo (no se guardan: lo guardado va por RPC).
      if (!escena.startsWith("casa:")) return;
      const tipo = String(m.que ?? "");
      if (!["trazo", "arrastre", "herramienta", "baldosa"].includes(tipo)) return;
      if (!["titular", "conviviente", "ayudante"].includes(rol(escena.slice(5), jugador) ?? "")) return;
      const texto = JSON.stringify(m);
      if (texto.length > 2000) return;
      difundir({ t: "directo", jugador, ...m });
    },
    desconectado(jugador: string) {
      for (const [uid, b] of bloqueos) if (b.jugador === jugador) bloqueos.delete(uid);
    },
  };
});
