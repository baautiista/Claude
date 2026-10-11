/**
 * Utilidades de las pruebas automáticas: arranca un servidor real con una base
 * de datos temporal y crea clientes WebSocket que hablan el protocolo del juego.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Cliente {
  llamar<T = any>(op: string, args?: Record<string, unknown>): Promise<T>;
  intentar(op: string, args?: Record<string, unknown>): Promise<{ ok: boolean; codigo?: string; error?: string; res?: any }>;
  enviar(m: Record<string, unknown>): void;
  eventos: Record<string, unknown>[];
  esperar(t: string, ms?: number): Promise<Record<string, unknown>>;
  cerrar(): void;
}

export class Servidor {
  proceso: ChildProcess | null = null;
  dir = mkdtempSync(join(tmpdir(), "mi-linea-"));
  puerto = 20000 + Math.floor(Math.random() * 20000);
  async arrancar() {
    this.proceso = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", "servidor/index.ts"], {
      env: { ...process.env, PORT: String(this.puerto), DATOS: join(this.dir, "prueba.db") },
      stdio: ["ignore", "pipe", "inherit"],
    });
    await new Promise<void>((ok, ko) => {
      const t = setTimeout(() => ko(new Error("El servidor no arranca")), 15000);
      this.proceso!.stdout!.on("data", (d) => {
        if (String(d).includes("servidor en")) {
          clearTimeout(t);
          ok();
        }
      });
    });
  }
  async parar() {
    this.proceso?.kill();
    await new Promise((r) => setTimeout(r, 300));
  }
  limpiar() {
    rmSync(this.dir, { recursive: true, force: true });
  }
  cliente(): Promise<Cliente> {
    return new Promise((ok, ko) => {
      const ws = new WebSocket(`ws://localhost:${this.puerto}/ws`);
      let n = 0;
      const pend = new Map<number, (m: any) => void>();
      const eventos: Record<string, unknown>[] = [];
      const esperando: { t: string; fn: (m: any) => void }[] = [];
      ws.onmessage = (e) => {
        const m = JSON.parse(String(e.data));
        if (typeof m.id === "number") return pend.get(m.id)?.(m);
        if (m.t === "jugadores") (c as any).jugadores = m.lista;
        eventos.push(m);
        for (const x of [...esperando]) if (x.t === m.t) {
          esperando.splice(esperando.indexOf(x), 1);
          x.fn(m);
        }
      };
      const intentar = (op: string, args: Record<string, unknown> = {}) => new Promise<any>((r) => {
        const id = ++n;
        pend.set(id, r);
        ws.send(JSON.stringify({ id, op, args }));
      });
      const c: Cliente = {
        intentar,
        async llamar(op, args) {
          const m = await intentar(op, args);
          if (!m.ok) throw new Error(`${op}: ${m.error}`);
          return m.res;
        },
        enviar: (m) => ws.send(JSON.stringify(m)),
        eventos,
        esperar: (t, ms = 3000) => {
          const ya = eventos.find((e) => e.t === t);
          if (ya) {
            eventos.splice(eventos.indexOf(ya), 1);
            return Promise.resolve(ya);
          }
          return new Promise((r, k) => {
            const x = { t, fn: r };
            esperando.push(x);
            setTimeout(() => k(new Error(`No llegó el evento ${t}`)), ms);
          });
        },
        cerrar: () => ws.close(),
      };
      ws.onopen = () => ok(c);
      ws.onerror = () => ko(new Error("No conecta"));
    });
  }
}

/** Registro de resultados con salida legible. */
export class Informe {
  ok = 0;
  fallos: string[] = [];
  titulo: string;
  constructor(titulo: string) {
    this.titulo = titulo;
    console.log(`\n── ${titulo} ──`);
  }
  async caso(nombre: string, fn: () => Promise<unknown> | unknown) {
    try {
      const r = await fn();
      if (r === false) throw new Error("condición falsa");
      this.ok++;
      console.log(`  ✔ ${nombre}`);
    } catch (e) {
      this.fallos.push(`${this.titulo}: ${nombre} — ${(e as Error).message}`);
      console.log(`  ✘ ${nombre} — ${(e as Error).message}`);
    }
  }
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const unico = (p: string) => `${p}${Date.now().toString(36).slice(-4)}${Math.floor(Math.random() * 1000)}`;
