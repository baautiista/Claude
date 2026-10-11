import { AlmacenMemoria } from "../compartido/almacen.ts";
import { registrarModulos } from "../compartido/modulos.ts";
import { ErrorJuego, Servicio, type Contexto } from "../compartido/servicio.ts";
import type { Vecino } from "../mundo/mundo";
import { red } from "../red";

/**
 * Conexión del cliente con la autoridad del juego.
 *
 * - Modo «servidor»: WebSocket con el servidor de Mi Línea (mismo origen o
 *   `?servidor=wss://…`). Cuentas reales, multijugador y economía validada.
 *   Si se corta, reconecta y recupera la sesión sola.
 * - Modo «local»: el mismo servicio corre en el navegador sobre localStorage
 *   (enlace de claude.ai o sin red). Presencia por la sala de claude.ai o entre
 *   pestañas.
 */

export interface JugadorRemoto {
  id: string;
  nombre: string;
  ropa: string;
  piel: string;
  nivel: number;
  x: number;
  y: number;
  r: number;
  anim: string;
  gesto: string;
}

export interface Perfil {
  id: string;
  usuario: string;
  nombre: string;
  ropa: string;
  piel: string;
  dinero: number;
  xp: number;
  nivel: number;
}

type Oyente = (ev: Record<string, unknown>) => void;

const CLAVE_TOKEN = "mi-linea-token";
const CLAVE_LOCAL = "mi-linea-autoridad";
const leerLS = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const escribirLS = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento */
  }
};

/** Almacén local persistente (localStorage) para el modo sin servidor. */
class AlmacenLocal extends AlmacenMemoria {
  constructor() {
    super();
    const raw = leerLS(CLAVE_LOCAL);
    if (raw) {
      try {
        const obj = JSON.parse(raw) as Record<string, Record<string, string>>;
        for (const [col, filas] of Object.entries(obj)) this.datos.set(col as never, new Map(Object.entries(filas)));
      } catch {
        /* datos corruptos: se empieza de cero */
      }
    }
  }
  protected persistir() {
    const obj: Record<string, Record<string, string>> = {};
    for (const [col, filas] of this.datos) obj[col] = Object.fromEntries(filas);
    escribirLS(CLAVE_LOCAL, JSON.stringify(obj));
  }
}

const aleatorio = (n: number) => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/[+/=]/g, (c) => (c === "+" ? "-" : c === "/" ? "_" : ""));
};

async function pbkdf2(clave: string, sal: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sal), iterations: 120000 }, k, 256);
  return [...new Uint8Array(bits)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export class Conexion {
  modo: "servidor" | "local" = "local";
  perfil: Perfil | null = null;
  jugador: string | null = null;
  sala = "La Línea 1";
  escena = "ciudad";
  conectado = false;
  /** Jugadores de mi escena (última foto del servidor). */
  remotos: JugadorRemoto[] = [];
  private ws: WebSocket | null = null;
  private url = "";
  private n = 0;
  private pendientes = new Map<number, { ok: (v: unknown) => void; ko: (e: Error) => void; op: string; args: unknown }>();
  private oyentes = new Map<string, Set<Oyente>>();
  private servicio: Servicio | null = null;
  private modulosLocales: ReturnType<typeof registrarModulos> | null = null;
  private intentos = 0;
  private canal: BroadcastChannel | null = null;

  /** Decide el modo: servidor si responde, local si no. */
  async iniciar() {
    const param = new URLSearchParams(location.search).get("servidor");
    const base = param ?? (location.protocol.startsWith("http") ? location.origin : "");
    if (base) {
      // Tres intentos: con el equipo ocupado (carga de la ciudad) la primera respuesta puede tardar.
      for (let intento = 0; intento < 3; intento++) {
        try {
          const r = await Promise.race([
            fetch(`${base.replace(/^ws/, "http")}/api/salud`, { cache: "no-store" }),
            new Promise<never>((_, ko) => setTimeout(() => ko(new Error("tiempo")), 3000 + intento * 2000)),
          ]);
          if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) break;
          const salud = (await r.json()) as { servidor?: string };
          if (salud?.servidor !== "mi-linea") break;
          this.modo = "servidor";
          this.url = `${base.replace(/^http/, "ws")}/ws`;
          await this.abrir();
          return;
        } catch {
          /* se reintenta; si no responde, modo local */
        }
      }
    }
    this.iniciarLocal();
  }

  get haySesionGuardada() {
    return !!leerLS(CLAVE_TOKEN);
  }

  /* ── Modo servidor ──────────────────────────────────────────────── */

  private abrir() {
    return new Promise<void>((ok) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = async () => {
        this.conectado = true;
        this.intentos = 0;
        this.emitir("conexion", { conectado: true });
        // Reconexión: se recupera la sesión y la sala/escena.
        const token = leerLS(CLAVE_TOKEN);
        if (token) {
          try {
            await this.reanudar(token);
            if (this.sala !== "La Línea 1") await this.llamar("unirseSala", { sala: this.sala });
            if (this.escena !== "ciudad") await this.llamar("escena", { escena: this.escena }).catch(() => (this.escena = "ciudad"));
          } catch {
            escribirLS(CLAVE_TOKEN, null);
          }
        }
        ok();
      };
      ws.onmessage = (e) => this.recibir(JSON.parse(String(e.data)));
      ws.onclose = () => {
        this.conectado = false;
        this.emitir("conexion", { conectado: false });
        for (const p of this.pendientes.values()) p.ko(new ErrorJuego("red", "Conexión perdida."));
        this.pendientes.clear();
        const espera = Math.min(15000, 500 * 2 ** this.intentos++);
        setTimeout(() => void this.abrir(), espera);
        ok();
      };
    });
  }

  private recibir(m: Record<string, unknown>) {
    if (typeof m.id === "number") {
      const p = this.pendientes.get(m.id);
      if (!p) return;
      this.pendientes.delete(m.id);
      if (m.ok) p.ok(m.res);
      else p.ko(new ErrorJuego(String(m.codigo), String(m.error)));
      return;
    }
    if (m.t === "jugadores") {
      this.remotos = m.lista as JugadorRemoto[];
      this.emitir("jugadores", m);
      return;
    }
    if (m.t === "saldo" && this.perfil) this.perfil.dinero = Number(m.dinero);
    if (m.t === "teletransporte") {
      this.sala = String(m.sala);
      this.escena = String(m.escena);
    }
    this.emitir(String(m.t), m);
  }

  /* ── Modo local ─────────────────────────────────────────────────── */

  private iniciarLocal() {
    this.modo = "local";
    this.servicio = new Servicio({
      almacen: new AlmacenLocal(),
      hash: pbkdf2,
      aleatorio,
      avisar: (j, ev) => {
        if (j === this.jugador) setTimeout(() => this.recibir(ev), 0);
      },
    });
    this.modulosLocales = registrarModulos(this.servicio);
    this.conectado = true;
    // Presencia: sala de claude.ai o pestañas del mismo navegador (sistema anterior).
    void red.iniciar().then(() => this.emitir("conexion", { conectado: true }));
    red.onCambio = () => {
      this.remotos = red.vecinos().map((v) => ({ id: v.id, nombre: v.nombre, ropa: v.ropa, piel: v.piel, nivel: v.nivel, x: v.x, y: v.y, r: 0, anim: "quieto", gesto: v.emote ?? "" }));
      this.emitir("jugadores", { lista: this.remotos });
    };
    if ("BroadcastChannel" in window) {
      this.canal = new BroadcastChannel("mi-linea-chat");
      this.canal.onmessage = (ev) => {
        const d = ev.data as Record<string, unknown>;
        if (d?.t === "chat" && typeof d.texto === "string") this.emitir("chat", { ...d, texto: String(d.texto).slice(0, 200) });
      };
    }
  }

  /** En local hay una cuenta por navegador, creada sin pedir datos. */
  async cuentaLocal(nombre: string, ropa: string, piel: string, dineroPrevio?: number) {
    const s = this.servicio!;
    const token = leerLS(CLAVE_TOKEN);
    if (token) {
      try {
        return await this.reanudar(token);
      } catch {
        /* se crea otra */
      }
    }
    const r = await s.registrar({ usuario: `local-${aleatorio(4).toLowerCase().replace(/[^a-z0-9]/g, "x")}`, clave: aleatorio(12), nombre, ropa, piel });
    // Partidas anteriores al servidor: se respeta el dinero que ya tenían.
    if (dineroPrevio !== undefined && dineroPrevio !== r.perfil.dinero) {
      s.bd.transaccion(() => s.mover(r.jugador, Math.round(dineroPrevio - r.perfil.dinero), "migracion", "Saldo de la partida anterior"));
    }
    this.fijarSesion(r.token, r.jugador, s.perfil(r.jugador));
    return this.perfil!;
  }

  /* ── API común ──────────────────────────────────────────────────── */

  llamar<T = unknown>(op: string, args: Record<string, unknown> = {}): Promise<T> {
    if (this.modo === "local") return this.llamarLocal<T>(op, args);
    return new Promise<T>((ok, ko) => {
      if (!this.ws || this.ws.readyState !== 1) return ko(new ErrorJuego("red", "Sin conexión con el servidor. Reintentando…"));
      const id = ++this.n;
      this.pendientes.set(id, { ok: ok as (v: unknown) => void, ko, op, args });
      this.ws.send(JSON.stringify({ id, op, args }));
    });
  }

  private async llamarLocal<T>(op: string, args: Record<string, unknown>): Promise<T> {
    const s = this.servicio!;
    const ctx: Contexto = { jugador: this.jugador };
    const m = this.modulosLocales!;
    if (op in m.ops) return (await m.ops[op](ctx, args, { escena: this.escena, aviso: (ev) => this.recibir(ev) })) as T;
    switch (op) {
      case "salas": return [{ nombre: "Esta partida", jugadores: 1, capacidad: 1 }] as T;
      case "unirseSala": return { sala: this.sala } as T;
      case "cercanos": return this.remotos.map((r) => ({ ...r, distancia: 0, amigo: false })) as T;
      case "enLinea": return [] as T;
      case "escena": {
        const escena = String(args.escena ?? "ciudad");
        if (escena !== "ciudad") m.puedeEntrar(this.jugador!, escena);
        this.escena = escena;
        return { escena } as T;
      }
    }
    const f = (s as unknown as Record<string, (c: Contexto, a: unknown) => unknown>)[op];
    if (typeof f !== "function") throw new ErrorJuego("op", "Operación desconocida.");
    return (await f.call(s, ctx, args)) as T;
  }

  private fijarSesion(token: string, jugador: string, perfil: Perfil) {
    escribirLS(CLAVE_TOKEN, token);
    this.jugador = jugador;
    this.perfil = perfil;
    this.emitir("sesion", { perfil });
  }

  async registrar(usuario: string, clave: string, nombre: string, ropa: string, piel: string) {
    const r = await this.llamar<{ token: string; jugador: string; perfil: Perfil }>("registrar", { usuario, clave, nombre, ropa, piel });
    this.fijarSesion(r.token, r.jugador, r.perfil);
    return r.perfil;
  }

  async entrar(usuario: string, clave: string) {
    const r = await this.llamar<{ token: string; jugador: string; perfil: Perfil }>("entrar", { usuario, clave });
    this.fijarSesion(r.token, r.jugador, r.perfil);
    return r.perfil;
  }

  private async reanudar(token: string) {
    const r = this.modo === "local" ? this.servicio!.reanudar(token) : await this.llamar<{ jugador: string; perfil: Perfil }>("reanudar", { token });
    this.fijarSesion(token, r.jugador, r.perfil);
    return r.perfil;
  }

  /** Recupera la sesión guardada (al abrir el juego). */
  async sesionGuardada() {
    const token = leerLS(CLAVE_TOKEN);
    if (!token) return null;
    if (this.perfil) return this.perfil;
    try {
      return await this.reanudar(token);
    } catch {
      escribirLS(CLAVE_TOKEN, null);
      return null;
    }
  }

  async salir() {
    await this.llamar("salir").catch(() => {});
    escribirLS(CLAVE_TOKEN, null);
    this.perfil = null;
    this.jugador = null;
  }

  /* ── Tiempo real ────────────────────────────────────────────────── */

  private ultimoMov = "";
  mover(x: number, y: number, r: number, anim: string, datos: { nombre: string; ropa: string; piel: string; nivel: number; gesto?: string; gestoT?: number }) {
    if (this.modo === "local") {
      red.publicar({ nombre: datos.nombre, ropa: datos.ropa, piel: datos.piel, nivel: datos.nivel, x, y, emote: datos.gesto as never, emoteT: datos.gestoT });
      return;
    }
    const clave = `${Math.round(x)},${Math.round(y)},${anim},${Math.round(r * 10)}`;
    if (clave === this.ultimoMov || !this.ws || this.ws.readyState !== 1) return;
    this.ultimoMov = clave;
    this.ws.send(JSON.stringify({ t: "mov", x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r: Math.round(r * 100) / 100, anim }));
  }

  gesto(g: string) {
    if (this.modo === "servidor") this.ws?.send(JSON.stringify({ t: "gesto", g }));
  }

  chat(texto: string) {
    const limpio = texto.trim().slice(0, 200);
    if (!limpio) return;
    if (this.modo === "servidor") this.ws?.send(JSON.stringify({ t: "chat", texto: limpio }));
    else {
      const ev = { t: "chat", de: this.jugador, nombre: this.perfil?.nombre ?? "Tú", texto: limpio, hora: Date.now() };
      this.canal?.postMessage(ev);
      this.emitir("chat", ev);
    }
  }

  /** Mensaje de tiempo real de un módulo (p. ej. reformas en cooperativo). */
  modulo(m: Record<string, unknown>) {
    if (this.modo === "servidor") this.ws?.send(JSON.stringify({ ...m, t: "mod" }));
  }

  /** Para el mundo 3D. */
  vecinos(): Vecino[] {
    return this.remotos.map((r) => ({ id: r.id, nombre: r.nombre, ropa: r.ropa, piel: r.piel, nivel: r.nivel, x: r.x, y: r.y, r: r.r, anim: r.anim, emote: r.gesto || undefined }));
  }

  /* ── Eventos ────────────────────────────────────────────────────── */

  on(evento: string, fn: Oyente) {
    if (!this.oyentes.has(evento)) this.oyentes.set(evento, new Set());
    this.oyentes.get(evento)!.add(fn);
    return () => this.oyentes.get(evento)!.delete(fn);
  }

  private emitir(evento: string, datos: Record<string, unknown>) {
    for (const f of this.oyentes.get(evento) ?? []) f(datos);
    for (const f of this.oyentes.get("*") ?? []) f({ ...datos, evento });
  }
}

export const con = new Conexion();
