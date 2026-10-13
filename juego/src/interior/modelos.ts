import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MUEBLES } from "../compartido/hogar/catalogo";

/**
 * Muebles en 3D para los interiores (1 unidad = 1 m). Cada modelo ocupa su
 * huella sin girar (ancho en x, fondo en z), con el origen en el centro de la
 * huella a ras de suelo y el respaldo hacia z− (contra la pared norte).
 */

const cacheMat = new Map<string, THREE.MeshStandardMaterial>();
export function matI(color: string, rugosidad = 0.75, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const k = `${color}|${rugosidad}|${JSON.stringify(extra)}`;
  if (!cacheMat.has(k)) cacheMat.set(k, new THREE.MeshStandardMaterial({ color, roughness: rugosidad, ...extra }));
  return cacheMat.get(k)!;
}

const sombra = <T extends THREE.Object3D>(o: T) => {
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
};

function bloque(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, color: string | THREE.Material, r = 0.03) {
  const m = new THREE.Mesh(
    r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)) : new THREE.BoxGeometry(w, h, d),
    typeof color === "string" ? matI(color) : color,
  );
  m.position.set(x, y + h / 2, z);
  g.add(m);
  return m;
}
function cil(g: THREE.Group, r1: number, r2: number, h: number, x: number, y: number, z: number, color: string | THREE.Material, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), typeof color === "string" ? matI(color) : color);
  m.position.set(x, y + h / 2, z);
  g.add(m);
  return m;
}
function bola(g: THREE.Group, r: number, x: number, y: number, z: number, color: string | THREE.Material) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), typeof color === "string" ? matI(color) : color);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const patas = (g: THREE.Group, w: number, d: number, alto: number, color: string, grosor = 0.05, margen = 0.06) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bloque(g, grosor, alto, grosor, sx * (w / 2 - margen), 0, sz * (d / 2 - margen), color, 0.01);
};

const MADERA = "#8A5A35";
const METAL = "#9AA3AE";
const BLANCO = "#F7F5F0";

type Fab = (g: THREE.Group, w: number, d: number, a: number, c: string) => void;

const MODELOS: Record<string, Fab> = {
  camaDoble: (g, w, d, _a, c) => {
    bloque(g, w, 0.28, d, 0, 0.08, 0, MADERA, 0.04);
    bloque(g, w - 0.08, 0.2, d - 0.12, 0, 0.36, 0.04, BLANCO, 0.08);
    bloque(g, w - 0.04, 0.08, d * 0.62, 0, 0.5, d * 0.17, c, 0.04);
    bloque(g, w, 1.0, 0.1, 0, 0.08, -d / 2 + 0.05, MADERA, 0.04);
    for (const x of [-w / 4, w / 4]) bloque(g, w * 0.36, 0.14, 0.38, x, 0.56, -d / 2 + 0.35, "#FFFFFF", 0.07);
  },
  camaIndividual: (g, w, d, a, c) => MODELOS.camaDoble(g, w, d, a, c),
  mesitaNoche: (g, w, d, a, c) => {
    bloque(g, w, a, d, 0, 0, 0, c, 0.03);
    bloque(g, w * 0.7, 0.04, 0.02, 0, a * 0.55, d / 2, "#D9C9A8", 0.01);
  },
  armario: (g, w, d, a, c) => {
    bloque(g, w, a, d, 0, 0, 0, c, 0.03);
    bloque(g, 0.02, a - 0.12, 0.02, 0, 0.06, d / 2, "#5A3B22", 0);
    for (const x of [-0.08, 0.08]) bloque(g, 0.03, 0.22, 0.03, x, a * 0.48, d / 2 + 0.01, "#D9C9A8", 0.01);
  },
  comoda: (g, w, d, a, c) => {
    bloque(g, w, a, d, 0, 0, 0, c, 0.03);
    for (let i = 0; i < 3; i++) bloque(g, w * 0.86, a * 0.26, 0.02, 0, 0.06 + i * a * 0.3, d / 2, shade(c, 0.9), 0.01);
  },
  sofa: (g, w, d, a, c) => {
    bloque(g, w, 0.42, d, 0, 0.06, 0, c, 0.1);
    bloque(g, w, a - 0.06, 0.24, 0, 0.06, -d / 2 + 0.12, c, 0.1);
    for (const s of [-1, 1]) bloque(g, 0.2, 0.62, d, s * (w / 2 - 0.1), 0.06, 0, c, 0.1);
    for (const x of [-w / 4 + 0.05, w / 4 - 0.05]) bloque(g, w / 2 - 0.28, 0.14, d - 0.34, x, 0.48, 0.1, shade(c, 1.1), 0.07);
    patas(g, w, d, 0.06, "#2A2C31");
  },
  sillon: (g, w, d, a, c) => {
    bloque(g, w, 0.42, d, 0, 0.06, 0, c, 0.1);
    bloque(g, w, a - 0.06, 0.22, 0, 0.06, -d / 2 + 0.11, c, 0.1);
    for (const s of [-1, 1]) bloque(g, 0.18, 0.66, d, s * (w / 2 - 0.09), 0.06, 0, c, 0.09);
    patas(g, w, d, 0.06, "#2A2C31");
  },
  mesaCentro: (g, w, d, a, c) => {
    bloque(g, w, 0.06, d, 0, a - 0.06, 0, c, 0.02);
    patas(g, w, d, a - 0.06, shade(c, 0.8));
    bloque(g, w - 0.2, 0.03, d - 0.2, 0, 0.12, 0, shade(c, 0.9), 0.01);
  },
  muebleTele: (g, w, d, a, c) => {
    bloque(g, w, a, d, 0, 0, 0, c, 0.03);
    for (const x of [-w / 4, w / 4]) bloque(g, w / 2 - 0.1, a - 0.14, 0.02, x, 0.07, d / 2, shade(c, 0.88), 0.01);
  },
  television: (g, w, _d, a, c) => {
    bloque(g, 0.3, 0.04, 0.18, 0, 0, 0, "#2A2C31", 0.01);
    bloque(g, 0.06, 0.12, 0.04, 0, 0.04, 0, "#2A2C31", 0.01);
    bloque(g, w, a - 0.16, 0.05, 0, 0.16, 0, c, 0.02);
    const pantalla = bloque(g, w - 0.06, a - 0.22, 0.01, 0, 0.19, 0.026, matI("#20324F", 0.2, { emissive: new THREE.Color("#000000") }), 0);
    pantalla.name = "pantalla";
  },
  estanteria: (g, w, d, a, c) => {
    for (const s of [-1, 1]) bloque(g, 0.04, a, d, s * (w / 2 - 0.02), 0, 0, c, 0.01);
    bloque(g, w, a, 0.02, 0, 0, -d / 2 + 0.01, c, 0);
    const libros = ["#C8322B", "#1F5EFF", "#E8BC5C", "#2E7D4F", "#F7F5F0", "#7E5AA6"];
    for (let i = 0; i < 5; i++) {
      const y = 0.04 + (i * (a - 0.06)) / 4.6;
      bloque(g, w, 0.03, d, 0, y, 0, c, 0.01);
      if (i < 4) {
        let x = -w / 2 + 0.08;
        let k = i * 3;
        while (x < w / 2 - 0.12) {
          const ancho = 0.04 + ((k * 37) % 5) * 0.012;
          const alto = 0.2 + ((k * 13) % 4) * 0.03;
          bloque(g, ancho, alto, d * 0.7, x + ancho / 2, y + 0.03, 0, libros[k % libros.length], 0.005);
          x += ancho + 0.006;
          k++;
        }
      }
    }
  },
  mesaComedor: (g, w, d, _a, c) => {
    bloque(g, w, 0.06, d, 0, 0.72, 0, c, 0.02);
    patas(g, w, d, 0.72, shade(c, 0.8), 0.07, 0.1);
  },
  silla: (g, w, d, _a, c) => {
    bloque(g, w * 0.8, 0.05, d * 0.8, 0, 0.44, 0, "#D9B77A", 0.02);
    patas(g, w * 0.8, d * 0.8, 0.44, c, 0.035, 0.03);
    for (const s of [-1, 1]) bloque(g, 0.035, 0.5, 0.035, s * (w * 0.4 - 0.03), 0.44, -d * 0.4 + 0.03, c, 0.01);
    for (let i = 0; i < 3; i++) bloque(g, w * 0.76, 0.04, 0.025, 0, 0.6 + i * 0.13, -d * 0.4 + 0.03, c, 0.01);
  },
  cocina: (g, w, d, _a, c) => {
    bloque(g, w, 0.86, d * 0.9, 0, 0, 0, c, 0.02);
    bloque(g, w + 0.02, 0.04, d * 0.94, 0, 0.86, 0, "#D8D2C6", 0.01);
    for (let i = 0; i < 3; i++) bloque(g, w / 3 - 0.06, 0.7, 0.02, -w / 3 + (i * w) / 3, 0.08, d * 0.45, shade(c, 0.92), 0.01);
    for (const [x, z] of [[-0.2, -0.1], [0.12, -0.1], [-0.2, 0.18], [0.12, 0.18]]) cil(g, 0.08, 0.08, 0.012, x - w / 4, 0.9, z, "#2A2C31", 16);
    bloque(g, 0.5, 0.06, 0.4, w / 4, 0.86, 0, matI(METAL, 0.3, { metalness: 0.6 }), 0.01);
    bloque(g, w, 0.6, 0.3, 0, 1.45, -d / 2 + 0.15, c, 0.02);
  },
  frigorifico: (g, w, d, a, c) => {
    bloque(g, w * 0.92, a, d * 0.9, 0, 0, 0, c, 0.06);
    bloque(g, w * 0.92, 0.015, 0.01, 0, a * 0.62, d * 0.45, shade(c, 0.85), 0);
    bloque(g, 0.03, 0.3, 0.03, w * 0.35, a * 0.7, d * 0.46, METAL, 0.01);
    bloque(g, 0.03, 0.3, 0.03, w * 0.35, a * 0.45, d * 0.46, METAL, 0.01);
  },
  lavabo: (g, w, d, _a, c) => {
    bloque(g, w * 0.8, 0.7, d * 0.8, 0, 0, 0, "#E8E2D6", 0.03);
    bloque(g, w * 0.86, 0.12, d * 0.9, 0, 0.7, 0, c, 0.05);
    cil(g, 0.015, 0.015, 0.16, 0, 0.82, -d * 0.3, METAL);
    bloque(g, w * 0.6, 0.6, 0.02, 0, 1.1, -d / 2 + 0.01, matI("#CFE3F2", 0.05, { metalness: 0.8 }), 0);
  },
  inodoro: (g, w, d, _a, c) => {
    cil(g, 0.17, 0.14, 0.4, 0, 0, d * 0.08, c, 18);
    bloque(g, w * 0.8, 0.38, 0.18, 0, 0.36, -d / 2 + 0.1, c, 0.04);
    cil(g, 0.2, 0.2, 0.04, 0, 0.4, d * 0.1, c, 18);
  },
  ducha: (g, w, d, _a, c) => {
    bloque(g, w, 0.08, d, 0, 0, 0, "#FFFFFF", 0.02);
    const cristal = matI(c, 0.05, { transparent: true, opacity: 0.35, metalness: 0.2 });
    bloque(g, w, 1.9, 0.02, 0, 0.08, d / 2 - 0.01, cristal, 0);
    bloque(g, 0.02, 1.9, d, w / 2 - 0.01, 0.08, 0, cristal, 0);
    cil(g, 0.012, 0.012, 1.8, -w / 2 + 0.1, 0.08, -d / 2 + 0.06, METAL);
    cil(g, 0.1, 0.1, 0.02, -w / 2 + 0.2, 1.86, -d / 2 + 0.16, METAL);
  },
  banera: (g, w, d, a, c) => {
    bloque(g, w, a - 0.04, d, 0, 0, 0, c, 0.12);
    bloque(g, w - 0.18, 0.04, d - 0.18, 0, a - 0.1, 0, matI("#BFE2F2", 0.05, { transparent: true, opacity: 0.85 }), 0.04);
    cil(g, 0.015, 0.015, 0.22, -w / 2 + 0.1, a - 0.04, 0, METAL);
  },
  escritorio: (g, w, d, _a, c) => {
    bloque(g, w, 0.05, d, 0, 0.72, 0, c, 0.015);
    bloque(g, 0.42, 0.72, d - 0.04, w / 2 - 0.23, 0, 0, shade(c, 0.9), 0.015);
    for (const s of [-1]) bloque(g, 0.04, 0.72, d - 0.04, s * (w / 2 - 0.03), 0, 0, shade(c, 0.85), 0.01);
  },
  ordenador: (g, _w, _d, _a, c) => {
    bloque(g, 0.5, 0.32, 0.03, 0, 0.14, -0.08, c, 0.01);
    bloque(g, 0.46, 0.27, 0.005, 0, 0.165, -0.064, matI("#2A4E8C", 0.2), 0).name = "pantalla";
    bloque(g, 0.06, 0.14, 0.06, 0, 0, -0.1, c, 0.01);
    bloque(g, 0.42, 0.02, 0.14, 0, 0, 0.12, "#3A3D44", 0.005);
  },
  sillaOficina: (g, w, d, _a, c) => {
    cil(g, 0.24, 0.24, 0.03, 0, 0.04, 0, "#2A2C31", 5);
    cil(g, 0.03, 0.03, 0.36, 0, 0.06, 0, METAL);
    bloque(g, w * 0.86, 0.08, d * 0.86, 0, 0.42, 0, c, 0.04);
    bloque(g, w * 0.8, 0.5, 0.06, 0, 0.52, -d * 0.4, c, 0.04);
  },
  lamparaPie: (g, _w, _d, a, c) => {
    cil(g, 0.15, 0.17, 0.03, 0, 0, 0, "#2A2C31");
    cil(g, 0.015, 0.015, a - 0.35, 0, 0.03, 0, "#2A2C31");
    const p = cil(g, 0.13, 0.2, 0.3, 0, a - 0.34, 0, matI(c, 0.9, { emissive: new THREE.Color(c), emissiveIntensity: 0.0, side: THREE.DoubleSide }));
    p.name = "pantallaLuz";
  },
  lamparaMesa: (g, _w, _d, _a, c) => {
    cil(g, 0.07, 0.09, 0.2, 0, 0, 0, "#D9C9A8");
    const p = cil(g, 0.08, 0.13, 0.17, 0, 0.2, 0, matI(c, 0.9, { emissive: new THREE.Color(c), emissiveIntensity: 0.0, side: THREE.DoubleSide }));
    p.name = "pantallaLuz";
  },
  alfombra: (g, w, d, _a, c) => {
    bloque(g, w - 0.1, 0.012, d - 0.1, 0, 0.002, 0, c, 0.004);
    bloque(g, w - 0.5, 0.004, d - 0.5, 0, 0.014, 0, shade(c, 1.12), 0);
  },
  maceta: (g, _w, _d, _a, c) => {
    cil(g, 0.17, 0.13, 0.32, 0, 0, 0, c);
    for (let i = 0; i < 7; i++) {
      const hoja = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.8, 4), matI(i % 2 ? "#2F8A3A" : "#5DB33C"));
      const ang = (i / 7) * Math.PI * 2;
      hoja.position.set(Math.cos(ang) * 0.12, 0.62 + (i % 3) * 0.08, Math.sin(ang) * 0.12);
      hoja.rotation.set(Math.sin(ang) * 0.5, 0, -Math.cos(ang) * 0.5);
      g.add(hoja);
    }
  },
  cuadro: (g, w, d, _a, c) => {
    bloque(g, w * 0.9, 0.6, 0.04, 0, 1.2, -d / 2 + 0.03, "#5A3B22", 0.01);
    bloque(g, w * 0.82, 0.52, 0.01, 0, 1.24, -d / 2 + 0.055, c, 0);
    // El Peñón, esquemático.
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.24, 3), matI("#E3DED1"));
    p.scale.z = 0.05;
    p.position.set(0.05, 1.42, -d / 2 + 0.065);
    g.add(p);
  },
  espejo: (g, w, d, _a, c) => {
    bloque(g, w * 0.7, 0.9, 0.04, 0, 1.0, -d / 2 + 0.03, c, 0.03);
    bloque(g, w * 0.6, 0.8, 0.01, 0, 1.05, -d / 2 + 0.055, matI("#DCEBF5", 0.03, { metalness: 0.9 }), 0);
  },
  reloj: (g, _w, d, _a, c) => {
    const r = cil(g, 0.16, 0.16, 0.04, 0, 1.6, -d / 2 + 0.03, c, 20);
    r.rotation.x = Math.PI / 2;
    r.position.set(0, 1.75, -d / 2 + 0.03);
    bloque(g, 0.012, 0.11, 0.01, 0, 1.75, -d / 2 + 0.06, "#2A2C31", 0);
    bloque(g, 0.08, 0.012, 0.01, 0.03, 1.75, -d / 2 + 0.06, "#2A2C31", 0);
  },
  jarron: (g, _w, _d, _a, c) => {
    cil(g, 0.06, 0.09, 0.22, 0, 0, 0, c);
    cil(g, 0.05, 0.06, 0.06, 0, 0.22, 0, c);
    bola(g, 0.05, 0, 0.34, 0, "#E84B6C");
    bola(g, 0.045, 0.05, 0.32, 0.03, "#F2C230");
  },
  bancoPatio: (g, w, d, _a, c) => {
    for (let i = 0; i < 3; i++) bloque(g, w, 0.03, 0.1, 0, 0.42, -d * 0.3 + i * 0.12, "#B07A45", 0.01);
    for (let i = 0; i < 2; i++) bloque(g, w, 0.08, 0.03, 0, 0.6 + i * 0.14, -d / 2 + 0.04, "#B07A45", 0.01);
    for (const s of [-1, 1]) {
      bloque(g, 0.04, 0.42, d * 0.8, s * (w / 2 - 0.1), 0, 0, c, 0.01);
      bloque(g, 0.04, 0.4, 0.04, s * (w / 2 - 0.1), 0.42, -d / 2 + 0.04, c, 0.01);
    }
  },
  mesaPatio: (g, w, d, _a, c) => {
    cil(g, Math.min(w, d) * 0.45, Math.min(w, d) * 0.45, 0.04, 0, 0.7, 0, c, 20);
    cil(g, 0.03, 0.03, 0.7, 0, 0, 0, c);
    cil(g, 0.2, 0.2, 0.03, 0, 0, 0, c);
  },
  geranios: (g, w, d, _a, c) => {
    bloque(g, w, 0.22, d * 0.8, 0, 0, 0, "#B4643F", 0.02);
    for (let i = 0; i < 6; i++) {
      const x = -w / 2 + 0.12 + (i * (w - 0.24)) / 5;
      bola(g, 0.11, x, 0.32, 0, "#3E8F3A");
      bola(g, 0.06, x + 0.03, 0.42, 0.02, c);
    }
  },

  /* ── Cocina por módulos (fondo real 0,62 m pegado a la pared) ───────── */
  moduloBajo: (g, w, d, _a, c) => {
    const z = -d / 2 + 0.31;
    bloque(g, w - 0.01, 0.1, 0.56, 0, 0, z - 0.03, "#2B2D31", 0); // zócalo
    bloque(g, w - 0.01, 0.76, 0.6, 0, 0.1, z, c, 0.01);
    encimera(g, w, z);
    // Tres cajones con tirador corrido.
    for (let i = 0; i < 3; i++) {
      bloque(g, w - 0.04, 0.22, 0.012, 0, 0.13 + i * 0.245, z + 0.305, shade(c, 0.97), 0.006);
      bloque(g, w * 0.5, 0.012, 0.012, 0, 0.32 + i * 0.245, z + 0.315, matI(METAL, 0.3, { metalness: 0.7 }), 0);
    }
  },
  fregadero: (g, w, d, a, c) => {
    MODELOS.moduloBajo(g, w, d, a, c);
    const z = -d / 2 + 0.31;
    // Cubeta encastrada y grifo de caño alto.
    bloque(g, w * 0.62, 0.012, 0.4, 0, 0.9, z, matI("#C8CDD3", 0.15, { metalness: 0.8 }), 0.01);
    bloque(g, w * 0.54, 0.01, 0.32, 0, 0.905, z, matI("#8E959E", 0.2, { metalness: 0.8 }), 0.005);
    cil(g, 0.018, 0.022, 0.3, 0, 0.91, z - 0.24, METAL);
    const cano = cil(g, 0.012, 0.012, 0.18, 0, 1.2, z - 0.16, METAL);
    cano.rotation.x = Math.PI / 2;
    cano.position.set(0, 1.2, z - 0.16);
  },
  placa: (g, w, d, a, c) => {
    MODELOS.moduloBajo(g, w, d, a, c);
    const z = -d / 2 + 0.31;
    // Placa de vitrocerámica/inducción con zonas y horno integrado.
    bloque(g, w * 0.78, 0.008, 0.5, 0, 0.9, z, matI("#141518", 0.12, { metalness: 0.3 }), 0.004);
    for (const [x, zz, r] of [[-0.18, -0.1, 0.11], [0.18, -0.1, 0.09], [-0.18, 0.13, 0.08], [0.18, 0.13, 0.11]] as const) {
      const anillo = new THREE.Mesh(new THREE.RingGeometry(r - 0.012, r, 24), matI("#55595F", 0.4));
      anillo.rotation.x = -Math.PI / 2;
      anillo.position.set(x, 0.91, z + zz);
      g.add(anillo);
    }
    bloque(g, w - 0.06, 0.5, 0.02, 0, 0.18, z + 0.3, matI("#1C1D21", 0.2, { metalness: 0.4 }), 0.01);
    bloque(g, w - 0.18, 0.3, 0.008, 0, 0.26, z + 0.312, matI("#2D3A48", 0.05, { metalness: 0.2 }), 0);
    // Campana extractora.
    bloque(g, w * 0.8, 0.08, 0.5, 0, 1.6, z, matI(METAL, 0.25, { metalness: 0.8 }), 0.01);
    bloque(g, 0.26, 0.8, 0.24, 0, 1.68, -d / 2 + 0.13, matI(METAL, 0.25, { metalness: 0.8 }), 0.01);
  },
  columnaHorno: (g, w, d, a, c) => {
    const z = -d / 2 + 0.31;
    bloque(g, w - 0.01, a, 0.6, 0, 0, z, c, 0.01);
    bloque(g, w - 0.08, 0.58, 0.02, 0, 0.75, z + 0.3, matI("#1C1D21", 0.2, { metalness: 0.4 }), 0.01);
    bloque(g, w - 0.2, 0.36, 0.008, 0, 0.84, z + 0.312, matI("#2D3A48", 0.05, { metalness: 0.2 }), 0);
    bloque(g, w - 0.08, 0.38, 0.02, 0, 1.4, z + 0.3, matI("#1C1D21", 0.2, { metalness: 0.4 }), 0.01);
    for (const y of [0.35, 1.95]) bloque(g, w * 0.5, 0.012, 0.012, 0, y, z + 0.315, matI(METAL, 0.3, { metalness: 0.7 }), 0);
  },
  muebleAlto: (g, w, d, _a, c) => {
    // Colgado a 1,45 m, fondo de 35 cm, con luz bajo mueble.
    const z = -d / 2 + 0.175;
    bloque(g, w - 0.01, 0.7, 0.35, 0, 1.45, z, c, 0.01);
    bloque(g, 0.012, 0.66, 0.01, 0, 1.47, z + 0.176, shade(c, 0.85), 0);
    bloque(g, w * 0.4, 0.012, 0.012, 0, 1.5, z + 0.18, matI(METAL, 0.3, { metalness: 0.7 }), 0);
    bloque(g, w - 0.1, 0.012, 0.03, 0, 1.44, z + 0.12, matI("#FFF4D6", 0.4, { emissive: new THREE.Color("#FFE2A8"), emissiveIntensity: 0.5 }), 0);
  },
  frigoAmericano: (g, w, d, a) => {
    const z = -d / 2 + 0.36;
    const inox = matI("#B9BEC4", 0.22, { metalness: 0.85 });
    bloque(g, w * 0.96, a, 0.7, 0, 0, z, inox, 0.03);
    bloque(g, 0.008, a - 0.1, 0.01, 0, 0.05, z + 0.351, matI("#6B7077", 0.3), 0);
    for (const s of [-1, 1]) bloque(g, 0.025, 0.9, 0.04, s * 0.06, a * 0.45, z + 0.37, matI("#E3E6EA", 0.15, { metalness: 0.9 }), 0.01);
    bloque(g, 0.16, 0.24, 0.006, -w * 0.22, a * 0.55, z + 0.352, matI("#20262E", 0.1), 0.01);
  },
  isla: (g, w, d, _a, c) => {
    bloque(g, w - 0.1, 0.1, d * 0.62, 0, 0, -0.05, "#2B2D31", 0);
    bloque(g, w - 0.1, 0.8, d * 0.66, 0, 0.1, -0.05, c, 0.01);
    // Encimera volada para la barra.
    bloque(g, w, 0.04, d * 0.94, 0, 0.9, 0.04, matI("#E8E4DC", 0.2), 0.008);
    for (let i = 0; i < 3; i++) bloque(g, (w - 0.2) / 3 - 0.02, 0.7, 0.012, -w / 3 + (i * w) / 3, 0.15, -d * 0.35 - 0.06, shade(c, 0.96), 0.006);
  },
  taburete: (g, w, d, _a, c) => {
    cil(g, w * 0.36, w * 0.36, 0.05, 0, 0.72, 0, c, 20);
    cil(g, 0.02, 0.02, 0.72, 0, 0, 0, METAL);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.01, 6, 20), matI(METAL, 0.3, { metalness: 0.7 }));
    aro.rotation.x = Math.PI / 2;
    aro.position.y = 0.3;
    g.add(aro);
    cil(g, 0.18, 0.2, 0.02, 0, 0, 0, METAL, 20);
    void d;
  },
  mesaCocina: (g, w, d, _a, c) => {
    bloque(g, w - 0.08, 0.04, d - 0.2, 0, 0.72, 0, c, 0.015);
    patas(g, w - 0.08, d - 0.2, 0.72, shade(c, 0.85), 0.04, 0.05);
  },

  /* ── Baño ─────────────────────────────────────────────────────────── */
  muebleLavabo: (g, w, d, _a, c) => {
    const z = -d / 2 + 0.23;
    bloque(g, w * 0.9, 0.5, 0.44, 0, 0.32, z, c, 0.02);
    for (const s of [-1, 1]) bloque(g, w * 0.43, 0.46, 0.01, s * w * 0.225, 0.34, z + 0.22, shade(c, 0.95), 0.004);
    bloque(g, w * 0.92, 0.06, 0.46, 0, 0.82, z, "#FFFFFF", 0.02);
    bloque(g, w * 0.5, 0.02, 0.3, 0, 0.865, z + 0.02, matI("#E9EEF2", 0.1), 0.02);
    cil(g, 0.014, 0.014, 0.18, 0, 0.88, z - 0.16, METAL);
    bloque(g, w * 0.8, 0.7, 0.025, 0, 1.08, -d / 2 + 0.015, matI("#DCEBF5", 0.03, { metalness: 0.9 }), 0.01);
    bloque(g, w * 0.82, 0.03, 0.06, 0, 1.8, -d / 2 + 0.04, matI("#FFF4D6", 0.4, { emissive: new THREE.Color("#FFE2A8"), emissiveIntensity: 0.6 }), 0.01);
  },
  lavaboDoble: (g, w, d, _a, c) => {
    const z = -d / 2 + 0.25;
    // Encimera de madera o piedra volada, dos senos sobre encimera y grifería empotrada.
    bloque(g, w * 0.96, 0.06, 0.5, 0, 0.82, z, c, 0.01);
    bloque(g, w * 0.96, 0.32, 0.46, 0, 0.5, z - 0.01, shade(c, 0.9), 0.01);
    for (const s of [-1, 1]) {
      cil(g, 0.2, 0.17, 0.12, s * w * 0.24, 0.88, z + 0.03, "#FFFFFF", 24);
      bloque(g, 0.02, 0.12, 0.02, s * w * 0.24, 1.0, z - 0.22, METAL, 0.005);
      bloque(g, 0.02, 0.02, 0.12, s * w * 0.24, 1.1, z - 0.17, METAL, 0.005);
      bloque(g, w * 0.4, 0.75, 0.025, s * w * 0.24, 1.12, -d / 2 + 0.015, matI("#DCEBF5", 0.03, { metalness: 0.9 }), 0.01);
    }
  },
  duchaObra: (g, w, d, a, c) => {
    // Plato enrasado de resina, mampara fija de cristal, rociador de techo y hornacina.
    bloque(g, w, 0.025, d, 0, 0, 0, c, 0.01);
    const cristal = matI("#DDEFF7", 0.03, { transparent: true, opacity: 0.25, metalness: 0.2 });
    bloque(g, w * 0.55, 1.95, 0.012, -w * 0.2, 0.025, d / 2 - 0.02, cristal, 0);
    bloque(g, 0.02, 1.95, 0.02, w * 0.075, 0.025, d / 2 - 0.02, matI("#2B2D31", 0.3, { metalness: 0.6 }), 0);
    bloque(g, w * 0.55, 0.02, 0.02, -w * 0.2, 1.97, d / 2 - 0.02, matI("#2B2D31", 0.3, { metalness: 0.6 }), 0);
    cil(g, 0.15, 0.15, 0.015, -w * 0.25, Math.min(a, 2.2), -d / 2 + 0.35, matI("#2B2D31", 0.3, { metalness: 0.6 }), 24);
    cil(g, 0.01, 0.01, 0.3, -w * 0.25, Math.min(a, 2.2), -d / 2 + 0.2, matI("#2B2D31", 0.3, { metalness: 0.6 }));
    bloque(g, 0.5, 0.3, 0.02, w * 0.2, 1.2, -d / 2 + 0.01, matI("#C9C3B8", 0.4), 0);
    bloque(g, 0.08, 0.2, 0.06, w * 0.12, 1.24, -d / 2 + 0.04, "#E9E2D3", 0.01);
  },
  baneraExenta: (g, w, d, _a, c) => {
    // Bañera exenta de bordes redondeados con grifería de pie.
    const cuerpo = new THREE.Mesh(new RoundedBoxGeometry(w * 0.92, 0.58, d * 0.82, 4, 0.22), matI(c, 0.2));
    cuerpo.position.y = 0.29;
    g.add(cuerpo);
    bloque(g, w * 0.78, 0.04, d * 0.62, 0, 0.5, 0, matI("#CFE8F2", 0.05, { transparent: true, opacity: 0.85 }), 0.1);
    cil(g, 0.018, 0.018, 0.95, w / 2 - 0.05, 0, 0, matI("#2B2D31", 0.3, { metalness: 0.6 }));
    const cano = cil(g, 0.012, 0.012, 0.22, w / 2 - 0.15, 0.94, 0, matI("#2B2D31", 0.3, { metalness: 0.6 }));
    cano.rotation.z = Math.PI / 2;
    cano.position.set(w / 2 - 0.15, 0.94, 0);
  },
  toallero: (g, w, d, _a, c) => {
    const z = -d / 2 + 0.06;
    cil(g, 0.01, 0.01, w * 0.8, 0, 1.0, z, METAL).rotation.z = Math.PI / 2;
    bloque(g, w * 0.5, 0.55, 0.04, 0, 0.52, z + 0.01, c, 0.02);
  },

  /* ── Dormitorio ───────────────────────────────────────────────────── */
  camaTapizada: (g, w, d, _a, c) => {
    // Canapé tapizado, colchón grueso, cabecero alto capitoné, nórdico y cojines.
    bloque(g, w, 0.32, d - 0.1, 0, 0.04, 0.05, shade(c, 0.9), 0.04);
    bloque(g, w - 0.06, 0.26, d - 0.18, 0, 0.36, 0.08, "#FBFAF6", 0.08);
    bloque(g, w - 0.02, 0.07, d * 0.66, 0, 0.62, d * 0.15, "#F4F1EA", 0.04);
    bloque(g, w + 0.02, 0.03, d * 0.3, 0, 0.66, d * 0.3, c, 0.015);
    bloque(g, w + 0.3, 1.25, 0.12, 0, 0, -d / 2 + 0.06, c, 0.05);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) bola(g, 0.018, -w / 2 + 0.2 + (i * (w - 0.4)) / 3, 0.8 + j * 0.25, -d / 2 + 0.125, shade(c, 0.8));
    for (const x of [-w / 4, w / 4]) bloque(g, w * 0.38, 0.2, 0.14, x, 0.66, -d / 2 + 0.3, "#FFFFFF", 0.07);
    for (const x of [-w / 5, w / 5]) bloque(g, w * 0.26, 0.16, 0.1, x, 0.68, -d / 2 + 0.42, shade(c, 1.1), 0.05);
  },
  banqueta: (g, w, d, _a, c) => {
    bloque(g, w * 0.9, 0.12, d * 0.8, 0, 0.32, 0, c, 0.04);
    patas(g, w * 0.9, d * 0.8, 0.32, "#C9A06A", 0.035, 0.05);
  },
  armarioEmpotrado: (g, w, d, a, c) => {
    // De suelo a techo, enrasado con la pared: puertas lisas con tirador de uñero.
    const z = -d / 2 + 0.3;
    bloque(g, w, a, 0.6, 0, 0, z, c, 0.005);
    const n = Math.round(w / 0.5);
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n);
      bloque(g, w / n - 0.008, a - 0.04, 0.01, x, 0.02, z + 0.3, shade(c, 0.98), 0.003);
      bloque(g, 0.012, 0.3, 0.012, x + (i % 2 ? -1 : 1) * (w / n / 2 - 0.04), a * 0.45, z + 0.31, shade(c, 0.8), 0);
    }
  },
  vestidor: (g, w, d, a, c) => {
    // Módulos abiertos: barra con ropa colgada, baldas con cajas y zapatero.
    const z = -d / 2 + 0.25;
    for (const s of [-1, 0, 1]) bloque(g, 0.03, a, 0.5, s * (w / 2 - 0.015), 0, z, c, 0.005);
    bloque(g, w, 0.03, 0.5, 0, a - 0.03, z, c, 0.005);
    bloque(g, w, 0.03, 0.5, 0, 1.75, z, c, 0.005);
    const ropa = ["#2F4A6B", "#E9E4DA", "#7E8B6A", "#9C3B32", "#2B2D31", "#C9B48C"];
    for (const s of [-1, 1]) {
      cil(g, 0.01, 0.01, w / 2 - 0.08, s * w / 4, 1.65, z, METAL).rotation.z = Math.PI / 2;
      for (let k = 0; k < 6; k++) bloque(g, 0.05, 0.75 + (k % 3) * 0.1, 0.4, s * w / 4 - w / 4 + 0.12 + k * ((w / 2 - 0.24) / 5), 1.62 - (0.75 + (k % 3) * 0.1), z, ropa[(k + (s > 0 ? 2 : 0)) % ropa.length], 0.02);
    }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) bloque(g, 0.22, 0.06, 0.28, s * w / 4 - 0.15 + k * 0.15, 0.08, z, ["#2B2D31", "#8A5A35", "#E9E4DA"][k], 0.02);
  },

  /* ── Salón y comedor ──────────────────────────────────────────────── */
  sofaChaise: (g, w, d, a, c) => {
    // Sofá de tres plazas con chaise longue a la derecha.
    const fondo = 0.95;
    const z = -d / 2 + fondo / 2;
    bloque(g, w, 0.42, fondo, 0, 0.06, z, c, 0.1);
    bloque(g, w, a - 0.06, 0.24, 0, 0.06, -d / 2 + 0.12, c, 0.1);
    bloque(g, 0.2, 0.62, fondo, -w / 2 + 0.1, 0.06, z, c, 0.1);
    bloque(g, 0.95, 0.42, d - fondo, w / 2 - 0.475, 0.06, -d / 2 + fondo + (d - fondo) / 2, c, 0.1);
    for (let i = 0; i < 3; i++) bloque(g, (w - 1.2) / 3 - 0.04, 0.16, fondo - 0.3, -w / 2 + 0.25 + (i + 0.5) * ((w - 1.2) / 3), 0.48, z + 0.1, shade(c, 1.08), 0.07);
    bloque(g, 0.85, 0.16, d - 0.35, w / 2 - 0.475, 0.48, 0.15, shade(c, 1.08), 0.07);
    for (const [x, col] of [[-w / 2 + 0.45, "#E9E4DA"], [w / 2 - 0.7, "#C9A06A"]] as const) bloque(g, 0.4, 0.36, 0.14, x, 0.62, -d / 2 + 0.3, col, 0.08);
    patas(g, w, d, 0.06, "#2A2C31");
  },
  aparador: (g, w, d, a, c) => {
    const z = -d / 2 + 0.22;
    bloque(g, w, a - 0.18, 0.44, 0, 0.18, z, c, 0.015);
    for (let i = 0; i < 4; i++) bloque(g, w / 4 - 0.02, a - 0.26, 0.012, -w / 2 + (i + 0.5) * (w / 4), 0.22, z + 0.22, shade(c, 0.94), 0.005);
    for (const s of [-1, 1]) bloque(g, 0.04, 0.18, 0.04, s * (w / 2 - 0.1), 0, z, "#2B2D31", 0.005);
  },
  mesaComedorGrande: (g, w, d, _a, c) => {
    bloque(g, w - 0.1, 0.05, d - 0.16, 0, 0.72, 0, c, 0.02);
    // Patas en trineo de madera maciza.
    for (const s of [-1, 1]) {
      bloque(g, 0.08, 0.72, d - 0.5, s * (w / 2 - 0.4), 0, 0, shade(c, 0.85), 0.01);
      bloque(g, 0.1, 0.05, d - 0.4, s * (w / 2 - 0.4), 0, 0, shade(c, 0.8), 0.01);
    }
    bloque(g, w - 0.9, 0.06, 0.06, 0, 0.55, 0, shade(c, 0.85), 0.01);
    // Centro de mesa.
    cil(g, 0.2, 0.16, 0.06, 0, 0.77, 0, "#E9E4DA", 20);
    for (let i = 0; i < 3; i++) bola(g, 0.05, -0.08 + i * 0.08, 0.86, (i % 2) * 0.04, ["#F2C230", "#7FB23E", "#E8853D"][i]);
  },
  sillaTapizada: (g, w, d, _a, c) => {
    bloque(g, w * 0.84, 0.1, d * 0.82, 0, 0.42, 0.02, c, 0.04);
    bloque(g, w * 0.84, 0.48, 0.08, 0, 0.5, -d * 0.38, c, 0.04);
    patas(g, w * 0.84, d * 0.82, 0.42, "#6B4A2E", 0.03, 0.04);
  },
  plantaGrande: (g, w, _d, a, c) => {
    // Olivo en macetero alto.
    cil(g, w * 0.3, w * 0.24, 0.5, 0, 0, 0, c, 20);
    cil(g, 0.04, 0.05, a - 0.9, 0, 0.5, 0, "#6E5A44", 6);
    for (let i = 0; i < 9; i++) {
      const ang = i * 2.39;
      bola(g, 0.22 + (i % 3) * 0.04, Math.cos(ang) * 0.28, a - 0.4 + Math.sin(i * 1.7) * 0.2, Math.sin(ang) * 0.28, i % 2 ? "#7D8F5A" : "#94A56E");
    }
  },
  cuadroGrande: (g, w, d, _a, c) => {
    // Lienzo abstracto con marco fino.
    bloque(g, w * 0.92, 0.95, 0.03, 0, 1.15, -d / 2 + 0.02, "#2B2D31", 0.005);
    bloque(g, w * 0.88, 0.91, 0.01, 0, 1.17, -d / 2 + 0.04, "#F2EEE6", 0);
    bloque(g, w * 0.5, 0.35, 0.005, -w * 0.12, 1.45, -d / 2 + 0.047, c, 0);
    bloque(g, w * 0.3, 0.5, 0.005, w * 0.2, 1.24, -d / 2 + 0.048, shade(c, 0.6), 0);
  },

  /* ── Recibidor y servicio ─────────────────────────────────────────── */
  consola: (g, w, d, a, c) => {
    const z = -d / 2 + 0.17;
    bloque(g, w - 0.1, 0.04, 0.34, 0, a - 0.04, z, c, 0.01);
    bloque(g, w - 0.2, 0.12, 0.3, 0, a - 0.16, z, shade(c, 0.95), 0.01);
    patas(g, w - 0.1, 0.34, a - 0.04, shade(c, 0.8), 0.03, 0.04);
  },
  perchero: (g, _w, _d, a, c) => {
    cil(g, 0.02, 0.02, a, 0, 0, 0, c);
    for (let k = 0; k < 3; k++) cil(g, 0.13 - k * 0.02, 0.16 - k * 0.02, 0.01, 0, 0, 0, c);
    for (let k = 0; k < 4; k++) {
      const brazo = cil(g, 0.01, 0.01, 0.16, Math.cos(k * 1.57) * 0.06, a - 0.12, Math.sin(k * 1.57) * 0.06, c);
      brazo.rotation.z = Math.cos(k * 1.57) * 0.8;
      brazo.rotation.x = -Math.sin(k * 1.57) * 0.8;
    }
    bloque(g, 0.22, 0.5, 0.12, 0.08, a - 0.75, 0.05, "#3E4A5C", 0.04);
  },
  estanteDespensa: (g, w, d, a, c) => {
    const z = -d / 2 + 0.2;
    for (const s of [-1, 1]) bloque(g, 0.03, a, 0.4, s * (w / 2 - 0.015), 0, z, c, 0.005);
    const frascos = ["#E8853D", "#F2C230", "#B23A2E", "#7FB23E", "#E9E4DA"];
    for (let i = 0; i < 5; i++) {
      const y = 0.05 + i * ((a - 0.1) / 4.4);
      bloque(g, w, 0.025, 0.4, 0, y, z, c, 0.005);
      if (i < 4) for (let k = 0; k < 5; k++) cil(g, 0.045, 0.045, 0.14 + (k % 2) * 0.05, -w / 2 + 0.1 + k * ((w - 0.2) / 4), y + 0.025, z + ((k % 2) - 0.5) * 0.1, frascos[(k + i) % 5], 10);
    }
  },
};

/** Encimera con canto (piedra clara). */
function encimera(g: THREE.Group, w: number, z: number) {
  bloque(g, w, 0.04, 0.63, 0, 0.86, z + 0.01, matI("#E8E4DC", 0.25), 0.006);
}

/** Aclara u oscurece un color hex. */
export function shade(c: string, f: number) {
  const col = new THREE.Color(c);
  col.multiplyScalar(f);
  return `#${col.getHexString()}`;
}

/** Modelo de un mueble. `roto` lo envejece (trasto): gris, torcido y con polvo. */
export function modeloMueble(tipo: string, color: string, roto = false) {
  const def = MUEBLES[tipo];
  const g = new THREE.Group();
  const w = def.w * 0.5;
  const d = def.d * 0.5;
  const a = def.alto * 0.5;
  const fab = MODELOS[tipo] ?? ((gg: THREE.Group) => bloque(gg, w, a, d, 0, 0, 0, color));
  fab(g, w, d, a, roto ? shade(mezclar(color, "#8C8478", 0.6), 0.85) : color);
  if (roto) {
    g.rotation.z = 0.04;
    g.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (mesh.isMesh) mesh.material = desgastar(mesh.material as THREE.MeshStandardMaterial);
    });
  }
  g.userData.tipo = tipo;
  return sombra(g);
}

function mezclar(a: string, b: string, t: number) {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}
const desgastados = new Map<THREE.Material, THREE.MeshStandardMaterial>();
function desgastar(m: THREE.MeshStandardMaterial) {
  if (!desgastados.has(m)) {
    const c = m.clone();
    c.color = new THREE.Color(mezclar(`#${m.color.getHexString()}`, "#857C70", 0.55));
    c.roughness = 1;
    desgastados.set(m, c);
  }
  return desgastados.get(m)!;
}

/** Bolsas, cajas y botellas tiradas (basura). */
export function modeloBasura(tipo: number) {
  const g = new THREE.Group();
  if (tipo === 0) {
    bola(g, 0.18, 0, 0.16, 0, "#2A2C31").scale.set(1, 0.85, 1);
    bloque(g, 0.05, 0.08, 0.05, 0, 0.3, 0, "#2A2C31", 0.01);
  } else if (tipo === 1) {
    const c = bloque(g, 0.36, 0.22, 0.28, 0, 0, 0, "#C49A62", 0.01);
    c.rotation.y = 0.4;
  } else if (tipo === 2) {
    const b = cil(g, 0.04, 0.04, 0.26, 0, 0, 0, matI("#3E8F5A", 0.2, { transparent: true, opacity: 0.8 }));
    b.rotation.z = Math.PI / 2;
    b.position.y = 0.04;
  } else {
    for (let i = 0; i < 4; i++) {
      const p = bloque(g, 0.2, 0.004, 0.28, (i - 1.5) * 0.08, 0.002 * i, (i % 2) * 0.06, "#EDE6D6", 0);
      p.rotation.y = i * 0.6;
    }
  }
  return sombra(g);
}

/** Vista previa de un mueble en una imagen (para el catálogo). */
let rendPrev: THREE.WebGLRenderer | null = null;
const cachePrev = new Map<string, string>();
export function previa(tipo: string, color: string) {
  const k = `${tipo}|${color}`;
  if (cachePrev.has(k)) return cachePrev.get(k)!;
  try {
    if (!rendPrev) {
      rendPrev = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      rendPrev.setSize(128, 128);
      rendPrev.outputColorSpace = THREE.SRGBColorSpace;
    }
    const esc = new THREE.Scene();
    esc.add(new THREE.HemisphereLight("#FFFFFF", "#B9A98A", 2.2));
    const sol = new THREE.DirectionalLight("#FFFFFF", 1.6);
    sol.position.set(2, 4, 3);
    esc.add(sol);
    const m = modeloMueble(tipo, color);
    const caja = new THREE.Box3().setFromObject(m);
    const tam = caja.getSize(new THREE.Vector3());
    const centro = caja.getCenter(new THREE.Vector3());
    esc.add(m);
    const r = Math.max(tam.x, tam.y, tam.z) * 0.62 + 0.1;
    const cam = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, 50);
    cam.position.set(centro.x + 3, centro.y + 2.6, centro.z + 3);
    cam.lookAt(centro);
    rendPrev.render(esc, cam);
    const url = rendPrev.domElement.toDataURL();
    cachePrev.set(k, url);
    return url;
  } catch {
    return "";
  }
}
