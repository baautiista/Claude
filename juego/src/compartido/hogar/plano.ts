import { azar } from "./datos.ts";
import type { Perfil } from "./perfil.ts";

/**
 * Planos interiores de las viviendas. Se trazan con plantillas por programa
 * (estudio, piso pequeño, mediano, grande, casa…) y reglas de la gama: no es un
 * reparto al azar. Los usan el servidor (colisiones, permisos de colocación) y el
 * navegador (escena 3D).
 *
 * Esquema general (la fachada está en z = 0):
 *   banda de día   · salón, recibidor, cocina (y en las casas, el dormitorio principal)
 *   pasillo        · 1 m (estándar) o 2 m (galería de una vivienda de gama alta)
 *   banda de noche · dormitorios, baños, vestidor, despacho (y en las casas, la cocina)
 *   exterior       · patio (casas) o terraza (áticos)
 * Las viviendas pequeñas no tienen pasillo: las habitaciones abren al salón.
 *
 * Unidades: 1 celda = 1 m. Los muebles se colocan en medias celdas (0,5 m).
 * Lados: "n" hacia z−, "s" hacia z+, "o" hacia x−, "e" hacia x+.
 */

export type TipoHab = "salon" | "cocina" | "dormitorio" | "bano" | "patio" | "estudio" | "terraza" | "pasillo" | "recibidor" | "vestidor" | "despensa";
export type Lado = "n" | "s" | "e" | "o";

export interface Habitacion {
  id: string;
  tipo: TipoHab;
  nombre: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Dormitorio principal (cama de matrimonio, baño propio…). */
  principal?: boolean;
}

/**
 * Huecos en los muros (uno por celda de pared):
 *  - puerta: hoja batiente; entrada: puerta de la calle;
 *  - doble: puerta de dos hojas (ocupa dos celdas seguidas);
 *  - arco: paso sin hoja con dintel; abierto: sin muro (cocina abierta, recibidor-pasillo);
 *  - ventana.
 */
export type TipoHueco = "puerta" | "ventana" | "entrada" | "doble" | "arco" | "abierto";

export interface Hueco {
  /** Celda de la habitación desde la que se mira el hueco. */
  x: number;
  z: number;
  lado: Lado;
  tipo: TipoHueco;
}

export interface Plano {
  ancho: number;
  fondo: number;
  habitaciones: Habitacion[];
  huecos: Hueco[];
  entrada: { x: number; z: number };
  /** Altura libre de techos (m). Los planos antiguos no la tienen (2,7 m). */
  techo?: number;
}

export type TipoVivienda = "casa" | "piso" | "atico";

export const NOMBRES_HAB: Record<TipoHab, string> = {
  salon: "Salón", cocina: "Cocina", dormitorio: "Dormitorio", bano: "Baño", patio: "Patio", estudio: "Despacho", terraza: "Terraza",
  pasillo: "Pasillo", recibidor: "Recibidor", vestidor: "Vestidor", despensa: "Despensa",
};
/** Habitaciones de paso o de servicio: sin muebles de estar. */
export const DE_PASO: TipoHab[] = ["pasillo", "recibidor"];
export const esExterior = (t: TipoHab) => t === "patio" || t === "terraza";
/** Huecos por los que se puede pasar andando. */
export const esPaso = (t: TipoHueco) => t === "puerta" || t === "doble" || t === "arco" || t === "abierto";

interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}
interface Pieza extends Rect {
  tipo: TipoHab;
  principal?: boolean;
  nombre?: string;
}

/** Tramo de pared común entre dos habitaciones (si lo hay). */
export function comun(a: Rect, b: Rect) {
  if (a.x1 === b.x0 || b.x1 === a.x0) {
    const z0 = Math.max(a.z0, b.z0);
    const z1 = Math.min(a.z1, b.z1);
    if (z1 - z0 >= 1) return { eje: "x" as const, x: a.x1 === b.x0 ? a.x1 : a.x0, d0: z0, d1: z1 };
  }
  if (a.z1 === b.z0 || b.z1 === a.z0) {
    const x0 = Math.max(a.x0, b.x0);
    const x1 = Math.min(a.x1, b.x1);
    if (x1 - x0 >= 1) return { eje: "z" as const, z: a.z1 === b.z0 ? a.z1 : a.z0, d0: x0, d1: x1 };
  }
  return null;
}

/** Medidas mínimas por gama (ancho de un dormitorio, de un baño, fondo de la banda de noche…). */
const MEDIDAS = {
  economica: { dorm: 3, principal: 3, bano: 2, cocina: 2, fondoNoche: 3, fondoDia: 4 },
  media: { dorm: 3, principal: 4, bano: 2, cocina: 3, fondoNoche: 4, fondoDia: 4 },
  alta: { dorm: 4, principal: 5, bano: 3, cocina: 4, fondoNoche: 5, fondoDia: 5 },
} as const;

/** Reparte un ancho total entre piezas con mínimos y pesos (enteros, suma exacta). */
function anchos(total: number, minimos: number[], pesos: number[]) {
  const out = [...minimos];
  let resto = total - out.reduce((s, v) => s + v, 0);
  const sp = pesos.reduce((s, v) => s + v, 0) || 1;
  if (resto > 0) {
    const extra = pesos.map((p) => Math.floor((resto * p) / sp));
    extra.forEach((e, i) => (out[i] += e));
    resto -= extra.reduce((s, v) => s + v, 0);
    // Lo que sobra va a las piezas de más peso.
    const orden = pesos.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
    for (let k = 0; resto > 0; k++, resto--) out[orden[k % orden.length]]++;
  }
  return out;
}

export function trazarPlano(perfil: Perfil, superficie: number, tipo: TipoVivienda, semilla: number): Plano {
  const rnd = azar(semilla + 101);
  const g = perfil.gama;
  // En las viviendas pequeñas el dormitorio principal no puede quitarle el sitio al salón.
  const pequena = perfil.programa === "pisoPequeno" || perfil.programa === "casaPequena" || perfil.programa === "estudio";
  const M = pequena ? { ...MEDIDAS[g], principal: Math.min(MEDIDAS[g].principal, 3), dorm: 3, cocina: Math.min(MEDIDAS[g].cocina, 3) } : MEDIDAS[g];
  const area = Math.max(30, Math.min(220, superficie));
  const exterior = tipo === "casa" ? "patio" : tipo === "atico" ? "terraza" : null;

  // Piezas de la banda de noche (de izquierda a derecha) con su ancho mínimo y su peso.
  type Item = { tipo: TipoHab; min: number; peso: number; principal?: boolean; nombre?: string };
  const noche: Item[] = [];
  const dia: Item[] = [];
  const casa = tipo === "casa";
  const sinPasillo = perfil.pasillo === 0;
  const dormitorios = perfil.dormitorios;
  const banoMin = M.bano;

  if (perfil.programa === "estudio") {
    // Una estancia con cocina abierta al fondo y el baño.
    noche.push({ tipo: "cocina", min: 2, peso: 2 }, { tipo: "bano", min: banoMin, peso: 0.4 });
    dia.push({ tipo: "salon", min: 4, peso: 1, nombre: "Estancia" });
  } else {
    // Banda de día.
    if (casa) {
      dia.push({ tipo: "salon", min: 4, peso: g === "alta" ? 5 : 4 });
      if (!sinPasillo && g !== "economica") dia.push({ tipo: "recibidor", min: perfil.pasillo === 2 ? 2 : 1, peso: 0 });
      if (dormitorios >= 1 && !sinPasillo) dia.push({ tipo: "dormitorio", min: M.principal, peso: 3, principal: true });
    } else if (perfil.cocinaAbierta) {
      if (!sinPasillo && g !== "economica") dia.push({ tipo: "recibidor", min: perfil.pasillo === 2 ? 2 : 1, peso: 0 });
      dia.push({ tipo: "salon", min: 4, peso: g === "alta" ? 5 : 4 }, { tipo: "cocina", min: M.cocina, peso: 2 });
    } else {
      dia.push({ tipo: "salon", min: 4, peso: g === "alta" ? 5 : 4 });
      if (!sinPasillo && g !== "economica") dia.push({ tipo: "recibidor", min: perfil.pasillo === 2 ? 2 : 1, peso: 0 });
      dia.push({ tipo: "cocina", min: M.cocina, peso: 2 });
    }
    // Banda de noche.
    if (casa) noche.push({ tipo: "cocina", min: M.cocina, peso: 2.4 });
    if (casa && perfil.despensa) noche.push({ tipo: "despensa", min: 1, peso: 0 });
    const enDia = dia.some((d) => d.principal) ? 1 : 0;
    // Baño propio y vestidor van pegados al principal: solo si está en la banda de noche.
    const enSuite = perfil.enSuite && !enDia;
    if (perfil.vestidor && !enDia && dormitorios >= 1) noche.push({ tipo: "vestidor", min: 2, peso: 0 });
    for (let i = enDia; i < dormitorios; i++) {
      const principal = i === 0;
      noche.push({ tipo: "dormitorio", min: principal ? M.principal : M.dorm, peso: principal ? 3.4 : 2.4, principal });
      // Baño en suite pegado al principal.
      if (principal && enSuite) noche.push({ tipo: "bano", min: banoMin, peso: 0.5, nombre: "Baño del dormitorio" });
    }
    const banosComunes = perfil.banos - (enSuite ? 1 : 0);
    for (let i = 0; i < banosComunes; i++) noche.splice(casa ? 1 + (perfil.despensa ? 1 : 0) : Math.min(noche.length, 2), 0, { tipo: "bano", min: banoMin, peso: 0.5 });
    if (perfil.despacho) noche.push({ tipo: "estudio", min: 3, peso: 2 });
    // Casa pequeña sin pasillo (casa popular): salón y dormitorio principal a la calle; detrás,
    // cocina y baño (que abren al salón) y el resto de dormitorios, que se pasan por el principal.
    if (casa && sinPasillo) {
      dia.length = 0;
      dia.push({ tipo: "salon", min: g === "alta" ? 5 : 4, peso: 3 });
      if (dormitorios >= 1) {
        dia.push({ tipo: "dormitorio", min: M.principal, peso: 1.6, principal: true });
        const i = noche.findIndex((n) => n.tipo === "dormitorio" && n.principal);
        if (i >= 0) noche.splice(i, 1);
      }
    }
    // Piso pequeño: salón con cocina abierta delante; dormitorio y baño detrás.
    if (perfil.programa === "pisoPequeno" && dia.every((d) => d.tipo !== "cocina")) dia.push({ tipo: "cocina", min: 2, peso: 1.5 });
  }

  // Dimensiones: el ancho tiene que dar cabida a la banda más exigente.
  const minNoche = noche.reduce((s, i) => s + i.min, 0);
  const minDia = dia.reduce((s, i) => s + i.min, 0);
  const P = perfil.pasillo;
  const ancho = Math.max(minNoche, minDia, Math.min(16, Math.round(Math.sqrt(area * (casa ? 1.05 : 0.95)))));
  let fondoNoche = M.fondoNoche;
  let fondoDia = M.fondoDia;
  const fondoCasa = Math.max(fondoDia + P + fondoNoche, Math.round(area / ancho));
  // El fondo que sobra se reparte entre día (salón más amplio) y noche.
  let sobra = fondoCasa - (fondoDia + P + fondoNoche);
  while (sobra > 0) {
    if (fondoDia <= fondoNoche + 1) fondoDia++;
    else fondoNoche++;
    sobra--;
  }
  const fondoExt = exterior ? Math.max(3, Math.min(6, Math.round(fondoCasa * (g === "alta" ? 0.32 : 0.25)))) : 0;
  const fondo = fondoCasa + fondoExt;

  // Ático: la terraza da a la zona de día, que se pone detrás; la noche, delante.
  const atico = tipo === "atico";
  const zDia = atico ? fondoNoche + P : 0;
  const zPasillo = atico ? fondoNoche : fondoDia;
  const zNoche = atico ? 0 : fondoDia + P;

  const piezas: Pieza[] = [];
  const colocarBanda = (items: Item[], z0: number, z1: number) => {
    const ws = anchos(ancho, items.map((i) => i.min), items.map((i) => i.peso));
    let x = 0;
    items.forEach((it, k) => {
      piezas.push({ x0: x, z0, x1: x + ws[k], z1, tipo: it.tipo, principal: it.principal, nombre: it.nombre });
      x += ws[k];
    });
  };
  colocarBanda(dia, zDia, zDia + fondoDia);
  if (P) piezas.push({ x0: 0, z0: zPasillo, x1: ancho, z1: zPasillo + P, tipo: "pasillo" });
  colocarBanda(noche, zNoche, zNoche + fondoNoche);
  if (exterior) piezas.push({ x0: 0, z0: fondoCasa, x1: ancho, z1: fondo, tipo: exterior });

  // El recibidor llega desde la fachada hasta el pasillo: en los áticos cruza la banda de noche.
  if (atico) {
    const rec = piezas.find((p) => p.tipo === "recibidor");
    if (rec) {
      // Se lleva su columna a la banda de noche (desde la fachada) y deja la de día al salón.
      const salon = piezas.find((p) => p.tipo === "salon")!;
      if (salon.x1 === rec.x0) salon.x1 = rec.x1;
      else if (salon.x0 === rec.x1) salon.x0 = rec.x0;
      rec.z0 = 0;
      rec.z1 = fondoNoche;
      for (const p of piezas) if (p !== rec && p.z0 === 0 && p.z1 === fondoNoche && p.x0 < rec.x1 && p.x1 > rec.x0) {
        if (p.x0 >= rec.x0) p.x0 = rec.x1;
        else p.x1 = rec.x0;
      }
    }
  }

  let nDorm = 0;
  let nBano = 0;
  for (const p of piezas) if (p.tipo === "bano" && !p.nombre && ++nBano > 1) p.nombre = `Baño ${nBano}`;
  const habitaciones: Habitacion[] = piezas.filter((p) => p.x1 > p.x0).map((p, i) => ({
    id: `h${i}`, tipo: p.tipo, x0: p.x0, z0: p.z0, x1: p.x1, z1: p.z1,
    nombre: p.nombre ?? (p.tipo === "dormitorio" ? (p.principal ? "Dormitorio principal" : `Dormitorio ${++nDorm + 1}`) : NOMBRES_HAB[p.tipo]),
    ...(p.principal ? { principal: true } : {}),
  }));

  /* ── Huecos ─────────────────────────────────────────────────────── */
  const huecos: Hueco[] = [];
  const ocupado = new Set<string>();
  const marcar = (h: Hueco) => {
    const k = `${h.x},${h.z},${h.lado}`;
    if (ocupado.has(k)) return;
    huecos.push(h);
    ocupado.add(k);
  };
  /** Hueco en la pared común de a hacia b, en la posición relativa f (0–1) del tramo. */
  const hueco = (a: Habitacion, b: Habitacion, tipoH: TipoHueco, f = 0.5, celdas = 1) => {
    const c = comun(a, b);
    if (!c) return false;
    const largo = c.d1 - c.d0;
    if (largo < celdas) return false;
    // Lejos de las esquinas cuando hay sitio (las puertas pegadas a la esquina dejan rincones muertos).
    const m0 = Math.max(c.d0 + (largo >= celdas + 2 ? 1 : 0), Math.min(c.d1 - celdas - (largo >= celdas + 2 ? 1 : 0), Math.round(c.d0 + (largo - celdas) * f)));
    for (let k = 0; k < celdas; k++) {
      const m = m0 + k;
      if (c.eje === "x") {
        const desdeA = a.x1 === c.x;
        marcar({ x: desdeA ? c.x - 1 : c.x, z: m, lado: desdeA ? "e" : "o", tipo: tipoH });
      } else {
        const desdeA = a.z1 === c.z;
        marcar({ x: m, z: desdeA ? c.z - 1 : c.z, lado: desdeA ? "s" : "n", tipo: tipoH });
      }
    }
    return true;
  };
  /** Pared común entera abierta (cocina abierta, recibidor que se funde con el pasillo). */
  const abrir = (a: Habitacion, b: Habitacion) => {
    const c = comun(a, b);
    if (!c) return;
    for (let m = c.d0; m < c.d1; m++) {
      if (c.eje === "x") {
        const desdeA = a.x1 === c.x;
        marcar({ x: desdeA ? c.x - 1 : c.x, z: m, lado: desdeA ? "e" : "o", tipo: "abierto" });
      } else {
        const desdeA = a.z1 === c.z;
        marcar({ x: m, z: desdeA ? c.z - 1 : c.z, lado: desdeA ? "s" : "n", tipo: "abierto" });
      }
    }
  };
  const de = (t: TipoHab) => habitaciones.filter((h) => h.tipo === t);
  const salon = de("salon")[0];
  const pasillo = de("pasillo")[0];
  const recibidor = de("recibidor")[0];
  const cocina = de("cocina")[0];
  const ac = perfil.acabados;

  // Entrada desde la calle (fachada, z = 0).
  const porFachada = recibidor ?? (atico ? null : salon) ?? habitaciones.find((h) => h.z0 === 0 && !esExterior(h.tipo))!;
  const entradaHab = porFachada ?? pasillo ?? salon;
  const entrada = { x: Math.floor((entradaHab.x0 + entradaHab.x1 - 1) / 2), z: entradaHab.z0 };
  marcar({ ...entrada, lado: "n", tipo: "entrada" });

  // Recibidor: se abre al pasillo y da paso al salón (doble, arco o puerta según la gama).
  if (recibidor && pasillo) abrir(recibidor, pasillo);
  if (recibidor && salon) {
    const tipoSalon: TipoHueco = ac.puertaSalon === "doble" ? "doble" : ac.puertaSalon === "arco" ? "arco" : "puerta";
    if (!hueco(recibidor, salon, tipoSalon, 0.5, tipoSalon === "doble" ? 2 : 1)) hueco(recibidor, salon, "puerta");
  }
  // Salón y pasillo sin recibidor: puerta (o arco en las casas tradicionales).
  if (salon && pasillo && !recibidor) hueco(salon, pasillo, ac.puertaSalon === "arco" ? "arco" : "puerta", 0.5);
  // Cocina: abierta al salón o con puerta al recibidor, al pasillo o al salón.
  if (cocina && salon && perfil.cocinaAbierta && comun(cocina, salon)) abrir(cocina, salon);
  else if (cocina) {
    const desde = [recibidor, pasillo, salon].find((h) => h && comun(h, cocina));
    if (desde) hueco(desde, cocina, "puerta", desde === pasillo ? 0.5 : 0.7);
  }
  // Habitaciones de la banda de noche: puerta al pasillo (o al salón si no hay pasillo).
  const principal = habitaciones.find((h) => h.principal);
  for (const h of habitaciones) {
    if (["salon", "pasillo", "recibidor", "patio", "terraza"].includes(h.tipo) || h === cocina) continue;
    if (h.tipo === "bano" && h.nombre === "Baño del dormitorio" && principal && comun(principal, h)) {
      hueco(principal, h, "puerta", 0.8);
      continue;
    }
    if (h.tipo === "vestidor" && principal && comun(principal, h)) {
      hueco(principal, h, ac.puerta === "lacada" ? "arco" : "puerta", 0.2);
      continue;
    }
    if (h.tipo === "despensa" && cocina && comun(cocina, h)) {
      hueco(cocina, h, "puerta", 0.5);
      continue;
    }
    const desde = [pasillo, recibidor, salon, cocina].find((x) => x && x !== h && comun(x, h));
    if (desde) hueco(desde, h, "puerta", 0.35 + rnd() * 0.3);
  }
  // Exterior: el patio se sale desde la cocina (o el salón); la terraza, desde el salón por una puerta doble.
  const ext = habitaciones.find((h) => esExterior(h.tipo));
  if (ext) {
    const desde = ext.tipo === "terraza" ? [salon, cocina].find((h) => h && comun(h, ext)) : [cocina, salon, pasillo].find((h) => h && comun(h, ext));
    if (desde) hueco(desde, ext, ext.tipo === "terraza" || g === "alta" ? "doble" : "puerta", 0.5, ext.tipo === "terraza" || g === "alta" ? 2 : 1);
  }
  // Seguridad: cualquier habitación sin acceso se une a una vecina.
  const conectada = new Set<string>([entradaHab.id]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const hu of huecos) {
      if (!esPaso(hu.tipo)) continue;
      const a = habitacionEn({ habitaciones } as Plano, hu.x, hu.z);
      const [dx, dz] = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] }[hu.lado];
      const b = habitacionEn({ habitaciones } as Plano, hu.x + dx, hu.z + dz);
      if (!a || !b) continue;
      for (const [p, q] of [[a, b], [b, a]]) if (conectada.has(p.id) && !conectada.has(q.id)) {
        conectada.add(q.id);
        cambio = true;
      }
    }
    if (!cambio) {
      const suelta = habitaciones.find((h) => !conectada.has(h.id) && habitaciones.some((x) => conectada.has(x.id) && comun(x, h)));
      if (suelta) {
        hueco(habitaciones.find((x) => conectada.has(x.id) && comun(x, suelta))!, suelta, "puerta");
        cambio = true;
      }
    }
  }

  // Ventanas: en la fachada y hacia el patio, la terraza o el patio de luces.
  // La gama alta abre más y más grandes (balconeras); la económica, una por pared.
  const paso = g === "alta" ? 2 : g === "media" ? 3 : 99;
  for (const h of habitaciones) {
    if (esExterior(h.tipo) || DE_PASO.includes(h.tipo) || h.tipo === "despensa" || h.tipo === "vestidor") continue;
    const lados: Lado[] = [];
    if (h.z0 === 0) lados.push("n");
    if (h.z1 === fondoCasa) lados.push("s");
    for (const lado of lados) {
      const l0 = h.x0;
      const l1 = h.x1;
      const largo = l1 - l0;
      const z = lado === "n" ? h.z0 : h.z1 - 1;
      const una = paso >= 99 || h.tipo === "bano";
      const posiciones: number[] = [];
      if (una) posiciones.push(l0 + Math.floor((largo - 1) / 2));
      else {
        const n = Math.max(1, Math.floor((largo + 1) / paso));
        for (let k = 0; k < n; k++) posiciones.push(l0 + Math.floor(((k + 0.5) * largo) / n));
      }
      for (const x of posiciones) marcar({ x, z, lado, tipo: "ventana" });
    }
  }
  return { ancho, fondo, habitaciones, huecos, entrada, techo: ac.techo };
}

export function habitacionEn(p: Pick<Plano, "habitaciones">, x: number, z: number) {
  return p.habitaciones.find((h) => x >= h.x0 && x < h.x1 && z >= h.z0 && z < h.z1) ?? null;
}

/**
 * Medias celdas (0,5 m) que no se pueden ocupar con muebles de suelo: delante de
 * cada puerta, arco y de la entrada, para que siempre se pueda pasar. Las paredes
 * abiertas (cocina abierta) no reservan paso: se circula por toda su longitud.
 */
export function pasoLibre(p: Plano) {
  const libre = new Set<string>();
  const marcar = (cx: number, cz: number) => {
    for (const dx of [0, 1]) for (const dz of [0, 1]) libre.add(`${cx * 2 + dx},${cz * 2 + dz}`);
  };
  for (const h of p.huecos) {
    if (h.tipo === "ventana" || h.tipo === "abierto") continue;
    marcar(h.x, h.z);
    const [dx, dz] = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] }[h.lado];
    if (h.tipo !== "entrada") marcar(h.x + dx, h.z + dz);
  }
  return libre;
}
