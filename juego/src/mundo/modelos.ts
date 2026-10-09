import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { CultivoId } from "../datos/objetos";
import * as T from "./texturas";

/**
 * Modelos con estilo Hay Day hechos con primitivas y texturas pintadas por
 * código: formas redondeadas, colores saturados y mucho detalle pequeño.
 * Referencias reales: Plaza de la Iglesia, La Atunara (barcas y dársena) y los
 * huertos cercados del Zabal.
 */

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const k = color + JSON.stringify(extra, (key, v) => (key === "map" ? (v as THREE.Texture).uuid : v));
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  return mats.get(k)!;
}

/** Material con textura repetida (clona la textura si cambia la repetición). */
const texs = new Map<string, THREE.Texture>();
export function matTex(tex: THREE.Texture, rx = 1, ry = 1, color = "#FFFFFF", extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const k = `${tex.uuid}-${rx}-${ry}`;
  if (!texs.has(k)) {
    const t = tex.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    texs.set(k, t);
  }
  return mat(color, { map: texs.get(k), ...extra });
}

export const PALETA = {
  cal: "#FBF7EE",
  calSombra: "#EDE4D2",
  ocre: "#E8BC5C",
  ocreOscuro: "#C48A2C",
  teja: "#D2643A",
  madera: "#8A5A36",
  maderaClara: "#C08A55",
  hoja: "#5DB33C",
  hojaClara: "#8ED14F",
  hojaOscura: "#2F8A3A",
  pino: "#2F6B34",
  arena: "#F2DFAE",
  piedra: "#C9C4BA",
  bloqueGris: "#B7B5AE",
  azul: "#1F5EFF",
  azulBarca: "#1E63C8",
  azulOscuro: "#061E5C",
  lima: "#C4E910",
  rosa: "#FF1254",
  rojo: "#C8322B",
  amarillo: "#F2C230",
  negro: "#2A2C31",
  cristal: "#9FC8FF",
  bronce: "#5B4632",
} as const;

export function en<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

function sombra<T extends THREE.Mesh>(m: T): T {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Caja recta (para cosas pequeñas o planas). */
export function caja(w: number, h: number, d: number, color: string | THREE.Material, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  return sombra(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === "string" ? mat(color, extra) : color));
}

/** Caja con cantos redondeados: el «look» blandito de Hay Day. */
export function rcaja(w: number, h: number, d: number, color: string | THREE.Material, r = 0.7) {
  const rr = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  return sombra(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, rr), typeof color === "string" ? mat(color) : color));
}

const esfera = (r: number, color: string, det = 2) => sombra(new THREE.Mesh(new THREE.IcosahedronGeometry(r, det), mat(color)));
const cilindro = (r1: number, r2: number, h: number, color: string, seg = 12) => sombra(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat(color)));

/** Tejado a dos aguas con tejas. */
export function tejado(w: number, h: number, d: number) {
  const forma = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(forma, { depth: d, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 1 });
  g.translate(0, 0, -d / 2);
  // UV a partir de la posición: tejas a escala real.
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getZ(i) / 6;
    uv[i * 2 + 1] = (pos.getY(i) + Math.abs(pos.getX(i))) / 4;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return sombra(new THREE.Mesh(g, mat("#FFFFFF", { map: T.teja() })));
}

/* ── Vegetación y atrezo ───────────────────────────────────────────── */

/** Árbol frondoso: varias bolas suaves en tonos de verde. */
export function arbol(escala = 1, tono = 0) {
  const g = new THREE.Group();
  g.add(en(cilindro(0.9, 1.3, 7, "#7A4E2D", 8), 0, 3.5, 0));
  const verdes = [[PALETA.hoja, PALETA.hojaClara, PALETA.hojaOscura], ["#4FA63A", "#7CC94A", "#2E7D35"]][tono % 2];
  const bolas: [number, number, number, number][] = [[0, 9.5, 0, 4.6], [3, 8, 1.5, 3.4], [-3, 8.2, -1, 3.5], [1, 12, -1.5, 3.2], [-1.5, 11.5, 2, 3]];
  bolas.forEach(([x, y, z, r], i) => g.add(en(esfera(r, verdes[i % 3]), x, y, z)));
  g.scale.setScalar(escala);
  return g;
}

/** Pino piñonero: copa plana y ancha (los pinares del Zabal). */
export function pino(escala = 1) {
  const g = new THREE.Group();
  const tronco = cilindro(0.7, 1.1, 14, "#6B4329", 7);
  tronco.rotation.z = 0.06;
  g.add(en(tronco, 0, 7, 0));
  for (const [x, z, r] of [[0, 0, 6], [4, 1, 4], [-4, -1, 4.2], [1, -4, 3.8], [-1, 4, 3.6]] as const) {
    const copa = esfera(r, PALETA.pino);
    copa.scale.y = 0.45;
    g.add(en(copa, x, 15 + Math.abs(x) * -0.2, z));
  }
  g.scale.setScalar(escala);
  return g;
}

export function arbusto(r = 2.4, color: string = PALETA.hojaOscura) {
  const b = esfera(r, color);
  b.scale.y = 0.75;
  b.position.y = r * 0.6;
  return b;
}

export function palmera(alto = 14) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const seg = cilindro(0.75 - i * 0.04, 0.85 - i * 0.04, alto / 6, i % 2 ? "#A07B52" : "#8D6A45", 7);
    g.add(en(seg, i * 0.12, (alto / 6) * (i + 0.5), 0));
  }
  for (let i = 0; i < 8; i++) {
    const hoja = sombra(new THREE.Mesh(new THREE.ConeGeometry(1.2, 8, 4), mat(i % 2 ? PALETA.hojaOscura : PALETA.hoja)));
    hoja.position.set(0.7, alto, 0);
    hoja.rotation.set(0, (i / 8) * Math.PI * 2, Math.PI / 2.2);
    hoja.translateY(3.6);
    g.add(hoja);
  }
  g.add(en(esfera(1.1, "#6B4A2A", 1), 0.7, alto - 0.3, 0));
  return g;
}

export function maceta(color: string = PALETA.rosa) {
  const g = new THREE.Group();
  g.add(en(cilindro(0.8, 0.6, 1.3, "#C8653D", 8), 0, 0.65, 0));
  g.add(en(esfera(0.75, PALETA.hojaOscura, 1), 0, 1.7, 0));
  for (let k = 0; k < 3; k++) g.add(en(esfera(0.35, color, 1), Math.cos(k * 2.1) * 0.5, 2.2, Math.sin(k * 2.1) * 0.5));
  return g;
}

export function farola(alto = 11) {
  const g = new THREE.Group();
  g.add(en(cilindro(0.35, 0.5, alto, "#23262C", 8), 0, alto / 2, 0));
  g.add(en(cilindro(0.9, 0.9, 0.8, "#23262C", 8), 0, 0.4, 0));
  const farol = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.6, 1.8, 6), mat("#FFE7A3", { emissive: "#FFC64D", emissiveIntensity: 0.4 })));
  farol.userData.farol = true;
  g.add(en(farol, 0, alto + 0.9, 0));
  g.add(en(sombra(new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.1, 6), mat("#23262C"))), 0, alto + 2.3, 0));
  return g;
}

export function banco() {
  const g = new THREE.Group();
  g.add(en(rcaja(6, 0.6, 2, matTex(T.madera(), 1, 0.3), 0.2), 0, 1.8, 0));
  g.add(en(rcaja(6, 1.6, 0.4, matTex(T.madera(), 1, 0.3), 0.15), 0, 3, 0.9));
  for (const x of [-2.5, 2.5]) g.add(en(caja(0.4, 1.8, 2, "#2A2C31"), x, 0.9, 0));
  return g;
}

export function pacaPaja() {
  const g = new THREE.Group();
  const p = rcaja(5, 3, 3, "#E9C24A", 0.8);
  g.add(en(p, 0, 1.5, 0));
  for (const x of [-1.2, 1.2]) g.add(en(caja(0.3, 3.05, 3.05, "#B9862B"), x, 1.5, 0));
  return g;
}

export function barril() {
  const g = new THREE.Group();
  g.add(en(cilindro(1.3, 1.1, 3, "#9A6236", 12), 0, 1.5, 0));
  for (const y of [0.5, 2.5]) g.add(en(cilindro(1.33, 1.33, 0.25, "#4B4B4B", 12), 0, y, 0));
  return g;
}

export function cajon(color: string) {
  const g = new THREE.Group();
  g.add(en(rcaja(3.4, 1.4, 2.6, PALETA.maderaClara, 0.2), 0, 0.7, 0));
  for (let i = 0; i < 6; i++) g.add(en(esfera(0.55, color, 1), -1.1 + (i % 3) * 1.1, 1.6, -0.5 + Math.floor(i / 3)));
  return g;
}

/** Valla de madera con postes. */
export function valla(largo: number) {
  const g = new THREE.Group();
  for (let x = -largo / 2; x <= largo / 2 + 0.01; x += 3) g.add(en(rcaja(0.6, 3, 0.6, "#8A5A36", 0.15), x, 1.5, 0));
  for (const y of [1.2, 2.4]) g.add(en(rcaja(largo, 0.4, 0.3, "#A8703F", 0.1), 0, y, 0));
  return g;
}

/** Muro de bloque gris (como los de los huertos del Zabal). */
export function muro(largo: number, alto = 2.6, grosor = 0.9) {
  const m = rcaja(largo, alto, grosor, matTex(T.piedra(), largo / 8, 1, "#D8D6D0"), 0.2);
  m.position.y = alto / 2;
  return m;
}

export function flores(ancho: number, color = "#9B7BE0") {
  const g = new THREE.Group();
  for (let i = 0; i < ancho / 1.2; i++) {
    g.add(en(esfera(0.55, PALETA.hojaOscura, 1), -ancho / 2 + i * 1.2, 0.5, 0));
    const f = sombra(new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 5), mat(color)));
    g.add(en(f, -ancho / 2 + i * 1.2, 1.6, 0));
  }
  return g;
}

/* ── Casas ─────────────────────────────────────────────────────────── */

/** Casa baja andaluza: encalada, persianas, macetas y teja. */
export function casaBaja(w = 14, h = 9, d = 12, persiana: T.Persiana = "verde", conTeja = true) {
  const g = new THREE.Group();
  const fach = matTex(T.fachada(persiana), Math.max(1, Math.round(w / 9)), 1);
  g.add(en(rcaja(w, h, d, fach, 0.6), 0, h / 2, 0));
  if (conTeja) g.add(en(tejado(w + 1.6, 4.5, d + 1.6), 0, h - 0.1, 0));
  else {
    g.add(en(rcaja(w + 0.6, 1.2, d + 0.6, PALETA.calSombra, 0.3), 0, h + 0.4, 0));
  }
  g.add(en(rcaja(2.8, 4.8, 0.6, PALETA.madera, 0.2), w / 2 - 3, 2.4, -d / 2 - 0.1));
  return g;
}

/** Casa de la abuela: teja, chimenea, patio con higuera y macetas. */
export function casaAbuela() {
  const g = casaBaja(20, 10, 14, "verde", true);
  g.add(en(rcaja(3, 7, 3, PALETA.cal, 0.4), 6, 14, 3));
  g.add(en(rcaja(3.6, 0.8, 3.6, PALETA.teja, 0.2), 6, 17.8, 3));
  // Tapia del patio y macetas.
  for (const [x, z, w, d] of [[0, 16, 20, 1], [-9.6, 11.5, 1, 9], [9.6, 11.5, 1, 9]] as const) g.add(en(rcaja(w, 4, d, PALETA.cal, 0.3), x, 2, z));
  g.add(en(rcaja(20.4, 0.6, 1.4, PALETA.ocre, 0.2), 0, 4.2, 16));
  g.add(en(arbol(0.9, 1), -4, 0, 11));
  for (let i = 0; i < 4; i++) g.add(en(maceta(i % 2 ? PALETA.rosa : "#FF8FB1"), -6 + i * 4, 4.3, 16));
  g.add(en(maceta("#E83B3B"), -6, 0, -8));
  g.add(en(maceta(PALETA.rosa), 4, 0, -8));
  g.add(en(banco(), 0, 0, -10));
  return g;
}

/** Bloque de pisos de los 60–70. */
export function bloque(w: number, plantas: number, d: number, tono: string) {
  const g = new THREE.Group();
  const h = plantas * 4.5;
  g.add(en(rcaja(w, h, d, matTex(T.fachadaBloque(tono), 1, plantas), 0.5), 0, h / 2, 0));
  g.add(en(rcaja(w + 0.6, 1, d + 0.6, PALETA.calSombra, 0.3), 0, h + 0.4, 0));
  return g;
}

/* ── Plaza de la Iglesia ──────────────────────────────────────────── */

/**
 * Iglesia de la Inmaculada Concepción, como en la foto: fachada encalada con
 * pilastras y molduras ocres, friso rojo de rombos, reloj, hornacina con la
 * Virgen, espadaña de tres campanas más una arriba y cruz. Mira al norte.
 */
export function iglesia() {
  const g = new THREE.Group();
  const blanco = PALETA.cal;
  const ocre = PALETA.ocre;
  // Nave.
  g.add(en(rcaja(30, 15, 40, blanco, 0.6), 0, 7.5, 12));
  g.add(en(rcaja(30.6, 1.6, 40.6, ocre, 0.3), 0, 15.4, 12));
  g.add(en(rcaja(30.8, 1.8, 40.8, ocre, 0.3), 0, 0.9, 12));
  g.add(en(tejado(29, 6, 39), 0, 16, 12));
  // Alas bajas a los lados de la fachada, con remate curvo.
  for (const s of [-1, 1]) {
    g.add(en(rcaja(8, 11, 4, blanco, 0.4), s * 11, 5.5, -9));
    const remate = sombra(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 4, 16, 1, false, 0, Math.PI), mat(blanco)));
    remate.rotation.set(Math.PI / 2, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2);
    remate.rotation.set(Math.PI / 2, Math.PI / 2, 0);
    g.add(en(remate, s * 11, 11, -9));
    g.add(en(rcaja(8.4, 1, 4.4, ocre, 0.2), s * 11, 11, -9));
    g.add(en(caja(8.2, 1.4, 0.3, matTex(T.friso(), 2, 1)), s * 11, 9.6, -11.1));
    g.add(en(rcaja(2, 3.4, 0.4, "#5E6B78", 0.2), s * 11, 5.5, -11.1));
  }
  // Cuerpo central de la fachada.
  const fy = 0;
  g.add(en(rcaja(14, 26, 3, blanco, 0.4), 0, 13, -9.5));
  for (const x of [-6.6, 6.6]) g.add(en(rcaja(1.1, 26, 3.4, ocre, 0.3), x, 13, -9.5));
  for (const y of [1, 12, 20.5]) g.add(en(rcaja(14.6, 1.1, 3.6, ocre, 0.3), 0, y + fy, -9.5));
  g.add(en(caja(12, 1.8, 0.3, matTex(T.friso(), 3, 1)), 0, 18.8, -11.15));
  // Puerta con arco.
  g.add(en(rcaja(5, 7, 0.6, "#5A3A24", 0.2), 0, 4.5, -11.2));
  const arco = sombra(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.6, 16, 1, false, -Math.PI / 2, Math.PI), mat("#5A3A24")));
  arco.rotation.x = Math.PI / 2;
  g.add(en(arco, 0, 8, -11.2));
  g.add(en(rcaja(6.4, 0.8, 1, ocre, 0.2), 0, 1.2, -11.5));
  // Hornacina con la Virgen.
  g.add(en(rcaja(3.2, 5, 0.5, "#3D4757", 0.3), 0, 15, -11.2));
  g.add(en(cilindro(0.7, 1.1, 3, "#F4F1EA", 10), 0, 14.4, -11.4));
  g.add(en(esfera(0.6, "#F4F1EA", 1), 0, 16.3, -11.4));
  // Frontón con reloj.
  const fronton = new THREE.Shape([new THREE.Vector2(-7.5, 0), new THREE.Vector2(7.5, 0), new THREE.Vector2(0, 5)]);
  const fg = new THREE.ExtrudeGeometry(fronton, { depth: 3, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 1 });
  g.add(en(sombra(new THREE.Mesh(fg, mat(blanco))), 0, 26, -11));
  const borde = new THREE.Shape([new THREE.Vector2(-8.2, -0.6), new THREE.Vector2(8.2, -0.6), new THREE.Vector2(0, 5.6)]);
  g.add(en(sombra(new THREE.Mesh(new THREE.ExtrudeGeometry(borde, { depth: 2.4, bevelEnabled: false }), mat(ocre))), 0, 26, -10.6));
  const reloj = cilindro(1.7, 1.7, 0.4, "#FFFFFF", 20);
  reloj.rotation.x = Math.PI / 2;
  g.add(en(reloj, 0, 23.2, -11.3));
  const aro = sombra(new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.25, 6, 20), mat(PALETA.negro)));
  g.add(en(aro, 0, 23.2, -11.5));
  g.add(en(caja(0.25, 1.3, 0.2, PALETA.negro), 0, 23.7, -11.55));
  g.add(en(caja(1, 0.25, 0.2, PALETA.negro), 0.45, 23.2, -11.55));
  // Espadaña: tres campanas y una encima.
  const vano = (x: number, y: number) => {
    g.add(en(rcaja(2.6, 3.8, 0.6, "#2F3540", 0.3), x, y, -10.9));
    const campana = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 1.6, 10), mat("#B98B2E", { metalness: 0.6, roughness: 0.35 })));
    g.add(en(campana, x, y - 0.3, -10.6));
  };
  g.add(en(rcaja(13, 8, 2.6, blanco, 0.3), 0, 34, -9.5));
  for (const x of [-6.2, 6.2]) g.add(en(rcaja(0.8, 8, 2.9, ocre, 0.2), x, 34, -9.5));
  g.add(en(rcaja(13.6, 0.9, 3.2, ocre, 0.2), 0, 38.4, -9.5));
  for (const x of [-4, 0, 4]) vano(x, 34);
  g.add(en(rcaja(6, 7, 2.4, blanco, 0.3), 0, 42, -9.5));
  for (const x of [-2.8, 2.8]) g.add(en(rcaja(0.6, 7, 2.7, ocre, 0.2), x, 42, -9.5));
  vano(0, 42);
  const remate = new THREE.Shape([new THREE.Vector2(-3.4, 0), new THREE.Vector2(3.4, 0), new THREE.Vector2(0, 2.6)]);
  g.add(en(sombra(new THREE.Mesh(new THREE.ExtrudeGeometry(remate, { depth: 2.6, bevelEnabled: false }), mat(blanco))), 0, 45.5, -10.8));
  g.add(en(caja(0.4, 4, 0.4, PALETA.negro), 0, 50, -9.5));
  g.add(en(caja(2.2, 0.4, 0.4, PALETA.negro), 0, 50.8, -9.5));
  // Pináculos rojizos en las esquinas.
  for (const [x, y] of [[-6.4, 38.9], [6.4, 38.9], [-2.9, 45.6], [2.9, 45.6], [-14.5, 16.4], [14.5, 16.4], [-6.6, 26.2], [6.6, 26.2]] as const) {
    g.add(en(esfera(0.6, "#C6532F", 1), x, y + 0.5, -9.5));
    g.add(en(sombra(new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 6), mat("#C6532F"))), x, y + 1.8, -9.5));
  }
  // Verja negra delante.
  for (let x = -14; x <= 14; x += 1.2) if (Math.abs(x) > 3.5) g.add(en(caja(0.18, 3, 0.18, PALETA.negro), x, 1.5, -15));
  for (const x of [-9, 9]) g.add(en(caja(10, 0.3, 0.3, PALETA.negro), x, 2.8, -15));
  return g;
}

/** Monumento de la plaza: grupo de bronce sobre pedestal, rodeado de seto. */
export function monumento() {
  const g = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.add(en(arbusto(1.9, i % 2 ? PALETA.hojaOscura : "#3E9B45"), Math.cos(a) * 7.5, 0, Math.sin(a) * 7.5));
  }
  g.add(en(cilindro(4.2, 4.6, 1.4, "#9C5B45", 20), 0, 0.7, 0));
  g.add(en(cilindro(3, 3.4, 4.6, "#A8624B", 20), 0, 3.6, 0));
  g.add(en(cilindro(3.4, 3.4, 0.6, "#8A4F3B", 20), 0, 6.1, 0));
  // Figuras de bronce.
  for (const [x, z, h] of [[-1.2, 0, 5.5], [1.2, 0.3, 4.6], [0, -1, 3.2]] as const) {
    g.add(en(sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.9, h - 2, 4, 8), mat(PALETA.bronce, { metalness: 0.5, roughness: 0.45 }))), x, 6.4 + h / 2, z));
    g.add(en(esfera(0.75, PALETA.bronce, 1), x, 6.6 + h, z));
  }
  return g;
}

/** Fuente de beber con cadenas, como la de la foto. */
export function fuente() {
  const g = new THREE.Group();
  g.add(en(cilindro(0.6, 0.9, 3.2, "#3A3D44", 10), 0, 1.6, 0));
  g.add(en(cilindro(1.6, 1, 0.8, "#3A3D44", 12), 0, 3.4, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(en(cilindro(0.3, 0.3, 2.6, "#2A2C31", 6), Math.cos(a) * 4, 1.3, Math.sin(a) * 4));
  }
  return g;
}

/** Tablón de encargos de la plaza. */
export function tablon() {
  const g = new THREE.Group();
  for (const x of [-3.5, 3.5]) g.add(en(rcaja(0.8, 7.5, 0.8, PALETA.madera, 0.2), x, 3.75, 0));
  g.add(en(rcaja(9, 5.5, 0.7, matTex(T.madera(), 1, 0.5), 0.3), 0, 5.6, 0));
  g.add(en(tejado(10, 1.6, 2), 0, 8.4, 0));
  ["#FFFFFF", "#FFF4B8", "#FFD9E2"].forEach((c, i) => g.add(en(caja(2.2, 2.6, 0.2, c), -2.6 + i * 2.6, 5.7, -0.45)));
  return g;
}

/* ── Mercado, bar, redacción ──────────────────────────────────────── */

export function mercado() {
  const g = new THREE.Group();
  g.add(en(rcaja(40, 11, 26, matTex(T.fachada("azul"), 4, 1, "#FFF6E6"), 0.6), 0, 5.5, 0));
  g.add(en(tejado(42, 7, 28), 0, 11, 0));
  g.add(en(rcaja(10, 7.5, 0.8, "#5A3A24", 0.3), 0, 3.75, -13.1));
  g.add(en(rcaja(16, 2.4, 0.6, PALETA.azul, 0.3), 0, 9, -13.3));
  for (let i = -2; i <= 2; i++) {
    if (!i) continue;
    const toldo = rcaja(6, 0.5, 4, i % 2 ? PALETA.azul : "#FFFFFF", 0.2);
    toldo.rotation.x = -0.25;
    g.add(en(toldo, i * 7.5, 7.5, -15));
  }
  g.add(en(cajon("#E8392F"), -10, 0, -16));
  g.add(en(cajon("#7BD55A"), -14, 0, -16.5));
  g.add(en(cajon("#F2A93B"), 13, 0, -16));
  return g;
}

/** Puesto 14: mostrador con toldo lima donde aparecen tus cajas. */
export function puesto() {
  const g = new THREE.Group();
  g.add(en(rcaja(16, 4, 5, matTex(T.madera(), 2, 0.6), 0.3), 0, 2, 0));
  for (const x of [-7.6, 7.6]) g.add(en(rcaja(0.7, 9, 0.7, PALETA.madera, 0.2), x, 4.5, 2.2));
  const toldo = rcaja(17.5, 0.6, 7, PALETA.lima, 0.25);
  toldo.rotation.x = -0.18;
  g.add(en(toldo, 0, 9.2, 0.8));
  for (let i = 0; i < 7; i++) g.add(en(esfera(1.1, i % 2 ? PALETA.lima : "#FFFFFF", 1), -7.5 + i * 2.5, 8.5, -2.6));
  g.add(en(rcaja(4.4, 2.2, 0.5, PALETA.azul, 0.2), 0, 10.8, 4));
  return g;
}

export function cajaProducto(color: string) {
  return cajon(color);
}

export function bar() {
  const g = casaBaja(18, 10, 12, "marron", false);
  g.add(en(rcaja(12, 2.4, 0.5, PALETA.rosa, 0.3), 0, 8.4, -6.3));
  for (const x of [-6, 6]) {
    g.add(en(cilindro(2, 2, 0.4, "#FFFFFF", 14), x, 2.6, -14));
    g.add(en(cilindro(0.3, 0.3, 2.6, PALETA.negro, 6), x, 1.3, -14));
    for (const dx of [-2.6, 2.6]) g.add(en(rcaja(1.6, 2.4, 1.6, "#C0392B", 0.3), x + dx, 1.2, -14));
    const somb = sombra(new THREE.Mesh(new THREE.ConeGeometry(5.2, 2, 10), mat(x < 0 ? PALETA.rosa : "#FFFFFF")));
    g.add(en(somb, x, 7.5, -14));
    g.add(en(cilindro(0.25, 0.25, 6.5, PALETA.negro, 6), x, 3.6, -14));
  }
  g.add(en(maceta(), -9, 0, -7.5));
  g.add(en(maceta("#E83B3B"), 9, 0, -7.5));
  return g;
}

export function redaccion() {
  const g = new THREE.Group();
  g.add(en(rcaja(18, 16, 14, "#EEF1F6", 0.6), 0, 8, 0));
  for (const y of [5.5, 11]) g.add(en(rcaja(18.3, 3.6, 14.3, mat(PALETA.cristal, { roughness: 0.15, metalness: 0.3 }), 0.3), 0, y, 0));
  g.add(en(rcaja(13, 3.4, 1, PALETA.azul, 0.4), 0, 18.2, -7));
  g.add(en(rcaja(3, 3, 1.1, PALETA.lima, 0.4), -4.5, 18.2, -7.2));
  g.add(en(maceta(PALETA.lima), -7, 0, -8.5));
  g.add(en(maceta(PALETA.lima), 7, 0, -8.5));
  return g;
}

/* ── La Atunara ───────────────────────────────────────────────────── */

/**
 * Barca de La Atunara, como la de la foto: casco blanco con borda azul, franja
 * roja, línea amarilla y fondo oscuro; caseta blanca rematada en azul; pórtico
 * de hierro y una rueda de defensa.
 */
export function barca(acento: string = PALETA.rojo) {
  const g = new THREE.Group();
  const planta = new THREE.Shape();
  planta.moveTo(-6.5, -2.2);
  planta.lineTo(4, -2.4);
  planta.quadraticCurveTo(7.5, -1.2, 8.2, 0);
  planta.quadraticCurveTo(7.5, 1.2, 4, 2.4);
  planta.lineTo(-6.5, 2.2);
  planta.quadraticCurveTo(-7.4, 0, -6.5, -2.2);
  const capa = (y0: number, alto: number, color: string, k = 1) => {
    const geo = new THREE.ExtrudeGeometry(planta, { depth: alto, bevelEnabled: false, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2);
    const m = sombra(new THREE.Mesh(geo, mat(color)));
    m.scale.set(k, 1, k);
    m.position.y = y0;
    return m;
  };
  g.add(capa(0, 1.1, "#2C3138", 0.94));
  g.add(capa(1.1, 0.35, PALETA.amarillo, 1.0));
  g.add(capa(1.45, 0.25, PALETA.azulBarca, 1.005));
  g.add(capa(1.7, 1.6, "#FAFAF7", 1.01));
  g.add(capa(2.25, 0.6, acento, 1.015));
  g.add(capa(3.3, 0.45, PALETA.azulBarca, 1.03));
  g.add(capa(2.6, 0.75, "#2E78D8", 0.86));
  // Caseta.
  g.add(en(rcaja(3.4, 4.2, 3, "#FAFAF7", 0.3), -0.6, 5.2, 0));
  g.add(en(rcaja(3.8, 0.5, 3.4, PALETA.azulBarca, 0.2), -0.6, 7.4, 0));
  g.add(en(caja(0.3, 1.2, 2.4, "#2A3442"), 1.15, 6.2, 0));
  // Pórtico de hierro y botalón.
  for (const z of [-1.8, 1.8]) g.add(en(caja(0.3, 6, 0.3, "#7A4B32"), -4.2, 6.3, z));
  g.add(en(caja(0.3, 0.3, 3.9, "#7A4B32"), -4.2, 9.2, 0));
  const botalon = caja(9, 0.25, 0.25, "#8C3B2B");
  botalon.rotation.z = -0.25;
  g.add(en(botalon, 0.5, 8.4, 0));
  // Rueda de defensa.
  const rueda = sombra(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.25, 6, 12), mat("#1C1D21")));
  g.add(en(rueda, -4.6, 2.6, 2.45));
  // Cajas azules en cubierta.
  g.add(en(rcaja(1.6, 0.8, 1.6, "#2E78D8", 0.2), 3, 3.6, 0.6));
  g.add(en(cilindro(0.6, 0.6, 1.2, "#A13A26", 8), -2.8, 3.8, -0.8));
  return g;
}

/** Escollera: bloques de hormigón y piedra a lo largo de un recorrido. */
export function escollera(puntos: THREE.Vector3[]) {
  const g = new THREE.Group();
  const r = (() => {
    let s = 41;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    const largo = a.distanceTo(b);
    const ang = -Math.atan2(b.z - a.z, b.x - a.x);
    // Paseo de hormigón encima.
    const paseo = rcaja(largo + 4, 2, 7, "#CFCBC2", 0.4);
    paseo.position.copy(a.clone().lerp(b, 0.5)).setY(3.6);
    paseo.rotation.y = ang;
    g.add(paseo);
    for (let t = 0; t < largo; t += 3.2) {
      for (const lado of [-1, 1]) {
        const blq = rcaja(3.2 + r(), 2.6 + r(), 3.2, r() < 0.5 ? "#B9B4A8" : "#A7A296", 0.5);
        blq.position.copy(a.clone().lerp(b, t / largo)).setY(1.4 + r() * 0.8);
        blq.rotation.y = ang + r() * 0.6;
        blq.rotation.x = (r() - 0.5) * 0.3;
        blq.translateZ(lado * (4.5 + r() * 2));
        g.add(blq);
      }
    }
  }
  return g;
}

export function muelle(largo = 50, ancho = 16) {
  const g = new THREE.Group();
  g.add(en(rcaja(ancho, 3.4, largo, "#D6D2C8", 0.4), 0, 1.9, largo / 2));
  g.add(en(rcaja(ancho + 0.4, 0.5, largo + 0.4, "#E8E4DA", 0.2), 0, 3.6, largo / 2));
  for (let z = 4; z < largo; z += 8) for (const x of [-ancho / 2 + 0.6, ancho / 2 - 0.6]) g.add(en(cilindro(0.45, 0.55, 1.2, "#3A3D44", 8), x, 4.4, z));
  return g;
}

/** Caseta de pescadores (la fila de la dársena). */
export function casetaPescador(color: string) {
  const g = new THREE.Group();
  g.add(en(rcaja(6, 5, 6, color, 0.4), 0, 2.5, 0));
  const techo = rcaja(6.8, 0.6, 6.8, "#C9C4BA", 0.2);
  techo.rotation.x = 0.08;
  g.add(en(techo, 0, 5.3, 0));
  g.add(en(rcaja(2.6, 3.6, 0.4, "#7A8696", 0.2), 0, 1.8, -3.1));
  return g;
}

/** Lonja con franja azul y la fábrica de hielo. */
export function lonja() {
  const g = new THREE.Group();
  g.add(en(rcaja(36, 9, 12, "#ECEAE4", 0.5), 0, 4.5, 0));
  g.add(en(rcaja(36.4, 1.6, 12.4, PALETA.azulBarca, 0.3), 0, 9.6, 0));
  for (let i = -3; i <= 3; i++) g.add(en(rcaja(3.4, 5, 0.4, "#9AA6B6", 0.2), i * 5, 2.8, -6.1));
  g.add(en(rcaja(10, 2, 0.4, "#FFFFFF", 0.2), 0, 7, -6.3));
  // Fábrica de hielo.
  g.add(en(rcaja(14, 14, 12, "#D9D6CE", 0.5), 26, 7, 2));
  g.add(en(rcaja(8, 3, 0.5, "#C0392B", 0.3), 26, 11, -4.2));
  return g;
}

export function redes(color = "#2FA84A") {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const m = esfera(1.6 + i * 0.3, i % 2 ? color : "#2A6FB8", 1);
    m.scale.y = 0.45;
    g.add(en(m, i * 2.4, 0.7, (i % 2) * 1.5));
  }
  return g;
}

/* ── El Zabal ─────────────────────────────────────────────────────── */

/**
 * Parcela de huerto cercada con muro de bloque gris, como las del Zabal.
 * `abierta` deja hueco para la entrada.
 */
export function parcela(w: number, d: number, suelo: THREE.Material | string, abierta = true) {
  const g = new THREE.Group();
  const base = rcaja(w, 0.8, d, typeof suelo === "string" ? mat(suelo) : suelo, 0.2);
  g.add(en(base, 0, 0.4, 0));
  const m1 = muro(w);
  g.add(en(m1, 0, m1.position.y, d / 2));
  const m2 = muro(d);
  m2.rotation.y = Math.PI / 2;
  g.add(en(m2, -w / 2, m2.position.y, 0));
  const m3 = muro(d);
  m3.rotation.y = Math.PI / 2;
  g.add(en(m3, w / 2, m3.position.y, 0));
  if (abierta) {
    for (const s of [-1, 1]) {
      const m = muro(w / 2 - 3);
      g.add(en(m, s * (w / 4 + 1.5), m.position.y, -d / 2));
    }
  } else {
    const m = muro(w);
    g.add(en(m, 0, m.position.y, -d / 2));
  }
  return g;
}

/** Bancal: tierra arada dentro de su parcela. */
export function bancal() {
  return parcela(17, 17, matTex(T.tierraArada(), 1.4, 1.4), true);
}

export function casetaHuerto(teja = false) {
  const g = new THREE.Group();
  g.add(en(rcaja(7, 5, 6, PALETA.cal, 0.4), 0, 2.5, 0));
  if (teja) g.add(en(tejado(7.6, 2.4, 6.6), 0, 5, 0));
  else g.add(en(rcaja(7.8, 0.5, 6.8, "#9AA0A8", 0.2), 0, 5.2, 0));
  g.add(en(rcaja(2.4, 3.6, 0.4, "#6E7A86", 0.2), -1.5, 1.8, -3.1));
  return g;
}

export function piscina() {
  const g = new THREE.Group();
  g.add(en(rcaja(9, 0.9, 6, "#E8E4DA", 0.3), 0, 0.45, 0));
  g.add(en(rcaja(7.6, 0.5, 4.6, mat("#3FB6E8", { roughness: 0.15, metalness: 0.1 }), 0.2), 0, 0.8, 0));
  return g;
}

/** Plantas según cultivo y progreso (0–1): nueve matas por bancal. */
export function planta(c: CultivoId, progreso: number) {
  const g = new THREE.Group();
  const etapa = progreso >= 1 ? 3 : progreso >= 0.5 ? 2 : progreso >= 0.15 ? 1 : 0;
  for (let fx = -1; fx <= 1; fx++) {
    for (let fz = -1; fz <= 1; fz++) {
      const p = new THREE.Group();
      p.position.set(fx * 4.6, 0.9, fz * 4.6);
      if (etapa === 0) {
        for (const dx of [-0.4, 0.4]) {
          const brote = sombra(new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 4), mat(PALETA.hojaClara)));
          brote.rotation.z = dx;
          p.add(en(brote, dx, 0.6, 0));
        }
      } else if (c === "lechuga") {
        const s = [0, 1.1, 1.7, 2.2][etapa];
        p.add(en(esfera(s, etapa === 3 ? "#9BE05F" : PALETA.hoja), 0, s * 0.55, 0));
        for (let k = 0; k < 5; k++) {
          const hoja = esfera(s * 0.55, etapa === 3 ? "#6FC23E" : "#4FA63A", 1);
          hoja.scale.y = 0.5;
          const a = (k / 5) * Math.PI * 2;
          p.add(en(hoja, Math.cos(a) * s * 0.75, s * 0.25, Math.sin(a) * s * 0.75));
        }
      } else {
        const alto = [0, 2.2, 3.8, 4.6][etapa] * (c === "pimiento" ? 0.85 : 1);
        if (c === "tomate") p.add(en(cilindro(0.12, 0.12, alto + 1.2, "#B98552", 4), 0.8, (alto + 1.2) / 2, 0));
        for (let k = 0; k < 3; k++) p.add(en(esfera(1.1 - k * 0.15, k % 2 ? PALETA.hojaOscura : PALETA.hoja, 1), (k - 1) * 0.5, alto * (0.3 + k * 0.28), (k % 2) * 0.4));
        if (etapa >= 2) {
          const color = c === "tomate" ? (etapa === 3 ? "#EE3B2E" : "#8FD14F") : etapa === 3 ? "#2FB34E" : "#8FD14F";
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2;
            const fruto = c === "tomate"
              ? esfera(0.6, color, 2)
              : sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 3, 8), mat(color, { roughness: 0.3 })));
            p.add(en(fruto, Math.cos(a) * 1, alto * 0.5 + (k % 2) * 0.8, Math.sin(a) * 1));
          }
        }
      }
      g.add(p);
    }
  }
  return g;
}

/** Chamizo de Rafa con alberca. */
export function chamizo() {
  const g = casetaHuerto(true);
  g.add(en(rcaja(10, 2, 7, "#C9C4BA", 0.4), 13, 1, 0));
  g.add(en(rcaja(8.6, 0.4, 5.6, mat("#4DA8E8", { roughness: 0.15 }), 0.2), 13, 2.05, 0));
  g.add(en(pacaPaja(), -8, 0, -2));
  g.add(en(barril(), -6, 0, -6));
  return g;
}

/* ── Otros lugares ────────────────────────────────────────────────── */

export function frontera() {
  const g = new THREE.Group();
  for (const x of [-12, 12]) {
    g.add(en(rcaja(8, 7, 8, "#EEF1F6", 0.5), x, 3.5, 4));
    g.add(en(rcaja(9, 1, 9, PALETA.azulOscuro, 0.3), x, 7.5, 4));
    g.add(en(rcaja(5, 2, 0.4, PALETA.cristal, 0.2), x, 4.5, -0.1));
  }
  g.add(en(rcaja(14, 0.7, 0.7, PALETA.rosa, 0.3), 0, 3, 4));
  for (let i = 0; i < 4; i++) g.add(en(caja(1.6, 0.72, 0.72, "#FFFFFF"), -5.25 + i * 3.5, 3, 4));
  g.add(en(banco(), -24, 0, -6));
  g.add(en(arbol(0.8), -30, 0, -2));
  return g;
}

export function sombrilla(color: string) {
  const g = new THREE.Group();
  g.add(en(cilindro(0.18, 0.18, 5.2, "#FFFFFF", 6), 0, 2.6, 0));
  const t = sombra(new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.4, 10), mat(color)));
  g.add(en(t, 0, 5.4, 0));
  g.add(en(rcaja(2, 0.3, 4.4, "#FFFFFF", 0.1), 2.6, 0.5, 0));
  return g;
}

export function fuerte() {
  const g = new THREE.Group();
  const p = matTex(T.piedra(), 3, 1, "#E8D7B8");
  for (const [x, z, w, d, h] of [[-12, 0, 2.4, 24, 6], [12, 0, 2.4, 18, 4.5], [0, -12, 24, 2.4, 5], [-4, 12, 10, 2.4, 3]] as const) g.add(en(rcaja(w, h, d, p, 0.4), x, h / 2, z));
  for (const [x, z] of [[-12, -12], [12, -12]]) g.add(en(rcaja(5.5, 8, 5.5, p, 0.6), x, 4, z));
  g.add(en(arbusto(2.2), 3, 0, 4));
  g.add(en(arbusto(1.6, PALETA.hoja), -6, 0, -4));
  return g;
}

export function estadio() {
  const g = new THREE.Group();
  for (let i = -2; i <= 2; i++) g.add(en(caja(9.2, 0.6, 30, i % 2 ? "#4DB052" : "#3FA046"), i * 9.2, 0.3, 0));
  g.add(en(caja(46, 0.1, 0.4, "#FFFFFF"), 0, 0.66, 0));
  const circ = sombra(new THREE.Mesh(new THREE.TorusGeometry(4, 0.2, 4, 24), mat("#FFFFFF")));
  circ.rotation.x = Math.PI / 2;
  g.add(en(circ, 0, 0.7, 0));
  for (const z of [-19, 19]) {
    for (let k = 0; k < 3; k++) g.add(en(rcaja(50, 1.6, 2, k % 2 ? PALETA.negro : "#FFFFFF", 0.3), 0, 1 + k * 1.6, z + Math.sign(z) * k * 2));
  }
  for (const x of [-24, 24]) {
    g.add(en(caja(0.4, 3, 0.4, "#FFFFFF"), x, 1.5, -3.5));
    g.add(en(caja(0.4, 3, 0.4, "#FFFFFF"), x, 1.5, 3.5));
    g.add(en(caja(0.4, 0.4, 7.4, "#FFFFFF"), x, 3, 0));
  }
  return g;
}

export function marquesina() {
  const g = new THREE.Group();
  g.add(en(rcaja(16, 0.6, 6, PALETA.azul, 0.3), 0, 7, 0));
  for (const x of [-7, 7]) g.add(en(cilindro(0.3, 0.3, 7, PALETA.negro, 6), x, 3.5, 2.5));
  const bus = new THREE.Group();
  bus.add(en(rcaja(24, 8, 7, "#FFFFFF", 1.2), 0, 5, 0));
  bus.add(en(rcaja(24.2, 2.6, 7.2, mat(PALETA.cristal, { roughness: 0.15 }), 0.6), 0, 6.5, 0));
  bus.add(en(rcaja(24.2, 1.2, 7.2, PALETA.azul, 0.5), 0, 2.6, 0));
  for (const x of [-8, 8]) for (const z of [-3.4, 3.4]) {
    const r = cilindro(1.3, 1.3, 0.8, "#1C1D21", 12);
    r.rotation.x = Math.PI / 2;
    bus.add(en(r, x, 1.3, z));
  }
  g.add(en(bus, 0, 0, -10));
  return g;
}

/** Persona: cabeza grande, ojos, pelo, brazos; muy Hay Day. */
export function persona(piel: string, ropa: string, pelo: string, escala = 1) {
  const g = new THREE.Group();
  for (const x of [-0.7, 0.7]) g.add(en(sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.6, 3, 8), mat("#33415C"))), x, 1.4, 0));
  const cuerpo = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 1.8, 4, 12), mat(ropa)));
  g.add(en(cuerpo, 0, 4.2, 0));
  for (const s of [-1, 1]) {
    const brazo = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.8, 3, 8), mat(ropa)));
    brazo.rotation.z = s * 0.25;
    g.add(en(brazo, s * 1.9, 4.3, 0));
  }
  const cabeza = esfera(1.9, piel, 3);
  g.add(en(cabeza, 0, 7.6, 0));
  const pelo3d = sombra(new THREE.Mesh(new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 1.9), mat(pelo)));
  pelo3d.rotation.x = 0.25;
  g.add(en(pelo3d, 0, 7.9, 0.25));
  for (const x of [-0.65, 0.65]) g.add(en(esfera(0.28, "#1C1D21", 1), x, 7.7, -1.75));
  g.add(en(esfera(0.3, "#F08A7E", 1), 0, 7.2, -1.85));
  g.scale.setScalar(escala);
  g.userData.cuerpo = cuerpo;
  g.userData.cabeza = cabeza;
  return g;
}

export function avion() {
  const g = new THREE.Group();
  const fus = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(1.7, 22, 4, 10), mat("#FFFFFF")));
  fus.rotation.z = Math.PI / 2;
  g.add(fus);
  g.add(en(rcaja(4, 0.5, 26, "#FFFFFF", 0.2), 0, 0, 0));
  g.add(en(rcaja(3, 6, 0.5, PALETA.azul, 0.2), -11, 3, 0));
  g.add(en(rcaja(3, 0.4, 9, "#FFFFFF", 0.15), -11, 0.6, 0));
  return g;
}

/** Nube algodonosa (la nube del levante sobre el Peñón). */
export function nube(escala = 1) {
  const g = new THREE.Group();
  const m = mat("#FFFFFF", { transparent: true, opacity: 0.95, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(7 + Math.random() * 6, 2), m);
    b.position.set((i - 4) * 8, Math.random() * 5, (Math.random() - 0.5) * 12);
    g.add(b);
  }
  g.scale.setScalar(escala);
  return g;
}
