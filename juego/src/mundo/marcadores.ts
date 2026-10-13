import * as THREE from "three";

/**
 * Marcadores gráficos del mundo. Ninguno es un objeto del escenario:
 *  - **Pines de interfaz** (HTML/SVG) anclados a un punto del mundo: objetivo y selección.
 *    Nítidos a cualquier zoom; si el punto queda fuera de la pantalla, el pin se pega al
 *    borde y una flecha indica hacia dónde está, con la distancia.
 *  - **Calcos en el suelo**: una textura dibujada en canvas sobre un plano a ras de suelo,
 *    sin volumen, sin sombras, sin profundidad y fuera de colisiones y de los toques.
 *    Marcan dónde estás, a dónde vas, el objetivo y el edificio elegido.
 * Todos comparten paleta (lima para objetivo y selección, blanco para ti, azul para destino)
 * y animación (pulso suave y entrada con rebote).
 */

export type TipoCalco = "jugador" | "destino" | "objetivo" | "seleccion";

const LIMA = "#C4E910";
const AZUL = "#1F5EFF";
const BLANCO = "#FFFFFF";

/** Texturas de los calcos, dibujadas una vez. */
const texturas = new Map<string, THREE.CanvasTexture>();
function textura(clave: string, dibujar: (g: CanvasRenderingContext2D, n: number) => void) {
  let t = texturas.get(clave);
  if (t) return t;
  const n = 256;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  dibujar(c.getContext("2d")!, n);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texturas.set(clave, t);
  return t;
}

/** Aro con halo suave y, opcionalmente, punto central. */
const aro = (color: string, grosor: number, centro: boolean) => (g: CanvasRenderingContext2D, n: number) => {
  const m = n / 2;
  const halo = g.createRadialGradient(m, m, m * 0.35, m, m, m);
  halo.addColorStop(0, "rgba(0,0,0,0)");
  halo.addColorStop(0.72, `${color}33`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, n, n);
  // Sombra gráfica bajo el aro (lo despega del suelo sin ser un objeto).
  g.lineWidth = n * grosor;
  g.strokeStyle = "rgba(6,30,92,0.35)";
  g.beginPath();
  g.arc(m, m + n * 0.012, m * 0.74, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = color;
  g.beginPath();
  g.arc(m, m, m * 0.74, 0, Math.PI * 2);
  g.stroke();
  if (centro) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(m, m, m * 0.16, 0, Math.PI * 2);
    g.fill();
  }
};

/** Contorno redondeado con relleno tenue (selección de edificio). */
const marco = (g: CanvasRenderingContext2D, n: number) => {
  const r = n * 0.12;
  const p = n * 0.08;
  const camino = () => {
    g.beginPath();
    g.roundRect(p, p, n - 2 * p, n - 2 * p, r);
  };
  g.fillStyle = `${LIMA}26`;
  camino();
  g.fill();
  g.lineWidth = n * 0.035;
  g.strokeStyle = LIMA;
  g.setLineDash([n * 0.09, n * 0.045]);
  camino();
  g.stroke();
};

class Calco {
  readonly malla: THREE.Mesh;
  private t = 0;
  activo = false;
  constructor(tex: THREE.Texture, private readonly pulso: number, orden: number) {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: false });
    this.malla = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat);
    this.malla.renderOrder = orden;
    this.malla.castShadow = false;
    this.malla.receiveShadow = false;
    this.malla.visible = false;
    // Invisible para los toques: nunca tapa un edificio ni un vecino.
    this.malla.raycast = () => {};
    this.malla.userData.marcador = true;
  }
  poner(x: number, y: number, z: number, ancho: number, fondo = ancho, giro = 0) {
    if (!this.activo) this.t = 0;
    this.activo = true;
    this.malla.position.set(x, y, z);
    this.malla.rotation.y = giro;
    this.malla.userData.base = [ancho, fondo];
    this.malla.visible = true;
  }
  quitar() {
    this.activo = false;
  }
  animar(dt: number) {
    const m = this.malla;
    const mat = m.material as THREE.MeshBasicMaterial;
    if (!this.activo) {
      // Salida: se encoge y se desvanece.
      mat.opacity = Math.max(0, mat.opacity - dt * 5);
      if (mat.opacity <= 0) m.visible = false;
      return;
    }
    this.t += dt;
    const entrada = Math.min(1, this.t * 5);
    // Entrada con un pequeño rebote; luego, pulso suave.
    const rebote = entrada < 1 ? 0.6 + 0.4 * entrada + Math.sin(entrada * Math.PI) * 0.15 : 1;
    const late = 1 + Math.sin(this.t * 3.2) * this.pulso;
    const [a, f] = m.userData.base as [number, number];
    m.scale.set(a * rebote * late, 1, f * rebote * late);
    mat.opacity = entrada * (0.92 - Math.max(0, Math.sin(this.t * 3.2)) * this.pulso * 2);
  }
}

interface Pin {
  el: HTMLElement;
  flecha: HTMLElement;
  distancia: HTMLElement;
  pos: THREE.Vector3 | null;
  t: number;
}

const ICONO_OBJETIVO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/></svg>';
const ICONO_SELECCION = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 21V9l8-6 8 6v12h-6v-7h-4v7z"/></svg>';

export class Marcadores {
  private calcos: Record<TipoCalco, Calco>;
  private pines: Record<"objetivo" | "seleccion", Pin>;
  private tmp = new THREE.Vector3();

  constructor(escena: THREE.Scene, private capa: HTMLElement) {
    this.calcos = {
      jugador: new Calco(textura("jugador", aro(BLANCO, 0.05, false)), 0.0, 58),
      destino: new Calco(textura("destino", aro(AZUL, 0.07, true)), 0.06, 59),
      objetivo: new Calco(textura("objetivo", aro(LIMA, 0.075, false)), 0.07, 60),
      seleccion: new Calco(textura("seleccion", marco), 0.025, 61),
    };
    for (const c of Object.values(this.calcos)) escena.add(c.malla);
    this.pines = { objetivo: this.pin("objetivo", ICONO_OBJETIVO), seleccion: this.pin("seleccion", ICONO_SELECCION) };
  }

  private pin(clase: string, icono: string): Pin {
    const flecha = document.createElement("span");
    flecha.className = "marca-flecha";
    const distancia = document.createElement("span");
    distancia.className = "marca-dist";
    const el = document.createElement("div");
    el.className = `marca-pin m-${clase}`;
    el.innerHTML = `<span class="marca-cabeza">${icono}</span>`;
    el.append(flecha, distancia);
    el.style.display = "none";
    this.capa.append(el);
    return { el, flecha, distancia, pos: null, t: 0 };
  }

  /** Calco en el suelo (y de la marca) o `null` para quitarlo. */
  calco(tipo: TipoCalco, p: { x: number; y: number; z: number; ancho: number; fondo?: number; giro?: number } | null) {
    const c = this.calcos[tipo];
    if (!p) return c.quitar();
    c.poner(p.x, p.y, p.z, p.ancho, p.fondo, p.giro);
  }

  /** Pin de interfaz anclado a un punto del mundo, o `null` para quitarlo. */
  marcar(tipo: "objetivo" | "seleccion", pos: THREE.Vector3 | null) {
    const p = this.pines[tipo];
    if (!pos) {
      p.pos = null;
      p.el.style.display = "none";
      return;
    }
    if (!p.pos) p.t = 0;
    p.pos = pos.clone();
    p.el.style.display = "";
  }

  /**
   * Cada fotograma: anima los calcos y coloca los pines. `libre` es el rectángulo de la
   * pantalla que no tapan el HUD ni el dock; `yo`, la posición del jugador (para la distancia).
   */
  actualizar(dt: number, camara: THREE.Camera, ancho: number, alto: number, libre: { arriba: number; abajo: number }, yo: THREE.Vector3, oculto: boolean) {
    for (const c of Object.values(this.calcos)) c.animar(dt);
    for (const [tipo, p] of Object.entries(this.pines) as ["objetivo" | "seleccion", Pin][]) {
      if (!p.pos || oculto) {
        p.el.style.visibility = "hidden";
        continue;
      }
      p.t += dt;
      const v = this.tmp.copy(p.pos).project(camara);
      // Detrás de la cámara la proyección se invierte: se refleja para apuntar bien.
      const detras = v.z > 1;
      let x = ((detras ? -v.x : v.x) + 1) / 2 * ancho;
      let y = (1 - (detras ? -v.y : v.y)) / 2 * alto;
      const margen = 34;
      const dentro = !detras && x > margen && x < ancho - margen && y > libre.arriba + 40 && y < alto - libre.abajo;
      // La selección solo se muestra sobre el propio edificio; el objetivo se pega al borde.
      if (!dentro && tipo === "seleccion") {
        p.el.style.visibility = "hidden";
        continue;
      }
      p.el.classList.toggle("borde", !dentro);
      if (!dentro) {
        const cx = ancho / 2;
        const cy = (libre.arriba + alto - libre.abajo) / 2;
        let dx = x - cx;
        let dy = y - cy;
        if (detras && Math.hypot(dx, dy) < 1) dy = 1;
        const sx = (ancho / 2 - margen) / Math.abs(dx || 1e-6);
        const sy = ((alto - libre.abajo - libre.arriba) / 2 - 40) / Math.abs(dy || 1e-6);
        const s = Math.min(sx, sy);
        x = cx + dx * s;
        y = cy + dy * s;
        p.flecha.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
        const m = Math.round(p.pos.distanceTo(yo));
        p.distancia.textContent = m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
      }
      const flota = dentro ? Math.sin(p.t * 3) * 4 : 0;
      const entrada = Math.min(1, p.t * 4);
      const escala = 0.6 + 0.4 * entrada + Math.sin(entrada * Math.PI) * 0.15;
      p.el.style.visibility = "visible";
      p.el.style.transform = `translate(${x.toFixed(1)}px, ${(y + flota).toFixed(1)}px) scale(${escala.toFixed(3)})`;
    }
  }
}
