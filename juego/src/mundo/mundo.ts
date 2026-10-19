import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { urbanizar, type Segmento } from "./mobiliario";
import { conFrondas, Especie, geoArbol, materialesArbol, N_ESPECIES, VARIANTES, viento } from "./vegetacion";
import { edificar, Mat, materialesArquitectura, matLuz, Obra, type Edificio } from "./arquitectura";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { HorizontalTiltShiftShader } from "three/examples/jsm/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/examples/jsm/shaders/VerticalTiltShiftShader.js";
import {
  ANCHO_VIA, BARRIOS, DATOS, GIBRALTAR, LUGARES, NODOS, PENON, PISTA, POSICION, TIERRA, TRAMOS, VERJA, ZONAS,
  type LugarId, type Punto, type Tramo, type Zona,
} from "../datos/mapa";
import { OBJETOS, SALIDAS, type CultivoId } from "../datos/objetos";
import { edificiosConservados, enZonaReconstruida } from "../compartido/ciudad";
import { PERSONAJES, type PersonajeId } from "../datos/personajes";
import { barcaFuera, horaDelDia, listo, progresoCultivo, type Estado } from "../estado";
import { presente } from "../historia";
import { esIconoJuego, iconoJuego, iconoSvg } from "../iconos";
import * as M from "./modelos";
import * as T from "./texturas";
import { animarPersonaje, cambiarAspecto, crearPersonaje, ponerEstado, recolorear, REFERENCIA_HOMBRE, REFERENCIA_MUJER, ESCALA_PERSONAJE, type Aspecto, type Personaje } from "./personajes3d";
import { construirCentro02, CENTRO_C02, SUSTITUYE_C02, solidosCentro02 } from "./sectores/centro02";
import { solidosCentro01 } from "./sectores/centro01";
import { arbolesSaccone, CENTRO_SACCONE, construirSaccone, destinoJardin, enJardinesSaccone, libreJardin, solidosSaccone } from "./sectores/saccone";
import { PavoReal } from "./pavos";
import { arbolesToros, CENTRO_TOROS, construirToros, solidosToros } from "./sectores/toros";
import { CENTRO_MERCADO, construirMercado, solidosMercado } from "./sectores/mercado";
import { Marcadores } from "./marcadores";
import { GestorCiudad, auditarEdificio, SUSTITUIDOS } from "./ciudad/teselas";
import { ModelosBlender, cargarModelo, piezasModelo } from "./ciudad/modelosBlender";
import { HAY_CALLES_BLENDER, cargarCalles } from "./ciudad/callesBlender";
import { conectarBackend } from "./ciudad/correcciones";
import { construirCentro01, SUSTITUYE_CENTRO01, TABLON_CENTRO01, ZONA_CENTRO01 } from "./sectores/centro01";

/** Otro jugador conectado (multijugador). */
export interface Vecino {
  id: string;
  nombre: string;
  ropa: string;
  piel: string;
  nivel: number;
  x: number;
  y: number;
  /** Orientación (radianes) y animación que manda el servidor. */
  r?: number;
  anim?: string;
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
  | { tipo: "zona"; zona: Zona }
  | { tipo: "edificio"; ficha: FichaEdificio };

/** Lo que se cuenta de un edificio al tocarlo. */
export interface FichaEdificio {
  tipo: string;
  plantas: number;
  calle: string;
  barrio: string;
  comercio: boolean;
  /** Índice del edificio en linea.json (para las viviendas). */
  idx: number;
  /** Punto del mapa delante de su fachada (para ir andando). */
  punto: Punto;
}

const NOMBRE_ESTILO: Record<number, string> = {
  0: "Casa encalada", 1: "Casa encalada", 2: "Casa encalada", 3: "Casa", 4: "Bloque de viviendas", 5: "Bloque de ladrillo",
  6: "Edificio de oficinas", 7: "Nave industrial", 8: "Iglesia", 9: "Colegio", 10: "Edificio público", 11: "Ruinas", 12: "Caseta", 13: "Pabellón deportivo",
};

export type NivelCalidad = "baja" | "media" | "alta";
interface Calidad {
  pixel: number;
  sombra: number;
  msaa: number;
  ao: boolean;
  tilt: boolean;
  detalle: boolean;
  altoDetalle: number;
  radioDetalle: number;
  trozosCache: number;
  sombrasDetalle: boolean;
}
const CALIDADES: Record<NivelCalidad, Calidad> = {
  baja: { pixel: 1, sombra: 1024, msaa: 0, ao: false, tilt: false, detalle: true, altoDetalle: 320, radioDetalle: 150, trozosCache: 12, sombrasDetalle: false },
  media: { pixel: 1.5, sombra: 2048, msaa: 4, ao: false, tilt: true, detalle: true, altoDetalle: 520, radioDetalle: 230, trozosCache: 30, sombrasDetalle: true },
  alta: { pixel: 2, sombra: 4096, msaa: 4, ao: true, tilt: true, detalle: true, altoDetalle: 820, radioDetalle: 420, trozosCache: 60, sombrasDetalle: true },
};
function calidadGuardada(): NivelCalidad {
  try {
    const v = localStorage.getItem("mi-linea-calidad");
    if (v === "baja" || v === "media" || v === "alta") return v;
  } catch {
    /* sin almacenamiento */
  }
  const movil = matchMedia("(pointer: coarse)").matches || Math.min(screen.width, screen.height) < 700;
  return movil ? "media" : "alta";
}

/** Mapa de entorno exterior: cúpula de cielo con degradado y suelo cálido, prefiltrada con PMREM. */
function entornoCielo(renderer: THREE.WebGLRenderer) {
  const escena = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const col: number[] = [];
  const pos = geo.attributes.position;
  const arriba = new THREE.Color("#3E7FC8");
  const horizonte = new THREE.Color("#A8C3DC");
  const suelo = new THREE.Color("#6E6252");
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10;
    const c = y > 0 ? horizonte.clone().lerp(arriba, Math.pow(y, 0.6)) : horizonte.clone().lerp(suelo, Math.min(1, -y * 3));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  escena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  // Un «sol» brillante para los brillos especulares.
  const sol = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 4.8) }));
  sol.position.copy(DIR_SOL).multiplyScalar(9);
  escena.add(sol);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(escena, 0.02).texture;
  pmrem.dispose();
  return tex;
}

const LIMITE_FPS = Number(new URLSearchParams(location.search).get("fps")) || 0;

const TROZO = 80;

/** Libera la memoria de un trozo (las geometrías de árbol son compartidas y se conservan). */
function liberar(g: THREE.Group) {
  g.traverse((m) => {
    if ((m as THREE.InstancedMesh).isInstancedMesh) (m as THREE.InstancedMesh).dispose();
    else if ((m as THREE.Mesh).isMesh) (m as THREE.Mesh).geometry.dispose();
  });
}
interface Trozo {
  cx: number;
  cy: number;
  edificios: EdificioDet[];
  segs: (Segmento & { r0: number; r1: number })[];
  arboles: number[];
  grupo: THREE.Group | null;
  visible: boolean;
  uso: number;
  fino: boolean;
}
type EdificioDet = Edificio & { idx: number };

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

const CX = 2600;
const CY = 3000;
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
const TABLON: Punto = TABLON_CENTRO01;
/** Huellas OSM sustituidas por los sectores reconstruidos a mano (barrio a barrio). */
const SUSTITUIDAS: Punto[] = [...SUSTITUYE_CENTRO01, ...SUSTITUYE_C02];
const sustituida = (x: number, y: number) => SUSTITUIDAS.some(([sx, sy]) => Math.abs(sx - x) < 0.6 && Math.abs(sy - y) < 0.6) || SUST_CIUDAD.has(`${x},${y}`);
/** Rectángulos antiguos del mapa sustituidos por la ciudad generada (por sus coordenadas). */
const SUST_CIUDAD = new Set([...SUSTITUIDOS].map((i) => `${DATOS.edificios[i]?.[0]},${DATOS.edificios[i]?.[1]}`));
/**
 * Sección de las calles junto a las manzanas generadas, según su ancho libre real (distancia del
 * eje a las fachadas, calculada por scripts/sector/ciudad.py) y su tipo en OSM. Ningún edificio
 * se recorta: la calle se adapta.
 *   convencional: calzada y aceras de ancho normal.
 *   acera_estrecha: calzada mínima y aceras de lo que quepa (0,6–1,5 m).
 *   plataforma: plataforma única a un nivel (calles de coexistencia o sin sitio para aceras).
 *   peatonal: calle peatonal pavimentada de fachada a fachada.
 */
type P2Lista = { t: string; p: Punto[] };
type Seccion = "convencional" | "acera_estrecha" | "plataforma" | "peatonal";
const SECCION = new Map<Tramo, Seccion>();
const ACERA_TRAMO = new Map<Tramo, number>();
/** Desplazamiento del centro de la calle respecto al eje de OSM (hacia la normal (−dy, dx)). */
const DESPLAZ = new Map<Tramo, number>();
const ejesCache = new WeakMap<Tramo, Punto[]>();
/** Eje por el que se dibuja y circula cada calle: el de OSM, centrado en el corredor libre. */
function eje(t: Tramo): Punto[] {
  const off = DESPLAZ.get(t) ?? 0;
  if (Math.abs(off) < 0.05) return t.puntos as Punto[];
  let e = ejesCache.get(t);
  if (e) return e;
  const p = t.puntos;
  const nor = (a: Punto, b: Punto): Punto => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  };
  e = p.map((q, i) => {
    const n0 = i > 0 ? nor(p[i - 1], q) : null;
    const n1 = i < p.length - 1 ? nor(q, p[i + 1]) : null;
    let nx = (n0?.[0] ?? 0) + (n1?.[0] ?? 0);
    let ny = (n0?.[1] ?? 0) + (n1?.[1] ?? 0);
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    // Inglete: en los giros el desplazamiento se alarga para mantener el ancho (con tope).
    const ref = n0 ?? n1!;
    const k = 1 / Math.max(0.5, nx * ref[0] + ny * ref[1]);
    return [q[0] + nx * off * k, q[1] + ny * off * k] as Punto;
  });
  ejesCache.set(t, e);
  return e;
}
/** Dobles calzadas estrechadas para dejar mediana (scripts/blender/calles/calles.py). */
const medianas = import.meta.glob<Record<string, number>>("../datos/ciudad/medianas.json", { eager: true, import: "default" });
const anchosReales = import.meta.glob<{ tramos: Record<number, [number, number, number]> }>("../datos/ciudad/anchos.json", { eager: true, import: "default" });
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

/** Aspecto 3D de cada vecino del juego (sexo, peinado, atuendo) sobre sus colores de siempre. */
const ASPECTO_NPC: Record<PersonajeId, Omit<Aspecto, "piel" | "pelo" | "ropa">> = {
  carmen: { sexo: "m", peinado: "mono", atuendo: "vestido", edad: 1, altura: 0.94, complexion: 1.1 },
  lola: { sexo: "m", peinado: "coleta", atuendo: "camarero", altura: 0.98 },
  juani: { sexo: "m", peinado: "rizado", atuendo: "informal", altura: 0.95, complexion: 1.08 },
  antonio: { sexo: "h", peinado: "calvo", atuendo: "pescador", edad: 1, complexion: 1.1 },
  rafa: { sexo: "h", peinado: "corto", atuendo: "trabajo", accesorio: "gorra", ropa2: "#2E7D4F" },
  marta: { sexo: "m", peinado: "largo", atuendo: "informal", accesorio: "gafas", altura: 1.0 },
  andres: { sexo: "h", peinado: "corto", atuendo: "informal", accesorio: "gafas", edad: 1, pantalon: "#6B6F78" },
};

/** Aspecto de un jugador a partir de sus colores (y de su id, para variar sexo y peinado). */
function aspectoJugador(piel: string, ropa: string, id = "yo"): Aspecto {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const base = id === "yo" || h % 2 === 0 ? REFERENCIA_HOMBRE : REFERENCIA_MUJER;
  return { ...base, piel, ropa };
}

/* ── Zona de prueba del nuevo sistema de construcción ─────────────────── */

/** Manzanas alrededor del Mercado de la Concepción: aquí rigen las reglas nuevas de colocación. */
export const ZONA_PRUEBA = { c: [2330, 4090] as Punto, r: 190 };

/**
 * Anchura de calzada de cada tramo. Fuera de la zona de prueba, la de su clase. Dentro, la que
 * cabe de verdad entre las fachadas reales (medida sobre las huellas de OSM, contando el
 * retranqueo máximo y la acera), para que calle, acera y fachada no se pisen.
 */
const ANCHO_TRAMO = new Map<Tramo, number>();
const anchoDe = (t: Tramo) => ANCHO_TRAMO.get(t) ?? ANCHO_VIA[t.clase];
function calcularAnchos() {
  const cons = CONSERVADOS();
  const rects = DATOS.edificios.filter((_, i) => cons.has(i));
  const cerca = new Set<string>();
  for (const [x, y] of rects) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) cerca.add(`${Math.floor(x / 40) + dx},${Math.floor(y / 40) + dy}`);
  for (const t of TRAMOS) {
    if (t.clase > 4 || !t.puntos.some(([x, y]) => cerca.has(`${Math.floor(x / 40)},${Math.floor(y / 40)}`))) continue;
    const libres: number[] = [];
    for (let i = 1; i < t.puntos.length; i++) {
      const [a, b] = [t.puntos[i - 1], t.puntos[i]];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let s = 0; s <= L; s += 2) {
        const px = a[0] + ((b[0] - a[0]) * s) / L;
        const py = a[1] + ((b[1] - a[1]) * s) / L;
        let d = 99;
        for (const [x, y, w, dd, ang] of rects) {
          if (Math.abs(x - px) > 30 || Math.abs(y - py) > 30) continue;
          const [lx, lz] = local({ x, y, w, d: dd, ang }, px, py);
          const gx = Math.abs(lx) - w / 2;
          const gz = Math.abs(lz) - dd / 2;
          if (gx < 0 && gz < 0) continue; // la calle cruza la huella: lo resolverá el validador
          d = Math.min(d, Math.hypot(Math.max(0, gx), Math.max(0, gz)));
        }
        libres.push(d);
      }
    }
    if (!libres.length) continue;
    libres.sort((p, q) => p - q);
    const p20 = libres[Math.floor(libres.length * 0.05)];
    const media = Math.max(1.8, Math.min(ANCHO_VIA[t.clase] / 2, p20 + CORTE_MAX - ACERA));
    ANCHO_TRAMO.set(t, media * 2);
  }
  // Calles junto a manzanas generadas: sección según el ancho libre real hasta las fachadas
  // (medido por el lote sobre este mismo eje, cada metro).
  const reales = Object.values(anchosReales)[0]?.tramos ?? {};
  TRAMOS.forEach((t, i) => {
    const r = reales[i];
    if (!r || t.clase > 5) return;
    // Corredor libre entre fachadas a cada lado del eje (izquierda = normal (−dy, dx) de a→b).
    const [di, dd, tipo] = r;
    const W = di + dd;
    const nominal = ANCHO_VIA[t.clase];
    // La calle se centra en el corredor real (el eje de OSM no siempre va por el medio).
    DESPLAZ.set(t, Math.max(-6, Math.min(6, (di - dd) / 2)));
    // Peatonales (OSM) y callejones sin sitio para un carril y dos aceras mínimas: adoquín de fachada a fachada.
    if (t.clase === 4 || tipo === 2 || W < 4.6) {
      SECCION.set(t, "peatonal");
      ANCHO_TRAMO.set(t, Math.max(0.7, Math.min(nominal, W - 0.1)));
      return;
    }
    // Calzada y acera a cada lado: primero un carril y aceras de 1,5 m; con más sitio, más calzada
    // (hasta la de su clase) y aceras hasta 2,5 m.
    const calzada = Math.max(3.0, Math.min(nominal, W - 3.0));
    const acera = Math.max(0.8, Math.min(2.5, (W - calzada) / 2 - 0.05));
    SECCION.set(t, acera >= 1.5 ? "convencional" : "acera_estrecha");
    ANCHO_TRAMO.set(t, calzada);
    ACERA_TRAMO.set(t, acera);
  });
  const med = Object.values(medianas)[0] ?? {};
  TRAMOS.forEach((t, i) => {
    if (med[i] !== undefined) ANCHO_TRAMO.set(t, Math.min(anchoDe(t), med[i]));
  });
}

/** Barrio de un punto: el del rótulo más cercano (igual que el catálogo de viviendas). */
const barrioMapa = (x: number, y: number) => {
  let mejor = "";
  let dm = Infinity;
  for (const [id, b] of Object.entries(BARRIOS)) {
    const d = (b.rotulo[0] - x) ** 2 + (b.rotulo[1] - y) ** 2;
    if (d < dm) (dm = d), (mejor = id);
  }
  return mejor;
};
/** Edificios que existen en la ciudad (zonas reconstruidas + principales de cada barrio). */
const CONSERVADOS = () => edificiosConservados(DATOS.edificios.map(([x, y, w, d, , tipo]) => ({ x, y, w, d, tipo })), barrioMapa);

/** Acera mínima entre el borde de la calzada y la fachada (m). */
const ACERA = 1.2;
/** Nivel de la calzada y de las peatonales; la acera va 12 cm por encima. */
const ALTO_CALLE = SUELO + 0.15;
const ALTO_ACERA = ALTO_CALLE + 0.12;
/** ¿Circulan coches por el tramo? Calles rodadas con calzada de al menos 3,6 m (ni peatonales ni plataforma única). */
const esCalzada = (t: Tramo) => t.clase <= 3 && SECCION.get(t) !== "peatonal" && SECCION.get(t) !== "plataforma" && anchoDe(t) >= 3.0;
/** ¿Lleva calzada con bordillo y aceras? Calles rodadas y vías de servicio medidas (no las peatonales). */
const conAceras = (t: Tramo) => (t.clase <= 3 || (t.clase === 5 && DESPLAZ.has(t))) && SECCION.get(t) !== "peatonal" && anchoDe(t) >= 3.0;
/** Ancho de la acera de cada lado (m). */
const aceraDe = (t: Tramo) => ACERA_TRAMO.get(t) ?? (t.clase <= 1 ? 2.6 : t.clase <= 2 ? 2.0 : 1.6);
/** Lado mínimo de un edificio tras los recortes; por debajo, no se construye. */
const LADO_MIN = 3.0;
/** Retranqueo máximo por cara para ganar acera (más rompería la manzana real). */
const CORTE_MAX = 2.2;

export interface InformeValidacion {
  revisados: number;
  recortadosCalle: number;
  descartadosCalle: number;
  calleAtraviesa: number;
  solapesCorregidos: number;
  descartadosSolape: number;
  carasCiegas: number;
  descartados: { x: number; y: number; motivo: string }[];
}

type Rect = { x: number; y: number; w: number; d: number; ang: number };
const ejes = (r: Rect) => ({ ux: [Math.cos(r.ang), Math.sin(r.ang)], uz: [-Math.sin(r.ang), Math.cos(r.ang)] });
function local(r: Rect, px: number, py: number) {
  const dx = px - r.x;
  const dy = py - r.y;
  return [dx * Math.cos(r.ang) + dy * Math.sin(r.ang), -dx * Math.sin(r.ang) + dy * Math.cos(r.ang)];
}
function dentroRect(r: Rect, px: number, py: number, margen = 0) {
  const [lx, lz] = local(r, px, py);
  return Math.abs(lx) < r.w / 2 + margen && Math.abs(lz) < r.d / 2 + margen;
}
/** Recorta una cara (0 z+, 1 x+, 2 z−, 3 x−) hacia dentro `m` metros. */
function recortar(r: Rect, lado: number, m: number) {
  const { ux, uz } = ejes(r);
  const [e, s] = lado % 2 === 0 ? [uz, lado === 0 ? 1 : -1] : [ux, lado === 1 ? 1 : -1];
  if (lado % 2 === 0) r.d -= m;
  else r.w -= m;
  r.x -= (e[0] * s * m) / 2;
  r.y -= (e[1] * s * m) / 2;
}
/** Puntos de muestra de una cara, a `fuera` metros de la pared. */
function muestrasCara(r: Rect, lado: number, fuera: number, n = 5) {
  const { ux, uz } = ejes(r);
  const [nrm, tg, L, h] = lado % 2 === 0 ? [uz, ux, r.w, r.d / 2] : [ux, uz, r.d, r.w / 2];
  const s = lado === 0 || lado === 1 ? 1 : -1;
  const pts: Punto[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1) - 0.5) * (L - 0.6);
    pts.push([r.x + nrm[0] * s * (h + fuera) + tg[0] * t, r.y + nrm[1] * s * (h + fuera) + tg[1] * t]);
  }
  return pts;
}

/**
 * Validador de la colocación (orden: parcela → calle → solapes → medianeras):
 * 1. Ningún edificio pisa la calzada ni la acera: las caras que invaden se recortan hasta dejar acera.
 * 2. Si una calle atraviesa la huella, o el recorte deja el edificio sin volumen, no se construye.
 * 3. Los solapes entre edificios se resuelven recortando el menor; si no cabe, se descarta.
 * 4. Las caras pegadas a otro edificio se marcan ciegas: ahí no hay ventanas, balcones ni vuelos.
 */
function validarEdificios(lista: EdificioDet[], enZona: (x: number, y: number) => boolean, obstaculos: Punto[][]): EdificioDet[] {
  const inf: InformeValidacion = { revisados: 0, recortadosCalle: 0, descartadosCalle: 0, calleAtraviesa: 0, solapesCorregidos: 0, descartadosSolape: 0, carasCiegas: 0, descartados: [] };
  const zona = lista.filter((b) => enZona(b.x, b.y) && b.estilo <= 10);
  const rejillaEd = new Set(zona.flatMap((b) => [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => `${Math.floor(b.x / 40) + dx},${Math.floor(b.y / 40) + dy}`))));
  const cercaDeEdificio = (p: Punto) => rejillaEd.has(`${Math.floor(p[0] / 40)},${Math.floor(p[1] / 40)}`);
  // Segmentos de calle cercanos (calzadas y peatonales; no senderos ni pasos).
  const segs: { a: Punto; b: Punto; calzada: number; libre: number }[] = [];
  for (const t of TRAMOS) {
    // Calles de verdad (0-4). Las vías de servicio (5) de OSM son accesos a patios y garajes que
    // cruzan manzanas: no definen alineación de fachada.
    if (t.clase > 4) continue;
    for (let i = 1; i < t.puntos.length; i++) {
      const a = t.puntos[i - 1];
      const b = t.puntos[i];
      if (!cercaDeEdificio(a) && !cercaDeEdificio(b)) continue;
      segs.push({ a, b, calzada: anchoDe(t) / 2, libre: anchoDe(t) / 2 + ACERA });
    }
  }
  const fuera = new Set<EdificioDet>();
  const descartar = (b: EdificioDet, motivo: string) => {
    fuera.add(b);
    inf.descartados.push({ x: Math.round(b.x), y: Math.round(b.y), motivo });
  };
  // 1-2. Calle y acera.
  for (const b of zona) {
    inf.revisados++;
    const r: Rect = { x: b.x, y: b.y, w: b.w, d: b.d, ang: b.ang };
    const corte = [0, 0, 0, 0];
    /** Lo que la cara invade de calzada (no solo de acera). */
    const invade = [0, 0, 0, 0];
    let atraviesa = false;
    for (const sg of segs) {
      const L = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]);
      for (let s = 0; s <= L; s += 0.75) {
        const px = sg.a[0] + ((sg.b[0] - sg.a[0]) * s) / L;
        const py = sg.a[1] + ((sg.b[1] - sg.a[1]) * s) / L;
        const [lx, lz] = local(r, px, py);
        const gx = Math.abs(lx) - r.w / 2;
        const gz = Math.abs(lz) - r.d / 2;
        if (gx >= sg.libre || gz >= sg.libre) continue;
        if (gx < 0 && gz < 0) {
          atraviesa = true;
          continue;
        }
        if (gz >= gx) {
          const lado = lz > 0 ? 0 : 2;
          corte[lado] = Math.max(corte[lado], sg.libre - gz);
          invade[lado] = Math.max(invade[lado], sg.calzada - gz);
        } else {
          const lado = lx > 0 ? 1 : 3;
          corte[lado] = Math.max(corte[lado], sg.libre - gx);
          invade[lado] = Math.max(invade[lado], sg.calzada - gx);
        }
      }
    }
    if (atraviesa) {
      inf.calleAtraviesa++;
      descartar(b, "una calle atraviesa la huella");
      continue;
    }
    if (corte.some((c) => c > 0)) {
      // Se retranquea la fachada lo necesario para dejar acera, sin bajar del volumen mínimo;
      // si ni así deja libre la calzada, el edificio no se construye.
      let invadeCalzada = false;
      // 1) Obligatorio: liberar la calzada (repartido entre caras opuestas sin bajar del mínimo).
      for (const [l1, l2] of [[0, 2], [1, 3]] as const) {
        const lateral = l1 === 0 ? r.d : r.w;
        const n1 = Math.max(0, invade[l1]);
        const n2 = Math.max(0, invade[l2]);
        if (lateral - n1 - n2 < LADO_MIN) {
          if (n1 + n2 > 0.05) invadeCalzada = true;
          continue;
        }
        if (n1 > 0) recortar(r, l1, n1);
        if (n2 > 0) recortar(r, l2, n2);
        // 2) Deseable: acera, hasta el retranqueo máximo y sin bajar del mínimo.
        for (const [l, n] of [[l1, n1], [l2, n2]] as const) {
          const lat = l % 2 === 0 ? r.d : r.w;
          const extra = Math.max(0, Math.min(corte[l] - n, CORTE_MAX - n, lat - LADO_MIN));
          if (extra > 0.05) recortar(r, l, extra);
        }
      }
      // Los edificios principales de cada barrio no se quitan nunca: se retranquean lo posible.
      if (invadeCalzada && !enZonaReconstruida(b.x, b.y)) invadeCalzada = false;
      if (invadeCalzada) {
        inf.descartadosCalle++;
        descartar(b, "invade la calzada");
        continue;
      }
      inf.recortadosCalle++;
      Object.assign(b, { x: r.x, y: r.y, w: r.w, d: r.d });
    }
  }
  // 3. Solapes con otros edificios y con los sectores reconstruidos.
  const vivos = lista.filter((b) => !fuera.has(b));
  const dentroObstaculo = (px: number, py: number) => obstaculos.some((p) => dentroPoliMapa([px, py], p));
  for (const b of zona) {
    if (fuera.has(b)) continue;
    const vecinos = vivos.filter((o) => o !== b && Math.abs(o.x - b.x) < 40 && Math.abs(o.y - b.y) < 40);
    const ocupa = (px: number, py: number) => dentroObstaculo(px, py) || vecinos.some((o) => (o.w * o.d > b.w * b.d || !enZona(o.x, o.y)) && dentroRect(o, px, py, -0.15));
    let tocado = false;
    for (let it = 0; it < 24; it++) {
      let peor = -1;
      let cuenta = 0;
      for (let lado = 0; lado < 4; lado++) {
        const n = muestrasCara(b, lado, -0.1).filter(([px, py]) => ocupa(px, py)).length;
        if (n > cuenta) (cuenta = n), (peor = lado);
      }
      if (peor < 0) break;
      const r: Rect = { x: b.x, y: b.y, w: b.w, d: b.d, ang: b.ang };
      recortar(r, peor, 0.5);
      Object.assign(b, { x: r.x, y: r.y, w: r.w, d: r.d });
      tocado = true;
      if (b.w < LADO_MIN || b.d < LADO_MIN) break;
    }
    if (b.w < LADO_MIN || b.d < LADO_MIN) {
      inf.descartadosSolape++;
      descartar(b, "solapa con otro edificio");
    } else if (tocado) inf.solapesCorregidos++;
  }
  // 4. Medianeras: caras con otro edificio pegado.
  const finales = lista.filter((b) => !fuera.has(b));
  for (const b of zona) {
    if (fuera.has(b)) continue;
    let ciegas = 0;
    const vecinos = finales.filter((o) => o !== b && Math.abs(o.x - b.x) < 40 && Math.abs(o.y - b.y) < 40);
    for (let lado = 0; lado < 4; lado++) {
      const pegadas = muestrasCara(b, lado, 0.9).filter(([px, py]) => dentroObstaculo(px, py) || vecinos.some((o) => dentroRect(o, px, py, 0.6))).length;
      if (pegadas >= 3) ciegas |= 1 << lado;
    }
    b.ciegas = ciegas;
    inf.carasCiegas += [0, 1, 2, 3].filter((l) => ciegas & (1 << l)).length;
    // La puerta y el escaparate van a una cara abierta que dé a la calle.
    if (ciegas & (1 << b.frente)) {
      const abierta = [0, 1, 2, 3].find((l) => !(ciegas & (1 << l)));
      if (abierta !== undefined) b.frente = abierta;
      else b.tienda = false;
    }
  }
  (globalThis as { __validacion?: InformeValidacion }).__validacion = inf;
  console.info("[validación de edificios]", JSON.stringify({ ...inf, descartados: inf.descartados.length }));
  return finales;
}

function dentroPoliMapa(p: Punto, poli: readonly Punto[]) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

interface Etiqueta {
  el: HTMLElement;
  pos: THREE.Vector3;
}

/** Rectángulos ocupados por instalaciones deportivas (sin árboles encima): [x, y, medio ancho, medio fondo, ángulo]. */
const OCUPADO_DEPORTE: [number, number, number, number, number][] = [
  ...DATOS.deportes.pistas.map(([x, y, w, d, a]) => [x, y, w / 2 + 1.5, d / 2 + 1.5, a] as [number, number, number, number, number]),
  ...(DATOS.deportes.estadio ? [[DATOS.deportes.estadio[0], DATOS.deportes.estadio[1], DATOS.deportes.estadio[2] / 2 + 3, DATOS.deportes.estadio[3] / 2 + 3, DATOS.deportes.estadio[4]] as [number, number, number, number, number]] : []),
  [3220, 4551, 78, 28, 0],
  [2942, 4652, 32, 72, 0],
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


export class Mundo {
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(30, 1, 2, 14000);
  private composer!: EffectComposer;
  private ao: GTAOPass | null = null;
  ajustesCalidad: Calidad;
  private edificios: EdificioDet[] = [];
  private arboles: { x: number; y: number; e: Especie; v: number; esc: number; rot: number }[] = [];
  private ranuras = new Map<number, [THREE.InstancedMesh, number][]>();
  private trozos = new Map<string, Trozo>();
  private rejillaCalzada = new Map<string, Segmento[]>();
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
  /** Los dos pavos reales de los Jardines Saccone. */
  private pavos: PavoReal[] = [];
  private busJugador!: THREE.Group;
  private vecinos = new Map<string, { g: Personaje; e: Etiqueta; meta: THREE.Vector3; emote: Etiqueta; rot: number | null; anim: string; dicho: Etiqueta | null; dichoT: number }>();
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
  private alto = 110;
  private altoMeta: number | null = null;
  /** Giro de la cámara en cuartos de vuelta (0: desde el noreste, mirando al Peñón). */
  private giro = 0;
  private giroActual = 0;
  private jugador: Personaje;
  /** Personajes de ambiente que también se animan (deportistas, figurantes). */
  private figurantes: Personaje[] = [];
  /** Vista a pie de calle detrás del personaje. */
  modoPOV = false;
  /** Modo información: muestra todos los nombres (lugares, calles, barrios, vecinos). */
  modoInfo = false;
  private povYaw = 0;
  private povPitch = 0.08;
  /** Campo de visión en primera persona (pellizco o rueda: acercar y alejar la mirada). */
  private povFov = 68;
  private altoAntesPOV = 110;
  private velJug = 0;
  private cuadro = 0;
  /** Superficies pisables: calles, aceras, plazas y pavimentos de los sectores. */
  private suelos: THREE.Object3D[] = [];
  /** Caché de alturas del suelo por celda de 0,4 m (se vacía al construir un trozo). */
  private alturas = new Map<string, number>();
  private rayoSuelo = new THREE.Raycaster();
  /** Movimiento libre (teclado o joystick): dirección en pantalla, −1…1. */
  entrada = { x: 0, y: 0, correr: false };
  private libreAndando = false;
  /** Aviso al dejar de moverse libremente (para actualizar el nodo de la partida). */
  onParadaLibre: (p: Punto) => void = () => {};
  /** Rejilla de colisiones: edificios (rectángulos girados) y huellas de los sectores (polígonos). */
  private solidos = new Map<string, ({ r: [number, number, number, number, number] } | { p: Punto[] })[]>();
  private tmpV = new THREE.Vector3();
  private camino: THREE.Vector3[] = [];
  /** Última posición de cada coche (x, y del mapa y rumbo), para las distancias y los choques. */
  private posCoches: [number, number, number][] = [];
  private alLlegar: (() => void) | null = null;
  private tocables: THREE.Object3D[] = [];
  private etiquetas: Etiqueta[] = [];
  private flotantes: { el: HTMLElement; pos: THREE.Vector3; t: number }[] = [];
  private marcas: Marcadores;
  private plantas: { grupo: THREE.Group; clave: string }[] = [];
  private npcs = new Map<PersonajeId, Personaje>();
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
    this.renderer.toneMappingExposure = 0.98;
    this.escena.background = new THREE.Color("#BFE0F7");
    this.escena.fog = new THREE.Fog("#BFE0F7", 900, 3200);
    // Luz ambiental por imagen: un cielo exterior (azul arriba, horizonte claro, suelo cálido)
    // filtrado con PMREM. Da reflejos creíbles en cristales y una aproximación de luz global.
    this.escena.environment = entornoCielo(this.renderer);
    this.ajustesCalidad = CALIDADES[calidadGuardada()];
    this.tiltH = new ShaderPass(HorizontalTiltShiftShader);
    this.tiltV = new ShaderPass(VerticalTiltShiftShader);
    this.tiltH.uniforms.r.value = 0.5;
    this.tiltV.uniforms.r.value = 0.5;
    this.montarComposer();

    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(this.ajustesCalidad.sombra, this.ajustesCalidad.sombra);
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.25;
    this.escena.add(this.sol, this.sol.target, this.cielo);

    // Lugares con modelo propio: no se dibuja el edificio real que hay debajo.
    this.reservas.push([...CASA, 9], [...MERCADO, 18], [...POSICION.bar, 6], [...POSICION.redaccion, 7], [...ATUNARA, 12], [...POSICION.santaBarbara, 30], [...(DATOS.deportes.estadio ?? POSICION.estadio).slice(0, 2) as unknown as Punto, 52], [...POSICION.estacion, 12], [...POSICION.frontera, 12]);
    for (const b of BANCALES) this.reservas.push([...b, 9]);
    this.reservas.push([...sumar(HUERTA, 22, -6), 9]);

    this.construirTerreno();
    this.construirCapas();
    calcularAnchos();
    this.construirCalles();
    this.construirEdificios();
    this.construirVegetacion();
    this.construirDeportes();
    this.montarArboles();
    this.construirAtunara();
    this.construirLugares();
    this.construirZonas();
    this.construirTrafico();
    this.construirGaviotas();
    // Pavos reales paseando por los Jardines Saccone.
    for (const [i, inicio] of ([[2228, 4436], [2200, 4452]] as Punto[]).entries()) {
      let v = 101 + i * 977;
      const r = () => ((v = (v * 16807) % 2147483647) / 2147483647);
      const pavo = new PavoReal([inicio[0], inicio[1]], libreJardin, () => destinoJardin(r), 31 + i * 17);
      this.escena.add(pavo.p.g);
      this.pavos.push(pavo);
    }

    this.jugador = crearPersonaje(aspectoJugador("#E8B796", "#C4E910"));
    this.escena.add(this.jugador);
    this.busJugador = autobusUrbano();
    this.busJugador.visible = false;
    this.escena.add(this.busJugador);
    this.marcas = new Marcadores(this.escena, this.capaEtiquetas);
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
    for (const [x, y, c] of [[760, 4500, "#C8623E"], [600, 4960, "#1F5EFF"], [360, 4200, "#2B2D31"], [900, 3900, "#2E7D35"]] as const) {
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
    this.suelos.push(m);
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
    let orden = 1;
    const conBlender: [THREE.MeshStandardMaterial, string, number, string][] = [];
    const poner = (nombre: string, material: THREE.Material, alto: number, uv = 1 / 30) => {
      orden++;
      const tex = { cesped: ["Cesped", "#FFFFFF"], parque: ["Cesped", "#F2FBEA"], bosque: ["Cesped", "#D9EBCF"], matorral: ["Cesped", "#E8E2C2"], arena: ["Arena", "#FFFFFF"] }[nombre];
      if (tex) conBlender.push([material as THREE.MeshStandardMaterial, tex[0], uv, tex[1]]);
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
    // Césped y arena con las texturas hechas en Blender (materiales compartidos de las calles).
    void cargarModelo("modelos/calles/materiales.glb").then((base) => {
      const tex = new Map<string, THREE.Texture>();
      base.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m?.map) tex.set(m.name, m.map);
      });
      const metros: Record<string, number> = { Cesped: 3, Arena: 6 };
      for (const [mat, nombre, uv, color] of conBlender) {
        const t = tex.get(nombre)?.clone();
        if (!t) continue;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.setScalar(1 / (uv * metros[nombre]));
        t.anisotropy = 8;
        t.needsUpdate = true;
        mat.map = t;
        mat.color.set(color);
        mat.needsUpdate = true;
      }
    });
  }

  /* ── Calles reales convertidas en caminos ───────────────────────────── */

  private construirCalles() {
    // Calzada de asfalto en tiras rectas que siguen la dirección de la calle (cada tramo se alarga
    // medio ancho en los cruces para cerrarlos); aceras a cada lado, 12 cm más altas, con su
    // bordillo; peatonales a ras. Nada de discos ni ingletes en punta.
    const grupos: Record<string, THREE.BufferGeometry[]> = { acera: [], bordillo: [], asfalto: [], peatonal: [], sendero: [], pista: [], raya: [] };
    const cantos: THREE.BufferGeometry[] = [];
    // Cruces: ancho máximo de calzada que llega a cada nodo (para no poner bordillos dentro).
    const cruce = new Map<string, { w: number; grado: number }>();
    for (const t of TRAMOS) {
      if (t.clase > 5) continue;
      for (const n of [t.a, t.b]) {
        const c = cruce.get(n) ?? { w: 0, grado: 0 };
        cruce.set(n, { w: Math.max(c.w, anchoDe(t) + 2 * Math.abs(DESPLAZ.get(t) ?? 0)), grado: c.grado + 1 });
      }
    }
    const radioCruce = (n: string) => ((cruce.get(n)?.grado ?? 0) >= 2 ? cruce.get(n)!.w / 2 + 0.4 : 0);
    // Calles hechas en Blender (scripts/blender/calles): solo se cargan; aquí quedan las rayas.
    if (HAY_CALLES_BLENDER) {
      void cargarCalles(CX, CY, SUELO, (m) => {
        this.escena.add(m);
        this.suelos.push(m);
        this.alturas.clear();
      });
    }
    for (const t of TRAMOS) {
      const w = anchoDe(t);
      const sec = SECCION.get(t);
      if (HAY_CALLES_BLENDER) {
        if (conAceras(t) && t.clase <= 1 && t.largo > 30) grupos.raya.push(...rayas(eje(t), ALTO_CALLE + 0.01 - SUELO));
        continue;
      }
      const e = eje(t);
      const fin0 = (cruce.get(t.a)?.grado ?? 0) >= 2;
      const fin1 = (cruce.get(t.b)?.grado ?? 0) >= 2;
      if (conAceras(t)) {
        const acera = aceraDe(t);
        grupos.acera.push(tiras(e, w + 2 * acera, ALTO_ACERA, 0, 0, w / 2 + acera));
        grupos.bordillo.push(tiras(e, w + 0.36, ALTO_ACERA + 0.002, 0, 0, w / 2));
        grupos.asfalto.push(tiras(e, w, ALTO_CALLE, fin0 ? w / 2 : 0, fin1 ? w / 2 : 0, w / 2));
        cantos.push(bordillos(e, w, ALTO_CALLE, ALTO_ACERA, radioCruce(t.a), radioCruce(t.b)));
        if (t.clase <= 1 && t.largo > 30) grupos.raya.push(...rayas(e, ALTO_CALLE + 0.01 - SUELO));
      } else if (t.clase === 5 && sec !== "peatonal") {
        // Vía de servicio sin medir (aparcamientos, accesos): asfalto estrecho, sin aceras ni tráfico.
        const ws = Math.min(w, 3.5);
        grupos.asfalto.push(tiras(e, ws, ALTO_CALLE, fin0 ? ws / 2 : 0, fin1 ? ws / 2 : 0, ws / 2));
      } else if (t.clase <= 4 || sec === "peatonal") {
        // Peatonal: adoquín de fachada a fachada, a ras.
        grupos.peatonal.push(tiras(e, w, ALTO_CALLE, fin0 ? w / 2 : 0, fin1 ? w / 2 : 0, w / 2));
      } else grupos[t.clase === 6 ? "sendero" : "pista"].push(tiras(e, w, ALTO_CALLE - 0.02, 0.5, 0.5, w / 2));
    }
    // Bordillos: caras verticales sólidas entre calzada y acera.
    if (cantos.length) {
      const canto = new THREE.Mesh(mergeGeometries(cantos.filter((g) => g.attributes.position.count)), M.mat("#D3CEC4", { roughness: 0.85 }));
      canto.receiveShadow = true;
      this.escena.add(canto);
    }
    const mats: Record<string, THREE.Material> = {
      acera: M.matTex(T.acera(), 1, 1, "#F1EADC"),
      bordillo: M.mat("#C9C4BA"),
      asfalto: M.matTex(T.asfalto(), 1, 1),
      peatonal: M.matTex(T.adoquin(), 1, 1),
      sendero: M.mat("#EBDDBF"),
      pista: M.mat("#C9A77A"),
      raya: M.mat("#FFFFFF"),
    };
    // Por encima de todos los usos del suelo (plazas, parques, solares), por debajo del agua y los calcos.
    // Encima de los usos del suelo (2–18) y antes que los edificios: los edificios y árboles tapan la calle.
    const ordenCalle: Record<string, number> = { sendero: 19, pista: 19, acera: 20, bordillo: 21, peatonal: 22, asfalto: 23, raya: 24 };
    for (const [k, geos] of Object.entries(grupos)) {
      if (!geos.length) continue;
      const geo = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
        if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (!g.attributes.normal) g.computeVertexNormals();
        return g;
      }));
      // Sin desplazamiento de profundidad: las capas están a su altura real y no deben adelantarse
      // a troncos, fachadas ni coches.
      const mat = mats[k].clone();
      mat.depthWrite = false;
      const m = new THREE.Mesh(geo, mat);
      m.userData.calzada = k === "asfalto" || k === "peatonal";
      if (k !== "raya") this.suelos.push(m);
      m.renderOrder = ordenCalle[k];
      m.receiveShadow = true;
      this.escena.add(m);
    }
    // Farolas fernandinas (modelo de Blender, instanciado) en las aceras de las vías principales,
    // cada 24 m y alternando lado.
    const pts: Punto[] = [];
    for (const t of TRAMOS) {
      if (t.clase > 3 || !esCalzada(t) || aceraDe(t) < 1.2) continue;
      let lado = 1;
      for (let i = 1; i < eje(t).length; i++) {
        const [a, b] = [eje(t)[i - 1], eje(t)[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 9; s < l - 5; s += 24) {
          const nx = -(b[1] - a[1]) / l;
          const ny = (b[0] - a[0]) / l;
          const off = (anchoDe(t) / 2 + Math.min(0.6, aceraDe(t) * 0.35)) * (t.clase <= 1 ? (lado = -lado) : 1);
          pts.push([a[0] + ((b[0] - a[0]) * s) / l + nx * off, a[1] + ((b[1] - a[1]) * s) / l + ny * off]);
        }
      }
    }
    const farolMat = M.mat("#FFF0C2", { emissive: "#FFC64D", emissiveIntensity: 0.4, roughness: 0.2 });
    this.faroles.push(farolMat);
    void piezasModelo("modelos/mobiliario/farola.glb").then((piezas) => {
      const o = new THREE.Object3D();
      for (const { material, geometria } of piezas) {
        const esFarol = material.name === "Farol";
        const im = new THREE.InstancedMesh(geometria, esFarol ? farolMat : material, pts.length);
        pts.forEach((p, i) => {
          o.position.copy(p3(p, ALTO_ACERA));
          o.rotation.y = (i * 1.7) % (Math.PI * 2);
          o.updateMatrix();
          im.setMatrixAt(i, o.matrix);
        });
        im.castShadow = !esFarol;
        this.escena.add(im);
      }
    });

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
      for (let i = 1; i < eje(t).length; i++) {
        const [a, b] = [eje(t)[i - 1], eje(t)[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 10; s < l - 8; s += 15) {
          const nx = -(b[1] - a[1]) / l;
          const ny = (b[0] - a[0]) / l;
          for (const lado of [-1, 1]) {
            // Alcorques en la acera, solo donde es ancha.
            if (!esCalzada(t) || aceraDe(t) < 1.9) continue;
            const off = (anchoDe(t) / 2 + aceraDe(t) * 0.45) * lado;
            const p: Punto = [a[0] + ((b[0] - a[0]) * s) / l + nx * off, a[1] + ((b[1] - a[1]) * s) / l + ny * off];
            if (arbolado.length < 2600 && libre(p) && !enDeporte(p)) arbolado.push(p);
          }
        }
      }
    }
    this.bosque(arbolado, azar(5), "calle");

    // Pasos de cebra en los cruces de las vías principales.
    const cebras: { p: Punto; rot: number; w: number }[] = [];
    for (const [n, adj] of adyCoche()) {
      if (adj.length < 3 || !adj.some((t) => t.clase <= 2)) continue;
      const c = NODOS[n];
      for (const t of adj) {
        const pts = t.a === n ? eje(t) : [...eje(t)].reverse();
        const q = pts[1];
        const l = Math.hypot(q[0] - c[0], q[1] - c[1]);
        const dist = anchoDe(t) / 2 + 5;
        if (l < dist + 4) continue;
        cebras.push({ p: [c[0] + ((q[0] - c[0]) * dist) / l, c[1] + ((q[1] - c[1]) * dist) / l], rot: Math.atan2(q[0] - c[0], q[1] - c[1]), w: anchoDe(t) });
      }
    }
    // Rayas de 0,5 m cada metro a lo ancho de la calzada (dejando medio metro a cada lado).
    const total = cebras.reduce((n, z) => n + Math.max(2, Math.floor(z.w - 1)), 0);
    const rayasCebra = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 3).rotateX(-Math.PI / 2), this.capaSuelo(M.mat("#FFFFFF")), Math.max(1, total));
    rayasCebra.renderOrder = 25;
    const ob = new THREE.Object3D();
    let k = 0;
    for (const z of cebras) {
      const n = Math.max(2, Math.floor(z.w - 1));
      for (let j = 0; j < n; j++) {
        ob.position.copy(p3(z.p, ALTO_CALLE + 0.01));
        ob.rotation.set(0, z.rot, 0);
        ob.translateX(j - (n - 1) / 2);
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
    type B = EdificioDet;
    const lista: B[] = [];
    // Todas las calles muestreadas: para saber qué fachada da a la calle (puerta, escaparate).
    const calles = new Map<string, Punto[]>();
    for (const t of TRAMOS) {
      for (let i = 1; i < t.puntos.length; i++) {
        const [a, b] = [t.puntos[i - 1], t.puntos[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 0; s <= l; s += 4) {
          const p: Punto = [a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l];
          const k = celda(...p);
          if (!calles.has(k)) calles.set(k, []);
          calles.get(k)!.push(p);
        }
      }
    }
    const frenteDe = (x: number, y: number, w: number, d: number, ang: number) => {
      let mejor: Punto | null = null;
      let md = Infinity;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const p of calles.get(`${Math.floor(x / 20) + dx},${Math.floor(y / 20) + dy}`) ?? []) {
          const dd = (p[0] - x) ** 2 + (p[1] - y) ** 2;
          if (dd < md) (md = dd), (mejor = p);
        }
      }
      if (!mejor) return 0;
      const ex = mejor[0] - x;
      const ey = mejor[1] - y;
      const lx = ex * Math.cos(ang) + ey * Math.sin(ang);
      const lz = -ex * Math.sin(ang) + ey * Math.cos(ang);
      return Math.abs(lx) / (w / 2) > Math.abs(lz) / (d / 2) ? (lx > 0 ? 1 : 3) : lz > 0 ? 0 : 2;
    };
    const conservados = CONSERVADOS();
    let idx = -1;
    for (const [x, y, w0, d0, ang, tipo, plantas] of DATOS.edificios) {
      idx++;
      if (!conservados.has(idx) || reservado(x, y) || sustituida(x, y)) continue;
      // Todos los edificios conservados pasan por el sistema nuevo (huella real + validador).
      const prueba = true;
      // En la zona de prueba la parcela es la huella real; fuera se mantiene el sistema anterior.
      const w = prueba ? w0 : Math.max(3.2, w0 * 0.9);
      const d = prueba ? d0 : Math.max(3.2, d0 * 0.9);
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
      // Calles algo más anchas: la fachada que da a la calle retrocede un metro (sin abrir huecos entre medianeras).
      const frente = frenteDe(x, y, w, d, ang);
      let [bx, by, bw, bd] = [x, y, w, d];
      const RET = 2.6;
      // Ejes locales en el mapa: +x = (cos, sin), +z = (−sin, cos). El centro se aleja de la calle medio retranqueo.
      if (prueba) {
        // Sin retranqueo fijo: lo decide el validador según la calle real.
      } else if (frente % 2 === 0 && bd > RET + 4) {
        const s = frente === 0 ? -1 : 1;
        bd -= RET;
        bx += (s * -Math.sin(ang) * RET) / 2;
        by += (s * Math.cos(ang) * RET) / 2;
      } else if (frente % 2 === 1 && bw > RET + 4) {
        const s = frente === 1 ? -1 : 1;
        bw -= RET;
        bx += (s * Math.cos(ang) * RET) / 2;
        by += (s * Math.sin(ang) * RET) / 2;
      }
      lista.push({ x: bx, y: by, w: bw, d: bd, ang, h, estilo, teja: (estilo <= 3 && rand() < 0.5) || estilo === 8, tono: Math.floor(rand() * 5), pl, tienda, frente, semilla: idx * 7919 + 17, idx });
    }
    this.edificios = validarEdificios(lista, () => true, this.sectoresSolidos());
    this.prepararTrozos();
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
        this.fijar(im, i, b, colocar(b, SUELO + b0 + (b.h - b0) / 2, [b.w, b.h - b0, b.d]));
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
      sub.forEach((b, i) => this.fijar(im, i, b, colocar(b, SUELO + 3.6, [b.w + 1.6, 0.5, b.d + 1.6])));
      this.instanciado(im);
    });
    // Tejados de teja a dos aguas.
    const forma = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.5)]);
    const prisma = new THREE.ExtrudeGeometry(forma, { depth: 1, bevelEnabled: false });
    prisma.translate(0, 0, -0.5);
    prisma.rotateY(Math.PI / 2);
    const conTeja = lista.filter((b) => b.teja);
    const tejas = new THREE.InstancedMesh(prisma, M.matTex(T.teja(), 1, 1), conTeja.length);
    conTeja.forEach((b, i) => this.fijar(tejas, i, b, colocar(b, SUELO + b.h - 0.05, [b.w + 0.8, Math.min(b.w, b.d) * 0.85, b.d + 0.8])));
    this.instanciado(tejas);
    // Azoteas: borde claro y suelo algo más oscuro, como un pretil.
    const planas = lista.filter((b) => !b.teja);
    const bordes = new THREE.InstancedMesh(caja, M.mat("#FFFFFF"), planas.length);
    const suelos = new THREE.InstancedMesh(caja, M.mat("#FFFFFF"), planas.length);
    const colBorde = [new THREE.Color("#F4EEE2"), new THREE.Color("#EDE5D6"), new THREE.Color("#FAF5EC")];
    planas.forEach((b, i) => {
      this.fijar(bordes, i, b, colocar(b, SUELO + b.h + 0.45, [b.w + 0.5, 0.9, b.d + 0.5]));
      bordes.setColorAt(i, b.estilo === 7 ? new THREE.Color(b.tono % 2 ? "#2F6DB5" : "#B9C1CC") : b.estilo === 12 ? new THREE.Color("#A9AFB8") : colBorde[b.tono % 3]);
      this.fijar(suelos, i, b, colocar(b, SUELO + b.h + 0.92, [Math.max(0.5, b.w - 1), 0.1, Math.max(0.5, b.d - 1)]));
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
      lista2.forEach(([b, dx, dz], i) => this.fijar(im, i, b, colocar(b, SUELO + b.h + 0.95 + alto, escala, dx, dz)));
      this.instanciado(im);
    };
    props(aires, caja, M.mat("#D9DDE3"), [1.6, 1, 1.2], 0.5);
    props(depositos, new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10), M.mat("#F7F7F2"), [1, 1, 1], 0.8);
    props(placas, caja, M.mat("#2C3E6B", { roughness: 0.3, metalness: 0.3 }), [3.2, 0.2, 2], 0.35);
    if (jardines.length) {
      const im = new THREE.InstancedMesh(caja, M.mat("#6DBE45"), jardines.length);
      jardines.forEach((b, i) => this.fijar(im, i, b, colocar(b, SUELO + b.h + 1.05, [b.w * 0.5, 0.25, b.d * 0.5], b.w * 0.15, 0)));
      this.instanciado(im);
    }
  }

  /** Coloca una instancia del nivel lejano y recuerda a qué edificio pertenece. */
  private fijar(im: THREE.InstancedMesh, i: number, b: EdificioDet, m: THREE.Matrix4) {
    im.setMatrixAt(i, m);
    let l = this.ranuras.get(b.idx);
    if (!l) this.ranuras.set(b.idx, (l = []));
    l.push([im, i]);
  }

  /* ── Nivel de detalle: arquitectura completa por trozos alrededor de la cámara ── */

  private trozoDe(x: number, y: number) {
    const cx = Math.floor(x / TROZO);
    const cy = Math.floor(y / TROZO);
    const k = `${cx},${cy}`;
    let t = this.trozos.get(k);
    if (!t) this.trozos.set(k, (t = { cx: (cx + 0.5) * TROZO, cy: (cy + 0.5) * TROZO, edificios: [], segs: [], arboles: [], grupo: null, visible: false, uso: 0, fino: false }));
    return t;
  }

  private prepararTrozos() {
    const trozo = (x: number, y: number) => this.trozoDe(x, y);
    // Calles con coches: aceras y bordillos, recortados en los cruces.
    const nodo = new Map<string, { ancho: number; grado: number }>();
    for (const t of TRAMOS) {
      if (t.clase > 3) continue;
      for (const n of [t.a, t.b]) {
        const v = nodo.get(n) ?? { ancho: 0, grado: 0 };
        nodo.set(n, { ancho: Math.max(v.ancho, anchoDe(t)), grado: v.grado + 1 });
      }
    }
    for (const t of TRAMOS) {
      if (t.clase > 3 || (SECCION.has(t) && SECCION.get(t) !== "convencional")) continue;
      const recorte = (n: string) => ((nodo.get(n)?.grado ?? 0) >= 2 ? nodo.get(n)!.ancho / 2 + 1.8 : 0);
      const ultimo = eje(t).length - 2;
      for (let i = 0; i <= ultimo; i++) {
        const [a, b] = [eje(t)[i], eje(t)[i + 1]];
        const seg = { a, b, clase: t.clase, ancho: anchoDe(t), r0: i === 0 ? recorte(t.a) : 0, r1: i === ultimo ? recorte(t.b) : 0 };
        trozo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2).segs.push(seg);
        // Rejilla para saber si un punto cae en alguna calzada (celdas de 20 que toca el segmento).
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
        const celdas = new Set<string>();
        for (let k = 0; k <= n; k++) celdas.add(`${Math.floor((a[0] + ((b[0] - a[0]) * k) / n) / 20)},${Math.floor((a[1] + ((b[1] - a[1]) * k) / n) / 20)}`);
        for (const c of celdas) {
          if (!this.rejillaCalzada.has(c)) this.rejillaCalzada.set(c, []);
          this.rejillaCalzada.get(c)!.push(seg);
        }
      }
    }
    for (const b of this.edificios) {
      trozo(b.x, b.y).edificios.push(b);
    }
  }

  /** ¿El punto cae sobre una calzada que no es la del segmento dado? */
  private enCalzada(p: Punto, propio: Segmento) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const s of this.rejillaCalzada.get(`${Math.floor(p[0] / 20) + dx},${Math.floor(p[1] / 20) + dy}`) ?? []) {
        if (s.a === propio.a && s.b === propio.b) continue;
        const vx = s.b[0] - s.a[0];
        const vy = s.b[1] - s.a[1];
        const l2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((p[0] - s.a[0]) * vx + (p[1] - s.a[1]) * vy) / l2));
        const d = Math.hypot(p[0] - s.a[0] - t * vx, p[1] - s.a[1] - t * vy);
        if (d < s.ancho / 2 + 0.6) return true;
      }
    }
    return false;
  }

  /** Oculta (escala 0) o restaura las instancias lejanas de una lista de edificios. */
  private lejanos(t: Trozo, ocultar: boolean) {
    const tocadas = new Set<THREE.InstancedMesh>();
    const cero = new THREE.Matrix4().makeScale(0, 0, 0);
    const claves = [...t.edificios.map((b) => b.idx), ...t.arboles.map((i) => -1 - i)];
    for (const k of claves) {
      for (const [im, i] of this.ranuras.get(k) ?? []) {
        if (!im.userData.orig) im.userData.orig = (im.instanceMatrix.array as Float32Array).slice();
        if (ocultar) im.setMatrixAt(i, cero);
        else (im.instanceMatrix.array as Float32Array).set((im.userData.orig as Float32Array).subarray(i * 16, i * 16 + 16), i * 16);
        tocadas.add(im);
      }
    }
    for (const im of tocadas) im.instanceMatrix.needsUpdate = true;
  }

  /** Construcción repartida en fotogramas: edificio a edificio, luego calles y árboles. */
  private obra: { t: Trozo; fino: boolean; o: Obra; i: number } | null = null;

  /** Avanza la obra en curso hasta `limite` (ms de performance.now). Devuelve true al terminar. */
  private avanzarObra(limite: number) {
    const w = this.obra!;
    while (w.i < w.t.edificios.length) {
      const b = w.t.edificios[w.i++];
      edificar(w.o, b, b.x - CX, SUELO, b.y - CY);
      if (performance.now() > limite) return false;
    }
    this.terminarTrozo(w.t, w.fino, w.o);
    this.obra = null;
    return true;
  }

  private terminarTrozo(t: Trozo, fino: boolean, o: Obra) {
    urbanizar(o, t.segs, t.edificios.filter((b) => b.tienda), CX, CY, SUELO, Math.round(t.cx * 31 + t.cy * 17), (p, propio) => this.enCalzada(p, propio));
    const g = new THREE.Group();
    const mats = materialesArquitectura();
    o.geometrias().forEach((geo, m) => {
      if (!geo) return;
      const malla = new THREE.Mesh(geo, mats[m]);
      malla.castShadow = this.ajustesCalidad.sombrasDetalle;
      malla.receiveShadow = true;
      // Aceras del trozo: son suelo pisable.
      if (m === Mat.Suelo) g.userData.suelo = malla;
      g.add(malla);
    });
    this.alturas.clear();
    // Árboles detallados del trozo, instanciados por especie y variante.
    const porTipo = new Map<number, number[]>();
    for (const i of t.arboles) {
      const a = this.arboles[i];
      const k = a.e * VARIANTES + a.v;
      if (!porTipo.has(k)) porTipo.set(k, []);
      porTipo.get(k)!.push(i);
    }
    const [matA, matP] = materialesArbol();
    const ob = new THREE.Object3D();
    for (const [k, lista] of porTipo) {
      const e = Math.floor(k / VARIANTES) as Especie;
      const im = new THREE.InstancedMesh(geoArbol(e, k % VARIANTES, fino), conFrondas(e) ? matP : matA, lista.length);
      lista.forEach((i, n) => {
        const a = this.arboles[i];
        ob.position.copy(v3(a.x, a.y, SUELO));
        ob.rotation.set(0, a.rot, 0);
        ob.scale.setScalar(a.esc);
        ob.updateMatrix();
        im.setMatrixAt(n, ob.matrix);
      });
      im.castShadow = true;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      g.add(im);
    }
    // Sustituye la versión anterior (si la había) sin dejar huecos.
    const habia = t.visible;
    if (t.grupo) {
      liberar(t.grupo);
      this.escena.remove(t.grupo);
    }
    g.visible = habia;
    this.escena.add(g);
    t.grupo = g;
    t.fino = fino;
  }

  /** Cada fotograma: construye (con presupuesto de tiempo) y muestra los trozos cercanos. */
  private actualizarDetalle() {
    const q = this.ajustesCalidad;
    const activo = q.detalle && this.alto < q.altoDetalle;
    const cx = this.objetivoCam.x + CX;
    const cy = this.objetivoCam.z + CY;
    const R = Math.min(q.radioDetalle, 70 + this.alto * 0.95);
    const ahora = performance.now();
    const pendientes: [Trozo, boolean][] = [];
    const radioFino = R * 0.5;
    for (const t of this.trozos.values()) {
      const dist = Math.hypot(t.cx - cx, t.cy - cy);
      const dentro = activo && dist < R;
      if (dentro) {
        t.uso = ahora;
        const fino = dist < radioFino;
        if (!t.grupo || (fino && !t.fino)) pendientes.push([t, fino]);
        if (t.grupo && !t.visible) {
          t.grupo.visible = t.visible = true;
          this.lejanos(t, true);
        }
      } else if (t.visible) {
        t.grupo!.visible = t.visible = false;
        this.lejanos(t, false);
      }
    }
    // Obra en curso: si ya no hace falta, se abandona.
    if (this.obra && !pendientes.some(([t, f]) => t === this.obra!.t && f === this.obra!.fino)) this.obra = null;
    // Presupuesto por fotograma: la ciudad se va detallando sin congelar la imagen.
    // ~7 ms a 60 fps; si el dispositivo ya va lento, se aprovecha más cada fotograma.
    const limite = ahora + Math.min(45, Math.max(this.modoDemo ? 4 : 7, this.msFotograma * 0.25));
    pendientes.sort((a, b) => Math.hypot(a[0].cx - cx, a[0].cy - cy) - Math.hypot(b[0].cx - cx, b[0].cy - cy));
    while (performance.now() < limite) {
      if (!this.obra) {
        const sig = pendientes.shift();
        if (!sig) break;
        const o = new Obra();
        o.fino = sig[1];
        this.obra = { t: sig[0], fino: sig[1], o, i: 0 };
      }
      const t = this.obra.t;
      if (!this.avanzarObra(limite)) break;
      if (!t.visible) {
        t.grupo!.visible = t.visible = true;
        this.lejanos(t, true);
      }
    }
    // Memoria: se liberan los trozos construidos que llevan tiempo sin verse.
    const hechos = [...this.trozos.values()].filter((t) => t.grupo && !t.visible);
    if (hechos.length > q.trozosCache) {
      hechos.sort((a, b) => a.uso - b.uso);
      for (const t of hechos.slice(0, hechos.length - q.trozosCache)) {
        liberar(t.grupo!);
        this.escena.remove(t.grupo!);
        t.grupo = null;
      }
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
    for (const [x, y, t] of DATOS.arboles) {
      if (enDeporte([x, y])) continue;
      // Jardines Saccone: arbolado propio según las fotos (araucarias, ficus, palmeras, dragos).
      if (enJardinesSaccone(x, y)) continue;
      // Plaza de la Iglesia: plátanos de sombra altos, como en las fotos.
      if (t === 0 && Math.hypot(x - ZONA_CENTRO01.c[0], y - ZONA_CENTRO01.c[1]) < ZONA_CENTRO01.r) {
        this.plantar([x, y], Especie.Sombra, rand, 1.12 + rand() * 0.15);
        continue;
      }
      (t === 2 ? arbustos : t === 1 ? pinos : frondosos).push([x, y]);
    }
    for (const a of [...arbolesSaccone(), ...arbolesToros()]) this.plantar(a.p as Punto, a.e, rand, a.esc);
    this.bosque(frondosos, rand, "jardin");
    this.bosque(pinos, rand, "pino");
    for (const p of arbustos) this.plantar(p, Especie.Arbusto, rand, 0.9 + rand() * 0.6);
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
    for (const p of palmas.slice(0, 160)) this.plantar(p, Especie.Palmera, rand, 0.55 + rand() * 0.15);
  }

  /** Planta árboles de un uso: pinares, arbolado de calle, parques o jardines (especies mediterráneas). */
  private bosque(puntos: Punto[], rand: () => number, uso: "pino" | "calle" | "parque" | "jardin") {
    for (const p of puntos) {
      const t = rand();
      const e =
        uso === "pino" ? Especie.Pino
        : uso === "calle" ? (t < 0.5 ? Especie.Naranjo : t < 0.85 ? Especie.Sombra : Especie.Ficus)
        : uso === "parque" ? (t < 0.45 ? Especie.Ficus : t < 0.9 ? Especie.Sombra : Especie.Pino)
        : t < 0.5 ? Especie.Sombra : t < 0.7 ? Especie.Ficus : t < 0.82 ? Especie.Palmera : t < 0.92 ? Especie.Cipres : Especie.Naranjo;
      this.plantar(p, e, rand, e === Especie.Palmera ? 0.6 : 0.8 + rand() * 0.35);
    }
  }

  private plantar(p: Punto, e: Especie, rand: () => number, escala = 1) {
    this.arboles.push({ x: p[0], y: p[1], e, v: Math.floor(rand() * VARIANTES), esc: escala, rot: rand() * Math.PI * 2 });
  }

  /** Árboles: nivel lejano instanciado en toda la ciudad; los cercanos se detallan por trozos. */
  private montarArboles() {
    const o = new THREE.Object3D();
    const [matA, matP] = materialesArbol();
    for (let e = 0; e < N_ESPECIES; e++) {
      const idx = this.arboles.map((a, i) => (a.e === e ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) continue;
      const im = new THREE.InstancedMesh(geoArbol(e, 0, false), conFrondas(e) ? matP : matA, idx.length);
      idx.forEach((i, k) => {
        const a = this.arboles[i];
        o.position.copy(v3(a.x, a.y, SUELO));
        o.rotation.set(0, a.rot, 0);
        o.scale.setScalar(a.esc);
        o.updateMatrix();
        im.setMatrixAt(k, o.matrix);
        let l = this.ranuras.get(-1 - i);
        if (!l) this.ranuras.set(-1 - i, (l = []));
        l.push([im, k]);
        this.trozoDe(a.x, a.y).arboles.push(i);
      });
      this.instanciado(im);
    }
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
    const [px0, px1, py0, py1] = [3144, 3296, 4524, 4578];
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
    const PISTA_PARQUE: [number, number, number, number] = [2942, 4652, 52, 132];
    const pista = new THREE.Mesh(caja, losa(M.matTex(T.pistaAtletismo())));
    pista.position.copy(v3(PISTA_PARQUE[0], PISTA_PARQUE[1], SUELO + 0.2));
    pista.scale.set(PISTA_PARQUE[2], 0.36, PISTA_PARQUE[3]);
    pista.receiveShadow = true;
    this.escena.add(pista);
    const parque = (DATOS.capas.parque ?? []).map((a) => a[0]).find((r) => dentroPoli([2800, 4740], r));
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
      this.bosque(pinos, rand, "pino");
      this.bosque(frondosos, rand, "parque");
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
      const off = anchoDe(t) / 2 + 4;
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
    for (const p of palmas.slice(0, 80)) this.plantar(p, Especie.Palmera, rand, 0.55 + rand() * 0.15);
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
      const p = crearPersonaje({ ...(i % 3 ? REFERENCIA_HOMBRE : REFERENCIA_MUJER), atuendo: "verano", ropa: i < 6 ? "#FFFFFF" : "#1F5EFF", pantalon: "#1E2A44", peinado: i % 3 ? "corto" : "coleta", piel: ["#E8B796", "#C98E66", "#F0C3A0", "#8D5A3B"][i % 4] });
      p.position.set((rand() - 0.5) * pw * 0.8, 0.8, (rand() - 0.5) * pl * 0.8);
      ponerEstado(p, i % 4 === 0 ? "hablar" : "quieto");
      this.figurantes.push(p);
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

  /* ── Sectores reconstruidos con fotos reales (city-reconstruction/) ─── */

  /** ¿Cae el punto dentro de un edificio OSM que se sigue dibujando de forma procedural? */
  private ocupadoOSM(p: Punto) {
    for (const [x, y, w, d, ang] of DATOS.edificios) {
      if (Math.abs(x - p[0]) > 30 || Math.abs(y - p[1]) > 30 || sustituida(x, y)) continue;
      const dx = p[0] - x;
      const dy = p[1] - y;
      const lx = dx * Math.cos(ang) + dy * Math.sin(ang);
      const lz = -dx * Math.sin(ang) + dy * Math.cos(ang);
      if (Math.abs(lx) < w / 2 && Math.abs(lz) < d / 2) return true;
    }
    return false;
  }

  /** Huellas de los sectores reconstruidos (obstáculos para el validador y las colisiones). */
  private sectoresSolidos(): Punto[][] {
    const ocupado = (p: [number, number]) => this.ocupadoOSM(p);
    return [...solidosCentro01(), ...solidosCentro02(ocupado), ...solidosSaccone(), ...solidosToros(), ...solidosMercado()] as Punto[][];
  }

  /** Ciudad generada automáticamente: teselas que se cargan y descargan según la cámara. */
  ciudad!: GestorCiudad;
  /** Lotes de edificios modelados en Blender. */
  blender!: ModelosBlender;
  /** Si está activo, tocar la ciudad selecciona edificios generados en vez de jugar. */
  editorCiudad: ((x: number, y: number) => void) | null = null;
  private solidosTeselas = new Map<string, P2Lista[]>();
  private ultimaCiudad = 0;

  private colisionesTesela(id: string, polis: Punto[][] | null) {
    for (const [k, l] of this.solidosTeselas) this.solidosTeselas.set(k, l.filter((s) => s.t !== id));
    if (!polis) return;
    for (const p of polis) {
      const xs = p.map((q) => q[0]);
      const ys = p.map((q) => q[1]);
      for (let cx = Math.floor(Math.min(...xs) / 20); cx <= Math.floor(Math.max(...xs) / 20); cx++)
        for (let cy = Math.floor(Math.min(...ys) / 20); cy <= Math.floor(Math.max(...ys) / 20); cy++) {
          const k = `${cx},${cy}`;
          if (!this.solidosTeselas.has(k)) this.solidosTeselas.set(k, []);
          this.solidosTeselas.get(k)!.push({ t: id, p });
        }
    }
  }

  /**
   * Auditoría de la ciudad generada cargada: geometría de cada edificio (piezas junto a su huella,
   * nada bajo el suelo ni por encima de la cubierta, cubierta presente) y relación con la calle
   * tal como se dibuja (la huella no debe invadir la calzada de ningún tramo).
   */
  auditarCiudad() {
    const ctx = { cx: CX, cy: CY, suelo: SUELO };
    const geometria: { id: string; problemas: string[] }[] = [];
    const calzada: { id: string; calle: string; invade: number }[] = [];
    const secciones: Record<string, number> = {};
    for (const s of SECCION.values()) secciones[s] = (secciones[s] ?? 0) + 1;
    for (const e of this.ciudad.cargados()) {
      const p = auditarEdificio(e, ctx);
      if (p.length) geometria.push({ id: e.id, problemas: p });
      const xs = e.huella.map((q) => q[0]);
      const ys = e.huella.map((q) => q[1]);
      for (const t of TRAMOS) {
        // Solo la calzada de asfalto (las peatonales van de fachada a fachada a propósito).
        if (!conAceras(t)) continue;
        if (!t.puntos.some(([x, y]) => x > Math.min(...xs) - 30 && x < Math.max(...xs) + 30 && y > Math.min(...ys) - 30 && y < Math.max(...ys) + 30)) continue;
        const mitad = anchoDe(t) / 2;
        let peor = 0;
        let recorrido = 0;
        for (let i = 1; i < eje(t).length; i++) {
          const [a, b] = [eje(t)[i - 1], eje(t)[i]];
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          for (let k = 0; k <= L; k += 0.5) {
            // Dentro del cruce manda el disco del cruce, no la cinta del tramo.
            if (recorrido + k < 4 || recorrido + k > t.largo - 4) continue;
            const px = a[0] + ((b[0] - a[0]) * k) / L;
            const py = a[1] + ((b[1] - a[1]) * k) / L;
            if (dentroPoli([px, py], e.huella as Punto[])) peor = Math.max(peor, mitad);
            else {
              let d = Infinity;
              for (let j = 0; j < e.huella.length; j++) {
                const [ax, ay] = e.huella[j];
                const [bx, by] = e.huella[(j + 1) % e.huella.length];
                const vx = bx - ax;
                const vy = by - ay;
                const u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)));
                d = Math.min(d, Math.hypot(px - ax - u * vx, py - ay - u * vy));
              }
              if (d < mitad - 0.05) peor = Math.max(peor, mitad - d);
            }
          }
          recorrido += L;
        }
        if (peor > 0.1) calzada.push({ id: e.id, calle: t.nombre || `tramo ${t.clase}`, invade: Math.round(peor * 100) / 100 });
      }
    }
    return { edificios: this.ciudad.cargados().length, geometria, calzada, secciones, metricas: this.ciudad.metricas };
  }

  /** Encuadra la cámara sobre un punto del mapa (editor de ciudad). */
  enfocarMapa(x: number, y: number, alto = 90) {
    this.modoDemo = false;
    this.jugador.position.set(x - CX, SUELO, y - CY);
    this.objetivoCam.set(x - CX, SUELO, y - CY);
    this.alto = alto;
    this.altoMeta = null;
    this.destinoCam = null;
    this.foco = null;
  }
  /** Modo revisión: a pie de calle en (x, y) mirando hacia (mx, my) (comparación con Google Earth). */
  revisar(x: number, y: number, mx: number, my: number) {
    this.enfocarMapa(x, y, 40);
    this.jugador.rotation.y = Math.atan2(mx - x, my - y);
    if (!this.modoPOV) this.alternarPOV(true);
    this.povYaw = 0;
    this.povPitch = 0.12;
  }
  /**
   * Sección final de cada tramo (eje desplazado, calzada, acera y tipo) para generar las calles en
   * Blender (scripts/blender/calles). Solo se usa desde scripts de exportación.
   */
  exportarCalles() {
    return TRAMOS.map((t, i) => {
      const sec = SECCION.get(t);
      const w = anchoDe(t);
      const grupo = conAceras(t) ? "calle" : t.clase === 5 && sec !== "peatonal" ? "servicio" : t.clase <= 4 || sec === "peatonal" ? "peatonal" : t.clase === 6 ? "sendero" : "pista";
      return { i, clase: t.clase, a: t.a, b: t.b, nombre: t.nombre ?? "", grupo, w: grupo === "servicio" ? Math.min(w, 3.5) : w, acera: grupo === "calle" ? aceraDe(t) : 0, eje: eje(t).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]) };
    });
  }
  /** Vista aérea de pruebas (capturas): cámara normal del juego centrada en (x, y). */
  vistaAerea(x: number, y: number, dist = 60) {
    if (this.modoPOV) this.alternarPOV(false);
    this.enfocarMapa(x, y, dist);
  }
  /** Objetos auxiliares del editor (contorno de selección). */
  ayudaEditor(o: THREE.Object3D, poner: boolean) {
    if (poner) this.escena.add(o);
    else this.escena.remove(o);
  }
  get origenMapa() {
    return { cx: CX, cy: CY, suelo: SUELO };
  }

  /** Malla de una obra (una por material), con sombras. */
  private mallasObra(o: Obra) {
    const g = new THREE.Group();
    const mats = materialesArquitectura();
    o.geometrias().forEach((geo, m) => {
      if (!geo) return;
      const malla = new THREE.Mesh(geo, mats[m]);
      // Proyectan sombra el volumen y, en calidad media/alta, los relieves; barrotes y cristales no
      // (apenas se notan y duplicaban los triángulos en la pasada de sombras).
      malla.castShadow = m === Mat.Muro || m === Mat.Ladrillo || m === Mat.Teja || m === Mat.Suelo || (m === Mat.Detalle && this.ajustesCalidad.sombrasDetalle);
      malla.receiveShadow = true;
      // Después de las láminas de calle (que no escriben profundidad), para que el pavimento propio se vea.
      malla.renderOrder = 30;
      if (m === Mat.Suelo) this.suelos.push(malla);
      g.add(malla);
    });
    return g;
  }

  private construirSectores() {
    const ctx = { cx: CX, cy: CY, suelo: SUELO };
    const ocupado = (p: [number, number]) => this.ocupadoOSM(p);
    // CENTRO-01 · Plaza de la Iglesia: detalle completo de cerca y versión ligera de lejos.
    const cerca = construirCentro01(ctx, ocupado, true);
    const lejos = construirCentro01(ctx, ocupado, false);
    // La geometría ya está en coordenadas del mundo: el LOD se sitúa en el centro del sector
    // (para medir bien la distancia a la cámara) y sus niveles se desplazan al revés.
    const centro = p3(ZONA_CENTRO01.c);
    for (const k of ["iglesia", "resto"] as const) {
      const lod = new THREE.LOD();
      lod.position.copy(centro);
      for (const [obra, dist] of [[cerca[k], 0], [lejos[k], 260]] as const) {
        const g = this.mallasObra(obra);
        g.position.copy(centro).negate();
        const nivel = new THREE.Group();
        nivel.add(g);
        lod.addLevel(nivel, dist);
      }
      this.escena.add(lod);
      if (k === "iglesia") this.hacerTocable(lod, { tipo: "lugar", id: "plaza" });
    }
    // CENTRO-02/03 · Calle Real y Plaza Cruz Herrera.
    {
      const lod = new THREE.LOD();
      const centro2 = p3(CENTRO_C02);
      lod.position.copy(centro2);
      for (const [obra, dist] of [[construirCentro02(ctx, ocupado, true), 0], [construirCentro02(ctx, ocupado, false), 260]] as const) {
        const g = this.mallasObra(obra);
        g.position.copy(centro2).negate();
        const nivel = new THREE.Group();
        nivel.add(g);
        lod.addLevel(nivel, dist);
      }
      this.escena.add(lod);
    }
    // SACCONE · Jardines Saccone, Museo Cruz Herrera y Colegio Providencia del Sagrado Corazón.
    {
      const lod = new THREE.LOD();
      const c3 = p3(CENTRO_SACCONE);
      lod.position.copy(c3);
      for (const [obra, dist] of [[construirSaccone(ctx, true), 0], [construirSaccone(ctx, false), 260]] as const) {
        const g = this.mallasObra(obra);
        g.position.copy(c3).negate();
        const nivel = new THREE.Group();
        nivel.add(g);
        lod.addLevel(nivel, dist);
      }
      this.escena.add(lod);
    }
    // MERCADO · Mercado de Abastos La Concepción (visitable: se entra por los portones).
    {
      const lod = new THREE.LOD();
      const c3 = p3(CENTRO_MERCADO);
      lod.position.copy(c3);
      for (const [obra, dist] of [[construirMercado(ctx, true), 0], [construirMercado(ctx, false), 260]] as const) {
        const g = this.mallasObra(obra);
        g.position.copy(c3).negate();
        const nivel = new THREE.Group();
        nivel.add(g);
        lod.addLevel(nivel, dist);
      }
      this.escena.add(lod);
      this.hacerTocable(lod, { tipo: "lugar", id: "mercado" });
    }
    // TOROS · Plaza de Toros El Arenal y su entorno.
    {
      const lod = new THREE.LOD();
      const c3 = p3(CENTRO_TOROS);
      lod.position.copy(c3);
      for (const [obra, dist] of [[construirToros(ctx, true), 0], [construirToros(ctx, false), 260]] as const) {
        const g = this.mallasObra(obra);
        g.position.copy(c3).negate();
        const nivel = new THREE.Group();
        nivel.add(g);
        lod.addLevel(nivel, dist);
      }
      this.escena.add(lod);
    }
    // Ciudad generada automáticamente desde datos reales (scripts/sector/ciudad.py), por teselas.
    this.ciudad = new GestorCiudad(ctx, (o) => this.escena.add(o), (o) => this.escena.remove(o), (o) => this.mallasObra(o), (id, p) => this.colisionesTesela(id, p as Punto[][] | null));
    (globalThis as unknown as { __ciudad: unknown }).__ciudad = this.ciudad;
    // Manzanas modeladas en Blender (scripts/blender): sustituyen a los edificios procedurales.
    this.blender = new ModelosBlender(ctx, (o) => this.escena.add(o));
    (globalThis as unknown as { __blender: unknown }).__blender = this.blender;
    void conectarBackend();
    // Personajes de referencia del nuevo estilo, charlando junto al monumento.
    const pareja: [Aspecto, Punto, Punto][] = [
      [REFERENCIA_HOMBRE, [2207.2, 4284.4], [2210, 4287.2]],
      [REFERENCIA_MUJER, [2210, 4287.2], [2207.2, 4284.4]],
    ];
    for (const [a, p, mira] of pareja) {
      const g = crearPersonaje(a);
      g.position.copy(p3(p));
      g.rotation.y = Math.atan2(mira[0] - p[0], mira[1] - p[1]);
      ponerEstado(g, "hablar");
      this.figurantes.push(g);
      this.escena.add(g);
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
    this.construirSectores();
    this.prepararColisiones();
    poner(M.tablon(), TABLON, { tipo: "tablon" }, mirar(TABLON, nodoDe("plaza")), 0.45);
    // Mercado de Abastos: modelo propio en construirSectores (sectores/mercado.ts); aquí, el puesto 14 delante.
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
      const g = crearPersonaje({ ...ASPECTO_NPC[id], piel: p.piel, ropa: p.ropa, pelo: p.canas ? "#D9D9D6" : p.pelo });
      poner(g, POS_NPC[id], { tipo: "npc", id }, Math.random() * 6);
      this.npcs.set(id, g);
      this.etiqueta("npc", p.nombre, p3(POS_NPC[id], SUELO + 3.1));
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
    // Los coches solo circulan por calzada de asfalto (nunca por peatonales ni plataformas únicas).
    const conducibles = TRAMOS.filter((t) => esCalzada(t) && t.largo > 6 && (adyCoche().get(t.a)?.length ?? 0) + (adyCoche().get(t.b)?.length ?? 0) > 2);
    const principales = conducibles.filter((t) => t.clase <= 2);
    const aceras = TRAMOS.filter((t) => (t.clase <= 4 || t.clase === 6) && t.largo > 6);
    const nuevo = (lista: Tramo[], v: number, lado: number): Movil => {
      const t = lista[Math.floor(rand() * lista.length)];
      return { t, dir: rand() < 0.5 ? 1 : -1, s: rand() * t.largo, v: v * (0.8 + rand() * 0.4), lado, red: lista === aceras ? "pie" : "coche" };
    };
    for (let i = 0; i < 170; i++) this.coches.push(nuevo(rand() < 0.65 && principales.length ? principales : conducibles, 16, 1));
    for (let i = 0; i < 240; i++) this.peatones.push(nuevo(aceras, 2.6, 0));
    const colores = ["#E8423C", "#FFFFFF", "#2F6DB5", "#F2C230", "#2B2D31", "#9AA4B2", "#3FA046", "#F28C28", "#C4E910"].map((c) => new THREE.Color(c));
    const [carroceria, oscuro] = geometriaCoche();
    this.mallaCoches = new THREE.InstancedMesh(carroceria, M.mat("#FFFFFF", { roughness: 0.3, metalness: 0.35 }), this.coches.length);
    this.mallaCabinas = new THREE.InstancedMesh(oscuro, M.mat("#202833", { roughness: 0.2, metalness: 0.4 }), this.coches.length);
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
    // Autobuses urbanos (modelo de Blender) por las avenidas.
    for (let i = 0; i < 7; i++) {
      const g = autobusUrbano();
      this.escena.add(g);
      this.autobuses.push({ m: nuevo(principales, 11, 1), g });
    }
    (globalThis as unknown as { __autobuses: unknown }).__autobuses = this.autobuses; // pruebas
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
      const opciones = (m.red === "pie" ? ADY_PIE : adyCoche()).get(nodo) ?? [];
      const otras = opciones.filter((t) => t !== m.t);
      const sig = (otras.length ? otras : opciones)[Math.floor(Math.random() * Math.max(1, (otras.length ? otras : opciones).length))] ?? m.t;
      m.dir = sig.a === nodo ? 1 : -1;
      m.t = sig;
      m.s = m.dir === 1 ? sobra : sig.largo - sobra;
    }
    // Carril derecho dentro de la calzada (en calles de un carril, por el centro); los peatones,
    // por el centro de la acera o, en las peatonales, a un lado de la calle.
    const w = anchoDe(m.t);
    const carril = m.lado ? Math.max(0, Math.min(w / 4 + 0.2, w / 2 - 1.15)) : 0;
    const acera = m.red === "pie" ? (conAceras(m.t) ? w / 2 + aceraDe(m.t) / 2 : w * 0.28) : 0;
    return sobreTramo(m.t, Math.max(0, Math.min(m.t.largo, m.s)), m.dir, carril, acera);
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
        const g = crearPersonaje(aspectoJugador(v.piel, v.ropa, v.id));
        g.position.copy(v3(v.x, v.y));
        this.escena.add(g);
        r = { g, e: this.etiqueta("vecino", "", v3(v.x, v.y, SUELO + 3.3)), meta: v3(v.x, v.y), emote: this.etiqueta("emote", "", v3(v.x, v.y, SUELO + 4.1)), rot: null, anim: "quieto", dicho: null, dichoT: 0 };
        this.vecinos.set(v.id, r);
      }
      r.e.el.textContent = `${v.nombre} · Nv ${v.nivel}`;
      r.meta.copy(v3(v.x, v.y));
      r.rot = typeof v.r === "number" ? v.r : null;
      r.anim = v.anim ?? "quieto";
      r.emote.el.innerHTML = v.emote && esIconoJuego(v.emote) ? iconoJuego(v.emote, 30) : "";
      r.emote.el.style.display = v.emote ? "" : "none";
    }
    for (const [id, r] of this.vecinos) {
      if (vistos.has(id)) continue;
      this.escena.remove(r.g);
      r.e.el.remove();
      r.emote.el.remove();
      r.dicho?.el.remove();
      this.etiquetas = this.etiquetas.filter((x) => x !== r.e && x !== r.emote && x !== r.dicho);
      this.vecinos.delete(id);
    }
  }

  /** Bocadillo de chat sobre un jugador ("yo" o el id de un vecino) durante unos segundos. */
  private dichoYo: Etiqueta | null = null;
  private dichoYoT = 0;
  bocadillo(quien: string, texto: string) {
    const crear = () => {
      const e = this.etiqueta("burbuja dicho", "", new THREE.Vector3());
      e.el.style.pointerEvents = "none";
      return e;
    };
    if (quien === "yo") {
      this.dichoYo ??= crear();
      this.dichoYo.el.textContent = texto;
      delete this.dichoYo.el.dataset.w;
      this.dichoYoT = performance.now();
      return;
    }
    const r = this.vecinos.get(quien);
    if (!r) return;
    r.dicho ??= crear();
    r.dicho.el.textContent = texto;
    delete r.dicho.el.dataset.w;
    r.dichoT = performance.now();
  }

  /** Orientación actual del personaje (para enviarla a los demás). */
  get rotJugador() {
    return (this.enBus ? this.busJugador : this.jugador).rotation.y;
  }

  /** Coloca al personaje en un punto del mapa (teletransporte por invitación). */
  colocarEn(x: number, y: number) {
    this.camino = [];
    this.jugador.position.copy(v3(x, y));
    this.objetivoCam.copy(v3(x, y));
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

  /* ── Etiquetas HTML sobre el mundo ──────────────────────────────────── */

  /** Chinchetas de Hogar Linense en el mapa (tus casas y las que se venden). */
  private pinesHogar: Etiqueta[] = [];
  pines(lista: { x: number; y: number; texto: string; clase: string }[]) {
    for (const p of this.pinesHogar) {
      p.el.remove();
      this.etiquetas.splice(this.etiquetas.indexOf(p), 1);
    }
    this.pinesHogar = lista.map((p) => this.etiqueta(`pin-hogar ${p.clase}`, p.texto, v3(p.x, p.y, 16)));
  }

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
    if (this.jugador.userData.aspecto.ropa !== c) recolorear(this.jugador, { ropa: c });
  }

  set piel(c: string) {
    if (this.jugador.userData.aspecto.piel !== c) recolorear(this.jugador, { piel: c });
  }

  /** Aspecto elegido por el jugador (peinado, atuendo, complementos…). */
  aspectoJugador(cambios: Partial<Aspecto>) {
    cambiarAspecto(this.jugador, cambios);
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

  /** Altura del suelo pisable en un punto del mundo (rayo vertical; con caché). */
  alturaSuelo(x: number, z: number) {
    const k = `${Math.round(x * 2.5)},${Math.round(z * 2.5)}`;
    const c = this.alturas.get(k);
    if (c !== undefined) return c;
    const lista = [...this.suelos];
    const t = this.trozoDe(x + CX, z + CY);
    if (t.grupo?.userData.suelo) lista.push(t.grupo.userData.suelo);
    this.rayoSuelo.set(this.tmpV.set(x, SUELO + 2.2, z), new THREE.Vector3(0, -1, 0));
    this.rayoSuelo.far = 2.8;
    // En los cruces la calzada manda sobre la acera que queda debajo de ella.
    const hits = this.rayoSuelo.intersectObjects(lista, false);
    const hit = hits.find((h) => h.object.userData.calzada) ?? hits[0];
    const h = hit ? Math.max(SUELO, hit.point.y) : SUELO;
    if (this.alturas.size > 20000) this.alturas.clear();
    this.alturas.set(k, h);
    return h;
  }

  get andando() {
    return this.camino.length > 0 || this.libreAndando;
  }

  private prepararColisiones() {
    const meter = (x0: number, y0: number, x1: number, y1: number, s: { r: [number, number, number, number, number] } | { p: Punto[] }) => {
      for (let cx = Math.floor(x0 / 20); cx <= Math.floor(x1 / 20); cx++)
        for (let cy = Math.floor(y0 / 20); cy <= Math.floor(y1 / 20); cy++) {
          const k = `${cx},${cy}`;
          if (!this.solidos.has(k)) this.solidos.set(k, []);
          this.solidos.get(k)!.push(s);
        }
    };
    for (const b of this.edificios) {
      if (b.estilo === 11) continue;
      const r = Math.hypot(b.w, b.d) / 2;
      meter(b.x - r, b.y - r, b.x + r, b.y + r, { r: [b.x, b.y, b.w / 2, b.d / 2, b.ang] });
    }
    const ocupado = (p: [number, number]) => this.ocupadoOSM(p);
    for (const poli of [...solidosCentro01(), ...solidosCentro02(ocupado)]) {
      const xs = poli.map((p) => p[0]);
      const ys = poli.map((p) => p[1]);
      meter(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), { p: poli as Punto[] });
    }
  }

  /** ¿Choca un círculo de radio 0,35 m en (x, y) del mapa con algún edificio? */
  private choca(x: number, y: number) {
    const R = 0.35;
    for (const s of this.solidos.get(`${Math.floor(x / 20)},${Math.floor(y / 20)}`) ?? []) {
      if ("r" in s) {
        const [cx, cy, hw, hd, ang] = s.r;
        const dx = x - cx;
        const dy = y - cy;
        const lx = dx * Math.cos(ang) + dy * Math.sin(ang);
        const lz = -dx * Math.sin(ang) + dy * Math.cos(ang);
        if (Math.abs(lx) < hw + R && Math.abs(lz) < hd + R) return true;
      } else if (dentroPoli([x, y], s.p) || cercaPoli([x, y], s.p, R)) return true;
    }
    for (const s of this.solidosTeselas.get(`${Math.floor(x / 20)},${Math.floor(y / 20)}`) ?? []) if (dentroPoli([x, y], s.p) || cercaPoli([x, y], s.p, R)) return true;
    return false;
  }

  /** ¿Choca el jugador con un coche o un autobús? (rectángulos orientados de cada vehículo) */
  private chocaVehiculo(x: number, y: number) {
    const R = 0.35;
    const dentro = (cx: number, cy: number, rot: number, largo: number, ancho: number) => {
      const dx = x - cx, dy = y - cy;
      const f = dx * Math.sin(rot) + dy * Math.cos(rot);
      const l = dx * Math.cos(rot) - dy * Math.sin(rot);
      return Math.abs(f) < largo / 2 + R && Math.abs(l) < ancho / 2 + R;
    };
    for (const [cx, cy, rot] of this.posCoches) if (Math.abs(cx - x) < 4 && Math.abs(cy - y) < 4 && dentro(cx, cy, rot, 4.4, 1.8)) return true;
    for (const b of this.autobuses) if (dentro(b.g.position.x + CX, b.g.position.z + CY, b.g.rotation.y, 10.2, 3.1)) return true;
    return false;
  }

  /** Movimiento libre: dirección relativa a la cámara, con choques y deslizamiento por las fachadas. */
  private moverLibre(dt: number) {
    const { x, y, correr } = this.entrada;
    const mag = Math.min(1, Math.hypot(x, y));
    if (mag < 0.08 || this.enBus || this.modoDemo) {
      if (this.libreAndando) {
        this.libreAndando = false;
        ponerEstado(this.jugador, "quieto");
        this.onParadaLibre(this.posicionJugador);
      }
      return;
    }
    if (this.camino.length) {
      this.camino = [];
      this.alLlegar = null;
    }
    this.libreAndando = true;
    // Ejes de la pantalla proyectados al suelo.
    const yaw = this.modoPOV ? this.jugador.rotation.y + this.povYaw : Math.atan2(this.objetivoCam.x - this.camara.position.x, this.objetivoCam.z - this.camara.position.z);
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    // Arriba en pantalla = hacia donde mira la cámara; derecha = (−fz, fx).
    const n = Math.hypot(x, y);
    const dx = (-y * fx - x * fz) / n;
    const dz = (-y * fz + x * fx) / n;
    const vel = (correr ? 9 : 4.2) * mag;
    const j = this.jugador.position;
    const px = j.x + CX;
    const py = j.z + CY;
    const nx = px + dx * vel * dt;
    const ny = py + dz * vel * dt;
    const bloquea = (a: number, b: number) => this.choca(a, b) || this.chocaVehiculo(a, b);
    if (!bloquea(nx, ny)) j.set(nx - CX, SUELO, ny - CY);
    else if (!bloquea(nx, py)) j.x = nx - CX;
    else if (!bloquea(px, ny)) j.z = ny - CY;
    const objetivo = Math.atan2(dx, dz);
    let giro = objetivo - this.jugador.rotation.y;
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    this.jugador.rotation.y += giro * Math.min(1, dt * 12);
    if (this.modoPOV) this.povYaw -= giro * Math.min(1, dt * 12);
    ponerEstado(this.jugador, correr ? "correr" : "andar", vel);
    this.ultimoArrastre = 0;
    this.destinoCam = null;
    this.foco = null;
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

  /** Cadena de render según la calidad: MSAA, oclusión ambiental (alta), efecto maqueta suave y salida. */
  private montarComposer() {
    const q = this.ajustesCalidad;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixel));
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: q.msaa });
    this.composer?.dispose();
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.escena, this.camara));
    this.ao = null;
    if (q.ao) {
      this.ao = new GTAOPass(this.escena, this.camara, 1, 1);
      this.ao.blendIntensity = 0.85;
      this.ao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.4, thickness: 1.2, scale: 1 });
      this.composer.addPass(this.ao);
    }
    if (q.tilt) {
      this.composer.addPass(this.tiltH);
      this.composer.addPass(this.tiltV);
    }
    this.composer.addPass(new OutputPass());
  }

  /** Cambia la calidad gráfica (baja, media, alta) y la recuerda. */
  calidad(nivel?: NivelCalidad) {
    if (!nivel) return (Object.keys(CALIDADES) as NivelCalidad[]).find((k) => CALIDADES[k] === this.ajustesCalidad) ?? "media";
    this.ajustesCalidad = CALIDADES[nivel];
    try {
      localStorage.setItem("mi-linea-calidad", nivel);
    } catch {
      /* sin almacenamiento: solo esta sesión */
    }
    this.sol.shadow.mapSize.set(this.ajustesCalidad.sombra, this.ajustesCalidad.sombra);
    this.sol.shadow.map?.dispose();
    this.sol.shadow.map = null;
    // Los trozos se reconstruyen con la nueva configuración.
    this.obra = null;
    for (const t of this.trozos.values()) {
      if (!t.grupo) continue;
      if (t.visible) this.lejanos(t, false);
      liberar(t.grupo);
      this.escena.remove(t.grupo);
      t.grupo = null;
      t.visible = false;
    }
    this.montarComposer();
    this.ajustar();
    return nivel;
  }

  private ajustar() {
    const r = this.canvas.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(r.width, r.height);
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
    const k = this.modoPOV ? 0 : this.alto < 70 ? 0.3 : this.alto < 400 ? 0.8 : this.alto < 900 ? 0.6 : 0.4;
    this.tiltH.uniforms.h.value = k / Math.max(1, r.width);
    this.tiltV.uniforms.v.value = k / Math.max(1, r.height);
  }

  /** Activa o quita la vista a pie de calle (cámara detrás del personaje, a la altura de los ojos). */
  alternarPOV(activo = !this.modoPOV) {
    if (activo === this.modoPOV) return;
    this.modoPOV = activo;
    if (activo) {
      this.altoAntesPOV = this.alto;
      this.alto = 40;
      this.altoMeta = null;
      this.povYaw = 0;
      this.povPitch = 0;
    } else {
      this.alto = this.altoAntesPOV;
      this.camara.near = 2;
      this.jugador.visible = true;
    }
    this.proyeccion();
  }

  /**
   * Vista a pie de calle en primera persona: la cámara está en los ojos del personaje
   * (que no se dibuja) y mira hacia donde camina; arrastrar gira la cabeza. En el autobús,
   * la cámara va detrás del vehículo.
   */
  private colocarCamaraPOV() {
    const j = this.enBus ? this.busJugador : this.jugador;
    const yaw = j.rotation.y + this.povYaw;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const ojos = 1.62 * ESCALA_PERSONAJE;
    if (this.enBus) {
      const deseada = new THREE.Vector3(j.position.x - fx * 16, j.position.y + ojos + 5 + this.povPitch * 2.5, j.position.z - fz * 16);
      if (this.camara.position.distanceTo(deseada) > 40) this.camara.position.copy(deseada);
      else this.camara.position.lerp(deseada, 0.18);
      this.camara.lookAt(j.position.x + fx * 6, j.position.y + ojos * 0.9 - this.povPitch * 6, j.position.z + fz * 6);
    } else {
      this.jugador.visible = false;
      // Los ojos van un poco por delante del centro del cuerpo; la mirada sube y baja con el arrastre.
      this.camara.position.set(j.position.x + fx * 0.12, j.position.y + ojos, j.position.z + fz * 0.12);
      const p = this.povPitch * 0.9;
      this.camara.lookAt(this.camara.position.x + fx * Math.cos(p), this.camara.position.y - Math.sin(p), this.camara.position.z + fz * Math.cos(p));
    }
    this.objetivoCam.set(j.position.x, SUELO, j.position.z);
    const fov = this.enBus ? 60 : this.povFov;
    if (this.camara.fov !== fov || this.camara.near !== 0.08) {
      this.camara.fov = fov;
      this.camara.near = 0.08;
      this.camara.far = 1400;
      this.camara.updateProjectionMatrix();
    }
    // Calima a pie de calle: da profundidad y oculta el final de la ciudad cargada.
    const niebla = this.escena.fog as THREE.Fog;
    niebla.near = 160;
    niebla.far = 1200;
    this.tiltH.uniforms.h.value = 0;
    this.tiltV.uniforms.v.value = 0;
  }

  private colocarCamara() {
    if (this.modoPOV) return this.colocarCamaraPOV();
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
    niebla.near = d * 3;
    niebla.far = d * 10 + 900;
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
        if ((!this.toque || this.toque.movido) && this.modoPOV) {
          // A pie de calle, arrastrar gira la mirada.
          this.povYaw -= (ahora.x - prev.x) * 0.006;
          this.povPitch = Math.max(-0.6, Math.min(0.7, this.povPitch + (ahora.y - prev.y) * 0.003));
        } else if (!this.toque || this.toque.movido) {
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
    this.altoMeta = Math.max(90, Math.min(5200, alto));
  }

  /** Zoom progresivo: fija una altura objetivo y la cámara llega con suavidad. */
  zoom(f: number) {
    if (this.modoPOV) {
      this.povFov = Math.max(40, Math.min(80, this.povFov * f));
      return;
    }
    this.altoMeta = Math.max(18, Math.min(5200, (this.altoMeta ?? this.alto) * f));
  }

  private limitar() {
    this.objetivoCam.x = Math.max(-CX + 200, Math.min(2800, this.objetivoCam.x));
    this.objetivoCam.z = Math.max(-CY + 100, Math.min(3000, this.objetivoCam.z));
  }

  private tocar(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camara);
    if (this.editorCiudad) {
      const lods = this.ciudad.objetos();
      const g = this.ray.intersectObjects(lods, true)[0];
      const p = g ? g.point.clone().addScaledVector(this.ray.ray.direction, 0.05) : this.alSuelo(cx, cy);
      if (p) this.editorCiudad(p.x + CX, p.z + CY);
      return;
    }
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
    if (mejor) {
      this.onTocar({ tipo: "lugar", id: mejor });
      return;
    }
    const b = this.edificioBajo(this.ray.ray);
    if (b) {
      this.seleccionar(b);
      this.onTocar({ tipo: "edificio", ficha: this.ficha(b) });
    }
  }

  /* ── Selección de edificios ──────────────────────────────────────────── */

  private rejillaEdif = new Map<string, EdificioDet[]>();

  /** Edificio que atraviesa el rayo primero (caja orientada de cada edificio cercano a su recorrido). */
  private edificioBajo(rayo: THREE.Ray) {
    if (!this.rejillaEdif.size) {
      for (const b of this.edificios) {
        const k = `${Math.floor(b.x / 20)},${Math.floor(b.y / 20)}`;
        if (!this.rejillaEdif.has(k)) this.rejillaEdif.set(k, []);
        this.rejillaEdif.get(k)!.push(b);
      }
    }
    // Tramo del rayo entre 70 unidades de altura y el suelo.
    const dy = rayo.direction.y;
    if (dy >= -0.01) return null;
    const t0 = (SUELO + 70 - rayo.origin.y) / dy;
    const t1 = (SUELO - rayo.origin.y) / dy;
    const celdas = new Set<string>();
    for (let t = Math.max(0, t0); t <= t1; t += 6) {
      const p = rayo.at(t, new THREE.Vector3());
      const x = p.x + CX;
      const y = p.z + CY;
      for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) celdas.add(`${Math.floor(x / 20) + a},${Math.floor(y / 20) + c}`);
    }
    let mejor: EdificioDet | null = null;
    let tMin = Infinity;
    for (const k of celdas) {
      for (const b of this.rejillaEdif.get(k) ?? []) {
        // Rayo al sistema local del edificio (giro −ang alrededor de Y).
        const ox = rayo.origin.x - (b.x - CX);
        const oz = rayo.origin.z - (b.y - CY);
        const c = Math.cos(b.ang);
        const s = Math.sin(b.ang);
        const lo = [ox * c + oz * s, rayo.origin.y - SUELO, -ox * s + oz * c];
        const ld = [rayo.direction.x * c + rayo.direction.z * s, rayo.direction.y, -rayo.direction.x * s + rayo.direction.z * c];
        const min = [-b.w / 2, 0, -b.d / 2];
        const max = [b.w / 2, b.h + (b.teja ? Math.min(b.w, b.d) * 0.3 : 1), b.d / 2];
        let tn = -Infinity;
        let tf = Infinity;
        let ok = true;
        for (let i = 0; i < 3 && ok; i++) {
          if (Math.abs(ld[i]) < 1e-9) {
            if (lo[i] < min[i] || lo[i] > max[i]) ok = false;
            continue;
          }
          let a = (min[i] - lo[i]) / ld[i];
          let z = (max[i] - lo[i]) / ld[i];
          if (a > z) [a, z] = [z, a];
          tn = Math.max(tn, a);
          tf = Math.min(tf, z);
          if (tn > tf) ok = false;
        }
        if (ok && tf > 0 && tn < tMin) {
          tMin = tn;
          mejor = b;
        }
      }
    }
    return mejor;
  }

  /** Contorno animado y anillo en el suelo sobre el edificio elegido. */
  seleccionar(b: EdificioDet | null) {
    if (!b) {
      this.marcas.calco("seleccion", null);
      this.marcas.marcar("seleccion", null);
      return;
    }
    // Calco con la huella del edificio en el suelo y un pin de interfaz sobre la cubierta.
    const c = v3(b.x, b.y, SUELO);
    const alto = b.h + (b.teja ? Math.min(b.w, b.d) * 0.3 : 1);
    this.marcas.calco("seleccion", { x: c.x, y: this.alturaSuelo(c.x, c.z) + 0.12, z: c.z, ancho: b.w + 3.2, fondo: b.d + 3.2, giro: -b.ang });
    this.marcas.marcar("seleccion", c.clone().setY(SUELO + alto + 3));
  }

  private ficha(b: EdificioDet): FichaEdificio {
    let calle = "";
    let dMin = Infinity;
    let punto: Punto = [b.x, b.y];
    for (const t of TRAMOS) {
      if (!t.nombre || t.clase > 4) continue;
      for (const p of t.puntos) {
        const d = (p[0] - b.x) ** 2 + (p[1] - b.y) ** 2;
        if (d < dMin) {
          dMin = d;
          calle = t.nombre;
          punto = p;
        }
      }
    }
    let barrio = "";
    let dB = Infinity;
    for (const z of Object.values(BARRIOS)) {
      const d = (z.rotulo[0] - b.x) ** 2 + (z.rotulo[1] - b.y) ** 2;
      if (d < dB) (dB = d), (barrio = z.nombre);
    }
    return { tipo: NOMBRE_ESTILO[b.estilo] ?? "Edificio", plantas: b.pl, calle, barrio, comercio: b.tienda, punto, idx: b.idx };
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

  private msFotograma = 16;
  private ultimoDibujo = 0;
  /** Dentro de una vivienda la ciudad no se dibuja (el interior tiene su lienzo). */
  pausado = false;

  private fotograma() {
    const crudo = this.reloj.getDelta();
    if (this.pausado) return;
    this.msFotograma = this.msFotograma * 0.9 + crudo * 1000 * 0.1;
    const dt = Math.min(0.12, crudo);
    const t = this.reloj.elapsedTime;

    this.moverLibre(dt);
    // Ciudad generada: teselas cercanas a la cámara (o al jugador a pie de calle), un paso de construcción por fotograma.
    if (this.ciudad) {
      const ahora = performance.now();
      if (ahora - this.ultimaCiudad > 400) {
        this.ultimaCiudad = ahora;
        const p = this.modoPOV ? this.jugador.position : this.objetivoCam;
        this.ciudad.actualizar(p.x + CX, p.z + CY);
        this.blender.actualizar(p.x + CX, p.z + CY);
      } else this.ciudad.paso();
    }
    // Personaje andando por la forma real de las calles.
    if (this.camino.length) {
      // Velocidad según lo que queda: paseo en lo corto, carrera en los trayectos largos.
      let queda = 0;
      let px = this.jugador.position.x;
      let pz = this.jugador.position.z;
      for (const q of this.camino) {
        queda += Math.hypot(q.x - px, q.z - pz);
        px = q.x;
        pz = q.z;
        if (queda > 400) break;
      }
      const meta = Math.max(4.2, Math.min(34, queda * 0.35));
      this.velJug += (meta - this.velJug) * (1 - Math.pow(0.05, dt));
      ponerEstado(this.jugador, this.velJug > 9 ? "correr" : "andar", this.velJug);
      let avance = this.velJug * dt;
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
      this.jugador.position.y = SUELO;
      if (!this.camino.length) {
        this.velJug = 0;
        ponerEstado(this.jugador, "quieto");
        const f = this.alLlegar;
        this.alLlegar = null;
        f?.();
      }
    }

    // El personaje pisa la superficie real (calzada, acera o pavimento), no el terreno de debajo.
    if (!this.enBus) this.jugador.position.y = this.alturaSuelo(this.jugador.position.x, this.jugador.position.z);

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
    // Coches con distancia de seguridad: frenan si tienen delante otro coche, un autobús o al
    // jugador, y arrancan suave. Si llevan mucho parados (cruce trabado), se ceden el paso.
    const rejilla = new Map<string, number[]>();
    const celda = (x: number, y: number) => `${Math.floor(x / 8)},${Math.floor(y / 8)}`;
    const meter = (x: number, y: number, k: number) => {
      const c = celda(x, y);
      if (!rejilla.has(c)) rejilla.set(c, []);
      rejilla.get(c)!.push(k);
    };
    this.posCoches.forEach(([x, y], k) => meter(x, y, k));
    this.autobuses.forEach((b, k) => meter(b.g.position.x + CX, b.g.position.z + CY, -1 - k));
    const yo = this.jugador.position;
    const jx = yo.x + CX, jy = yo.z + CY;
    this.coches.forEach((c, i) => {
      const prev = this.posCoches[i];
      if (prev) {
        const [px, py, rot] = prev;
        const fx = Math.sin(rot), fy = Math.cos(rot);
        let bloqueado = false;
        // Punto a 4,5 m por delante del morro: ¿hay alguien?
        for (const dd of [3, 5.5]) {
          const ax = px + fx * dd, ay = py + fy * dd;
          if (!this.enBus && Math.hypot(jx - ax, jy - ay) < 2.2) bloqueado = true;
          for (let ox = -1; ox <= 1 && !bloqueado; ox++) for (let oy = -1; oy <= 1 && !bloqueado; oy++) {
            for (const k of rejilla.get(`${Math.floor(ax / 8) + ox},${Math.floor(ay / 8) + oy}`) ?? []) {
              if (k === i) continue;
              const q = k >= 0 ? this.posCoches[k] : null;
              const qx = q ? q[0] : this.autobuses[-1 - k].g.position.x + CX;
              const qy = q ? q[1] : this.autobuses[-1 - k].g.position.z + CY;
              if (Math.hypot(qx - ax, qy - ay) < (k >= 0 ? 1.8 : 3.2)) {
                bloqueado = true;
                break;
              }
            }
          }
        }
        c.espera = bloqueado ? (c.espera ?? 0) + dt : 0;
        const cede = (c.espera ?? 0) > 4 && (c.espera ?? 0) < 6;
        const meta = bloqueado && !cede ? 0 : 1;
        c.marcha = (c.marcha ?? 1) + (meta - (c.marcha ?? 1)) * Math.min(1, dt * (meta ? 1.2 : 6));
      }
      const p = this.avanzar(c, dt * (c.marcha ?? 1));
      this.posCoches[i] = [p.x, p.y, p.rot];
      o.position.set(p.x - CX, ALTO_CALLE + 1, p.y - CY);
      o.rotation.set(0, p.rot, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      this.mallaCoches.setMatrixAt(i, o.matrix);
      this.mallaCabinas.setMatrixAt(i, o.matrix);
    });
    this.peatones.forEach((c, i) => {
      const p = this.avanzar(c, dt);
      const paso = Math.abs(Math.sin(t * 8 + i)) * 0.25;
      o.position.set(p.x - CX, SUELO + 1.3 + paso, p.y - CY);
      o.rotation.set(0, p.rot, Math.sin(t * 8 + i) * 0.08);
      o.updateMatrix();
      this.mallaPeatones.setMatrixAt(i, o.matrix);
      o.position.y = SUELO + 2.6 + paso;
      o.updateMatrix();
      this.mallaCabezas.setMatrixAt(i, o.matrix);
    });
    for (const m of [this.mallaCoches, this.mallaCabinas, this.mallaPeatones, this.mallaCabezas]) m.instanceMatrix.needsUpdate = true;
    for (const b of this.autobuses) {
      const p = this.avanzar(b.m, dt);
      b.g.position.set(p.x - CX, ALTO_CALLE, p.y - CY);
      b.g.rotation.y = p.rot;
    }
    for (const pv of this.pavos)
      pv.actualizar(Math.min(dt, 0.1), t, (g, x, y, rumbo) => {
        g.position.set(x - CX, SUELO + 0.13, y - CY);
        g.rotation.y = rumbo;
      });
    for (const gv of this.gaviotas) {
      const ang = t * gv.v + gv.f;
      gv.g.position.set(gv.c.x + Math.cos(ang) * gv.r, gv.c.y + Math.sin(t * 0.7 + gv.f) * 2, gv.c.z + Math.sin(ang) * gv.r);
      gv.g.rotation.set(0, -ang, Math.sin(t * 1.3 + gv.f) * 0.2);
      const aleteo = Math.sin(t * 9 + gv.f) * 0.5;
      gv.g.children[0].rotation.z = aleteo;
      gv.g.children[1].rotation.z = -aleteo;
    }
    // Vecinos conectados: se deslizan hacia su última posición.
    // Interpolación: posición suave hacia la última recibida; giro por la orientación enviada.
    for (const r of this.vecinos.values()) {
      const d = r.meta.clone().sub(r.g.position);
      const lejos = d.length();
      if (lejos > 60) r.g.position.copy(r.meta);
      const objetivo = r.rot ?? (lejos > 0.3 ? Math.atan2(d.x, d.z) : r.g.rotation.y);
      let giro = objetivo - r.g.rotation.y;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      r.g.rotation.y += giro * (1 - Math.pow(0.001, dt));
      r.g.position.lerp(r.meta, 1 - Math.pow(0.02, dt));
      const andando = r.anim === "andar" || lejos > 0.4;
      r.g.position.y = this.alturaSuelo(r.g.position.x, r.g.position.z);
      ponerEstado(r.g, andando ? (lejos > 8 ? "correr" : "andar") : r.emote.el.innerHTML ? "saludar" : "quieto", andando ? Math.min(30, 4 + lejos * 2) : 0);
      r.e.pos.copy(r.g.position).setY(SUELO + 3.3);
      r.emote.pos.copy(r.g.position).setY(SUELO + 4.1);
      if (r.dicho) {
        r.dicho.pos.copy(r.g.position).setY(SUELO + 4.6);
        r.dicho.el.style.display = performance.now() - r.dichoT < 6000 ? "" : "none";
      }
    }
    if (this.dichoYo) {
      this.dichoYo.pos.copy((this.enBus ? this.busJugador : this.jugador).position).setY(SUELO + 4.6);
      this.dichoYo.el.style.display = performance.now() - this.dichoYoT < 6000 ? "" : "none";
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
    this.actualizarMarcas(dt);
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
    // Personajes: animaciones compartidas (los lejanos se actualizan menos a menudo).
    this.cuadro = (this.cuadro + 1) % 4;
    const cam = this.camara.position;
    const animar = (g: Personaje, i: number) => {
      if (!g.visible) return;
      // Los que están en la escena se apoyan en el suelo real (los del estadio van en su grupo).
      if (g.parent === this.escena && (i + this.cuadro) % 4 === 0) g.position.y = this.alturaSuelo(g.position.x, g.position.z);
      const lejos = g.getWorldPosition(this.tmpV).distanceToSquared(cam) > 160 * 160;
      if (!lejos || (i + this.cuadro) % 4 === 0) animarPersonaje(g, t, lejos ? dt * 4 : dt);
    };
    animar(this.jugador, 0);
    let i = 1;
    for (const g of this.npcs.values()) animar(g, i++);
    for (const r of this.vecinos.values()) animar(r.g, i++);
    for (const g of this.figurantes) animar(g, i++);

    this.luz();
    viento.tiempo.value = performance.now() / 1000;
    viento.fuerza.value = this.viento === "levanteFuerte" ? 2.4 : this.viento === "levante" ? 1.5 : this.viento === "calma" ? 0.35 : 0.85;
    this.actualizarDetalle();
    // ?fps=N limita los fotogramas dibujados (pruebas con varios navegadores en un equipo).
    if (LIMITE_FPS && performance.now() - this.ultimoDibujo < 1000 / LIMITE_FPS) return;
    this.ultimoDibujo = performance.now();
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
    this.cielo.intensity = 0.45 + 0.4 * dia;
    this.escena.environmentIntensity = 0.15 + 0.4 * dia;
    if (matLuz) matLuz.emissiveIntensity = Math.pow(1 - dia, 1.5) * 1.8;
    this.cielo.color.copy(C_HEMI_NOCHE).lerp(C_HEMI, dia);
    for (const f of this.faroles) (f as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + (1 - dia) * 2.2;
  }

  /** Marcadores gráficos: dónde estás, a dónde vas, el objetivo y lo seleccionado. */
  private actualizarMarcas(dt: number) {
    const m = this.marcas;
    const suelo = (p: THREE.Vector3) => this.alturaSuelo(p.x, p.z) + 0.1;
    if (this.objetivo) {
      const p = nodo3(LUGARES[this.objetivo].nodo);
      m.calco("objetivo", { x: p.x, y: suelo(p), z: p.z, ancho: 11 });
      m.marcar("objetivo", p.setY(SUELO + 9));
    } else {
      m.calco("objetivo", null);
      m.marcar("objetivo", null);
    }
    const j = this.jugador.position;
    const aPie = !this.enBus && !this.modoDemo && this.jugador.visible;
    m.calco("jugador", aPie && !this.modoPOV ? { x: j.x, y: suelo(j), z: j.z, ancho: 2.8 } : null);
    const fin = this.camino[this.camino.length - 1];
    m.calco("destino", aPie && fin ? { x: fin.x, y: suelo(fin), z: fin.z, ancho: 3.4 } : null);
    const r = this.canvas.getBoundingClientRect();
    m.actualizar(dt, this.camara, r.width, r.height, { arriba: 96, abajo: 110 }, j, this.modoDemo || this.pausado);
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
      // Nivel 2 (contextual): sin el modo información, cada nombre solo aparece cerca del jugador,
      // si es el objetivo o si está seleccionado. Los avisos (burbujas, gestos) siempre.
      const cerca = (m: number) => e.pos.distanceTo(this.jugador.position) < m;
      const contextual = c.contains("meta") || c.contains("burbuja") || c.contains("emote") || c.contains("seleccionado");
      const permitido = this.modoInfo || contextual || c.contains("zona-lejos")
        || (c.contains("lugar") && cerca(70))
        || (c.contains("npc") && cerca(22))
        || (c.contains("vecino") && cerca(40))
        || (c.contains("pin-hogar") && cerca(60))
        || (c.contains("candado") && cerca(120));
      let ocultar = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1
        || !permitido
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
        if (!this.modoDemo && (caja[1] < 96 || caja[3] > r.height - 92) && !c.contains("meta")) ocultar = true;
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
  /** Fracción de la velocidad de crucero (frenadas y arranques). */
  marcha?: number;
  /** Segundos que lleva bloqueado. */
  espera?: number;
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
/** Red de los coches: se calcula tras medir las secciones de las calles. */
let ADY_COCHE: Map<string, Tramo[]> | null = null;
const adyCoche = () => (ADY_COCHE ??= adyacencia(esCalzada));
const ADY_PIE = adyacencia((t) => t.clase <= 4 || t.clase === 6);

const longitudes = new WeakMap<Tramo, number[]>();
/** Punto a `s` unidades del inicio de un tramo, desplazado a un lado según el sentido. */
function sobreTramo(t: Tramo, s: number, dir: number, carril: number, acera: number) {
  let acc = longitudes.get(t);
  if (!acc) {
    acc = [0];
    for (let i = 1; i < eje(t).length; i++) acc.push(acc[i - 1] + Math.hypot(eje(t)[i][0] - eje(t)[i - 1][0], eje(t)[i][1] - eje(t)[i - 1][1]));
    longitudes.set(t, acc);
  }
  let i = 1;
  while (i < acc.length - 1 && acc[i] < s) i++;
  const [a, b] = [eje(t)[i - 1], eje(t)[i]];
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

/**
 * Autobús urbano de La Línea: modelo de Blender (scripts/blender/vehiculos/autobus.py), blanco con
 * franjas azul celeste. El grupo se devuelve al momento y el modelo aparece al cargarse.
 */
function autobusUrbano() {
  const g = new THREE.Group();
  void cargarModelo("modelos/vehiculos/autobus.glb").then((m) => {
    const c = m.clone();
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    g.add(c);
  }).catch((e) => console.error("Autobús de Blender no cargado", e));
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

/**
 * Tiras rectas a lo largo de una polilínea, una por segmento (sin ingletes en punta): cada tira se
 * alarga `junta` en las uniones internas para cerrar los giros, y `ext0`/`ext1` en los extremos
 * (cruces). Altura absoluta.
 */
function tiras(pts: readonly Punto[], ancho: number, y: number, ext0: number, ext1: number, junta: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 0.05) continue;
    const dx = (b[0] - a[0]) / l;
    const dy = (b[1] - a[1]) / l;
    const e0 = i === 0 ? ext0 : Math.min(junta, l);
    const e1 = i === n - 2 ? ext1 : Math.min(junta, l);
    const ax = a[0] - dx * e0, ay = a[1] - dy * e0;
    const bx = b[0] + dx * e1, by = b[1] + dy * e1;
    const nx = -dy * (ancho / 2), ny = dx * (ancho / 2);
    const izqA: Punto = [ax + nx, ay + ny], derA: Punto = [ax - nx, ay - ny];
    const izqB: Punto = [bx + nx, by + ny], derB: Punto = [bx - nx, by - ny];
    for (const [x, z] of [izqA, derB, derA, izqA, izqB, derB]) {
      pos.push(x - CX, y, z - CY);
      uv.push(x / 12, z / 12);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
  return g;
}

/** Caras verticales del bordillo a ambos lados de la calzada, sin entrar en los cruces. */
function bordillos(pts: readonly Punto[], ancho: number, y0: number, y1: number, r0: number, r1: number) {
  const pos: number[] = [];
  const nor: number[] = [];
  let total = 0;
  const largos = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const L = largos.reduce((s, v) => s + v, 0);
  for (let i = 0; i < pts.length - 1; i++) {
    const l = largos[i];
    if (l < 0.05) continue;
    // Recorte en los cruces: el bordillo empieza y acaba fuera del área del cruce.
    const s0 = Math.max(0, r0 - total);
    const s1 = Math.min(l, L - r1 - total);
    total += l;
    if (s1 - s0 < 0.2) continue;
    const [a, b] = [pts[i], pts[i + 1]];
    const dx = (b[0] - a[0]) / l, dy = (b[1] - a[1]) / l;
    for (const lado of [1, -1]) {
      const nx = -dy * lado, ny = dx * lado;
      const o = ancho / 2;
      const p0: Punto = [a[0] + dx * s0 + nx * o, a[1] + dy * s0 + ny * o];
      const p1: Punto = [a[0] + dx * s1 + nx * o, a[1] + dy * s1 + ny * o];
      // Cara mirando a la calzada (hacia −n).
      const quad = lado > 0
        ? [[p0, y0], [p1, y0], [p1, y1], [p0, y0], [p1, y1], [p0, y1]]
        : [[p0, y0], [p0, y1], [p1, y1], [p0, y0], [p1, y1], [p1, y0]];
      for (const [[x, z], y] of quad as [Punto, number][]) {
        pos.push(x - CX, y, z - CY);
        nor.push(-nx, 0, -ny);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
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

/** ¿Está el punto a menos de `r` de algún lado del polígono? (choques con grosor) */
function cercaPoli(p: Punto, poli: readonly Punto[], r: number) {
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [ax, ay] = poli[j];
    const [bx, by] = poli[i];
    const vx = bx - ax, vy = by - ay;
    const l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - ay) * vy) / l2));
    if (Math.hypot(p[0] - ax - t * vx, p[1] - ay - t * vy) < r) return true;
  }
  return false;
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

/**
 * Turismo para el tráfico (4,4 × 1,8 m): carrocería con capó y maletero inclinados y techo
 * (se tiñe por instancia) y, aparte, lunas y ruedas oscuras. Origen a 1 m sobre el suelo.
 */
function geometriaCoche(): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const forma = (p: number[][]) => new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y)));
  const extruir = (p: number[][], ancho: number, bisel = 0.05) => {
    const g = new THREE.ExtrudeGeometry(forma(p), { depth: ancho, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 2, curveSegments: 1 });
    g.translate(0, 0, -ancho / 2);
    return g.index ? g.toNonIndexed() : g;
  };
  const cuerpo = extruir([[-2.2, 0.36], [2.2, 0.36], [2.2, 0.66], [2.06, 0.8], [0.84, 0.92], [-1.76, 0.96], [-2.14, 0.9], [-2.2, 0.78]], 1.7);
  const techo = extruir([[0.1, 1.38], [-1.46, 1.4], [-1.46, 1.47], [0.1, 1.45]], 1.42, 0.02);
  const lunas = extruir([[0.84, 0.92], [0.06, 1.39], [-1.5, 1.41], [-1.62, 0.96]], 1.5, 0.03);
  const ruedas: THREE.BufferGeometry[] = [];
  for (const x of [-1.42, 1.42]) for (const z of [-0.8, 0.8]) {
    const r = new THREE.CylinderGeometry(0.33, 0.33, 0.26, 14).toNonIndexed();
    r.rotateX(Math.PI / 2);
    r.translate(x, 0.33, z);
    ruedas.push(r);
  }
  const quitarUv = (g: THREE.BufferGeometry) => {
    g.deleteAttribute("uv");
    return g;
  };
  const a = mergeGeometries([cuerpo, techo].map(quitarUv))!;
  const b = mergeGeometries([lunas, ...ruedas].map(quitarUv))!;
  for (const g of [a, b]) {
    g.rotateY(-Math.PI / 2);
    g.translate(0, -1, 0);
    g.computeVertexNormals();
  }
  return [a, b];
}
