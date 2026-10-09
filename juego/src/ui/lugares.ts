import type { LugarId } from "../datos/mapa";
import { CULTIVOS, OBJETOS, RECETAS, SALIDAS, TIENDAS, type CultivoId, type ObjetoId, type SalidaId } from "../datos/objetos";
import { PERSONAJES } from "../datos/personajes";
import {
  amistad, cuantos, dar, ganarXP, horaDelDia, limitar, listo, precioPuesto, precioVenta, progresoCultivo, quitar, reputacion, tiene, zarpar,
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
        { icono: "bar", titulo: "La cocina de la abuela", sub: e.cocinaListos.length ? `${e.cocinaListos.length} listos para recoger` : e.cocina.length ? `Cocinando: ${e.cocina.length} en cola` : "Prepara platos con lo que tengas", fn: () => abrirCocina(j) },
        horaDelDia(e) >= 18 || horaDelDia(e) < 2
          ? { icono: "casa", titulo: "Dormir", sub: "Hasta mañana a las 8:00", fn: async () => { j.cerrar(); await j.dormir(); } }
          : { icono: "casa", titulo: "Echar una siesta", sub: "2 horas · +35 energía", desactivada: horaDelDia(e) < 14 ? "La siesta, después de comer (a partir de las 14:00)." : false, fn: async () => { e.energia = limitar(e.energia + 35); j.cerrar(); await j.pasar(120); j.aviso("Siesta de las buenas. <b>+35 energía</b>"); } },
      ];
    case "plaza":
      return [{ icono: "periodico", titulo: "Tablón de encargos", sub: `${e.pedidos.length} encargos de vecinos`, fn: () => tablon(j) }];
    case "mercado":
      return [
        ...tienda(j, "mercado", TIENDAS.mercado, cerrado(j, "mercado")),
        ...(e.flags.puesto ? [{ icono: "mercado" as const, titulo: "Tu puesto 14", sub: e.cajaPuesto ? `${e.cajaPuesto} € para cobrar` : "Pon género a la venta y los clientes lo compran solos", fn: () => abrirPuesto(j) }] : []),
        { icono: "euro", titulo: "Vender a los puestos", sub: "Cobras al momento, pero pagan menos", desactivada: cerrado(j, "mercado"), fn: () => vender(j) },
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
        { icono: "ancla", titulo: "Tu barca", sub: e.barca && !Object.keys(e.barcaBotin).length ? "Faenando en el mar" : Object.keys(e.barcaBotin).length ? "¡Ha vuelto con captura!" : "Amarrada en el muelle: mándala a faenar", fn: () => abrirBarca(j) },
        ...trabajo("pescador", "Echar el día con Antonio", "3 horas · minijuego de pesca · −25 energía", () => faena(j)),
        ...tienda(j, "atunara", TIENDAS.atunara, cerrado(j, "atunara"), "En la lonja"),
      ];
    case "huerta":
      return [
        { icono: "brote", titulo: "Tus bancales", sub: "Los seis de la abuela: planta y cosecha", fn: () => abrirBancal(j, 0) },
        ...trabajo("hortelano", "Jornada con Rafa", "3 horas · minijuego de plagas · −25 energía", () => jornadaHuerta(j)),
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

/* ── Hay Day: bancales, cocina, barca y puesto ──────────────────────── */

const mins = (m: number) => {
  const r = Math.max(0, Math.ceil(m));
  return r >= 60 ? `${Math.floor(r / 60)} h ${String(r % 60).padStart(2, "0")} min` : `${r} min`;
};

const barraProgreso = (p: number) => h("div", { class: "progreso" }, h("i", { style: `width:${Math.round(p * 100)}%` }));

function cosechar(j: Juego, i: number) {
  const e = j.e;
  const b = e.bancales[i];
  if (!b.cultivo || !listo(b)) return;
  const c = CULTIVOS[b.cultivo];
  dar(e, c.da, c.cantidad);
  ganarXP(e, c.cantidad);
  e.bancales[i] = { cultivo: null, crecido: 0 };
  e.energia = limitar(e.energia - 1, true);
  j.mundo.flotante(`+${c.cantidad} ${OBJETOS[c.da].plural}`, j.mundo.posBancal(i));
  sonido("bien");
}

function plantar(j: Juego, i: number, cultivo: CultivoId) {
  const e = j.e;
  if (e.bancales[i].cultivo || !quitar(e, CULTIVOS[cultivo].semilla)) return false;
  e.bancales[i] = { cultivo, crecido: 0 };
  e.energia = limitar(e.energia - 1, true);
  j.mundo.flotante(OBJETOS[CULTIVOS[cultivo].da].nombre, j.mundo.posBancal(i));
  sonido("toque");
  return true;
}

/** Bandeja de los bancales: toca un bancal en el mundo y elige qué plantar. */
export function abrirBancal(j: Juego, inicial: number) {
  const e = j.e;
  let sel = inicial;
  j.mundo.enfocar(j.mundo.posBancal(1).add(j.mundo.posBancal(4)).multiplyScalar(0.5), 230);
  j.bandeja("EL ZABAL", "Bancales de la abuela", () => {
    const b = e.bancales[sel];
    const libres = e.bancales.filter((x) => !x.cultivo).length;
    const maduros = e.bancales.filter(listo).length;
    const fichas = h("div", { class: "fichas" }, ...e.bancales.map((x, i) =>
      h("button", {
        class: `ficha${i === sel ? " activa" : ""}${listo(x) ? " lista" : ""}`,
        onclick: () => {
          sel = i;
          if (listo(e.bancales[i])) cosechar(j, i);
          j.vivo?.();
        },
      }, h("b", {}, `${i + 1}`), h("small", {}, x.cultivo ? (listo(x) ? "¡Listo!" : OBJETOS[CULTIVOS[x.cultivo].da].nombre) : "Libre")),
    ));
    const semillas = (Object.keys(CULTIVOS) as CultivoId[]).map((c) => {
      const cu = CULTIVOS[c];
      const n = cuantos(e, cu.semilla);
      return h("button", {
        class: "semilla", disabled: n === 0,
        onclick: () => {
          if (!plantar(j, sel, c)) return;
          const sig = e.bancales.findIndex((x) => !x.cultivo);
          if (sig >= 0) sel = sig;
          j.vivo?.();
        },
      }, h("span", { class: "bola", style: `background:${OBJETOS[cu.da].color}` }), h("b", {}, OBJETOS[cu.da].nombre), h("small", {}, `${n} semillas · ${mins(cu.minutos)}`));
    });
    let detalle: Node;
    if (!b.cultivo) {
      detalle = h("div", {},
        h("p", { class: "desc" }, `Bancal ${sel + 1} libre. Elige qué plantar${e.viento === "poniente" ? " (con poniente crece un 25 % más rápido)" : ""}:`),
        h("div", { class: "semillas" }, ...semillas),
        semillas.every((s) => (s as HTMLButtonElement).disabled) ? h("p", { class: "vacio" }, "No te quedan semillas. Rafa las vende aquí mismo y también hay en el Mercado.") : null,
      );
    } else if (listo(b)) {
      detalle = h("div", {}, h("p", { class: "desc" }, `${OBJETOS[CULTIVOS[b.cultivo].da].nombre}: listo para cosechar.`), h("button", { class: "boton", onclick: () => { cosechar(j, sel); j.vivo?.(); } }, "Cosechar"));
    } else {
      const c = CULTIVOS[b.cultivo];
      const bonus = e.viento === "poniente" ? 1.25 : 1;
      detalle = h("div", {}, h("p", { class: "desc" }, `${OBJETOS[c.da].nombre} creciendo · faltan ${mins((c.minutos - b.crecido) / bonus)}`), barraProgreso(progresoCultivo(b)));
    }
    return [
      fichas,
      detalle,
      maduros > 1 ? h("button", { class: "boton secundario-claro", onclick: () => { e.bancales.forEach((_, i) => cosechar(j, i)); j.vivo?.(); } }, `Cosechar todo (${maduros})`) : null,
      libres > 1 && !b.cultivo ? h("p", { class: "nota" }, "Truco: al plantar, salta solo al siguiente bancal libre.") : null,
    ];
  });
}

/** La cocina de la abuela: cola de hasta 3 platos, como la panadería de Hay Day. */
export function abrirCocina(j: Juego) {
  const e = j.e;
  j.mundo.enfocar(j.mundo.posDe("cocina"), 260);
  j.bandeja("TU CASA", "La cocina de la abuela", () => {
    const cola = e.cocina.map((f, i) =>
      h("div", { class: "fila-cola" },
        h("span", { class: "bola", style: `background:${OBJETOS[f.receta].color}` }),
        h("div", {}, h("b", {}, OBJETOS[f.receta].nombre), h("small", {}, i === 0 ? `Faltan ${mins(f.faltan)}` : "En espera"), i === 0 ? barraProgreso(1 - f.faltan / f.total) : null),
      ),
    );
    const listos = e.cocinaListos.length
      ? h("button", {
          class: "boton",
          onclick: () => {
            const n = e.cocinaListos.length;
            for (const id of e.cocinaListos) dar(e, id);
            ganarXP(e, n * 2);
            e.cocinaListos = [];
            j.mundo.flotante(`+${n} ${n === 1 ? "plato" : "platos"}`, j.mundo.posDe("cocina"));
            sonido("bien");
            j.vivo?.();
          },
        }, `Recoger ${e.cocinaListos.length} ${e.cocinaListos.length === 1 ? "plato" : "platos"}: ${e.cocinaListos.map((x) => OBJETOS[x].nombre.toLowerCase()).join(", ")}`)
      : null;
    const llena = e.cocina.length >= 3;
    return [
      listos,
      e.cocina.length ? h("div", { class: "seccion-titulo" }, `Al fuego (${e.cocina.length}/3)`) : null,
      ...cola,
      h("div", { class: "seccion-titulo" }, "Recetas"),
      h("div", { class: "acciones" }, ...RECETAS.map((r) =>
        j.boton({
          icono: bola(r.da), titulo: OBJETOS[r.da].nombre, sub: `${lista(r.necesita)} · ${mins(r.minutos)}`,
          desactivada: llena ? "La cola está llena (3 platos)." : tiene(e, r.necesita) ? false : `Necesitas ${lista(r.necesita)}.`,
          fn: () => {
            for (const [id, n] of Object.entries(r.necesita) as [ObjetoId, number][]) quitar(e, id, n);
            e.cocina.push({ receta: r.da, faltan: r.minutos, total: r.minutos });
            sonido("toque");
            j.vivo?.();
          },
        }),
      )),
    ];
  });
}

/** Tu barca en La Atunara: sale a faenar y vuelve con la captura. */
export function abrirBarca(j: Juego) {
  const e = j.e;
  j.mundo.enfocar(j.e.barca && !Object.keys(j.e.barcaBotin).length ? j.mundo.posBarca() : j.mundo.posDe("barca"), 300);
  j.bandeja("LA ATUNARA", "La barca del abuelo", () => {
    if (Object.keys(e.barcaBotin).length) {
      return [
        h("p", { class: "desc" }, `Ha vuelto con: ${lista(e.barcaBotin)}.`),
        h("button", {
          class: "boton",
          onclick: () => {
            for (const [id, n] of Object.entries(e.barcaBotin) as [ObjetoId, number][]) dar(e, id, n);
            ganarXP(e, 5);
            j.mundo.flotante(`+${lista(e.barcaBotin)}`, j.mundo.posDe("barca"));
            e.barcaBotin = {};
            e.barca = null;
            reputacion(e, "atunara", 1);
            sonido("bien");
            j.vivo?.();
          },
        }, "Descargar la captura"),
      ];
    }
    if (e.barca) {
      const s = SALIDAS[e.barca.salida];
      return [
        h("p", { class: "desc" }, `${s.nombre} en curso. Vuelve en ${mins(e.barca.vuelta - e.minuto)}.`),
        barraProgreso(1 - (e.barca.vuelta - e.minuto) / s.minutos),
      ];
    }
    const levante = e.viento === "levanteFuerte";
    return [
      h("p", { class: "desc" }, levante ? "Con levante fuerte no sale ni el más valiente. Hoy la barca se queda amarrada." : "Amarrada en el muelle. Antonio te presta un marinero para que salga."),
      h("div", { class: "acciones" }, ...(Object.keys(SALIDAS) as SalidaId[]).map((id) =>
        j.boton({
          icono: "ancla", titulo: SALIDAS[id].nombre, sub: `${SALIDAS[id].descripcion} · ${mins(SALIDAS[id].minutos)}`,
          desactivada: levante ? "Hoy no se sale: levante fuerte." : false,
          fn: () => {
            zarpar(e, id);
            sonido("toque");
            j.aviso("¡La barca sale a faenar!");
            j.vivo?.();
          },
        }),
      )),
    ];
  });
}

/** Puesto 14: pones cajas a la venta y los clientes compran mientras juegas. */
export function abrirPuesto(j: Juego) {
  const e = j.e;
  let eligiendo: number | null = null;
  j.mundo.enfocar(j.mundo.posDe("puesto"), 230);
  j.bandeja("MERCADO", "Puesto 14", () => {
    if (!e.flags.puesto) return [h("p", { class: "desc" }, "El puesto de la abuela sigue cerrado con su candado.")];
    if (eligiendo !== null) {
      const hueco = eligiendo;
      const vendibles = (Object.keys(e.mochila) as ObjetoId[]).filter((id) => OBJETOS[id].venta > 0 && OBJETOS[id].tipo !== "semilla");
      return [
        h("p", { class: "desc" }, "¿Qué pones en esta caja? (hasta 5 unidades)"),
        vendibles.length
          ? h("div", { class: "acciones" }, ...vendibles.map((id) =>
              j.boton({
                icono: bola(id), titulo: OBJETOS[id].nombre, sub: `Tienes ${cuantos(e, id)} · a ${precioPuesto(id)} € la unidad`,
                fn: () => {
                  const n = Math.min(5, cuantos(e, id));
                  quitar(e, id, n);
                  e.puesto[hueco] = { id, n, precio: precioPuesto(id) };
                  eligiendo = null;
                  sonido("toque");
                  j.vivo?.();
                },
              }),
            ))
          : h("p", { class: "vacio" }, "No tienes nada que vender. Cosecha, pesca o cocina primero."),
        h("button", { class: "boton secundario-claro", onclick: () => { eligiendo = null; j.vivo?.(); } }, "Volver"),
      ];
    }
    return [
      h("p", { class: "desc" }, "Los clientes pasan y compran solos, aunque estés en otra parte. Pagan más que los puestos de al lado."),
      h("div", { class: "fichas cuatro" }, ...e.puesto.map((c, i) =>
        h("button", {
          class: `ficha${c ? " llena" : ""}`,
          onclick: () => {
            if (c) return;
            eligiendo = i;
            j.vivo?.();
          },
        }, c ? h("span", { class: "bola", style: `background:${OBJETOS[c.id].color}` }) : h("b", {}, "+"), h("small", {}, c ? `${c.n} × ${c.precio} €` : "Vacía")),
      )),
      e.cajaPuesto > 0
        ? h("button", {
            class: "boton",
            onclick: () => {
              e.dinero += e.cajaPuesto;
              ganarXP(e, Math.ceil(e.cajaPuesto / 4));
              j.mundo.flotante(`+${e.cajaPuesto} €`, j.mundo.posDe("puesto"));
              e.cajaPuesto = 0;
              sonido("moneda");
              j.refrescar();
              j.vivo?.();
            },
          }, `Cobrar ${e.cajaPuesto} €`)
        : h("p", { class: "nota" }, "La caja está vacía por ahora."),
    ];
  });
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
          ganarXP(e, 8);
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
