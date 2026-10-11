import { Mat, Obra, rgb, type RGB } from "../arquitectura";
import {
  Marco, enMundo, centroide, prisma, plano, arco, disco, torno, tira, muro, moldura, sillares, ventana,
  verja, balcon, balaustrada, cierro, reja, toldo, jarron, arbolito, type Ctx, type P2,
} from "./piezas";

/**
 * CENTRO-01 · Plaza de la Iglesia.
 *
 * Geometría y posiciones: huellas de OpenStreetMap (© colaboradores de OSM, ODbL).
 * Aspecto: capturas de Google Maps / Street View y fotos que aportó el usuario,
 * usadas solo como referencia visual (nada se copia como textura).
 * Las alturas son estimaciones a partir de las fotos (plantas × ~3,2 m).
 * Ver city-reconstruction/reports/CENTRO-01.md.
 */

const C = rgb;
const HIERRO = C("#23262B");
const BLANCO = C("#F6F3EC");

/** Huellas OSM sustituidas por modelos propios (centro aproximado de su rectángulo en linea.json). */
export const SUSTITUYE_CENTRO01: P2[] = [
  [1111.8, 2118.6], // Santuario
  [1094.8, 2119.2], // Casa de Ruperto Toledano
  [1093.4, 2135.8], // edificio verde de la esquina
  [1091.6, 2143.4], // edificio crema de cierros
  [1119.2, 2141.2], // edificio blanco del tejado a cuatro aguas
  [1126.2, 2124.8], // torre de ladrillo
  [1127.1, 2129.9], // torre de ladrillo (anexo)
  [1110.4, 2160.7], // queda dentro del edificio rosa (huella estimada)
];

/** Zona del sector: aquí los árboles son plátanos de sombra grandes, como en la plaza real. */
export const ZONA_CENTRO01 = { c: [1108, 2126] as P2, r: 30 };
/** Tablón de encargos del juego (no existe en la plaza real): en la esquina sureste, fuera de las vistas principales. */
export const TABLON_CENTRO01: P2 = [1112.0, 2145.4];
/** Grupo escultórico en homenaje a José Cruz Herrera (OSM lo rotula «Las Tres Gracias»). */
const MONUMENTO: P2 = [1107.0, 2138.0];

/* ── Huellas (OSM simplificadas; las del sur, estimadas) ─────────── */

/** Fachada de la iglesia retrasada 1,2 m respecto a OSM para dar algo más de aire a la plaza. */
const IGLESIA_FRENTE: [P2, P2] = [[1105.6, 2124.4], [1114.7, 2126.8]];
/** Encoge una huella hacia su centro (la plaza y sus calles quedan algo más holgadas). */
function encoger(poli: P2[], f = 0.92): P2[] {
  const [cx, cy] = centroide(poli);
  return poli.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f] as P2);
}

const TOLEDANO: P2[] = encoger([[1090.5, 2123.6], [1096.8, 2125.1], [1097.0, 2124.3], [1099.2, 2114.9], [1093.1, 2113.5], [1091.8, 2117.9]]);
const VERDE: P2[] = encoger([[1088.8, 2129.5], [1097.1, 2131.5], [1099.7, 2136.9], [1098.7, 2141.4], [1091.9, 2140.6], [1086.0, 2139.0]]);
const CREMA: P2[] = encoger([[1085.1, 2148.1], [1097.4, 2147.8], [1098.7, 2141.4], [1091.9, 2140.6], [1086.0, 2139.0], [1084.5, 2139.4], [1084.5, 2141.7]]);
const TORRE: P2[] = encoger([[1121.4, 2131.3], [1127.6, 2132.8], [1128.7, 2127.5], [1130.5, 2120.1], [1124.7, 2116.9]]);
const BLANCA: P2[] = encoger([[1113.8, 2146.2], [1123.1, 2144.6], [1124.5, 2136.2], [1121.2, 2135.5], [1115.0, 2139.7]]);
/** Sin huella en OSM: estimadas con las vistas aéreas y de calle. */
const ROSA: P2[] = encoger([[1094.0, 2149.6], [1113.2, 2149.6], [1113.2, 2157.8], [1094.0, 2158.2]]);
const ESTRECHO: P2[] = encoger([[1113.2, 2149.6], [1119.0, 2149.2], [1119.0, 2157.6], [1113.2, 2157.8]]);

const HUELLAS = [TOLEDANO, VERDE, CREMA, TORRE, BLANCA, ROSA, ESTRECHO];

/* ── Utilidades del sector ────────────────────────────────────────── */

function dentroPoli(p: P2, poli: P2[]) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

interface Cara {
  m: Marco;
  L: number;
  calle: boolean;
}

/**
 * Muros de un edificio de huella poligonal, azotea y pretil. Devuelve sus caras;
 * una cara «da a la calle» si delante no hay otro edificio (medianera).
 */
function cuerpo(o: Obra, c: Ctx, poli: P2[], alto: number, color: RGB, ocupado: (p: P2) => boolean, m = Mat.Muro, azotea = C("#CDBFAE")): Cara[] {
  const cen = centroide(poli);
  const caras: Cara[] = [];
  for (let i = 0; i < poli.length; i++) {
    const mc = new Marco(poli[i], poli[(i + 1) % poli.length], cen);
    const L = mc.usar(o, c);
    muro(o, 0, L, 0, alto, color, m, 0.78);
    const fuera = mc.g(L / 2, 1.4);
    const ajeno = HUELLAS.some((h) => h !== poli && dentroPoli(fuera, h));
    caras.push({ m: mc, L, calle: L > 2.2 && !ajeno && !ocupado(fuera) });
  }
  enMundo(o, c);
  plano(o, Mat.Muro, poli, alto, azotea);
  return caras;
}

/** Huecos repartidos a lo largo de una fachada. */
function vanos(L: number, paso: number, margen = 0.6) {
  const n = Math.max(1, Math.round((L - margen * 2) / paso));
  return Array.from({ length: n }, (_, i) => margen + ((i + 0.5) * (L - margen * 2)) / n);
}

/** Azar determinista por sector (para que todos los jugadores vean lo mismo). */
function azar(s: number) {
  let v = s;
  return () => ((v = (v * 16807) % 2147483647) / 2147483647);
}

/** Farola fernandina de cuatro brazos con farolillo central. */
function farola(o: Obra, x: number, z: number) {
  const negro = C("#1D2421");
  torno(o, Mat.Metal, x, 0, z, [[0.34, 0], [0.32, 0.45], [0.2, 0.6], [0.15, 1.25], [0.1, 1.4], [0.09, 3.7], [0.13, 3.85], [0.08, 4.0], [0.06, 4.5]], negro, 8);
  const farolillo = (fx: number, fy: number, fz: number) => {
    torno(o, Mat.Luz, fx, fy, fz, [[0.1, 0], [0.2, 0.14], [0.23, 0.48], [0.17, 0.58]], C("#F1E2B4"), 8);
    torno(o, Mat.Metal, fx, fy + 0.56, fz, [[0.2, 0], [0.24, 0.08], [0.12, 0.2], [0.06, 0.3], [0.08, 0.36], [0.01, 0.42]], negro, 8);
  };
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    o.caja(Mat.Metal, x + Math.min(0, dx * 0.85) - 0.03, 3.88, z + Math.min(0, dz * 0.85) - 0.03, x + Math.max(0, dx * 0.85) + 0.03, 3.95, z + Math.max(0, dz * 0.85) + 0.03, negro);
    if (o.fino) o.caja(Mat.Metal, x + dx * 0.55 - 0.02, 3.55, z + dz * 0.55 - 0.02, x + dx * 0.55 + 0.02, 3.92, z + dz * 0.55 + 0.02, negro);
    farolillo(x + dx * 0.85, 3.4, z + dz * 0.85);
  }
  farolillo(x, 4.5, z);
}

/** Banco de listones granates con pies de hierro (mirando a +z). */
function banco(o: Obra, x: number, z: number, largo = 2) {
  const granate = C("#8A2432");
  const a = largo / 2;
  for (const s of [-1, 1]) o.caja(Mat.Metal, x + s * (a - 0.15) - 0.04, 0, z - 0.3, x + s * (a - 0.15) + 0.04, 0.45, z + 0.25, HIERRO);
  for (let i = 0; i < 4; i++) o.caja(Mat.Detalle, x - a, 0.42, z - 0.25 + i * 0.13, x + a, 0.47, z - 0.15 + i * 0.13, granate);
  for (let i = 0; i < 3; i++) o.caja(Mat.Detalle, x - a, 0.6 + i * 0.13, z - 0.36, x + a, 0.69 + i * 0.13, z - 0.3, granate);
}

/** Sombrilla de terraza cuadrada con su mesa y sillas. */
function terraza(o: Obra, x: number, z: number, lona: RGB, r: () => number) {
  torno(o, Mat.Metal, x, 0, z, [[0.04, 0], [0.04, 2.3]], C("#D9D9D4"), 5);
  torno(o, Mat.Detalle, x, 2.1, z, [[1.55, 0], [1.5, 0.1], [0.06, 0.55]], lona, 4);
  if (!o.fino) return;
  const blanco = C("#F2F2EE");
  for (const [dx, dz] of [[-0.8, -0.7], [0.8, 0.6]]) {
    torno(o, Mat.Detalle, x + dx, 0, z + dz, [[0.25, 0], [0.04, 0.05], [0.04, 0.72], [0.36, 0.74], [0.36, 0.78]], blanco, 6);
    for (const a of [0, 1.6, 3.2, 4.7]) {
      const sx = x + dx + Math.cos(a + r()) * 0.55;
      const sz = z + dz + Math.sin(a + r()) * 0.55;
      o.caja(Mat.Detalle, sx - 0.2, 0.42, sz - 0.2, sx + 0.2, 0.47, sz + 0.2, blanco);
      o.caja(Mat.Detalle, sx - 0.2, 0, sz - 0.02, sx + 0.2, 0.42, sz + 0.02, blanco);
    }
  }
}

/* ── Santuario de la Inmaculada Concepción ───────────────────────── */

function santuario(o: Obra, c: Ctx) {
  const mc = new Marco(IGLESIA_FRENTE[0], IGLESIA_FRENTE[1], [1111.5, 2118]);
  const W = mc.usar(o, c);
  const D = 15.3;
  const m = W / 2;
  const B = C("#F8F5EE");
  const OC = C("#D8A13A");
  const RJ = C("#B04A35");
  const TC = C("#C0613F");
  const OSCURO = C("#2E333B");
  const BRONCE = C("#8A6B3A");

  // Nave encalada con tejado de teja árabe a dos aguas.
  o.caja(Mat.Muro, 0.3, 0, -D, W - 0.3, 8, -0.2, B, 0.8, "z+");
  o.poli(Mat.Muro, [[0.3, 8, -0.2], [W - 0.3, 8, -0.2], [m, 10.4, -0.2]], B);
  o.poli(Mat.Muro, [[0.3, 8, -D], [m, 10.4, -D], [W - 0.3, 8, -D]], B);
  const teja = C("#B5583A");
  o.poli(Mat.Teja, [[m, 10.45, -0.1], [m, 10.45, -D - 0.3], [0, 7.75, -D - 0.3], [0, 7.75, -0.1]], teja, 1, 0.5);
  o.poli(Mat.Teja, [[m, 10.45, -D - 0.3], [m, 10.45, -0.1], [W, 7.75, -0.1], [W, 7.75, -D - 0.3]], teja, 1, 0.5);
  o.caja(Mat.Teja, m - 0.18, 10.35, -D - 0.3, m + 0.18, 10.6, -0.1, C("#9C4A31"));
  // Costados: pilastras ocres y ventanas altas con reja.
  for (const lado of [0, 1]) {
    const x = lado ? W - 0.3 : 0.3;
    const lm = new Marco(mc.g(x, -0.2), mc.g(x, -D), mc.g(m, -D / 2));
    const Ls = lm.usar(o, c);
    for (let s = 0.2; s <= Ls; s += Ls / 4) moldura(o, s - 0.3, s + 0.3, 0, 7.9, 0.14, OC);
    moldura(o, -0.1, Ls + 0.1, 7.6, 8.05, 0.3, OC);
    moldura(o, -0.1, Ls + 0.1, 0, 0.55, 0.08, OC);
    for (const s of [Ls * 0.375, Ls * 0.625]) {
      ventana(o, s, 4.6, 0.9, 2.1, { marco: HIERRO, recercado: OC, recercadoAncho: 0.2, arco: true });
      reja(o, s, 4.6, 0.9, 1.7, 0.12, HIERRO);
    }
    mc.usar(o, c);
  }

  // Fachada: cuerpo bajo con zócalo, pilastras y frisos de ajedrezado rojo.
  o.caja(Mat.Muro, 0, 0, -0.2, W, 6.6, 0.5, B, 0.85, "z-");
  o.caja(Mat.Detalle, -0.05, 0, -0.2, W + 0.05, 0.6, 0.6, OC, 0.8, "z-");
  const pil = [0.3, 2.45, W - 2.45, W - 0.3];
  for (const px of pil) o.caja(Mat.Detalle, px - 0.3, 0.6, 0.4, px + 0.3, 6.25, 0.64, OC, 1, "z-");
  for (const px of [2.45, W - 2.45]) o.caja(Mat.Detalle, px - 0.28, 6.6, 0.4, px + 0.28, 9.45, 0.62, OC, 1, "z-");
  const ajedrez = (x0: number, x1: number, y0: number, y1: number, z: number) => {
    const lado = 0.25;
    const nx = Math.max(1, Math.round((x1 - x0) / lado));
    const ny = Math.max(1, Math.round((y1 - y0) / lado));
    o.poli(Mat.Detalle, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], B);
    if (!o.fino) return o.poli(Mat.Detalle, [[x0, y0, z + 0.005], [x1, y0, z + 0.005], [x1, y1, z + 0.005], [x0, y1, z + 0.005]], C("#D59A8C"));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        if ((i + j) % 2) continue;
        const a = x0 + ((x1 - x0) * i) / nx;
        const b = x0 + ((x1 - x0) * (i + 1)) / nx;
        const e = y0 + ((y1 - y0) * j) / ny;
        const f = y0 + ((y1 - y0) * (j + 1)) / ny;
        o.poli(Mat.Detalle, [[a, e, z + 0.005], [b, e, z + 0.005], [b, f, z + 0.005], [a, f, z + 0.005]], RJ);
      }
  };
  ajedrez(0.62, 2.13, 5.55, 6.05, 0.51);
  ajedrez(W - 2.13, W - 0.62, 5.55, 6.05, 0.51);
  ajedrez(2.77, W - 2.77, 5.55, 6.05, 0.51);
  moldura(o, -0.15, W + 0.15, 6.2, 6.65, 0.75, OC, -0.2);
  // Ventanas laterales con recercado ocre y reja, puerta en arco y hornacina.
  for (const x of [1.37, W - 1.37]) {
    ventana(o, x, 2.1, 0.95, 2.3, { marco: HIERRO, recercado: OC, recercadoAncho: 0.22 });
    o.caja(Mat.Detalle, x - 0.7, 1.85, 0.5, x + 0.7, 2.0, 0.72, OC);
    reja(o, x, 2.1, 0.95, 2.3, 0.6, HIERRO);
  }
  prisma(o, Mat.Detalle, arco(m - 1.2, m + 1.2, 0.6, 3.25), 0.5, 0.64, OC);
  prisma(o, Mat.Detalle, arco(m - 0.88, m + 0.88, 0.6, 3.25), 0.64, 0.68, C("#4A2E1E"));
  if (o.fino) for (const dx of [-0.44, 0.44]) o.caja(Mat.Detalle, m + dx - 0.3, 1.0, 0.68, m + dx + 0.3, 2.9, 0.71, C("#3A2316"));
  o.caja(Mat.Detalle, m + 1.35, 2.3, 0.5, m + 2.0, 4.6, 0.54, C("#2D5DA6"));
  o.caja(Mat.Detalle, m + 1.43, 2.55, 0.54, m + 1.92, 4.0, 0.56, C("#7FA6D9"));
  o.caja(Mat.Muro, 2.45, 6.65, -0.2, W - 2.45, 9.45, 0.5, B, 1, "z-");
  prisma(o, Mat.Detalle, arco(m - 0.58, m + 0.58, 6.9, 8.15), 0.5, 0.6, OC);
  prisma(o, Mat.Detalle, arco(m - 0.42, m + 0.42, 7.02, 8.15), 0.6, 0.62, C("#3E6FB5"));
  prisma(o, Mat.Detalle, [[m - 0.24, 7.1], [m + 0.24, 7.1], [m + 0.13, 8.0], [m - 0.13, 8.0]], 0.62, 0.64, C("#EDE7DA"));
  disco(o, Mat.Detalle, m, 8.12, 0.62, 0.64, 0.11, C("#EDE7DA"), 8);
  ajedrez(2.77, W - 2.77, 8.95, 9.4, 0.51);
  moldura(o, 2.1, W - 2.1, 9.42, 9.8, 0.72, OC, -0.2);
  // Volutas laterales (perfil en S) con albardilla ocre y pináculos de terracota.
  const voluta = (izq: boolean) => {
    const curva: P2[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = 0.15 + 2.3 * t;
      const y = 7.1 + 2.45 * (0.5 - 0.5 * Math.cos(Math.PI * t));
      curva.push([izq ? x : W - x, y]);
    }
    const cuerpoV: P2[] = [[izq ? 0.15 : W - 0.15, 6.65], ...curva, [izq ? 2.45 : W - 2.45, 6.65]];
    prisma(o, Mat.Muro, cuerpoV, -0.2, 0.45, B);
    tira(o, Mat.Detalle, curva, 0.24, -0.25, 0.6, OC);
  };
  voluta(true);
  voluta(false);
  for (const [x, y] of [[0.22, 7.32], [W - 0.22, 7.32], [2.3, 9.8], [W - 2.3, 9.8]] as P2[]) {
    o.caja(Mat.Detalle, x - 0.2, y, 0.05, x + 0.2, y + 0.16, 0.45, OC);
    jarron(o, x, y + 0.16, 0.25, 0.75, TC);
  }
  // Frontón triangular con reloj y rombos.
  prisma(o, Mat.Muro, [[2.15, 9.8], [W - 2.15, 9.8], [m, 12.05]], -0.2, 0.5, B);
  prisma(o, Mat.Detalle, [[1.95, 9.75], [m, 12.05], [m, 12.35], [1.65, 9.75]], -0.2, 0.7, OC);
  prisma(o, Mat.Detalle, [[W - 1.95, 9.75], [W - 1.65, 9.75], [m, 12.35], [m, 12.05]], -0.2, 0.7, OC);
  for (const s of [-1, 1]) {
    const cx0 = m + s * 1.45;
    prisma(o, Mat.Detalle, [[cx0 - 0.55, 10.25], [cx0, 10.0], [cx0 + 0.55, 10.25], [cx0, 10.5]], 0.5, 0.52, RJ);
    prisma(o, Mat.Detalle, [[cx0 - 0.25, 10.25], [cx0, 10.13], [cx0 + 0.25, 10.25], [cx0, 10.37]], 0.52, 0.54, B);
  }
  disco(o, Mat.Detalle, m, 10.8, 0.5, 0.54, 0.58, C("#2B2B2B"), 18);
  disco(o, Mat.Detalle, m, 10.8, 0.54, 0.57, 0.5, C("#FFFFFF"), 18);
  o.caja(Mat.Metal, m - 0.025, 10.78, 0.57, m + 0.025, 11.15, 0.6, HIERRO);
  o.caja(Mat.Metal, m - 0.025, 10.78, 0.57, m + 0.3, 10.83, 0.6, HIERRO);

  // Espadaña: tres campanas, una encima, cornisas ocres, remate curvo y cruz de hierro.
  const campana = (x: number, y: number, z: number) => {
    torno(o, Mat.Metal, x, y, z, [[0.36, 0], [0.34, 0.07], [0.27, 0.28], [0.23, 0.52], [0.13, 0.6], [0.03, 0.64]], BRONCE, 10);
    o.caja(Mat.Detalle, x - 0.3, y + 0.62, z - 0.06, x + 0.3, y + 0.74, z + 0.06, C("#3B2A1E"));
  };
  const vano = (x: number, y0: number, yArr: number, r: number, zf: number) => {
    prisma(o, Mat.Detalle, arco(x - r - 0.16, x + r + 0.16, y0, yArr), zf, zf + 0.02, OC, false);
    prisma(o, Mat.Detalle, arco(x - r, x + r, y0, yArr), zf + 0.02, zf + 0.04, OSCURO, false);
    campana(x, y0 + 0.45, zf + 0.25);
    verja(o, x - r - 0.1, zf + 0.42, x + r + 0.1, zf + 0.42, y0, 0.55, HIERRO, 0.1, 0.02);
    o.caja(Mat.Detalle, x - r - 0.25, y0 - 0.16, zf, x + r + 0.25, y0, zf + 0.5, OC);
  };
  o.caja(Mat.Muro, m - 2.8, 9.8, -0.95, m + 2.8, 15.0, 0.05, B, 1, "z-");
  for (const dx of [-2.62, -0.875, 0.875, 2.62]) o.caja(Mat.Detalle, m + dx - 0.2, 11.8, 0.0, m + dx + 0.2, 15.0, 0.16, OC, 1, "z-");
  moldura(o, m - 2.95, m + 2.95, 11.95, 12.15, 0.2, OC, 0.05);
  for (const dx of [-1.75, 0, 1.75]) vano(m + dx, 12.35, 13.85, 0.52, 0.05);
  moldura(o, m - 3.05, m + 3.05, 15.0, 15.42, 1.4, OC, -1.05);
  for (const dx of [-2.85, 2.85]) jarron(o, m + dx, 15.42, -0.05, 0.75, TC);
  o.caja(Mat.Muro, m - 1.4, 15.42, -0.75, m + 1.4, 18.3, 0.0, B, 1, "z-");
  for (const dx of [-1.24, 1.24]) o.caja(Mat.Detalle, m + dx - 0.17, 15.42, -0.05, m + dx + 0.17, 18.3, 0.1, OC, 1, "z-");
  vano(m, 16.0, 17.2, 0.55, 0.0);
  moldura(o, m - 1.6, m + 1.6, 18.3, 18.6, 1.1, OC, -0.9);
  for (const dx of [-1.48, 1.48]) jarron(o, m + dx, 18.6, -0.2, 0.6, TC);
  const corona: P2[] = [];
  for (let i = 0; i <= 14; i++) corona.push([m + 1.32 * Math.cos((Math.PI * i) / 14), 18.6 + 1.0 * Math.sin((Math.PI * i) / 14)]);
  prisma(o, Mat.Muro, corona, -0.6, 0.0, B);
  tira(o, Mat.Detalle, [...corona], 0.16, -0.65, 0.06, OC);
  disco(o, Mat.Detalle, m, 19.05, 0.0, 0.03, 0.24, OC, 12);
  disco(o, Mat.Detalle, m, 19.05, 0.03, 0.05, 0.15, OSCURO, 12);
  o.caja(Mat.Metal, m - 0.05, 19.6, -0.35, m + 0.05, 21.3, -0.25, HIERRO);
  o.caja(Mat.Metal, m - 0.42, 20.55, -0.35, m + 0.42, 20.65, -0.25, HIERRO);
  if (o.fino) for (const dx of [-0.42, 0.42]) torno(o, Mat.Metal, m + dx, 20.5, -0.3, [[0.04, 0], [0.07, 0.1], [0.02, 0.2]], HIERRO, 6);

  // Verja negra sobre murete ocre, compás de piedra y escalinata.
  const zv = 2.65;
  o.caja(Mat.Detalle, -0.2, 0, 0.5, W + 0.2, 0.42, zv, C("#D2CDC2"), 0.85, "y+");
  o.poli(Mat.Suelo, [[-0.2, 0.42, zv], [W + 0.2, 0.42, zv], [W + 0.2, 0.42, 0.5], [-0.2, 0.42, 0.5]], C("#D9D4C9"));
  const tramos: [number, number][] = [[-0.5, m - 1.15], [m + 1.15, W + 0.5]];
  for (const [a, b] of tramos) {
    o.caja(Mat.Detalle, a, 0, zv - 0.12, b, 0.62, zv + 0.22, OC, 0.85);
    verja(o, a, zv + 0.05, b, zv + 0.05, 0.62, 1.4, HIERRO, 0.14, 0.022);
    for (const x of [a, b]) o.caja(Mat.Metal, x - 0.07, 0.62, zv - 0.02, x + 0.07, 2.15, zv + 0.12, HIERRO);
  }
  for (const x of [-0.5, W + 0.5]) {
    o.caja(Mat.Detalle, x - 0.17, 0, 0.5, x + 0.17, 0.62, zv + 0.2, OC, 0.85);
    verja(o, x, 0.55, x, zv, 0.62, 1.4, HIERRO, 0.14, 0.022);
  }
  verja(o, m - 1.1, zv + 0.05, m - 0.05, zv + 0.05, 0.45, 1.55, HIERRO, 0.12, 0.02);
  const piedra = C("#C9C4B8");
  o.caja(Mat.Detalle, m - 1.15, 0, zv, m + 1.15, 0.14, zv + 0.95, piedra, 0.85);
  o.caja(Mat.Detalle, m - 1.15, 0.14, zv, m + 1.15, 0.28, zv + 0.62, piedra);
  o.caja(Mat.Detalle, m - 1.15, 0.28, zv - 0.1, m + 1.15, 0.42, zv + 0.3, piedra);
  return mc;
}

/* ── Casa de Ruperto Toledano Fernández (y la terraza del bar La Parada) ── */

function toledano(o: Obra, c: Ctx, ocupado: (p: P2) => boolean) {
  const AZULEJO = C("#D5CCC4");
  const BL = C("#F1EDE4");
  const PRETIL = C("#B4432E");
  const caras = cuerpo(o, c, TOLEDANO, 7.95, AZULEJO, ocupado, Mat.Ladrillo);
  for (const cara of caras) {
    if (!cara.calle) continue;
    const L = cara.m.usar(o, c);
    moldura(o, 0, L, 0, 0.5, 0.06, C("#7E7A74"));
    for (const x of [0.2, L - 0.2]) moldura(o, x - 0.22, x + 0.22, 0.5, 7.7, 0.1, BL);
    moldura(o, -0.05, L + 0.05, 3.9, 4.15, 0.18, BL);
    moldura(o, -0.1, L + 0.1, 7.55, 7.95, 0.38, BL);
    const xs = vanos(L, 2.15, 0.5);
    xs.forEach((x, i) => {
      // Planta baja: puertas y escaparates de madera.
      prisma(o, Mat.Detalle, arco(x - 0.62, x + 0.62, 0.5, 2.85), 0, 0.06, C("#5A3B28"));
      if (o.fino) o.caja(Mat.Cristal, x - 0.42, 1.4, 0.06, x + 0.42, 2.7, 0.08, C("#55606B"));
      // Planta alta: balconeras en arco con balcón de barandilla blanca; un cierro en la fachada larga.
      if (L > 8 && i === Math.floor(xs.length / 2)) {
        cierro(o, x, 4.45, 1.5, 2.75, 0.6, BL, BL);
        prisma(o, Mat.Detalle, arco(x - 0.75, x + 0.75, 6.95, 7.2), 0.58, 0.62, BL);
      } else {
        ventana(o, x, 4.45, 1.0, 2.45, { marco: BL, recercado: BL, recercadoAncho: 0.17, arco: true, cuarterones: true });
        balcon(o, x, 4.45, 1.45, 0.45, BL, C("#E9E9E6"), 0.9);
      }
    });
    // Pretil de pilares rojos y balaustres blancos.
    const cortes = [0, ...xs.slice(0, -1).map((x, i) => (x + xs[i + 1]) / 2), L];
    for (let i = 0; i < cortes.length; i++) {
      const x = Math.min(L - 0.22, Math.max(0.22, cortes[i]));
      o.caja(Mat.Detalle, x - 0.22, 7.95, -0.22, x + 0.22, 9.05, 0.22, PRETIL);
      o.caja(Mat.Detalle, x - 0.26, 9.05, -0.26, x + 0.26, 9.17, 0.26, BL);
      if (i < cortes.length - 1) balaustrada(o, x + 0.22, Math.min(L - 0.22, Math.max(0.22, cortes[i + 1])) - 0.22, 7.95, 1.05, -0.05, BL, 0.26);
    }
  }
  // Terraza cerrada del Café Bar La Parada, delante de la fachada sur.
  const sur = new Marco(TOLEDANO[0], TOLEDANO[1], centroide(TOLEDANO));
  const L = sur.usar(o, c);
  const GR = C("#8E2433");
  const x0 = 0.3;
  const x1 = L - 0.2;
  const z1 = 2.7;
  o.caja(Mat.Detalle, x0, 0, 0, x1, 0.95, z1, GR, 0.85, "z-y+");
  o.caja(Mat.Cristal, x0 + 0.05, 0.95, 0.05, x1 - 0.05, 2.4, z1 - 0.05, C("#4B5560"), 1, "z-y+");
  o.caja(Mat.Detalle, x0 - 0.05, 2.4, -0.05, x1 + 0.05, 2.62, z1 + 0.08, BL, 1, "z-");
  o.caja(Mat.Detalle, x0, 2.62, z1 - 0.06, x1, 3.0, z1 + 0.06, C("#3D7BCB"));
  if (o.fino) o.caja(Mat.Detalle, x0 + 0.4, 2.72, z1 + 0.06, x1 - 0.6, 2.9, z1 + 0.08, BL);
  for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4) o.caja(Mat.Detalle, x - 0.06, 0, z1 - 0.06, x + 0.06, 2.42, z1 + 0.04, BL);
  for (const x of [x0, x1]) o.caja(Mat.Detalle, x - 0.06, 0, 0, x + 0.06, 2.42, z1, BL);
}

/* ── Edificio verde de la esquina (y su vecino crema de cierros) ───── */

function edificioVerde(o: Obra, c: Ctx, ocupado: (p: P2) => boolean, poli: P2[], muroColor: RGB, semilla: number, esquina: boolean) {
  const PIEDRA = C("#DACFB9");
  const JUNTA = C("#BCAF97");
  const CREMA = C("#ECDFB9");
  const r = azar(semilla);
  const H = 17.0;
  const caras = cuerpo(o, c, poli, H, muroColor, ocupado);
  for (const cara of caras) {
    if (!cara.calle) continue;
    const L = cara.m.usar(o, c);
    // Basamento de sillería: planta baja y entresuelo.
    muro(o, 0, L, 0, 6.8, PIEDRA, Mat.Muro, 0.8, 0.03);
    sillares(o, 0, L, 0, 6.8, 0.56, JUNTA);
    moldura(o, -0.05, L + 0.05, 6.75, 7.3, 0.32, CREMA);
    for (const x of [0.25, L - 0.25]) moldura(o, x - 0.25, x + 0.25, 7.3, H, 0.12, CREMA);
    moldura(o, -0.1, L + 0.1, H - 0.1, H + 0.55, 0.3, CREMA);
    moldura(o, -0.2, L + 0.2, H + 0.55, H + 0.95, 0.6, CREMA);
    moldura(o, -0.05, L + 0.05, H + 0.95, H + 1.55, 0.12, CREMA);
    for (const x of [0.35, L - 0.35]) {
      o.caja(Mat.Detalle, x - 0.32, H + 1.55, -0.1, x + 0.32, H + 1.85, 0.42, CREMA);
      jarron(o, x, H + 1.85, 0.16, 0.95, CREMA);
    }
    const xs = vanos(L, 2.05, 0.75);
    const chaflan = esquina && L > 5 && L < 7;
    xs.forEach((x, i) => {
      const centro = i === Math.floor(xs.length / 2);
      // Planta baja: escaparates o el portal de hierro forjado.
      if (chaflan && centro) {
        prisma(o, Mat.Detalle, arco(x - 0.85, x + 0.85, 0, 2.9), 0, 0.05, C("#3A3C3F"));
        verja(o, x - 0.8, 0.12, x + 0.8, 0.12, 0, 3.6, HIERRO, 0.11, 0.025);
      } else {
        o.caja(Mat.Detalle, x - 0.85, 0, 0, x + 0.85, 3.3, 0.05, C("#5E6C66"));
        o.caja(Mat.Cristal, x - 0.75, 0.3, 0.05, x + 0.75, 3.1, 0.07, C("#3F4A52"));
      }
      ventana(o, x, 4.6, 1.15, 1.25, { marco: C("#E8E2D2"), alfeizar: PIEDRA });
      for (let p = 0; p < 3; p++) {
        const y = 7.75 + p * 3.1;
        if (!chaflan && i % 2 === 1 && p < 2) {
          cierro(o, x, y - 0.25, 1.45, 2.65, 0.6, BLANCO, HIERRO);
          continue;
        }
        ventana(o, x, y, centro && chaflan && p > 0 ? 1.25 : 1.0, 2.25, { marco: BLANCO, recercado: CREMA, recercadoAncho: 0.15, cuarterones: true, persiana: C("#E9E5DA"), bajada: r() * 0.3 });
        balcon(o, x, y, 1.5, 0.5, CREMA, HIERRO);
      }
    });
  }
}

/* ── Torre de ladrillo de la boca de Calle Real ──────────────────── */

function torre(o: Obra, c: Ctx, ocupado: (p: P2) => boolean) {
  // Ladrillo amarillento: la textura base es roja, así que el tinte compensa (valores > 1).
  const LAD: RGB = [1.0, 1.42, 1.3];
  const LOSA = C("#E8DAB2");
  const r = azar(91);
  const PB = 4.2;
  const P = 3.0;
  const N = 8;
  const H = PB + N * P;
  const caras = cuerpo(o, c, TORRE, H + 2.6, LAD, ocupado, Mat.Ladrillo);
  for (const cara of caras) {
    if (!cara.calle) continue;
    const L = cara.m.usar(o, c);
    // Bajos comerciales con rótulos.
    muro(o, 0, L, 0, PB, C("#E9E2D2"), Mat.Muro, 0.8, 0.03);
    for (const x of vanos(L, 2.6, 0.3)) o.caja(Mat.Cristal, x - 1.05, 0.15, 0, x + 1.05, 3.2, 0.05, C("#8FA9BC"));
    o.caja(Mat.Detalle, 0.1, 3.3, 0, L - 0.1, 3.95, 0.25, L < 8 ? C("#2E6FB7") : C("#E8E2D2"));
    toldo(o, 0.4, Math.min(L - 0.4, 3.6), 3.25, 1.2, 0.5, C("#F1F0EA"));
    // Plantas: forjados marcados, ventanas con persiana, toldos y balcones en la esquina.
    for (let p = 0; p < N; p++) {
      const y = PB + p * P;
      moldura(o, -0.05, L + 0.05, y - 0.12, y + 0.14, 0.12, LOSA);
      for (const x of vanos(L, 1.85, 0.9)) {
        const g = cara.m.g(x, 0);
        if (Math.hypot(g[0] - TORRE[0][0], g[1] - TORRE[0][1]) < 2.7) continue;
        ventana(o, x, y + 0.85, 0.95, 1.4, { marco: BLANCO, persiana: C("#D8C7A0"), bajada: 0.15 + r() * 0.5, alfeizar: LOSA });
        if (r() < 0.22) toldo(o, x - 0.6, x + 0.6, y + 2.45, 0.6, 0.5, C("#C8572E"));
        else if (r() < 0.3) balcon(o, x, y + 0.85, 1.3, 0.45, LOSA, HIERRO);
      }
    }
    // Ático retranqueado (con galería acristalada blanca).
    moldura(o, -0.05, L + 0.05, H - 0.12, H + 0.14, 0.12, LOSA);
    muro(o, 0, L, H + 0.14, H + 2.6, BLANCO, Mat.Muro, 1, 0.03);
    for (const x of vanos(L, 1.6, 0.5)) ventana(o, x, H + 0.6, 1.1, 1.5, { marco: BLANCO });
    moldura(o, -0.1, L + 0.1, H + 2.5, H + 2.8, 0.2, BLANCO);
  }
  // Balcones corridos en la esquina suroeste (losa en L con barandilla).
  const sur = new Marco(TORRE[0], TORRE[1], centroide(TORRE));
  const oeste = new Marco(TORRE[4], TORRE[0], centroide(TORRE));
  for (let p = 0; p < N; p++) {
    const y = PB + p * P + 0.85;
    sur.usar(o, c);
    balcon(o, 1.3, y, 2.6, 1.1, LOSA, HIERRO);
    ventana(o, 1.3, y, 1.3, 1.9, { marco: BLANCO });
    const Lo = oeste.usar(o, c);
    balcon(o, Lo - 1.3, y, 2.6, 1.1, LOSA, HIERRO);
    ventana(o, Lo - 1.3, y, 1.3, 1.9, { marco: BLANCO });
  }
}

/* ── Edificio blanco del tejado a cuatro aguas (bajos con arcos) ───── */

function blanca(o: Obra, c: Ctx, ocupado: (p: P2) => boolean) {
  const B = C("#F7F5EF");
  const MAD = C("#4B3524");
  const VERDE = C("#2F6B4C");
  const r = azar(57);
  const PB = 4.4;
  const P = 3.1;
  const H = PB + 3 * P;
  const caras = cuerpo(o, c, BLANCA, H, B, ocupado);
  for (const cara of caras) {
    if (!cara.calle) continue;
    const L = cara.m.usar(o, c);
    moldura(o, 0, L, 0, 0.45, 0.05, C("#9A968E"));
    moldura(o, -0.05, L + 0.05, PB - 0.15, PB + 0.1, 0.15, B);
    const xs = vanos(L, 1.95, 0.5);
    xs.forEach((x, i) => {
      // Arcos de los comercios con toldos verdes festoneados (y el rótulo magenta en uno).
      prisma(o, Mat.Detalle, arco(x - 0.82, x + 0.82, 0.45, 2.75), 0, 0.04, C("#E9E5DC"));
      prisma(o, Mat.Cristal, arco(x - 0.7, x + 0.7, 0.45, 2.75), 0.04, 0.06, C("#6E8796"));
      if (cara.L > 6 && i === 0) o.caja(Mat.Detalle, x - 0.85, 3.6, 0, x + 0.85, 4.15, 0.2, C("#C2187B"));
      else toldo(o, x - 0.8, x + 0.8, 3.55, 0.9, 0.35, VERDE, undefined, true);
      for (let p = 0; p < 3; p++) {
        const y = PB + 0.55 + p * P;
        const t = r();
        ventana(o, x, y, 0.9, 1.95, { marco: MAD, cuarterones: true });
        if (t < 0.4) reja(o, x, y - 0.1, 1.05, 2.15, 0.28, HIERRO);
        else if (t < 0.75) balcon(o, x, y, 1.2, 0.4, B, HIERRO);
        if (o.fino && r() < 0.6) for (const s of [-1, 1]) o.caja(Mat.Detalle, x + s * 0.47, y, 0.02, x + s * 0.47 + s * 0.42, y + 1.95, 0.07, C("#6B4A2E"));
      }
    });
    moldura(o, -0.35, L + 0.35, H - 0.25, H, 0.45, B);
  }
  // Tejado a cuatro aguas de teja árabe con dos chimeneas.
  enMundo(o, c, H);
  const cen = centroide(BLANCA);
  const vuelo = BLANCA.map(([x, y]) => [cen[0] + (x - cen[0]) * 1.08, cen[1] + (y - cen[1]) * 1.08] as P2);
  const cima = BLANCA.map(([x, y]) => [cen[0] + (x - cen[0]) * 0.28, cen[1] + (y - cen[1]) * 0.28] as P2);
  const TE = C("#B5603E");
  for (let i = 0; i < vuelo.length; i++) {
    const j = (i + 1) % vuelo.length;
    const a = vuelo[i];
    const b = vuelo[j];
    const ca = cima[i];
    const cb = cima[j];
    const pts: [number, number, number][] = [[a[0], 0, a[1]], [b[0], 0, b[1]], [cb[0], 2.6, cb[1]], [ca[0], 2.6, ca[1]]];
    // Orientar hacia fuera: la normal debe alejarse del centro.
    const nx = (b[1] - a[1]);
    const nz = -(b[0] - a[0]);
    const fuera = nx * ((a[0] + b[0]) / 2 - cen[0]) + nz * ((a[1] + b[1]) / 2 - cen[1]) > 0;
    o.poli(Mat.Teja, fuera ? [pts[1], pts[0], pts[3], pts[2]] : pts, TE, 1, 0.5);
  }
  plano(o, Mat.Teja, cima, 2.6, TE, 0.5);
  for (const f of [0.35, 0.6]) {
    const p: P2 = [cen[0] + (BLANCA[3][0] - cen[0]) * f, cen[1] + (BLANCA[3][1] - cen[1]) * f];
    o.caja(Mat.Muro, p[0] - 0.35, 1.2, p[1] - 0.35, p[0] + 0.35, 4.2, p[1] + 0.35, BLANCO);
    o.caja(Mat.Detalle, p[0] - 0.45, 4.2, p[1] - 0.45, p[0] + 0.45, 4.35, p[1] + 0.45, C("#D9D4CA"));
    torno(o, Mat.Detalle, p[0], 4.35, p[1], [[0.18, 0], [0.18, 0.45], [0.22, 0.5], [0.02, 0.6]], C("#8F8A82"), 6);
  }
}

/* ── Edificio rosa del pasaje (cara sur de la plaza) ──────────────── */

function rosa(o: Obra, c: Ctx, ocupado: (p: P2) => boolean) {
  const ROSA_ = C("#E7B49E");
  const CREMA = C("#EEDFC2");
  const BAL = C("#F7F3EA");
  const r = azar(23);
  const PB = 4.6;
  const P1 = 3.2;
  const P = 3.1;
  const H = PB + P1 + 4 * P;
  const caras = cuerpo(o, c, ROSA, H, ROSA_, ocupado, Mat.Muro, C("#C98563"));
  for (const cara of caras) {
    if (!cara.calle) continue;
    const L = cara.m.usar(o, c);
    const principal = L > 15;
    muro(o, 0, L, 0, PB + P1, CREMA, Mat.Muro, 0.8, 0.03);
    sillares(o, 0, L, 0, PB, 0.5, C("#D6C6A6"));
    moldura(o, -0.05, L + 0.05, PB + P1 - 0.1, PB + P1 + 0.25, 0.2, CREMA);
    const pasaje = principal ? [L * 0.33, L * 0.47] : [];
    // Cuerpos salientes rematados con frontoncillos.
    const salientes: [number, number][] = principal ? [[0.4, 3.4], [L * 0.5 - 0.2, L * 0.5 + 3.6], [L - 3.6, L - 0.4]] : [];
    for (const [a, b] of salientes) {
      o.caja(Mat.Muro, a, PB + P1, 0, b, H + 0.6, 0.32, ROSA_, 1, "z-");
      prisma(o, Mat.Detalle, [[a - 0.1, H + 0.6], [b + 0.1, H + 0.6], [(a + b) / 2, H + 1.4]], 0, 0.42, CREMA);
    }
    const sal = (x: number) => salientes.some(([a, b]) => x > a && x < b);
    for (const x of vanos(L, 1.75, 0.5)) {
      const z = sal(x) ? 0.32 : 0;
      // Bajos: arcos del pasaje o comercios con toldo.
      if (pasaje.some((px) => Math.abs(px - x) < 0.9)) {
        // (los arcos se dibujan aparte)
      } else if (x < L * 0.3 || x > L * 0.55) {
        o.caja(Mat.Cristal, x - 0.7, 0.2, 0, x + 0.7, 3.1, 0.05, C("#6E8291"));
        if (principal) toldo(o, x - 0.85, x + 0.85, 3.6, 1.6, 0.6, r() < 0.5 ? C("#6B5B52") : C("#F2F0E9"));
      }
      ventana(o, x, PB + 0.5, 0.95, 1.95, { marco: BLANCO, persiana: C("#EDEDE8"), bajada: 0.2 + r() * 0.3 });
      balaustrada(o, x - 0.65, x + 0.65, PB + 0.4, 0.85, 0.2, BAL, 0.25);
      for (let p = 0; p < 4; p++) {
        const y = PB + P1 + 0.45 + p * P;
        ventana(o, x, y, 0.95, 1.95, { marco: BLANCO, persiana: C("#EDEDE8"), bajada: 0.15 + r() * 0.4, recercado: CREMA, recercadoAncho: 0.1 });
        if (z > 0) {
          if (p < 3) balaustrada(o, x - 0.65, x + 0.65, y - 0.1, 0.85, z + 0.22, BAL, 0.25);
          if (p === 3 && o.fino) prisma(o, Mat.Detalle, [[x - 0.7, y + 2.1], [x + 0.7, y + 2.1], [x, y + 2.55]], z, z + 0.15, CREMA);
        } else balcon(o, x, y, 1.3, 0.38, CREMA, HIERRO);
      }
    }
    for (const px of pasaje) {
      prisma(o, Mat.Detalle, arco(px - 1.45, px + 1.45, 0, 4.6), 0, 0.12, CREMA);
      prisma(o, Mat.Detalle, arco(px - 1.25, px + 1.25, 0, 4.6), 0.12, 0.14, C("#4C4743"));
    }
    moldura(o, -0.1, L + 0.1, H - 0.1, H + 0.3, 0.3, CREMA);
    o.caja(Mat.Muro, 0, H + 0.3, -0.25, L, H + 1.0, 0, ROSA_);
  }
  // Templetes de teja en la azotea (vista aérea).
  enMundo(o, c, H);
  for (const f of [0.28, 0.72]) {
    const x = ROSA[0][0] + (ROSA[1][0] - ROSA[0][0]) * f;
    const z = ROSA[0][1] + 4.2;
    o.caja(Mat.Muro, x - 1.6, 0, z - 1.4, x + 1.6, 2.4, z + 1.4, C("#F1E6D6"));
    o.tejado(x - 1.9, x + 1.9, z - 1.7, z + 1.7, 2.4, 1.4, C("#B5603E"), C("#F1E6D6"), true);
  }
}

/* ── Edificio verde estrecho de celosías ──────────────────────────── */

function estrecho(o: Obra, c: Ctx, ocupado: (p: P2) => boolean) {
  const V = C("#3E8A57");
  const H = 4.2 + 4 * 3.0;
  const caras = cuerpo(o, c, ESTRECHO, H, V, ocupado);
  for (const cara of caras) {
    if (!cara.calle) continue;
    const L = cara.m.usar(o, c);
    muro(o, 0, L, 0, 4.2, C("#E7E3DA"), Mat.Muro, 0.8, 0.03);
    o.caja(Mat.Cristal, 0.4, 0.2, 0, L - 0.4, 3.3, 0.05, C("#6F8796"));
    for (let p = 0; p < 4; p++) {
      const y = 4.2 + p * 3.0;
      moldura(o, -0.05, L + 0.05, y - 0.1, y + 0.12, 0.15, BLANCO);
      ventana(o, L * 0.3, y + 0.8, 1.0, 1.4, { marco: BLANCO, persiana: C("#EDEDE8"), bajada: 0.3 });
      balcon(o, L * 0.3, y + 0.8, 1.4, 0.4, BLANCO, HIERRO);
      // Celosía blanca de piezas cuadradas.
      const x0 = L * 0.58;
      const x1 = L - 0.4;
      o.caja(Mat.Detalle, x0, y + 0.3, 0, x1, y + 2.7, 0.08, C("#E9E7E0"));
      if (o.fino) for (let gx = x0 + 0.18; gx < x1 - 0.1; gx += 0.36) for (let gy = y + 0.48; gy < y + 2.6; gy += 0.36) o.caja(Mat.Detalle, gx - 0.09, gy - 0.09, 0.08, gx + 0.09, gy + 0.09, 0.1, C("#BFC8C0"));
    }
    moldura(o, -0.1, L + 0.1, H - 0.1, H + 0.25, 0.25, BLANCO);
  }
}

/* ── Plaza: pavimento en estrella, monumento, quioscos y mobiliario ── */

function plaza(o: Obra, c: Ctx, iglesia: Marco) {
  enMundo(o, c);
  const GRIS = C("#B9B6AE");
  const plazaPoli: P2[] = [
    [1096.6, 2125.6], [1105.2, 2125.9], [1114.6, 2128.4], [1121.2, 2131.5], [1127.6, 2133.0], [1124.5, 2136.4], [1121.2, 2135.7],
    [1115.0, 2139.9], [1113.9, 2146.6], [1124.0, 2145.6], [1124.0, 2148.4], [1119.0, 2149.2], [1094.0, 2149.6], [1097.4, 2147.8],
    [1098.7, 2141.4], [1099.7, 2136.9], [1097.1, 2131.5],
  ];
  // El pavimento llega hasta debajo de las fachadas (que se han encogido un poco hacia dentro).
  plano(o, Mat.Suelo, plazaPoli.map(([x, y]) => [1108 + (x - 1108) * 1.08, 2138 + (y - 2138) * 1.08] as P2), 0.24, GRIS, 0.35);
  // Calles laterales de la iglesia: adoquín claro a poniente y ladrillo en espiga a levante.
  plano(o, Mat.Suelo, [[1097.0, 2125.0], [1105.3, 2125.6], [1108.6, 2110.4], [1100.2, 2108.4]], 0.23, C("#A9A49B"), 0.5);
  plano(o, Mat.Suelo, [[1114.4, 2128.0], [1121.4, 2131.3], [1124.7, 2116.9], [1118.4, 2113.4]], 0.23, C("#B97A5E"), 0.6);
  // Rosa de los vientos: puntas grises y rosadas alrededor del monumento.
  const [mx, mz] = MONUMENTO;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + Math.PI / 16;
    const largo = k % 2 ? 6.2 : 10.5;
    const r0 = 3.9;
    const d = Math.PI / 16;
    const pts: P2[] = [[mx + Math.cos(a - d) * r0, mz + Math.sin(a - d) * r0], [mx + Math.cos(a) * largo, mz + Math.sin(a) * largo], [mx + Math.cos(a + d) * r0, mz + Math.sin(a + d) * r0]];
    plano(o, Mat.Suelo, pts, 0.255, k % 2 ? C("#C99C8E") : C("#5F6167"), 0.4);
  }
  const anillo: P2[] = [];
  for (let i = 0; i < 32; i++) anillo.push([mx + Math.cos((i / 32) * Math.PI * 2) * 4.2, mz + Math.sin((i / 32) * Math.PI * 2) * 4.2]);
  plano(o, Mat.Suelo, anillo, 0.26, C("#C99C8E"), 0.4);

  // Mobiliario apoyado sobre el pavimento (a 0,24 m).
  enMundo(o, c, 0.24);
  // Monumento a José Cruz Herrera: tres mujeres de bronce sobre pedestal rosado, entre un seto redondo.
  torno(o, Mat.Detalle, mx, 0, mz, [[3.6, 0], [3.6, 0.32], [3.42, 0.34]], C("#9A958C"), 24);
  torno(o, Mat.Detalle, mx, 0.16, mz, [[3.45, 0], [3.5, 0.3], [3.2, 0.65], [2.4, 0.85], [1.55, 0.9]], C("#3E7A3A"), 24);
  const ped = 0.16;
  torno(o, Mat.Detalle, mx, ped, mz, [[1.5, 0], [1.5, 0.25], [1.34, 0.32], [1.28, 1.3], [1.42, 1.4], [1.42, 1.58], [0.02, 1.59]], C("#CB8B7C"), 20);
  const cima = ped + 1.59;
  const BRZ = C("#8C8466");
  // Paleta de pintor con su nombre (placa de bronce) mirando a la plaza.
  const placa: P2[] = [];
  for (let i = 0; i < 14; i++) placa.push([Math.cos((i / 14) * Math.PI * 2) * 0.32 * (i === 3 ? 0.7 : 1), Math.sin((i / 14) * Math.PI * 2) * 0.22]);
  const mp = new Marco([mx - 1, mz + 1.31], [mx + 1, mz + 1.31], [mx, mz]);
  mp.usar(o, c, 0.24);
  prisma(o, Mat.Metal, placa.map(([x, y]) => [1 + x, ped + 0.85 + y] as P2), 0.0, 0.03, C("#5E6B55"));
  enMundo(o, c, 0.24);
  // Figuras: falda (con volantes en la bailaora), talle, mantón, brazos, cabeza con moño y peineta.
  const figura = (x: number, z: number, s: number, volantes: boolean, brazoArriba: number) => {
    const seg = o.fino ? 14 : 8;
    const falda: P2[] = [[0.36, 0], [0.37, 0.04]];
    if (volantes) for (let k = 0; k < 4; k++) {
      const h = 0.08 + k * 0.2;
      const rr = 0.35 - k * 0.045;
      falda.push([rr - 0.05, h + 0.02], [rr + 0.02, h + 0.06], [rr - 0.06, h + 0.16]);
    }
    else falda.push([0.3, 0.3], [0.25, 0.6]);
    falda.push([0.19, 0.86], [0.15, 0.98]);
    torno(o, Mat.Metal, x, cima, z, falda.map(([r, h]) => [r * s, h * s] as P2), BRZ, seg);
    const cuerpoF: P2[] = [[0.14, 0.98], [0.16, 1.12], [0.17, 1.24], [0.18, 1.36], [0.12, 1.42], [0.05, 1.45], [0.05, 1.5], [0.09, 1.53], [0.105, 1.6], [0.1, 1.68], [0.06, 1.73], [0.01, 1.75]];
    torno(o, Mat.Metal, x, cima, z, cuerpoF.map(([r, h]) => [r * s, h * s] as P2), BRZ, seg);
    // Mantón de flecos sobre los hombros.
    torno(o, Mat.Metal, x, cima + 1.02 * s, z, [[0.27 * s, 0], [0.24 * s, 0.18 * s], [0.2 * s, 0.32 * s], [0.08 * s, 0.4 * s]], C("#6F6A52"), seg);
    // Moño y peineta.
    torno(o, Mat.Metal, x, cima + 1.68 * s, z + 0.06 * s, [[0.06 * s, 0], [0.07 * s, 0.05 * s], [0.02 * s, 0.1 * s]], BRZ, 8);
    if (o.fino) {
      prisma(o, Mat.Metal, arco(-0.1 * s, 0.1 * s, 0, 0.06 * s, 8).map(([px, py]) => [x + px, cima + 1.72 * s + py] as P2), z + 0.08 * s, z + 0.1 * s, BRZ);
      // Brazos: uno caído y otro recogido o en alto (abanico).
      o.caja(Mat.Metal, x - 0.24 * s, cima + 0.92 * s, z - 0.04 * s, x - 0.17 * s, cima + 1.36 * s, z + 0.04 * s, BRZ);
      o.caja(Mat.Metal, x + 0.17 * s, cima + (1.2 + brazoArriba * 0.2) * s, z - 0.04 * s, x + 0.24 * s, cima + (1.38 + brazoArriba * 0.32) * s, z + 0.04 * s, BRZ);
      if (brazoArriba) o.caja(Mat.Metal, x + 0.13 * s, cima + 1.66 * s, z - 0.01, x + 0.33 * s, cima + 1.82 * s, z + 0.01, BRZ);
    }
  };
  figura(mx, mz - 0.15, 1.18, true, 1);
  figura(mx - 0.62, mz + 0.3, 1.1, false, 0);
  figura(mx + 0.64, mz + 0.28, 1.12, false, 0);

  // Farolas fernandinas, bolardos, macetero con magnolio y terrazas.
  for (const p of [[1112.4, 2141.4], [1101.4, 2137.8], [1104.8, 2146.6], [1117.8, 2132.9]] as P2[]) farola(o, p[0], p[1]);
  for (let i = 0; i < 5; i++) torno(o, Mat.Metal, 1100.0 + i * 1.05, 0, 2127.5 + i * 0.25, [[0.08, 0], [0.08, 0.85], [0.05, 0.92]], C("#A3A8AD"), 8);
  torno(o, Mat.Detalle, 1100.9, 0, 2130.9, [[0.35, 0], [0.75, 0.35], [0.86, 0.55], [0.8, 0.6], [0.6, 0.58]], C("#3D4044"), 12);
  arbolito(o, 1100.9, 0.45, 2130.9, 2.6, C("#406E36"));
  const r = azar(5);
  for (const p of [[1101.5, 2145.6], [1104.7, 2146.0]] as P2[]) terraza(o, p[0], p[1], C("#F4F2EC"), r);
  for (const p of [[1101.9, 2133.5], [1102.3, 2140.5]] as P2[]) terraza(o, p[0], p[1], C("#2C2E33"), r);

  // Quioscos a los lados del compás de la iglesia, farolas y bancos granates.
  const W = iglesia.usar(o, c, 0.24);
  const quiosco = (x: number, z: number) => {
    const GR = C("#8E2433");
    o.caja(Mat.Detalle, x - 1.0, 0, z - 1.1, x + 1.0, 2.5, z + 1.1, GR, 0.85);
    o.caja(Mat.Cristal, x - 0.85, 0.5, z + 1.1, x + 0.85, 2.2, z + 1.13, C("#C9B48A"));
    if (o.fino) for (let i = 0; i < 12; i++) o.caja(Mat.Detalle, x - 0.8 + (i % 4) * 0.42, 0.55 + Math.floor(i / 4) * 0.55, z + 1.13, x - 0.45 + (i % 4) * 0.42, 0.95 + Math.floor(i / 4) * 0.55, z + 1.2, [C("#B7614F"), C("#D2B25A"), C("#5E7FA6"), C("#E8E2D4")][(i * 7) % 4]);
    o.caja(Mat.Detalle, x - 1.15, 2.1, z + 1.1, x + 1.15, 2.55, z + 1.45, C("#C0392B"));
    if (o.fino) for (let i = 0; i < 6; i += 2) o.caja(Mat.Detalle, x - 1.15 + i * 0.383, 2.1, z + 1.45, x - 1.15 + (i + 1) * 0.383, 2.55, z + 1.46, C("#F5F1EA"));
    torno(o, Mat.Detalle, x, 2.5, z, [[1.3, 0], [1.3, 0.2], [1.18, 0.25], [1.12, 0.5], [0.92, 0.85], [0.58, 1.1], [0.08, 1.22]], C("#2B2C31"), 16);
    jarron(o, x, 3.68, z, 0.45, C("#C0392B"));
  };
  quiosco(-1.8, 4.1);
  quiosco(W + 1.8, 4.1);
  farola(o, -0.9, 3.0);
  farola(o, W + 0.9, 3.0);
  banco(o, 1.3, 3.7);
  banco(o, W - 1.3, 3.7);
}

/**
 * Construye el sector en dos obras: la iglesia (que se puede tocar) y el resto.
 * `ocupado` dice si un punto del mapa cae dentro de otro edificio OSM que no se sustituye.
 */
export function construirCentro01(c: Ctx, ocupado: (p: P2) => boolean, fino: boolean) {
  const iglesia = new Obra();
  iglesia.fino = fino;
  const mc = santuario(iglesia, c);
  const resto = new Obra();
  resto.fino = fino;
  toledano(resto, c, ocupado);
  edificioVerde(resto, c, ocupado, VERDE, C("#A9B582"), 11, true);
  edificioVerde(resto, c, ocupado, CREMA, C("#E6DCC0"), 12, false);
  torre(resto, c, ocupado);
  blanca(resto, c, ocupado);
  rosa(resto, c, ocupado);
  estrecho(resto, c, ocupado);
  plaza(resto, c, mc);
  return { iglesia, resto };
}
