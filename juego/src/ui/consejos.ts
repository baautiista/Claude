import type { Juego } from "../juego";
import { h } from "./dom";

/**
 * Primeros pasos: consejos cortos que aparecen una sola vez, cuando hacen falta,
 * señalando el elemento de la pantalla del que hablan. Nada de pantallas de texto:
 * una frase, un dedo y «Entendido». Se pueden desactivar todos de una vez.
 */

interface Consejo {
  id: string;
  texto: string;
  /** Elemento al que apunta (si no hay, el consejo sale centrado). */
  ancla?: string;
  cuando: (j: Juego) => boolean;
}

const CONSEJOS: Consejo[] = [
  { id: "mapa", texto: "Arrastra para mover la ciudad. Pellizca o usa la rueda para acercarte.", cuando: (j) => j.e.paso === 0 },
  { id: "objetivo", texto: "Este es tu objetivo. Tócalo y vas directamente.", ancla: ".objetivo", cuando: (j) => j.e.paso <= 1 && !!j.e.flags.consejo_mapa },
  { id: "lugares", texto: "Toca un edificio o un vecino para ver qué puedes hacer allí.", cuando: (j) => j.e.paso === 1 },
  { id: "bus", texto: "El autobús te lleva a cualquier barrio en un momento.", ancla: ".dock .principal", cuando: (j) => j.e.paso >= 2 },
  { id: "necesidades", texto: "Energía, comida, ánimo y gente. Si bajan, rindes menos: come, descansa o charla con tus vecinos.", ancla: ".necesidades", cuando: (j) => Math.min(j.e.energia, j.e.comida, j.e.animo, j.e.social) < 45 },
  { id: "mochila", texto: "Lo que cosechas, pescas o compras va a la mochila.", ancla: ".dock button[aria-label='Mochila']", cuando: (j) => j.e.paso >= 4 },
  { id: "hogar", texto: "Tu casa: decórala, refórmala e invita a tus vecinos.", ancla: ".dock button[aria-label='Hogar']", cuando: (j) => j.e.paso >= 10 },
  { id: "mas", texto: "En «Más» están el diario, InfoLinense, tus vecinos y los ajustes.", ancla: ".dock button[aria-label='Más opciones']", cuando: (j) => j.e.paso >= 6 },
];

let abierto: HTMLElement | null = null;

/** Muestra el siguiente consejo pendiente, si toca y la pantalla está libre. */
export function revisarConsejos(j: Juego) {
  const e = j.e;
  if (abierto || e.flags.consejosNo || j.ocupado || j.mundo.enBus || j.mundo.andando) return;
  const c = CONSEJOS.find((k) => !e.flags[`consejo_${k.id}`] && k.cuando(j));
  if (!c) return;
  const ancla = c.ancla ? document.querySelector<HTMLElement>(c.ancla) : null;
  if (c.ancla && (!ancla || !ancla.offsetParent)) return;
  mostrar(j, c, ancla);
}

function mostrar(j: Juego, c: Consejo, ancla: HTMLElement | null) {
  const cerrar = (todos = false) => {
    j.e.flags[`consejo_${c.id}`] = true;
    if (todos) j.e.flags.consejosNo = true;
    burbuja.remove();
    ancla?.classList.remove("consejo-foco");
    abierto = null;
  };
  const burbuja = h(
    "div", { class: `consejo${ancla ? "" : " centrado"}`, role: "status" },
    h("p", {}, c.texto),
    h("div", { class: "consejo-botones" },
      h("button", { class: "enlace", onclick: () => cerrar(true) }, "No mostrar más"),
      h("button", { class: "boton consejo-ok", onclick: () => cerrar() }, "Entendido"),
    ),
  );
  document.getElementById("app")!.append(burbuja);
  abierto = burbuja;
  if (ancla) {
    ancla.classList.add("consejo-foco");
    colocar(burbuja, ancla);
  }
  // Si la pantalla se ocupa (diálogo, hoja), el consejo se retira sin darse por visto.
  const vigilar = setInterval(() => {
    if (!burbuja.isConnected) return clearInterval(vigilar);
    if (j.ocupado || j.mundo.enBus) {
      burbuja.remove();
      ancla?.classList.remove("consejo-foco");
      abierto = null;
      clearInterval(vigilar);
    } else if (ancla) colocar(burbuja, ancla);
  }, 400);
}

/** Encima del elemento si está en la mitad de abajo; debajo, si está arriba. */
function colocar(b: HTMLElement, ancla: HTMLElement) {
  const r = ancla.getBoundingClientRect();
  const ancho = Math.min(300, innerWidth - 32);
  const x = Math.max(16, Math.min(innerWidth - ancho - 16, r.left + r.width / 2 - ancho / 2));
  b.style.width = `${ancho}px`;
  b.style.left = `${x}px`;
  b.style.setProperty("--flecha", `${Math.round(r.left + r.width / 2 - x)}px`);
  if (r.top > innerHeight / 2) {
    b.classList.add("arriba");
    b.style.top = "";
    b.style.bottom = `${Math.round(innerHeight - r.top + 14)}px`;
  } else {
    b.classList.remove("arriba");
    b.style.bottom = "";
    b.style.top = `${Math.round(r.bottom + 14)}px`;
  }
}
