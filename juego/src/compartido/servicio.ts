import type { Almacen } from "./almacen.ts";

/**
 * Lógica de autoridad del juego. La ejecuta el servidor (servidor/index.ts) y,
 * sin conexión, una copia local en el navegador. El cliente nunca fija su saldo
 * ni el resultado de una compra: pide la operación y recibe el resultado.
 *
 * Fase 1: cuentas y sesiones, partidas guardadas, economía con libro de
 * operaciones, amigos, bloqueos, denuncias, mensajes privados, invitaciones,
 * ranking y mercadillo con pago verificado.
 */

export const DINERO_INICIAL = 39;
const SESION_MS = 30 * 24 * 3600 * 1000;
const DIA_MS = 24 * 3600 * 1000;

export class ErrorJuego extends Error {
  codigo: string;
  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}
const fallo = (codigo: string, mensaje: string): never => {
  throw new ErrorJuego(codigo, mensaje);
};

export interface Jugador {
  usuario: string;
  nombre: string;
  ropa: string;
  piel: string;
  dinero: number;
  xp: number;
  nivel: number;
  creado: number;
  ultimo: number;
  rol: "jugador" | "admin";
  suspendido?: boolean;
}

export interface Operacion {
  jugador: string;
  cantidad: number;
  saldo: number;
  motivo: string;
  detalle: string;
  t: number;
}

export interface Amistad {
  a: string;
  b: string;
  de: string;
  estado: "pendiente" | "aceptada";
  t: number;
}

export interface Mensaje {
  de: string;
  a: string;
  texto: string;
  t: number;
  leido: boolean;
}

export interface Invitacion {
  de: string;
  a: string;
  tipo: "unirse" | "visita";
  /** Escena a la que se invita: "ciudad" o "casa:<inmueble>". */
  escena: string;
  x: number;
  y: number;
  t: number;
  caduca: number;
  estado: "pendiente" | "aceptada" | "rechazada";
}

export interface Contexto {
  jugador: string | null;
}

export type Aviso = (jugador: string, evento: Record<string, unknown>) => void;

/**
 * Ingresos de actividades que se simulan en el cliente (cosechas, puesto,
 * encargos…): el servidor solo acepta motivos conocidos, con tope por operación
 * y por día. Los gastos se aceptan si hay saldo.
 */
export const INGRESOS: Record<string, { max: number; dia: number }> = {
  venta: { max: 120, dia: 600 },
  puesto: { max: 300, dia: 800 },
  encargo: { max: 80, dia: 300 },
  jornada: { max: 60, dia: 120 },
  historia: { max: 50, dia: 100 },
};
export const GASTOS = new Set(["semillas", "billete", "compra", "historia", "cocina", "barca"]);

const limpiarTexto = (s: unknown, max: number) =>
  typeof s === "string" ? s.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max) : "";
const color = (v: unknown, def: string) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : def);
const entero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : NaN);
const parId = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export interface Dependencias {
  almacen: Almacen;
  ahora?: () => number;
  /** Deriva la clave (scrypt en el servidor, PBKDF2 en el navegador). */
  hash: (clave: string, sal: string) => Promise<string>;
  aleatorio: (bytes: number) => string;
  avisar?: Aviso;
}

export class Servicio {
  readonly bd: Almacen;
  private ahora: () => number;
  private hash: Dependencias["hash"];
  private aleatorio: Dependencias["aleatorio"];
  avisar: Aviso;
  private contador = 0;

  constructor(d: Dependencias) {
    this.bd = d.almacen;
    this.ahora = d.ahora ?? (() => Date.now());
    this.hash = d.hash;
    this.aleatorio = d.aleatorio;
    this.avisar = d.avisar ?? (() => {});
  }

  nuevoId(prefijo: string) {
    return `${prefijo}${this.ahora().toString(36)}${(this.contador++).toString(36)}${this.aleatorio(4)}`;
  }

  /* ── Cuentas y sesiones ─────────────────────────────────────────── */

  async registrar(args: { usuario: unknown; clave: unknown; nombre?: unknown; ropa?: unknown; piel?: unknown }) {
    const usuario = limpiarTexto(args.usuario, 24).toLowerCase();
    const clave = typeof args.clave === "string" ? args.clave : "";
    if (!/^[a-z0-9_.ñ-]{3,24}$/.test(usuario)) fallo("usuario", "El usuario debe tener de 3 a 24 letras, números, punto o guion.");
    if (clave.length < 6 || clave.length > 128) fallo("clave", "La contraseña debe tener al menos 6 caracteres.");
    if (this.bd.leer("usuarios", usuario)) fallo("existe", "Ese usuario ya existe.");
    const sal = this.aleatorio(16);
    const hash = await this.hash(clave, sal);
    const id = this.nuevoId("j");
    const t = this.ahora();
    const nombre = limpiarTexto(args.nombre, 16) || usuario;
    this.bd.transaccion(() => {
      if (this.bd.leer("usuarios", usuario)) fallo("existe", "Ese usuario ya existe.");
      this.bd.escribir("usuarios", usuario, { jugador: id, sal, hash, creado: t });
      const j: Jugador = { usuario, nombre, ropa: color(args.ropa, "#C4E910"), piel: color(args.piel, "#E8B796"), dinero: 0, xp: 0, nivel: 1, creado: t, ultimo: t, rol: "jugador" };
      this.bd.escribir("jugadores", id, j);
      this.mover(id, DINERO_INICIAL, "alta", "Dinero inicial");
    });
    return this.abrirSesion(id);
  }

  async entrar(args: { usuario: unknown; clave: unknown }) {
    const usuario = limpiarTexto(args.usuario, 24).toLowerCase();
    const u = this.bd.leer<{ jugador: string; sal: string; hash: string }>("usuarios", usuario);
    const clave = typeof args.clave === "string" ? args.clave : "";
    // Siempre se calcula el hash para no revelar si el usuario existe por el tiempo.
    const hash = await this.hash(clave, u?.sal ?? "sal-falsa");
    if (!u || hash !== u.hash) fallo("credenciales", "Usuario o contraseña incorrectos.");
    const j = this.bd.leer<Jugador>("jugadores", u!.jugador);
    if (j?.suspendido) fallo("suspendido", "Esta cuenta está suspendida.");
    return this.abrirSesion(u!.jugador);
  }

  private abrirSesion(jugador: string) {
    const token = this.aleatorio(24);
    this.bd.escribir("sesiones", token, { jugador, caduca: this.ahora() + SESION_MS });
    return { token, jugador, perfil: this.perfil(jugador) };
  }

  /** Recupera una sesión guardada (reconexión o vuelta al juego). */
  reanudar(token: unknown) {
    if (typeof token !== "string") fallo("sesion", "Sesión no válida.");
    const s = this.bd.leer<{ jugador: string; caduca: number }>("sesiones", token as string);
    if (!s || s.caduca < this.ahora()) fallo("sesion", "La sesión ha caducado. Vuelve a entrar.");
    const j = this.bd.leer<Jugador>("jugadores", s!.jugador);
    if (!j || j.suspendido) fallo("sesion", "Cuenta no disponible.");
    j!.ultimo = this.ahora();
    this.bd.escribir("jugadores", s!.jugador, j);
    return { jugador: s!.jugador, perfil: this.perfil(s!.jugador) };
  }

  cerrarSesion(token: string) {
    this.bd.borrar("sesiones", token);
  }

  perfil(id: string) {
    const j = this.jugador(id);
    return { id, usuario: j.usuario, nombre: j.nombre, ropa: j.ropa, piel: j.piel, dinero: j.dinero, xp: j.xp, nivel: j.nivel };
  }

  jugador(id: string) {
    return this.bd.leer<Jugador>("jugadores", id) ?? fallo("jugador", "Jugador inexistente.");
  }

  /** Cambia el aspecto o el nombre visible. */
  aspecto(ctx: Contexto, args: { nombre?: unknown; ropa?: unknown; piel?: unknown }) {
    const id = this.yo(ctx);
    const j = this.jugador(id);
    const nombre = limpiarTexto(args.nombre, 16);
    if (nombre) j.nombre = nombre;
    j.ropa = color(args.ropa, j.ropa);
    j.piel = color(args.piel, j.piel);
    this.bd.escribir("jugadores", id, j);
    return this.perfil(id);
  }

  yo(ctx: Contexto) {
    return ctx.jugador ?? fallo("sesion", "Tienes que entrar con tu cuenta.");
  }

  /* ── Partida guardada ───────────────────────────────────────────── */

  guardarPartida(ctx: Contexto, args: { partida: unknown }) {
    const id = this.yo(ctx);
    const texto = JSON.stringify(args.partida ?? null);
    if (texto.length > 400_000) fallo("partida", "Partida demasiado grande.");
    const p = args.partida as { xp?: unknown; nombre?: unknown; ropa?: unknown; piel?: unknown } | null;
    this.bd.transaccion(() => {
      this.bd.escribir("partidas", id, { datos: texto, t: this.ahora() });
      const j = this.jugador(id);
      const xp = entero(p?.xp);
      if (xp >= 0) {
        // La experiencia solo sube, y como mucho 120 puntos por guardado.
        j.xp = Math.max(j.xp, Math.min(xp, j.xp + 120));
        j.nivel = nivelDe(j.xp);
      }
      if (p?.ropa) j.ropa = color(p.ropa, j.ropa);
      if (p?.piel) j.piel = color(p.piel, j.piel);
      this.bd.escribir("jugadores", id, j);
    });
    return { ok: true, t: this.ahora() };
  }

  cargarPartida(ctx: Contexto) {
    const id = this.yo(ctx);
    const p = this.bd.leer<{ datos: string; t: number }>("partidas", id);
    return { partida: p ? JSON.parse(p.datos) : null, dinero: this.jugador(id).dinero, xp: this.jugador(id).xp };
  }

  /* ── Economía ───────────────────────────────────────────────────── */

  /** Único punto que cambia el saldo. Debe llamarse dentro de una transacción. */
  mover(jugador: string, cantidad: number, motivo: string, detalle: string) {
    if (!Number.isInteger(cantidad)) fallo("cantidad", "Cantidad no válida.");
    const j = this.jugador(jugador);
    if (j.dinero + cantidad < 0) fallo("saldo", "No tienes dinero suficiente.");
    j.dinero += cantidad;
    this.bd.escribir("jugadores", jugador, j);
    const op: Operacion = { jugador, cantidad, saldo: j.dinero, motivo, detalle: detalle.slice(0, 120), t: this.ahora() };
    this.bd.escribir("operaciones", this.nuevoId("o"), op);
    this.avisar(jugador, { t: "saldo", dinero: j.dinero, cantidad, motivo });
    return j.dinero;
  }

  /** Ingresos y gastos de las actividades locales, con topes del servidor. */
  movimiento(ctx: Contexto, args: { motivo: unknown; cantidad: unknown; detalle?: unknown }) {
    const id = this.yo(ctx);
    const motivo = limpiarTexto(args.motivo, 20);
    const cantidad = entero(args.cantidad);
    if (!Number.isInteger(cantidad) || cantidad === 0) fallo("cantidad", "Cantidad no válida.");
    const detalle = limpiarTexto(args.detalle, 80);
    return this.bd.transaccion(() => {
      if (cantidad > 0) {
        const regla = INGRESOS[motivo] ?? fallo("motivo", "Ingreso no reconocido.");
        if (cantidad > regla.max) fallo("tope", "Ingreso por encima del máximo permitido.");
        const hoy = this.sumaDesde(id, motivo, this.ahora() - DIA_MS);
        if (hoy + cantidad > regla.dia) fallo("tope", "Has llegado al máximo de ingresos de hoy por esta actividad.");
      } else if (!GASTOS.has(motivo)) fallo("motivo", "Gasto no reconocido.");
      return { dinero: this.mover(id, cantidad, motivo, detalle) };
    });
  }

  private sumaDesde(jugador: string, motivo: string, desde: number) {
    return this.bd
      .listar<Operacion>("operaciones", (o) => o.jugador === jugador && o.motivo === motivo && o.t >= desde && o.cantidad > 0)
      .reduce((s, o) => s + o.cantidad, 0);
  }

  saldo(ctx: Contexto) {
    return { dinero: this.jugador(this.yo(ctx)).dinero };
  }

  historial(ctx: Contexto) {
    const id = this.yo(ctx);
    return this.bd.listar<Operacion>("operaciones", (o) => o.jugador === id).sort((a, b) => b.t - a.t).slice(0, 50);
  }

  /** Transferencia entre jugadores (regalos, pagos de encargos). */
  transferir(ctx: Contexto, args: { a: unknown; cantidad: unknown; concepto?: unknown }) {
    const id = this.yo(ctx);
    const a = String(args.a ?? "");
    const cantidad = entero(args.cantidad);
    if (!(cantidad > 0 && cantidad <= 5000)) fallo("cantidad", "Cantidad no válida.");
    if (a === id) fallo("destino", "No puedes enviarte dinero a ti.");
    this.jugador(a);
    const concepto = limpiarTexto(args.concepto, 60) || "Transferencia";
    return this.bd.transaccion(() => {
      const saldo = this.mover(id, -cantidad, "transferencia", `A ${this.jugador(a).nombre}: ${concepto}`);
      this.mover(a, cantidad, "transferencia", `De ${this.jugador(id).nombre}: ${concepto}`);
      return { dinero: saldo };
    });
  }

  /* ── Ranking ─────────────────────────────────────────────────────── */

  ranking() {
    return this.bd
      .listar<Jugador>("jugadores", (j) => !j.suspendido)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 20)
      .map((j) => ({ id: j.id, nombre: j.nombre, nivel: j.nivel, xp: j.xp }));
  }

  /* ── Amigos, bloqueos y denuncias ───────────────────────────────── */

  bloqueado(a: string, b: string) {
    return !!(this.bd.leer("bloqueos", `${a}|${b}`) || this.bd.leer("bloqueos", `${b}|${a}`));
  }

  solicitarAmistad(ctx: Contexto, args: { a: unknown }) {
    const id = this.yo(ctx);
    const a = String(args.a ?? "");
    if (a === id) fallo("amigo", "No puedes añadirte a ti.");
    this.jugador(a);
    if (this.bloqueado(id, a)) fallo("bloqueo", "No es posible.");
    const k = parId(id, a);
    const prev = this.bd.leer<Amistad>("amistades", k);
    if (prev?.estado === "aceptada") return { estado: "aceptada" };
    if (prev && prev.de === a) return this.aceptarAmistad(ctx, { de: a });
    this.bd.escribir<Amistad>("amistades", k, { a: id < a ? id : a, b: id < a ? a : id, de: id, estado: "pendiente", t: this.ahora() });
    this.avisar(a, { t: "amistad", de: id, nombre: this.jugador(id).nombre });
    return { estado: "pendiente" };
  }

  aceptarAmistad(ctx: Contexto, args: { de: unknown }) {
    const id = this.yo(ctx);
    const de = String(args.de ?? "");
    const k = parId(id, de);
    const prev = this.bd.leer<Amistad>("amistades", k);
    if (!prev || prev.de !== de) fallo("amigo", "No hay ninguna solicitud de ese jugador.");
    prev!.estado = "aceptada";
    this.bd.escribir("amistades", k, prev);
    this.avisar(de, { t: "amistadAceptada", de: id, nombre: this.jugador(id).nombre });
    return { estado: "aceptada" };
  }

  eliminarAmistad(ctx: Contexto, args: { a: unknown }) {
    const id = this.yo(ctx);
    this.bd.borrar("amistades", parId(id, String(args.a ?? "")));
    return { ok: true };
  }

  amigos(ctx: Contexto) {
    const id = this.yo(ctx);
    return this.bd.listar<Amistad>("amistades", (x) => x.a === id || x.b === id).map((x) => {
      const otro = x.a === id ? x.b : x.a;
      const j = this.bd.leer<Jugador>("jugadores", otro);
      return { id: otro, nombre: j?.nombre ?? "?", nivel: j?.nivel ?? 1, estado: x.estado, entrante: x.estado === "pendiente" && x.de !== id };
    });
  }

  sonAmigos(a: string, b: string) {
    return this.bd.leer<Amistad>("amistades", parId(a, b))?.estado === "aceptada";
  }

  bloquear(ctx: Contexto, args: { a: unknown }) {
    const id = this.yo(ctx);
    const a = String(args.a ?? "");
    this.jugador(a);
    this.bd.transaccion(() => {
      this.bd.escribir("bloqueos", `${id}|${a}`, { t: this.ahora() });
      this.bd.borrar("amistades", parId(id, a));
    });
    return { ok: true };
  }

  desbloquear(ctx: Contexto, args: { a: unknown }) {
    this.bd.borrar("bloqueos", `${this.yo(ctx)}|${String(args.a ?? "")}`);
    return { ok: true };
  }

  bloqueados(ctx: Contexto) {
    const id = this.yo(ctx);
    return this.bd.listar("bloqueos", (_d, k) => k.startsWith(`${id}|`)).map((b) => {
      const otro = b.id.split("|")[1];
      return { id: otro, nombre: this.bd.leer<Jugador>("jugadores", otro)?.nombre ?? "?" };
    });
  }

  denunciar(ctx: Contexto, args: { a: unknown; motivo: unknown; texto?: unknown }) {
    const id = this.yo(ctx);
    const a = String(args.a ?? "");
    this.jugador(a);
    const motivos = ["insultos", "acoso", "trampas", "nombre", "spam", "otro"];
    const motivo = motivos.includes(String(args.motivo)) ? String(args.motivo) : "otro";
    this.bd.escribir("denuncias", this.nuevoId("d"), { de: id, a, motivo, texto: limpiarTexto(args.texto, 300), t: this.ahora(), estado: "abierta" });
    return { ok: true };
  }

  /* ── Mensajes privados ──────────────────────────────────────────── */

  enviarPrivado(ctx: Contexto, args: { a: unknown; texto: unknown }) {
    const id = this.yo(ctx);
    const a = String(args.a ?? "");
    const texto = limpiarTexto(args.texto, 240);
    if (!texto) fallo("texto", "Mensaje vacío.");
    this.jugador(a);
    if (this.bloqueado(id, a)) fallo("bloqueo", "No puedes escribir a este jugador.");
    const m: Mensaje = { de: id, a, texto, t: this.ahora(), leido: false };
    this.bd.escribir("mensajes", this.nuevoId("m"), m);
    this.avisar(a, { t: "privado", de: id, nombre: this.jugador(id).nombre, texto, hora: m.t });
    return m;
  }

  conversacion(ctx: Contexto, args: { con: unknown }) {
    const id = this.yo(ctx);
    const con = String(args.con ?? "");
    const lista = this.bd.listar<Mensaje>("mensajes", (m) => (m.de === id && m.a === con) || (m.de === con && m.a === id));
    for (const m of lista) if (m.a === id && !m.leido) this.bd.escribir("mensajes", m.id, { ...m, leido: true, id: undefined });
    return lista.sort((x, y) => x.t - y.t).slice(-60);
  }

  /* ── Invitaciones ────────────────────────────────────────────────── */

  invitar(ctx: Contexto, args: { a: unknown; tipo: unknown; escena: unknown; x: unknown; y: unknown }) {
    const id = this.yo(ctx);
    const a = String(args.a ?? "");
    this.jugador(a);
    if (this.bloqueado(id, a)) fallo("bloqueo", "No es posible.");
    const tipo = args.tipo === "visita" ? "visita" : "unirse";
    const inv: Invitacion = {
      de: id, a, tipo, escena: limpiarTexto(args.escena, 60) || "ciudad", x: entero(args.x) || 0, y: entero(args.y) || 0,
      t: this.ahora(), caduca: this.ahora() + 10 * 60 * 1000, estado: "pendiente",
    };
    const idInv = this.nuevoId("i");
    this.bd.escribir("invitaciones", idInv, inv);
    this.avisar(a, { t: "invitacion", id: idInv, de: id, nombre: this.jugador(id).nombre, tipo, escena: inv.escena });
    return { id: idInv };
  }

  /** Acepta una invitación: devuelve a dónde se teletransporta el invitado. */
  responderInvitacion(ctx: Contexto, args: { id: unknown; acepta: unknown }) {
    const id = this.yo(ctx);
    const inv = this.bd.leer<Invitacion>("invitaciones", String(args.id ?? ""));
    if (!inv || inv.a !== id) fallo("invitacion", "Invitación no encontrada.");
    if (inv!.estado !== "pendiente" || inv!.caduca < this.ahora()) fallo("invitacion", "La invitación ya no es válida.");
    inv!.estado = args.acepta ? "aceptada" : "rechazada";
    this.bd.escribir("invitaciones", String(args.id), inv);
    this.avisar(inv!.de, { t: "invitacionRespondida", de: id, nombre: this.jugador(id).nombre, acepta: !!args.acepta });
    return { acepta: !!args.acepta, de: inv!.de, escena: inv!.escena, x: inv!.x, y: inv!.y, tipo: inv!.tipo };
  }

  invitacionesPendientes(ctx: Contexto) {
    const id = this.yo(ctx);
    const ahora = this.ahora();
    return this.bd.listar<Invitacion>("invitaciones", (i) => i.a === id && i.estado === "pendiente" && i.caduca > ahora).map((i) => ({ ...i, nombre: this.bd.leer<Jugador>("jugadores", i.de)?.nombre ?? "?" }));
  }

  /* ── Mercadillo (pago verificado) ───────────────────────────────── */

  publicarOferta(ctx: Contexto, args: { objeto: unknown; cantidad: unknown; precio: unknown }) {
    const id = this.yo(ctx);
    const objeto = limpiarTexto(args.objeto, 24);
    const cantidad = entero(args.cantidad);
    const precio = entero(args.precio);
    if (!objeto || !(cantidad >= 1 && cantidad <= 99) || !(precio >= 1 && precio <= 999)) fallo("oferta", "Oferta no válida.");
    const abiertas = this.bd.listar<{ vendedor: string; estado: string }>("ofertas", (o) => o.vendedor === id && o.estado !== "cobrada").length;
    if (abiertas >= 8) fallo("oferta", "Tienes demasiadas ofertas abiertas.");
    const oid = this.nuevoId("v");
    this.bd.escribir("ofertas", oid, { vendedor: id, objeto, cantidad, precio, estado: "abierta", t: this.ahora() });
    return { id: oid };
  }

  ofertas(ctx: Contexto) {
    const id = this.yo(ctx);
    return this.bd
      .listar<{ vendedor: string; objeto: string; cantidad: number; precio: number; estado: string; t: number }>("ofertas", (o) => o.estado === "abierta" || (o.vendedor === id && o.estado !== "cobrada"))
      .sort((a, b) => b.t - a.t)
      .slice(0, 40)
      .map((o) => ({ ...o, apodo: this.bd.leer<Jugador>("jugadores", o.vendedor)?.nombre ?? "?", mia: o.vendedor === id }));
  }

  /** Compra atómica: cobra al comprador, paga al vendedor y marca vendida. */
  comprarOferta(ctx: Contexto, args: { id: unknown }) {
    const id = this.yo(ctx);
    const oid = String(args.id ?? "");
    return this.bd.transaccion(() => {
      const o = this.bd.leer<{ vendedor: string; objeto: string; cantidad: number; precio: number; estado: string; t: number }>("ofertas", oid);
      if (!o || o.estado !== "abierta") fallo("vendida", "Alguien se te ha adelantado.");
      if (o!.vendedor === id) fallo("propia", "Es tu propia oferta.");
      const dinero = this.mover(id, -o!.precio, "mercadillo", `Compra: ${o!.cantidad} ${o!.objeto}`);
      this.mover(o!.vendedor, o!.precio, "mercadillo", `Venta: ${o!.cantidad} ${o!.objeto}`);
      this.bd.escribir("ofertas", oid, { ...o, estado: "vendida", comprador: id });
      this.avisar(o!.vendedor, { t: "vendido", objeto: o!.objeto, cantidad: o!.cantidad, precio: o!.precio });
      return { dinero, objeto: o!.objeto, cantidad: o!.cantidad };
    });
  }

  /** Retira una oferta propia sin vender (devuelve el género) o archiva una vendida. */
  retirarOferta(ctx: Contexto, args: { id: unknown }) {
    const id = this.yo(ctx);
    const oid = String(args.id ?? "");
    return this.bd.transaccion(() => {
      const o = this.bd.leer<{ vendedor: string; objeto: string; cantidad: number; estado: string }>("ofertas", oid);
      if (!o || o.vendedor !== id || o.estado === "cobrada") fallo("oferta", "Oferta no encontrada.");
      const devolver = o!.estado === "abierta";
      this.bd.escribir("ofertas", oid, { ...o, estado: "cobrada" });
      return { devolver, objeto: o!.objeto, cantidad: o!.cantidad };
    });
  }
}

export const NIVELES = [0, 15, 40, 80, 130, 200, 290, 400, 530, 680, 850, 1050];
export const nivelDe = (xp: number) => NIVELES.filter((x) => xp >= x).length;
