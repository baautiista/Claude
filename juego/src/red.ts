/**
 * Multijugador. Dentro de claude.ai usa las capacidades del artefacto:
 * - `room`: quién está jugando ahora mismo, dónde está y sus saludos (presencia).
 * - `db`: ranking de vecinos y mercadillo (ofertas entre jugadores).
 * - `user`: identificador estable de cada jugador.
 * Fuera de claude.ai (o sin permiso) cae a BroadcastChannel: las pestañas del
 * mismo navegador se ven entre sí. Todo lo que llega de otros es dato no fiable.
 */
import type { Vecino } from "./mundo/mundo";

export interface Presencia {
  nombre: string;
  ropa: string;
  piel: string;
  nivel: number;
  x: number;
  y: number;
  emote?: string;
  emoteT?: number;
}

export interface Puesto {
  id: string;
  nombre: string;
  nivel: number;
  xp: number;
  dia: number;
  yo: boolean;
}

export interface Oferta {
  id: string;
  vendedor: string;
  apodo: string;
  objeto: string;
  cantidad: number;
  precio: number;
  vendida: boolean;
  mia: boolean;
}

export const EMOTES = ["👋", "😄", "👍", "❤️", "🎣", "🍅", "⚽", "🌬️"] as const;

type Room = {
  presence(p: Record<string, unknown>): Promise<void>;
  onPeers(fn: (c: { peers: readonly { peer: string; isMe: boolean; sameTab: boolean; presence: Readonly<Record<string, unknown>> }[] }) => void, err?: (e: unknown) => void): () => void;
};
type Snap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type Col = {
  doc(id?: string): Doc;
  add(d: Record<string, unknown>): Promise<Doc>;
  orderBy(f: string, d?: "asc" | "desc"): Col;
  limit(n: number): Col;
  get(): Promise<{ docs: Snap[] }>;
  onSnapshot(fn: (s: { docs: Snap[] }) => void, err?: (e: unknown) => void): () => void;
};
type Doc = { get(): Promise<Snap>; set(d: Record<string, unknown>): Promise<void>; update(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
type Db = { collection(p: string): Col; doc(p: string): Doc };
type Usuario = { id(): Promise<string | null> };
type Claude = { use(n: string): Promise<unknown> };

const txt = (v: unknown, max = 24) => (typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, "").slice(0, max) : "");
const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);
const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#FFFFFF");

/** Limpia la presencia de otro jugador antes de usarla. */
function limpiar(p: Readonly<Record<string, unknown>>): Presencia | null {
  if (typeof p.x !== "number" || typeof p.y !== "number") return null;
  const emote = EMOTES.find((e) => e === p.emote);
  return {
    nombre: txt(p.nombre, 16) || "Vecino",
    ropa: color(p.ropa),
    piel: color(p.piel),
    nivel: Math.round(num(p.nivel, 1, 99)),
    x: num(p.x, -20000, 20000),
    y: num(p.y, -20000, 20000),
    emote,
    emoteT: num(p.emoteT, 0, 1e15),
  };
}

export class Red {
  /** "sala": claude.ai; "local": otras pestañas; "solo": sin nadie más. */
  modo: "sala" | "local" | "solo" = "solo";
  private room: Room | null = null;
  private db: Db | null = null;
  miId = `local-${Math.random().toString(36).slice(2, 10)}`;
  private canal: BroadcastChannel | null = null;
  private otros = new Map<string, Presencia & { t: number }>();
  private yo: Presencia | null = null;
  private ultimoEnvio = 0;
  private pendiente = false;
  /** Se llama cuando cambia la gente conectada. */
  onCambio: () => void = () => {};

  async iniciar() {
    const c = (window as unknown as { claude?: Claude }).claude;
    if (c?.use) {
      const [room, db, user] = await Promise.all([
        c.use("room").catch(() => null) as Promise<Room | null>,
        c.use("db").catch(() => null) as Promise<Db | null>,
        c.use("user").catch(() => null) as Promise<Usuario | null>,
      ]);
      this.db = db;
      const id = await user?.id().catch(() => null);
      if (id) this.miId = id;
      if (room) {
        this.room = room;
        this.modo = "sala";
        room.onPeers((ch) => {
          this.otros.clear();
          for (const p of ch.peers) {
            if (p.isMe && p.sameTab) continue;
            const v = limpiar(p.presence);
            if (v) this.otros.set(p.peer, { ...v, t: Date.now() });
          }
          this.onCambio();
        }, () => {});
        if (this.yo) void room.presence({ ...this.yo });
        return;
      }
    }
    if ("BroadcastChannel" in window) {
      this.modo = "local";
      this.canal = new BroadcastChannel("mi-linea");
      this.canal.onmessage = (ev) => {
        const d = ev.data as { id?: string; p?: Record<string, unknown>; fuera?: boolean };
        if (typeof d?.id !== "string" || d.id === this.miId) return;
        if (d.fuera) this.otros.delete(d.id);
        else {
          const v = d.p && limpiar(d.p);
          if (v) this.otros.set(d.id, { ...v, t: Date.now() });
        }
        this.onCambio();
      };
      window.addEventListener("pagehide", () => this.canal?.postMessage({ id: this.miId, fuera: true }));
      // Sin presencia gestionada: los que llevan 15 s callados se van.
      setInterval(() => {
        const ahora = Date.now();
        let cambio = false;
        for (const [k, v] of this.otros) if (ahora - v.t > 15000) (this.otros.delete(k), (cambio = true));
        if (this.yo) this.canal?.postMessage({ id: this.miId, p: this.yo });
        if (cambio) this.onCambio();
      }, 5000);
    }
  }

  get hayDb() {
    return !!this.db;
  }

  /** Publica dónde estás. Como mucho una vez por segundo. */
  publicar(p: Presencia) {
    const cambio = !this.yo || Math.abs(this.yo.x - p.x) + Math.abs(this.yo.y - p.y) > 1 || this.yo.nivel !== p.nivel || this.yo.emote !== p.emote || this.yo.ropa !== p.ropa;
    this.yo = { ...p };
    if (!cambio) return;
    const ahora = Date.now();
    if (ahora - this.ultimoEnvio < 1000) {
      if (!this.pendiente) {
        this.pendiente = true;
        setTimeout(() => {
          this.pendiente = false;
          if (this.yo) this.enviar();
        }, 1000 - (ahora - this.ultimoEnvio));
      }
      return;
    }
    this.enviar();
  }

  private enviar() {
    this.ultimoEnvio = Date.now();
    const p = { ...this.yo! };
    if (this.room) void this.room.presence(p).catch(() => {});
    else this.canal?.postMessage({ id: this.miId, p });
  }

  /** Vecinos conectados para el mundo 3D. Los saludos duran 4 s. */
  vecinos(): Vecino[] {
    const ahora = Date.now();
    return [...this.otros].map(([id, v]) => ({
      id, nombre: v.nombre, ropa: v.ropa, piel: v.piel, nivel: v.nivel, x: v.x, y: v.y,
      emote: v.emote && ahora - (v.emoteT ?? 0) < 4000 ? v.emote : undefined,
    }));
  }

  get conectados() {
    return this.otros.size;
  }

  lista() {
    return [...this.otros.values()];
  }

  /* ── Ranking (db: jugadores/{id}) ──────────────────────────────── */

  async guardarRanking(nombre: string, nivel: number, xp: number, dia: number) {
    if (!this.db || this.miId.startsWith("local-")) return;
    await this.db.doc(`jugadores/${this.miId}`).set({ nombre: txt(nombre, 16), nivel, xp, dia, t: Date.now() }).catch(() => {});
  }

  async ranking(): Promise<Puesto[]> {
    if (!this.db) return [];
    try {
      const s = await this.db.collection("jugadores").orderBy("xp", "desc").limit(20).get();
      return s.docs.map((d) => {
        const v = d.data() ?? {};
        return { id: d.id, nombre: txt(v.nombre, 16) || "Vecino", nivel: Math.round(num(v.nivel, 1, 99)), xp: Math.round(num(v.xp, 0, 1e7)), dia: Math.round(num(v.dia, 1, 1e5)), yo: d.id === this.miId };
      });
    } catch {
      return [];
    }
  }

  /* ── Mercadillo (db: ofertas/{id}) ─────────────────────────────── */

  private leerOferta(d: Snap): Oferta | null {
    const v = d.data();
    if (!v || typeof v.objeto !== "string") return null;
    return {
      id: d.id, vendedor: txt(v.vendedor, 80), apodo: txt(v.apodo, 16) || "Vecino", objeto: txt(v.objeto, 24),
      cantidad: Math.round(num(v.cantidad, 1, 99)), precio: Math.round(num(v.precio, 1, 999)), vendida: v.vendida === true,
      mia: v.vendedor === this.miId,
    };
  }

  async ofertas(): Promise<Oferta[]> {
    if (!this.db) return [];
    try {
      const s = await this.db.collection("ofertas").orderBy("t", "desc").limit(40).get();
      return s.docs.map((d) => this.leerOferta(d)).filter((o): o is Oferta => !!o);
    } catch {
      return [];
    }
  }

  async publicarOferta(apodo: string, objeto: string, cantidad: number, precio: number) {
    if (!this.db) throw new Error("sin conexión");
    await this.db.collection("ofertas").add({ vendedor: this.miId, apodo: txt(apodo, 16), objeto, cantidad, precio, vendida: false, t: Date.now() });
  }

  /** Compra: comprueba que sigue libre y la marca vendida. */
  async comprar(o: Oferta) {
    if (!this.db) throw new Error("sin conexión");
    const ref = this.db.doc(`ofertas/${o.id}`);
    const s = await ref.get();
    const v = s.exists ? this.leerOferta(s) : null;
    if (!v || v.vendida) throw new Error("Ya se ha vendido");
    await ref.update({ vendida: true, comprador: this.miId });
  }

  /** Retira una oferta propia (vendida: cobras; sin vender: recuperas el género). */
  async retirar(o: Oferta) {
    if (!this.db || !o.mia) return;
    await this.db.doc(`ofertas/${o.id}`).delete();
  }
}

export const red = new Red();
