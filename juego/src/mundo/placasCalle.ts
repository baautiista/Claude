import * as THREE from "three";
import placas from "../datos/ciudad/placas.json";
import { piezasModelo } from "./ciudad/modelosBlender";

/**
 * Placas con el nombre de las calles (scripts/blender/calles/placas.py las sitúa en la fachada del
 * primer y del último edificio de cada vía; la chapa es un modelo de Blender). El rótulo se dibuja
 * aquí con el diseño municipal: marco azul, pestaña con el tipo de vía, nombre y escudo.
 * Solo existen las placas cercanas a la cámara.
 */

type Placa = [prefijo: string, nombre: string, x: number, y: number, nx: number, ny: number, z: number];
const LISTA = placas as unknown as Placa[];
const AZUL = "#4A62B0";
const CLARO = "#C8E0EC";
const R_VER = 140;
const R_QUITAR = 190;

function redondeado(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

function escudo(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = AZUL;
  // Corona.
  c.beginPath();
  c.moveTo(x - 22 * s, y - 10 * s);
  c.quadraticCurveTo(x - 24 * s, y - 34 * s, x - 10 * s, y - 36 * s);
  c.quadraticCurveTo(x, y - 46 * s, x + 10 * s, y - 36 * s);
  c.quadraticCurveTo(x + 24 * s, y - 34 * s, x + 22 * s, y - 10 * s);
  c.closePath();
  c.fill();
  c.fillRect(x - 1.5 * s, y - 54 * s, 3 * s, 10 * s);
  c.fillRect(x - 5 * s, y - 51 * s, 10 * s, 3 * s);
  // Escudo con castillo.
  c.beginPath();
  c.moveTo(x - 24 * s, y - 6 * s);
  c.lineTo(x + 24 * s, y - 6 * s);
  c.lineTo(x + 24 * s, y + 26 * s);
  c.quadraticCurveTo(x + 24 * s, y + 52 * s, x, y + 56 * s);
  c.quadraticCurveTo(x - 24 * s, y + 52 * s, x - 24 * s, y + 26 * s);
  c.closePath();
  c.fill();
  c.fillStyle = CLARO;
  c.fillRect(x - 16 * s, y + 20 * s, 32 * s, 18 * s);
  for (const dx of [-16, -6, 4]) c.fillRect(x + dx * s, y + 14 * s, 6 * s, 7 * s);
  c.fillRect(x - 5 * s, y + 6 * s, 10 * s, 14 * s);
  c.fillStyle = AZUL;
  c.fillRect(x - 3 * s, y + 28 * s, 6 * s, 10 * s);
}

function rotulo(prefijo: string, nombre: string) {
  const W = 512;
  const H = 346;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;
  c.fillStyle = AZUL;
  c.fillRect(0, 0, W, H);
  c.fillStyle = CLARO;
  redondeado(c, 22, 40, W - 44, H - 64, 36);
  c.fillStyle = AZUL;
  redondeado(c, 128, -10, 256, 102, [0, 0, 24, 24]);
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = CLARO;
  c.font = "700 56px Georgia, 'Times New Roman', serif";
  const pre = prefijo.toUpperCase();
  const k = Math.min(1, 228 / c.measureText(pre).width);
  c.font = `700 ${Math.round(56 * k)}px Georgia, 'Times New Roman', serif`;
  c.fillText(pre, W / 2, 70);
  // Nombre: en una línea si cabe; si no, en dos, lo más grande posible.
  c.fillStyle = AZUL;
  const txt = nombre.toUpperCase();
  const fuente = (t: number) => `800 ${t}px Poppins, 'Arial Black', Arial, sans-serif`;
  const ancho = 430;
  let t = 96;
  c.font = fuente(t);
  while (t > 50 && c.measureText(txt).width > ancho) c.font = fuente(--t);
  if (c.measureText(txt).width <= ancho) c.fillText(txt, W / 2, 200 + t * 0.32);
  else {
    const p = txt.split(" ");
    let mejor = [txt, ""];
    let peor = Infinity;
    for (let i = 1; i < p.length; i++) {
      const a = p.slice(0, i).join(" ");
      const b = p.slice(i).join(" ");
      const m = Math.max(a.length, b.length);
      if (m < peor) (peor = m), (mejor = [a, b]);
    }
    t = 66;
    c.font = fuente(t);
    while (t > 22 && Math.max(c.measureText(mejor[0]).width, c.measureText(mejor[1]).width) > ancho) c.font = fuente(--t);
    c.fillText(mejor[0], W / 2, 186);
    c.fillText(mejor[1], W / 2, 186 + t * 1.05);
  }
  escudo(c, 206, 268, 0.62);
  c.textAlign = "center";
  c.font = "700 17px Arial, sans-serif";
  c.fillStyle = AZUL;
  c.fillText("Ayuntamiento", 300, 270);
  c.fillText("de", 300, 290);
  c.fillText("La Línea", 300, 310);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false; // las UV del GLB ya vienen con la V invertida (convención glTF)
  tex.anisotropy = 4;
  return tex;
}

export class PlacasCalle {
  private piezas: { material: THREE.Material; geometria: THREE.BufferGeometry }[] | null = null;
  private vivas = new Map<number, THREE.Group>();
  /** Placas sin pared detrás (edificio aún sin cargar o recortado): se reintentan más tarde. */
  private espera = new Map<number, number>();
  private rayo = new THREE.Raycaster();

  constructor(private escena: THREE.Scene, private cx: number, private cy: number, private suelo: number) {
    void piezasModelo("modelos/mobiliario/placa_calle.glb").then((p) => (this.piezas = p));
  }

  /** Crea las placas cercanas al punto (coordenadas del mapa) y quita las lejanas. */
  actualizar(x: number, y: number) {
    if (!this.piezas) return;
    for (let i = 0; i < LISTA.length; i++) {
      const [pre, nombre, px, py, nx, ny, z] = LISTA[i];
      const d = Math.hypot(px - x, py - y);
      const viva = this.vivas.get(i);
      if (d < R_VER && !viva) {
        if ((this.espera.get(i) ?? 0) > performance.now()) continue;
        // La placa se pega a la pared real: rayo desde la acera hacia la fachada.
        const desde = new THREE.Vector3(px + nx * 5 - this.cx, this.suelo + z, py + ny * 5 - this.cy);
        this.rayo.set(desde, new THREE.Vector3(-nx, 0, -ny));
        this.rayo.far = 9;
        const hit = this.rayo.intersectObjects(this.escena.children, true).find((h) => {
          if (!h.face || h.object.userData.placa || (h.object as THREE.InstancedMesh).isInstancedMesh) return false;
          const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
          return Math.abs(n.y) < 0.3 && n.x * nx + n.z * ny > 0.6;
        });
        if (!hit) {
          this.espera.set(i, performance.now() + 4000);
          continue;
        }
        const g = new THREE.Group();
        for (const { material, geometria } of this.piezas) {
          const rot = material.name === "Rotulo";
          const m = new THREE.Mesh(geometria, rot ? new THREE.MeshStandardMaterial({ map: rotulo(pre, nombre), roughness: 0.35 }) : material);
          m.castShadow = false;
          m.userData.placa = true;
          m.receiveShadow = true;
          g.add(m);
        }
        g.position.copy(hit.point).addScaledVector(new THREE.Vector3(nx, 0, ny), 0.02);
        g.rotation.y = Math.atan2(nx, ny);
        g.userData.placa = `${pre} ${nombre}`;
        this.escena.add(g);
        this.vivas.set(i, g);
      } else if (d > R_QUITAR && viva) {
        this.escena.remove(viva);
        for (const m of viva.children as THREE.Mesh[]) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.map) {
            mat.map.dispose();
            mat.dispose();
          }
        }
        this.vivas.delete(i);
      }
    }
  }
}
