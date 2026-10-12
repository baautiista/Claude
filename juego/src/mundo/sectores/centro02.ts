import { Mat, Obra, rgb, type RGB } from "../arquitectura";
import {
  Marco, enMundo, prisma, plano, arco, torno, muro, moldura, sillares, ventana,
  interiorArista, verja, balcon, balaustrada, cierro, reja, toldo, jarron, arbolito, disco, type Ctx, type P2,
} from "./piezas";
import { HUELLAS_C02, type HuellaOSM } from "./centro02.datos";

/**
 * CENTRO-02 · Calle Real (de la Plaza de la Iglesia a la Plaza de la Constitución)
 * y CENTRO-03 · Plaza Cruz Herrera.
 *
 * Huellas: OpenStreetMap (© colaboradores de OSM, ODbL). Aspecto: capturas de
 * Google Maps / Street View aportadas por el usuario, solo como referencia
 * visual. Alturas estimadas (plantas × ~3,1 m). Ver city-reconstruction/.
 */

const C = rgb;
const HIERRO = C("#23262B");
const BLANCO = C("#F6F4EE");
const CRISTAL_TIENDA = C("#6F8796");

export { SUSTITUYE_C02 } from "./centro02.datos";

type Tipo = "bloque" | "ladrillo" | "historico" | "moderno" | "porticos" | "verdes" | "casita" | "casino";
interface Estilo {
  tipo: Tipo;
  color: RGB;
  plantas: number;
  cierros?: boolean;
  /** Planta baja de pilares crema con escaparates entre ellos. */
  pilares?: boolean;
  /** Ventanas con arco de medio punto en todas las plantas. */
  arcos?: boolean;
  /** Balcón en todos los huecos. */
  balcones?: boolean;
  /** Color de las barandillas (por defecto, hierro oscuro). */
  barandilla?: RGB;
  /** Tejado de teja a cuatro aguas. */
  tejado?: boolean;
}

/** Edificios identificados en las fotos (por el centro de su huella OSM). */
const CONOCIDOS: [P2, Estilo][] = [
  [[1182, 2157], { tipo: "casino", color: C("#8DB4DC"), plantas: 2 }], // Casino Círculo Mercantil
  [[1204, 2171], { tipo: "historico", color: C("#9A927C"), plantas: 2 }], // Casa de Maximiliano Rodríguez
  [[1202, 2187], { tipo: "historico", color: C("#B8B6AD"), plantas: 2 }], // La Vivienda Unifamiliar
  [[1228, 2200], { tipo: "porticos", color: C("#D9735A"), plantas: 4 }],
  [[1222, 2205], { tipo: "porticos", color: C("#E0A06A"), plantas: 4 }],
  [[1216, 2203], { tipo: "verdes", color: C("#F4F2EC"), plantas: 3 }],
  [[1213, 2202], { tipo: "verdes", color: C("#F4F2EC"), plantas: 3 }],
  [[1210, 2200], { tipo: "bloque", color: C("#F4F1EA"), plantas: 5 }],
  // Plaza de la Constitución, de Calle Real a Av. España (foto del usuario y POI de OSM)
  [[1240, 2177], { tipo: "bloque", color: C("#D98A6A"), plantas: 5, pilares: true }], // esquina curva salmón (Diputación)
  [[1239, 2182], { tipo: "bloque", color: C("#EFE6D2"), plantas: 5, pilares: true }], // bloque crema (100 Montaditos)
  [[1242, 2187], { tipo: "casita", color: C("#E3A487"), plantas: 2, cierros: true }], // Kebab House
  [[1240, 2191], { tipo: "historico", color: C("#F4F2EC"), plantas: 4, arcos: true, barandilla: C("#2F5FA8") }], // Salón Mónaco
  [[1234, 2199], { tipo: "bloque", color: C("#D9826A"), plantas: 3, balcones: true }],
  [[1230, 2208], { tipo: "bloque", color: C("#F2F0EA"), plantas: 3, balcones: true }], // Hostal Carlos I
  [[1225, 2217], { tipo: "bloque", color: C("#CDB06A"), plantas: 10, balcones: true, barandilla: C("#4E7A4A") }], // torre ocre
  [[1221, 2224], { tipo: "moderno", color: C("#F6F4EF"), plantas: 3 }], // esquina blanca, Av. España
  [[1235, 2175], { tipo: "bloque", color: C("#E9A98A"), plantas: 8 }],
  [[1229, 2176], { tipo: "casita", color: C("#F3F1EB"), plantas: 2 }], // Bablú
  [[1224, 2171], { tipo: "bloque", color: C("#A8322E"), plantas: 5, cierros: true }],
  [[1224, 2167], { tipo: "bloque", color: C("#A8322E"), plantas: 5 }],
  [[1221, 2169], { tipo: "bloque", color: C("#E3A672"), plantas: 5 }],
  [[1219, 2165], { tipo: "bloque", color: C("#E8C35A"), plantas: 5 }],
  [[1216, 2178], { tipo: "casita", color: C("#7E8B62"), plantas: 1 }], // Hacienda Patagónica
  [[1207, 2165], { tipo: "ladrillo", color: C("#F6F3EC"), plantas: 5 }], // Molly Bloom's
  [[1162, 2136], { tipo: "moderno", color: C("#F1EFEA"), plantas: 6 }], // Edf. Modelo (Caixabank)
  [[1144, 2148], { tipo: "historico", color: C("#EDE0C8"), plantas: 3 }], // Antiguo Cine
  [[1140, 2131], { tipo: "bloque", color: C("#E3CFA8"), plantas: 5 }],
  [[1133, 2147], { tipo: "bloque", color: C("#B9452F"), plantas: 4, cierros: true }],
];

/** Paleta de la Calle Real (fotos): salmón, crema, rojo, amarillo, blanco, rosa palo. */
const PALETA = ["#E9B38F", "#EFE3C6", "#C9533E", "#E8C35A", "#F4F2EC", "#EBC9B8", "#D9A37A", "#F2EBDD"].map(C);
const ROTULOS = ["#C0392B", "#1F5EFF", "#2E7D4F", "#E6A93A", "#8E2A6E", "#D6336C", "#2B2D31", "#F4F1EA"].map(C);

function azar(s: number) {
  let v = Math.floor(Math.abs(s)) % 2147483646 || 7;
  return () => ((v = (v * 16807) % 2147483647) / 2147483647);
}

function estiloDe(h: HuellaOSM): Estilo {
  for (const [c, e] of CONOCIDOS) if (Math.abs(c[0] - h.c[0]) < 2.5 && Math.abs(c[1] - h.c[1]) < 2.5) return e;
  const r = azar(h.c[0] * 131 + h.c[1] * 7);
  const t = r();
  const tipo: Tipo = t < 0.18 ? "ladrillo" : t < 0.3 ? "moderno" : t < 0.4 ? "historico" : "bloque";
  return { tipo, color: PALETA[Math.floor(r() * PALETA.length)], plantas: tipo === "historico" ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 3), cierros: r() < 0.3 };
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

/** Quita vértices casi alineados o muy juntos (las huellas OSM traen muchos). */
function simplificar(p: P2[]): P2[] {
  let q = p.filter((v, i) => i === 0 || Math.hypot(v[0] - p[i - 1][0], v[1] - p[i - 1][1]) > 0.6);
  let cambio = true;
  while (cambio && q.length > 4) {
    cambio = false;
    for (let i = 0; i < q.length; i++) {
      const a = q[(i + q.length - 1) % q.length];
      const b = q[i];
      const c = q[(i + 1) % q.length];
      const cruz = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      if (cruz / Math.max(0.01, Math.hypot(c[0] - a[0], c[1] - a[1])) < 0.35) {
        q = q.filter((_, k) => k !== i);
        cambio = true;
        break;
      }
    }
  }
  return q;
}

const vanos = (L: number, paso: number, margen = 0.6) => {
  const n = Math.max(1, Math.round((L - margen * 2) / paso));
  return Array.from({ length: n }, (_, i) => margen + ((i + 0.5) * (L - margen * 2)) / n);
};

/* ── Fachadas por tipo ───────────────────────────────────────────── */

function edificio(o: Obra, c: Ctx, h: HuellaOSM, poli: P2[], todas: P2[][], ocupado: (p: P2) => boolean) {
  const e = estiloDe(h);
  const r = azar(h.c[0] * 17 + h.c[1] * 3);
  const PB = e.tipo === "casita" ? 3.6 : 4.2;
  const P = 3.05;
  const H = e.tipo === "casita" ? PB + (e.plantas - 1) * P : PB + (e.plantas - 1) * P;
  const claro = (k: number): RGB => [Math.min(1, e.color[0] * k), Math.min(1, e.color[1] * k), Math.min(1, e.color[2] * k)];
  const moldC = e.tipo === "historico" ? claro(1.12) : e.tipo === "verdes" ? C("#2E7D3A") : e.tipo === "casino" ? BLANCO : claro(1.18);
  const matMuro = e.tipo === "ladrillo" ? Mat.Ladrillo : Mat.Muro;
  const colMuro: RGB = e.tipo === "ladrillo" ? [1.0, 1.42, 1.3] : e.color;
  for (let i = 0; i < poli.length; i++) {
    const mc = new Marco(poli[i], poli[(i + 1) % poli.length], interiorArista(poli, i));
    const L = mc.usar(o, c);
    muro(o, 0, L, 0, H, colMuro, matMuro, 0.8);
    const fuera = mc.g(L / 2, 1.3);
    const calle = L > 2.2 && !todas.some((t) => t !== poli && dentroPoli(fuera, t)) && (h.f === 1 || !ocupado(fuera));
    if (!calle) continue;
    // Planta baja: comercio con escaparate, rótulo y a veces toldo.
    const bajo: RGB = e.tipo === "casino" ? C("#7C7A77") : e.tipo === "moderno" ? C("#E9E7E2") : e.tipo === "historico" ? claro(0.92) : claro(1.05);
    muro(o, 0, L, 0, PB, bajo, Mat.Muro, 0.8, 0.03);
    if (e.tipo === "historico" || e.tipo === "casino") sillares(o, 0, L, 0, e.tipo === "casino" ? 1.1 : PB, 0.55, claro(0.8));
    moldura(o, -0.05, L + 0.05, PB - 0.12, PB + 0.12, 0.18, moldC);
    if (e.tipo === "porticos") {
      // Soportales: arcos sobre pilares y balaustrada corrida encima.
      for (const x of vanos(L, 2.6, 0.2)) {
        prisma(o, Mat.Detalle, arco(x - 1.1, x + 1.1, 0, 2.6), 0, 0.06, C("#3E3C3A"));
        o.caja(Mat.Detalle, x - 1.35, 0, 0.02, x - 1.1, 3.7, 0.3, BLANCO);
      }
      balaustrada(o, 0.1, L - 0.1, PB + 0.1, 0.9, 0.35, BLANCO, 0.3);
      o.caja(Mat.Detalle, 0, PB, 0, L, PB + 0.12, 0.55, BLANCO);
    } else if (e.tipo === "casino") {
      const m = L / 2;
      prisma(o, Mat.Detalle, arco(m - 0.9, m + 0.9, 0.3, 2.9), 0.03, 0.06, C("#2A2522"));
      o.caja(Mat.Detalle, m - 1.2, 0.3, 0.02, m + 1.2, 3.3, 0.12, BLANCO);
      o.caja(Mat.Detalle, m - 0.8, 3.45, 0.02, m + 0.8, 3.95, 0.08, C("#D9D6CC"));
      for (const x of [m - 1.6, m + 1.6]) o.caja(Mat.Detalle, x - 0.2, 0, 0.02, x + 0.2, H, 0.2, BLANCO);
      for (const x of [0.4, L - 0.4]) o.caja(Mat.Detalle, x - 0.25, 0, 0.02, x + 0.25, H, 0.2, BLANCO);
      for (const x of vanos(L, 2.6, 0.8)) if (Math.abs(x - m) > 2) o.caja(Mat.Cristal, x - 0.8, 1.2, 0.04, x + 0.8, 3.2, 0.06, CRISTAL_TIENDA);
      // Balcón corrido curvo con balaustres y cornisa con escudo y jarrones.
      o.caja(Mat.Detalle, 0.3, PB + 0.2, 0, L - 0.3, PB + 0.4, 1.1, BLANCO);
      balaustrada(o, 0.4, L - 0.4, PB + 0.4, 0.9, 1.0, claro(1.0), 0.18);
      for (const x of vanos(L, 2.4, 0.9)) {
        ventana(o, x, PB + 1.0, 1.0, 1.6, { marco: BLANCO, recercado: BLANCO, recercadoAncho: 0.2 });
        reja(o, x, PB + 1.0, 1.0, 1.6, 0.08, HIERRO);
      }
      moldura(o, -0.1, L + 0.1, H - 0.3, H + 0.2, 0.4, BLANCO);
      o.caja(Mat.Muro, m - 2.2, H + 0.2, -0.2, m + 2.2, H + 1.3, 0.15, e.color);
      o.caja(Mat.Detalle, m - 1.4, H + 0.5, 0.15, m + 1.4, H + 0.95, 0.18, C("#E2C25A"));
      for (const x of [0.5, m - 2.2, m + 2.2, L - 0.5]) jarron(o, x, H + 0.2, 0, 0.8, BLANCO);
      if (o.fino) for (let k = 0; k < 4; k++) {
        const fx = m - 0.9 + k * 0.6;
        o.caja(Mat.Metal, fx - 0.02, PB + 1.2, 0.3, fx + 0.02, PB + 3.2, 0.34, C("#9A9A9A"));
        o.caja(Mat.Detalle, fx + 0.02, PB + 2.5, 0.31, fx + 0.5, PB + 3.1, 0.32, [C("#1F5EFF"), C("#C0392B"), C("#2E7D4F"), C("#1F5EFF")][k]);
      }
      continue;
    } else if (e.tipo === "casita") {
      o.caja(Mat.Detalle, 0.6, 0, 0.02, 1.6, 2.4, 0.06, C("#2B2D31"));
      if (L > 3) ventana(o, L * 0.6, PB * 0.55, 1.0, 1.1, { marco: C("#2B2D31") });
      if (o.fino && e.color[1] < 0.6) disco(o, Mat.Detalle, L * 0.82, H - 1.2, 0.02, 0.06, 0.3, BLANCO, 14);
    } else if (e.pilares) {
      for (const x of vanos(L, 3.0, 0.2)) o.caja(Mat.Cristal, x - 1.15, 0.15, 0.03, x + 1.15, 3.2, 0.06, CRISTAL_TIENDA);
      for (let k = 0; k <= Math.round(L / 3); k++) {
        const x = Math.min(L - 0.25, Math.max(0.25, (k * L) / Math.round(L / 3)));
        o.caja(Mat.Detalle, x - 0.25, 0, 0, x + 0.25, PB, 0.35, C("#EFE6D2"));
      }
    } else {
      const tiendas = vanos(L, 4.2, 0.3);
      for (const x of tiendas) {
        o.caja(Mat.Cristal, x - 1.6, 0.15, 0.03, x + 1.6, 2.9, 0.06, CRISTAL_TIENDA);
        o.caja(Mat.Detalle, x - 1.7, 2.95, 0.03, x + 1.7, 3.65, 0.22, ROTULOS[Math.floor(r() * ROTULOS.length)]);
        if (r() < 0.35) toldo(o, x - 1.6, x + 1.6, 3.9, 1.4, 0.45, r() < 0.5 ? C("#EFEDE6") : C("#7A3A2E"));
      }
    }
    // Plantas altas.
    for (let p = 1; p < e.plantas; p++) {
      const y = PB + (p - 1) * P;
      if (e.tipo !== "historico") moldura(o, -0.03, L + 0.03, y - 0.06, y + 0.08, 0.1, moldC);
      for (const x of vanos(L, e.tipo === "historico" ? 2.4 : 2.0, 0.7)) {
        const t = r();
        if (e.tipo === "moderno") {
          o.caja(Mat.Cristal, x - 0.9, y + 0.6, 0.02, x + 0.9, y + 2.4, 0.05, C("#7FA3B8"));
          o.caja(Mat.Detalle, x - 1.0, y + 0.45, 0, x + 1.0, y + 0.6, 0.6, BLANCO);
          continue;
        }
        if (e.cierros && (t < 0.4 || e.tipo === "casita")) {
          cierro(o, x, y + 0.4, 1.4, 2.4, 0.55, BLANCO, HIERRO);
          continue;
        }
        const op = {
          marco: e.tipo === "historico" ? C("#E6E0D2") : BLANCO,
          recercado: e.tipo === "verdes" ? C("#2E7D3A") : e.tipo === "historico" ? claro(1.15) : undefined,
          recercadoAncho: e.tipo === "verdes" ? 0.18 : 0.12,
          arco: e.arcos || e.tipo === "verdes" || (e.tipo === "historico" && t < 0.3),
          persiana: e.tipo === "historico" ? undefined : C("#EDEBE4"),
          bajada: 0.2 + r() * 0.4,
          cuarterones: e.tipo === "historico",
        };
        ventana(o, x, y + 0.55, 1.0, e.tipo === "historico" ? 2.1 : 1.6, op);
        const hierro = e.barandilla ?? HIERRO;
        if (e.balcones || e.arcos || e.tipo === "ladrillo" || e.tipo === "verdes" || t < 0.55) balcon(o, x, y + 0.55, 1.4, 0.45, claro(1.15), hierro);
        else if (t < 0.7) reja(o, x, y + 0.55, 1.0, 1.4, 0.15, hierro);
      }
      if (e.tipo === "historico" && o.fino) for (let k = 0; k < Math.floor(L / 0.9); k++) o.caja(Mat.Detalle, 0.4 + k * 0.9, y + 0.4, 0.035, 0.46 + k * 0.9, y + 2.8, 0.045, C("#3E6FB5"));
    }
    // Remate: cornisa; balaustrada en los históricos y casitas; pretil en el resto.
    moldura(o, -0.12, L + 0.12, H - 0.25, H + 0.08, 0.35, moldC);
    if (e.tipo === "historico" || e.tipo === "casita") balaustrada(o, 0.2, L - 0.2, H + 0.08, 0.95, 0, claro(1.08), 0.3);
    else o.caja(Mat.Muro, 0, H + 0.08, -0.22, L, H + 0.9, 0, colMuro);
  }
  enMundo(o, c);
  plano(o, Mat.Muro, poli, H + 0.01, C("#CDBFAE"));
  // Tejado de teja en la casita de la Patagónica.
  if (e.tejado || (e.tipo === "casita" && e.plantas === 1)) {
    const xs = poli.map((p) => p[0]);
    const zs = poli.map((p) => p[1]);
    enMundo(o, c, H);
    o.tejado(Math.min(...xs) - 0.3, Math.max(...xs) + 0.3, Math.min(...zs) - 0.3, Math.max(...zs) + 0.3, 0, 1.6, C("#B5603E"), e.color, true);
  }
}

/* ── Calle Real: pavimento, farolas, maceteros y terrazas ────────── */

const REAL: P2[] = [[1121.6, 2133.6], [1154.8, 2141.7], [1195.0, 2151.9], [1208.9, 2154.9], [1213.9, 2156.3], [1217.7, 2158.0], [1244.6, 2171.5], [1253.5, 2175.7]];

function farolaFernandina(o: Obra, x: number, z: number) {
  const N = C("#1D2421");
  torno(o, Mat.Metal, x, 0, z, [[0.2, 0], [0.18, 0.4], [0.11, 0.55], [0.08, 1.2], [0.06, 3.3], [0.1, 3.4], [0.05, 3.55]], N, 8);
  torno(o, Mat.Luz, x, 3.55, z, [[0.12, 0], [0.25, 0.2], [0.28, 0.65], [0.2, 0.78]], C("#F1E2B4"), 8);
  torno(o, Mat.Metal, x, 4.3, z, [[0.26, 0], [0.3, 0.1], [0.14, 0.26], [0.18, 0.36], [0.02, 0.5]], N, 8);
}

function macetero(o: Obra, x: number, z: number) {
  torno(o, Mat.Detalle, x, 0, z, [[0.25, 0], [0.45, 0.3], [0.55, 0.5], [0.5, 0.55], [0.4, 0.52]], C("#2B2D31"), 12);
  arbolito(o, x, 0.45, z, 1.9, C("#3F7A36"));
}

function calleReal(o: Obra, c: Ctx) {
  enMundo(o, c);
  const ROJO = C("#A86A5C");
  const r = azar(41);
  for (let i = 1; i < REAL.length; i++) {
    const [ax, az] = REAL[i - 1];
    const [bx, bz] = REAL[i];
    const L = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / L;
    const uz = (bz - az) / L;
    const nx = -uz;
    const nz = ux;
    const W = 5.3;
    const q = (s: number, d: number): P2 => [ax + ux * s + nx * d, az + uz * s + nz * d];
    plano(o, Mat.Suelo, [q(-0.6, -W), q(L + 0.6, -W), q(L + 0.6, W), q(-0.6, W)], 0.34, ROJO, 0.5);
    // Bandas oscuras y blancas a los lados de la franja central.
    for (const s of [-1, 1]) {
      plano(o, Mat.Detalle, [q(0, s * 2.5), q(L, s * 2.5), q(L, s * 2.75), q(0, s * 2.75)], 0.345, C("#3A3634"));
      plano(o, Mat.Detalle, [q(0, s * 2.3), q(L, s * 2.3), q(L, s * 2.45), q(0, s * 2.45)], 0.346, C("#EDEBE6"));
    }
    if (o.fino) for (let s = 1; s < L; s += 1.6) for (const d of [-4.0, -1.2, 1.2, 4.0]) {
      const [px, pz] = q(s + (d > 0 ? 0.8 : 0), d);
      plano(o, Mat.Detalle, [[px, pz - 0.12], [px + 0.12, pz], [px, pz + 0.12], [px - 0.12, pz]], 0.347, C("#F2F0EA"));
    }
    // Farolas y maceteros alternos por el eje, terrazas con sombrillas blancas.
    for (let s = 5; s < L - 2; s += 13) {
      const lado = Math.floor(s / 13) % 2 ? 1 : -1;
      const [fx, fz] = q(s, lado * 2.62);
      enMundo(o, c, 0.34);
      farolaFernandina(o, fx, fz);
      const [mx, mz] = q(s + 6, -lado * 2.62);
      macetero(o, mx, mz);
      if (r() < 0.45) {
        const [tx, tz] = q(s + 3, 0);
        torno(o, Mat.Metal, tx, 0, tz, [[0.04, 0], [0.04, 2.3]], C("#D9D9D4"), 5);
        torno(o, Mat.Detalle, tx, 2.1, tz, [[1.6, 0], [1.55, 0.1], [0.06, 0.55]], C("#F1EEE6"), 4);
      }
      enMundo(o, c);
    }
  }
}

/* ── Plaza Cruz Herrera ──────────────────────────────────────────── */

const PLAZA: P2[] = [[1207.5, 2176.0], [1215.5, 2178.5], [1222.5, 2183.0], [1236.0, 2185.5], [1232.0, 2196.5], [1218.0, 2196.0], [1206.0, 2195.0], [1202.5, 2190.0]];
const FUENTE: P2 = [1215.0, 2188.0];

/** Fuente de azulejos: vaso estrellado con borde de azulejo y pilar escalonado con farola de cuatro brazos. */
function fuente(o: Obra, c: Ctx) {
  enMundo(o, c, 0.34);
  const [fx, fz] = FUENTE;
  const AZUL = C("#1E3F9A");
  const AZULEJO = C("#D9B65A");
  const BARRO = C("#B5745A");
  // Vaso en estrella de ocho puntas.
  const estrella: P2[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    const rr = i % 2 ? 3.1 : 3.9;
    estrella.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const borde = (k: number) => estrella.map(([x, y]) => [fx + x * k, fz + y * k] as P2);
  for (let i = 0; i < estrella.length; i++) {
    const a = borde(1)[i];
    const b = borde(1)[(i + 1) % estrella.length];
    const mc = new Marco(a, b, FUENTE);
    const L = mc.usar(o, c, 0.34);
    o.caja(Mat.Detalle, 0, 0, -0.35, L, 0.62, 0, AZULEJO);
    o.caja(Mat.Detalle, 0, 0.05, 0.001, L, 0.18, 0.01, AZUL);
    o.caja(Mat.Detalle, 0, 0.5, 0.001, L, 0.62, 0.01, AZUL);
    o.caja(Mat.Detalle, -0.05, 0.62, -0.38, L + 0.05, 0.7, 0.03, C("#F2EDE0"));
  }
  enMundo(o, c, 0.34);
  plano(o, Mat.Detalle, borde(0.92), 0.4, C("#2347A8"));
  // Pilar escalonado de barro y azulejo.
  const escalon = (r0: number, y0: number, h: number, col: RGB) => o.caja(Mat.Detalle, fx - r0, y0, fz - r0, fx + r0, y0 + h, fz + r0, col);
  escalon(1.25, 0, 0.5, AZUL);
  escalon(1.05, 0.5, 0.35, BARRO);
  escalon(0.9, 0.85, 0.5, AZULEJO);
  escalon(0.8, 1.35, 0.25, BARRO);
  escalon(0.62, 1.6, 1.4, AZULEJO);
  if (o.fino) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) o.caja(Mat.Detalle, fx + dx * 0.625 - Math.abs(dz) * 0.4 - 0.005, 1.75, fz + dz * 0.625 - Math.abs(dx) * 0.4 - 0.005, fx + dx * 0.63 + Math.abs(dz) * 0.4, 2.85, fz + dz * 0.63 + Math.abs(dx) * 0.4, AZUL);
  escalon(0.72, 3.0, 0.3, BARRO);
  escalon(0.5, 3.3, 0.6, AZULEJO);
  escalon(0.6, 3.9, 0.15, BARRO);
  // Farola de cuatro brazos sobre el pilar.
  const N = C("#2A2620");
  torno(o, Mat.Metal, fx, 4.05, fz, [[0.18, 0], [0.12, 0.3], [0.07, 0.4], [0.06, 1.4], [0.18, 1.55], [0.05, 1.65]], N, 8);
  for (const [dx, dz] of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) {
    o.caja(Mat.Metal, fx + Math.min(0, dx) - 0.03, 5.45, fz + Math.min(0, dz) - 0.03, fx + Math.max(0, dx) + 0.03, 5.52, fz + Math.max(0, dz) + 0.03, N);
    torno(o, Mat.Luz, fx + dx, 5.1, fz + dz, [[0.1, 0], [0.2, 0.15], [0.22, 0.5], [0.15, 0.6]], C("#F1E2B4"), 6);
    torno(o, Mat.Metal, fx + dx, 5.7, fz + dz, [[0.2, 0], [0.1, 0.18], [0.02, 0.3]], N, 6);
  }
  // Verja baja curva alrededor.
  const n = 20;
  for (let i = 0; i < n; i++) {
    if (i % 5 === 2) continue;
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    verja(o, fx + Math.cos(a0) * 5.0, fz + Math.sin(a0) * 5.0, fx + Math.cos(a1) * 5.0, fz + Math.sin(a1) * 5.0, 0, 0.75, HIERRO, 0.14, 0.02);
  }
  enMundo(o, c);
  const empedrado: P2[] = [];
  for (let i = 0; i < 28; i++) empedrado.push([fx + Math.cos((i / 28) * Math.PI * 2) * 5.0, fz + Math.sin((i / 28) * Math.PI * 2) * 5.0]);
  plano(o, Mat.Suelo, empedrado, 0.35, C("#8F8C86"), 1.5);
}

function pergola(o: Obra, x0: number, z0: number, x1: number, z1: number, poste: RGB, techo: RGB) {
  for (const x of [x0, x1, (x0 + x1) / 2]) for (const z of [z0, z1]) o.caja(Mat.Detalle, x - 0.12, 0, z - 0.12, x + 0.12, 2.9, z + 0.12, poste);
  o.caja(Mat.Detalle, x0 - 0.3, 2.9, z0 - 0.3, x1 + 0.3, 3.0, z1 + 0.3, techo);
  for (const z of [z0, z1]) o.caja(Mat.Detalle, x0 - 0.3, 2.7, z - 0.1, x1 + 0.3, 2.9, z + 0.1, poste);
}

function palmera(o: Obra, x: number, z: number, h: number) {
  torno(o, Mat.Detalle, x, 0, z, [[0.28, 0], [0.22, 0.6], [0.18, h]], C("#7A6248"), 7);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const ex = x + Math.cos(a) * 2.1;
    const ez = z + Math.sin(a) * 2.1;
    o.poli(Mat.Detalle, [[x, h, z], [ex + Math.sin(a) * 0.4, h - 0.6, ez - Math.cos(a) * 0.4], [ex - Math.sin(a) * 0.4, h - 0.6, ez + Math.cos(a) * 0.4]], C("#3E7A36"));
    o.poli(Mat.Detalle, [[x, h, z], [ex - Math.sin(a) * 0.4, h - 0.6, ez + Math.cos(a) * 0.4], [ex + Math.sin(a) * 0.4, h - 0.6, ez - Math.cos(a) * 0.4]], C("#3E7A36"));
  }
}

function plazaCruzHerrera(o: Obra, c: Ctx) {
  enMundo(o, c);
  plano(o, Mat.Suelo, PLAZA, 0.34, C("#B4AFA6"), 0.6);
  fuente(o, c);
  enMundo(o, c, 0.34);
  // Pérgola de madera junto a la casa de la balaustrada y pérgola blanca de lona verde.
  pergola(o, 1204.0, 2181.5, 1209.5, 2185.0, C("#C8692E"), C("#8A8E92"));
  pergola(o, 1224.0, 2190.5, 1229.0, 2194.0, BLANCO, C("#4F7D5B"));
  // Jardinera alta con dos palmeras y naranjos en alcorques.
  o.caja(Mat.Detalle, 1227.0, 0, 2182.2, 1231.0, 0.7, 2184.8, C("#9C9890"));
  palmera(o, 1228.2, 2183.5, 9.5);
  palmera(o, 1229.8, 2183.5, 8.6);
  for (const [x, z] of [[1210.5, 2181.0], [1213.5, 2182.0], [1220.0, 2194.0], [1223.5, 2189.5], [1209.0, 2192.5]] as P2[]) arbolito(o, x, 0, z, 3.2, C("#3F7A36"));
  // Terrazas con sombrillas verdes (Bablú) y bancos de forja.
  for (const [x, z] of [[1229.0, 2179.2], [1232.0, 2180.0], [1234.6, 2181.0]] as P2[]) {
    torno(o, Mat.Metal, x, 0, z, [[0.04, 0], [0.04, 2.4]], C("#DDDCD6"), 5);
    torno(o, Mat.Detalle, x, 2.0, z, [[1.5, 0], [1.45, 0.08], [0.05, 0.6]], C("#2E6B45"), 8);
  }
  for (const [x, z] of [[1218.5, 2191.8], [1210.5, 2186.5]] as P2[]) {
    o.caja(Mat.Metal, x - 0.8, 0.4, z - 0.25, x + 0.8, 0.46, z + 0.25, HIERRO);
    o.caja(Mat.Metal, x - 0.8, 0.46, z - 0.27, x + 0.8, 0.95, z - 0.23, HIERRO);
  }
  for (const [x, z] of [[1206.5, 2179.5], [1225.0, 2196.0]] as P2[]) farolaFernandina(o, x, z);
  enMundo(o, c);
}

/* ── Plaza de la Constitución ─────────────────────────────────────── */

/** Losa gris de la plaza, desde las fachadas hasta Correos y la Av. del Ejército (OSM). */
const CONSTITUCION: P2[] = [[1251.0, 2176.5], [1264.7, 2181.1], [1273.0, 2184.5], [1272.0, 2192.0], [1266.0, 2206.0], [1266.0, 2222.0], [1273.0, 2244.0], [1270.0, 2256.0], [1246.5, 2256.5], [1243.5, 2245.0], [1234.0, 2232.0], [1231.5, 2223.8], [1233.2, 2219.8], [1236.5, 2216.0], [1239.4, 2208.6], [1243.0, 2203.0], [1247.0, 2196.0], [1249.0, 2190.0]];
/** Parterres de OSM: en la plaza son jardineras con murete rojo y naranjos en bola. */
const PARTERRES: P2[][] = [
  [[1252.5, 2190.1], [1253.8, 2191.7], [1257.5, 2190.7], [1260.4, 2187.5], [1261.7, 2184.7], [1261.5, 2180.0], [1258.8, 2179.1], [1252.7, 2187.3]],
  [[1246.7, 2203.0], [1248.4, 2204.4], [1251.1, 2202.1], [1251.3, 2198.5], [1248.5, 2197.4], [1247.8, 2200.5]],
  [[1264.0, 2191.2], [1264.3, 2195.1], [1270.7, 2192.2], [1272.1, 2187.6], [1272.3, 2184.5], [1268.3, 2185.0]],
  [[1262.0, 2203.7], [1264.0, 2205.9], [1267.4, 2201.2], [1264.2, 2200.2], [1262.2, 2201.5]],
  [[1260.9, 2211.8], [1263.3, 2216.0], [1265.2, 2218.3], [1264.7, 2214.6], [1261.7, 2209.2]],
  [[1239.8, 2214.1], [1238.8, 2215.3], [1248.0, 2216.1], [1248.0, 2219.7], [1250.0, 2219.3], [1249.0, 2214.7], [1247.1, 2212.0], [1245.3, 2214.2], [1244.2, 2214.8]],
];
const FUENTE_CONSTITUCION: P2 = [1244.0, 2231.6];

function plazaConstitucion(o: Obra, c: Ctx) {
  enMundo(o, c);
  plano(o, Mat.Suelo, CONSTITUCION, 0.36, C("#9E9C98"), 0.45);
  // Bandas oscuras curvas del pavimento, concéntricas a la fuente.
  if (o.fino) for (const R of [24, 31, 38, 45]) {
    const n = 90;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI * 0.62 + (i / n) * Math.PI * 0.9;
      const a1 = a0 + (Math.PI * 0.9) / n;
      const p = (a: number, r: number): P2 => [FUENTE_CONSTITUCION[0] + Math.cos(a) * r, FUENTE_CONSTITUCION[1] + Math.sin(a) * r];
      if (!dentroPoli(p((a0 + a1) / 2, R), CONSTITUCION)) continue;
      plano(o, Mat.Detalle, [p(a0, R - 0.18), p(a1, R - 0.18), p(a1, R + 0.18), p(a0, R + 0.18)], 0.365, C("#45464A"));
    }
  }
  // Jardineras con murete rojo, tierra y naranjos recortados en bola.
  const ROJO = C("#B5503F");
  for (const poli of PARTERRES) {
    for (let i = 0; i < poli.length; i++) {
      const mc = new Marco(poli[i], poli[(i + 1) % poli.length], interiorArista(poli, i));
      const L = mc.usar(o, c, 0.36);
      if (L < 0.2) continue;
      o.caja(Mat.Muro, -0.15, 0, -0.35, L + 0.15, 0.95, 0, ROJO);
      o.caja(Mat.Detalle, -0.18, 0.95, -0.38, L + 0.18, 1.02, 0.03, C("#C9C3B8"));
    }
    enMundo(o, c);
    plano(o, Mat.Detalle, poli, 1.2, C("#4E7A3C"));
    const cx = poli.reduce((a, p) => a + p[0], 0) / poli.length;
    const cz = poli.reduce((a, p) => a + p[1], 0) / poli.length;
    enMundo(o, c, 1.2);
    arbolito(o, cx, 0, cz, 2.6, C("#3F7A36"));
    enMundo(o, c);
  }
  enMundo(o, c, 0.36);
  // Fuente de la Constitución: vaso circular de piedra con agua.
  const [fx, fz] = FUENTE_CONSTITUCION;
  torno(o, Mat.Detalle, fx, 0, fz, [[3.9, 0], [3.9, 0.6], [3.6, 0.65], [3.5, 0.1]], C("#D8D2C4"), 28);
  enMundo(o, c);
  const agua: P2[] = [];
  for (let i = 0; i < 28; i++) agua.push([fx + Math.cos((i / 28) * Math.PI * 2) * 3.55, fz + Math.sin((i / 28) * Math.PI * 2) * 3.55]);
  plano(o, Mat.Cristal, agua, 0.8, C("#5E8FB0"));
  enMundo(o, c, 0.36);
  // Palmera grande tras la primera jardinera y quiosco de prensa.
  palmera(o, 1256.5, 2185.0, 11);
  o.caja(Mat.Muro, 1250.6, 0, 2180.6, 1253.4, 2.6, 2183.0, C("#D9DADC"));
  o.caja(Mat.Detalle, 1250.4, 2.6, 2180.4, 1253.6, 3.1, 2183.2, C("#2B2D31"));
  // Parada de taxis con marquesina de madera.
  pergola(o, 1258.5, 2174.6, 1271.0, 2177.2, C("#5A3E2B"), C("#6B4A33"));
  for (const [x, z] of [[1247.0, 2185.5], [1243.5, 2199.5], [1239.0, 2210.5], [1262.0, 2198.0]] as P2[]) farolaFernandina(o, x, z);
  enMundo(o, c);
}

/** Construye CENTRO-02/03: edificios sobre huellas OSM, Calle Real y Plaza Cruz Herrera. */
/** Retranquea hacia dentro las caras que dan a la calle (calles más anchas que en el plano). */
function retranquear(poli: P2[], todas: P2[][], ocupado: (p: P2) => boolean, d: number): P2[] {
  const n = poli.length;
  const lineas = poli.map((a, i) => {
    const b = poli[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let nx = -(b[1] - a[1]) / L;
    let ny = (b[0] - a[0]) / L;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const dentro = interiorArista(poli, i);
    if (nx * (dentro[0] - mx) + ny * (dentro[1] - my) > 0) (nx = -nx), (ny = -ny);
    const fuera: P2 = [mx + nx * 1.3, my + ny * 1.3];
    const calle = L > 2.2 && !todas.some((t) => t !== poli && dentroPoli(fuera, t)) && !ocupado(fuera);
    const k = calle ? d : 0;
    return { a: [a[0] - nx * k, a[1] - ny * k] as P2, b: [b[0] - nx * k, b[1] - ny * k] as P2 };
  });
  const res: P2[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lineas[(i + n - 1) % n];
    const l2 = lineas[i];
    const d1x = l1.b[0] - l1.a[0], d1y = l1.b[1] - l1.a[1];
    const d2x = l2.b[0] - l2.a[0], d2y = l2.b[1] - l2.a[1];
    const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-6) {
      res.push(l2.a);
      continue;
    }
    const t = ((l2.a[0] - l1.a[0]) * d2y - (l2.a[1] - l1.a[1]) * d2x) / den;
    const p: P2 = [l1.a[0] + d1x * t, l1.a[1] + d1y * t];
    res.push(Math.hypot(p[0] - poli[i][0], p[1] - poli[i][1]) > d * 3 ? l2.a : p);
  }
  return res;
}

let cachePolis: P2[][] | null = null;
/** Huellas finales (simplificadas y retranqueadas) de CENTRO-02/03. */
export function solidosCentro02(ocupado: (p: P2) => boolean): P2[][] {
  if (cachePolis) return cachePolis;
  const base = HUELLAS_C02.map((h) => simplificar(h.p));
  cachePolis = base.map((p, i) => (HUELLAS_C02[i].f ? p : retranquear(p, base, ocupado, 2.2)));
  return cachePolis;
}

export function construirCentro02(c: Ctx, ocupado: (p: P2) => boolean, fino: boolean) {
  const o = new Obra();
  o.fino = fino;
  const polis = solidosCentro02(ocupado);
  HUELLAS_C02.forEach((h, i) => edificio(o, c, h, polis[i], polis, ocupado));
  calleReal(o, c);
  plazaCruzHerrera(o, c);
  plazaConstitucion(o, c);
  return o;
}

/** Centro aproximado del sector (para el LOD). */
export const CENTRO_C02: P2 = [1190, 2165];
