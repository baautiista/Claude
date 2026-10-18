import { Mat, Obra, rgb, type RGB } from "../arquitectura";
import { Especie } from "../vegetacion";
import { Marco, enMundo, prisma, plano, arco, torno, muro, moldura, verja, type Ctx, type P2 } from "./piezas";
import type { ArbolSector } from "./saccone";

/**
 * TOROS · Plaza de Toros El Arenal (Calle Gerona, 6) y su entorno.
 *
 * Geometría: OpenStreetMap (© colaboradores de OSM, ODbL): recinto `way/1328537196`
 * (círculo exterior de ≈42,7 m de radio y el cuerpo de la Puerta de Cuadrillas al este),
 * ruedo `way/689322049` (27,9 m de radio), parterres `way/1515687927` y `way/1415671028`,
 * busto de Benito Cabrera Vallecillo (`node/12988569252`).
 * Aspecto: fotos de Google Maps aportadas por el usuario (solo referencia visual):
 * fachada blanca de dos cuerpos con pilastras y recercados albero, puertas granate en arco,
 * huecos altos con la grada de madera detrás, tejado de teja; dentro, tendidos de piedra con
 * tabicas albero, barrera granate y gradas cubiertas sobre pies derechos granate.
 * Alturas estimadas en las fotos. Ver city-reconstruction/reports/TOROS.md.
 */

const C = rgb;
const BLANCO = C("#F6F4EF");
const ALBERO = C("#E2A62C");
const GRANATE = C("#6E1F26");
const TEJA = C("#B45A3C");
const PIEDRA = C("#DCD7CB");
const ARENA = C("#D8AE68");

/** Centro del ruedo (OSM) y radios. */
export const CENTRO_TOROS: P2 = [2609.1, 3615.5];
const R_EXT = 42.7;
const R_RUEDO = 27.9;
const R_CONTRA = 29.6;
const R_TENDIDO = 36.2;
const R_GRADA = 42.2;
const H_PLANTA = 5.0;
const H_ALERO = 10.3;
const H_CUMBRE = 12.0;
const BAHIAS = 44;

const pol = (r: number, a: number): P2 => [CENTRO_TOROS[0] + Math.cos(a) * r, CENTRO_TOROS[1] + Math.sin(a) * r];

/** Cuerpo de la Puerta de Cuadrillas (OSM): del círculo hacia la Calle Gerona. */
const CUADRILLAS: P2[] = (() => {
  const borde: P2[] = [[2649.2, 3624.2], [2653.8, 3623.3], [2657.8, 3623.2], [2662.7, 3623.0], [2662.4, 3613.7], [2661.4, 3613.8], [2660.3, 3601.7], [2661.4, 3601.8], [2661.3, 3600.4], [2657.8, 3593.4], [2654.8, 3587.2], [2652.5, 3582.3], [2646.6, 3585.1], [2641.1, 3587.7]];
  const a0 = Math.atan2(3587.7 - CENTRO_TOROS[1], 2641.1 - CENTRO_TOROS[0]);
  const a1 = Math.atan2(3624.2 - CENTRO_TOROS[1], 2649.2 - CENTRO_TOROS[0]);
  const arcoP: P2[] = [];
  for (let k = 1; k < 8; k++) arcoP.push(pol(R_EXT - 0.3, a0 + ((a1 - a0) * k) / 8));
  return [...borde, ...arcoP];
})();
const N_BORDE_CUADRILLAS = 14;

/** Polígono horizontal o vertical con la cara mirando hacia `n` (corrige el sentido). */
function cara(o: Obra, m: Mat, p: [number, number, number][], n: [number, number, number], col: RGB) {
  const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
  const v = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
  const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  o.poli(m, c[0] * n[0] + c[1] * n[1] + c[2] * n[2] >= 0 ? p : [...p].reverse(), col);
}

/** Anillo horizontal (y) entre dos radios, con la cara hacia arriba o abajo. */
function anillo(o: Obra, m: Mat, r0: number, r1: number, y: number, col: RGB, n = 88, abajo = false, y1 = y) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    const [p, q, s, t] = [pol(r0, a), pol(r0, b), pol(r1, b), pol(r1, a)];
    cara(o, m, [[p[0], y, p[1]], [q[0], y, q[1]], [s[0], y1, s[1]], [t[0], y1, t[1]]], [0, abajo ? -1 : 1, 0], col);
  }
}

/** Pared cilíndrica (radio r, y0…y1) mirando hacia dentro o hacia fuera. */
function cilindro(o: Obra, m: Mat, r: number, y0: number, y1: number, col: RGB, dentro: boolean, n = 88) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    const [p, q] = [pol(r, a), pol(r, b)];
    const am = (a + b) / 2;
    const s = dentro ? -1 : 1;
    cara(o, m, [[p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]]], [Math.cos(am) * s, 0, Math.sin(am) * s], col);
  }
}

/** Fachada exterior: 44 cuerpos con pilastras, puertas y ventanas abajo y huecos de grada arriba. */
function fachada(o: Obra, c: Ctx) {
  for (let i = 0; i < BAHIAS; i++) {
    const a = (i / BAHIAS) * Math.PI * 2;
    const b = ((i + 1) / BAHIAS) * Math.PI * 2;
    const mc = new Marco(pol(R_EXT, a), pol(R_EXT, b), CENTRO_TOROS);
    const W = mc.usar(o, c);
    muro(o, 0, W, 0, H_ALERO, BLANCO, Mat.Muro, 0.85);
    o.caja(Mat.Detalle, -0.02, 0, 0, W + 0.02, 0.6, 0.07, ALBERO);
    for (const x of [0, W]) o.caja(Mat.Detalle, x - 0.36, 0.6, 0, x + 0.36, H_ALERO, 0.07, ALBERO);
    o.caja(Mat.Detalle, 0, H_PLANTA, 0, W, H_PLANTA + 0.32, 0.07, ALBERO);
    moldura(o, -0.05, W + 0.05, H_ALERO - 0.3, H_ALERO, 0.28, ALBERO);
    const m = W / 2;
    // Planta baja: puertas granate en arco y, cada tres cuerpos, una ventana con carpintería.
    const ventanaBaja = i % 3 === 1;
    const w = ventanaBaja ? 1.3 : 1.55;
    const h = ventanaBaja ? 2.4 : 2.9;
    const y0 = ventanaBaja ? 0.9 : 0.6;
    prisma(o, Mat.Detalle, arco(m - w / 2 - 0.26, m + w / 2 + 0.26, y0 - (ventanaBaja ? 0.26 : 0), y0 + h - w / 2), 0, 0.07, ALBERO, false);
    prisma(o, Mat.Detalle, arco(m - w / 2, m + w / 2, y0, y0 + h - w / 2), 0.07, 0.09, ventanaBaja ? C("#4B3A30") : GRANATE, false);
    if (ventanaBaja && o.fino) {
      prisma(o, Mat.Cristal, arco(m - w / 2 + 0.1, m + w / 2 - 0.1, y0 + 0.1, y0 + h - w / 2), 0.09, 0.1, C("#5C6E78"), false);
      o.caja(Mat.Detalle, m - 0.03, y0, 0.09, m + 0.03, y0 + h - 0.1, 0.12, C("#4B3A30"));
    } else if (o.fino) {
      o.caja(Mat.Detalle, m - 0.02, y0, 0.09, m + 0.02, y0 + h - w / 2, 0.11, C("#4E161B"));
      o.caja(Mat.Detalle, m - 0.18, y0 + h + 0.15, 0.07, m + 0.18, y0 + h + 0.42, 0.09, C("#F2F0EA"));
    }
    // Planta alta: recuadro albero hasta la imposta y hueco en arco rebajado con la grada detrás.
    const wa = 1.7;
    o.caja(Mat.Detalle, m - wa / 2 - 0.3, H_PLANTA + 0.32, 0, m - wa / 2, 9.35, 0.07, ALBERO);
    o.caja(Mat.Detalle, m + wa / 2, H_PLANTA + 0.32, 0, m + wa / 2 + 0.3, 9.35, 0.07, ALBERO);
    o.caja(Mat.Detalle, m - wa / 2, 6.35, 0, m + wa / 2, 6.62, 0.07, ALBERO);
    prisma(o, Mat.Detalle, arco(m - wa / 2 - 0.3, m + wa / 2 + 0.3, 8.4, 8.6), 0, 0.07, ALBERO, false);
    prisma(o, Mat.Detalle, arco(m - wa / 2, m + wa / 2, 6.62, 8.6), 0.07, 0.08, C("#2E2522"), false);
    if (o.fino) for (let y = 6.95; y < 9.0; y += 0.42) o.caja(Mat.Detalle, m - wa / 2, y, 0.03, m + wa / 2, y + 0.12, 0.05, C("#7A2A2C"));
  }
  enMundo(o, c);
}

/** Interior: ruedo, callejón, barrera, tendidos de piedra y gradas cubiertas de madera. */
function interior(o: Obra, c: Ctx) {
  enMundo(o, c);
  anillo(o, Mat.Suelo, 0.01, R_RUEDO, 0.12, ARENA, 64);
  if (o.fino) for (const r of [7, 7.25]) anillo(o, Mat.Detalle, r, r + 0.12, 0.13, C("#B5574A"), 64);
  anillo(o, Mat.Suelo, R_RUEDO, R_CONTRA, 0.1, C("#C99D5C"), 88);
  // Barrera granate con su estribo blanco, y la contrabarrera.
  cilindro(o, Mat.Detalle, R_RUEDO, 0, 1.45, GRANATE, true);
  cilindro(o, Mat.Detalle, R_RUEDO + 0.08, 0, 1.45, GRANATE, false);
  anillo(o, Mat.Detalle, R_RUEDO, R_RUEDO + 0.08, 1.45, C("#5A1A20"));
  if (o.fino) cilindro(o, Mat.Detalle, R_RUEDO - 0.04, 0.2, 0.42, C("#F2EEE6"), true);
  cilindro(o, Mat.Muro, R_CONTRA, 0, 1.8, C("#8A2C30"), true);
  // Tendidos: gradas de piedra con tabicas pintadas de albero.
  const n = 13;
  for (let k = 0; k < n; k++) {
    const r0 = R_CONTRA + ((R_TENDIDO - R_CONTRA) * k) / n;
    const r1 = R_CONTRA + ((R_TENDIDO - R_CONTRA) * (k + 1)) / n;
    const y = 1.8 + ((6.2 - 1.8) * (k + 1)) / n;
    const yAnt = 1.8 + ((6.2 - 1.8) * k) / n;
    cilindro(o, Mat.Muro, r0, yAnt, y, C("#E6B54C"), true);
    anillo(o, Mat.Muro, r0, r1, y, PIEDRA);
  }
  // Pasillo alto y gradas cubiertas de madera granate.
  anillo(o, Mat.Suelo, R_TENDIDO, R_TENDIDO + 0.9, 6.2, C("#CFC9BC"));
  for (let k = 0; k < 6; k++) {
    const r0 = R_TENDIDO + 0.9 + k * 0.85;
    const y = 6.2 + (k + 1) * 0.42;
    cilindro(o, Mat.Detalle, r0, y - 0.42, y, C("#5E1E22"), true, 66);
    anillo(o, Mat.Detalle, r0, r0 + 0.85, y, C("#7B2A2D"), 66);
  }
  // Pared interior del muro de fachada por encima de las gradas.
  cilindro(o, Mat.Muro, R_GRADA + 0.4, 8.7, H_ALERO, BLANCO, true);
  // Pies derechos granate con zapata blanca y antepecho de la grada.
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + 0.03;
    const [x, z] = pol(R_TENDIDO + 0.35, a);
    o.caja(Mat.Detalle, x - 0.22, 6.2, z - 0.22, x + 0.22, 6.95, z + 0.22, C("#F3F0E8"));
    o.caja(Mat.Detalle, x - 0.24, 6.2, z - 0.24, x + 0.24, 6.38, z + 0.24, ALBERO);
    o.caja(Mat.Detalle, x - 0.13, 6.95, z - 0.13, x + 0.13, H_CUMBRE - 0.15, z + 0.13, GRANATE);
    if (o.fino) {
      const [x2, z2] = pol(R_TENDIDO + 1.6, a);
      o.caja(Mat.Detalle, Math.min(x, x2) - 0.05, H_CUMBRE - 1.3, Math.min(z, z2) - 0.05, Math.max(x, x2) + 0.05, H_CUMBRE - 1.18, Math.max(z, z2) + 0.05, GRANATE);
    }
  }
  if (o.fino)
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2 + 0.03;
      const b = ((i + 1) / 44) * Math.PI * 2 + 0.03;
      const [x0, z0] = pol(R_TENDIDO + 0.6, a);
      const [x1, z1] = pol(R_TENDIDO + 0.6, b);
      verja(o, x0, z0, x1, z1, 6.95, 0.95, C("#8C2F33"), 0.7, 0.025);
    }
  // Cubierta a un agua: alta sobre los tendidos y baja hacia la fachada; teja por fuera, madera por dentro.
  anillo(o, Mat.Teja, R_TENDIDO - 0.3, R_EXT + 0.35, H_CUMBRE, TEJA, 88, false, H_ALERO + 0.15);
  anillo(o, Mat.Detalle, R_TENDIDO - 0.3, R_EXT + 0.35, H_CUMBRE - 0.18, C("#D9B27A"), 88, true, H_ALERO - 0.03);
  cilindro(o, Mat.Detalle, R_TENDIDO - 0.3, H_CUMBRE - 0.35, H_CUMBRE + 0.05, C("#C9A26A"), true);
}

/** Puerta de Cuadrillas: cuerpo blanco con remate albero y el portón granate en arco (fotos). */
function cuadrillas(o: Obra, c: Ctx) {
  const h = 4.6;
  const cen: P2 = [2652, 3605];
  for (let i = 0; i < N_BORDE_CUADRILLAS - 1; i++) {
    const a = CUADRILLAS[i];
    const b = CUADRILLAS[i + 1];
    const mc = new Marco(a, b, cen);
    const L = mc.usar(o, c);
    if (L < 0.4) continue;
    muro(o, 0, L, 0, h, BLANCO, Mat.Muro, 0.85);
    o.caja(Mat.Detalle, -0.02, 0, 0, L + 0.02, 0.55, 0.07, ALBERO);
    o.caja(Mat.Muro, -0.05, h - 0.9, 0, L + 0.05, h + 0.45, 0.12, ALBERO);
    if (L > 10) {
      const m = L / 2;
      prisma(o, Mat.Detalle, arco(m - 2.25, m + 2.25, 0, 2.7), 0.12, 0.2, ALBERO, false);
      prisma(o, Mat.Detalle, arco(m - 1.85, m + 1.85, 0, 2.7), 0.2, 0.24, GRANATE, false);
      if (o.fino) for (const y of [0.9, 2.1, 3.3]) for (const s of [-1, 1]) o.caja(Mat.Metal, m + s * 1.75 - 0.35, y, 0.24, m + s * 1.75 + 0.35, y + 0.06, 0.27, C("#1E1B1A"));
      o.caja(Mat.Detalle, m - 1.4, 4.75, 0.12, m + 1.4, 5.05, 0.16, C("#2E3A55"));
    } else if (L > 4) {
      prisma(o, Mat.Detalle, arco(L / 2 - 0.9, L / 2 + 0.9, 0, 2.3), 0.12, 0.17, ALBERO, false);
      prisma(o, Mat.Detalle, arco(L / 2 - 0.65, L / 2 + 0.65, 0, 2.3), 0.17, 0.2, GRANATE, false);
    }
  }
  enMundo(o, c);
  plano(o, Mat.Muro, CUADRILLAS, h + 0.45, C("#D9CFBE"));
  // Mástiles con las banderas sobre la fachada, junto a la puerta (fotos).
  const BANDERAS: [RGB, RGB][] = [[C("#0A7A3E"), C("#F4F4F0")], [C("#C8102E"), C("#F1BF00")], [C("#6FA9DC"), C("#F4F4F0")]];
  BANDERAS.forEach(([b1, b2], k) => {
    const [x, z] = pol(R_EXT - 0.6, -0.12 + k * 0.05);
    o.caja(Mat.Metal, x - 0.04, H_ALERO, z - 0.04, x + 0.04, H_ALERO + 4.0, z + 0.04, C("#E2E2DE"));
    o.caja(Mat.Detalle, x + 0.04, H_ALERO + 2.9, z - 0.02, x + 1.1, H_ALERO + 3.35, z + 0.02, b1);
    o.caja(Mat.Detalle, x + 0.04, H_ALERO + 3.35, z - 0.02, x + 1.1, H_ALERO + 3.8, z + 0.02, b2);
  });
}

/* ── Entorno ───────────────────────────────────────────────────────── */

/** Parterres de albero con árboles jóvenes (OSM: way/1515687927 y way/1415671028). */
const ALBERO_SUR: P2[] = [[2575.3, 3653.4], [2585.8, 3695.2], [2606.0, 3675.3], [2602.1, 3660.3], [2597.9, 3659.2], [2592.6, 3657.8], [2587.4, 3656.5], [2582.0, 3655.1]];
const PARTERRE: P2[] = [[2609.2, 3691.0], [2612.3, 3694.1], [2638.4, 3668.7], [2635.4, 3665.5]];

/** Plaza solada al sur del coso, entre el parterre y la Calle Gerona (fotos; borde aproximado). */
const PLAZA: P2[] = (() => {
  const a0 = Math.atan2(3624.2 - CENTRO_TOROS[1], 2649.2 - CENTRO_TOROS[0]);
  const a1 = (165 * Math.PI) / 180;
  const arcoP: P2[] = [];
  for (let k = 0; k <= 24; k++) arcoP.push(pol(R_EXT - 0.2, a0 + ((a1 - a0) * k) / 24));
  return [...arcoP, [2563.5, 3630], [2569, 3645], [2575.3, 3653.4], [2585.8, 3695.2], [2600, 3699], [2612.3, 3694.1], [2638.4, 3668.7], [2649, 3657], [2655, 3644], [2656.5, 3630]];
})();

function dentro(p: P2, poli: P2[]) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function macetero(o: Obra, x: number, z: number) {
  torno(o, Mat.Detalle, x, 0, z, [[0.55, 0], [0.7, 0.55], [0.72, 0.62]], C("#3A3532"), 10);
  torno(o, Mat.Detalle, x, 0.62, z, [[0.06, 0], [0.05, 1.1]], C("#6B5238"), 5);
  torno(o, Mat.Detalle, x, 1.4, z, [[0.05, 0], [0.55, 0.25], [0.6, 0.6], [0.4, 0.95], [0.02, 1.1]], C("#4D7F3A"), 7);
}

/** Pérgola de tubo de acero gris (fotos). */
function pergola(o: Obra, c: Ctx, a: P2, b: P2) {
  const mc = new Marco(a, b, CENTRO_TOROS);
  const L = mc.usar(o, c);
  const GRIS = C("#9AA0A4");
  const n = Math.max(1, Math.round(L / 3.2));
  for (let k = 0; k <= n; k++) {
    const x = (L * k) / n;
    for (const z of [-1.4, 1.4]) o.caja(Mat.Metal, x - 0.1, 0, z - 0.1, x + 0.1, 3.2, z + 0.1, GRIS);
    o.caja(Mat.Metal, x - 0.1, 3.0, -1.55, x + 0.1, 3.2, 1.55, GRIS);
  }
  for (const z of [-1.4, 1.4]) o.caja(Mat.Metal, 0, 3.0, z - 0.1, L, 3.2, z + 0.1, GRIS);
  if (o.fino) for (let x = 0.4; x < L; x += 0.5) o.caja(Mat.Metal, x - 0.04, 3.2, -1.4, x + 0.04, 3.27, 1.4, GRIS);
}

function entorno(o: Obra, c: Ctx) {
  enMundo(o, c);
  // Solería de adoquín bicolor alrededor del coso y en la plaza del sur.
  plano(o, Mat.Suelo, PLAZA, 0.17, C("#CFC6B2"), 0.4);
  const a0 = (165 * Math.PI) / 180;
  const a1 = Math.atan2(3587.7 - CENTRO_TOROS[1], 2641.1 - CENTRO_TOROS[0]) + Math.PI * 2;
  for (let k = 0; k < 40; k++) {
    const a = a0 + ((a1 - a0) * k) / 40;
    const b = a0 + ((a1 - a0) * (k + 1)) / 40;
    plano(o, Mat.Suelo, [pol(R_EXT - 0.2, a), pol(R_EXT - 0.2, b), pol(R_EXT + 4.5, b), pol(R_EXT + 4.5, a)], 0.17, C("#CFC6B2"), 0.4);
  }
  plano(o, Mat.Suelo, ALBERO_SUR, 0.2, C("#D7B472"), 0.6);
  plano(o, Mat.Suelo, PARTERRE, 0.2, C("#6E8F45"), 0.6);
  // Maceteros con olivos y naranjos junto a la fachada (fotos).
  for (let k = 0; k < 9; k++) {
    const a = (25 + k * 15) * (Math.PI / 180);
    const [x, z] = pol(R_EXT + 3.2, a);
    macetero(o, x, z);
  }
  pergola(o, c, [2592, 3703], [2612, 3698]);
  enMundo(o, c);
  // Busto de Benito Cabrera Vallecillo (OSM).
  const [bx, bz] = [2631, 3658];
  o.caja(Mat.Detalle, bx - 0.4, 0, bz - 0.4, bx + 0.4, 1.9, bz + 0.4, C("#B8B3A8"));
  torno(o, Mat.Detalle, bx, 1.9, bz, [[0.3, 0], [0.32, 0.2], [0.12, 0.32], [0.16, 0.45], [0.15, 0.66], [0.02, 0.74]], C("#4E4A44"), 10);
}

/** Árboles jóvenes en hileras sobre el albero y uno grande junto al parterre (fotos). */
export function arbolesToros(): ArbolSector[] {
  const res: ArbolSector[] = [];
  for (let y = 3658; y < 3696; y += 5)
    for (let x = 2577; x < 2606; x += 5.5) {
      const p: P2 = [x + ((y * 7) % 3) * 0.4, y];
      if (dentro(p, ALBERO_SUR)) res.push({ p, e: Especie.Sombra, esc: 0.5 });
    }
  res.push({ p: [2622, 3680], e: Especie.Sombra, esc: 1.15 });
  res.push({ p: [2645, 3660], e: Especie.Sombra, esc: 0.9 });
  return res;
}

/** Huellas sólidas (colisiones): el coso y el cuerpo de cuadrillas. */
export function solidosToros(): P2[][] {
  const coso: P2[] = [];
  for (let k = 0; k < 44; k++) coso.push(pol(R_EXT, (k / 44) * Math.PI * 2));
  return [coso, CUADRILLAS];
}

export function construirToros(c: Ctx, fino: boolean) {
  const o = new Obra();
  o.fino = fino;
  entorno(o, c);
  fachada(o, c);
  interior(o, c);
  cuadrillas(o, c);
  return o;
}
