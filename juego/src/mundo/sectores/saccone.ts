import { Mat, Obra, rgb, type RGB } from "../arquitectura";
import { Especie } from "../vegetacion";
import {
  Marco, enMundo, prisma, plano, arco, torno, muro, moldura, sillares, ventana, interiorArista, verja,
  balaustrada, reja, jarron, tira, type Ctx, type P2,
} from "./piezas";
import { COLEGIO, MUSEO, PARQUE, PUNTOS, SENDAS, SOCIEDAD } from "./saccone.datos";

/**
 * SACCONE · Jardines Saccone, Museo Cruz Herrera (Villa San José) y Colegio Providencia
 * del Sagrado Corazón (Av. de España, 7 y 9).
 *
 * Huellas, caminos, fuente, monumento y estatuas: OpenStreetMap (© colaboradores de OSM, ODbL).
 * Aspecto: fotos y capturas de Street View / Google Maps aportadas por el usuario, solo como
 * referencia visual (nada se copia como textura). Alturas estimadas a partir de las fotos.
 * Ver city-reconstruction/reports/SACCONE.md.
 */

const C = rgb;
const HIERRO = C("#1E2224");
const CREMA = C("#F1E8D0");
const PIEDRA = C("#A39276");
const PIEDRA_CLARA = C("#D3C6AA");
const OCRE = C("#C9963F");
const MARMOL = C("#ECEAE3");
const SALMON = C("#F09A72");
const ALBERO = C("#D8BF8E");
const MADERA = C("#5A2019");

/** Azar determinista (todos los jugadores ven lo mismo). */
function azar(s: number) {
  let v = s;
  return () => ((v = (v * 16807) % 2147483647) / 2147483647);
}

export function dentroPoli(p: P2, poli: P2[]) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function distSeg(p: P2, a: P2, b: P2) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function distLinea(p: P2, l: P2[]) {
  let d = Infinity;
  for (let i = 1; i < l.length; i++) d = Math.min(d, distSeg(p, l[i - 1], l[i]));
  return d;
}

const suma = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];

/** ¿Está el punto dentro del recinto de los jardines? (para no duplicar el arbolado genérico). */
export function enJardinesSaccone(x: number, y: number) {
  return dentroPoli([x, y], PARQUE);
}

/* ── Museo Cruz Herrera ─────────────────────────────────────────────── */

const M_ESTE: P2 = [2271.6, 4450.8];
const M_OESTE: P2 = [2253.9, 4446.4];
const M_DENTRO: P2 = [2258, 4466];
/** Marco de la fachada principal (norte, al jardín): x desde la esquina este, +z hacia el jardín. */
const FRENTE = new Marco(M_ESTE, M_OESTE, M_DENTRO);
const ANCHO = FRENTE.L;
const TORRE_E = 4.14;
const TORRE_O = ANCHO - 4.85;
const RECESO = 2.06;
const FONDO_HISTORICO = 25;
const FONDO = 37;
const H = 10.4;

/** Punto del mapa a `x` metros de la esquina este y `d` metros hacia dentro del museo. */
const museoP = (x: number, d: number) => FRENTE.g(x, -d);

function torreMuseo(o: Obra, x0: number, x1: number) {
  // Zócalo de sillería, esquinas almohadilladas, imposta ocre, ventanas con recercado de piedra.
  o.caja(Mat.Detalle, x0 - 0.04, 0, 0, x1 + 0.04, 1.0, 0.1, PIEDRA_CLARA, 0.8, "z-");
  sillares(o, x0, x1, 0, 1.0, 0.33, PIEDRA);
  for (const [xe, s] of [[x0, 1], [x1, -1]] as const) {
    let k = 0;
    for (let y = 1.0; y < H - 0.5; y += 0.44, k++) {
      const w = k % 2 ? 0.45 : 0.75;
      const a = xe;
      const b = xe + s * w;
      o.caja(Mat.Detalle, Math.min(a, b), y + 0.03, 0, Math.max(a, b), y + 0.41, 0.09, PIEDRA, 1, "z-");
    }
  }
  moldura(o, x0, x1, 5.3, 5.62, 0.14, OCRE);
  const xc = (x0 + x1) / 2;
  ventana(o, xc, 1.7, 1.3, 2.9, { marco: C("#3D3328"), recercado: PIEDRA_CLARA, recercadoAncho: 0.24, arco: true });
  moldura(o, xc - 0.95, xc + 0.95, 1.45, 1.65, 0.16, PIEDRA_CLARA);
  ventana(o, xc, 6.5, 1.2, 2.3, { marco: C("#3D3328"), recercado: PIEDRA_CLARA, recercadoAncho: 0.2 });
  moldura(o, xc - 0.95, xc + 0.95, 9.0, 9.22, 0.22, PIEDRA_CLARA);
  moldura(o, xc - 0.85, xc + 0.85, 6.28, 6.45, 0.16, PIEDRA_CLARA);
  if (o.fino) for (const dx of [-0.6, 0.6]) o.caja(Mat.Detalle, xc + dx - 0.1, 6.0, 0, xc + dx + 0.1, 6.3, 0.14, PIEDRA_CLARA);
  moldura(o, x0 - 0.05, x1 + 0.05, 9.85, 10.4, 0.18, OCRE);
}

function farolPared(o: Obra, x: number, y: number) {
  o.caja(Mat.Metal, x - 0.03, y, 0, x + 0.03, y + 0.05, 0.45, HIERRO);
  torno(o, Mat.Luz, x, y - 0.45, 0.45, [[0.08, 0], [0.15, 0.1], [0.17, 0.4], [0.12, 0.48]], C("#F3E6BE"), 6);
  torno(o, Mat.Metal, x, y + 0.02, 0.45, [[0.16, 0], [0.18, 0.06], [0.06, 0.18], [0.01, 0.26]], HIERRO, 6);
}

function museo(o: Obra, c: Ctx) {
  // Volúmenes: dos torres, cuerpo central retranqueado y la ampliación moderna detrás.
  FRENTE.usar(o, c);
  o.caja(Mat.Muro, 0, 0, -FONDO_HISTORICO, TORRE_E, H, 0, CREMA, 0.8, "z-");
  o.caja(Mat.Muro, TORRE_O, 0, -FONDO_HISTORICO, ANCHO, H, 0, CREMA, 0.8, "z-");
  o.caja(Mat.Muro, TORRE_E, 0, -FONDO_HISTORICO, TORRE_O, H, -RECESO, CREMA, 0.8, "x+x-z-");
  o.caja(Mat.Muro, 0, 0, -FONDO, ANCHO, H + 0.5, -FONDO_HISTORICO, C("#EEECE6"), 0.85, "z+");
  // Remate: cornisa general, ático de las torres con pináculos y pretil.
  for (const [x0, x1] of [[0, TORRE_E], [TORRE_O, ANCHO]] as const) {
    o.caja(Mat.Detalle, x0 - 0.3, H, -6.2, x1 + 0.3, H + 0.35, 0.3, PIEDRA_CLARA);
    o.caja(Mat.Muro, x0 + 0.1, H + 0.35, -5.8, x1 - 0.1, H + 1.3, -0.05, CREMA);
    o.caja(Mat.Detalle, x0 - 0.05, H + 1.3, -5.95, x1 + 0.05, H + 1.5, 0.1, PIEDRA_CLARA);
    for (const x of [x0 + 0.25, x1 - 0.25]) jarron(o, x, H + 1.5, -0.1, 0.75, PIEDRA_CLARA);
  }
  // Ático central con el escudo de la ciudad y los mástiles.
  o.caja(Mat.Muro, 6.9, H, -RECESO - 0.4, 10.6, H + 1.4, -RECESO + 0.12, CREMA);
  o.caja(Mat.Detalle, 6.8, H + 1.4, -RECESO - 0.5, 10.7, H + 1.55, -RECESO + 0.2, PIEDRA_CLARA);
  o.caja(Mat.Detalle, 8.2, H + 0.25, -RECESO + 0.12, 9.3, H + 1.25, -RECESO + 0.17, PIEDRA_CLARA);
  if (o.fino) o.caja(Mat.Detalle, 8.45, H + 0.4, -RECESO + 0.17, 9.05, H + 1.05, -RECESO + 0.2, C("#9C8A62"));
  const BANDERAS: [RGB, RGB][] = [[C("#203E95"), C("#203E95")], [C("#0A7A3E"), C("#F4F4F0")], [C("#C8102E"), C("#F1BF00")], [C("#6FA9DC"), C("#F4F4F0")]];
  BANDERAS.forEach(([b1, b2], k) => {
    const x = 7.0 + k * 1.15;
    o.caja(Mat.Metal, x - 0.035, H, -RECESO - 1.5, x + 0.035, H + 4.2, -RECESO - 1.43, C("#E2E2DE"));
    o.caja(Mat.Detalle, x + 0.035, H + 3.0, -RECESO - 1.48, x + 1.0, H + 3.45, -RECESO - 1.45, b1);
    o.caja(Mat.Detalle, x + 0.035, H + 3.45, -RECESO - 1.48, x + 1.0, H + 3.9, -RECESO - 1.45, b2);
  });

  // Fachada de las torres.
  torreMuseo(o, 0, TORRE_E);
  torreMuseo(o, TORRE_O, ANCHO);
  for (const x of [TORRE_E - 0.35, TORRE_O + 0.35]) farolPared(o, x, 4.7);

  // Pórtico de tres arcos sobre columnas de mármol, con escalinata y balcón de balaustres.
  o.caja(Mat.Suelo, TORRE_E, 0, -RECESO, TORRE_O, 1.0, 0, PIEDRA_CLARA, 0.9);
  for (let k = 0; k < 5; k++) o.caja(Mat.Suelo, TORRE_E - 1.0, 0, 0, TORRE_O + 1.0, 1.0 - k * 0.2, 0.42 * (5 - k), k % 2 ? C("#DCD6CA") : C("#D2CCBF"), 0.9);
  const col0 = TORRE_E + 0.35;
  const paso = (TORRE_O - TORRE_E - 0.7) / 3;
  const cols = [0, 1, 2, 3].map((i) => col0 + i * paso);
  o.caja(Mat.Muro, TORRE_E, 1.0, -0.35, col0, 5.75, 0, CREMA);
  o.caja(Mat.Muro, cols[3], 1.0, -0.35, TORRE_O, 5.75, 0, CREMA);
  for (let i = 0; i < 3; i++) {
    const xl = cols[i];
    const xr = cols[i + 1];
    const r = (xr - xl) / 2 - 0.2;
    const cx = (xl + xr) / 2;
    const pts: P2[] = [[xl, 4.0], [xl + 0.2, 4.0]];
    for (let s = 1; s < 14; s++) {
      const a = Math.PI - (s / 14) * Math.PI;
      pts.push([cx + Math.cos(a) * r, 4.0 + Math.sin(a) * r]);
    }
    pts.push([xr - 0.2, 4.0], [xr, 4.0], [xr, 5.75], [xl, 5.75]);
    prisma(o, Mat.Muro, pts, -0.35, 0, CREMA);
    // Arquivolta y adornos de triángulos ocres de las enjutas (fotos).
    const curva: P2[] = [];
    for (let s = 0; s <= 14; s++) {
      const a = Math.PI - (s / 14) * Math.PI;
      curva.push([cx + Math.cos(a) * (r + 0.05), 4.0 + Math.sin(a) * (r + 0.05)]);
    }
    tira(o, Mat.Detalle, curva, 0.16, 0, 0.04, OCRE);
  }
  if (o.fino)
    for (const x of cols) {
      const t: P2[] = [[x - 0.5, 5.55], [x + 0.5, 5.55], [x, 4.95]];
      prisma(o, Mat.Detalle, t, 0, 0.03, OCRE, false);
      prisma(o, Mat.Detalle, [[x - 0.32, 5.47], [x + 0.32, 5.47], [x, 5.08]], 0.03, 0.04, CREMA, false);
    }
  for (const x of cols) {
    torno(o, Mat.Detalle, x, 1.0, -0.17, [[0.26, 0], [0.26, 0.12], [0.2, 0.2], [0.17, 0.3], [0.15, 2.7], [0.2, 2.8], [0.25, 2.95], [0.27, 3.0]], MARMOL, 10);
  }
  moldura(o, TORRE_E, TORRE_O, 5.75, 6.02, 0.3, PIEDRA_CLARA);
  o.caja(Mat.Detalle, TORRE_E, 5.75, -RECESO, TORRE_O, 6.0, 0, PIEDRA_CLARA);
  balaustrada(o, TORRE_E + 0.1, TORRE_O - 0.1, 6.02, 0.95, 0.05, PIEDRA_CLARA, 0.28);
  // Barandillas de la escalinata (metal gris con pasamanos de madera).
  if (o.fino)
    for (const x of [TORRE_E - 0.9, (TORRE_E + TORRE_O) / 2, TORRE_O + 0.9]) {
      verja(o, x, 2.0, x, 0.1, 0.4, 0.9, C("#8B8E90"), 0.9, 0.02);
      o.caja(Mat.Detalle, x - 0.04, 1.3, 0.1, x + 0.04, 1.36, 2.0, C("#8A5A34"));
    }

  // Muro del fondo del pórtico y planta alta del cuerpo central.
  const fondo = new Marco(FRENTE.g(0, -RECESO), FRENTE.g(ANCHO, -RECESO), M_DENTRO);
  fondo.usar(o, c);
  const xm = (cols[1] + cols[2]) / 2;
  prisma(o, Mat.Detalle, arco(xm - 1.05, xm + 1.05, 1.0, 3.6), 0, 0.05, PIEDRA_CLARA, false);
  prisma(o, Mat.Detalle, arco(xm - 0.85, xm + 0.85, 1.0, 3.6), 0.05, 0.09, MADERA, false);
  for (const x of [(cols[0] + cols[1]) / 2, (cols[2] + cols[3]) / 2]) {
    ventana(o, x, 1.7, 1.0, 2.4, { marco: MADERA, recercado: PIEDRA_CLARA, recercadoAncho: 0.18, arco: true });
    farolPared(o, x + (x < xm ? 0.9 : -0.9), 3.6);
  }
  moldura(o, TORRE_E, TORRE_O, 0, 1.0, 0.06, PIEDRA_CLARA);
  for (let i = 0; i < 3; i++) {
    const x = (cols[i] + cols[i + 1]) / 2;
    ventana(o, x, 6.5, 1.0, 2.3, { marco: MADERA, recercado: PIEDRA_CLARA, recercadoAncho: 0.2, arco: true });
  }
  for (const x of [cols[1], cols[2]]) {
    moldura(o, x - 0.22, x + 0.22, 6.0, 9.9, 0.08, OCRE);
    farolPared(o, x, 8.0);
  }
  moldura(o, TORRE_E - 0.1, TORRE_O + 0.1, 9.85, 10.4, 0.2, OCRE);
  moldura(o, TORRE_E - 0.3, TORRE_O + 0.3, H, H + 0.35, 0.5, PIEDRA_CLARA);

  // Costados largos: zócalo, pilastras almohadilladas, ventanas en arco abajo y adinteladas arriba.
  for (const [frente, atras] of [[M_ESTE, museoP(0, FONDO)], [M_OESTE, museoP(ANCHO, FONDO)]] as [P2, P2][]) {
    const mc = new Marco(frente, atras, M_DENTRO);
    const L = mc.usar(o, c);
    const inv = Math.hypot(mc.g(0, 0)[0] - frente[0], mc.g(0, 0)[1] - frente[1]) > 1;
    const X = (d: number) => (inv ? L - d : d);
    const tramo = (d0: number, d1: number) => [Math.min(X(d0), X(d1)), Math.max(X(d0), X(d1))] as const;
    const [a0, a1] = tramo(0, FONDO_HISTORICO);
    o.caja(Mat.Detalle, a0, 0, 0, a1, 0.9, 0.1, PIEDRA_CLARA, 0.8, "z-");
    sillares(o, a0, a1, 0, 0.9, 0.3, PIEDRA);
    moldura(o, a0, a1, 5.3, 5.62, 0.14, OCRE);
    moldura(o, a0, a1, 9.85, 10.4, 0.18, OCRE);
    moldura(o, a0 - 0.3, a1, H, H + 0.35, 0.5, PIEDRA_CLARA);
    o.caja(Mat.Muro, a0, H + 0.35, -0.3, a1, H + 0.85, 0, CREMA);
    for (const d of [0.4, 8.3, FONDO_HISTORICO - 0.4]) {
      let k = 0;
      for (let y = 0.9; y < H - 0.5; y += 0.44, k++) {
        const w = k % 2 ? 0.42 : 0.72;
        o.caja(Mat.Detalle, X(d) - w / 2, y + 0.03, 0, X(d) + w / 2, y + 0.41, 0.09, PIEDRA, 1, "z-");
      }
      jarron(o, X(d), H + 0.85, -0.15, 0.6, PIEDRA_CLARA);
    }
    const huecos = [2.0, 4.2, 6.3, 10.2, 12.4, 14.6, 16.8, 19.0, 21.2, 23.3];
    for (const d of huecos) {
      ventana(o, X(d), 1.6, 1.05, 2.6, { marco: C("#3D3328"), recercado: PIEDRA_CLARA, recercadoAncho: 0.18, arco: true });
      moldura(o, X(d) - 0.75, X(d) + 0.75, 1.42, 1.6, 0.14, PIEDRA_CLARA);
      ventana(o, X(d), 6.5, 1.0, 2.2, { marco: C("#3D3328"), recercado: PIEDRA_CLARA, recercadoAncho: 0.17 });
      moldura(o, X(d) - 0.8, X(d) + 0.8, 8.85, 9.08, 0.2, PIEDRA_CLARA);
      moldura(o, X(d) - 0.7, X(d) + 0.7, 6.3, 6.46, 0.14, PIEDRA_CLARA);
    }
    for (const d of [7.4, 24.2]) farolPared(o, X(d), 4.8);
    // Ampliación: paneles blancos con juntas finas y remate oscuro.
    const [b0, b1] = tramo(FONDO_HISTORICO, FONDO);
    o.caja(Mat.Detalle, b0, H - 0.1, 0, b1, H + 0.5, 0.06, C("#59646B"));
    if (o.fino) for (let x = b0 + 1.2; x < b1 - 0.1; x += 1.2) o.caja(Mat.Detalle, x - 0.012, 0, 0, x + 0.012, H - 0.1, 0.02, C("#CFCCC4"));
  }

  // Fachada trasera (a la plaza del Ayuntamiento): la caja blanca de la ampliación.
  const tras = new Marco(museoP(ANCHO, FONDO), museoP(0, FONDO), M_DENTRO);
  const T = tras.usar(o, c);
  o.caja(Mat.Detalle, 0, H - 0.1, 0, T, H + 0.5, 0.06, C("#59646B"));
  if (o.fino) {
    for (let x = 1.2; x < T - 0.1; x += 1.2) o.caja(Mat.Detalle, x - 0.012, 0, 0, x + 0.012, H - 0.1, 0.02, C("#CFCCC4"));
    for (let y = 2.45; y < H - 0.2; y += 2.45) o.caja(Mat.Detalle, 0, y - 0.012, 0, T, y + 0.012, 0.02, C("#CFCCC4"));
  }
  for (const x of [2.0, 3.6, 5.2]) {
    o.caja(Mat.Detalle, x - 0.55, 5.4, 0, x + 0.55, 7.8, 0.3, C("#F4F3EF"));
    o.caja(Mat.Cristal, x - 0.38, 5.55, 0.04, x + 0.38, 7.65, 0.32, C("#53636E"));
  }
  o.caja(Mat.Detalle, T * 0.55, 0, 0, T * 0.55 + 6.0, 3.0, 0.08, C("#7A4B2B"));
  // Rampa y meseta de tarima con barandilla.
  const m0 = T * 0.55 - 0.3;
  o.poli(Mat.Suelo, [[1.2, 0.05, 1.8], [m0, 0.62, 1.8], [m0, 0.62, 0.1], [1.2, 0.05, 0.1]], C("#9C6B45"));
  o.caja(Mat.Suelo, m0, 0, 0.1, T * 0.55 + 6.3, 0.62, 2.4, C("#9C6B45"));
  if (o.fino) {
    verja(o, 1.2, 1.85, m0, 1.85, 0.62, 0.95, C("#8B8E90"), 1.2, 0.02);
    verja(o, T * 0.55 + 6.3, 2.45, T * 0.55 + 6.3, 0.1, 0.62, 0.95, C("#8B8E90"), 1.2, 0.02);
  }

  // Cubiertas: azotea con lucernario y placas solares (vista aérea).
  enMundo(o, c);
  const azotea: P2[] = [museoP(0, 0), museoP(ANCHO, 0), museoP(ANCHO, FONDO_HISTORICO), museoP(0, FONDO_HISTORICO)];
  plano(o, Mat.Muro, azotea, H + 0.35, C("#BDB6A8"));
  plano(o, Mat.Muro, [museoP(0, FONDO_HISTORICO), museoP(ANCHO, FONDO_HISTORICO), museoP(ANCHO, FONDO), museoP(0, FONDO)], H + 0.5, C("#B5B2AB"));
  FRENTE.usar(o, c);
  o.caja(Mat.Cristal, 6.5, H + 0.35, -15, 11.7, H + 1.1, -10.5, C("#B9C8CF"));
  if (o.fino || !o.lejano)
    for (let z = -7; z > -FONDO + 1.5; z -= 2.2) {
      if (z < -9.5 && z > -16) continue;
      for (let x = 1.2; x < ANCHO - 1.5; x += 2.3) {
        const y = z < -FONDO_HISTORICO ? H + 0.5 : H + 0.35;
        o.poli(Mat.Cristal, [[x, y + 0.25, z], [x + 2.0, y + 0.25, z], [x + 2.0, y + 0.75, z - 1.1], [x, y + 0.75, z - 1.1]], C("#27406A"));
      }
    }
}

/* ── Jardines ───────────────────────────────────────────────────────── */

/** Puertas de la verja: las entradas de los caminos de OSM al recinto. */
const PUERTAS: { p: P2; ancho: number; peatonal?: P2 }[] = [
  // Puerta principal (nº 7, junto a la calle Doctor Villar) con su cancela peatonal al lado (fotos).
  { p: [2270.1, 4422.2], ancho: 3.0, peatonal: [2264.4, 4420.7] },
  { p: [2265.4, 4484.7], ancho: 2.4 },
  { p: [2144.4, 4469.4], ancho: 2.4 },
  { p: [2236.3, 4478.2], ancho: 4.0 },
];

/** Tramos de la verja (índices consecutivos del recinto) y tapia con el colegio. */
function tramosRecinto() {
  const n = PARQUE.length;
  const res: { a: P2; b: P2; dentro: P2; tipo: "verja" | "tapia"; sur: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const a = PARQUE[i];
    const b = PARQUE[(i + 1) % n];
    // Lado del colegio (su propio muro) y entrante del museo: sin cerca.
    const enMuseo = MUSEO.some((q) => Math.hypot(q[0] - a[0], q[1] - a[1]) < 0.3) && MUSEO.some((q) => Math.hypot(q[0] - b[0], q[1] - b[1]) < 0.3);
    if (enMuseo || (i === 0)) continue;
    if (i >= 12 && i <= 19) continue; // fachada y entrante del museo
    const tipo = i >= 1 && i <= 5 ? "tapia" : "verja";
    res.push({ a, b, dentro: interiorArista(PARQUE, i), tipo, sur: i >= 6 && i <= 11 });
  }
  return res;
}

function pilar(o: Obra, x: number, z: number, alto = 3.0, farol = true) {
  const a = 0.38;
  o.caja(Mat.Muro, x - a, 0, z - a, x + a, alto, z + a, SALMON, 0.85);
  o.caja(Mat.Detalle, x - a - 0.04, 0, z - a - 0.04, x + a + 0.04, 0.55, z + a + 0.04, C("#EFD9B4"));
  if (o.fino) for (let y = 0.9; y < alto - 0.3; y += 0.36) o.caja(Mat.Detalle, x - a - 0.015, y, z - a - 0.015, x + a + 0.015, y + 0.07, z + a + 0.015, C("#F2DFBD"));
  o.caja(Mat.Detalle, x - a - 0.1, alto - 0.28, z - a - 0.1, x + a + 0.1, alto, z + a + 0.1, C("#F2DFBD"));
  o.caja(Mat.Detalle, x - a + 0.05, alto, z - a + 0.05, x + a - 0.05, alto + 0.15, z + a - 0.05, C("#F2DFBD"));
  if (!farol) return;
  torno(o, Mat.Metal, x, alto + 0.15, z, [[0.12, 0], [0.08, 0.15], [0.16, 0.22]], HIERRO, 6);
  torno(o, Mat.Luz, x, alto + 0.35, z, [[0.16, 0], [0.27, 0.2], [0.3, 0.6], [0.24, 0.68]], C("#F5EEDC"), 6);
  torno(o, Mat.Metal, x, alto + 1.0, z, [[0.3, 0], [0.32, 0.06], [0.12, 0.2], [0.03, 0.36]], HIERRO, 6);
}

function verjaJardin(o: Obra, c: Ctx) {
  const solidos: P2[][] = [];
  for (const t of tramosRecinto()) {
    const mc = new Marco(t.a, t.b, t.dentro);
    const L = mc.usar(o, c);
    if (L < 0.3) continue;
    // Huecos de las puertas en este tramo.
    const cortes: [number, number, number][] = [];
    for (const pu of PUERTAS)
      for (const [q, w] of [[pu.p, pu.ancho], ...(pu.peatonal ? [[pu.peatonal, 1.3]] : [])] as [P2, number][]) {
        if (distSeg(q, t.a, t.b) > 1.5) continue;
        const ax = mc.g(0, 0);
        const ux = (mc.g(1, 0)[0] - ax[0]);
        const uy = (mc.g(1, 0)[1] - ax[1]);
        const s = (q[0] - ax[0]) * ux + (q[1] - ax[1]) * uy;
        cortes.push([s - w / 2 - 0.4, s + w / 2 + 0.4, w]);
      }
    cortes.sort((p, q) => p[0] - q[0]);
    let s0 = 0;
    const piezas: [number, number][] = [];
    for (const [a, b] of cortes) {
      if (a > s0) piezas.push([s0, Math.min(a, L)]);
      s0 = Math.max(s0, b);
    }
    if (s0 < L) piezas.push([s0, L]);
    for (const [a, b] of piezas) {
      if (b - a < 0.2) continue;
      solidos.push([mc.g(a, 0.1), mc.g(b, 0.1), mc.g(b, -0.45), mc.g(a, -0.45)]);
      if (t.tipo === "tapia") {
        o.caja(Mat.Muro, a, 0, -0.35, b, 2.4, 0, C("#F0E6CF"), 0.8);
        o.caja(Mat.Detalle, a, 2.4, -0.42, b, 2.52, 0.07, C("#DCCDAE"));
        continue;
      }
      o.caja(Mat.Muro, a, 0, -0.35, b, 0.85, 0, SALMON, 0.8);
      o.caja(Mat.Detalle, a, 0.85, -0.4, b, 0.93, 0.05, C("#E58A69"));
      verja(o, a, -0.17, b, -0.17, 0.93, 1.75, HIERRO, 0.15, 0.03);
      if (t.sur) {
        // Calle de abajo: pilares salmón con remate de pirámide y pérgola de trepadoras por dentro.
        const n = Math.max(1, Math.round((b - a) / 4.5));
        for (let k = 0; k <= n; k++) {
          const x = a + ((b - a) * k) / n;
          pilarPiramide(o, x, -0.17);
          pilarPiramide(o, x, -3.0);
        }
        o.caja(Mat.Detalle, a, 2.55, -3.1, b, 2.65, -0.1, C("#3F3A33"));
        for (let x = a + 0.3; x < b - 0.3; x += o.fino ? 0.9 : 2.5) {
          const r2 = 0.45 + ((x * 7.3) % 1) * 0.3;
          o.caja(Mat.Detalle, x - r2, 2.45, -2.9 + ((x * 3.1) % 1) * 0.6, x + r2, 3.1 + ((x * 5.7) % 1) * 0.3, -0.4 - ((x * 2.3) % 1) * 0.6, ((x * 11) % 1) < 0.2 ? C("#B8459A") : C("#55893A"));
        }
      } else {
        const n = Math.max(1, Math.round((b - a) / 2.6));
        for (let k = 0; k <= n; k++) {
          const x = a + ((b - a) * k) / n;
          o.caja(Mat.Metal, x - 0.06, 0.93, -0.23, x + 0.06, 2.75, -0.11, HIERRO);
          if (o.fino) jarron(o, x, 2.75, -0.17, 0.3, HIERRO, Mat.Metal);
        }
      }
      // Crestería de volutas sobre el pasamanos (de cerca).
      if (o.fino)
        for (let x = a + 0.5; x < b - 0.4; x += 1.3)
          prisma(o, Mat.Metal, [[x - 0.4, 2.68], [x - 0.15, 2.68], [x, 2.95], [x + 0.15, 2.68], [x + 0.4, 2.68], [x, 2.78]].map(([px, py]) => [px, py] as P2), -0.19, -0.15, HIERRO, false);
    }
    // Pilares de las puertas y hojas abiertas hacia dentro.
    for (const [a, b, w] of cortes) {
      if (t.tipo === "tapia") continue;
      for (const x of [a + 0.38, b - 0.38]) pilar(o, x, -0.2, w > 2 ? 3.1 : 2.8);
      const m = (a + b) / 2;
      if (o.fino) {
        verja(o, m - w / 2, -0.3, m - w / 2 + 0.3, -0.3 - w / 2, 0.05, 2.2, HIERRO, 0.13, 0.025);
        verja(o, m + w / 2, -0.3, m + w / 2 - 0.3, -0.3 - w / 2, 0.05, 2.2, HIERRO, 0.13, 0.025);
      }
    }
  }
  return solidos;
}

/** Caminos de albero con bordillo de hormigón; vial de servicio asfaltado junto al museo. */
function caminos(o: Obra, c: Ctx) {
  enMundo(o, c);
  for (const s of SENDAS) {
    const servicio = s.tipo === "service";
    const w = servicio ? 4.2 : s.id === "way/1155129653" || s.id === "way/1227798704" || s.id === "way/1227798708" ? 3.4 : 2.4;
    const col = servicio ? C("#5E6166") : ALBERO;
    const y = servicio ? 0.14 : 0.13;
    for (let i = 1; i < s.p.length; i++) {
      const a = s.p[i - 1];
      const b = s.p[i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.05) continue;
      const nx = (-(b[1] - a[1]) / L) * (w / 2);
      const ny = ((b[0] - a[0]) / L) * (w / 2);
      plano(o, Mat.Suelo, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], y, col, 0.6);
      if (o.fino && !servicio)
        for (const k of [1, -1]) {
          const ex = nx * k;
          const ey = ny * k;
          const fx = (nx / (w / 2)) * 0.12 * k;
          const fy = (ny / (w / 2)) * 0.12 * k;
          plano(o, Mat.Suelo, [[a[0] + ex, a[1] + ey], [b[0] + ex, b[1] + ey], [b[0] + ex + fx, b[1] + ey + fy], [a[0] + ex + fx, a[1] + ey + fy]], y + 0.04, C("#C9C5BC"));
        }
    }
    // Uniones redondeadas en los vértices.
    for (const q of s.p) {
      const pts: P2[] = [];
      for (let k = 0; k < 10; k++) pts.push([q[0] + Math.cos((k / 10) * Math.PI * 2) * (w / 2), q[1] + Math.sin((k / 10) * Math.PI * 2) * (w / 2)]);
      plano(o, Mat.Suelo, pts, y - 0.003, col, 0.6);
    }
  }
  // Explanada solada delante del museo (fotos: losas claras ante la escalinata).
  const lonja: P2[] = [museoP(-3, -7.5), museoP(ANCHO + 3, -7.5), museoP(ANCHO + 3, 0), museoP(-3, 0)];
  plano(o, Mat.Suelo, lonja, 0.15, C("#D6CFC1"), 0.5);
}

function farolaJardin(o: Obra, x: number, z: number) {
  torno(o, Mat.Metal, x, 0, z, [[0.22, 0], [0.2, 0.3], [0.12, 0.45], [0.09, 0.9], [0.065, 1.0], [0.06, 3.3], [0.1, 3.4], [0.07, 3.5]], HIERRO, 8);
  torno(o, Mat.Luz, x, 3.5, z, [[0.1, 0], [0.2, 0.12], [0.23, 0.5], [0.17, 0.58]], C("#F3E8C6"), 6);
  torno(o, Mat.Metal, x, 4.06, z, [[0.24, 0], [0.26, 0.06], [0.12, 0.2], [0.05, 0.3], [0.07, 0.34], [0.01, 0.42]], HIERRO, 6);
}

function banco(o: Obra, x: number, z: number, ang: number) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number): [number, number] => [x + u * ca - v * sa, z + u * sa + v * ca];
  for (const u of [-0.75, 0.75]) {
    const [px, pz] = P(u, 0);
    o.caja(Mat.Metal, px - 0.05, 0, pz - 0.05, px + 0.05, 0.45, pz + 0.05, HIERRO);
  }
  for (let k = 0; k < 4; k++) {
    const [a, b] = P(-0.95, -0.2 + k * 0.12);
    const [d, e] = P(0.95, -0.2 + k * 0.12);
    o.poli(Mat.Detalle, [[a, 0.45, b], [d, 0.45, e], [d, 0.45, e + 0.0001], [a, 0.45, b + 0.0001]], C("#7B5434"));
    o.caja(Mat.Detalle, Math.min(a, d), 0.42, Math.min(b, e) - 0.04, Math.max(a, d), 0.46, Math.max(b, e) + 0.04, C("#7B5434"));
  }
  const [a, b] = P(-0.95, -0.28);
  const [d, e] = P(0.95, -0.28);
  o.caja(Mat.Detalle, Math.min(a, d), 0.55, Math.min(b, e) - 0.03, Math.max(a, d), 0.95, Math.max(b, e) + 0.03, C("#7B5434"));
}

/** Monumento a la Inmaculada ante el museo: gradas, pedestal con lápidas y la imagen en mármol. */
function monumento(o: Obra, p: P2) {
  const [x, z] = p;
  const PIE = C("#E4DFD3");
  // Parterre de flores alrededor.
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const r = 3.0;
    const f = [C("#D8314A"), C("#F3C3D3"), C("#7B3E8E"), C("#F28C28")][k % 4];
    o.caja(Mat.Detalle, x + Math.cos(a) * r - 0.25, 0.1, z + Math.sin(a) * r - 0.25, x + Math.cos(a) * r + 0.25, 0.42, z + Math.sin(a) * r + 0.25, f);
  }
  for (let k = 0; k < 3; k++) {
    const s = 1.9 - k * 0.42;
    o.caja(Mat.Detalle, x - s, 0.1 + k * 0.28, z - s, x + s, 0.38 + k * 0.28, z + s, PIE, 0.9);
  }
  o.caja(Mat.Detalle, x - 0.62, 0.94, z - 0.62, x + 0.62, 3.7, z + 0.62, PIE);
  o.caja(Mat.Detalle, x - 0.75, 3.7, z - 0.75, x + 0.75, 3.95, z + 0.75, PIE);
  if (o.fino) for (const [dx, dz] of [[0, -0.63], [0, 0.63], [-0.63, 0], [0.63, 0]]) o.caja(Mat.Detalle, x + dx - (dz ? 0.42 : 0.01), 1.4, z + dz - (dx ? 0.42 : 0.01), x + dx + (dz ? 0.42 : 0.01), 3.1, z + dz + (dx ? 0.42 : 0.01), C("#D2CDBF"));
  torno(o, Mat.Detalle, x, 3.95, z, [[0.6, 0], [0.45, 0.3], [0.38, 0.55], [0.5, 0.75]], PIE, 10);
  // Imagen: manto con caída, manos juntas y cabeza (silueta por revolución).
  torno(o, Mat.Detalle, x, 4.7, z, [[0.48, 0], [0.44, 0.25], [0.32, 0.9], [0.26, 1.3], [0.2, 1.48], [0.13, 1.56], [0.14, 1.68], [0.12, 1.8], [0.02, 1.88]], MARMOL, 12);
}

function fuente(o: Obra, p: P2) {
  const [x, z] = p;
  const GRANITO = C("#C9937D");
  const disco = (r: number, y: number, col: RGB, m = Mat.Suelo) => {
    const pts: P2[] = [];
    for (let k = 0; k < 24; k++) pts.push([x + Math.cos((k / 24) * Math.PI * 2) * r, z + Math.sin((k / 24) * Math.PI * 2) * r]);
    plano(o, m, pts, y, col);
  };
  disco(3.6, 0.15, C("#A9A49B"));
  torno(o, Mat.Detalle, x, 0.15, z, [[2.25, 0], [2.3, 0.45], [2.25, 0.55], [2.0, 0.55], [2.0, 0.2]], GRANITO, 24);
  disco(2.0, 0.42, C("#7FA9B3"), Mat.Cristal);
  o.caja(Mat.Detalle, x - 0.4, 0.15, z - 0.4, x + 0.4, 2.9, z + 0.4, GRANITO);
  o.caja(Mat.Detalle, x - 0.44, 2.9, z - 0.44, x + 0.44, 3.05, z + 0.44, GRANITO);
  if (o.fino) for (const y of [1.05, 2.0]) o.caja(Mat.Detalle, x - 0.41, y, z - 0.41, x + 0.41, y + 0.03, z + 0.41, C("#B07F6A"));
  if (o.fino) o.caja(Mat.Detalle, x - 0.22, 1.35, z + 0.4, x + 0.22, 1.85, z + 0.44, C("#A5735F"));
}

function estatua(o: Obra, p: P2, busto = false) {
  const [x, z] = p;
  if (!busto) {
    o.caja(Mat.Detalle, x - 0.42, 0.1, z - 0.42, x + 0.42, 0.3, z + 0.42, C("#E5E0D4"));
    o.caja(Mat.Detalle, x - 0.32, 0.3, z - 0.32, x + 0.32, 1.3, z + 0.32, C("#EDE9DF"));
    o.caja(Mat.Detalle, x - 0.38, 1.3, z - 0.38, x + 0.38, 1.42, z + 0.38, C("#E5E0D4"));
  }
  if (busto) {
    // Luis Ramírez Galuzo: gradas, macizo de helechos y pedestal alto con el busto (fotos).
    o.caja(Mat.Detalle, x - 1.6, 0.1, z - 1.3, x + 1.6, 0.35, z + 1.3, C("#CFC8B8"));
    o.caja(Mat.Detalle, x - 1.3, 0.35, z - 1.0, x + 1.3, 0.55, z + 1.0, C("#D8D2C3"));
    o.caja(Mat.Detalle, x - 0.45, 0.55, z - 0.45, x + 0.45, 3.0, z + 0.45, C("#DCD5C5"));
    o.caja(Mat.Detalle, x - 0.5, 3.0, z - 0.5, x + 0.5, 3.12, z + 0.5, C("#D2CBBB"));
    torno(o, Mat.Detalle, x, 3.12, z, [[0.42, 0], [0.44, 0.3], [0.18, 0.45], [0.12, 0.52], [0.17, 0.6], [0.16, 0.82], [0.02, 0.9]], C("#CFC9BB"), 10);
    for (let k = 0; k < (o.fino ? 10 : 3); k++) {
      const a = (k / 10) * Math.PI * 2;
      o.caja(Mat.Detalle, x + Math.cos(a) * 0.85 - 0.3, 0.55, z + Math.sin(a) * 0.7 - 0.3, x + Math.cos(a) * 0.85 + 0.3, 1.2, z + Math.sin(a) * 0.7 + 0.3, C("#4F8C3A"));
    }
    return;
  }
  torno(o, Mat.Detalle, x, 1.42, z, [[0.24, 0], [0.2, 0.7], [0.24, 1.0], [0.26, 1.25], [0.14, 1.4], [0.09, 1.46], [0.12, 1.55], [0.1, 1.68], [0.02, 1.74]], MARMOL, 10);
}

/** Arcos metálicos con trepadoras sobre un tramo de camino (fotos). */
function arcos(o: Obra, c: Ctx, l: P2[], desde: number, hasta: number, cada: number) {
  let rec = 0;
  for (let i = 1; i < l.length; i++) {
    const a = l[i - 1];
    const b = l[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = Math.ceil((rec - desde) / cada) * cada + desde - rec; s < L; s += cada) {
      if (rec + s > hasta) return;
      if (rec + s < desde) continue;
      const q: P2 = [a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L];
      const n: P2 = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
      const mc = new Marco(suma(q, n, -1.6), suma(q, n, 1.6), suma(q, [(b[0] - a[0]) / L, (b[1] - a[1]) / L], 1));
      mc.usar(o, c);
      const ext: P2[] = [];
      const int: P2[] = [];
      for (let k = 0; k <= 16; k++) {
        const t = Math.PI - (k / 16) * Math.PI;
        ext.push([1.6 + Math.cos(t) * 1.6, 1.4 + Math.sin(t) * 1.6]);
        int.push([1.6 + Math.cos(t) * 1.5, 1.4 + Math.sin(t) * 1.5]);
      }
      const forma: P2[] = [[0, 0], [0.1, 0], [0.1, 1.4], ...int.slice(1, -1), [3.1, 1.4], [3.1, 0], [3.2, 0], [3.2, 1.4], ...[...ext].reverse().slice(1, -1), [0, 1.4]];
      prisma(o, Mat.Metal, forma, -0.05, 0.05, HIERRO, o.fino);
      const r = azar(Math.floor(q[0] * 7 + q[1]));
      const n2 = o.fino ? 14 : 5;
      for (let k = 0; k < n2; k++) {
        const t = r() * Math.PI;
        const h = r() < 0.4 ? r() * 1.3 : 0;
        const px = h ? (r() < 0.5 ? 0.05 : 3.15) : 1.6 + Math.cos(t) * 1.55;
        const py = h ? h : 1.4 + Math.sin(t) * 1.55;
        const s2 = 0.22 + r() * 0.18;
        o.caja(Mat.Detalle, px - s2, py - s2, -s2, px + s2, py + s2, s2, r() < 0.5 ? C("#4C7F35") : C("#5E9440"));
      }
    }
    rec += L;
  }
}

/**
 * Sociedad Musical Linense (1930): castillito blanco de recreo, con torreones redondos de
 * almenas, arquería ciega lobulada en gris azulado, contrafuertes y una gruta de rocalla (fotos).
 */
function sociedad(o: Obra, c: Ctx) {
  const AZ = C("#66778A");
  const BL = C("#F2EFE6");
  const h = 4.2;
  for (let i = 0; i < SOCIEDAD.length; i++) {
    const mc = new Marco(SOCIEDAD[i], SOCIEDAD[(i + 1) % SOCIEDAD.length], interiorArista(SOCIEDAD, i));
    const L = mc.usar(o, c);
    muro(o, 0, L, 0, h, BL, Mat.Muro, 0.8);
    o.caja(Mat.Detalle, -0.03, 0, 0, L + 0.03, 0.12, 0.06, C("#D9D6CE"));
    moldura(o, -0.05, L + 0.05, 1.45, 1.6, 0.08, AZ);
    moldura(o, -0.05, L + 0.05, h - 0.25, h - 0.1, 0.1, AZ);
    // Almenas escalonadas sobre el pretil.
    o.caja(Mat.Muro, 0, h, -0.3, L, h + 0.35, 0.02, BL);
    for (let x = 0.2; x < L - 0.4; x += 1.0) o.caja(Mat.Muro, x, h + 0.35, -0.3, x + 0.5, h + 0.8, 0.02, BL);
    if (L < 2.5) continue;
    // Arquería ciega: arcos apuntados con lóbulos sobre pilarcillos.
    const n = Math.max(2, Math.round(L / 1.15));
    for (let k = 0; k < n; k++) {
      const x0 = (L * k) / n + 0.1;
      const x1 = (L * (k + 1)) / n - 0.1;
      // Arco apuntado: dos arcos de radio 0,75·luz que se cortan en la clave.
      const w = x1 - x0;
      const R = 0.75 * w;
      const a0 = Math.acos(-1 / 3);
      const cur: P2[] = [[x0, 1.6], [x0, 2.9]];
      for (let s2 = 1; s2 <= 6; s2++) {
        const a = Math.PI - ((Math.PI - a0) * s2) / 6;
        cur.push([x0 + R + Math.cos(a) * R, 2.9 + Math.sin(a) * R]);
      }
      for (let s2 = 5; s2 >= 0; s2--) {
        const a = Math.PI - ((Math.PI - a0) * s2) / 6;
        cur.push([x1 - R - Math.cos(a) * R, 2.9 + Math.sin(a) * R]);
      }
      cur.push([x1, 1.6]);
      tira(o, Mat.Detalle, cur, 0.09, 0, 0.03, AZ);
    }
    // Lado largo: contrafuertes inclinados, ventanales y la puerta de reja (fotos).
    if (L > 8) {
      for (const f of [0.38, 0.58, 0.78]) {
        const x = L * f;
        o.caja(Mat.Detalle, x - 0.35, 0, 0, x + 0.35, 1.0, 0.75, AZ);
        o.poli(Mat.Detalle, [[x - 0.35, 1.0, 0.75], [x + 0.35, 1.0, 0.75], [x + 0.35, 1.6, 0], [x - 0.35, 1.6, 0]], AZ);
      }
      o.caja(Mat.Detalle, L * 0.48 - 0.45, 0, 0.02, L * 0.48 + 0.45, 1.5, 0.06, C("#2B2F33"));
      o.caja(Mat.Detalle, L * 0.12, 0.6, 0.02, L * 0.12 + 2.0, 1.45, 0.06, C("#2B2F33"));
    }
  }
  enMundo(o, c);
  plano(o, Mat.Muro, SOCIEDAD, h, C("#D9D4C8"));
  // Solería clara alrededor del pabellón.
  const cen: P2 = [SOCIEDAD.reduce((a, q) => a + q[0], 0) / SOCIEDAD.length, SOCIEDAD.reduce((a, q) => a + q[1], 0) / SOCIEDAD.length];
  plano(o, Mat.Suelo, SOCIEDAD.map((q) => [cen[0] + (q[0] - cen[0]) * 1.55, cen[1] + (q[1] - cen[1]) * 1.55] as P2), 0.14, C("#E3DED3"), 0.5);
  // Tres torreones de almenas con la banda de dientes gris azulada.
  for (const k of [3, 4, 5]) {
    const [tx, tz] = SOCIEDAD[k];
    const R = 0.85;
    o.cilindro(Mat.Muro, tx, 0, tz, R, h + 1.9, BL, 14);
    o.cilindro(Mat.Detalle, tx, 0, tz, R + 0.06, 0.9, AZ, 14, false);
    o.cilindro(Mat.Muro, tx, h + 1.2, tz, R + 0.15, 0.7, BL, 14);
    o.cilindro(Mat.Detalle, tx, h + 1.2, tz, R + 0.17, 0.3, AZ, 14, false);
    for (let m = 0; m < 7; m++) {
      const a = (m / 7) * Math.PI * 2;
      const mx = tx + Math.cos(a) * (R + 0.02);
      const mz = tz + Math.sin(a) * (R + 0.02);
      o.caja(Mat.Detalle, mx - 0.18, h + 1.9, mz - 0.18, mx + 0.18, h + 2.35, mz + 0.18, AZ);
    }
  }
  // Gruta de rocalla adosada a un extremo, con terraza y barandilla encima.
  const [gx, gz] = SOCIEDAD[0];
  const roca = azar(5);
  for (let k = 0; k < (o.fino ? 26 : 8); k++) {
    const a = roca() * Math.PI;
    const rr = 1.2 + roca() * 0.9;
    const s3 = 0.35 + roca() * 0.35;
    const px = gx + Math.cos(a + 2.4) * rr;
    const pz = gz + Math.sin(a + 2.4) * rr;
    o.caja(Mat.Detalle, px - s3, roca() * 2.4, pz - s3, px + s3, roca() * 2.4 + s3 * 1.6, pz + s3, roca() < 0.5 ? C("#5C4A3C") : C("#6E5A48"));
  }
}

/** Glorieta de hierro con tejado de pagoda, sobre una rocalla entre dos estanques (fotos). */
function glorieta(o: Obra, p: P2) {
  const [x, z] = p;
  const AGUA = C("#8FC9CF");
  const r = azar(77);
  for (const dx of [-5.2, 5.2]) {
    const pts: P2[] = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      pts.push([x + dx + Math.cos(a) * 3.4 * (0.9 + r() * 0.2), z + Math.sin(a) * 2.6 * (0.9 + r() * 0.2)]);
    }
    plano(o, Mat.Cristal, pts, 0.2, AGUA);
    for (const q of pts) {
      const s2 = 0.3 + r() * 0.25;
      o.caja(Mat.Detalle, q[0] - s2, 0, q[1] - s2, q[0] + s2, 0.35 + r() * 0.3, q[1] + s2, r() < 0.5 ? C("#C9B79A") : C("#B4A285"));
    }
    if (o.fino) torno(o, Mat.Cristal, x + dx, 0.2, z, [[0.12, 0], [0.05, 1.4], [0.15, 1.6], [0.02, 1.7]], C("#DDF0F2"), 6);
  }
  // Rocalla y escalones de lajas.
  o.caja(Mat.Suelo, x - 2.2, 0, z - 2.2, x + 2.2, 0.55, z + 2.2, C("#CDBFA8"));
  for (let k = 0; k < 3; k++) o.caja(Mat.Suelo, x - 1.2, 0, z + 2.2 + k * 0.6, x + 1.2, 0.55 - (k + 1) * 0.15, z + 2.8 + k * 0.6, C("#D8C9B0"));
  for (let k = 0; k < (o.fino ? 14 : 5); k++) {
    const a = r() * Math.PI * 2;
    const s2 = 0.25 + r() * 0.3;
    o.caja(Mat.Detalle, x + Math.cos(a) * 2.3 - s2, 0.3, z + Math.sin(a) * 2.3 - s2, x + Math.cos(a) * 2.3 + s2, 0.8 + r() * 0.9, z + Math.sin(a) * 2.3 + s2, C("#B9A88C"));
  }
  // Ocho columnillas, friso calado y cubierta de pagoda con pináculo.
  const R = 1.6;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    torno(o, Mat.Metal, x + Math.cos(a) * R, 0.55, z + Math.sin(a) * R, [[0.12, 0], [0.07, 0.2], [0.06, 2.4], [0.11, 2.6]], HIERRO, 6);
  }
  torno(o, Mat.Metal, x, 3.1, z, [[R + 0.15, 0], [R + 0.15, 0.4], [R + 0.45, 0.45], [R - 0.2, 0.9], [0.9, 1.5], [0.35, 2.3], [0.12, 2.9], [0.05, 3.3], [0.01, 3.6]], C("#2A2F33"), 8);
}

/** Pilar de la verja de la calle de abajo: salmón con remate piramidal ocre (fotos). */
function pilarPiramide(o: Obra, x: number, z: number, alto = 2.7) {
  o.caja(Mat.Muro, x - 0.25, 0, z - 0.25, x + 0.25, alto, z + 0.25, SALMON, 0.85);
  o.caja(Mat.Detalle, x - 0.3, alto, z - 0.3, x + 0.3, alto + 0.1, z + 0.3, C("#E8B653"));
  torno(o, Mat.Detalle, x, alto + 0.1, z, [[0.42, 0], [0.01, 0.5]], C("#E3AE4A"), 4);
}

/** Escenario elevado de muro salmón con escalera y barandilla (fotos). */
function escenario(o: Obra, c: Ctx, a: P2, b: P2, dentro: P2) {
  const mc = new Marco(a, b, dentro);
  const L = mc.usar(o, c);
  o.caja(Mat.Muro, 0, 0, -6, L, 1.35, 0, SALMON, 0.85);
  o.caja(Mat.Suelo, -0.05, 1.35, -6.05, L + 0.05, 1.45, 0.05, C("#EDE6D6"));
  for (let k = 0; k < 7; k++) o.caja(Mat.Suelo, L, 0, -0.2 - (k + 1) * 0.0, L + 2.2 - k * 0.3, 1.45 - k * 0.2, -2.0, C("#E8E1D2"));
  if (o.fino) {
    verja(o, 0, 0, L, 0, 1.45, 1.0, HIERRO, 0.14, 0.02);
    verja(o, 0, 0, 0, -6, 1.45, 1.0, HIERRO, 0.14, 0.02);
    verja(o, L, -2.0, L + 2.2, -2.0, 0.2, 1.0, HIERRO, 0.14, 0.02);
  }
}

/** Glorieta y estanques: al norte del jardín, junto al colegio (vista aérea; posición aproximada). */
const GLORIETA: P2 = [2172, 4408];
/** Escenario adosado a la tapia del colegio (fotos; posición aproximada). */
const ESCENARIO: [P2, P2] = (() => {
  const a = PARQUE[3];
  const b = PARQUE[4];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: P2 = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  return [suma(a, u, 6), suma(a, u, 16)];
})();

/* ── Colegio Providencia del Sagrado Corazón ───────────────────────── */

const ROJO = C("#A3352A");
const CREMA_COL = C("#EBD8AE");
/** Dirección de la Av. de España en la fachada del colegio y normal hacia dentro. */
const E_DIR: P2 = (() => {
  const a = COLEGIO[23];
  const b = COLEGIO[24];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
})();
const N_IN: P2 = [-E_DIR[1], E_DIR[0]];
const T1 = suma(COLEGIO[23], E_DIR, 3.4);
const S1 = suma(T1, N_IN, 3.0);
const S2 = suma(COLEGIO[24], N_IN, 3.0);
const Q_TORRE = suma(T1, N_IN, 5.6);
/** Torreón ochavado de la esquina (puerta nº 9). */
const TORREON: P2[] = [COLEGIO[17], COLEGIO[18], COLEGIO[19], COLEGIO[20], COLEGIO[21], COLEGIO[22], COLEGIO[23], T1, Q_TORRE];
/** Cuerpo principal: la huella con la fachada de Av. de España retranqueada tras su tapia. */
const CUERPO_COL: P2[] = [...COLEGIO.slice(0, 18), Q_TORRE, S1, S2];
const H_COL = 7.6;
const H_TORRE = 11.4;

function fachadaRoja(o: Obra, L: number, alto: number, pisos: number[], conHuecos = true, puerta = -1) {
  muro(o, 0, L, 0, alto, ROJO, Mat.Muro, 0.8, 0.02);
  o.caja(Mat.Detalle, -0.02, 0, 0.02, L + 0.02, 0.5, 0.08, C("#6E201A"));
  // Esquinas con sillares crema alternos (en las caras cortas del ochavo, solo una banda).
  for (const [xe, s] of (L < 2.2 ? [[0, 1]] : [[0, 1], [L, -1]]) as [number, number][]) {
    let k = 0;
    for (let y = 0.5; y < alto - 0.4; y += 0.4, k++) {
      const w = k % 2 ? 0.3 : 0.55;
      o.caja(Mat.Detalle, Math.min(xe, xe + s * w), y + 0.03, 0.02, Math.max(xe, xe + s * w), y + 0.37, 0.09, CREMA_COL, 1, "z-");
    }
  }
  for (const y of pisos.slice(1)) moldura(o, 0, L, y - 0.3, y - 0.08, 0.1, CREMA_COL, 0.02);
  // Cornisa con crestería de almenillas escalonadas.
  moldura(o, -0.1, L + 0.1, alto - 0.35, alto, 0.22, CREMA_COL, 0.02);
  if (o.fino) for (let x = 0.15; x < L - 0.2; x += 0.42) o.caja(Mat.Detalle, x, alto, -0.1, x + 0.22, alto + 0.28, 0.12, CREMA_COL);
  else o.caja(Mat.Detalle, 0, alto, -0.1, L, alto + 0.2, 0.1, CREMA_COL);
  if (!conHuecos || L < 2.2) return;
  const n = Math.max(1, Math.floor((L - 0.8) / 2.5));
  for (let k = 0; k < n; k++) {
    const x = 0.4 + ((k + 0.5) * (L - 0.8)) / n;
    pisos.forEach((y0, p) => {
      if (p === 0 && k === puerta) {
        o.caja(Mat.Detalle, x - 0.85, 0, 0.02, x + 0.85, 2.75, 0.12, CREMA_COL);
        o.caja(Mat.Detalle, x - 0.6, 0, 0.12, x + 0.6, 2.45, 0.15, C("#6B4A2E"));
        prisma(o, Mat.Metal, [[x - 0.95, 2.9], [x + 0.95, 2.9], [x, 3.35]], 0.05, 0.35, HIERRO);
        return;
      }
      ventana(o, x, y0 + 0.9, 1.0, 1.75, { marco: C("#EFEDE6"), recercado: CREMA_COL, recercadoAncho: 0.24, persiana: C("#F2F0EA"), bajada: 0.35 });
      if (p > 0) prisma(o, Mat.Metal, [[x - 0.75, y0 + 2.95], [x + 0.75, y0 + 2.95], [x, y0 + 3.3]], 0.03, 0.3, HIERRO);
    });
  }
}

function colegio(o: Obra, c: Ctx) {
  // Cuerpo principal.
  const nC = CUERPO_COL.length;
  for (let i = 0; i < nC; i++) {
    const a = CUERPO_COL[i];
    const b = CUERPO_COL[(i + 1) % nC];
    const mc = new Marco(a, b, interiorArista(CUERPO_COL, i));
    const L = mc.usar(o, c);
    if (L < 0.2) continue;
    const calle = i >= 3 && i <= 16;
    if (calle) {
      fachadaRoja(o, L, H_COL, [0, 3.8]);
      continue;
    }
    const crema = i === nC - 1 ? C("#E7C98E") : C("#EDE0C2");
    muro(o, 0, L, 0, H_COL, crema, Mat.Muro, 0.8);
    o.caja(Mat.Detalle, -0.02, 0, 0, L + 0.02, 0.45, 0.06, C("#CDB894"));
    moldura(o, -0.1, L + 0.1, H_COL - 0.4, H_COL - 0.1, 0.18, C("#F4EBD6"));
    o.caja(Mat.Muro, -0.05, H_COL - 0.1, -0.25, L + 0.05, H_COL + 0.5, 0.02, crema);
    if (i === nC - 1 && o.fino) for (let y = 0.9; y < 3.6; y += 0.45) o.caja(Mat.Detalle, 0, y, 0, L, y + 0.03, 0.03, C("#CDAE76"));
    if (i === nC - 1) moldura(o, 0, L, 3.65, 3.9, 0.12, C("#F4EBD6"));
    if (L < 3 || i === nC - 3 || i === nC - 4) continue;
    const n = Math.max(1, Math.floor((L - 1) / 2.8));
    for (let k = 0; k < n; k++) {
      const x = 0.5 + ((k + 0.5) * (L - 1)) / n;
      for (const y of [1.1, 4.7]) {
        ventana(o, x, y, 1.15, 1.35, { marco: C("#EFEDE6"), recercado: C("#F4EBD6"), recercadoAncho: 0.14, persiana: C("#F4F2EC"), bajada: 0.4 });
        if (y < 2 && i === nC - 1) reja(o, x, y, 1.15, 1.35, 0.1, HIERRO);
      }
    }
  }
  enMundo(o, c);
  plano(o, Mat.Muro, CUERPO_COL, H_COL, C("#C9C3B6"));
  // Tejados de teja sobre las dos crujías de la calle (vista aérea).
  for (const [a, b] of [[COLEGIO[8], COLEGIO[15]], [COLEGIO[3], COLEGIO[8]]] as [P2, P2][]) {
    const mc = new Marco(a, b, interiorArista(COLEGIO, 10));
    const L = mc.usar(o, c);
    o.tejado(0.3, L - 0.3, -8.2, 0.4, H_COL + 0.05, 2.1, C("#B5503A"), ROJO, true);
  }
  // Torreón.
  for (let i = 0; i < TORREON.length; i++) {
    const a = TORREON[i];
    const b = TORREON[(i + 1) % TORREON.length];
    const mc = new Marco(a, b, interiorArista(TORREON, i));
    const L = mc.usar(o, c);
    if (L < 0.3) continue;
    const frente = i === 4;
    fachadaRoja(o, L, H_TORRE, [0, 3.8, 7.3], i >= 2 && i <= 6, frente ? 0 : -1);
    if (o.fino && i >= 2 && i <= 6 && L > 2.5)
      for (let k = 0; k < 4; k++) o.caja(Mat.Detalle, L / 2 - 0.55 + k * 0.32, H_TORRE - 1.45, 0.02, L / 2 - 0.4 + k * 0.32, H_TORRE - 0.85, 0.05, C("#2A1A16"));
    if (frente) o.caja(Mat.Detalle, L / 2 - 0.85, 3.25, 0.09, L / 2 + 0.85, 3.65, 0.12, C("#6E201A"));
  }
  enMundo(o, c);
  plano(o, Mat.Muro, TORREON, H_TORRE, C("#BDB3A2"));
  // Tapia roja con pilares crema a la Av. de España y el patio de entrada detrás.
  const tm = new Marco(T1, COLEGIO[24], suma(T1, N_IN, 2));
  const LT = tm.usar(o, c);
  o.caja(Mat.Muro, 0, 0, -0.3, LT, 2.3, 0, ROJO, 0.8);
  o.caja(Mat.Detalle, 0, 2.3, -0.35, LT, 2.42, 0.05, CREMA_COL);
  const np = Math.max(1, Math.round(LT / 3.3));
  for (let k = 0; k <= np; k++) {
    const x = Math.min(LT - 0.3, Math.max(0.3, (LT * k) / np));
    o.caja(Mat.Detalle, x - 0.3, 0, -0.38, x + 0.3, 2.65, 0.08, CREMA_COL);
    o.caja(Mat.Detalle, x - 0.36, 2.65, -0.44, x + 0.36, 2.8, 0.14, CREMA_COL);
  }
  enMundo(o, c);
  plano(o, Mat.Suelo, [T1, COLEGIO[24], S2, S1], 0.14, C("#B9B4AA"));
}

/* ── Arbolado ───────────────────────────────────────────────────────── */

export interface ArbolSector {
  p: P2;
  e: Especie;
  esc: number;
}

let cacheArboles: ArbolSector[] | null = null;
/**
 * Arbolado de los jardines según las fotos: araucarias muy altas (sobre todo junto a la
 * Av. de España), ficus y plátanos de copa grande en el centro y poniente, palmeras,
 * dragos y yucas, y arbustos en los parterres. Las posiciones evitan caminos y edificios.
 */
export function arbolesSaccone(): ArbolSector[] {
  if (cacheArboles) return cacheArboles;
  const r = azar(4711);
  const res: ArbolSector[] = [];
  const norte: P2[] = [PARQUE[38], PARQUE[37]];
  const libre = (p: P2, sep: number) => {
    if (!dentroPoli(p, PARQUE)) return false;
    for (let i = 0; i < PARQUE.length; i++) if (distSeg(p, PARQUE[i], PARQUE[(i + 1) % PARQUE.length]) < 2.2) return false;
    for (const s of SENDAS) if (distLinea(p, s.p) < (s.tipo === "service" ? 3.4 : 2.4)) return false;
    if (dentroPoli(p, SOCIEDAD) || distLinea(p, [...SOCIEDAD, SOCIEDAD[0]]) < 2) return false;
    const lonja: P2[] = [museoP(-4, -9), museoP(ANCHO + 4, -9), museoP(ANCHO + 4, 0.5), museoP(-4, 0.5)];
    if (dentroPoli(p, lonja)) return false;
    for (const q of PUNTOS) if (Math.hypot(p[0] - q.p[0], p[1] - q.p[1]) < (q.nombre.startsWith("Fuente") ? 5 : 3.5)) return false;
    if (Math.hypot(p[0] - GLORIETA[0], p[1] - GLORIETA[1]) < 10) return false;
    if (distSeg(p, ESCENARIO[0], ESCENARIO[1]) < 8.5) return false;
    for (const a of res) if (Math.hypot(p[0] - a.p[0], p[1] - a.p[1]) < sep) return false;
    return true;
  };
  for (let y = 4392; y < 4486; y += 5.2)
    for (let x = 2134; x < 2306; x += 5.2) {
      const p: P2 = [x + (r() - 0.5) * 3.4, y + (r() - 0.5) * 3.4];
      const t = r();
      const dn = distSeg(p, norte[0], norte[1]);
      let e: Especie;
      let sep: number;
      let esc = 1;
      if ((dn < 15 && t < 0.42) || t < 0.12) {
        e = Especie.Araucaria;
        sep = 7.5;
        esc = 0.95 + r() * 0.2;
      } else if (p[0] < 2225 && t < 0.62) {
        e = r() < 0.65 ? Especie.Ficus : Especie.Sombra;
        sep = 8.5;
        esc = 1.05 + r() * 0.3;
      } else if (t < 0.72) {
        e = Especie.Sombra;
        sep = 8;
        esc = 1.1 + r() * 0.25;
      } else if (t < 0.82) {
        e = Especie.Palmera;
        sep = 5;
        esc = 0.7 + r() * 0.25;
      } else if (t < 0.92) {
        e = Especie.Drago;
        sep = 4;
        esc = 0.9 + r() * 0.3;
      } else {
        e = Especie.Arbusto;
        sep = 3;
        esc = 0.9 + r() * 0.5;
      }
      if (libre(p, sep)) res.push({ p, e, esc });
    }
  // Palmeras y dragos flanqueando el museo y el monumento (fotos).
  for (const [x, d, e] of [[-2.2, -3.5, Especie.Palmera], [ANCHO + 2.2, -3.5, Especie.Palmera], [-2.8, -10, Especie.Drago], [ANCHO + 2.8, -10, Especie.Drago]] as [number, number, Especie][])
    res.push({ p: museoP(x, d), e, esc: e === Especie.Palmera ? 0.85 : 1.1 });
  cacheArboles = res;
  return res;
}

/* ── Pavos reales ─────────────────────────────────────────────────── */

/** ¿Puede pisar un pavo este punto? Dentro del recinto, lejos de la verja, edificios y agua. */
export function libreJardin(p: P2) {
  if (!dentroPoli(p, PARQUE)) return false;
  for (let i = 0; i < PARQUE.length; i++) if (distSeg(p, PARQUE[i], PARQUE[(i + 1) % PARQUE.length]) < 1.2) return false;
  if (dentroPoli(p, MUSEO) || dentroPoli(p, SOCIEDAD)) return false;
  if (distLinea(p, [...SOCIEDAD, SOCIEDAD[0]]) < 1.5) return false;
  if (Math.hypot(p[0] - GLORIETA[0], p[1] - GLORIETA[1]) < 9.5) return false;
  if (distSeg(p, ESCENARIO[0], ESCENARIO[1]) < 7) return false;
  for (const q of PUNTOS) if (Math.hypot(p[0] - q.p[0], p[1] - q.p[1]) < (q.nombre.startsWith("Fuente") ? 4 : 2.5)) return false;
  return true;
}

/** Punto al azar del jardín (preferentemente junto a un camino, donde se les ve pasear). */
export function destinoJardin(r: () => number): P2 {
  for (let k = 0; k < 40; k++) {
    const s = SENDAS[Math.floor(r() * SENDAS.length)];
    const q = s.p[Math.floor(r() * s.p.length)];
    const p: P2 = [q[0] + (r() - 0.5) * 8, q[1] + (r() - 0.5) * 8];
    if (libreJardin(p)) return p;
  }
  return [2240, 4440];
}

/* ── Conjunto ───────────────────────────────────────────────────────── */

let cacheSolidos: P2[][] | null = null;

/** Huellas sólidas del sector (colisiones y validador). */
export function solidosSaccone(): P2[][] {
  if (cacheSolidos) return cacheSolidos;
  const o = new Obra();
  o.fino = false;
  const verjas = verjaJardin(o, { cx: 0, cy: 0, suelo: 0 });
  const mon = PUNTOS.find((q) => q.nombre === "Inmaculada Concepción")!.p;
  const fu = PUNTOS.find((q) => q.nombre.startsWith("Fuente"))!.p;
  const cuadro = (p: P2, s: number): P2[] => [[p[0] - s, p[1] - s], [p[0] + s, p[1] - s], [p[0] + s, p[1] + s], [p[0] - s, p[1] + s]];
  cacheSolidos = [MUSEO, SOCIEDAD, COLEGIO, cuadro(mon, 1.9), cuadro(fu, 2.0), ...verjas];
  return cacheSolidos;
}

export function construirSaccone(c: Ctx, fino: boolean) {
  const o = new Obra();
  o.fino = fino;
  caminos(o, c);
  museo(o, c);
  verjaJardin(o, c);
  sociedad(o, c);
  colegio(o, c);
  enMundo(o, c);
  for (const q of PUNTOS) {
    if (q.nombre === "Inmaculada Concepción") monumento(o, q.p);
    else if (q.nombre.startsWith("Fuente")) fuente(o, q.p);
    else if (q.tipo === "artwork") estatua(o, q.p, q.nombre === "Luis Ramírez");
    else if (q.tipo === "bench") banco(o, q.p[0], q.p[1], 0.3);
  }
  // Estatuas clásicas junto al paseo solado del museo (fotos; posición aproximada).
  for (const [x, d] of [[-4.2, -6.5], [ANCHO + 4.2, -6.5]] as const) estatua(o, museoP(x, d));
  // Farolas y bancos a lo largo de los caminos principales.
  const r = azar(99);
  for (const s of SENDAS) {
    if (s.tipo === "service") continue;
    let rec = 0;
    let sig = 6;
    for (let i = 1; i < s.p.length; i++) {
      const a = s.p[i - 1];
      const b = s.p[i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (sig < rec + L) {
        const t = (sig - rec) / L;
        const n: P2 = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
        const q: P2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const lado = r() < 0.5 ? 1 : -1;
        const fp = suma(q, n, lado * 2.0);
        if (dentroPoli(fp, PARQUE)) farolaJardin(o, fp[0], fp[1]);
        const bp = suma(q, n, -lado * 2.3);
        if (r() < 0.5 && dentroPoli(bp, PARQUE)) banco(o, bp[0], bp[1], Math.atan2(b[1] - a[1], b[0] - a[0]));
        sig += 17 + r() * 5;
      }
      rec += L;
    }
  }
  glorieta(o, GLORIETA);
  escenario(o, c, ESCENARIO[0], ESCENARIO[1], interiorArista(PARQUE, 3));
  // Paseo de los arcos de trepadoras (fotos).
  const rocking = SENDAS.find((s) => s.id === "way/1227798704");
  if (rocking) arcos(o, c, rocking.p, 8, 40, 4.5);
  return o;
}

/** Centro aproximado del sector (para el LOD). */
export const CENTRO_SACCONE: P2 = [2215, 4435];
