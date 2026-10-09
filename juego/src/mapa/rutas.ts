import { NODOS, TRAMOS, type Punto, type Tramo } from "../datos/mapa";

/** Camino más corto por las calles reales (Dijkstra con montículo binario). */

const vecinos = new Map<string, { a: string; t: Tramo; d: number }[]>();
for (const t of TRAMOS) {
  // Los senderos y pistas cuestan un poco más: se prefieren las calles.
  const coste = t.largo * (t.clase >= 6 ? 1.25 : 1);
  if (!vecinos.has(t.a)) vecinos.set(t.a, []);
  if (!vecinos.has(t.b)) vecinos.set(t.b, []);
  vecinos.get(t.a)!.push({ a: t.b, t, d: coste });
  vecinos.get(t.b)!.push({ a: t.a, t, d: coste });
}

export function distancia(p: Punto, q: Punto) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

class Monticulo {
  private h: [number, string][] = [];
  get vacio() {
    return !this.h.length;
  }
  meter(p: number, v: string) {
    const h = this.h;
    h.push([p, v]);
    let i = h.length - 1;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (h[padre][0] <= h[i][0]) break;
      [h[padre], h[i]] = [h[i], h[padre]];
      i = padre;
    }
  }
  sacar(): [number, string] {
    const h = this.h;
    const top = h[0];
    const ultimo = h.pop()!;
    if (h.length) {
      h[0] = ultimo;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < h.length && h[l][0] < h[m][0]) m = l;
        if (r < h.length && h[r][0] < h[m][0]) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Ruta entre dos nodos: lista de nodos, puntos a recorrer y largo en unidades. */
export function ruta(desde: string, hasta: string): { nodos: string[]; puntos: Punto[]; largo: number } {
  const dist = new Map<string, number>([[desde, 0]]);
  const previo = new Map<string, { n: string; t: Tramo }>();
  const m = new Monticulo();
  m.meter(0, desde);
  while (!m.vacio) {
    const [d, n] = m.sacar();
    if (n === hasta) break;
    if (d > (dist.get(n) ?? Infinity)) continue;
    for (const v of vecinos.get(n) ?? []) {
      const nd = d + v.d;
      if (nd < (dist.get(v.a) ?? Infinity)) {
        dist.set(v.a, nd);
        previo.set(v.a, { n, t: v.t });
        m.meter(nd, v.a);
      }
    }
  }
  if (desde !== hasta && !previo.has(hasta)) return { nodos: [desde], puntos: [NODOS[desde]], largo: 0 };
  const nodos = [hasta];
  const puntos: Punto[] = [NODOS[hasta]];
  let largo = 0;
  let actual = hasta;
  while (actual !== desde) {
    const { n, t } = previo.get(actual)!;
    // Puntos del tramo en el sentido del recorrido (de n a actual), sin el primero.
    const pts = t.a === n ? t.puntos : [...t.puntos].reverse();
    for (let i = pts.length - 2; i >= 1; i--) puntos.unshift(pts[i]);
    puntos.unshift(NODOS[n]);
    nodos.unshift(n);
    largo += t.largo;
    actual = n;
  }
  return { nodos, puntos, largo };
}
