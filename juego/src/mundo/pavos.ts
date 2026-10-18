import * as THREE from "three";

/**
 * Pavos reales de los Jardines Saccone: pasean por el jardín cabeceando, se paran a picotear
 * y de vez en cuando abren la cola en abanico y giran despacio sobre sí mismos.
 * Modelo sencillo de pocas piezas (cuerpo, cuello, cabeza con cresta, patas y cola).
 */

type P2 = [number, number];

const mat = (c: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...extra });
const AZUL = mat("#1C4FB8", { metalness: 0.15, roughness: 0.35 });
const AZUL_CLARO = mat("#2C7AD0", { metalness: 0.15, roughness: 0.35 });
const VERDE = mat("#2F7A4A", { metalness: 0.2, roughness: 0.4, side: THREE.DoubleSide });
const VERDE_OSCURO = mat("#1E5638", { side: THREE.DoubleSide });
const BRONCE = mat("#8A6A2E", { side: THREE.DoubleSide });
const OCELO = mat("#1A2B6A", { side: THREE.DoubleSide });
const CAFE = mat("#7A5A3A");
const PATA = mat("#8C8478");
const BLANCO = mat("#F2F2EE");

function malla(g: THREE.BufferGeometry, m: THREE.Material) {
  const x = new THREE.Mesh(g, m);
  x.castShadow = true;
  return x;
}

export interface Pavo {
  g: THREE.Group;
  cuello: THREE.Group;
  cola: THREE.Group;
  abanico: THREE.Group;
  patas: THREE.Object3D[];
}

export function crearPavo(): Pavo {
  const g = new THREE.Group();
  // Cuerpo: huevo azul con las alas pardas plegadas.
  const cuerpo = malla(new THREE.SphereGeometry(0.22, 12, 9), AZUL);
  cuerpo.scale.set(1, 0.95, 1.55);
  cuerpo.position.set(0, 0.62, 0);
  g.add(cuerpo);
  for (const s of [-1, 1]) {
    const ala = malla(new THREE.SphereGeometry(0.17, 8, 6), CAFE);
    ala.scale.set(0.45, 0.8, 1.6);
    ala.position.set(s * 0.15, 0.64, -0.08);
    g.add(ala);
  }
  // Cuello con la cabeza: azul eléctrico, mancha blanca en la cara y cresta en abanico.
  const cuello = new THREE.Group();
  cuello.position.set(0, 0.72, 0.24);
  const c1 = malla(new THREE.CylinderGeometry(0.05, 0.085, 0.45, 8), AZUL_CLARO);
  c1.position.set(0, 0.2, 0.04);
  c1.rotation.x = 0.25;
  cuello.add(c1);
  const cabeza = malla(new THREE.SphereGeometry(0.065, 10, 8), AZUL_CLARO);
  cabeza.position.set(0, 0.45, 0.1);
  cuello.add(cabeza);
  const cara = malla(new THREE.SphereGeometry(0.03, 6, 5), BLANCO);
  cara.position.set(0.045, 0.46, 0.13);
  const cara2 = cara.clone();
  cara2.position.x = -0.045;
  cuello.add(cara, cara2);
  const pico = malla(new THREE.ConeGeometry(0.02, 0.07, 6), PATA);
  pico.rotation.x = Math.PI / 2;
  pico.position.set(0, 0.44, 0.19);
  cuello.add(pico);
  for (let k = -2; k <= 2; k++) {
    const pluma = malla(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 3), AZUL);
    pluma.position.set(k * 0.012, 0.56, 0.08);
    pluma.rotation.z = k * 0.15;
    cuello.add(pluma);
    const punta = malla(new THREE.SphereGeometry(0.012, 5, 4), AZUL_CLARO);
    punta.position.set(k * 0.02, 0.62, 0.08);
    cuello.add(punta);
  }
  g.add(cuello);
  // Patas.
  const patas: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const pata = new THREE.Group();
    pata.position.set(s * 0.08, 0.45, 0.02);
    const muslo = malla(new THREE.CylinderGeometry(0.015, 0.018, 0.45, 5), PATA);
    muslo.position.y = -0.22;
    pata.add(muslo);
    const pie = malla(new THREE.BoxGeometry(0.06, 0.015, 0.1), PATA);
    pie.position.set(0, -0.44, 0.03);
    pata.add(pie);
    g.add(pata);
    patas.push(pata);
  }
  // Cola plegada: larga cola de plumas verdes con ocelos que arrastra por detrás.
  const cola = new THREE.Group();
  cola.position.set(0, 0.6, -0.3);
  for (let k = 0; k < 9; k++) {
    const a = (k - 4) * 0.06;
    const tira = malla(new THREE.PlaneGeometry(0.12, 1.25), k % 2 ? VERDE : VERDE_OSCURO);
    tira.rotation.x = -Math.PI / 2 + 0.38;
    tira.position.set(Math.sin(a) * 0.5, -0.22, -0.6);
    tira.rotation.z = a;
    cola.add(tira);
    const ojo = malla(new THREE.CircleGeometry(0.035, 8), OCELO);
    ojo.rotation.x = -Math.PI / 2 + 0.38;
    ojo.position.set(Math.sin(a) * 1.05, -0.42, -1.12);
    cola.add(ojo);
  }
  g.add(cola);
  // Abanico desplegado (oculto al andar): semicírculo de plumas con ocelos dorados y azules.
  const abanico = new THREE.Group();
  abanico.position.set(0, 0.62, -0.28);
  const n = 25;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI * 0.55 + (k / (n - 1)) * Math.PI * 1.1;
    const pluma = new THREE.Group();
    pluma.rotation.z = -a;
    const caña = malla(new THREE.PlaneGeometry(0.1, 1.35), k % 2 ? VERDE : VERDE_OSCURO);
    caña.position.y = 0.68;
    pluma.add(caña);
    const anillo = malla(new THREE.CircleGeometry(0.075, 10), BRONCE);
    anillo.position.set(0, 1.2, 0.005);
    const ojo = malla(new THREE.CircleGeometry(0.045, 10), OCELO);
    ojo.position.set(0, 1.2, 0.01);
    const ojo2 = malla(new THREE.CircleGeometry(0.075, 10), BRONCE);
    ojo2.position.set(0, 0.72, 0.005);
    const ojo3 = malla(new THREE.CircleGeometry(0.04, 10), OCELO);
    ojo3.position.set(0, 0.72, 0.01);
    pluma.add(anillo, ojo, ojo2, ojo3);
    abanico.add(pluma);
  }
  abanico.rotation.x = -0.25;
  abanico.scale.setScalar(0.001);
  abanico.visible = false;
  g.add(abanico);
  return { g, cuello, cola, abanico, patas };
}

type Estado = "andar" | "picotear" | "abanico";

/** Comportamiento de un pavo: elige destinos libres, anda, se para y a veces hace la rueda. */
export class PavoReal {
  readonly p: Pavo;
  private x: number;
  private y: number;
  private rumbo = 0;
  private meta: P2;
  private estado: Estado = "andar";
  private tiempo = 0;
  private paso = 0;
  private apertura = 0;
  private r: () => number;

  constructor(inicio: P2, private libre: (p: P2) => boolean, private azarDestino: () => P2, semilla: number) {
    this.p = crearPavo();
    [this.x, this.y] = inicio;
    this.meta = inicio;
    let v = semilla;
    this.r = () => ((v = (v * 16807) % 2147483647) / 2147483647);
    this.nuevaMeta();
  }

  private nuevaMeta() {
    for (let k = 0; k < 20; k++) {
      const q = this.azarDestino();
      if (Math.hypot(q[0] - this.x, q[1] - this.y) < 25 && this.libre(q)) {
        this.meta = q;
        return;
      }
    }
    this.meta = this.azarDestino();
  }

  /** Avanza la simulación y coloca el modelo (x, y del mapa → posición del mundo). */
  actualizar(dt: number, t: number, colocar: (g: THREE.Group, x: number, y: number, rumbo: number) => void) {
    this.tiempo -= dt;
    const pv = this.p;
    if (this.estado === "andar") {
      const dx = this.meta[0] - this.x;
      const dy = this.meta[1] - this.y;
      const d = Math.hypot(dx, dy);
      const objetivo = Math.atan2(dx, dy);
      let giro = objetivo - this.rumbo;
      while (giro > Math.PI) giro -= Math.PI * 2;
      while (giro < -Math.PI) giro += Math.PI * 2;
      this.rumbo += Math.max(-dt * 2.2, Math.min(dt * 2.2, giro));
      const v = Math.abs(giro) > 1 ? 0.15 : 0.55;
      const sx = this.x + Math.sin(this.rumbo) * v * dt;
      const sy = this.y + Math.cos(this.rumbo) * v * dt;
      if (this.libre([sx, sy])) {
        this.x = sx;
        this.y = sy;
      } else this.nuevaMeta();
      this.paso += dt * 7;
      if (d < 0.6) {
        const z = this.r();
        this.estado = z < 0.3 ? "abanico" : "picotear";
        this.tiempo = this.estado === "abanico" ? 7 + this.r() * 5 : 1.5 + this.r() * 3;
      }
    } else if (this.estado === "abanico") {
      // Hace la rueda: despliega la cola y gira lentamente sobre sí mismo, temblando las plumas.
      this.rumbo += dt * 0.45;
      if (this.tiempo <= 0) this.estado = "picotear";
    } else if (this.tiempo <= 0) {
      this.estado = "andar";
      this.nuevaMeta();
    }
    const quiere = this.estado === "abanico" && this.tiempo > 1.2 ? 1 : 0;
    this.apertura += (quiere - this.apertura) * Math.min(1, dt * 2.5);
    pv.abanico.visible = this.apertura > 0.02;
    pv.abanico.scale.setScalar(Math.max(0.001, this.apertura));
    pv.abanico.rotation.y = this.apertura > 0.5 ? Math.sin(t * 22) * 0.02 : 0;
    pv.cola.visible = this.apertura < 0.6;
    // Cabeceo al andar y picoteo al pararse.
    const andando = this.estado === "andar";
    pv.cuello.rotation.x = andando ? Math.sin(this.paso) * 0.18 : this.estado === "picotear" ? 0.9 + Math.sin(t * 6) * 0.3 * Math.max(0, Math.sin(t * 1.3)) : -0.1;
    pv.patas[0].rotation.x = andando ? Math.sin(this.paso) * 0.5 : 0;
    pv.patas[1].rotation.x = andando ? -Math.sin(this.paso) * 0.5 : 0;
    colocar(pv.g, this.x, this.y, this.rumbo);
  }
}
