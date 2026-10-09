#!/usr/bin/env node
/**
 * Convierte el GeoJSON de OpenStreetMap de La Línea en la geometría del juego.
 *
 *   node scripts/geojson-a-mapa.mjs [fuentes/la-linea.geojson]
 *
 * Genera src/datos/linea.json con:
 *   - costa: silueta del lado español (el GeoJSON no trae línea de costa, así
 *     que se reconstruye por franjas con la extensión de playas, puerto, calles
 *     y edificios),
 *   - capas: polígonos de uso del suelo agrupados para el juego (césped,
 *     parques, huertos, industrial, playas, agua, piscinas, campos, solares…),
 *   - edificios: cada huella real convertida en un rectángulo orientado con su
 *     tipo (casa, bloque, nave, iglesia, escuela, público, ruina, caseta),
 *   - red: las calles reales como grafo caminable (nodos en los cruces reales
 *     de OSM y tramos con su clase, nombre y forma),
 *   - arboles, solares y puntos de interés.
 *
 * Unidades del juego: 1 unidad = 2 m. Norte arriba: x hacia el este, y hacia el sur.
 * Datos © colaboradores de OpenStreetMap (ODbL).
 */
import { readFileSync, writeFileSync } from "node:fs";

const ENTRADA = process.argv[2] ?? new URL("../fuentes/la-linea.geojson", import.meta.url).pathname;
const SALIDA = new URL("../src/datos/linea.json", import.meta.url).pathname;

// Proyección equirrectangular centrada en La Línea (2 m por unidad).
const PROY = { lon0: -5.3762, lat0: 36.2005, kx: 44921, ky: 55475 };
const RECORTE = { oeste: -5.3762, este: -5.321, sur: 36.149, norte: 36.2005 };
const LAT_VERJA = 36.1552;
const px = (lon) => (lon - PROY.lon0) * PROY.kx;
const py = (lat) => (PROY.lat0 - lat) * PROY.ky;
const r1 = (v) => Math.round(v * 10) / 10;
const dentro = ([lon, lat]) => lon >= RECORTE.oeste && lon <= RECORTE.este && lat >= RECORTE.sur && lat <= RECORTE.norte;

console.log("Leyendo", ENTRADA);
const { features } = JSON.parse(readFileSync(ENTRADA, "utf8"));

/* ── utilidades geométricas ─────────────────────────────────────────── */

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0;
  let idx = 0;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) {
    const t = Math.max(0, Math.min(1, ((pts[i][0] - a[0]) * dx + (pts[i][1] - a[1]) * dy) / l2));
    const d = Math.hypot(pts[i][0] - a[0] - t * dx, pts[i][1] - a[1] - t * dy);
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [a, b];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}

const area = (r) => {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
};

function casco(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cruz(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const hi = [];
  for (const q of p.reverse()) {
    while (hi.length >= 2 && cruz(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop();
    hi.push(q);
  }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
}

/** Rectángulo orientado de área mínima (calibres giratorios sobre el casco). */
function rectangulo(pts) {
  const h = casco(pts);
  if (h.length < 3) return null;
  let mejor = null;
  for (let i = 0; i < h.length; i++) {
    const [a, b] = [h[i], h[(i + 1) % h.length]];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const c = Math.cos(-ang);
    const s = Math.sin(-ang);
    let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const [x, y] of h) {
      const u = x * c - y * s;
      const v = x * s + y * c;
      x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v);
    }
    const ar = (x1 - x0) * (y1 - y0);
    if (!mejor || ar < mejor.ar) {
      const cu = (x0 + x1) / 2;
      const cv = (y0 + y1) / 2;
      const ci = Math.cos(ang);
      const si = Math.sin(ang);
      mejor = { ar, x: cu * ci - cv * si, y: cu * si + cv * ci, w: x1 - x0, d: y1 - y0, ang };
    }
  }
  return mejor;
}

const dentroPoli = (p, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if (r[i][1] > p[1] !== r[j][1] > p[1] && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  }
  return c;
};

let semilla = 12345;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);

/* ── capas de uso del suelo ─────────────────────────────────────────── */

function capaDe(t) {
  if (t.natural === "beach" || t.leisure === "beach_resort") return "arena";
  if (t.leisure === "marina") return "puerto";
  if (t.natural === "water" || t.waterway === "dam") return "agua";
  if (t.leisure === "swimming_pool") return "piscina";
  if (t.leisure === "pitch" || t.leisure === "stadium" || t.leisure === "sports_centre") return "campo";
  if (t.landuse === "forest" || t.natural === "wood") return "bosque";
  if (t.natural === "heath" || t.natural === "scrub") return "matorral";
  if (["orchard", "farmland", "farmyard", "allotments"].includes(t.landuse)) return "huerto";
  if (["construction", "brownfield", "greenfield"].includes(t.landuse)) return "solar";
  if (["park", "garden", "playground", "dog_park", "recreation_ground", "golf_course", "nature_reserve"].includes(t.leisure)) return "parque";
  if (["grass", "village_green", "flowerbed", "recreation_ground", "meadow"].includes(t.landuse)) return "cesped";
  if (t.landuse === "industrial" || t.landuse === "garages") return "industrial";
  if (t.landuse === "retail" || t.landuse === "commercial") return "comercial";
  if (t.landuse === "residential") return "residencial";
  if (t.landuse === "cemetery") return "cementerio";
  if ((t.highway === "pedestrian" || t.place === "square" || t.landuse === "religious" || t.amenity === "parking") && !t.building) return "plaza";
  return null;
}

const capas = {};
const arboles = [];
const solares = [];
const puerto = [];

/* ── edificios ──────────────────────────────────────────────────────── */

function tipoEdificio(t, ar) {
  const b = t.building;
  if (b === "roof" || b === "carport") return null;
  if (b === "church" || t.amenity === "place_of_worship") return 3;
  if (["industrial", "warehouse", "garages", "garage", "hangar", "manufacture"].includes(b) || t.man_made) return 2;
  if (b === "school" || b === "kindergarten" || t.amenity === "school") return 4;
  if (["public", "civic", "government", "commercial", "retail", "hotel", "hospital", "office"].includes(b) || t.amenity === "townhall" || t.amenity === "marketplace") return 5;
  if (b === "ruins" || b === "bunker" || t.historic) return 6;
  if (["hut", "farm_auxiliary", "shed", "cabin"].includes(b) || ar < 10) return 7;
  if (ar > 230 || b === "apartments" || (b === "residential" && ar > 120)) return 1;
  return 0;
}

const edificios = [];

/* ── red de calles ──────────────────────────────────────────────────── */

const CLASE = {
  motorway: 0, trunk: 0, primary: 0, motorway_link: 0, trunk_link: 0, primary_link: 0,
  secondary: 1, secondary_link: 1,
  tertiary: 2, tertiary_link: 2, unclassified: 2,
  residential: 3, living_street: 3,
  pedestrian: 4,
  service: 5,
  footway: 6, path: 6, cycleway: 6, steps: 6, bridleway: 6,
  track: 7,
};
const vias = [];
const usos = new Map();
const clave = ([lon, lat]) => `${lon.toFixed(7)},${lat.toFixed(7)}`;

const poi = {};
const BUSCAR = [
  "Plaza de la Iglesia", "Santuario de la Inmaculada Concepción", "Mercado de Abastos La Concepción", "Lonja del Puerto Pesquero",
  "Estadio Ciudad de La Línea", "Fuerte de Santa Barbara", "Estación de Autobuses de La Línea de La Concepción",
  "Puesto de aduana Frontera de Gibraltar", "Ayuntamiento de La Línea de la Concepción", "PLAZA DE TOROS DE LA LINEA",
  "Polígono Industrial El Zabal", "Playa de Levante", "Playa de La Atunara", "Alcaidesa Marina", "Recinto Ferial de La Línea de la Concepción",
  "Parroquia de San Bernardo Abad", "Museo del Istmo (Comandancia)", "Parque de La Velada", "Mercado El Junquillo",
  "Calle Real", "Paseo Marítimo de Poniente", "Estatua Camarón de la Isla", "Gibraltar International Airport", "Calle San Bernardo",
];

function puntosDe(g) {
  const out = [];
  const w = (c) => (typeof c[0] === "number" ? out.push(c) : c.forEach(w));
  w(g.coordinates);
  return out;
}

/* ── franjas para la costa ──────────────────────────────────────────── */

const PASO = 20;
const Y_VERJA = py(LAT_VERJA);
const bandas = Math.ceil(Y_VERJA / PASO) + 1;
const este = new Array(bandas).fill(-Infinity);
const oeste = new Array(bandas).fill(Infinity);

for (const f of features) {
  const t = f.properties ?? {};
  const g = f.geometry;
  if (!g) continue;
  const todos = puntosDe(g);
  if (!todos.some(dentro)) continue;
  if (t.natural === "mountain_range") continue;

  // Costa: extensión este/oeste por franjas (solo lado español).
  for (const [lon, lat] of todos) {
    const y = py(lat);
    if (y < 0 || y > Y_VERJA) continue;
    const b = Math.floor(y / PASO);
    const x = px(lon);
    if (x > este[b]) este[b] = x;
    if (x < oeste[b]) oeste[b] = x;
  }

  if (t.name && BUSCAR.includes(t.name) && !poi[t.name]) {
    const ps = todos;
    poi[t.name] = [r1(px(ps.reduce((s, p) => s + p[0], 0) / ps.length)), r1(py(ps.reduce((s, p) => s + p[1], 0) / ps.length))];
  }

  if (g.type === "Polygon") {
    const anillos = g.coordinates.map((r) => r.map(([lon, lat]) => [px(lon), py(lat)]));
    if (t.building) {
      const ext = anillos[0];
      const ar = Math.abs(area(ext));
      const tipo = tipoEdificio(t, ar);
      if (tipo === null) continue;
      const rc = rectangulo(ext);
      if (!rc || rc.w < 1 || rc.d < 1) continue;
      const plantas = Number(t["building:levels"]) || 0;
      edificios.push([r1(rc.x), r1(rc.y), r1(rc.w), r1(rc.d), Math.round(rc.ang * 100) / 100, tipo, plantas]);
      continue;
    }
    const capa = capaDe(t);
    if (!capa) continue;
    const simpl = anillos.map((r) => dp(r, 0.8).map(([x, y]) => [r1(x), r1(y)])).filter((r) => r.length >= 3);
    if (!simpl.length) continue;
    const ar = Math.abs(area(simpl[0]));
    if (ar < 3) continue;
    if (capa === "puerto" && t.name === "Puerto Pesquero de La Atunara") puerto.push(simpl[0]);
    (capas[capa] ??= []).push(simpl);
    if (capa === "solar" && ar > 250) {
      const c = simpl[0].reduce((s, p) => [s[0] + p[0] / simpl[0].length, s[1] + p[1] / simpl[0].length], [0, 0]);
      solares.push([r1(c[0]), r1(c[1]), Math.round(ar)]);
    }
    // Vegetación dentro de bosques, matorral y parques.
    const densidad = { bosque: 110, matorral: 260, parque: 320, huerto: 600 }[capa];
    if (densidad && arboles.length < 9000) {
      const ext = simpl[0];
      const xs = ext.map((p) => p[0]);
      const ys = ext.map((p) => p[1]);
      let n = Math.min(400, Math.floor(ar / densidad));
      for (let i = 0; i < n * 3 && i < 1200; i++) {
        const p = [Math.min(...xs) + azar() * (Math.max(...xs) - Math.min(...xs)), Math.min(...ys) + azar() * (Math.max(...ys) - Math.min(...ys))];
        if (!dentroPoli(p, ext)) continue;
        arboles.push([r1(p[0]), r1(p[1]), capa === "bosque" ? (azar() < 0.5 ? 1 : 0) : capa === "matorral" ? (azar() < 0.35 ? 1 : 2) : 0]);
        if (--n <= 0) break;
      }
    }
  } else if (g.type === "LineString") {
    if (t.natural === "tree_row") {
      const ps = g.coordinates.map(([lon, lat]) => [px(lon), py(lat)]);
      for (let i = 0; i < ps.length - 1; i++) {
        const l = Math.hypot(ps[i + 1][0] - ps[i][0], ps[i + 1][1] - ps[i][1]);
        for (let s = 0; s < l; s += 8) arboles.push([r1(ps[i][0] + ((ps[i + 1][0] - ps[i][0]) * s) / l), r1(ps[i][1] + ((ps[i + 1][1] - ps[i][1]) * s) / l), 0]);
      }
      continue;
    }
    const cls = CLASE[t.highway];
    if (cls === undefined) continue;
    vias.push({ coords: g.coordinates, cls, nombre: t.name ?? "" });
    g.coordinates.forEach((c, i) => {
      const k = clave(c);
      const extremo = i === 0 || i === g.coordinates.length - 1;
      usos.set(k, (usos.get(k) ?? 0) + (extremo ? 2 : 1));
    });
  }
}

/* ── grafo de calles: nodos en los cruces reales ────────────────────── */

const nodos = [];
const idNodo = new Map();
const nodo = (c) => {
  const k = clave(c);
  if (!idNodo.has(k)) {
    idNodo.set(k, nodos.length);
    nodos.push([r1(px(c[0])), r1(py(c[1]))]);
  }
  return idNodo.get(k);
};
const nombres = [""];
const idNombre = new Map([["", 0]]);
const tramos = [];
for (const v of vias) {
  let tramo = [v.coords[0]];
  for (let i = 1; i < v.coords.length; i++) {
    tramo.push(v.coords[i]);
    const fin = i === v.coords.length - 1 || (usos.get(clave(v.coords[i])) ?? 0) >= 2;
    if (!fin) continue;
    if (tramo.some(dentro)) {
      const pts = dp(tramo.map(([lon, lat]) => [px(lon), py(lat)]), 0.5);
      if (!idNombre.has(v.nombre)) {
        idNombre.set(v.nombre, nombres.length);
        nombres.push(v.nombre);
      }
      const medio = pts.slice(1, -1).flatMap(([x, y]) => [r1(x), r1(y)]);
      tramos.push([nodo(tramo[0]), nodo(tramo[tramo.length - 1]), v.cls, idNombre.get(v.nombre), medio]);
    }
    tramo = [v.coords[i]];
  }
}

/* ── costa ──────────────────────────────────────────────────────────── */

function rellenar(arr) {
  const idx = arr.map((v, i) => (Number.isFinite(v) ? i : -1)).filter((i) => i >= 0);
  return arr.map((v, i) => {
    if (Number.isFinite(v)) return v;
    const a = [...idx].reverse().find((j) => j < i);
    const b = idx.find((j) => j > i);
    if (a === undefined) return arr[b];
    if (b === undefined) return arr[a];
    return arr[a] + ((arr[b] - arr[a]) * (i - a)) / (b - a);
  });
}
const mediana = (arr, k) => arr.map((_, i) => {
  const v = arr.slice(Math.max(0, i - k), i + k + 1).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
});
const media = (arr, k) => arr.map((_, i) => {
  const v = arr.slice(Math.max(0, i - k), i + k + 1);
  return v.reduce((s, x) => s + x, 0) / v.length;
});
const E = media(mediana(rellenar(este), 3), 1).map((x) => r1(x + 8));
const O = media(mediana(rellenar(oeste), 3), 1).map((x) => (x < 25 ? -400 : r1(x - 8)));
const costa = [[-400, -400], [r1(E[0] + 40), -400]];
for (let b = 0; b < bandas; b++) costa.push([E[b], Math.min(r1(b * PASO), r1(Y_VERJA))]);
for (let b = bandas - 1; b >= 0; b--) costa.push([O[b], Math.min(r1(b * PASO), r1(Y_VERJA))]);

/* ── salida ─────────────────────────────────────────────────────────── */

const salida = {
  fuente: "© colaboradores de OpenStreetMap (ODbL)",
  proy: PROY,
  verja: r1(Y_VERJA),
  costa: dp(costa, 2),
  capas,
  edificios,
  red: { nodos, tramos, nombres },
  arboles: arboles.slice(0, 9000),
  solares: solares.sort((a, b) => b[2] - a[2]).slice(0, 40),
  puerto,
  poi,
};
writeFileSync(SALIDA, JSON.stringify(salida));
console.log(`Listo → ${SALIDA}`);
console.log(`  costa ${salida.costa.length} puntos · edificios ${edificios.length} · nodos ${nodos.length} · tramos ${tramos.length} · árboles ${salida.arboles.length} · solares ${salida.solares.length}`);
console.log("  capas:", Object.fromEntries(Object.entries(capas).map(([k, v]) => [k, v.length])));
console.log("  poi:", Object.keys(poi).length, "de", BUSCAR.length, BUSCAR.filter((n) => !poi[n]));
