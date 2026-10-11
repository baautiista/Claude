import { OBJETOS, type ObjetoId } from "../datos/objetos";
import { cuantos, dar, quitar } from "../estado";
import type { Juego } from "../juego";
import { EMOTES, red, type Oferta } from "../red";
import { iconoJuego } from "../iconos";
import { h, html } from "./dom";
import { retrato } from "./retrato";
import { sonido } from "./sonido";

/** Vecinos: quién juega ahora, ranking de la ciudad y mercadillo entre jugadores. */
type Pestana = "ahora" | "ranking" | "mercadillo";

const NOMBRE_SALUDO: Record<(typeof EMOTES)[number], string> = {
  hola: "¡Hola!", risa: "Risas", bien: "¡Bien!", corazon: "Cariño", pez: "A pescar", tomate: "De la huerta", balon: "¡Aúpa Balona!", sol: "Buen día",
};

export function abrirVecinos(j: Juego, inicial: Pestana = "ahora") {
  let pestana = inicial;
  const cuerpo = h("div");
  const pestanas = h("div", { class: "pestanas", role: "tablist" });
  const pintarPestanas = () =>
    pestanas.replaceChildren(...([["ahora", "Ahora"], ["ranking", "Ranking"], ["mercadillo", "Mercadillo"]] as const).map(([id, t]) =>
      h("button", { role: "tab", "aria-selected": String(pestana === id), onclick: () => { pestana = id; sonido("toque"); pintar(); } }, t)));
  const pintar = () => {
    pintarPestanas();
    if (pestana === "ahora") ahora(j, cuerpo);
    else if (pestana === "ranking") void ranking(cuerpo);
    else void mercadillo(j, cuerpo);
  };
  j.hoja("MULTIJUGADOR", "Vecinos", estadoRed(), pestanas, cuerpo);
  pintar();
}

function estadoRed() {
  const n = red.conectados;
  const texto = red.modo === "sala" ? `${n ? `${n} ${n === 1 ? "vecino" : "vecinos"} jugando ahora` : "Nadie más jugando ahora mismo"} · en línea`
    : red.modo === "local" ? `${n} en otras pestañas · modo local`
    : "Sin conexión: juegas solo";
  return h("div", { class: `estado-red${red.modo === "solo" ? " solo" : ""}` }, h("i"), texto);
}

function ahora(j: Juego, cuerpo: HTMLElement) {
  const lista = red.lista();
  cuerpo.replaceChildren(
    h("div", { class: "seccion-titulo" }, "Saluda a quien esté cerca"),
    h("div", { class: "emotes" }, ...EMOTES.map((e) => h("button", { "aria-label": `Saludar: ${NOMBRE_SALUDO[e]}`, title: NOMBRE_SALUDO[e], onclick: () => { sonido("bien"); j.saludar(e); j.cerrar(); }, html: iconoJuego(e, 30) }))),
    h("div", { class: "seccion-titulo" }, "En la ciudad"),
    lista.length
      ? h("div", { class: "acciones" }, ...lista.map((v) => {
          const ico = h("span", { class: "ico", html: retrato({ piel: v.piel, pelo: "#2B1B12", ropa: v.ropa }, "#FF1254") });
          const b = h("button", { class: "accion", onclick: () => { j.cerrar(); j.mundo.mirarA(v.x, v.y); } },
            ico, h("span", {}, h("b", {}, v.nombre), h("small", {}, `Nivel ${v.nivel} · toca para verlo en el mapa`)));
          return b;
        }))
      : h("p", { class: "vacio" }, red.modo === "solo"
          ? "Abre el juego desde su enlace de InfoLinense para ver a otros jugadores paseando por La Línea."
          : "Cuando otros vecinos entren, los verás andando por el mapa con su nombre en rosa."),
  );
}

async function ranking(cuerpo: HTMLElement) {
  cuerpo.replaceChildren(h("p", { class: "vacio" }, "Cargando…"));
  const filas = await red.ranking();
  cuerpo.replaceChildren(
    h("div", { class: "seccion-titulo" }, "Los linenses con más experiencia"),
    filas.length
      ? h("div", {}, ...filas.map((f, i) =>
          h("div", { class: `fila-ranking${f.yo ? " yo" : ""}` },
            h("span", { class: "pos" }, i + 1),
            h("span", {}, h("b", {}, f.nombre + (f.yo ? " (tú)" : "")), h("small", {}, ` · Nv ${f.nivel} · día ${f.dia}`)),
            h("span", { class: "xpt" }, `${f.xp} XP`))))
      : h("p", { class: "vacio" }, red.hayDb ? "Aún no hay nadie en el ranking. Juega un minuto y aparecerás." : "El ranking necesita conexión con InfoLinense."),
  );
}

async function mercadillo(j: Juego, cuerpo: HTMLElement) {
  if (!red.hayDb) {
    cuerpo.replaceChildren(h("p", { class: "vacio" }, "El mercadillo entre vecinos necesita conexión con InfoLinense."));
    return;
  }
  cuerpo.replaceChildren(h("p", { class: "vacio" }, "Cargando…"));
  const ofertas = await red.ofertas();
  const recargar = () => void mercadillo(j, cuerpo);
  const valida = (o: Oferta) => o.objeto in OBJETOS;
  const ajenas = ofertas.filter((o) => !o.mia && !o.vendida && valida(o));
  const mias = ofertas.filter((o) => o.mia && valida(o));

  const fila = (o: Oferta, accion: HTMLElement | null) => {
    const ob = OBJETOS[o.objeto as ObjetoId];
    return h("div", { class: "accion" },
      h("span", { class: "ico", style: `background:${ob.color}` }),
      h("span", {}, h("b", {}, `${o.cantidad} × ${o.cantidad === 1 ? ob.nombre : ob.plural}`), h("small", {}, o.mia ? (o.vendida ? "¡Vendido! Recoge el dinero" : "En venta") : `Vende ${o.apodo}`)),
      accion);
  };

  const comprar = (o: Oferta) => h("button", {
    class: "precio", disabled: j.e.dinero < o.precio,
    onclick: async () => {
      try {
        await red.comprar(o);
        j.e.dinero -= o.precio;
        dar(j.e, o.objeto as ObjetoId, o.cantidad);
        sonido("bien");
        j.aviso(`Comprado: <b>${o.cantidad} ${OBJETOS[o.objeto as ObjetoId].plural}</b>`);
        j.refrescar();
      } catch {
        sonido("mal");
        j.aviso("Alguien se te ha adelantado.");
      }
      recargar();
    },
  }, `${o.precio} €`);

  const retirar = (o: Oferta) => h("button", {
    class: "precio",
    onclick: async () => {
      try {
        await red.retirar(o);
        if (o.vendida) {
          j.e.dinero += o.precio;
          j.aviso(`Cobras <b>${o.precio} €</b> del mercadillo`);
        } else dar(j.e, o.objeto as ObjetoId, o.cantidad);
        sonido("bien");
        j.refrescar();
      } catch {
        sonido("mal");
      }
      recargar();
    },
  }, o.vendida ? `Cobrar ${o.precio} €` : "Retirar");

  // Poner algo a la venta.
  const propios = (Object.keys(j.e.mochila) as ObjetoId[]).filter((id) => cuantos(j.e, id) > 0);
  const sel = h("select", { "aria-label": "Qué vendes" }, ...propios.map((id) => h("option", { value: id }, `${OBJETOS[id].nombre} (${cuantos(j.e, id)})`))) as HTMLSelectElement;
  const cant = h("input", { type: "number", min: 1, max: 20, value: 1, "aria-label": "Cantidad" }) as HTMLInputElement;
  const precio = h("input", { type: "number", min: 1, max: 500, value: 5, "aria-label": "Precio en euros" }) as HTMLInputElement;
  const vender = h("button", {
    class: "boton azul",
    disabled: !propios.length,
    onclick: async () => {
      const id = sel.value as ObjetoId;
      const n = Math.max(1, Math.min(cuantos(j.e, id), Math.round(Number(cant.value) || 1)));
      const p = Math.max(1, Math.min(500, Math.round(Number(precio.value) || 1)));
      if (!quitar(j.e, id, n)) return;
      try {
        await red.publicarOferta(j.e.nombre, id, n, p);
        sonido("bien");
        j.aviso(`En el mercadillo: <b>${n} ${OBJETOS[id].plural}</b> por ${p} €`);
      } catch {
        dar(j.e, id, n);
        sonido("mal");
        j.aviso("No se ha podido publicar. Prueba otra vez.");
      }
      j.refrescar();
      recargar();
    },
  }, "Poner a la venta");

  cuerpo.replaceChildren(...[
    h("p", { class: "desc" }, "Compra y vende cosechas, pescado y platos a otros jugadores. Cuando alguien compre lo tuyo, vuelve aquí a cobrar."),
    h("div", { class: "seccion-titulo" }, "En venta ahora"),
    ajenas.length ? h("div", { class: "acciones" }, ...ajenas.map((o) => fila(o, comprar(o)))) : h("p", { class: "vacio" }, "No hay nada a la venta. ¡Sé el primero!"),
    mias.length ? h("div", { class: "seccion-titulo" }, "Tus puestos") : null,
    mias.length ? h("div", { class: "acciones" }, ...mias.map((o) => fila(o, retirar(o)))) : null,
    h("div", { class: "seccion-titulo" }, "Vender"),
    propios.length ? h("div", { class: "vender" }, sel, cant, precio) : h("p", { class: "vacio" }, "Tu mochila está vacía."),
    propios.length ? vender : null,
    html('<p class="nota">Lo que se publica aquí lo ven todos los jugadores.</p>'),
  ].filter((n): n is HTMLElement => n !== null));
}
