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
/** Asfalto con grano, parches de bacheo, manchas de aceite y grietas muy suaves. */
export const asfalto = () =>
  textura("asfalto", 256, (g, t) => {
    const r = azar(5);
    g.fillStyle = "#676D78";
    g.fillRect(0, 0, t, t);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(40,44,52,0.18)" : "rgba(120,126,136,0.18)";
      g.fillRect(r() * t, r() * t, 30 + r() * 60, 20 + r() * 40);
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = "rgba(20,22,28,0.12)";
      g.beginPath();
      g.ellipse(r() * t, r() * t, 6 + r() * 14, 4 + r() * 8, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)";
      g.fillRect(r() * t, r() * t, 1.5, 1.5);
    }
    g.strokeStyle = "rgba(30,32,38,0.25)";
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      let x = r() * t;
      let y = r() * t;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (r() - 0.5) * 18;
        y += (r() - 0.5) * 18;
        g.lineTo(x, y);
      }
      g.stroke();
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

/* ── Estilo «ciudad de juego»: fachadas con más detalle ─────────────── */

/** Ventana con marco claro, cristal con reflejo y alféizar. */
function ventana(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, marco = "#FFFFFF", cristal = "#6E9FD8") {
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.fillRect(x + 3, y + 3, w, h);
  g.fillStyle = marco;
  g.fillRect(x - 3, y - 3, w + 6, h + 6);
  const grad = g.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, shade(cristal, 1.25));
  grad.addColorStop(0.5, cristal);
  grad.addColorStop(1, shade(cristal, 0.7));
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath();
  g.moveTo(x + 2, y + h - 2);
  g.lineTo(x + w * 0.45, y + 2);
  g.lineTo(x + w * 0.65, y + 2);
  g.lineTo(x + w * 0.2, y + h - 2);
  g.fill();
  g.fillStyle = marco;
  g.fillRect(x + w / 2 - 1.5, y, 3, h);
  g.fillRect(x - 6, y + h + 3, w + 12, 5);
}

/** Bloque de ladrillo rojo con molduras crema (una planta por repetición). */
export const fachadaLadrillo = () =>
  textura("ladrillo", 256, (g, t) => {
    const r = azar(41);
    g.fillStyle = "#B8553C";
    g.fillRect(0, 0, t, t);
    for (let y = 0; y < t; y += 10) {
      for (let x = (y / 10) % 2 ? -12 : 0; x < t; x += 24) {
        g.fillStyle = shade("#C25F45", 0.88 + r() * 0.2);
        g.fillRect(x + 1, y + 1, 22, 8);
      }
    }
    g.fillStyle = "#F2E3C4";
    g.fillRect(0, 0, t, 14);
    g.fillStyle = "rgba(0,0,0,0.15)";
    g.fillRect(0, 14, t, 3);
    for (let i = 0; i < 2; i++) ventana(g, 38 + i * 128, 62, 52, 120, "#F4E8CF", "#5F8FCB");
  });

/** Bloque pastel con balcones de barandilla blanca. */
export const fachadaPastel = (tono: string) =>
  textura(`pastel-${tono}`, 256, (g, t) => {
    g.fillStyle = tono;
    g.fillRect(0, 0, t, t);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(0, 0, t, 10);
    for (let i = 0; i < 2; i++) {
      const x = 30 + i * 128;
      ventana(g, x + 8, 50, 50, 110, "#FFFFFF", "#7FB0E0");
      g.fillStyle = "rgba(0,0,0,0.15)";
      g.fillRect(x - 6, 172, 92, 8);
      g.fillStyle = "#FFFFFF";
      g.fillRect(x - 8, 164, 92, 10);
      g.strokeStyle = "#FFFFFF";
      g.lineWidth = 4;
      g.strokeRect(x - 6, 176, 88, 44);
      for (let k = 1; k < 8; k++) {
        g.beginPath();
        g.moveTo(x - 6 + k * 11, 176);
        g.lineTo(x - 6 + k * 11, 220);
        g.stroke();
      }
      g.fillStyle = ["#FF6F91", "#7BD55A", "#FFC145"][i % 3];
      g.beginPath();
      g.arc(x + 10, 170, 8, 0, Math.PI * 2);
      g.fill();
    }
  });

/** Muro cortina de cristal (edificios altos y públicos modernos). */
export const fachadaCristal = () =>
  textura("cristal", 256, (g, t) => {
    const grad = g.createLinearGradient(0, 0, t, t);
    grad.addColorStop(0, "#9CC9F5");
    grad.addColorStop(0.5, "#5E93D6");
    grad.addColorStop(1, "#3D6FB8");
    g.fillStyle = grad;
    g.fillRect(0, 0, t, t);
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.beginPath();
    g.moveTo(0, t * 0.8);
    g.lineTo(t * 0.6, 0);
    g.lineTo(t * 0.8, 0);
    g.lineTo(t * 0.1, t);
    g.lineTo(0, t);
    g.fill();
    g.fillStyle = "#EEF3F8";
    for (let x = 0; x < t; x += 64) g.fillRect(x, 0, 6, t);
    g.fillRect(0, 0, t, 8);
    g.fillRect(0, t / 2, t, 4);
  });

/** Planta baja comercial: escaparates, puerta y toldo. */
export const escaparate = () =>
  textura("escaparate", 256, (g, t) => {
    g.fillStyle = "#F3EDE2";
    g.fillRect(0, 0, t, t);
    for (let i = 0; i < 3; i++) {
      const x = 12 + i * 82;
      g.fillStyle = "#2E3B4E";
      g.fillRect(x, 60, 70, 170);
      g.fillStyle = "rgba(255,230,160,0.55)";
      g.fillRect(x + 6, 70, 58, 100);
      g.fillStyle = "rgba(255,255,255,0.3)";
      g.fillRect(x + 8, 72, 12, 96);
    }
  });

/** Toldo a rayas (comercios de las calles principales). */
export const toldo = (color: string) =>
  textura(`toldo-${color}`, 64, (g, t) => {
    for (let x = 0; x < t; x += 16) {
      g.fillStyle = (x / 16) % 2 ? "#FFFFFF" : color;
      g.fillRect(x, 0, 16, t);
    }
  });

/** Cielo: degradado de horizonte con bruma cálida. */
export const cielo = () =>
  textura("cielo", 256, (g, t) => {
    const grad = g.createLinearGradient(0, 0, 0, t);
    grad.addColorStop(0, "#5FA8F0");
    grad.addColorStop(0.55, "#A9D3F7");
    grad.addColorStop(0.85, "#F4E6CF");
    grad.addColorStop(1, "#FBEFD9");
    g.fillStyle = grad;
    g.fillRect(0, 0, t, t);
  }, false);

/* ── Instalaciones deportivas (las marcas se pintan a escala real) ───── */

/** Campo de fútbol visto desde arriba: franjas de siega y líneas. Largo en vertical. */
export const campoFutbol = (tono: "natural" | "artificial" | "tierra") =>
  textura(`futbol-${tono}`, 512, (g, t) => {
    const w = t * 0.68;
    const x0 = (t - w) / 2;
    const [a, b] = tono === "natural" ? ["#4FB14A", "#45A042"] : tono === "artificial" ? ["#2F9A4A", "#2A8C43"] : ["#D7B987", "#CFAF7C"];
    g.fillStyle = a;
    g.fillRect(0, 0, t, t);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 2 ? a : b;
      g.fillRect(x0 - 10, (t / 12) * i, w + 20, t / 12);
    }
    g.strokeStyle = tono === "tierra" ? "rgba(255,255,255,0.8)" : "#FFFFFF";
    g.lineWidth = 4;
    const m = t * 0.04;
    g.strokeRect(x0, m, w, t - 2 * m);
    g.beginPath();
    g.moveTo(x0, t / 2);
    g.lineTo(x0 + w, t / 2);
    g.stroke();
    g.beginPath();
    g.arc(t / 2, t / 2, t * 0.09, 0, Math.PI * 2);
    g.stroke();
    for (const y of [m, t - m]) {
      const s = y === m ? 1 : -1;
      g.strokeRect(t / 2 - w * 0.3, Math.min(y, y + s * t * 0.16), w * 0.6, t * 0.16);
      g.strokeRect(t / 2 - w * 0.14, Math.min(y, y + s * t * 0.06), w * 0.28, t * 0.06);
      g.fillStyle = "#FFFFFF";
      g.fillRect(t / 2 - 22, y - s * 4 - 2, 44, 4);
    }
  }, false);

function pistaConLineas(clave: string, fondo: string, interior: string, lineas: (g: CanvasRenderingContext2D, t: number) => void) {
  return textura(clave, 256, (g, t) => {
    g.fillStyle = fondo;
    g.fillRect(0, 0, t, t);
    g.fillStyle = interior;
    g.fillRect(t * 0.18, t * 0.08, t * 0.64, t * 0.84);
    g.strokeStyle = "#FFFFFF";
    g.lineWidth = 3;
    lineas(g, t);
  }, false);
}

export const pistaTenis = () =>
  pistaConLineas("tenis", "#5E9C5A", "#8E7CC3", (g, t) => {
    g.strokeRect(t * 0.18, t * 0.08, t * 0.64, t * 0.84);
    g.strokeRect(t * 0.25, t * 0.08, t * 0.5, t * 0.84);
    g.beginPath();
    g.moveTo(t * 0.25, t * 0.3); g.lineTo(t * 0.75, t * 0.3);
    g.moveTo(t * 0.25, t * 0.7); g.lineTo(t * 0.75, t * 0.7);
    g.moveTo(t * 0.5, t * 0.3); g.lineTo(t * 0.5, t * 0.7);
    g.stroke();
    g.lineWidth = 5;
    g.strokeStyle = "#F4F4F4";
    g.beginPath();
    g.moveTo(t * 0.14, t * 0.5); g.lineTo(t * 0.86, t * 0.5);
    g.stroke();
  });

export const pistaPadel = () =>
  pistaConLineas("padel", "#2D6FD6", "#2D6FD6", (g, t) => {
    g.strokeRect(t * 0.08, t * 0.04, t * 0.84, t * 0.92);
    g.beginPath();
    g.moveTo(t * 0.08, t * 0.27); g.lineTo(t * 0.92, t * 0.27);
    g.moveTo(t * 0.08, t * 0.73); g.lineTo(t * 0.92, t * 0.73);
    g.moveTo(t * 0.5, t * 0.27); g.lineTo(t * 0.5, t * 0.73);
    g.stroke();
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(t * 0.04, t * 0.5); g.lineTo(t * 0.96, t * 0.5);
    g.stroke();
  });

export const pistaBaloncesto = () =>
  pistaConLineas("baloncesto", "#3A7BD5", "#E0894A", (g, t) => {
    g.strokeRect(t * 0.18, t * 0.08, t * 0.64, t * 0.84);
    g.beginPath();
    g.moveTo(t * 0.18, t / 2); g.lineTo(t * 0.82, t / 2);
    g.stroke();
    g.beginPath();
    g.arc(t / 2, t / 2, t * 0.08, 0, Math.PI * 2);
    g.stroke();
    for (const [y, s] of [[t * 0.08, 1], [t * 0.92, -1]] as const) {
      g.strokeRect(t * 0.42, Math.min(y, y + s * t * 0.2), t * 0.16, t * 0.2);
      g.beginPath();
      g.arc(t / 2, y, t * 0.26, s > 0 ? 0.15 : Math.PI + 0.15, s > 0 ? Math.PI - 0.15 : Math.PI * 2 - 0.15);
      g.stroke();
    }
  });

export const pistaMulti = () =>
  pistaConLineas("multi", "#4C8DDB", "#5FA35A", (g, t) => {
    g.strokeRect(t * 0.18, t * 0.08, t * 0.64, t * 0.84);
    g.beginPath();
    g.moveTo(t * 0.18, t / 2); g.lineTo(t * 0.82, t / 2);
    g.stroke();
    g.beginPath();
    g.arc(t / 2, t / 2, t * 0.1, 0, Math.PI * 2);
    g.stroke();
  });

/** Pista de atletismo: anillo rojo con calles y césped dentro (largo en vertical). */
export const pistaAtletismo = () =>
  textura("atletismo", 512, (g, t) => {
    g.fillStyle = "#6FB257";
    g.fillRect(0, 0, t, t);
    const calle = (r: number, color: string, ancho: number) => {
      g.strokeStyle = color;
      g.lineWidth = ancho;
      const w = t * 0.34;
      g.beginPath();
      g.arc(t / 2, t * 0.5 - w * 0.75, r, Math.PI, 0);
      g.lineTo(t / 2 + r, t * 0.5 + w * 0.75);
      g.arc(t / 2, t * 0.5 + w * 0.75, r, 0, Math.PI);
      g.closePath();
      g.stroke();
    };
    calle(t * 0.28, "#C9473B", t * 0.13);
    for (let i = 0; i <= 6; i++) calle(t * 0.225 + i * t * 0.0185, "rgba(255,255,255,0.75)", 1.5);
  }, false);

/** Aparcamiento: asfalto con plazas pintadas (filas a lo ancho). */
export const aparcamiento = () =>
  textura("aparcamiento", 128, (g, t) => {
    g.fillStyle = "#8E949D";
    g.fillRect(0, 0, t, t);
    const r = azar(17);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
      g.fillRect(r() * t, r() * t, 2, 2);
    }
    g.fillStyle = "rgba(255,255,255,0.85)";
    for (const y0 of [0, t / 2]) {
      for (let x = 0; x < t; x += t / 8) g.fillRect(x, y0 + 2, 2, t * 0.2);
      g.fillRect(0, y0 + 2, t, 2);
    }
  });

/** Carril bici y paseo rojizo del paseo marítimo de Levante. */
export const paseoLevante = () =>
  textura("paseo-levante", 128, (g, t) => {
    g.fillStyle = "#D9786A";
    g.fillRect(0, 0, t, t);
    g.fillStyle = "#E9A08F";
    g.fillRect(0, 0, t * 0.45, t);
    g.fillStyle = "rgba(255,255,255,0.8)";
    for (let y = 0; y < t; y += 24) g.fillRect(t * 0.72, y, 3, 12);
    g.fillRect(t * 0.45, 0, 2, t);
  });

/** Fachada de pabellón deportivo: blanco con franja azul y ventanas altas. */
export const fachadaPabellon = () =>
  textura("pabellon", 256, (g, t) => {
    g.fillStyle = "#F4F6F8";
    g.fillRect(0, 0, t, t);
    g.fillStyle = "#1F3F8F";
    g.fillRect(0, t * 0.62, t, t * 0.16);
    g.fillStyle = "#9FC3E8";
    for (let x = 8; x < t; x += 32) g.fillRect(x, t * 0.12, 20, t * 0.36);
    g.fillStyle = "rgba(0,0,0,0.08)";
    g.fillRect(0, t * 0.96, t, t * 0.04);
  });

/** Grada vista de frente: filas de asientos claros con pasillos. */
export const asientos = (color = "#E9ECF1") =>
  textura(`asientos-${color}`, 128, (g, t) => {
    g.fillStyle = color;
    g.fillRect(0, 0, t, t);
    g.fillStyle = "rgba(20,40,90,0.18)";
    for (let y = 0; y < t; y += 8) g.fillRect(0, y, t, 2);
    g.fillStyle = "rgba(255,255,255,0.9)";
    for (let x = 0; x < t; x += 42) g.fillRect(x, 0, 4, t);
  });

/** Rótulo de la grada de preferencia. */
export const rotuloEstadio = () =>
  textura("rotulo-estadio", 512, (g, t) => {
    g.fillStyle = "#14275E";
    g.fillRect(0, 0, t, t);
    g.fillStyle = "#FFFFFF";
    g.font = `bold ${t * 0.11}px Fredoka, Arial, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("CIUDAD DE LA LÍNEA", t / 2, t / 2);
  }, false);

/* ── Materiales de la arquitectura detallada (texturas neutras, el color va por vértice) ── */

/** Estuco encalado: casi blanco, con grano y manchas muy suaves para que el color por vértice lo tiña. */
export const estuco = () =>
  textura("estuco", 256, (g, t) => {
    const r = azar(61);
    g.fillStyle = "#F4F4F2";
    g.fillRect(0, 0, t, t);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "120,110,100"},${0.03 + r() * 0.04})`;
      g.beginPath();
      g.ellipse(r() * t, r() * t, 10 + r() * 40, 6 + r() * 24, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.05)";
      g.fillRect(r() * t, r() * t, 1.5, 1.5);
    }
  });

/** Ladrillo visto sin ventanas (las ventanas son geometría). */
export const ladrilloLiso = () =>
  textura("ladrillo-liso", 256, (g, t) => {
    const r = azar(43);
    g.fillStyle = "#D9CFC2";
    g.fillRect(0, 0, t, t);
    for (let y = 0; y < t; y += 16) {
      for (let x = (y / 16) % 2 ? -18 : 0; x < t; x += 36) {
        g.fillStyle = shade("#C8664B", 0.85 + r() * 0.25);
        g.fillRect(x + 1.5, y + 1.5, 33, 13);
      }
    }
  });

/** Teja árabe vista desde arriba: canales y cobijas con sombra en cada hilada. */
export const tejaArabe = () =>
  textura("teja-arabe", 256, (g, t) => {
    const r = azar(71);
    const n = 8;
    const w = t / n;
    for (let fila = 0; fila < 8; fila++) {
      for (let x = 0; x < n; x++) {
        const tono = 0.86 + r() * 0.24;
        const grad = g.createLinearGradient(x * w, 0, (x + 1) * w, 0);
        grad.addColorStop(0, shade("#9E4127", tono));
        grad.addColorStop(0.5, shade("#E58A5C", tono));
        grad.addColorStop(1, shade("#8E3A22", tono));
        g.fillStyle = grad;
        g.fillRect(x * w, fila * w, w, w);
        g.fillStyle = "rgba(60,20,8,0.35)";
        g.fillRect(x * w, fila * w + w - 4, w, 4);
        if (r() < 0.12) {
          g.fillStyle = "rgba(80,90,40,0.25)";
          g.fillRect(x * w + 3, fila * w + 4, w - 6, w * 0.4);
        }
      }
    }
  });

/** Relieve de la teja (mapa de normales): cilindros a lo largo y escalón en cada hilada. */
export const tejaNormal = () => {
  const clave = "teja-normal";
  const t = 128;
  const [c, g] = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = t;
    return [cv, cv.getContext("2d")!] as const;
  })();
  const img = g.createImageData(t, t);
  const n = 8;
  const w = t / n;
  for (let y = 0; y < t; y++) {
    for (let x = 0; x < t; x++) {
      const fase = ((x % w) / w) * Math.PI;
      let nx = -Math.cos(fase) * 0.75;
      let ny = (y % w) > w - 3 ? 0.6 : (y % w) < 2 ? -0.3 : 0;
      const l = Math.hypot(nx, ny, 1);
      nx /= l;
      ny /= l;
      const nz = 1 / l;
      const i = (y * t + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.name = clave;
  return tex;
};

/** Chapa grecada de naves industriales. */
export const chapa = () =>
  textura("chapa", 128, (g, t) => {
    g.fillStyle = "#E9ECF0";
    g.fillRect(0, 0, t, t);
    for (let x = 0; x < t; x += 16) {
      const grad = g.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, "#C9CED6");
      grad.addColorStop(0.4, "#FFFFFF");
      grad.addColorStop(1, "#BFC5CE");
      g.fillStyle = grad;
      g.fillRect(x, 0, 16, t);
    }
  });
