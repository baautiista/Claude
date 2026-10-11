import { LUGARES, nodoCercano, ZONAS, zonaDeLugar, type LugarId, type Punto, type Zona } from "./datos/mapa";
import { PERSONAJES, type PersonajeId } from "./datos/personajes";
import {
  dormir, esMadrugada, g, ganarXP, guardar, hora, nivel, NIVELES, pasarTiempo, progresoNivel, sinLeer, VIENTOS, type Estado,
} from "./estado";
import * as historia from "./historia";
import { esIconoJuego, iconoJuego, iconoSvg, type IconoJuego } from "./iconos";
import { ruta } from "./mapa/rutas";
import { conectarEconomia, pagar, sincronizarSaldo } from "./economia";
import { con } from "./red/conexion";
import { Mundo, type FichaEdificio, type Tocable } from "./mundo/mundo";
import { h, html, esc } from "./ui/dom";
import { abrirBancal, abrirBarca, abrirCocina, abrirPuesto, accionesLugar, tablon, type Accion } from "./ui/lugares";
import { abrirMovil } from "./ui/movil";
import { abrirVecinos } from "./ui/vecinos";
import { entrarEnVivienda, Vivienda } from "./interior/vivienda";
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
  private necesidadesEl: HTMLElement;
  private botonVecinos!: HTMLButtonElement;
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
  private segundos = 0;

  get raizJuego() {
    return this.raiz;
  }

  constructor(public e: Estado, private raiz: HTMLElement, previo?: { mundo: Mundo; canvas: HTMLElement; rotulos: HTMLElement }) {
    const canvas = previo?.canvas ?? h("canvas", { id: "mapa", "aria-label": "La Línea en 3D" });
    const rotulos = previo?.rotulos ?? h("div", { class: "capa3d" });
    raiz.replaceChildren(canvas, rotulos);
    this.hud = h("div", { class: "hud" });
    this.necesidadesEl = h("div", { class: "necesidades" });
    this.objetivoEl = h("button", { class: "objetivo", onclick: () => this.irAlObjetivo() });
    this.capa = h("div");
    raiz.append(this.hud, this.necesidadesEl, this.objetivoEl, this.barra(), this.capa);
    this.mundo = previo?.mundo ?? new Mundo(canvas as HTMLCanvasElement, rotulos);
    this.mundo.modoDemo = false;
    this.mundo.colocar(e.nodo);
    this.mundo.volarA(300);
    this.mundo.ropa = e.ropa;
    this.mundo.piel = e.piel;
    this.mundo.onTocar = (t) => {
      if (!this.ocupado || this.vivo) this.tocar(t);
    };
    this.mundo.zonaAbierta = (z) => this.zonaAbierta(z);
    this.mundo.sincronizar(e);
    const ico = (d: string) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    this.capa.before(h(
      "div", { class: "controles-mapa" },
      h("button", { class: "relieve", "aria-label": "Girar a la izquierda", onclick: () => this.mundo.girar(-1), html: ico('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>') }),
      h("button", { class: "relieve", "aria-label": "Girar a la derecha", onclick: () => this.mundo.girar(1), html: ico('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>') }),
      h("button", { class: "relieve", "aria-label": "Acercar", onclick: () => this.mundo.zoom(0.75) }, "+"),
      h("button", { class: "relieve", "aria-label": "Alejar", onclick: () => this.mundo.zoom(1.33) }, "−"),
    ));
    this.conectarRed();
    this.arrancarReloj();
    this.refrescar();
    if (import.meta.env.DEV || location.search.includes("depurar")) Object.assign(window, { __mi: this, __con: con });
    // Recuperación: si se cerró el juego (o se cayó la conexión) dentro de una casa, se vuelve a ella.
    if (e.flags.dentro) setTimeout(() => void entrarEnVivienda(this, String(e.flags.dentro)).then((v) => !v && delete this.e.flags.dentro), 600);
  }

  /* ── Multijugador ─────────────────────────────────────────────────── */

  emote: { e: string; t: number } | null = null;
  /** Chat de la escena y mensajes sin leer (para el panel de Vecinos). */
  chatPublico: { de: string; nombre: string; texto: string; hora: number }[] = [];
  sinLeer = 0;
  private quitarOyentes: (() => void)[] = [];

  private conectarRed() {
    conectarEconomia((t) => this.aviso(t), () => this.refrescarHud());
    void sincronizarSaldo(this.e);
    const on = (ev: string, fn: (m: Record<string, unknown>) => void) => this.quitarOyentes.push(con.on(ev, fn));
    on("jugadores", () => {
      if (Vivienda.actual) Vivienda.actual.escena.remotosEn(con.vecinos());
      else this.mundo.vecinosConectados(con.vecinos());
    });
    on("saldo", (m) => {
      this.e.dinero = Number(m.dinero);
      this.refrescarHud();
    });
    on("chat", (m) => {
      const msg = { de: String(m.de), nombre: String(m.nombre), texto: String(m.texto), hora: Number(m.hora) };
      this.chatPublico.push(msg);
      if (this.chatPublico.length > 80) this.chatPublico.shift();
      this.mundo.bocadillo(msg.de === con.jugador ? "yo" : msg.de, msg.texto);
      if (msg.de !== con.jugador) this.contarSinLeer(1);
      this.vivoChat?.();
    });
    on("privado", (m) => {
      this.contarSinLeer(1);
      this.notificar(`<b>${esc(String(m.nombre))}</b> te escribe: ${esc(String(m.texto)).slice(0, 80)}`, [["Responder", () => abrirVecinos(this, "chat", String(m.de))]]);
      this.vivoChat?.();
    });
    on("amistad", (m) => this.notificar(`<b>${esc(String(m.nombre))}</b> quiere ser tu amigo.`, [
      ["Aceptar", () => void con.llamar("aceptarAmistad", { de: m.de }).then(() => this.aviso("¡Ahora sois amigos!"))],
      ["Más tarde", () => {}],
    ]));
    on("amistadAceptada", (m) => this.aviso(`<b>${esc(String(m.nombre))}</b> ha aceptado tu amistad.`));
    on("invitacion", (m) => this.notificar(
      `<b>${esc(String(m.nombre))}</b> te invita a ${m.tipo === "visita" ? "visitar su casa" : "ir con él o ella"}.`,
      [["Ir", () => void con.llamar("responderInvitacion", { id: m.id, acepta: true }).catch((e) => this.aviso((e as Error).message))],
        ["No, gracias", () => void con.llamar("responderInvitacion", { id: m.id, acepta: false })]],
    ));
    on("invitacionRespondida", (m) => this.aviso(`<b>${esc(String(m.nombre))}</b> ${m.acepta ? "viene de camino" : "no puede ahora"}.`));
    on("vendido", (m) => this.aviso(`Has vendido <b>${m.cantidad} ${esc(String(m.objeto))}</b> en el mercadillo por ${m.precio} €.`));
    on("teletransporte", (m) => {
      this.cerrar();
      if (String(m.escena).startsWith("casa:")) {
        void entrarEnVivienda(this, String(m.escena).slice(5)).then((v) => v && this.aviso("Has entrado en casa de tu amigo."));
        return;
      }
      if (Vivienda.actual) void Vivienda.actual.salir(true);
      this.e.nodo = nodoCercano([Number(m.x), Number(m.y)]);
      this.mundo.colocarEn(Number(m.x), Number(m.y));
      this.emitirEscena?.(String(m.escena));
      this.aviso("Te has reunido con tu amigo.");
    });
    on("conexion", (m) => {
      this.hud.classList.toggle("sin-red", !m.conectado);
      if (m.conectado) void sincronizarSaldo(this.e);
    });
  }

  /** Para la fase de viviendas: entrar en una escena interior al teletransportarse. */
  emitirEscena: ((escena: string) => void) | null = null;
  vivoChat: (() => void) | null = null;

  contarSinLeer(n: number) {
    this.sinLeer = n === 0 ? 0 : this.sinLeer + n;
    this.refrescarVecinos();
  }

  /** Aviso con botones (invitaciones, solicitudes, mensajes). */
  notificar(texto: string, botones: [string, () => void][]) {
    sonido("toque");
    const caja = h("div", { class: "notificacion", role: "alert" }, h("p", { html: texto }));
    const fila = h("div", { class: "fila" });
    for (const [t, fn] of botones) fila.append(h("button", { class: fila.children.length ? "secundario" : "", onclick: () => { caja.remove(); fn(); } }, t));
    caja.append(fila);
    this.raiz.append(caja);
    setTimeout(() => caja.remove(), 30000);
  }

  /** Envía mi posición (10 veces por segundo como mucho) y pinta el contador de vecinos. */
  refrescarVecinos() {
    const v = Vivienda.actual;
    const [x, y] = v ? v.posicion : this.mundo.posicionJugador;
    const anim = v ? (v.escena.andando ? "andar" : "quieto") : this.mundo.enBus ? "bus" : this.mundo.andando ? "andar" : "quieto";
    const emote = this.emote && Date.now() - this.emote.t < 4000 ? this.emote : null;
    con.mover(x, y, v ? v.escena.rot : this.mundo.rotJugador, anim, { nombre: this.e.nombre, ropa: this.e.ropa, piel: this.e.piel, nivel: nivel(this.e), gesto: emote?.e, gestoT: emote?.t });
    this.botonVecinos.querySelector(".punto")?.remove();
    const n = this.sinLeer || con.remotos.length;
    if (n) this.botonVecinos.querySelector(".bola")!.append(h("span", { class: `punto${this.sinLeer ? " rosa" : ""}` }, n));
  }

  saludar(emote: string) {
    this.emote = { e: emote, t: Date.now() };
    con.gesto(emote);
    this.mundo.flotante(esIconoJuego(emote) ? iconoJuego(emote, 34) : "", "yo");
    this.refrescarVecinos();
  }

  private guardadoRemoto = 0;
  /** La partida se guarda en el dispositivo y en la autoridad (el dinero lo pone ella). */
  guardarTodo(forzar = false) {
    guardar(this.e);
    const ahora = Date.now();
    if (!forzar && ahora - this.guardadoRemoto < 15000) return;
    this.guardadoRemoto = ahora;
    void con.llamar("guardarPartida", { partida: this.e }).catch(() => {});
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
        this.refrescarVecinos();
        if (acumulado >= 1) {
          acumulado = 0;
          this.revisarNivel();
          this.refrescarHud();
          ++this.segundos;
          this.vivo?.();
          if (esMadrugada(this.e)) void this.revisarHora();
        }
        if (guardado >= 5) {
          guardado = 0;
          this.guardarTodo();
        }
      }
    };
    setInterval(tic, 100);
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
      case "zona": return this.avisoZona(t.zona);
      case "edificio": return this.abrirEdificio(t.ficha);
      case "solar":
        sonido("toque");
        return this.aviso("<b>Solar en venta.</b> Aquí podrás levantar una churrería, una conservera o un comercio en la próxima fase.");
    }
  }

  /** Una zona está abierta por nivel, porque la historia te lleva allí o porque ya entraste. */
  zonaAbierta(z: Zona) {
    if (nivel(this.e) >= z.nivel || this.e.flags[`zona_${z.id}`]) return true;
    const obj = historia.objetivo(this.e);
    const necesarios = [obj.lugar, ...(obj.opciones ?? [])].filter((l): l is LugarId => !!l);
    if (necesarios.some((l) => zonaDeLugar(l)?.id === z.id)) {
      this.e.flags[`zona_${z.id}`] = true;
      return true;
    }
    return false;
  }

  private avisoZona(z: Zona) {
    sonido("mal");
    this.aviso(`<b>${z.nombre}</b> se desbloquea en el nivel ${z.nivel}. Gana experiencia cosechando, cocinando, vendiendo y entregando encargos.`);
  }

  /** Avisa de las subidas de nivel y de las zonas que se abren. */
  private nivelVisto = 0;
  private revisarNivel() {
    const n = nivel(this.e);
    if (!this.nivelVisto) this.nivelVisto = n;
    if (n <= this.nivelVisto) return;
    this.nivelVisto = n;
    const nuevas = ZONAS.filter((z) => z.nivel === n).map((z) => z.nombre);
    sonido("bien");
    this.celebrar(`¡Nivel ${n}!`, nuevas.length ? `Se abre: ${nuevas.join(", ")}` : "Sigue así");
  }

  async hablarCon(p: PersonajeId) {
    await historia.hablar(this, p);
    const lugar = PERSONAJES[p].lugar;
    if (!this.ocupado && this.lugarActual === lugar) this.abrirLugar(lugar);
  }

  /* ── HUD ──────────────────────────────────────────────────────────── */

  private barra() {
    const boton = (icono: Parameters<typeof iconoSvg>[0], texto: string, fn: () => void, principal = false) =>
      h("button", { class: principal ? "principal" : "", onclick: () => !this.mundo.andando && !this.mundo.enBus && fn(), "aria-label": texto },
        h("span", { class: "bola relieve" }, html(iconoSvg(icono, principal ? 34 : 26))), texto);
    this.botonMovil = boton("movil", "InfoLinense", () => abrirMovil(this));
    this.botonVecinos = boton("gente", "Vecinos", () => abrirVecinos(this));
    return h(
      "nav", { class: "dock" },
      boton("mochila", "Mochila", () => abrirMochila(this)),
      boton("diario", "Diario", () => abrirDiario(this)),
      boton("bus", "Autobús", () => this.abrirBus(), true),
      boton("casa", "Hogar", () => void import("./ui/hogar").then((m) => m.abrirHogar(this))),
      this.botonMovil,
      this.botonVecinos,
    );
  }

  refrescar() {
    const e = this.e;
    const pasoXP = Number(e.flags.pasoXP ?? 0);
    if (e.paso > pasoXP) {
      ganarXP(e, (e.paso - pasoXP) * 6);
      e.flags.pasoXP = e.paso;
    }
    this.revisarNivel();
    this.refrescarHud();
    const obj = historia.objetivo(e);
    this.objetivoEl.replaceChildren(
      h("span", { class: "icono" }, html(iconoSvg("objetivo", 22))),
      h("div", {}, h("small", {}, obj.titulo.toUpperCase()), h("span", {}, obj.texto)),
    );
    this.objetivoEl.style.display = this.ocupado || this.mundo.enBus ? "none" : "";
    this.mundo.objetivo = obj.lugar ?? null;
    this.mundo.sincronizar(e);
    const n = sinLeer(e);
    this.botonMovil.querySelector(".punto")?.remove();
    if (n > 0) this.botonMovil.querySelector(".bola")!.append(h("span", { class: "punto" }, n));
    guardar(e);
  }

  private dineroVisto = -1;
  private xpVisto = -1;
  private refrescarHud() {
    const e = this.e;
    const necesidad = (icono: IconoJuego, nombre: string, v: number) =>
      h("button", { class: `necesidad${v < 25 ? " baja" : ""}`, style: `--v:${Math.round(v)}`, title: `${nombre}: ${Math.round(v)}%`, "aria-label": `${nombre} ${Math.round(v)}%`, onclick: () => this.aviso(`<b>${nombre}</b> ${Math.round(v)}%`) },
        h("span", { class: "anillo", html: iconoJuego(icono, 18) }), h("span", { class: "valor" }, Math.round(v)));
    const n = nivel(e);
    const sig = NIVELES[n] ?? NIVELES[NIVELES.length - 1];
    const sube = this.dineroVisto >= 0 && e.dinero > this.dineroVisto;
    const subeXP = this.xpVisto >= 0 && (e.xp ?? 0) > this.xpVisto;
    const dinero = h("span", { class: `pill dinero${sube ? " sube" : ""}` }, h("span", { class: "moneda", html: iconoJuego("moneda", 24) }), String(e.dinero));
    if (sube) this.volar("moneda", e.dinero - this.dineroVisto, ".pill.dinero");
    if (subeXP) this.volar("estrella", (e.xp ?? 0) - this.xpVisto, ".avatar");
    this.dineroVisto = e.dinero;
    this.xpVisto = e.xp ?? 0;
    this.hud.replaceChildren(
      h(
        "div", { class: "perfil" },
        h("button", { class: `avatar${subeXP ? " brilla" : ""}`, "aria-label": "Tu diario", onclick: () => !this.mundo.andando && abrirDiario(this), html: retrato({ piel: e.piel, pelo: "#2B1B12", ropa: e.ropa }) }, h("span", { class: "estrella" }, n)),
        h("div", { class: "perfil-datos" }, h("b", {}, e.nombre), h("div", { class: "xp" }, h("i", { style: `width:${Math.round(progresoNivel(e) * 100)}%` }), h("span", {}, `${e.xp ?? 0} / ${sig} XP`))),
      ),
      h("span", { class: "espacio" }),
      h(
        "div", { class: "recursos" },
        dinero,
        h("button", { class: `pill${e.viento === "levanteFuerte" ? " rosa" : ""}`, onclick: () => this.verTiempo(), "aria-label": "Hora y tiempo" }, h("span", { class: "reloj", html: iconoJuego("reloj", 22) }), `Día ${e.dia} · ${hora(e)}`),
        h("span", { class: "pill fina", title: "Jugadores conectados" }, h("span", { class: "reloj", html: iconoJuego("gente", 20) }), `${con.remotos.length + 1} en línea`),
      ),
      h("button", { class: "ajustes relieve", "aria-label": "Ajustes", onclick: () => !this.mundo.andando && abrirMenu(this) }, html(iconoSvg("ajustes", 20))),
    );
    this.necesidadesEl.replaceChildren(
      necesidad("rayo", "Energía", e.energia), necesidad("cubiertos", "Comida", e.comida), necesidad("cara", "Ánimo", e.animo), necesidad("gente", "Gente", e.social),
    );
  }

  /** Monedas o estrellas que vuelan hasta su contador al ganar algo. */
  private volar(icono: IconoJuego, cantidad: number, destinoSel: string) {
    const destino = this.raiz.querySelector(destinoSel)?.getBoundingClientRect();
    const raiz = this.raiz.getBoundingClientRect();
    if (!destino) return;
    const n = Math.min(8, Math.max(2, Math.round(cantidad / 2)));
    for (let i = 0; i < n; i++) {
      const x0 = raiz.width / 2 + (Math.random() - 0.5) * 90;
      const y0 = raiz.height * 0.5 + (Math.random() - 0.5) * 60;
      const el = h("span", { class: "volador", html: iconoJuego(icono, 26), style: `left:${x0}px;top:${y0}px;--dx:${destino.left - raiz.left + destino.width / 2 - x0}px;--dy:${destino.top - raiz.top + destino.height / 2 - y0}px;animation-delay:${i * 0.06}s` });
      this.raiz.append(el);
      setTimeout(() => el.remove(), 1100 + i * 60);
    }
  }

  /** Celebración a pantalla completa (subida de nivel). */
  celebrar(titulo: string, texto: string) {
    const colores = ["#C4E910", "#FF1254", "#1F5EFF", "#FFFFFF", "#FFD23F"];
    const c = h("div", { class: "celebracion", "aria-live": "polite" }, h("div", {}, h("b", {}, titulo), h("span", {}, texto)));
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const d = 120 + Math.random() * 140;
      c.append(h("i", { style: `background:${colores[i % 5]};--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d + 120}px;animation-delay:${Math.random() * 0.2}s` }));
    }
    this.raiz.append(c);
    setTimeout(() => c.remove(), 2800);
  }

  /** Ficha de un edificio cualquiera de la ciudad, con la opción de ir andando. */
  private abrirEdificio(f: FichaEdificio) {
    sonido("toque");
    const fila = (icono: IconoJuego, titulo: string, valor: string) =>
      h("div", { class: "dato-ficha" }, h("span", { class: "ico", html: iconoJuego(icono, 26) }), h("span", {}, h("small", {}, titulo), h("b", {}, valor)));
    const panel = this.bandeja(f.barrio.toUpperCase() || "LA LÍNEA", f.tipo, () => [
      h("div", { class: "ficha-edificio" },
        fila("calle", "Calle", f.calle || "Sin nombre"),
        fila("plantas", "Plantas", String(f.plantas)),
        fila(f.comercio ? "tienda" : "edificio", "Uso", f.comercio ? "Viviendas con comercio" : f.tipo),
      ),
      this.boton({ icono: html(iconoJuego("ir", 26)), titulo: "Ir hasta aquí", sub: `Andando por ${f.calle || "las calles"}`, fn: () => this.irAPunto(f.punto) }),
      /vivienda|casa/i.test(f.tipo) || f.comercio || f.plantas > 1
        ? this.boton({ icono: html(iconoJuego("edificio", 26)), titulo: "Viviendas en este edificio", sub: "Hogar Linense: precios, planos y visitas", fn: () => void import("./ui/hogar").then((m) => m.abrirHogar(this, { edificio: f.idx })) })
        : null,
    ]);
    void panel;
    // Sin repintado, pero el mapa sigue respondiendo para tocar otro edificio.
    this.vivo = () => {};
  }

  /** Va andando hasta el nodo de calle más cercano a un punto del mapa. */
  irAPunto(p: Punto) {
    if (this.mundo.andando || this.mundo.enBus) return;
    const destino = nodoCercano(p);
    if (!destino || destino === this.e.nodo) return;
    const zona = ZONAS.find((z) => z.zonas.some(([x0, y0, x1, y1]) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1));
    if (zona && !this.zonaAbierta(zona)) {
      this.cerrar();
      this.avisoZona(zona);
      return;
    }
    this.cerrar();
    const r = ruta(this.e.nodo, destino);
    sonido("paso");
    this.objetivoEl.style.display = "none";
    this.mundo.andar(r.puntos, () => {
      this.e.nodo = destino;
      this.refrescar();
    });
  }

  /* ── Autobús urbano: de parada en parada por las calles reales ─────── */

  abrirBus() {
    const aqui = this.lugarActual;
    const paradas = (Object.keys(LUGARES) as LugarId[]).filter((l) => l !== aqui);
    this.hoja(
      "MOVILIDAD", "Autobús urbano",
      h("div", { class: "linea-bus" }, h("b", {}, "L1"), h("span", {}, "Recorre La Línea por sus calles. Billete: ", h("strong", {}, "1 €"), ". Mira la ciudad por la ventanilla.")),
      h("div", { class: "paradas" }, ...paradas.map((l) => {
        const zona = zonaDeLugar(l);
        const cerrada = zona && !this.zonaAbierta(zona) ? `Se abre en el nivel ${zona.nivel}` : false;
        const b = this.boton({
          icono: LUGARES[l].icono, titulo: LUGARES[l].nombre, sub: LUGARES[l].descripcion, precio: "1 €",
          desactivada: cerrada || (this.e.dinero < 1 ? "No tienes 1 € para el billete" : false),
          fn: () => this.viajarEnBus(l),
        });
        b.classList.add("parada");
        return b;
      })),
    );
  }

  async viajarEnBus(lugar: LugarId) {
    if (this.e.dinero < 1 || this.mundo.andando || this.mundo.enBus) return;
    const destino = LUGARES[lugar].nodo;
    this.cerrar();
    if (!(await pagar(this.e, 1, "billete", `Autobús a ${LUGARES[lugar].nombre}`))) return;
    const r = ruta(this.e.nodo, destino);
    sonido("bien");
    const cartel = h("div", { class: "en-bus", role: "status" }, html(iconoSvg("bus", 18)), `Próxima parada: ${LUGARES[lugar].nombre}`);
    this.raiz.append(cartel);
    this.objetivoEl.style.display = "none";
    this.mundo.viajarEnBus(r.puntos, () => {
      cartel.remove();
      this.llegar(lugar);
    });
    this.refrescarHud();
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
    this.mundo.seleccionar(null);
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
    if (this.mundo.andando || this.mundo.enBus) return;
    const destino = LUGARES[lugar].nodo;
    if (destino === this.e.nodo) {
      (despues ?? (() => this.abrirLugar(lugar)))();
      return;
    }
    if (this.ocupado) this.cerrar();
    const zona = zonaDeLugar(lugar);
    if (zona && !this.zonaAbierta(zona)) {
      this.avisoZona(zona);
      return;
    }
    const r = ruta(this.e.nodo, destino);
    this.objetivoEl.style.display = "none";
    sonido("paso");
    this.mundo.andar(r.puntos, () => this.llegar(lugar, despues));
  }

  private async llegar(lugar: LugarId, despues?: () => void) {
    this.e.nodo = LUGARES[lugar].nodo;
    this.refrescar();
    await historia.alLlegar(this, lugar);
    if (this.ocupado) return;
    (despues ?? (() => this.abrirLugar(lugar)))();
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

