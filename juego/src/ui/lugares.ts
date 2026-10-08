import type { LugarId } from "../datos/mapa";
import { CULTIVOS, OBJETOS, RECETAS, TIENDAS, type ObjetoId } from "../datos/objetos";
import { PERSONAJES } from "../datos/personajes";
import {
  amistad, cuantos, dar, horaDelDia, limitar, listo, precioVenta, quitar, reputacion, tiene,
} from "../estado";
import type { ICONOS } from "../iconos";
import type { Juego } from "../juego";
import { h } from "./dom";
import { jornadaHuerta, faena, turnoRedaccion } from "./minijuegos";
import { sonido } from "./sonido";

export interface Accion {
  icono: keyof typeof ICONOS | HTMLElement;
  titulo: string;
  sub?: string;
  precio?: string;
  /** Texto con el motivo si no se puede hacer ahora. */
  desactivada?: string | false;
  historia?: boolean;
  fn: () => unknown;
}

/** Horario de apertura [desde, hasta) en horas. */
const HORARIO: Partial<Record<LugarId, [number, number]>> = {
  mercado: [8, 15],
  bar: [8, 24],
  redaccion: [9, 21],
  huerta: [7, 20],
  atunara: [6, 18],
};

export const abierto = (j: Juego, lugar: LugarId) => {
  const hor = HORARIO[lugar];
  if (!hor) return true;
  const hh = horaDelDia(j.e);
  return hh >= hor[0] && hh < hor[1];
};

const cerrado = (j: Juego, lugar: LugarId) =>
  abierto(j, lugar) ? false : `Cerrado ahora. Abre de ${HORARIO[lugar]![0]}:00 a ${HORARIO[lugar]![1]}:00.`;

const lista = (pide: Partial<Record<ObjetoId, number>>) =>
  (Object.entries(pide) as [ObjetoId, number][]).map(([id, n]) => `${n} ${n === 1 ? OBJETOS[id].nombre.toLowerCase() : OBJETOS[id].plural}`).join(", ");

export { lista as listaObjetos };

const bola = (id: ObjetoId) => h("span", { style: `display:block;width:100%;height:100%;background:${OBJETOS[id].color}` });

/* ── Acciones por lugar ─────────────────────────────────────────────── */

export function accionesLugar(j: Juego, lugar: LugarId): Accion[] {
  const e = j.e;
  const trabajo = (oficio: typeof e.oficio, titulo: string, sub: string, fn: () => unknown): Accion[] =>
    e.oficio !== oficio || e.paso < 3
      ? []
      : [{
          icono: "objetivo", titulo, sub,
          desactivada: cerrado(j, lugar) || (e.turnoDia === e.dia ? "Ya has hecho tu turno de hoy. Vuelve mañana." : false),
          fn,
        }];

  switch (lugar) {
    case "casa":
      return e.paso < 1 ? [] : [
        { icono: "brote", titulo: "El patio: huerto", sub: "Planta, espera y cosecha", fn: () => huerto(j) },
        { icono: "bar", titulo: "La cocina", sub: "Prepara platos con lo que tengas", fn: () => cocina(j) },
        horaDelDia(e) >= 18 || horaDelDia(e) < 2
          ? { icono: "casa", titulo: "Dormir", sub: "Hasta mañana a las 8:00", fn: async () => { j.cerrar(); await j.dormir(); } }
          : { icono: "casa", titulo: "Echar una siesta", sub: "2 horas · +35 energía", desactivada: horaDelDia(e) < 14 ? "La siesta, después de comer (a partir de las 14:00)." : false, fn: async () => { e.energia = limitar(e.energia + 35); j.cerrar(); await j.pasar(120); j.aviso("Siesta de las buenas. <b>+35 energía</b>"); } },
      ];
    case "plaza":
      return [{ icono: "periodico", titulo: "Tablón de encargos", sub: `${e.pedidos.length} encargos de vecinos`, fn: () => tablon(j) }];
    case "mercado":
      return [
        ...tienda(j, "mercado", TIENDAS.mercado, cerrado(j, "mercado")),
        { icono: "euro", titulo: "Vender género", sub: e.flags.puesto ? "En tu puesto 14: pagan un 30 % más" : "A los puestos del mercado", desactivada: cerrado(j, "mercado"), fn: () => vender(j) },
      ];
    case "bar": {
      const c = cerrado(j, "bar");
      return [
        { icono: "bar", titulo: "Un café con Lola", sub: "+10 energía · +10 gente", precio: "1 €", desactivada: c || (e.dinero < 1 && "No te llega."), fn: () => comer(j, 1, 0, 10, 10, "Café de los de verdad.") },
        { icono: "bar", titulo: "Montadito de lomo", sub: "+30 comida", precio: "4 €", desactivada: c || (e.dinero < 4 && "No te llega."), fn: () => comer(j, 4, 30, 0, 3, "Montadito con su aceite.") },
        { icono: "bar", titulo: "Ración de tortillitas", sub: "+45 comida · +ánimo", precio: "6 €", desactivada: c || (e.dinero < 6 && "No te llega."), fn: () => comer(j, 6, 45, 0, 5, "Finas, finas. Se ve el camarón.", 8) },
      ];
    }
    case "atunara":
      return [
        ...trabajo("pescador", "Salir a faenar con Antonio", "3 horas · minijuego de pesca · −25 energía", () => faena(j)),
        ...tienda(j, "atunara", TIENDAS.atunara, cerrado(j, "atunara"), "En la lonja"),
      ];
    case "huerta":
      return [
        ...trabajo("hortelano", "Jornada en la huerta", "3 horas · minijuego de plagas · −25 energía", () => jornadaHuerta(j)),
        ...tienda(j, "huerta", TIENDAS.huerta, cerrado(j, "huerta"), "Rafa te lo vende"),
      ];
    case "redaccion":
      return trabajo("periodista", "Turno en la redacción", "3 horas · verificar y titular · −20 energía", () => turnoRedaccion(j));
    case "paseo":
      return [{
        icono: "ola", titulo: "Pasear por Poniente", sub: e.viento === "levanteFuerte" ? "Con levante, aquí se refugia media Línea · +ánimo +gente" : "45 min · +15 ánimo",
        fn: async () => {
          e.animo = limitar(e.animo + 15);
          if (e.viento === "levanteFuerte") e.social = limitar(e.social + 15);
          reputacion(e, "poniente", 1);
          j.cerrar();
          await j.pasar(45, 3);
          j.aviso("La bahía, los barcos y el Peñón. <b>+ánimo</b>");
        },
      }];
    case "levante":
      return [{
        icono: "ola", titulo: "Darse un baño", sub: "1 hora · +20 ánimo",
        desactivada: e.viento === "levanteFuerte" ? "Bandera roja: hoy no se baña nadie." : false,
        fn: async () => {
          e.animo = limitar(e.animo + 20);
          reputacion(e, "levante", 1);
          j.cerrar();
          await j.pasar(60, 5);
          j.aviso("El agua, fresquita. <b>+20 ánimo</b>");
        },
      }];
    case "santaBarbara":
      return [{
        icono: "fuerte", titulo: "Pasear por las ruinas del fuerte", sub: "45 min · +10 ánimo",
        fn: async () => {
          e.animo = limitar(e.animo + 10);
          j.cerrar();
          await j.pasar(45, 3);
          if (!e.flags.fuerte) {
            e.flags.fuerte = true;
            await j.decir(["narrador", "Entre las piedras, un cartel explica que este fuerte formaba parte de la **línea de fortificaciones** que España levantó frente a Gibraltar en el siglo XVIII.\n\nDe esa «línea» viene el nombre de la ciudad."]);
          } else j.aviso("El Peñón, tan cerca que parece que se toca.");
        },
      }];
    case "estadio":
      return [{
        icono: "balon", titulo: "Ver el entrenamiento de la Balona", sub: "1 hora · +10 ánimo · +10 gente",
        desactivada: horaDelDia(e) < 10 || horaDelDia(e) >= 13 ? "Entrenan de 10:00 a 13:00." : false,
        fn: async () => {
          e.animo = limitar(e.animo + 10);
          e.social = limitar(e.social + 10);
          j.cerrar();
          await j.pasar(60);
          j.aviso("Albinegros hasta la médula. <b>+ánimo +gente</b>");
        },
      }];
    case "estacion":
      return [{ icono: "bus", titulo: "Coger un autobús", sub: "", desactivada: "Las líneas a otros pueblos llegarán en próximas temporadas.", fn: () => {} }];
    case "frontera":
      return [{ icono: "bandera", titulo: "Cruzar a Gibraltar", sub: "", desactivada: "Llegará en la Temporada 3 · La Verja.", fn: () => {} }];
  }
}

/* ── Paneles ─────────────────────────────────────────────────────────── */

function tienda(j: Juego, lugar: LugarId, precios: Partial<Record<ObjetoId, number>>, cierre: string | false, sub = "Comprar"): Accion[] {
  return (Object.entries(precios) as [ObjetoId, number][]).map(([id, precio]) => ({
    icono: bola(id), titulo: OBJETOS[id].nombre, sub: `${sub} · tienes ${cuantos(j.e, id)}`, precio: `${precio} €`,
    desactivada: cierre || (j.e.dinero < precio && "No te llega el dinero."),
    fn: () => {
      j.e.dinero -= precio;
      dar(j.e, id);
      sonido("moneda");
      j.refrescar();
      j.abrirLugar(lugar);
    },
  }));
}

async function comer(j: Juego, precio: number, comida: number, energia: number, social: number, texto: string, animo = 0) {
  const e = j.e;
  e.dinero -= precio;
  e.comida = limitar(e.comida + comida);
  e.energia = limitar(e.energia + energia);
  e.social = limitar(e.social + social);
  e.animo = limitar(e.animo + animo);
  amistad(e, "lola", 1);
  sonido("moneda");
  j.cerrar();
  await j.pasar(20);
  j.aviso(texto);
}

function huerto(j: Juego) {
  const e = j.e;
  const parcelas = e.huerto.map((p, i) => {
    if (!p.cultivo) {
      const semillas = (Object.keys(CULTIVOS) as (keyof typeof CULTIVOS)[]).filter((c) => cuantos(e, CULTIVOS[c].semilla) > 0);
      return h(
        "div", { class: "parcela" },
        h("b", {}, `Bancal ${i + 1} · libre`),
        semillas.length
          ? h("div", { class: "veredictos" }, ...semillas.map((c) =>
              h("button", {
                onclick: async () => {
                  quitar(e, CULTIVOS[c].semilla);
                  e.huerto[i] = { cultivo: c, desde: e.minuto, horas: 0 };
                  sonido("toque");
                  await j.pasar(15, 2);
                  huerto(j);
                },
              }, `Plantar ${OBJETOS[CULTIVOS[c].da].nombre.toLowerCase()}`),
            ))
          : h("small", {}, "Sin semillas. Cómpralas en el Mercado o en el Zabal."),
      );
    }
    const cult = CULTIVOS[p.cultivo];
    const prog = Math.min(1, p.horas / cult.horas);
    if (listo(p)) {
      return h(
        "button", {
          class: "parcela lista",
          onclick: async () => {
            dar(e, cult.da, cult.cantidad);
            e.huerto[i] = { cultivo: null, desde: 0, horas: 0 };
            sonido("bien");
            await j.pasar(10, 2);
            j.aviso(`Cosechas <b>${cult.cantidad} ${OBJETOS[cult.da].plural}</b>`);
            huerto(j);
          },
        },
        h("b", {}, `${OBJETOS[cult.da].nombre}: ¡listo!`), h("small", {}, "Toca para cosechar"),
      );
    }
    const faltan = Math.ceil(cult.horas - p.horas);
    return h(
      "div", { class: "parcela" },
      h("b", {}, OBJETOS[cult.da].nombre), h("small", {}, `Faltan unas ${faltan} h`),
      h("div", { class: "prog" }, h("i", { style: `width:${prog * 100}%` })),
    );
  });
  j.hoja("TU CASA", "El patio", h("p", { class: "desc" }, "Cuatro bancales junto a la higuera. Con poniente, todo crece un 25 % más rápido."), h("div", { class: "huerto" }, ...parcelas));
}

function cocina(j: Juego) {
  const e = j.e;
  j.hoja(
    "TU CASA", "La cocina",
    h("p", { class: "desc" }, "Los cacharros de la abuela, el aceite en la alacena y una radio que solo coge una emisora."),
    h("div", { class: "acciones" }, ...RECETAS.map((r) =>
      j.boton({
        icono: bola(r.da), titulo: OBJETOS[r.da].nombre, sub: `${lista(r.necesita)} · ${r.minutos} min`,
        desactivada: tiene(e, r.necesita) ? false : `Necesitas ${lista(r.necesita)}.`,
        fn: async () => {
          for (const [id, n] of Object.entries(r.necesita) as [ObjetoId, number][]) quitar(e, id, n);
          dar(e, r.da);
          sonido("bien");
          await j.pasar(r.minutos, 3);
          j.aviso(`Has preparado <b>${OBJETOS[r.da].nombre.toLowerCase()}</b>`);
          cocina(j);
        },
      }),
    )),
  );
}

function vender(j: Juego) {
  const e = j.e;
  const vendibles = (Object.keys(e.mochila) as ObjetoId[]).filter((id) => OBJETOS[id].venta > 0);
  j.hoja(
    "MERCADO", "Vender género",
    vendibles.length
      ? h("div", { class: "acciones" }, ...vendibles.map((id) =>
          j.boton({
            icono: bola(id), titulo: OBJETOS[id].nombre, sub: `Tienes ${cuantos(e, id)}`, precio: `${precioVenta(e, id)} €`,
            fn: () => {
              quitar(e, id);
              e.dinero += precioVenta(e, id);
              reputacion(e, "centro", 0.5);
              sonido("moneda");
              j.refrescar();
              vender(j);
            },
          }),
        ))
      : h("p", { class: "vacio" }, "No tienes nada que vender todavía."),
  );
}

export function tablon(j: Juego) {
  const e = j.e;
  j.hoja(
    "CIUDAD", "Tablón de encargos",
    h("p", { class: "desc" }, "Papelitos con chinchetas. Cada mañana aparecen encargos nuevos."),
    h("div", { class: "acciones" }, ...e.pedidos.map((p) => {
      const quien = PERSONAJES[p.de];
      return j.boton({
        icono: bola((Object.keys(p.pide)[0] as ObjetoId)),
        titulo: `${quien.nombre}: ${lista(p.pide)}`,
        sub: `Paga ${p.paga} € · +amistad`,
        precio: `${p.paga} €`,
        desactivada: tiene(e, p.pide) ? false : `Te falta: ${lista(p.pide)}.`,
        fn: () => {
          for (const [id, n] of Object.entries(p.pide) as [ObjetoId, number][]) quitar(e, id, n);
          e.dinero += p.paga;
          amistad(e, p.de, 8);
          reputacion(e, quien.barrio, 4);
          e.pedidos = e.pedidos.filter((x) => x.id !== p.id);
          e.flags.encargos = Number(e.flags.encargos ?? 0) + 1;
          sonido("moneda");
          j.aviso(`Encargo entregado a ${quien.nombre}. <b>+${p.paga} €</b>`);
          j.refrescar();
          tablon(j);
        },
      });
    })),
    e.pedidos.length ? null : h("p", { class: "vacio" }, "No quedan encargos por hoy."),
  );
}
