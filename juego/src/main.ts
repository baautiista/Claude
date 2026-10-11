import "./estilos.css";
import logo from "./assets/marca/logo.png";
import { cargar, nuevaPartida, type Trato } from "./estado";
import { intro } from "./historia";
import { Juego } from "./juego";
import { Mundo } from "./mundo/mundo";
import { red } from "./red";
import { h } from "./ui/dom";
import { retrato } from "./ui/retrato";
import { sonido } from "./ui/sonido";

const app = document.getElementById("app")!;

const PIELES = ["#F3D3B8", "#E8B796", "#C98E66", "#9A6644", "#6B4430"];
const ROPAS = ["#C4E910", "#FF1254", "#FFFFFF", "#0A0A0A", "#FF9F1C"];

// La ciudad en 3D gira de fondo en la portada y es la misma que luego se juega.
const canvas = h("canvas", { id: "mapa", "aria-label": "La Línea en 3D" });
const rotulos = h("div", { class: "capa3d" });
const capa = h("div");
app.replaceChildren(canvas, rotulos, capa);
const mundo = new Mundo(canvas as HTMLCanvasElement, rotulos);
mundo.modoDemo = true;
mundo.volarA(720);
void red.iniciar().then(() => contarVecinos());

const enLinea = h("span", { class: "en-linea" }, "Conectando…");
function contarVecinos() {
  const n = red.conectados;
  enLinea.textContent = red.modo === "solo" ? "Un jugador" : n ? `${n + 1} jugando ahora` : "En línea";
}
red.onCambio = contarVecinos;

function portada() {
  const guardada = cargar();
  capa.replaceChildren(
    h(
      "div", { class: "pantalla portada" },
      h("div", { class: "marca" }, h("img", { src: logo, alt: "InfoLinense" }), enLinea),
      h(
        "div", { class: "logo-juego" },
        h("span", { class: "sobre" }, "TEMPORADA 1"),
        h("h1", { html: "Mi <span>Línea</span>" }),
        h("p", {}, "Vive, trabaja y juega en La Línea de la Concepción"),
      ),
      h("div", { class: "espacio" }),
      h(
        "div", { class: "botones" },
        guardada ? h("button", { class: "boton", onclick: () => { sonido("bien"); jugar(guardada); } }, `Continuar · Día ${guardada.dia}`) : null,
        h("button", { class: `boton${guardada ? " secundario" : ""}`, onclick: () => { sonido("toque"); crear(); } }, guardada ? "Nueva partida" : "Jugar"),
      ),
      h("p", { class: "pie" }, "Un juego de InfoLinense · Mapa © colaboradores de OpenStreetMap"),
    ),
  );
}

function crear() {
  let trato: Trato = "a";
  let piel = PIELES[1];
  let ropa = ROPAS[0];
  const nombre = h("input", { type: "text", maxlength: 16, placeholder: "Tu nombre", autocomplete: "off", "aria-label": "Nombre" }) as HTMLInputElement;
  const vista = h("div", { class: "vista" });
  const pintar = () => (vista.innerHTML = retrato({ piel, pelo: "#2B1B12", ropa }, "#1F5EFF"));
  const grupo = <T,>(valores: readonly T[], actual: T, etiqueta: (v: T) => HTMLElement, fijar: (v: T) => void) => {
    const botones = valores.map((v) => {
      const b = etiqueta(v);
      b.setAttribute("aria-pressed", String(v === actual));
      b.addEventListener("click", () => {
        fijar(v);
        botones.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        pintar();
        sonido("toque");
      });
      return b;
    });
    return h("div", { class: "elecciones" }, ...botones);
  };
  pintar();
  const empezar = h("button", {
    class: "boton",
    onclick: () => {
      const n = nombre.value.trim() || (trato === "a" ? "Lucía" : "Álex");
      const e = nuevaPartida(n, trato, piel, ropa);
      jugar(e, true);
    },
  }, "Coger el autobús a La Línea");
  capa.replaceChildren(
    h(
      "div", { class: "pantalla portada" },
      h("div", { class: "marca" }, h("img", { src: logo, alt: "InfoLinense" }), enLinea),
      h(
        "section", { class: "tarjeta-crear", role: "dialog", "aria-label": "Tu personaje" },
        h("div", { class: "hoja-cabeza" },
          h("div", {}, h("span", { class: "etiqueta" }, "TU PERSONAJE"), h("h2", {}, "¿Quién vuelve a La Línea?")),
          h("button", { class: "cerrar", "aria-label": "Volver", onclick: () => portada(), html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' }),
        ),
        vista,
        h("div", { class: "campo" }, h("label", {}, "Nombre"), nombre),
        h("div", { class: "campo" }, h("label", {}, "Cómo te tratan"),
          grupo<Trato>(["a", "o"], trato, (v) => h("button", { class: "eleccion" }, v === "a" ? "La nieta de Concha" : "El nieto de Concha"), (v) => (trato = v)),
        ),
        h("div", { class: "campo" }, h("label", {}, "Piel"),
          grupo(PIELES, piel, (v) => h("button", { class: "muestra", style: `background:${v}`, "aria-label": "Tono de piel" }), (v) => (piel = v)),
        ),
        h("div", { class: "campo" }, h("label", {}, "Camiseta"),
          grupo(ROPAS, ropa, (v) => h("button", { class: "muestra", style: `background:${v}`, "aria-label": "Color de camiseta" }), (v) => (ropa = v)),
        ),
        empezar,
      ),
    ),
  );
}

async function jugar(e: ReturnType<typeof nuevaPartida>, nueva = false) {
  const j = new Juego(e, app, { mundo, canvas, rotulos });
  if (nueva) await intro(j);
}

window.addEventListener("mi-linea:portada", () => location.reload());
portada();
