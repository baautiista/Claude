import type { Contexto, Servicio } from "./servicio.ts";

/**
 * Registro de módulos de juego que amplían la autoridad del servidor:
 * inmobiliaria e interiores (fase 2) y oficios (fase 3). Cada módulo aporta
 * operaciones RPC y, si lo necesita, reglas de acceso a escenas y mensajes de
 * tiempo real. Lo usan el servidor y el modo local del navegador.
 */

export interface Extra {
  escena: string;
  /** Difunde un evento a todos los de la escena del jugador. */
  aviso: (ev: Record<string, unknown>) => void;
}

export type Op = (ctx: Contexto, args: Record<string, unknown>, extra: Extra) => unknown;

export interface Modulo {
  ops: Record<string, Op>;
  /** Lanza un error si el jugador no puede entrar en la escena. */
  puedeEntrar?: (jugador: string, escena: string) => void;
  /** Concede acceso temporal a un invitado. */
  permitirVisita?: (anfitrion: string, invitado: string, escena: string) => void;
  tiempoReal?: (jugador: string, escena: string, m: Record<string, unknown>, difundir: (ev: Record<string, unknown>) => void) => void;
  desconectado?: (jugador: string, escena: string) => void;
}

export type FabricaModulo = (s: Servicio) => Modulo;
const fabricas: FabricaModulo[] = [];
export const definirModulo = (f: FabricaModulo) => fabricas.push(f);

export function registrarModulos(s: Servicio) {
  const mods = fabricas.map((f) => f(s));
  const ops: Record<string, Op> = {};
  for (const m of mods) Object.assign(ops, m.ops);
  return {
    ops,
    puedeEntrar(j: string, escena: string) {
      const m = mods.find((x) => x.puedeEntrar);
      if (!m) throw new Error("Escena no disponible.");
      for (const x of mods) x.puedeEntrar?.(j, escena);
    },
    permitirVisita(a: string, i: string, escena: string) {
      for (const x of mods) x.permitirVisita?.(a, i, escena);
    },
    tiempoReal(j: string, escena: string, m: Record<string, unknown>, d: (ev: Record<string, unknown>) => void) {
      for (const x of mods) x.tiempoReal?.(j, escena, m, d);
    },
    desconectado(j: string, escena: string) {
      for (const x of mods) x.desconectado?.(j, escena);
    },
  };
}
