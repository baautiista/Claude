import { Mat, Obra, rgb, type RGB } from "../arquitectura";
import {
  Marco, enMundo, plano, torno, muro, moldura, ventana, balcon, cierro, reja, toldo,
  interiorArista, type Ctx, type P2, type OpVentana,
} from "./piezas";

/**
 * Generador procedural de edificios a partir de datos reales (scripts/sector/generar.py).
 *
 * Las variaciones salen de reglas, no del azar:
 *  - Solo las caras "calle" llevan fachada con huecos; las "medianera" son muros ciegos y las
 *    "patio" tienen ventanas pequeñas sin vuelo.
 *  - Huecos en una rejilla de calles verticales (crujías) que depende del frente y la tipología.
 *  - Planta baja según su uso (comercio, portal, vivienda); toldos solo en comercios a sol (sur u oeste).
 *  - Balcones según tipología y planta (la principal de las casas burguesas los lleva todos);
 *    cierro en la primera planta de las esquinas burguesas.
 *  - Azotea con pretil (y casetón de escalera desde 3 plantas) o tejado a dos aguas en casas bajas.
 * Cada módulo se coloca dentro de su cara y su planta; los que no caben se rechazan y se cuentan.
 */

export type Cara = "calle" | "medianera" | "patio";
export type Tipologia = "casa_baja" | "casa_dos" | "burguesa" | "bloque" | "anexo";

export interface EdificioDatos {
  id: string;
  overture: string;
  osm: string | null;
  fuente: string;
  nombre: string | null;
  huella: P2[];
  caras: Cara[];
  calles: string[];
  area: number;
  frente: number;
  plantas: number;
  alturaM: number;
  origenAltura: string;
  cubierta: "azotea" | "tejado";
  tipologia: Tipologia;
  material: "revoco" | "encalado" | "ladrillo";
  color: string;
  zocalo: boolean;
  pb: "comercio" | "portal" | "vivienda";
  nivel: "A" | "B" | "C";
  avisos: string[];
}

export interface SectorDatos {
  id: string;
  nombre: string;
  generado: string;
  manzana: P2[];
  calles: string[];
  fuentes: Record<string, string>;
  edificios: EdificioDatos[];
  avisos: string[];
}

/** Corrección manual de un edificio (capa independiente: nunca se escribe en los datos generados). */
export interface Correccion {
  plantas?: number;
  alturaM?: number;
  color?: string;
  tipologia?: Tipologia;
  material?: EdificioDatos["material"];
  ventanas?: "auto" | "persiana" | "recercado" | "arco" | "sencilla";
  balcones?: "auto" | "ninguno" | "forja" | "corrido" | "cierro";
  cubierta?: "azotea" | "tejado";
  pb?: EdificioDatos["pb"];
  modelo?: "generado" | "oculto";
  estado?: "pendiente" | "correcto";
  nota?: string;
}
export type Correcciones = Record<string, Correccion>;

export interface Efectivo extends EdificioDatos {
  ventanas: NonNullable<Correccion["ventanas"]>;
  balcones: NonNullable<Correccion["balcones"]>;
  modelo: NonNullable<Correccion["modelo"]>;
  estado: NonNullable<Correccion["estado"]>;
  corregido: string[];
}

const PB = 3.6;
const PLANTA = 3.0;

export function aplicarCorrecciones(d: SectorDatos, corr: Correcciones): Efectivo[] {
  return d.edificios.map((e) => {
    const c = corr[e.id] ?? {};
    const corregido = Object.keys(c).filter((k) => k !== "estado" && k !== "nota");
    const plantas = c.plantas ?? e.plantas;
    const alturaM = c.alturaM ?? (c.plantas ? PB + (plantas - 1) * PLANTA : e.alturaM);
    return {
      ...e,
      plantas,
      alturaM,
      color: c.color ?? e.color,
      tipologia: c.tipologia ?? e.tipologia,
      material: c.material ?? e.material,
      cubierta: c.cubierta ?? e.cubierta,
      pb: c.pb ?? e.pb,
      ventanas: c.ventanas ?? "auto",
      balcones: c.balcones ?? "auto",
      modelo: c.modelo ?? "generado",
      estado: c.estado ?? "pendiente",
      corregido,
    };
  });
}

export interface InformeGeneracion {
  edificios: number;
  modulos: number;
  rechazados: { id: string; motivo: string }[];
  huellasInvalidas: string[];
  carasSinFachada: number;
}

const C = rgb;
const HIERRO = C("#23262B");
const BLANCO = C("#F6F4EE");
const MADERA = C("#6B4A33");
const VERDE_PERSIANA = C("#3F6B4E");
const ROTULOS = ["#1F5EFF", "#C0392B", "#2E7D4F", "#E6A93A", "#8E2A6E", "#2B2D31"].map(C);
const TEJA = C("#B5603E");

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
const tono = (c: RGB, k: number): RGB => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];

function dentroPoli(p: P2, poli: P2[]) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function areaPoli(p: P2[]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}
function centro(p: P2[]): P2 {
  return [p.reduce((s, v) => s + v[0], 0) / p.length, p.reduce((s, v) => s + v[1], 0) / p.length];
}

/** Edificio del sector bajo un punto del mapa (para el editor). */
export function edificioEn(d: SectorDatos, x: number, y: number) {
  return d.edificios.find((e) => dentroPoli([x, y], e.huella)) ?? null;
}

export function solidosSector(d: SectorDatos, corr: Correcciones): P2[][] {
  return aplicarCorrecciones(d, corr).filter((e) => e.modelo !== "oculto").map((e) => e.huella);
}

export function construirSector(d: SectorDatos, corr: Correcciones, ctx: Ctx, fino: boolean) {
  const o = new Obra();
  o.fino = fino;
  const inf: InformeGeneracion = { edificios: 0, modulos: 0, rechazados: [], huellasInvalidas: [], carasSinFachada: 0 };
  for (const e of aplicarCorrecciones(d, corr)) {
    if (e.modelo === "oculto") continue;
    if (e.huella.length < 3 || Math.abs(areaPoli(e.huella)) < 1) {
      inf.huellasInvalidas.push(e.id);
      continue;
    }
    edificio(o, ctx, e, inf);
    inf.edificios++;
  }
  return { obra: o, informe: inf };
}

/* ── Un edificio ──────────────────────────────────────────────────── */

function edificio(o: Obra, c: Ctx, e: Efectivo, inf: InformeGeneracion) {
  const poli = e.huella;
  const H = e.alturaM;
  const col = C(e.color);
  const muroMat = e.material === "ladrillo" ? Mat.Ladrillo : Mat.Muro;
  const colMuro: RGB = e.material === "ladrillo" ? [1.0, 1.42, 1.3] : col;
  const cen = centro(poli);
  const r = hash(e.overture);
  const esquina = e.caras.filter((k) => k === "calle").length >= 2;
  // Comprueba que un módulo cabe en su cara y planta; si no, se rechaza (nunca flota).
  const cabe = (L: number, x: number, w: number, y: number, h: number, techo: number, motivo: string) => {
    const ok = x - w / 2 >= 0.15 && x + w / 2 <= L - 0.15 && y >= 0 && y + h <= techo + 0.01;
    if (ok) inf.modulos++;
    else inf.rechazados.push({ id: e.id, motivo });
    return ok;
  };
  let caraTejado = -1;
  for (let i = 0; i < poli.length; i++) {
    const a = poli[i];
    const b = poli[(i + 1) % poli.length];
    const mc = new Marco(a, b, interiorArista(poli, i));
    const L = mc.usar(o, c);
    if (L < 0.05) continue;
    const cara = e.caras[i] ?? "patio";
    if (cara === "medianera") {
      muro(o, 0, L, 0, H, tono(colMuro, 0.93), muroMat, 0.85);
      continue;
    }
    muro(o, 0, L, 0, H, colMuro, muroMat, 0.8);
    if (cara === "patio") {
      // Fachada trasera: ventanas pequeñas, sin vuelos.
      if (L >= 2.4) for (let p = 0; p < e.plantas; p++) {
        const y = p === 0 ? 1.2 : PB + (p - 1) * PLANTA + 0.9;
        for (const x of crujias(L, 3.0)) if (cabe(L, x, 0.8, y, 1.0, H, "ventana de patio")) ventana(o, x, y, 0.8, 1.0, { marco: BLANCO });
      }
      continue;
    }
    if (L < 1.2) {
      inf.carasSinFachada++;
      continue;
    }
    if (caraTejado < 0 && e.cubierta === "tejado") caraTejado = i;
    fachada(o, e, L, H, mc, r, esquina, cabe);
  }
  // Cubierta.
  enMundo(o, c);
  if (e.cubierta === "tejado" && poli.length === 4 && caraTejado >= 0) {
    const a = poli[caraTejado];
    const b = poli[(caraTejado + 1) % 4];
    const mc = new Marco(a, b, interiorArista(poli, caraTejado));
    const L = mc.usar(o, c, H);
    const opuesto = poli[(caraTejado + 2) % 4];
    const D = Math.abs(((b[0] - a[0]) * (opuesto[1] - a[1]) - (b[1] - a[1]) * (opuesto[0] - a[0])) / L);
    o.tejado(-0.25, L + 0.25, -D - 0.25, 0.3, 0, Math.min(D, L) * 0.32, TEJA, colMuro, false);
    inf.modulos++;
  } else {
    plano(o, Mat.Muro, poli, H + 0.02, C("#D6CFC2"));
    for (let i = 0; i < poli.length; i++) {
      const mc = new Marco(poli[i], poli[(i + 1) % poli.length], interiorArista(poli, i));
      const L = mc.usar(o, c, H);
      if (L < 0.05) continue;
      o.caja(muroMat, 0, 0, -0.22, L, 0.95, 0, tono(colMuro, e.caras[i] === "calle" ? 1 : 0.95));
      o.caja(Mat.Detalle, -0.02, 0.95, -0.25, L + 0.02, 1.02, 0.03, tono(colMuro, 1.12));
    }
    // Casetón de escalera desde 3 plantas, en el centro de la azotea si cabe.
    if (e.plantas >= 3 && e.area >= 30 && dentroPoli(cen, poli)) {
      const s = 1.2;
      if ([[-s, -s], [s, -s], [s, s], [-s, s]].every(([dx, dz]) => dentroPoli([cen[0] + dx, cen[1] + dz], poli))) {
        enMundo(o, c, H);
        o.caja(muroMat, cen[0] - s, 0, cen[1] - s, cen[0] + s, 2.5, cen[1] + s, colMuro);
        o.caja(Mat.Detalle, cen[0] - s - 0.1, 2.5, cen[1] - s - 0.1, cen[0] + s + 0.1, 2.62, cen[1] + s + 0.1, tono(colMuro, 1.12));
        o.caja(Mat.Detalle, cen[0] - 0.45, 0, cen[1] + s, cen[0] + 0.45, 2.0, cen[1] + s + 0.03, MADERA);
        if (e.tipologia === "bloque" && e.area >= 60) {
          torno(o, Mat.Detalle, cen[0] + s - 0.5, 2.62, cen[1] - s + 0.5, [[0.45, 0], [0.45, 0.9], [0.2, 1.0]], C("#ECEBE6"), 10);
          o.caja(Mat.Metal, cen[0] - s + 0.3, 2.62, cen[1] - s + 0.3, cen[0] - s + 0.36, 4.4, cen[1] - s + 0.36, C("#9A9DA1"));
        }
        inf.modulos++;
      }
    }
  }
  enMundo(o, c);
}

function crujias(L: number, paso: number) {
  const n = Math.max(1, Math.round(L / paso));
  return Array.from({ length: n }, (_, i) => ((i + 0.5) * L) / n);
}

type Cabe = (L: number, x: number, w: number, y: number, h: number, techo: number, motivo: string) => boolean;

/** Fachada a la calle: planta baja según uso, plantas altas según tipología, cornisa. */
function fachada(o: Obra, e: Efectivo, L: number, H: number, mc: Marco, r: number, esquina: boolean, cabe: Cabe) {
  const col = C(e.color);
  const tip = e.tipologia;
  const paso = tip === "bloque" ? 2.5 : tip === "burguesa" ? 2.8 : 2.6;
  const xs = crujias(L, paso);
  const n = xs.length;
  // Carpintería y persianas según tipología (madera y alicantina en casas; aluminio en bloques).
  const marco = tip === "bloque" ? C("#E9E9E6") : tip === "burguesa" ? C("#F2EFE8") : r < 0.5 ? BLANCO : C("#5B3E2B");
  const persiana = tip === "bloque" ? C("#D8D6D0") : VERDE_PERSIANA;
  const hierro = tip === "bloque" ? C("#B9BCBF") : HIERRO;
  const recercado = e.ventanas === "recercado" || (e.ventanas === "auto" && tip === "burguesa") ? tono(col, 1.15) : undefined;
  const op = (k: number): OpVentana => ({
    marco,
    recercado,
    recercadoAncho: 0.16,
    persiana: e.ventanas === "sencilla" ? undefined : persiana,
    bajada: 0.15 + ((k * 7 + Math.floor(r * 10)) % 5) * 0.1,
    arco: e.ventanas === "arco",
    cuarterones: tip !== "bloque",
  });
  // Normal exterior de la cara en el mapa: a sol (sur = +y, oeste = −x) lleva toldo el comercio.
  const [ax, ay] = mc.g(0, 0);
  const [nx, ny] = mc.g(0, 1);
  const alSol = ny - ay > 0.5 || nx - ax < -0.5;

  // Zócalo.
  if (e.zocalo) {
    const azulejo = r < 0.55;
    o.caja(Mat.Detalle, 0, 0, 0, L, 0.85, 0.03, azulejo ? C("#2F5F8F") : C("#8C8A86"));
    if (azulejo && o.fino) for (let x = 0.15; x < L - 0.1; x += 0.3) o.caja(Mat.Detalle, x, 0.12, 0.031, x + 0.15, 0.73, 0.035, C("#E8D9A6"));
  }

  // Planta baja.
  const puerta = n === 1 ? 0 : tip === "bloque" ? Math.floor(n / 2) : 0;
  xs.forEach((x, k) => {
    const hueco = L / n; // ancho de la crujía
    const w = Math.min(paso - 0.5, hueco - 0.45);
    if (e.pb === "comercio") {
      if (!cabe(L, x, w, 0.1, 3.3, H, "escaparate")) return;
      o.caja(Mat.Cristal, x - w / 2, 0.15, 0.03, x + w / 2, 2.75, 0.06, C("#6F8796"));
      o.caja(Mat.Detalle, x - w / 2 - 0.08, 2.8, 0.03, x + w / 2 + 0.08, 3.3, 0.2, ROTULOS[(k + Math.floor(r * 6)) % ROTULOS.length]);
      if (alSol && w > 1.4) toldo(o, x - w / 2, x + w / 2, 3.45, 1.2, 0.4, k % 2 ? C("#EFEDE6") : C("#7A3A2E"), C("#FFFFFF"));
    } else if (k === puerta) {
      const pw = Math.min(e.pb === "portal" ? 1.6 : 1.0, hueco - 0.65);
      if (!cabe(L, x, pw + 0.3, 0, 2.7, H, "puerta")) return;
      o.caja(Mat.Detalle, x - pw / 2 - 0.15, 0, 0.0, x + pw / 2 + 0.15, 2.65, 0.05, tono(col, 1.12));
      o.caja(Mat.Detalle, x - pw / 2, 0, 0.03, x + pw / 2, 2.45, 0.08, e.pb === "portal" ? C("#3B4650") : MADERA);
      if (e.pb === "portal") o.caja(Mat.Detalle, x - pw / 2 - 0.3, 2.75, 0, x + pw / 2 + 0.3, 2.85, 0.7, C("#ECEBE6"));
    } else {
      const vw = Math.min(1.0, hueco - 0.5);
      if (!cabe(L, x, vw, 0.9, 1.4, H, "ventana de planta baja")) return;
      ventana(o, x, 0.95, vw, 1.4, op(k));
      reja(o, x, 0.95, vw, 1.4, 0.1, hierro);
    }
  });
  if (tip !== "casa_baja") moldura(o, -0.04, L + 0.04, PB - 0.12, PB + 0.1, 0.14, tono(col, 1.12));

  // Plantas altas.
  for (let p = 1; p < e.plantas; p++) {
    const y = PB + (p - 1) * PLANTA;
    if (tip === "burguesa" || tip === "bloque") moldura(o, -0.03, L + 0.03, y - 0.05, y + 0.07, 0.08, tono(col, 1.1));
    xs.forEach((x, k) => {
      const principal = p === 1;
      const central = k === Math.floor(n / 2);
      let tipoBalcon: "ninguno" | "forja" | "corrido" | "cierro" = "ninguno";
      if (e.balcones !== "auto") tipoBalcon = e.balcones;
      else if (tip === "burguesa") tipoBalcon = principal ? (esquina && (k === 0 || k === n - 1) ? "cierro" : "forja") : central || n <= 2 ? "forja" : "ninguno";
      else if (tip === "casa_dos") tipoBalcon = central && L >= 3.5 ? "forja" : "ninguno";
      else if (tip === "bloque") tipoBalcon = e.material === "ladrillo" ? (central ? "forja" : "ninguno") : "corrido";
      const h = tipoBalcon === "ninguno" ? 1.5 : 2.15;
      const yv = tipoBalcon === "ninguno" ? y + 0.8 : y + 0.4;
      if (!cabe(L, x, Math.min(1.0, L / n - 0.5), yv - y, h, PLANTA, "hueco de planta alta")) return;
      if (tipoBalcon === "cierro") {
        cierro(o, x, y + 0.4, 1.3, 2.3, 0.55, BLANCO, HIERRO);
        return;
      }
      ventana(o, x, yv, 1.0, h, op(k + p));
      if (tipoBalcon === "forja") balcon(o, x, yv, 1.4, 0.45, tono(col, 1.15), hierro);
      else if (tipoBalcon === "corrido") balcon(o, x, yv, Math.min(paso - 0.1, 2.3), 0.85, C("#E7E3DA"), C("#C9CCCF"), 1.0);
    });
  }
  // Remate: cornisa (más marcada en las casas burguesas).
  if (tip === "burguesa") {
    moldura(o, -0.15, L + 0.15, H - 0.45, H + 0.05, 0.4, tono(col, 1.15));
    if (o.fino && L > 3) for (let x = 0.3; x < L - 0.2; x += 0.5) o.caja(Mat.Detalle, x, H - 0.6, 0, x + 0.18, H - 0.45, 0.3, tono(col, 1.15));
  } else if (e.cubierta === "azotea") moldura(o, -0.06, L + 0.06, H - 0.2, H + 0.05, 0.18, tono(col, 1.1));
}
