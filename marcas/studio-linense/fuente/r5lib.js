// Ronda 5 de Studio Linense: "linense" en minúscula, trazo continuo, una letra transformada.
// Altura x = 100 u (y = 0 arriba, y = 100 línea base). Ascendente hasta y = -64.
const o = require('opentype.js');
const fs = require('fs');

const S = 30, h = S / 2, G = 13, ASC = -64;
const n2 = (v) => +(+v).toFixed(2);
const svg = (vb, body, cls = '', label = 'Studio Linense') =>
  `<svg class="${cls}" viewBox="${vb.map(n2).join(' ')}" role="img" aria-label="${label}">${body}</svg>`;
const st = (d, c, w = S, cap = 'butt') =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
let uid = 0;

const sch = (() => {
  const b = fs.readFileSync(`${__dirname}/node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff`);
  return o.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
})();
function studio(cap, tracking = 260) {
  const f = sch, size = cap / (f.tables.os2.sCapHeight / f.unitsPerEm), k = size / f.unitsPerEm;
  const gl = [...'STUDIO'].map((c) => f.charToGlyph(c));
  let x = 0;
  const parts = gl.map((g, i) => { const p = { g, x }; x += g.advanceWidth * k + (i < gl.length - 1 ? (tracking / 1000) * size : 0); return p; });
  const left = gl[0].getBoundingBox().x1 * k, lp = parts[parts.length - 1];
  return { w: lp.x + lp.g.getBoundingBox().x2 * k - left,
    draw: (ox, base, fill) => `<path fill="${fill}" d="${parts.map((p) => p.g.getPath(ox - left + p.x + 0.001, base + 0.001, size).toPathData(2)).join('')}"/>` };
}

/* ---------- Letras base (trazo de centro) ---------- */
const g = {
  l: (x) => ({ d: `M${x + h} ${ASC}V100`, w: S }),
  i: (x) => ({ d: `M${x + h} 0V100`, w: S, punto: [x + h, -36] }),
  n: (x) => ({ d: `M${x + h} 0V100M${x + h} 50A35 35 0 0 1 ${x + 85} 50V100`, w: 100 }),
  // e: barra de izquierda a derecha y bucle abierto abajo a la derecha
  e: (x) => ({ d: `M${x + h} 50H${x + 85}A35 35 0 1 0 ${n2(x + 50 + 35 * Math.cos(0.85))} ${n2(50 + 35 * Math.sin(0.85))}`, w: 100 }),
  s: (x, w = 80) => ({ d: `M${x + w - 12} 22C${x + w - 22} 10 ${x + 18} 6 ${x + 17} 30C${x + 16} 52 ${x + w - h} 46 ${x + w - h} 70C${x + w - h} 96 ${x + 18} 98 ${x + 10} 80`, w }),
};
const punto = ([cx, cy], c) => `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="18" fill="${c}"/>`;
// el punto de la i como cuña de roca: cara norte vertical, cresta, pendiente
const puntoRoca = ([cx, cy], c) =>
  `<path d="M${cx - 14} ${cy + 16}V${cy - 14}L${cx - 6} ${cy - 20}L${cx + 18} ${cy + 16}Z" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`;

function componer(seq, c, extras = {}) {
  // seq: lista de [letra, opciones]; devuelve trazos y posiciones
  let x = 0;
  const out = [], pos = [];
  seq.forEach(([k, op = {}], i) => {
    const gl = k === 's' ? g.s(x, op.w) : g[k](x);
    pos.push({ k, x, w: gl.w });
    if (!op.omit) out.push(st(gl.d, op.color || c.a));
    if (gl.punto) out.push((op.punto || punto)(gl.punto, op.puntoColor || c.a));
    x += gl.w + (op.gap ?? G);
  });
  return { out, pos, w: x - (seq[seq.length - 1][1]?.gap ?? G) };
}
const conStudio = (w, c) => {
  const t = studio(19);
  return t.draw(w - t.w, -30, c.stu);
};

/* =========================================================
   A · ISTMO — "line" y "nse" unidos por un cuello líquido;
   la barra de la e cruza hacia la n.
   ========================================================= */
function istmo(c, { conS = true } = {}) {
  const GAP = 58;
  const seq = [['l'], ['i'], ['n'], ['e', { gap: GAP }], ['n'], ['s'], ['e']];
  const w = componer(seq, c);
  const e = w.pos[3], n = w.pos[4];
  const a = e.x + 100 - 4, b = n.x + 4, m = (a + b) / 2;
  // cuello: se estrecha hasta 12 u en el centro
  const q = (b - a) / 2;
  const cuello = `<path d="M${a} 35C${a + q * 0.6} 35 ${m - q * 0.5} 43 ${m} 43C${m + q * 0.5} 43 ${b - q * 0.6} 35 ${b} 35V65C${b - q * 0.6} 65 ${m + q * 0.5} 57 ${m} 57C${m - q * 0.5} 57 ${a + q * 0.6} 65 ${a} 65Z" fill="${c.b}"/>`;
  return { body: w.out.join('') + cuello + (conS ? conStudio(w.w, c) : ''), w: w.w, pos: w.pos, cuelloX: [e.x, n.x + 100] };
}
const istmoLogo = (c) => { const w = istmo(c); return svg([-2, ASC - 2, w.w + 4, 100 - ASC + 4], w.body, 'word'); };
const istmoIcono = (c) => {
  const w = istmo(c, { conS: false });
  const [x0, x1] = w.cuelloX;
  const pad = (x1 - x0) * 0.08, id = 'ii' + uid++, L = x1 - x0 + 2 * pad;
  return svg([x0 - pad, 50 - L / 2, L, L], `<defs><clipPath id="${id}"><rect x="${x0 - 2}" y="-200" width="${x1 - x0 + 4}" height="400"/></clipPath></defs><g clip-path="url(#${id})">${w.body}</g>`, 'sym');
};

/* =========================================================
   B · COSTA — la s se estira como una ola; el punto de la i es una cuña de roca.
   ========================================================= */
function costa(c, { conS = true } = {}) {
  const seq = [['l'], ['i', { punto: puntoRoca, puntoColor: c.r || c.a }], ['n'], ['e'], ['n'], ['s', { w: 150, color: c.ola || c.a }], ['e']];
  const w = componer(seq, c);
  return { body: w.out.join('') + (conS ? conStudio(w.w, c) : ''), w: w.w };
}
const costaLogo = (c) => { const w = costa(c); return svg([-2, ASC - 2, w.w + 4, 100 - ASC + 4], w.body, 'word'); };
const costaIcono = (c) => svg([-62, -70, 170, 170], st(g.i(0).d, c.a) + puntoRoca(g.i(0).punto, c.r || c.a) +
  st(`M-60 100H100`, c.ola || c.a, S * 0.5), 'sym');

/* =========================================================
   C · BUCLE — la l es una línea que sube en pendiente, se enrosca y cae
   en vertical cruzándose a sí misma (corte limpio en el cruce).
   ========================================================= */
const BU = { sube: 'M-78 100H-58C-20 100 30 20 48 -28C60 -60 42 -76 26 -72C14 -69 12 -56 12 -40', baja: 'M12 -40V100' };
function bucle(c, { conS = true, soloL = false } = {}) {
  const id = 'bu' + uid++;
  // el trazo que baja tapa al que sube con un corte del color del fondo (máscara)
  const L = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-120" y="-120" width="400" height="300">` +
    `<rect x="-120" y="-120" width="400" height="300" fill="#fff"/>${st(BU.baja, '#000', S + 14)}</mask></defs>` +
    `<g mask="url(#${id})">${st(BU.sube, c.l || c.a)}</g>${st('M12 -44V100', c.l || c.a)}`;
  if (soloL) return { body: L };
  const seq = [['i'], ['n'], ['e'], ['n'], ['s'], ['e']];
  const w = componer(seq, c);
  const xo = 66 + G;
  return { body: L + `<g transform="translate(${xo} 0)">${w.out.join('')}${conS ? conStudio(w.w, c) : ''}</g>`, x0: -70 - h, w: xo + w.w };
}
const bucleLogo = (c) => { const w = bucle(c); return svg([-78 - 2, -90, w.w + 78 + 4, 194], w.body, 'word'); };
const bucleIcono = (c) => svg([-96, -92, 200, 200], bucle(c, { soloL: true }).body, 'sym');

/* ---------- Bocetos descartados ---------- */
function rotulista(c) {
  const id = 'ro' + uid++;
  const w = componer([['l'], ['i'], ['n'], ['e'], ['n'], ['s'], ['e']], c);
  return svg([-6, ASC - 6, w.w + 12, 100 - ASC + 12], `<defs><filter id="${id}" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="12"/></filter></defs><g filter="url(#${id})" transform="skewX(-8)">${w.out.join('')}</g>`, 'word');
}
function cinta(c) {
  const w = componer([['l'], ['i'], ['n'], ['e'], ['n'], ['s', { gap: 10 }], ['e', { omit: true }]], c);
  const x = w.pos[6].x;
  return svg([-2, ASC - 2, w.w + 60, 100 - ASC + 30], w.out.join('') + st(`M${x + 10} 50H${x + 120}C${x + 150} 50 ${x + 140} 0 ${x + 80} 0C${x + 20} 0 ${x} 40 ${x + 10} 80C${x + 20} 120 ${x + 100} 120 ${x + 140} 100`, c.a), 'word');
}
function puntoAparte(c) {
  const w = componer([['l'], ['i', { omit: true }], ['n'], ['e'], ['n'], ['s'], ['e']], c);
  return svg([-2, ASC - 2, w.w + 4, 100 - ASC + 4], w.out.join('').replace(/<circle cx="([\d.]+)" cy="-36"/, '<circle cx="$1" cy="82"'), 'word');
}


/* =========================================================
   PERFIL — la altura de cada letra sigue el perfil del Peñón visto desde poniente:
   cara norte vertical en la l, pico, cresta larga y bajada hacia el sur. Los remates se cortan en diagonal.
   ========================================================= */
const alto = {
  l: (x, T) => ({ d: `M${x + h} ${T}V100`, w: S }),
  i: (x, T) => ({ d: `M${x + h} ${T}V100`, w: S }),
  n: (x, T) => ({ d: `M${x + h} 100V${T}M${x + h} ${T + h + 35}A35 35 0 0 1 ${x + 85} ${T + h + 35}V100`, w: 100 }),
  e: (x, T) => { const yc = (T + 100) / 2, ry = (100 - T - S) / 2; return { d: `M${x + h} ${n2(yc)}H${x + 85}A35 ${n2(ry)} 0 1 0 ${n2(x + 50 + 35 * Math.cos(0.85))} ${n2(yc + ry * Math.sin(0.85))}`, w: 100 }; },
  s: (x, T) => { const k = (100 - T) / 100, Y = (y) => n2(T + y * k), w = 80;
    return { d: `M${x + w - 12} ${Y(22)}C${x + w - 22} ${Y(10)} ${x + 18} ${Y(6)} ${x + 17} ${Y(30)}C${x + 16} ${Y(52)} ${x + w - h} ${Y(46)} ${x + w - h} ${Y(70)}C${x + w - h} ${Y(96)} ${x + 18} ${Y(98)} ${x + 10} ${Y(80)}`, w }; },
};
function perfil(c, { conS = true } = {}) {
  const orden = ['l', 'i', 'n', 'e', 'n', 's', 'e'];
  const anchos = orden.map((k) => (k === 'l' || k === 'i' ? S : k === 's' ? 80 : 100));
  const W = anchos.reduce((a, b) => a + b, 0) + G * (orden.length - 1);
  // perfil (y) en función de x: cara norte, pico, cresta, collado, bajada al sur
  const P = [[0, -112], [22, -120], [W * 0.34, -90], [W * 0.52, -84], [W * 0.70, -52], [W * 0.87, -12], [W + 6, 10]];
  const yEn = (x) => { for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return P[P.length - 1][1]; };
  const id = 'pf' + uid++;
  let x = 0, letras = '', punto = '';
  orden.forEach((k, i) => {
    const cx = x + anchos[i] / 2;
    let T = Math.min(yEn(x), yEn(x + anchos[i])) - 4;
    if (k === 'i') { const y = yEn(cx); T = y + 54; punto = `<circle cx="${n2(cx)}" cy="${n2(y + 24)}" r="17" fill="${c.p || c.a}"/>`; }
    letras += st(alto[k](x, n2(T)).d, c.a);
    x += anchos[i] + G;
  });
  const clip = `<defs><clipPath id="${id}"><polygon points="0,104 ${P.map((p) => p.map(n2).join(',')).join(' ')} ${n2(W + 6)},104"/></clipPath></defs>`;
  let stu = '';
  if (conS) { const t = studio(17); stu = t.draw(W - t.w, -70, c.stu); }
  return { body: clip + `<g clip-path="url(#${id})">${letras}</g>` + punto + stu, w: W };
}
const perfilLogo = (c) => { const w = perfil(c); return svg([-4, -126, w.w + 10, 232], w.body, 'word'); };
const perfilIcono = (c) => {
  const id = 'pi' + uid++;
  return svg([-96, -126, 232, 232], `<defs><clipPath id="${id}"><rect x="-10" y="-140" width="88" height="260"/></clipPath></defs><g clip-path="url(#${id})">${perfil(c, { conS: false }).body}</g>`, 'sym');
};

/* CONTRAFORMA (boceto) — letras macizas; el ojo de la primera e es una cuña en negativo */
function contraforma(c) {
  const w = componer([['l'], ['i'], ['n'], ['e'], ['n'], ['s'], ['e']], c);
  const e = w.pos[3];
  return svg([-2, ASC - 2, w.w + 4, 100 - ASC + 4], w.out.join('') +
    `<path d="M${e.x + 34} 44V22L${e.x + 40} 18L${e.x + 70} 44Z" fill="#fff"/>` + r0(e.x + 30, 44, 44, 12), 'word');
}
const r0 = (x, y, w, hh) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#fff"/>`;

module.exports = { perfilLogo, perfilIcono, contraforma, istmoLogo, istmoIcono, costaLogo, costaIcono, bucleLogo, bucleIcono, rotulista, cinta, puntoAparte, svg };
