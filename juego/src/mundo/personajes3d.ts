import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Personajes 3D de La Línea Life.
 *
 * Estilo de referencia: simulación de vida ilustrativa (tipo My Time at
 * Portia). Proporciones humanas esbeltas, cabeza apenas mayor, caras suaves
 * con ojos grandes de iris de color, cejas marcadas y nariz con volumen; pelo
 * esculpido en grandes masas con mechones; ropa por capas (camisa + chaleco,
 * chaqueta abierta con mangas de rayas, cinturón con hebilla, vaqueros
 * remangados, botas, tacones…).
 *
 * Todo es procedural y modular:
 * - Esqueleto de pivotes compartido (cadera, columna, cuello, cabeza, hombros,
 *   codos, muslos, rodillas) movido por las mismas animaciones.
 * - Las piezas rígidas se funden en una malla con colores por vértice y un
 *   único material: ~12 llamadas de dibujo por personaje cercano.
 * - De lejos, 3 mallas (cuerpo y dos piernas).
 *
 * Unidades en metros (≈1,76 m de base) y luego `ESCALA_PERSONAJE`.
 */

/** Ligeramente mayores que la realidad para que se distingan desde arriba (≈2,2 m). */
export const ESCALA_PERSONAJE = 1.0;

export type Sexo = "h" | "m";
export type Peinado = "corto" | "tupe" | "largo" | "coleta" | "mono" | "rizado" | "calvo";
export type Atuendo = "informal" | "verano" | "vestido" | "camarero" | "pescador" | "trabajo";
export type Accesorio = "gafas" | "gorra" | null;

/** Prendas por capas. Si no se dan, salen del `atuendo`. */
export interface Prendas {
  arriba: { tipo: "camiseta" | "camisa" | "polo" | "blusa" | "jersey"; color: string; manga: "corta" | "larga" | "remangada"; color2?: string };
  capa?: { tipo: "chaleco" | "chaqueta" | "sudadera" | "peto" | "reflectante"; color: string; rayas?: string; capucha?: string };
  abajo: { tipo: "pantalon" | "vaquero" | "corto" | "pirata" | "falda"; color: string };
  calzado: { tipo: "zapato" | "deportiva" | "bota" | "tacon" | "katiuska"; color: string };
  cinturon?: string;
  /** Faldón de la prenda interior que asoma bajo la chaqueta. */
  bajo?: string;
  delantal?: string;
}

export interface Aspecto {
  sexo: Sexo;
  piel: string;
  pelo: string;
  peinado: Peinado;
  ojos?: string;
  atuendo: Atuendo;
  /** Color principal de la ropa (personalizable por el jugador). */
  ropa: string;
  ropa2?: string;
  pantalon?: string;
  calzado?: string;
  prendas?: Prendas;
  /** 0,92–1,08 */
  altura?: number;
  /** 0,85 (delgado) – 1,25 (corpulento) */
  complexion?: number;
  /** 0 joven adulto – 1 mayor */
  edad?: number;
  accesorio?: Accesorio;
  diadema?: string;
  pendientes?: boolean;
  barba?: "perilla" | "sombra" | null;
}

export type EstadoAnim = "quieto" | "andar" | "correr" | "sentado" | "hablar" | "saludar" | "trabajar" | "usar" | "alegre" | "triste" | "enfado" | "sorpresa";
export type Expresion = "neutra" | "sonrisa" | "habla" | "triste" | "sorpresa" | "enfado" | "cerrados";

/* ── Material y color ────────────────────────────────────────────── */

let material: THREE.MeshStandardMaterial | null = null;
function matCuerpo() {
  return (material ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 }));
}

const col = (hex: string) => new THREE.Color(hex);
const mezclar = (a: string, b: string, k: number) => col(a).lerp(col(b), k);
type Pincel = THREE.Color | ((y: number, x: number, z: number) => THREE.Color);

function pintar(g: THREE.BufferGeometry, c: Pincel) {
  const p = g.getAttribute("position");
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = typeof c === "function" ? c(p.getY(i), p.getX(i), p.getZ(i)) : c;
    arr[i * 3] = k.r;
    arr[i * 3 + 1] = k.g;
    arr[i * 3 + 2] = k.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

function limpiar(g: THREE.BufferGeometry) {
  const r = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(r.attributes)) if (k !== "position" && k !== "normal" && k !== "color") r.deleteAttribute(k);
  return r;
}

function fundir(gs: THREE.BufferGeometry[]) {
  const m = mergeGeometries(gs.map(limpiar), false);
  if (!m) throw new Error("No se pudieron fundir las piezas del personaje");
  return m;
}

/* ── Formas base ─────────────────────────────────────────────────── */

/** Cápsula de revolución que cuelga del pivote: la cúpula de arriba queda centrada en él (articulación sin huecos). */
function capsula(r0: number, r1: number, largo: number, seg = 12, anillo = 6) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= anillo; i++) {
    const a = -Math.PI / 2 + (i / anillo) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r1 + 0.0001, -largo + Math.sin(a) * r1 + r1));
  }
  for (let i = 0; i <= anillo; i++) {
    const a = (i / anillo) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r0 + 0.0001, Math.sin(a) * r0));
  }
  return new THREE.LatheGeometry(pts, seg);
}

function perfil(puntos: [number, number][], seg: number, sx = 1, sz = 1) {
  const g = new THREE.LatheGeometry(puntos.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg);
  g.scale(sx, 1, sz);
  g.computeVertexNormals();
  return g;
}

function esferaDeformada(r: number, ws: number, hs: number, f?: (v: THREE.Vector3) => void) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  if (f) {
    const p = g.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      f(v);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
  }
  return g;
}

/** Elipsoide girado y colocado (lóbulos de pelo, músculos, capucha…). */
function lobulo(c: [number, number, number], radios: [number, number, number], giro: [number, number, number] = [0, 0, 0], seg = 12) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.7)));
  g.scale(...radios);
  g.rotateX(giro[0]).rotateY(giro[1]).rotateZ(giro[2]);
  g.translate(...c);
  return g;
}

/**
 * Casco recortado: esfera unidad de la que se conservan los triángulos cuya
 * dirección cumple `queda`, escalada a `radios`, desplazada y deformada.
 */
function casco(radios: [number, number, number], centro: [number, number, number], queda: (d: THREE.Vector3) => boolean, deforma?: (d: THREE.Vector3) => number, seg = 30) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const p = g.getAttribute("position");
  const d = new THREE.Vector3();
  const vale: boolean[] = [];
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i);
    vale.push(queda(d));
    const k = deforma ? deforma(d) : 1;
    p.setXYZ(i, d.x * radios[0] * k + centro[0], d.y * radios[1] * k + centro[1], d.z * radios[2] * k + centro[2]);
  }
  const idx = g.index!;
  const nuevo: number[] = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i);
    const b = idx.getX(i + 1);
    const c = idx.getX(i + 2);
    if (vale[a] && vale[b] && vale[c]) nuevo.push(a, c, b);
  }
  g.setIndex(nuevo);
  g.computeVertexNormals();
  return g;
}

/* ── Medidas ─────────────────────────────────────────────────────── */

interface Medidas {
  cadera: number;
  muslo: number;
  pierna: number;
  torso: number;
  hombro: number;
  brazo: number;
  antebrazo: number;
  cabeza: number;
  anchoCadera: number;
  anchoPecho: number;
  cintura: number;
  grosor: number;
}

function medidas(a: Aspecto): Medidas {
  const m = a.sexo === "m";
  const k = a.complexion ?? 1;
  return {
    cadera: 0.93,
    muslo: 0.45,
    pierna: 0.43,
    torso: 0.47,
    hombro: m ? 0.15 : 0.18,
    brazo: m ? 0.26 : 0.28,
    antebrazo: m ? 0.23 : 0.25,
    cabeza: 0.128,
    anchoCadera: (m ? 0.165 : 0.15) * Math.sqrt(k),
    anchoPecho: (m ? 0.145 : 0.17) * k,
    cintura: (m ? 0.112 : 0.135) * k,
    grosor: k,
  };
}

/* ── Prendas a partir del atuendo ────────────────────────────────── */

function prendasDe(a: Aspecto): Prendas {
  if (a.prendas) return a.prendas;
  const r2 = a.ropa2 ?? mezclar(a.ropa, "#FFFFFF", 0.6).getStyle();
  const m = a.sexo === "m";
  switch (a.atuendo) {
    case "verano":
      return { arriba: { tipo: "camiseta", color: a.ropa, manga: "corta" }, abajo: { tipo: "corto", color: a.pantalon ?? "#C9B48E" }, calzado: { tipo: "deportiva", color: a.calzado ?? "#F2F2EE" } };
    case "vestido":
      return { arriba: { tipo: "blusa", color: a.ropa, manga: "corta" }, abajo: { tipo: "falda", color: a.ropa }, calzado: { tipo: m ? "tacon" : "zapato", color: a.calzado ?? "#7A4B33" } };
    case "camarero":
      return { arriba: { tipo: "camisa", color: "#F7F7F4", manga: "remangada" }, capa: { tipo: "chaleco", color: "#1E1F24" }, abajo: { tipo: "pantalon", color: a.pantalon ?? "#1E1F24" }, calzado: { tipo: "zapato", color: a.calzado ?? "#1A1A1C" }, delantal: "#1A1B1F", cinturon: "#1A1A1C" };
    case "pescador":
      return { arriba: { tipo: "jersey", color: a.ropa, manga: "remangada" }, capa: { tipo: "peto", color: "#E3B320" }, abajo: { tipo: "pantalon", color: "#E3B320" }, calzado: { tipo: "katiuska", color: a.calzado ?? "#2B4A2E" } };
    case "trabajo":
      return { arriba: { tipo: "camiseta", color: a.ropa, manga: "corta" }, capa: { tipo: "reflectante", color: "#F07A1A" }, abajo: { tipo: "pantalon", color: a.pantalon ?? "#3E4652" }, calzado: { tipo: "bota", color: a.calzado ?? "#5A4232" }, cinturon: "#3A2A20" };
    default:
      return m
        ? { arriba: { tipo: "camiseta", color: a.ropa, manga: "corta" }, abajo: { tipo: "vaquero", color: a.pantalon ?? "#6E8FB8" }, calzado: { tipo: "deportiva", color: a.calzado ?? "#F2F2EE" } }
        : { arriba: { tipo: "polo", color: a.ropa, manga: "corta", color2: r2 }, abajo: { tipo: "pantalon", color: a.pantalon ?? "#3B4A63" }, calzado: { tipo: "deportiva", color: a.calzado ?? "#F2F2EE" }, cinturon: "#5A3A24" };
  }
}

/* ── Cara: textura dibujada por expresión ────────────────────────── */

const caras = new Map<string, THREE.CanvasTexture>();
const ARC_CARA = { phi0: Math.PI / 2 - 0.95, phiL: 1.9, th0: 0.3 * Math.PI, thL: 0.58 * Math.PI };

function textCara(e: Expresion, a: Aspecto) {
  const ojos = a.ojos ?? "#5A3B22";
  const clave = `${e}|${ojos}|${a.sexo}|${a.piel}|${a.pelo}|${a.barba ?? ""}`;
  let t = caras.get(clave);
  if (t) return t;
  const S = 512;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const g = cv.getContext("2d")!;
  const h = a.sexo === "h";
  const linea = "#2B1D18";
  const ceja = mezclar(a.pelo, "#1A120E", 0.35).getStyle();
  const labio = mezclar(a.piel, "#B5524C", h ? 0.38 : 0.62).getStyle();
  const labioOsc = mezclar(a.piel, "#6E2C2A", 0.6).getStyle();
  const sombra = mezclar(a.piel, "#6B3A2C", 0.35);
  const EY = 206;
  const EX = 80;
  const CX = 256;
  const MY = 350;
  // Sombras suaves: cuencas, bajo la nariz, bajo el labio y rubor.
  const halo = (x: number, y: number, rx: number, ry: number, color: string, alfa: number) => {
    g.save();
    g.translate(x, y);
    g.scale(rx / ry, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    gr.addColorStop(0, color.replace("ALFA", String(alfa)));
    gr.addColorStop(1, color.replace("ALFA", "0"));
    g.fillStyle = gr;
    g.fillRect(-ry, -ry, ry * 2, ry * 2);
    g.restore();
  };
  const somb = `rgba(${Math.round(sombra.r * 255)},${Math.round(sombra.g * 255)},${Math.round(sombra.b * 255)},ALFA)`;
  for (const s of [-1, 1]) {
    halo(CX + s * EX, EY - 6, 46, 30, somb, 0.22);
    halo(CX + s * 92, 300, 40, 26, "rgba(236,120,112,ALFA)", h ? 0.12 : 0.28);
  }
  halo(CX, 300, 34, 12, somb, 0.3);
  halo(CX, MY + 34, 30, 10, somb, 0.22);
  // Barba: perilla y sombra de afeitado.
  if (a.barba) {
    const bc = mezclar(a.pelo, a.piel, a.barba === "sombra" ? 0.55 : 0.15);
    const rgba = (al: number) => `rgba(${Math.round(bc.r * 255)},${Math.round(bc.g * 255)},${Math.round(bc.b * 255)},${al})`;
    g.fillStyle = rgba(a.barba === "sombra" ? 0.35 : 0.9);
    g.beginPath();
    g.moveTo(CX - 26, MY + 22);
    g.quadraticCurveTo(CX, MY + 14, CX + 26, MY + 22);
    g.quadraticCurveTo(CX + 22, MY + 74, CX, MY + 82);
    g.quadraticCurveTo(CX - 22, MY + 74, CX - 26, MY + 22);
    g.fill();
    g.fillStyle = rgba(a.barba === "sombra" ? 0.25 : 0.55);
    g.beginPath();
    g.ellipse(CX, MY - 18, 36, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Ojos almendrados con iris de color, pupila, brillos y párpados (algo mayores que el natural).
  for (const s of [-1, 1]) {
    const x = CX + s * EX;
    g.save();
    g.translate(x, EY);
    g.scale(1.18, 1.18);
    g.translate(-x, -EY);
    const ab = e === "sorpresa" ? 1.25 : e === "enfado" ? 0.78 : e === "triste" ? 0.9 : 1;
    if (e === "cerrados" || e === "sonrisa") {
      g.strokeStyle = linea;
      g.lineWidth = 7;
      g.lineCap = "round";
      g.beginPath();
      if (e === "cerrados") g.arc(x, EY - 10, 26, 0.18 * Math.PI, 0.82 * Math.PI);
      else g.arc(x, EY + 16, 25, 1.18 * Math.PI, 1.82 * Math.PI);
      g.stroke();
    } else {
      const ojo = () => {
        g.beginPath();
        g.moveTo(x - 30, EY + 2);
        g.bezierCurveTo(x - 20, EY - 26 * ab, x + 18, EY - 28 * ab, x + 31, EY - 2);
        g.bezierCurveTo(x + 20, EY + 18 * ab, x - 18, EY + 19 * ab, x - 30, EY + 2);
        g.closePath();
      };
      g.save();
      ojo();
      g.fillStyle = "#FBFAF7";
      g.fill();
      g.clip();
      // Iris con degradado y aro oscuro.
      const ix = x - s * 2;
      const iy = EY + 1;
      const gr = g.createRadialGradient(ix, iy + 6, 2, ix, iy, 19);
      gr.addColorStop(0, mezclar(ojos, "#FFFFFF", 0.35).getStyle());
      gr.addColorStop(0.75, ojos);
      gr.addColorStop(1, mezclar(ojos, "#000000", 0.55).getStyle());
      g.fillStyle = gr;
      g.beginPath();
      g.arc(ix, iy, 19, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#120C0A";
      g.beginPath();
      g.arc(ix, iy, 8.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#FFFFFF";
      g.beginPath();
      g.arc(ix + 6, iy - 7, 5.5, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(ix - 6, iy + 7, 2.5, 0, Math.PI * 2);
      g.fill();
      // Sombra del párpado sobre el ojo.
      g.fillStyle = "rgba(60,30,20,0.18)";
      g.fillRect(x - 34, EY - 30, 68, 14);
      g.restore();
      // Párpado superior marcado (rabillo y pestañas en las mujeres) y línea inferior suave.
      g.strokeStyle = linea;
      g.lineCap = "round";
      g.lineWidth = h ? 6 : 7.5;
      g.beginPath();
      g.moveTo(x - 31, EY + 3);
      g.bezierCurveTo(x - 20, EY - 27 * ab, x + 18, EY - 29 * ab, x + 32, EY - 2);
      g.stroke();
      if (!h) {
        g.lineWidth = 4;
        for (const [dx, dy, ex, ey] of [[s * 30, -3, s * 42, -14], [s * 22, -14, s * 31, -27], [s * 10, -20, s * 15, -33]]) {
          g.beginPath();
          g.moveTo(x + dx, EY + dy * ab);
          g.lineTo(x + ex, EY + ey * ab);
          g.stroke();
        }
      }
      g.strokeStyle = "rgba(60,35,28,0.45)";
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x - 24, EY + 10);
      g.quadraticCurveTo(x, EY + 21 * ab, x + 26, EY + 7);
      g.stroke();
    }
    g.restore();
    // Cejas: gruesas en ellos, arqueadas y finas en ellas; cambian con la emoción.
    g.strokeStyle = ceja;
    g.lineCap = "round";
    g.lineWidth = h ? 13 : 7;
    const by = e === "sorpresa" ? EY - 66 : EY - 50;
    const dentro = e === "enfado" ? 12 : e === "triste" ? -12 : 0;
    g.beginPath();
    g.moveTo(x - s * 30, by + 6 + dentro);
    g.quadraticCurveTo(x - s * 4, by - (h ? 8 : 14), x + s * 32, by + (e === "triste" ? 8 : 4));
    g.stroke();
  }
  // Fosas nasales.
  g.fillStyle = mezclar(a.piel, "#5A2E22", 0.55).getStyle();
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(CX + s * 10, 294, 5, 3, s * 0.4, 0, Math.PI * 2);
    g.fill();
  }
  // Boca con labios.
  g.lineCap = "round";
  switch (e) {
    case "sonrisa":
      g.fillStyle = "#6E2A2A";
      g.beginPath();
      g.moveTo(CX - 40, MY - 8);
      g.quadraticCurveTo(CX, MY + 36, CX + 40, MY - 8);
      g.quadraticCurveTo(CX, MY + 8, CX - 40, MY - 8);
      g.fill();
      g.fillStyle = "#FFFFFF";
      g.beginPath();
      g.moveTo(CX - 30, MY - 3);
      g.quadraticCurveTo(CX, MY + 8, CX + 30, MY - 3);
      g.quadraticCurveTo(CX, MY + 14, CX - 30, MY - 3);
      g.fill();
      break;
    case "habla":
    case "sorpresa": {
      const w = e === "sorpresa" ? 15 : 24;
      const hh = e === "sorpresa" ? 20 : 13;
      g.fillStyle = labio;
      g.beginPath();
      g.ellipse(CX, MY + 2, w + 6, hh + 5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#5A2224";
      g.beginPath();
      g.ellipse(CX, MY + 2, w, hh, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#C9605E";
      g.beginPath();
      g.ellipse(CX, MY + hh * 0.55, w * 0.6, hh * 0.35, 0, 0, Math.PI * 2);
      g.fill();
      break;
    }
    default: {
      const curva = e === "triste" ? -8 : e === "enfado" ? -2 : 7;
      // Labio inferior (más claro) y línea de la boca.
      g.fillStyle = labio;
      g.beginPath();
      g.moveTo(CX - 30, MY);
      g.quadraticCurveTo(CX, MY + (h ? 18 : 24), CX + 30, MY);
      g.quadraticCurveTo(CX, MY + 4, CX - 30, MY);
      g.fill();
      if (!h) {
        g.beginPath();
        g.moveTo(CX - 30, MY);
        g.quadraticCurveTo(CX - 14, MY - 14, CX, MY - 7);
        g.quadraticCurveTo(CX + 14, MY - 14, CX + 30, MY);
        g.closePath();
        g.fill();
      }
      g.strokeStyle = labioOsc;
      g.lineWidth = 4.5;
      g.beginPath();
      g.moveTo(CX - 33, MY - curva * 0.4);
      g.quadraticCurveTo(CX, MY + curva, CX + 33, MY - curva * 0.4);
      g.stroke();
    }
  }
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  caras.set(clave, t);
  return t;
}

/* ── Cabeza ──────────────────────────────────────────────────────── */

/** Óvalo con cráneo amplio, cara algo plana, pómulos y mandíbula que se estrecha hacia la barbilla. */
function deformarCabeza(sexo: Sexo, r: number) {
  return (v: THREE.Vector3) => {
    v.y *= 1.1;
    const abajo = Math.max(0, -v.y / (r * 1.1));
    const arriba = Math.max(0, v.y / (r * 1.1));
    const mand = 1 - (sexo === "h" ? 0.24 : 0.32) * Math.pow(abajo, 1.5);
    v.x *= 0.92 * mand * (1 + 0.04 * arriba);
    if (v.z > 0) v.z *= 0.92 * (1 - 0.12 * Math.pow(abajo, 1.6));
    else v.z *= 1.05;
    // Barbilla un poco adelantada.
    if (v.z > 0 && abajo > 0.6) v.z += r * 0.08 * (abajo - 0.6);
  };
}

/* ── Pelo esculpido ──────────────────────────────────────────────── */

export function geoPelo(a: Aspecto, r: number): THREE.BufferGeometry[] {
  const P: THREE.BufferGeometry[] = [];
  const R = (x: number) => x * r;
  /** Línea del pelo según la dirección: frente, sienes (sobre las orejas) y nuca. */
  const linea = (frente: number, sien: number, nuca: number) => (d: THREE.Vector3) => {
    const lim = d.z > 0.35 ? frente : d.z > -0.25 ? sien + (frente - sien) * Math.max(0, (d.z + 0.25) / 0.6) : nuca;
    return d.y > lim;
  };
  const corto = () => casco([R(1.03), R(1.19), R(1.12)], [0, R(0.03), R(-0.02)], linea(0.14, -0.02, -0.42));
  switch (a.peinado) {
    case "calvo":
      P.push(casco([R(1.0), R(1.2), R(1.1)], [0, 0, R(-0.02)], (d) => d.y < 0.28 && d.y > -0.42 && d.z < 0.2));
      break;
    case "corto":
      // Peinado hacia atrás con volumen arriba, raya marcada y patillas.
      P.push(corto());
      P.push(lobulo([0, R(0.95), R(0.2)], [R(0.78), R(0.4), R(0.88)], [-0.25, 0, 0], 16));
      for (const x of [-0.42, -0.14, 0.16, 0.44]) P.push(lobulo([R(x), R(1.02), R(-0.05)], [R(0.2), R(0.24), R(0.92)], [-0.1, x * 0.3, 0], 10));
      P.push(lobulo([R(0.18), R(0.82), R(0.72)], [R(0.55), R(0.28), R(0.36)], [-0.6, 0.2, -0.15], 12));
      for (const s of [-1, 1]) P.push(lobulo([R(s * 0.88), R(-0.05), R(0.28)], [R(0.1), R(0.34), R(0.17)], [0, 0, s * 0.08], 8));
      break;
    case "tupe":
      // Tupé alto en llamas hacia atrás.
      P.push(corto());
      for (const [x, h, z] of [[-0.42, 1.2, 0.3], [0, 1.4, 0.42], [0.4, 1.25, 0.26], [-0.2, 1.3, -0.15], [0.22, 1.3, -0.2]])
        P.push(lobulo([R(x), R(h), R(z)], [R(0.3), R(0.62), R(0.42)], [-0.75, x * 0.6, -x * 0.5], 12));
      for (const s of [-1, 1]) P.push(lobulo([R(s * 0.86), R(0.15), R(0.15)], [R(0.14), R(0.38), R(0.3)], [0, 0, s * 0.1], 8));
      break;
    case "largo": {
      // Media melena voluminosa con ondas y flequillo ladeado.
      P.push(
        casco(
          [R(1.2), R(1.22), R(1.18)],
          [0, R(0.02), R(-0.08)],
          (d) => d.y > -0.86 && !(d.z > 0.18 && d.y < 0.22) && !(d.z > -0.05 && d.y < -0.05 && Math.abs(d.x) < 0.8),
          (d) => 1 + (d.y < -0.2 ? 0.07 * Math.sin(Math.atan2(d.x, d.z) * 7) * Math.min(1, -d.y * 1.6) : 0) + (d.y < -0.5 ? 0.12 * (-d.y - 0.5) : 0),
        ),
      );
      for (const [x, y, gz] of [[-0.45, 0.42, 0.35], [-0.05, 0.5, 0.25], [0.35, 0.42, 0.15], [0.66, 0.22, 0.6]]) P.push(lobulo([R(x), R(y), R(0.9)], [R(0.42), R(0.24), R(0.2)], [0.3, 0, gz], 12));
      for (const s of [-1, 1]) P.push(lobulo([R(s * 1.0), R(-0.82), R(-0.1)], [R(0.3), R(0.22), R(0.55)], [0, 0, s * -0.35], 12));
      break;
    }
    case "coleta":
      P.push(casco([R(1.04), R(1.19), R(1.13)], [0, R(0.03), R(-0.02)], linea(0.16, 0.0, -0.3)));
      for (const x of [-0.3, 0, 0.3]) P.push(lobulo([R(x), R(0.9), R(0.45)], [R(0.22), R(0.2), R(0.6)], [-0.5, 0, 0], 10));
      P.push(new THREE.TorusGeometry(R(0.17), R(0.06), 6, 14).translate(0, R(0.3), R(-1.1)));
      [[0.3, -1.12, 0.3], [-0.2, -1.32, 0.27], [-0.75, -1.36, 0.22], [-1.25, -1.28, 0.16]].forEach(([y, z, rr]) => P.push(lobulo([0, R(y), R(z)], [R(rr), R(0.42), R(rr)], [0.25, 0, 0], 10)));
      break;
    case "mono":
      P.push(casco([R(1.04), R(1.19), R(1.13)], [0, R(0.03), R(-0.02)], linea(0.16, 0.0, -0.3)));
      P.push(lobulo([0, R(1.12), R(-0.55)], [R(0.45), R(0.38), R(0.45)], [0, 0, 0], 14));
      for (let i = 0; i < 6; i++) P.push(lobulo([R(Math.cos(i) * 0.3), R(1.15 + Math.sin(i * 2) * 0.1), R(-0.55 + Math.sin(i) * 0.3)], [R(0.18), R(0.14), R(0.18)], [0, i, 0], 8));
      break;
    case "rizado":
      P.push(casco([R(1.12), R(1.24), R(1.18)], [0, R(0.04), R(-0.05)], linea(0.16, -0.05, -0.55)));
      for (let i = 0; i < 60; i++) {
        const u = (i * 0.618) % 1;
        const v = (i * 0.414) % 1;
        const th = Math.acos(1 - v * 1.25);
        const ph = u * Math.PI * 2;
        const d = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
        if (!linea(0.16, -0.05, -0.55)(d)) continue;
        P.push(new THREE.IcosahedronGeometry(R(0.2), 1).translate(d.x * R(1.12), d.y * R(1.3) + R(0.05), d.z * R(1.18) - R(0.05)));
      }
      break;
  }
  // Color con vetas de mechones (más claro arriba, rayas finas alrededor).
  const c = col(a.pelo);
  return P.map((g) =>
    pintar(g, (y, x, z) => {
      const k = 0.86 + 0.16 * Math.max(-1, Math.min(1, y / r)) + 0.06 * Math.sin(Math.atan2(x, z) * 16 + y * 40);
      return c.clone().multiplyScalar(k);
    }),
  );
}

/* ── Construcción ────────────────────────────────────────────────── */

interface Rig {
  raiz: THREE.Group;
  cadera: THREE.Object3D;
  columna: THREE.Object3D;
  cuello: THREE.Object3D;
  cabeza: THREE.Object3D;
  hombro: [THREE.Object3D, THREE.Object3D];
  codo: [THREE.Object3D, THREE.Object3D];
  muslo: [THREE.Object3D, THREE.Object3D];
  rodilla: [THREE.Object3D, THREE.Object3D];
  cara: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  med: Medidas;
}

export interface Personaje extends THREE.Group {
  userData: {
    personaje: true;
    aspecto: Aspecto;
    rig: Rig;
    lejos: { cuerpo: THREE.Object3D; piernas: [THREE.Object3D, THREE.Object3D] };
    anim: EstadoInterno;
  };
}

interface EstadoInterno {
  estado: EstadoAnim;
  fase: number;
  velocidad: number;
  parpadeo: number;
  expresion: Expresion;
  hablarT: number;
  rotPrevia: number;
  giro: number;
}

/** Crea un personaje con su esqueleto, sus prendas por capas y su versión lejana. */
export function crearPersonaje(a: Aspecto): Personaje {
  const md = medidas(a);
  const pr = prendasDe(a);
  const r = md.cabeza;
  const piel = col(a.piel);
  const pielSombra = mezclar(a.piel, "#7A3E2E", 0.22);
  const cArriba = col(pr.arriba.color);
  const cCapa = pr.capa ? col(pr.capa.color) : null;
  const cAbajo = col(pr.abajo.color);
  const cCalz = col(pr.calzado.color);
  const falda = pr.abajo.tipo === "falda";
  const mujer = a.sexo === "m";
  const oscuro = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);

  const raiz = new THREE.Group() as Personaje;
  const det = new THREE.Group();
  const malla = (g: THREE.BufferGeometry) => {
    const m = new THREE.Mesh(g, matCuerpo());
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // Cadera: pelvis con pantalón (o falda), cinturón con hebilla, faldón interior y delantal.
  const cadera = new THREE.Object3D();
  cadera.position.y = md.cadera;
  det.add(cadera);
  const piezasCadera: THREE.BufferGeometry[] = [
    pintar(perfil([[0.05, -0.14], [md.anchoCadera * 0.85, -0.1], [md.anchoCadera, -0.03], [md.cintura * 1.04, 0.07], [md.cintura, 0.1]], 16, 1.06, 0.78), falda ? col(pr.abajo.color) : cAbajo),
  ];
  if (falda) piezasCadera.push(pintar(perfil([[md.anchoCadera * 1.7, -0.46], [md.anchoCadera * 1.62, -0.4], [md.anchoCadera * 1.25, -0.16], [md.cintura * 1.06, 0.07]], 20, 1.05, 0.86), (y) => oscuro(cAbajo, 0.84 + 0.16 * Math.min(1, (y + 0.46) * 2.2))));
  if (pr.bajo) piezasCadera.push(pintar(perfil([[md.anchoCadera * 1.12, -0.08], [md.anchoCadera * 1.1, 0.0], [md.cintura * 1.12, 0.06]], 16, 1.06, 0.8), col(pr.bajo)));
  if (pr.cinturon) {
    piezasCadera.push(pintar(perfil([[md.cintura * 1.09, 0.05], [md.cintura * 1.1, 0.075], [md.cintura * 1.09, 0.1]], 16, 1.06, 0.8), col(pr.cinturon)));
    piezasCadera.push(pintar(new THREE.BoxGeometry(0.05, 0.04, 0.012).translate(0, 0.075, md.cintura * 1.1 * 0.8 + 0.006), col("#C9A24A")));
  }
  if (pr.delantal) piezasCadera.push(pintar(new THREE.CylinderGeometry(md.anchoCadera * 1.1, md.anchoCadera * 1.3, 0.55, 18, 1, true, -Math.PI * 0.42, Math.PI * 0.84).translate(0, -0.2, 0).scale(1.05, 1, 0.84), col(pr.delantal)));
  if (pr.abajo.tipo === "vaquero") for (const s of [-1, 1]) piezasCadera.push(pintar(new THREE.BoxGeometry(0.004, 0.06, 0.05).translate(s * md.anchoCadera * 0.9, 0.0, md.anchoCadera * 0.45), oscuro(cAbajo, 0.75)));
  cadera.add(malla(fundir(piezasCadera)));

  // Torso con capas: abertura del chaleco o la chaqueta, peto, chaleco reflectante, escote, cuello y bolsillo.
  const columna = new THREE.Object3D();
  columna.position.y = 0.06;
  cadera.add(columna);
  const capa = pr.capa;
  const colorTorso = (y: number, x: number, z: number) => {
    const ax = Math.abs(x);
    if (capa) {
      switch (capa.tipo) {
        case "chaleco":
          if (!(z > 0 && ax < 0.016 + Math.max(0, y - 0.15) * 0.3)) return cCapa!;
          break;
        case "chaqueta":
        case "sudadera":
          if (!(z > 0 && ax < 0.05 + Math.max(0, y - 0.32) * 0.4)) return y < 0.03 ? oscuro(cCapa!, 0.85) : cCapa!;
          break;
        case "peto":
          if ((z > 0 && y < 0.34 && ax < 0.11) || (Math.abs(ax - 0.075) < 0.022 && y < 0.46)) return cCapa!;
          break;
        case "reflectante":
          if (y < 0.43 && !(z > 0 && ax < 0.02)) return Math.abs(y - 0.2) < 0.018 || Math.abs(y - 0.3) < 0.018 ? col("#E9EADF") : cCapa!;
          break;
      }
    }
    const escote = pr.arriba.tipo === "blusa" ? 0.085 : pr.arriba.tipo === "camiseta" ? 0.055 : 0;
    if (escote && z > 0 && y > 0.43 && ax < escote) return piel;
    return cArriba;
  };
  const torso = perfil([[md.cintura, 0], [md.cintura * 0.98, 0.1], [md.cintura * 1.08, 0.2], [md.anchoPecho, 0.3], [md.anchoPecho * 1.04, 0.37], [md.anchoPecho * 0.98, 0.42], [0.11, 0.455], [0.05, 0.48]].flatMap(([rr, yy], i, arr) => (i ? [[(rr + arr[i - 1][0]) / 2, (yy + arr[i - 1][1]) / 2], [rr, yy]] : [[rr, yy]])) as [number, number][], 40, 1.15, 0.72);
  const piezasTorso: THREE.BufferGeometry[] = [pintar(torso, colorTorso)];
  if (mujer) for (const s of [-1, 1]) piezasTorso.push(pintar(lobulo([s * 0.062, 0.32, md.anchoPecho * 0.5], [0.062, 0.058, 0.05], [0, 0, 0], 10), (y, x, z) => colorTorso(y, x, z)));
  // Cuello de camisa o polo.
  if (pr.arriba.tipo === "camisa" || pr.arriba.tipo === "polo") {
    const cc = col(pr.arriba.color2 ?? pr.arriba.color);
    for (const s of [-1, 1]) piezasTorso.push(pintar(new THREE.BoxGeometry(0.06, 0.012, 0.05).rotateZ(s * 0.5).rotateY(s * -0.5).translate(s * 0.035, 0.465, 0.04), cc));
    piezasTorso.push(pintar(new THREE.TorusGeometry(0.055, 0.012, 6, 14, Math.PI * 1.3).rotateX(Math.PI / 2).rotateY(Math.PI * 0.85).scale(1.1, 1, 0.9).translate(0, 0.468, 0), cc));
    if (pr.arriba.tipo === "camisa" && !capa) for (let i = 0; i < 4; i++) piezasTorso.push(pintar(new THREE.SphereGeometry(0.006, 5, 4).translate(0, 0.42 - i * 0.08, md.anchoPecho * 0.72 + 0.004), col("#E8E4DA")));
  }
  if (pr.arriba.tipo === "jersey") piezasTorso.push(pintar(perfil([[0.06, 0.45], [0.062, 0.49]], 12), oscuro(cArriba, 0.85)));
  if (capa?.tipo === "chaleco") piezasTorso.push(pintar(new THREE.BoxGeometry(0.05, 0.035, 0.006).translate(0.075, 0.33, md.anchoPecho * 0.72 + 0.006), oscuro(cCapa!, 0.8)));
  if (capa?.capucha) piezasTorso.push(pintar(lobulo([0, 0.45, -0.1], [0.13, 0.06, 0.085], [0.3, 0, 0], 12), col(capa.capucha)));
  if (capa && (capa.tipo === "chaqueta" || capa.tipo === "sudadera")) for (const s of [-1, 1]) piezasTorso.push(pintar(new THREE.BoxGeometry(0.035, 0.22, 0.012).rotateY(s * 0.15).translate(s * 0.06, 0.32, md.anchoPecho * 0.7), oscuro(cCapa!, 0.9)));
  columna.add(malla(fundir(piezasTorso)));

  // Cuello y cabeza (con pelo, nariz, orejas y accesorios en una sola malla).
  const cuello = new THREE.Object3D();
  cuello.position.y = md.torso - 0.02;
  columna.add(cuello);
  cuello.add(malla(fundir([pintar(perfil([[0.046, -0.02], [0.042, 0.05], [0.045, 0.1]], 12), piel)])));
  const cabeza = new THREE.Object3D();
  cabeza.position.y = 0.08;
  cuello.add(cabeza);
  const centro = r * 1.06;
  const fc = deformarCabeza(a.sexo, r);
  const craneo = esferaDeformada(r, 28, 22, fc).translate(0, centro, 0.008);
  const piezasCabeza: THREE.BufferGeometry[] = [pintar(craneo, (y, _x, z) => piel.clone().lerp(pielSombra, z < 0 ? 0.18 : y < centro - r * 0.9 ? 0.12 : 0))];
  // Nariz: puente fino y punta con volumen.
  piezasCabeza.push(pintar(lobulo([0, centro - r * 0.12, r * 0.86], [r * 0.075, r * 0.24, r * 0.1], [-0.25, 0, 0], 10), piel.clone().lerp(pielSombra, 0.05)));
  piezasCabeza.push(pintar(lobulo([0, centro - r * 0.3, r * 0.93], [r * 0.105, r * 0.085, r * 0.1], [0, 0, 0], 10), piel.clone().lerp(pielSombra, 0.08)));
  // Orejas.
  for (const s of [-1, 1]) {
    piezasCabeza.push(pintar(lobulo([s * r * 0.9, centro - r * 0.08, -r * 0.05], [r * 0.12, r * 0.27, r * 0.19], [0, s * -0.3, 0], 10), piel.clone().lerp(pielSombra, 0.2)));
    if (a.pendientes) piezasCabeza.push(pintar(new THREE.SphereGeometry(r * 0.07, 8, 6).translate(s * r * 0.92, centro - r * 0.36, r * 0.02), col("#F4F1EA")));
  }
  for (const g of geoPelo(a, r)) piezasCabeza.push(g.translate(0, centro, 0.008));
  if (a.diadema) {
    piezasCabeza.push(pintar(new THREE.TorusGeometry(r * 1.17, r * 0.075, 6, 28, Math.PI).scale(1.02, 1, 1.08).rotateX(-0.35).translate(0, centro + r * 0.25, r * 0.08), col(a.diadema)));
    for (let i = 1; i < 8; i++) {
      const ang = (i / 8) * Math.PI;
      const v = new THREE.Vector3(Math.cos(ang) * r * 1.19, Math.sin(ang) * r * 1.02, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.35);
      piezasCabeza.push(pintar(new THREE.SphereGeometry(r * 0.035, 5, 4).translate(v.x, v.y + centro + r * 0.25, v.z + r * 0.12), col("#FFFFFF")));
    }
  }
  if (a.accesorio === "gafas") {
    const mont = col("#26211F");
    for (const s of [-1, 1]) piezasCabeza.push(pintar(new THREE.TorusGeometry(r * 0.25, r * 0.032, 5, 16).translate(s * r * 0.36, centro + r * 0.02, r * 0.95), mont));
    piezasCabeza.push(pintar(new THREE.BoxGeometry(r * 0.24, r * 0.04, r * 0.04).translate(0, centro + r * 0.06, r * 0.98), mont));
  }
  if (a.accesorio === "gorra" || a.atuendo === "pescador") {
    const c = a.atuendo === "pescador" ? col("#1F3550") : col(a.ropa2 ?? a.ropa);
    piezasCabeza.push(pintar(new THREE.SphereGeometry(r * 1.16, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 0.72, 1.08).translate(0, centro + r * 0.38, -r * 0.02), c));
    piezasCabeza.push(pintar(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 0.06, 18, 1, false, -Math.PI * 0.3, Math.PI * 0.6).scale(1, 1, 1.15).translate(0, centro + r * 0.4, r * 0.45), oscuro(c, 0.85)));
  }
  cabeza.add(malla(fundir(piezasCabeza)));
  // Cara: casquete transparente con ojos, cejas, nariz y boca dibujados (cambia con la expresión).
  const caraParche = new THREE.SphereGeometry(r * 1.004, 22, 16, ARC_CARA.phi0, ARC_CARA.phiL, ARC_CARA.th0, ARC_CARA.thL);
  {
    const p = caraParche.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      fc(v);
      p.setXYZ(i, v.x, v.y + centro, v.z + 0.008 + 0.0012);
    }
    caraParche.computeVertexNormals();
  }
  const cara = new THREE.Mesh(caraParche, new THREE.MeshStandardMaterial({ map: textCara("neutra", a), transparent: true, alphaTest: 0.04, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  cabeza.add(cara);

  // Brazos: hombro redondeado + manga; antebrazo + mano con dedos. Mangas de rayas, puños remangados.
  const mangaColor = capa && (capa.tipo === "chaqueta" || capa.tipo === "sudadera") ? cCapa! : cArriba;
  const rayas = capa?.rayas ? col(capa.rayas) : null;
  const tela = (y: number) => (rayas && Math.floor((y + 1) * 22) % 2 ? rayas : mangaColor);
  const hombros: THREE.Object3D[] = [];
  const codos: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const hombro = new THREE.Object3D();
    hombro.position.set(s * md.hombro * md.grosor ** 0.4, md.torso - 0.07, 0);
    hombro.rotation.z = s * 0.06;
    columna.add(hombro);
    const rb = (mujer ? 0.04 : 0.046) * md.grosor ** 0.6;
    const corta = pr.arriba.manga === "corta" && !(capa && (capa.tipo === "chaqueta" || capa.tipo === "sudadera"));
    const limite = corta ? -md.brazo * (mujer ? 0.32 : 0.48) : -99;
    const piezasBrazo = [
      pintar(capsula(rb * 1.08, rb * 0.92, md.brazo, 12), (y) => (y > limite ? tela(y) : piel)),
      pintar(lobulo([0, -0.01, 0], [rb * 1.45, rb * 1.3, rb * 1.35], [0, 0, 0], 12), tela(0)),
    ];
    if (corta) piezasBrazo.push(pintar(perfil([[rb * 1.3, limite], [rb * 1.32, limite + 0.025], [rb * 1.2, limite + 0.06]], 12), oscuro(mangaColor, 0.92)));
    hombro.add(malla(fundir(piezasBrazo)));
    const codo = new THREE.Object3D();
    codo.position.y = -md.brazo + rb * 0.9;
    hombro.add(codo);
    const L = md.antebrazo;
    const larga = pr.arriba.manga === "larga" || (capa && (capa.tipo === "chaqueta" || capa.tipo === "sudadera"));
    const remangada = pr.arriba.manga === "remangada" && !larga;
    const hastaManga = larga ? -L * 0.9 : remangada ? -L * 0.3 : 1;
    const piezasAnte = [pintar(capsula(rb * 0.92, rb * 0.7, L, 12), (y) => (y > hastaManga ? tela(y) : piel))];
    if (larga) piezasAnte.push(pintar(perfil([[rb * 0.95, -L * 0.93], [rb * 1.0, -L * 0.85]], 12), oscuro(mangaColor, 0.85)));
    if (remangada) piezasAnte.push(pintar(perfil([[rb * 1.12, -L * 0.34], [rb * 1.16, -L * 0.26], [rb * 1.05, -L * 0.18]], 12), oscuro(cArriba, 0.94)));
    // Mano: palma, cuatro dedos y pulgar.
    const ym = -L - 0.035;
    piezasAnte.push(pintar(lobulo([0, ym, 0.004], [0.026, 0.045, 0.04], [0, 0, 0], 10), piel));
    for (let i = 0; i < 4; i++) piezasAnte.push(pintar(capsula(0.009, 0.008, 0.055 - Math.abs(i - 1.5) * 0.008, 6, 2).translate(0, ym - 0.03, -0.024 + i * 0.016), piel));
    piezasAnte.push(pintar(capsula(0.011, 0.009, 0.045, 6, 2).rotateX(-0.6).translate(s * -0.01, ym + 0.01, 0.036), piel));
    if (s === -1 && mujer) piezasAnte.push(pintar(perfil([[rb * 0.78, -L * 0.88], [rb * 0.8, -L * 0.82]], 10), col("#2E6B7A")));
    codo.add(malla(fundir(piezasAnte)));
    hombros.push(hombro);
    codos.push(codo);
  }

  // Piernas: muslo; pierna con bajo vuelto, botas y zapatos (o tacón).
  const muslos: THREE.Object3D[] = [];
  const rodillas: THREE.Object3D[] = [];
  const tipoAbajo = pr.abajo.tipo;
  const tipoCalz = pr.calzado.tipo;
  for (const s of [-1, 1]) {
    const muslo = new THREE.Object3D();
    muslo.position.set(s * md.anchoCadera * 0.5, -0.06, 0);
    cadera.add(muslo);
    const rm = (mujer ? 0.068 : 0.072) * md.grosor ** 0.5;
    const vaquero = (y: number, z: number) => (tipoAbajo === "vaquero" ? cAbajo.clone().multiplyScalar(z > 0 && y > -0.3 ? 1.12 : 0.98) : cAbajo);
    muslo.add(malla(fundir([pintar(capsula(rm, rm * 0.72, md.muslo, 14), (y, _x, z) => (falda ? piel : tipoAbajo === "corto" && y < -md.muslo * 0.55 ? piel : vaquero(y, z)))])));
    const rodilla = new THREE.Object3D();
    rodilla.position.y = -md.muslo + rm * 0.68;
    muslo.add(rodilla);
    const P = md.pierna;
    const hastaPant = tipoAbajo === "pirata" ? -P * 0.52 : tipoAbajo === "corto" || falda ? 1 : -P * 0.97;
    const bota = tipoCalz === "bota" ? -P * 0.72 : tipoCalz === "katiuska" ? -P * 0.3 : -9;
    const piezas = [pintar(capsula(rm * 0.72, rm * 0.5, P, 14), (y, _x, z) => (y < bota ? cCalz : y > hastaPant ? vaquero(y, z) : piel))];
    if (tipoAbajo === "pirata") piezas.push(pintar(perfil([[rm * 0.82, hastaPant - 0.005], [rm * 0.86, hastaPant + 0.035], [rm * 0.78, hastaPant + 0.06]], 12), oscuro(cAbajo, 1.12)));
    else if (tipoAbajo === "pantalon" || tipoAbajo === "vaquero") piezas.push(pintar(perfil([[rm * 0.68, -P * 0.98], [rm * 0.7, -P * 0.86]], 12), cAbajo));
    if (tipoCalz === "bota" || tipoCalz === "katiuska") piezas.push(pintar(perfil([[rm * 0.66, bota - 0.02], [rm * 0.7, bota + 0.01]], 12), oscuro(cCalz, 0.8)));
    // Zapato con suela; el tacón eleva el talón.
    const tacon = tipoCalz === "tacon";
    const zapato = esferaDeformada(0.052, 14, 10, (v) => {
      v.z *= tacon ? 2.1 : 2.25;
      v.x *= tacon ? 0.72 : 0.9;
      if (v.y < 0) v.y *= 0.45;
      v.z += 0.042;
      if (tacon && v.z < 0.02) v.y += 0.025;
    }).translate(0, -P - 0.02, 0.012);
    piezas.push(pintar(zapato, (y, _x, z) => (tipoCalz === "deportiva" && y < -P - 0.03 ? col("#FFFFFF") : tipoCalz === "deportiva" && z > 0.07 ? oscuro(cCalz, 0.92) : cCalz)));
    if (!tacon) piezas.push(pintar(new THREE.CylinderGeometry(0.046, 0.046, 0.018, 14).scale(1, 1, 2.35).translate(0, -P - 0.045, 0.052), tipoCalz === "deportiva" ? col("#FFFFFF") : col("#2A2120")));
    else piezas.push(pintar(new THREE.CylinderGeometry(0.008, 0.012, 0.06, 6).translate(0, -P - 0.05, -0.01), oscuro(cCalz, 0.8)));
    rodilla.add(malla(fundir(piezas)));
    muslos.push(muslo);
    rodillas.push(rodilla);
  }

  const esc = ESCALA_PERSONAJE * (a.altura ?? 1) * (a.edad ? 1 - a.edad * 0.03 : 1);
  det.scale.setScalar(esc);

  // Versión lejana: mismo cuerpo fundido en 3 mallas (las piernas se mueven).
  const lejosG = new THREE.Group();
  lejosG.scale.setScalar(esc);
  det.updateMatrixWorld(true);
  const sup: THREE.BufferGeometry[] = [];
  const pie: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
  const inv = new THREE.Matrix4().copy(det.matrixWorld).invert();
  det.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m === cara) return;
    const g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    let lado = -1;
    for (let i = 0; i < 2; i++) {
      let p: THREE.Object3D | null = m;
      while (p) {
        if (p === muslos[i]) lado = i;
        p = p.parent;
      }
    }
    if (lado >= 0) pie[lado].push(g.translate(-muslos[lado].position.x, -(md.cadera - 0.06), 0));
    else sup.push(g);
  });
  const cuerpoLejos = malla(fundir(sup));
  lejosG.add(cuerpoLejos);
  const piernasLejos = pie.map((gs, i) => {
    const o = new THREE.Object3D();
    o.position.set(muslos[i].position.x, md.cadera - 0.06, 0);
    o.add(malla(fundir(gs)));
    lejosG.add(o);
    return o;
  }) as [THREE.Object3D, THREE.Object3D];

  const lod = new THREE.LOD();
  lod.addLevel(det, 0);
  lod.addLevel(lejosG, 48);
  raiz.add(lod);

  raiz.userData = {
    personaje: true,
    aspecto: a,
    rig: { raiz, cadera, columna, cuello, cabeza, hombro: [hombros[0], hombros[1]], codo: [codos[0], codos[1]], muslo: [muslos[0], muslos[1]], rodilla: [rodillas[0], rodillas[1]], cara, med: md },
    lejos: { cuerpo: cuerpoLejos, piernas: piernasLejos },
    anim: { estado: "quieto", fase: Math.random() * 10, velocidad: 0, parpadeo: 2 + Math.random() * 3, expresion: "neutra", hablarT: 0, rotPrevia: 0, giro: 0 },
  };
  return raiz;
}

export function ponerEstado(p: Personaje, estado: EstadoAnim, velocidad = 0) {
  p.userData.anim.estado = estado;
  p.userData.anim.velocidad = velocidad;
}

function expresar(p: Personaje, e: Expresion) {
  const an = p.userData.anim;
  if (an.expresion === e) return;
  an.expresion = e;
  const cara = p.userData.rig.cara;
  cara.material.map = textCara(e, p.userData.aspecto);
  cara.material.needsUpdate = true;
}

const lerpAng = (o: THREE.Object3D, x: number, y: number, z: number, k: number) => {
  o.rotation.x += (x - o.rotation.x) * k;
  o.rotation.y += (y - o.rotation.y) * k;
  o.rotation.z += (z - o.rotation.z) * k;
};

/**
 * Anima un personaje: andar, correr, girar, sentarse, conversar, saludar,
 * trabajar, usar objetos y emociones. Mismas curvas para todos (rig compartido).
 */
export function animarPersonaje(p: Personaje, t: number, dt: number) {
  const an = p.userData.anim;
  const R = p.userData.rig;
  const k = 1 - Math.exp(-dt * 12);
  // Giro sobre sí mismo: pasitos en el sitio.
  let dRot = p.rotation.y - an.rotPrevia;
  dRot = Math.atan2(Math.sin(dRot), Math.cos(dRot));
  an.rotPrevia = p.rotation.y;
  an.giro += (Math.min(1, Math.abs(dRot) / Math.max(dt, 1e-3) / 3) - an.giro) * k;
  let e = an.estado;
  if (e === "quieto" && an.giro > 0.25) e = "andar";
  const corre = e === "correr";
  const anda = e === "andar" || corre;
  const vel = anda ? Math.max(e === "andar" && an.estado === "quieto" ? 1.2 : 0, an.velocidad) : 0;
  // Cadencia de paso según la velocidad (zancada ~0,7 m andando y ~1,3 m corriendo, a escala).
  const zancada = (corre ? 1.3 : 0.72) * ESCALA_PERSONAJE;
  an.fase += anda ? dt * Math.min(corre ? 15 : 10, Math.max(5.5, (vel / zancada) * Math.PI)) : dt * 1.4;
  const f = an.fase;
  const s = Math.sin(f);
  const c = Math.cos(f);

  // Parpadeo y expresión.
  an.parpadeo -= dt;
  let cara: Expresion = ({ alegre: "sonrisa", triste: "triste", enfado: "enfado", sorpresa: "sorpresa", saludar: "sonrisa", hablar: Math.sin(t * 11) > 0 ? "habla" : "neutra" } as Partial<Record<EstadoAnim, Expresion>>)[e] ?? "neutra";
  if (an.parpadeo < 0) {
    if (an.parpadeo > -0.13) cara = cara === "sonrisa" ? cara : "cerrados";
    else an.parpadeo = 2.5 + Math.random() * 3.5;
  }
  expresar(p, cara);

  // Pose objetivo por defecto (de pie, relajado y respirando).
  const resp = Math.sin(t * 1.8 + f * 0.1) * 0.015;
  let cadY = R.med.cadera;
  let cad = [0, 0, 0];
  let col_ = [resp, 0, 0];
  let cab = [0, 0, 0];
  const hom: number[][] = [[0, 0, 0.06], [0, 0, -0.06]];
  const cod: number[][] = [[-0.15, 0, 0], [-0.15, 0, 0]];
  const mus: number[][] = [[0, 0, 0], [0, 0, 0]];
  const rod: number[][] = [[0, 0, 0], [0, 0, 0]];

  if (anda) {
    const A = corre ? 0.78 : 0.42;
    mus[0][0] = -s * A;
    mus[1][0] = s * A;
    rod[0][0] = Math.max(0, Math.sin(f + 0.9)) * (corre ? 1.5 : 0.75);
    rod[1][0] = Math.max(0, -Math.sin(f + 0.9)) * (corre ? 1.5 : 0.75);
    hom[0][0] = s * A * 0.75;
    hom[1][0] = -s * A * 0.75;
    cod[0][0] = corre ? -1.4 : -0.3 - Math.max(0, s) * 0.25;
    cod[1][0] = corre ? -1.4 : -0.3 - Math.max(0, -s) * 0.25;
    cadY += Math.abs(c) * (corre ? 0.05 : 0.025) - (corre ? 0.04 : 0.01);
    cad = [corre ? 0.18 : 0.04, s * 0.09, 0];
    col_ = [0.03, -s * 0.12, 0];
    cab = [corre ? -0.12 : -0.03, s * 0.06, 0];
  } else if (e === "sentado") {
    cadY = 0.48;
    mus[0][0] = mus[1][0] = -1.5;
    rod[0][0] = rod[1][0] = 1.5;
    hom[0] = [-0.35, 0, 0.1];
    hom[1] = [-0.35, 0, -0.1];
    cod[0][0] = cod[1][0] = -0.9;
    col_ = [-0.05 + resp, 0, 0];
  } else if (e === "hablar") {
    hom[1] = [-0.45 + Math.sin(t * 2.3) * 0.15, 0, -0.18];
    cod[1][0] = -1.1 + Math.sin(t * 3.1) * 0.3;
    hom[0] = [-0.2 + Math.sin(t * 1.7 + 1) * 0.1, 0, 0.12];
    cod[0][0] = -0.7;
    cab = [Math.sin(t * 2.6) * 0.07, Math.sin(t * 1.1) * 0.15, Math.sin(t * 1.9) * 0.04];
  } else if (e === "saludar") {
    hom[1] = [-0.25, 0, -2.6];
    cod[1] = [0, 0, Math.sin(t * 9) * 0.45 - 0.2];
    cab = [0, 0.1, -0.05];
  } else if (e === "trabajar") {
    col_ = [0.28, 0, 0];
    hom[0] = [-1.0 + Math.sin(t * 7) * 0.25, 0, 0.1];
    hom[1] = [-1.0 - Math.sin(t * 7) * 0.25, 0, -0.1];
    cod[0][0] = cod[1][0] = -0.6;
    cab = [0.25, 0, 0];
  } else if (e === "usar") {
    hom[1] = [-1.1, 0, -0.1];
    cod[1][0] = -0.5 + Math.sin(t * 3) * 0.1;
    cab = [0.15, 0, 0];
  } else if (e === "alegre") {
    const salto = Math.max(0, Math.sin(t * 7));
    cadY += salto * 0.12;
    hom[0] = [0, 0, 2.5];
    hom[1] = [0, 0, -2.5];
    cod[0] = [0, 0, -0.3];
    cod[1] = [0, 0, 0.3];
    rod[0][0] = rod[1][0] = salto * 0.4;
    mus[0][0] = mus[1][0] = -salto * 0.3;
    cab = [-0.15, 0, 0];
  } else if (e === "triste") {
    col_ = [0.2, 0, 0];
    cab = [0.38, 0, 0];
    hom[0] = [0.1, 0, 0.02];
    hom[1] = [0.1, 0, -0.02];
  } else if (e === "enfado") {
    hom[0] = [0.1, 0, 0.55];
    hom[1] = [0.1, 0, -0.55];
    cod[0] = [-0.2, 0, -1.6];
    cod[1] = [-0.2, 0, 1.6];
    cab = [0.1, 0, 0];
  } else if (e === "sorpresa") {
    hom[0] = [-0.6, 0, 0.5];
    hom[1] = [-0.6, 0, -0.5];
    cod[0][0] = cod[1][0] = -1.2;
    cab = [-0.18, 0, 0];
    col_ = [-0.08, 0, 0];
  } else {
    // Quieto: ligero balanceo y mirada que se pasea.
    cab = [Math.sin(t * 0.4 + f) * 0.04, Math.sin(t * 0.27 + f) * 0.25, 0];
    cad = [0, 0, Math.sin(t * 0.5 + f) * 0.02];
  }

  R.cadera.position.y += (cadY - R.cadera.position.y) * k;
  lerpAng(R.cadera, cad[0], cad[1], cad[2], k);
  lerpAng(R.columna, col_[0], col_[1], col_[2], k);
  lerpAng(R.cabeza, cab[0], cab[1], cab[2], k);
  for (let i = 0; i < 2; i++) {
    lerpAng(R.hombro[i], hom[i][0], hom[i][1], hom[i][2], k);
    lerpAng(R.codo[i], cod[i][0], cod[i][1], cod[i][2], k);
    lerpAng(R.muslo[i], mus[i][0], mus[i][1], mus[i][2], k);
    lerpAng(R.rodilla[i], rod[i][0], rod[i][1], rod[i][2], k);
  }
  // Versión lejana: solo piernas y un leve rebote.
  const L = p.userData.lejos;
  L.piernas[0].rotation.x = R.muslo[0].rotation.x;
  L.piernas[1].rotation.x = R.muslo[1].rotation.x;
  L.cuerpo.position.y = R.cadera.position.y - R.med.cadera;
}

/** Recolorea piel o ropa sin reconstruir el esqueleto (personalización en vivo). */
export function recolorear(p: Personaje, cambios: Partial<Pick<Aspecto, "piel" | "ropa">>) {
  const a: Aspecto = { ...p.userData.aspecto, ...cambios };
  // Con prendas detalladas, el color del jugador va a la capa exterior (o a la prenda de arriba).
  if (a.prendas && cambios.ropa) {
    const pr = structuredClone(a.prendas);
    if (pr.capa) pr.capa.color = cambios.ropa;
    else pr.arriba.color = cambios.ropa;
    a.prendas = pr;
  }
  const nuevo = crearPersonaje(a);
  // Se sustituye el contenido manteniendo el mismo grupo raíz (posición, giro, etiquetas…).
  const lodViejo = p.children[0];
  p.remove(lodViejo);
  const lodNuevo = nuevo.children[0];
  nuevo.remove(lodNuevo);
  p.add(lodNuevo);
  p.userData = { ...nuevo.userData, anim: p.userData.anim };
  p.userData.rig.raiz = p;
}


/* ── Personajes de referencia (aprobación del estilo) ───────────── */

export const REFERENCIA_HOMBRE: Aspecto = {
  sexo: "h", piel: "#D9A27E", pelo: "#3B2418", peinado: "corto", ojos: "#3E6B4A", barba: "perilla",
  atuendo: "informal", ropa: "#5B4A86",
  prendas: {
    arriba: { tipo: "camisa", color: "#D7E3C8", manga: "larga" },
    capa: { tipo: "chaleco", color: "#5B4A86" },
    abajo: { tipo: "pantalon", color: "#3A2E2C" },
    calzado: { tipo: "zapato", color: "#7A3E24" },
    cinturon: "#8A5A2E",
  },
  altura: 1.02,
};

export const REFERENCIA_MUJER: Aspecto = {
  sexo: "m", piel: "#F1C6A8", pelo: "#B5325A", peinado: "largo", ojos: "#3F7A4A", diadema: "#E8B530", pendientes: true,
  atuendo: "informal", ropa: "#E8C33A",
  prendas: {
    arriba: { tipo: "camiseta", color: "#D9535F", manga: "corta" },
    capa: { tipo: "chaqueta", color: "#E8C33A", rayas: "#2FA59A", capucha: "#2FA59A" },
    abajo: { tipo: "pirata", color: "#7FA6D3" },
    calzado: { tipo: "tacon", color: "#D9506E" },
    bajo: "#F4F1EA",
  },
  altura: 0.97,
  complexion: 0.95,
};
