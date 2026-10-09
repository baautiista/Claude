import * as THREE from "three";

/**
 * Texturas pintadas con canvas (sin archivos): césped, adoquines, tejas,
 * fachadas encaladas con persianas, tierra arada… Estilo Hay Day: colores
 * saturados, mucho detalle pequeño y bordes suaves.
 */

const cache = new Map<string, THREE.CanvasTexture>();

function lienzo(t: number) {
  const c = document.createElement("canvas");
  c.width = c.height = t;
  return [c, c.getContext("2d")!] as const;
}

function textura(clave: string, t: number, pintar: (g: CanvasRenderingContext2D, t: number) => void, repetir = true) {
  if (cache.has(clave)) return cache.get(clave)!;
  const [c, g] = lienzo(t);
  pintar(g, t);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repetir) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  cache.set(clave, tex);
  return tex;
}

/** Pseudoaleatorio con semilla para que las texturas salgan siempre iguales. */
function azar(semilla: number) {
  let s = semilla;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export const cesped = () =>
  textura("cesped", 256, (g, t) => {
    const r = azar(3);
    g.fillStyle = "#7CC243";
    g.fillRect(0, 0, t, t);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(150,210,80,0.35)" : "rgba(80,150,50,0.25)";
      g.beginPath();
      g.ellipse(r() * t, r() * t, 10 + r() * 26, 8 + r() * 18, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 900; i++) {
      const x = r() * t;
      const y = r() * t;
      g.strokeStyle = r() < 0.5 ? "rgba(60,130,40,0.55)" : "rgba(175,225,100,0.55)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4);
      g.stroke();
    }
  });

/** Adoquines grises claros de plaza. */
export const adoquin = (clave = "adoquin", base = "#D9D3C7", junta = "#B5ADA0") =>
  textura(clave, 256, (g, t) => {
    const r = azar(11);
    g.fillStyle = junta;
    g.fillRect(0, 0, t, t);
    const n = 8;
    const s = t / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const off = y % 2 ? s / 2 : 0;
        const k = 0.9 + r() * 0.12;
        g.fillStyle = shade(base, k);
        roundRect(g, x * s + off + 2, y * s + 2, s - 4, s - 4, 6);
        g.fill();
        if (x === 0 && off) {
          roundRect(g, x * s - s / 2 + 2, y * s + 2, s - 4, s - 4, 6);
          g.fill();
        }
      }
    }
  });

export const acera = () => adoquin("acera", "#EEE6D6", "#CFC4AE");
export const asfalto = () =>
  textura("asfalto", 128, (g, t) => {
    const r = azar(5);
    g.fillStyle = "#6E7480";
    g.fillRect(0, 0, t, t);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
      g.fillRect(r() * t, r() * t, 2, 2);
    }
  });

export const tierraArada = () =>
  textura("tierra", 128, (g, t) => {
    const r = azar(9);
    g.fillStyle = "#8B5A2B";
    g.fillRect(0, 0, t, t);
    for (let y = 0; y < t; y += 16) {
      g.fillStyle = "#A46C37";
      roundRect(g, 0, y + 2, t, 9, 4);
      g.fill();
      g.fillStyle = "rgba(60,30,10,0.35)";
      g.fillRect(0, y + 12, t, 3);
    }
    for (let i = 0; i < 120; i++) {
      g.fillStyle = "rgba(255,220,170,0.18)";
      g.fillRect(r() * t, r() * t, 2, 2);
    }
  });

export const arena = () =>
  textura("arena", 128, (g, t) => {
    const r = azar(21);
    g.fillStyle = "#F2DFAE";
    g.fillRect(0, 0, t, t);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.35)" : "rgba(190,150,90,0.25)";
      g.fillRect(r() * t, r() * t, 2, 2);
    }
  });

/** Tejas árabes: filas de canales anaranjados. */
export const teja = () =>
  textura("teja", 128, (g, t) => {
    g.fillStyle = "#B8502E";
    g.fillRect(0, 0, t, t);
    const ancho = t / 8;
    for (let x = 0; x < 8; x++) {
      const grad = g.createLinearGradient(x * ancho, 0, (x + 1) * ancho, 0);
      grad.addColorStop(0, "#C9603A");
      grad.addColorStop(0.5, "#E98256");
      grad.addColorStop(1, "#B04B2A");
      g.fillStyle = grad;
      g.fillRect(x * ancho + 1, 0, ancho - 2, t);
    }
    for (let y = 0; y < t; y += t / 6) {
      g.fillStyle = "rgba(90,30,10,0.35)";
      g.fillRect(0, y, t, 2);
    }
  });

export type Persiana = "verde" | "azul" | "marron";
const PERSIANA: Record<Persiana, string> = { verde: "#2E8B57", azul: "#2F6DB5", marron: "#8A4F2B" };

/** Fachada encalada de casa baja: ventana con persianas, reja y macetas. */
export const fachada = (p: Persiana) =>
  textura(`fachada-${p}`, 256, (g, t) => {
    const r = azar(p.length * 7);
    g.fillStyle = "#FBF7EE";
    g.fillRect(0, 0, t, t);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = "rgba(200,190,170,0.12)";
      g.beginPath();
      g.arc(r() * t, r() * t, 1 + r() * 4, 0, Math.PI * 2);
      g.fill();
    }
    // Zócalo.
    g.fillStyle = "#E9D6A8";
    g.fillRect(0, t * 0.86, t, t * 0.14);
    g.fillStyle = "#D2BC86";
    g.fillRect(0, t * 0.86, t, 4);
    // Ventana con marco, persianas y alféizar con macetas.
    const w = t * 0.36;
    const h = t * 0.4;
    const x = (t - w) / 2;
    const y = t * 0.22;
    g.fillStyle = "#E7DFCF";
    roundRect(g, x - 10, y - 10, w + 20, h + 20, 8);
    g.fill();
    g.fillStyle = PERSIANA[p];
    roundRect(g, x, y, w, h, 4);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.22)";
    g.lineWidth = 2;
    for (let k = 1; k < 8; k++) {
      g.beginPath();
      g.moveTo(x + 3, y + (h / 8) * k);
      g.lineTo(x + w - 3, y + (h / 8) * k);
      g.stroke();
    }
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(x + w / 2 - 1.5, y, 3, h);
    g.fillStyle = "#D8CCB5";
    g.fillRect(x - 14, y + h + 6, w + 28, 8);
    for (let k = 0; k < 3; k++) {
      const mx = x + 4 + k * (w / 3);
      g.fillStyle = "#C2633D";
      g.fillRect(mx, y + h - 6, 16, 12);
      g.fillStyle = ["#FF4F86", "#FF8FB1", "#E83B3B"][k];
      g.beginPath();
      g.arc(mx + 8, y + h - 10, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3E9B45";
      g.beginPath();
      g.arc(mx + 3, y + h - 6, 5, 0, Math.PI * 2);
      g.fill();
    }
  });

/** Fachada de bloque de pisos: balcones por planta. */
export const fachadaBloque = (tono: string) =>
  textura(`bloque-${tono}`, 256, (g, t) => {
    g.fillStyle = tono;
    g.fillRect(0, 0, t, t);
    for (let col = 0; col < 2; col++) {
      const x = 22 + col * 122;
      g.fillStyle = "#6F95C9";
      roundRect(g, x + 8, 40, 72, 120, 6);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.45)";
      g.fillRect(x + 14, 46, 18, 108);
      g.fillStyle = "#F7F3EA";
      g.fillRect(x, 150, 90, 14);
      g.strokeStyle = "#3E4452";
      g.lineWidth = 4;
      g.strokeRect(x + 2, 168, 86, 52);
      for (let k = 1; k < 8; k++) {
        g.beginPath();
        g.moveTo(x + 2 + k * 11, 168);
        g.lineTo(x + 2 + k * 11, 220);
        g.stroke();
      }
    }
    g.fillStyle = "rgba(0,0,0,0.08)";
    g.fillRect(0, t - 10, t, 10);
  });

/** Friso rojo con rombos ocres (iglesia de la Plaza). */
export const friso = () =>
  textura("friso", 256, (g, t) => {
    g.fillStyle = "#B8442F";
    g.fillRect(0, 0, t, t);
    g.fillStyle = "#E7B44B";
    const n = 8;
    const s = t / n;
    for (let i = 0; i < n; i++) {
      g.beginPath();
      g.moveTo(i * s + s / 2, t * 0.15);
      g.lineTo(i * s + s * 0.9, t / 2);
      g.lineTo(i * s + s / 2, t * 0.85);
      g.lineTo(i * s + s * 0.1, t / 2);
      g.closePath();
      g.fill();
    }
  });

/** Madera de tablones. */
export const madera = () =>
  textura("madera", 128, (g, t) => {
    const r = azar(17);
    g.fillStyle = "#A8703F";
    g.fillRect(0, 0, t, t);
    for (let y = 0; y < t; y += 16) {
      g.fillStyle = shade("#A8703F", 0.88 + r() * 0.2);
      g.fillRect(0, y + 1, t, 14);
      g.fillStyle = "rgba(60,30,10,0.4)";
      g.fillRect(0, y, t, 1.5);
    }
  });

/** Piedra de muro (muretes como los de la imagen de Hay Day). */
export const piedra = () =>
  textura("piedra", 128, (g, t) => {
    const r = azar(31);
    g.fillStyle = "#9E9A93";
    g.fillRect(0, 0, t, t);
    for (let y = 0; y < t; y += 32) {
      for (let x = (y / 32) % 2 ? -20 : 0; x < t; x += 42) {
        g.fillStyle = shade("#D7D3CB", 0.88 + r() * 0.16);
        roundRect(g, x + 3, y + 3, 36 + r() * 6, 26, 9);
        g.fill();
      }
    }
  });

/* ── utilidades ─────────────────────────────────────────────────────── */

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
