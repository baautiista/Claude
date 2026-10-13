/** Calidad del generador de viviendas: accesos, colocación, dotación y diferencias por gama. */
import fs from "node:fs";
import { MUEBLES } from "../src/compartido/hogar/catalogo.ts";
import { datosDesdeLinea, fijarMapa } from "../src/compartido/hogar/datos.ts";
import { crearInterior, errorColocacion, huella, unidades, type InteriorDoc } from "../src/compartido/hogar/hogar.ts";
import { esExterior, esPaso, habitacionEn } from "../src/compartido/hogar/plano.ts";
import { Informe } from "./utilidades.ts";

const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] } as const;

export async function viviendas() {
  const inf = new Informe("Viviendas · distribución, amueblado y gamas");
  fijarMapa(datosDesdeLinea(JSON.parse(fs.readFileSync(new URL("../src/datos/linea.json", import.meta.url), "utf8"))));
  const us = unidades();
  const docs = us.map((u) => ({ u, d: crearInterior(u) }));
  const enHab = (d: InteriorDoc, tipo: string, hid: string) => d.muebles.filter((m) => {
    const f = huella(m);
    const h = habitacionEn(d.plano, Math.floor((f.x0 + f.x1) / 4), Math.floor((f.z0 + f.z1) / 4));
    return h?.id === hid && m.tipo === tipo;
  });
  const hay = (d: InteriorDoc, hid: string, ...tipos: string[]) => tipos.some((t) => enHab(d, t, hid).length > 0);

  await inf.caso(`Todas las habitaciones se alcanzan desde la entrada (${us.length} viviendas)`, () => {
    for (const { u, d } of docs) {
      const p = d.plano;
      const vistas = new Set([habitacionEn(p, p.entrada.x, p.entrada.z)!.id]);
      let cambio = true;
      while (cambio) {
        cambio = false;
        for (const hu of p.huecos) {
          if (!esPaso(hu.tipo)) continue;
          const a = habitacionEn(p, hu.x, hu.z);
          const b = habitacionEn(p, hu.x + DIRS[hu.lado][0], hu.z + DIRS[hu.lado][1]);
          if (!a || !b) continue;
          for (const [x, y] of [[a, b], [b, a]]) if (vistas.has(x.id) && !vistas.has(y.id)) (vistas.add(y.id), (cambio = true));
        }
      }
      const sueltas = p.habitaciones.filter((h) => !vistas.has(h.id));
      if (sueltas.length) throw new Error(`${u.id}: sin acceso a ${sueltas.map((h) => h.nombre).join(", ")}`);
    }
  });
  await inf.caso("Ningún mueble atraviesa paredes, se solapa, flota fuera de su sitio ni tapa una puerta", () => {
    for (const { u, d } of docs) for (const m of d.muebles) {
      const e = errorColocacion(d, m, m.uid);
      if (e) throw new Error(`${u.id} ${m.tipo}: ${e}`);
    }
  });
  await inf.caso("Habitaciones proporcionadas (ninguna de menos de 1 m de lado ni estancias de más de 4:1)", () => {
    for (const { u, d } of docs) for (const h of d.plano.habitaciones) {
      const w = h.x1 - h.x0, f = h.z1 - h.z0;
      if (Math.min(w, f) < 1) throw new Error(`${u.id} ${h.nombre} ${w}×${f}`);
      if (!["pasillo", "recibidor", "patio", "terraza", "despensa", "vestidor"].includes(h.tipo) && Math.max(w, f) / Math.min(w, f) > 4) throw new Error(`${u.id} ${h.nombre} ${w}×${f}`);
    }
  });
  await inf.caso("Cada cocina tiene fregadero y fuego; cada baño, lavabo, inodoro y ducha o bañera", () => {
    for (const { u, d } of docs) for (const h of d.plano.habitaciones) {
      if (h.tipo === "cocina") {
        if (!hay(d, h.id, "fregadero")) throw new Error(`${u.id} ${h.nombre}: sin fregadero`);
        if (!hay(d, h.id, "placa", "cocina")) throw new Error(`${u.id} ${h.nombre}: sin fuego`);
      }
      if (h.tipo === "bano") {
        if (!hay(d, h.id, "lavabo", "muebleLavabo", "lavaboDoble")) throw new Error(`${u.id} ${h.nombre}: sin lavabo`);
        if (!hay(d, h.id, "inodoro")) throw new Error(`${u.id} ${h.nombre}: sin inodoro`);
        if (!hay(d, h.id, "ducha", "duchaObra", "banera", "baneraExenta")) throw new Error(`${u.id} ${h.nombre}: sin ducha ni bañera`);
      }
    }
  });
  await inf.caso("Cada dormitorio tiene cama y cada salón, sofá", () => {
    for (const { u, d } of docs) for (const h of d.plano.habitaciones) {
      if (h.tipo === "dormitorio" && !hay(d, h.id, "camaDoble", "camaIndividual", "camaTapizada")) throw new Error(`${u.id} ${h.nombre}: sin cama`);
      if (h.tipo === "salon" && !hay(d, h.id, "sofa", "sofaChaise")) throw new Error(`${u.id} ${h.nombre}: sin sofá`);
    }
  });
  await inf.caso("Las camas apoyan el cabecero en una pared", () => {
    for (const { u, d } of docs) for (const m of d.muebles) {
      if (!["camaDoble", "camaIndividual", "camaTapizada"].includes(m.tipo)) continue;
      const f = huella(m);
      const lado = (["n", "e", "s", "o"] as const)[m.rot];
      const h = habitacionEn(d.plano, Math.floor(f.x0 / 2), Math.floor(f.z0 / 2))!;
      const pegada = lado === "n" ? f.z0 === h.z0 * 2 : lado === "s" ? f.z1 === h.z1 * 2 : lado === "o" ? f.x0 === h.x0 * 2 : f.x1 === h.x1 * 2;
      if (!pegada) throw new Error(`${u.id}: cama separada de la pared`);
    }
  });
  await inf.caso("Las gamas se distinguen: techo, metros por habitación, acabados y dotación", () => {
    const media = (g: string, f: (d: InteriorDoc) => number) => {
      const l = docs.filter(({ d }) => d.perfil!.gama === g).map(({ d }) => f(d));
      return l.reduce((s, x) => s + x, 0) / Math.max(1, l.length);
    };
    // Las casas antiguas tienen techos altos aunque sean baratas: se comparan las demás.
    const techo = (g: string) => {
      const l = docs.filter(({ d }) => d.perfil!.gama === g && d.perfil!.estilo !== "antiguo").map(({ d }) => d.plano.techo ?? 2.7);
      return l.reduce((s, x) => s + x, 0) / Math.max(1, l.length);
    };
    const m2hab = (g: string) => media(g, (d) => {
      const hs = d.plano.habitaciones.filter((h) => ["dormitorio", "salon", "cocina", "bano"].includes(h.tipo));
      return hs.reduce((s, h) => s + (h.x1 - h.x0) * (h.z1 - h.z0), 0) / hs.length;
    });
    const precioMuebles = (g: string) => media(g, (d) => d.muebles.reduce((s, m) => s + MUEBLES[m.tipo].precio, 0));
    if (!(techo("economica") < techo("media") && techo("media") < techo("alta"))) throw new Error("techos");
    if (!(m2hab("economica") < m2hab("alta"))) throw new Error(`m² por habitación ${m2hab("economica").toFixed(1)} / ${m2hab("alta").toFixed(1)}`);
    if (!(precioMuebles("economica") * 1.8 < precioMuebles("alta"))) throw new Error("dotación");
    console.log(`     techo ${techo("economica").toFixed(2)}/${techo("media").toFixed(2)}/${techo("alta").toFixed(2)} m · m² por estancia ${m2hab("economica").toFixed(1)}/${m2hab("media").toFixed(1)}/${m2hab("alta").toFixed(1)} · mobiliario ${Math.round(precioMuebles("economica"))}/${Math.round(precioMuebles("media"))}/${Math.round(precioMuebles("alta"))} €`);
  });
  await inf.caso("Ninguna vivienda queda vacía y los exteriores tienen su mobiliario", () => {
    for (const { u, d } of docs) {
      if (d.muebles.length < 12) throw new Error(`${u.id}: solo ${d.muebles.length} muebles`);
      for (const h of d.plano.habitaciones) if (esExterior(h.tipo) && !hay(d, h.id, "mesaPatio", "bancoPatio")) throw new Error(`${u.id} ${h.nombre} vacío`);
    }
  });
  return inf;
}
