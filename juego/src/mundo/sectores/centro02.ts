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
  [[2364, 4314], { tipo: "casino", color: C("#8DB4DC"), plantas: 2 }], // Casino Círculo Mercantil
  [[2408, 4342], { tipo: "historico", color: C("#9A927C"), plantas: 2 }], // Casa de Maximiliano Rodríguez
  [[2404, 4374], { tipo: "historico", color: C("#B8B6AD"), plantas: 2 }], // La Vivienda Unifamiliar
  [[2456, 4400], { tipo: "porticos", color: C("#D9735A"), plantas: 4 }],
  [[2444, 4410], { tipo: "porticos", color: C("#E0A06A"), plantas: 4 }],
  [[2432, 4406], { tipo: "verdes", color: C("#F4F2EC"), plantas: 3 }],
  [[2426, 4404], { tipo: "verdes", color: C("#F4F2EC"), plantas: 3 }],
  [[2420, 4400], { tipo: "bloque", color: C("#F4F1EA"), plantas: 5 }],
  // Plaza de la Constitución, de Calle Real a Av. España (foto del usuario y POI de OSM)
  [[2480, 4354], { tipo: "bloque", color: C("#D98A6A"), plantas: 5, pilares: true }], // esquina curva salmón (Diputación)
  [[2478, 4364], { tipo: "bloque", color: C("#EFE6D2"), plantas: 5, pilares: true }], // bloque crema (100 Montaditos)
  [[2484, 4374], { tipo: "casita", color: C("#E3A487"), plantas: 2, cierros: true }], // Kebab House
  [[2480, 4382], { tipo: "historico", color: C("#F4F2EC"), plantas: 4, arcos: true, barandilla: C("#2F5FA8") }], // Salón Mónaco
  [[2468, 4398], { tipo: "bloque", color: C("#D9826A"), plantas: 3, balcones: true }],
  [[2460, 4416], { tipo: "bloque", color: C("#F2F0EA"), plantas: 3, balcones: true }], // Hostal Carlos I
  [[2450, 4434], { tipo: "bloque", color: C("#CDB06A"), plantas: 10, balcones: true, barandilla: C("#4E7A4A") }], // torre ocre
  [[2442, 4448], { tipo: "moderno", color: C("#F6F4EF"), plantas: 3 }], // esquina blanca, Av. España
  [[2562, 4460], { tipo: "bloque", color: C("#EADFB8"), plantas: 13, balcones: true }], // Edificio La Línea (torre crema escalonada)
  [[2542, 4326], { tipo: "bloque", color: C("#E9E4D6"), plantas: 16, balcones: true }], // Torre de La Línea
  [[2530, 4326], { tipo: "bloque", color: C("#E3B98F"), plantas: 6 }],
  [[2556, 4326], { tipo: "bloque", color: C("#F1EDE4"), plantas: 5 }],
  [[2470, 4350], { tipo: "bloque", color: C("#E9A98A"), plantas: 8 }],
  [[2458, 4352], { tipo: "casita", color: C("#F3F1EB"), plantas: 2 }], // Bablú
  [[2448, 4342], { tipo: "bloque", color: C("#A8322E"), plantas: 5, cierros: true }],
  [[2448, 4334], { tipo: "bloque", color: C("#A8322E"), plantas: 5 }],
  [[2442, 4338], { tipo: "bloque", color: C("#E3A672"), plantas: 5 }],
  [[2438, 4330], { tipo: "bloque", color: C("#E8C35A"), plantas: 5 }],
  [[2432, 4356], { tipo: "casita", color: C("#7E8B62"), plantas: 1 }], // Hacienda Patagónica
  [[2414, 4330], { tipo: "ladrillo", color: C("#F6F3EC"), plantas: 5 }], // Molly Bloom's
  [[2324, 4272], { tipo: "moderno", color: C("#F1EFEA"), plantas: 6 }], // Edf. Modelo (Caixabank)
  [[2288, 4296], { tipo: "historico", color: C("#EDE0C8"), plantas: 3 }], // Antiguo Cine
  [[2280, 4262], { tipo: "bloque", color: C("#E3CFA8"), plantas: 5 }],
  [[2266, 4294], { tipo: "bloque", color: C("#B9452F"), plantas: 4, cierros: true }],
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
    const L = mc.usar(o, c, h.b ?? 0);
    if (h.b) o.caja(Mat.Muro, 0, -h.b, 0, L, 0, 0.08, C("#B9B2A4"));
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
  plano(o, Mat.Muro, poli, H + 0.01 + (h.b ?? 0), C("#CDBFAE"));
  // Tejado de teja en la casita de la Patagónica.
  if (e.tejado || (e.tipo === "casita" && e.plantas === 1)) {
    const xs = poli.map((p) => p[0]);
    const zs = poli.map((p) => p[1]);
    enMundo(o, c, H);
    o.tejado(Math.min(...xs) - 0.3, Math.max(...xs) + 0.3, Math.min(...zs) - 0.3, Math.max(...zs) + 0.3, 0, 1.6, C("#B5603E"), e.color, true);
  }
}

/* ── Calle Real: pavimento, farolas, maceteros y terrazas ────────── */

const REAL: P2[] = [[2243.2, 4267.2], [2309.6, 4283.4], [2390, 4303.8], [2417.8, 4309.8], [2427.8, 4312.6], [2435.4, 4316], [2489.2, 4343], [2507, 4351.4]];

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

const PLAZA: P2[] = [[2415, 4352], [2431, 4357], [2445, 4366], [2472, 4371], [2464, 4393], [2436, 4392], [2412, 4390], [2405, 4380]];
const FUENTE: P2 = [2430, 4376];

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
  palmera(o, 2456.4, 4367, 9.5);
  palmera(o, 2459.6, 4367, 8.6);
  for (const [x, z] of [[2421, 4362], [2427, 4364], [2440, 4388], [2447, 4379], [2418, 4385]] as P2[]) arbolito(o, x, 0, z, 3.2, C("#3F7A36"));
  // Terrazas con sombrillas verdes (Bablú) y bancos de forja.
  for (const [x, z] of [[2458, 4358.4], [2464, 4360], [2469.2, 4362]] as P2[]) {
    torno(o, Mat.Metal, x, 0, z, [[0.04, 0], [0.04, 2.4]], C("#DDDCD6"), 5);
    torno(o, Mat.Detalle, x, 2.0, z, [[1.5, 0], [1.45, 0.08], [0.05, 0.6]], C("#2E6B45"), 8);
  }
  for (const [x, z] of [[2437, 4383.6], [2421, 4373]] as P2[]) {
    o.caja(Mat.Metal, x - 0.8, 0.4, z - 0.25, x + 0.8, 0.46, z + 0.25, HIERRO);
    o.caja(Mat.Metal, x - 0.8, 0.46, z - 0.27, x + 0.8, 0.95, z - 0.23, HIERRO);
  }
  for (const [x, z] of [[2413, 4359], [2450, 4392]] as P2[]) farolaFernandina(o, x, z);
  enMundo(o, c);
}

/* ── Plaza de la Constitución ─────────────────────────────────────── */
/*
 * Fotos del usuario: la parte norte (Comandancia, Correos) está a nivel de calle;
 * una escalinata sube a la explanada sobre el Parking Constitución-Centro, con la
 * fuente circular, el césped de bordillo rosa, las pérgolas de madera y la boca
 * del parking hacia la Av. del Ejército. Huellas y puntos: OpenStreetMap.
 */

/* Geometría calcada de la vista cenital del usuario (≈17,2 px/m; la fuente y la Comandancia como referencia). */
/** Parte baja del norte, a nivel de calle: frente de la Comandancia, taxis y círculos del pavimento. */
const PC_BAJA: P2[][] = [[[2500.8, 4363.2], [2499, 4377.2], [2496.8, 4388.8], [2508.4, 4383], [2522.8, 4368.4], [2536.2, 4370.2], [2527.6, 4383], [2528.8, 4392.4], [2539.6, 4393.4], [2548.2, 4376.6], [2547.8, 4376.6], [2549, 4364.4], [2549, 4350.4], [2517.6, 4352.2], [2507.2, 4356.2], [2505, 4358.6], [2503.6, 4361.6], [2502.6, 4361.2]]];
/** Explanada sobre el parking, a la altura de Correos y de La Línea. */
const PC_ALTA: P2[] = [[2473.4, 4440], [2471, 4453.8], [2470, 4467.8], [2471, 4493.4], [2474, 4502.8], [2480.4, 4508], [2521.8, 4508], [2521.8, 4495.8], [2527.6, 4495.8], [2527.6, 4508], [2543.2, 4508], [2577.2, 4505.6], [2567.6, 4492], [2572.8, 4489.6], [2569.2, 4484], [2574, 4481], [2567.4, 4454.8], [2563.8, 4456.8], [2557.4, 4446.8], [2551.8, 4449.6], [2546, 4439.6], [2541.2, 4442.4], [2534.8, 4423.4], [2529.6, 4412.6], [2539.6, 4393.4], [2528.6, 4392.4], [2527.6, 4383], [2508.4, 4383], [2496.8, 4388.8], [2491.4, 4399.2], [2485, 4415], [2480.4, 4424.8], [2477.2, 4432.4], [2500, 4432.4], [2500, 4438.8], [2474, 4438.8]];
/** Aristas de la explanada sin muro (contra los edificios, bocas de las rampas y del parking). */
const SIN_MURO = new Set([7, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 26, 33]);
/** Rampa al principio, desde la parte baja (dos primeros vértices) a la explanada. */
const RAMPA_N: P2[] = [[2522.8, 4368.4], [2536.2, 4370.2], [2527.6, 4383], [2508.4, 4383]];
/** Rampa con barandilla desde la acera oeste (sube hacia el este). */
const RAMPA_O: P2[] = [[2472.8, 4432.4], [2500, 4432.4], [2500, 4438.8], [2472.8, 4438.8]];
/** Céspedes con bordillo rosa: [contorno, 0 = parte baja · 1 = explanada]. */
const CESPEDES: [P2[], number][] = [[[[2507.2, 4380.8], [2505.4, 4376], [2507.2, 4367.8], [2513, 4361.4], [2519.4, 4358.8], [2523.4, 4360.8], [2522.8, 4366.6], [2517.6, 4374.8], [2511.8, 4380]], 0], [[[2496.8, 4408.6], [2497.4, 4400.4], [2500.8, 4395.6], [2503.2, 4397], [2502.6, 4402.8], [2499.6, 4407.4]], 1], [[[2482.2, 4425.4], [2483.4, 4418.4], [2487.4, 4412.6], [2492.6, 4410.2], [2493.8, 4413.2], [2491, 4420.2], [2486.2, 4424.2]], 1], [[[2524, 4409.8], [2524.6, 4405], [2528.6, 4401.8], [2532.2, 4401.8], [2532.8, 4403.8], [2529.2, 4408.6]], 1], [[[2522.8, 4435.8], [2521.8, 4428.4], [2524, 4423], [2528.6, 4419.6], [2532.8, 4420.8], [2532.2, 4424.8], [2529.8, 4430.6], [2526.4, 4435.2]], 1], [[[2478.6, 4428.6], [2485, 4425], [2495.6, 4424.6], [2499.6, 4427.2], [2500, 4432.4], [2495.6, 4432], [2478.6, 4432]], 1], [[[2484, 4438.8], [2500, 4438.8], [2500.8, 4447], [2500, 4453.8], [2495.6, 4452.6], [2485, 4451.6], [2483.4, 4444.6]], 1], [[[2468.2, 4465.2], [2475.8, 4465.8], [2479, 4475], [2485.6, 4478.6], [2491.4, 4479.8], [2490, 4486.6], [2485, 4491.2], [2475.8, 4490.6], [2470.2, 4484.2], [2468.6, 4475]], 1], [[[2479.6, 4497.2], [2487.4, 4495.8], [2492, 4499], [2491.4, 4506.2], [2480.6, 4506.4]], 1], [[[2527.6, 4493.4], [2537.4, 4491.2], [2541.8, 4495.8], [2541.2, 4506.2], [2531.6, 4508.4], [2527.8, 4502.8]], 1], [[[2530.4, 4391.2], [2528.6, 4384.2], [2530.4, 4379.4], [2535.6, 4373], [2541, 4369.6], [2544.2, 4371.4], [2543.2, 4378.4], [2538.6, 4385.4], [2534, 4390]], 0]];
const PARQUES: P2[][] = [[[2484, 4442.8], [2496.8, 4442.8], [2496.8, 4450.4], [2484, 4450.4]], [[2472.8, 4475.8], [2486.2, 4475.8], [2486.2, 4484.8], [2472.8, 4484.8]]];
const CUADRICULA: P2[] = [[2495.6, 4472], [2529.8, 4472], [2529.8, 4506.8], [2499, 4506.8], [2495.6, 4501.6]];
const PERGOLAS: P2[][] = [[[2512, 4409.8], [2513.6, 4421.4], [2514.8, 4437.6]], [[2504, 4460.8], [2502.8, 4467.8], [2502, 4475]], [[2536.2, 4473], [2541.8, 4479.2]]];
const BOCA: P2[] = [[2521.8, 4495.8], [2527.6, 4495.8]];
const ALTO_PC = 1.5;
const FUENTE_PC: P2 = [2488, 4463.2];
const COMANDANCIA: P2[] = [[2568.4, 4378.8], [2571.6, 4349.8], [2551, 4346], [2547.8, 4376.6]];
const CORREOS: P2[] = [[2543.8, 4385.6], [2529.6, 4412.6], [2550.2, 4423], [2560.6, 4403.4], [2565.2, 4405.6], [2570.8, 4395.6], [2545.6, 4382]];
const ROSA = C("#D7826F");
const ALBARDILLA = C("#E2D6C2");
const MADERA = C("#6B3326");

/** Muro de contención rosa con albardilla, de a a b, hacia el interior `dentro`. */
function muroRosa(o: Obra, c: Ctx, a: P2, b: P2, dentro: P2, y0: number, y1: number, grueso = 0.35) {
  const mc = new Marco(a, b, dentro);
  const L = mc.usar(o, c, y0);
  if (L < 0.1) return;
  o.caja(Mat.Muro, 0, 0, -grueso, L, y1 - y0, 0, ROSA);
  o.caja(Mat.Detalle, -0.04, y1 - y0, -grueso - 0.05, L + 0.04, y1 - y0 + 0.09, 0.05, ALBARDILLA);
}

function parterre(o: Obra, c: Ctx, poli: P2[], y: number, h: number) {
  const cen = centroPoli(poli);
  for (let i = 0; i < poli.length; i++) muroRosa(o, c, poli[i], poli[(i + 1) % poli.length], cen, y, y + h, 0.25);
  enMundo(o, c);
  plano(o, Mat.Detalle, poli, y + h - 0.06, C("#5E8F3E"));
}

function centroPoli(p: P2[]): P2 {
  return [p.reduce((a, v) => a + v[0], 0) / p.length, p.reduce((a, v) => a + v[1], 0) / p.length];
}

/** Pérgola de madera rojiza entre dos puntos (pies a ambos lados, viguetas cruzadas). */
function pergolaLarga(o: Obra, c: Ctx, a: P2, b: P2, y: number, ancho = 3.2) {
  const mc = new Marco(a, b, [a[0] + 100, a[1] + 100]);
  const L = mc.usar(o, c, y);
  const H = 2.9;
  for (let x = 0.2; x <= L - 0.1; x += 2.6) for (const z of [-ancho / 2, ancho / 2]) o.caja(Mat.Detalle, x - 0.11, 0, z - 0.11, x + 0.11, H, z + 0.11, MADERA);
  for (const z of [-ancho / 2, ancho / 2]) o.caja(Mat.Detalle, -0.3, H - 0.25, z - 0.08, L + 0.3, H, z + 0.08, MADERA);
  for (let x = 0; x <= L; x += 0.55) o.caja(Mat.Detalle, x - 0.05, H, -ancho / 2 - 0.45, x + 0.05, H + 0.16, ancho / 2 + 0.45, MADERA);
}

/** Fuente: vaso exterior bajo, tambor central amarillo con franja azul, corona de chorros en arco y surtidor central. */
function fuenteConstitucion(o: Obra, c: Ctx, y: number) {
  const [fx, fz] = FUENTE_PC;
  const circ = (r: number, n = 40) => Array.from({ length: n }, (_, i) => [fx + Math.cos((i / n) * Math.PI * 2) * r, fz + Math.sin((i / n) * Math.PI * 2) * r] as P2);
  // Césped circular con bordillo rosa y aro de paso.
  enMundo(o, c);
  plano(o, Mat.Detalle, circ(5.8, 40), y + 0.06, C("#5E8F3E"));
  const aro = circ(5.8, 40);
  for (let i = 0; i < aro.length; i++) muroRosa(o, c, aro[i], aro[(i + 1) % aro.length], FUENTE_PC, y, y + 0.32, 0.3);
  enMundo(o, c);
    // Vaso exterior: pretil de piedra clara.
  enMundo(o, c, y);
  torno(o, Mat.Detalle, fx, 0, fz, [[3.75, 0], [3.75, 0.55], [3.45, 0.62], [3.4, 0.2]], C("#E6DFCF"), 40);
  enMundo(o, c);
  plano(o, Mat.Cristal, circ(3.45), y + 0.38, C("#3E9AB0"));
  // Tambor central: azulejo azul abajo, amarillo arriba, borde crema; lámina de agua.
  enMundo(o, c, y);
  torno(o, Mat.Detalle, fx, 0.3, fz, [[2.0, 0], [2.0, 0.35]], C("#2E7FB5"), 40);
  torno(o, Mat.Detalle, fx, 0.65, fz, [[2.0, 0], [2.0, 0.55]], C("#E8CF6A"), 40);
  torno(o, Mat.Detalle, fx, 1.2, fz, [[2.15, 0], [2.15, 0.1], [1.85, 0.14], [1.75, 0]], C("#F1EBDD"), 40);
  enMundo(o, c);
  plano(o, Mat.Cristal, circ(1.8), y + 1.25, C("#5FB4C8"));
  enMundo(o, c, y);
  // Surtidor central y anillo de surtidores verticales.
  const AGUA = C("#EAF6FF");
  torno(o, Mat.Luz, fx, 1.25, fz, [[0.34, 0], [0.24, 1.2], [0.2, 2.4], [0.34, 2.75], [0.5, 3.0], [0.42, 3.2], [0.18, 3.35], [0.0, 3.4]], AGUA, 10);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    torno(o, Mat.Luz, fx + Math.cos(a) * 0.95, 1.25, fz + Math.sin(a) * 0.95, [[0.16, 0], [0.12, 0.5], [0.22, 0.7], [0.18, 0.85], [0.0, 0.95]], AGUA, 6);
  }
  // Corona de chorros en arco hacia el vaso exterior.
  if (o.fino) for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const pt = (t: number): [number, number, number] => {
      const r = 1.95 + t * 1.45;
      return [fx + ca * r, 1.3 + 2.0 * t - 2.25 * t * t, fz + sa * r];
    };
    for (let s = 0; s < 8; s++) {
      const p0 = pt(s / 8);
      const p1 = pt((s + 1) / 8);
      const w = 0.07;
      for (const [dx, dy, dz] of [[-sa * w, 0, ca * w], [0, w, 0]] as [number, number, number][]) {
        o.poli(Mat.Luz, [[p0[0] - dx, p0[1] - dy, p0[2] - dz], [p1[0] - dx, p1[1] - dy, p1[2] - dz], [p1[0] + dx, p1[1] + dy, p1[2] + dz], [p0[0] + dx, p0[1] + dy, p0[2] + dz]], AGUA);
        o.poli(Mat.Luz, [[p0[0] + dx, p0[1] + dy, p0[2] + dz], [p1[0] + dx, p1[1] + dy, p1[2] + dz], [p1[0] - dx, p1[1] - dy, p1[2] - dz], [p0[0] - dx, p0[1] - dy, p0[2] - dz]], AGUA);
      }
    }
  }
  enMundo(o, c);
}

/** Comandancia (Museo del Istmo, Biblioteca José Riquelme): dos plantas naranjas, cantería, torre central. */
function comandancia(o: Obra, c: Ctx) {
  const NAR = C("#E5965F");
  const PIEDRA = C("#C6AE80");
  const H = 9.6;
  const frente = 3; // arista (2547.8,4376.6)-(2568.4,4378.8)? no: la fachada a la plaza es la oeste
  void frente;
  const cen = centroPoli(COMANDANCIA);
  for (let i = 0; i < COMANDANCIA.length; i++) {
    const a = COMANDANCIA[i];
    const b = COMANDANCIA[(i + 1) % COMANDANCIA.length];
    const mc = new Marco(a, b, cen);
    const L = mc.usar(o, c, 0.36);
    const principal = Math.abs(a[0] - 2551) < 0.4; // arista oeste, a la plaza
    muro(o, 0, L, 0, H, NAR, Mat.Muro, 0.8);
    o.caja(Mat.Detalle, -0.05, 0, 0, L + 0.05, 0.8, 0.12, PIEDRA);
    moldura(o, -0.05, L + 0.05, 4.5, 4.7, 0.12, PIEDRA);
    moldura(o, -0.2, L + 0.2, H - 0.7, H, 0.4, PIEDRA);
    if (o.fino) for (let x = 0.3; x < L - 0.2; x += 0.45) o.caja(Mat.Detalle, x, H - 0.85, 0, x + 0.2, H - 0.7, 0.28, PIEDRA);
    o.caja(Mat.Muro, -0.1, H, -0.25, L + 0.1, H + 0.7, 0.05, NAR);
    for (const x of [0.35, L - 0.35]) o.caja(Mat.Detalle, x - 0.35, 0, 0, x + 0.35, H, 0.1, PIEDRA);
    const m = L / 2;
    // Fachada principal: dos huecos a cada lado de la torre (fotos); laterales repartidos.
    const huecos = principal ? [1.7, 3.9, L - 3.9, L - 1.7] : vanos(L, 2.8, 1.0);
    for (const x of huecos) {
      ventana(o, x, 1.3, 1.1, 2.2, { marco: C("#6A4A32"), recercado: PIEDRA, recercadoAncho: 0.22, arco: true });
      reja(o, x, 1.3, 1.1, 2.0, 0.1, HIERRO);
      ventana(o, x, 5.6, 1.1, 2.1, { marco: C("#6A4A32"), recercado: PIEDRA, recercadoAncho: 0.22 });
    }
    if (!principal) continue;
    // Torre central: cuerpo saliente, portada en arco con escalones, ventanal con balcón y triple ventana arriba.
    o.caja(Mat.Muro, m - 2.4, 0, 0, m + 2.4, H + 3.6, 0.35, NAR);
    for (const x of [m - 2.4, m + 2.4]) o.caja(Mat.Detalle, x - 0.3, 0, 0.3, x + 0.3, H + 3.6, 0.45, NAR);
    prisma(o, Mat.Detalle, arco(m - 0.75, m + 0.75, 0.6, 3.3), 0.35, 0.42, C("#5A3A26"));
    prisma(o, Mat.Detalle, arco(m - 1.0, m + 1.0, 0.6, 3.55), 0.36, 0.4, PIEDRA);
    for (let k = 0; k < 4; k++) o.caja(Mat.Detalle, m - 1.6 + k * 0.1, 0, 0.35 + 1.2 - k * 0.3, m + 1.6 - k * 0.1, 0.15 * (k + 1), 0.35 + 1.5 - k * 0.3, C("#BDB7AA"));
    o.caja(Mat.Detalle, m - 1.8, 4.6, 0.35, m + 1.8, 8.3, 0.55, PIEDRA);
    for (const x of [m - 0.75, m + 0.75]) ventana(o, x, 5.4, 1.0, 1.9, { marco: C("#6A4A32") });
    o.caja(Mat.Detalle, m - 1.9, 4.6, 0.35, m + 1.9, 5.3, 0.95, PIEDRA);
    for (const x of [m - 1.3, m, m + 1.3]) o.caja(Mat.Detalle, x - 0.15, 4.2, 0.35, x + 0.15, 4.6, 0.8, PIEDRA);
    o.caja(Mat.Detalle, m - 1.8, 8.4, 0.35, m + 1.8, 9.0, 0.6, PIEDRA);
    for (const x of [m - 1.1, m, m + 1.1]) {
      ventana(o, x, H + 0.6, 0.8, 2.0, { marco: C("#6A4A32"), recercado: PIEDRA, recercadoAncho: 0.15 });
      reja(o, x, H + 0.6, 0.8, 0.8, 0.12, C("#D9D9D4"));
    }
    // Friso de rombos de cantería entre el balcón y la ventana triple.
    o.caja(Mat.Detalle, m - 2.1, 9.0, 0.35, m + 2.1, 9.7, 0.42, PIEDRA);
    if (o.fino) for (let x = m - 1.8; x <= m + 1.8; x += 0.6) o.poli(Mat.Detalle, [[x, 9.08, 0.44], [x + 0.26, 9.35, 0.44], [x, 9.62, 0.44], [x - 0.26, 9.35, 0.44]], C("#A8916A"));
    moldura(o, m - 2.75, m + 2.75, H + 3.0, H + 3.6, 0.55, PIEDRA);
    // Palmeras a ambos lados de la escalinata y chimeneas blancas en la azotea.
    palmera(o, m - 3.0, 2.4, 8.5);
    palmera(o, m + 3.0, 2.4, 8.0);
    for (const x of [1.6, L - 1.6]) o.caja(Mat.Muro, x - 0.45, H + 0.7, -2.8, x + 0.45, H + 2.6, -1.9, C("#EEEBE4"));
    if (o.fino) for (let x = m - 2.5; x < m + 2.5; x += 0.42) o.caja(Mat.Detalle, x, H + 2.85, 0.35, x + 0.2, H + 3.0, 0.75, PIEDRA);
    // Mástiles con banderas a la derecha de la portada.
    const BANDERAS: RGB[][] = [[C("#1F3A93"), C("#1F3A93")], [C("#C8102E"), C("#F1BF00")], [C("#007A3D"), C("#FFFFFF")], [C("#7FB6E0"), C("#FFFFFF")]];
    BANDERAS.forEach(([b1, b2], k) => {
      const x = m + 3.6 + k * 0.9;
      o.caja(Mat.Metal, x - 0.04, 0, 2.2, x + 0.04, 7.5, 2.28, C("#E6E6E2"));
      o.caja(Mat.Detalle, x + 0.04, 6.2, 2.23, x + 1.1, 6.75, 2.25, b1);
      o.caja(Mat.Detalle, x + 0.04, 6.75, 2.23, x + 1.1, 7.3, 2.25, b2);
    });
  }
  enMundo(o, c);
  plano(o, Mat.Muro, COMANDANCIA, H + 0.36, C("#CDBFAE"));
}

/** Correos: zócalo de granito gris, cuerpo rojo, rótulo amarillo y la escultura sobre la roca. */
function correos(o: Obra, c: Ctx) {
  const ROJO = C("#C24E55");
  const GRANITO = C("#9C9D9F");
  const H = 8.2;
  const cen = centroPoli(CORREOS);
  for (let i = 0; i < CORREOS.length; i++) {
    const a = CORREOS[i];
    const b = CORREOS[(i + 1) % CORREOS.length];
    const mc = new Marco(a, b, cen);
    const L = mc.usar(o, c, ALTO_PC);
    o.caja(Mat.Muro, -0.02, 0.36 - ALTO_PC, 0, L + 0.02, 0, 0.06, GRANITO);
    muro(o, 0, L, 0, H, ROJO, Mat.Muro, 0.8);
    o.caja(Mat.Muro, -0.02, 0, 0, L + 0.02, 3.4, 0.06, GRANITO);
    o.caja(Mat.Detalle, -0.02, 3.4, 0, L + 0.02, 3.55, 0.08, C("#E9E6E0"));
    o.caja(Mat.Detalle, -0.05, H - 0.1, -0.05, L + 0.05, H + 0.15, 0.1, C("#ECEAE5"));
    for (const x of vanos(L, 4.5, 1.2)) o.caja(Mat.Cristal, x - 1.4, 0.9, 0.07, x + 1.4, 2.3, 0.09, C("#2A3036"));
    if (L > 10 && Math.abs(a[0] - 2543.8) < 0.4) {
      // Fachada a la plaza: entrada y rótulo de Correos.
      const m = L * 0.7;
      o.caja(Mat.Cristal, m - 1.6, 0, 0.07, m + 1.6, 2.7, 0.1, C("#3B4650"));
      o.caja(Mat.Detalle, m - 1.8, 2.7, 0.07, m + 1.8, 3.2, 0.25, C("#F2C200"));
      o.caja(Mat.Detalle, m - 1.0, 4.6, 0.07, m + 1.0, 7.0, 0.14, C("#F7C800"));
      disco(o, Mat.Detalle, m, 6.0, 0.15, 0.02, 0.55, C("#1E3A8A"), 16);
    }
  }
  enMundo(o, c);
  plano(o, Mat.Muro, CORREOS, H + ALTO_PC, C("#BDB8AE"));
  // Escultura de bronce sobre la roca, en el parterre delante de Correos.
  enMundo(o, c, ALTO_PC + 0.3);
  torno(o, Mat.Detalle, 1263.0, 0, 2204.0, [[1.3, 0], [1.2, 0.8], [0.7, 1.5], [0.1, 1.8]], C("#6E6C68"), 7);
  o.poli(Mat.Metal, [[1261.6, 2.2, 2203.8], [1264.8, 2.7, 2204.2], [1263.2, 1.7, 2204.0]], C("#4A4036"));
  o.poli(Mat.Metal, [[1263.2, 1.7, 2204.0], [1264.8, 2.7, 2204.2], [1261.6, 2.2, 2203.8]], C("#4A4036"));
  o.caja(Mat.Metal, 1262.6, 1.6, 2203.8, 1263.8, 2.1, 2204.2, C("#4A4036"));
  enMundo(o, c);
}

function plazaConstitucion(o: Obra, c: Ctx) {
  const yb = 0.36;
  const ya = ALTO_PC;
  enMundo(o, c);
  // Suelos: adoquín abajo, losa arriba; cada uno a su altura y sin solaparse.
  for (const p of PC_BAJA) plano(o, Mat.Suelo, p, yb, C("#9E9C98"), 0.55);
  plano(o, Mat.Suelo, PC_ALTA, ya, C("#A9ABAE"), 0.3);
  // Círculos oscuros del pavimento frente a la Comandancia.
  if (o.fino) for (const R of [6, 8.5, 11, 13.5]) {
    const n = 72;
    const [cx, cz] = [2531.6, 4366.6];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const p = (a: number, r: number): P2 => [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
      const m = p((a0 + a1) / 2, R);
      if (!PC_BAJA.some((t) => dentroPoli(m, t)) || CESPEDES.some(([t]) => dentroPoli(m, t))) continue;
      plano(o, Mat.Detalle, [p(a0, R - 0.15), p(a1, R - 0.15), p(a1, R + 0.15), p(a0, R + 0.15)], yb + 0.03, C("#3F4043"));
    }
  }
  // Gran cuadrícula de losa clara sobre el parking.
  plano(o, Mat.Suelo, CUADRICULA, ya + 0.02, C("#C3C4C6"), 0.3);
  if (o.fino) {
    const xs = CUADRICULA.map((p) => p[0]);
    const zs = CUADRICULA.map((p) => p[1]);
    for (let x = Math.min(...xs) + 2.15; x < Math.max(...xs); x += 2.15) for (let z = Math.min(...zs); z < Math.max(...zs); z += 0.5) if (dentroPoli([x, z + 0.25], CUADRICULA)) plano(o, Mat.Detalle, [[x - 0.04, z], [x + 0.04, z], [x + 0.04, z + 0.5], [x - 0.04, z + 0.5]], ya + 0.035, C("#8C8E91"));
    for (let z = Math.min(...zs) + 2.15; z < Math.max(...zs); z += 2.15) for (let x = Math.min(...xs); x < Math.max(...xs); x += 0.5) if (dentroPoli([x + 0.25, z], CUADRICULA)) plano(o, Mat.Detalle, [[x, z - 0.04], [x + 0.5, z - 0.04], [x + 0.5, z + 0.04], [x, z + 0.04]], ya + 0.035, C("#8C8E91"));
  }
  // Rampas: al principio del paseo y desde la acera oeste, con sus muretes.
  const rampa = (q: P2[], h: number[]) => {
    o.poli(Mat.Suelo, q.map((p, k) => [p[0], h[k], p[1]] as [number, number, number]), C("#A3A5A8"), 1, 0.4);
    o.poli(Mat.Suelo, [...q].reverse().map((p, k) => [p[0], h[3 - k], p[1]] as [number, number, number]), C("#A3A5A8"), 1, 0.4);
  };
  rampa(RAMPA_N, [yb, yb, ya, ya]);
  rampa(RAMPA_O, [yb, ya, ya, yb]);
  const lado = (a: P2, b: P2, ha: number, hb: number) => {
    const pts: [number, number, number][] = [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], hb + 0.5, b[1]], [a[0], ha + 0.5, a[1]]];
    o.poli(Mat.Muro, pts, ROSA);
    o.poli(Mat.Muro, [...pts].reverse(), ROSA);
  };
  lado(RAMPA_N[0], RAMPA_N[3], yb, ya);
  lado(RAMPA_N[1], RAMPA_N[2], yb, ya);
  // Barandillas de la rampa oeste.
  for (const [a, b] of [[RAMPA_O[0], RAMPA_O[1]], [RAMPA_O[3], RAMPA_O[2]]]) {
    const n = 12;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      const h = yb + (ya - yb) * t;
      o.caja(Mat.Metal, x - 0.03, h, z - 0.03, x + 0.03, h + 1.0, z + 0.03, C("#C9CCCF"));
    }
    o.poli(Mat.Metal, [[a[0], yb + 1.0, a[1] - 0.04], [b[0], ya + 1.0, b[1] - 0.04], [b[0], ya + 1.06, b[1] + 0.04], [a[0], yb + 1.06, a[1] + 0.04]], C("#C9CCCF"));
    o.poli(Mat.Metal, [[a[0], yb + 1.06, a[1] + 0.04], [b[0], ya + 1.06, b[1] + 0.04], [b[0], ya + 1.0, b[1] - 0.04], [a[0], yb + 1.0, a[1] - 0.04]], C("#C9CCCF"));
  }
  // Muros de contención rosas con albardilla en el perímetro de la explanada.
  for (let i = 0; i < PC_ALTA.length; i++) {
    if (SIN_MURO.has(i)) continue;
    muroRosa(o, c, PC_ALTA[i], PC_ALTA[(i + 1) % PC_ALTA.length], interiorArista(PC_ALTA, i), 0, ya + 0.45);
  }
  // Boca del parking bajo la explanada, con dintel, señal y barrera.
  enMundo(o, c);
  const [b0, b1] = BOCA;
  o.caja(Mat.Detalle, b0[0] + 0.1, 0, b0[1] - 0.1, b1[0] - 0.1, ya - 0.05, b0[1] + 0.1, C("#15171A"));
  o.caja(Mat.Detalle, b0[0], ya - 0.35, b0[1] - 0.2, b1[0], ya + 0.6, b0[1] + 0.2, C("#C94C47"));
  o.caja(Mat.Detalle, b0[0] + 0.3, ya - 0.3, b0[1] + 0.2, b1[0] - 0.3, ya + 0.5, b0[1] + 0.25, C("#F3F1EC"));
  o.caja(Mat.Detalle, b0[0] + 0.3, 0.9, b0[1] + 3.5, b1[0] - 0.3, 1.0, b0[1] + 3.58, C("#D63A35"));
  o.caja(Mat.Detalle, b1[0] + 0.3, 0, b0[1] + 5.0, b1[0] + 0.45, 2.4, b0[1] + 5.15, C("#8A8D90"));
  o.caja(Mat.Detalle, b1[0] + 0.0, 2.4, b0[1] + 5.0, b1[0] + 0.8, 3.2, b0[1] + 5.1, C("#1F5EBF"));
  // Céspedes con bordillo rosa (lentes del norte, banda oeste, entorno de la fuente).
  for (const [p, nivel] of CESPEDES) parterre(o, c, p, nivel ? ya : yb, 0.4);
  // Caseta rosa del parking dentro del primer parterre, quiosco verde y caseta de la cuadrícula.
  enMundo(o, c, yb);
  o.caja(Mat.Muro, 2514.8, 0, 4370.4, 2522, 2.5, 4377, ROSA);
  o.caja(Mat.Detalle, 2514.6, 2.5, 4370.2, 2522.2, 2.62, 4377.2, ALBARDILLA);
  torno(o, Mat.Detalle, 1255.6, 0, 2180.3, [[1.3, 0], [1.3, 2.4], [1.45, 2.5], [1.0, 3.1], [0.2, 3.4]], C("#3E5F4A"), 10);
  arbolito(o, 1253.6, 0.4, 2188.4, 4.2, C("#3B6E30"));
  palmera(o, 2514, 4366, 9.5);
  for (const [x, z] of [[2535.2, 4379], [2532.4, 4372]] as P2[]) arbolito(o, x, 0.4, z, 2.4, C("#3F7A36"));
  pergola(o, 1258.8, 2171.6, 1264.0, 2175.0, C("#5A4636"), C("#B5523F"));
  for (const [x, z] of [[2494, 4371], [2504, 4357], [2540, 4362]] as P2[]) farolaFernandina(o, x, z);
  enMundo(o, c, ya);
  o.caja(Mat.Muro, 1249.9, 0, 2248.6, 1252.6, 2.4, 2251.3, C("#C98A6E"));
  o.caja(Mat.Detalle, 2499.6, 2.4, 4497, 2505.4, 2.55, 4502.8, ALBARDILLA);
  for (const [x, z] of [[2497.6, 4406], [2526, 4408], [2488, 4418], [2525.6, 4427.2]] as P2[]) arbolito(o, x, 0.4, z, 2.6, C("#3F7A36"));
  arbolito(o, 1238.6, 0, 2226.0, 5.2, C("#3B6E30"));
  for (const [x, z] of [[2532, 4495], [2536.8, 4501], [2480, 4500]] as P2[]) arbolito(o, x, 0.4, z, 4.4, C("#3B6E30"));
  for (const [x, z, h] of [[2479, 4481, 8.5], [2492, 4429, 9.0]] as [number, number, number][]) palmera(o, x, z, h);
  enMundo(o, c);
  // Fuente, pérgolas y parques infantiles sobre la explanada.
  fuenteConstitucion(o, c, ya);
  for (const p of PERGOLAS) for (let i = 1; i < p.length; i++) pergolaLarga(o, c, p[i - 1], p[i], ya, 2.8);
  enMundo(o, c, ya);
  PARQUES.forEach((p, k) => {
    plano(o, Mat.Detalle, p, ya + 0.05, k ? C("#E07A86") : C("#3F7FC2"));
    const [x0, z0] = p[0];
    o.caja(Mat.Detalle, x0 + 0.8, 0, z0 + 0.8, x0 + 1.2, 1.6, z0 + 1.2, C("#D12E2E"));
    o.poli(Mat.Detalle, [[x0 + 1.2, 1.5, z0 + 0.8], [x0 + 3.4, 0.1, z0 + 0.8], [x0 + 3.4, 0.1, z0 + 1.4], [x0 + 1.2, 1.5, z0 + 1.4]], C("#D12E2E"));
    o.caja(Mat.Detalle, x0 + 4.2, 0, z0 + 2.2, x0 + 4.3, 1.8, z0 + 2.3, C("#F2C230"));
    o.caja(Mat.Detalle, x0 + 4.2, 1.8, z0 + 2.2, x0 + 5.6, 1.9, z0 + 2.3, C("#F2C230"));
  });
  for (const [x, z] of [[2512, 4448], [2516, 4476], [2500, 4488], [2524, 4458], [2508, 4424]] as P2[]) {
    torno(o, Mat.Metal, x, 0, z, [[0.08, 0], [0.06, 5.5]], C("#B9BCBF"), 6);
    torno(o, Mat.Metal, x, 5.5, z, [[0.75, 0], [0.75, 0.08], [0.1, 0.18]], C("#C9CCCF"), 14);
  }
  enMundo(o, c);
}

/** Huellas de los edificios dibujados a mano en la plaza (colisiones y validador). */
export const SOLIDOS_CONSTITUCION: P2[][] = [COMANDANCIA, CORREOS];

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
  cachePolis.push(...SOLIDOS_CONSTITUCION);
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
  comandancia(o, c);
  correos(o, c);
  return o;
}

/** Centro aproximado del sector (para el LOD). */
export const CENTRO_C02: P2 = [2380, 4330];
