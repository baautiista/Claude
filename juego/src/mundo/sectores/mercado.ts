import { Mat, Obra, rgb, type RGB } from "../arquitectura";
import { Marco, enMundo, prisma, plano, arco, moldura, ventana, type Ctx, type P2 } from "./piezas";

/**
 * MERCADO · Mercado de Abastos La Concepción («La Plaza»), Calle Isabel la Católica.
 *
 * Huella: OpenStreetMap (© colaboradores de OSM, ODbL), `way/270300913`: rectángulo de
 * 51,1 × 52,1 m entre Isabel la Católica (sur), Calle de las Flores (este), Calle Aurora (norte)
 * y Álvarez Quintero (oeste).
 * Aspecto: fotos aportadas por el usuario (fachada de Isabel la Católica y nave interior en obras),
 * solo como referencia visual; el render del proyecto EDUSI se usa únicamente para entender el
 * volumen (piñón escalonado del testero y huecos verticales de los laterales), no su acabado.
 * Se puede entrar por los dos portones: la nave central tiene arquerías de dos pisos y cubierta
 * acristalada a dos aguas sobre cerchas negras. Alturas estimadas. Ver city-reconstruction/reports/MERCADO.md.
 */

const C = rgb;
const BLANCO = C("#F7F6F2");
const GRIS_ZOCALO = C("#B9B6AE");
const NEGRO = C("#22252A");
const LADRILLO = C("#B88A66");
const PIEDRA = C("#B9A27C");

/** Esquina suroeste y ejes del rectángulo (u: a lo largo de Isabel la Católica; v: hacia el norte). */
const SO: P2 = [2295.2, 4171.7];
const SE: P2 = [2346.3, 4174.7];
const ANCHO = Math.hypot(SE[0] - SO[0], SE[1] - SO[1]);
const U: P2 = [(SE[0] - SO[0]) / ANCHO, (SE[1] - SO[1]) / ANCHO];
const V: P2 = [U[1], -U[0]];
const FONDO = 52.1;
const H = 9.0;
/** Nave central (20 m) entre las dos crujías laterales. */
const N0 = (ANCHO - 20) / 2;
const N1 = N0 + 20;
const H_CUMBRE = 14.2;
const ESP = 0.4;

/** Punto del mapa a `s` m de la esquina suroeste a lo largo de la fachada y `d` m hacia el norte. */
export const mp = (s: number, d: number): P2 => [SO[0] + U[0] * s + V[0] * d, SO[1] + U[1] * s + V[1] * d];
export const CENTRO_MERCADO: P2 = mp(ANCHO / 2, FONDO / 2);
/** Portones de la fachada principal (centros en s) y su luz. */
const PORTONES = [N0 + 2.5, N1 - 2.5];
const LUZ = 2.4;

/** Marco de la fachada sur con x = s y +z hacia la calle. */
function marcoSur(o: Obra, c: Ctx, d = 0) {
  const a = mp(0, d);
  o.marco(a[0] - c.cx, c.suelo, a[1] - c.cy, Math.atan2(U[1], U[0]));
  // En este marco +z apunta al sur (fuera); se usan z negativos hacia dentro.
}

/** Paño con huecos en arco (portones): piezas de prisma entre z0 y z1. */
function panoConPortones(o: Obra, x0: number, x1: number, alto: number, z0: number, z1: number, col: RGB) {
  let s0 = x0;
  for (const p of PORTONES) {
    const a = p - LUZ / 2;
    const b = p + LUZ / 2;
    if (a > s0) prisma(o, Mat.Muro, [[s0, 0], [a, 0], [a, alto], [s0, alto]], z0, z1, col);
    // Tímpano sobre el portón: rectángulo con el arco recortado.
    const pts: P2[] = [[a, alto], [a, 2.4]];
    for (let k = 1; k < 10; k++) {
      const t = Math.PI - (k / 10) * Math.PI;
      pts.push([p + Math.cos(t) * (LUZ / 2), 2.4 + Math.sin(t) * (LUZ / 2)]);
    }
    pts.push([b, 2.4], [b, alto]);
    prisma(o, Mat.Muro, pts, z0, z1, col);
    s0 = b;
  }
  if (s0 < x1) prisma(o, Mat.Muro, [[s0, 0], [x1, 0], [x1, alto], [s0, alto]], z0, z1, col);
}

/** Piñón escalonado del testero de la nave (render del proyecto y logotipo del mercado). */
function pinon(): P2[] {
  return [[N0, H], [N1, H], [N1, H + 0.6], [N1 - 2.2, H + 0.6], [N1 - 2.2, H + 1.6], [N1 - 4.4, H + 1.6], [N1 - 4.4, H + 2.7], [N1 - 6.6, H + 2.7], [N1 - 6.6, H + 3.9], [N0 + 6.6, H + 3.9], [N0 + 6.6, H + 2.7], [N0 + 4.4, H + 2.7], [N0 + 4.4, H + 1.6], [N0 + 2.2, H + 1.6], [N0 + 2.2, H + 0.6], [N0, H + 0.6]];
}

function anclaX(o: Obra, x: number, y: number) {
  o.poli(Mat.Metal, [[x - 0.2, y - 0.17, 0.05], [x - 0.14, y - 0.2, 0.05], [x + 0.2, y + 0.17, 0.05], [x + 0.14, y + 0.2, 0.05]], NEGRO);
  o.poli(Mat.Metal, [[x + 0.14, y - 0.2, 0.05], [x + 0.2, y - 0.17, 0.05], [x - 0.14, y + 0.2, 0.05], [x - 0.2, y + 0.17, 0.05]], NEGRO);
}

/** Fachada principal a Isabel la Católica. */
function fachadaSur(o: Obra, c: Ctx) {
  marcoSur(o, c);
  panoConPortones(o, 0, ANCHO, H, -ESP, 0, BLANCO);
  prisma(o, Mat.Muro, pinon(), -ESP, 0, BLANCO);
  o.caja(Mat.Detalle, -0.02, 0, 0, ANCHO + 0.02, 0.35, 0.05, GRIS_ZOCALO, 0.8, "z-");
  // Cuerpo central: pilastras, imposta, cornisa, ventanas con cuarterones y el rótulo de azulejo.
  for (const x of [N0 + 0.3, N0 + 5.0, N1 - 5.0, N1 - 0.3]) o.caja(Mat.Detalle, x - 0.3, 0.35, 0, x + 0.3, H - 0.4, 0.12, BLANCO, 1, "z-");
  moldura(o, N0, N1, 4.65, 4.95, 0.16, BLANCO);
  moldura(o, N0 - 0.2, N1 + 0.2, H - 0.45, H, 0.22, BLANCO);
  moldura(o, N0, N1, H + 0.6, H + 0.75, 0.12, BLANCO);
  for (const [i, x] of [N0 + 2.5, N0 + 7.5, N1 - 7.5, N1 - 2.5].entries()) {
    ventana(o, x, 5.8, 1.25, 1.65, { marco: C("#FFFFFF"), recercado: C("#EDEBE5"), recercadoAncho: 0.14, cuarterones: true, alfeizar: C("#EDEBE5") });
    if (i === 1 || i === 2) ventana(o, x, 1.0, 1.5, 1.75, { marco: C("#FFFFFF"), recercado: C("#EDEBE5"), recercadoAncho: 0.14, alfeizar: C("#EDEBE5") });
  }
  for (const p of PORTONES) {
    prisma(o, Mat.Detalle, arco(p - LUZ / 2, p + LUZ / 2, 0, 2.4), -0.3, -0.25, NEGRO, false);
    if (o.fino) for (let x = p - LUZ / 2 + 0.2; x < p + LUZ / 2 - 0.1; x += 0.25) o.caja(Mat.Metal, x - 0.02, 0, -0.28, x + 0.02, 2.4, -0.22, C("#33373C"));
  }
  // Rótulo «MERCADO DE LA CONCEPCIÓN»: azulejo amarillo con cenefa y escudo.
  const xm = ANCHO / 2;
  o.caja(Mat.Detalle, xm - 2.7, 3.35, 0, xm + 2.7, 4.35, 0.06, C("#E2B43A"));
  if (o.fino) {
    o.caja(Mat.Detalle, xm - 2.62, 3.43, 0.06, xm + 2.62, 3.5, 0.07, C("#3C5FA8"));
    o.caja(Mat.Detalle, xm - 2.62, 4.2, 0.06, xm + 2.62, 4.27, 0.07, C("#3C5FA8"));
    for (let k = 0; k < 22; k++) o.caja(Mat.Detalle, xm - 2.3 + k * 0.21, 3.65, 0.06, xm - 2.2 + k * 0.21, 4.0, 0.07, C("#2D3A66"));
  }
  o.caja(Mat.Detalle, xm - 0.45, 4.35, 0, xm + 0.45, 5.05, 0.06, C("#E2B43A"));
  o.caja(Mat.Detalle, xm - 0.25, 4.45, 0.06, xm + 0.25, 4.95, 0.07, C("#7E3E2C"));
  for (const x of [N0 + 0.3, N0 + 5.0, N1 - 5.0, N1 - 0.3]) {
    anclaX(o, x, H - 0.2);
    anclaX(o, x, 4.8);
  }
  // Óculo (reloj del logotipo) en el piñón.
  prisma(o, Mat.Detalle, Array.from({ length: 16 }, (_, k) => [xm + Math.cos((k / 16) * Math.PI * 2) * 0.7, H + 2.2 + Math.sin((k / 16) * Math.PI * 2) * 0.7] as P2), 0, 0.06, C("#E9E7E0"));
  prisma(o, Mat.Detalle, Array.from({ length: 16 }, (_, k) => [xm + Math.cos((k / 16) * Math.PI * 2) * 0.5, H + 2.2 + Math.sin((k / 16) * Math.PI * 2) * 0.5] as P2), 0.06, 0.08, C("#2E3238"));
  // Crujías laterales: paño liso con huecos verticales estrechos.
  for (const [x0, x1] of [[0.4, N0 - 0.6], [N1 + 0.6, ANCHO - 0.4]]) {
    for (let x = x0 + 0.8; x < x1 - 0.4; x += 1.8) {
      for (const [y0, y1] of [[0.9, 3.9], [5.3, 8.2]]) {
        o.caja(Mat.Detalle, x - 0.22, y0, 0, x + 0.22, y1, 0.03, C("#E3E1DB"));
        o.caja(Mat.Cristal, x - 0.16, y0 + 0.06, 0.03, x + 0.16, y1 - 0.06, 0.04, C("#59656D"));
      }
    }
    moldura(o, x0 - 0.4, x1 + 0.6, H - 0.3, H, 0.15, BLANCO);
  }
  // Maceteros de granito con olivos y palmitos (fotos).
  for (const x of [N0 - 1.2, N1 + 1.2, xm]) {
    o.caja(Mat.Detalle, x - 0.45, 0, 0.6, x + 0.45, 0.85, 1.5, C("#A9A8A3"));
    o.caja(Mat.Detalle, x - 0.05, 0.85, 0.99, x + 0.05, 1.8, 1.11, C("#6A5236"));
    o.caja(Mat.Detalle, x - 0.45, 1.6, 0.6, x + 0.45, 2.4, 1.5, C("#567F3C"));
  }
}

/** Fachadas laterales y trasera: muro blanco con huecos verticales y cornisa. */
function otrasFachadas(o: Obra, c: Ctx) {
  const lados: [P2, P2][] = [[mp(ANCHO, 0), mp(ANCHO, FONDO)], [mp(ANCHO, FONDO), mp(0, FONDO)], [mp(0, FONDO), mp(0, 0)]];
  for (const [a, b] of lados) {
    const mc = new Marco(a, b, CENTRO_MERCADO);
    const L = mc.usar(o, c);
    o.caja(Mat.Muro, 0, 0, -ESP, L, H, 0, BLANCO, 0.85, "z-");
    o.caja(Mat.Detalle, -0.02, 0, 0, L + 0.02, 0.35, 0.05, GRIS_ZOCALO, 0.8, "z-");
    moldura(o, -0.1, L + 0.1, H - 0.35, H, 0.18, BLANCO);
    for (let x = 1.2; x < L - 0.8; x += 1.8) {
      for (const [y0, y1] of [[1.0, 3.9], [5.3, 8.2]]) {
        o.caja(Mat.Detalle, x - 0.22, y0, 0, x + 0.22, y1, 0.03, C("#E3E1DB"));
        o.caja(Mat.Cristal, x - 0.16, y0 + 0.06, 0.03, x + 0.16, y1 - 0.06, 0.04, C("#59656D"));
      }
    }
  }
  // Testero norte de la nave con su piñón.
  const mn = new Marco(mp(0, FONDO), mp(ANCHO, FONDO), CENTRO_MERCADO);
  mn.usar(o, c);
  const inv = Math.hypot(mn.g(0, 0)[0] - mp(0, FONDO)[0], mn.g(0, 0)[1] - mp(0, FONDO)[1]) > 1;
  const pts = pinon().map(([x, y]) => [inv ? ANCHO - x : x, y] as P2);
  prisma(o, Mat.Muro, pts, -ESP, 0, BLANCO);
}

/** Interior: suelo, caras interiores de los muros, arquerías de dos pisos y cubierta acristalada. */
function interior(o: Obra, c: Ctx) {
  enMundo(o, c);
  plano(o, Mat.Suelo, [mp(ESP, ESP), mp(ANCHO - ESP, ESP), mp(ANCHO - ESP, FONDO - ESP), mp(ESP, FONDO - ESP)], 0.18, C("#C9C7C1"), 0.5);
  // Caras interiores de los muros (blancas) con los portones abiertos al sur.
  const dentro = CENTRO_MERCADO;
  const lados: [P2, P2][] = [[mp(ESP, FONDO - ESP), mp(ANCHO - ESP, FONDO - ESP)], [mp(ANCHO - ESP, FONDO - ESP), mp(ANCHO - ESP, ESP)], [mp(ESP, ESP), mp(ESP, FONDO - ESP)]];
  for (const [a, b] of lados) {
    // Marco con +z hacia el interior: «dentro» se toma fuera del muro.
    const fuera: P2 = [a[0] + (a[0] - dentro[0]) * 0.5 + (b[0] - dentro[0]) * 0.5, a[1] + (a[1] - dentro[1]) * 0.5 + (b[1] - dentro[1]) * 0.5];
    const mc = new Marco(a, b, fuera);
    const L = mc.usar(o, c);
    prisma(o, Mat.Muro, [[0, 0], [L, 0], [L, H], [0, H]], 0, 0.01, C("#F1EFEA"), false);
  }
  // Piñón del testero norte visto desde dentro.
  {
    const a = mp(0, FONDO - ESP);
    const b = mp(ANCHO, FONDO - ESP);
    const mc = new Marco(a, b, mp(ANCHO / 2, FONDO + 5));
    mc.usar(o, c);
    const inv = Math.hypot(mc.g(0, 0)[0] - a[0], mc.g(0, 0)[1] - a[1]) > 1;
    prisma(o, Mat.Muro, pinon().map(([x, y]) => [inv ? ANCHO - x : x, y] as P2), 0, 0.01, C("#F1EFEA"), false);
  }
  // Cara interior del muro sur, con los huecos de los portones.
  marcoSur(o, c, ESP);
  {
    // En el marco sur +z mira fuera; las caras interiores miran a −z: se dibujan con el contorno invertido.
    const piezas: P2[][] = [];
    let s0 = ESP;
    for (const p of PORTONES) {
      const a = p - LUZ / 2;
      const b = p + LUZ / 2;
      piezas.push([[s0, 0], [a, 0], [a, H], [s0, H]]);
      const t: P2[] = [[a, H], [a, 2.4]];
      for (let k = 1; k < 10; k++) {
        const ang = Math.PI - (k / 10) * Math.PI;
        t.push([p + Math.cos(ang) * (LUZ / 2), 2.4 + Math.sin(ang) * (LUZ / 2)]);
      }
      t.push([b, 2.4], [b, H]);
      piezas.push(t);
      s0 = b;
    }
    piezas.push([[s0, 0], [ANCHO - ESP, 0], [ANCHO - ESP, H], [s0, H]]);
    for (const pz of piezas) caraAtras(o, pz, -0.005, C("#F1EFEA"));
    caraAtras(o, pinon(), -0.005, C("#F1EFEA"));
    // Testero sur por dentro: dos ventanales en medio punto y el óculo (foto del interior).
    for (const x of [ANCHO / 2 - 1.8, ANCHO / 2 + 1.8]) caraAtras(o, arco(x - 1.1, x + 1.1, H + 0.2, H + 1.1), -0.02, C("#E4EEF2"), Mat.Luz);
    caraAtras(o, Array.from({ length: 14 }, (_, k) => [ANCHO / 2 + Math.cos((k / 14) * Math.PI * 2) * 0.45, H + 3.0 + Math.sin((k / 14) * Math.PI * 2) * 0.45] as P2), -0.02, C("#E4EEF2"), Mat.Luz);
  }
  // Arquerías de la nave: pilares blancos con basa de piedra, arcos de ladrillo en dos pisos.
  const tramos = 15;
  const L = FONDO - 2 * ESP - 1.6;
  for (const sx of [N0, N1]) {
    const lado = sx === N0 ? -1 : 1;
    const a = mp(sx, ESP + 0.8);
    const b = mp(sx, FONDO - ESP - 0.8);
    // +z hacia la nave: el punto de referencia («dentro» de Marco) va en la crujía.
    const mc = new Marco(a, b, mp(sx + lado * 5, FONDO / 2));
    mc.usar(o, c);
    const paso = L / tramos;
    for (let k = 0; k <= tramos; k++) {
      const x = k * paso;
      o.caja(Mat.Muro, x - 0.4, 0, -0.8, x + 0.4, 8.7, 0, C("#F4F2EC"), 0.85);
      o.caja(Mat.Detalle, x - 0.45, 0, -0.85, x + 0.45, 1.0, 0.05, PIEDRA, 0.8);
    }
    for (let k = 0; k < tramos; k++) {
      const x0 = k * paso + 0.4;
      const x1 = (k + 1) * paso - 0.4;
      const r = (x1 - x0) / 2;
      const cxa = (x0 + x1) / 2;
      const enjuta = (y: number, top: number): P2[] => {
        const pts: P2[] = [[x0, y]];
        for (let s = 1; s < 10; s++) {
          const t = Math.PI - (s / 10) * Math.PI;
          pts.push([cxa + Math.cos(t) * r, y + Math.sin(t) * r]);
        }
        pts.push([x1, y], [x1, top], [x0, top]);
        return pts;
      };
      prisma(o, Mat.Ladrillo, enjuta(3.2, 5.0), -0.6, 0, LADRILLO);
      prisma(o, Mat.Ladrillo, enjuta(6.9, 8.4), -0.6, 0, LADRILLO);
      // Antepecho de la galería alta: banda blanca con recuadro de piedra.
      o.caja(Mat.Muro, x0, 5.0, -0.5, x1, 6.1, 0, C("#F4F2EC"));
      if (o.fino) o.caja(Mat.Detalle, x0 + 0.2, 5.25, 0, x1 - 0.2, 5.85, 0.02, C("#C7A986"));
    }
    o.caja(Mat.Detalle, -0.5, 8.4, -0.9, L + 0.5, 8.75, 0.15, C("#F4F2EC"));
    // Forjado de la galería sobre la crujía.
    o.caja(Mat.Suelo, -0.4, 4.85, -4.5, L + 0.4, 5.0, -0.6, C("#D8D4CB"));
  }
  // Cubierta de la nave: faldones de chapa oscura con la franja central de cristal; cerchas negras.
  enMundo(o, c);
  const faldon = (s0: number, s1: number, y0: number, y1: number, col: RGB, m: Mat, abajo: boolean) => {
    const pts: [number, number, number][] = [
      [...pt(mp(s0, 0)), y0], [...pt(mp(s1, 0)), y1], [...pt(mp(s1, FONDO)), y1], [...pt(mp(s0, FONDO)), y0],
    ].map(([x, z, y]) => [x as number, y as number, z as number]);
    const u = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]];
    const v = [pts[3][0] - pts[0][0], pts[3][1] - pts[0][1], pts[3][2] - pts[0][2]];
    const ny = u[2] * v[0] - u[0] * v[2];
    const quiere = abajo ? -1 : 1;
    o.poli(m, ny * quiere >= 0 ? pts : [...pts].reverse(), col);
  };
  const ym = (N0 + N1) / 2;
  const alturaEn = (s: number) => H + 0.6 + ((H_CUMBRE - H - 0.6) * (1 - Math.abs(s - ym) / (ym - N0)));
  for (const [s0, s1] of [[N0 - 0.3, N0 + 4], [N0 + 4, ym], [ym, N1 - 4], [N1 - 4, N1 + 0.3]]) {
    const vidrio = s0 >= N0 + 3.9 && s1 <= N1 - 3.9;
    faldon(s0, s1, alturaEn(s0), alturaEn(s1), vidrio ? C("#A9C1CC") : C("#4A4F55"), vidrio ? Mat.Cristal : Mat.Chapa, false);
    faldon(s0, s1, alturaEn(s0) - 0.08, alturaEn(s1) - 0.08, vidrio ? C("#E6EEF2") : C("#3B3F44"), vidrio ? Mat.Luz : Mat.Chapa, true);
  }
  // Cerchas cada tramo.
  for (let k = 0; k <= 15; k++) {
    const d = ESP + 0.8 + (k * L) / 15;
    for (const [s0, s1] of [[N0, ym], [ym, N1]]) {
      const n = 6;
      for (let j = 0; j < n; j++) {
        const sa = s0 + ((s1 - s0) * j) / n;
        const sb = s0 + ((s1 - s0) * (j + 1)) / n;
        const [ax, az] = mp(sa, d);
        const [bx, bz] = mp(sb, d);
        o.caja(Mat.Metal, Math.min(ax, bx) - 0.06, Math.min(alturaEn(sa), alturaEn(sb)) - 0.32, Math.min(az, bz) - 0.06, Math.max(ax, bx) + 0.06, Math.max(alturaEn(sa), alturaEn(sb)) - 0.12, Math.max(az, bz) + 0.06, NEGRO);
      }
    }
    const [ax, az] = mp(N0, d);
    const [bx, bz] = mp(N1, d);
    if (o.fino) o.caja(Mat.Metal, Math.min(ax, bx), H + 0.2, Math.min(az, bz) - 0.03, Math.max(ax, bx), H + 0.26, Math.max(az, bz) + 0.03, NEGRO);
  }
  // Azoteas de las crujías laterales (y su techo visto desde dentro).
  plano(o, Mat.Muro, [mp(0, 0), mp(N0, 0), mp(N0, FONDO), mp(0, FONDO)], H, C("#C9C4BA"));
  plano(o, Mat.Muro, [mp(N1, 0), mp(ANCHO, 0), mp(ANCHO, FONDO), mp(N1, FONDO)], H, C("#C9C4BA"));
  techo(o, [mp(ESP, ESP), mp(N0 - 0.8, ESP), mp(N0 - 0.8, FONDO - ESP), mp(ESP, FONDO - ESP)], H - 0.02, C("#E9E6DF"));
  techo(o, [mp(N1 + 0.8, ESP), mp(ANCHO - ESP, ESP), mp(ANCHO - ESP, FONDO - ESP), mp(N1 + 0.8, FONDO - ESP)], H - 0.02, C("#E9E6DF"));
}

const pt = (p: P2): [number, number] => [p[0], p[1]];

/** Cara vertical de un contorno (x, y) dibujada mirando hacia −z del marco actual. */
function caraAtras(o: Obra, pts: P2[], z: number, col: RGB, m: Mat = Mat.Muro) {
  // prisma solo dibuja la cara que mira a +z: esta se triangula a mano con el sentido invertido.
  const tri = triangular(pts);
  for (const [a, b, c] of tri) o.poli(m, [[pts[a][0], pts[a][1], z], [pts[c][0], pts[c][1], z], [pts[b][0], pts[b][1], z]], col);
}

function triangular(pts: P2[]): [number, number, number][] {
  // Triangulación por orejas (contornos simples, pocos vértices).
  const idx = pts.map((_, i) => i);
  const area = pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1], 0);
  if (area < 0) idx.reverse();
  const res: [number, number, number][] = [];
  const dentroT = (p: P2, a: P2, b: P2, c: P2) => {
    const d = (p1: P2, p2: P2, p3: P2) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
    const d1 = d(p, a, b);
    const d2 = d(p, b, c);
    const d3 = d(p, c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  let guard = 0;
  while (idx.length > 3 && guard++ < 1000) {
    let hecho = false;
    for (let i = 0; i < idx.length; i++) {
      const [ia, ib, ic] = [idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]];
      const [a, b, c] = [pts[ia], pts[ib], pts[ic]];
      const cruz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cruz <= 1e-9) continue;
      if (idx.some((j) => j !== ia && j !== ib && j !== ic && dentroT(pts[j], a, b, c))) continue;
      res.push([ia, ib, ic]);
      idx.splice(i, 1);
      hecho = true;
      break;
    }
    if (!hecho) break;
  }
  if (idx.length === 3) res.push([idx[0], idx[1], idx[2]]);
  return res;
}

/** Plano horizontal visto desde abajo. */
function techo(o: Obra, pts: P2[], y: number, col: RGB) {
  const tri = triangular(pts);
  for (const [a, b, c] of tri) o.poli(Mat.Muro, [[pts[a][0], y, pts[a][1]], [pts[b][0], y, pts[b][1]], [pts[c][0], y, pts[c][1]]], col);
}

/** Muros sólidos para las colisiones: perímetro con los dos portones abiertos y los pilares. */
export function solidosMercado(): P2[][] {
  const res: P2[][] = [];
  const muroDe = (s0: number, d0: number, s1: number, d1: number): P2[] => [mp(s0, d0), mp(s1, d0), mp(s1, d1), mp(s0, d1)];
  let s0 = 0;
  for (const p of PORTONES) {
    res.push(muroDe(s0, 0, p - LUZ / 2, ESP));
    s0 = p + LUZ / 2;
  }
  res.push(muroDe(s0, 0, ANCHO, ESP));
  res.push(muroDe(0, FONDO - ESP, ANCHO, FONDO));
  res.push(muroDe(0, 0, ESP, FONDO));
  res.push(muroDe(ANCHO - ESP, 0, ANCHO, FONDO));
  return res;
}

export function construirMercado(c: Ctx, fino: boolean) {
  const o = new Obra();
  o.fino = fino;
  fachadaSur(o, c);
  otrasFachadas(o, c);
  interior(o, c);
  return o;
}
