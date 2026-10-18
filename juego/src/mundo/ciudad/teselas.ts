import * as THREE from "three";
import type { Obra } from "../arquitectura";
import type { Ctx, P2 } from "../sectores/piezas";
import { construirEdificios, type InformeEdificios } from "./edificios";
import { aplicar, type EdificioCiudad, type IndiceCiudad, type Tesela } from "./tipos";
import { alCambiar, correccionDe } from "./correcciones";
import { EDIFICIOS_BLENDER } from "./modelosBlender";

/**
 * Carga progresiva de la ciudad generada: teselas de 160 m (src/datos/ciudad/teselas/*.json).
 * Se cargan las cercanas a la cámara y se descargan las lejanas; cada tesela se construye en
 * varios fotogramas (primero el volumen lejano, luego el medio y el detallado) y forma un LOD de
 * tres niveles con una malla por material. Corregir un edificio reconstruye solo su tesela.
 */

const indices = import.meta.glob<IndiceCiudad>("../../datos/ciudad/indice.json", { eager: true, import: "default" });
export const INDICE: IndiceCiudad = Object.values(indices)[0] ?? { generado: "", fuentes: {}, teselas: {} };
/** Las teselas se descargan bajo demanda (public/ciudad/teselas/, junto a la página publicada). */
const cargar = async (id: string): Promise<Tesela | null> => {
  const r = await fetch(new URL(`ciudad/teselas/${id}.json`, document.baseURI).href).catch(() => null);
  return r?.ok ? ((await r.json()) as Tesela) : null;
};

const R_CARGA = 380;
const LOTE = 60;
const R_DESCARGA = 560;
export const DIST_LOD = [0, 90, 240] as const;

export interface Metricas {
  teselasIndice: number;
  teselasCargadas: number;
  edificiosEnEscena: number;
  triangulos: number;
  construccionMs: number[];
  ultimaConstruccionMs: number;
  informe: InformeEdificios;
}

interface Estado {
  id: string;
  datos: Tesela | null;
  lod: THREE.LOD | null;
  niveles: number;
  cargando: boolean;
  /** Huellas registradas para las colisiones. */
  solidos: P2[][];
}

function dentro(p: P2, poli: P2[]) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Índices de los rectángulos antiguos de linea.json que sustituye la ciudad generada. */
export const SUSTITUIDOS = new Set(INDICE.sustituidos ?? []);

export class GestorCiudad {
  private teselas = new Map<string, Estado>();
  private cola: (() => Promise<void> | void)[] = [];
  private ocupado = false;
  readonly metricas: Metricas = {
    teselasIndice: Object.keys(INDICE.teselas).length, teselasCargadas: 0, edificiosEnEscena: 0, triangulos: 0, construccionMs: [], ultimaConstruccionMs: 0,
    informe: { edificios: 0, modulos: 0, rechazados: [], carasSinFachada: 0, huellasInvalidas: [] },
  };

  constructor(
    private ctx: Ctx,
    private anadir: (o: THREE.Object3D) => void,
    private quitar: (o: THREE.Object3D) => void,
    private mallas: (o: Obra) => THREE.Group,
    private colisiones: (id: string, polis: P2[][] | null) => void,
  ) {
    for (const id of Object.keys(INDICE.teselas)) this.teselas.set(id, { id, datos: null, lod: null, niveles: 0, cargando: false, solidos: [] });
    alCambiar((ids) => this.reconstruirEdificios(ids));
  }

  /** Edificios de las teselas cargadas (para el editor y la auditoría). */
  cargados(): EdificioCiudad[] {
    return [...this.teselas.values()].flatMap((t) => (t.lod ? t.datos?.edificios ?? [] : []));
  }
  teselaDe(id: string) {
    return [...this.teselas.values()].find((t) => t.datos?.edificios.some((e) => e.id === id))?.datos ?? null;
  }
  objetos(): THREE.Object3D[] {
    return [...this.teselas.values()].flatMap((t) => (t.lod ? [t.lod] : []));
  }
  edificioEn(x: number, y: number) {
    for (const t of this.teselas.values()) {
      if (!t.lod) continue;
      const e = t.datos?.edificios.find((q) => dentro([x, y], q.huella) && !(q.patios ?? []).some((h) => dentro([x, y], h)));
      if (e) return e;
    }
    return null;
  }

  /** Llamar a menudo con el punto que mira la cámara (coordenadas del mapa). */
  actualizar(x: number, y: number) {
    for (const [id, t] of Object.entries(INDICE.teselas)) {
      if (!t.edificios) continue; // manzanas sin edificios (parques, explanadas)
      const [x0, y0, x1, y1] = t.bbox;
      const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
      const e = this.teselas.get(id)!;
      if (d < R_CARGA && !e.lod && !e.cargando) this.encolarCarga(e);
      else if (d > R_DESCARGA && e.lod) this.descargar(e);
    }
    void this.procesar();
  }

  /** Avanza un paso de construcción pendiente (se llama en cada fotograma). */
  paso() {
    void this.procesar();
  }

  /** Carga todas las teselas a la vez (pruebas y capturas). */
  async cargarTodo() {
    for (const e of this.teselas.values()) if (!e.lod && !e.cargando && INDICE.teselas[e.id].edificios) this.encolarCarga(e);
    while (this.cola.length || this.ocupado) {
      await this.procesar();
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  private encolarCarga(e: Estado) {
    e.cargando = true;
    this.cola.push(async () => {
      if (!e.datos) {
        e.datos = await cargar(e.id);
        if (!e.datos) {
          e.cargando = false;
          return;
        }
      }
      e.lod = new THREE.LOD();
      const [x0, y0, x1, y1] = e.datos.bbox;
      const c = new THREE.Vector3((x0 + x1) / 2 - this.ctx.cx, this.ctx.suelo, (y0 + y1) / 2 - this.ctx.cy);
      e.lod.position.copy(c);
      e.lod.userData.tesela = e.id;
      this.anadir(e.lod);
      // Los ocultos (sustituidos por un modelo propio) no ocupan: el sector pone sus propios sólidos.
      e.solidos = e.datos.edificios.filter((q) => correccionDe(q.id)?.modelo !== "oculto").map((q) => q.huella);
      this.colisiones(e.id, e.solidos);
      // Del más ligero al más detallado, cada uno en su fotograma.
      const lod = e.lod;
      for (const nivel of [2, 1, 0] as const) this.cola.push(() => (e.lod === lod ? this.encolarNivel(e, nivel) : undefined));
      this.cola.push(() => {
        e.cargando = false;
      });
    });
  }

  /** Encola la construcción de un nivel en trozos de LOTE edificios (sin tirones largos). */
  private encolarNivel(e: Estado, nivel: 0 | 1 | 2) {
    if (!e.datos || !e.lod) return;
    // Cada paso queda ligado a este LOD: si la tesela se descarga y se vuelve a cargar, los pasos viejos no hacen nada.
    const lod = e.lod;
    const datos = e.datos;
    const n = datos.edificios.length;
    const grupo = new THREE.Group();
    grupo.userData.nivel = nivel;
    for (let i = 0; i < n; i += LOTE) {
      const desde = i;
      this.cola.push(() => (e.lod === lod ? this.construirTrozo(lod, datos, nivel, grupo, desde) : undefined));
    }
    // El nivel nuevo sustituye al anterior solo cuando está completo.
    this.cola.push(() => {
      if (e.lod !== lod) return liberar(grupo);
      const previo = lod.levels.find((l) => l.object.userData.nivel === nivel);
      if (previo) {
        liberar(previo.object);
        lod.remove(previo.object);
        lod.levels.splice(lod.levels.indexOf(previo), 1);
      }
      lod.addLevel(grupo, DIST_LOD[nivel]);
      lod.levels.sort((a, b) => a.distance - b.distance);
    });
  }

  private construirTrozo(lod: THREE.LOD, datos: Tesela, nivel: 0 | 1 | 2, grupo: THREE.Group, desde: number) {
    const t0 = performance.now();
    // Los que ya tienen modelo de Blender no se dibujan aquí (su huella sigue en las colisiones).
    const lista = datos.edificios.slice(desde, desde + LOTE).filter((q) => !EDIFICIOS_BLENDER.has(q.id)).map((q) => aplicar(q, correccionDe(q.id)));
    const { obra, informe } = construirEdificios(lista, this.ctx, nivel);
    const g = this.mallas(obra);
    g.position.copy(lod.position).negate();
    grupo.add(g);
    const ms = performance.now() - t0;
    this.metricas.construccionMs.push(Math.round(ms));
    this.metricas.ultimaConstruccionMs = ms;
    if (nivel === 0) {
      const inf = this.metricas.informe;
      inf.modulos += informe.modulos;
      inf.rechazados.push(...informe.rechazados);
      inf.carasSinFachada += informe.carasSinFachada;
      inf.huellasInvalidas.push(...informe.huellasInvalidas);
      inf.edificios += informe.edificios;
    }
  }

  private descargar(e: Estado) {
    if (!e.lod) return;
    this.quitar(e.lod);
    liberar(e.lod);
    e.lod = null;
    e.datos = null;
    e.cargando = false;
    this.colisiones(e.id, null);
    this.recontar();
  }

  /** Reconstruye solo las teselas que contienen edificios corregidos. */
  private reconstruirEdificios(ids: string[]) {
    const afectadas = new Set<Estado>();
    for (const t of this.teselas.values()) if (t.lod && t.datos?.edificios.some((q) => ids.includes(q.id))) afectadas.add(t);
    for (const t of afectadas) for (const nivel of [0, 1, 2] as const) this.encolarNivel(t, nivel);
    void this.procesar();
  }

  /** Pasos pendientes en la cola (0 = la ciudad cercana está construida). */
  pendientes() {
    return this.cola.length + (this.ocupado ? 1 : 0);
  }

  private async procesar() {
    if (this.ocupado) return;
    this.ocupado = true;
    // Presupuesto de ~10 ms por fotograma; lo que no quepa sigue en el siguiente.
    const t0 = performance.now();
    try {
      while (this.cola.length && performance.now() - t0 < 10) {
        const paso = this.cola.shift()!;
        const r = paso();
        if (r instanceof Promise) await r;
      }
    } finally {
      this.ocupado = false;
      if (!this.cola.length) this.recontar();
    }
  }

  private recontar() {
    let tris = 0;
    let eds = 0;
    let n = 0;
    for (const t of this.teselas.values()) {
      if (!t.lod) continue;
      n++;
      eds += t.datos?.edificios.length ?? 0;
      t.lod.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.parent?.parent?.userData.nivel === 0) tris += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3;
      });
    }
    Object.assign(this.metricas, { teselasCargadas: n, edificiosEnEscena: eds, triangulos: Math.round(tris) });
  }
}

function liberar(o: THREE.Object3D) {
  o.traverse((x) => (x as THREE.Mesh).geometry?.dispose());
}

/**
 * Auditoría geométrica de un edificio (no basta con que no se rechacen módulos):
 * todas las piezas deben quedar junto a su huella (nada flotando lejos), apoyadas en el suelo
 * o en el edificio (nada por debajo del suelo ni por encima de la cubierta prevista) y con cubierta.
 */
export function auditarEdificio(e: EdificioCiudad, ctx: Ctx) {
  const { obra } = construirEdificios([aplicar(e, correccionDe(e.id))], ctx, 0);
  const problemas: string[] = [];
  const xs = e.huella.map((p) => p[0]);
  const ys = e.huella.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs) - 1.6, Math.max(...xs) + 1.6, Math.min(...ys) - 1.6, Math.max(...ys) + 1.6];
  let fuera = 0;
  let bajo = 0;
  let alto = 0;
  let techo = false;
  const H = e.alturaM;
  for (const g of obra.geometrias()) {
    if (!g) continue;
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + ctx.cx;
      const y = pos.getY(i) - ctx.suelo;
      const z = pos.getZ(i) + ctx.cy;
      if (x < minX || x > maxX || z < minY || z > maxY) fuera++;
      if (y < -0.05) bajo++;
      if (y > H + 6) alto++;
      if (Math.abs(y - H) < 1.2) techo = true;
    }
    g.dispose();
  }
  if (fuera) problemas.push(`${fuera} vértices a más de 1,6 m de la huella`);
  if (bajo) problemas.push(`${bajo} vértices bajo el suelo`);
  if (alto) problemas.push(`${alto} vértices por encima de la cubierta prevista`);
  if (!techo) problemas.push("sin cubierta");
  return problemas;
}
