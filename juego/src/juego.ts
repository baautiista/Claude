import { LUGARES, type LugarId } from "./datos/mapa";
import { PERSONAJES, type PersonajeId } from "./datos/personajes";
import {
  dormir, esMadrugada, g, guardar, hora, pasarTiempo, sinLeer, VIENTOS, type Estado,
} from "./estado";
import * as historia from "./historia";
import { iconoSvg } from "./iconos";
import { ruta } from "./mapa/rutas";
import { Mundo, type Tocable } from "./mundo/mundo";
import { h, html, esc } from "./ui/dom";
import { abrirBancal, abrirBarca, abrirCocina, abrirPuesto, accionesLugar, tablon, type Accion } from "./ui/lugares";
import { abrirMovil } from "./ui/movil";
import { abrirDiario, abrirMenu, abrirMochila } from "./ui/paneles";
import { retrato, retratoNarrador } from "./ui/retrato";
import { sonido } from "./ui/sonido";

export type Quien = PersonajeId | "yo" | "narrador";
export type Linea = readonly [Quien, string];

/** Convierte **negrita** después de escapar el texto. */
const formato = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export class Juego {
  readonly mundo: Mundo;
  private hud: HTMLElement;
  private objetivoEl: HTMLButtonElement;
  private capa: HTMLElement;
  private botonMovil!: HTMLButtonElement;
  /** Hay una hoja, diálogo o pantalla abierta: el mapa no responde a toques. */
  ocupado = false;
  /** Diálogo, minijuego o pantalla completa: el reloj se para. */
  private pausa = false;
  /** Panel abierto que se repinta cada segundo (bancales, cocina, barca…). */
  vivo: (() => void) | null = null;
  private revisando = false;

  constructor(public e: Estado, private raiz: HTMLElement) {
    raiz.innerHTML = "";
    const canvas = h("canvas", { id: "mapa", "aria-label": "La Línea en 3D" });
    const rotulos = h("div", { class: "capa3d" });
    this.hud = h("div", { class: "hud" });
    this.objetivoEl = h("button", { class: "objetivo", onclick: () => this.irAlObjetivo() });
    this.capa = h("div");
    raiz.append(canvas, rotulos, this.hud, this.objetivoEl, this.barra(), this.capa);
    this.mundo = new Mundo(canvas, rotulos);
    this.mundo.colocar(e.nodo);
    this.mundo.ropa = e.ropa;
    this.mundo.piel = e.piel;
    this.mundo.onTocar = (t) => {
      if (!this.ocupado || this.vivo) this.tocar(t);
    };
    this.mundo.sincronizar(e);
    this.arrancarReloj();
    this.refrescar();
    if (import.meta.env.DEV) (window as unknown as { __mi: Juego }).__mi = this;
  }

  /* ── Reloj continuo: 1 s real = 1 min de juego ─────────────────────── */

  private arrancarReloj() {
    let previo = performance.now();
    let acumulado = 0;
    let guardado = 0;
    const tic = () => {
      const ahora = performance.now();
      const seg = Math.min(2, (ahora - previo) / 1000);
      previo = ahora;
      if (!this.pausa && !document.hidden) {
        pasarTiempo(this.e, seg);
        acumulado += seg;
        guardado += seg;
        this.mundo.sincronizar(this.e);
        if (acumulado >= 1) {
          acumulado = 0;
          this.refrescarHud();
          this.vivo?.();
          if (esMadrugada(this.e)) void this.revisarHora();
        }
        if (guardado >= 5) {
          guardado = 0;
          guardar(this.e);
        }
      }
    };
    setInterval(tic, 200);
  }

  /** Toque en el mundo: si estás lejos, vas andando y luego actúas. */
  tocar(t: Tocable) {
    const alli = (l: LugarId, fn: () => void) => {
      if (LUGARES[l].nodo === this.e.nodo && !this.mundo.andando) fn();
      else this.ir(l, fn);
    };
    switch (t.tipo) {
      case "lugar": return this.ir(t.id);
      case "bancal": return alli("huerta", () => abrirBancal(this, t.i));
      case "npc": return alli(PERSONAJES[t.id].lugar, () => this.hablarCon(t.id));
      case "cocina": return alli("casa", () => abrirCocina(this));
      case "barca": return alli("atunara", () => abrirBarca(this));
      case "puesto": return alli("mercado", () => abrirPuesto(this));
      case "tablon": return alli("plaza", () => tablon(this));
    }
  }

  async hablarCon(p: PersonajeId) {
    await historia.hablar(this, p);
    const lugar = PERSONAJES[p].lugar;
    if (!this.ocupado && this.lugarActual === lugar) this.abrirLugar(lugar);
  }

  /* ── HUD ──────────────────────────────────────────────────────────── */

  private barra() {
    const boton = (icono: Parameters<typeof iconoSvg>[0], texto: string, fn: () => void) =>
      h("button", { onclick: () => !this.mundo.andando && fn(), "aria-label": texto }, html(iconoSvg(icono, 24)), texto);
    this.botonMovil = boton("movil", "InfoLinense", () => abrirMovil(this));
    return h(
      "nav", { class: "navegacion" },
      boton("mochila", "Mochila", () => abrirMochila(this)),
      this.botonMovil,
      boton("diario", "Diario", () => abrirDiario(this)),
      boton("menu", "Menú", () => abrirMenu(this)),
    );
  }

  refrescar() {
    const e = this.e;
    this.refrescarHud();
    const obj = historia.objetivo(e);
    this.objetivoEl.replaceChildren(
      h("span", { class: "icono" }, html(iconoSvg("objetivo", 20))),
      h("div", {}, h("small", {}, obj.titulo.toUpperCase()), h("span", {}, obj.texto)),
    );
    this.objetivoEl.style.display = this.ocupado ? "none" : "";
    this.mundo.objetivo = obj.lugar ?? null;
    this.mundo.sincronizar(e);
    const n = sinLeer(e);
    this.botonMovil.querySelector(".punto")?.remove();
    if (n > 0) this.botonMovil.append(h("span", { class: "punto" }, n));
    guardar(e);
  }

  private refrescarHud() {
    const e = this.e;
    const necesidad = (nombre: string, v: number) =>
      h("div", { class: `necesidad${v < 25 ? " baja" : ""}` }, nombre, h("div", { class: "nivel" }, h("i", { style: `width:${Math.round(v)}%` })));
    this.hud.replaceChildren(
      h(
        "div", { class: "hud-fila" },
        h("span", { class: "chip" }, `Día ${e.dia} · ${hora(e)}`),
        h("button", { class: `chip ${e.viento === "levanteFuerte" ? "rosa" : ""}`, onclick: () => this.verTiempo() }, html(iconoSvg("viento", 15)), VIENTOS[e.viento].nombre),
        h("span", { class: "espacio" }),
        h("span", { class: "chip lima" }, `${e.dinero} €`),
      ),
      h(
        "div", { class: "necesidades" },
        necesidad("Energía", e.energia), necesidad("Comida", e.comida), necesidad("Ánimo", e.animo), necesidad("Gente", e.social),
      ),
    );
  }

  private verTiempo() {
    const e = this.e;
    this.aviso(`<b>${VIENTOS[e.viento].nombre}</b>: ${VIENTOS[e.viento].efecto}<br>Mañana: ${VIENTOS[e.vientoManana].nombre}`);
  }

  private irAlObjetivo() {
    const obj = historia.objetivo(this.e);
    if (obj.opciones) {
      this.hoja(
        "OBJETIVO", "¿A dónde vas?",
        h("p", { class: "desc" }, obj.texto),
        h("div", { class: "acciones" }, ...obj.opciones.map((l) =>
          this.boton({ icono: LUGARES[l].icono, titulo: LUGARES[l].nombre, sub: LUGARES[l].descripcion, fn: () => { this.cerrar(); this.mundo.centrarEn(l); this.ir(l); } }),
        )),
      );
    } else if (obj.lugar) {
      this.mundo.centrarEn(obj.lugar);
      this.ir(obj.lugar);
    }
  }

  /* ── Capas: hoja, diálogo, pantalla, aviso ────────────────────────── */

  private abrirCapa(contenido: HTMLElement, velo = true) {
    this.capa.replaceChildren(...(velo ? [h("div", { class: "velo", onclick: () => this.cerrar() })] : []), contenido);
    this.ocupado = true;
    this.vivo = null;
    this.objetivoEl.style.display = "none";
  }

  cerrar() {
    this.mundo.soltarFoco();
    this.capa.replaceChildren();
    this.ocupado = false;
    this.pausa = false;
    this.vivo = null;
    this.refrescar();
  }

  /**
   * Panel pequeño y sin velo (bancales, cocina, barca, puesto): el mundo sigue
   * vivo detrás y se puede tocar otro bancal sin cerrarlo. `pintar` se vuelve a
   * llamar cada segundo para que se vean los progresos.
   */
  bandeja(seccion: string, titulo: string, pintar: () => (Node | null)[]) {
    const cuerpo = h("div");
    const hoja = h(
      "section", { class: "hoja bandeja", role: "dialog", "aria-label": titulo },
      h(
        "div", { class: "hoja-cabeza" },
        h("div", {}, h("span", { class: "etiqueta" }, seccion), h("h2", {}, titulo)),
        h("button", { class: "cerrar", "aria-label": "Cerrar", onclick: () => this.cerrar() }, html(iconoSvg("cerrar", 18))),
      ),
      cuerpo,
    );
    const repintar = () => cuerpo.replaceChildren(...pintar().filter((c): c is Node => c !== null));
    repintar();
    this.abrirCapa(hoja, false);
    this.vivo = repintar;
    return repintar;
  }

  hoja(seccion: string, titulo: string, ...cuerpo: (Node | null)[]) {
    const hoja = h(
      "section", { class: "hoja", role: "dialog", "aria-label": titulo },
      h(
        "div", { class: "hoja-cabeza" },
        h("div", {}, h("span", { class: "etiqueta" }, seccion), h("h2", {}, titulo)),
        h("button", { class: "cerrar", "aria-label": "Cerrar", onclick: () => this.cerrar() }, html(iconoSvg("cerrar", 18))),
      ),
      ...cuerpo.filter((c): c is Node => c !== null),
    );
    this.abrirCapa(hoja);
    return hoja;
  }

  pantalla(el: HTMLElement) {
    this.abrirCapa(el, false);
    this.pausa = true;
  }

  aviso(texto: string) {
    const t = h("div", { class: "toast", role: "status", html: texto });
    this.raiz.append(t);
    setTimeout(() => t.remove(), 3200);
  }

  /** Muestra una conversación línea a línea; con opciones, devuelve la elegida. */
  conversar(lineas: readonly Linea[], opciones: readonly string[] = []): Promise<number> {
    return new Promise((resolver) => {
      let i = 0;
      const mostrar = () => {
        const [quien, texto] = lineas[i];
        const ultima = i === lineas.length - 1;
        const caja = h("div", { class: `bocadillo ${quien === "narrador" ? "narrador" : quien === "yo" ? "yo" : ""}` });
        const p = PERSONAJES[quien as PersonajeId];
        const cabecera =
          quien === "narrador" ? null
          : quien === "yo" ? h("div", { class: "quien" }, html(retrato({ piel: this.e.piel, pelo: "#2B1B12", ropa: this.e.ropa })), h("div", {}, h("b", {}, this.e.nombre)))
          : h("div", { class: "quien" }, html(retrato(p)), h("div", {}, h("b", {}, p.nombre), h("small", {}, p.rol)));
        if (cabecera) caja.append(cabecera);
        else caja.append(h("div", { class: "quien" }, html(retratoNarrador)));
        caja.append(h("p", { html: formato(texto) }));
        if (ultima && opciones.length) {
          caja.append(
            h("div", { class: "opciones" }, ...opciones.map((o, n) => h("button", { onclick: () => fin(n) }, o))),
          );
        } else {
          caja.append(h("button", { class: "seguir", onclick: () => siguiente() }, ultima ? "Cerrar ✕" : "Seguir ›"));
          caja.addEventListener("click", (ev) => {
            if ((ev.target as HTMLElement).tagName !== "BUTTON") siguiente();
          });
        }
        const dialogo = h("div", { class: "dialogo", role: "dialog" }, caja);
        this.capa.replaceChildren(h("div", { class: "velo" }), dialogo);
        this.ocupado = true;
        this.pausa = true;
        this.vivo = null;
        this.objetivoEl.style.display = "none";
      };
      const siguiente = () => {
        sonido("toque");
        if (i < lineas.length - 1) {
          i++;
          mostrar();
        } else fin(-1);
      };
      const fin = (n: number) => {
        sonido("toque");
        this.cerrar();
        resolver(n);
      };
      mostrar();
    });
  }

  decir(...lineas: Linea[]) {
    return this.conversar(lineas).then(() => undefined);
  }

  /* ── Moverse por la ciudad ────────────────────────────────────────── */

  get lugarActual(): LugarId | null {
    return (Object.keys(LUGARES) as LugarId[]).find((id) => LUGARES[id].nodo === this.e.nodo) ?? null;
  }

  /** Va andando a un lugar; al llegar, abre su ficha o hace `despues`. */
  ir(lugar: LugarId, despues?: () => void) {
    if (this.mundo.andando) return;
    const destino = LUGARES[lugar].nodo;
    if (destino === this.e.nodo) {
      (despues ?? (() => this.abrirLugar(lugar)))();
      return;
    }
    if (this.ocupado) this.cerrar();
    const r = ruta(this.e.nodo, destino);
    this.objetivoEl.style.display = "none";
    sonido("paso");
    this.mundo.andar(r.nodos, async () => {
      this.e.nodo = destino;
      this.refrescar();
      await historia.alLlegar(this, lugar);
      if (this.ocupado) return;
      (despues ?? (() => this.abrirLugar(lugar)))();
    });
  }

  abrirLugar(lugar: LugarId) {
    const l = LUGARES[lugar];
    const acciones = [...historia.acciones(this, lugar), ...accionesLugar(this, lugar)];
    const presentes = (Object.keys(PERSONAJES) as PersonajeId[]).filter((p) => PERSONAJES[p].lugar === lugar);
    this.hoja(
      l.seccion, l.nombre,
      h("p", { class: "desc" }, l.descripcion),
      presentes.length ? h("div", { class: "seccion-titulo" }, "Gente") : null,
      presentes.length
        ? h(
            "div", { class: "acciones" },
            ...presentes.map((p) =>
              this.boton({
                icono: html(retrato(PERSONAJES[p])),
                titulo: `Hablar con ${PERSONAJES[p].nombre}`,
                sub: historia.presente(this.e, p) ? PERSONAJES[p].rol : `No está ahora · suele estar de ${historia.HORAS[p][0]}:00 a ${historia.HORAS[p][1]}:00`,
                fn: () => this.hablarCon(p),
              }),
            ),
          )
        : null,
      acciones.length ? h("div", { class: "seccion-titulo" }, "Qué hacer") : null,
      acciones.length ? h("div", { class: "acciones" }, ...acciones.map((a) => this.boton(a))) : null,
    );
  }

  boton(a: Accion) {
    const ico = typeof a.icono === "string" ? html(iconoSvg(a.icono as Parameters<typeof iconoSvg>[0], 22)) : a.icono;
    return h(
      "button",
      {
        class: `accion${a.historia ? " historia" : ""}`,
        disabled: a.desactivada !== undefined && a.desactivada !== false,
        onclick: async () => {
          await a.fn();
        },
      },
      h("span", { class: "ico" }, ico),
      h("span", {}, h("b", {}, a.titulo), a.sub ? h("small", {}, typeof a.desactivada === "string" ? a.desactivada : a.sub) : null),
      a.precio !== undefined ? h("span", { class: "precio" }, a.precio) : null,
    );
  }

  /* ── Tiempo ──────────────────────────────────────────────────────── */

  /** Pasa tiempo por una acción y comprueba si se ha hecho de madrugada. */
  async pasar(minutos: number, esfuerzo = 0) {
    pasarTiempo(this.e, minutos, esfuerzo);
    this.refrescar();
    return this.revisarHora();
  }

  /** Si es de madrugada, el personaje vuelve a casa y duerme. */
  private async revisarHora() {
    if (!esMadrugada(this.e) || this.revisando) return false;
    this.revisando = true;
    await this.decir(["narrador", `Se te ha hecho tardísimo. Vuelves a casa arrastrando los pies y te quedas ${g(this.e, "dormido", "dormida")} en cuanto tocas la cama de la abuela.`]);
    this.e.animo = Math.max(0, this.e.animo - 10);
    await this.dormir();
    this.revisando = false;
    return true;
  }

  async dormir() {
    dormir(this.e);
    this.mundo.colocar(this.e.nodo);
    this.refrescar();
    const v = VIENTOS[this.e.viento];
    const ultima = this.e.noticias[this.e.noticias.length - 1];
    await this.decir(["narrador", `**Día ${this.e.dia}.** Amanece con ${v.nombre.toLowerCase()}. ${v.efecto}\n\nEn InfoLinense: «${ultima.titular}».`]);
    await historia.alDespertar(this);
    this.refrescar();
  }

  /** Comprueba que hay fuerzas para una tarea. */
  puede(energia: number) {
    if (this.e.energia >= energia) return true;
    this.aviso("Estás sin fuerzas. Come algo o descansa en casa.");
    return false;
  }
}

