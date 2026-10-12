import * as THREE from "three";
import { Mat, Obra, rgb, type Edificio } from "./arquitectura";

/**
 * Espacio público de un trozo de ciudad: aceras elevadas con baldosa y bordillo,
 * bancos, papeleras, jardineras, bolardos, señales, coches aparcados y terrazas
 * de bar delante de los comercios. Se genera junto con la arquitectura detallada.
 */

export type Punto = readonly [number, number];
export interface Segmento {
  a: Punto;
  b: Punto;
  clase: number;
  ancho: number;
}

const BORDILLO = rgb("#E4E1DA");
const BALDOSA = rgb("#E9E2D3");
const HIERRO = rgb("#2A2D33");
const MADERA = rgb("#8A5A35");
const VERDE = rgb("#4E9A3A");
const VERDE2 = rgb("#3E8432");
const COCHES = ["#E8423C", "#FFFFFF", "#2F6DB5", "#F2C230", "#2B2D31", "#9AA4B2", "#FFFFFF", "#C9CED6", "#3FA046", "#7A1F2B"].map(rgb);

function azar(s: number) {
  let v = (s % 2147483646) + 1;
  return () => ((v = (v * 16807) % 2147483647) / 2147483647);
}

/**
 * Pone el sistema local de la obra a lo largo de un segmento:
 * x local a lo largo de la calle, z local hacia la izquierda.
 */
function alinear(o: Obra, a: Punto, b: Punto, cx: number, cy: number, y: number) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  o.marco(a[0] - cx, y, a[1] - cy, ang);
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function banco(o: Obra, x: number, z: number, lado: number) {
  const s = lado;
  o.caja(Mat.Metal, x - 0.9, 0, z - 0.25 * s - 0.05, x - 0.8, 0.45, z + 0.25 * s + 0.05, HIERRO);
  o.caja(Mat.Metal, x + 0.8, 0, z - 0.25 * s - 0.05, x + 0.9, 0.45, z + 0.25 * s + 0.05, HIERRO);
  o.caja(Mat.Detalle, x - 1, 0.45, z - 0.28, x + 1, 0.55, z + 0.28, MADERA);
  o.caja(Mat.Detalle, x - 1, 0.6, z + 0.25 * s, x + 1, 1.05, z + 0.32 * s, MADERA);
}

function papelera(o: Obra, x: number, z: number) {
  o.cilindro(Mat.Metal, x, 0, z, 0.06, 0.5, HIERRO, 4, false);
  o.cilindro(Mat.Detalle, x, 0.45, z, 0.28, 0.6, rgb("#2E6B3F"), 8);
}

function jardinera(o: Obra, x: number, z: number, r: () => number) {
  o.caja(Mat.Detalle, x - 0.7, 0, z - 0.45, x + 0.7, 0.55, z + 0.45, rgb("#D8D0C0"), 0.8);
  o.caja(Mat.Detalle, x - 0.6, 0.55, z - 0.35, x + 0.6, 0.62, z + 0.35, rgb("#6B4A2E"));
  for (let k = 0; k < 3; k++) {
    const dx = -0.4 + k * 0.4;
    const h = 0.45 + r() * 0.35;
    o.caja(Mat.Detalle, x + dx - 0.25, 0.6, z - 0.28, x + dx + 0.25, 0.6 + h, z + 0.28, k % 2 ? VERDE : VERDE2);
  }
  if (r() < 0.5) o.caja(Mat.Detalle, x - 0.15, 1.05, z - 0.12, x + 0.2, 1.2, z + 0.12, rgb(r() < 0.5 ? "#E94B6A" : "#F4C430"));
}

function bolardo(o: Obra, x: number, z: number) {
  o.cilindro(Mat.Metal, x, 0, z, 0.12, 0.85, HIERRO, 6);
}

function senal(o: Obra, x: number, z: number, r: () => number) {
  o.cilindro(Mat.Metal, x, 0, z, 0.06, 3, rgb("#9AA4B2"), 5, false);
  const tipo = r();
  if (tipo < 0.4) {
    // Señal circular de prohibido / dirección.
    o.cilindro(Mat.Detalle, x, 2.4, z, 0.45, 0.08, rgb("#C0392B"), 10);
    o.cilindro(Mat.Detalle, x, 2.45, z, 0.32, 0.06, rgb("#FFFFFF"), 10);
  } else if (tipo < 0.7) {
    o.caja(Mat.Detalle, x - 0.4, 2.2, z - 0.05, x + 0.4, 3, z + 0.05, rgb("#1F5EFF"));
    o.caja(Mat.Detalle, x - 0.22, 2.4, z + 0.05, x + 0.22, 2.8, z + 0.07, rgb("#FFFFFF"));
  } else {
    // Placa de calle.
    o.caja(Mat.Detalle, x - 0.6, 2.6, z - 0.04, x + 0.6, 2.95, z + 0.04, rgb("#FFFFFF"));
    o.caja(Mat.Detalle, x - 0.55, 2.65, z + 0.04, x + 0.55, 2.9, z + 0.05, rgb("#1F3F8F"));
  }
}

type P2 = [number, number];

/** Extruye un perfil (x, y) entre z0 y z1, con las dos tapas. */
function extruir(o: Obra, m: Mat, perfil: P2[], x: number, z: number, z0: number, z1: number, color: ReturnType<typeof rgb>) {
  let c = perfil;
  if (THREE.ShapeUtils.isClockWise(c.map(([a, b]) => new THREE.Vector2(a, b)))) c = [...c].reverse();
  const tris = THREE.ShapeUtils.triangulateShape(c.map(([a, b]) => new THREE.Vector2(a, b)), []);
  for (const [i, j, k] of tris) {
    o.poli(m, [[x + c[i][0], c[i][1], z + z1], [x + c[j][0], c[j][1], z + z1], [x + c[k][0], c[k][1], z + z1]], color);
    o.poli(m, [[x + c[k][0], c[k][1], z + z0], [x + c[j][0], c[j][1], z + z0], [x + c[i][0], c[i][1], z + z0]], color);
  }
  for (let i = 0; i < c.length; i++) {
    const p = c[i];
    const q = c[(i + 1) % c.length];
    o.poli(m, [[x + p[0], p[1], z + z0], [x + q[0], q[1], z + z0], [x + q[0], q[1], z + z1], [x + p[0], p[1], z + z1]], color);
  }
}

const RUEDA: P2[] = Array.from({ length: 12 }, (_, i) => [Math.cos((i / 12) * Math.PI * 2) * 0.32, Math.sin((i / 12) * Math.PI * 2) * 0.32] as P2);
const LLANTA: P2[] = RUEDA.map(([a, b]) => [a * 0.55, b * 0.55] as P2);

/** Coche aparcado orientado a lo largo de la calle (turismo de 4,2 × 1,8 m). */
export function coche(o: Obra, x: number, z: number, r: () => number) {
  const c = COCHES[Math.floor(r() * COCHES.length)];
  const L = 2.0 + r() * 0.25;
  const W = 0.88;
  const familiar = r() < 0.3;
  const CRISTAL = rgb("#22303D");
  const NEGRO = rgb("#1C1D21");
  // Ruedas con llanta, en los pasos de rueda.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * L * 0.66;
    const RU = RUEDA.map(([a, b]) => [cx + a, b + 0.32] as P2);
    const LL = LLANTA.map(([a, b]) => [cx + a, b + 0.32] as P2);
    extruir(o, Mat.Metal, RU, x, z, sz > 0 ? W - 0.26 : -W, sz > 0 ? W : -W + 0.26, NEGRO);
    extruir(o, Mat.Metal, LL, x, z, sz > 0 ? W : -W - 0.01, sz > 0 ? W + 0.01 : -W, rgb("#B9BCC0"));
  }
  // Carrocería: capó y maletero inclinados.
  const cuerpo: P2[] = [[-L, 0.34], [L, 0.34], [L, 0.66], [L - 0.12, 0.8], [L * 0.38, 0.92], [-L * 0.8, 0.96], [-L + 0.05, 0.9], [-L, 0.78]];
  extruir(o, Mat.Metal, cuerpo, x, z, -W, W, c);
  // Habitáculo: lunas tintadas, techo y pilares del color de la carrocería.
  const atras = familiar ? -L * 0.92 : -L * 0.72;
  const cab: P2[] = [[L * 0.38, 0.92], [L * 0.02, 1.4], [atras + 0.1, 1.42], [atras, 0.96]];
  extruir(o, Mat.Cristal, cab, x, z, -W * 0.84, W * 0.84, CRISTAL);
  extruir(o, Mat.Metal, [[L * 0.04, 1.39], [atras + 0.08, 1.41], [atras + 0.08, 1.47], [L * 0.04, 1.45]], x, z, -W * 0.82, W * 0.82, c);
  for (const px of [L * 0.2, -L * 0.18]) extruir(o, Mat.Metal, [[px - 0.06, 0.94], [px + 0.06, 0.94], [px + 0.06 - (px > 0 ? 0.25 : 0), 1.4], [px - 0.06 - (px > 0 ? 0.25 : 0), 1.4]], x, z, -W * 0.86, W * 0.86, c);
  // Parachoques, faros, pilotos, matrícula y retrovisores.
  o.caja(Mat.Detalle, x + L - 0.02, 0.3, z - W, x + L + 0.06, 0.52, z + W, rgb("#2B2D31"));
  o.caja(Mat.Detalle, x - L - 0.06, 0.3, z - W, x - L + 0.02, 0.52, z + W, rgb("#2B2D31"));
  for (const sz of [-1, 1]) {
    o.caja(Mat.Luz, x + L - 0.08, 0.6, z + sz * W * 0.78 - 0.18, x + L + 0.01, 0.72, z + sz * W * 0.78 + 0.18, rgb("#FFF4C8"));
    o.caja(Mat.Detalle, x - L - 0.01, 0.62, z + sz * W * 0.8 - 0.16, x - L + 0.06, 0.76, z + sz * W * 0.8 + 0.16, rgb("#C0392B"));
    o.caja(Mat.Metal, x + L * 0.33, 0.95, z + sz * (W + 0.12) - 0.06, x + L * 0.4, 1.08, z + sz * (W + 0.12) + 0.06, c);
  }
  o.caja(Mat.Detalle, x - L - 0.07, 0.36, z - 0.26, x - L - 0.05, 0.47, z + 0.26, rgb("#F2F2F0"));
  o.caja(Mat.Detalle, x + L + 0.06, 0.36, z - 0.26, x + L + 0.08, 0.47, z + 0.26, rgb("#F2F2F0"));
}


/**
 * Urbaniza los segmentos de un trozo. `recortes` dice cuánto acortar el principio
 * y el final de cada segmento (para no invadir los cruces).
 */
export function urbanizar(o: Obra, segs: (Segmento & { r0: number; r1: number })[], tiendas: Edificio[], cx: number, cy: number, suelo: number, semilla: number, enCalzada: (p: Punto, propio: Segmento) => boolean) {
  const r = azar(semilla);
  const yAcera = suelo + 0.2;
  for (const s of segs) {
    const L = alinear(o, s.a, s.b, cx, cy, yAcera);
    const x0 = s.r0;
    const x1 = L - s.r1;
    if (x1 - x0 < 0.5) continue;
    if (x1 - x0 < 5) continue;
    const hw = s.ancho / 2;
    const coches = s.clase === 2 || s.clase === 3;
    const dx = (s.b[0] - s.a[0]) / L;
    const dy = (s.b[1] - s.a[1]) / L;
    for (const lado of [-1, 1]) {
      // ¿La acera de este lado pisaría otra calzada (avenidas desdobladas, ramales)?
      const off = lado * (hw + 0.9);
      const pisa = [x0 + 0.5, (x0 + x1) / 2, x1 - 0.5].some((x) => enCalzada([s.a[0] + dx * x - dy * off, s.a[1] + dy * x + dx * off], s));
      if (pisa) continue;
      // Acera elevada con su bordillo.
      const z0 = lado * hw;
      const z1 = lado * (hw + 1.6);
      o.caja(Mat.Suelo, x0, 0, Math.min(z0, z1), x1, 0.32, Math.max(z0, z1), BALDOSA, 1, lado > 0 ? "z+" : "z-");
      o.caja(Mat.Detalle, x0, 0, lado > 0 ? z0 - 0.02 : z0 - 0.25, x1, 0.36, lado > 0 ? z0 + 0.25 : z0 + 0.02, BORDILLO, 0.75, lado > 0 ? "z+" : "z-");
      if (!o.fino) continue;
      // Mobiliario a lo largo de la acera.
      const zm = lado * (hw + 1.1);
      for (let x = x0 + 4 + r() * 6; x < x1 - 3; x += 9 + r() * 10) {
        const t = r();
        const y = 0.32;
        const g = o;
        g.oy = yAcera + y;
        if (t < 0.22) banco(o, x, zm, lado);
        else if (t < 0.4) papelera(o, x, zm);
        else if (t < 0.58) jardinera(o, x, zm, r);
        else if (t < 0.7) senal(o, x, zm + lado * 0.2, r);
        else if (t < 0.82 && s.clase <= 2) {
          for (let k = 0; k < 3; k++) bolardo(o, x + k * 1.2, lado * (hw + 0.45));
        }
        g.oy = yAcera;
      }
      // Coches aparcados en un lado de las calles de barrio.
      if (coches && lado === -1 && s.ancho >= 6) {
        const g = o;
        g.oy = suelo + 0.36;
        for (let x = x0 + 3; x < x1 - 3; x += 5 + r() * 2) if (r() < 0.55) coche(o, x, -hw + 1.25, r);
        g.oy = yAcera;
      }
    }
  }
  // (Las terrazas procedurales se han retirado: se colocaban a una altura fija delante de la
  // fachada, sin saber si debajo había acera, y quedaban flotando. Las terrazas reales van en
  // los sectores reconstruidos, apoyadas en su pavimento.)
  void tiendas;
}
