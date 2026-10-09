import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BARRIOS, CALLES, GIBRALTAR, LUGARES, NODOS, PISTA, TIERRA, TRAMOS, type LugarId, type Punto } from "../datos/mapa";
import { OBJETOS, SALIDAS, type CultivoId } from "../datos/objetos";
import { PERSONAJES, type PersonajeId } from "../datos/personajes";
import { barcaFuera, horaDelDia, listo, progresoCultivo, type Estado } from "../estado";
import { presente } from "../historia";
import { iconoSvg } from "../iconos";
import * as M from "./modelos";
import * as T from "./texturas";

/**
 * La Línea en 3D con estilo Hay Day. Coordenadas del mapa (x, y) → mundo 3D
 * (X = x − 500, Z = y − 800), Y hacia arriba. La cámara mira desde el norte
 * hacia el sur, así que el Peñón queda siempre al fondo, como desde la ciudad.
 */

export type Tocable =
  | { tipo: "lugar"; id: LugarId }
  | { tipo: "bancal"; i: number }
  | { tipo: "npc"; id: PersonajeId }
  | { tipo: "cocina" }
  | { tipo: "barca" }
  | { tipo: "puesto" }
  | { tipo: "tablon" };

const SUELO = 3;
const v3 = (x: number, y2: number, alto = SUELO) => new THREE.Vector3(x - 500, alto, y2 - 800);
const nodo3 = (n: string) => v3(NODOS[n][0], NODOS[n][1]);

/** Dónde va cada edificio (al lado de su calle, sin pisarla). */
const EDIFICIO = {
  casa: [418, 1020],
  iglesia: [466, 1232],
  mercado: [516, 1148],
  bar: [562, 1214],
  redaccion: [420, 1170],
  frontera: [552, 1486],
  santaBarbara: [786, 1290],
  estadio: [766, 1360],
  estacion: [480, 1346],
  lonja: [826, 690],
  chamizo: [690, 352],
} as const satisfies Record<string, Punto>;

const POS_NPC: Record<PersonajeId, Punto> = {
  carmen: [404, 1004],
  lola: [556, 1228],
  juani: [500, 1180],
  antonio: [884, 662],
  rafa: [672, 372],
  marta: [436, 1186],
  andres: [528, 1466],
};

/** Bancales de la abuela: parcelas cercadas en los huertos del Zabal (3 × 2). */
const BANCALES: Punto[] = [[600, 402], [622, 402], [644, 402], [600, 426], [622, 426], [644, 426]];
const PUESTO: Punto = [494, 1166];
const TABLON: Punto = [500, 1202];
const MUELLE_BARCA: Punto = [935, 676];
const MAR_ADENTRO: Punto = [1260, 600];
/** Plaza de la Iglesia: adoquinada, peatonal. */
const PLAZA: Punto[] = [[440, 1186], [522, 1186], [522, 1252], [440, 1252]];
/** Parques: Princesa Sofía, Paseo de la Velada y Jardines Municipales. */
const PARQUES: Punto[][] = [
  [[596, 1322], [692, 1322], [692, 1442], [596, 1442]],
  [[533, 1066], [578, 1066], [578, 1108], [533, 1108]],
  [[444, 1268], [490, 1268], [490, 1302], [444, 1302]],
];

interface Etiqueta {
  el: HTMLElement;
  pos: THREE.Vector3;
  siempre?: boolean;
}

/** Generador pseudoaleatorio con semilla: la ciudad sale siempre igual. */
function azar(semilla: number) {
  let s = semilla;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const distSeg = (p: Punto, a: Punto, b: Punto) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};

const dentro = (p: Punto, poli: readonly Punto[]) => {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

/** Zonas sin casas generadas (edificios propios, plaza, parques, puerto, huertos…). */
const LIBRES: [number, number, number, number][] = [
  [400, 270, 960, 520], // huertos y polígono del Zabal (se rellenan aparte)
  [430, 1180, 530, 1258], // plaza de la Iglesia
  [490, 1128, 545, 1172], // mercado
  [540, 1195, 585, 1232], // bar de Lola
  [395, 1150, 448, 1188], // redacción
  [398, 998, 442, 1046], // casa de la abuela
  [790, 600, 960, 760], // puerto de La Atunara
  [800, 640, 830, 720], // lonja
  [590, 1318, 810, 1480], // parque Princesa Sofía, estadio y ciudad deportiva
  [760, 1262, 812, 1312], // fuerte de Santa Bárbara
  [455, 1328, 520, 1368], // estación
  [500, 1450, 620, 1506], // frontera
  [530, 1062, 582, 1112], // paseo de la Velada
  [440, 1262, 494, 1306], // jardines municipales
];

export class Mundo {
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(38, 1, 5, 7000);
  private sol = new THREE.DirectionalLight("#FFF1D6", 2.8);
  private cielo = new THREE.HemisphereLight("#E3F1FF", "#7DB24A", 1.15);
  private mar!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private marBase!: Float32Array;
  private objetivoCam = new THREE.Vector3();
  private destinoCam: THREE.Vector3 | null = null;
  private foco: THREE.Vector3 | null = null;
  private distancia = 520;
  /** Zoom al que se acerca la cámara al enfocar algo (null: libre). */
  private distanciaMeta: number | null = null;
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
  private faroles: THREE.Mesh[] = [];
  private balanceo: THREE.Object3D[] = [];
  private burbujas: Record<"cocina" | "barca" | "puesto", Etiqueta>;
  private reloj = new THREE.Clock();
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

  constructor(private canvas: HTMLCanvasElement, private capaEtiquetas: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.escena.background = new THREE.Color("#A9D8FF");
    this.escena.fog = new THREE.Fog("#A9D8FF", 1100, 3200);

    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    const sc = this.sol.shadow.camera;
    sc.left = -240; sc.right = 240; sc.top = 240; sc.bottom = -240; sc.near = 10; sc.far = 1400;
    this.sol.shadow.bias = -0.0006;
    this.sol.shadow.normalBias = 0.6;
    this.escena.add(this.sol, this.sol.target, this.cielo);

    this.construirTerreno();
    this.construirCalles();
    this.construirCiudad();
    this.construirZabal();
    this.construirAtunara();
    this.construirLugares();
    this.jugador = M.persona("#E8B796", "#C4E910", "#2B1B12", 1.6);
    this.escena.add(this.jugador);
    this.marcador = this.crearMarcador();
    this.escena.add(this.marcador);
    this.nubePenon = M.nube(1.5);
    this.nubePenon.position.copy(v3(640, 1800, 215));
    this.escena.add(this.nubePenon);
    this.avion = M.avion();
    this.avion.visible = false;
    this.escena.add(this.avion);
    this.burbujas = {
      cocina: this.etiqueta("burbuja", "", v3(EDIFICIO.casa[0], EDIFICIO.casa[1], 36), true),
      barca: this.etiqueta("burbuja", "", v3(...MUELLE_BARCA, 24), true),
      puesto: this.etiqueta("burbuja", "", v3(...PUESTO, 22), true),
    };

    new ResizeObserver(() => this.ajustar()).observe(canvas);
    this.ajustar();
    this.escuchar();
    this.renderer.setAnimationLoop(() => this.fotograma());
  }

  /* ── Construcción ───────────────────────────────────────────────────── */

  private construirTerreno() {
    // Mar turquesa con oleaje suave.
    const geo = new THREE.PlaneGeometry(5200, 5200, 80, 80);
    geo.rotateX(-Math.PI / 2);
    this.marBase = Float32Array.from(geo.attributes.position.array as Float32Array);
    this.mar = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#2C9BE3", roughness: 0.22, metalness: 0.08, flatShading: true }));
    this.mar.position.set(0, 0, 600);
    this.mar.receiveShadow = true;
    this.escena.add(this.mar);

    // Tierra: césped, con la ciudad adoquinada encima.
    this.escena.add(this.losa(TIERRA, M.matTex(T.cesped(), 1, 1), "#B89A63", 6));
    this.escena.add(this.losa(GIBRALTAR, M.matTex(T.cesped(), 1, 1, "#C9DDB0"), "#B89A63", 6, 2.6));
    const urbano: Punto[] = [[200, 770], [860, 760], [840, 900], [822, 1200], [806, 1446], [560, 1450], [440, 1440], [372, 1300], [300, 1215], [200, 1160], [120, 1080], [150, 960]];
    this.escena.add(this.lamina(urbano, M.matTex(T.acera(), 1, 1, "#F3EBDD"), SUELO + 0.08, 1 / 22));

    // Playas: Levante ancha y oscura, Poniente más estrecha.
    for (let i = 2; i < TIERRA.length - 1; i++) {
      const p = TIERRA[i];
      const q = TIERRA[i + 1];
      if (p[1] >= 1479 && q[1] >= 1479) continue;
      const este = p[0] > 600;
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const l = Math.hypot(dx, dy);
      const ancho = este ? 30 : 16;
      const n: Punto = [(-dy / l) * ancho, (dx / l) * ancho];
      const f: Punto = [(dy / l) * 7, (-dx / l) * 7];
      this.escena.add(this.lamina([p, q, [q[0] + n[0], q[1] + n[1]], [p[0] + n[0], p[1] + n[1]]], M.matTex(T.arena(), 1, 1, este ? "#E5CF9C" : "#F2DFAE"), SUELO + 0.15, 1 / 20));
      // Espuma en la orilla.
      const espuma = this.lamina([p, q, [q[0] + f[0], q[1] + f[1]], [p[0] + f[0], p[1] + f[1]]], M.mat("#FFFFFF", { transparent: true, opacity: 0.55 }), 0.9);
      espuma.receiveShadow = false;
      this.escena.add(espuma);
    }

    // Peñón: relieve con la cara norte vertical.
    this.escena.add(this.penon());
    // Aeropuerto de Gibraltar: la pista cruza el istmo y entra en la bahía.
    const pista = M.rcaja(PISTA.x1 - PISTA.x0, 2.4, PISTA.ancho, M.matTex(T.asfalto(), 20, 1), 0.6);
    pista.position.copy(v3((PISTA.x0 + PISTA.x1) / 2, PISTA.y, 1.8));
    this.escena.add(pista);
    for (let x = PISTA.x0 + 12; x < PISTA.x1 - 10; x += 30) {
      const raya = M.caja(14, 0.3, 1.4, "#FFFFFF");
      raya.position.copy(v3(x, PISTA.y, 3.1));
      this.escena.add(raya);
    }
    this.escena.add(this.lamina([[350, 1512], [800, 1512], [798, 1670], [330, 1670]], M.matTex(T.asfalto(), 1, 1, "#C9CDD4"), 2.75, 1 / 40));
    const rg = azar(29);
    for (let i = 0; i < 46; i++) {
      const x = 320 + rg() * 200;
      const y = 1690 + rg() * 380;
      if (x > 470 && y < 1780) continue;
      const alto = 10 + rg() * 26;
      const ed = M.rcaja(14 + rg() * 8, alto, 12 + rg() * 6, ["#F3E6CF", "#E9EEF3", "#F1D6C6", "#FFFFFF"][i % 4], 0.6);
      ed.position.copy(v3(x, y, 2.6 + alto / 2));
      this.escena.add(ed);
    }
    const terminal = M.rcaja(70, 12, 22, "#EEF1F6", 1);
    terminal.position.copy(v3(600, 1565, SUELO + 6));
    this.escena.add(terminal);
    // La Verja: valla a lo largo de la frontera.
    for (let x = 350; x < 806; x += 10) {
      if (Math.abs(x - 552) < 22) continue;
      const poste = M.caja(0.6, 7, 0.6, "#4E5563");
      poste.position.copy(v3(x, 1507, SUELO + 3.5));
      this.escena.add(poste);
    }
    for (const [a, b] of [[350, 530], [574, 806]]) {
      const malla = M.caja(b - a, 5.4, 0.3, "#9AA2B2", { transparent: true, opacity: 0.5 });
      malla.position.copy(v3((a + b) / 2, 1507, SUELO + 3.6));
      this.escena.add(malla);
    }
    // Mercantes fondeados en la bahía.
    for (const [x, y, c] of [[90, 1240, "#C8623E"], [150, 1380, "#1F5EFF"], [-20, 1300, "#2B2D31"], [40, 1150, "#2E7D35"]] as const) {
      const buque = new THREE.Group();
      buque.add(M.en(M.rcaja(18, 9, 90, c, 2), 0, 4, 0));
      buque.add(M.en(M.rcaja(16, 12, 16, "#FFFFFF", 1.5), 0, 14, 32));
      for (let k = 0; k < 4; k++) buque.add(M.en(M.rcaja(12, 5, 12, ["#E84B3C", "#2F6DB5", "#F2C230", "#3FA046"][k], 0.5), 0, 11, -28 + k * 14));
      buque.position.copy(v3(x, y, 0));
      buque.rotation.y = 0.6;
      this.balanceo.push(buque);
      this.escena.add(buque);
    }
  }

  /** Losa extruida (tierra) a partir de un polígono del mapa. */
  private losa(p: readonly Punto[], arriba: THREE.Material, lado: string, fondo: number, alto = SUELO) {
    const forma = new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x - 500, y - 800)));
    const geo = new THREE.ExtrudeGeometry(forma, { depth: fondo + alto, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    escalarUV(geo, 1 / 40);
    const m = new THREE.Mesh(geo, [arriba, M.mat(lado)]);
    (arriba as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    m.position.y = alto;
    m.receiveShadow = true;
    return m;
  }

  /** Lámina plana sobre el suelo (arena, adoquines, campos). */
  private lamina(p: readonly Punto[], material: THREE.Material, alto: number, escalaUV = 1 / 30) {
    const forma = new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x - 500, y - 800)));
    const geo = new THREE.ShapeGeometry(forma);
    geo.rotateX(Math.PI / 2);
    escalarUV(geo, escalaUV);
    (material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    const m = new THREE.Mesh(geo, material);
    m.position.y = alto;
    m.receiveShadow = true;
    return m;
  }

  private penon() {
    const ancho = 420;
    const largo = 640;
    const geo = new THREE.PlaneGeometry(ancho, largo, 36, 56);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cx = 640;
    const y0 = 1690;
    const suave = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx;
      const y = pos.getZ(i) + y0 + largo / 2;
      const cresta = cx + (y - 1760) * 0.1;
      const lado = x < cresta ? 0.72 : 1.3;
      const a = ((x - cresta) / 70) * lado;
      const perfil = 165 + 28 * Math.sin((y - 1740) / 90) + 9 * Math.sin(x * 0.13 + y * 0.09);
      const h = perfil * Math.exp(-a * a * 1.25) * suave(1708, 1736, y) * (1 - suave(2150, 2320, y));
      pos.setY(i, 2 + h);
    }
    const plano = geo.toNonIndexed();
    plano.computeVertexNormals();
    // Color por cara: caliza en lo alto y en lo vertical, monte verde en las laderas.
    const n = plano.attributes.normal;
    const p2 = plano.attributes.position;
    const colores: number[] = [];
    const caliza = new THREE.Color("#E3DED1");
    const monte = new THREE.Color("#6FA052");
    for (let i = 0; i < p2.count; i += 3) {
      const ny = (n.getY(i) + n.getY(i + 1) + n.getY(i + 2)) / 3;
      const hy = (p2.getY(i) + p2.getY(i + 1) + p2.getY(i + 2)) / 3;
      const c = ny > 0.55 && hy < 150 && hy > 12 ? monte : caliza.clone().multiplyScalar(0.86 + ((i * 7919) % 13) / 100);
      for (let k = 0; k < 3; k++) colores.push(c.r, c.g, c.b);
    }
    plano.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
    const m = new THREE.Mesh(plano, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    m.position.set(cx - 500, 0, y0 + largo / 2 - 800);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  private construirCalles() {
    // Todas las calles, bordillos y rayas en tres mallas fusionadas (rápido en móvil).
    const asfalto: THREE.BufferGeometry[] = [];
    const aceras: THREE.BufferGeometry[] = [];
    const rayas: THREE.BufferGeometry[] = [];
    const o = new THREE.Object3D();
    const meter = (lista: THREE.BufferGeometry[], geo: THREE.BufferGeometry) => {
      o.updateMatrix();
      lista.push(geo.applyMatrix4(o.matrix));
    };
    for (const [a, b, , principal] of TRAMOS) {
      const p = nodo3(a);
      const q = nodo3(b);
      const ancho = principal ? 14 : 9;
      const largo = p.distanceTo(q);
      const rot = -Math.atan2(q.z - p.z, q.x - p.x);
      const centro = p.clone().add(q).multiplyScalar(0.5);
      o.position.copy(centro).setY(SUELO + 0.25);
      o.rotation.set(0, rot, 0);
      o.scale.set(1, 1, 1);
      meter(asfalto, new THREE.BoxGeometry(largo, 0.5, ancho));
      for (const lado of [-1, 1]) {
        o.position.copy(centro).setY(SUELO + 0.4);
        o.rotation.set(0, rot, 0);
        o.translateZ(lado * (ancho / 2 + 1.4));
        meter(aceras, new THREE.BoxGeometry(largo + 2, 0.8, 2.8));
      }
      if (principal && largo > 40) {
        for (let t = 0.1; t < 0.92; t += 24 / largo) {
          o.position.copy(p.clone().lerp(q, t)).setY(SUELO + 0.52);
          o.rotation.set(0, rot, 0);
          meter(rayas, new THREE.BoxGeometry(6, 0.1, 0.8));
        }
        for (let t = 0.25; t < 0.9; t += 80 / largo) {
          const f = M.farola();
          f.position.copy(p.clone().lerp(q, t)).setY(SUELO);
          f.rotation.y = rot;
          f.translateZ(ancho / 2 + 3.4);
          this.registrarFaroles(f);
          this.escena.add(f);
        }
      }
    }
    for (const n of Object.keys(NODOS)) {
      o.position.copy(nodo3(n)).setY(SUELO + 0.26);
      o.rotation.set(0, 0, 0);
      meter(asfalto, new THREE.CylinderGeometry(7.5, 7.5, 0.52, 16));
    }
    const fundir = (lista: THREE.BufferGeometry[], material: THREE.Material, sombras = true) => {
      const geo = mergeGeometries(lista.map((g) => g.toNonIndexed()));
      const m = new THREE.Mesh(geo, material);
      m.receiveShadow = sombras;
      this.escena.add(m);
    };
    fundir(asfalto, M.matTex(T.asfalto(), 1, 1));
    fundir(aceras, M.mat("#F4EEE2"));
    fundir(rayas, M.mat("#FFFFFF"), false);
  }

  private registrarFaroles(o: THREE.Object3D) {
    o.traverse((c) => {
      if (c.userData.farol) this.faroles.push(c as THREE.Mesh);
    });
  }

  /** Casas encaladas, bloques y árboles a lo largo de las calles. */
  private construirCiudad() {
    const segs = TRAMOS.map(([a, b]) => [NODOS[a], NODOS[b]] as const);
    const rand = azar(7);
    type Casa = { x: number; y: number; w: number; d: number; h: number; teja: boolean; bloque: number; tipo: number; rot: number };
    const casas: Casa[] = [];
    const arboles: Punto[] = [];
    for (let y = 120; y < 1460; y += 22) {
      for (let x = 160; x < 900; x += 22) {
        const p: Punto = [x + (rand() - 0.5) * 6, y + (rand() - 0.5) * 6];
        if (!dentro(p, TIERRA)) continue;
        if (LIBRES.some(([a, b, c, d]) => p[0] > a && p[0] < c && p[1] > b && p[1] < d)) continue;
        let dCosta = Infinity;
        for (let i = 0; i < TIERRA.length; i++) dCosta = Math.min(dCosta, distSeg(p, TIERRA[i], TIERRA[(i + 1) % TIERRA.length]));
        if (dCosta < 48) continue;
        let dCalle = Infinity;
        for (const [a, b] of segs) dCalle = Math.min(dCalle, distSeg(p, a, b));
        if (dCalle < 17) continue;
        const centro = dentro(p, BARRIOS.centro.zona) || dentro(p, BARRIOS.sanBernardo.zona);
        const enZabal = p[1] < 620;
        if (dCalle > (centro ? 140 : enZabal ? 45 : 90)) {
          if (rand() < 0.06) arboles.push(p);
          continue;
        }
        if (enZabal && rand() < 0.45) {
          if (rand() < 0.4) arboles.push(p);
          continue;
        }
        if (rand() < 0.07) {
          arboles.push(p);
          continue;
        }
        const bloque = !enZabal && rand() < (centro ? 0.2 : 0.12) ? 3 + Math.floor(rand() * 5) : 0;
        casas.push({
          x: p[0], y: p[1],
          w: bloque ? 17 : 12 + rand() * 5, d: bloque ? 14 : 11 + rand() * 3,
          h: bloque ? bloque * 4.5 : 8 + rand() * (centro ? 6 : 3),
          teja: !bloque && rand() < 0.5, bloque,
          tipo: Math.floor(rand() * 3),
          rot: rand() < 0.75 ? 0 : Math.PI / 2,
        });
      }
    }
    const o = new THREE.Object3D();
    const caja = new RoundedBoxGeometry(1, 1, 1, 2, 0.06);
    // Casas bajas: tres fachadas (persianas verdes, azules y marrones).
    const persianas: T.Persiana[] = ["verde", "azul", "marron"];
    persianas.forEach((ps, tipo) => {
      const lista = casas.filter((c) => !c.bloque && c.tipo === tipo);
      const muros = new THREE.InstancedMesh(caja, M.matTex(T.fachada(ps)), lista.length);
      lista.forEach((c, i) => {
        o.position.copy(v3(c.x, c.y, SUELO + c.h / 2));
        o.rotation.set(0, c.rot, 0);
        o.scale.set(c.w, c.h, c.d);
        o.updateMatrix();
        muros.setMatrixAt(i, o.matrix);
      });
      this.instanciado(muros);
    });
    // Bloques de pisos por altura.
    const tonos = ["#F3E6CF", "#EBD5CC", "#DDE7F0", "#F1E2B8"];
    for (let plantas = 3; plantas <= 7; plantas++) {
      const lista = casas.filter((c) => c.bloque === plantas);
      if (!lista.length) continue;
      tonos.forEach((tono, k) => {
        const sub = lista.filter((_, i) => i % 4 === k);
        if (!sub.length) return;
        const im = new THREE.InstancedMesh(caja, M.matTex(T.fachadaBloque(tono), 1, plantas), sub.length);
        sub.forEach((c, i) => {
          o.position.copy(v3(c.x, c.y, SUELO + c.h / 2));
          o.rotation.set(0, c.rot, 0);
          o.scale.set(c.w, c.h, c.d);
          o.updateMatrix();
          im.setMatrixAt(i, o.matrix);
        });
        this.instanciado(im);
      });
    }
    // Tejados de teja y azoteas.
    const conTeja = casas.filter((c) => c.teja);
    const forma = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.5)]);
    const prisma = new THREE.ExtrudeGeometry(forma, { depth: 1, bevelEnabled: false });
    prisma.translate(0, 0, -0.5);
    const tejas = new THREE.InstancedMesh(prisma, M.matTex(T.teja(), 1, 1), conTeja.length);
    conTeja.forEach((c, i) => {
      o.position.copy(v3(c.x, c.y, SUELO + c.h - 0.05));
      o.rotation.set(0, c.rot, 0);
      o.scale.set(c.w + 1.6, 9, c.d + 1.6);
      o.updateMatrix();
      tejas.setMatrixAt(i, o.matrix);
    });
    this.instanciado(tejas);
    const planas = casas.filter((c) => !c.teja);
    const azoteas = new THREE.InstancedMesh(caja, M.mat("#EFE6D3"), planas.length);
    planas.forEach((c, i) => {
      o.position.copy(v3(c.x, c.y, SUELO + c.h + 0.5));
      o.rotation.set(0, c.rot, 0);
      o.scale.set(c.w + 0.8, 1.2, c.d + 0.8);
      o.updateMatrix();
      azoteas.setMatrixAt(i, o.matrix);
    });
    this.instanciado(azoteas);
    // Árboles frondosos por los barrios y palmeras en las avenidas.
    for (const s of segs) {
      const largo = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
      if (largo < 120 || rand() < 0.4) continue;
      for (let t = 0.15; t < 0.9; t += 45 / largo) {
        const nx = -(s[1][1] - s[0][1]) / largo;
        const ny = (s[1][0] - s[0][0]) / largo;
        arboles.push([s[0][0] + (s[1][0] - s[0][0]) * t + nx * 12, s[0][1] + (s[1][1] - s[0][1]) * t + ny * 12]);
      }
    }
    this.bosque(arboles, rand, false);
  }

  private instanciado(im: THREE.InstancedMesh) {
    im.castShadow = true;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    this.escena.add(im);
  }

  /** Árboles instanciados: frondosos (ciudad) o pinos piñoneros (Zabal). */
  private bosque(puntos: Punto[], rand: () => number, pinos: boolean) {
    const n = puntos.length;
    if (!n) return;
    const o = new THREE.Object3D();
    const troncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 1.2, 1, 7), M.mat("#7A4E2D"), n);
    const bolas = pinos ? 4 : 5;
    const copas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), M.mat("#FFFFFF"), n * bolas);
    const verdes = (pinos ? ["#2F6B34", "#3A7A3B", "#285C2E"] : ["#5DB33C", "#8ED14F", "#3E9B45", "#2F8A3A", "#79C447"]).map((c) => new THREE.Color(c));
    let k = 0;
    puntos.forEach((p, i) => {
      const esc = 0.8 + rand() * 0.5;
      const alto = (pinos ? 14 : 7) * esc;
      o.position.copy(v3(p[0], p[1], SUELO + alto / 2));
      o.rotation.set(0, 0, 0);
      o.scale.set(esc, alto, esc);
      o.updateMatrix();
      troncos.setMatrixAt(i, o.matrix);
      for (let b = 0; b < bolas; b++) {
        const a = (b / bolas) * Math.PI * 2 + rand();
        const r = (pinos ? [6, 4.2, 4, 3.8] : [4.6, 3.4, 3.5, 3.2, 3])[b] * esc;
        const off = b === 0 ? 0 : (pinos ? 4.2 : 2.8) * esc;
        o.position.copy(v3(p[0] + Math.cos(a) * off, p[1] + Math.sin(a) * off, SUELO + alto + (pinos ? 0.5 : b === 0 ? 2.5 : 1 + rand() * 3) * esc));
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

  /** El Zabal: polígono, huertos cercados con caseta, piscinas y pinares. */
  private construirZabal() {
    const rand = azar(19);
    // Polígono industrial al oeste de la carretera.
    for (let i = 0; i < 7; i++) {
      const nave = new THREE.Group();
      const w = 34 + rand() * 20;
      const d = 22 + rand() * 12;
      nave.add(M.en(M.rcaja(w, 10, d, "#E9ECF1", 0.8), 0, 5, 0));
      nave.add(M.en(M.rcaja(w + 1, 1.4, d + 1, i % 2 ? "#2F6DB5" : "#B9C1CC", 0.5), 0, 10.4, 0));
      nave.add(M.en(M.rcaja(8, 7, 0.6, "#8C96A4", 0.2), 0, 3.5, -d / 2 - 0.2));
      nave.position.copy(v3(440 + (i % 2) * 60, 300 + Math.floor(i / 2) * 55, SUELO));
      this.escena.add(nave);
    }
    // Huertos vecinos: rejilla de parcelas cercadas.
    const tuyas = new Set(BANCALES.map(([x, y]) => `${x},${y}`));
    for (let fx = 0; fx < 13; fx++) {
      for (let fy = 0; fy < 6; fy++) {
        const x = 578 + fx * 22;
        const y = 402 + fy * 24 - (fy >= 2 ? 0 : 0) - (fx > 3 ? 0 : 0);
        if (tuyas.has(`${x},${y}`) || (fx < 3 && fy < 2)) continue;
        if (y > 520 || x > 860) continue;
        const r = rand();
        const suelo = r < 0.4 ? M.matTex(T.cesped(), 0.4, 0.4, "#9FD36A") : r < 0.75 ? M.matTex(T.tierraArada(), 1.2, 1.2) : M.mat("#C9A77A");
        const p = M.parcela(19, 21, suelo, false);
        p.position.copy(v3(x + 22, y, SUELO));
        if (r > 0.55 && r < 0.75) p.add(M.en(M.planta(rand() < 0.5 ? "tomate" : "pimiento", 1), 0, 0.4, 2));
        if (rand() < 0.45) p.add(M.en(M.casetaHuerto(rand() < 0.4), 5, 0.6, -5));
        if (rand() < 0.15) p.add(M.en(M.piscina(), -4, 0.6, 4));
        if (rand() < 0.3) p.add(M.en(M.arbol(0.55, 1), -6, 0.6, -6));
        this.escena.add(p);
      }
    }
    // Caminos de tierra.
    for (const [x0, y0, x1, y1] of [[566, 300, 576, 540], [566, 390, 880, 392], [700, 300, 708, 530]] as const) {
      this.escena.add(this.lamina([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([a, b], i) => (i % 3 === 0 ? [a, b] : [a, b])) as Punto[], M.mat("#C9A77A"), SUELO + 0.06));
    }
    // Pinares alrededor (como en las fotos del Zabal).
    const pinos: Punto[] = [];
    for (let i = 0; i < 140; i++) {
      const p: Punto = [380 + rand() * 560, 120 + rand() * 520];
      if (!dentro(p, TIERRA)) continue;
      if (p[0] > 560 && p[0] < 880 && p[1] > 280 && p[1] < 540) continue;
      if (p[0] > 410 && p[0] < 540 && p[1] > 270 && p[1] < 500) continue;
      if (Math.abs(p[0] - 525) < 16) continue;
      pinos.push(p);
    }
    for (let i = 0; i < 60; i++) pinos.push([600 + rand() * 280, 270 + rand() * 20]);
    this.bosque(pinos, rand, true);
  }

  /** La Atunara: escollera, dársena, muelle con barcas, casetas y lonja. */
  private construirAtunara() {
    const rand = azar(23);
    // Escollera norte que abraza la dársena y espigón sur.
    this.escena.add(M.escollera([v3(900, 590, 0), v3(960, 588, 0), v3(1010, 612, 0), v3(1036, 660, 0), v3(1030, 712, 0)]));
    this.escena.add(M.escollera([v3(898, 760, 0), v3(950, 748, 0)]));
    // Muelle de hormigón donde amarran las barcas.
    const muelle = M.muelle(64, 18);
    muelle.position.copy(v3(898, 690, 0));
    muelle.rotation.y = Math.PI / 2;
    this.escena.add(muelle);
    const colores = [M.PALETA.rojo, M.PALETA.rojo, "#2E78D8", M.PALETA.rojo, "#2FA84A", M.PALETA.rojo, "#F2B705"];
    for (let i = 0; i < 7; i++) {
      const b = M.barca(colores[i]);
      b.position.copy(v3(912 + i * 7.5, 708, 0.4));
      b.rotation.y = Math.PI / 2 + (rand() - 0.5) * 0.1;
      this.balanceo.push(b);
      this.escena.add(b);
    }
    for (let i = 0; i < 4; i++) {
      const b = M.barca(i % 2 ? "#2E78D8" : M.PALETA.rojo);
      b.position.copy(v3(925 + i * 18, 648 + (i % 2) * 6, 0.4));
      b.rotation.y = 0.2 + rand() * 0.4;
      this.balanceo.push(b);
      this.escena.add(b);
    }
    // Fila de casetas de pescadores junto a la dársena.
    for (let i = 0; i < 9; i++) {
      const c = M.casetaPescador(["#F1D58A", "#EAC56A", "#F4E1A6"][i % 3]);
      c.position.copy(v3(884, 604 + i * 8, SUELO));
      c.rotation.y = -Math.PI / 2;
      this.escena.add(c);
    }
    for (const [x, y] of [[884, 735], [878, 745]] as const) {
      const r = M.redes();
      r.position.copy(v3(x, y, SUELO));
      this.escena.add(r);
    }
  }

  private construirLugares() {
    const poner = (obj: THREE.Object3D, p: Punto, tap?: Tocable, rot = 0, escala = 1) => {
      obj.position.copy(v3(...p));
      obj.scale.multiplyScalar(escala);
      obj.rotation.y = rot;
      if (tap) this.hacerTocable(obj, tap);
      this.registrarFaroles(obj);
      this.escena.add(obj);
      return obj;
    };
    // Plaza de la Iglesia (como en la foto): peatonal y adoquinada, con la
    // Inmaculada al sur, el monumento en su seto, la fuente, árboles y farolas.
    this.escena.add(this.lamina(PLAZA, M.matTex(T.adoquin(), 1, 1), SUELO + 0.62, 1 / 16));
    poner(M.iglesia(), EDIFICIO.iglesia, { tipo: "lugar", id: "plaza" }, 0, 0.72);
    poner(M.monumento(), [500, 1196], undefined, 0, 0.8);
    poner(M.fuente(), [462, 1196], undefined, 0, 0.8);
    poner(M.tablon(), TABLON, { tipo: "tablon" }, 0, 0.8);
    for (const [x, y] of [[446, 1190], [516, 1190], [446, 1214], [518, 1218]] as const) poner(M.arbol(0.75, x > 480 ? 0 : 1), [x, y]);
    for (const [x, y] of [[456, 1206], [508, 1206], [478, 1188]] as const) poner(M.farola(9), [x, y]);
    poner(M.banco(), [488, 1190], undefined, Math.PI, 0.8);
    // Parques: Princesa Sofía (junto al estadio), Paseo de la Velada y Jardines Municipales.
    const rp = azar(53);
    for (const parque of PARQUES) {
      this.escena.add(this.lamina(parque, M.matTex(T.cesped(), 1, 1, "#B7E38A"), SUELO + 0.1, 1 / 30));
      const [[x0, y0], , [x1, y1]] = parque;
      const n = Math.max(3, Math.round(((x1 - x0) * (y1 - y0)) / 700));
      const puntos: Punto[] = [];
      for (let i = 0; i < n; i++) puntos.push([x0 + 6 + rp() * (x1 - x0 - 12), y0 + 6 + rp() * (y1 - y0 - 12)]);
      this.bosque(puntos, rp, false);
      for (let i = 0; i < n / 4; i++) poner(M.banco(), [x0 + 10 + rp() * (x1 - x0 - 20), y0 + 10 + rp() * (y1 - y0 - 20)], undefined, rp() * 3);
    }
    // Casa de la abuela (San Bernardo).
    const casa = poner(M.casaAbuela(), EDIFICIO.casa, { tipo: "lugar", id: "casa" }, 0, 0.95);
    this.chimenea.copy(casa.position).add(new THREE.Vector3(5.7, 17.5, 2.9));
    // Centro: mercado (con el puesto 14), bar de Lola en la Calle Real y la redacción.
    poner(M.mercado(), EDIFICIO.mercado, { tipo: "lugar", id: "mercado" }, Math.PI, 0.85);
    poner(M.puesto(), PUESTO, { tipo: "puesto" }, 0, 0.85);
    this.cajasPuesto = new THREE.Group();
    poner(this.cajasPuesto, PUESTO, undefined, 0, 0.85);
    poner(M.bar(), EDIFICIO.bar, { tipo: "lugar", id: "bar" }, Math.PI, 0.9);
    poner(M.redaccion(), EDIFICIO.redaccion, { tipo: "lugar", id: "redaccion" }, Math.PI, 0.95);
    poner(M.marquesina(), EDIFICIO.estacion, { tipo: "lugar", id: "estacion" }, 0, 0.9);
    // La Verja y, junto a la playa, Santa Bárbara, el estadio y la ciudad deportiva.
    poner(M.frontera(), EDIFICIO.frontera, { tipo: "lugar", id: "frontera" });
    poner(M.fuerte(), EDIFICIO.santaBarbara, { tipo: "lugar", id: "santaBarbara" });
    poner(M.estadio(), EDIFICIO.estadio, { tipo: "lugar", id: "estadio" });
    for (const [x, y] of [[718, 1418], [770, 1418], [718, 1462]] as const) {
      const campo = M.estadio();
      campo.children.slice(-12).forEach((c) => (c.visible = false));
      poner(campo, [x, y], undefined, 0, 0.9);
    }
    // La Atunara: lonja y fábrica de hielo; tu barca, la del abuelo.
    poner(M.lonja(), EDIFICIO.lonja, { tipo: "lugar", id: "atunara" }, Math.PI / 2, 0.8);
    this.barca = M.barca(M.PALETA.lima);
    poner(this.barca, MUELLE_BARCA, { tipo: "barca" }, Math.PI / 2);
    // El Zabal: tus seis parcelas y el chamizo de Rafa.
    BANCALES.forEach((p, i) => {
      poner(M.bancal(), p, { tipo: "bancal", i });
      const g = new THREE.Group();
      poner(g, p, { tipo: "bancal", i });
      this.plantas.push({ grupo: g, clave: "" });
    });
    poner(M.chamizo(), EDIFICIO.chamizo, { tipo: "lugar", id: "huerta" });
    for (let i = 0; i < 3; i++) poner(M.pacaPaja(), [668 + i * 7, 386]);
    poner(M.flores(14), [612, 386]);
    // Avenida de España: palmeras y bancos frente a la bahía (Poniente).
    const ida = [CALLES[0].puntos[1], CALLES[0].puntos[CALLES[0].puntos.length - 2]];
    const [a, b] = ida;
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n: Punto = [-(b[1] - a[1]) / largo, (b[0] - a[0]) / largo];
    for (let t = 0; t <= 1.001; t += 0.05) {
      const p: Punto = [a[0] + (b[0] - a[0]) * t + n[0] * 15, a[1] + (b[1] - a[1]) * t + n[1] * 15];
      poner(M.palmera(13 + ((t * 37) % 4)), p);
      if (Math.round(t * 100) % 15 === 0) poner(M.banco(), [p[0] + n[0] * 5, p[1] + n[1] * 5], undefined, -0.7);
    }
    const paseo = NODOS[LUGARES.paseo.nodo];
    poner(M.banco(), [paseo[0] + n[0] * 12, paseo[1] + n[1] * 12], { tipo: "lugar", id: "paseo" }, -0.7);
    // Playa de Levante: sombrillas y hamacas a lo largo de la arena.
    for (let i = 0; i < 14; i++) poner(M.sombrilla([M.PALETA.rosa, "#FFFFFF", M.PALETA.azul, M.PALETA.lima][i % 4]), [853 - i * 1.4, 900 + i * 28]);
    const lev = NODOS[LUGARES.levante.nodo];
    poner(M.sombrilla(M.PALETA.lima), [lev[0] + 24, lev[1]], { tipo: "lugar", id: "levante" });

    // Vecinos.
    for (const id of Object.keys(PERSONAJES) as PersonajeId[]) {
      const p = PERSONAJES[id];
      const g = M.persona(p.piel, p.ropa, p.canas ? "#E9E9E9" : p.pelo, 1.5);
      poner(g, POS_NPC[id], { tipo: "npc", id }, Math.PI + (Math.random() - 0.5));
      this.npcs.set(id, g);
      this.etiqueta("npc", p.nombre, v3(...POS_NPC[id], SUELO + 19));
    }

    // Rótulos de los lugares.
    for (const id of Object.keys(LUGARES) as LugarId[]) {
      const e = this.etiqueta("lugar", LUGARES[id].nombre, nodo3(LUGARES[id].nodo).setY(SUELO + 30));
      e.el.dataset.lugar = id;
      e.el.insertAdjacentHTML("afterbegin", iconoSvg(LUGARES[id].icono, 13));
      e.el.addEventListener("click", () => this.onTocar({ tipo: "lugar", id }));
    }
    // Nombres de las calles principales (se ven al alejar la cámara).
    const vistas = new Set<string>();
    for (const c of CALLES) {
      if (vistas.has(c.nombre) || c.puntos.length < 2) continue;
      vistas.add(c.nombre);
      const m = Math.floor((c.puntos.length - 1) / 2);
      const [p, q] = [c.puntos[m], c.puntos[m + 1]];
      this.etiqueta("calle", c.nombre, v3((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, SUELO + 2));
    }
    this.etiqueta("zona", "GIBRALTAR", v3(640, 1720, 80));
    for (const b of Object.values(BARRIOS)) this.etiqueta("zona", b.nombre.toUpperCase(), v3(...b.rotulo, 40));
  }

  private hacerTocable(obj: THREE.Object3D, t: Tocable) {
    obj.userData.tocable = t;
    this.tocables.push(obj);
  }

  private crearMarcador() {
    const g = new THREE.Group();
    const flecha = new THREE.Mesh(new THREE.ConeGeometry(3.2, 6, 4), M.mat(M.PALETA.lima, { emissive: "#6E8A00", emissiveIntensity: 0.6 }));
    flecha.rotation.x = Math.PI;
    flecha.position.y = 30;
    g.add(flecha);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(10, 1, 6, 28), M.mat(M.PALETA.lima, { emissive: "#6E8A00", emissiveIntensity: 0.6 }));
    aro.rotation.x = Math.PI / 2;
    aro.position.y = 1;
    g.add(aro);
    g.visible = false;
    return g;
  }

  /* ── Etiquetas HTML sobre el 3D ───────────────────────────────────── */

  private etiqueta(clase: string, texto: string, pos: THREE.Vector3, siempre = false): Etiqueta {
    const el = document.createElement("div");
    el.className = `rotulo3d ${clase}`;
    el.textContent = texto;
    this.capaEtiquetas.append(el);
    const e = { el, pos, siempre };
    this.etiquetas.push(e);
    return e;
  }

  /** Texto que sube y se desvanece («+3 tomates»). */
  flotante(texto: string, donde: THREE.Vector3 | LugarId) {
    const pos = typeof donde === "string" ? nodo3(LUGARES[donde].nodo).setY(SUELO + 16) : donde.clone();
    const el = document.createElement("div");
    el.className = "flotante3d";
    el.innerHTML = texto;
    this.capaEtiquetas.append(el);
    this.flotantes.push({ el, pos, t: 0 });
  }

  posBancal(i: number) {
    return v3(...BANCALES[i], SUELO + 10);
  }

  posBarca() {
    return this.barca.position.clone();
  }

  posDe(t: "cocina" | "barca" | "puesto") {
    return this.burbujas[t].pos.clone();
  }

  /* ── Personaje y cámara ───────────────────────────────────────────── */

  set ropa(c: string) {
    (this.jugador.userData.cuerpo as THREE.Mesh).material = M.mat(c);
  }

  set piel(c: string) {
    (this.jugador.children[2] as THREE.Mesh).material = M.mat(c);
  }

  colocar(nodo: string) {
    this.jugador.position.copy(nodo3(nodo));
    this.camino = [];
    this.objetivoCam.copy(this.jugador.position);
  }

  andar(nodos: string[], fin: () => void) {
    this.camino = nodos.slice(1).map((n) => nodo3(n));
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

  /** Acerca la cámara a un punto y lo deja en la mitad de arriba (la bandeja tapa la de abajo). */
  enfocar(p: THREE.Vector3, dist = 300) {
    this.distanciaMeta = dist;
    this.foco = new THREE.Vector3(p.x, SUELO, p.z - dist * 0.32);
    this.destinoCam = null;
    this.ultimoArrastre = 0;
  }

  /** Al cerrar el panel, la cámara vuelve a seguir al personaje. */
  soltarFoco() {
    if (!this.foco) return;
    this.foco = null;
    this.distanciaMeta = 520;
  }

  centrarEn(lugar: LugarId) {
    this.destinoCam = nodo3(LUGARES[lugar].nodo);
    this.ultimoArrastre = 0;
  }

  private ajustar() {
    const r = this.canvas.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camara.aspect = r.width / Math.max(1, r.height);
    // En horizontal cabe más mundo: acercamos un poco.
    if (this.camara.aspect > 1 && this.distancia === 520) this.distancia = 380;
    this.camara.updateProjectionMatrix();
  }

  private colocarCamara() {
    const ang = THREE.MathUtils.degToRad(Math.min(58, 34 + (this.distancia - 220) * 0.012));
    this.camara.position.set(this.objetivoCam.x, this.objetivoCam.y + this.distancia * Math.sin(ang), this.objetivoCam.z - this.distancia * Math.cos(ang));
    this.camara.lookAt(this.objetivoCam);
    this.sol.position.copy(this.objetivoCam).add(new THREE.Vector3(160, 320, -120));
    this.sol.target.position.copy(this.objetivoCam);
  }

  /* ── Entrada ──────────────────────────────────────────────────────── */

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

  private zoom(f: number) {
    this.distanciaMeta = null;
    this.distancia = Math.max(220, Math.min(1500, this.distancia * f));
  }

  private limitar() {
    this.objetivoCam.x = Math.max(-380, Math.min(520, this.objetivoCam.x));
    this.objetivoCam.z = Math.max(-700, Math.min(900, this.objetivoCam.z));
  }

  private tocar(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camara);
    const golpes = this.ray.intersectObjects(this.tocables, true);
    for (const g of golpes) {
      let o: THREE.Object3D | null = g.object;
      while (o && !o.userData.tocable) o = o.parent;
      if (o && o.visible) {
        this.onTocar(o.userData.tocable as Tocable);
        return;
      }
    }
    // Si no, el lugar más cercano al punto tocado.
    const p = this.alSuelo(cx, cy);
    if (!p) return;
    let mejor: LugarId | null = null;
    let dMin = 45;
    for (const id of Object.keys(LUGARES) as LugarId[]) {
      const d = nodo3(LUGARES[id].nodo).distanceTo(p);
      if (d < dMin) {
        dMin = d;
        mejor = id;
      }
    }
    if (mejor) this.onTocar({ tipo: "lugar", id: mejor });
  }

  /* ── Sincronizar con la partida ───────────────────────────────────── */

  sincronizar(e: Estado) {
    this.hora = horaDelDia(e);
    this.viento = e.viento;
    // Cultivos.
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
    // Cocina: humo mientras cocina y burbuja con lo que está listo.
    this.humo.forEach((h) => (h.visible = e.cocina.length > 0));
    if (e.cocina.length && this.humo.length < 6) {
      for (let i = 0; i < 6; i++) {
        const h = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), M.mat("#FFFFFF", { transparent: true, opacity: 0.7 }));
        h.userData.fase = i / 6;
        this.humo.push(h);
        this.escena.add(h);
      }
    }
    this.burbuja("cocina", e.cocinaListos.length ? `Cocina · ${e.cocinaListos.length} ${e.cocinaListos.length === 1 ? "plato listo" : "platos listos"}` : e.cocina.length ? `Cocinando ${OBJETOS[e.cocina[0].receta].nombre.toLowerCase()}…` : "", !!e.cocinaListos.length);
    // Barca.
    const fuera = barcaFuera(e);
    this.barca.userData.fuera = fuera;
    if (e.barca) {
      const total = SALIDAS[e.barca.salida].minutos;
      this.barca.userData.prog = Math.min(1, 1 - (e.barca.vuelta - e.minuto) / total);
    }
    const botin = Object.keys(e.barcaBotin).length > 0;
    this.burbuja("barca", botin ? "Barca · ¡captura lista!" : fuera ? `Barca faenando · vuelve en ${Math.max(1, Math.ceil(e.barca!.vuelta - e.minuto))} min` : "", botin);
    // Puesto 14.
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
    // Vecinos en su sitio solo en su horario.
    for (const [id, g] of this.npcs) g.visible = presente(e, id);
    // Rótulos: el objetivo, en lima.
    for (const et of this.etiquetas) if (et.el.dataset.lugar) et.el.classList.toggle("meta", et.el.dataset.lugar === this.objetivo);
  }

  private burbuja(k: "cocina" | "barca" | "puesto", texto: string, aviso: boolean) {
    const b = this.burbujas[k];
    if (b.el.textContent !== texto) b.el.textContent = texto;
    b.el.style.display = texto ? "" : "none";
    b.el.classList.toggle("aviso", aviso);
    b.el.onclick = () => this.onTocar({ tipo: k });
  }

  /* ── Fotograma ────────────────────────────────────────────────────── */

  private tAvion = 20;

  private fotograma() {
    const dt = Math.min(0.12, this.reloj.getDelta());
    const t = this.reloj.elapsedTime;

    // Personaje andando.
    if (this.camino.length) {
      let avance = 150 * dt;
      while (avance > 0 && this.camino.length) {
        const dest = this.camino[0];
        const d = dest.distanceTo(this.jugador.position);
        if (d > 0.01) this.jugador.rotation.y = Math.atan2(dest.x - this.jugador.position.x, dest.z - this.jugador.position.z);
        if (d <= avance) {
          this.jugador.position.copy(dest);
          this.camino.shift();
          avance -= d;
        } else {
          this.jugador.position.add(dest.clone().sub(this.jugador.position).setLength(avance));
          avance = 0;
        }
      }
      this.jugador.position.y = SUELO + Math.abs(Math.sin(t * 16)) * 1.2;
      if (!this.camino.length) {
        this.jugador.position.y = SUELO;
        const f = this.alLlegar;
        this.alLlegar = null;
        f?.();
      }
    }

    // Cámara: sigue al personaje salvo que el jugador esté mirando el mapa.
    const libre = performance.now() - this.ultimoArrastre > 2500;
    const destino = this.destinoCam ?? this.foco ?? (libre ? this.jugador.position : null);
    if (destino) {
      const k = 1 - Math.pow(0.02, dt);
      this.objetivoCam.lerp(new THREE.Vector3(destino.x, SUELO, destino.z), k);
      if (this.destinoCam && this.objetivoCam.distanceTo(this.destinoCam) < 2) {
        this.destinoCam = null;
        this.ultimoArrastre = performance.now();
      }
    }
    if (this.distanciaMeta !== null) {
      this.distancia += (this.distanciaMeta - this.distancia) * (1 - Math.pow(0.03, dt));
      if (Math.abs(this.distancia - this.distanciaMeta) < 1) this.distanciaMeta = null;
    }
    this.colocarCamara();

    // Mar.
    const pos = this.mar.geometry.attributes.position;
    const fuerza = this.viento === "levanteFuerte" ? 2.2 : this.viento === "levante" ? 1.4 : this.viento === "calma" ? 0.35 : 0.8;
    for (let i = 0; i < pos.count; i++) {
      const x = this.marBase[i * 3];
      const z = this.marBase[i * 3 + 2];
      pos.setY(i, Math.sin(x * 0.02 + t * 1.3) * fuerza + Math.cos(z * 0.025 + t) * fuerza * 0.7);
    }
    pos.needsUpdate = true;
    this.mar.geometry.computeVertexNormals();
    this.mar.material.color.set(this.viento === "levanteFuerte" ? "#2A7FC4" : "#2C9BE3");

    // Barca: zarpa hacia levante, faena y vuelve.
    const muelle = v3(...MUELLE_BARCA, 0.6);
    if (this.barca.userData.fuera) {
      const p = this.barca.userData.prog as number;
      const fuera = v3(...MAR_ADENTRO, 0.6);
      const ida = Math.min(1, p / 0.15);
      const vuelta = Math.max(0, (p - 0.85) / 0.15);
      const k = p < 0.85 ? ida : 1 - vuelta;
      this.barca.position.copy(muelle).lerp(fuera, k * k * (3 - 2 * k));
      this.barca.rotation.y = p < 0.85 ? -0.4 : Math.PI - 0.4;
    } else {
      this.barca.position.copy(muelle);
      this.barca.rotation.y = 0;
    }
    this.barca.position.y = 0.4 + Math.sin(t * 2) * 0.5 * fuerza;
    this.barca.rotation.z = Math.sin(t * 1.6) * 0.04 * fuerza;

    // Cultivos listos: saltito.
    for (const pl of this.plantas) pl.grupo.position.y = SUELO + (pl.grupo.userData.listo ? Math.abs(Math.sin(t * 4)) * 0.8 : 0);

    // Humo de la cocina.
    for (const h of this.humo) {
      const f = (t * 0.35 + (h.userData.fase as number)) % 1;
      h.position.copy(this.chimenea).add(new THREE.Vector3(Math.sin(f * 6) * 1.5, f * 16, f * 4));
      h.scale.setScalar(0.6 + f * 1.6);
      (h.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - f);
    }

    // Marcador del objetivo.
    this.marcador.visible = !!this.objetivo;
    if (this.objetivo) {
      this.marcador.position.copy(nodo3(LUGARES[this.objetivo].nodo));
      this.marcador.children[0].position.y = 22 + Math.sin(t * 3) * 2.5;
      this.marcador.rotation.y = t;
    }

    // La nube del levante sobre el Peñón.
    const nube = this.viento === "levanteFuerte" ? 1.6 : this.viento === "levante" ? 1.15 : 0;
    this.nubePenon.visible = nube > 0;
    this.nubePenon.scale.setScalar(Math.max(0.01, nube));
    this.nubePenon.position.x = 140 + Math.sin(t * 0.2) * 6;

    // Un avión aterriza en Gibraltar de vez en cuando.
    this.tAvion -= dt;
    if (this.tAvion < 0) {
      const f = Math.min(1, -this.tAvion / 14);
      this.avion.visible = true;
      this.avion.position.copy(v3(-300 + f * 1100, PISTA.y, SUELO + Math.max(5, 120 * (1 - f * 1.6))));
      this.avion.rotation.z = f < 0.6 ? -0.08 : 0;
      if (f >= 1) {
        this.avion.visible = false;
        this.tAvion = 75 + Math.random() * 60;
      }
    }

    // Vecinos: respiran.
    for (const g of this.npcs.values()) g.scale.y = 1.55 + Math.sin(t * 2 + g.position.x) * 0.02;
    // Barcos y barcas fondeados: balanceo suave.
    this.balanceo.forEach((o, i) => {
      o.rotation.z = Math.sin(t * 1.2 + i) * 0.03 * fuerza;
      o.position.y = 0.3 + Math.sin(t * 1.5 + i * 2) * 0.35 * fuerza;
    });

    this.luz();
    this.renderer.render(this.escena, this.camara);
    this.moverEtiquetas(dt);
  }

  /** Luz del día: mañana, tarde, atardecer y noche. */
  private luz() {
    const h = this.hora;
    const dia = h >= 7 && h < 19.5 ? 1 : h >= 19.5 && h < 21.5 ? 1 - (h - 19.5) / 2 : h >= 6 && h < 7 ? h - 6 : 0;
    const atardecer = h >= 18 && h < 21 ? 1 - Math.abs(h - 19.5) / 1.5 : 0;
    const cielo = new THREE.Color("#132A5C").lerp(new THREE.Color("#A9D8FF"), dia).lerp(new THREE.Color("#FFB98A"), atardecer * 0.5);
    (this.escena.background as THREE.Color).copy(cielo);
    this.escena.fog!.color.copy(cielo);
    this.sol.intensity = 0.3 + 2.5 * dia;
    this.sol.color.set(atardecer > 0.2 ? "#FFC58A" : "#FFF1D6");
    this.cielo.intensity = 0.5 + 0.75 * dia;
    const noche = 1 - dia;
    for (const f of this.faroles) (f.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + noche * 2.2;
  }

  private moverEtiquetas(dt: number) {
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    const lejos = this.distancia > 1000;
    for (const e of this.etiquetas) {
      if (e.el.style.display === "none" && !e.el.classList.contains("zona")) continue;
      v.copy(e.pos).project(this.camara);
      const fuera = v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2;
      const clase = e.el.classList;
      const ocultar = fuera || (clase.contains("npc") && this.distancia > 760) || (clase.contains("zona") && !lejos) || (clase.contains("calle") && (this.distancia < 300 || this.distancia > 900)) || (clase.contains("lugar") && lejos && !clase.contains("meta"));
      e.el.style.visibility = ocultar ? "hidden" : "visible";
      if (!ocultar) e.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%)`;
    }
    for (let i = this.flotantes.length - 1; i >= 0; i--) {
      const f = this.flotantes[i];
      f.t += dt;
      v.copy(f.pos).add(new THREE.Vector3(0, f.t * 12, 0)).project(this.camara);
      f.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%)`;
      f.el.style.opacity = String(Math.max(0, 1 - f.t / 1.8));
      if (f.t > 1.8) {
        f.el.remove();
        this.flotantes.splice(i, 1);
      }
    }
  }
}


/** Escala las UV (que ExtrudeGeometry/ShapeGeometry ponen en unidades del mundo). */
function escalarUV(geo: THREE.BufferGeometry, k: number) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  uv.needsUpdate = true;
}
