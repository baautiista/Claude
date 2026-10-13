import { MUEBLES } from "./catalogo.ts";
import type { Perfil } from "./perfil.ts";
import type { Habitacion, Lado, Plano } from "./plano.ts";

/**
 * Amueblado inicial por reglas de composición interior (no al azar):
 *  - los muebles altos se apoyan en paredes ciegas; nada tapa puertas ni balconeras;
 *  - la cama pone el cabecero contra la pared más tranquila (sin puerta ni ventana,
 *    mejor la opuesta a la puerta), con mesitas a los lados y paso a los pies;
 *  - el sofá mira a la tele a una distancia cómoda, con la mesa de centro entre ambos;
 *  - la cocina es un frente continuo: frigorífico en un extremo, fregadero bajo la
 *    ventana, fuego lejos del frigorífico; en L o con isla según la gama;
 *  - el baño pone la ducha o la bañera al fondo y el lavabo junto a la puerta;
 *  - cada mueble reserva su zona de uso (delante del armario, a los pies de la cama…).
 * La gama decide qué piezas y de qué calidad; el estilo, los colores.
 *
 * Medidas en medias celdas (0,5 m). Los modelos tienen el respaldo hacia z− (rot 0).
 */

export interface Colocado {
  uid: string;
  tipo: string;
  x: number;
  z: number;
  rot: number;
  color: string;
  roto?: boolean;
}

type Valida = (m: Colocado) => string | null;
type Estado = "solido" | "ventana" | "paso";

/** Giro que pone el respaldo contra cada pared. */
const ROT: Record<Lado, number> = { n: 0, e: 1, s: 2, o: 3 };
const OPUESTO: Record<Lado, Lado> = { n: "s", s: "n", e: "o", o: "e" };
const LADOS: Lado[] = ["n", "e", "s", "o"];

const dims = (tipo: string, rot: number) => {
  const d = MUEBLES[tipo];
  return rot % 2 ? [d.d, d.w] : [d.w, d.d];
};

/** Color del catálogo más parecido al de la paleta del estilo. */
function colorCercano(tipo: string, deseado: string) {
  const op = MUEBLES[tipo].colores;
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(deseado);
  let mejor = op[0];
  let dm = Infinity;
  for (const c of op) {
    const [r2, g2, b2] = rgb(c);
    const dd = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (dd < dm) (dm = dd), (mejor = c);
  }
  return mejor;
}

export function amueblar(plano: Plano, perfil: Perfil, rnd: () => number, valida: Valida, uid: () => string, deterioro: number, out: Colocado[] = []): Colocado[] {
  const reservado = new Set<string>();
  const g = perfil.gama;
  const ac = perfil.acabados;
  const alta = g === "alta";
  const media = g === "media";
  const viejo = perfil.estilo === "antiguo";

  /** Paleta por tipo de pieza. */
  const color = (tipo: string): string => {
    const def = MUEBLES[tipo];
    const cat = def.categoria;
    if (["moduloBajo", "fregadero", "placa", "columnaHorno", "muebleAlto", "isla", "cocina"].includes(tipo)) return colorCercano(tipo, ac.cocina);
    if (["sofa", "sofaChaise", "sillon", "camaTapizada", "banqueta", "sillaTapizada", "alfombra", "camaDoble", "camaIndividual", "toallero"].includes(tipo)) return colorCercano(tipo, ac.textil);
    if (cat === "Baño" || tipo === "frigorifico") return def.colores[0];
    // Madera de la carpintería en el resto.
    return colorCercano(tipo, viejo ? "#6B4A2E" : ac.madera === "#FFFFFF" || ac.madera === "#F4F4F2" ? (alta ? "#C9A06A" : "#F4F1EA") : ac.madera);
  };

  /* ── Paredes de una habitación en medias celdas ────────────────────── */
  const huecosDe = (h: Habitacion, lado: Lado) => {
    const largo = lado === "n" || lado === "s" ? (h.x1 - h.x0) * 2 : (h.z1 - h.z0) * 2;
    const est: Estado[] = Array(largo).fill("solido");
    const [dx, dz] = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] }[lado];
    for (const hu of plano.huecos) {
      // El hueco puede estar apuntado desde esta habitación o desde la vecina.
      let cx: number;
      let cz: number;
      if (hu.lado === lado && hu.x >= h.x0 && hu.x < h.x1 && hu.z >= h.z0 && hu.z < h.z1) (cx = hu.x), (cz = hu.z);
      else if (hu.lado === OPUESTO[lado] && hu.x - dx >= h.x0 && hu.x - dx < h.x1 && hu.z - dz >= h.z0 && hu.z - dz < h.z1) (cx = hu.x - dx), (cz = hu.z - dz);
      else continue;
      // Solo cuentan los huecos de este muro (la celda tiene que estar pegada a él).
      if ((lado === "n" && cz !== h.z0) || (lado === "s" && cz !== h.z1 - 1) || (lado === "o" && cx !== h.x0) || (lado === "e" && cx !== h.x1 - 1)) continue;
      const t = (lado === "n" || lado === "s" ? cx - h.x0 : cz - h.z0) * 2;
      const e: Estado = hu.tipo === "ventana" ? "ventana" : "paso";
      est[t] = est[t + 1] = e;
    }
    return est;
  };
  /** Alféizar de las ventanas de cada habitación (las balconeras llegan al suelo). */
  const alfeizar = (h: Habitacion) => (h.tipo === "cocina" || h.tipo === "bano" ? 1.0 : ac.ventana === "balconera" ? 0 : ac.ventana === "aluminio" ? 1.0 : 0.9);

  const libreDe = (m: Colocado) => {
    const [w, d] = dims(m.tipo, m.rot);
    for (let x = m.x; x < m.x + w; x++) for (let z = m.z; z < m.z + d; z++) if (reservado.has(`${x},${z}`)) return false;
    return true;
  };
  const reservar = (x0: number, z0: number, x1: number, z1: number) => {
    for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) reservado.add(`${x},${z}`);
  };
  const poner = (m: Omit<Colocado, "uid" | "color"> & { color?: string }, opciones: { frente?: number; ignorarReserva?: boolean } = {}) => {
    const c: Colocado = { uid: "", color: m.color ?? color(m.tipo), ...m } as Colocado;
    if (!opciones.ignorarReserva && MUEBLES[c.tipo].capa === "suelo" && !libreDe(c)) return null;
    if (valida(c)) return null;
    c.uid = uid();
    if (viejo && MUEBLES[c.tipo].capa !== "pared" && rnd() < deterioro * 0.6) c.roto = true;
    out.push(c);
    const [w, d] = dims(c.tipo, c.rot);
    if (MUEBLES[c.tipo].capa === "suelo") reservar(c.x, c.z, c.x + w, c.z + d);
    // Zona de uso delante del mueble.
    const f = opciones.frente ?? 0;
    if (f > 0) {
      const lado = (["n", "e", "s", "o"] as Lado[])[c.rot];
      if (lado === "n") reservar(c.x, c.z + d, c.x + w, c.z + d + f);
      if (lado === "s") reservar(c.x, c.z - f, c.x + w, c.z);
      if (lado === "o") reservar(c.x + w, c.z, c.x + w + f, c.z + d);
      if (lado === "e") reservar(c.x - f, c.z, c.x, c.z + d);
    }
    return c;
  };

  /** Coordenadas de un mueble contra la pared `lado` en la posición t (medias celdas desde el inicio). */
  const contraEn = (h: Habitacion, tipo: string, lado: Lado, t: number) => {
    const rot = ROT[lado];
    const [w, d] = dims(tipo, rot);
    const X0 = h.x0 * 2, X1 = h.x1 * 2, Z0 = h.z0 * 2, Z1 = h.z1 * 2;
    if (lado === "n") return { x: X0 + t, z: Z0, rot };
    if (lado === "s") return { x: X0 + t, z: Z1 - d, rot };
    if (lado === "o") return { x: X0, z: Z0 + t, rot };
    return { x: X1 - w, z: Z0 + t, rot };
  };
  /** ¿Cabe contra la pared en t sin tapar huecos? (bajo ventana solo si es más bajo que el alféizar). */
  const paredPermite = (h: Habitacion, tipo: string, lado: Lado, t: number) => {
    const est = huecosDe(h, lado);
    const w = MUEBLES[tipo].w;
    if (t < 0 || t + w > est.length) return false;
    const alto = MUEBLES[tipo].alto * 0.5;
    for (let k = t; k < t + w; k++) {
      if (est[k] === "paso") return false;
      if (est[k] === "ventana" && alto > alfeizar(h) - 0.05) return false;
    }
    return true;
  };
  /** Contra una pared, lo más cerca posible de la posición preferida f (0–1). */
  const contra = (h: Habitacion, tipo: string, lado: Lado, f = 0.5, frente = 0, extra: Partial<Colocado> = {}) => {
    const largo = lado === "n" || lado === "s" ? (h.x1 - h.x0) * 2 : (h.z1 - h.z0) * 2;
    const w = MUEBLES[tipo].w;
    const ideal = Math.round((largo - w) * f);
    const orden = Array.from({ length: Math.max(0, largo - w + 1) }, (_, t) => t).sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal));
    for (const t of orden) {
      if (!paredPermite(h, tipo, lado, t)) continue;
      const c = poner({ tipo, ...contraEn(h, tipo, lado, t), ...extra }, { frente });
      if (c) return c;
    }
    return null;
  };
  /** Paredes ordenadas de más a menos «tranquilas» (sin paso, sin ventanas, más largas). */
  const paredesTranquilas = (h: Habitacion) => LADOS.map((l) => {
    const e = huecosDe(h, l);
    const pasos = e.filter((x) => x === "paso").length;
    const vent = e.filter((x) => x === "ventana").length;
    return { l, pasos, vent, largo: e.length };
  }).sort((a, b) => a.pasos - b.pasos || a.vent - b.vent || b.largo - a.largo);
  const ladoPuerta = (h: Habitacion) => LADOS.find((l) => huecosDe(h, l).includes("paso")) ?? "n";

  /* ── Recetas por habitación ─────────────────────────────────────────── */

  const dormitorio = (h: Habitacion) => {
    const ancho = Math.min(h.x1 - h.x0, h.z1 - h.z0);
    const principal = !!h.principal;
    const doble = principal || (ancho >= 3 && g !== "economica") || ancho >= 4;
    const cama = principal && alta ? "camaTapizada" : doble ? "camaDoble" : "camaIndividual";
    // Cabecero: pared opuesta a la puerta si está libre; si no, la más tranquila.
    const puerta = ladoPuerta(h);
    const candidatas = [OPUESTO[puerta], ...paredesTranquilas(h).map((p) => p.l)].filter((l, i, a) => a.indexOf(l) === i);
    let c: Colocado | null = null;
    for (const lado of candidatas) {
      // Centrada, con sitio para las mesitas a ambos lados.
      c = contra(h, cama, lado, 0.5, 2);
      if (c) break;
    }
    if (!c) return;
    const lado = (["n", "e", "s", "o"] as Lado[])[c.rot];
    const [w, d] = dims(cama, c.rot);
    // Mesitas: a los dos lados del cabecero (una en la gama económica o si no cabe).
    const mesitas = g === "economica" && !principal ? 1 : 2;
    const lados = lado === "n" || lado === "s" ? [[c.x - 1, c.z], [c.x + w, c.z]] : [[c.x, c.z - 1], [c.x, c.z + d]];
    if (lado === "s") lados.forEach((p) => (p[1] = c!.z + d - 1));
    if (lado === "e") lados.forEach((p) => (p[0] = c!.x + w - 1));
    let puestas = 0;
    for (const [x, z] of lados) {
      if (puestas >= mesitas) break;
      const m = poner({ tipo: "mesitaNoche", x, z, rot: c.rot }, { ignorarReserva: true });
      if (m) {
        puestas++;
        if (g !== "economica" || principal) poner({ tipo: "lamparaMesa", x, z, rot: c.rot, color: alta ? "#FFFFFF" : "#F7E3A1" }, { ignorarReserva: true });
      }
    }
    if (cama === "camaTapizada") {
      // Banqueta a los pies.
      const pies = lado === "n" ? { x: c.x + 0.5, z: c.z + d } : lado === "s" ? { x: c.x + 0.5, z: c.z - 1 } : null;
      if (pies) poner({ tipo: "banqueta", x: Math.floor(pies.x), z: pies.z, rot: c.rot }, { ignorarReserva: true });
    }
    if (g !== "economica") poner({ tipo: "alfombra", x: c.x - (lado === "n" || lado === "s" ? 0 : 0), z: c.z, rot: c.rot, color: colorCercano("alfombra", ac.textil) }, { ignorarReserva: true });
    if (alta || (media && principal)) contra(h, alta ? "cuadroGrande" : "cuadro", lado, 0.5);
    // Armario: en una pared lateral, con un metro libre delante (no hace falta si hay vestidor).
    const hayVestidor = principal && plano.habitaciones.some((x) => x.tipo === "vestidor");
    if (!hayVestidor) {
      const armario = alta || (media && principal) ? "armarioEmpotrado" : "armario";
      const laterales = LADOS.filter((l) => l !== lado).sort((a, b) => (a === OPUESTO[lado] ? 1 : 0) - (b === OPUESTO[lado] ? 1 : 0));
      // Si el empotrado no cabe, un armario de dos puertas; si tampoco, una cómoda.
      const opciones = armario === "armarioEmpotrado" ? [armario, "armario", "comoda"] : [armario, "comoda"];
      fuera: for (const tipo of opciones) for (const l of laterales) if (contra(h, tipo, l, 0.9, 2) || contra(h, tipo, l, 0.1, 2)) break fuera;
    }
    if (principal && g !== "economica") for (const l of LADOS) if (l !== lado && contra(h, "comoda", l, 0.5, 2)) break;
    // Estudio en los dormitorios secundarios: escritorio bajo la ventana.
    if (!principal && g !== "economica") {
      for (const l of LADOS) {
        if (!huecosDe(h, l).includes("ventana")) continue;
        const e = contra(h, "escritorio", l, 0.5, 2);
        if (e) {
          const [ew, ed] = dims("escritorio", e.rot);
          const silla = l === "n" ? { x: e.x + 1, z: e.z + ed, rot: 2 } : l === "s" ? { x: e.x + 1, z: e.z - 1, rot: 0 } : l === "o" ? { x: e.x + ew, z: e.z + 1, rot: 1 } : { x: e.x - 1, z: e.z + 1, rot: 3 };
          poner({ tipo: "sillaOficina", ...silla }, { ignorarReserva: true });
          break;
        }
      }
    }
    if (alta) for (const l of LADOS) if (contra(h, "plantaGrande", l, 0.98)) break;
  };

  const salon = (h: Habitacion, conComedor: boolean) => {
    const area = (h.x1 - h.x0) * (h.z1 - h.z0);
    // Pared de la tele: la más tranquila; el sofá enfrente.
    const tv = paredesTranquilas(h).find((p) => p.pasos === 0 && p.largo >= 6) ?? paredesTranquilas(h)[0];
    const lado = tv.l;
    const mueble = alta ? "aparador" : "muebleTele";
    const base = contra(h, mueble, lado, 0.5, 0);
    if (base) poner({ tipo: "television", x: base.x + (base.rot % 2 ? 0 : 0), z: base.z, rot: base.rot }, { ignorarReserva: true });
    // Centro de la tele, en medias celdas.
    const centro = base ? (lado === "n" || lado === "s" ? base.x + dims(mueble, base.rot)[0] / 2 : base.z + dims(mueble, base.rot)[1] / 2) : null;
    const sofa = alta && area >= 18 ? "sofaChaise" : "sofa";
    const prof = lado === "n" || lado === "s" ? (h.z1 - h.z0) * 2 : (h.x1 - h.x0) * 2;
    const op = OPUESTO[lado];
    let s: Colocado | null = null;
    // Distancia cómoda de 2,5–3,5 m: contra la pared de enfrente si cae ahí; si no, exento.
    const [sw, sd] = dims(sofa, ROT[op]);
    void sw;
    const dist = 6 + (alta ? 1 : 0);
    const largo = lado === "n" || lado === "s" ? (h.x1 - h.x0) * 2 : (h.z1 - h.z0) * 2;
    const tSofa = centro !== null ? Math.round(centro - (lado === "n" || lado === "s" ? h.x0 * 2 : h.z0 * 2) - MUEBLES[sofa].w / 2) : Math.round((largo - MUEBLES[sofa].w) / 2);
    if (prof <= dist + 2 + Math.max(sw, sd) / 2) {
      for (const tipoSofa of sofa === "sofaChaise" ? [sofa, "sofa"] : [sofa]) {
        if (s) break;
        const t = centro !== null ? Math.round(centro - (lado === "n" || lado === "s" ? h.x0 * 2 : h.z0 * 2) - MUEBLES[tipoSofa].w / 2) : tSofa;
        if (paredPermite(h, tipoSofa, op, t)) s = poner({ tipo: tipoSofa, ...contraEn(h, tipoSofa, op, t) }, { frente: 0 });
        if (!s) s = contra(h, tipoSofa, op, 0.5);
      }
    }
    // Exento, mirando a la tele: de la distancia ideal hacia una más corta si el salón es poco profundo;
    // y si el sofá grande no cabe, uno de tres plazas.
    for (const tipoSofa of sofa === "sofaChaise" ? [sofa, "sofa"] : [sofa]) {
      if (s || !base) break;
      const rot = ROT[op];
      const [w, d] = dims(tipoSofa, rot);
      const X0 = h.x0 * 2, Z0 = h.z0 * 2, Z1 = h.z1 * 2, X1 = h.x1 * 2;
      const tS = centro !== null ? Math.round(centro - (lado === "n" || lado === "s" ? X0 : Z0) - MUEBLES[tipoSofa].w / 2) : 0;
      const a = X0 + tS;
      const b = Z0 + tS;
      for (let dd = dist; dd >= 4 && !s; dd--) {
        const pos = lado === "n" ? { x: a, z: Z0 + 1 + dd } : lado === "s" ? { x: a, z: Z1 - 1 - dd - d } : lado === "o" ? { x: X0 + 1 + dd, z: b } : { x: X1 - 1 - dd - w, z: b };
        // Separado al menos medio metro de la pared de enfrente (balconeras, paso).
        const holgura = lado === "n" ? Z1 - (pos.z + d) : lado === "s" ? pos.z - Z0 : lado === "o" ? X1 - (pos.x + w) : pos.x - X0;
        if (holgura < 1) continue;
        s = poner({ tipo: tipoSofa, ...pos, rot });
      }
    }
    // Último recurso: el sofá contra cualquier pared libre (un salón nunca se queda sin él).
    if (!s) for (const l of paredesTranquilas(h).map((p) => p.l)) if ((s = contra(h, "sofa", l, 0.5, 2))) break;
    if (s && base) {
      // Mesa de centro entre sofá y tele, alfombra debajo.
      const [w, d] = dims(s.tipo, s.rot);
      const rotM = lado === "n" || lado === "s" ? 0 : 1;
      const [mw, md] = dims("mesaCentro", rotM);
      const mx = lado === "n" || lado === "s" ? s.x + Math.floor((w - mw) / 2) : lado === "o" ? s.x - md - 1 : s.x + w + 1;
      const mz = lado === "n" ? s.z - md - 1 : lado === "s" ? s.z + d + 1 : s.z + Math.floor((d - mw) / 2);
      if (g !== "economica") poner({ tipo: "alfombra", x: lado === "n" || lado === "s" ? mx - 0.5 | 0 : mx, z: lado === "n" || lado === "s" ? mz : mz - 0.5 | 0, rot: rotM }, { ignorarReserva: true });
      const mesa = poner({ tipo: "mesaCentro", x: mx, z: mz, rot: rotM });
      if (mesa && g !== "economica") poner({ tipo: "jarron", x: mesa.x + 1, z: mesa.z, rot: 0 }, { ignorarReserva: true });
      // Sillones a los lados de la mesa, mirando al centro.
      const sillones = alta ? 2 : media ? 1 : 0;
      const lateral: [Lado, number][] = lado === "n" || lado === "s" ? [["o", 3], ["e", 1]] : [["n", 0], ["s", 2]];
      for (let i = 0; i < sillones && mesa; i++) {
        const [l, rot] = lateral[i];
        const [mw2, md2] = dims("mesaCentro", rotM);
        const p = l === "o" ? { x: mesa.x - 3, z: mesa.z } : l === "e" ? { x: mesa.x + mw2 + 1, z: mesa.z } : l === "n" ? { x: mesa.x, z: mesa.z - 3 } : { x: mesa.x, z: mesa.z + md2 + 1 };
        poner({ tipo: "sillon", ...p, rot });
      }
      // Lámpara de pie junto al sofá; cuadro encima si está contra la pared.
      const lp = lado === "n" || lado === "s" ? { x: s.x + w, z: s.z } : { x: s.x, z: s.z + d };
      if (g !== "economica") poner({ tipo: "lamparaPie", ...lp, rot: 0, color: alta ? "#FFFFFF" : "#F7E3A1" });
      if (g !== "economica") contra(h, alta ? "cuadroGrande" : "cuadro", op, 0.5);
    }
    // Comedor en la zona que queda libre.
    const mesa = conComedor ? comedor(h, alta ? "mesaComedorGrande" : "mesaComedor", alta ? "sillaTapizada" : "silla", alta ? 6 : 4) ?? (alta ? comedor(h, "mesaComedor", "sillaTapizada", 4) : null) : null;
    if (g !== "economica") for (const l of paredesTranquilas(h).map((p) => p.l)) if (contra(h, "estanteria", l, 0.1, 2)) break;
    if (alta) for (const l of LADOS) if (contra(h, "plantaGrande", l, 0.98) || contra(h, "plantaGrande", l, 0.02)) break;
    else if (media) for (const l of LADOS) if (contra(h, "maceta", l, 0.98)) break;
    return !!mesa;
  };

  /** Mesa con sillas alrededor, con paso de medio metro a cada lado. */
  const comedor = (h: Habitacion, mesa: string, silla: string, sillas: number) => {
    const X0 = h.x0 * 2, X1 = h.x1 * 2, Z0 = h.z0 * 2, Z1 = h.z1 * 2;
    const candidatos: { x: number; z: number; rot: number; s: number }[] = [];
    for (const rot of [0, 1]) {
      const [w, d] = dims(mesa, rot);
      for (let x = X0 + 2; x + w <= X1 - 2; x++) for (let z = Z0 + 2; z + d <= Z1 - 2; z++) {
        // Hueco para mesa y sillas: todo el rectángulo ampliado debe estar libre.
        let ok = true;
        for (let i = x - 1; i < x + w + 1 && ok; i++) for (let j = z - 1; j < z + d + 1 && ok; j++) if (reservado.has(`${i},${j}`)) ok = false;
        if (!ok) continue;
        // Mejor centrada en su zona libre y cerca de una ventana.
        const cx = x + w / 2, cz = z + d / 2;
        candidatos.push({ x, z, rot, s: -Math.min(cx - X0, X1 - cx, cz - Z0, Z1 - cz) });
      }
    }
    candidatos.sort((a, b) => a.s - b.s);
    for (const c of candidatos) {
      const m = poner({ tipo: mesa, x: c.x, z: c.z, rot: c.rot });
      if (!m) continue;
      const [w, d] = dims(mesa, c.rot);
      const pos: [number, number, number][] = [];
      // Sillas en los lados largos (y en las cabeceras si se piden seis).
      if (w >= d) {
        for (let k = 0; k < Math.floor(w / 2); k++) pos.push([c.x + 1 + k * 2 - (w > 4 ? 0 : 0), c.z - 1, 2], [c.x + 1 + k * 2, c.z + d, 0]);
      } else {
        for (let k = 0; k < Math.floor(d / 2); k++) pos.push([c.x - 1, c.z + 1 + k * 2, 1], [c.x + w, c.z + 1 + k * 2, 3]);
      }
      let n = 0;
      for (const [x, z, rot] of pos) {
        if (n >= sillas) break;
        // La silla mira a la mesa: respaldo hacia fuera.
        if (poner({ tipo: silla, x, z, rot: (rot + 2) % 4 }, { ignorarReserva: true })) n++;
      }
      return m;
    }
    return null;
  };

  const cocina = (h: Habitacion) => {
    // Frente principal: la pared más larga sin paso; módulos de 1 m.
    const paredes = LADOS.map((l) => ({ l, e: huecosDe(h, l) })).filter((p) => !p.e.every((x) => x === "paso"));
    paredes.sort((a, b) => {
      const libres = (e: Estado[]) => e.filter((x) => x !== "paso").length;
      return libres(b.e) - libres(a.e);
    });
    if (!paredes.length) return;
    const frente = paredes[0];
    let pilaPuesta = false;
    let fuegoPuesto = false;
    const largo = frente.e.length;
    // Secuencia según la gama: frigorífico al extremo, fuego en medio, fregadero bajo la ventana.
    const colocarFrente = (lado: Lado, est: Estado[], extremo: "frigo" | "columna" | null) => {
      let t = 0;
      const puestos: Colocado[] = [];
      const frigo = alta ? "frigoAmericano" : "frigorifico";
      if (extremo) {
        const tipo = extremo === "frigo" ? frigo : "columnaHorno";
        // En el extremo más alejado de la puerta.
        for (const tt of [0, est.length - 2]) {
          if (paredPermite(h, tipo, lado, tt)) {
            const c = poner({ tipo, ...contraEn(h, tipo, lado, tt) }, { frente: 2 });
            if (c) {
              puestos.push(c);
              if (tt === 0) t = 2;
              break;
            }
          }
        }
      }
      const fin = extremo && puestos.length && t === 0 ? est.length - 2 : est.length;
      let fuego = fuegoPuesto;
      let pila = pilaPuesta;
      const ventanaEn = est.findIndex((x) => x === "ventana");
      for (; t + 2 <= fin; t += 2) {
        if (est[t] === "paso" || est[t + 1] === "paso") continue;
        let tipo = "moduloBajo";
        if (!pila && (ventanaEn < 0 ? t >= 2 : Math.abs(t - ventanaEn) <= 1)) tipo = "fregadero";
        else if (!fuego && pila && t >= 2) tipo = g === "economica" ? "cocina" : "placa";
        if (tipo === "cocina" && !paredPermite(h, "cocina", lado, t)) tipo = "placa";
        if (!paredPermite(h, tipo, lado, t)) continue;
        const c = poner({ tipo, ...contraEn(h, tipo, lado, t) }, { frente: 2 });
        if (!c) continue;
        puestos.push(c);
        if (tipo === "fregadero") pila = true;
        if (tipo === "cocina" || tipo === "placa") fuego = true;
        if (tipo === "cocina") t += 2;
      }
      pilaPuesta ||= pila;
      fuegoPuesto ||= fuego;
      // Si no hubo fuego (pared corta), cambia un módulo por la placa.
      if (!fuego) {
        const m = puestos.find((p) => p.tipo === "moduloBajo");
        if (m) {
          m.tipo = "placa";
          fuegoPuesto = true;
        }
      }
      // Muebles altos encima de los bajos, donde no hay ventana.
      if (g !== "economica" || largo >= 6) for (const p of puestos) {
        if (!["moduloBajo", "placa", "fregadero"].includes(p.tipo)) continue;
        const tt = lado === "n" || lado === "s" ? p.x - h.x0 * 2 : p.z - h.z0 * 2;
        if (est[tt] === "ventana" || est[tt + 1] === "ventana") continue;
        poner({ tipo: "muebleAlto", ...contraEn(h, "muebleAlto", lado, tt) }, { ignorarReserva: true });
      }
      return puestos;
    };
    colocarFrente(frente.l, frente.e, "frigo");
    // Segundo frente en L (media y alta) si la cocina da para ello sin comerse el paso.
    if (g !== "economica" && Math.min(h.x1 - h.x0, h.z1 - h.z0) >= 4) {
      const contiguas = LADOS.filter((l) => l !== frente.l && l !== OPUESTO[frente.l]);
      for (const l of contiguas) {
        const e = huecosDe(h, l);
        if (e.filter((x) => x === "solido").length >= 4) {
          colocarFrente(l, e, alta || media ? "columna" : null);
          break;
        }
      }
    }
    // Lo imprescindible, aunque el frente principal no diera para todo: fregadero, fuego y frigorífico.
    const tiene = (...t: string[]) => out.some((m) => t.includes(m.tipo) && m.x >= h.x0 * 2 && m.x < h.x1 * 2 && m.z >= h.z0 * 2 && m.z < h.z1 * 2);
    for (const [tipos, pieza] of [[["fregadero"], "fregadero"], [["placa", "cocina"], "placa"], [["frigorifico", "frigoAmericano"], alta ? "frigoAmericano" : "frigorifico"]] as [string[], string][]) {
      if (tiene(...tipos)) continue;
      fuera: for (const l of LADOS) for (const f of [0.5, 0, 1]) if (contra(h, pieza, l, f, 2)) break fuera;
      // Sin sitio: un módulo bajo se convierte en la pieza que falta.
      if (!tiene(...tipos) && pieza !== "frigoAmericano" && pieza !== "frigorifico") {
        const m = out.find((x) => x.tipo === "moduloBajo" && x.x >= h.x0 * 2 && x.x < h.x1 * 2 && x.z >= h.z0 * 2 && x.z < h.z1 * 2);
        if (m) m.tipo = pieza;
      }
    }
    // Isla con barra en la gama alta, si queda un metro libre alrededor.
    if (alta) comedor(h, "isla", "taburete", 3);
  };
  /** Mesa en la cocina cuando el comedor no cabe en el salón (o la cocina es de office). */
  const mesaCocina = (h: Habitacion, haceFalta: boolean) => {
    if (out.some((m) => m.tipo === "isla" && m.x >= h.x0 * 2 && m.x < h.x1 * 2 && m.z >= h.z0 * 2 && m.z < h.z1 * 2)) return;
    if (!haceFalta && g !== "economica") return;
    if (comedor(h, "mesaComedor", "silla", 4) ?? comedor(h, "mesaCocina", "silla", 2)) return;
    // Cocina estrecha: mesa de office contra la pared, con las sillas por el lado libre.
    for (const l of paredesTranquilas(h).map((p) => p.l)) {
      const m = contra(h, "mesaCocina", l, 0.5, 0);
      if (!m) continue;
      const [w, d] = dims("mesaCocina", m.rot);
      const sitios = l === "n" ? [[m.x, m.z + d, 2], [m.x + 1, m.z + d, 2]] : l === "s" ? [[m.x, m.z - 1, 0], [m.x + 1, m.z - 1, 0]] : l === "o" ? [[m.x + w, m.z, 1], [m.x + w, m.z + 1, 1]] : [[m.x - 1, m.z, 3], [m.x - 1, m.z + 1, 3]];
      let n = 0;
      for (const [x, z, rot] of sitios) if (poner({ tipo: "silla", x, z, rot }, { ignorarReserva: true })) n++;
      if (n) return;
      // Sin sitio para sentarse: esa pared no sirve.
      out.splice(out.indexOf(m), 1);
    }
  };

  const bano = (h: Habitacion) => {
    const puerta = ladoPuerta(h);
    const fondo = OPUESTO[puerta];
    const area = (h.x1 - h.x0) * (h.z1 - h.z0);
    // Ducha o bañera al fondo, en una esquina.
    const opciones = alta ? ["duchaObra", "banera", "ducha"] : media ? (area >= 6 ? ["banera", "ducha"] : ["ducha"]) : viejo ? ["banera", "ducha"] : ["ducha"];
    const laterales = LADOS.filter((l) => l !== puerta && l !== fondo);
    let bano: Colocado | null = null;
    for (const tipo of opciones) {
      for (const [l, f] of [[fondo, 0], [fondo, 1], ...laterales.map((x) => [x, 1] as [Lado, number])] as [Lado, number][]) {
        bano = contra(h, tipo, l, f, 0);
        if (bano) break;
      }
      if (bano) break;
    }
    // Bañera exenta además de la ducha en los baños grandes de gama alta.
    if (alta && area >= 9) for (const l of laterales) if (contra(h, "baneraExenta", l, 0.5, 1)) break;
    // Lavabo cerca de la puerta, inodoro al lado.
    const lavabo = alta ? (Math.max(h.x1 - h.x0, h.z1 - h.z0) >= 3 ? "lavaboDoble" : "muebleLavabo") : media ? "muebleLavabo" : "lavabo";
    let lav: Colocado | null = null;
    for (const l of [...laterales, puerta, fondo]) {
      lav = contra(h, lavabo, l, 0.2, 2) ?? (lavabo === "lavaboDoble" ? contra(h, "muebleLavabo", l, 0.2, 2) : null);
      if (lav) break;
    }
    for (const l of [...laterales, fondo, puerta]) if (contra(h, "inodoro", l, 0.85, 1)) break;
    if (g !== "economica") for (const l of LADOS) if (contra(h, "toallero", l, 0.5)) break;
    if (g === "economica" || viejo) for (const l of LADOS) if (lav && l === (["n", "e", "s", "o"] as Lado[])[lav.rot] && contra(h, "espejo", l, 0.2)) break;
  };

  const despacho = (h: Habitacion) => {
    for (const l of LADOS) {
      if (!huecosDe(h, l).includes("ventana")) continue;
      const e = contra(h, "escritorio", l, 0.5, 2);
      if (e) {
        poner({ tipo: "ordenador", x: e.x, z: e.z, rot: e.rot }, { ignorarReserva: true });
        break;
      }
    }
    for (const l of paredesTranquilas(h).map((p) => p.l)) if (contra(h, "estanteria", l, 0.5, 2)) break;
    if (alta) for (const l of LADOS) if (contra(h, "sillon", l, 0.9, 1)) break;
    for (const l of LADOS) if (contra(h, "lamparaPie", l, 0.98)) break;
  };

  const recibidor = (h: Habitacion) => {
    if (g === "economica") return;
    for (const l of paredesTranquilas(h).map((p) => p.l)) {
      const c = contra(h, "consola", l, 0.5, 1);
      if (c) {
        contra(h, "espejo", l, 0.5);
        poner({ tipo: "lamparaMesa", x: c.x, z: c.z, rot: c.rot, color: "#FFFFFF" }, { ignorarReserva: true });
        break;
      }
    }
    for (const l of LADOS) if (contra(h, "perchero", l, 0.95)) break;
    if (alta) for (const l of LADOS) if (contra(h, "plantaGrande", l, 0.02)) break;
  };

  const pasillo = (h: Habitacion) => {
    if (g === "economica") return;
    // Cuadros en las paredes largas, espaciados.
    const largo = h.x1 - h.x0 >= h.z1 - h.z0 ? (["n", "s"] as Lado[]) : (["o", "e"] as Lado[]);
    const n = alta ? 3 : 1;
    for (let i = 0; i < n; i++) contra(h, "cuadro", largo[i % 2], (i + 0.5) / n);
  };

  const exterior = (h: Habitacion) => {
    const mesa = comedor(h, "mesaPatio", "silla", g === "economica" ? 2 : 4);
    if (!mesa) poner({ tipo: "mesaPatio", x: h.x0 * 2 + 1, z: h.z0 * 2 + 1, rot: 0 });
    for (const l of LADOS) if (contra(h, "bancoPatio", l, 0.5, 1)) break;
    if (g !== "economica") for (const l of LADOS) if (contra(h, "plantaGrande", l, 0.02)) break;
    const geranios = alta ? 4 : media ? 3 : 2;
    let k = 0;
    for (const l of LADOS) for (let i = 0; i < geranios && k < geranios; i++) if (contra(h, "geranios", l, (i + 0.5) / geranios)) k++;
  };

  /* ── Orden: lo que más espacio necesita primero ─────────────────────── */
  const salonPrincipal = plano.habitaciones.find((x) => x.tipo === "salon");
  const comedorEnSalon = !!salonPrincipal && ((salonPrincipal.x1 - salonPrincipal.x0) * (salonPrincipal.z1 - salonPrincipal.z0) >= (alta ? 20 : media ? 18 : 16) || perfil.cocinaAbierta);
  const orden: Habitacion["tipo"][] = ["cocina", "bano", "dormitorio", "salon", "estudio", "recibidor", "pasillo", "vestidor", "despensa", "patio", "terraza"];
  let comedorPuesto = false;
  for (const tipo of orden) for (const h of plano.habitaciones.filter((x) => x.tipo === tipo)) {
    if (tipo === "dormitorio") dormitorio(h);
    else if (tipo === "salon") {
      comedorPuesto = salon(h, comedorEnSalon && h === salonPrincipal) || comedorPuesto;
      for (const c of plano.habitaciones.filter((x) => x.tipo === "cocina")) mesaCocina(c, !comedorPuesto);
    }
    else if (tipo === "cocina") cocina(h);
    else if (tipo === "bano") bano(h);
    else if (tipo === "estudio") despacho(h);
    else if (tipo === "recibidor") recibidor(h);
    else if (tipo === "pasillo") pasillo(h);
    else if (tipo === "vestidor") for (const l of LADOS) contra(h, "vestidor", l, 0.5, 0);
    else if (tipo === "despensa") for (const l of LADOS) contra(h, "estanteDespensa", l, 0.5, 0);
    else exterior(h);
  }
  return out;
}

/** Huella de un mueble colocado y las paredes de su habitación (para las pruebas de calidad). */
export const largoDe = (h: Habitacion) => Math.max(h.x1 - h.x0, h.z1 - h.z0);
