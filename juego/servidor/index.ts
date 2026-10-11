/**
 * Servidor de Mi Línea: HTTP (sirve el juego compilado), WebSocket (/ws) para
 * la autoridad del juego y el tiempo real, y SQLite para la persistencia.
 *
 *   npm run servidor            (PORT=8787, DATOS=./datos/mi-linea.db)
 *
 * El cliente solo pide operaciones; el servidor valida sesión, permisos,
 * saldos y topes, ejecuta en transacción y responde con el resultado.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes, scrypt } from "node:crypto";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { AlmacenSQLite } from "./bd.ts";
import { ErrorJuego, Servicio, type Contexto } from "../src/compartido/servicio.ts";
import { registrarModulos } from "../src/compartido/modulos.ts";
import { datosDesdeLinea, fijarMapa } from "../src/compartido/hogar/datos.ts";
import "../src/compartido/hogar/hogar.ts";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const DIST = normalize(join(RAIZ, "..", "dist"));
const PUERTO = Number(process.env.PORT ?? 8787);
const RUTA_BD = process.env.DATOS ?? join(RAIZ, "..", "datos", "mi-linea.db");
mkdirSync(dirname(RUTA_BD), { recursive: true });

const almacen = new AlmacenSQLite(RUTA_BD);
const conexiones = new Map<WebSocket, Conexion>();

const servicio = new Servicio({
  almacen,
  hash: (clave, sal) =>
    new Promise((ok, ko) => scrypt(clave, sal, 32, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? ko(e) : ok(k.toString("hex"))))),
  aleatorio: (n) => randomBytes(n).toString("base64url"),
  avisar: (jugador, evento) => {
    for (const c of conexiones.values()) if (c.jugador === jugador) enviar(c.ws, evento);
  },
});

/* ── Estado de tiempo real ─────────────────────────────────────────── */

const SALAS = ["La Línea 1", "La Línea 2", "La Línea 3"];
const CAPACIDAD = 40;

interface Conexion {
  ws: WebSocket;
  jugador: string | null;
  token: string | null;
  sala: string;
  /** "ciudad" o "casa:<inmueble>" (las casas son comunes a todas las salas). */
  escena: string;
  x: number;
  y: number;
  r: number;
  anim: string;
  gesto: string;
  gestoT: number;
  rpc: number[];
  movT: number;
  chatT: number;
}

const claveEscena = (c: Conexion) => (c.escena === "ciudad" ? `${c.sala}/ciudad` : c.escena);
const enviar = (ws: WebSocket, msg: unknown) => {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
};
const deEscena = (clave: string) => [...conexiones.values()].filter((c) => c.jugador && claveEscena(c) === clave);

/** Operaciones de tiempo real (además de las del servicio y los módulos). */
const tiempoReal: Record<string, (c: Conexion, args: Record<string, unknown>) => unknown> = {
  salas: () => SALAS.map((nombre) => ({ nombre, jugadores: [...conexiones.values()].filter((c) => c.jugador && c.sala === nombre).length, capacidad: CAPACIDAD })),
  unirseSala: (c, a) => {
    const sala = String(a.sala ?? "");
    if (!SALAS.includes(sala)) throw new ErrorJuego("sala", "Sala inexistente.");
    if ([...conexiones.values()].filter((x) => x.jugador && x.sala === sala && x !== c).length >= CAPACIDAD) throw new ErrorJuego("llena", "La sala está llena.");
    c.sala = sala;
    return { sala };
  },
  cercanos: (c) => {
    const yo = c.jugador!;
    return deEscena(claveEscena(c))
      .filter((o) => o !== c && o.jugador !== yo && !servicio.bloqueado(yo, o.jugador!))
      .map((o) => ({ ...publico(o), distancia: Math.round(Math.hypot(o.x - c.x, o.y - c.y)), amigo: servicio.sonAmigos(yo, o.jugador!) }))
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 30);
  },
  enLinea: (c) => [...new Set([...conexiones.values()].filter((o) => o.jugador && o.jugador !== c.jugador).map((o) => o.jugador!))],
  /** Cambiar de escena (entrar o salir de una casa); los módulos validan el permiso. */
  escena: (c, a) => {
    const escena = String(a.escena ?? "ciudad");
    if (escena !== "ciudad") modulos.puedeEntrar(c.jugador!, escena);
    c.escena = escena;
    c.x = Number(a.x) || c.x;
    c.y = Number(a.y) || c.y;
    return { escena };
  },
};

const publico = (c: Conexion) => {
  const p = servicio.perfil(c.jugador!);
  return { id: c.jugador!, nombre: p.nombre, ropa: p.ropa, piel: p.piel, nivel: p.nivel, x: c.x, y: c.y, r: c.r, anim: c.anim, gesto: Date.now() - c.gestoT < 4000 ? c.gesto : "" };
};

/* ── Módulos de juego (inmobiliaria, interiores, oficios…) ─────────── */

fijarMapa(datosDesdeLinea(JSON.parse(readFileSync(join(RAIZ, "..", "src", "datos", "linea.json"), "utf8"))));
const modulos = registrarModulos(servicio);

/** Teletransporte tras aceptar una invitación. */
function teletransportar(c: Conexion, destino: { de: string; escena: string; x: number; y: number }) {
  const anfitrion = [...conexiones.values()].find((o) => o.jugador === destino.de);
  if (anfitrion) {
    c.sala = anfitrion.sala;
    c.escena = anfitrion.escena;
    c.x = anfitrion.x + 3;
    c.y = anfitrion.y + 2;
  } else {
    c.escena = destino.escena;
    c.x = destino.x;
    c.y = destino.y;
  }
  enviar(c.ws, { t: "teletransporte", sala: c.sala, escena: c.escena, x: c.x, y: c.y });
}

/* ── WebSocket ─────────────────────────────────────────────────────── */

async function atenderRPC(c: Conexion, msg: { id: number; op: string; args?: Record<string, unknown> }) {
  const ahora = Date.now();
  c.rpc = c.rpc.filter((t) => ahora - t < 1000);
  if (c.rpc.length > 25) return enviar(c.ws, { id: msg.id, ok: false, codigo: "ritmo", error: "Demasiadas peticiones." });
  c.rpc.push(ahora);
  const args = (msg.args && typeof msg.args === "object" ? msg.args : {}) as Record<string, unknown>;
  const ctx: Contexto = { jugador: c.jugador };
  try {
    let res: unknown;
    switch (msg.op) {
      case "registrar":
      case "entrar": {
        const r = msg.op === "registrar" ? await servicio.registrar(args) : await servicio.entrar(args);
        c.jugador = r.jugador;
        c.token = r.token;
        res = r;
        break;
      }
      case "reanudar": {
        const r = servicio.reanudar(args.token);
        c.jugador = r.jugador;
        c.token = String(args.token);
        res = r;
        break;
      }
      case "salir":
        if (c.token) servicio.cerrarSesion(c.token);
        c.jugador = c.token = null;
        res = { ok: true };
        break;
      case "responderInvitacion": {
        const r = servicio.responderInvitacion(ctx, args as { id: unknown; acepta: unknown });
        if (r.acepta) {
          if (r.escena !== "ciudad") modulos.permitirVisita(r.de, c.jugador!, r.escena);
          teletransportar(c, r);
        }
        res = r;
        break;
      }
      default: {
        if (!c.jugador) throw new ErrorJuego("sesion", "Tienes que entrar con tu cuenta.");
        if (msg.op in tiempoReal) res = tiempoReal[msg.op](c, args);
        else if (modulos.ops[msg.op]) res = await modulos.ops[msg.op](ctx, args, { escena: c.escena, aviso: (ev) => difundir(claveEscena(c), ev) });
        else if (OPS_SERVICIO.has(msg.op)) res = (servicio as unknown as Record<string, (c: Contexto, a: unknown) => unknown>)[msg.op](ctx, args);
        else throw new ErrorJuego("op", "Operación desconocida.");
      }
    }
    enviar(c.ws, { id: msg.id, ok: true, res });
  } catch (e) {
    const err = e instanceof ErrorJuego ? e : null;
    if (!err) console.error(e);
    enviar(c.ws, { id: msg.id, ok: false, codigo: err?.codigo ?? "interno", error: err?.message ?? "Error interno." });
  }
}

const OPS_SERVICIO = new Set([
  "aspecto", "guardarPartida", "cargarPartida", "movimiento", "saldo", "historial", "transferir", "ranking",
  "solicitarAmistad", "aceptarAmistad", "eliminarAmistad", "amigos", "bloquear", "desbloquear", "bloqueados", "denunciar",
  "enviarPrivado", "conversacion", "invitar", "invitacionesPendientes", "publicarOferta", "ofertas", "comprarOferta", "retirarOferta",
]);

/** Envía un evento a todos los de una escena (y a los módulos que lo pidan). */
function difundir(clave: string, ev: Record<string, unknown>, salvo?: Conexion) {
  for (const o of deEscena(clave)) if (o !== salvo) enviar(o.ws, ev);
}

function tiempoRealMensaje(c: Conexion, m: Record<string, unknown>) {
  if (!c.jugador) return;
  const ahora = Date.now();
  switch (m.t) {
    case "mov": {
      if (ahora - c.movT < 50) return;
      c.movT = ahora;
      const x = Number(m.x);
      const y = Number(m.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 20000 || Math.abs(y) > 20000) return;
      c.x = x;
      c.y = y;
      c.r = Number(m.r) || 0;
      c.anim = m.anim === "andar" || m.anim === "bus" || m.anim === "sentado" ? (m.anim as string) : "quieto";
      return;
    }
    case "gesto": {
      const g = String(m.g ?? "");
      if (!/^[a-z]{2,12}$/.test(g)) return;
      c.gesto = g;
      c.gestoT = ahora;
      return;
    }
    case "chat": {
      const texto = String(m.texto ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 200);
      if (!texto || ahora - c.chatT < 1200) return;
      c.chatT = ahora;
      const nombre = servicio.perfil(c.jugador).nombre;
      for (const o of deEscena(claveEscena(c))) {
        if (o.jugador !== c.jugador && servicio.bloqueado(c.jugador, o.jugador!)) continue;
        enviar(o.ws, { t: "chat", de: c.jugador, nombre, texto, hora: ahora });
      }
      return;
    }
    case "mod": {
      // Mensajes de tiempo real de los módulos (p. ej. pintar en cooperativo).
      modulos.tiempoReal(c.jugador, c.escena, m, (ev) => difundir(claveEscena(c), ev, c));
    }
  }
}

/** 10 veces por segundo: cada jugador recibe a los de su escena (sin bloqueados). */
setInterval(() => {
  const porEscena = new Map<string, Conexion[]>();
  for (const c of conexiones.values()) {
    if (!c.jugador) continue;
    const k = claveEscena(c);
    if (!porEscena.has(k)) porEscena.set(k, []);
    porEscena.get(k)!.push(c);
  }
  for (const lista of porEscena.values()) {
    const datos = lista.map((c) => ({ c, p: publico(c) }));
    for (const c of lista) {
      const otros = datos.filter((d) => d.c.jugador !== c.jugador && !servicio.bloqueado(c.jugador!, d.c.jugador!)).map((d) => d.p);
      enviar(c.ws, { t: "jugadores", escena: c.escena, lista: otros });
    }
  }
}, 100);

/* ── HTTP: juego compilado y salud ─────────────────────────────────── */

const TIPOS: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

function http(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/api/salud") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ ok: true, servidor: "mi-linea", jugadores: [...conexiones.values()].filter((c) => c.jugador).length, salas: SALAS }));
    return;
  }
  let ruta = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!ruta.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (statSync(ruta).isDirectory()) ruta = join(ruta, "index.html");
  } catch {
    ruta = join(DIST, "index.html");
  }
  try {
    const datos = readFileSync(ruta);
    res.writeHead(200, { "content-type": TIPOS[extname(ruta)] ?? "application/octet-stream", "x-content-type-options": "nosniff" });
    res.end(datos);
  } catch {
    res.writeHead(404).end("No encontrado. Ejecuta antes «npm run build».");
  }
}

const servidor = createServer(http);
const wss = new WebSocketServer({ server: servidor, path: "/ws", maxPayload: 512 * 1024 });

wss.on("connection", (ws) => {
  const c: Conexion = { ws, jugador: null, token: null, sala: SALAS[0], escena: "ciudad", x: 0, y: 0, r: 0, anim: "quieto", gesto: "", gestoT: 0, rpc: [], movT: 0, chatT: 0 };
  conexiones.set(ws, c);
  ws.on("message", (datos) => {
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(String(datos));
    } catch {
      return;
    }
    if (typeof m.op === "string" && typeof m.id === "number") void atenderRPC(c, m as { id: number; op: string; args?: Record<string, unknown> });
    else tiempoRealMensaje(c, m);
  });
  ws.on("close", () => {
    if (c.jugador) modulos.desconectado(c.jugador, c.escena);
    conexiones.delete(ws);
  });
});

servidor.listen(PUERTO, () => console.log(`Mi Línea · servidor en http://localhost:${PUERTO} · datos en ${RUTA_BD}`));
