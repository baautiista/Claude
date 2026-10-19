import { HABILIDADES, NIVEL_MAX, nivel, nivelHab, progresoHab, type AspectoJugador, type Habilidad } from "../estado";
import { pagar } from "../economia";
import type { Juego } from "../juego";
import { h } from "./dom";
import { sonido } from "./sonido";

/**
 * Ficha del personaje: necesidades, habilidades (con su ventaja real en el juego) y aspecto.
 * El aspecto se cambia aquí; la ropa nueva se compra en la tienda de esta misma ficha.
 */

const PEINADOS: [string, string][] = [["corto", "Corto"], ["tupe", "Tupé"], ["largo", "Largo"], ["coleta", "Coleta"], ["mono", "Moño"], ["rizado", "Rizado"], ["calvo", "Rapado"]];
const COLORES_PELO = ["#1E1712", "#3B2418", "#6B4428", "#A8743F", "#D8B26E", "#8C8C8C", "#E9E5DC", "#7A2E22"];
/** Ropa a la venta: cada atuendo es un conjunto. */
export const ROPA: { id: string; nombre: string; precio: number }[] = [
  { id: "informal", nombre: "Camiseta y vaquero", precio: 0 },
  { id: "verano", nombre: "Camiseta y pantalón corto", precio: 25 },
  { id: "vestido", nombre: "Vestido de verano", precio: 40 },
  { id: "camarero", nombre: "Camisa blanca y chaleco", precio: 35 },
  { id: "pescador", nombre: "Jersey y peto de faena", precio: 30 },
  { id: "trabajo", nombre: "Ropa de trabajo con chaleco reflectante", precio: 30 },
];

function barra(valor: number, color = "#1F5EFF") {
  return h("div", { class: "barra-ficha" }, h("i", { style: `width:${Math.max(2, Math.min(100, valor))}%;background:${color}` }));
}

export function abrirPersonaje(j: Juego, pestana: "ficha" | "aspecto" = "ficha") {
  const e = j.e;
  const asp: AspectoJugador = { armario: ["informal"], ...(e.aspecto ?? {}) };
  const guardarAspecto = (c: Partial<AspectoJugador>) => {
    e.aspecto = { ...asp, ...c };
    Object.assign(asp, c);
    j.aplicarAspecto();
    j.refrescar();
  };
  const pestanas = h("div", { class: "chips" },
    h("button", { class: `chip${pestana === "ficha" ? " activo" : ""}`, onclick: () => abrirPersonaje(j, "ficha") }, "Ficha"),
    h("button", { class: `chip${pestana === "aspecto" ? " activo" : ""}`, onclick: () => abrirPersonaje(j, "aspecto") }, "Aspecto y ropa"),
  );
  if (pestana === "ficha") {
    const nec: [string, number, string][] = [["Energía", e.energia, "#1F5EFF"], ["Comida", e.comida, "#E6A93A"], ["Ánimo", e.animo, "#C4E910"], ["Vida social", e.social, "#8E7CC3"], ["Higiene", e.higiene ?? 80, "#2BA9C9"]];
    j.hoja("PERSONAJE", `${e.nombre} · nivel ${nivel(e)}`, pestanas,
      h("h3", {}, "Necesidades"),
      h("div", { class: "ficha-necesidades" }, ...nec.map(([n, v, c]) => h("div", { class: "fila-ficha" }, h("span", {}, n), barra(v, c), h("b", {}, String(Math.round(v)))))),
      (e.higiene ?? 80) < 25 ? h("p", { class: "desc aviso-ficha" }, "Necesitas una ducha: la vida social baja más rápido. Dúchate en casa.") : null,
      h("h3", {}, "Habilidades"),
      h("p", { class: "desc" }, "Suben practicando: cocinando, pescando, cultivando, vendiendo en el puesto, reformando, publicando y tratando con los vecinos."),
      h("div", { class: "ficha-habilidades" }, ...(Object.keys(HABILIDADES) as Habilidad[]).map((k) => {
        const n = nivelHab(e, k);
        return h("div", { class: "habilidad" },
          h("div", { class: "fila-ficha" }, h("b", {}, HABILIDADES[k].nombre), h("span", { class: "nivel" }, n >= NIVEL_MAX ? "Máx." : `Nv. ${n}`)),
          barra(progresoHab(e, k) * 100, "#C4E910"),
          h("small", {}, n ? HABILIDADES[k].ventaja(n) : "Aún sin ventaja: practica para el nivel 1"),
        );
      })),
    );
    return;
  }
  const fila = (titulo: string, ...hijos: (Node | string)[]) => h("div", { class: "fila-aspecto" }, h("b", {}, titulo), h("div", { class: "chips" }, ...hijos));
  const chip = (activo: boolean, texto: string, fn: () => void) => h("button", { class: `chip${activo ? " activo" : ""}`, onclick: () => { fn(); sonido("toque"); abrirPersonaje(j, "aspecto"); } }, texto);
  j.hoja("PERSONAJE", "Aspecto y ropa", pestanas,
    fila("Cuerpo", chip(asp.sexo !== "m", "Masculino", () => guardarAspecto({ sexo: "h" })), chip(asp.sexo === "m", "Femenino", () => guardarAspecto({ sexo: "m" }))),
    fila("Complexión", ...([[0.88, "Delgada"], [1, "Media"], [1.2, "Fuerte"]] as [number, string][]).map(([c, t]) => chip(Math.abs((asp.complexion ?? 1) - c) < 0.05, t, () => guardarAspecto({ complexion: c })))),
    fila("Peinado", ...PEINADOS.map(([id, t]) => chip((asp.peinado ?? "corto") === id, t, () => guardarAspecto({ peinado: id })))),
    fila("Color de pelo", ...COLORES_PELO.map((c) => h("button", { class: `muestra${asp.pelo === c ? " activo" : ""}`, style: `background:${c}`, "aria-label": c, onclick: () => { guardarAspecto({ pelo: c }); abrirPersonaje(j, "aspecto"); } }))),
    fila("Complementos", chip(!asp.accesorio, "Ninguno", () => guardarAspecto({ accesorio: null })), chip(asp.accesorio === "gafas", "Gafas", () => guardarAspecto({ accesorio: "gafas" })), chip(asp.accesorio === "gorra", "Gorra", () => guardarAspecto({ accesorio: "gorra" }))),
    h("h3", {}, "Tu ropa"),
    h("p", { class: "desc" }, "El color principal de la ropa es el que elegiste al empezar. Lo que compras se queda en tu armario."),
    h("div", { class: "tienda-ropa" }, ...ROPA.map((r) => {
      const tengo = (asp.armario ?? []).includes(r.id) || r.precio === 0;
      const puesto = (asp.atuendo ?? "informal") === r.id;
      return h("div", { class: `prenda${puesto ? " puesta" : ""}` },
        h("span", {}, h("b", {}, r.nombre), h("small", {}, tengo ? (puesto ? "La llevas puesta" : "En tu armario") : `${r.precio} €`)),
        puesto ? h("span", { class: "marca-ok" }, "✓")
          : tengo ? h("button", { class: "boton mini", onclick: () => { guardarAspecto({ atuendo: r.id }); sonido("bien"); abrirPersonaje(j, "aspecto"); } }, "Ponerla")
          : h("button", { class: "boton mini", disabled: e.dinero < r.precio, onclick: async () => {
              if (!(await pagar(e, r.precio, "compra", `ropa:${r.id}`))) return;
              guardarAspecto({ armario: [...(asp.armario ?? []), r.id], atuendo: r.id });
              sonido("bien");
              j.aviso(`Has comprado <b>${r.nombre}</b> por ${r.precio} €.`);
              abrirPersonaje(j, "aspecto");
            } }, "Comprar"),
      );
    })),
  );
}
