import * as THREE from "three";
import { Mat, Obra, rgb, type RGB } from "../arquitectura";
import {
  Marco, enMundo, torno, muro, moldura, ventana, balcon, balaustrada, cierro, reja, toldo,
  interiorArista, type Ctx, type P2, type OpVentana,
} from "../sectores/piezas";
import type { Efectivo } from "./tipos";

/**
 * Biblioteca arquitectónica de La Línea: construye un edificio a partir de sus datos reales
 * con reglas por tipología, dimensiones, orientación y contexto. Nada se coloca al azar:
 *
 *  Fachadas
 *   - Solo las caras a la calle llevan huecos; las medianeras son ciegas y las de patio llevan
 *     ventanas pequeñas sin vuelo (también las de los patios interiores).
 *   - Rejilla de crujías según el frente y la tipología; cada pieza se comprueba en su cara y su
 *     planta antes de colocarse (si no cabe, se rechaza y se cuenta).
 *  Tipologías
 *   - atunara: casa marinera encalada, zócalo y recercados de color, puerta y ventana con reja.
 *   - casa_baja / casa_dos: casa encalada o de revoco con zócalo, rejas y balcón de forja central.
 *   - medianeras: casa estrecha entre medianeras: puerta, ventana con reja y un balcón por planta.
 *   - burguesa: recercados, pilastras, balcones de forja en la planta principal, cierro en esquina,
 *     cornisa con modillones y balaustrada.
 *   - comercial: planta baja de escaparates con aplacado de piedra y rótulo corrido, plantas de
 *     oficinas o viviendas con balcón corrido en la primera.
 *   - bloque: terrazas corridas con barandilla, persianas, portal con marquesina y ático retranqueado.
 *   - singular: volumen provisional digno (zócalo de piedra, pilastras, cornisa): pendiente de modelo propio.
 *  Cubiertas: azotea con pretil (casetón, depósito y antena según tamaño), dos o cuatro aguas en
 *  huellas rectangulares, y faldón de teja a la calle en las irregulares.
 *  Orientación: toldos en comercios a sol (sur y oeste) y persianas más bajadas en esas fachadas.
 *
 *  LOD 0: completo · LOD 1: sin rejas, persianas ni carpinterías finas · LOD 2: volúmenes, cubierta y huecos.
 */

export interface InformeEdificios {
  edificios: number;
  modulos: number;
  rechazados: { id: string; motivo: string }[];
  carasSinFachada: number;
  huellasInvalidas: string[];
}

const C = rgb;
const PB = 3.6;
const PLANTA = 3.0;
const HIERRO = C("#23262B");
const BLANCO = C("#F6F4EE");
const MADERA = C("#6B4A33");
const TEJA = C("#B5603E");
const ROTULOS = ["#1F5EFF", "#C0392B", "#2E7D4F", "#E6A93A", "#8E2A6E", "#2B2D31", "#0F7C8C"].map(C);
const COLOR_MARINERO = ["#2F5F8F", "#3F7A4E", "#9C3B2E", "#E0B43A"].map(C);

const tono = (c: RGB, k: number): RGB => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
function dentroPoli(p: P2, poli: P2[]) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const centro = (p: P2[]): P2 => [p.reduce((s, v) => s + v[0], 0) / p.length, p.reduce((s, v) => s + v[1], 0) / p.length];
function crujias(L: number, paso: number) {
  const n = Math.max(1, Math.round(L / paso));
  return Array.from({ length: n }, (_, i) => ((i + 0.5) * L) / n);
}

/** Plano horizontal con huecos (azoteas con patio). */
function planoHuecos(o: Obra, m: Mat, ext: P2[], huecos: P2[][], y: number, color: RGB, uv?: number) {
  const v = (p: P2) => new THREE.Vector2(p[0], -p[1]);
  let e = ext;
  if (THREE.ShapeUtils.isClockWise(e.map(v))) e = [...e].reverse();
  const hs = huecos.map((h) => (THREE.ShapeUtils.isClockWise(h.map(v)) ? h : [...h].reverse()));
  const todos = [e, ...hs].flat();
  for (const [a, b, d] of THREE.ShapeUtils.triangulateShape(e.map(v), hs.map((h) => h.map(v)))) {
    o.poli(m, [[todos[a][0], y, todos[a][1]], [todos[b][0], y, todos[b][1]], [todos[d][0], y, todos[d][1]]], color, 1, uv);
  }
}

export function construirEdificios(lista: Efectivo[], ctx: Ctx, lod: 0 | 1 | 2, inf?: InformeEdificios) {
  const o = new Obra();
  o.fino = lod === 0;
  o.lejano = lod === 2;
  const informe = inf ?? { edificios: 0, modulos: 0, rechazados: [], carasSinFachada: 0, huellasInvalidas: [] };
  for (const e of lista) {
    if (e.modelo === "oculto") continue;
    if (e.huella.length < 3 || e.area < 2) {
      informe.huellasInvalidas.push(e.id);
      continue;
    }
    edificio(o, ctx, e, lod, informe);
    informe.edificios++;
  }
  return { obra: o, informe };
}

type Cabe = (L: number, x: number, w: number, y: number, h: number, techo: number, motivo: string) => boolean;

function edificio(o: Obra, c: Ctx, e: Efectivo, lod: 0 | 1 | 2, inf: InformeEdificios) {
  const poli = e.huella;
  const H = e.alturaM;
  const tieneAtico = !!e.atico && e.plantas >= 5;
  const Hc = tieneAtico ? H - PLANTA : H; // cornisa del cuerpo principal
  const col = C(e.color);
  const ladrillo = e.revestimiento === "ladrillo";
  const muroMat = ladrillo ? Mat.Ladrillo : Mat.Muro;
  const colMuro: RGB = ladrillo ? [1.0, 1.42, 1.3] : col;
  const r = hash(e.id);
  const cabe: Cabe = (L, x, w, y, h, techo, motivo) => {
    const ok = w > 0.3 && x - w / 2 >= 0.15 && x + w / 2 <= L - 0.15 && y >= 0 && y + h <= techo + 0.01;
    if (ok) inf.modulos++;
    else if (lod === 0) inf.rechazados.push({ id: e.id, motivo });
    return ok;
  };
  // Fachadas del anillo exterior.
  let caraTejado = -1;
  let mejorL = 0;
  for (let i = 0; i < poli.length; i++) {
    const mc = new Marco(poli[i], poli[(i + 1) % poli.length], interiorArista(poli, i));
    const L = mc.usar(o, c);
    if (L < 0.05) continue;
    const cara = e.caras[i] ?? "patio";
    if (cara === "medianera") {
      muro(o, 0, L, 0, Hc, tono(colMuro, 0.93), muroMat, 0.85);
      continue;
    }
    muro(o, 0, L, 0, Hc, colMuro, muroMat, 0.8);
    if (cara === "patio") {
      fachadaPatio(o, e, L, Hc, lod, cabe);
      continue;
    }
    if (L < 1.2) {
      inf.carasSinFachada++;
      continue;
    }
    if (L > mejorL) (mejorL = L), (caraTejado = i);
    fachadaCalle(o, e, L, Hc, mc, r, lod, cabe);
  }
  // Patios interiores: muros hacia el patio con ventanas pequeñas.
  for (const h of e.patios ?? []) {
    for (let i = 0; i < h.length; i++) {
      const a = h[i];
      const b = h[(i + 1) % h.length];
      const [ix, iy] = interiorArista(h, i);
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const mc = new Marco(a, b, [2 * mx - ix, 2 * my - iy]); // el edificio queda fuera del hueco
      const L = mc.usar(o, c);
      if (L < 0.05) continue;
      muro(o, 0, L, 0, Hc, tono(colMuro, 0.97), muroMat, 0.75);
      fachadaPatio(o, e, L, Hc, lod, cabe);
    }
  }
  // Ático retranqueado.
  if (tieneAtico) {
    const at = e.atico!;
    for (let i = 0; i < at.length; i++) {
      const mc = new Marco(at[i], at[(i + 1) % at.length], interiorArista(at, i));
      const L = mc.usar(o, c, Hc);
      if (L < 0.05) continue;
      muro(o, 0, L, 0, PLANTA, tono(colMuro, 1.04), muroMat, 0.8);
      if (lod < 2) {
        const xa = crujias(L, 2.4);
        const w = Math.min(1.6, L / xa.length - 0.5);
        for (const x of xa) if (cabe(L, x, w, 0.3, 2.3, PLANTA, "ventanal de ático")) o.caja(Mat.Cristal, x - w / 2, 0.3, 0.02, x + w / 2, 2.6, 0.05, C("#7FA3B8"));
      }
      o.caja(Mat.Detalle, -0.05, PLANTA - 0.08, -0.05, L + 0.05, PLANTA + 0.08, 0.35, tono(colMuro, 1.12));
    }
    enMundo(o, c);
    planoHuecos(o, Mat.Muro, poli, e.patios ?? [], Hc + 0.02, C("#C9C2B6"));
    planoHuecos(o, Mat.Muro, at, [], H + 0.02, C("#D6CFC2"));
    // Barandilla de la terraza del ático sobre las caras a la calle.
    for (let i = 0; i < poli.length; i++) {
      if (e.caras[i] !== "calle") continue;
      const mc = new Marco(poli[i], poli[(i + 1) % poli.length], interiorArista(poli, i));
      const L = mc.usar(o, c, Hc);
      o.caja(Mat.Muro, 0, 0, -0.2, L, 0.45, 0, colMuro);
      if (lod < 2) o.caja(Mat.Cristal, 0, 0.45, -0.12, L, 1.05, -0.08, C("#A9C6D3"));
    }
    enMundo(o, c);
    return;
  }
  cubierta(o, c, e, Hc, colMuro, muroMat, caraTejado, lod, inf);
}

/* ── Cubiertas ─────────────────────────────────────────────────────── */

function cubierta(o: Obra, c: Ctx, e: Efectivo, H: number, colMuro: RGB, muroMat: Mat, caraTejado: number, lod: 0 | 1 | 2, inf: InformeEdificios) {
  const poli = e.huella;
  enMundo(o, c);
  const rect = poli.length === 4;
  if ((e.cubierta === "dos_aguas" || e.cubierta === "cuatro_aguas") && rect) {
    const i = caraTejado >= 0 ? caraTejado : 0;
    const a = poli[i];
    const b = poli[(i + 1) % 4];
    const mc = new Marco(a, b, interiorArista(poli, i));
    const L = mc.usar(o, c, H);
    const op = poli[(i + 2) % 4];
    const D = Math.abs(((b[0] - a[0]) * (op[1] - a[1]) - (b[1] - a[1]) * (op[0] - a[0])) / L);
    const cuatro = e.cubierta === "cuatro_aguas";
    o.tejado(-0.3, L + 0.3, -D - 0.3, 0.3, 0, Math.min(D, L) * (cuatro ? 0.38 : 0.32), TEJA, colMuro, cuatro);
    if (lod === 0) o.caja(Mat.Detalle, -0.3, -0.18, 0.18, L + 0.3, 0, 0.32, tono(colMuro, 1.1)); // alero
    inf.modulos++;
    enMundo(o, c);
    return;
  }
  planoHuecos(o, Mat.Muro, poli, e.patios ?? [], H + 0.02, C("#D6CFC2"));
  // Pretil en todo el perímetro (también hacia los patios).
  const anillos = [poli, ...(e.patios ?? [])];
  anillos.forEach((an, k) => {
    for (let i = 0; i < an.length; i++) {
      const [ix, iy] = interiorArista(an, i);
      const a = an[i];
      const b = an[(i + 1) % an.length];
      const dentro: P2 = k === 0 ? [ix, iy] : [a[0] + b[0] - ix, a[1] + b[1] - iy];
      const mc = new Marco(a, b, dentro);
      const L = mc.usar(o, c, H);
      if (L < 0.05) continue;
      const calle = k === 0 && e.caras[i] === "calle";
      if (e.cubierta === "tejadillo" && calle && L > 2) {
        // Faldón de teja hacia la calle sobre el pretil (cubiertas irregulares).
        o.poli(Mat.Teja, [[0, 0.95, 0.35], [L, 0.95, 0.35], [L, 1.75, -1.6], [0, 1.75, -1.6]], TEJA, 1, 0.5);
        o.poli(Mat.Teja, [[0, 1.75, -1.6], [L, 1.75, -1.6], [L, 0.95, 0.35], [0, 0.95, 0.35]], tono(TEJA, 0.8), 1, 0.5);
        inf.modulos++;
      }
      o.caja(muroMat, 0, 0, -0.22, L, 0.95, 0, tono(colMuro, calle ? 1 : 0.95));
      if (lod < 2) o.caja(Mat.Detalle, -0.02, 0.95, -0.25, L + 0.02, 1.02, 0.03, tono(colMuro, 1.12));
      if (lod === 0 && e.tipologia === "atunara" && calle) for (let x = 0.4; x < L - 0.3; x += 0.9) o.caja(muroMat, x, 1.02, -0.2, x + 0.4, 1.3, 0, colMuro); // almenillas
    }
  });
  enMundo(o, c);
  if (lod === 2) return;
  // Elementos de azotea por tamaño: casetón (≥3 plantas), depósito y antena (bloques), chimenea (casas).
  const cen = centro(poli);
  const libre = (dx: number, dz: number) => dentroPoli([cen[0] + dx, cen[1] + dz], poli) && !(e.patios ?? []).some((h) => dentroPoli([cen[0] + dx, cen[1] + dz], h));
  enMundo(o, c, H);
  // Casetón de escalera solo en edificios plurifamiliares de fondo suficiente (no en cada casa).
  if (e.plantas >= 3 && e.area >= 70 && (e.tipologia === "bloque" || e.tipologia === "comercial" || e.tipologia === "burguesa")) {
    const s = e.area >= 150 ? 1.3 : 1.0;
    if ([[-s, -s], [s, -s], [s, s], [-s, s]].every(([dx, dz]) => libre(dx, dz))) {
      o.caja(muroMat, cen[0] - s, 0, cen[1] - s, cen[0] + s, 2.5, cen[1] + s, colMuro);
      o.caja(Mat.Detalle, cen[0] - s - 0.1, 2.5, cen[1] - s - 0.1, cen[0] + s + 0.1, 2.62, cen[1] + s + 0.1, tono(colMuro, 1.12));
      o.caja(Mat.Detalle, cen[0] - 0.45, 0, cen[1] + s, cen[0] + 0.45, 2.0, cen[1] + s + 0.03, MADERA);
      if ((e.tipologia === "bloque" || e.tipologia === "comercial") && e.area >= 60 && lod === 0) {
        torno(o, Mat.Detalle, cen[0] + s - 0.5, 2.62, cen[1] - s + 0.5, [[0.45, 0], [0.45, 0.9], [0.2, 1.0]], C("#ECEBE6"), 10);
        o.caja(Mat.Metal, cen[0] - s + 0.3, 2.62, cen[1] - s + 0.3, cen[0] - s + 0.36, 4.4, cen[1] - s + 0.36, C("#9A9DA1"));
      }
      inf.modulos++;
    }
  } else if ((e.tipologia === "atunara" || e.tipologia === "casa_baja" || e.tipologia === "casa_dos") && libre(0.5, 0.5) && libre(-0.5, -0.5)) {
    o.caja(muroMat, cen[0] - 0.35, 0, cen[1] - 0.35, cen[0] + 0.35, 1.6, cen[1] + 0.35, colMuro);
    o.caja(Mat.Teja, cen[0] - 0.45, 1.6, cen[1] - 0.45, cen[0] + 0.45, 1.72, cen[1] + 0.45, TEJA);
    inf.modulos++;
  }
  enMundo(o, c);
}

/* ── Fachadas ──────────────────────────────────────────────────────── */

function fachadaPatio(o: Obra, e: Efectivo, L: number, H: number, lod: 0 | 1 | 2, cabe: Cabe) {
  if (L < 2.4 || lod === 2) return;
  for (let p = 0; p < e.plantas; p++) {
    const y = p === 0 ? 1.2 : PB + (p - 1) * PLANTA + 0.9;
    if (y + 1.0 > H) break;
    for (const x of crujias(L, 3.0)) if (cabe(L, x, 0.8, y, 1.0, H, "ventana de patio")) ventana(o, x, y, 0.8, 1.0, { marco: BLANCO });
  }
}

function fachadaCalle(o: Obra, e: Efectivo, L: number, H: number, mc: Marco, r: number, lod: 0 | 1 | 2, cabe: Cabe) {
  const col = C(e.color);
  const t = e.tipologia;
  const plantasCuerpo = Math.max(1, Math.round((H - PB) / PLANTA) + 1);
  const paso = t === "bloque" ? 2.5 : t === "comercial" ? 3.2 : t === "burguesa" ? 2.8 : t === "medianeras" ? 2.4 : 2.6;
  const xs = crujias(L, paso);
  const n = xs.length;
  const hueco = L / n;
  // Orientación de la fachada (mapa: +y = sur, −x = oeste).
  const [ax, ay] = mc.g(0, 0);
  const [nx, ny] = mc.g(0, 1);
  const alSol = ny - ay > 0.5 || nx - ax < -0.5;
  const marino = t === "atunara" ? COLOR_MARINERO[Math.floor(r * COLOR_MARINERO.length)] : null;
  const marco = t === "bloque" || t === "comercial" ? C("#E9E9E6") : marino ?? (r < 0.5 ? BLANCO : C("#5B3E2B"));
  const hierro = t === "bloque" ? C("#B9BCBF") : HIERRO;
  const recercado = e.ventanas === "recercado" || (e.ventanas === "auto" && (t === "burguesa" || t === "singular")) ? tono(col, 1.15) : marino ?? undefined;
  const op = (k: number): OpVentana => ({
    marco,
    recercado,
    recercadoAncho: t === "atunara" ? 0.12 : 0.16,
    persiana: lod === 0 && e.ventanas !== "sencilla" && t !== "singular" ? (t === "bloque" || t === "comercial" ? C("#D8D6D0") : C("#3F6B4E")) : undefined,
    // Más bajadas a sol; variación regular por crujía (no aleatoria).
    bajada: (alSol ? 0.35 : 0.15) + (k % 3) * 0.1,
    arco: e.ventanas === "arco" || (e.ventanas === "auto" && t === "singular"),
    cuarterones: lod === 0 && t !== "bloque" && t !== "comercial",
  });

  // Revestimiento: zócalo, aplacado de piedra en planta baja, gresite.
  if (e.zocalo) {
    const zc = marino ?? (t === "burguesa" ? C("#8C8A86") : C("#2F5F8F"));
    o.caja(Mat.Detalle, 0, 0, 0, L, t === "atunara" ? 0.7 : 0.85, 0.03, zc);
    if (lod === 0 && !marino && t !== "burguesa") for (let x = 0.15; x < L - 0.1; x += 0.3) o.caja(Mat.Detalle, x, 0.12, 0.031, x + 0.15, 0.73, 0.035, C("#E8D9A6"));
  }
  if (e.revestimiento === "piedra_pb" || t === "singular") o.caja(Mat.Detalle, 0, 0, 0, L, PB, 0.04, C("#BDB3A2"));
  if (e.revestimiento === "ceramico" && lod === 0) for (let y = PB; y < H - 0.3; y += 0.6) o.caja(Mat.Detalle, 0, y, 0.005, L, y + 0.02, 0.01, tono(col, 0.9));
  // Pilastras en las esquinas de la fachada (burguesa y singular).
  if ((t === "burguesa" || t === "singular") && L > 4) for (const x of [0.3, L - 0.3]) o.caja(Mat.Detalle, x - 0.3, 0, 0, x + 0.3, H, 0.12, tono(col, 1.12));

  // Planta baja.
  const puerta = t === "bloque" || t === "singular" ? Math.floor(n / 2) : 0;
  xs.forEach((x, k) => {
    if (e.pb === "comercio" || t === "comercial") {
      const w = Math.min(paso - 0.4, hueco - 0.45);
      if (!cabe(L, x, w, 0.1, 3.3, H, "escaparate")) return;
      o.caja(Mat.Cristal, x - w / 2, 0.15, 0.03, x + w / 2, 2.75, 0.06, C("#6F8796"));
      if (lod === 0) o.caja(Mat.Detalle, x - 0.04, 0.15, 0.06, x + 0.04, 2.75, 0.1, C("#2B2D31"));
      if (t !== "comercial") o.caja(Mat.Detalle, x - w / 2 - 0.08, 2.8, 0.03, x + w / 2 + 0.08, 3.3, 0.2, ROTULOS[(k + Math.floor(r * 7)) % ROTULOS.length]);
      if (lod === 0 && alSol && w > 1.4) toldo(o, x - w / 2, x + w / 2, 3.45, 1.2, 0.4, k % 2 ? C("#EFEDE6") : C("#7A3A2E"), C("#FFFFFF"));
    } else if (k === puerta) {
      const pw = Math.min(t === "bloque" ? 1.6 : t === "singular" ? 2.0 : 1.0, hueco - 0.65);
      if (!cabe(L, x, pw + 0.3, 0, 2.9, H, "puerta")) return;
      o.caja(Mat.Detalle, x - pw / 2 - 0.15, 0, 0.0, x + pw / 2 + 0.15, t === "singular" ? 3.0 : 2.65, 0.05, marino ?? tono(col, 1.12));
      o.caja(Mat.Detalle, x - pw / 2, 0, 0.03, x + pw / 2, t === "singular" ? 2.8 : 2.45, 0.08, t === "bloque" ? C("#3B4650") : MADERA);
      if (t === "bloque") o.caja(Mat.Detalle, x - pw / 2 - 0.3, 2.75, 0, x + pw / 2 + 0.3, 2.85, 0.7, C("#ECEBE6"));
    } else {
      const vw = Math.min(t === "atunara" ? 0.8 : 1.0, hueco - 0.5);
      if (!cabe(L, x, vw, 0.9, 1.4, H, "ventana de planta baja")) return;
      ventana(o, x, 0.95, vw, t === "atunara" ? 1.1 : 1.4, op(k));
      if (lod === 0) reja(o, x, 0.95, vw, t === "atunara" ? 1.1 : 1.4, 0.1, hierro);
    }
  });
  if (t === "comercial") {
    // Rótulo corrido y marquesina de la planta comercial.
    o.caja(Mat.Detalle, 0.1, 2.8, 0.03, L - 0.1, 3.35, 0.22, ROTULOS[Math.floor(r * ROTULOS.length)]);
    if (lod < 2) o.caja(Mat.Detalle, 0, 3.4, 0, L, 3.5, 0.9, C("#E9E7E2"));
  }
  if (t !== "casa_baja" && t !== "atunara") moldura(o, -0.04, L + 0.04, PB - 0.12, PB + 0.1, 0.14, tono(col, 1.12));

  // Plantas altas.
  for (let p = 1; p < plantasCuerpo; p++) {
    const y = PB + (p - 1) * PLANTA;
    if (y + 2.0 > H) break;
    if (t === "burguesa" || t === "bloque" || t === "comercial" || t === "singular") moldura(o, -0.03, L + 0.03, y - 0.05, y + 0.07, 0.08, tono(col, 1.1));
    xs.forEach((x, k) => {
      const principal = p === 1;
      const central = k === Math.floor(n / 2);
      const extremo = k === 0 || k === n - 1;
      let tb: "ninguno" | "forja" | "corrido" | "cierro" = "ninguno";
      if (e.balcones !== "auto") tb = e.balcones;
      else if (t === "burguesa") tb = principal ? (e.esquina && extremo ? "cierro" : "forja") : central || n <= 2 ? "forja" : "ninguno";
      else if (t === "medianeras") tb = central ? (principal && e.plantas >= 3 ? "cierro" : "forja") : "ninguno";
      else if (t === "casa_dos") tb = central && L >= 3.5 ? "forja" : "ninguno";
      else if (t === "comercial") tb = principal ? "corrido" : central ? "forja" : "ninguno";
      else if (t === "bloque") tb = ladrilloOGresite(e) && !central ? "ninguno" : "corrido";
      const h = tb === "ninguno" ? 1.5 : 2.15;
      const yv = tb === "ninguno" ? y + 0.8 : y + 0.4;
      const vw = Math.min(t === "comercial" ? 1.4 : 1.0, hueco - 0.5);
      if (!cabe(L, x, vw, yv - y, h, PLANTA, "hueco de planta alta")) return;
      if (tb === "cierro" && lod < 2) {
        cierro(o, x, y + 0.4, Math.min(1.3, hueco - 0.4), 2.3, 0.55, BLANCO, HIERRO);
        return;
      }
      ventana(o, x, yv, vw, h, op(k + p));
      if (lod === 2) return;
      if (tb === "forja") balcon(o, x, yv, Math.min(1.4, hueco - 0.2), 0.45, tono(col, 1.15), hierro);
      else if (tb === "corrido") balcon(o, x, yv, Math.min(paso - 0.1, hueco - 0.05), 0.85, C("#E7E3DA"), C("#C9CCCF"), 1.0);
    });
  }
  // Remates.
  if (t === "burguesa" || t === "singular") {
    moldura(o, -0.15, L + 0.15, H - 0.45, H + 0.05, 0.4, tono(col, 1.15));
    if (lod === 0 && L > 3) for (let x = 0.3; x < L - 0.2; x += 0.5) o.caja(Mat.Detalle, x, H - 0.6, 0, x + 0.18, H - 0.45, 0.3, tono(col, 1.15));
    if (lod < 2 && L > 8 && e.cubierta === "azotea") balaustrada(o, 0.4, L - 0.4, H + 0.05, 0.8, 0, tono(col, 1.1), 0.25);
  } else if (e.cubierta === "azotea" || e.cubierta === "tejadillo") moldura(o, -0.06, L + 0.06, H - 0.2, H + 0.05, 0.18, tono(col, 1.1));
}

const ladrilloOGresite = (e: Efectivo) => e.revestimiento === "ladrillo";
