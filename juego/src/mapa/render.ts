import {
  BARRIOS, GIBRALTAR, LUGARES, MUNDO, NODOS, PENON, PISTA, PROXIMAMENTE, TIERRA, TRAMOS,
  type LugarId, type Punto,
} from "../datos/mapa";
import { iconoPath } from "../iconos";
import { COLOR, FUENTE, MAPA } from "../marca";
import { distancia } from "./rutas";

/** Trazado real opcional generado por `npm run mapa` (OpenStreetMap). */
interface MapaReal {
  tierra: Punto[][];
  calles: { principal: boolean; puntos: Punto[] }[];
}
const reales = import.meta.glob<MapaReal>("../datos/mapa-real.json", { eager: true, import: "default" });
const REAL: MapaReal | null = Object.values(reales)[0] ?? null;

type Camara = { x: number; y: number; zoom: number };

export class Mapa {
  private ctx: CanvasRenderingContext2D;
  private cam: Camara = { x: 400, y: 800, zoom: 1 };
  private objetivoCam: { x: number; y: number } | null = null;
  private pos: Punto = [0, 0];
  private camino: Punto[] = [];
  private alLlegar: (() => void) | null = null;
  private punteros = new Map<number, { x: number; y: number }>();
  private toque: { x: number; y: number; t: number; movido: boolean } | null = null;
  private pellizco: number | null = null;
  private ultimoArrastre = 0;
  private ancho = 0;
  private alto = 0;

  objetivo: LugarId | null = null;
  ropa: string = COLOR.lima;
  /** Hora del día (0–24) para la luz. */
  hora = 12;
  onTapLugar: (id: LugarId) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    new ResizeObserver(() => this.ajustar()).observe(canvas);
    this.ajustar();
    this.escuchar();
    const bucle = (t: number) => {
      this.paso(t);
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  }

  colocar(nodo: string) {
    this.pos = [...NODOS[nodo]] as unknown as Punto;
    this.camino = [];
    this.cam.x = this.pos[0];
    this.cam.y = this.pos[1];
  }

  /** Anima el paseo por una lista de nodos y llama a `fin` al llegar. */
  andar(nodos: string[], fin: () => void) {
    this.camino = nodos.slice(1).map((n) => NODOS[n]);
    this.alLlegar = fin;
    this.ultimoArrastre = 0;
    if (!this.camino.length) {
      this.alLlegar = null;
      fin();
    }
  }

  get andando() {
    return this.camino.length > 0;
  }

  centrarEn(lugar: LugarId) {
    const [x, y] = NODOS[LUGARES[lugar].nodo];
    this.objetivoCam = { x, y };
    this.ultimoArrastre = 0;
  }

  private ajustar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const r = this.canvas.getBoundingClientRect();
    this.ancho = r.width;
    this.alto = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Que quepan ~620 unidades de ancho al empezar.
    if (!this.cam.zoom || this.cam.zoom === 1) this.cam.zoom = Math.max(0.55, Math.min(1.6, r.width / 620));
  }

  /* ── Entrada: arrastrar, pellizcar, rueda y toque ──────────────────── */

  private escuchar() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (ev) => {
      c.setPointerCapture(ev.pointerId);
      this.punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (this.punteros.size === 1) this.toque = { x: ev.clientX, y: ev.clientY, t: performance.now(), movido: false };
      else this.toque = null;
      this.pellizco = null;
    });
    c.addEventListener("pointermove", (ev) => {
      const prev = this.punteros.get(ev.pointerId);
      if (!prev) return;
      const ahora = { x: ev.clientX, y: ev.clientY };
      this.punteros.set(ev.pointerId, ahora);
      if (this.punteros.size === 1) {
        if (this.toque && Math.hypot(ahora.x - this.toque.x, ahora.y - this.toque.y) > 8) this.toque.movido = true;
        if (this.toque?.movido || !this.toque) {
          this.cam.x -= (ahora.x - prev.x) / this.cam.zoom;
          this.cam.y -= (ahora.y - prev.y) / this.cam.zoom;
          this.ultimoArrastre = performance.now();
          this.objetivoCam = null;
        }
      } else if (this.punteros.size === 2) {
        const [a, b] = [...this.punteros.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pellizco) this.zoomEn(d / this.pellizco, (a.x + b.x) / 2, (a.y + b.y) / 2);
        this.pellizco = d;
        this.ultimoArrastre = performance.now();
      }
      this.limitarCamara();
    });
    const soltar = (ev: PointerEvent) => {
      this.punteros.delete(ev.pointerId);
      if (this.toque && !this.toque.movido && performance.now() - this.toque.t < 450) this.tocar(ev.clientX, ev.clientY);
      this.toque = null;
      this.pellizco = null;
    };
    c.addEventListener("pointerup", soltar);
    c.addEventListener("pointercancel", (ev) => {
      this.punteros.delete(ev.pointerId);
      this.toque = null;
    });
    c.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        this.zoomEn(Math.exp(-ev.deltaY * 0.0015), ev.clientX, ev.clientY);
        this.ultimoArrastre = performance.now();
      },
      { passive: false },
    );
  }

  private zoomEn(factor: number, sx: number, sy: number) {
    const r = this.canvas.getBoundingClientRect();
    const antes = this.aMundo(sx - r.left, sy - r.top);
    this.cam.zoom = Math.max(0.45, Math.min(2.6, this.cam.zoom * factor));
    const despues = this.aMundo(sx - r.left, sy - r.top);
    this.cam.x += antes[0] - despues[0];
    this.cam.y += antes[1] - despues[1];
    this.limitarCamara();
  }

  private limitarCamara() {
    this.cam.x = Math.max(0, Math.min(MUNDO.ancho, this.cam.x));
    this.cam.y = Math.max(0, Math.min(MUNDO.alto, this.cam.y));
  }

  private aMundo(sx: number, sy: number): Punto {
    return [(sx - this.ancho / 2) / this.cam.zoom + this.cam.x, (sy - this.alto / 2) / this.cam.zoom + this.cam.y];
  }

  private tocar(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    const [wx, wy] = this.aMundo(cx - r.left, cy - r.top);
    let mejor: LugarId | null = null;
    let dMin = 34 / Math.min(this.cam.zoom, 1.2);
    for (const id of Object.keys(LUGARES) as LugarId[]) {
      const d = distancia([wx, wy], NODOS[LUGARES[id].nodo]);
      if (d < dMin) {
        dMin = d;
        mejor = id;
      }
    }
    if (mejor) this.onTapLugar(mejor);
  }

  /* ── Bucle ─────────────────────────────────────────────────────────── */

  private tPrevio = 0;
  private paso(t: number) {
    const dt = Math.min(0.05, (t - (this.tPrevio || t)) / 1000);
    this.tPrevio = t;
    if (this.camino.length) {
      let avance = 560 * dt;
      while (avance > 0 && this.camino.length) {
        const [dx, dy] = [this.camino[0][0] - this.pos[0], this.camino[0][1] - this.pos[1]];
        const d = Math.hypot(dx, dy);
        if (d <= avance) {
          this.pos = this.camino.shift()!;
          avance -= d;
        } else {
          this.pos = [this.pos[0] + (dx / d) * avance, this.pos[1] + (dy / d) * avance];
          avance = 0;
        }
      }
      if (!this.camino.length && this.alLlegar) {
        const f = this.alLlegar;
        this.alLlegar = null;
        f();
      }
    }
    // La cámara sigue al personaje salvo que el jugador esté mirando el mapa.
    const libre = performance.now() - this.ultimoArrastre > 2500;
    const destino = this.objetivoCam ?? (libre ? { x: this.pos[0], y: this.pos[1] } : null);
    if (destino) {
      const k = 1 - Math.pow(0.002, dt);
      this.cam.x += (destino.x - this.cam.x) * k;
      this.cam.y += (destino.y - this.cam.y) * k;
      if (this.objetivoCam && Math.hypot(destino.x - this.cam.x, destino.y - this.cam.y) < 2) {
        this.objetivoCam = null;
        this.ultimoArrastre = performance.now();
      }
    }
    this.dibujar(t / 1000);
  }

  /* ── Dibujo ────────────────────────────────────────────────────────── */

  private poligono(p: readonly Punto[]) {
    const c = this.ctx;
    c.beginPath();
    p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  }

  private dibujar(seg: number) {
    const c = this.ctx;
    const z = this.cam.zoom;
    c.save();
    c.fillStyle = MAPA.mar;
    c.fillRect(0, 0, this.ancho, this.alto);
    c.translate(this.ancho / 2, this.alto / 2);
    c.scale(z, z);
    c.translate(-this.cam.x, -this.cam.y);

    // Mar con ondas suaves.
    c.strokeStyle = "rgba(255,255,255,0.05)";
    c.lineWidth = 2;
    for (let y = -200; y < MUNDO.alto + 200; y += 46) {
      c.beginPath();
      for (let x = -400; x <= MUNDO.ancho + 400; x += 20) {
        const yy = y + Math.sin(x / 40 + seg * 0.8 + y) * 4;
        x === -400 ? c.moveTo(x, yy) : c.lineTo(x, yy);
      }
      c.stroke();
    }
    this.rotuloMar("BAHÍA DE ALGECIRAS", 70, 900);
    this.rotuloMar("MAR MEDITERRÁNEO", 950, 900);

    // Gibraltar, pista y Peñón.
    this.poligono(GIBRALTAR);
    c.fillStyle = MAPA.gibraltar;
    c.fill();
    this.poligono(PENON);
    c.fillStyle = MAPA.penon;
    c.fill();
    c.fillStyle = "#24314F";
    c.fillRect(PISTA.x, PISTA.y, PISTA.ancho, PISTA.alto);
    c.strokeStyle = "rgba(255,255,255,0.7)";
    c.setLineDash([16, 14]);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(PISTA.x + 10, PISTA.y + PISTA.alto / 2);
    c.lineTo(PISTA.x + PISTA.ancho - 10, PISTA.y + PISTA.alto / 2);
    c.stroke();
    c.setLineDash([]);

    // Tierra.
    const tierras = REAL?.tierra ?? [TIERRA];
    for (const t of tierras) {
      this.poligono(t);
      c.fillStyle = MAPA.tierra;
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.55)";
      c.lineWidth = 3;
      c.stroke();
    }

    // Frontera.
    c.strokeStyle = COLOR.blanco;
    c.lineWidth = 4;
    c.setLineDash([12, 9]);
    c.beginPath();
    c.moveTo(250, 1480);
    c.lineTo(862, 1480);
    c.stroke();
    c.setLineDash([]);

    // Barrios.
    for (const b of Object.values(BARRIOS)) {
      this.poligono(b.zona);
      c.fillStyle = MAPA.barrio;
      c.fill();
    }

    // Calles: reales (si hay) o esquema; encima, la red caminable.
    c.lineCap = "round";
    c.lineJoin = "round";
    if (REAL) {
      for (const calle of REAL.calles) {
        c.strokeStyle = calle.principal ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)";
        c.lineWidth = calle.principal ? 5 : 2.5;
        c.beginPath();
        calle.puntos.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
      }
    }
    for (const [a, b, , principal] of TRAMOS) {
      c.strokeStyle = principal ? MAPA.callePrincipal : MAPA.calle;
      c.lineWidth = principal ? 8 : 5;
      c.beginPath();
      c.moveTo(...NODOS[a]);
      c.lineTo(...NODOS[b]);
      c.stroke();
    }

    // Rótulos de barrio.
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const b of Object.values(BARRIOS)) {
      c.font = `800 ${Math.round(20 / Math.max(0.8, z))}px ${FUENTE.display}`;
      c.fillStyle = "rgba(255,255,255,0.55)";
      this.texto(b.nombre.toUpperCase(), b.rotulo[0], b.rotulo[1], 3);
    }
    c.font = `800 30px ${FUENTE.display}`;
    c.fillStyle = "rgba(255,255,255,0.75)";
    this.texto("GIBRALTAR", 560, 1640, 6);
    for (const p of PROXIMAMENTE.slice(1)) {
      c.font = `600 15px ${FUENTE.texto}`;
      c.fillStyle = "rgba(255,255,255,0.6)";
      this.texto(p.nombre, p.en[0], p.en[1], 1);
    }

    // Camino que queda por andar.
    if (this.camino.length) {
      c.strokeStyle = COLOR.lima;
      c.lineWidth = 4;
      c.setLineDash([2, 12]);
      c.lineDashOffset = -seg * 40;
      c.beginPath();
      c.moveTo(...this.pos);
      for (const p of this.camino) c.lineTo(...p);
      c.stroke();
      c.setLineDash([]);
    }

    // Lugares.
    for (const id of Object.keys(LUGARES) as LugarId[]) this.pin(id, seg);

    // Personaje.
    const [px, py] = this.pos;
    const bote = this.camino.length ? Math.abs(Math.sin(seg * 14)) * 3 : 0;
    c.fillStyle = "rgba(0,0,0,0.25)";
    c.beginPath();
    c.ellipse(px, py + 4, 13, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = COLOR.lima;
    c.strokeStyle = COLOR.negro;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(px, py - 10 - bote, 13, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = this.ropa;
    c.beginPath();
    c.arc(px, py - 10 - bote, 6, 0, Math.PI * 2);
    c.fill();

    c.restore();

    // Luz del día: atardecer y noche en coordenadas de pantalla.
    const h = this.hora;
    const noche = h >= 21 || h < 6 ? 0.42 : h >= 19 ? ((h - 19) / 2) * 0.42 : 0;
    if (noche > 0) {
      c.fillStyle = `rgba(3,10,40,${noche})`;
      c.fillRect(0, 0, this.ancho, this.alto);
    }
  }

  private texto(t: string, x: number, y: number, espaciado: number) {
    const c = this.ctx;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${espaciado}px`;
    c.fillText(t, x, y);
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  }

  private rotuloMar(t: string, x: number, y: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(-Math.PI / 2);
    c.font = `700 22px ${FUENTE.display}`;
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.textAlign = "center";
    this.texto(t, 0, 0, 8);
    c.restore();
  }

  private pin(id: LugarId, seg: number) {
    const c = this.ctx;
    const l = LUGARES[id];
    const [x, y] = NODOS[l.nodo];
    const esObjetivo = this.objetivo === id;
    if (esObjetivo) {
      const p = (seg * 1.2) % 1;
      c.strokeStyle = `rgba(196,233,16,${1 - p})`;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(x, y, 22 + p * 22, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = esObjetivo ? COLOR.lima : COLOR.blanco;
    c.strokeStyle = COLOR.azulOscuro;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, y, 19, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.save();
    c.translate(x - 11, y - 11);
    c.scale(22 / 24, 22 / 24);
    c.strokeStyle = esObjetivo ? COLOR.negro : COLOR.azul;
    c.lineWidth = 2.2;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke(iconoPath(l.icono));
    c.restore();
    if (this.cam.zoom > 0.55 || esObjetivo) {
      c.font = `700 14px ${FUENTE.display}`;
      c.textAlign = "center";
      c.lineWidth = 4;
      c.strokeStyle = MAPA.mar;
      c.strokeText(l.nombre, x, y + 34);
      c.fillStyle = COLOR.blanco;
      c.fillText(l.nombre, x, y + 34);
    }
  }
}
