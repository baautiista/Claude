import * as THREE from "three";
import indice from "../../datos/modelos/calles.json";
import { cargarModelo } from "./modelosBlender";

/**
 * Calles generadas en Blender (scripts/blender/calles): calzada, aceras, bordillos, peatonales,
 * senderos e isletas de las rotondas, en teselas de 400 m. Aquí solo se cargan y colocan.
 * Las teselas no llevan coordenadas de textura (pesan la mitad): se calculan aquí en metros del
 * mundo, para que el pavimento case entre teselas. Los materiales (con sus texturas, hechos en
 * Blender) vienen una sola vez en materiales.glb.
 */

interface Tesela {
  glb: string;
  origen: [number, number];
  caras: number;
}
const TESELAS = (indice as unknown as { teselas: Record<string, Tesela> }).teselas;
const METROS: Record<string, number> = { AdoquinCalzada: 2, AceraRoja: 2, Asfalto: 4, Acera: 2, Bordillo: 1, Adoquin: 2, Albero: 3, Cesped: 3 };
const CALZADA = new Set(["Asfalto", "Adoquin", "AdoquinCalzada"]);

export const HAY_CALLES_BLENDER = Object.keys(TESELAS).length > 0;
/** Estado de la carga (pruebas). */
export const estadoCalles = { teselas: 0, mallas: 0, errores: [] as string[], ejemplo: "" };
(globalThis as unknown as { __calles: unknown }).__calles = estadoCalles;

export async function cargarCalles(cx: number, cy: number, suelo: number, anadir: (m: THREE.Mesh) => void) {
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const base = await cargarModelo(indice.materiales).catch((e) => {
    estadoCalles.errores.push("materiales " + String(e));
    return new THREE.Group();
  });
  base.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m || mats.has(m.name)) return;
    if (m.map) {
      m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
      m.map.anisotropy = 8;
      m.map.needsUpdate = true;
    }
    m.envMapIntensity = 0.4;
    mats.set(m.name, m);
  });
  const lista = Object.values(TESELAS);
  let i = 0;
  const trabajador = async () => {
    while (i < lista.length) {
      const t = lista[i++];
      const g = await cargarModelo(t.glb).catch((e) => (estadoCalles.errores.push(String(e)), null));
      if (!g) continue;
      estadoCalles.teselas++;
      g.updateMatrixWorld(true);
      const mallas: THREE.Mesh[] = [];
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) mallas.push(o as THREE.Mesh);
      });
      for (const mesh of mallas) {
        const nombre = (mesh.material as THREE.Material).name;
        const m = mats.get(nombre);
        if (m) mesh.material = m;
        // La malla viene cuantizada (escala y traslación en su nodo): se conserva esa matriz.
        const local = mesh.matrixWorld.clone();
        conUV(mesh, t.origen, METROS[nombre] ?? 2, local);
        new THREE.Matrix4().makeTranslation(t.origen[0] - cx, suelo, t.origen[1] - cy).multiply(local).decompose(mesh.position, mesh.quaternion, mesh.scale);
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        mesh.receiveShadow = true;
        mesh.userData.calzada = CALZADA.has(nombre);
        anadir(mesh);
        estadoCalles.mallas++;
        if (!estadoCalles.ejemplo) {
          mesh.geometry.computeBoundingBox();
          const bb = mesh.geometry.boundingBox!;
          estadoCalles.ejemplo = `${nombre} pos ${mesh.position.toArray().map((v) => v.toFixed(1))} bb ${bb.min.toArray().map((v) => v.toFixed(1))} ${bb.max.toArray().map((v) => v.toFixed(1))} vis ${mesh.visible} padre ${mesh.parent?.type}`;
        }
      }
    }
  };
  await Promise.all([trabajador(), trabajador(), trabajador(), trabajador()]);
}

/** Coordenadas de textura en metros del mundo: planas arriba, a lo largo del borde en los cantos. */
function conUV(mesh: THREE.Mesh, origen: [number, number], metros: number, local: THREE.Matrix4) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  const s = 1 / metros;
  const nm = new THREE.Matrix3().getNormalMatrix(local);
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  for (let k = 0; k < p.count; k++) {
    v.fromBufferAttribute(p, k).applyMatrix4(local);
    const x = v.x + origen[0];
    const z = v.z + origen[1];
    if (n) w.fromBufferAttribute(n, k).applyMatrix3(nm).normalize();
    if (!n || Math.abs(w.y) > 0.5) {
      uv[k * 2] = x * s;
      uv[k * 2 + 1] = z * s;
    } else {
      uv[k * 2] = (x * -w.z + z * w.x) * s;
      uv[k * 2 + 1] = v.y * s;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
