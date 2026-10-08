import { NODOS, TRAMOS, type Punto } from "../datos/mapa";

/** Camino más corto por la red de calles (Dijkstra; la red es pequeña). */

const vecinos = new Map<string, { a: string; d: number }[]>();
for (const [x, y] of TRAMOS) {
  const d = distancia(NODOS[x], NODOS[y]);
  if (!vecinos.has(x)) vecinos.set(x, []);
  if (!vecinos.has(y)) vecinos.set(y, []);
  vecinos.get(x)!.push({ a: y, d });
  vecinos.get(y)!.push({ a: x, d });
}

export function distancia(p: Punto, q: Punto) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

export function ruta(desde: string, hasta: string): { nodos: string[]; largo: number } {
  const dist = new Map<string, number>([[desde, 0]]);
  const previo = new Map<string, string>();
  const pendientes = new Set(Object.keys(NODOS));
  while (pendientes.size) {
    let actual: string | null = null;
    for (const n of pendientes) if (dist.has(n) && (actual === null || dist.get(n)! < dist.get(actual)!)) actual = n;
    if (actual === null || actual === hasta) break;
    pendientes.delete(actual);
    for (const { a, d } of vecinos.get(actual) ?? []) {
      const nd = dist.get(actual)! + d;
      if (nd < (dist.get(a) ?? Infinity)) {
        dist.set(a, nd);
        previo.set(a, actual);
      }
    }
  }
  const nodos = [hasta];
  while (nodos[0] !== desde) {
    const p = previo.get(nodos[0]);
    if (!p) return { nodos: [desde], largo: 0 };
    nodos.unshift(p);
  }
  return { nodos, largo: dist.get(hasta) ?? 0 };
}

/** Minutos de juego andando: 1 unidad ≈ 2,7 m a paso tranquilo. */
export const minutosAndando = (largo: number) => Math.max(2, Math.round(largo * 0.035));
