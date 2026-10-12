import * as THREE from "three";
import * as T from "./texturas";

/**
 * Arquitectura detallada de La Línea.
 *
 * Cada edificio real se convierte en geometría propia: muros con zócalo y
 * oclusión en la base, ventanas con marco, cristal y alféizar, rejas, persianas
 * y contraventanas, balcones con barandilla y macetas, cornisas, tejados de
 * teja árabe con relieve, azoteas con pretil, casetón, depósitos y antenas,
 * comercios con escaparate y toldo, bloques con forjados marcados…
 *
 * Para que sea rápido no se crean objetos de Three.js por pieza: un «escritor»
 * vuelca los vértices directamente en arrays agrupados por material, y cada
 * trozo de ciudad acaba en ~9 mallas (una por material).
 */

export const enum Mat { Muro, Ladrillo, Cristal, Luz, Teja, Detalle, Metal, Chapa, Suelo }
const N_MAT = 9;

export type RGB = readonly [number, number, number];
const cache = new Map<string, RGB>();
export const rgb = (hex: string): RGB => {
  let c = cache.get(hex);
  if (!c) {
    const k = new THREE.Color(hex);
    c = [k.r, k.g, k.b];
    cache.set(hex, c);
  }
  return c;
};
const tinte = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

type V3 = [number, number, number];

class Lote {
  p: number[] = [];
  n: number[] = [];
  c: number[] = [];
  u: number[] = [];
  i: number[] = [];
}

export class Obra {
  private lotes = Array.from({ length: N_MAT }, () => new Lote());
  private ox = 0;
  oy = 0;
  private oz = 0;
  ca = 1;
  sa = 0;
  /** Detalle fino (rejas, macetas, barrotes…): solo en los trozos más cercanos. */
  fino = true;
  /** Escala de UV (unidades del mundo por repetición de textura). */
  uvEsc = 0.25;

  /** Fija el sistema local de un edificio: origen en el mundo y giro (como rotation.y = −ang). */
  marco(x: number, y: number, z: number, ang: number) {
    this.ox = x;
    this.oy = y;
    this.oz = z;
    this.ca = Math.cos(ang);
    this.sa = Math.sin(ang);
  }

  private mundo(p: V3): V3 {
    return [this.ox + p[0] * this.ca - p[2] * this.sa, this.oy + p[1], this.oz + p[0] * this.sa + p[2] * this.ca];
  }

  /**
   * Polígono plano de 3 o 4 puntos (locales, en sentido antihorario visto desde fuera).
   * `ao`: oscurece los vértices a ras de suelo (sombra de contacto).
   */
  poli(m: Mat, pts: V3[], color: RGB, ao = 1, uvEsc = this.uvEsc) {
    const L = this.lotes[m];
    const base = L.p.length / 3;
    const [a, b, c] = pts;
    const e1: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    // Ejes del plano para las UV (en el mundo, para que las texturas casen entre piezas).
    const l1 = Math.hypot(...e1) || 1;
    const u1: V3 = [e1[0] / l1, e1[1] / l1, e1[2] / l1];
    const v1: V3 = [ny * u1[2] - nz * u1[1], nz * u1[0] - nx * u1[2], nx * u1[1] - ny * u1[0]];
    const wn: V3 = [nx * this.ca - nz * this.sa, ny, nx * this.sa + nz * this.ca];
    for (const p of pts) {
      const w = this.mundo(p);
      L.p.push(w[0], w[1], w[2]);
      L.n.push(wn[0], wn[1], wn[2]);
      const k = ao !== 1 && p[1] < 0.05 ? ao : 1;
      L.c.push(color[0] * k, color[1] * k, color[2] * k);
      const du = p[0] * u1[0] + p[1] * u1[1] + p[2] * u1[2];
      const dv = p[0] * v1[0] + p[1] * v1[1] + p[2] * v1[2];
      L.u.push((du + this.ox * 0.37) * uvEsc, (dv + this.oz * 0.23) * uvEsc);
    }
    L.i.push(base, base + 1, base + 2);
    if (pts.length === 4) L.i.push(base, base + 2, base + 3);
  }

  /**
   * Caja alineada con los ejes locales. Sin cara inferior (nunca se ve);
   * `sin` quita otras caras: "x+", "x-", "z+", "z-", "y+".
   */
  caja(m: Mat, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: RGB, ao = 1, sin = "") {
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    if (!sin.includes("x+")) this.poli(m, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], color, ao);
    if (!sin.includes("x-")) this.poli(m, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], color, ao);
    if (!sin.includes("z+")) this.poli(m, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], color, ao);
    if (!sin.includes("z-")) this.poli(m, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], color, ao);
    if (!sin.includes("y+")) this.poli(m, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], color);
  }

  /** Cilindro vertical (depósitos, mástiles, troncos de farola). */
  cilindro(m: Mat, x: number, y: number, z: number, r: number, h: number, color: RGB, seg = 8, tapa = true) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const p0: V3 = [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r];
      const p1: V3 = [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r];
      this.poli(m, [p1, p0, [p0[0], y + h, p0[2]], [p1[0], y + h, p1[2]]], tinte(color, 0.9 + 0.1 * Math.cos(a0)));
      if (tapa) this.poli(m, [[x, y + h, z], [p1[0], y + h, p1[2]], [p0[0], y + h, p0[2]]], color);
    }
  }

  /** Tejado a dos aguas (cumbrera a lo largo de x) o a cuatro aguas. */
  tejado(x0: number, x1: number, z0: number, z1: number, y: number, alto: number, color: RGB, muro: RGB, cuatro: boolean) {
    const zm = (z0 + z1) / 2;
    const yr = y + alto;
    const uv = 0.5;
    if (cuatro) {
      const r = Math.min((z1 - z0) / 2, (x1 - x0) / 2 - 0.01);
      this.poli(Mat.Teja, [[x0, y, z1], [x1, y, z1], [x1 - r, yr, zm], [x0 + r, yr, zm]], color, 1, uv);
      this.poli(Mat.Teja, [[x1, y, z0], [x0, y, z0], [x0 + r, yr, zm], [x1 - r, yr, zm]], color, 1, uv);
      this.poli(Mat.Teja, [[x1, y, z1], [x1, y, z0], [x1 - r, yr, zm]], tinte(color, 0.92), 1, uv);
      this.poli(Mat.Teja, [[x0, y, z0], [x0, y, z1], [x0 + r, yr, zm]], tinte(color, 0.92), 1, uv);
    } else {
      this.poli(Mat.Teja, [[x0, y, z1], [x1, y, z1], [x1, yr, zm], [x0, yr, zm]], color, 1, uv);
      this.poli(Mat.Teja, [[x1, y, z0], [x0, y, z0], [x0, yr, zm], [x1, yr, zm]], color, 1, uv);
      this.poli(Mat.Muro, [[x1, y, z1], [x1, y, z0], [x1, yr, zm]], muro);
      this.poli(Mat.Muro, [[x0, y, z0], [x0, y, z1], [x0, yr, zm]], muro);
    }
    // Caballete (cumbrera) y aleros.
    const rr = cuatro ? Math.min((z1 - z0) / 2, (x1 - x0) / 2 - 0.01) : 0;
    this.caja(Mat.Teja, x0 + rr - 0.1, yr - 0.05, zm - 0.18, x1 - rr + 0.1, yr + 0.18, zm + 0.18, tinte(color, 0.85));
  }

  geometrias() {
    return this.lotes.map((L) => {
      if (!L.i.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(L.p, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(L.n, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(L.c, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(L.u, 2));
      g.setIndex(L.i.length > 65535 ? new THREE.Uint32BufferAttribute(L.i, 1) : new THREE.Uint16BufferAttribute(L.i, 1));
      g.computeBoundingSphere();
      return g;
    });
  }

  get triangulos() {
    return this.lotes.reduce((s, L) => s + L.i.length / 3, 0);
  }
}

/* ── Materiales compartidos ─────────────────────────────────────────── */

let materiales: THREE.Material[] | null = null;
/** Ventanas iluminadas: su brillo sube al anochecer. */
export let matLuz: THREE.MeshStandardMaterial;

export function materialesArquitectura() {
  if (materiales) return materiales;
  const conTex = (tex: THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, ...extra });
  const teja = T.tejaArabe();
  matLuz = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.12, emissive: "#FFC56E", emissiveIntensity: 0, envMapIntensity: 1.4 });
  materiales = [
    conTex(T.estuco(), { roughness: 0.92 }),
    conTex(T.ladrilloLiso(), { roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.12, envMapIntensity: 1.4 }),
    matLuz,
    conTex(teja, { normalMap: T.tejaNormal(), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.65 }),
    conTex(T.chapa(), { roughness: 0.5, metalness: 0.35 }),
    conTex(T.acera(), { roughness: 0.9 }),
  ];
  return materiales;
}

/* ── Paletas mediterráneas ──────────────────────────────────────────── */

const BLANCOS = ["#FBFAF6", "#F7F3EA", "#FFFDF8", "#F3EFE6"];
const PASTELES = ["#F3D9A4", "#F5C9B0", "#DCE9D2", "#D6E4F2", "#F7E6B5", "#EBC9C3", "#E9D7C0"];
const OCRES = ["#E8C27A", "#E3B26A", "#D99E5C", "#EFD18E"];
const ZOCALOS = ["#8D97A3", "#C8A15F", "#7E8B9C", "#B9634A", "#5E7F99", "#D7CBB4"];
const PERSIANAS = ["#3E7D4E", "#6B4A2E", "#4F6F8F", "#2F5E44", "#8A5A35", "#F4F1EA"];
const MARCOS = ["#FFFFFF", "#F2EFE8", "#5B3B24", "#2B2D31"];
const TOLDOS = ["#2E7D4F", "#C0392B", "#1F5EFF", "#E6A93A", "#7E4E9C", "#2B8C8C"];
const CRISTAL = rgb("#7FA6C7");
const CRISTAL_OSCURO = rgb("#4F7598");
const HIERRO = rgb("#2A2D33");
const BARRO = rgb("#B4643F");
const HOJA = rgb("#4E9A3A");
const FLOR = [rgb("#E94B6A"), rgb("#F4C430"), rgb("#D9479B"), rgb("#FF7A3D")];

export interface Edificio {
  x: number;
  y: number;
  w: number;
  d: number;
  ang: number;
  h: number;
  /** 0-2 casa encalada, 3 casa pastel, 4 bloque, 5 ladrillo, 6 cristal, 7 nave, 8 iglesia, 9 escuela, 10 público, 11 ruina, 12 caseta, 13 pabellón. */
  estilo: number;
  teja: boolean;
  tono: number;
  pl: number;
  tienda: boolean;
  /** Lado que da a la calle: 0 z+, 1 x+, 2 z−, 3 x−. */
  frente: number;
  semilla: number;
  /**
   * Caras ciegas (bit `1 << lado`): medianeras pegadas a otro edificio. En ellas no se abren
   * huecos ni se cuelgan balcones, toldos o aparatos (nada puede quedar flotando o atravesar al vecino).
   */
  ciegas?: number;
}

function azar(s: number) {
  let v = (s % 2147483646) + 1;
  return () => ((v = (v * 16807) % 2147483647) / 2147483647);
}
const elegir = <T,>(r: () => number, l: readonly T[]) => l[Math.floor(r() * l.length) % l.length];

/**
 * Fachada: helpers para poner piezas sobre una cara del edificio.
 * `u` corre a lo largo de la cara (−L/2…L/2), `p` sale hacia fuera desde el muro.
 */
class Fachada {
  constructor(private o: Obra, private lado: number, private hw: number, private hd: number) {}
  get fino() {
    return this.o.fino;
  }
  get largo() {
    return this.lado % 2 === 0 ? this.hw * 2 : this.hd * 2;
  }
  caja(m: Mat, u0: number, u1: number, y0: number, y1: number, p0: number, p1: number, color: RGB, ao = 1) {
    const o = this.o;
    // Piezas casi planas (cristales, recercados): solo la cara frontal.
    const plana = p1 - p0 <= 0.06;
    switch (this.lado) {
      case 0: return o.caja(m, u0, y0, this.hd + p0, u1, y1, this.hd + p1, color, ao, plana ? "z-x+x-y+" : "z-");
      case 2: return o.caja(m, -u1, y0, -this.hd - p1, -u0, y1, -this.hd - p0, color, ao, plana ? "z+x+x-y+" : "z+");
      case 1: return o.caja(m, this.hw + p0, y0, -u1, this.hw + p1, y1, -u0, color, ao, plana ? "x-z+z-y+" : "x-");
      default: return o.caja(m, -this.hw - p1, y0, u0, -this.hw - p0, y1, u1, color, ao, plana ? "x+z+z-y+" : "x+");
    }
  }
}

interface Estilo {
  muro: RGB;
  mat: Mat;
  zocalo: RGB | null;
  recercado: RGB | null;
  marco: RGB;
  persiana: RGB;
  cornisa: RGB;
  balcon: number;
  reja: number;
  persianas: number;
  aire: number;
}

/** Ventana completa: recercado, marco, cristal (o luz), alféizar y persiana o contraventanas. */
function ventana(f: Fachada, r: () => number, e: Estilo, u: number, y: number, ancho: number, alto: number, planta: number, puerta = false) {
  const a = ancho / 2;
  if (e.recercado) f.caja(Mat.Detalle, u - a - 0.28, u + a + 0.28, y - 0.25, y + alto + 0.28, 0, 0.04, e.recercado);
  const luz = r() < 0.38 ? Mat.Luz : Mat.Cristal;
  const tono = r() < 0.5 ? CRISTAL : CRISTAL_OSCURO;
  const m = 0.12;
  // Marco: una pieza saliente con el cristal encajado delante (dos caras visibles de marco).
  f.caja(Mat.Detalle, u - a - m, u + a + m, y - 0.02, y + alto + m, 0, 0.1, e.marco);
  f.caja(luz, u - a, u + a, y, y + alto, 0.1, 0.12, tono);
  if (f.fino) {
    f.caja(Mat.Detalle, u - 0.04, u + 0.04, y, y + alto, 0.1, 0.16, e.marco);
    if (alto > 1.5) f.caja(Mat.Detalle, u - a, u + a, y + alto * 0.62, y + alto * 0.62 + 0.07, 0.1, 0.15, e.marco);
  }
  if (!puerta) f.caja(Mat.Detalle, u - a - 0.22, u + a + 0.22, y - 0.14, y, 0, 0.3, e.cornisa);
  const t = r();
  if (t < e.persianas) {
    // Persiana enrollable a media altura con su cajón.
    const baja = alto * (0.25 + r() * 0.5);
    f.caja(Mat.Detalle, u - a, u + a, y + alto - baja, y + alto, 0.12, 0.16, e.persiana);
    if (f.fino) f.caja(Mat.Detalle, u - a - 0.1, u + a + 0.1, y + alto + m, y + alto + m + 0.3, 0, 0.18, e.persiana);
  } else if (t < e.persianas + 0.25 && !puerta) {
    // Contraventanas abiertas a los lados.
    f.caja(Mat.Detalle, u - a - m - a * 0.95, u - a - m - 0.05, y, y + alto, 0.02, 0.1, e.persiana);
    f.caja(Mat.Detalle, u + a + m + 0.05, u + a + m + a * 0.95, y, y + alto, 0.02, 0.1, e.persiana);
  }
  if (planta === 0 && !puerta && r() < e.reja && f.fino) {
    // Reja andaluza saliente.
    const p = 0.35;
    for (let k = 0; k <= 4; k++) f.caja(Mat.Metal, u - a + (k * ancho) / 4 - 0.035, u - a + (k * ancho) / 4 + 0.035, y - 0.05, y + alto + 0.05, p - 0.04, p + 0.03, HIERRO);
    f.caja(Mat.Metal, u - a - 0.05, u + a + 0.05, y + alto + 0.02, y + alto + 0.1, 0, p + 0.03, HIERRO);
    f.caja(Mat.Metal, u - a - 0.05, u + a + 0.05, y - 0.12, y - 0.04, 0, p + 0.03, HIERRO);
  }
}

/** Balcón con losa, barandilla de forja y alguna maceta. */
function balcon(f: Fachada, r: () => number, e: Estilo, u: number, y: number, ancho: number, vuelo = 0.85) {
  const a = ancho / 2 + 0.45;
  f.caja(Mat.Detalle, u - a, u + a, y - 0.2, y, 0, vuelo, e.cornisa, 1);
  const H = 1.05;
  f.caja(Mat.Metal, u - a, u + a, y + H - 0.07, y + H, vuelo - 0.08, vuelo, HIERRO);
  f.caja(Mat.Metal, u - a, u + a, y + 0.12, y + 0.18, vuelo - 0.08, vuelo, HIERRO);
  if (f.fino) {
    const n = Math.max(3, Math.round((a * 2) / 0.55));
    for (let k = 1; k < n; k++) {
      const x = u - a + (k * 2 * a) / n;
      f.caja(Mat.Metal, x - 0.025, x + 0.025, y, y + H, vuelo - 0.06, vuelo - 0.02, HIERRO);
    }
  } else f.caja(Mat.Metal, u - a, u + a, y + 0.18, y + H - 0.07, vuelo - 0.05, vuelo - 0.04, rgb("#4A4E56"));
  for (const s of [-1, 1]) f.caja(Mat.Metal, u + s * a - 0.04, u + s * a + 0.04, y, y + H, 0.05, vuelo, HIERRO);
  if (r() < 0.55 && f.fino) {
    const n2 = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n2; k++) {
      const x = u - a + 0.4 + r() * (2 * a - 0.8);
      f.caja(Mat.Detalle, x - 0.18, x + 0.18, y, y + 0.38, vuelo - 0.45, vuelo - 0.12, BARRO);
      f.caja(Mat.Detalle, x - 0.26, x + 0.26, y + 0.38, y + 0.75, vuelo - 0.5, vuelo - 0.06, r() < 0.5 ? elegir(r, FLOR) : HOJA);
    }
  }
}

function puerta(f: Fachada, r: () => number, e: Estilo, u: number, ancho = 1.3, alto = 2.4) {
  const a = ancho / 2;
  const madera = elegir(r, ["#6B3F22", "#4A2C18", "#2F5E44", "#3B4F7A", "#8A5A35"]);
  if (e.recercado) f.caja(Mat.Detalle, u - a - 0.3, u + a + 0.3, 0, alto + 0.3, 0, 0.04, e.recercado);
  f.caja(Mat.Detalle, u - a, u + a, 0, alto, 0, 0.08, rgb(madera), 0.8);
  f.caja(Mat.Detalle, u - a - 0.12, u + a + 0.12, alto, alto + 0.14, 0, 0.16, e.marco);
  f.caja(Mat.Detalle, u - a - 0.2, u + a + 0.2, 0, 0.16, 0, 0.45, rgb("#BDB6A8"), 0.8);
  if (f.fino) f.caja(Mat.Metal, u + a - 0.3, u + a - 0.18, alto * 0.45, alto * 0.5, 0.08, 0.14, rgb("#C9A64B"));
}

/** Planta baja comercial: escaparate, puerta de cristal, rótulo y toldo. */
function comercio(f: Fachada, r: () => number, u0: number, u1: number, altoPB: number) {
  const toldo = rgb(elegir(r, TOLDOS));
  f.caja(Mat.Detalle, u0, u1, 0, altoPB, 0, 0.06, rgb("#3A3F47"), 0.8);
  f.caja(Mat.Luz, u0 + 0.25, u1 - 0.25, 0.35, altoPB - 0.6, 0.06, 0.1, CRISTAL);
  if (f.fino) for (let x = u0 + 0.25; x < u1 - 0.2; x += 2.2) f.caja(Mat.Metal, x, x + 0.08, 0.35, altoPB - 0.6, 0.06, 0.13, HIERRO);
  f.caja(Mat.Detalle, u0 + 0.1, u1 - 0.1, altoPB - 0.55, altoPB - 0.05, 0.06, 0.2, rgb(elegir(r, ["#FFFFFF", "#F4C430", "#1F5EFF", "#2B2D31", "#C0392B"])));
  // Toldo inclinado en franjas.
  const n = f.fino ? Math.max(2, Math.round((u1 - u0) / 0.8)) : 1;
  for (let k = 0; k < n; k++) {
    const a = u0 + ((u1 - u0) * k) / n;
    const b = u0 + ((u1 - u0) * (k + 1)) / n;
    const c = k % 2 ? rgb("#FFFFFF") : toldo;
    f.caja(Mat.Detalle, a, b, altoPB + 0.05, altoPB + 0.25, 0.1, 1.5, c);
  }
  f.caja(Mat.Detalle, u0, u1, altoPB - 0.25, altoPB + 0.05, 1.4, 1.55, toldo);
}

/** Azotea: solería, pretil con albardilla, casetón, depósitos, antenas, placas y tendederos. */
function azotea(o: Obra, r: () => number, e: Estilo, hw: number, hd: number, h: number, grande: boolean) {
  const suelo = rgb(elegir(r, ["#BDB5A8", "#B9B2A6", "#D6CFC2", "#C9A48C", "#CFC7BA", "#C98A68"]));
  o.caja(Mat.Detalle, -hw + 0.2, h, -hd + 0.2, hw - 0.2, h + 0.12, hd - 0.2, suelo, 1, "x+x-z+z-");
  const t = 0.28;
  const ph = 0.95;
  o.caja(Mat.Muro, -hw, h, hd - t, hw, h + ph, hd, e.muro);
  o.caja(Mat.Muro, -hw, h, -hd, hw, h + ph, -hd + t, e.muro);
  o.caja(Mat.Muro, hw - t, h, -hd + t, hw, h + ph, hd - t, e.muro);
  o.caja(Mat.Muro, -hw, h, -hd + t, -hw + t, h + ph, hd - t, e.muro);
  const alb = e.cornisa;
  o.caja(Mat.Detalle, -hw - 0.06, h + ph, hd - t - 0.04, hw + 0.06, h + ph + 0.12, hd + 0.06, alb);
  o.caja(Mat.Detalle, -hw - 0.06, h + ph, -hd - 0.06, hw + 0.06, h + ph + 0.12, -hd + t + 0.04, alb);
  o.caja(Mat.Detalle, hw - t - 0.04, h + ph, -hd + t, hw + 0.06, h + ph + 0.12, hd - t, alb);
  o.caja(Mat.Detalle, -hw - 0.06, h + ph, -hd + t, -hw + t + 0.04, h + ph + 0.12, hd - t, alb);
  const iw = hw - 0.8;
  const id = hd - 0.8;
  if (iw < 0.8 || id < 0.8 || !o.fino) return;
  const pos = () => [(r() * 2 - 1) * iw, (r() * 2 - 1) * id] as const;
  if (grande || r() < 0.35) {
    // Casetón de la escalera con su puerta.
    const [x, z] = [(r() - 0.5) * iw, (r() - 0.5) * id];
    const cw = Math.min(1.4, iw * 0.6);
    const cd = Math.min(1.2, id * 0.6);
    o.caja(Mat.Muro, x - cw, h, z - cd, x + cw, h + 2.4, z + cd, e.muro, 0.75);
    o.caja(Mat.Detalle, x - cw - 0.1, h + 2.4, z - cd - 0.1, x + cw + 0.1, h + 2.55, z + cd + 0.1, alb);
    o.caja(Mat.Detalle, x - 0.45, h, z + cd, x + 0.45, h + 1.9, z + cd + 0.06, rgb("#5B3B24"));
  }
  const nDep = grande ? 2 + Math.floor(r() * 3) : r() < 0.6 ? 1 : 0;
  for (let k = 0; k < nDep; k++) {
    const [x, z] = pos();
    const negro = r() < 0.3;
    o.caja(Mat.Metal, x - 0.45, h + 0.1, z - 0.45, x + 0.45, h + 0.45, z + 0.45, HIERRO);
    o.cilindro(Mat.Detalle, x, h + 0.45, z, 0.55, 1.1, rgb(negro ? "#2E3238" : "#F2F2EE"), 10);
  }
  if (r() < (grande ? 0.9 : 0.4)) {
    const [x, z] = pos();
    o.cilindro(Mat.Metal, x, h + 0.1, z, 0.05, 3.6, HIERRO, 5, false);
    for (const [y, l] of [[3, 1.4], [2.5, 1.1], [2, 0.8]] as const) o.caja(Mat.Metal, x - l / 2, h + y, z - 0.03, x + l / 2, h + y + 0.05, z + 0.03, HIERRO);
  }
  if (r() < 0.4) {
    const [x, z] = pos();
    o.caja(Mat.Metal, x - 1.2, h + 0.1, z - 0.7, x + 1.2, h + 0.25, z + 0.7, rgb("#9AA4B2"));
    o.poli(Mat.Cristal, [[x - 1.2, h + 0.35, z + 0.7], [x + 1.2, h + 0.35, z + 0.7], [x + 1.2, h + 1.1, z - 0.6], [x - 1.2, h + 1.1, z - 0.6]], rgb("#1F3B66"));
  }
  if (r() < 0.35 && iw > 1.6) {
    // Tendedero con ropa.
    const [x, z] = pos();
    for (const s of [-1, 1]) o.cilindro(Mat.Metal, x + s * 1.4, h + 0.1, z, 0.04, 1.6, HIERRO, 4, false);
    o.caja(Mat.Detalle, x - 1.4, h + 1.6, z - 0.02, x + 1.4, h + 1.64, z + 0.02, rgb("#DDDDDD"));
    for (let k = 0; k < 4; k++) {
      const px = x - 1.1 + k * 0.7;
      o.caja(Mat.Detalle, px - 0.22, h + 1.0, z - 0.02, px + 0.22, h + 1.6, z + 0.02, rgb(elegir(r, ["#FFFFFF", "#7FB3E8", "#F7C6D0", "#F4D35E", "#FFFFFF"])));
    }
  }
  if (r() < 0.45) {
    // Aire acondicionado.
    const [x, z] = pos();
    o.caja(Mat.Detalle, x - 0.5, h + 0.1, z - 0.35, x + 0.5, h + 0.8, z + 0.35, rgb("#E4E7EB"));
  }
  if (!grande && r() < 0.25) {
    // Macetones en la azotea.
    const [x, z] = pos();
    o.caja(Mat.Detalle, x - 0.3, h + 0.1, z - 0.3, x + 0.3, h + 0.6, z + 0.3, BARRO);
    o.caja(Mat.Detalle, x - 0.45, h + 0.6, z - 0.45, x + 0.45, h + 1.3, z + 0.45, HOJA);
  }
}

/** Reparto de huecos a lo largo de una fachada. */
function huecos(largo: number, paso: number) {
  const n = Math.floor((largo - 0.8) / paso);
  if (n <= 0) return largo >= 2.2 ? [0] : [];
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(-((n - 1) * paso) / 2 + k * paso);
  return out;
}

/** Vivienda o bloque residencial (estilos 0-6, 9, 10). */
function residencial(o: Obra, b: Edificio, r: () => number) {
  const hw = b.w / 2;
  const hd = b.d / 2;
  const bloque = b.estilo >= 4 && b.estilo <= 6;
  const publico = b.estilo === 9 || b.estilo === 10;
  const encalada = b.estilo <= 2;
  const muroHex = encalada ? elegir(r, BLANCOS) : b.estilo === 3 ? elegir(r, PASTELES) : b.estilo === 5 ? "#FFFFFF" : publico ? elegir(r, ["#F4EBDA", "#F2D9A0", "#FFFFFF"]) : elegir(r, [...PASTELES, ...OCRES, ...BLANCOS]);
  const e: Estilo = {
    muro: rgb(muroHex),
    mat: b.estilo === 5 ? Mat.Ladrillo : Mat.Muro,
    zocalo: bloque && r() < 0.5 ? null : rgb(elegir(r, ZOCALOS)),
    recercado: encalada && r() < 0.55 ? rgb(elegir(r, OCRES)) : null,
    marco: rgb(bloque ? elegir(r, ["#FFFFFF", "#2B2D31", "#9AA4B2"]) : elegir(r, MARCOS)),
    persiana: rgb(elegir(r, bloque ? ["#D8D2C4", "#9AA4B2", "#E9E4D8", "#6B4A2E"] : PERSIANAS)),
    cornisa: rgb(encalada ? elegir(r, ["#FFFFFF", "#EFE6D2", "#E8C27A"]) : elegir(r, ["#FFFFFF", "#F2EBDD", "#D9CFBF"])),
    balcon: bloque ? 0.75 : 0.45,
    reja: encalada || b.estilo === 3 ? 0.75 : 0.15,
    persianas: bloque ? 0.55 : 0.5,
    aire: bloque ? 0.22 : 0.08,
  };
  const FH = (b.h - (b.teja ? 0 : 0.2)) / Math.max(1, b.pl);
  const H = b.h;
  // Vuelo de molduras por lado: cero en las medianeras (no invaden al vecino).
  const vuelo = (lado: number, v: number) => ((b.ciegas ?? 0) & (1 << lado) ? 0 : v);
  const banda = (y0: number, y1: number, v: number, color: RGB, ao = 1, sin = "") =>
    o.caja(Mat.Detalle, -hw - vuelo(3, v), y0, -hd - vuelo(2, v), hw + vuelo(1, v), y1, hd + vuelo(0, v), color, ao, sin);
  // Cuerpo con oclusión en la base, zócalo y cornisa.
  o.caja(e.mat, -hw, 0, -hd, hw, H, hd, e.muro, 0.62, "y+");
  if (e.zocalo) banda(0, 0.85, 0.05, e.zocalo, 0.7, "y+");
  if (bloque || publico) for (let p = 1; p < b.pl; p++) banda(p * FH - 0.12, p * FH + 0.1, 0.06, e.cornisa, 1, "y+");
  banda(H - 0.3, H, 0.22, e.cornisa);
  const ciega = (lado: number) => !!((b.ciegas ?? 0) & (1 << lado));
  if (encalada && r() < 0.4 && !b.ciegas) {
    // Pilastras de esquina en albero.
    const c = rgb(elegir(r, OCRES));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.caja(Mat.Detalle, sx * hw - 0.25, 0.85, sz * hd - 0.25, sx * hw + 0.25, H - 0.3, sz * hd + 0.25, c, 1, "y+");
  }
  const paso = bloque ? 2.9 : 2.7;
  for (let lado = 0; lado < 4; lado++) {
    // Medianera: pared lisa y continua, sin huecos ni piezas salientes.
    if (ciega(lado)) continue;
    const f = new Fachada(o, lado, hw, hd);
    const L = f.largo;
    const pos = huecos(L, paso);
    const frente = lado === b.frente;
    const puertaEn = frente && pos.length ? pos[Math.floor(pos.length / 2)] : null;
    // Planta baja comercial en las calles principales.
    if (b.tienda && (frente || L > 10) && L > 4) {
      comercio(f, r, -L / 2 + 0.3, L / 2 - 0.3, Math.min(FH, 3.4) - 0.1);
    }
    for (let p = 0; p < b.pl; p++) {
      if (p === 0 && b.tienda && (frente || L > 10) && L > 4) continue;
      const y0 = p * FH;
      for (const u of pos) {
        if (p === 0 && u === puertaEn) {
          puerta(f, r, e, u, publico ? 2.2 : 1.3, Math.min(FH - 0.5, publico ? 3 : 2.4));
          continue;
        }
        const conBalcon = p > 0 && r() < e.balcon;
        const ancho = bloque ? 1.4 : 1.15;
        if (conBalcon) {
          ventana(f, r, e, u, y0 + 0.15, ancho, Math.min(FH - 0.8, 2.35), p, true);
          balcon(f, r, e, u, y0 + 0.15, ancho);
        } else {
          const alto = Math.min(FH - 1.4, bloque ? 1.75 : 1.65);
          if (alto > 0.6) ventana(f, r, e, u, y0 + Math.max(0.95, (FH - alto) / 2), ancho, alto, p);
        }
        if (p > 0 && r() < e.aire && f.fino) f.caja(Mat.Detalle, u + 0.9, u + 1.75, y0 + 0.4, y0 + 1.0, 0, 0.45, rgb("#E4E7EB"));
      }
    }
  }
  // Pórtico y banderas en los edificios públicos.
  if (publico && !ciega(b.frente)) {
    const f = new Fachada(o, b.frente, hw, hd);
    const pw = Math.min(f.largo * 0.4, 6);
    f.caja(Mat.Detalle, -pw / 2, pw / 2, Math.min(FH, 3.6), Math.min(FH, 3.6) + 0.35, 0, 2.4, e.cornisa);
    for (const s of [-1, 1]) f.caja(Mat.Detalle, s * pw / 2 - 0.25, s * pw / 2 + 0.25, 0, Math.min(FH, 3.6), 2.0, 2.4, rgb("#FFFFFF"));
    const banderas = [["#2E8B57", "#FFFFFF"], ["#C60B1E", "#FFC400"], ["#1F5EFF", "#FFFFFF"]];
    banderas.forEach(([a, c], k) => {
      const u = -1.2 + k * 1.2;
      f.caja(Mat.Metal, u - 0.04, u + 0.04, H, H + 3.4, 0.1, 0.18, HIERRO);
      f.caja(Mat.Detalle, u + 0.04, u + 1.0, H + 2.6, H + 3.3, 0.12, 0.16, rgb(a));
      f.caja(Mat.Detalle, u + 0.04, u + 1.0, H + 2.83, H + 3.07, 0.11, 0.17, rgb(c));
    });
  }
  // Cubierta.
  if (b.teja) {
    const ov = 0.45;
    const tejaC = tinte(rgb("#FFFFFF"), 0.88 + r() * 0.14);
    const largoX = b.w >= b.d;
    const alto = Math.min(b.w, b.d) * (0.28 + r() * 0.1);
    if (largoX) o.tejado(-hw - vuelo(3, ov), hw + vuelo(1, ov), -hd - vuelo(2, ov), hd + vuelo(0, ov), H, alto, tejaC, e.muro, r() < 0.5);
    else {
      // Cumbrera a lo largo de z: giramos el sistema local 90°.
      const g = o;
      const [ca, sa] = [g.ca, g.sa];
      g.ca = -sa;
      g.sa = ca;
      // En el sistema girado: x nueva = z antigua; z nueva = −x antigua.
      o.tejado(-hd - vuelo(2, ov), hd + vuelo(0, ov), -hw - vuelo(1, ov), hw + vuelo(3, ov), H, alto, tejaC, e.muro, r() < 0.5);
      g.ca = ca;
      g.sa = sa;
    }
    if (r() < 0.55) {
      // Chimenea encalada con sombrerete.
      const x = (r() - 0.5) * hw;
      const z = (r() - 0.5) * hd * 0.6;
      o.caja(Mat.Muro, x - 0.35, H, z - 0.35, x + 0.35, H + alto + 1.1, z + 0.35, e.muro);
      o.caja(Mat.Teja, x - 0.5, H + alto + 1.1, z - 0.5, x + 0.5, H + alto + 1.3, z + 0.5, tejaC);
    }
  } else {
    azotea(o, r, e, hw, hd, H, bloque || publico);
  }
}

/** Fachada de muro cortina con montantes y forjados (oficinas). */
function oficina(o: Obra, b: Edificio, r: () => number) {
  const hw = b.w / 2;
  const hd = b.d / 2;
  const H = b.h;
  const vidrio = rgb(elegir(r, ["#6E9CC4", "#5C8FB8", "#7FB0C9", "#4F7598"]));
  o.caja(Mat.Detalle, -hw, 0, -hd, hw, 3.2, hd, rgb("#3A3F47"), 0.6, "y+");
  o.caja(Mat.Cristal, -hw + 0.1, 3.2, -hd + 0.1, hw - 0.1, H, hd - 0.1, vidrio, 1, "y+");
  for (let lado = 0; lado < 4; lado++) {
    const f = new Fachada(o, lado, hw - 0.1, hd - 0.1);
    const L = f.largo;
    for (let u = -L / 2; u <= L / 2 + 0.01; u += o.fino ? 2 : 4) f.caja(Mat.Metal, u - 0.06, u + 0.06, 3.2, H, 0, 0.12, rgb("#D8DCE2"));
    for (let y = 3.2; y < H; y += 3.3) {
      f.caja(Mat.Detalle, -L / 2, L / 2, y - 0.2, y + 0.15, 0, 0.18, rgb("#EEF1F4"));
      if (r() < 0.5) f.caja(Mat.Luz, -L / 2 + 0.2, L / 2 - 0.2, y + 0.2, y + 3.0, 0.01, 0.03, vidrio);
    }
  }
  o.caja(Mat.Detalle, -hw - 0.15, H, -hd - 0.15, hw + 0.15, H + 0.5, hd + 0.15, rgb("#EEF1F4"));
  azotea(o, r, { muro: rgb("#EEF1F4"), mat: Mat.Muro, zocalo: null, recercado: null, marco: rgb("#FFFFFF"), persiana: rgb("#FFFFFF"), cornisa: rgb("#FFFFFF"), balcon: 0, reja: 0, persianas: 0, aire: 0 }, hw, hd, H + 0.5, true);
}

/** Nave industrial de chapa con portón y lucernarios. */
function nave(o: Obra, b: Edificio, r: () => number) {
  const hw = b.w / 2;
  const hd = b.d / 2;
  const H = b.h;
  const color = rgb(elegir(r, ["#FFFFFF", "#E7EEF6", "#F3EFE6", "#DDE6EF"]));
  o.caja(Mat.Chapa, -hw, 0, -hd, hw, H, hd, color, 0.6, "y+");
  o.caja(Mat.Detalle, -hw - 0.05, 0, -hd - 0.05, hw + 0.05, 1.2, hd + 0.05, rgb("#9AA4B2"), 0.7, "y+");
  const f = new Fachada(o, b.frente, hw, hd);
  const pw = Math.min(f.largo * 0.5, 6);
  f.caja(Mat.Chapa, -pw / 2, pw / 2, 0, Math.min(H - 1, 5), 0, 0.1, rgb(elegir(r, ["#2F6DB5", "#C0392B", "#9AA4B2", "#2E7D4F"])), 0.8);
  f.caja(Mat.Detalle, -f.largo / 2, f.largo / 2, H - 1.4, H - 0.6, 0, 0.08, rgb(elegir(r, ["#1F5EFF", "#C0392B", "#2B2D31"])));
  const largoX = b.w >= b.d;
  const g = o;
  const [ca, sa] = [g.ca, g.sa];
  if (!largoX) {
    g.ca = -sa;
    g.sa = ca;
  }
  const [lx, lz] = largoX ? [hw, hd] : [hd, hw];
  const cub = rgb(elegir(r, ["#9AA4B2", "#B7BFCA", "#7E8B9C", "#C9CED6"]));
  o.poli(Mat.Chapa, [[-lx - 0.3, H, lz + 0.3], [lx + 0.3, H, lz + 0.3], [lx + 0.3, H + 1.2, 0], [-lx - 0.3, H + 1.2, 0]], cub);
  o.poli(Mat.Chapa, [[lx + 0.3, H, -lz - 0.3], [-lx - 0.3, H, -lz - 0.3], [-lx - 0.3, H + 1.2, 0], [lx + 0.3, H + 1.2, 0]], cub);
  o.poli(Mat.Chapa, [[lx, H, lz], [lx, H, -lz], [lx, H + 1.2, 0]], color);
  o.poli(Mat.Chapa, [[-lx, H, -lz], [-lx, H, lz], [-lx, H + 1.2, 0]], color);
  for (let x = -lx + 2; x < lx - 2; x += 4) o.poli(Mat.Cristal, [[x - 0.6, H + 0.32, lz * 0.62], [x + 0.6, H + 0.32, lz * 0.62], [x + 0.6, H + 0.75, lz * 0.27], [x - 0.6, H + 0.75, lz * 0.27]], rgb("#BFD9EC"));
  g.ca = ca;
  g.sa = sa;
}

/** Iglesia o capilla genérica: nave con tejado, espadaña con campana y cruz. */
function iglesia(o: Obra, b: Edificio, r: () => number) {
  const hw = b.w / 2;
  const hd = b.d / 2;
  const H = b.h;
  const muro = rgb("#FBF7EE");
  const albero = rgb("#E8C27A");
  o.caja(Mat.Muro, -hw, 0, -hd, hw, H, hd, muro, 0.62);
  o.caja(Mat.Detalle, -hw - 0.05, 0, -hd - 0.05, hw + 0.05, 1, hd + 0.05, albero, 0.7, "y+");
  o.tejado(-hw - 0.4, hw + 0.4, -hd - 0.4, hd + 0.4, H, Math.min(b.w, b.d) * 0.3, rgb("#FFFFFF"), muro, false);
  const f = new Fachada(o, b.frente, hw, hd);
  f.caja(Mat.Detalle, -1.6, 1.6, 0, 4.2, 0, 0.1, albero);
  f.caja(Mat.Detalle, -1.1, 1.1, 0, 3.6, 0.1, 0.16, rgb("#5B3B24"), 0.8);
  // Espadaña sobre la fachada.
  f.caja(Mat.Muro, -2.2, 2.2, H, H + 5, -0.6, 0, muro);
  f.caja(Mat.Detalle, -2.4, 2.4, H + 5, H + 5.3, -0.7, 0.1, albero);
  f.caja(Mat.Detalle, -0.7, 0.7, H + 1.8, H + 3.8, 0, 0.05, rgb("#2B2D31"));
  f.caja(Mat.Metal, -0.35, 0.35, H + 2.1, H + 2.9, 0.06, 0.4, rgb("#B08D3C"));
  f.caja(Mat.Metal, -0.08, 0.08, H + 5.3, H + 7, -0.4, -0.2, HIERRO);
  f.caja(Mat.Metal, -0.5, 0.5, H + 6.3, H + 6.45, -0.4, -0.2, HIERRO);
  void r;
}

function ruina(o: Obra, b: Edificio, r: () => number) {
  const hw = b.w / 2;
  const hd = b.d / 2;
  const piedra = rgb("#D8C7A4");
  o.caja(Mat.Suelo, -hw, 0, -hd, hw, 0.15, hd, rgb("#B9A988"));
  const muros: [number, number, number, number][] = [[-hw, -hd, hw, -hd + 0.6], [-hw, -hd, -hw + 0.6, hd], [hw - 0.6, -hd, hw, hd * (0.2 + r() * 0.6)]];
  for (const [x0, z0, x1, z1] of muros) o.caja(Mat.Muro, x0, 0, z0, x1, 1.2 + r() * 1.6, z1, piedra, 0.7);
}

function caseta(o: Obra, b: Edificio, r: () => number) {
  const hw = b.w / 2;
  const hd = b.d / 2;
  const muro = rgb(elegir(r, BLANCOS));
  o.caja(Mat.Muro, -hw, 0, -hd, hw, b.h, hd, muro, 0.65);
  o.caja(Mat.Chapa, -hw - 0.2, b.h, -hd - 0.2, hw + 0.2, b.h + 0.18, hd + 0.2, rgb("#B7BFCA"));
  const f = new Fachada(o, b.frente, hw, hd);
  if (f.largo > 1.4) f.caja(Mat.Detalle, -0.5, 0.5, 0, Math.min(2, b.h - 0.3), 0, 0.06, rgb(elegir(r, ["#2F5E44", "#5B3B24", "#4F6F8F"])), 0.8);
}

/** Pabellón deportivo: muro blanco con franja azul, lucernarios y cubierta curva. */
function pabellon(o: Obra, b: Edificio, r: () => number) {
  const hw = b.w / 2;
  const hd = b.d / 2;
  const H = b.h;
  o.caja(Mat.Muro, -hw, 0, -hd, hw, H, hd, rgb("#F4F6F8"), 0.6, "y+");
  o.caja(Mat.Detalle, -hw - 0.05, H * 0.55, -hd - 0.05, hw + 0.05, H * 0.75, hd + 0.05, rgb("#1F3F8F"), 1, "y+");
  for (let lado = 0; lado < 4; lado++) {
    const f = new Fachada(o, lado, hw, hd);
    for (const u of huecos(f.largo, 3)) f.caja(Mat.Cristal, u - 0.9, u + 0.9, 1.2, H * 0.5, 0, 0.06, CRISTAL);
  }
  // Cubierta en bóveda (segmentos).
  const largoX = b.w >= b.d;
  const g = o;
  const [ca, sa] = [g.ca, g.sa];
  if (!largoX) {
    g.ca = -sa;
    g.sa = ca;
  }
  const [lx, lz] = largoX ? [hw, hd] : [hd, hw];
  const n = 8;
  const flecha = Math.min(lz * 0.35, 3);
  for (let k = 0; k < n; k++) {
    const a0 = -lz + (2 * lz * k) / n;
    const a1 = -lz + (2 * lz * (k + 1)) / n;
    const y0 = H + flecha * (1 - (a0 / lz) ** 2);
    const y1 = H + flecha * (1 - (a1 / lz) ** 2);
    o.poli(Mat.Chapa, [[lx + 0.2, y0, a0], [-lx - 0.2, y0, a0], [-lx - 0.2, y1, a1], [lx + 0.2, y1, a1]], rgb("#C9CED6"));
    o.poli(Mat.Muro, [[lx, H, a0], [lx, H, a1], [lx, y1, a1], [lx, y0, a0]], rgb("#F4F6F8"));
    o.poli(Mat.Muro, [[-lx, H, a1], [-lx, H, a0], [-lx, y0, a0], [-lx, y1, a1]], rgb("#F4F6F8"));
  }
  g.ca = ca;
  g.sa = sa;
  void r;
}

/** Vuelca un edificio completo en la obra. */
export function edificar(o: Obra, b: Edificio, x: number, y: number, z: number) {
  o.marco(x, y, z, b.ang);
  const r = azar(b.semilla);
  switch (b.estilo) {
    case 6: return b.pl >= 4 ? oficina(o, b, r) : residencial(o, b, r);
    case 7: return nave(o, b, r);
    case 8: return iglesia(o, b, r);
    case 11: return ruina(o, b, r);
    case 12: return caseta(o, b, r);
    case 13: return pabellon(o, b, r);
    default: return residencial(o, b, r);
  }
}
