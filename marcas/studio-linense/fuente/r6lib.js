// Studio Linense · Trama variable. Módulos geométricos sobre una retícula; el símbolo es una S de cuatro piezas.
const o = require('opentype.js');
const fs = require('fs');

const PAL = { negro: '#0B0B0B', azul: '#0057FF', lima: '#D7FF00', blanco: '#F6F6F6' };
const U = 100, GAP = 14;          // módulo y separación (la "línea" entre piezas)
const n2 = (v) => +(+v).toFixed(2);
const svg = (vb, body, cls = '', label = 'Studio Linense') =>
  `<svg class="${cls}" viewBox="${vb.map(n2).join(' ')}" role="img" aria-label="${label}">${body}</svg>`;

/* ---------- Módulos básicos (celda 100 × 100, girables 0/90/180/270) ----------
   s  cuadrado
   r  esquina redondeada (radio 62 % del módulo)
   d  medio disco (un lado convertido en semicírculo)
   q  cuarto de disco (la "vela")
   a  arco (dos esquinas redondeadas, radio 40 %)                              */
const BASE = {
  s: (x, y) => `M${x} ${y}H${x + U}V${y + U}H${x}Z`,
  r: (x, y) => { const k = U * 0.62; return `M${x} ${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}H${x + U}V${y + U}H${x}Z`; },
  d: (x, y) => `M${x} ${y}H${x + U / 2}A${U / 2} ${U / 2} 0 0 1 ${x + U / 2} ${y + U}H${x}Z`,
  q: (x, y) => `M${x} ${y + U}A${U} ${U} 0 0 1 ${x + U} ${y}V${y + U}Z`,
  a: (x, y) => { const k = U * 0.4; return `M${x} ${y + U}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}H${x + U - k}A${k} ${k} 0 0 1 ${x + U} ${y + k}V${y + U}Z`; },
};
// m = [tipo, giro, color]; col, fila en la retícula
function modulo([t, giro = 0, color], col, fila) {
  const x = col * (U + GAP), y = fila * (U + GAP);
  const tr = giro ? ` transform="rotate(${giro} ${x + U / 2} ${y + U / 2})"` : '';
  return `<path d="${BASE[t](x, y)}" fill="${color}"${tr}/>`;
}
// trama: matriz de filas de módulos (null = hueco)
function trama(filas, cls = 'sym', label) {
  const body = filas.map((f, j) => f.map((m, i) => (m ? modulo(m, i, j) : '')).join('')).join('');
  const w = filas[0].length * (U + GAP) - GAP, h = filas.length * (U + GAP) - GAP;
  return { body, w, h, svg: svg([0, 0, w, h], body, cls, label || 'Símbolo Studio Linense') };
}

/* ---------- El símbolo: una S de cuatro piezas ----------
   arriba izq.: esquina redondeada (inicio de la S) · arriba der.: cuadrado
   abajo izq.: esquina redondeada abajo (giro de la S) · abajo der.: medio disco (vientre de la S) */
const simboloFilas = (A, K) => [
  [['r', 0, A], ['s', 0, K]],
  [['r', 270, K], ['d', 0, A]],
];
// Logo principal: la S completa en tres filas
const principalFilas = (A, K) => [
  [['r', 0, A], ['s', 0, K]],
  [['d', 180, K], ['d', 0, A]],
  [['r', 270, K], ['q', 180, K]],
];
const simbolo = (A, K, cls) => trama(simboloFilas(A, K), cls).svg;

/* ---------- Tipografía (trazada) ---------- */
const fuente = (w) => {
  const b = fs.readFileSync(`${__dirname}/node_modules/@fontsource/montserrat/files/montserrat-latin-${w}-normal.woff`);
  return o.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const LIGHT = fuente(300), BOLD = fuente(700);
function texto(f, str, cap, tracking) {
  const size = cap / (f.tables.os2.sCapHeight / f.unitsPerEm), k = size / f.unitsPerEm;
  const gl = [...str].map((c) => f.charToGlyph(c));
  let x = 0;
  const parts = gl.map((g, i) => { const p = { g, x }; x += g.advanceWidth * k + (i < gl.length - 1 ? (tracking / 1000) * size : 0); return p; });
  const left = gl[0].getBoundingBox().x1 * k, lp = parts[parts.length - 1];
  return { w: lp.x + lp.g.getBoundingBox().x2 * k - left,
    d: (ox, base) => parts.map((p) => p.g.getPath(ox - left + p.x + 0.001, base + 0.001, size).toPathData(2)).join('') };
}
// Nombre en una línea: STUDIO fina + LINENSE negra, ambas muy espaciadas
function nombreLinea(cap, c) {
  const s = texto(LIGHT, 'STUDIO', cap, 380), l = texto(BOLD, 'LINENSE', cap, 300), esp = cap * 1.1;
  return { w: s.w + esp + l.w, h: cap, draw: (x, base) => `<path fill="${c}" d="${s.d(x, base)}"/><path fill="${c}" d="${l.d(x + s.w + esp, base)}"/>` };
}
function nombreDos(cap, c) {
  const s = texto(LIGHT, 'STUDIO', cap, 380), l = texto(BOLD, 'LINENSE', cap, 300);
  return { w: Math.max(s.w, l.w), h: cap * 2.45, draw: (x, y) => `<path fill="${c}" d="${s.d(x, y + cap)}"/><path fill="${c}" d="${l.d(x, y + cap * 2.45)}"/>` };
}

/* ---------- Versiones ---------- */
function logoPrincipal(c) {
  const t = trama(principalFilas(c.A, c.K));
  const nom = nombreLinea(34, c.T);
  const W = Math.max(t.w, nom.w), xS = (W - t.w) / 2, yN = t.h + 70;
  return svg([0, 0, W, yN + 34], `<g transform="translate(${n2(xS)} 0)">${t.body}</g>` + nom.draw((W - nom.w) / 2, yN + 34), 'logo');
}
function logoHorizontal(c) {
  const t = trama(simboloFilas(c.A, c.K));
  const nom = nombreLinea(46, c.T), x = t.w + 56;
  return svg([0, 0, x + nom.w, t.h], t.body + nom.draw(x, t.h / 2 + 23), 'hor');
}
function logoApilado(c) {
  const t = trama(simboloFilas(c.A, c.K));
  const nom = nombreDos(44, c.T), x = t.w + 52;
  return svg([0, 0, x + nom.w, t.h], t.body + nom.draw(x, (t.h - nom.h) / 2), 'hor');
}
function appIcono(bg, A, K, radio = 0.22) {
  const t = trama(simboloFilas(A, K));
  const L = t.w * 1.7, off = (L - t.w) / 2;
  return svg([0, 0, L, L], `<rect width="${n2(L)}" height="${n2(L)}" rx="${n2(L * radio)}" fill="${bg}"/><g transform="translate(${n2(off)} ${n2(off)})">${t.body}</g>`, 'app');
}

/* ---------- Sistema: variaciones y submarcas ---------- */
const VARIACIONES = (A, K) => [
  [[['r', 0, A], ['d', 180, K]], [['q', 270, K], ['r', 90, A]]],
  [[['d', 180, A], ['s', 0, K]], [['s', 0, A], ['a', 180, K]]],
  [[['s', 0, K], ['d', 0, A]], [['a', 180, K], ['r', 180, A]]],
  [[['d', 270, K], ['q', 90, A]], [['s', 0, K], null]],
  [[['q', 0, A], ['q', 90, K]], [['q', 270, K], ['q', 180, A]]],
  [[['a', 0, K], ['r', 90, A]], [['d', 180, A], ['a', 180, K]]],
  [[['r', 0, A], ['s', 0, K]], [['s', 0, K], ['q', 180, A]]],
  [[['d', 180, K], ['d', 0, A]], [['d', 180, A], ['d', 0, K]]],
];
const SUBMARCAS = [
  { n: 'Ads', t: 'Publicidad que se adapta.', f: (A, K) => [[['r', 0, A], ['s', 0, K]], [['s', 0, K], ['d', 0, A]]] },
  { n: 'Media', t: 'Contenidos en movimiento.', lima: true, f: (A, K) => [[['r', 0, A], ['r', 90, K]], [['s', 0, K], ['d', 90, A]]] },
  { n: 'Web', t: 'Experiencias conectadas.', f: (A, K) => [[['a', 0, A], ['s', 0, K]], [['a', 180, K], ['s', 0, A]]] },
  { n: 'Shop', t: 'Ideas que llegan más lejos.', f: (A, K) => [[['a', 0, A], ['r', 90, K]], [['r', 270, K], ['d', 0, A]]] },
];

module.exports = { PAL, U, GAP, BASE, trama, simbolo, simboloFilas, principalFilas, logoPrincipal, logoHorizontal, logoApilado, appIcono, VARIACIONES, SUBMARCAS, nombreLinea, nombreDos, svg, n2 };
