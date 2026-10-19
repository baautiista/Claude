import * as THREE from "three";
import { MUEBLES } from "../compartido/hogar/catalogo";
import type { Unidad } from "../compartido/hogar/hogar";
import { habitacionEn } from "../compartido/hogar/plano";
import { limitar } from "../estado";
import { iconoSvg } from "../iconos";
import type { Juego } from "../juego";
import { con } from "../red/conexion";
import { esc, h, html } from "../ui/dom";
import { abrirCocina } from "../ui/lugares";
import { abrirMochila } from "../ui/paneles";
import { sonido } from "../ui/sonido";
import { abrirVecinos } from "../ui/vecinos";
import { abrirConstruccion } from "./construir";
import { EscenaInterior, type InteriorPublico, type Toque } from "./escena";
import { abrirReformas } from "./reformas";

export type Rol = "titular" | "conviviente" | "ayudante" | "invitado" | "visita";

const NOMBRE_ROL: Record<Rol, string> = { titular: "Tu casa", conviviente: "Convives aquí", ayudante: "Ayudas a reformar", invitado: "De visita", visita: "Visitando para comprar" };

/**
 * Una vivienda abierta: conecta la escena 3D con el servidor (cada cambio se
 * guarda al momento en la autoridad y llega en directo a quien esté dentro),
 * con la partida (necesidades, dinero, XP) y con la interfaz.
 */
/**
 * Tareas de la casa de cada día: se hacen con los muebles de verdad (la cama, el fregadero, las
 * macetas, la ducha) o desde la lista (barrer, sacar la basura). Terminar la casa da ánimo.
 */
interface TareaCasa {
  id: string;
  nombre: string;
  pista: string;
  /** Tipos de mueble con los que se hace (vacío: botón en la lista). */
  tipos: string[];
  minutos: number;
  premio: { animo?: number; energia?: number };
}
const TAREAS_CASA: TareaCasa[] = [
  { id: "cama", nombre: "Hacer la cama", pista: "Toca tu cama (de 6:00 a 14:00)", tipos: ["camaDoble", "camaIndividual", "camaTapizada"], minutos: 5, premio: { animo: 3 } },
  { id: "ducha", nombre: "Ducharse", pista: "Toca la ducha o la bañera", tipos: ["ducha", "duchaObra", "banera", "baneraExenta"], minutos: 20, premio: { animo: 10 } },
  { id: "platos", nombre: "Fregar los platos", pista: "Toca el fregadero", tipos: ["fregadero", "cocina"], minutos: 15, premio: { animo: 2 } },
  { id: "regar", nombre: "Regar las plantas", pista: "Toca una maceta o los geranios", tipos: ["maceta", "plantaGrande", "geranios"], minutos: 5, premio: { animo: 3 } },
  { id: "barrer", nombre: "Barrer y fregar el suelo", pista: "Desde esta lista", tipos: [], minutos: 25, premio: { animo: 4, energia: -6 } },
  { id: "basura", nombre: "Bajar la basura", pista: "Desde esta lista", tipos: [], minutos: 5, premio: { animo: 1 } },
];

export class Vivienda {
  static actual: Vivienda | null = null;
  readonly escena: EscenaInterior;
  readonly ui: HTMLElement;
  readonly panel: HTMLElement;
  private barra: HTMLElement;
  private cabecera: HTMLElement;
  private guardado: HTMLElement;
  private quitar: (() => void)[] = [];
  private bloqueos = new Map<string, string>();
  /** Lo que hace cada jugador remoto (herramienta en la mano). */
  private haciendo = new Map<string, { texto: string; t: number }>();

  constructor(readonly j: Juego, readonly id: string, public rol: Rol, readonly unidad: Unidad, interior: InteriorPublico) {
    Vivienda.actual = this;
    if (import.meta.env.DEV || location.search.includes("depurar")) Object.assign(window, { __viv: this });
    const raiz = j.raizJuego;
    raiz.classList.add("en-interior");
    j.mundo.pausado = true;
    const marco = h("div", { class: "marco-interior" });
    raiz.querySelector(".capa3d")!.after(marco);
    this.escena = new EscenaInterior(marco);
    this.escena.aspecto(j.e.ropa, j.e.piel);
    this.escena.plantaBaja = unidad.tipo === "casa" || unidad.planta === 0;
    this.escena.cargar(interior);
    this.escena.aplicarHora((j.e.minuto % 1440) / 60);
    this.escena.onTocar = (t) => this.tocar(t);
    this.cabecera = h("div", { class: "interior-cabeza" });
    this.guardado = h("span", { class: "guardado" }, "Guardado");
    this.panel = h("div", { class: "interior-panel" });
    this.barra = h("nav", { class: "dock interior-dock" });
    this.ui = h("div", { class: "ui-interior" }, this.cabecera, this.controles(), this.panel, this.barra);
    marco.append(this.ui);
    this.listaTareas = h("aside", { class: "tareas-casa" });
    this.ui.append(this.listaTareas);
    this.pintarTareas();
    this.pintarCabecera();
    this.pintarBarra();
    const on = (ev: string, fn: (m: Record<string, unknown>) => void) => this.quitar.push(con.on(ev, fn));
    on("interior", (m) => {
      if (m.id !== this.id) return;
      this.escena.cargar(m.interior as InteriorPublico);
      this.pintarCabecera();
      this.alCambiar?.();
    });
    on("bloqueo", (m) => {
      if (m.id !== this.id) return;
      if (m.jugador) this.bloqueos.set(String(m.uid), String(m.jugador));
      else this.bloqueos.delete(String(m.uid));
    });
    on("directo", (m) => {
      if (m.que === "herramienta") this.haciendo.set(String(m.jugador), { texto: String(m.texto ?? ""), t: Date.now() });
      this.alDirecto?.(m);
    });
    on("uso", (m) => {
      if (m.jugador === con.jugador) return;
      const r = con.remotos.find((x) => x.id === m.jugador);
      if (r) this.escena.flotar(({ dormir: "💤", tele: "📺", ducharse: "🚿", cocinar: "🍳", ordenador: "💻" } as Record<string, string>)[String(m.funcion)] ?? "✨", new THREE.Vector3(r.x, 2.2, r.y));
    });
    on("expulsado", (m) => {
      if (m.escena !== `casa:${this.id}`) return;
      void this.salir(true).then(() => j.aviso("El dueño te ha pedido que salgas de su casa."));
    });
    on("xp", (m) => {
      j.e.xp = Math.max(j.e.xp ?? 0, Number(m.xp));
      j.refrescar();
    });
    // Recuperación: si se recarga la página dentro de casa, se vuelve a entrar.
    j.e.flags.dentro = id;
  }

  /** Repintado de paneles que dependen del interior (lo fija quien los abre). */
  alCambiar: (() => void) | null = null;
  alDirecto: ((m: Record<string, unknown>) => void) | null = null;

  get doc() {
    return this.escena.doc;
  }
  get puedeEditar() {
    return this.rol === "titular" || this.rol === "conviviente";
  }
  get puedeReformar() {
    return this.puedeEditar || this.rol === "ayudante";
  }

  /** Llama al servidor; si devuelve el interior, lo aplica. Muestra el error si falla. */
  async op<T = Record<string, unknown>>(op: string, args: Record<string, unknown> = {}, silencioso = false): Promise<T | null> {
    this.guardado.textContent = "Guardando…";
    this.guardado.classList.add("activo");
    try {
      const r = await con.llamar<T>(op, { id: this.id, ...args });
      const ri = r as unknown as { interior?: InteriorPublico };
      if (ri && ri.interior) this.escena.cargar(ri.interior);
      this.guardado.textContent = "Guardado";
      this.pintarCabecera();
      return r;
    } catch (e) {
      this.guardado.textContent = "Sin guardar";
      if (!silencioso) {
        sonido("mal");
        this.j.aviso(esc((e as Error).message));
      }
      return null;
    } finally {
      this.guardado.classList.remove("activo");
    }
  }

  /** Recarga el interior del servidor (tras una reforma que no lo devuelve). */
  async recargar() {
    try {
      const r = await con.llamar<{ interior: InteriorPublico; rol: Rol }>("hogarInterior", { id: this.id });
      this.rol = r.rol;
      this.escena.cargar(r.interior);
      this.pintarCabecera();
      this.pintarBarra();
      this.alCambiar?.();
    } catch {
      /* sin red: se reintenta en el siguiente cambio */
    }
  }

  /** Mensaje de tiempo real para los demás de la casa (herramienta, arrastres). */
  directo(m: Record<string, unknown>) {
    con.modulo(m);
  }

  /** Posición en coordenadas del interior (para el servidor). */
  get posicion(): [number, number] {
    return [this.escena.pos.x, this.escena.pos.y];
  }

  private pintarCabecera() {
    const doc = this.doc;
    const estado = doc.estado;
    this.cabecera.replaceChildren(
      h("div", { class: "interior-titulo" },
        h("span", { class: "etiqueta" }, NOMBRE_ROL[this.rol].toUpperCase()),
        h("h2", {}, this.unidad.nombre),
      ),
      h("div", { class: "interior-estado", title: `Estado de conservación: ${estado}%` },
        h("small", {}, "ESTADO"),
        h("div", { class: "barra-estado" }, h("i", { style: `width:${estado}%;background:${estado > 70 ? "var(--lima)" : estado > 40 ? "#F2C230" : "var(--rosa)"}` })),
        h("b", {}, `${estado}%`),
      ),
      this.guardado,
    );
  }

  private controles() {
    const ico = (d: string) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    return h("div", { class: "controles-mapa interior-controles" },
      h("button", { class: "relieve", "aria-label": "Girar a la izquierda", onclick: () => this.escena.girar(-1), html: ico('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>') }),
      h("button", { class: "relieve", "aria-label": "Girar a la derecha", onclick: () => this.escena.girar(1), html: ico('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>') }),
      h("button", { class: "relieve", "aria-label": "Acercar", onclick: () => this.escena.zoom(0.8) }, "+"),
      h("button", { class: "relieve", "aria-label": "Alejar", onclick: () => this.escena.zoom(1.25) }, "−"),
      h("button", { class: "relieve", "aria-label": "Subir o bajar los tabiques", title: "Paredes", onclick: () => (this.escena.tabiques = this.escena.tabiques < 0.5 ? 1 : 0.32), html: ico('<path d="M4 20V8l8-4 8 4v12"/><path d="M4 14h16"/>') }),
      h("button", { class: "relieve", "aria-label": "Centrar en mí", onclick: () => this.escena.centrar(), html: ico('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>') }),
    );
  }

  pintarBarra() {
    const boton = (icono: Parameters<typeof iconoSvg>[0], texto: string, fn: () => void, principal = false, desactivado = false) =>
      h("button", { class: principal ? "principal" : "", disabled: desactivado, onclick: fn, "aria-label": texto },
        h("span", { class: "bola relieve" }, html(iconoSvg(icono, principal ? 34 : 26))), texto);
    this.barra.replaceChildren(
      boton("mochila", "Mochila", () => abrirMochila(this.j)),
      boton("sofa", "Construir", () => abrirConstruccion(this), false, !this.puedeEditar),
      boton("rodillo", "Reformas", () => abrirReformas(this), true, !this.puedeReformar),
      boton("gente", "Invitar", () => abrirVecinos(this.j)),
      boton("salir", "Salir", () => void this.salir()),
    );
  }

  /** Vacía el panel inferior (herramienta terminada). */
  cerrarPanel() {
    this.panel.replaceChildren();
    this.panel.classList.remove("abierto");
    this.escena.tapar(0);
    this.escena.herramienta = null;
    this.escena.fantasma(null);
    this.escena.resaltar(null);
    this.escena.ocultarMueble(null);
    this.alCambiar = null;
    this.alDirecto = null;
    this.barra.style.display = "";
    this.directo({ que: "herramienta", texto: "" });
  }

  /** Abre un panel inferior con título; devuelve el cuerpo para rellenar. */
  abrirPanel(seccion: string, titulo: string, alCerrar?: () => void) {
    this.cerrarPanel();
    const cuerpo = h("div", { class: "interior-panel-cuerpo" });
    this.panel.append(
      h("div", { class: "hoja-cabeza" },
        h("div", {}, h("span", { class: "etiqueta" }, seccion), h("h2", {}, titulo)),
        h("button", { class: "cerrar", "aria-label": "Cerrar", onclick: () => {
          alCerrar?.();
          this.cerrarPanel();
        } }, html(iconoSvg("cerrar", 18))),
      ),
      cuerpo,
    );
    this.panel.classList.add("abierto");
    this.barra.style.display = "none";
    requestAnimationFrame(() => {
      const lienzo = this.escena.canvas.getBoundingClientRect();
      const p = this.panel.getBoundingClientRect();
      if (lienzo.height && this.panel.classList.contains("abierto")) this.escena.tapar((lienzo.bottom - p.top) / lienzo.height);
    });
    return cuerpo;
  }

  /* ── Andar y usar muebles ────────────────────────────────────────── */

  private tocar(t: Toque) {
    if (t.objeto?.tipo === "mueble") {
      const m = this.doc.muebles.find((x) => x.uid === t.objeto!.id);
      if (!m) return;
      const def = MUEBLES[m.tipo];
      const destino = new THREE.Vector2(t.objeto.punto.x, t.objeto.punto.z);
      sonido("toque");
      this.escena.andarA(destino, () => void this.usar(m.uid));
      if (def.capa === "encima" || def.capa === "pared") void this.usar(m.uid);
      return;
    }
    if (t.suelo) {
      const ok = this.escena.andarA(new THREE.Vector2(t.suelo.x, t.suelo.z));
      if (ok) sonido("paso");
    }
  }

  /* ── Tareas de la casa ─────────────────────────────────────────── */
  private listaTareas!: HTMLElement;
  private get claveTareas() {
    return `tareasCasa:${this.j.e.dia}`;
  }
  private tareasHechas() {
    return new Set(String(this.j.e.flags[this.claveTareas] ?? "").split(",").filter(Boolean));
  }
  /** Las que se pueden hacer en esta casa (hace falta el mueble). */
  private tareasPosibles() {
    const tipos = new Set(this.doc.muebles.filter((m) => !m.roto).map((m) => m.tipo));
    return TAREAS_CASA.filter((t) => !t.tipos.length || t.tipos.some((x) => tipos.has(x)));
  }
  private pintarTareas() {
    if (!this.listaTareas) return;
    if (!this.puedeEditar) {
      this.listaTareas.hidden = true;
      return;
    }
    const hechas = this.tareasHechas();
    const lista = this.tareasPosibles();
    const n = lista.filter((t) => hechas.has(t.id)).length;
    this.listaTareas.replaceChildren(
      h("header", {}, h("b", {}, "Tareas de casa"), h("span", {}, `${n}/${lista.length}`)),
      h("div", { class: "barra-tareas" }, h("i", { style: `width:${Math.round((n / Math.max(1, lista.length)) * 100)}%` })),
      ...lista.map((t) =>
        h("div", { class: `tarea${hechas.has(t.id) ? " hecha" : ""}` },
          h("span", { class: "marca" }, hechas.has(t.id) ? "✓" : ""),
          h("span", {}, h("b", {}, t.nombre), h("small", {}, hechas.has(t.id) ? "Hecho" : `${t.pista} · ${t.minutos} min`)),
          !t.tipos.length && !hechas.has(t.id) ? h("button", { class: "boton mini", onclick: () => void this.hacerTarea(t.id, null) }, "Hacer") : "",
        ),
      ),
    );
  }
  /** Hace una tarea (con su tiempo y su premio). Devuelve false si ya estaba hecha. */
  private async hacerTarea(id: string, donde: THREE.Vector3 | null) {
    const t = TAREAS_CASA.find((x) => x.id === id)!;
    const hechas = this.tareasHechas();
    if (hechas.has(id)) return false;
    const e = this.j.e;
    if (t.premio.energia && e.energia + t.premio.energia < 0) {
      this.j.aviso("Estás demasiado cansado. Descansa un poco antes.");
      return true;
    }
    sonido("toque");
    await this.j.pasar(t.minutos);
    e.animo = limitar(e.animo + (t.premio.animo ?? 0));
    e.energia = limitar(e.energia + (t.premio.energia ?? 0));
    hechas.add(id);
    e.flags[this.claveTareas] = [...hechas].join(",");
    const yo = donde ?? new THREE.Vector3(this.escena.pos.x, 2.2, this.escena.pos.y);
    this.escena.flotar(`${t.nombre} ✓`, yo);
    const posibles = this.tareasPosibles();
    if (posibles.every((x) => hechas.has(x.id)) && !e.flags[`casaAlDia:${e.dia}`]) {
      e.flags[`casaAlDia:${e.dia}`] = true;
      e.animo = limitar(e.animo + 15);
      sonido("bien");
      this.j.aviso("¡Casa al día! Todo recogido y limpio. <b>+15 ánimo</b>");
    }
    this.pintarTareas();
    this.j.refrescar();
    return true;
  }

  async usar(uid: string) {
    const m = this.doc.muebles.find((x) => x.uid === uid);
    if (!m) return;
    const def = MUEBLES[m.tipo];
    if (m.roto) {
      this.j.aviso(`<b>${def.nombre}</b> está roto. Sácalo al contenedor desde <b>Reformas → Trastos</b>.`);
      return;
    }
    // Tareas de la casa con este mueble (si están pendientes).
    if (this.puedeEditar) {
      const horaT = (this.j.e.minuto % 1440) / 60;
      const pend = TAREAS_CASA.find((t) => t.tipos.includes(m.tipo) && !this.tareasHechas().has(t.id));
      const cabe = pend && (pend.id !== "cama" || (horaT >= 6 && horaT < 14)) && pend.id !== "ducha";
      if (pend && cabe) {
        if ((pend.id === "platos" || pend.id === "ducha") && !this.doc.fontaneria.resuelto) return void this.j.aviso("No sale agua: hay que arreglar la fontanería.");
        await this.hacerTarea(pend.id, null);
        return;
      }
    }
    const r = await this.op<{ funcion: string }>("hogarUsar", { uid });
    if (!r) return;
    const e = this.j.e;
    const hora = (e.minuto % 1440) / 60;
    const yo = new THREE.Vector3(this.escena.pos.x, 2.2, this.escena.pos.y);
    switch (r.funcion) {
      case "dormir":
        if (hora >= 18 || hora < 2) {
          await this.j.dormir();
          this.escena.aplicarHora((this.j.e.minuto % 1440) / 60);
        } else if (hora >= 14) {
          e.energia = limitar(e.energia + 35);
          await this.j.pasar(120);
          this.j.aviso("Siesta en tu cama. <b>+35 energía</b>");
        } else this.j.aviso(this.tareasHechas().has("cama") ? "Todavía no tienes sueño. La siesta, a partir de las 14:00." : "Todavía no tienes sueño. Puedes hacer la cama (de 6:00 a 14:00).");
        break;
      case "descansar":
      case "sentarse":
        e.energia = limitar(e.energia + 6);
        e.animo = limitar(e.animo + 4);
        await this.j.pasar(30);
        this.escena.flotar("+6 energía", yo);
        break;
      case "tele":
        e.animo = limitar(e.animo + 8);
        await this.j.pasar(60);
        this.escena.flotar("📺 +8 ánimo", yo);
        break;
      case "ducharse":
        if (this.puedeEditar && !this.tareasHechas().has("ducha")) {
          await this.hacerTarea("ducha", null);
          break;
        }
      // falls through
      case "asearse":
        e.animo = limitar(e.animo + (r.funcion === "ducharse" ? 10 : 4));
        await this.j.pasar(r.funcion === "ducharse" ? 20 : 5);
        this.escena.flotar(r.funcion === "ducharse" ? "🚿 +10 ánimo" : "+4 ánimo", yo);
        break;
      case "cocinar":
        abrirCocina(this.j);
        break;
      case "comer":
        abrirMochila(this.j);
        break;
      case "guardar":
        this.armario();
        break;
      case "ordenador": {
        const { abrirHogar } = await import("../ui/hogar");
        abrirHogar(this.j);
        break;
      }
      case "luz":
        this.escena.aplicarHora();
        this.j.aviso("Luz encendida.");
        break;
      default:
        this.escena.flotar("✨", yo);
    }
    this.j.refrescar();
  }

  /** Armario o cajonera: el inventario de muebles y materiales del jugador. */
  private async armario() {
    const inv = await con.llamar<Record<string, number>>("hogarInventario").catch(() => ({} as Record<string, number>));
    const filas = Object.entries(inv).map(([k, n]) => {
      const [tipo, id, extra] = k.split(":");
      const nombre = tipo === "mueble" || tipo === "caja" ? `${MUEBLES[id]?.nombre ?? id}${tipo === "caja" ? " (en caja)" : ""}` : tipo === "pintura" ? `Bote de pintura ${id}` : tipo === "suelo" ? `Suelo ${id} (${extra} m²)` : `Planta: ${id}`;
      return h("li", {}, h("b", {}, `${n} ×`), ` ${nombre}`);
    });
    const c = this.abrirPanel("ARMARIO", "Lo que tienes guardado");
    c.append(filas.length ? h("ul", { class: "lista-inventario" }, ...filas) : h("p", { class: "vacio" }, "Vacío. Lo que compres en Muebles Linenses o retires de la casa aparece aquí."));
  }

  /** Rótulo de los remotos: qué herramienta usan. */
  queHace(jugador: string) {
    const x = this.haciendo.get(jugador);
    return x && Date.now() - x.t < 6000 ? x.texto : "";
  }

  bloqueadoPorOtro(uid: string) {
    const b = this.bloqueos.get(uid);
    return b && b !== con.jugador ? b : null;
  }

  /** Habitación donde está el jugador. */
  habitacionActual() {
    return habitacionEn(this.doc.plano, Math.floor(this.escena.pos.x), Math.floor(this.escena.pos.y));
  }

  async salir(forzado = false) {
    if (Vivienda.actual !== this) return;
    Vivienda.actual = null;
    for (const q of this.quitar) q();
    this.cerrarPanel();
    if (!forzado) await con.llamar("escena", { escena: "ciudad" }).catch(() => {});
    this.escena.destruir();
    this.ui.remove();
    this.j.raizJuego.querySelector(".marco-interior")?.remove();
    this.j.raizJuego.classList.remove("en-interior");
    this.j.mundo.pausado = false;
    delete this.j.e.flags.dentro;
    this.j.cerrar();
    this.j.refrescar();
  }
}

/** Entra en una vivienda: comprueba permisos en el servidor, cambia de escena y la carga. */
export async function entrarEnVivienda(j: Juego, id: string) {
  if (Vivienda.actual?.id === id) return Vivienda.actual;
  if (Vivienda.actual) await Vivienda.actual.salir();
  try {
    const r = await con.llamar<{ interior: InteriorPublico; rol: Rol; unidad: Unidad }>("hogarInterior", { id });
    const ent = r.interior.plano.entrada;
    await con.llamar("escena", { escena: `casa:${id}`, x: ent.x + 0.5, y: ent.z + 0.7 });
    j.cerrar();
    sonido("toque");
    const v = new Vivienda(j, id, r.rol, r.unidad, r.interior);
    if (r.rol === "visita") j.aviso("Estás de visita: mira, inspecciona y decide. Para cambiar algo, cómprala o alquílala.");
    return v;
  } catch (e) {
    sonido("mal");
    j.aviso(esc((e as Error).message));
    return null;
  }
}

/** Entra en la vivienda donde vive el jugador (al empezar, la Casa de la abuela). */
export async function entrarEnCasa(j: Juego) {
  const r = await con.llamar<{ residencia: string }>("hogarMias").catch(() => null);
  return entrarEnVivienda(j, r?.residencia ?? `abuela:${con.jugador}`);
}
