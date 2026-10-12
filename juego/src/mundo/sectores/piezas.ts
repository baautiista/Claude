import * as THREE from "three";
import { Mat, Obra, type RGB } from "../arquitectura";

/**
 * Piezas arquitectónicas para los sectores reconstruidos a mano (barrio a
 * barrio, con fotos reales). Escriben en una `Obra`, igual que la arquitectura
 * procedural: todo acaba en pocas mallas agrupadas por material.
 *
 * Convención de las fachadas: tras `Marco.usar`, x corre a lo largo de la
 * fachada (0…L), y es la altura sobre la acera y +z sale hacia la calle.
 */

export type P2 = [number, number];
export interface Ctx {
  cx: number;
  cy: number;
  suelo: number;
}

const tinte = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

/** Sistema local de una fachada entre dos puntos del mapa (coordenadas del juego). */
export class Marco {
  readonly L: number;
  private a: P2;
  private ux: number;
  private uy: number;
  constructor(A: P2, B: P2, dentro: P2) {
    let a = A;
    let b = B;
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    // +z local apunta a (−dy, dx): si eso mira hacia dentro, se invierte el sentido.
    if (-dy * (dentro[0] - mx) + dx * (dentro[1] - my) > 0) {
      [a, b] = [b, a];
      dx = -dx;
      dy = -dy;
    }
    this.a = a;
    this.L = Math.hypot(dx, dy);
    this.ux = dx / this.L;
    this.uy = dy / this.L;
  }
  /** Punto del mapa correspondiente a (x, z) locales. */
  g(x: number, z: number): P2 {
    return [this.a[0] + x * this.ux - z * this.uy, this.a[1] + x * this.uy + z * this.ux];
  }
  usar(o: Obra, c: Ctx, alto = 0) {
    o.marco(this.a[0] - c.cx, c.suelo + alto, this.a[1] - c.cy, Math.atan2(this.uy, this.ux));
    return this.L;
  }
}

/** Coordenadas locales = coordenadas del juego (x, z = y del mapa). */
export function enMundo(o: Obra, c: Ctx, alto = 0) {
  o.marco(-c.cx, c.suelo + alto, -c.cy, 0);
}

export function centroide(p: P2[]): P2 {
  let x = 0;
  let y = 0;
  for (const q of p) (x += q[0]), (y += q[1]);
  return [x / p.length, y / p.length];
}

/* ── Formas ───────────────────────────────────────────────────────── */

const v2 = (p: P2) => new THREE.Vector2(p[0], p[1]);

/** Contorno 2D (x, y) extruido en z0…z1: frontones, arcos, volutas, discos. */
export function prisma(o: Obra, m: Mat, contorno: P2[], z0: number, z1: number, color: RGB, lados = true) {
  let c = contorno;
  if (THREE.ShapeUtils.isClockWise(c.map(v2))) c = [...c].reverse();
  for (const [a, b, d] of THREE.ShapeUtils.triangulateShape(c.map(v2), [])) o.poli(m, [[c[a][0], c[a][1], z1], [c[b][0], c[b][1], z1], [c[d][0], c[d][1], z1]], color);
  if (!lados) return;
  const k = tinte(color, 0.9);
  for (let i = 0; i < c.length; i++) {
    const p = c[i];
    const q = c[(i + 1) % c.length];
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-4) continue;
    o.poli(m, [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], k);
  }
}

/** Polígono horizontal (pavimentos, cubiertas planas) a la altura y, con la cara hacia arriba. */
export function plano(o: Obra, m: Mat, pts: P2[], y: number, color: RGB, uv?: number) {
  let c = pts.map(([x, z]) => new THREE.Vector2(x, -z));
  let p = pts;
  if (THREE.ShapeUtils.isClockWise(c)) (c = [...c].reverse()), (p = [...p].reverse());
  for (const [a, b, d] of THREE.ShapeUtils.triangulateShape(c, [])) o.poli(m, [[p[a][0], y, p[a][1]], [p[b][0], y, p[b][1]], [p[d][0], y, p[d][1]]], color, 1, uv);
}

/** Rectángulo rematado en medio punto (vanos, puertas, hornacinas). */
export function arco(x0: number, x1: number, y0: number, yArranque: number, seg = 10): P2[] {
  const r = (x1 - x0) / 2;
  const cxa = (x0 + x1) / 2;
  const pts: P2[] = [[x0, y0], [x1, y0], [x1, yArranque]];
  for (let i = 1; i < seg; i++) {
    const a = (i / seg) * Math.PI;
    pts.push([cxa + Math.cos(a) * r, yArranque + Math.sin(a) * r]);
  }
  pts.push([x0, yArranque]);
  return pts;
}

/** Disco vertical (mirando a +z): relojes, óculos, medallones. */
export function disco(o: Obra, m: Mat, x: number, y: number, z0: number, z1: number, r: number, color: RGB, seg = 16) {
  const pts: P2[] = [];
  for (let i = 0; i < seg; i++) pts.push([x + Math.cos((i / seg) * Math.PI * 2) * r, y + Math.sin((i / seg) * Math.PI * 2) * r]);
  prisma(o, m, pts, z0, z1, color);
}

/** Pieza de revolución: perfil [radio, altura] de abajo arriba (jarrones, campanas, cúpulas, farolas). */
export function torno(o: Obra, m: Mat, x: number, y: number, z: number, perfil: P2[], color: RGB, seg = 10) {
  for (let k = 1; k < perfil.length; k++) {
    const r0 = Math.max(0.002, perfil[k - 1][0]);
    const h0 = perfil[k - 1][1];
    const r1 = Math.max(0.002, perfil[k][0]);
    const h1 = perfil[k][1];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const sombra = 0.88 + 0.12 * Math.cos(a0 - 0.8);
      o.poli(m, [
        [x + Math.cos(a1) * r0, y + h0, z + Math.sin(a1) * r0],
        [x + Math.cos(a0) * r0, y + h0, z + Math.sin(a0) * r0],
        [x + Math.cos(a0) * r1, y + h1, z + Math.sin(a0) * r1],
        [x + Math.cos(a1) * r1, y + h1, z + Math.sin(a1) * r1],
      ], tinte(color, sombra));
    }
  }
}

/** Banda en forma de tira siguiendo una curva (albardillas de volutas y frontones). */
export function tira(o: Obra, m: Mat, curva: P2[], grosor: number, z0: number, z1: number, color: RGB) {
  const arriba = curva.map(([x, y]) => [x, y + grosor] as P2).reverse();
  prisma(o, m, [...curva, ...arriba], z0, z1, color);
}

/* ── Piezas de fachada (en el marco de una fachada) ───────────────── */

/** Paño de muro en el plano de la fachada; `z` > 0 para revestimientos sobre otro muro (evita parpadeos). */
export function muro(o: Obra, x0: number, x1: number, y0: number, y1: number, color: RGB, m = Mat.Muro, ao = 1, z = 0) {
  o.poli(m, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], color, ao);
}

/** Moldura, imposta o cornisa: caja pegada al muro que vuela `vuelo`. */
export function moldura(o: Obra, x0: number, x1: number, y0: number, y1: number, vuelo: number, color: RGB, z = 0) {
  o.caja(Mat.Detalle, x0, y0, z, x1, y1, z + vuelo, color, 1, "z-");
}

/** Juntas de sillería: líneas finas horizontales y verticales alternas. */
export function sillares(o: Obra, x0: number, x1: number, y0: number, y1: number, alto: number, junta: RGB) {
  if (!o.fino) return;
  let fila = 0;
  for (let y = y0 + alto; y < y1 - 0.05; y += alto, fila++) {
    o.poli(Mat.Detalle, [[x0, y - 0.025, 0.045], [x1, y - 0.025, 0.045], [x1, y + 0.025, 0.045], [x0, y + 0.025, 0.045]], junta);
    for (let x = x0 + (fila % 2 ? 0.6 : 1.2); x < x1 - 0.2; x += 1.2) o.poli(Mat.Detalle, [[x - 0.02, y, 0.045], [x + 0.02, y, 0.045], [x + 0.02, y + alto, 0.045], [x - 0.02, y + alto, 0.045]], junta);
  }
}

export interface OpVentana {
  marco: RGB;
  recercado?: RGB;
  recercadoAncho?: number;
  persiana?: RGB;
  /** Fracción de la ventana tapada por la persiana enrollable. */
  bajada?: number;
  cuarterones?: boolean;
  luz?: boolean;
  alfeizar?: RGB;
  arco?: boolean;
}

/** Ventana o balconera: recercado, cristal, carpintería, persiana y alféizar. */
export function ventana(o: Obra, x: number, y: number, w: number, h: number, op: OpVentana) {
  const a = w / 2;
  const rc = op.recercadoAncho ?? 0.16;
  if (op.recercado) {
    if (op.arco) prisma(o, Mat.Detalle, arco(x - a - rc, x + a + rc, y - rc, y + h - a), 0, 0.05, op.recercado, false);
    else o.caja(Mat.Detalle, x - a - rc, y - rc, 0, x + a + rc, y + h + rc, 0.05, op.recercado, 1, "z-");
  }
  const vidrio = op.luz ? Mat.Luz : Mat.Cristal;
  const cristal: RGB = [0.42, 0.55, 0.66];
  if (op.arco) prisma(o, vidrio, arco(x - a, x + a, y, y + h - a), 0.055, 0.06, cristal, false);
  else o.poli(vidrio, [[x - a, y, 0.06], [x + a, y, 0.06], [x + a, y + h, 0.06], [x - a, y + h, 0.06]], cristal);
  const z1 = 0.11;
  const t = 0.07;
  const top = op.arco ? y + h - a : y + h;
  o.caja(Mat.Detalle, x - a, y, 0.05, x - a + t, top, z1, op.marco);
  o.caja(Mat.Detalle, x + a - t, y, 0.05, x + a, top, z1, op.marco);
  o.caja(Mat.Detalle, x - a, y, 0.05, x + a, y + t, z1, op.marco);
  if (!op.arco) o.caja(Mat.Detalle, x - a, y + h - t, 0.05, x + a, y + h, z1, op.marco);
  if (o.fino) {
    o.caja(Mat.Detalle, x - 0.025, y, 0.05, x + 0.025, top, z1, op.marco);
    if (op.cuarterones) for (const f of [0.33, 0.66]) o.caja(Mat.Detalle, x - a, y + h * f - 0.02, 0.05, x + a, y + h * f + 0.02, z1, op.marco);
  }
  if (op.persiana && (op.bajada ?? 0) > 0.02) {
    const yb = y + h - h * (op.bajada ?? 0.3);
    o.caja(Mat.Detalle, x - a, yb, 0.06, x + a, y + h, 0.09, op.persiana);
  }
  if (op.alfeizar) o.caja(Mat.Detalle, x - a - 0.08, y - 0.1, 0, x + a + 0.08, y, 0.16, op.alfeizar, 1, "z-");
}

/** Verja o barandilla entre dos puntos locales (x, z) a la altura y. */
export function verja(o: Obra, ax: number, az: number, bx: number, bz: number, y: number, alto: number, color: RGB, paso = 0.13, grueso = 0.035) {
  const L = Math.hypot(bx - ax, bz - az);
  if (L < 0.01) return;
  const ux = (bx - ax) / L;
  const uz = (bz - az) / L;
  const barra = (x: number, z: number, y0: number, y1: number, g: number) => o.caja(Mat.Metal, x - g, y0, z - g, x + g, y1, z + g, color);
  // Pasamanos y travesaño inferior como tiras finas a lo largo del tramo.
  const tramo = (y0: number, y1: number, g: number) => {
    const nx = -uz * g;
    const nz = ux * g;
    o.poli(Mat.Metal, [[ax + nx, y0, az + nz], [bx + nx, y0, bz + nz], [bx + nx, y1, bz + nz], [ax + nx, y1, az + nz]], color);
    o.poli(Mat.Metal, [[bx - nx, y0, bz - nz], [ax - nx, y0, az - nz], [ax - nx, y1, az - nz], [bx - nx, y1, bz - nz]], color);
    o.poli(Mat.Metal, [[ax - nx, y1, az - nz], [ax + nx, y1, az + nz], [bx + nx, y1, bz + nz], [bx - nx, y1, bz - nz]], color);
  };
  tramo(y + alto - 0.06, y + alto, 0.04);
  tramo(y + 0.05, y + 0.1, 0.025);
  if (o.fino) {
    const n = Math.max(1, Math.round(L / paso));
    for (let i = 0; i <= n; i++) barra(ax + ux * (L * i) / n, az + uz * (L * i) / n, y, y + alto, grueso);
  } else {
    // A lo lejos, un velo oscuro en lugar de barrotes.
    tramo(y + 0.1, y + alto - 0.06, 0.01);
  }
}

/** Balcón volado: losa con canto y barandilla de hierro en sus tres lados. */
export function balcon(o: Obra, x: number, y: number, w: number, vuelo: number, losa: RGB, hierro: RGB, alto = 0.95) {
  const a = w / 2;
  o.caja(Mat.Detalle, x - a, y - 0.16, 0, x + a, y, vuelo, losa, 1, "z-");
  if (o.fino) o.caja(Mat.Detalle, x - a + 0.1, y - 0.3, 0, x + a - 0.1, y - 0.16, vuelo * 0.7, tinte(losa, 0.85), 1, "z-");
  verja(o, x - a + 0.04, vuelo - 0.04, x + a - 0.04, vuelo - 0.04, y, alto, hierro);
  verja(o, x - a + 0.04, 0.02, x - a + 0.04, vuelo - 0.04, y, alto, hierro);
  verja(o, x + a - 0.04, 0.02, x + a - 0.04, vuelo - 0.04, y, alto, hierro);
}

/** Balaustrada de piedra o yeso (pretiles, balcones gaditanos). */
export function balaustrada(o: Obra, x0: number, x1: number, y: number, alto: number, z: number, color: RGB, fondo = 0.3) {
  o.caja(Mat.Detalle, x0, y, z - fondo / 2, x1, y + 0.12, z + fondo / 2, color);
  o.caja(Mat.Detalle, x0, y + alto - 0.14, z - fondo / 2 - 0.03, x1, y + alto, z + fondo / 2 + 0.03, color);
  const n = Math.max(2, Math.round((x1 - x0) / 0.24));
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) * (x1 - x0)) / n;
    if (o.fino) torno(o, Mat.Detalle, x, y + 0.12, z, [[0.05, 0], [0.075, 0.12], [0.045, 0.3], [0.06, alto - 0.36], [0.05, alto - 0.26]], color, 6);
    else o.caja(Mat.Detalle, x - 0.05, y + 0.12, z - 0.05, x + 0.05, y + alto - 0.14, z + 0.05, color);
  }
}

/** Cierro: mirador acristalado blanco, típico de Cádiz y La Línea. */
export function cierro(o: Obra, x: number, y: number, w: number, h: number, vuelo: number, blanco: RGB, hierro: RGB) {
  const a = w / 2;
  o.caja(Mat.Detalle, x - a - 0.08, y - 0.2, 0, x + a + 0.08, y, vuelo + 0.08, blanco, 1, "z-");
  o.caja(Mat.Detalle, x - a - 0.1, y + h, 0, x + a + 0.1, y + h + 0.22, vuelo + 0.12, blanco, 1, "z-");
  // Cristales al frente y a los lados.
  o.caja(Mat.Cristal, x - a + 0.05, y + 0.45, vuelo - 0.03, x + a - 0.05, y + h, vuelo - 0.01, [0.55, 0.66, 0.74], 1, "z-");
  o.caja(Mat.Cristal, x - a, y + 0.45, 0.02, x - a + 0.02, y + h, vuelo - 0.03, [0.5, 0.6, 0.7]);
  o.caja(Mat.Cristal, x + a - 0.02, y + 0.45, 0.02, x + a, y + h, vuelo - 0.03, [0.5, 0.6, 0.7]);
  // Antepecho de hierro y carpintería blanca.
  o.caja(Mat.Detalle, x - a, y, vuelo - 0.06, x + a, y + 0.45, vuelo, tinte(blanco, 0.95));
  if (o.fino) {
    verja(o, x - a + 0.02, vuelo + 0.03, x + a - 0.02, vuelo + 0.03, y + 0.02, 0.42, hierro, 0.1, 0.02);
    const n = Math.max(2, Math.round(w / 0.42));
    for (let i = 0; i <= n; i++) o.caja(Mat.Detalle, x - a + (i * w) / n - 0.03, y + 0.45, vuelo - 0.04, x - a + (i * w) / n + 0.03, y + h, vuelo + 0.01, blanco);
    for (const f of [0.42, 0.72]) o.caja(Mat.Detalle, x - a, y + 0.45 + (h - 0.45) * f - 0.02, vuelo - 0.04, x + a, y + 0.45 + (h - 0.45) * f + 0.02, vuelo + 0.01, blanco);
  }
}

/** Reja de ventana volada (barrotes con marco). */
export function reja(o: Obra, x: number, y: number, w: number, h: number, vuelo: number, hierro: RGB) {
  const a = w / 2;
  verja(o, x - a, vuelo, x + a, vuelo, y, h, hierro, 0.12, 0.022);
  if (o.fino) {
    o.caja(Mat.Metal, x - a, y + h * 0.5 - 0.02, 0, x + a, y + h * 0.5 + 0.02, vuelo, hierro);
    for (const s of [-1, 1]) o.caja(Mat.Metal, x + s * a - 0.02, y, 0, x + s * a + 0.02, y + h, vuelo, hierro);
  }
}

/** Toldo inclinado con faldón (opcionalmente festoneado). */
export function toldo(o: Obra, x0: number, x1: number, y: number, vuelo: number, caida: number, color: RGB, raya?: RGB, festones = false) {
  o.poli(Mat.Detalle, [[x0, y, 0], [x0, y - caida, vuelo], [x1, y - caida, vuelo], [x1, y, 0]], color);
  o.poli(Mat.Detalle, [[x0, y - 0.02, 0], [x1, y - 0.02, 0], [x1, y - caida - 0.02, vuelo], [x0, y - caida - 0.02, vuelo]], tinte(color, 0.6));
  if (raya && o.fino) {
    const n = Math.max(2, Math.round((x1 - x0) / 0.5));
    for (let i = 0; i < n; i += 2) {
      const a = x0 + ((x1 - x0) * i) / n;
      const b = x0 + ((x1 - x0) * (i + 1)) / n;
      o.poli(Mat.Detalle, [[a, y + 0.005, 0], [a, y - caida + 0.005, vuelo + 0.005], [b, y - caida + 0.005, vuelo + 0.005], [b, y + 0.005, 0]], raya);
    }
  }
  const yf = y - caida;
  if (festones && o.fino) {
    const n = Math.max(2, Math.round((x1 - x0) / 0.45));
    const pts: P2[] = [[x0, yf]];
    for (let i = 0; i <= n * 4; i++) {
      const t = i / (n * 4);
      pts.push([x0 + (x1 - x0) * t, yf - 0.32 - Math.abs(Math.sin(t * n * Math.PI)) * 0.14]);
    }
    pts.push([x1, yf]);
    prisma(o, Mat.Detalle, pts, vuelo, vuelo + 0.02, color, false);
  } else o.caja(Mat.Detalle, x0, yf - 0.3, vuelo, x1, yf, vuelo + 0.02, color);
}

/** Jarrón o pináculo de remate (terracota, piedra). */
export function jarron(o: Obra, x: number, y: number, z: number, s: number, color: RGB, m = Mat.Detalle) {
  if (!o.fino) return o.caja(m, x - 0.14 * s, y, z - 0.14 * s, x + 0.14 * s, y + 0.7 * s, z + 0.14 * s, color);
  torno(o, m, x, y, z, [[0.2, 0], [0.2, 0.08], [0.1, 0.14], [0.2, 0.3], [0.25, 0.42], [0.16, 0.56], [0.08, 0.62], [0.12, 0.7], [0.02, 0.86]].map(([r, h]) => [r * s, h * s] as P2), color, 8);
}

/** Árbol de alcorque pequeño (magnolio en macetero, naranjo joven). */
export function arbolito(o: Obra, x: number, y: number, z: number, alto: number, hoja: RGB) {
  torno(o, Mat.Detalle, x, y, z, [[0.06, 0], [0.05, alto * 0.55]], [0.42, 0.33, 0.24], 5);
  torno(o, Mat.Detalle, x, y + alto * 0.45, z, [[0.05, 0], [alto * 0.3, alto * 0.12], [alto * 0.34, alto * 0.3], [alto * 0.25, alto * 0.46], [0.02, alto * 0.56]], hoja, 7);
}

/**
 * Punto interior junto a la arista i de un polígono, según su sentido de giro.
 * (El centroide no sirve: en huellas cóncavas, en L o en U, puede caer fuera y dejaría las
 * paredes mirando hacia dentro: invisibles desde la calle.)
 */
export function interiorArista(poli: P2[], i: number): P2 {
  let area = 0;
  for (let k = 0; k < poli.length; k++) {
    const [x0, y0] = poli[k];
    const [x1, y1] = poli[(k + 1) % poli.length];
    area += x0 * y1 - x1 * y0;
  }
  const a = poli[i];
  const b = poli[(i + 1) % poli.length];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  // Normal a la izquierda de a→b; es interior si el polígono gira en sentido positivo.
  const s = area > 0 ? 1 : -1;
  const nx = (-(b[1] - a[1]) / L) * s;
  const ny = ((b[0] - a[0]) / L) * s;
  return [(a[0] + b[0]) / 2 + nx * 0.3, (a[1] + b[1]) / 2 + ny * 0.3];
}
