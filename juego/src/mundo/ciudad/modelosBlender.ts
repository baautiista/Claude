import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import indice from "../../datos/modelos/indice.json";
import type { Ctx } from "../sectores/piezas";

/**
 * Importador de los modelos generados en Blender (scripts/blender/generar.py).
 *
 * Cada lote es un GLB (comprimido con meshopt) cuyo origen está en `origen` (coordenadas del
 * juego) y que contiene, por edificio, dos nodos `<id>__LOD0` y `<id>__LOD1` con
 * `userData.edificio_id`. Aquí se agrupan en un THREE.LOD por edificio, centrado en el propio
 * edificio para que la distancia a la cámara se mida bien, y se colocan en el mundo.
 * El edificio procedural con el mismo id deja de dibujarse (su huella sigue sirviendo de colisión).
 */

interface Lote {
  glb: string;
  origen: [number, number];
  edificios: string[];
  generador: number;
}

const LOTES = (indice as unknown as { lotes: Record<string, Lote> }).lotes;

const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cacheModelos = new Map<string, Promise<THREE.Group>>();

/**
 * Carga un modelo de Blender (public/<ruta>.glb) una sola vez. En la versión publicada se lee
 * <ruta>.glb.json (los artefactos no sirven .glb). Devuelve la escena original: clonarla para usarla.
 */
export function cargarModelo(ruta: string): Promise<THREE.Group> {
  let p = cacheModelos.get(ruta);
  if (!p) {
    const url = new URL(ruta, document.baseURI).href;
    p = new Promise<THREE.Group>((ok, mal) => {
      if (!import.meta.env.PROD) return void cargador.load(url, (g) => ok(g.scene), undefined, mal);
      fetch(url + ".json")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(({ glb }: { glb: string }) => cargador.parse(Uint8Array.from(atob(glb), (c) => c.charCodeAt(0)).buffer, "", (g) => ok(g.scene), mal))
        .catch(mal);
    });
    cacheModelos.set(ruta, p);
  }
  return p;
}

/** Ids de los edificios que ya tienen modelo de Blender. */
export const EDIFICIOS_BLENDER = new Set(Object.values(LOTES).flatMap((l) => l.edificios));

/** Distancia (m) a partir de la que se usa el nivel lejano. */
const DIST_LOD1 = 160;
/** Distancia de carga de un lote (desde su origen). */
const R_CARGA = 650;

export class ModelosBlender {
  private cargados = new Map<string, THREE.Group | "cargando" | "error">();
  private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  readonly estado: Record<string, { edificios: number; triangulos: number; ms: number; error?: string }> = {};

  constructor(private ctx: Ctx, private anadir: (o: THREE.Object3D) => void) {}

  /** Carga los lotes cercanos al punto (x, y del mapa). */
  actualizar(x: number, y: number) {
    for (const [nombre, l] of Object.entries(LOTES)) {
      if (this.cargados.has(nombre)) continue;
      if (Math.hypot(l.origen[0] - x, l.origen[1] - y) > R_CARGA) continue;
      this.cargar(nombre, l);
    }
  }

  private cargar(nombre: string, l: Lote) {
    this.cargados.set(nombre, "cargando");
    const t0 = performance.now();
    const url = new URL(l.glb, document.baseURI).href;
    const alCargar = (gltf: { scene: THREE.Group }) => {
        const grupo = new THREE.Group();
        grupo.name = `blender:${nombre}`;
        grupo.position.set(l.origen[0] - this.ctx.cx, this.ctx.suelo, l.origen[1] - this.ctx.cy);
        const porId = new Map<string, Record<number, THREE.Object3D>>();
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((o) => {
          const id = o.userData?.edificio_id as string | undefined;
          if (!id || typeof o.userData.lod !== "number") return;
          if (!porId.has(id)) porId.set(id, {});
          porId.get(id)![o.userData.lod] = o;
        });
        let tri = 0;
        for (const [id, niveles] of porId) {
          const lod = new THREE.LOD();
          lod.name = id;
          lod.userData.edificio_id = id;
          const caja = new THREE.Box3().setFromObject(niveles[0] ?? niveles[1]);
          const centro = caja.getCenter(new THREE.Vector3());
          centro.y = 0;
          lod.position.copy(centro);
          for (const [n, dist] of [[0, 0], [1, DIST_LOD1]] as const) {
            const o = niveles[n];
            if (!o) continue;
            o.removeFromParent();
            o.position.sub(centro);
            o.traverse((m) => {
              const mesh = m as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.castShadow = n === 0;
              mesh.receiveShadow = true;
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.envMapIntensity = 0.55;
              if (n === 0) tri += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
            });
            lod.addLevel(o, dist);
          }
          grupo.add(lod);
        }
        this.anadir(grupo);
        this.cargados.set(nombre, grupo);
        this.estado[nombre] = { edificios: porId.size, triangulos: Math.round(tri), ms: Math.round(performance.now() - t0) };
    };
    const fallo = (err: unknown) => {
      this.cargados.set(nombre, "error");
      this.estado[nombre] = { edificios: 0, triangulos: 0, ms: 0, error: String(err) };
      console.error("Modelo de Blender no cargado", nombre, err);
    };
    if (!import.meta.env.PROD) return void this.loader.load(url, alCargar, undefined, fallo);
    // En la versión publicada el GLB va dentro de un .json (los artefactos no sirven .glb).
    fetch(url + ".json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ glb }: { glb: string }) => {
        const bin = Uint8Array.from(atob(glb), (c) => c.charCodeAt(0));
        this.loader.parse(bin.buffer, "", alCargar, fallo);
      })
      .catch(fallo);
  }
}
