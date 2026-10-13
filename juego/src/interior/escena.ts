import * as THREE from "three";
import { MUEBLES, SUELOS } from "../compartido/hogar/catalogo";
import type { InteriorDoc, MuebleColocado } from "../compartido/hogar/hogar";
import type { Acabados } from "../compartido/hogar/perfil";
import { esExterior, esPaso, habitacionEn, type Habitacion, type Lado, type Plano, type TipoHueco } from "../compartido/hogar/plano";
import { ACABADOS_POR_DEFECTO, altoPuerta, GROSOR, hueco as huecoPuerta, LUZ_GAMA, luminaria, panoAlicatado, rodapieYMoldura, vanoVentana, ventana } from "./acabados";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { persona } from "../mundo/modelos";
import { matI, modeloBasura, modeloMueble, shade } from "./modelos";

/**
 * Escena 3D de un interior (1 unidad = 1 m). Usa su propio lienzo encima del
 * mapa: al entrar se pausa la ciudad y al salir se libera todo (carga y
 * descarga completas). Paredes con puertas y ventanas, suelos con su
 * material, techos (visibles desde dentro), lámparas, muebles, suciedad,
 * grietas, jardín, navegación por casillas y cámara con corte de paredes.
 */

export type InteriorPublico = InteriorDoc & { estado: number };

export interface Toque {
  /** Punto del suelo bajo el puntero (o null si no hay suelo). */
  suelo: THREE.Vector3 | null;
  /** Objeto tocado: mueble, mancha, basura, arriate, pared. */
  objeto: { tipo: "mueble" | "mancha" | "basura" | "jardin" | "pared"; id: string; punto: THREE.Vector3 } | null;
  x: number;
  y: number;
}

/** Herramienta activa (modo construcción o reforma): recibe el puntero. */
export interface Herramienta {
  bajar?(t: Toque): void;
  mover?(t: Toque): void;
  subir?(t: Toque): void;
  /** true: el arrastre con un dedo no mueve la cámara. */
  capturaArrastre?: boolean;
  cursor?: string;
}

const ALTO_PARED = 2.7;
/** ?fps=N limita los fotogramas (pruebas con varios navegadores en un equipo). */
const LIMITE_FPS = Number(new URLSearchParams(location.search).get("fps")) || 0;
const DIRS: Record<Lado, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] };

/* ── Texturas de suelo (lienzo) ─────────────────────────────────────── */

const texturas = new Map<string, THREE.CanvasTexture>();
function texSuelo(material: string, roto = false) {
  const k = `${material}|${roto}`;
  if (texturas.has(k)) return texturas.get(k)!;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const color = SUELOS[material]?.colores[0] ?? "#C9B79A";
  x.fillStyle = color;
  x.fillRect(0, 0, 128, 128);
  const r = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
  switch (material) {
    case "hidraulico": {
      // Baldosa hidráulica: rosetón de cuatro pétalos.
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const ox = i * 64 + 32;
        const oy = j * 64 + 32;
        x.fillStyle = "#2F5F8A";
        for (let a = 0; a < 4; a++) {
          x.beginPath();
          x.ellipse(ox + Math.cos((a * Math.PI) / 2) * 13, oy + Math.sin((a * Math.PI) / 2) * 13, 11, 6, (a * Math.PI) / 2, 0, Math.PI * 2);
          x.fill();
        }
        x.fillStyle = "#C8322B";
        x.beginPath();
        x.arc(ox, oy, 6, 0, Math.PI * 2);
        x.fill();
        x.strokeStyle = "#B9AE99";
        x.strokeRect(i * 64 + 0.5, j * 64 + 0.5, 63, 63);
      }
      break;
    }
    case "barro":
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        x.fillStyle = shade(color, 0.86 + r(i * 7 + j) * 0.24);
        x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
      }
      break;
    case "parquet":
      for (let j = 0; j < 8; j++) for (let i = 0; i < 3; i++) {
        const off = (j % 2) * 21;
        x.fillStyle = shade(color, 0.82 + r(i * 5 + j * 3) * 0.3);
        x.fillRect(((i * 43 + off) % 128) + 1, j * 16 + 1, 41, 14);
      }
      break;
    case "terrazo":
      for (let i = 0; i < 260; i++) {
        x.fillStyle = ["#8C8478", "#F4F1EA", "#B4643F", "#55606E"][i % 4];
        x.fillRect(r(i) * 128, r(i + 400) * 128, 2 + r(i + 900) * 3, 2 + r(i + 1300) * 3);
      }
      x.strokeStyle = "#00000022";
      x.strokeRect(0.5, 0.5, 127, 127);
      break;
    case "marmol":
      x.strokeStyle = "#9AA3AE66";
      for (let i = 0; i < 6; i++) {
        x.beginPath();
        x.moveTo(r(i) * 128, 0);
        x.bezierCurveTo(r(i + 3) * 128, 40, r(i + 6) * 128, 90, r(i + 9) * 128, 128);
        x.stroke();
      }
      x.strokeStyle = "#00000018";
      x.strokeRect(0.5, 0.5, 63, 63);
      x.strokeRect(64.5, 64.5, 63, 63);
      break;
    case "microcemento":
      for (let i = 0; i < 500; i++) {
        x.fillStyle = `rgba(0,0,0,${r(i) * 0.05})`;
        x.fillRect(r(i + 1) * 128, r(i + 2) * 128, 3, 3);
      }
      break;
    case "gres":
      // Baldosa de gres de 33 cm, juntas marcadas y tono algo irregular.
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        x.fillStyle = shade(color, 0.95 + r(i * 3 + j) * 0.08);
        x.fillRect(i * 42.7 + 1, j * 42.7 + 1, 40.7, 40.7);
      }
      break;
    case "porcelanico":
      // Gran formato: una pieza por metro, junta fina y veteado muy suave.
      x.strokeStyle = "#00000010";
      for (let i = 0; i < 4; i++) {
        x.beginPath();
        x.moveTo(r(i + 20) * 128, 0);
        x.bezierCurveTo(r(i + 23) * 128, 50, r(i + 26) * 128, 80, r(i + 29) * 128, 128);
        x.stroke();
      }
      x.strokeStyle = "#0000001E";
      x.strokeRect(0.5, 0.5, 127, 127);
      break;
    case "espiga": {
      // Parquet en espiga: tablillas a 45° alternas.
      x.save();
      x.translate(64, 64);
      x.rotate(Math.PI / 4);
      for (let i = -6; i < 6; i++) for (let j = -6; j < 6; j++) {
        x.fillStyle = shade(color, 0.82 + r(i * 13 + j * 7 + 99) * 0.3);
        if ((i + j) % 2 === 0) x.fillRect(i * 16 + 1, j * 16 + 1, 30, 14);
        else x.fillRect(i * 16 + 1, j * 16 + 1, 14, 30);
      }
      x.restore();
      break;
    }
    case "cesped":
      for (let i = 0; i < 700; i++) {
        x.fillStyle = shade(color, 0.8 + r(i) * 0.4);
        x.fillRect(r(i + 3) * 128, r(i + 7) * 128, 1.5, 4);
      }
      break;
  }
  if (roto) {
    // Baldosas levantadas, rotas y con manchas.
    for (let i = 0; i < 9; i++) {
      const bx = Math.floor(r(i + 50) * 4) * 32;
      const by = Math.floor(r(i + 80) * 4) * 32;
      x.fillStyle = i % 3 ? "#6B5D4C" : "#4A4036";
      x.fillRect(bx + 2, by + 2, 28, 28);
      x.strokeStyle = "#2A241E";
      x.beginPath();
      x.moveTo(bx + 4, by + 6);
      x.lineTo(bx + 16, by + 18);
      x.lineTo(bx + 28, by + 12);
      x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texturas.set(k, t);
  return t;
}

/* ── Aristas con hueco (puertas y ventanas) ─────────────────────────── */

/** Clave de la arista entre una celda y su vecina por un lado. */
function arista(x: number, z: number, lado: Lado) {
  if (lado === "n") return `h${x},${z}`;
  if (lado === "s") return `h${x},${z + 1}`;
  if (lado === "o") return `v${x},${z}`;
  return `v${x + 1},${z}`;
}

export class EscenaInterior {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  private capa: HTMLElement;
  plano!: Plano;
  doc!: InteriorPublico;
  private casco = new THREE.Group();
  private paredes: { mesh: THREE.Object3D; normal: THREE.Vector2; fachada: boolean }[] = [];
  private gMuebles = new THREE.Group();
  private gSucio = new THREE.Group();
  private gJardin = new THREE.Group();
  private gExtra = new THREE.Group();
  readonly muebles = new Map<string, { g: THREE.Group; clave: string; m: MuebleColocado; colgado?: { piezas: { o: THREE.Object3D; y: number }[]; normal: THREE.Vector2; fachada: boolean } }>();
  private manchas = new Map<string, THREE.Mesh>();
  private basuras = new Map<string, THREE.Group>();
  private luces: { luz: THREE.PointLight; bombilla: THREE.Object3D; mat: THREE.MeshStandardMaterial; intensidad: number }[] = [];
  /** Vivienda en planta baja (rejas en las ventanas) o en altura (barandillas en las balconeras). */
  plantaBaja = true;
  private claveCasco = "";
  private sol = new THREE.DirectionalLight("#FFF3DF", 2.2);
  private hemi = new THREE.HemisphereLight("#E9F1FF", "#B59E80", 0.9);
  jugador: THREE.Group;
  pos = new THREE.Vector2(1, 1);
  rot = 0;
  private camino: THREE.Vector2[] = [];
  private alLlegar: (() => void) | null = null;
  andando = false;
  private remotos = new Map<string, { g: THREE.Group; meta: THREE.Vector2; rot: number; etiqueta: HTMLElement; anim: string }>();
  private objetivo = new THREE.Vector3();
  private libre = false;
  yaw = Math.PI / 4;
  private yawMeta = Math.PI / 4;
  dist = 14;
  /** Altura relativa de los tabiques interiores (0,3 = recorte; 1 = enteros). */
  tabiques = 0.32;
  private reloj = new THREE.Clock();
  private vivo = true;
  private ray = new THREE.Raycaster();
  private sueloPlano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private punteros = new Map<number, { x: number; y: number }>();
  private toque: { x: number; y: number; movido: boolean } | null = null;
  private pellizco: number | null = null;
  private fantasmaG: THREE.Group | null = null;
  private claveFantasma = "";
  herramienta: Herramienta | null = null;
  hora = 12;
  /** Tocar el suelo (andar) o un objeto con la herramienta normal. */
  onTocar: (t: Toque) => void = () => {};
  onFotograma: (dt: number) => void = () => {};
  private etiquetas: { el: HTMLElement; pos: () => THREE.Vector3 }[] = [];
  private ocupadas = new Set<string>();
  private ultimoDibujo = 0;

  constructor(contenedor: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "lienzo-interior";
    this.canvas.setAttribute("aria-label", "Interior de la vivienda en 3D");
    this.capa = document.createElement("div");
    this.capa.className = "capa3d capa-interior";
    contenedor.append(this.canvas, this.capa);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.escena.background = new THREE.Color("#1A2A4A");
    // Entorno de interior para los reflejos (espejos, grifería, inox, cristal).
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.escena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.escena.environmentIntensity = 0.35;
    pm.dispose();
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(1024, 1024);
    this.sol.shadow.bias = -0.0005;
    this.sol.shadow.normalBias = 0.02;
    this.escena.add(this.sol, this.sol.target, this.hemi, this.casco, this.gMuebles, this.gSucio, this.gJardin, this.gExtra);
    this.jugador = persona("#E8B796", "#C4E910", "#2B1B12", 0.19);
    this.escena.add(this.jugador);
    new ResizeObserver(() => this.ajustar()).observe(this.canvas);
    this.ajustar();
    this.escuchar();
    this.renderer.setAnimationLoop(() => this.fotograma());
  }

  /** Libera la GPU y el DOM (al salir de la vivienda). */
  destruir() {
    this.vivo = false;
    this.renderer.setAnimationLoop(null);
    this.escena.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
    this.capa.remove();
  }

  aspecto(ropa: string, piel: string) {
    this.escena.remove(this.jugador);
    const p = this.jugador.position.clone();
    this.jugador = persona(piel, ropa, "#2B1B12", 0.19);
    this.jugador.position.copy(p);
    this.escena.add(this.jugador);
  }

  private ajustar() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camara.aspect = r.width / Math.max(1, r.height);
    this.camara.fov = this.camara.aspect > 1 ? 40 : 52;
    // Con un panel abajo, la casa se centra en la parte que queda libre.
    if (this.tapadoAbajo > 0) this.camara.setViewOffset(r.width, r.height, 0, (r.height * this.tapadoAbajo) / 2, r.width, r.height);
    else this.camara.clearViewOffset();
    this.camara.updateProjectionMatrix();
  }

  /** Encuadra la vivienda entera (modo construcción). */
  verCasaEntera() {
    if (!this.plano) return;
    this.libre = true;
    this.objetivo.set(this.plano.ancho / 2, 0, this.plano.fondo / 2);
    this.dist = Math.max(13, Math.max(this.plano.ancho, this.plano.fondo) * 1.7);
  }

  /** Cámara sobre una habitación (vistas de detalle y comparaciones). */
  enfocarHabitacion(h: Habitacion, cerca = 1.45) {
    this.libre = true;
    this.objetivo.set((h.x0 + h.x1) / 2, 0, (h.z0 + h.z1) / 2);
    this.dist = Math.max(5.5, Math.max(h.x1 - h.x0, h.z1 - h.z0) * cerca);
  }
  /** Inclinación de la cámara (rad sobre el horizonte). */
  inclinacion = 0.95;
  orientar(yaw: number) {
    this.yaw = this.yawMeta = yaw;
  }

  /** Fracción de la altura del lienzo tapada por un panel inferior. */
  private tapadoAbajo = 0;
  tapar(fraccion: number) {
    this.tapadoAbajo = Math.max(0, Math.min(0.7, fraccion));
    this.ajustar();
  }

  /* ── Construcción de la vivienda ─────────────────────────────────── */

  cargar(doc: InteriorPublico) {
    const primera = !this.doc;
    this.doc = doc;
    this.plano = doc.plano;
    const clave = JSON.stringify([doc.pintura, doc.pinturaVieja, doc.suelo, doc.sueloRoto, doc.grietas, doc.electricidad.resuelto]);
    if (clave !== this.claveCasco) {
      this.claveCasco = clave;
      this.construirCasco();
    }
    this.sincronizarMuebles();
    this.sincronizarSuciedad();
    this.sincronizarJardin();
    this.calcularOcupadas();
    if (primera) {
      const e = this.plano.entrada;
      this.pos.set(e.x + 0.5, e.z + 0.7);
      this.objetivo.set(this.plano.ancho / 2, 0, this.plano.fondo / 2);
      this.dist = Math.max(13, Math.max(this.plano.ancho, this.plano.fondo) * 1.7);
      const s = Math.max(this.plano.ancho, this.plano.fondo);
      const sc = this.sol.shadow.camera;
      sc.left = sc.bottom = -s;
      sc.right = sc.top = s;
      sc.near = 1;
      sc.far = 60;
      sc.updateProjectionMatrix();
    }
  }

  /** Acabados de la vivienda (los interiores antiguos usan los de por defecto). */
  get acabados(): Acabados {
    return this.doc?.perfil?.acabados ?? ACABADOS_POR_DEFECTO;
  }
  get altoTecho() {
    return this.plano?.techo ?? ALTO_PARED;
  }

  private construirCasco() {
    for (const o of [...this.casco.children]) {
      this.casco.remove(o);
      o.traverse((m) => (m as THREE.Mesh).isMesh && (m as THREE.Mesh).geometry.dispose());
    }
    this.paredes = [];
    this.luces = [];
    const p = this.plano;
    const doc = this.doc;
    const ac = this.acabados;
    const techo = this.altoTecho;
    // Huecos por arista (se ven desde las dos habitaciones); `desde` = celda en la que se apuntó.
    const huecos = new Map<string, { tipo: TipoHueco; desde: string }>();
    for (const hu of p.huecos) huecos.set(arista(hu.x, hu.z, hu.lado), { tipo: hu.tipo, desde: `${hu.x},${hu.z}` });

    // Solar de alrededor y zócalo exterior.
    const base = new THREE.Mesh(new THREE.BoxGeometry(p.ancho + 1.2, 0.3, p.fondo + 1.2), matI("#D9CFBD", 0.95));
    base.position.set(p.ancho / 2, -0.16, p.fondo / 2);
    base.receiveShadow = true;
    this.casco.add(base);
    const acera = new THREE.Mesh(new THREE.BoxGeometry(p.ancho + 6, 0.2, 3), matI("#CFC8BA", 0.95));
    acera.position.set(p.ancho / 2, -0.2, -2.1);
    acera.receiveShadow = true;
    this.casco.add(acera);
    const luzGama = LUZ_GAMA[ac.luz];

    for (const hab of p.habitaciones) {
      const exterior = esExterior(hab.tipo);
      const w = hab.x1 - hab.x0;
      const d = hab.z1 - hab.z0;
      // Suelo con su material.
      const nombreSuelo = doc.suelo[hab.id] ?? "terrazo";
      const tex = texSuelo(nombreSuelo, !!doc.sueloRoto[hab.id]).clone();
      tex.needsUpdate = true;
      tex.repeat.set(w, d);
      const brillo = nombreSuelo === "marmol" || nombreSuelo === "porcelanico" ? 0.22 : nombreSuelo === "parquet" || nombreSuelo === "espiga" ? 0.55 : nombreSuelo === "microcemento" ? 0.45 : 0.8;
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: brillo }));
      suelo.rotation.x = -Math.PI / 2;
      suelo.position.set(hab.x0 + w / 2, 0, hab.z0 + d / 2);
      suelo.receiveShadow = true;
      suelo.userData = { tipo: "suelo", hab: hab.id };
      this.casco.add(suelo);
      if (!exterior) {
        // Techo: solo visible desde dentro (la cámara mira desde arriba).
        const techoM = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matI("#FBFAF6", 1, { side: THREE.BackSide }));
        techoM.rotation.x = -Math.PI / 2;
        techoM.position.set(hab.x0 + w / 2, techo, hab.z0 + d / 2);
        this.casco.add(techoM);
        // Luminarias según la gama; los salones y estancias grandes llevan más de un punto de luz.
        const grande = w * d >= 18 && hab.tipo !== "pasillo";
        const puntos: [number, number][] = hab.tipo === "pasillo" && Math.max(w, d) > 4
          ? Array.from({ length: Math.ceil(Math.max(w, d) / 4) }, (_, k) => (w >= d ? [hab.x0 + ((k + 0.5) * w) / Math.ceil(w / 4), hab.z0 + d / 2] : [hab.x0 + w / 2, hab.z0 + ((k + 0.5) * d) / Math.ceil(d / 4)]) as [number, number])
          : grande && ac.luz !== "bombilla" ? [[hab.x0 + w * 0.3, hab.z0 + d / 2], [hab.x0 + w * 0.7, hab.z0 + d / 2]] : [[hab.x0 + w / 2, hab.z0 + d / 2]];
        puntos.forEach(([lx, lz], k) => {
          const tipoLuz = ac.luz === "diseno" && (hab.tipo === "bano" || hab.tipo === "pasillo" || hab.tipo === "despensa" || hab.tipo === "vestidor") ? "plafon" : ac.luz;
          const { g: lum, luzMat } = luminaria(tipoLuz, techo, k === 0 ? Math.min(w, d) : 0.0001, this.doc.perfil?.estilo ?? "basico");
          lum.position.set(lx, 0, lz);
          this.casco.add(lum);
          const luz = new THREE.PointLight(luzGama.color, 0, Math.max(w, d) * 1.6 / puntos.length + 2, 1.6);
          luz.position.set(lx, techo - (tipoLuz === "diseno" ? 1.1 : 0.4), lz);
          this.casco.add(luz);
          this.luces.push({ luz, bombilla: lum, mat: luzMat, intensidad: luzGama.intensidad / Math.sqrt(puntos.length) });
        });
      }
      // Paredes: cada habitación pinta la cara que da hacia dentro.
      const color = exterior ? "#F4EFE4" : doc.pintura[hab.id] ?? "#EFE6D2";
      const vieja = !exterior && doc.pinturaVieja[hab.id];
      const matPared = vieja ? this.matViejo(color) : matI(color, 0.9);
      const alto = exterior ? 1.3 : techo;
      for (const lado of ["n", "s", "e", "o"] as Lado[]) {
        const horizontal = lado === "n" || lado === "s";
        const largo = horizontal ? w : d;
        for (let k = 0; k < largo; k++) {
          const cx = horizontal ? hab.x0 + k : lado === "o" ? hab.x0 : hab.x1 - 1;
          const cz = horizontal ? (lado === "n" ? hab.z0 : hab.z1 - 1) : hab.z0 + k;
          // ¿Hay otra habitación al otro lado? Entonces la pared es interior.
          const [dx, dz] = DIRS[lado];
          const vecina = habitacionEn(p, cx + dx, cz + dz);
          const hu = huecos.get(arista(cx, cz, lado));
          // Muro entre interior y patio: si la vecina es el patio, el patio no pinta su cara (la pinta la casa).
          if (exterior && vecina && !esExterior(vecina.tipo)) continue;
          // Puerta doble: cada celda es una mitad (izquierda o derecha según la vecina en el muro).
          let tipoHueco: string | undefined = hu?.tipo;
          if (tipoHueco === "doble") {
            const [ax, az] = horizontal ? [1, 0] : [0, 1];
            const siguiente = huecos.get(arista(cx + ax, cz + az, lado))?.tipo === "doble";
            // El eje x local del tramo recorre la pared en sentido distinto según el lado.
            const invertido = lado === "s" || lado === "o";
            tipoHueco = siguiente !== invertido ? "dobleI" : "dobleD";
          }
          this.tramoPared(hab, lado, cx, cz, alto, matPared, tipoHueco, !vecina, hu?.desde === `${cx},${cz}`);
        }
      }
      // Grietas de esta habitación.
      for (const g of doc.grietas.filter((x) => x.hab === hab.id)) this.dibujarGrieta(hab, g);
    }
    this.aplicarHora();
  }

  private matViejo(color: string) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d")!;
    x.fillStyle = color;
    x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 26; i++) {
      x.fillStyle = i % 3 ? "rgba(140,115,80,0.10)" : "rgba(90,80,70,0.16)";
      x.beginPath();
      x.ellipse((i * 37) % 64, (i * 23) % 64, 3 + (i % 5) * 2, 2 + (i % 3) * 2, i, 0, Math.PI * 2);
      x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 1 });
  }

  /**
   * Un metro de pared, con su hueco (puerta, doble, arco, ventana, abierto) o macizo, y sus
   * acabados: rodapié, moldura, alicatado de cocina y baño. La cara está en el borde de la
   * celda, hacia dentro. `propio`: el hueco se apuntó desde esta habitación (lleva la hoja).
   */
  private tramoPared(hab: Habitacion, lado: Lado, cx: number, cz: number, alto: number, mat: THREE.Material, hueco: string | undefined, fachada: boolean, propio: boolean) {
    if (hueco === "abierto") return;
    const g = new THREE.Group();
    const [dx, dz] = DIRS[lado];
    const ac = this.acabados;
    // Centro del borde de la celda y orientación (el eje local x recorre la pared).
    const ex = cx + 0.5 + dx * 0.5;
    const ez = cz + 0.5 + dz * 0.5;
    g.position.set(ex - dx * (GROSOR / 2), 0, ez - dz * (GROSOR / 2));
    const interior = alto >= 2;
    const humeda = hab.tipo === "cocina" || hab.tipo === "bano";
    // Alicatado de cocina y baño; zócalo de azulejo sevillano en los salones tradicionales.
    const alic = humeda ? Math.min(ac.alicatado.alto, alto) : ac.alicatado.pieza === "sevillano" && (hab.tipo === "salon" || hab.tipo === "recibidor" || hab.tipo === "pasillo") ? 1.1 : 0;
    const marcar = () => g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.userData.esPared) o.userData = { tipo: "pared", hab: hab.id, lado };
    });
    if (hueco === "puerta" || hueco === "entrada" || hueco === "dobleI" || hueco === "dobleD" || hueco === "arco") {
      huecoPuerta(g, hueco, alto, ac, propio || hueco === "entrada", mat);
      if (hueco === "entrada" && propio) {
        const felpudo = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.45), matI("#B08A4E", 1));
        felpudo.position.set(0, 0.01, 0.4);
        g.add(felpudo);
      }
      if (alic > 0) for (const [x0, x1] of [[-0.5, -0.4], [0.4, 0.5]]) panoAlicatado(g, x0, x1, 0, Math.min(alic, altoPuerta(ac)), ac);
    } else if (hueco === "ventana" && interior) {
      const v = vanoVentana(ac, hab.tipo);
      ventana(g, alto, v, ac, hab.tipo, fachada, mat, this.plantaBaja);
      if (alic > 0) {
        const l = (1 - v.ancho) / 2;
        panoAlicatado(g, -0.5, 0.5, 0, Math.min(alic, v.y0), ac);
        if (alic > v.y0) for (const [x0, x1] of [[-0.5, -0.5 + l], [0.5 - l, 0.5]]) panoAlicatado(g, x0, x1, v.y0, Math.min(alic, v.y1), ac);
        if (alic > v.y1) panoAlicatado(g, -0.5, 0.5, v.y1, alic, ac);
      } else if (v.y0 > 0.2) rodapieYMoldura(g, -0.5, 0.5, ac, alto, false);
      else rodapieYMoldura(g, -0.5, 0.5, { ...ac, rodapie: 0 }, alto, false);
    } else {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1, alto, GROSOR), mat);
      b.position.set(0, alto / 2, 0);
      b.castShadow = fachada;
      b.receiveShadow = true;
      b.userData.esPared = true;
      g.add(b);
      if (interior) {
        if (alic > 0) panoAlicatado(g, -0.5, 0.5, 0, alic, ac);
        rodapieYMoldura(g, -0.5, 0.5, ac, alto, alic > 0.3);
      }
    }
    marcar();
    // El eje z local apunta hacia dentro de la habitación (x local recorre la pared).
    g.rotation.y = { n: 0, s: Math.PI, o: Math.PI / 2, e: -Math.PI / 2 }[lado];
    this.casco.add(g);
    this.paredes.push({ mesh: g, normal: new THREE.Vector2(-dx, -dz), fachada });
  }

  private dibujarGrieta(hab: Habitacion, gr: InteriorDoc["grietas"][number]) {
    const g = new THREE.Group();
    const [dx, dz] = DIRS[gr.lado];
    const horizontal = gr.lado === "n" || gr.lado === "s";
    const base = horizontal ? hab.x0 : hab.z0;
    const borde = gr.lado === "n" ? hab.z0 : gr.lado === "s" ? hab.z1 : gr.lado === "o" ? hab.x0 : hab.x1;
    const pts = gr.puntos.map(([u, v]) => {
      const a = base + u;
      return horizontal ? new THREE.Vector3(a, v, borde - dz * 0.005 - dz * 0.01) : new THREE.Vector3(borde - dx * 0.005 - dx * 0.01, v, a);
    });
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const l = a.distanceTo(b);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.025, l, 0.01), matI("#3A2E24", 1));
      s.position.copy(a).add(b).multiplyScalar(0.5);
      s.lookAt(b);
      s.rotateX(Math.PI / 2);
      g.add(s);
    }
    g.userData = { tipo: "grieta", id: gr.id };
    this.casco.add(g);
  }

  private sincronizarMuebles() {
    const vistos = new Set<string>();
    for (const m of this.doc.muebles) {
      vistos.add(m.uid);
      const clave = `${m.tipo}|${m.x}|${m.z}|${m.rot}|${m.color}|${m.roto ? 1 : 0}`;
      const ya = this.muebles.get(m.uid);
      if (ya && ya.clave === clave) continue;
      if (ya) this.gMuebles.remove(ya.g);
      const g = modeloMueble(m.tipo, m.color, m.roto);
      this.colocarModelo(g, m);
      g.userData = { tipo: "mueble", id: m.uid };
      this.gMuebles.add(g);
      this.muebles.set(m.uid, { g, clave, m, colgado: this.piezasColgadas(g, m) });
    }
    for (const [uid, v] of this.muebles) {
      if (vistos.has(uid)) continue;
      this.gMuebles.remove(v.g);
      this.muebles.delete(uid);
    }
  }

  /**
   * Lo que cuelga de la pared trasera de un mueble (muebles altos, campanas, espejos, cuadros):
   * se oculta cuando esa pared está recortada para no verlo flotando.
   */
  private piezasColgadas(g: THREE.Group, m: MuebleColocado) {
    const def = MUEBLES[m.tipo];
    const piezas: { o: THREE.Object3D; y: number }[] = [];
    g.updateMatrixWorld(true);
    const caja = new THREE.Box3();
    g.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      caja.setFromObject(o);
      if (def.capa === "pared" || caja.min.y - g.position.y >= 1.1) piezas.push({ o, y: caja.min.y });
    });
    if (!piezas.length) return undefined;
    const lado = (["n", "e", "s", "o"] as Lado[])[m.rot];
    const [dx, dz] = DIRS[lado];
    const [w, d] = m.rot % 2 ? [def.d, def.w] : [def.w, def.d];
    const cx = Math.floor((m.x + w / 2) / 2);
    const cz = Math.floor((m.z + d / 2) / 2);
    const borde = lado === "n" ? [cx, Math.floor(m.z / 2)] : lado === "s" ? [cx, Math.floor((m.z + d - 1) / 2)] : lado === "o" ? [Math.floor(m.x / 2), cz] : [Math.floor((m.x + w - 1) / 2), cz];
    const fachada = !habitacionEn(this.plano, borde[0] + dx, borde[1] + dz);
    return { piezas, normal: new THREE.Vector2(-dx, -dz), fachada };
  }

  /** Pone un modelo en su huella (medias celdas) y altura (encima de mesas). */
  colocarModelo(g: THREE.Object3D, m: { tipo: string; x: number; z: number; rot: number }) {
    const def = MUEBLES[m.tipo];
    const [w, d] = m.rot % 2 ? [def.d, def.w] : [def.w, def.d];
    g.position.set((m.x + w / 2) * 0.5, 0, (m.z + d / 2) * 0.5);
    g.rotation.y = -m.rot * (Math.PI / 2);
    if (def.capa === "encima") {
      const base = this.doc.muebles.find((o) => MUEBLES[o.tipo].superficie && o.x <= m.x && o.z <= m.z && (() => {
        const od = MUEBLES[o.tipo];
        const [ow, odd] = o.rot % 2 ? [od.d, od.w] : [od.w, od.d];
        return o.x + ow >= m.x + w && o.z + odd >= m.z + d;
      })());
      g.position.y = base ? this.altoSuperficie(base.tipo) : 0.75;
    }
  }

  private altoSuperficie(tipo: string) {
    return ({ mesitaNoche: 0.5, comoda: 0.8, mesaCentro: 0.4, muebleTele: 0.5, mesaComedor: 0.78, cocina: 0.9, escritorio: 0.77, mesaPatio: 0.74, moduloBajo: 0.9, isla: 0.94, aparador: 0.8, consola: 0.8, mesaCocina: 0.76, mesaComedorGrande: 0.77 } as Record<string, number>)[tipo] ?? 0.75;
  }

  private sincronizarSuciedad() {
    const ids = new Set(this.doc.manchas.map((m) => m.id));
    for (const [id, m] of this.manchas) if (!ids.has(id)) {
      this.gSucio.remove(m);
      this.manchas.delete(id);
    }
    for (const m of this.doc.manchas) {
      if (this.manchas.has(m.id)) continue;
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(m.r, 18), new THREE.MeshStandardMaterial({ color: "#5B4A36", transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(m.x, 0.006, m.z);
      mesh.scale.set(1, 0.7 + ((m.x * 13) % 1) * 0.5, 1);
      mesh.userData = { tipo: "mancha", id: m.id, sucio: 1 };
      this.gSucio.add(mesh);
      this.manchas.set(m.id, mesh);
    }
    const bids = new Set(this.doc.basura.map((b) => b.id));
    for (const [id, b] of this.basuras) if (!bids.has(id)) {
      this.gSucio.remove(b);
      this.basuras.delete(id);
    }
    for (const b of this.doc.basura) {
      if (this.basuras.has(b.id)) continue;
      const g = modeloBasura(b.tipo);
      g.position.set(b.x, 0, b.z);
      g.rotation.y = b.x * 3.1;
      g.userData = { tipo: "basura", id: b.id };
      this.gSucio.add(g);
      this.basuras.set(b.id, g);
    }
  }

  private sincronizarJardin() {
    for (const o of [...this.gJardin.children]) this.gJardin.remove(o);
    const ahora = Date.now();
    for (const c of this.doc.jardin) {
      const g = new THREE.Group();
      g.position.set(c.x + 0.5, 0, c.z + 0.5);
      const tierra = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.18, 0.92), matI(c.cavado ? "#5A3A22" : ahora - c.regado < 6 * 3600e3 && c.planta ? "#4A3020" : "#7A5236", 1));
      tierra.position.y = 0.09;
      tierra.receiveShadow = true;
      g.add(tierra);
      const borde = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 1), matI("#B4643F"));
      borde.position.y = 0.08;
      borde.scale.set(1, 1, 1);
      g.add(borde);
      tierra.position.y = 0.1;
      if (c.mala) {
        for (let i = 0; i < 5; i++) {
          const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), matI("#6E8B2E"));
          h.position.set(((i * 37) % 7) / 10 - 0.3, 0.32, ((i * 23) % 7) / 10 - 0.3);
          h.rotation.z = (i - 2) * 0.2;
          g.add(h);
        }
      }
      if (c.cavado) {
        for (let i = 0; i < 3; i++) {
          const s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.08), matI("#3E2716", 1));
          s.position.set(0, 0.2, -0.25 + i * 0.25);
          g.add(s);
        }
      }
      if (c.planta) {
        const crec = Math.min(1, (ahora - c.plantado) / 3600e3 / 4 + 0.25);
        const color = ({ geranio: "#E94B6A", jazmin: "#FFFFFF", buganvilla: "#C2338A", limonero: "#F2D23C", romero: "#8E7CC3" } as Record<string, string>)[c.planta] ?? "#E94B6A";
        const mata = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), matI(c.planta === "limonero" ? "#2F7A3A" : "#3E8F3A"));
        mata.position.y = 0.2 + 0.25 * crec;
        mata.scale.setScalar(0.5 + crec);
        g.add(mata);
        if (crec > 0.5) for (let i = 0; i < 5; i++) {
          const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), matI(color));
          const a = (i / 5) * Math.PI * 2;
          f.position.set(Math.cos(a) * 0.2 * crec, 0.3 + 0.35 * crec, Math.sin(a) * 0.2 * crec);
          g.add(f);
        }
      }
      g.traverse((m) => {
        if ((m as THREE.Mesh).isMesh) {
          m.castShadow = true;
          m.userData = { tipo: "jardin", id: `${c.x},${c.z}` };
        }
      });
      this.gJardin.add(g);
    }
  }

  /* ── Luz del día y de la noche ───────────────────────────────────── */

  aplicarHora(hora = this.hora) {
    this.hora = hora;
    const dia = Math.max(0, Math.sin(((hora - 6) / 14) * Math.PI));
    this.sol.intensity = 0.3 + dia * 2.1;
    this.sol.color.set(dia > 0.3 ? "#FFF3DF" : "#FFC98A");
    this.hemi.intensity = 0.35 + dia * 0.65;
    this.hemi.color.set(dia > 0.2 ? "#E9F1FF" : "#6E7FAF");
    this.escena.background = new THREE.Color(dia > 0.2 ? "#2B4C80" : "#0E1730");
    const encendidas = this.doc?.electricidad.resuelto && dia < 0.55;
    for (const { luz, mat, intensidad } of this.luces) {
      luz.intensity = encendidas ? intensidad : 0;
      mat.emissiveIntensity = encendidas ? 2 : 0;
    }
    for (const { g } of this.muebles.values()) g.traverse((m) => {
      if (m.name === "pantallaLuz") ((m as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = encendidas ? 0.8 : 0;
    });
  }

  /* ── Navegación por medias celdas (A*) ───────────────────────────── */

  private calcularOcupadas() {
    this.ocupadas.clear();
    for (const m of this.doc.muebles) {
      const def = MUEBLES[m.tipo];
      if (def.capa !== "suelo") continue;
      const [w, d] = m.rot % 2 ? [def.d, def.w] : [def.w, def.d];
      for (let x = m.x; x < m.x + w; x++) for (let z = m.z; z < m.z + d; z++) this.ocupadas.add(`${x},${z}`);
    }
    for (const c of this.doc.jardin) for (const dx of [0, 1]) for (const dz of [0, 1]) this.ocupadas.add(`${c.x * 2 + dx},${c.z * 2 + dz}`);
  }

  private pisable(x: number, z: number) {
    return !!habitacionEn(this.plano, Math.floor(x / 2), Math.floor(z / 2)) && !this.ocupadas.has(`${x},${z}`);
  }

  /** ¿Se puede pasar de una media celda a otra vecina? (puertas entre habitaciones). */
  private paso(ax: number, az: number, bx: number, bz: number) {
    const ca = [Math.floor(ax / 2), Math.floor(az / 2)];
    const cb = [Math.floor(bx / 2), Math.floor(bz / 2)];
    const ha = habitacionEn(this.plano, ca[0], ca[1]);
    const hb = habitacionEn(this.plano, cb[0], cb[1]);
    if (!ha || !hb) return false;
    if (ha === hb) return true;
    const lado: Lado = cb[0] > ca[0] ? "e" : cb[0] < ca[0] ? "o" : cb[1] > ca[1] ? "s" : "n";
    const k = arista(ca[0], ca[1], lado);
    return this.plano.huecos.some((h) => esPaso(h.tipo) && arista(h.x, h.z, h.lado) === k);
  }

  ruta(destino: THREE.Vector2) {
    const a = [Math.floor(this.pos.x * 2), Math.floor(this.pos.y * 2)];
    let b = [Math.floor(destino.x * 2), Math.floor(destino.y * 2)];
    if (!this.pisable(b[0], b[1])) {
      // Al lado del mueble tocado: la media celda libre más cercana.
      let mejor: number[] | null = null;
      let md = Infinity;
      for (let r = 1; r <= 4 && !mejor; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        const c = [b[0] + dx, b[1] + dz];
        if (!this.pisable(c[0], c[1])) continue;
        const dd = dx * dx + dz * dz;
        if (dd < md) (md = dd), (mejor = c);
      }
      if (!mejor) return null;
      b = mejor;
    }
    const k = (x: number, z: number) => `${x},${z}`;
    const abiertos = new Map<string, { x: number; z: number; g: number; f: number; de: string | null }>();
    const cerrados = new Map<string, string | null>();
    abiertos.set(k(a[0], a[1]), { x: a[0], z: a[1], g: 0, f: 0, de: null });
    let pasos = 0;
    while (abiertos.size && pasos++ < 6000) {
      let actual: { x: number; z: number; g: number; f: number; de: string | null } | null = null;
      let ka = "";
      for (const [kk, n] of abiertos) if (!actual || n.f < actual.f) (actual = n), (ka = kk);
      abiertos.delete(ka);
      cerrados.set(ka, actual!.de);
      if (actual!.x === b[0] && actual!.z === b[1]) {
        const camino: THREE.Vector2[] = [];
        let c: string | null = ka;
        while (c) {
          const [x, z] = c.split(",").map(Number);
          camino.unshift(new THREE.Vector2(x / 2 + 0.25, z / 2 + 0.25));
          c = cerrados.get(c) ?? null;
        }
        return this.suavizar(camino);
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = actual!.x + dx;
        const nz = actual!.z + dz;
        const kn = k(nx, nz);
        if (cerrados.has(kn) || !this.pisable(nx, nz)) continue;
        if (dx && dz && (!this.pisable(actual!.x + dx, actual!.z) || !this.pisable(actual!.x, actual!.z + dz) || !this.paso(actual!.x, actual!.z, actual!.x + dx, actual!.z) || !this.paso(actual!.x, actual!.z, actual!.x, actual!.z + dz) || !this.paso(actual!.x + dx, actual!.z, nx, nz))) continue;
        if (!this.paso(actual!.x, actual!.z, nx, nz)) continue;
        const g = actual!.g + (dx && dz ? 1.414 : 1);
        const ya = abiertos.get(kn);
        if (ya && ya.g <= g) continue;
        abiertos.set(kn, { x: nx, z: nz, g, f: g + Math.hypot(b[0] - nx, b[1] - nz), de: ka });
      }
    }
    return null;
  }

  /** Quita puntos intermedios en línea recta. */
  private suavizar(c: THREE.Vector2[]) {
    if (c.length < 3) return c;
    const out = [c[0]];
    for (let i = 1; i < c.length - 1; i++) {
      const a = out[out.length - 1];
      const b = c[i + 1];
      const p = c[i];
      const cruz = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
      if (Math.abs(cruz) > 1e-6) out.push(p);
    }
    out.push(c[c.length - 1]);
    return out;
  }

  andarA(destino: THREE.Vector2, fin?: () => void) {
    const r = this.ruta(destino);
    if (!r) return false;
    this.camino = r.slice(1);
    this.alLlegar = fin ?? null;
    this.andando = true;
    this.libre = false;
    return true;
  }

  /* ── Jugadores remotos ───────────────────────────────────────────── */

  remotosEn(lista: { id: string; nombre: string; ropa: string; piel: string; x: number; y: number; r?: number; anim?: string }[]) {
    const ids = new Set(lista.map((j) => j.id));
    for (const [id, r] of this.remotos) if (!ids.has(id)) {
      this.escena.remove(r.g);
      r.etiqueta.remove();
      this.etiquetas = this.etiquetas.filter((e) => e.el !== r.etiqueta);
      this.remotos.delete(id);
    }
    for (const j of lista) {
      let r = this.remotos.get(j.id);
      if (!r) {
        const g = persona(j.piel, j.ropa, "#2B1B12", 0.19);
        g.position.set(j.x, 0, j.y);
        this.escena.add(g);
        const etiqueta = document.createElement("div");
        etiqueta.className = "rotulo-jugador";
        etiqueta.textContent = j.nombre;
        this.capa.append(etiqueta);
        r = { g, meta: new THREE.Vector2(j.x, j.y), rot: j.r ?? 0, etiqueta, anim: j.anim ?? "quieto" };
        this.remotos.set(j.id, r);
        const gg = g;
        this.etiquetas.push({ el: etiqueta, pos: () => gg.position.clone().setY(2.1) });
      }
      r.meta.set(j.x, j.y);
      r.rot = j.r ?? r.rot;
      r.anim = j.anim ?? "quieto";
    }
  }

  /** Texto que flota y se desvanece (dinero, XP, avisos). */
  flotar(texto: string, donde: THREE.Vector3) {
    const el = document.createElement("div");
    el.className = "flotante";
    el.innerHTML = texto;
    this.capa.append(el);
    const p = donde.clone();
    const t0 = performance.now();
    const e = { el, pos: () => p.clone().setY(p.y + (performance.now() - t0) / 900) };
    this.etiquetas.push(e);
    setTimeout(() => {
      el.remove();
      this.etiquetas = this.etiquetas.filter((x) => x !== e);
    }, 1500);
  }

  /* ── Fantasma de colocación (modo construcción) ──────────────────── */

  fantasma(m: { tipo: string; color: string; x: number; z: number; rot: number } | null, valido = true) {
    if (!m) {
      if (this.fantasmaG) this.escena.remove(this.fantasmaG);
      this.fantasmaG = null;
      this.claveFantasma = "";
      return;
    }
    const clave = `${m.tipo}|${m.color}`;
    if (clave !== this.claveFantasma) {
      if (this.fantasmaG) this.escena.remove(this.fantasmaG);
      this.fantasmaG = modeloMueble(m.tipo, m.color);
      this.fantasmaG.traverse((o) => {
        const mm = o as THREE.Mesh;
        if (mm.isMesh) {
          mm.material = (mm.material as THREE.MeshStandardMaterial).clone();
          (mm.material as THREE.MeshStandardMaterial).transparent = true;
          (mm.material as THREE.MeshStandardMaterial).opacity = 0.72;
          mm.castShadow = false;
        }
      });
      // Huella en el suelo.
      const def = MUEBLES[m.tipo];
      const huella = new THREE.Mesh(new THREE.PlaneGeometry(def.w * 0.5, def.d * 0.5), new THREE.MeshBasicMaterial({ color: "#C4E910", transparent: true, opacity: 0.4, depthWrite: false }));
      huella.rotation.x = -Math.PI / 2;
      huella.position.y = 0.02;
      huella.name = "huella";
      this.fantasmaG.add(huella);
      this.escena.add(this.fantasmaG);
      this.claveFantasma = clave;
    }
    this.colocarModelo(this.fantasmaG!, m);
    this.fantasmaG!.position.y += 0.03;
    const huella = this.fantasmaG!.getObjectByName("huella") as THREE.Mesh;
    (huella.material as THREE.MeshBasicMaterial).color.set(valido ? "#C4E910" : "#FF1254");
    this.fantasmaG!.traverse((o) => {
      const mm = o as THREE.Mesh;
      if (mm.isMesh && o !== huella) (mm.material as THREE.MeshStandardMaterial).emissive?.set(valido ? "#000000" : "#661020");
    });
  }

  /** Rejilla de colocación (paso en medias celdas; 0 la oculta). */
  private rejilla: THREE.Group | null = null;
  mostrarRejilla(paso: number) {
    if (this.rejilla) {
      this.escena.remove(this.rejilla);
      this.rejilla.traverse((o) => (o as THREE.LineSegments).geometry?.dispose());
      this.rejilla = null;
    }
    if (!paso) return;
    const g = new THREE.Group();
    const pts: number[] = [];
    const s = paso * 0.5;
    for (const hab of this.plano.habitaciones) {
      for (let x = hab.x0; x <= hab.x1 + 1e-6; x += s) pts.push(x, 0.015, hab.z0, x, 0.015, hab.z1);
      for (let z = hab.z0; z <= hab.z1 + 1e-6; z += s) pts.push(hab.x0, 0.015, z, hab.x1, 0.015, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#1F5EFF", transparent: true, opacity: 0.35, depthWrite: false })));
    this.rejilla = g;
    this.escena.add(g);
  }

  /** Resalta un mueble (seleccionado). */
  resaltar(uid: string | null) {
    for (const [id, v] of this.muebles) v.g.traverse((o) => {
      const mm = o as THREE.Mesh;
      if (!mm.isMesh) return;
      if (!mm.userData.matOriginal) mm.userData.matOriginal = mm.material;
      if (id === uid) {
        const c = (mm.userData.matOriginal as THREE.MeshStandardMaterial).clone();
        c.emissive = new THREE.Color("#3D4D00");
        mm.material = c;
      } else mm.material = mm.userData.matOriginal;
    });
  }

  /** Oculta un mueble mientras se arrastra su fantasma. */
  ocultarMueble(uid: string | null) {
    for (const [id, v] of this.muebles) v.g.visible = id !== uid;
  }

  /** Atenúa una mancha mientras se frota. */
  frotar(id: string, sucio: number) {
    const m = this.manchas.get(id);
    if (!m) return;
    m.userData.sucio = sucio;
    (m.material as THREE.MeshStandardMaterial).opacity = 0.55 * sucio;
  }

  /** Mueve un trasto o una bolsa con el jugador (llevar al contenedor). */
  levantar(tipo: "mueble" | "basura", id: string) {
    const g = tipo === "mueble" ? this.muebles.get(id)?.g : this.basuras.get(id);
    if (!g) return null;
    return g;
  }

  /* ── Cámara y entrada ────────────────────────────────────────────── */

  girar(sentido: number) {
    this.yawMeta += (sentido * Math.PI) / 2;
  }
  zoom(f: number) {
    this.dist = Math.max(4, Math.min(34, this.dist * f));
  }
  centrar() {
    this.libre = false;
  }

  private toqueEn(x: number, y: number): Toque {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camara);
    const suelo = this.ray.ray.intersectPlane(this.sueloPlano, new THREE.Vector3());
    const hits = this.ray.intersectObjects([this.gMuebles, this.gSucio, this.gJardin, this.casco], true);
    let objeto: Toque["objeto"] = null;
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData?.tipo) o = o.parent;
      if (!o) continue;
      const t = o.userData.tipo as string;
      if (t === "suelo") break;
      if (t === "pared") {
        if (!o.visible || (o.parent && o.parent.scale.y < 0.5)) continue;
        objeto = { tipo: "pared", id: `${o.userData.hab}:${o.userData.lado}`, punto: h.point };
        break;
      }
      if (t === "mueble" || t === "mancha" || t === "basura" || t === "jardin") {
        if (t === "mueble" && !o.visible) continue;
        objeto = { tipo: t, id: String(o.userData.id), punto: h.point };
        break;
      }
    }
    return { suelo, objeto, x, y };
  }

  private escuchar() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (ev) => {
      c.setPointerCapture(ev.pointerId);
      this.punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      this.pellizco = null;
      if (this.punteros.size === 1) {
        this.toque = { x: ev.clientX, y: ev.clientY, movido: false };
        this.herramienta?.bajar?.(this.toqueEn(ev.clientX, ev.clientY));
      } else this.toque = null;
    });
    c.addEventListener("pointermove", (ev) => {
      const prev = this.punteros.get(ev.pointerId);
      const ahora = { x: ev.clientX, y: ev.clientY };
      if (!prev) {
        // Ratón sin pulsar: el modo construcción sigue al puntero.
        if (ev.pointerType === "mouse") this.herramienta?.mover?.(this.toqueEn(ev.clientX, ev.clientY));
        return;
      }
      this.punteros.set(ev.pointerId, ahora);
      if (this.punteros.size === 1) {
        if (this.toque && Math.hypot(ahora.x - this.toque.x, ahora.y - this.toque.y) > 7) this.toque.movido = true;
        if (this.herramienta?.capturaArrastre) {
          this.herramienta.mover?.(this.toqueEn(ev.clientX, ev.clientY));
          return;
        }
        if (this.toque?.movido) {
          // Arrastrar: mover la cámara por el plano.
          const a = this.alSuelo(prev.x, prev.y);
          const b = this.alSuelo(ahora.x, ahora.y);
          if (a && b) {
            this.objetivo.sub(b.sub(a));
            this.objetivo.x = Math.max(-2, Math.min(this.plano.ancho + 2, this.objetivo.x));
            this.objetivo.z = Math.max(-2, Math.min(this.plano.fondo + 2, this.objetivo.z));
            this.libre = true;
          }
        }
      } else if (this.punteros.size === 2) {
        const [p, q] = [...this.punteros.values()];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (this.pellizco) this.zoom(this.pellizco / d);
        this.pellizco = d;
      }
    });
    const fin = (ev: PointerEvent) => {
      if (!this.punteros.has(ev.pointerId)) return;
      this.punteros.delete(ev.pointerId);
      const t = this.toqueEn(ev.clientX, ev.clientY);
      if (this.herramienta?.subir) this.herramienta.subir(t);
      if (this.toque && !this.toque.movido && this.punteros.size === 0) {
        if (!this.herramienta?.capturaArrastre || !this.herramienta.subir) this.onTocar(t);
      }
      this.toque = null;
    };
    c.addEventListener("pointerup", fin);
    c.addEventListener("pointercancel", fin);
    c.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      this.zoom(ev.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });
  }

  private alSuelo(x: number, y: number) {
    const r = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), this.camara);
    return this.ray.ray.intersectPlane(this.sueloPlano, new THREE.Vector3());
  }

  /** Coordenadas de pantalla de un punto 3D (para paneles junto a objetos). */
  aPantalla(p: THREE.Vector3) {
    const v = p.clone().project(this.camara);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, visible: v.z < 1 };
  }

  /* ── Bucle ────────────────────────────────────────────────────────── */

  /** Con un taller a pantalla completa encima no hace falta dibujar el 3D. */
  pausado = false;

  private fotograma() {
    if (!this.vivo || !this.plano || this.pausado) return;
    const dt = Math.min(0.1, this.reloj.getDelta());
    const t = this.reloj.elapsedTime;
    // Andar.
    if (this.camino.length) {
      let avance = 2.6 * dt;
      while (avance > 0 && this.camino.length) {
        const d = this.camino[0];
        const dist = d.distanceTo(this.pos);
        if (dist > 0.001) this.rot = Math.atan2(d.x - this.pos.x, d.y - this.pos.y);
        if (dist <= avance) {
          this.pos.copy(d);
          this.camino.shift();
          avance -= dist;
        } else {
          this.pos.add(d.clone().sub(this.pos).multiplyScalar(avance / dist));
          avance = 0;
        }
      }
      if (!this.camino.length) {
        this.andando = false;
        const f = this.alLlegar;
        this.alLlegar = null;
        f?.();
      }
    }
    this.jugador.position.set(this.pos.x, this.andando ? Math.abs(Math.sin(t * 14)) * 0.05 : 0, this.pos.y);
    this.jugador.rotation.y = this.rot + Math.PI;
    for (const r of this.remotos.values()) {
      const p = r.g.position;
      const dx = r.meta.x - p.x;
      const dz = r.meta.y - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 4) p.set(r.meta.x, 0, r.meta.y);
      else {
        p.x += dx * Math.min(1, dt * 8);
        p.z += dz * Math.min(1, dt * 8);
      }
      if (d > 0.02) r.g.rotation.y = Math.atan2(dx, dz) + Math.PI;
      else if (r.rot !== undefined) r.g.rotation.y = r.rot + Math.PI;
      p.y = r.anim === "andar" || d > 0.05 ? Math.abs(Math.sin(t * 14)) * 0.05 : 0;
    }
    // Cámara: sigue al jugador salvo que se haya movido a mano.
    if (!this.libre) this.objetivo.lerp(new THREE.Vector3(this.pos.x, 0, this.pos.y), Math.min(1, dt * 3));
    this.yaw += (this.yawMeta - this.yaw) * Math.min(1, dt * 6);
    const inclinacion = this.inclinacion;
    const cam = new THREE.Vector3(
      this.objetivo.x + Math.sin(this.yaw) * Math.cos(inclinacion) * this.dist,
      Math.sin(inclinacion) * this.dist,
      this.objetivo.z + Math.cos(this.yaw) * Math.cos(inclinacion) * this.dist,
    );
    this.camara.position.copy(cam);
    this.camara.lookAt(this.objetivo.x, 0.6, this.objetivo.z);
    // Corte de paredes: las que quedan entre la cámara y la habitación se bajan.
    const vista = new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    // Como en una casa de muñecas: fachadas del fondo enteras, las de delante cortadas y
    // los tabiques interiores a media altura para ver todas las habitaciones.
    for (const p of this.paredes) {
      const meta = p.normal.dot(vista) > 0.3 ? 0.12 : p.fachada ? 1 : this.tabiques;
      p.mesh.scale.y += (meta - p.mesh.scale.y) * Math.min(1, dt * 8);
    }
    // Lo colgado de una pared recortada se esconde con ella.
    const techo = this.altoTecho;
    for (const v of this.muebles.values()) {
      if (!v.colgado) continue;
      const corte = v.colgado.normal.dot(vista) > 0.3 ? 0.12 : v.colgado.fachada ? 1 : this.tabiques;
      for (const p of v.colgado.piezas) p.o.visible = p.y < corte * techo - 0.05;
    }
    // Las lámparas de techo solo se ven con los tabiques enteros (si no, flotan).
    for (const l of this.luces) l.bombilla.visible = this.tabiques > 0.5;
    // Sol entrando por las ventanas.
    const ang = ((this.hora - 6) / 14) * Math.PI;
    this.sol.position.set(this.plano.ancho / 2 + Math.cos(ang) * 14, 6 + Math.sin(Math.max(0.15, ang)) * 10, this.plano.fondo / 2 - 8);
    this.sol.target.position.set(this.plano.ancho / 2, 0, this.plano.fondo / 2);
    this.onFotograma(dt);
    if (LIMITE_FPS && performance.now() - this.ultimoDibujo < 1000 / LIMITE_FPS) return;
    this.ultimoDibujo = performance.now();
    this.renderer.render(this.escena, this.camara);
    // Rótulos HTML.
    const r = this.canvas.getBoundingClientRect();
    for (const e of this.etiquetas) {
      const v = e.pos().project(this.camara);
      e.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%)`;
      e.el.style.display = v.z < 1 ? "" : "none";
    }
  }
}
