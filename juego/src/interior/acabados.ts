import * as THREE from "three";
import type { Acabados } from "../compartido/hogar/perfil";
import { matI } from "./modelos";

/**
 * Piezas de arquitectura interior según los acabados de la vivienda: puertas
 * (lisa, de cuarterones, lacada, doble acristalada, arco), ventanas (aluminio,
 * madera con persiana, balconera con barandilla), cortinas, rodapiés, molduras,
 * alicatados y luminarias. Todas se construyen en el sistema local de un tramo de
 * pared de 1 m: x a lo largo del muro (−0,5…0,5), y hacia arriba, z hacia el
 * interior de la habitación (la cara interior está en z = grosor/2).
 */

export const GROSOR = 0.12;
const CARA = GROSOR / 2;

/** Acabados por defecto para los interiores antiguos (sin perfil). */
export const ACABADOS_POR_DEFECTO: Acabados = {
  techo: 2.7, puerta: "cuarterones", puertaSalon: "simple", ventana: "madera", cortinas: false, rodapie: 0.09, moldura: false,
  alicatado: { alto: 1.6, pieza: "azulejo" }, luz: "bombilla", sueloDia: "terrazo", sueloNoche: "terrazo", sueloHumedo: "hidraulico",
  pintura: { dia: "#EFE6D2", noche: "#EFE6D2", humedo: "#F2EBDD" }, madera: "#8A5A35", cocina: "#F2F1EC", textil: "#2F6DB5",
};

const caja = (g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y + h / 2, z);
  b.castShadow = true;
  b.receiveShadow = true;
  g.add(b);
  return b;
};
const tono = (c: string, k: number) => `#${new THREE.Color(c).multiplyScalar(k).getHexString()}`;

/* ── Texturas de alicatado ───────────────────────────────────────────── */

const cacheTex = new Map<string, THREE.Texture>();
export function texAlicatado(pieza: Acabados["alicatado"]["pieza"], color: string) {
  const k = `${pieza}|${color}`;
  if (cacheTex.has(k)) return cacheTex.get(k)!;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.fillRect(0, 0, 256, 256);
  const junta = "rgba(120,110,95,0.45)";
  if (pieza === "azulejo") {
    // Azulejo blanco de 20 × 20 cm (la textura cubre 1 × 1 m).
    x.strokeStyle = junta;
    x.lineWidth = 2;
    for (let i = 0; i <= 5; i++) {
      x.beginPath(); x.moveTo(i * 51.2, 0); x.lineTo(i * 51.2, 256); x.stroke();
      x.beginPath(); x.moveTo(0, i * 51.2); x.lineTo(256, i * 51.2); x.stroke();
    }
  } else if (pieza === "metro") {
    // Azulejo metro biselado de 7,5 × 15 cm a matajuntas.
    for (let j = 0; j < 13; j++) for (let i = -1; i < 8; i++) {
      const ox = (j % 2) * 19 + i * 38.4;
      const oy = j * 19.7;
      const gr = x.createLinearGradient(0, oy, 0, oy + 19);
      gr.addColorStop(0, tono(color, 1.04));
      gr.addColorStop(1, tono(color, 0.93));
      x.fillStyle = gr;
      x.fillRect(ox + 1.5, oy + 1.5, 35.4, 16.7);
    }
  } else if (pieza === "gran") {
    // Porcelánico de 60 × 120 cm: juntas finas y veteado suave.
    x.strokeStyle = "rgba(0,0,0,0.06)";
    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.moveTo(((i * 53) % 256), 0);
      x.bezierCurveTo(((i * 97) % 256), 90, ((i * 31) % 256), 170, ((i * 71) % 256), 256);
      x.stroke();
    }
    x.strokeStyle = "rgba(0,0,0,0.12)";
    x.lineWidth = 1.5;
    x.strokeRect(0.75, 0.75, 153, 254.5);
  } else {
    // Azulejo sevillano de 15 cm: estrella de ocho puntas en azul, amarillo y verde.
    const n = 6;
    const t = 256 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = i * t + t / 2;
      const cy = j * t + t / 2;
      x.fillStyle = "#F4EEDC";
      x.fillRect(i * t + 1, j * t + 1, t - 2, t - 2);
      x.fillStyle = "#2F5F8A";
      for (const r of [0, Math.PI / 4]) {
        x.save();
        x.translate(cx, cy);
        x.rotate(r);
        x.fillRect(-t * 0.28, -t * 0.28, t * 0.56, t * 0.56);
        x.restore();
      }
      x.fillStyle = "#E3A92F";
      x.beginPath();
      x.arc(cx, cy, t * 0.16, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = "#3F7A4F";
      for (const [ax, ay] of [[0, 0], [t, 0], [0, t], [t, t]]) {
        x.beginPath();
        x.arc(i * t + ax, j * t + ay, t * 0.12, 0, Math.PI * 2);
        x.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cacheTex.set(k, tex);
  return tex;
}

/** Paño alicatado sobre la cara interior, de y0 a y1 y de x0 a x1 (coordenadas del tramo). */
export function panoAlicatado(g: THREE.Group, x0: number, x1: number, y0: number, y1: number, ac: Acabados, color = "#F6F5F1") {
  if (x1 - x0 < 0.01 || y1 - y0 < 0.01) return;
  const tex = texAlicatado(ac.alicatado.pieza, ac.alicatado.pieza === "gran" ? "#E7E4DE" : color).clone();
  tex.needsUpdate = true;
  const escala = ac.alicatado.pieza === "gran" ? 0.6 : 1;
  tex.repeat.set((x1 - x0) * escala, (y1 - y0) * escala);
  tex.offset.set(x0 * escala, y0 * escala);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshStandardMaterial({ map: tex, roughness: ac.alicatado.pieza === "gran" ? 0.25 : 0.35 }));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, CARA + 0.004);
  m.receiveShadow = true;
  g.add(m);
  // Remate superior (cantonera) salvo que llegue al techo.
  if (y1 < ac.techo - 0.05) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.025, 0.012), matI(ac.alicatado.pieza === "sevillano" ? "#2F5F8A" : "#D9D4CB", 0.4));
    r.position.set((x0 + x1) / 2, y1, CARA + 0.008);
    g.add(r);
  }
}

/** Rodapié (y moldura de techo en la gama alta) sobre un tramo macizo. */
export function rodapieYMoldura(g: THREE.Group, x0: number, x1: number, ac: Acabados, alto: number, humedo: boolean) {
  const largo = x1 - x0;
  if (largo <= 0.01) return;
  if (ac.rodapie > 0 && !humedo) {
    const color = ac.puerta === "lacada" || ac.madera === "#FFFFFF" ? "#FBFAF6" : ac.puerta === "lisa" ? "#CFC6B5" : ac.madera;
    const r = new THREE.Mesh(new THREE.BoxGeometry(largo, ac.rodapie, 0.016), matI(color, 0.5));
    r.position.set((x0 + x1) / 2, ac.rodapie / 2, CARA + 0.008);
    g.add(r);
  }
  if (ac.moldura && alto >= ac.techo - 0.01) {
    // Moldura de escayola en escalones.
    const m = matI("#FCFBF7", 0.7);
    for (const [h, d, y] of [[0.05, 0.05, 0.05], [0.04, 0.09, 0.012]] as const) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(largo, h, d), m);
      b.position.set((x0 + x1) / 2, alto - y - h / 2, CARA + d / 2);
      g.add(b);
    }
  }
}

/* ── Puertas ─────────────────────────────────────────────────────────── */

export const altoPuerta = (ac: Acabados) => (ac.techo >= 2.9 ? 2.35 : 2.1);

/** Hoja de puerta según el acabado (centrada en x, apoyada en y = 0, grosor en z). */
function hoja(tipo: Acabados["puerta"] | "entrada" | "cristal", ancho: number, alto: number, ac: Acabados) {
  const g = new THREE.Group();
  const madera = ac.madera;
  if (tipo === "lisa") {
    // Hoja lisa de tablero (barata): color claro uniforme y manilla de aluminio.
    caja(g, ancho, alto, 0.04, 0, 0, 0, matI("#E4DED2", 0.6));
    caja(g, 0.1, 0.02, 0.03, ancho / 2 - 0.12, 1.0, 0.035, matI("#B9BEC4", 0.35, { metalness: 0.6 }));
  } else if (tipo === "cuarterones") {
    // Madera maciza con cuatro cuarterones en relieve.
    const m = matI(madera, 0.55);
    caja(g, ancho, alto, 0.045, 0, 0, 0, m);
    const mr = matI(tono(madera, 1.08), 0.55);
    for (const [cx, cy, h] of [[-1, 0.18, 0.75], [1, 0.18, 0.75], [-1, 1.05, alto - 1.25], [1, 1.05, alto - 1.25]] as const) {
      caja(g, ancho / 2 - 0.12, h, 0.012, (cx * ancho) / 4, cy, 0.028, mr);
    }
    caja(g, 0.1, 0.02, 0.03, ancho / 2 - 0.12, 1.0, 0.04, matI("#C9A64B", 0.3, { metalness: 0.7 }));
  } else if (tipo === "lacada") {
    // Lacada en blanco con molduras finas y manilla cromada.
    const m = matI("#FBFAF6", 0.3);
    caja(g, ancho, alto, 0.045, 0, 0, 0, m);
    const mm = matI("#EDEBE5", 0.3);
    for (const [y, h] of [[0.2, 0.9], [1.25, alto - 1.45]] as const) {
      caja(g, ancho - 0.24, 0.015, 0.01, 0, y, 0.027, mm);
      caja(g, ancho - 0.24, 0.015, 0.01, 0, y + h, 0.027, mm);
      caja(g, 0.015, h, 0.01, -ancho / 2 + 0.12, y, 0.027, mm);
      caja(g, 0.015, h, 0.01, ancho / 2 - 0.12, y, 0.027, mm);
    }
    caja(g, 0.14, 0.018, 0.03, ancho / 2 - 0.13, 1.02, 0.04, matI("#D9DDE2", 0.15, { metalness: 0.9 }));
  } else if (tipo === "cristal") {
    // Hoja acristalada con cuarterones de vidrio (puertas dobles).
    const m = matI("#FBFAF6", 0.35);
    caja(g, ancho, 0.12, 0.045, 0, 0, 0, m);
    caja(g, ancho, 0.12, 0.045, 0, alto - 0.12, 0, m);
    caja(g, 0.1, alto, 0.045, -ancho / 2 + 0.05, 0, 0, m);
    caja(g, 0.1, alto, 0.045, ancho / 2 - 0.05, 0, 0, m);
    const vidrio = new THREE.Mesh(new THREE.BoxGeometry(ancho - 0.2, alto - 0.24, 0.01), matI("#CFE6F2", 0.05, { transparent: true, opacity: 0.32, metalness: 0.2 }));
    vidrio.position.set(0, alto / 2, 0);
    g.add(vidrio);
    for (let k = 1; k < 4; k++) caja(g, ancho - 0.2, 0.025, 0.03, 0, 0.12 + (k * (alto - 0.24)) / 4, 0, m);
  } else {
    // Puerta de la calle: maciza, con mirilla y aldaba.
    const m = matI(ac.puerta === "lisa" ? "#6B5A4A" : ac.puerta === "lacada" ? "#2B3A33" : "#2E5A3C", 0.5);
    caja(g, ancho, alto, 0.06, 0, 0, 0, m);
    caja(g, ancho - 0.2, alto - 0.4, 0.015, 0, 0.2, 0.036, matI(tono(ac.puerta === "lisa" ? "#6B5A4A" : "#2E5A3C", 1.15), 0.5));
    caja(g, 0.04, 0.04, 0.03, 0, 1.55, 0.04, matI("#C9A64B", 0.3, { metalness: 0.7 }));
  }
  return g;
}

/**
 * Hueco de paso en un tramo: marco (tapajuntas por la cara interior) y, si `conHoja`,
 * la hoja abierta contra la pared de esta habitación.
 * `tipo`: puerta, entrada, mitad izquierda/derecha de una doble o arco.
 */
export function hueco(g: THREE.Group, tipo: "puerta" | "entrada" | "dobleI" | "dobleD" | "arco", alto: number, ac: Acabados, conHoja: boolean, pared: THREE.Material) {
  const ap = altoPuerta(ac);
  const marcoMat = matI(ac.puerta === "lacada" ? "#FBFAF6" : ac.puerta === "lisa" ? "#D8D1C2" : ac.madera, 0.5);
  const pieza = (w: number, h: number, x: number, y: number, m: THREE.Material = pared) => {
    const b = caja(g, w, h, GROSOR, x, y, 0, m);
    b.castShadow = false;
    b.userData.esPared = true;
    return b;
  };
  if (tipo === "arco") {
    // Arco de medio punto: muro con el hueco recortado.
    const forma = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.5, alto), new THREE.Vector2(-0.5, alto)]);
    const r = 0.4;
    const hueco = new THREE.Path();
    hueco.moveTo(-r, 0);
    hueco.lineTo(r, 0);
    hueco.lineTo(r, ap - r);
    hueco.absarc(0, ap - r, r, 0, Math.PI, false);
    hueco.lineTo(-r, 0);
    forma.holes.push(hueco);
    const geo = new THREE.ExtrudeGeometry(forma, { depth: GROSOR, bevelEnabled: false, curveSegments: 16 });
    geo.translate(0, 0, -GROSOR / 2);
    const m = new THREE.Mesh(geo, pared);
    m.receiveShadow = true;
    m.userData.esPared = true;
    g.add(m);
    return;
  }
  if (tipo === "dobleI" || tipo === "dobleD") {
    // Media puerta doble: jamba solo en el lado exterior del vano de 2 m.
    const s = tipo === "dobleI" ? -1 : 1;
    pieza(0.06, alto, s * 0.47, 0);
    if (alto > ap) pieza(1, alto - ap, 0, ap);
    caja(g, 0.07, ap, 0.02, s * 0.43, 0, CARA + 0.01, marcoMat);
    caja(g, 1, 0.07, 0.02, 0, ap - 0.07, CARA + 0.01, marcoMat);
    if (conHoja) {
      // Hojas abiertas hacia dentro, a 80°.
      const h = hoja("cristal", 0.86, ap - 0.04, ac);
      h.position.set(-s * 0.43, 0, 0);
      const bis = new THREE.Group();
      bis.position.set(s * 0.43, 0, CARA);
      bis.rotation.y = s * 1.4;
      bis.add(h);
      g.add(bis);
    }
    return;
  }
  // Puerta de una hoja (0,8 m) o entrada.
  pieza(0.1, alto, -0.45, 0);
  pieza(0.1, alto, 0.45, 0);
  if (alto > ap) pieza(1, alto - ap, 0, ap);
  const ancho = 0.8;
  const tap = ac.puerta === "lisa" ? 0.05 : 0.08;
  caja(g, tap, ap, 0.018, -ancho / 2 - tap / 2 + 0.02, 0, CARA + 0.009, marcoMat);
  caja(g, tap, ap, 0.018, ancho / 2 + tap / 2 - 0.02, 0, CARA + 0.009, marcoMat);
  caja(g, ancho + tap * 2 - 0.04, tap, 0.018, 0, ap - 0.02, CARA + 0.009, marcoMat);
  if (conHoja) {
    const h = hoja(tipo === "entrada" ? "entrada" : ac.puerta, ancho - 0.04, ap - 0.03, ac);
    h.position.set(-(ancho - 0.04) / 2, 0, 0);
    const bis = new THREE.Group();
    bis.position.set(ancho / 2 - 0.02, 0, CARA - 0.02);
    // La hoja queda abierta contra la pared, sin estorbar el paso.
    bis.rotation.y = tipo === "entrada" ? -1.2 : -1.5;
    bis.add(h);
    g.add(bis);
  }
}

/* ── Ventanas ────────────────────────────────────────────────────────── */

export interface Vano {
  /** Alféizar y altura superior del hueco (m). */
  y0: number;
  y1: number;
  ancho: number;
}

export function vanoVentana(ac: Acabados, tipoHab: string): Vano {
  const humeda = tipoHab === "cocina" || tipoHab === "bano";
  if (tipoHab === "bano") return { y0: 1.35, y1: 2.05, ancho: 0.6 };
  if (ac.ventana === "balconera" && !humeda) return { y0: 0, y1: Math.min(ac.techo - 0.3, 2.6), ancho: 0.86 };
  if (ac.ventana === "aluminio") return { y0: 1.0, y1: 2.05, ancho: 0.8 };
  return { y0: humeda ? 1.0 : 0.9, y1: humeda ? 2.05 : 2.15, ancho: 0.8 };
}

export function ventana(g: THREE.Group, alto: number, v: Vano, ac: Acabados, tipoHab: string, fachada: boolean, pared: THREE.Material, plantaBaja: boolean) {
  const lado = (1 - v.ancho) / 2;
  const pieza = (w: number, h: number, x: number, y: number) => {
    const b = caja(g, w, h, GROSOR, x, y, 0, pared);
    b.castShadow = false;
    b.userData.esPared = true;
    return b;
  };
  if (v.y0 > 0) pieza(1, v.y0, 0, 0);
  pieza(1, alto - v.y1, 0, v.y1);
  pieza(lado, v.y1 - v.y0, -0.5 + lado / 2, v.y0);
  pieza(lado, v.y1 - v.y0, 0.5 - lado / 2, v.y0);
  const h = v.y1 - v.y0;
  const balconera = ac.ventana === "balconera" && v.y0 === 0;
  const aluminio = ac.ventana === "aluminio";
  const carp = matI(aluminio ? "#B9BEC4" : ac.puerta === "lacada" || ac.madera === "#FFFFFF" ? "#FBFAF6" : ac.madera, aluminio ? 0.35 : 0.5, aluminio ? { metalness: 0.5 } : {});
  const vidrio = matI("#CFE6F2", 0.05, { transparent: true, opacity: 0.3, metalness: 0.25 });
  // Cristal y carpintería (dos hojas; las de madera y balconeras con travesaños).
  const cristal = new THREE.Mesh(new THREE.BoxGeometry(v.ancho - 0.04, h - 0.04, 0.012), vidrio);
  cristal.position.set(0, v.y0 + h / 2, -0.01);
  g.add(cristal);
  const marco = aluminio ? 0.045 : 0.06;
  caja(g, v.ancho, marco, 0.06, 0, v.y0, 0, carp);
  caja(g, v.ancho, marco, 0.06, 0, v.y1 - marco, 0, carp);
  caja(g, marco, h, 0.06, -v.ancho / 2 + marco / 2, v.y0, 0, carp);
  caja(g, marco, h, 0.06, v.ancho / 2 - marco / 2, v.y0, 0, carp);
  if (aluminio) caja(g, 0.035, h, 0.07, 0.06, v.y0, 0.005, carp); // corredera descentrada
  else {
    caja(g, 0.045, h, 0.06, 0, v.y0, 0, carp);
    const travesanos = balconera ? 3 : tipoHab === "bano" ? 0 : 1;
    for (let k = 1; k <= travesanos; k++) caja(g, v.ancho - 0.08, 0.03, 0.05, 0, v.y0 + (k * h) / (travesanos + 1), 0, carp);
  }
  // Alféizar interior (mármol en la gama alta, piedra artificial en la media).
  if (v.y0 > 0.3 && !aluminio) caja(g, v.ancho + 0.1, 0.03, 0.08, 0, v.y0 - 0.03, CARA + 0.02, matI(ac.puerta === "lacada" ? "#F2F0EC" : "#D9D2C2", 0.3));
  // Tapajuntas interior.
  if (!aluminio) {
    const t = matI(ac.puerta === "lacada" || ac.madera === "#FFFFFF" ? "#FBFAF6" : ac.madera, 0.5);
    caja(g, 0.06, h + 0.06, 0.016, -v.ancho / 2 - 0.03, v.y0 - 0.03, CARA + 0.008, t);
    caja(g, 0.06, h + 0.06, 0.016, v.ancho / 2 + 0.03, v.y0 - 0.03, CARA + 0.008, t);
    caja(g, v.ancho + 0.12, 0.06, 0.016, 0, v.y1, CARA + 0.008, t);
  }
  // Persiana enrollable en las de madera (cajón por fuera, a medio bajar según la habitación).
  if (ac.ventana === "madera" && fachada && tipoHab !== "bano") {
    caja(g, v.ancho, 0.18, 0.12, 0, v.y1 - 0.02, -GROSOR / 2 - 0.06, matI("#E8E2D3", 0.7));
    const bajada = tipoHab === "dormitorio" ? 0.35 : 0.15;
    caja(g, v.ancho - 0.04, h * bajada, 0.015, 0, v.y1 - h * bajada, -GROSOR / 2 - 0.02, matI("#E9E4D6", 0.8));
  }
  // Exterior: barandilla de forja en balconeras de planta alta; reja en la planta baja.
  if (fachada) {
    const hierro = matI("#2A2C31", 0.6, { metalness: 0.4 });
    if (balconera && !plantaBaja) {
      caja(g, v.ancho + 0.2, 0.04, 0.04, 0, 1.0, -GROSOR / 2 - 0.35, hierro);
      for (let k = 0; k <= 9; k++) caja(g, 0.016, 1.0, 0.016, -v.ancho / 2 - 0.1 + (k * (v.ancho + 0.2)) / 9, 0, -GROSOR / 2 - 0.35, hierro);
      caja(g, v.ancho + 0.3, 0.06, 0.4, 0, -0.02, -GROSOR / 2 - 0.2, matI("#D9D2C2", 0.5));
    } else if (plantaBaja && tipoHab !== "bano") {
      for (let k = -3; k <= 3; k++) caja(g, 0.016, h, 0.016, k * (v.ancho / 7), v.y0, -GROSOR / 2 - 0.1, hierro);
      caja(g, v.ancho, 0.025, 0.025, 0, v.y0 + h * 0.5, -GROSOR / 2 - 0.1, hierro);
    }
  }
  // Cortinas (gama media y alta en salones y dormitorios): visillo y dos paños recogidos.
  if (ac.cortinas && (tipoHab === "salon" || tipoHab === "dormitorio" || tipoHab === "estudio")) {
    const barra = matI(ac.puerta === "lacada" ? "#C9A64B" : "#3A3D44", 0.4, { metalness: 0.5 });
    const yb = Math.min(alto - 0.08, v.y1 + 0.15);
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, v.ancho + 0.5, 8), barra);
    cb.rotation.z = Math.PI / 2;
    cb.position.set(0, yb, CARA + 0.08);
    g.add(cb);
    const tela = matI(ac.textil, 0.95, { side: THREE.DoubleSide });
    const visillo = matI("#FFFFFF", 0.9, { transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const largo = yb - 0.02;
    for (const s of [-1, 1]) {
      // Paño con pliegues: varias tiras ligeramente desplazadas.
      for (let k = 0; k < 3; k++) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.09, largo), tela);
        p.position.set(s * (v.ancho / 2 + 0.06 + k * 0.06), largo / 2 + 0.01, CARA + 0.06 + (k % 2) * 0.02);
        p.rotation.y = s * (k % 2 ? 0.5 : -0.5);
        g.add(p);
      }
    }
    if (ac.puerta !== "lisa") {
      const vi = new THREE.Mesh(new THREE.PlaneGeometry(v.ancho, largo - 0.05), visillo);
      vi.position.set(0, (largo - 0.05) / 2 + 0.03, CARA + 0.05);
      g.add(vi);
    }
  }
}

/* ── Luminarias ──────────────────────────────────────────────────────── */

/**
 * Luminaria de techo según la gama: bombilla con portalámparas, plafón o lámpara
 * de diseño (colgante de campana). Devuelve el grupo y el material que se enciende.
 */
export function luminaria(tipo: Acabados["luz"], techo: number, ancho: number, estilo: string) {
  const g = new THREE.Group();
  const luzMat = new THREE.MeshStandardMaterial({ color: "#FFF6DA", emissive: new THREE.Color(tipo === "bombilla" ? "#FFE6B0" : "#FFD98A"), emissiveIntensity: 0 });
  if (tipo === "bombilla") {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 4), matI("#2A2C31"));
    cable.position.y = techo - 0.2;
    const portal = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), matI("#2A2C31"));
    portal.position.y = techo - 0.43;
    const bombilla = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), luzMat);
    bombilla.position.y = techo - 0.5;
    g.add(cable, portal, bombilla);
  } else if (tipo === "plafon") {
    const plafon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.07, 24), luzMat);
    plafon.position.y = techo - 0.04;
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.02, 24), matI("#E6E1D6", 0.5));
    aro.position.y = techo - 0.012;
    g.add(plafon, aro);
  } else {
    // Colgante de campana (latón en lo clásico, negro mate en lo moderno) y focos empotrados.
    const metal = matI(estilo === "moderno" ? "#2B2D31" : "#B8913F", 0.35, { metalness: 0.7 });
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.8, 4), metal);
    cable.position.y = techo - 0.4;
    const campana = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 0.26, 28, 1, true), new THREE.MeshStandardMaterial({ color: metal.color, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }));
    campana.position.y = techo - 0.92;
    const difusor = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), luzMat);
    difusor.rotation.x = Math.PI / 2;
    difusor.position.y = techo - 1.04;
    g.add(cable, campana, difusor);
    const focos = Math.max(2, Math.min(6, Math.round(ancho)));
    for (let k = 0; k < focos; k++) {
      const a = (k / focos) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 16), luzMat);
      f.position.set(Math.cos(a) * ancho * 0.32, techo - 0.004, Math.sin(a) * ancho * 0.32);
      g.add(f);
    }
  }
  return { g, luzMat };
}

/** Color e intensidad de la luz interior por gama (LED frío y escaso, cálido, cálido y generoso). */
export const LUZ_GAMA: Record<Acabados["luz"], { color: string; intensidad: number }> = {
  bombilla: { color: "#F4F1FF", intensidad: 1.6 },
  plafon: { color: "#FFE2B0", intensidad: 2.4 },
  diseno: { color: "#FFD49A", intensidad: 3.2 },
};
