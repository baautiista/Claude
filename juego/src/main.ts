import "./estilos.css";
import logo from "./assets/marca/logo.png";
import { cargar, nuevaPartida, type Estado, type Trato } from "./estado";
import { con } from "./red/conexion";
import { intro } from "./historia";
import { Juego } from "./juego";
import { Mundo } from "./mundo/mundo";
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
const enLinea = h("span", { class: "en-linea" }, "Conectando…");
const contarVecinos = () => {
  enLinea.textContent = con.modo === "servidor" ? (con.conectado ? `Servidor · ${con.sala}` : "Reconectando…") : "Sin servidor";
};
con.on("conexion", contarVecinos);

/** Partida del jugador con sesión: la del servidor (con su saldo) o la del dispositivo. */
async function partidaDeCuenta(): Promise<Estado | null> {
  const r = await con.llamar<{ partida: Estado | null; dinero: number }>("cargarPartida").catch(() => null);
  if (!r?.partida) return null;
  r.partida.dinero = r.dinero;
  return r.partida;
}

/** Arranque: modo servidor (cuentas) o local (cuenta automática en este navegador). */
async function arrancar() {
  await con.iniciar();
  contarVecinos();
  if (con.modo === "servidor") {
    const perfil = await con.sesionGuardada();
    if (!perfil) return acceso();
  }
  portada();
}

function acceso(error = "", registro = false) {
  const usuario = h("input", { type: "text", maxlength: 24, placeholder: "Usuario", autocomplete: "username", "aria-label": "Usuario" }) as HTMLInputElement;
  const clave = h("input", { type: "password", maxlength: 128, placeholder: "Contraseña", autocomplete: registro ? "new-password" : "current-password", "aria-label": "Contraseña" }) as HTMLInputElement;
  const aviso = h("p", { class: "error-form", role: "alert" }, error);
  const enviar = async () => {
    aviso.textContent = "";
    try {
      if (registro) await con.registrar(usuario.value, clave.value, usuario.value, ROPAS[0], PIELES[1]);
      else await con.entrar(usuario.value, clave.value);
      sonido("bien");
      portada();
    } catch (e) {
      sonido("mal");
      aviso.textContent = (e as Error).message;
    }
  };
  clave.addEventListener("keydown", (ev) => ev.key === "Enter" && void enviar());
  capa.replaceChildren(
    h("div", { class: "pantalla portada" },
      h("div", { class: "marca" }, h("img", { src: logo, alt: "InfoLinense" }), enLinea),
      h("div", { class: "logo-juego" }, h("span", { class: "sobre" }, "TEMPORADA 1"), h("h1", { html: "Mi <span>Línea</span>" }), h("p", {}, "Tu cuenta guarda tu casa, tu dinero y tus amigos")),
      h("div", { class: "espacio" }),
      h("section", { class: "tarjeta-crear acceso", role: "dialog", "aria-label": registro ? "Crear cuenta" : "Entrar" },
        h("div", { class: "hoja-cabeza" }, h("div", {}, h("span", { class: "etiqueta" }, registro ? "NUEVA CUENTA" : "BIENVENIDO"), h("h2", {}, registro ? "Crea tu cuenta" : "Entra en La Línea"))),
        h("div", { class: "campo" }, h("label", {}, "Usuario"), usuario),
        h("div", { class: "campo" }, h("label", {}, "Contraseña"), clave),
        aviso,
        h("button", { class: "boton", onclick: () => void enviar() }, registro ? "Crear cuenta" : "Entrar"),
        h("button", { class: "boton secundario", onclick: () => acceso("", !registro) }, registro ? "Ya tengo cuenta" : "Crear una cuenta nueva"),
      ),
    ),
  );
  usuario.focus();
}

async function portada() {
  const guardada = con.modo === "servidor" ? await partidaDeCuenta() : cargar();
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
        guardada ? h("button", { class: "boton", onclick: () => { sonido("bien"); void jugar(guardada); } }, `Continuar · Día ${guardada.dia}`) : null,
        h("button", { class: `boton${guardada ? " secundario" : ""}`, onclick: () => { sonido("toque"); crear(); } }, guardada ? "Nueva partida" : "Jugar"),
        con.perfil && con.modo === "servidor"
          ? h("button", { class: "enlace", onclick: async () => { await con.salir(); acceso(); } }, `Conectado como ${con.perfil.usuario} · cambiar de cuenta`)
          : null,
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
    onclick: async () => {
      const n = nombre.value.trim() || (trato === "a" ? "Lucía" : "Álex");
      const e = nuevaPartida(n, trato, piel, ropa);
      if (con.modo === "servidor") {
        // El aspecto queda en la cuenta; el dinero es el de la cuenta.
        await con.llamar("aspecto", { nombre: n, ropa, piel }).catch(() => {});
        e.dinero = con.perfil?.dinero ?? e.dinero;
      }
      void jugar(e, true);
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

async function jugar(e: Estado, nueva = false) {
  // Sin servidor: cuenta local automática (respeta el dinero de partidas anteriores).
  if (con.modo === "local") {
    const p = await con.cuentaLocal(e.nombre, e.ropa, e.piel, nueva ? undefined : e.dinero);
    e.dinero = p.dinero;
  }
  e.xp = Math.max(e.xp ?? 0, con.perfil?.xp ?? 0);
  const j = new Juego(e, app, { mundo, canvas, rotulos });
  j.guardarTodo(true);
  if (nueva) await intro(j);
}

window.addEventListener("mi-linea:portada", () => location.reload());
if (new URLSearchParams(location.search).has("comparar")) {
  // Comparación de interiores por gama (sin partida).
  void import("./interior/comparar").then(({ iniciarComparacion }) => iniciarComparacion(app));
} else if (new URLSearchParams(location.search).has("revisar")) {
  // Revisión de un edificio (panel de reconstrucción): misma cámara que el enlace a Google Earth.
  const q = new URLSearchParams(location.search);
  const [x, y] = (q.get("revisar") ?? "").split(",").map(Number);
  const [mx, my] = (q.get("mira") ?? `${x},${y - 10}`).split(",").map(Number);
  const ir = (a: number, b: number, c: number, d: number) => mundo.revisar(a, b, c, d);
  ir(x, y, mx, my);
  (globalThis as unknown as { __revisar: typeof ir }).__revisar = ir;
  (globalThis as unknown as { __aerea: (x: number, y: number, d?: number) => void }).__aerea = (a, b, d) => mundo.vistaAerea(a, b, d);
  (globalThis as unknown as { __exportarCalles: () => unknown }).__exportarCalles = () => mundo.exportarCalles();
  const rotulo = document.createElement("div");
  rotulo.className = "rotulo-revision";
  rotulo.textContent = q.get("etiqueta") || "Revisión";
  rotulo.style.cssText = "position:fixed;left:12px;top:12px;z-index:50;padding:6px 10px;border-radius:8px;background:#1F5EFF;color:#fff;font:600 13px Poppins,system-ui,sans-serif";
  app.append(rotulo);
} else if (new URLSearchParams(location.search).has("editor")) {
  // Editor de ciudad: revisión de los sectores generados, sin portada ni partida.
  void import("./editor/editor").then(({ iniciarEditor }) => iniciarEditor(mundo, app));
} else void arrancar();
