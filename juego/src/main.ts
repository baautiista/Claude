import "./estilos.css";
import logo from "./assets/marca/logo.png";
import { cargar, nuevaPartida, type Trato } from "./estado";
import { intro } from "./historia";
import { Juego } from "./juego";
import { h, html } from "./ui/dom";
import { retrato } from "./ui/retrato";
import { sonido } from "./ui/sonido";

const app = document.getElementById("app")!;

const PIELES = ["#F3D3B8", "#E8B796", "#C98E66", "#9A6644", "#6B4430"];
const ROPAS = ["#C4E910", "#FF1254", "#FFFFFF", "#0A0A0A", "#FF9F1C"];

const PENON_SVG = `<svg class="portada-penon" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 160V140c40-6 70-30 110-70 30-30 52-46 80-40 26 6 46 34 70 60 24 26 60 44 140 50v20z" fill="#fff"/></svg>`;

function portada() {
  const guardada = cargar();
  app.replaceChildren(
    h(
      "div", { class: "pantalla" },
      html(PENON_SVG),
      h("img", { src: logo, alt: "InfoLinense", style: "height:34px;align-self:flex-start" }),
      h("div", { class: "espacio" }),
      h("span", { class: "etiqueta lima", style: "align-self:flex-start" }, "TEMPORADA 1 · LA VUELTA"),
      h("h1", { style: "font-size:64px;margin-top:12px" }, "Mi Línea"),
      h("p", { style: "margin:12px 0 28px;font-size:17px" }, "La Línea en 3D: hereda la casa de tu abuela, cultiva en El Zabal, sal a faenar desde La Atunara y descubre la historia que guardaba en una caja de lata."),
      guardada
        ? h("button", { class: "boton", onclick: () => jugar(guardada) }, `Continuar · Día ${guardada.dia}`)
        : null,
      h("button", { class: `boton${guardada ? " secundario" : ""}`, onclick: () => crear() }, guardada ? "Nueva partida" : "Empezar"),
      h("div", { class: "espacio", style: "flex:0.6" }),
    ),
  );
}

function crear() {
  let trato: Trato = "a";
  let piel = PIELES[1];
  let ropa = ROPAS[0];
  const nombre = h("input", { type: "text", maxlength: 16, placeholder: "Tu nombre", autocomplete: "off", "aria-label": "Nombre" }) as HTMLInputElement;
  const vista = h("div", { style: "width:96px;height:96px;border-radius:50%;overflow:hidden;align-self:center;border:4px solid #fff" });
  const pintar = () => (vista.innerHTML = retrato({ piel, pelo: "#2B1B12", ropa }, "#061E5C"));
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
  app.replaceChildren(
    h(
      "div", { class: "pantalla" },
      h("span", { class: "etiqueta lima", style: "align-self:flex-start" }, "TU PERSONAJE"),
      h("h2", { style: "margin-top:10px" }, "¿Quién vuelve a La Línea?"),
      h("div", { style: "height:14px" }),
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
      h("div", { class: "espacio", style: "min-height:24px" }),
      empezar,
      h("button", { class: "boton secundario", onclick: () => portada() }, "Volver"),
    ),
  );
}

async function jugar(e: ReturnType<typeof nuevaPartida>, nueva = false) {
  const j = new Juego(e, app);
  if (nueva) await intro(j);
}

window.addEventListener("mi-linea:portada", () => portada());
portada();
