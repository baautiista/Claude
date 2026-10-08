import logo from "../assets/marca/logo.png";
import { FEED_URL, WEB_URL } from "../config";
import { VIENTOS, type Noticia } from "../estado";
import { iconoSvg } from "../iconos";
import type { Juego } from "../juego";
import { h, html } from "./dom";
import { listaObjetos } from "./lugares";
import { PERSONAJES } from "../datos/personajes";

/**
 * El móvil del personaje con la web de InfoLinense: mismas secciones, mismos
 * colores. Portada (edición del juego), tiempo, encargos, tus noticias y, si
 * hay feed configurado, las últimas noticias reales.
 */

type Pestana = "portada" | "tiempo" | "encargos" | "tuyas" | "real";

export function abrirMovil(j: Juego, pestana: Pestana = "portada") {
  const e = j.e;
  e.noticiasVistas = e.noticias.length;
  const pestanas: [Pestana, string][] = [
    ["portada", "Portada"],
    ["tiempo", "El tiempo"],
    ["encargos", "Encargos"],
    ["tuyas", "Tus noticias"],
    ...(FEED_URL ? ([["real", "En infolinense"]] as [Pestana, string][]) : []),
  ];
  const cuerpo = h("div", { class: "web-cuerpo" });
  const nav = h("div", { class: "web-nav", role: "tablist" }, ...pestanas.map(([id, t]) =>
    h("button", { role: "tab", "aria-selected": String(id === pestana), onclick: () => abrirMovil(j, id) }, t),
  ));
  const pantalla = h(
    "div", { class: "movil", role: "dialog", "aria-label": "InfoLinense" },
    h(
      "div", { class: "web-cabecera" },
      h("div", { class: "fila" },
        h("img", { src: logo, alt: "InfoLinense" }),
        h("button", { class: "cerrar", "aria-label": "Cerrar", onclick: () => j.cerrar() }, html(iconoSvg("cerrar", 18))),
      ),
      nav,
    ),
    cuerpo,
  );
  j.pantalla(pantalla);

  const articulo = (n: Noticia, destacado = false) =>
    h(
      "article", { class: `articulo${destacado ? " destacado" : ""}` },
      h("div", { class: "meta" }, h("span", { class: `etiqueta${destacado ? " lima" : ""}` }, n.seccion), `Día ${n.dia}${n.tuya ? " · Firmada por ti" : ""}`),
      h("h3", {}, n.titular),
      h("p", {}, n.entradilla),
    );

  switch (pestana) {
    case "portada": {
      const lista = [...e.noticias].reverse();
      cuerpo.append(
        h("p", { class: "web-aviso" }, "Edición de Mi Línea: noticias de la ciudad del juego."),
        ...lista.map((n, i) => articulo(n, i === 0)),
      );
      if (WEB_URL) cuerpo.append(h("a", { class: "boton azul", href: WEB_URL, target: "_blank", rel: "noopener" }, "Leer InfoLinense de verdad"));
      break;
    }
    case "tiempo":
      cuerpo.append(
        h("div", { class: "tiempo" },
          h("span", { class: "etiqueta lima" }, "HOY"),
          h("div", { class: "dato" }, VIENTOS[e.viento].nombre),
          h("p", {}, VIENTOS[e.viento].efecto),
        ),
        h("div", { class: "articulo" },
          h("div", { class: "meta" }, h("span", { class: "etiqueta" }, "MAÑANA")),
          h("h3", {}, VIENTOS[e.vientoManana].nombre),
          h("p", {}, VIENTOS[e.vientoManana].efecto),
        ),
        h("div", { class: "articulo" },
          h("div", { class: "meta" }, h("span", { class: "etiqueta" }, "CURIOSIDADES")),
          h("h3", {}, "Levante y poniente"),
          h("p", {}, "En el Estrecho manda el viento. El levante sopla del este, seco y racheado, y deja la famosa nube sobre el Peñón. El poniente llega del Atlántico, más fresco y húmedo."),
        ),
      );
      break;
    case "encargos":
      cuerpo.append(
        h("p", { class: "web-aviso" }, "Clasificados: se entregan en el tablón de la Plaza de la Iglesia."),
        ...e.pedidos.map((p) =>
          h("div", { class: "articulo" },
            h("div", { class: "meta" }, h("span", { class: "etiqueta" }, "SE BUSCA"), PERSONAJES[p.de].nombre),
            h("h3", {}, listaObjetos(p.pide)),
            h("p", {}, `Pago: ${p.paga} €`),
          ),
        ),
      );
      if (!e.pedidos.length) cuerpo.append(h("p", { class: "vacio" }, "No quedan encargos hoy."));
      break;
    case "tuyas": {
      const tuyas = e.noticias.filter((n) => n.tuya).reverse();
      cuerpo.append(...(tuyas.length ? tuyas.map((n) => articulo(n)) : [h("p", { class: "vacio" }, "Todavía no has firmado ninguna noticia.")]));
      break;
    }
    case "real":
      cuerpo.append(h("p", { class: "vacio" }, "Cargando…"));
      leerFeed().then(
        (items) => cuerpo.replaceChildren(...items.map((it) =>
          h("a", { class: "articulo", href: it.enlace, target: "_blank", rel: "noopener" },
            h("div", { class: "meta" }, h("span", { class: "etiqueta" }, "INFOLINENSE"), it.fecha),
            h("h3", {}, it.titular),
          ),
        )),
        () => cuerpo.replaceChildren(h("p", { class: "vacio" }, "No se han podido cargar las noticias. Comprueba la conexión.")),
      );
      break;
  }
  j.refrescar();
}

async function leerFeed() {
  const r = await fetch(FEED_URL);
  const xml = new DOMParser().parseFromString(await r.text(), "text/xml");
  return [...xml.querySelectorAll("item")].slice(0, 15).map((it) => ({
    titular: it.querySelector("title")?.textContent ?? "",
    enlace: it.querySelector("link")?.textContent ?? "#",
    fecha: new Date(it.querySelector("pubDate")?.textContent ?? "").toLocaleDateString("es-ES"),
  }));
}
