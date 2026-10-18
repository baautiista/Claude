import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Vegetación mediterránea: pino piñonero, ficus, árbol de sombra, naranjo,
 * palmera y arbustos. Copas orgánicas hechas de racimos de volúmenes deformados
 * con color por cara (hojas diferenciadas, más oscuras por dentro y por abajo),
 * troncos con ramas, y un balanceo suave por viento en el shader.
 *
 * Dos niveles: «hi» para los trozos cercanos y «lo» (muy ligero) para el resto.
 */

export const enum Especie { Pino, Ficus, Sombra, Naranjo, Palmera, Arbusto, Cipres, Araucaria, Drago }
export const N_ESPECIES = 9;
/** Especies con hojas de doble cara sin recorte (frondas de palmera, rosetas de drago). */
export const conFrondas = (e: Especie) => e === Especie.Palmera || e === Especie.Drago;
export const VARIANTES = 3;

function azar(s: number) {
  let v = (s % 2147483646) + 1;
  return () => ((v = (v * 16807) % 2147483647) / 2147483647);
}

/** Ruido determinista por posición: los vértices compartidos se desplazan igual (sin grietas). */
function ruido(x: number, y: number, z: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

function pintar(g: THREE.BufferGeometry, color: (y: number, i: number) => THREE.Color) {
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    const y = (g.attributes.position.getY(i) + g.attributes.position.getY(i + 1) + g.attributes.position.getY(i + 2)) / 3;
    const k = color(y, i);
    for (let j = 0; j < 3; j++) c.set([k.r, k.g, k.b], (i + j) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return g;
}

/**
 * Volumen de hojas: icosaedro con vértices soldados y deformados (superficie continua,
 * sin facetas), normales suaves y moteado por vértice: claros y sombras de hojas,
 * más oscuro por dentro y por abajo (oclusión), más claro arriba (luz del cielo).
 */
function volumen(r: number, x: number, y: number, z: number, aplastar: number, tonos: THREE.Color[], detalle: number, rnd: () => number, base: number, alto: number) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, detalle);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i);
    const vy = p.getY(i);
    const vz = p.getZ(i);
    // Bultos de hojas: ruido grueso + fino.
    const k = 1 + (ruido(vx * 0.9 + x, vy * 0.9 + y, vz * 0.9 + z) - 0.5) * 0.38 + (ruido(vx * 3 + z, vy * 3, vz * 3 + x) - 0.5) * 0.12;
    p.setXYZ(i, vx * k + x, vy * k * aplastar + y, vz * k + z);
  }
  g.computeVertexNormals();
  const c = new Float32Array(p.count * 3);
  const tono = tonos[Math.floor(rnd() * tonos.length)];
  const otro = tonos[Math.floor(rnd() * tonos.length)];
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (p.getY(i) - base) / Math.max(0.1, alto)));
    const n = ruido(p.getX(i) * 1.7, p.getY(i) * 1.7, p.getZ(i) * 1.7);
    const col = tono.clone().lerp(otro, n).multiplyScalar(0.55 + t * 0.6 + (n - 0.5) * 0.28);
    c.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return g.toNonIndexed();
}

/** Textura de racimo de hojas (canal alfa recortado): hojas lanceoladas con nervio y luz. */
let texHojas: THREE.CanvasTexture | null = null;
function hojas() {
  if (texHojas) return texHojas;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = (() => {
    let v = 77;
    return () => ((v = (v * 16807) % 2147483647) / 2147483647);
  })();
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 50;
    const x = 64 + Math.cos(a) * d;
    const y = 64 + Math.sin(a) * d;
    const l = 10 + r() * 9;
    const w = 4 + r() * 3;
    const ang = a + (r() - 0.5) * 1.2;
    const k = 150 + r() * 105;
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.fillStyle = `rgb(${k * 0.85},${k},${k * 0.8})`;
    g.beginPath();
    g.ellipse(0, 0, l, w, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(60,70,50,0.35)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-l, 0);
    g.lineTo(l, 0);
    g.stroke();
    g.restore();
  }
  texHojas = new THREE.CanvasTexture(c);
  texHojas.colorSpace = THREE.SRGBColorSpace;
  texHojas.anisotropy = 4;
  return texHojas;
}

/**
 * Tarjetas de hojas repartidas por la superficie de una copa (centro y radio),
 * orientadas hacia fuera con algo de giro. Color por vértice: más oscuro abajo.
 */
function tarjetas(n: number, cx: number, cy: number, cz: number, r: number, aplastar: number, tonos: THREE.Color[], rnd: () => number, base: number, alto: number, tam = 1) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  for (let i = 0; i < n; i++) {
    // Dirección al azar, con preferencia por la mitad superior y los lados.
    let dx = rnd() * 2 - 1;
    let dy = rnd() * 1.6 - 0.5;
    let dz = rnd() * 2 - 1;
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l;
    dy /= l;
    dz /= l;
    const px = cx + dx * r * 0.92;
    const py = cy + dy * r * 0.92 * aplastar;
    const pz = cz + dz * r * 0.92;
    const N = new THREE.Vector3(dx + (rnd() - 0.5) * 0.6, dy + (rnd() - 0.5) * 0.6 + 0.3, dz + (rnd() - 0.5) * 0.6).normalize();
    const U = new THREE.Vector3(0, 1, 0).cross(N);
    if (U.lengthSq() < 0.01) U.set(1, 0, 0);
    U.normalize().applyAxisAngle(N, rnd() * Math.PI * 2);
    const V = N.clone().cross(U).normalize();
    const s = r * (0.75 + rnd() * 0.45) * tam;
    const esquinas = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const t = Math.min(1, Math.max(0, (py - base) / Math.max(0.1, alto)));
    const c = tonos[Math.floor(rnd() * tonos.length)].clone().multiplyScalar(0.74 + t * 0.5 + (rnd() - 0.5) * 0.15);
    const vs = esquinas.map(([a, b]) => [px + (U.x * a + V.x * b) * s, py + (U.y * a + V.y * b) * s, pz + (U.z * a + V.z * b) * s]);
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(...vs[k]);
      nor.push(N.x * 0.6 + dx * 0.4, N.y * 0.6 + dy * 0.4, N.z * 0.6 + dz * 0.4);
      uv.push((esquinas[k][0] + 1) / 2, (esquinas[k][1] + 1) / 2);
      col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function tronco(r0: number, r1: number, h: number, x: number, z: number, inclX = 0, inclZ = 0, color = "#7A5233", seg = 6) {
  let g: THREE.BufferGeometry = new THREE.CylinderGeometry(r1, r0, h, seg, 1, true);
  g.translate(0, h / 2, 0);
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(inclZ, 0, -inclX));
  g.applyMatrix4(m);
  g.translate(x, 0, z);
  g = g.toNonIndexed();
  const c = new THREE.Color(color);
  return pintar(g, (y) => c.clone().multiplyScalar(0.7 + Math.min(0.4, y * 0.05)));
}

const T_PINO = ["#3B6B33", "#466F37", "#335F2D", "#527C3C"].map((c) => new THREE.Color(c));
const T_FICUS = ["#2E6B38", "#357A3E", "#28603A", "#3F8444"].map((c) => new THREE.Color(c));
const T_SOMBRA = ["#5E9E45", "#6FAE4C", "#4F8F3E", "#7DBB55"].map((c) => new THREE.Color(c));
const T_NARANJO = ["#3E7F36", "#4A8B3A", "#356F30"].map((c) => new THREE.Color(c));
const T_ARBUSTO = ["#5C9A40", "#4C8A3A", "#6FAA4A"].map((c) => new THREE.Color(c));
const T_CIPRES = ["#2C5A2E", "#32653A", "#27522A"].map((c) => new THREE.Color(c));
const T_ARAUCARIA = ["#2F5A2C", "#3A6834", "#28502A", "#447238"].map((c) => new THREE.Color(c));
const T_PALMA = ["#4F9A3E", "#5FAA45", "#468C38"].map((c) => new THREE.Color(c));

/** Hoja de palmera: tira curvada con foliolos, en forma de V abierta. */
function fronda(largo: number, ang: number, caida: number, rnd: () => number) {
  const pos: number[] = [];
  const n = 6;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(t * largo, Math.sin(t * Math.PI * 0.9) * largo * 0.25 - t * t * caida, 0));
  }
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const w0 = Math.sin(((i + 0.3) / n) * Math.PI) * largo * 0.2;
    const w1 = Math.sin(((i + 1.3) / n) * Math.PI) * largo * 0.2;
    // Dos aletas en V (más naturales que una tira plana).
    for (const s of [-1, 1]) {
      pos.push(a.x, a.y, 0, b.x, b.y, 0, b.x, b.y - w1 * 0.35, s * w1);
      pos.push(a.x, a.y, 0, b.x, b.y - w1 * 0.35, s * w1, a.x, a.y - w0 * 0.35, s * w0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.rotateY(ang);
  g.computeVertexNormals();
  return pintar(g, (y) => T_PALMA[Math.floor(rnd() * T_PALMA.length)].clone().multiplyScalar(0.8 + Math.min(0.35, y * 0.02)));
}

/** Construye la geometría (fusionada, con color por vértice) de una especie y variante. */
export function geometriaArbol(e: Especie, v: number, hi: boolean): THREE.BufferGeometry {
  const r = azar(1000 + e * 97 + v * 13 + (hi ? 0 : 5));
  const d = hi ? 1 : 0;
  const piezas: THREE.BufferGeometry[] = [];
  const hojasG: THREE.BufferGeometry[] = [];
  /** Copa: de cerca, núcleo oscuro + tarjetas de hojas; de lejos, solo el volumen. */
  const mata = (rr: number, x: number, y: number, z: number, ap: number, tonos: THREE.Color[], det: number, rnd: () => number, base: number, alto: number) => {
    if (!hi) {
      // De lejos: volumen sencillo con unas pocas tarjetas para que el contorno no sea poligonal.
      hojasG.push(tarjetas(7, x, y, z, rr * 0.95, ap, tonos, rnd, base, alto, 0.8));
      return volumen(rr * 0.85, x, y, z, ap, tonos.map((c) => c.clone().multiplyScalar(0.75)), det, rnd, base, alto);
    }
    hojasG.push(tarjetas(Math.round(6 + rr * rr * 2.2), x, y, z, rr, ap, tonos, rnd, base, alto));
    return volumen(rr * 0.82, x, y, z, ap, tonos.map((c) => c.clone().multiplyScalar(0.7)), det, rnd, base, alto);
  };
  switch (e) {
    case Especie.Pino: {
      // Pino piñonero: fuste alto algo torcido y copa en sombrilla.
      const h = 11 + r() * 3;
      const ix = (r() - 0.5) * 0.12;
      const iz = (r() - 0.5) * 0.12;
      piezas.push(tronco(0.55, 0.3, h, 0, 0, ix, iz, "#7B5A3E", hi ? 7 : 4));
      const cx = Math.sin(ix) * h * -1;
      const cz = Math.sin(iz) * h;
      if (hi) {
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + r();
          piezas.push(tronco(0.18, 0.1, 3.2, cx * 0.85, cz * 0.85, Math.cos(a) * 0.9, Math.sin(a) * 0.9, "#7B5A3E", 4).translate(0, h * 0.82, 0));
        }
      }
      const n = hi ? 7 : 1;
      for (let k = 0; k < n; k++) {
        const a = (k / Math.max(1, n - 1)) * Math.PI * 2 + r();
        const rad = k === 0 ? 0 : 2.6 + r() * 1.2;
        piezas.push(mata(hi ? 2.3 + r() * 0.8 : 5.2, cx + Math.cos(a) * rad, h + 0.4 + r() * 0.8, cz + Math.sin(a) * rad, 0.42, T_PINO, d, r, h - 1, 3));
      }
      break;
    }
    case Especie.Ficus: {
      const h = 3.2;
      piezas.push(tronco(0.9, 0.6, h + 1.5, 0, 0, 0, 0, "#8C8173", hi ? 8 : 5));
      if (hi) for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + r();
        piezas.push(tronco(0.3, 0.18, 3.5, 0, 0, Math.cos(a) * 0.7, Math.sin(a) * 0.7, "#8C8173", 4).translate(0, h, 0));
      }
      const n = hi ? 12 : 1;
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2;
        const rad = k === 0 ? 0 : 1.8 + r() * 2.4;
        piezas.push(mata(hi ? 2.2 + r() * 1.1 : 5, Math.cos(a) * rad, h + 3.2 + r() * 2.2 - rad * 0.3, Math.sin(a) * rad, 0.8, T_FICUS, d, r, h, 6));
      }
      break;
    }
    case Especie.Sombra: {
      const h = 3.6 + r() * 1;
      piezas.push(tronco(0.42, 0.28, h, 0, 0, 0, 0, "#7A5233", hi ? 6 : 4));
      if (hi) for (let k = 0; k < 2; k++) {
        const a = k * Math.PI + r();
        piezas.push(tronco(0.2, 0.12, 2.6, 0, 0, Math.cos(a) * 0.5, Math.sin(a) * 0.5, "#7A5233", 4).translate(0, h * 0.85, 0));
      }
      const n = hi ? 8 : 1;
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2;
        const rad = k === 0 ? 0 : 1.2 + r() * 1.5;
        piezas.push(mata(hi ? 1.7 + r() * 0.8 : 3.4, Math.cos(a) * rad, h + 2 + r() * 1.5, Math.sin(a) * rad, 0.85, T_SOMBRA, d, r, h, 4.5));
      }
      break;
    }
    case Especie.Naranjo: {
      // Naranjo de alcorque, tan de calle andaluza: copa redonda con naranjas.
      const h = 1.8;
      piezas.push(tronco(0.25, 0.18, h + 0.6, 0, 0, 0, 0, "#6B4A2E", hi ? 6 : 4));
      piezas.push(mata(hi ? 1.9 : 2.1, 0, h + 1.6, 0, 0.9, T_NARANJO, hi ? 2 : 0, r, h, 3.4));
      if (hi) {
        for (let k = 0; k < 4; k++) {
          const a = r() * Math.PI * 2;
          piezas.push(mata(1.1, Math.cos(a) * 1.1, h + 1.4 + r() * 0.8, Math.sin(a) * 1.1, 0.9, T_NARANJO, 1, r, h, 3.4));
        }
        const naranja = new THREE.Color("#F28C1E");
        for (let k = 0; k < 9; k++) {
          const a = r() * Math.PI * 2;
          const el = r() * 1.2 - 0.3;
          let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(0.17, 0);
          g = g.toNonIndexed();
          g.translate(Math.cos(a) * 1.85 * Math.cos(el), h + 1.6 + Math.sin(el) * 1.6, Math.sin(a) * 1.85 * Math.cos(el));
          piezas.push(pintar(g, () => naranja));
        }
      }
      break;
    }
    case Especie.Palmera: {
      // Palmera datilera: tronco anillado y curvado, corona de frondas.
      const h = 10 + r() * 3;
      const seg = hi ? 6 : 2;
      const curva = (r() - 0.5) * 1.6;
      let x = 0;
      for (let k = 0; k < seg; k++) {
        const t = h / seg;
        const g = tronco(0.5 - k * 0.03, 0.47 - k * 0.03, t, x, 0, (curva / seg) * 0.25, 0, k % 2 ? "#8A6B4A" : "#7E6142", hi ? 7 : 4).translate(0, k * t, 0);
        piezas.push(g);
        x += Math.sin((curva / seg) * 0.25) * t;
      }
      const top = new THREE.Vector3(x, h, 0);
      const n = hi ? 11 : 6;
      for (let k = 0; k < n; k++) {
        const f = fronda(4.8 + r() * 1.4, (k / n) * Math.PI * 2 + r() * 0.3, 1.8 + r() * 1.2, r);
        f.translate(top.x, top.y, top.z);
        piezas.push(f);
      }
      if (hi) {
        let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(0.75, 1).toNonIndexed();
        g.translate(top.x, top.y - 0.3, 0);
        piezas.push(pintar(g, () => new THREE.Color("#A0742E")));
      }
      break;
    }
    case Especie.Arbusto: {
      const n = hi ? 4 : 1;
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2;
        const rad = k === 0 ? 0 : 0.9 + r() * 0.5;
        piezas.push(mata(hi ? 1 + r() * 0.5 : 1.6, Math.cos(a) * rad, 0.7, Math.sin(a) * rad, 0.75, T_ARBUSTO, d, r, 0, 1.6));
      }
      if (hi && r() < 0.6) {
        // Buganvilla / adelfa en flor.
        const flor = new THREE.Color(r() < 0.5 ? "#D9479B" : "#F06EAA");
        for (let k = 0; k < 7; k++) {
          const a = r() * Math.PI * 2;
          let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(0.28, 0).toNonIndexed();
          g.translate(Math.cos(a) * 1.1, 1 + r() * 0.8, Math.sin(a) * 1.1);
          piezas.push(pintar(g, () => flor));
        }
      }
      break;
    }
    case Especie.Cipres: {
      piezas.push(tronco(0.25, 0.2, 1.2, 0, 0, 0, 0, "#5B3B24", 4));
      const n = hi ? 4 : 1;
      for (let k = 0; k < n; k++) piezas.push(mata(hi ? 1.25 - k * 0.15 : 1.3, 0, 2.2 + k * 2.1, 0, hi ? 1.6 : 4.2, T_CIPRES, d, r, 1, 9));
      break;
    }
    case Especie.Araucaria: {
      // Araucaria excelsa (pino de Norfolk), la seña de los Jardines Saccone: fuste recto muy alto,
      // pelado abajo, y pisos de ramas horizontales cada vez más cortas hacia la copa.
      const h = 22 + r() * 5;
      piezas.push(tronco(0.55, 0.12, h, 0, 0, 0, 0, "#6E5240", hi ? 8 : 5));
      const base = h * (0.32 + r() * 0.08);
      if (!hi) {
        piezas.push(mata(3.4, 0, base + (h - base) * 0.42, 0, 2.4, T_ARAUCARIA, 0, r, base, h - base));
        piezas.push(mata(2.0, 0, h - 2.2, 0, 1.8, T_ARAUCARIA, 0, r, base, h - base));
        break;
      }
      for (let y = base; y < h - 0.6; y += 1.5 + r() * 0.4) {
        const t = (y - base) / (h - base);
        const largo = 4.6 * (1 - t * 0.78) + r() * 0.6;
        const n = 5;
        const giro = r() * Math.PI;
        for (let k = 0; k < n; k++) {
          const a = giro + (k / n) * Math.PI * 2;
          const dx = Math.cos(a);
          const dz = Math.sin(a);
          // Rama casi horizontal (algo caída en la punta) y su follaje en cordón aplastado.
          piezas.push(tronco(0.09, 0.04, largo, 0, 0, 0, 0, "#6E5240", 3).rotateZ(-(Math.PI / 2 - 0.1)).rotateY(-a).translate(0, y, 0));
          for (const f of [0.45, 0.8]) piezas.push(mata(0.55 + largo * 0.11, dx * largo * f, y + 0.15 - f * 0.35, dz * largo * f, 0.42, T_ARAUCARIA, 0, r, base, h - base));
        }
      }
      piezas.push(mata(0.9, 0, h, 0, 1.6, T_ARAUCARIA, 1, r, base, h - base));
      break;
    }
    case Especie.Drago: {
      // Drago / yuca de jardín: varios troncos grises que se abren desde la base, cada uno
      // rematado por una roseta de hojas en espada.
      const brazos = hi ? 3 + Math.floor(r() * 3) : 3;
      for (let k = 0; k < brazos; k++) {
        const a = (k / brazos) * Math.PI * 2 + r();
        const inc = 0.25 + r() * 0.3;
        const l = 3.2 + r() * 2.4;
        piezas.push(tronco(0.24, 0.16, l, 0, 0, 0, 0, "#8D8577", hi ? 5 : 3).rotateZ(-inc).rotateY(-a));
        const tx = Math.sin(inc) * l * Math.cos(a);
        const ty = l * Math.cos(inc);
        const tz = Math.sin(inc) * l * Math.sin(a);
        const nh = hi ? 9 : 5;
        for (let j = 0; j < nh; j++) {
          const f = fronda(1.1 + r() * 0.4, (j / nh) * Math.PI * 2, -0.35 + r() * 0.4, r);
          f.translate(tx, ty, tz);
          piezas.push(f);
        }
      }
      break;
    }
  }
  const norm = (p: THREE.BufferGeometry) => {
    if (!p.attributes.normal) p.computeVertexNormals();
    if (!p.attributes.uv) p.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2));
    return p;
  };
  const solido = mergeGeometries(piezas.map(norm));
  // Grupo 0: troncos y volúmenes; grupo 1: hojas (material recortado).
  const g = hojasG.length ? mergeGeometries([solido, mergeGeometries(hojasG.map(norm))], true) : solido;
  if (!hojasG.length) g.addGroup(0, g.attributes.position.count, 0);
  g.computeBoundingSphere();
  return g;
}

/* ── Material con viento ────────────────────────────────────────────── */

export const viento = { tiempo: { value: 0 }, fuerza: { value: 1 } };

function conViento(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uTiempo = viento.tiempo;
    s.uniforms.uViento = viento.fuerza;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTiempo;\nuniform float uViento;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float k = max(0.0, position.y - 1.2) * 0.018 * uViento;
        transformed.x += sin(uTiempo * 1.7 + ip.x * 0.13 + ip.z * 0.07 + position.y * 0.3) * k;
        transformed.z += cos(uTiempo * 1.3 + ip.z * 0.11 + ip.x * 0.05) * k * 0.7;`,
      );
  };
  m.customProgramCacheKey = () => "viento";
  return m;
}

let mats: [THREE.Material[], THREE.Material[]] | null = null;
/** Materiales por grupo: [árboles: sólido, hojas] y [palmeras: doble cara, hojas]. */
export function materialesArbol() {
  if (!mats) {
    const solido = conViento(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, envMapIntensity: 0.6 }));
    const hoja = conViento(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, map: hojas(), alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.7 }));
    const palma = conViento(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide, envMapIntensity: 0.6 }));
    mats = [[solido, hoja], [palma, hoja]];
  }
  return mats;
}

const geos = new Map<string, THREE.BufferGeometry>();
export function geoArbol(e: Especie, v: number, hi: boolean) {
  const k = `${e}-${v}-${hi}`;
  let g = geos.get(k);
  if (!g) geos.set(k, (g = geometriaArbol(e, v, hi)));
  return g;
}
