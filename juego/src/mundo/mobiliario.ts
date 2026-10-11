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
const SOMBRILLAS = ["#FFFFFF", "#C0392B", "#2E7D4F", "#1F5EFF", "#F2C230"].map(rgb);

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

/** Coche aparcado orientado a lo largo de la calle. */
export function coche(o: Obra, x: number, z: number, r: () => number) {
  const c = COCHES[Math.floor(r() * COCHES.length)];
  const L = 2 + r() * 0.4;
  const W = 0.95;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.caja(Mat.Metal, x + sx * L * 0.62 - 0.3, 0, z + sz * W - 0.12, x + sx * L * 0.62 + 0.3, 0.6, z + sz * W + 0.12, rgb("#1C1D21"));
  o.caja(Mat.Metal, x - L, 0.25, z - W, x + L, 1.05, z + W, c, 0.7);
  o.caja(Mat.Cristal, x - L * 0.55, 1.05, z - W * 0.86, x + L * 0.4, 1.75, z + W * 0.86, rgb("#2E4560"));
  o.caja(Mat.Metal, x - L * 0.5, 1.75, z - W * 0.8, x + L * 0.35, 1.85, z + W * 0.8, c);
  o.caja(Mat.Detalle, x + L - 0.05, 0.55, z - W * 0.7, x + L + 0.02, 0.75, z - W * 0.35, rgb("#FFF4C8"));
  o.caja(Mat.Detalle, x + L - 0.05, 0.55, z + W * 0.35, x + L + 0.02, 0.75, z + W * 0.7, rgb("#FFF4C8"));
  o.caja(Mat.Detalle, x - L - 0.02, 0.55, z - W * 0.7, x - L + 0.05, 0.75, z - W * 0.35, rgb("#C0392B"));
  o.caja(Mat.Detalle, x - L - 0.02, 0.55, z + W * 0.35, x - L + 0.05, 0.75, z + W * 0.7, rgb("#C0392B"));
}

/** Terraza de bar: mesas, sillas y sombrillas. */
function terraza(o: Obra, x: number, z: number, r: () => number) {
  const tela = SOMBRILLAS[Math.floor(r() * SOMBRILLAS.length)];
  for (let k = 0; k < 2; k++) {
    const mx = x + (k - 0.5) * 2.6;
    o.cilindro(Mat.Metal, mx, 0, z, 0.05, 0.75, HIERRO, 4, false);
    o.cilindro(Mat.Detalle, mx, 0.75, z, 0.45, 0.06, rgb("#F2F2EE"), 8);
    for (const s of [-1, 1]) {
      o.caja(Mat.Detalle, mx + s * 0.75 - 0.22, 0.42, z - 0.22, mx + s * 0.75 + 0.22, 0.48, z + 0.22, rgb("#C9A06A"));
      o.caja(Mat.Detalle, mx + s * 0.97 - 0.04, 0.42, z - 0.22, mx + s * 0.97 + 0.04, 0.95, z + 0.22, rgb("#C9A06A"));
    }
    // Sombrilla: mástil y cono de cuatro caras.
    o.cilindro(Mat.Metal, mx, 0.75, z, 0.04, 1.6, HIERRO, 4, false);
    const y0 = 2.1;
    const y1 = 2.75;
    const R = 1.25;
    o.poli(Mat.Detalle, [[mx - R, y0, z + R], [mx + R, y0, z + R], [mx, y1, z]], tela);
    o.poli(Mat.Detalle, [[mx + R, y0, z + R], [mx + R, y0, z - R], [mx, y1, z]], tela);
    o.poli(Mat.Detalle, [[mx + R, y0, z - R], [mx - R, y0, z - R], [mx, y1, z]], tela);
    o.poli(Mat.Detalle, [[mx - R, y0, z - R], [mx - R, y0, z + R], [mx, y1, z]], tela);
  }
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
  // Terrazas delante de los comercios.
  if (o.fino) {
    for (const b of tiendas) {
      if (r() > 0.35) continue;
      const lado = b.frente;
      const dist = (lado % 2 === 0 ? b.d : b.w) / 2 + 2.6;
      const ux = [0, 1, 0, -1][lado];
      const uz = [1, 0, -1, 0][lado];
      o.marco(b.x - cx, suelo + 0.52, b.y - cy, b.ang);
      terraza(o, ux * dist, uz * dist, r);
    }
  }
}
