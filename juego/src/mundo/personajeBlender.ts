import * as THREE from "three";
import { clone as clonarEsqueleto } from "three/examples/jsm/utils/SkeletonUtils.js";
import { cargarGLTF } from "./ciudad/modelosBlender";

/**
 * Personaje hecho en Blender (scripts/blender/personajes/personaje.py): cuerpo con esqueleto,
 * morphs «Mujer» y «Corpulento», ropa por capas, peinados, gafas y gorra, y sus animaciones.
 * Aquí solo se elige qué prendas se ven, se recolorea y se reproduce la animación del estado.
 */

export interface Vestir {
  mujer: boolean;
  /** 0,85–1,25 */
  complexion: number;
  piel: string;
  pelo: string;
  peinado: string;
  arriba: { tipo: string; color: string; manga: string };
  capa?: { tipo: string; color: string };
  abajo: { tipo: string; color: string };
  calzado: string;
  accesorio?: string | null;
}

const RUTA = "modelos/personajes/personaje.glb";
const PIEZAS = new Set(["Cuerpo", "Cabeza", "ZapatoL", "ZapatoR", "Camiseta", "Camisa", "Chaleco", "Pantalon", "Short", "Falda", "Gafas", "Gorra",
  ...["corto", "tupe", "largo", "coleta", "mono", "rizado"].map((p) => `Pelo_${p}`)]);
const CLIP: Record<string, string> = {
  quieto: "Quieto", andar: "Andar", correr: "Correr", sentado: "Sentado", saludar: "Saludar", hablar: "Hablar",
  trabajar: "Trabajar", usar: "Usar", alegre: "Saludar", triste: "Quieto", enfado: "Hablar", sorpresa: "Quieto",
};

export interface PersonajeB {
  raiz: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  acciones: Map<string, THREE.AnimationAction>;
  actual: string;
}

export const precargarPersonaje = () => cargarGLTF(RUTA);

export async function crearPersonajeB(v: Vestir): Promise<PersonajeB> {
  const { scene, animations } = await cargarGLTF(RUTA);
  const raiz = clonarEsqueleto(scene);
  const visibles = new Set(["Cuerpo", "Cabeza", "Zapato.L", "Zapato.R"]);
  const manga = v.arriba.manga === "larga" || v.arriba.tipo === "jersey" || v.arriba.tipo === "camisa";
  visibles.add(manga ? "Camisa" : "Camiseta");
  if (v.capa) visibles.add("Chaleco");
  visibles.add(v.abajo.tipo === "falda" ? "Falda" : v.abajo.tipo === "corto" ? "Short" : "Pantalon");
  if (v.peinado !== "calvo") visibles.add(`Pelo_${v.peinado}`);
  if (v.accesorio === "gafas") visibles.add("Gafas");
  if (v.accesorio === "gorra") visibles.add("Gorra");
  // three.js quita el punto de los nombres («Zapato.L» → «ZapatoL») y agrupa las mallas con varios
  // materiales bajo un nodo con el nombre de la pieza: se busca la pieza subiendo por los padres.
  const limpio = (n: string) => n.replace(/[.\s]/g, "");
  const visiblesS = new Set([...visibles].map(limpio));
  const piezaDe = (o: THREE.Object3D) => {
    for (let x: THREE.Object3D | null = o; x; x = x.parent) if (PIEZAS.has(x.name)) return x.name;
    return "";
  };
  const colores: Record<string, string> = { Piel: v.piel, Ropa: v.arriba.color, Ropa2: v.capa?.color ?? v.arriba.color, Pantalon: v.abajo.color, Calzado: v.calzado, Pelo: v.pelo };
  const mats = new Map<string, THREE.Material>();
  const recolor = (m: THREE.Material) => {
    const c = colores[m.name];
    if (!c) return m;
    if (!mats.has(m.name)) {
      const n = (m as THREE.MeshStandardMaterial).clone();
      n.color.set(c);
      mats.set(m.name, n);
    }
    return mats.get(m.name)!;
  };
  const corpu = THREE.MathUtils.clamp((v.complexion - 1) / 0.25, 0, 1);
  raiz.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh) return;
    m.visible = visiblesS.has(piezaDe(m));
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.material = Array.isArray(m.material) ? m.material.map(recolor) : recolor(m.material);
    if (m.morphTargetDictionary && m.morphTargetInfluences) {
      const mi = m.morphTargetDictionary["Mujer"];
      const ci = m.morphTargetDictionary["Corpulento"];
      if (mi !== undefined) m.morphTargetInfluences[mi] = v.mujer ? 1 : 0;
      if (ci !== undefined) m.morphTargetInfluences[ci] = corpu;
    }
  });
  const mixer = new THREE.AnimationMixer(raiz);
  const acciones = new Map<string, THREE.AnimationAction>();
  for (const c of animations) acciones.set(c.name, mixer.clipAction(c));
  const p: PersonajeB = { raiz, mixer, acciones, actual: "" };
  poner(p, "quieto", 0);
  return p;
}

/** Cambia de animación con un fundido corto; al andar o correr ajusta el ritmo a la velocidad. */
export function poner(p: PersonajeB, estado: string, velocidad: number) {
  const nombre = CLIP[estado] ?? "Quieto";
  const a = p.acciones.get(nombre);
  if (!a) return;
  if (nombre === "Andar") a.timeScale = THREE.MathUtils.clamp(velocidad / 1.35, 0.6, 1.6);
  if (nombre === "Correr") a.timeScale = THREE.MathUtils.clamp(velocidad / 3.2, 0.7, 1.4);
  if (p.actual === nombre) return;
  const previa = p.acciones.get(p.actual);
  a.reset().setEffectiveWeight(1).fadeIn(0.2).play();
  if (previa) previa.fadeOut(0.2);
  p.actual = nombre;
}
