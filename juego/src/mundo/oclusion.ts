import * as THREE from "three";

/**
 * Transparencia de lo que tapa al personaje en la vista cenital.
 *
 * Con la cámara inclinada, un tejado, un balcón o la copa de un árbol que quedan entre la cámara
 * y el jugador lo ocultan. En vez de apartar mallas enteras (los edificios van fusionados por
 * trozos y los árboles instanciados), cada material recorta sus píxeles con un tramado: solo los
 * que están delante del jugador (más cerca de la cámara), por encima de la altura de una persona
 * y dentro de un círculo alrededor de la línea de visión. El suelo, las aceras y el propio
 * personaje no se tocan. Al recortar con `discard` la profundidad sigue siendo correcta: no hay
 * problemas de orden como con la transparencia normal.
 */
export const oclusion = {
  /** Pecho del jugador (mundo). */
  jugador: { value: new THREE.Vector3() },
  /** Hacia dónde mira la cámara (unitario). */
  direccion: { value: new THREE.Vector3(0, -1, 0) },
  /** Radio del hueco alrededor del personaje (metros). */
  radio: { value: 3.4 },
  /** Altura del suelo: por debajo de suelo + 2 m nada se recorta. */
  suelo: { value: 0 },
  /** 0 = desactivado (a pie de calle, menús), 1 = activo. La transición es suave. */
  activo: { value: 0 },
};

const TIPOS = new Set(["MeshStandardMaterial", "MeshPhysicalMaterial", "MeshLambertMaterial", "MeshPhongMaterial", "MeshToonMaterial", "MeshBasicMaterial"]);
const parcheados = new WeakSet<THREE.Material>();

const VERT_DECL = "varying vec3 vMundoOcl;";
const VERT_CALC = `
  {
    vec4 mOcl = vec4(transformed, 1.0);
    #ifdef USE_BATCHING
      mOcl = batchingMatrix * mOcl;
    #endif
    #ifdef USE_INSTANCING
      mOcl = instanceMatrix * mOcl;
    #endif
    vMundoOcl = (modelMatrix * mOcl).xyz;
  }`;
const FRAG_DECL = `
varying vec3 vMundoOcl;
uniform vec3 uOclJug;
uniform vec3 uOclDir;
uniform float uOclRadio;
uniform float uOclSuelo;
uniform float uOclActivo;
float oclBayer(vec2 p) {
  // Matriz de Bayer 4×4: tramado regular, sin ruido que parpadee al mover la cámara.
  ivec2 q = ivec2(mod(p, 4.0));
  int i = q.x + q.y * 4;
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[i] + 0.5) / 16.0;
}`;
const FRAG_CALC = `
  if (uOclActivo > 0.0) {
    vec3 rOcl = vMundoOcl - uOclJug;
    float delante = -dot(rOcl, uOclDir);
    float lado = length(rOcl + uOclDir * delante);
    float alto = vMundoOcl.y - uOclSuelo;
    // Más transparente en el centro del hueco; nada por debajo de 2 m ni detrás del jugador.
    float f = (1.0 - smoothstep(uOclRadio * 0.55, uOclRadio, lado))
      * smoothstep(0.6, 2.0, delante)
      * smoothstep(2.0, 2.8, alto)
      * uOclActivo;
    if (f * 0.9 > oclBayer(gl_FragCoord.xy)) discard;
  }`;

/** Añade el recorte a un material (una vez; respeta otros `onBeforeCompile` que ya tenga). */
export function conOclusion(m: THREE.Material) {
  if (parcheados.has(m) || !TIPOS.has(m.type)) return;
  parcheados.add(m);
  const previo = m.onBeforeCompile.bind(m);
  const clave = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (s, r) => {
    previo(s, r);
    s.uniforms.uOclJug = oclusion.jugador;
    s.uniforms.uOclDir = oclusion.direccion;
    s.uniforms.uOclRadio = oclusion.radio;
    s.uniforms.uOclSuelo = oclusion.suelo;
    s.uniforms.uOclActivo = oclusion.activo;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
      .replace("#include <project_vertex>", `#include <project_vertex>${VERT_CALC}`);
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_DECL}`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>${FRAG_CALC}`);
  };
  m.customProgramCacheKey = () => `${clave()}|ocl`;
  m.needsUpdate = true;
}

/**
 * Recorre la escena y añade el recorte a los materiales nuevos. Se salta los objetos marcados
 * con `userData.sinOclusion` (personajes, marcadores, suelo) y todo lo que cuelga de ellos.
 */
export function parchearEscena(raiz: THREE.Object3D) {
  const visitar = (o: THREE.Object3D) => {
    if (o.userData.sinOclusion) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh as unknown as THREE.SkinnedMesh).isSkinnedMesh) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) if (m) conOclusion(m);
    }
    for (const h of o.children) visitar(h);
  };
  visitar(raiz);
}
