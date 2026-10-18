/**
 * Escala real del mapa del juego: 1 unidad = 1 m.
 *
 * El mapa se generó al principio a 1 unidad = 2 m (y así están los umbrales internos de
 * geojson-a-mapa.mjs). Las personas, los coches y las alturas siempre han estado en metros,
 * así que todo lo horizontal salía a mitad de tamaño. `escalarLinea` lleva un linea.json de
 * 2 m/unidad a 1 m/unidad (coordenadas y medidas ×2, superficies ×4).
 *
 *   node scripts/escala-mapa.mjs src/datos/linea.json   # convierte el fichero (una vez)
 */
import fs from "node:fs";

export const E = 2;

const p = (q) => [Math.round(q[0] * E * 10) / 10, Math.round(q[1] * E * 10) / 10, ...q.slice(2)];
const anillos = (a) => a.map((r) => r.map(p));

export function escalarLinea(d) {
  if (d.proy.escala === 1) return d;
  d.proy = { ...d.proy, kx: d.proy.kx * E, ky: d.proy.ky * E, escala: 1 };
  d.verja = Math.round(d.verja * E);
  d.costa = d.costa.map(p);
  for (const k of Object.keys(d.capas)) d.capas[k] = d.capas[k].map(anillos);
  // [x, y, w, d, ang, tipo, plantas]
  d.edificios = d.edificios.map(([x, y, w, dd, ...r]) => [...p([x, y]), Math.round(w * E * 10) / 10, Math.round(dd * E * 10) / 10, ...r]);
  d.red.nodos = d.red.nodos.map(p);
  d.red.tramos = d.red.tramos.map(([a, b, c, n, m]) => [a, b, c, n, m.map((v) => Math.round(v * E * 10) / 10)]);
  d.arboles = d.arboles.map(p);
  d.solares = d.solares.map(([x, y, s]) => [...p([x, y]), Math.round(s * E * E)]);
  d.puerto = d.puerto.map((r) => r.map(p));
  for (const k of Object.keys(d.poi)) d.poi[k] = p(d.poi[k]);
  const rect = ([x, y, w, dd, ...r]) => [...p([x, y]), Math.round(w * E * 10) / 10, Math.round(dd * E * 10) / 10, ...r];
  d.deportes.pistas = d.deportes.pistas.map(rect);
  d.deportes.gradas = d.deportes.gradas.map(rect);
  if (d.deportes.estadio) d.deportes.estadio = rect(d.deportes.estadio);
  return d;
}

if (process.argv[1]?.endsWith("escala-mapa.mjs") && process.argv[2]) {
  const f = process.argv[2];
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  fs.writeFileSync(f, JSON.stringify(escalarLinea(d)));
  console.log("linea.json a 1 m por unidad");
}
