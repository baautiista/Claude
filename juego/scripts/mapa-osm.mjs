#!/usr/bin/env node
/**
 * Descarga el trazado real de La Línea de OpenStreetMap (Overpass API) y lo
 * convierte a coordenadas del juego en src/datos/mapa-real.json.
 *
 *   npm run mapa
 *
 * Requiere acceso de red a overpass-api.de. Datos © colaboradores de
 * OpenStreetMap, licencia ODbL: hay que citarlo en los créditos (ya está en el
 * menú del juego).
 *
 * Qué genera:
 *   - tierra: contorno del término municipal (anillos exteriores).
 *   - calles: vías con nombre, marcadas como principales o secundarias.
 *   - lugares: posición real, en coordenadas del juego, de los sitios buscados
 *     por nombre; sirve para recolocar NODOS en src/datos/mapa.ts.
 */
import { writeFileSync } from "node:fs";

const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

// Caja que cubre el casco urbano y la Verja (sur, oeste, norte, este).
const CAJA = { s: 36.148, w: -5.372, n: 36.19, e: -5.328 };
const MUNDO = { ancho: 1000 };

const BUSCAR = {
  plaza: "Plaza de la Iglesia",
  mercado: "Mercado",
  estacion: "Estación de Autobuses",
  estadio: "Estadio Municipal",
  atunara: "Puerto de La Atunara",
  calleReal: "Calle Real",
  avenidaEspana: "Avenida de España",
};

const consulta = `
[out:json][timeout:90];
(
  relation["boundary"="administrative"]["admin_level"="8"]["name"="La Línea de la Concepción"];
)->.municipio;
.municipio out geom;
way["highway"~"^(primary|secondary|tertiary|residential|pedestrian|living_street|unclassified)$"](${CAJA.s},${CAJA.w},${CAJA.n},${CAJA.e});
out geom tags;
nwr["name"](${CAJA.s},${CAJA.w},${CAJA.n},${CAJA.e});
out center tags;
`;

console.log("Descargando de Overpass…");
const r = await fetch(OVERPASS, { method: "POST", body: "data=" + encodeURIComponent(consulta) });
if (!r.ok) {
  console.error(`Overpass respondió ${r.status}. ¿Hay acceso de red a ${new URL(OVERPASS).host}?`);
  process.exit(1);
}
const { elements } = await r.json();

// Proyección equirrectangular a escala real: el ancho de la caja ocupa el
// ancho del mundo (≈ 4 m por unidad). Al pasar al trazado real hay que revisar
// también GIBRALTAR, PENON, PISTA y la línea de la Verja en mapa.ts.
const latMedia = ((CAJA.s + CAJA.n) / 2) * (Math.PI / 180);
const escala = MUNDO.ancho / ((CAJA.e - CAJA.w) * Math.cos(latMedia));
const proyectar = (lat, lon) => [Math.round((lon - CAJA.w) * Math.cos(latMedia) * escala), Math.round((CAJA.n - lat) * escala)];

// Contorno del municipio: une los tramos exteriores en anillos.
const tierra = [];
const municipio = elements.find((el) => el.type === "relation");
if (municipio) {
  const tramos = municipio.members.filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry.map((g) => [g.lat, g.lon]));
  while (tramos.length) {
    let anillo = tramos.shift();
    let cambiado = true;
    while (cambiado) {
      cambiado = false;
      for (let i = 0; i < tramos.length; i++) {
        const t = tramos[i];
        const fin = anillo[anillo.length - 1];
        const igual = (a, b) => a[0] === b[0] && a[1] === b[1];
        if (igual(fin, t[0])) anillo = anillo.concat(t.slice(1));
        else if (igual(fin, t[t.length - 1])) anillo = anillo.concat(t.slice(0, -1).reverse());
        else continue;
        tramos.splice(i, 1);
        cambiado = true;
        break;
      }
    }
    tierra.push(anillo.map(([lat, lon]) => proyectar(lat, lon)));
  }
}

const PRINCIPALES = new Set(["primary", "secondary", "tertiary", "pedestrian"]);
const calles = elements
  .filter((el) => el.type === "way" && el.tags?.highway && el.geometry)
  .map((el) => ({
    nombre: el.tags.name ?? "",
    principal: PRINCIPALES.has(el.tags.highway),
    puntos: el.geometry.map((g) => proyectar(g.lat, g.lon)),
  }));

const lugares = {};
for (const [clave, nombre] of Object.entries(BUSCAR)) {
  const el = elements.find((x) => x.tags?.name?.toLowerCase().includes(nombre.toLowerCase()));
  const c = el?.center ?? (el?.lat ? { lat: el.lat, lon: el.lon } : el?.geometry?.[0]);
  if (c) lugares[clave] = proyectar(c.lat, c.lon);
}

const salida = new URL("../src/datos/mapa-real.json", import.meta.url);
writeFileSync(salida, JSON.stringify({ fuente: "© colaboradores de OpenStreetMap (ODbL)", tierra, calles, lugares }));
console.log(`Listo: ${tierra.length} contornos, ${calles.length} calles, ${Object.keys(lugares).length} lugares → src/datos/mapa-real.json`);
console.log("Posiciones reales para recolocar NODOS en src/datos/mapa.ts:");
for (const [k, v] of Object.entries(lugares)) console.log(`  ${k}: [${v[0]}, ${v[1]}]`);
