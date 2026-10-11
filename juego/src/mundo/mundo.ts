import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { HorizontalTiltShiftShader } from "three/examples/jsm/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/examples/jsm/shaders/VerticalTiltShiftShader.js";
import {
  ANCHO_VIA, BARRIOS, DATOS, GIBRALTAR, LUGARES, NODOS, PENON, PISTA, POSICION, TIERRA, TRAMOS, VERJA, ZONAS,
  type LugarId, type Punto, type Tramo, type Zona,
} from "../datos/mapa";
import { OBJETOS, SALIDAS, type CultivoId } from "../datos/objetos";
import { PERSONAJES, type PersonajeId } from "../datos/personajes";
import { barcaFuera, horaDelDia, listo, progresoCultivo, type Estado } from "../estado";
import { presente } from "../historia";
import { iconoSvg } from "../iconos";
import * as M from "./modelos";
import * as T from "./texturas";

/** Otro jugador conectado (multijugador). */
export interface Vecino {
  id: string;
  nombre: string;
  ropa: string;
  piel: string;
  nivel: number;
  x: number;
  y: number;
  emote?: string;
}

/**
 * La Línea isométrica (2.5D), construida desde la geometría real de
 * OpenStreetMap: costa, usos del suelo, edificios y calles. Cada elemento real
 * se dibuja con el estilo del juego. Cámara ortográfica isométrica con giro
 * de 90° y zoom; el mundo es continuo y se desplaza con el dedo o el ratón.
 *
 * Coordenadas del mapa (x, y) → mundo 3D (X = x − CX, Z = y − CY), Y arriba.
 */

export type Tocable =
  | { tipo: "lugar"; id: LugarId }
  | { tipo: "bancal"; i: number }
  | { tipo: "npc"; id: PersonajeId }
  | { tipo: "cocina" }
  | { tipo: "barca" }
  | { tipo: "puesto" }
  | { tipo: "tablon" }
  | { tipo: "solar"; i: number }
  | { tipo: "zona"; zona: Zona };

/** Dirección del sol: alto y del sureste, para que las fachadas que ve la cámara tengan luz y sombra. */
const DIR_SOL = new THREE.Vector3(0.5, 1, 0.62).normalize();

const C_DIA = new THREE.Color("#BFE0F7");
const C_NOCHE = new THREE.Color("#14224A");
const C_OCASO = new THREE.Color("#F4B58C");
const C_SOL = new THREE.Color("#FFF2DE");
const C_SOL_NOCHE = new THREE.Color("#8EA6FF");
const C_SOL_OCASO = new THREE.Color("#FFB070");
const C_HEMI = new THREE.Color("#DCEBFF");
const C_HEMI_NOCHE = new THREE.Color("#3B4F8C");

const CX = 1300;
const CY = 1500;
const SUELO = 3;
const v3 = (x: number, y2: number, alto = SUELO) => new THREE.Vector3(x - CX, alto, y2 - CY);
const p3 = (p: Punto, alto = SUELO) => v3(p[0], p[1], alto);
const nodo3 = (n: string) => p3(NODOS[n]);
const sumar = (p: Punto, dx: number, dy: number): Punto => [p[0] + dx, p[1] + dy];

/** Posiciones de juego derivadas de las reales. */
const CASA = POSICION.casa;
const PLAZA = POSICION.plaza;
const MERCADO = POSICION.mercado;
const ATUNARA = POSICION.atunara;
const HUERTA = POSICION.huerta;
const BANCALES: Punto[] = [0, 1, 2, 3, 4, 5].map((i) => sumar(HUERTA, -26 + (i % 3) * 14, 10 + Math.floor(i / 3) * 14));
const PUESTO: Punto = sumar(NODOS[LUGARES.mercado.nodo], 6, -6);
const TABLON: Punto = sumar(NODOS[LUGARES.plaza.nodo], -7, 5);
const PUERTO_CENTRO: Punto = (() => {
  const r = DATOS.puerto.flat();
  return [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
})();
const MUELLE_BARCA: Punto = [ATUNARA[0] + (PUERTO_CENTRO[0] - ATUNARA[0]) * 0.55, ATUNARA[1] + (PUERTO_CENTRO[1] - ATUNARA[1]) * 0.55];
const MAR_ADENTRO: Punto = [PUERTO_CENTRO[0] + 420, PUERTO_CENTRO[1] - 60];

const POS_NPC: Record<PersonajeId, Punto> = {
  carmen: sumar(NODOS[LUGARES.casa.nodo], 5, 4),
  lola: sumar(NODOS[LUGARES.bar.nodo], 4, 4),
  juani: sumar(PUESTO, -3, 3),
  antonio: sumar(NODOS[LUGARES.atunara.nodo], 5, 3),
  rafa: sumar(NODOS[LUGARES.huerta.nodo], 5, -3),
  marta: sumar(NODOS[LUGARES.redaccion.nodo], 4, 4),
  andres: sumar(NODOS[LUGARES.frontera.nodo], -6, -4),
};

interface Etiqueta {
  el: HTMLElement;
  pos: THREE.Vector3;
}

/** Rectángulos ocupados por instalaciones deportivas (sin árboles encima): [x, y, medio ancho, medio fondo, ángulo]. */
const OCUPADO_DEPORTE: [number, number, number, number, number][] = [
  ...DATOS.deportes.pistas.map(([x, y, w, d, a]) => [x, y, w / 2 + 1.5, d / 2 + 1.5, a] as [number, number, number, number, number]),
  ...(DATOS.deportes.estadio ? [[DATOS.deportes.estadio[0], DATOS.deportes.estadio[1], DATOS.deportes.estadio[2] / 2 + 3, DATOS.deportes.estadio[3] / 2 + 3, DATOS.deportes.estadio[4]] as [number, number, number, number, number]] : []),
  [1610, 2275.5, 39, 14, 0],
  [1471, 2326, 16, 36, 0],
];
const enDeporte = (p: Punto) =>
  OCUPADO_DEPORTE.some(([x, y, hw, hd, a]) => {
    const dx = p[0] - x;
    const dy = p[1] - y;
    return Math.abs(dx * Math.cos(a) + dy * Math.sin(a)) < hw && Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) < hd;
  });

function azar(semilla: number) {
  let s = semilla;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Edificio real más cercano a un punto (para sustituirlo por un modelo propio). */
function edificioCercano(p: Punto) {
  let mejor = DATOS.edificios[0];
  let d = Infinity;
  for (const e of DATOS.edificios) {
    const dd = (e[0] - p[0]) ** 2 + (e[1] - p[1]) ** 2;
    if (dd < d) {
      d = dd;
      mejor = e;
    }
  }
  return mejor;
}

export class Mundo {
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(30, 1, 2, 14000);
  private composer!: EffectComposer;
  private tiltH!: ShaderPass;
  private tiltV!: ShaderPass;
  /** Tráfico, peatones, gaviotas y autobuses (animación de ciudad viva). */
  private coches: Movil[] = [];
  private peatones: Movil[] = [];
  private autobuses: { m: Movil; g: THREE.Group }[] = [];
  private mallaCoches!: THREE.InstancedMesh;
  private mallaCabinas!: THREE.InstancedMesh;
  private mallaPeatones!: THREE.InstancedMesh;
  private mallaCabezas!: THREE.InstancedMesh;
  private gaviotas: { g: THREE.Group; c: THREE.Vector3; r: number; v: number; f: number }[] = [];
  private busJugador!: THREE.Group;
  private vecinos = new Map<string, { g: THREE.Group; e: Etiqueta; meta: THREE.Vector3; emote: Etiqueta }>();
  /** Pantalla de inicio: la cámara sobrevuela la ciudad. */
  modoDemo = false;
  private demoAng = 0;
  private sol = new THREE.DirectionalLight("#FFF2DE", 2.5);
  private cielo = new THREE.HemisphereLight("#DCEBFF", "#B9A98A", 1.05);
  private mar!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private marBase!: Float32Array;
  private objetivoCam = new THREE.Vector3();
  private destinoCam: THREE.Vector3 | null = null;
  private foco: THREE.Vector3 | null = null;
  /** Distancia de la cámara (zoom): menor = más cerca. */
  private alto = 300;
  private altoMeta: number | null = null;
  /** Giro de la cámara en cuartos de vuelta (0: desde el noreste, mirando al Peñón). */
  private giro = 0;
  private giroActual = 0;
  private jugador: THREE.Group;
  private camino: THREE.Vector3[] = [];
  private alLlegar: (() => void) | null = null;
  private tocables: THREE.Object3D[] = [];
  private etiquetas: Etiqueta[] = [];
  private flotantes: { el: HTMLElement; pos: THREE.Vector3; t: number }[] = [];
  private marcador: THREE.Group;
  private plantas: { grupo: THREE.Group; clave: string }[] = [];
  private npcs = new Map<PersonajeId, THREE.Group>();
  private barca!: THREE.Group;
  private humo: THREE.Mesh[] = [];
  private chimenea = new THREE.Vector3();
  private cajasPuesto!: THREE.Group;
  private clavePuesto = "";
  private nubePenon: THREE.Group;
  private avion: THREE.Group;
  private faroles: THREE.Material[] = [];
  private balanceo: THREE.Object3D[] = [];
  private nieblas = new Map<string, { mallas: THREE.Mesh[]; rotulo: Etiqueta; zona: Zona }>();
  private burbujas: Record<"cocina" | "barca" | "puesto", Etiqueta>;
  /** Huecos donde no se dibujan los edificios reales (los sustituye un modelo). */
  private reservas: [number, number, number][] = [];
  private reloj = new THREE.Clock();
  private ayudante = new THREE.Object3D();
  private rutaBus: THREE.Vector3[] = [];
  private velBus = 75;
  private ultimoArrastre = 0;
  private punteros = new Map<number, { x: number; y: number }>();
  private toque: { x: number; y: number; t: number; movido: boolean } | null = null;
  private pellizco: number | null = null;
  private suelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), -SUELO);
  private ray = new THREE.Raycaster();

  objetivo: LugarId | null = null;
  hora = 12;
  viento: Estado["viento"] = "poniente";
  onTocar: (t: Tocable) => void = () => {};
  zonaAbierta: (z: Zona) => boolean = () => true;

  constructor(private canvas: HTMLCanvasElement, private capaEtiquetas: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.escena.background = new THREE.Color("#BFE0F7");
    this.escena.fog = new THREE.Fog("#BFE0F7", 900, 3200);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.escena, this.camara));
    this.tiltH = new ShaderPass(HorizontalTiltShiftShader);
    this.tiltV = new ShaderPass(VerticalTiltShiftShader);
    this.tiltH.uniforms.r.value = 0.5;
    this.tiltV.uniforms.r.value = 0.5;
    this.composer.addPass(this.tiltH);
    this.composer.addPass(this.tiltV);
    this.composer.addPass(new OutputPass());

    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.25;
    this.escena.add(this.sol, this.sol.target, this.cielo);

    // Lugares con modelo propio: no se dibuja el edificio real que hay debajo.
    this.reservas.push([...CASA, 9], [...MERCADO, 18], [...POSICION.bar, 6], [...POSICION.redaccion, 7], [...ATUNARA, 12], [...POSICION.santaBarbara, 30], [...(DATOS.deportes.estadio ?? POSICION.estadio).slice(0, 2) as unknown as Punto, 52], [...POSICION.estacion, 12], [...POSICION.frontera, 12]);
    const santuario = DATOS.poi["Santuario de la Inmaculada Concepción"];
    this.reservas.push([...santuario, 16]);
    for (const b of BANCALES) this.reservas.push([...b, 9]);
    this.reservas.push([...sumar(HUERTA, 22, -6), 9]);

    this.construirTerreno();
    this.construirCapas();
    this.construirCalles();
    this.construirEdificios();
    this.construirVegetacion();
    this.construirDeportes();
    this.construirAtunara();
    this.construirLugares();
    this.construirZonas();
    this.construirTrafico();
    this.construirGaviotas();

    this.jugador = M.persona("#E8B796", "#C4E910", "#2B1B12", 0.62);
    this.escena.add(this.jugador);
    this.busJugador = autobusUrbano();
    this.busJugador.visible = false;
    this.escena.add(this.busJugador);
    this.marcador = this.crearMarcador();
    this.escena.add(this.marcador);
    this.nubePenon = M.nube(2.2);
    this.nubePenon.position.copy(v3(PENON.x, PENON.yNorte + 120, 230));
    this.escena.add(this.nubePenon);
    this.avion = M.avion();
    this.avion.scale.setScalar(0.7);
    this.avion.visible = false;
    this.escena.add(this.avion);
    this.burbujas = {
      cocina: this.etiqueta("burbuja", "", p3(CASA, 16)),
      barca: this.etiqueta("burbuja", "", p3(MUELLE_BARCA, 12)),
      puesto: this.etiqueta("burbuja", "", p3(PUESTO, 11)),
    };

    new ResizeObserver(() => this.ajustar()).observe(canvas);
    this.ajustar();
    this.escuchar();
    this.renderer.setAnimationLoop(() => this.fotograma());
  }

  /* ── Terreno, costa y Gibraltar ─────────────────────────────────────── */

  private construirTerreno() {
    const geo = new THREE.PlaneGeometry(9000, 9000, 90, 90);
    geo.rotateX(-Math.PI / 2);
    this.marBase = Float32Array.from(geo.attributes.position.array as Float32Array);
    this.mar = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#2C9BE3", roughness: 0.22, metalness: 0.08, flatShading: true }));
    this.mar.receiveShadow = true;
    this.escena.add(this.mar);

    this.escena.add(this.losa(TIERRA, M.matTex(T.cesped(), 1, 1), "#B89A63", 8));
    this.escena.add(this.losa(GIBRALTAR, M.matTex(T.cesped(), 1, 1, "#CFE0B6"), "#B89A63", 8, 2.6));
    // Orilla: espuma a lo largo de toda la costa.
    const espuma: THREE.BufferGeometry[] = [];
    const costa = [...TIERRA.filter((p) => p[1] > -300 && p[0] > -300), ...GIBRALTAR];
    for (let i = 0; i < costa.length - 1; i++) {
      const [p, q] = [costa[i], costa[i + 1]];
      if (Math.abs(p[1] - VERJA) < 2 && Math.abs(q[1] - VERJA) < 2) continue;
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (l < 1 || l > 500) continue;
      const g = new THREE.PlaneGeometry(l, 5);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(q[1] - p[1], q[0] - p[0]));
      g.translate((p[0] + q[0]) / 2 - CX, 0.7, (p[1] + q[1]) / 2 - CY);
      espuma.push(g.index ? g.toNonIndexed() : g);
    }
    if (espuma.length) {
      const m = new THREE.Mesh(mergeGeometries(espuma), M.mat("#FFFFFF", { transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
      m.renderOrder = 5;
      this.escena.add(m);
    }

    this.escena.add(this.penon());
    // Aeropuerto: la pista cruza el istmo y entra en la bahía.
    const largo = PISTA.x1 - PISTA.x0;
    const pista = M.rcaja(largo, 2.4, PISTA.ancho, M.matTex(T.asfalto(), 30, 1), 0.6);
    pista.position.copy(v3((PISTA.x0 + PISTA.x1) / 2, PISTA.y, 1.8));
    this.escena.add(pista);
    for (let x = PISTA.x0 + 10; x < PISTA.x1 - 10; x += 22) {
      const raya = M.caja(10, 0.3, 1, "#FFFFFF");
      raya.position.copy(v3(x, PISTA.y, 3.1));
      this.escena.add(raya);
    }
    // La Verja: valla de lado a lado del istmo, con el paso en la aduana.
    const [xo, xe] = [GIBRALTAR[0][0], GIBRALTAR[1][0]];
    const paso = POSICION.frontera[0];
    const postes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 6, 0.5), M.mat("#4E5563"), Math.ceil((xe - xo) / 6) + 1);
    const o = new THREE.Object3D();
    let n = 0;
    for (let x = xo; x < xe; x += 6) {
      if (Math.abs(x - paso) < 14) continue;
      o.position.copy(v3(x, VERJA, SUELO + 3));
      o.updateMatrix();
      postes.setMatrixAt(n++, o.matrix);
    }
    postes.count = n;
    this.escena.add(postes);
    for (const [a, b] of [[xo, paso - 14], [paso + 14, xe]]) {
      const malla = M.caja(b - a, 4.6, 0.3, "#9AA2B2", { transparent: true, opacity: 0.5 });
      malla.position.copy(v3((a + b) / 2, VERJA, SUELO + 3));
      this.escena.add(malla);
    }
    // Mercantes fondeados en la bahía.
    for (const [x, y, c] of [[380, 2250, "#C8623E"], [300, 2480, "#1F5EFF"], [180, 2100, "#2B2D31"], [450, 1950, "#2E7D35"]] as const) {
      const buque = new THREE.Group();
      buque.add(M.en(M.rcaja(14, 7, 70, c, 2), 0, 3, 0));
      buque.add(M.en(M.rcaja(12, 10, 12, "#FFFFFF", 1.5), 0, 11, 25));
      for (let k = 0; k < 4; k++) buque.add(M.en(M.rcaja(10, 4, 10, ["#E84B3C", "#2F6DB5", "#F2C230", "#3FA046"][k], 0.5), 0, 8.5, -22 + k * 11));
      buque.position.copy(v3(x, y, 0));
      buque.rotation.y = 0.6;
      this.balanceo.push(buque);
      this.escena.add(buque);
    }
  }

  private forma(anillos: readonly (readonly Punto[])[]) {
    const s = new THREE.Shape(anillos[0].map(([x, y]) => new THREE.Vector2(x - CX, y - CY)));
    for (const h of anillos.slice(1)) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x - CX, y - CY))));
    return s;
  }

  private losa(p: readonly Punto[], arriba: THREE.Material, lado: string, fondo: number, alto = SUELO) {
    const geo = new THREE.ExtrudeGeometry(this.forma([p]), { depth: fondo + alto, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    escalarUV(geo, 1 / 30);
    (arriba as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    const m = new THREE.Mesh(geo, [arriba, M.mat(lado)]);
    m.position.y = alto;
    m.receiveShadow = true;
    return m;
  }

  /**
   * Material de capa de suelo: no escribe profundidad y se adelanta un poco, así
   * las capas casi coplanarias (barrios, parques, calles, rayas) no parpadean.
   * El orden entre capas lo decide renderOrder.
   */
  private capaSuelo(m: THREE.Material) {
    const c = m.clone();
    c.depthWrite = false;
    c.polygonOffset = true;
    c.polygonOffsetFactor = -2;
    c.polygonOffsetUnits = -4;
    return c;
  }

  private lamina(anillos: readonly (readonly (readonly Punto[])[])[], material: THREE.Material, alto: number, escalaUV = 1 / 30) {
    const geos = anillos.map((a) => {
      const g = new THREE.ShapeGeometry(this.forma(a));
      g.rotateX(Math.PI / 2);
      return g;
    });
    const geo = mergeGeometries(geos);
    escalarUV(geo, escalaUV);
    const mat = this.capaSuelo(material);
    mat.side = THREE.DoubleSide;
    const m = new THREE.Mesh(geo, mat);
    m.position.y = alto;
    m.receiveShadow = true;
    return m;
  }

  private penon() {
    const ancho = 520;
    const largo = 900;
    const geo = new THREE.PlaneGeometry(ancho, largo, 40, 70);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const y0 = PENON.yNorte - 40;
    const suave = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + PENON.x;
      const y = pos.getZ(i) + y0 + largo / 2;
      const cresta = PENON.x + (y - PENON.yNorte) * 0.08;
      const a = ((x - cresta) / 85) * (x < cresta ? 0.7 : 1.35);
      const perfil = 210 + 30 * Math.sin((y - PENON.yNorte) / 120) + 10 * Math.sin(x * 0.11 + y * 0.07);
      const h = perfil * Math.exp(-a * a * 1.2) * suave(PENON.yNorte - 10, PENON.yNorte + 30, y) * (1 - suave(PENON.ySur - 60, PENON.ySur + 120, y));
      pos.setY(i, 2 + h);
    }
    const plano = geo.toNonIndexed();
    plano.computeVertexNormals();
    const nrm = plano.attributes.normal;
    const p2 = plano.attributes.position;
    const colores: number[] = [];
    const caliza = new THREE.Color("#E3DED1");
    const monte = new THREE.Color("#6FA052");
    for (let i = 0; i < p2.count; i += 3) {
      const ny = (nrm.getY(i) + nrm.getY(i + 1) + nrm.getY(i + 2)) / 3;
      const hy = (p2.getY(i) + p2.getY(i + 1) + p2.getY(i + 2)) / 3;
      const c = ny > 0.55 && hy < 190 && hy > 10 ? monte : caliza.clone().multiplyScalar(0.86 + ((i * 7919) % 13) / 100);
      for (let k = 0; k < 3; k++) colores.push(c.r, c.g, c.b);
    }
    plano.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
    const m = new THREE.Mesh(plano, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    m.position.copy(v3(PENON.x, y0 + largo / 2, 0));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  /* ── Usos del suelo (polígonos reales) ──────────────────────────────── */

  private construirCapas() {
    const c = DATOS.capas;
    let orden = 10;
    const poner = (nombre: string, material: THREE.Material, alto: number, uv = 1 / 30) => {
      orden++;
      if (!c[nombre]?.length) return;
      const m = this.lamina(c[nombre], material, SUELO + alto, uv);
      m.renderOrder = orden;
      this.escena.add(m);
    };
    poner("residencial", M.matTex(T.acera(), 1, 1, "#F2E9D8"), 0.04, 1 / 14);
    poner("industrial", M.matTex(T.asfalto(), 1, 1, "#C9CDD4"), 0.05, 1 / 20);
    poner("deportivo", M.matTex(T.acera(), 1, 1, "#DCDFE4"), 0.055, 1 / 14);
    poner("comercial", M.matTex(T.acera(), 1, 1, "#EADCD2"), 0.06, 1 / 14);
    poner("matorral", M.matTex(T.cesped(), 1, 1, "#B9C77F"), 0.07);
    poner("cesped", M.matTex(T.cesped(), 1, 1, "#B9EC86"), 0.08);
    poner("parque", M.matTex(T.cesped(), 1, 1, "#9FD372"), 0.09);
    poner("bosque", M.matTex(T.cesped(), 1, 1, "#7FB65A"), 0.09);
    poner("huerto", M.matTex(T.tierraArada(), 1, 1), 0.1, 1 / 10);
    poner("solar", M.mat("#D3B387"), 0.1);
    poner("cementerio", M.mat("#D7D2C6"), 0.1);
    poner("plaza", M.matTex(T.adoquin(), 1, 1, "#FFF8EC"), 0.12, 1 / 10);
    poner("arena", M.matTex(T.arena(), 1, 1, "#EED9A6"), 0.13, 1 / 16);
    poner("campo", M.mat("#4DB052"), 0.14);
    poner("agua", M.mat("#3FA9F5", { roughness: 0.15 }), 0.16);
    poner("piscina", M.mat("#5BD3FF", { roughness: 0.1, emissive: "#1B7FB0", emissiveIntensity: 0.15 }), 0.45);
    poner("puerto", M.mat("#2AA0D8", { roughness: 0.15 }), 0.2);
  }

  /* ── Calles reales convertidas en caminos ───────────────────────────── */

  private construirCalles() {
    const grupos: Record<string, THREE.BufferGeometry[]> = { acera: [], asfalto: [], peatonal: [], sendero: [], pista: [], raya: [] };
    const grupoDe = (c: number) => (c <= 3 || c === 5 ? "asfalto" : c === 4 ? "peatonal" : c === 6 ? "sendero" : "pista");
    const altoDe = (c: number) => 0.3 + (7 - c) * 0.012;
    const anchoNodo = new Map<string, { w: number; c: number; grado: number }>();
    for (const t of TRAMOS) {
      const w = ANCHO_VIA[t.clase];
      grupos[grupoDe(t.clase)].push(cinta(t.puntos, w, altoDe(t.clase)));
      if (t.clase <= 3) grupos.acera.push(cinta(t.puntos, w + 3, 0.22));
      if (t.clase <= 1 && t.largo > 30) grupos.raya.push(...rayas(t.puntos, altoDe(t.clase) + 0.02));
      for (const n of [t.a, t.b]) {
        const a = anchoNodo.get(n) ?? { w: 0, c: 9, grado: 0 };
        anchoNodo.set(n, { w: Math.max(a.w, w), c: Math.min(a.c, t.clase), grado: a.grado + 1 });
      }
    }
    // Cruces: discos para que las calles casen sin huecos.
    for (const [n, a] of anchoNodo) {
      // Solo en cruces y giros, no en los finales de calle (quedaban como manchas).
      if (a.c > 5 || a.c === 4 || a.grado < 2) continue;
      const g = new THREE.CircleGeometry(a.w / 2 + (a.c <= 3 ? 1.5 : 0), 14);
      g.rotateX(-Math.PI / 2);
      const p = NODOS[n];
      g.translate(p[0] - CX, SUELO + (a.c <= 3 ? 0.22 : altoDe(a.c)) - 0.004, p[1] - CY);
      grupos[a.c <= 3 ? "acera" : "asfalto"].push(g);
      if (a.c <= 3) {
        const h = new THREE.CircleGeometry(a.w / 2, 14);
        h.rotateX(-Math.PI / 2);
        h.translate(p[0] - CX, SUELO + altoDe(a.c) - 0.004, p[1] - CY);
        grupos.asfalto.push(h);
      }
    }
    const mats: Record<string, THREE.Material> = {
      acera: M.mat("#F4EEE2"),
      asfalto: M.matTex(T.asfalto(), 1, 1),
      peatonal: M.matTex(T.adoquin(), 1, 1),
      sendero: M.mat("#EBDDBF"),
      pista: M.mat("#C9A77A"),
      raya: M.mat("#FFFFFF"),
    };
    const ordenCalle: Record<string, number> = { acera: 20, asfalto: 21, peatonal: 22, sendero: 23, pista: 24, raya: 25 };
    for (const [k, geos] of Object.entries(grupos)) {
      if (!geos.length) continue;
      const geo = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
        if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (!g.attributes.normal) g.computeVertexNormals();
        return g;
      }));
      const m = new THREE.Mesh(geo, this.capaSuelo(mats[k]));
      m.renderOrder = ordenCalle[k];
      m.receiveShadow = true;
      this.escena.add(m);
    }
    // Farolas en las vías principales (instanciadas).
    const pts: Punto[] = [];
    for (const t of TRAMOS) {
      if (t.clase > 2) continue;
      for (let i = 1; i < t.puntos.length; i++) {
        const [a, b] = [t.puntos[i - 1], t.puntos[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 18; s < l - 6; s += 46) {
          const nx = -(b[1] - a[1]) / l;
          const ny = (b[0] - a[0]) / l;
          const off = ANCHO_VIA[t.clase] / 2 + 2;
          pts.push([a[0] + ((b[0] - a[0]) * s) / l + nx * off, a[1] + ((b[1] - a[1]) * s) / l + ny * off]);
        }
      }
    }
    const postes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 7, 6), M.mat("#23262C"), pts.length);
    const farolMat = M.mat("#FFE7A3", { emissive: "#FFC64D", emissiveIntensity: 0.4 });
    this.faroles.push(farolMat);
    const farolas = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.45, 1.3, 6), farolMat, pts.length);
    const o = new THREE.Object3D();
    pts.forEach((p, i) => {
      o.position.copy(p3(p, SUELO + 3.5));
      o.updateMatrix();
      postes.setMatrixAt(i, o.matrix);
      o.position.y = SUELO + 7.6;
      o.updateMatrix();
      farolas.setMatrixAt(i, o.matrix);
    });
    postes.castShadow = true;
    this.escena.add(postes, farolas);

    // Árboles de acera en avenidas y calles principales.
    const edif = new Map<string, number[][]>();
    for (const e of DATOS.edificios) {
      const k = `${Math.floor(e[0] / 20)},${Math.floor(e[1] / 20)}`;
      if (!edif.has(k)) edif.set(k, []);
      edif.get(k)!.push(e);
    }
    const libre = (p: Punto) => {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const e of edif.get(`${Math.floor(p[0] / 20) + dx},${Math.floor(p[1] / 20) + dy}`) ?? []) {
          if ((e[0] - p[0]) ** 2 + (e[1] - p[1]) ** 2 < (Math.max(e[2], e[3]) / 2 + 1.5) ** 2) return false;
        }
      }
      return true;
    };
    const arbolado: Punto[] = [];
    for (const t of TRAMOS) {
      if (t.clase > 2 || t.largo < 30) continue;
      for (let i = 1; i < t.puntos.length; i++) {
        const [a, b] = [t.puntos[i - 1], t.puntos[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 10; s < l - 8; s += 15) {
          const nx = -(b[1] - a[1]) / l;
          const ny = (b[0] - a[0]) / l;
          for (const lado of [-1, 1]) {
            const off = (ANCHO_VIA[t.clase] / 2 + 3) * lado;
            const p: Punto = [a[0] + ((b[0] - a[0]) * s) / l + nx * off, a[1] + ((b[1] - a[1]) * s) / l + ny * off];
            if (arbolado.length < 2600 && libre(p) && !enDeporte(p)) arbolado.push(p);
          }
        }
      }
    }
    this.bosque(arbolado, azar(5), false);

    // Pasos de cebra en los cruces de las vías principales.
    const cebras: { p: Punto; rot: number; w: number }[] = [];
    for (const [n, adj] of ADY_COCHE) {
      if (adj.length < 3 || !adj.some((t) => t.clase <= 2)) continue;
      const c = NODOS[n];
      for (const t of adj) {
        const pts = t.a === n ? t.puntos : [...t.puntos].reverse();
        const q = pts[1];
        const l = Math.hypot(q[0] - c[0], q[1] - c[1]);
        const dist = ANCHO_VIA[t.clase] / 2 + 5;
        if (l < dist + 4) continue;
        cebras.push({ p: [c[0] + ((q[0] - c[0]) * dist) / l, c[1] + ((q[1] - c[1]) * dist) / l], rot: Math.atan2(q[0] - c[0], q[1] - c[1]), w: ANCHO_VIA[t.clase] });
      }
    }
    const rayasCebra = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 3).rotateX(-Math.PI / 2), this.capaSuelo(M.mat("#FFFFFF")), cebras.length * 6);
    rayasCebra.renderOrder = 26;
    const ob = new THREE.Object3D();
    let k = 0;
    for (const z of cebras) {
      for (let j = 0; j < 6; j++) {
        ob.position.copy(p3(z.p, SUELO + 0.4));
        ob.rotation.set(0, z.rot + Math.PI / 2, 0);
        ob.translateX(0);
        ob.translateZ(0);
        ob.rotateY(-Math.PI / 2);
        ob.translateX(((j - 2.5) * z.w) / 6.5);
        ob.updateMatrix();
        rayasCebra.setMatrixAt(k++, ob.matrix);
      }
    }
    rayasCebra.count = k;
    this.escena.add(rayasCebra);
  }

  /* ── Edificios reales con estilo de juego ───────────────────────────── */

  private construirEdificios() {
    const rand = azar(7);
    const reservado = (x: number, y: number) => this.reservas.some(([rx, ry, r]) => (x - rx) ** 2 + (y - ry) ** 2 < r * r);
    // Puntos de las calles principales (para poner comercios en planta baja).
    const rejilla = new Map<string, Punto[]>();
    const celda = (x: number, y: number) => `${Math.floor(x / 20)},${Math.floor(y / 20)}`;
    for (const t of TRAMOS) {
      if (t.clase > 2 && !(t.clase === 4 && t.nombre)) continue;
      for (let i = 1; i < t.puntos.length; i++) {
        const [a, b] = [t.puntos[i - 1], t.puntos[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 0; s <= l; s += 5) {
          const p: Punto = [a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l];
          const k = celda(...p);
          if (!rejilla.has(k)) rejilla.set(k, []);
          rejilla.get(k)!.push(p);
        }
      }
    }
    const cercaDeAvenida = (x: number, y: number, r: number) => {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const p of rejilla.get(`${Math.floor(x / 20) + dx},${Math.floor(y / 20) + dy}`) ?? []) if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < r * r) return true;
      }
      return false;
    };
    /** Estilos: 0-2 casa encalada (persianas), 3 casa pastel, 4 bloque pastel, 5 ladrillo, 6 cristal, 7 nave, 8 iglesia, 9 escuela, 10 público, 11 ruina, 12 caseta. */
    type B = { x: number; y: number; w: number; d: number; ang: number; h: number; estilo: number; teja: boolean; tono: number; pl: number; tienda: boolean };
    const lista: B[] = [];
    for (const [x, y, w0, d0, ang, tipo, plantas] of DATOS.edificios) {
      if (reservado(x, y)) continue;
      const w = Math.max(3.2, w0 * 0.9);
      const d = Math.max(3.2, d0 * 0.9);
      const r = rand();
      let pl = Math.min(9, plantas || (tipo === 1 ? 3 + Math.floor(rand() * 5) : 1 + (rand() < 0.4 ? 1 : 0)));
      let estilo: number;
      if (tipo === 0) estilo = r < 0.82 ? Math.floor(rand() * 3) : 3;
      else if (tipo === 1) estilo = pl >= 7 && r < 0.3 ? 6 : r < 0.62 ? 4 : r < 0.85 ? 5 : 4;
      else estilo = ({ 2: 7, 3: 8, 4: 9, 5: 10, 6: 11, 7: 12, 8: 13 } as Record<number, number>)[tipo] ?? 10;
      if (estilo === 10 && rand() < 0.4 && tipo !== 8) estilo = 6;
      if (estilo >= 7) pl = estilo === 10 || estilo === 9 ? 2 + Math.floor(rand() * 2) : 1;
      const h = estilo === 13 ? 8 : estilo === 7 ? 7 + rand() * 2 : estilo === 12 ? 3.2 : estilo === 11 ? 2.6 : estilo === 8 ? 10 : pl * 3.3 + 0.8;
      const tienda = estilo <= 6 && tipo !== 8 && cercaDeAvenida(x, y, Math.max(w, d) / 2 + 9);
      lista.push({ x, y, w, d, ang, h, estilo, teja: (estilo <= 3 && rand() < 0.5) || estilo === 8, tono: Math.floor(rand() * 5), pl, tienda });
    }
    const o = new THREE.Object3D();
    const caja = new RoundedBoxGeometry(1, 1, 1, 1, 0.06);
    const colocar = (b: B, alto: number, escala: [number, number, number], dx = 0, dz = 0) => {
      o.position.copy(v3(b.x, b.y, alto));
      o.rotation.set(0, -b.ang, 0);
      o.translateX(dx);
      o.translateZ(dz);
      o.scale.set(...escala);
      o.updateMatrix();
      return o.matrix;
    };
    const instancias = (sub: B[], material: THREE.Material, base = (b: B) => (b.tienda ? 3.6 : 0)) => {
      if (!sub.length) return;
      const im = new THREE.InstancedMesh(caja, material, sub.length);
      sub.forEach((b, i) => {
        const b0 = base(b);
        im.setMatrixAt(i, colocar(b, SUELO + b0 + (b.h - b0) / 2, [b.w, b.h - b0, b.d]));
      });
      this.instanciado(im);
    };
    const persianas: T.Persiana[] = ["verde", "azul", "marron"];
    persianas.forEach((ps, k) => instancias(lista.filter((b) => b.estilo === k), M.matTex(T.fachada(ps))));
    const pasteles = ["#F6C9A8", "#BFE3D0", "#F7E3A1", "#BFD8F2", "#F2C6D4"];
    pasteles.forEach((tono, k) => {
      instancias(lista.filter((b) => b.estilo === 3 && b.tono === k), M.matTex(T.fachadaPastel(tono), 1, 1));
      for (let pl = 1; pl <= 9; pl++) instancias(lista.filter((b) => b.estilo === 4 && b.tono === k && b.pl === pl), M.matTex(T.fachadaPastel(tono), 1, pl));
    });
    for (let pl = 1; pl <= 9; pl++) instancias(lista.filter((b) => b.estilo === 5 && b.pl === pl), M.matTex(T.fachadaLadrillo(), 1, pl));
    for (let pl = 1; pl <= 9; pl++) instancias(lista.filter((b) => b.estilo === 6 && b.pl === pl), M.matTex(T.fachadaCristal(), 1, Math.max(1, Math.round(pl / 2))));
    instancias(lista.filter((b) => b.estilo === 7), M.mat("#E6E9EE"), () => 0);
    instancias(lista.filter((b) => b.estilo === 8), M.mat("#FBF7EE"), () => 0);
    instancias(lista.filter((b) => b.estilo === 9), M.matTex(T.fachadaPastel("#F2D9A0"), 1, 2));
    instancias(lista.filter((b) => b.estilo === 10), M.matTex(T.fachadaPastel("#F4F1EA"), 1, 2));
    instancias(lista.filter((b) => b.estilo === 11), M.matTex(T.piedra(), 1, 1, "#E8D7B8"), () => 0);
    instancias(lista.filter((b) => b.estilo === 12), M.mat("#F7F4EC"), () => 0);
    instancias(lista.filter((b) => b.estilo === 13), M.matTex(T.fachadaPabellon(), 3, 1), () => 0);
    // Plantas bajas comerciales con toldo en las calles principales.
    const tiendas = lista.filter((b) => b.tienda);
    instancias(tiendas, M.matTex(T.escaparate(), 2, 1), () => 0);
    const colToldo = ["#E8423C", "#2E8B57", "#1F5EFF", "#F2A93B", "#8E44AD"];
    colToldo.forEach((c, k) => {
      const sub = tiendas.filter((b) => b.tono === k);
      if (!sub.length) return;
      const im = new THREE.InstancedMesh(caja, M.matTex(T.toldo(c), 3, 1), sub.length);
      sub.forEach((b, i) => im.setMatrixAt(i, colocar(b, SUELO + 3.6, [b.w + 1.6, 0.5, b.d + 1.6])));
      this.instanciado(im);
    });
    // Tejados de teja a dos aguas.
    const forma = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.5)]);
    const prisma = new THREE.ExtrudeGeometry(forma, { depth: 1, bevelEnabled: false });
    prisma.translate(0, 0, -0.5);
    prisma.rotateY(Math.PI / 2);
    const conTeja = lista.filter((b) => b.teja);
    const tejas = new THREE.InstancedMesh(prisma, M.matTex(T.teja(), 1, 1), conTeja.length);
    conTeja.forEach((b, i) => tejas.setMatrixAt(i, colocar(b, SUELO + b.h - 0.05, [b.w + 0.8, Math.min(b.w, b.d) * 0.85, b.d + 0.8])));
    this.instanciado(tejas);
    // Azoteas: borde claro y suelo algo más oscuro, como un pretil.
    const planas = lista.filter((b) => !b.teja);
    const bordes = new THREE.InstancedMesh(caja, M.mat("#FFFFFF"), planas.length);
    const suelos = new THREE.InstancedMesh(caja, M.mat("#FFFFFF"), planas.length);
    const colBorde = [new THREE.Color("#F4EEE2"), new THREE.Color("#EDE5D6"), new THREE.Color("#FAF5EC")];
    planas.forEach((b, i) => {
      bordes.setMatrixAt(i, colocar(b, SUELO + b.h + 0.45, [b.w + 0.5, 0.9, b.d + 0.5]));
      bordes.setColorAt(i, b.estilo === 7 ? new THREE.Color(b.tono % 2 ? "#2F6DB5" : "#B9C1CC") : b.estilo === 12 ? new THREE.Color("#A9AFB8") : colBorde[b.tono % 3]);
      suelos.setMatrixAt(i, colocar(b, SUELO + b.h + 0.92, [Math.max(0.5, b.w - 1), 0.1, Math.max(0.5, b.d - 1)]));
      suelos.setColorAt(i, b.estilo === 7 ? new THREE.Color(b.tono % 2 ? "#2A62A6" : "#A9B1BC") : new THREE.Color(b.tono % 2 ? "#C9BFAE" : "#D6CCBA"));
    });
    for (const im of [bordes, suelos]) {
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      this.instanciado(im);
    }
    // Detalles de azotea: aires acondicionados, depósitos, placas solares y terrazas verdes.
    const conDetalle = planas.filter((b) => b.w * b.d > 24 && b.estilo !== 12 && b.estilo !== 11);
    const aires: [B, number, number][] = [];
    const depositos: [B, number, number][] = [];
    const placas: [B, number, number][] = [];
    const jardines: B[] = [];
    for (const b of conDetalle) {
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const dx = (rand() - 0.5) * (b.w - 3);
        const dz = (rand() - 0.5) * (b.d - 3);
        const r = rand();
        if (r < 0.45) aires.push([b, dx, dz]);
        else if (r < 0.7) depositos.push([b, dx, dz]);
        else if (r < 0.9 && b.estilo !== 7) placas.push([b, dx, dz]);
        else if (!jardines.includes(b)) jardines.push(b);
      }
      if (b.estilo === 7) placas.push([b, 0, 0]);
    }
    const props = (lista2: [B, number, number][], geo: THREE.BufferGeometry, mat: THREE.Material, escala: [number, number, number], alto: number) => {
      if (!lista2.length) return;
      const im = new THREE.InstancedMesh(geo, mat, lista2.length);
      lista2.forEach(([b, dx, dz], i) => im.setMatrixAt(i, colocar(b, SUELO + b.h + 0.95 + alto, escala, dx, dz)));
      this.instanciado(im);
    };
    props(aires, caja, M.mat("#D9DDE3"), [1.6, 1, 1.2], 0.5);
    props(depositos, new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10), M.mat("#F7F7F2"), [1, 1, 1], 0.8);
    props(placas, caja, M.mat("#2C3E6B", { roughness: 0.3, metalness: 0.3 }), [3.2, 0.2, 2], 0.35);
    if (jardines.length) {
      const im = new THREE.InstancedMesh(caja, M.mat("#6DBE45"), jardines.length);
      jardines.forEach((b, i) => im.setMatrixAt(i, colocar(b, SUELO + b.h + 1.05, [b.w * 0.5, 0.25, b.d * 0.5], b.w * 0.15, 0)));
      this.instanciado(im);
    }
  }

  private instanciado(im: THREE.InstancedMesh) {
    im.castShadow = true;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    this.escena.add(im);
  }

  /** Árboles: los de los datos (parques, bosques, matorral, hileras) y palmeras de Poniente. */
  private construirVegetacion() {
    const rand = azar(31);
    const frondosos: Punto[] = [];
    const pinos: Punto[] = [];
    const arbustos: Punto[] = [];
    for (const [x, y, t] of DATOS.arboles) if (!enDeporte([x, y])) (t === 2 ? arbustos : t === 1 ? pinos : frondosos).push([x, y]);
    this.bosque(frondosos, rand, false);
    this.bosque(pinos, rand, true);
    const bolas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), M.mat("#FFFFFF"), Math.max(1, arbustos.length));
    const o = new THREE.Object3D();
    const verdes = ["#6FA048", "#5E9440", "#8AB35A"].map((c) => new THREE.Color(c));
    arbustos.forEach((p, i) => {
      const r = 1.4 + rand() * 1.2;
      o.position.copy(p3(p, SUELO + r * 0.5));
      o.scale.set(r, r * 0.7, r);
      o.updateMatrix();
      bolas.setMatrixAt(i, o.matrix);
      bolas.setColorAt(i, verdes[i % 3]);
    });
    bolas.count = arbustos.length;
    if (bolas.instanceColor) bolas.instanceColor.needsUpdate = true;
    this.instanciado(bolas);
    // Palmeras a lo largo del Paseo Marítimo de Poniente.
    const palmas: Punto[] = [];
    for (const t of TRAMOS) {
      if (!/Paseo Marítimo de Poniente/.test(t.nombre)) continue;
      for (let i = 1; i < t.puntos.length; i++) {
        const [a, b] = [t.puntos[i - 1], t.puntos[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 0; s < l; s += 16) palmas.push([a[0] + ((b[0] - a[0]) * s) / l - 3, a[1] + ((b[1] - a[1]) * s) / l]);
      }
    }
    for (const p of palmas.slice(0, 120)) {
      const pal = M.palmera(12);
      pal.scale.setScalar(0.55);
      pal.position.copy(p3(p));
      this.escena.add(pal);
    }
  }

  private bosque(puntos: Punto[], rand: () => number, pinos: boolean, tonos?: string[]) {
    const n = puntos.length;
    if (!n) return;
    const o = new THREE.Object3D();
    const troncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 1, 6), M.mat("#7A4E2D"), n);
    const bolas = 4;
    const copas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), M.mat("#FFFFFF"), n * bolas);
    const verdes = (tonos ?? (pinos ? ["#2F6B34", "#3A7A3B", "#285C2E"] : ["#5DB33C", "#8ED14F", "#3E9B45", "#2F8A3A", "#79C447"])).map((c) => new THREE.Color(c));
    let k = 0;
    puntos.forEach((p, i) => {
      const esc = 0.7 + rand() * 0.5;
      const alto = (pinos ? 7 : 3.5) * esc;
      o.position.copy(p3(p, SUELO + alto / 2));
      o.rotation.set(0, 0, 0);
      o.scale.set(esc, alto, esc);
      o.updateMatrix();
      troncos.setMatrixAt(i, o.matrix);
      for (let b = 0; b < bolas; b++) {
        const a = (b / bolas) * Math.PI * 2 + rand();
        const r = (pinos ? [3.2, 2.2, 2.1, 2] : [2.4, 1.8, 1.8, 1.6])[b] * esc;
        const off = b === 0 ? 0 : (pinos ? 2.2 : 1.4) * esc;
        o.position.copy(p3([p[0] + Math.cos(a) * off, p[1] + Math.sin(a) * off], SUELO + alto + (pinos ? 0.3 : b === 0 ? 1.2 : 0.6 + rand() * 1.4) * esc));
        o.scale.set(r, pinos ? r * 0.42 : r * 0.92, r);
        o.updateMatrix();
        copas.setMatrixAt(k, o.matrix);
        copas.setColorAt(k++, verdes[Math.floor(rand() * verdes.length)]);
      }
    });
    this.instanciado(troncos);
    if (copas.instanceColor) copas.instanceColor.needsUpdate = true;
    this.instanciado(copas);
  }

  /* ── Zona deportiva: estadio, Ciudad Deportiva, Campos Puyol y parque ── */

  private construirDeportes() {
    const D = DATOS.deportes;
    const o = new THREE.Object3D();
    const caja = new THREE.BoxGeometry(1, 1, 1);
    /** Matriz de una caja orientada como un rectángulo real (w en x local, d en z local). */
    const rect = (x: number, y: number, w: number, d: number, ang: number, alto: number, h: number, dx = 0, dz = 0) => {
      o.position.copy(v3(x, y, alto));
      o.rotation.set(0, -ang, 0);
      o.translateX(dx);
      o.translateZ(dz);
      o.scale.set(w, h, d);
      o.updateMatrix();
      return o.matrix.clone();
    };
    const lado = M.mat("#C9CED6");
    /** Losa con textura solo arriba (BoxGeometry: +x, −x, +y, −y, +z, −z). */
    const losa = (tex: THREE.Material) => [lado, lado, tex, lado, lado, lado];
    const poner = (matrices: THREE.Matrix4[], material: THREE.Material | THREE.Material[], sombra = true) => {
      if (!matrices.length) return;
      const im = new THREE.InstancedMesh(caja, material, matrices.length);
      matrices.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = sombra;
      im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true;
      this.escena.add(im);
    };

    // Pistas reales con sus marcas y su valla.
    const texDe: Record<number, THREE.Material> = {
      0: M.matTex(T.campoFutbol("artificial")), 1: M.matTex(T.campoFutbol("tierra")), 2: M.matTex(T.pistaTenis()),
      3: M.matTex(T.pistaPadel()), 4: M.matTex(T.pistaBaloncesto()), 5: M.matTex(T.pistaMulti()),
      6: M.matTex(T.pistaAtletismo()), 7: M.matTex(T.arena(), 1, 1, "#EED9A6"),
    };
    const porTipo = new Map<number, THREE.Matrix4[]>();
    const vallas = { cristal: [] as THREE.Matrix4[], malla: [] as THREE.Matrix4[], postes: [] as THREE.Matrix4[], torres: [] as THREE.Matrix4[] };
    for (const [x, y, w0, d0, a0, tipo] of D.pistas) {
      // Las texturas tienen el largo en vertical: el lado largo va en z.
      const [w, d, ang] = w0 > d0 ? [d0, w0, a0 + Math.PI / 2] : [w0, d0, a0];
      if (!porTipo.has(tipo)) porTipo.set(tipo, []);
      porTipo.get(tipo)!.push(rect(x, y, w, d, ang, SUELO + 0.2, 0.36));
      if (tipo === 3) {
        // Pádel: paredes de cristal y fondo de muro.
        for (const s of [-1, 1]) {
          vallas.cristal.push(rect(x, y, 0.15, d, ang, SUELO + 1.6, 2.4, (s * w) / 2, 0));
          vallas.malla.push(rect(x, y, w, 0.3, ang, SUELO + 1.6, 2.4, 0, (s * d) / 2));
        }
      } else if (tipo === 2 || tipo === 4 || tipo === 5 || tipo === 0) {
        const alto = tipo === 0 ? 3 : 2;
        for (const s of [-1, 1]) {
          vallas.malla.push(rect(x, y, 0.12, d + 1, ang, SUELO + 0.4 + alto / 2, alto, (s * (w + 1)) / 2, 0));
          vallas.malla.push(rect(x, y, w + 1, 0.12, ang, SUELO + 0.4 + alto / 2, alto, 0, (s * (d + 1)) / 2));
        }
        if (tipo === 0 && w * d > 600) {
          for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) vallas.torres.push(rect(x, y, 0.5, 14, ang, SUELO + 7, 0.5, (sx * (w + 2)) / 2, (sz * d) / 2.6));
        }
      }
    }
    for (const [tipo, ms] of porTipo) poner(ms, losa(texDe[tipo]), false);
    poner(vallas.cristal, M.mat("#CFE8F5", { transparent: true, opacity: 0.35, roughness: 0.1 }), false);
    poner(vallas.malla, M.mat("#2F5B3A", { transparent: true, opacity: 0.45 }), false);
    poner(vallas.torres, M.mat("#D8DCE2"));

    // Gradas sueltas (campos de fútbol): tres escalones.
    const gradas: THREE.Matrix4[] = [];
    for (const [x, y, w, d, ang] of D.gradas) {
      const [ww, dd, aa] = w > d ? [d, w, ang + Math.PI / 2] : [w, d, ang];
      for (let k = 0; k < 3; k++) gradas.push(rect(x, y, ww / 3, dd, aa, SUELO + 0.6 + k * 0.6, 1.2 + k * 1.2, -ww / 3 + (k * ww) / 3, 0));
    }
    poner(gradas, M.matTex(T.asientos(), 1, 1));

    // Estadio Municipal Ciudad de La Línea.
    if (D.estadio) this.estadioReal(D.estadio);

    // Aparcamiento del estadio (entre la Av. del Ejército y la grada norte), con coches.
    const [px0, px1, py0, py1] = [1572, 1648, 2262, 2289];
    const ap = new THREE.Mesh(caja, losa(M.matTex(T.aparcamiento(), (px1 - px0) / 10, (py1 - py0) / 12)));
    ap.position.copy(v3((px0 + px1) / 2, (py0 + py1) / 2, SUELO + 0.17));
    ap.scale.set(px1 - px0, 0.3, py1 - py0);
    ap.receiveShadow = true;
    this.escena.add(ap);
    const rand = azar(404);
    const aparcados: THREE.Matrix4[] = [];
    const colores: THREE.Color[] = [];
    const paleta = ["#E8423C", "#FFFFFF", "#2F6DB5", "#F2C230", "#2B2D31", "#9AA4B2", "#FFFFFF", "#9AA4B2"].map((c) => new THREE.Color(c));
    for (let fila = 0; fila < (py1 - py0) / 6; fila++) {
      for (let x = px0 + 1; x < px1 - 1; x += 1.25) {
        if (rand() < 0.45) continue;
        o.position.copy(v3(x, py0 + 1.5 + fila * 6 + (fila % 2) * 2.4, SUELO + 0.9));
        o.rotation.set(0, 0, 0);
        o.scale.set(0.95, 1, 1);
        o.updateMatrix();
        aparcados.push(o.matrix.clone());
        colores.push(paleta[Math.floor(rand() * paleta.length)]);
      }
    }
    const coches = new THREE.InstancedMesh(new RoundedBoxGeometry(1.1, 0.75, 2.2, 2, 0.25), M.mat("#FFFFFF", { roughness: 0.35, metalness: 0.2 }), aparcados.length);
    aparcados.forEach((m, i) => {
      coches.setMatrixAt(i, m);
      coches.setColorAt(i, colores[i]);
    });
    coches.castShadow = true;
    this.escena.add(coches);

    // Parque Princesa Sofía: pinar y acebuches, claros de tierra y la pista de atletismo.
    const PISTA_PARQUE: [number, number, number, number] = [1471, 2326, 26, 66];
    const pista = new THREE.Mesh(caja, losa(M.matTex(T.pistaAtletismo())));
    pista.position.copy(v3(PISTA_PARQUE[0], PISTA_PARQUE[1], SUELO + 0.2));
    pista.scale.set(PISTA_PARQUE[2], 0.36, PISTA_PARQUE[3]);
    pista.receiveShadow = true;
    this.escena.add(pista);
    const parque = (DATOS.capas.parque ?? []).map((a) => a[0]).find((r) => dentroPoli([1400, 2370], r));
    if (parque) {
      const xs = parque.map((p) => p[0]);
      const ys = parque.map((p) => p[1]);
      const sendas = TRAMOS.filter((t) => t.clase >= 4 && t.puntos.some((p) => p[0] > 1280 && p[0] < 1500 && p[1] > 2250 && p[1] < 2490)).flatMap((t) => t.puntos);
      const cerca = (p: Punto, r: number) => sendas.some((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < r * r);
      const enPista = (p: Punto) => Math.abs(p[0] - PISTA_PARQUE[0]) < PISTA_PARQUE[2] / 2 + 3 && Math.abs(p[1] - PISTA_PARQUE[1]) < PISTA_PARQUE[3] / 2 + 3;
      const pinos: Punto[] = [];
      const frondosos: Punto[] = [];
      const claros: Punto[] = [];
      for (let i = 0; i < 4000 && pinos.length + frondosos.length < 520; i++) {
        const p: Punto = [Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs)), Math.min(...ys) + rand() * (Math.max(...ys) - Math.min(...ys))];
        if (!dentroPoli(p, parque) || enPista(p) || enDeporte(p)) continue;
        if (cerca(p, 3.5)) continue;
        // Arboledas: más densas en manchas, como en la foto aérea.
        const mancha = Math.sin(p[0] * 0.045) + Math.cos(p[1] * 0.038) + Math.sin((p[0] + p[1]) * 0.02);
        if (mancha < -0.4) {
          if (claros.length < 40 && rand() < 0.08) claros.push(p);
          continue;
        }
        (rand() < 0.55 ? pinos : frondosos).push(p);
      }
      this.bosque(pinos, rand, true);
      this.bosque(frondosos, rand, false, ["#3E7D35", "#4F8F3C", "#5E9B44", "#376F31"]);
      const tierra = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2), this.capaSuelo(M.mat("#CDBD92")), Math.max(1, claros.length));
      claros.forEach((p, i) => {
        o.position.copy(p3(p, SUELO + 0.15));
        o.rotation.set(0, rand() * 3, 0);
        o.scale.set(3 + rand() * 4, 1, 2.5 + rand() * 3.5);
        o.updateMatrix();
        tierra.setMatrixAt(i, o.matrix);
      });
      tierra.count = claros.length;
      tierra.renderOrder = 30;
      this.escena.add(tierra);
    }

    // Paseo marítimo de Levante: carril rojo y palmeras del lado de la playa.
    const paseo: THREE.BufferGeometry[] = [];
    const palmas: Punto[] = [];
    for (const t of TRAMOS) {
      if (t.nombre !== "Avenida Príncipe de Asturias" || t.puntos.every((p) => p[0] < 1600)) continue;
      const off = ANCHO_VIA[t.clase] / 2 + 4;
      const lado: Punto[] = t.puntos.map((p, i) => {
        const a = t.puntos[Math.max(0, i - 1)];
        const b = t.puntos[Math.min(t.puntos.length - 1, i + 1)];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        let nx = -(b[1] - a[1]) / l;
        let ny = (b[0] - a[0]) / l;
        if (nx < 0) (nx = -nx), (ny = -ny);
        return [p[0] + nx * off, p[1] + ny * off];
      });
      paseo.push(cinta(lado, 6, 0.28));
      for (let i = 1; i < lado.length; i++) {
        const [a, b] = [lado[i - 1], lado[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 4; s < l; s += 13) palmas.push([a[0] + ((b[0] - a[0]) * s) / l + 4, a[1] + ((b[1] - a[1]) * s) / l]);
      }
    }
    if (paseo.length) {
      const m = new THREE.Mesh(mergeGeometries(paseo), this.capaSuelo(M.mat("#DC7F6E")));
      m.renderOrder = 40;
      m.receiveShadow = true;
      this.escena.add(m);
    }
    for (const p of palmas.slice(0, 60)) {
      const pal = M.palmera(12);
      pal.scale.setScalar(0.5);
      pal.position.copy(p3(p));
      this.escena.add(pal);
    }
  }

  /** El estadio, ajustado a la huella real: césped, cuatro gradas, cubierta de preferencia, torres y focos. */
  private estadioReal([x, y, w0, d0, a0]: [number, number, number, number, number]) {
    // Ángulo entre −π/2 y π/2 para que la grada de preferencia quede al oeste.
    let a = a0;
    while (a > Math.PI / 2) a -= Math.PI;
    while (a < -Math.PI / 2) a += Math.PI;
    const [W, L] = w0 > d0 ? [d0, w0] : [w0, d0];
    if (w0 > d0) a += Math.PI / 2;
    const g = new THREE.Group();
    const blanco = M.mat("#F3F4F6");
    const gris = M.mat("#DADDE2");
    const marino = M.mat("#14275E");
    const caja = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], px: number, py: number, pz: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    const pw = Math.min(35, W - 24);
    const pl = Math.min(50, L - 26);
    caja(W, 0.5, L, gris, 0, 0.25, 0);
    caja(pw + 6, 0.3, pl + 6, M.mat("#3E9B45"), 0, 0.6, 0);
    const lado = M.mat("#3E9B45");
    caja(pw, 0.32, pl, [lado, lado, M.matTex(T.campoFutbol("natural")), lado, lado, lado], 0, 0.65, 0);
    // Porterías.
    for (const s of [-1, 1]) {
      caja(3.6, 1.2, 0.15, blanco, 0, 1.4, s * (pl / 2 + 0.6));
      caja(3.6, 0.15, 1, blanco, 0, 2, s * (pl / 2 + 1));
    }
    const asiento = M.matTex(T.asientos(), 2, 1);
    /** Grada escalonada: n filas que suben desde el borde del césped hacia fuera. */
    const grada = (largo: number, fondo: number, n: number, altoMax: number, colocar: (m: THREE.Mesh, k: number, paso: number) => void) => {
      const paso = fondo / n;
      for (let k = 0; k < n; k++) {
        const h = 1.2 + ((altoMax - 1.2) * (k + 1)) / n;
        const m = caja(largo, h, paso, [blanco, blanco, asiento, blanco, blanco, blanco], 0, h / 2 + 0.5, 0);
        colocar(m, k, paso);
      }
    };
    const fondoLat = (W - pw - 6) / 2 - 1;
    const fondoFin = (L - pl - 6) / 2 - 1;
    // Preferencia (oeste): más alta y con cubierta azul marino.
    grada(pl + 4, fondoLat, 6, 11, (m, k, paso) => { m.rotation.y = Math.PI / 2; m.position.x = -(pw / 2 + 3.5 + paso * (k + 0.5)); });
    // Tribuna (este) y fondos.
    grada(pl + 4, fondoLat, 5, 8, (m, k, paso) => { m.rotation.y = Math.PI / 2; m.position.x = pw / 2 + 3.5 + paso * (k + 0.5); });
    for (const s of [-1, 1]) grada(pw + 6, fondoFin, 4, 6.5, (m, k, paso) => { m.position.z = s * (pl / 2 + 3.5 + paso * (k + 0.5)); });
    // Cubierta de preferencia con el rótulo del estadio.
    const xCub = -(pw / 2 + 3.5 + fondoLat / 2);
    caja(fondoLat + 4, 0.8, pl + 2, marino, xCub + 1, 16, 0).rotation.z = -0.06;
    const rotulo = M.matTex(T.rotuloEstadio(), 1, 1);
    caja(0.6, 2.6, pl + 2, [rotulo, marino, marino, marino, marino, marino], xCub + fondoLat / 2 + 3, 15, 0);
    for (let z = -pl / 2; z <= pl / 2; z += pl / 4) caja(0.7, 16, 0.7, marino, xCub - fondoLat / 2, 8.5, z);
    // Franja azul de la tribuna (este), como en la foto.
    caja(0.4, 1.6, pl + 4, marino, pw / 2 + 3.2, 1.3, 0);
    // Torres de las esquinas y focos.
    const focos = M.mat("#FFF6D8", { emissive: "#FFE7A0", emissiveIntensity: 0.3 });
    this.faroles.push(focos);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      caja(7, 13, 7, blanco, sx * (W / 2 - 3.5), 7, sz * (L / 2 - 3.5));
      caja(7.6, 0.8, 7.6, gris, sx * (W / 2 - 3.5), 13.8, sz * (L / 2 - 3.5));
      const fx = sx * (W / 2 - 1);
      const fz = sz * (L / 2 + 1);
      caja(0.8, 30, 0.8, gris, fx, 15, fz);
      const panel = caja(5, 3, 0.6, focos, fx, 30.5, fz);
      panel.lookAt(new THREE.Vector3(0, 0, 0).add(g.position));
      panel.rotation.set(-0.5, Math.atan2(-fx, -fz), 0, "YXZ");
    }
    // Jugadores entrenando.
    const rand = azar(9);
    for (let i = 0; i < 12; i++) {
      const p = M.persona("#E8B796", i < 6 ? "#FFFFFF" : "#1F5EFF", "#2B1B12", 0.28);
      p.position.set((rand() - 0.5) * pw * 0.8, 0.8, (rand() - 0.5) * pl * 0.8);
      p.rotation.y = rand() * 6;
      g.add(p);
    }
    g.position.copy(v3(x, y, SUELO));
    g.rotation.y = -a;
    this.hacerTocable(g, { tipo: "lugar", id: "estadio" });
    this.escena.add(g);
  }

  /* ── La Atunara: el puerto pesquero real ────────────────────────────── */

  private construirAtunara() {
    const rand = azar(23);
    // Escollera en el borde exterior (hacia el mar) de la dársena real.
    const anillo = DATOS.puerto.reduce((a, b) => (b.length > a.length ? b : a), DATOS.puerto[0] ?? []);
    if (anillo.length) {
      const maxX = Math.max(...anillo.map((p) => p[0]));
      const borde = anillo.filter((p) => p[0] > maxX - 55).sort((a, b) => a[1] - b[1]);
      if (borde.length > 1) this.escena.add(M.escollera(borde.map((p) => p3(p, 0))));
    }
    // Barcas amarradas dentro de la dársena.
    const colores = [M.PALETA.rojo, M.PALETA.rojo, "#2E78D8", M.PALETA.rojo, "#2FA84A", M.PALETA.rojo, "#F2B705", "#2E78D8"];
    for (let i = 0; i < 8; i++) {
      const b = M.barca(colores[i]);
      b.scale.setScalar(0.45);
      b.position.copy(p3(sumar(PUERTO_CENTRO, -16 + (i % 4) * 9, -10 + Math.floor(i / 4) * 16), 0.4));
      b.rotation.y = Math.PI / 2 + (rand() - 0.5) * 0.2;
      this.balanceo.push(b);
      this.escena.add(b);
    }
    // Casetas de pescadores en fila junto a la lonja.
    for (let i = 0; i < 7; i++) {
      const c = M.casetaPescador(["#F1D58A", "#EAC56A", "#F4E1A6"][i % 3]);
      c.scale.setScalar(0.5);
      c.position.copy(p3(sumar(ATUNARA, -14 + i * 4, 14)));
      this.escena.add(c);
    }
  }

  /* ── Lugares del juego en su posición real ──────────────────────────── */

  private construirLugares() {
    const poner = (obj: THREE.Object3D, p: Punto, tap?: Tocable, rot = 0, escala = 1) => {
      obj.position.copy(p3(p));
      obj.scale.multiplyScalar(escala);
      obj.rotation.y = rot;
      if (tap) this.hacerTocable(obj, tap);
      this.escena.add(obj);
      return obj;
    };
    /** Rotación para que la fachada (−Z del modelo) mire hacia un punto. */
    const mirar = (desde: Punto, hacia: Punto) => Math.atan2(-(hacia[0] - desde[0]), -(hacia[1] - desde[1]));
    const nodoDe = (l: LugarId) => NODOS[LUGARES[l].nodo];

    // Plaza de la Iglesia: Santuario de la Inmaculada mirando a la plaza, monumento, fuente y tablón.
    const santuario = DATOS.poi["Santuario de la Inmaculada Concepción"];
    poner(M.iglesia(), santuario, { tipo: "lugar", id: "plaza" }, mirar(santuario, PLAZA), 0.42);
    poner(M.monumento(), sumar(PLAZA, 6, 2), undefined, 0, 0.45);
    poner(M.fuente(), sumar(PLAZA, -5, -3), undefined, 0, 0.45);
    poner(M.tablon(), TABLON, { tipo: "tablon" }, mirar(TABLON, nodoDe("plaza")), 0.45);
    // Mercado de Abastos con su orientación real y el puesto 14 delante.
    const mercado = edificioCercano(MERCADO);
    poner(M.mercado(), [mercado[0], mercado[1]], { tipo: "lugar", id: "mercado" }, -mercado[4], Math.max(0.35, Math.min(mercado[2] / 40, mercado[3] / 26) * 1.05));
    poner(M.puesto(), PUESTO, { tipo: "puesto" }, mirar(PUESTO, nodoDe("mercado")), 0.4);
    this.cajasPuesto = new THREE.Group();
    poner(this.cajasPuesto, PUESTO, undefined, mirar(PUESTO, nodoDe("mercado")), 0.4);
    // Casa de la abuela (San Bernardo), bar de Lola (Calle Real) y la redacción.
    const casa = poner(M.casaAbuela(), CASA, { tipo: "lugar", id: "casa" }, mirar(CASA, nodoDe("casa")), 0.45);
    casa.updateMatrixWorld();
    this.chimenea.copy(casa.localToWorld(new THREE.Vector3(6, 17.8, 3)));
    poner(M.bar(), POSICION.bar, { tipo: "lugar", id: "bar" }, mirar(POSICION.bar, nodoDe("bar")), 0.4);
    poner(M.redaccion(), POSICION.redaccion, { tipo: "lugar", id: "redaccion" }, mirar(POSICION.redaccion, nodoDe("redaccion")), 0.45);
    poner(M.marquesina(), POSICION.estacion, { tipo: "lugar", id: "estacion" }, mirar(POSICION.estacion, nodoDe("estacion")), 0.45);
    poner(M.frontera(), POSICION.frontera, { tipo: "lugar", id: "frontera" }, 0, 0.5);
    // Fuerte de Santa Bárbara y Estadio Ciudad de La Línea, en su sitio real.
    poner(M.fuerte(), POSICION.santaBarbara, { tipo: "lugar", id: "santaBarbara" }, 0.12, 1);
    // La Atunara: lonja real y la barca del abuelo.
    poner(M.lonja(), ATUNARA, { tipo: "lugar", id: "atunara" }, mirar(ATUNARA, nodoDe("atunara")), 0.4);
    this.barca = M.barca(M.PALETA.lima);
    poner(this.barca, MUELLE_BARCA, { tipo: "barca" }, Math.PI / 2, 0.45);
    // El Zabal: tus seis parcelas cercadas y el chamizo de Rafa.
    BANCALES.forEach((p, i) => {
      poner(M.bancal(), p, { tipo: "bancal", i }, 0, 0.7);
      const g = new THREE.Group();
      poner(g, p, { tipo: "bancal", i }, 0, 0.7);
      this.plantas.push({ grupo: g, clave: "" });
    });
    poner(M.chamizo(), sumar(HUERTA, 22, -6), { tipo: "lugar", id: "huerta" }, 0, 0.5);
    for (let i = 0; i < 3; i++) poner(M.pacaPaja(), sumar(HUERTA, 16 + i * 3, 4), undefined, 0, 0.5);
    // Playa de Levante: sombrillas sobre la arena real.
    const rand = azar(77);
    const arenas = (DATOS.capas.arena ?? []).filter((a) => a[0][0][0] > CX);
    let puestas = 0;
    for (const a of arenas) {
      const r = a[0];
      const xs = r.map((p) => p[0]);
      const ys = r.map((p) => p[1]);
      for (let i = 0; i < 400 && puestas < 70; i++) {
        const p: Punto = [Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs)), Math.min(...ys) + rand() * (Math.max(...ys) - Math.min(...ys))];
        if (!dentroPoli(p, r) || rand() < 0.6) continue;
        poner(M.sombrilla([M.PALETA.rosa, "#FFFFFF", M.PALETA.azul, M.PALETA.lima][puestas % 4]), p, undefined, 0, 0.5);
        puestas++;
      }
    }
    // Solares reales: espacios para fábricas y comercios (fase 2).
    DATOS.solares.slice(0, 24).forEach(([x, y], i) => {
      const cartel = new THREE.Group();
      cartel.add(M.en(M.caja(0.4, 5, 0.4, M.PALETA.madera), -2, 2.5, 0));
      cartel.add(M.en(M.caja(0.4, 5, 0.4, M.PALETA.madera), 2, 2.5, 0));
      cartel.add(M.en(M.rcaja(5.5, 3, 0.4, M.PALETA.lima, 0.2), 0, 5, 0));
      poner(cartel, [x, y], { tipo: "solar", i });
    });

    // Vecinos.
    for (const id of Object.keys(PERSONAJES) as PersonajeId[]) {
      const p = PERSONAJES[id];
      const g = M.persona(p.piel, p.ropa, p.canas ? "#E9E9E9" : p.pelo, 0.58);
      poner(g, POS_NPC[id], { tipo: "npc", id }, Math.random() * 6);
      this.npcs.set(id, g);
      this.etiqueta("npc", p.nombre, p3(POS_NPC[id], SUELO + 8));
    }
    // Rótulos de los lugares.
    for (const id of Object.keys(LUGARES) as LugarId[]) {
      const e = this.etiqueta("lugar", LUGARES[id].nombre, nodo3(LUGARES[id].nodo).setY(SUELO + 16));
      e.el.dataset.lugar = id;
      e.el.insertAdjacentHTML("afterbegin", iconoSvg(LUGARES[id].icono, 13));
      e.el.addEventListener("click", () => this.onTocar({ tipo: "lugar", id }));
    }
    // Nombres de las calles principales: en el tramo más largo de cada una.
    const largos = new Map<string, (typeof TRAMOS)[number]>();
    for (const t of TRAMOS) {
      if (!t.nombre || (t.clase > 2 && t.clase !== 4)) continue;
      const prev = largos.get(t.nombre);
      if (!prev || t.largo > prev.largo) largos.set(t.nombre, t);
    }
    for (const [nombre, t] of largos) {
      if (t.largo < 60) continue;
      const m = t.puntos[Math.floor(t.puntos.length / 2)];
      this.etiqueta("calle", nombre, p3(m, SUELO + 1));
    }
    this.etiqueta("zona-lejos", "GIBRALTAR", v3(PENON.x, PENON.yNorte + 60, 120));
    for (const b of Object.values(BARRIOS)) this.etiqueta("zona-lejos", b.nombre.toUpperCase(), p3(b.rotulo, 30));
  }

  /* ── Ciudad viva: coches, autobuses, peatones y gaviotas ───────────── */

  private construirTrafico() {
    const rand = azar(91);
    const conducibles = TRAMOS.filter((t) => t.clase <= 3 && t.largo > 6);
    const principales = conducibles.filter((t) => t.clase <= 2);
    const aceras = TRAMOS.filter((t) => (t.clase <= 4 || t.clase === 6) && t.largo > 6);
    const nuevo = (lista: Tramo[], v: number, lado: number): Movil => {
      const t = lista[Math.floor(rand() * lista.length)];
      return { t, dir: rand() < 0.5 ? 1 : -1, s: rand() * t.largo, v: v * (0.8 + rand() * 0.4), lado, red: lista === aceras ? "pie" : "coche" };
    };
    for (let i = 0; i < 170; i++) this.coches.push(nuevo(rand() < 0.65 ? principales : conducibles, 16, 1));
    for (let i = 0; i < 240; i++) this.peatones.push(nuevo(aceras, 2.6, 0));
    const colores = ["#E8423C", "#FFFFFF", "#2F6DB5", "#F2C230", "#2B2D31", "#9AA4B2", "#3FA046", "#F28C28", "#C4E910"].map((c) => new THREE.Color(c));
    this.mallaCoches = new THREE.InstancedMesh(new RoundedBoxGeometry(2.3, 1.2, 4.6, 2, 0.45), M.mat("#FFFFFF", { roughness: 0.35, metalness: 0.2 }), this.coches.length);
    this.mallaCabinas = new THREE.InstancedMesh(new RoundedBoxGeometry(2, 1, 2.4, 2, 0.4), M.mat("#33465F", { roughness: 0.2, metalness: 0.4 }), this.coches.length);
    this.coches.forEach((_, i) => this.mallaCoches.setColorAt(i, colores[i % colores.length]));
    this.mallaPeatones = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.42, 0.9, 2, 6), M.mat("#FFFFFF"), this.peatones.length);
    this.mallaCabezas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 1), M.mat("#FFFFFF"), this.peatones.length);
    const ropas = ["#E8423C", "#2F6DB5", "#F2C230", "#3FA046", "#FFFFFF", "#8E44AD", "#F28C28", "#1C2A44"].map((c) => new THREE.Color(c));
    const pieles = ["#F3D3B8", "#E8B796", "#C98E66", "#9A6644"].map((c) => new THREE.Color(c));
    this.peatones.forEach((_, i) => {
      this.mallaPeatones.setColorAt(i, ropas[i % ropas.length]);
      this.mallaCabezas.setColorAt(i, pieles[i % pieles.length]);
    });
    for (const m of [this.mallaCoches, this.mallaCabinas, this.mallaPeatones, this.mallaCabezas]) {
      m.castShadow = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.frustumCulled = false;
      this.escena.add(m);
    }
    // Autobuses urbanos verdes por las avenidas.
    for (let i = 0; i < 7; i++) {
      const g = autobusUrbano();
      this.escena.add(g);
      this.autobuses.push({ m: nuevo(principales, 11, 1), g });
    }
  }

  private construirGaviotas() {
    const centros: Punto[] = [PUERTO_CENTRO, POSICION.paseo, POSICION.levante, sumar(POSICION.levante, 30, 300), sumar(POSICION.paseo, -60, 150)];
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group();
      const ala = M.caja(2.4, 0.15, 0.8, "#FFFFFF");
      ala.castShadow = false;
      const ala2 = ala.clone();
      ala.position.x = 1.1;
      ala2.position.x = -1.1;
      g.add(ala, ala2, M.en(M.caja(0.5, 0.5, 1.4, "#F4F4F4"), 0, 0, 0));
      this.escena.add(g);
      this.gaviotas.push({ g, c: p3(centros[i % centros.length], 24 + (i % 5) * 4), r: 18 + (i % 7) * 8, v: 0.25 + (i % 4) * 0.08, f: i * 1.3 });
    }
  }

  /** Mueve un vehículo o peatón por la red real; al final de un tramo elige otro. */
  private avanzar(m: Movil, dt: number) {
    m.s += m.v * dt * m.dir;
    let vueltas = 0;
    while ((m.s > m.t.largo || m.s < 0) && vueltas++ < 4) {
      const nodo = m.dir === 1 ? m.t.b : m.t.a;
      const sobra = m.dir === 1 ? m.s - m.t.largo : -m.s;
      const opciones = (m.red === "pie" ? ADY_PIE : ADY_COCHE).get(nodo) ?? [];
      const otras = opciones.filter((t) => t !== m.t);
      const sig = (otras.length ? otras : opciones)[Math.floor(Math.random() * Math.max(1, (otras.length ? otras : opciones).length))] ?? m.t;
      m.dir = sig.a === nodo ? 1 : -1;
      m.t = sig;
      m.s = m.dir === 1 ? sobra : sig.largo - sobra;
    }
    return sobreTramo(m.t, Math.max(0, Math.min(m.t.largo, m.s)), m.dir, m.lado * (ANCHO_VIA[m.t.clase] / 4 + 0.2), m.red === "pie" ? ANCHO_VIA[m.t.clase] / 2 + 1.6 : 0);
  }

  /** Viaje en autobús: el jugador sube y el bus recorre las calles reales hasta la parada. */
  viajarEnBus(puntos: readonly Punto[], fin: () => void) {
    this.camino = [];
    this.rutaBus = puntos.map((p) => p3(p));
    // Viajes de 6 a 12 s, sea cual sea la distancia.
    let largo = 0;
    for (let i = 1; i < puntos.length; i++) largo += Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]);
    this.velBus = Math.max(70, largo / 10);
    this.busJugador.position.copy(this.rutaBus[0]);
    this.busJugador.visible = true;
    this.jugador.visible = false;
    this.alLlegar = fin;
    this.ultimoArrastre = 0;
    this.destinoCam = null;
    this.foco = null;
  }

  get enBus() {
    return this.rutaBus.length > 0;
  }

  /** Jugadores conectados: aparecen, se mueven con suavidad y saludan. */
  vecinosConectados(lista: Vecino[]) {
    const vistos = new Set<string>();
    for (const v of lista) {
      vistos.add(v.id);
      let r = this.vecinos.get(v.id);
      if (!r) {
        const g = M.persona(v.piel, v.ropa, "#2B1B12", 0.6);
        g.position.copy(v3(v.x, v.y));
        this.escena.add(g);
        r = { g, e: this.etiqueta("vecino", "", v3(v.x, v.y, SUELO + 9)), meta: v3(v.x, v.y), emote: this.etiqueta("emote", "", v3(v.x, v.y, SUELO + 13)) };
        this.vecinos.set(v.id, r);
      }
      r.e.el.textContent = `${v.nombre} · Nv ${v.nivel}`;
      r.meta.copy(v3(v.x, v.y));
      r.emote.el.textContent = v.emote ?? "";
      r.emote.el.style.display = v.emote ? "" : "none";
    }
    for (const [id, r] of this.vecinos) {
      if (vistos.has(id)) continue;
      this.escena.remove(r.g);
      r.e.el.remove();
      r.emote.el.remove();
      this.etiquetas = this.etiquetas.filter((x) => x !== r.e && x !== r.emote);
      this.vecinos.delete(id);
    }
  }

  /** Posición del jugador en coordenadas del mapa (para enviarla a los demás). */
  get posicionJugador(): Punto {
    const p = this.enBus ? this.busJugador.position : this.jugador.position;
    return [Math.round(p.x + CX), Math.round(p.z + CY)];
  }

  /** Niebla sobre las zonas que aún no se han desbloqueado, con su cartel. */
  private construirZonas() {
    const mat = new THREE.MeshStandardMaterial({ color: "#7F95C4", transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
    for (const z of ZONAS) {
      const mallas = z.zonas.map(([x0, y0, x1, y1]) => {
        const m = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0, 1.5, y1 - y0, 2, 0.7), mat);
        m.position.copy(v3((x0 + x1) / 2, (y0 + y1) / 2, SUELO + 9));
        m.userData.tocable = { tipo: "zona", zona: z };
        this.tocables.push(m);
        this.escena.add(m);
        return m;
      });
      const [x0, y0, x1, y1] = z.zonas[0];
      const rotulo = this.etiqueta("candado", `Nivel ${z.nivel} · ${z.nombre}`, v3((x0 + x1) / 2, (y0 + y1) / 2, SUELO + 12));
      rotulo.el.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>');
      rotulo.el.addEventListener("click", () => this.onTocar({ tipo: "zona", zona: z }));
      this.nieblas.set(z.id, { mallas, rotulo, zona: z });
    }
  }

  private hacerTocable(obj: THREE.Object3D, t: Tocable) {
    obj.userData.tocable = t;
    this.tocables.push(obj);
  }

  private crearMarcador() {
    const g = new THREE.Group();
    const m = M.mat(M.PALETA.lima, { emissive: "#6E8A00", emissiveIntensity: 0.6 });
    const flecha = new THREE.Mesh(new THREE.ConeGeometry(2, 3.6, 4), m);
    flecha.rotation.x = Math.PI;
    g.add(flecha);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(5, 0.5, 6, 28), m);
    aro.rotation.x = Math.PI / 2;
    aro.position.y = 0.6;
    g.add(aro);
    g.visible = false;
    return g;
  }

  /* ── Etiquetas HTML sobre el mundo ──────────────────────────────────── */

  private etiqueta(clase: string, texto: string, pos: THREE.Vector3): Etiqueta {
    const el = document.createElement("div");
    el.className = `rotulo3d ${clase}`;
    el.textContent = texto;
    this.capaEtiquetas.append(el);
    const e = { el, pos };
    this.etiquetas.push(e);
    return e;
  }

  /** Texto que sube y se desvanece («+3 tomates»). */
  flotante(texto: string, donde: THREE.Vector3 | LugarId | "yo") {
    const pos = donde === "yo" ? (this.enBus ? this.busJugador : this.jugador).position.clone().setY(SUELO + 10)
      : typeof donde === "string" ? nodo3(LUGARES[donde].nodo).setY(SUELO + 10) : donde.clone();
    const el = document.createElement("div");
    el.className = "flotante3d";
    el.innerHTML = texto;
    this.capaEtiquetas.append(el);
    this.flotantes.push({ el, pos, t: 0 });
  }

  posBancal(i: number) {
    return p3(BANCALES[i], SUELO + 5);
  }

  posBarca() {
    return this.barca.position.clone();
  }

  posDe(t: "cocina" | "barca" | "puesto") {
    return this.burbujas[t].pos.clone();
  }

  /* ── Personaje y cámara ─────────────────────────────────────────────── */

  set ropa(c: string) {
    (this.jugador.userData.cuerpo as THREE.Mesh).material = M.mat(c);
  }

  set piel(c: string) {
    (this.jugador.userData.cabeza as THREE.Mesh).material = M.mat(c);
  }

  colocar(nodo: string) {
    this.jugador.position.copy(nodo3(nodo));
    this.camino = [];
    this.objetivoCam.copy(this.jugador.position);
  }

  /** Recorre una lista de puntos (la forma real de las calles) y avisa al llegar. */
  andar(puntos: readonly Punto[], fin: () => void) {
    this.camino = puntos.slice(1).map((p) => p3(p));
    this.alLlegar = fin;
    this.ultimoArrastre = 0;
    this.destinoCam = null;
    if (!this.camino.length) {
      this.alLlegar = null;
      fin();
    }
  }

  get andando() {
    return this.camino.length > 0;
  }

  /** Acerca la cámara a un punto. `dist` es el zoom (menor = más cerca). */
  enfocar(p: THREE.Vector3, dist = 260) {
    this.altoMeta = Math.max(120, dist * 0.75);
    const despl = this.direccion().multiplyScalar(this.altoMeta * 0.12);
    this.foco = new THREE.Vector3(p.x - despl.x, SUELO, p.z - despl.z);
    this.destinoCam = null;
    this.ultimoArrastre = 0;
  }

  /** Al cerrar el panel, la cámara vuelve a seguir al personaje. */
  soltarFoco() {
    if (!this.foco) return;
    this.foco = null;
    this.altoMeta = 300;
  }

  centrarEn(lugar: LugarId) {
    this.destinoCam = nodo3(LUGARES[lugar].nodo);
    this.ultimoArrastre = 0;
  }

  /** Gira la cámara un cuarto de vuelta (+1 o −1). */
  girar(sentido: number) {
    this.giro += sentido;
  }

  /** Dirección horizontal hacia la que mira la cámara. */
  private direccion() {
    const a = Math.PI / 4 + this.giroActual * (Math.PI / 2);
    return new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
  }

  private ajustar() {
    const r = this.canvas.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.composer.setSize(r.width, r.height);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.camara.aspect = r.width / Math.max(1, r.height);
    this.proyeccion();
  }

  private proyeccion() {
    const r = this.canvas.getBoundingClientRect();
    this.camara.fov = this.camara.aspect > 1 ? 26 : 34;
    this.camara.updateProjectionMatrix();
    // Tamaño de la sombra por escalones: si cambiase con cada zoom, las sombras temblarían.
    const sc = this.sol.shadow.camera;
    const s = Math.min(650, 120 * Math.pow(1.25, Math.ceil(Math.log(Math.max(1, (this.alto * 0.85) / 120)) / Math.log(1.25))));
    if (sc.right !== s) {
      sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = 1; sc.far = 3000;
      sc.updateProjectionMatrix();
    }
    // Efecto maqueta: más desenfoque arriba y abajo cuanto más cerca.
    const k = this.alto < 400 ? 1.3 : this.alto < 900 ? 0.95 : 0.6;
    this.tiltH.uniforms.h.value = k / Math.max(1, r.width);
    this.tiltV.uniforms.v.value = k / Math.max(1, r.height);
  }

  private colocarCamara() {
    const a = Math.PI / 4 + this.giroActual * (Math.PI / 2) + this.demoAng;
    const el = THREE.MathUtils.degToRad(Math.min(64, 38 + (this.alto - 120) * 0.012));
    const d = this.alto;
    this.camara.position.set(
      this.objetivoCam.x + Math.sin(a) * Math.cos(el) * d,
      this.objetivoCam.y + Math.sin(el) * d,
      this.objetivoCam.z - Math.cos(a) * Math.cos(el) * d,
    );
    this.camara.lookAt(this.objetivoCam);
    // Planos de recorte ajustados a la distancia: mucha más precisión de profundidad.
    const cerca = Math.max(1, d * 0.05);
    const lejos = d * 9 + 2500;
    if (Math.abs(this.camara.near - cerca) > 0.01 || Math.abs(this.camara.far - lejos) > 1) {
      this.camara.near = cerca;
      this.camara.far = lejos;
      this.camara.updateProjectionMatrix();
    }
    const niebla = this.escena.fog as THREE.Fog;
    niebla.near = d * 2.2;
    niebla.far = d * 7 + 600;
    // Sol fijo (de sureste) y centrado en la cámara, pero encajado en la rejilla de
    // texels del mapa de sombras para que los bordes no tiemblen al moverse.
    const texel = (2 * this.sol.shadow.camera.right) / this.sol.shadow.mapSize.x;
    const base = new THREE.Matrix4().lookAt(DIR_SOL, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    const p = this.objetivoCam.clone().applyMatrix4(base.clone().transpose());
    p.x = Math.round(p.x / texel) * texel;
    p.y = Math.round(p.y / texel) * texel;
    p.applyMatrix4(base);
    this.sol.target.position.copy(p);
    this.sol.position.copy(p).addScaledVector(DIR_SOL, 900);
    this.sol.target.updateMatrixWorld();
  }

  /* ── Entrada: arrastrar, pellizcar, rueda y toque ───────────────────── */

  private alSuelo(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camara);
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.suelo, p) ? p : null;
  }

  private escuchar() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (ev) => {
      c.setPointerCapture(ev.pointerId);
      this.punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      this.toque = this.punteros.size === 1 ? { x: ev.clientX, y: ev.clientY, t: performance.now(), movido: false } : null;
      this.pellizco = null;
    });
    c.addEventListener("pointermove", (ev) => {
      const prev = this.punteros.get(ev.pointerId);
      if (!prev) return;
      const ahora = { x: ev.clientX, y: ev.clientY };
      this.punteros.set(ev.pointerId, ahora);
      if (this.punteros.size === 1) {
        if (this.toque && Math.hypot(ahora.x - this.toque.x, ahora.y - this.toque.y) > 8) this.toque.movido = true;
        if (!this.toque || this.toque.movido) {
          const a = this.alSuelo(prev.x, prev.y);
          const b = this.alSuelo(ahora.x, ahora.y);
          if (a && b) this.objetivoCam.sub(b.sub(a));
          this.limitar();
          this.ultimoArrastre = performance.now();
          this.destinoCam = null;
          this.foco = null;
        }
      } else if (this.punteros.size === 2) {
        const [p, q] = [...this.punteros.values()];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (this.pellizco) this.zoom(this.pellizco / d);
        this.pellizco = d;
        this.ultimoArrastre = performance.now();
      }
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
    c.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      this.zoom(Math.exp(ev.deltaY * 0.0012));
      this.ultimoArrastre = performance.now();
    }, { passive: false });
  }

  /** Lleva la cámara a un punto del mapa (coordenadas del mapa). */
  mirarA(x: number, y: number) {
    this.destinoCam = v3(x, y);
    this.ultimoArrastre = performance.now();
  }

  /** Acercamiento suave a una altura de cámara (entrada en partida). */
  volarA(alto: number) {
    this.altoMeta = Math.max(90, Math.min(2600, alto));
  }

  zoom(f: number) {
    this.altoMeta = null;
    this.alto = Math.max(90, Math.min(2600, this.alto * f));
    this.proyeccion();
  }

  private limitar() {
    this.objetivoCam.x = Math.max(-CX + 100, Math.min(1400, this.objetivoCam.x));
    this.objetivoCam.z = Math.max(-CY + 50, Math.min(1500, this.objetivoCam.z));
  }

  private tocar(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camara);
    const golpes = this.ray.intersectObjects(this.tocables.filter((o) => o.visible), true);
    for (const g of golpes) {
      let o: THREE.Object3D | null = g.object;
      while (o && !o.userData.tocable) o = o.parent;
      if (o && o.visible) {
        this.onTocar(o.userData.tocable as Tocable);
        return;
      }
    }
    const p = this.alSuelo(cx, cy);
    if (!p) return;
    let mejor: LugarId | null = null;
    let dMin = Math.max(20, this.alto * 0.05);
    for (const id of Object.keys(LUGARES) as LugarId[]) {
      const d = nodo3(LUGARES[id].nodo).distanceTo(p);
      if (d < dMin) {
        dMin = d;
        mejor = id;
      }
    }
    if (mejor) this.onTocar({ tipo: "lugar", id: mejor });
  }

  /* ── Sincronizar con la partida ─────────────────────────────────────── */

  sincronizar(e: Estado) {
    this.hora = horaDelDia(e);
    this.viento = e.viento;
    e.bancales.forEach((b, i) => {
      const prog = progresoCultivo(b);
      const etapa = prog >= 1 ? 3 : prog >= 0.5 ? 2 : prog >= 0.15 ? 1 : 0;
      const clave = b.cultivo ? `${b.cultivo}-${etapa}` : "";
      const pl = this.plantas[i];
      if (pl.clave !== clave) {
        pl.grupo.clear();
        if (b.cultivo) pl.grupo.add(M.planta(b.cultivo as CultivoId, prog));
        pl.clave = clave;
      }
      pl.grupo.userData.listo = listo(b);
    });
    this.humo.forEach((h) => (h.visible = e.cocina.length > 0));
    if (e.cocina.length && this.humo.length < 6) {
      for (let i = 0; i < 6; i++) {
        const h = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), M.mat("#FFFFFF", { transparent: true, opacity: 0.7 }));
        h.userData.fase = i / 6;
        this.humo.push(h);
        this.escena.add(h);
      }
    }
    this.burbuja("cocina", e.cocinaListos.length ? `Cocina · ${e.cocinaListos.length} ${e.cocinaListos.length === 1 ? "plato listo" : "platos listos"}` : e.cocina.length ? `Cocinando ${OBJETOS[e.cocina[0].receta].nombre.toLowerCase()}…` : "", !!e.cocinaListos.length);
    const fuera = barcaFuera(e);
    this.barca.userData.fuera = fuera;
    if (e.barca) this.barca.userData.prog = Math.min(1, 1 - (e.barca.vuelta - e.minuto) / SALIDAS[e.barca.salida].minutos);
    const botin = Object.keys(e.barcaBotin).length > 0;
    this.burbuja("barca", botin ? "Barca · ¡captura lista!" : fuera ? `Barca faenando · vuelve en ${Math.max(1, Math.ceil(e.barca!.vuelta - e.minuto))} min` : "", botin);
    const clave = e.flags.puesto ? e.puesto.map((c) => (c ? c.id : "-")).join(",") : "cerrado";
    if (clave !== this.clavePuesto) {
      this.cajasPuesto.clear();
      if (e.flags.puesto) {
        e.puesto.forEach((c, i) => {
          if (!c) return;
          const k = M.cajaProducto(OBJETOS[c.id].color);
          k.position.set(-5.4 + i * 3.6, 4, 0);
          this.cajasPuesto.add(k);
        });
      }
      this.clavePuesto = clave;
    }
    this.burbuja("puesto", e.cajaPuesto > 0 ? `Puesto 14 · ${e.cajaPuesto} € para cobrar` : "", e.cajaPuesto > 0);
    for (const [id, g] of this.npcs) g.visible = presente(e, id);
    for (const et of this.etiquetas) if (et.el.dataset.lugar) et.el.classList.toggle("meta", et.el.dataset.lugar === this.objetivo);
    for (const n of this.nieblas.values()) {
      const abierta = this.zonaAbierta(n.zona);
      n.mallas.forEach((m) => (m.visible = !abierta));
      n.rotulo.el.style.display = abierta ? "none" : "";
    }
  }

  private burbuja(k: "cocina" | "barca" | "puesto", texto: string, aviso: boolean) {
    const b = this.burbujas[k];
    if (b.el.textContent !== texto) b.el.textContent = texto;
    b.el.style.display = texto ? "" : "none";
    b.el.classList.toggle("aviso", aviso);
    b.el.onclick = () => this.onTocar({ tipo: k });
  }

  /* ── Fotograma ──────────────────────────────────────────────────────── */

  private tAvion = 25;

  private fotograma() {
    const dt = Math.min(0.12, this.reloj.getDelta());
    const t = this.reloj.elapsedTime;

    // Personaje andando por la forma real de las calles.
    if (this.camino.length) {
      let avance = 85 * dt;
      while (avance > 0 && this.camino.length) {
        const dest = this.camino[0];
        const d = Math.hypot(dest.x - this.jugador.position.x, dest.z - this.jugador.position.z);
        if (d > 0.01) this.jugador.rotation.y = Math.atan2(dest.x - this.jugador.position.x, dest.z - this.jugador.position.z);
        if (d <= avance) {
          this.jugador.position.set(dest.x, SUELO, dest.z);
          this.camino.shift();
          avance -= d;
        } else {
          const k = avance / d;
          this.jugador.position.x += (dest.x - this.jugador.position.x) * k;
          this.jugador.position.z += (dest.z - this.jugador.position.z) * k;
          avance = 0;
        }
      }
      this.jugador.position.y = SUELO + Math.abs(Math.sin(t * 16)) * 0.5;
      if (!this.camino.length) {
        this.jugador.position.y = SUELO;
        const f = this.alLlegar;
        this.alLlegar = null;
        f?.();
      }
    }

    // Viaje en autobús: el bus recorre las calles y la cámara lo sigue.
    if (this.rutaBus.length) {
      let avance = this.velBus * dt;
      while (avance > 0 && this.rutaBus.length) {
        const dest = this.rutaBus[0];
        const d = Math.hypot(dest.x - this.busJugador.position.x, dest.z - this.busJugador.position.z);
        if (d > 0.01) this.busJugador.rotation.y = Math.atan2(dest.x - this.busJugador.position.x, dest.z - this.busJugador.position.z);
        if (d <= avance) {
          this.busJugador.position.set(dest.x, SUELO + 0.3, dest.z);
          this.rutaBus.shift();
          avance -= d;
        } else {
          const k = avance / d;
          this.busJugador.position.x += (dest.x - this.busJugador.position.x) * k;
          this.busJugador.position.z += (dest.z - this.busJugador.position.z) * k;
          avance = 0;
        }
      }
      this.busJugador.position.y = SUELO + 0.3 + Math.abs(Math.sin(t * 9)) * 0.15;
      if (!this.rutaBus.length) {
        this.busJugador.visible = false;
        this.jugador.position.set(this.busJugador.position.x, SUELO, this.busJugador.position.z);
        this.jugador.visible = true;
        const f = this.alLlegar;
        this.alLlegar = null;
        f?.();
      }
    }

    // Tráfico, autobuses y peatones por las calles reales.
    const o = this.ayudante;
    this.coches.forEach((c, i) => {
      const p = this.avanzar(c, dt);
      o.position.set(p.x - CX, SUELO + 1, p.y - CY);
      o.rotation.set(0, p.rot, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      this.mallaCoches.setMatrixAt(i, o.matrix);
      o.position.y = SUELO + 2;
      o.translateZ(-0.3);
      o.updateMatrix();
      this.mallaCabinas.setMatrixAt(i, o.matrix);
    });
    this.peatones.forEach((c, i) => {
      const p = this.avanzar(c, dt);
      const paso = Math.abs(Math.sin(t * 8 + i)) * 0.25;
      o.position.set(p.x - CX, SUELO + 1.3 + paso, p.y - CY);
      o.rotation.set(0, p.rot, 0);
      o.updateMatrix();
      this.mallaPeatones.setMatrixAt(i, o.matrix);
      o.position.y = SUELO + 2.6 + paso;
      o.updateMatrix();
      this.mallaCabezas.setMatrixAt(i, o.matrix);
    });
    for (const m of [this.mallaCoches, this.mallaCabinas, this.mallaPeatones, this.mallaCabezas]) m.instanceMatrix.needsUpdate = true;
    for (const b of this.autobuses) {
      const p = this.avanzar(b.m, dt);
      b.g.position.set(p.x - CX, SUELO + 0.3, p.y - CY);
      b.g.rotation.y = p.rot;
    }
    for (const gv of this.gaviotas) {
      const ang = t * gv.v + gv.f;
      gv.g.position.set(gv.c.x + Math.cos(ang) * gv.r, gv.c.y + Math.sin(t * 0.7 + gv.f) * 2, gv.c.z + Math.sin(ang) * gv.r);
      gv.g.rotation.set(0, -ang, Math.sin(t * 1.3 + gv.f) * 0.2);
      const aleteo = Math.sin(t * 9 + gv.f) * 0.5;
      gv.g.children[0].rotation.z = aleteo;
      gv.g.children[1].rotation.z = -aleteo;
    }
    // Vecinos conectados: se deslizan hacia su última posición.
    for (const r of this.vecinos.values()) {
      const d = r.meta.clone().sub(r.g.position);
      if (d.length() > 0.3) r.g.rotation.y = Math.atan2(d.x, d.z);
      r.g.position.lerp(r.meta, 1 - Math.pow(0.05, dt));
      r.e.pos.copy(r.g.position).setY(SUELO + 9);
      r.emote.pos.copy(r.g.position).setY(SUELO + 13);
    }
    // Pantalla de inicio: sobrevuelo lento alrededor de la Plaza de la Iglesia.
    if (this.modoDemo) {
      this.demoAng += dt * 0.05;
      this.objetivoCam.lerp(p3(PLAZA), 1 - Math.pow(0.2, dt));
      this.jugador.visible = false;
    } else if (this.demoAng && !this.enBus) {
      this.demoAng = 0;
      this.jugador.visible = true;
    }

    // Giro y zoom suaves.
    this.giroActual += (this.giro - this.giroActual) * (1 - Math.pow(0.002, dt));
    if (this.altoMeta !== null) {
      this.alto += (this.altoMeta - this.alto) * (1 - Math.pow(0.03, dt));
      if (Math.abs(this.alto - this.altoMeta) < 0.5) this.altoMeta = null;
      this.proyeccion();
    }
    // La cámara sigue al personaje salvo que el jugador esté mirando el mapa.
    const libre = performance.now() - this.ultimoArrastre > 2500;
    const destino = this.modoDemo ? null : this.destinoCam ?? this.foco ?? (this.enBus ? this.busJugador.position : libre ? this.jugador.position : null);
    if (destino) {
      this.objetivoCam.lerp(new THREE.Vector3(destino.x, SUELO, destino.z), 1 - Math.pow(0.02, dt));
      if (this.destinoCam && this.objetivoCam.distanceTo(this.destinoCam) < 2) {
        this.destinoCam = null;
        this.ultimoArrastre = performance.now();
      }
    }
    this.colocarCamara();

    // Mar con oleaje (más fuerte con levante); el plano acompaña a la cámara.
    const fuerza = this.viento === "levanteFuerte" ? 1.6 : this.viento === "levante" ? 1 : this.viento === "calma" ? 0.25 : 0.55;
    this.mar.position.set(this.objetivoCam.x, 0, this.objetivoCam.z);
    const pos = this.mar.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = this.marBase[i * 3] + this.objetivoCam.x;
      const z = this.marBase[i * 3 + 2] + this.objetivoCam.z;
      pos.setY(i, Math.sin(x * 0.03 + t * 1.3) * fuerza + Math.cos(z * 0.035 + t) * fuerza * 0.7);
    }
    pos.needsUpdate = true;
    this.mar.geometry.computeVertexNormals();

    // Barca: zarpa, faena mar adentro y vuelve a la dársena.
    const muelle = p3(MUELLE_BARCA, 0.3);
    if (this.barca.userData.fuera) {
      const p = this.barca.userData.prog as number;
      const fuera = p3(MAR_ADENTRO, 0.3);
      const k = p < 0.85 ? Math.min(1, p / 0.15) : 1 - Math.max(0, (p - 0.85) / 0.15);
      this.barca.position.copy(muelle).lerp(fuera, k * k * (3 - 2 * k));
      this.barca.rotation.y = p < 0.85 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      this.barca.position.copy(muelle);
      this.barca.rotation.y = Math.PI / 2;
    }
    this.barca.position.y = 0.3 + Math.sin(t * 2) * 0.3 * fuerza;
    this.balanceo.forEach((o, i) => {
      o.rotation.z = Math.sin(t * 1.2 + i) * 0.03 * fuerza;
      o.position.y = 0.3 + Math.sin(t * 1.5 + i * 2) * 0.25 * fuerza;
    });

    for (const pl of this.plantas) pl.grupo.position.y = SUELO + (pl.grupo.userData.listo ? Math.abs(Math.sin(t * 4)) * 0.4 : 0);
    for (const h of this.humo) {
      const f = (t * 0.35 + (h.userData.fase as number)) % 1;
      h.position.copy(this.chimenea).add(new THREE.Vector3(Math.sin(f * 6) * 0.7, f * 8, f * 2));
      h.scale.setScalar(0.6 + f * 1.6);
      (h.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - f);
    }
    this.marcador.visible = !!this.objetivo;
    if (this.objetivo) {
      this.marcador.position.copy(nodo3(LUGARES[this.objetivo].nodo));
      this.marcador.children[0].position.y = 12 + Math.sin(t * 3) * 1.5;
      this.marcador.rotation.y = t;
    }
    // La nube del levante sobre el Peñón.
    const nube = this.viento === "levanteFuerte" ? 1.5 : this.viento === "levante" ? 1.1 : 0;
    this.nubePenon.visible = nube > 0;
    this.nubePenon.scale.setScalar(Math.max(0.01, nube) * 2.2);
    // Un avión aterriza en Gibraltar de vez en cuando.
    this.tAvion -= dt;
    if (this.tAvion < 0) {
      const f = Math.min(1, -this.tAvion / 14);
      this.avion.visible = true;
      this.avion.position.copy(v3(PISTA.x0 - 500 + f * (PISTA.x1 - PISTA.x0 + 500), PISTA.y, SUELO + Math.max(4, 140 * (1 - f * 1.5))));
      if (f >= 1) {
        this.avion.visible = false;
        this.tAvion = 70 + Math.random() * 60;
      }
    }
    for (const g of this.npcs.values()) g.scale.y = 0.58 + Math.sin(t * 2 + g.position.x) * 0.008;

    this.luz();
    this.composer.render(dt);
    this.moverEtiquetas(dt);
  }

  private luz() {
    const h = this.hora;
    const suave = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    // 0 de noche, 1 de día, con amanecer (6–8 h) y anochecer (19–21:30 h) graduales.
    const dia = suave(6, 8, h) * (1 - suave(19, 21.5, h));
    const atardecer = Math.max(0, 1 - Math.abs(h - 19.6) / 1.4) * (h > 12 ? 1 : 0) + Math.max(0, 1 - Math.abs(h - 7) / 1) * (h < 12 ? 0.6 : 0);
    const cielo = C_NOCHE.clone().lerp(C_DIA, dia).lerp(C_OCASO, atardecer * 0.55);
    (this.escena.background as THREE.Color).copy(cielo);
    (this.escena.fog as THREE.Fog).color.copy(cielo);
    this.sol.intensity = 0.5 + 2 * dia;
    this.sol.color.copy(C_SOL_NOCHE).lerp(C_SOL, dia).lerp(C_SOL_OCASO, atardecer * 0.7);
    this.cielo.intensity = 0.7 + 0.35 * dia;
    this.cielo.color.copy(C_HEMI_NOCHE).lerp(C_HEMI, dia);
    for (const f of this.faroles) (f as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + (1 - dia) * 2.2;
  }

  /**
   * Rótulos sobre el mundo, sin solaparse: se colocan por prioridad (objetivo,
   * lugares, vecinos, avisos, calles, zonas) y se descarta el que pisaría a otro.
   */
  private moverEtiquetas(dt: number) {
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    const a = this.alto;
    const prioridad = (c: DOMTokenList) =>
      c.contains("meta") ? 0 : c.contains("burbuja") ? 1 : c.contains("emote") ? 1 : c.contains("lugar") ? 2 : c.contains("vecino") ? 3 : c.contains("npc") ? 4 : c.contains("candado") ? 5 : c.contains("calle") ? 6 : 7;
    const ocupado: [number, number, number, number][] = [];
    // A igual prioridad, primero los que ya se veían: así no se turnan de un fotograma a otro.
    const orden = [...this.etiquetas].sort((x, y) => prioridad(x.el.classList) - prioridad(y.el.classList) || (y.el.style.visibility === "visible" ? 1 : 0) - (x.el.style.visibility === "visible" ? 1 : 0));
    for (const e of orden) {
      const c = e.el.classList;
      if (e.el.style.display === "none") continue;
      v.copy(e.pos).project(this.camara);
      let ocultar = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1
        || (c.contains("npc") && a > 420)
        || (c.contains("vecino") && a > 900)
        || (c.contains("calle") && (a < 110 || a > 330))
        || (c.contains("zona-lejos") && a < 1100)
        || (c.contains("candado") && a < 160)
        || this.modoDemo && !c.contains("zona-lejos");
      // Lejos, los lugares se quedan en icono.
      if (c.contains("lugar")) c.toggle("compacto", a > 650 && !c.contains("meta"));
      const x = ((v.x + 1) / 2) * r.width;
      const y = ((1 - v.y) / 2) * r.height;
      if (!ocultar) {
        if (!e.el.dataset.w) {
          e.el.style.visibility = "hidden";
          e.el.style.transform = "translate(-9999px,0)";
          e.el.dataset.w = String(e.el.offsetWidth || 80);
          e.el.dataset.h = String(e.el.offsetHeight || 20);
        }
        const w = c.contains("compacto") ? 34 : Number(e.el.dataset.w);
        const h = Number(e.el.dataset.h);
        const caja: [number, number, number, number] = [x - w / 2 - 3, y - h - 3, x + w / 2 + 3, y + 3];
        // Fuera de las franjas del HUD y del dock.
        if (!this.modoDemo && (caja[1] < 118 || caja[3] > r.height - 96) && !c.contains("meta")) ocultar = true;
        else if (ocupado.some((o) => caja[0] < o[2] && caja[2] > o[0] && caja[1] < o[3] && caja[3] > o[1])) ocultar = true;
        else ocupado.push(caja);
      }
      e.el.style.visibility = ocultar ? "hidden" : "visible";
      if (!ocultar) e.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
    for (let i = this.flotantes.length - 1; i >= 0; i--) {
      const f = this.flotantes[i];
      f.t += dt;
      v.copy(f.pos).add(new THREE.Vector3(0, f.t * 6, 0)).project(this.camara);
      f.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%) scale(${1 + Math.min(0.3, f.t)})`;
      f.el.style.opacity = String(Math.max(0, 1 - f.t / 1.8));
      if (f.t > 1.8) {
        f.el.remove();
        this.flotantes.splice(i, 1);
      }
    }
  }
}

/* ── Tráfico ────────────────────────────────────────────────────────── */

interface Movil {
  t: Tramo;
  dir: number;
  s: number;
  v: number;
  /** 1: carril derecho (coches); 0: acera (peatones). */
  lado: number;
  red: "coche" | "pie";
}

function adyacencia(filtro: (t: Tramo) => boolean) {
  const m = new Map<string, Tramo[]>();
  for (const t of TRAMOS) {
    if (!filtro(t)) continue;
    for (const n of [t.a, t.b]) {
      if (!m.has(n)) m.set(n, []);
      m.get(n)!.push(t);
    }
  }
  return m;
}
const ADY_COCHE = adyacencia((t) => t.clase <= 3);
const ADY_PIE = adyacencia((t) => t.clase <= 4 || t.clase === 6);

const longitudes = new WeakMap<Tramo, number[]>();
/** Punto a `s` unidades del inicio de un tramo, desplazado a un lado según el sentido. */
function sobreTramo(t: Tramo, s: number, dir: number, carril: number, acera: number) {
  let acc = longitudes.get(t);
  if (!acc) {
    acc = [0];
    for (let i = 1; i < t.puntos.length; i++) acc.push(acc[i - 1] + Math.hypot(t.puntos[i][0] - t.puntos[i - 1][0], t.puntos[i][1] - t.puntos[i - 1][1]));
    longitudes.set(t, acc);
  }
  let i = 1;
  while (i < acc.length - 1 && acc[i] < s) i++;
  const [a, b] = [t.puntos[i - 1], t.puntos[i]];
  const l = acc[i] - acc[i - 1] || 1;
  const k = (s - acc[i - 1]) / l;
  let dx = (b[0] - a[0]) / l;
  let dy = (b[1] - a[1]) / l;
  if (dir < 0) {
    dx = -dx;
    dy = -dy;
  }
  // Derecha del sentido de marcha (y crece hacia el sur): (−dy, dx).
  const off = carril || acera;
  return { x: a[0] + (b[0] - a[0]) * k - dy * off, y: a[1] + (b[1] - a[1]) * k + dx * off, rot: Math.atan2(dx, dy) };
}

/** Autobús urbano verde y blanco. */
function autobusUrbano() {
  const g = new THREE.Group();
  g.add(M.en(M.rcaja(3, 3.2, 10, "#FFFFFF", 0.7), 0, 2.4, 0));
  g.add(M.en(M.rcaja(3.1, 1, 10.1, "#2FA84A", 0.4), 0, 1.3, 0));
  g.add(M.en(M.rcaja(3.15, 1.1, 9.4, M.mat("#3B5B7E", { roughness: 0.2, metalness: 0.4 }), 0.3), 0, 3, 0));
  g.add(M.en(M.rcaja(3.15, 0.5, 2.2, "#2FA84A", 0.2), 0, 4.1, 3.6));
  for (const z of [-3.2, 3.2]) for (const x of [-1.5, 1.5]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 10), M.mat("#1C1D21"));
    r.rotation.z = Math.PI / 2;
    g.add(M.en(r, x, 0.7, z));
  }
  g.traverse((o) => (o.castShadow = true));
  return g;
}

/* ── utilidades de geometría ────────────────────────────────────────── */

/** Cinta plana a lo largo de una polilínea (calle), con ingletes en los giros. */
function cinta(pts: readonly Punto[], ancho: number, alto: number) {
  const n = pts.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const izq: [number, number][] = [];
  const der: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    let nx = -dy;
    let ny = dx;
    let k = ancho / 2;
    if (i > 0 && i < n - 1) {
      const d1x = pts[i][0] - pts[i - 1][0];
      const d1y = pts[i][1] - pts[i - 1][1];
      const l1 = Math.hypot(d1x, d1y) || 1;
      const cos = (-d1y / l1) * nx + (d1x / l1) * ny;
      k = Math.min(ancho * 1.5, ancho / 2 / Math.max(0.35, cos));
    }
    nx *= k;
    ny *= k;
    izq.push([pts[i][0] + nx, pts[i][1] + ny]);
    der.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  for (let i = 0; i < n - 1; i++) {
    // Orden de vértices con la cara hacia arriba (si no, la cámara descarta la calle).
    for (const [x, y] of [izq[i], der[i + 1], der[i], izq[i], izq[i + 1], der[i + 1]]) {
      pos.push(x - CX, SUELO + alto, y - CY);
      uv.push(x / 12, y / 12);
      nor.push(0, 1, 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** Rayas discontinuas en el eje de una vía principal. */
function rayas(pts: readonly Punto[], alto: number) {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 4; s < l - 4; s += 14) {
      const g = new THREE.PlaneGeometry(5, 0.6);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0]));
      g.translate(a[0] + ((b[0] - a[0]) * s) / l - CX, SUELO + alto, a[1] + ((b[1] - a[1]) * s) / l - CY);
      out.push(g.toNonIndexed());
    }
  }
  return out;
}

function dentroPoli(p: Punto, r: readonly Punto[]) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if (r[i][1] > p[1] !== r[j][1] > p[1] && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  }
  return c;
}

/** Escala las UV (ExtrudeGeometry/ShapeGeometry las ponen en unidades del mundo). */
function escalarUV(geo: THREE.BufferGeometry, k: number) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  uv.needsUpdate = true;
}
