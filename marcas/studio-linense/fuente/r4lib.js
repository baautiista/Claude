// Ronda 4 de Studio Linense: lettering dibujado a medida. Altura de mayúsculas = 100 u.
const o = require('opentype.js');
const fs = require('fs');

const n2 = (v) => +(+v).toFixed(2);
const r = (x, y, w, h, f) => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${f}"/>`;
const poly = (pts, f) => `<polygon points="${pts.map((p) => p.map(n2).join(',')).join(' ')}" fill="${f}"/>`;
const st = (d, c, w, cap = 'butt', join = 'miter') =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="${join}" stroke-miterlimit="10"/>`;
const svg = (vb, body, cls = '', label = 'Studio Linense') =>
  `<svg class="${cls}" viewBox="${vb.map(n2).join(' ')}" role="img" aria-label="${label}">${body}</svg>`;

// STUDIO en Schibsted Grotesk, trazado
const sch = (() => {
  const b = fs.readFileSync(`${__dirname}/node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff`);
  return o.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
})();
function studio(cap, tracking = 300) {
  const f = sch, size = cap / (f.tables.os2.sCapHeight / f.unitsPerEm), k = size / f.unitsPerEm;
  const gl = [...'STUDIO'].map((c) => f.charToGlyph(c));
  let x = 0;
  const parts = gl.map((g, i) => { const p = { g, x }; x += g.advanceWidth * k + (i < gl.length - 1 ? (tracking / 1000) * size : 0); return p; });
  const left = gl[0].getBoundingBox().x1 * k, lp = parts[parts.length - 1];
  return {
    w: lp.x + lp.g.getBoundingBox().x2 * k - left,
    draw: (ox, base, fill) => `<path fill="${fill}" d="${parts.map((p) => p.g.getPath(ox - left + p.x + 0.001, base + 0.001, size).toPathData(2)).join('')}"/>`,
  };
}

/* =========================================================
   A · SOBRE LA LÍNEA — letras rectas y anchas apoyadas en una sola línea
   que nace en el pie de la L y sigue más allá de la palabra.
   ========================================================= */
const A = { s: 22, gap: 15, ext: 150 };
function sCurva(x, w, s, top = s / 2, bot = 100 - s / 2) {
  const rr = (bot - top) / 4, l = x + s / 2, rgt = x + w - s / 2;
  return `M${n2(rgt)} ${n2(top)}H${n2(l + rr)}A${n2(rr)} ${n2(rr)} 0 0 0 ${n2(l + rr)} ${n2(top + 2 * rr)}H${n2(rgt - rr)}A${n2(rr)} ${n2(rr)} 0 0 1 ${n2(rgt - rr)} ${n2(bot)}H${n2(l)}`;
}
function lineaWord(c, opts = {}) {
  const s = A.s, g = A.gap, out = [];
  let x = 0;
  const E = (x0) => { out.push(r(x0, 0, s, 100, c.a), r(x0, 0, 58, s, c.a), r(x0, 50 - s / 2, 48, s, c.a)); return 58; };
  const N = (x0) => { const w = 78; out.push(r(x0, 0, s, 100, c.a), r(x0 + w - s, 0, s, 100, c.a), poly([[x0, 0], [x0 + s * 1.25, 0], [x0 + w, 100], [x0 + w - s * 1.25, 100]], c.a)); return w; };
  out.push(r(x, 0, s, 100, c.a)); x += s + 34;                 // L (su pie es la línea)
  out.push(r(x, 0, s, 100, c.a)); x += s + g;                  // I
  x += N(x) + g; x += E(x) + g; x += N(x) + g;
  out.push(st(sCurva(x, 66, s), c.a, s)); x += 66 + g;        // S
  x += E(x);
  const ancho = x;
  const ext = opts.ext ?? A.ext;
  // la línea: del pie de la L hasta más allá de la palabra
  out.push(r(0, 100 - s, ancho + ext, s, c.b));
  let stu = '';
  if (opts.studio !== false) {
    const t = studio(16);
    stu = t.draw(ancho + ext - t.w, 100 - s - 9, c.stu);
  }
  return { body: out.join('') + stu, w: ancho + ext, wPalabra: ancho };
}
const lineaLogo = (c) => { const w = lineaWord(c); return svg([0, 0, w.w, 100], w.body, 'word'); };
const lineaIcono = (c) => {
  // la S, ola sobre la línea del horizonte
  const s = A.s;
  return svg([0, 0, 100, 100], `<g transform="translate(17 0)">${st(sCurva(0, 66, s), c.a, s)}</g>` + r(0, 100 - s, 100, s, c.b), 'sym');
};

/* =========================================================
   B · EL PASO — la I es el poste fronterizo entre dos territorios:
   STUDIO + L en positivo | ranura | bloque con NENSE en negativo.
   ========================================================= */
const B = { s: 27, gap: 15, pad: 22, ranura: 8 };
let uid = 0;
function pasoWord(c) {
  const s = B.s, g = B.gap, p = B.pad;
  const letras = [];
  let x = 0;
  const E = (x0) => { letras.push(r(x0, 0, s, 100, '#000'), r(x0, 0, 56, s, '#000'), r(x0, 50 - s / 2, 46, s, '#000'), r(x0, 100 - s, 56, s, '#000')); return 56; };
  const N = (x0) => { const w = 80; letras.push(r(x0, 0, s, 100, '#000'), r(x0 + w - s, 0, s, 100, '#000'), poly([[x0, 0], [x0 + s * 1.2, 0], [x0 + w, 100], [x0 + w - s * 1.2, 100]], '#000')); return w; };
  // territorio izquierdo: L
  const L = r(0, 0, s, 100, c.a) + r(0, 100 - s, 84, s, c.a);
  const xI = 84 + g;
  const I = r(xI, -p, s, 100 + 2 * p, c.i || c.a);
  const xB = xI + s + B.ranura;
  x = xB + p;
  x += N(x) + g; x += E(x) + g; x += N(x) + g;
  letras.push(st(sCurva(x, 70, s), '#000', s)); x += 70 + g;
  x += E(x);
  const xFin = x + p;
  const id = 'paso' + uid++;
  const bloque = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${xB - 1}" y="${-p - 1}" width="${xFin - xB + 2}" height="${100 + 2 * p + 2}">` +
    `<rect x="${xB - 1}" y="${-p - 1}" width="${xFin - xB + 2}" height="${100 + 2 * p + 2}" fill="#fff"/>${letras.join('')}</mask></defs>` +
    `<rect x="${xB}" y="${-p}" width="${n2(xFin - xB)}" height="${100 + 2 * p}" fill="${c.b}" mask="url(#${id})"/>`;
  const t = studio(11, 200);
  const stu = t.draw(0, -p + 11, c.stu);
  return { body: L + I + bloque + stu, w: xFin, y0: -p, h: 100 + 2 * p };
}
const pasoLogo = (c) => { const w = pasoWord(c); return svg([0, w.y0, w.w, w.h], w.body, 'word'); };
const pasoIcono = (c) => svg([0, 0, 100, 100], r(14, 0, 22, 100, c.i || c.a) + r(44, 0, 56, 100, c.b), 'sym');

/* =========================================================
   C · ROCA Y MAR — trazo redondo y fluido; la L es una cuña de roca
   (cara norte vertical) con la línea a sus pies; la S es una ola; N y E comparten trazo.
   ========================================================= */
const Cc = { s: 26, gap: 14 };
function rocaL(x, c) {
  const s = Cc.s;
  // cuña: cara norte vertical, cresta corta, pendiente hacia el pie
  return poly([[x, 100], [x, 6], [x + 10, 0], [x + 46, 100 - s]].concat([[x + 46, 100]]), c.r || c.a) +
    st(`M${x + s / 2} ${100 - s / 2}H${x + 74}`, c.r || c.a, s, 'round');
}
function rocaWord(c) {
  const s = Cc.s, h = s / 2, g = Cc.g ?? Cc.gap, out = [];
  let x = 0;
  out.push(rocaL(x, c)); x += 74 + h + g;
  out.push(st(`M${x + h} ${h}V${100 - h}`, c.a, s, 'round')); x += s + g;            // I
  // N + E con el mismo trazo (ligadura)
  const nw = 74;
  out.push(st(`M${x + h} ${100 - h}V${h}L${x + nw - h} ${100 - h}V${h}H${x + nw - h + 46}M${x + nw - h} ${100 - h}H${x + nw - h + 46}M${x + nw - h} 50H${x + nw - h + 36}`, c.a, s, 'round', 'round'));
  x += nw + 46 + g;
  out.push(st(`M${x + h} ${100 - h}V${h}L${x + nw - h} ${100 - h}V${h}`, c.a, s, 'round', 'round')); x += nw + g;  // N
  // S: ola
  const sw = 64;
  out.push(st(`M${x + sw - h} ${h + 6}C${x + sw - 10} ${h - 6} ${x + h} ${h - 8} ${x + h} ${h + 18}C${x + h} 44 ${x + sw - h} 46 ${x + sw - h} 70C${x + sw - h} ${100 - h + 10} ${x + 8} ${100 - h + 10} ${x + h - 2} ${100 - h - 8}`, c.ola || c.a, s, 'round', 'round'));
  x += sw + g;
  out.push(st(`M${x + 46 + h} ${h}H${x + h}V${100 - h}H${x + 46 + h}M${x + h} 50H${x + 36 + h}`, c.a, s, 'round', 'round')); x += 46 + s;
  const t = studio(14);
  const stu = t.draw(x - t.w, -14, c.stu);
  return { body: out.join('') + stu, w: x, y0: -30, h: 130 };
}
const rocaLogo = (c) => { const w = rocaWord(c); return svg([0, w.y0, w.w, w.h], w.body, 'word'); };
const rocaIcono = (c) => svg([0, 0, 100, 100], `<g transform="translate(12 0)">${rocaL(0, c)}</g>`, 'sym');

/* =========================================================
   Bocetos descartados (B/N)
   ========================================================= */
function refraccion(c) {
  const w = lineaWord({ a: c.a, b: c.a, stu: c.a }, { ext: 0, studio: false });
  const id = 'rf' + uid++;
  return svg([-4, -4, w.w + 20, 108], `<defs><clipPath id="${id}a"><rect x="-10" y="-10" width="${w.w + 40}" height="56"/></clipPath><clipPath id="${id}b"><rect x="-10" y="54" width="${w.w + 40}" height="60"/></clipPath></defs>` +
    `<g clip-path="url(#${id}a)" transform="translate(12 0)">${w.body}</g><g clip-path="url(#${id}b)">${w.body}</g>`, 'word');
}
function estarcido(c) {
  const w = lineaWord({ a: c.a, b: c.a, stu: c.a }, { ext: 0, studio: false });
  const id = 'es' + uid++;
  let cortes = '';
  for (let x = 8; x < w.w; x += 37) cortes += `<rect x="${x}" y="-5" width="5" height="110" fill="#000"/>`;
  return svg([0, 0, w.w, 100], `<defs><mask id="${id}"><rect x="-5" y="-5" width="${w.w + 10}" height="110" fill="#fff"/>${cortes}</mask></defs><g mask="url(#${id})">${w.body}</g>`, 'word');
}
function azulejo(c) {
  const u = 50, out = [];
  // L: cuadrado + cuarto de círculo
  out.push(r(0, 0, u, 100, c.a), `<path d="M${u} ${u}A${u} ${u} 0 0 1 ${2 * u} ${2 * u}H${u}Z" fill="${c.a}"/>`);
  // I
  out.push(r(115, 0, 30, 100, c.a));
  // N: dos cuartos
  out.push(`<path d="M160 100V0A${u} ${u} 0 0 1 ${160 + u} ${u}V100Z" fill="${c.a}"/>`, `<path d="M${160 + u} 100A${u} ${u} 0 0 1 ${160 + 2 * u} ${u}V100Z" fill="${c.a}"/>`, r(160 + 2 * u - 10, 0, 10, 100, c.a));
  // E: semicírculo + barras
  out.push(`<path d="M${u * 6} 0A${u} ${u} 0 0 0 ${u * 6} 100Z" fill="${c.a}"/>`, r(u * 6, 0, 30, 22, c.a), r(u * 6, 39, 22, 22, c.a), r(u * 6, 78, 30, 22, c.a));
  return svg([0, 0, 340, 100], out.join(''), 'word');
}

module.exports = { lineaLogo, lineaIcono, pasoLogo, pasoIcono, rocaLogo, rocaIcono, refraccion, estarcido, azulejo, svg, r };
