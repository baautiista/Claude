import { azar } from "./datos.ts";

/**
 * Puzles de conexión para la electricidad y la fontanería (reglas ficticias de
 * juego). El servidor genera el puzle con una semilla y comprueba la solución:
 * el cliente solo envía cómo ha girado cada pieza.
 *
 * Cada pieza tiene conexiones en 4 lados (bits: 1 norte, 2 este, 4 sur, 8 oeste).
 * Girar una pieza 90° en sentido horario rota los bits.
 */

export interface Puzle {
  ancho: number;
  alto: number;
  /** Conexiones de cada pieza en su posición original (solución). */
  piezas: number[];
  /** Giros iniciales (0-3) con los que se presenta revuelto. */
  giros: number[];
  origen: number;
  destinos: number[];
}

export const girar = (m: number, veces: number) => {
  let r = m;
  for (let i = 0; i < ((veces % 4) + 4) % 4; i++) r = ((r << 1) | (r >> 3)) & 15;
  return r;
};

/** Árbol aleatorio que une el origen con los destinos; las casillas libres quedan vacías. */
export function generarPuzle(semilla: number, ancho: number, alto: number, nDestinos: number): Puzle {
  const r = azar(semilla);
  const n = ancho * alto;
  const piezas = new Array(n).fill(0);
  const origen = Math.floor(r() * alto) * ancho;
  const visit = new Set([origen]);
  const frontera: [number, number][] = [];
  const vecinos = (i: number) => {
    const x = i % ancho;
    const y = Math.floor(i / ancho);
    const out: [number, number, number][] = [];
    if (y > 0) out.push([i - ancho, 1, 4]);
    if (x < ancho - 1) out.push([i + 1, 2, 8]);
    if (y < alto - 1) out.push([i + ancho, 4, 1]);
    if (x > 0) out.push([i - 1, 8, 2]);
    return out;
  };
  const anadir = (i: number) => {
    for (const [j] of vecinos(i)) if (!visit.has(j)) frontera.push([i, j]);
  };
  anadir(origen);
  // Árbol de expansión aleatorio que cubre ~75 % del tablero.
  while (frontera.length && visit.size < n * 0.75) {
    const k = Math.floor(r() * frontera.length);
    const [a, b] = frontera.splice(k, 1)[0];
    if (visit.has(b)) continue;
    const v = vecinos(a).find(([j]) => j === b)!;
    piezas[a] |= v[1];
    piezas[b] |= v[2];
    visit.add(b);
    anadir(b);
  }
  // Destinos: hojas del árbol lejos del origen.
  const hojas = [...visit].filter((i) => i !== origen && [1, 2, 4, 8].includes(piezas[i]));
  hojas.sort((a, b) => (b % ancho) - (a % ancho) + (r() - 0.5) * 2);
  const destinos = hojas.slice(0, Math.max(1, Math.min(nDestinos, hojas.length)));
  // Se podan las ramas que no llevan a ningún destino (piezas sin uso → vacías).
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (let i = 0; i < n; i++) {
      if (i === origen || destinos.includes(i)) continue;
      const m = piezas[i];
      if ([1, 2, 4, 8].includes(m)) {
        const v = vecinos(i).find(([, b]) => b === m)!;
        piezas[i] = 0;
        piezas[v[0]] &= ~v[2];
        cambio = true;
      }
    }
  }
  const giros = piezas.map((m) => (m === 0 || m === 15 ? 0 : 1 + Math.floor(r() * 3)));
  return { ancho, alto, piezas, giros, origen, destinos };
}

/**
 * Comprueba una solución: `giros` es cuántas veces ha girado el jugador cada pieza
 * desde la posición en que se le presentó. Devuelve los destinos alcanzados y las
 * fugas (conexiones que no encajan con la pieza vecina) del circuito activo.
 */
export function comprobarPuzle(p: Puzle, girosJugador: number[]) {
  const n = p.ancho * p.alto;
  if (!Array.isArray(girosJugador) || girosJugador.length !== n) return { resuelto: false, alcanzados: 0, fugas: 99 };
  // Pieza presentada = solución girada al revés por el giro inicial; luego gira el jugador.
  const mascara = (i: number) => girar(p.piezas[i], -p.giros[i] + (Math.round(girosJugador[i]) || 0));
  const dirs: [number, number, number, number][] = [[1, 0, -1, 4], [2, 1, 0, 8], [4, 0, 1, 1], [8, -1, 0, 2]];
  const vistos = new Set([p.origen]);
  const cola = [p.origen];
  let fugas = 0;
  while (cola.length) {
    const i = cola.shift()!;
    const m = mascara(i);
    const x = i % p.ancho;
    const y = Math.floor(i / p.ancho);
    for (const [bit, dx, dy, opuesto] of dirs) {
      if (!(m & bit)) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= p.ancho || ny >= p.alto) {
        fugas++;
        continue;
      }
      const j = ny * p.ancho + nx;
      if (!(mascara(j) & opuesto)) {
        fugas++;
        continue;
      }
      if (!vistos.has(j)) {
        vistos.add(j);
        cola.push(j);
      }
    }
  }
  const alcanzados = p.destinos.filter((d) => vistos.has(d)).length;
  return { resuelto: alcanzados === p.destinos.length && fugas === 0, alcanzados, fugas };
}
