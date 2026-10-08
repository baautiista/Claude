// Ronda 3 de Studio Linense: la línea y el Peñón. Símbolos y logotipos trazados.
const o = require('opentype.js');
const fs = require('fs');

const fuente = (fam, w) => {
  const b = fs.readFileSync(`${__dirname}/node_modules/@fontsource/${fam}/files/${fam}-latin-${w}-normal.woff`);
  return o.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const capDe = (f) => (f.tables.os2.sCapHeight || f.charToGlyph('H').getBoundingBox().y2) / f.unitsPerEm;

function texto(font, str, cap, tracking = 0) {
  const size = cap / capDe(font);
  const k = size / font.unitsPerEm;
  const gl = [...str].map((ch) => font.charToGlyph(ch));
  let x = 0;
  const parts = gl.map((g, i) => {
    const p = { g, x };
    x += g.advanceWidth * k;
    if (i < gl.length - 1) x += font.getKerningValue(g, gl[i + 1]) * k + (tracking / 1000) * size;
    return p;
  });
  const left = gl[0].getBoundingBox().x1 * k;
  const lp = parts[parts.length - 1];
  const right = lp.x + lp.g.getBoundingBox().x2 * k;
  return {
    w: right - left,
    d: (ox, base) => parts.map((p) => p.g.getPath(ox - left + p.x + 0.001, base + 0.001, size).toPathData(2)).join(''),
  };
}

const n2 = (v) => +(+v).toFixed(2);
const r = (x, y, w, h, f) => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${f}"/>`;
const pa = (d, f) => `<path d="${d}" fill="${f}"/>`;
const svg = (vb, body, cls = '', label = 'Studio Linense') =>
  `<svg class="${cls}" viewBox="${vb.map(n2).join(' ')}" role="img" aria-label="${label}">${body}</svg>`;

/* ---------- SÍMBOLOS (campo 100 × 100) ----------
   c.a = forma principal, c.b = acento (la línea), c.c = segunda masa */

// TRAZO: mar → pendiente sur → cresta → cara norte vertical → istmo (La Línea).
const TZ = { w: 12, y: 84, xN: 76 };
const TZ_ROCA = `M0 ${TZ.y}H8L56 26L${TZ.xN} 18V${TZ.y}`;
const trazoPaths = (c, extra = 0) =>
  `<path d="${TZ_ROCA}" fill="none" stroke="${c.a}" stroke-width="${TZ.w}" stroke-linejoin="miter" stroke-miterlimit="8"/>` +
  `<path d="M${TZ.xN - TZ.w / 2} ${TZ.y}H${100 + extra}" fill="none" stroke="${c.b}" stroke-width="${TZ.w}"/>` +
  // la esquina de la L en el color de la roca, para que la cara norte llegue al suelo
  r(TZ.xN - TZ.w / 2, TZ.y - TZ.w / 2, TZ.w, TZ.w, c.a);
const simTrazo = (c) => trazoPaths(c);

// RENGLONES: siete líneas alineadas a la izquierda; sus finales dibujan el perfil; la última es el horizonte.
const RG = { y0: 4, paso: 14, h: 8, largos: [14, 58, 63, 67, 74, 84, 100] };
const simRenglones = (c, extra = 0) => RG.largos.map((l, i) =>
  r(0, RG.y0 + i * RG.paso, i === RG.largos.length - 1 ? l + extra : l, RG.h, i === RG.largos.length - 1 ? c.b : c.a)).join('');

// DOS ORILLAS: ciudad baja y plana | la Verja | roca con cara norte vertical.
const OR = { ciudad: [0, 58, 42, 42], hueco: 8 };
const ORILLA_ROCA = 'M50 100V0L100 50V100Z';
const simOrillas = (c) => r(...OR.ciudad, c.b) + pa(ORILLA_ROCA, c.a);

/* Bocetos de las descartadas (solo B/N) */
const simEncuentro = (c) => r(0, 72, 50, 28, c.a) + pa('M50 72L76 0L100 100H60Z', c.a);
const simModulo = (c) => {
  const m = 100 / 3;
  return r(0, m, m, m, c.a) + pa(`M${n2(2 * m)} 0L100 ${n2(m)}V${n2(2 * m)}H${n2(2 * m)}Z`, c.a) +
    [0, 1, 2].map((i) => r(0, 2 * m + 6 + i * 10, 100, 5, c.a)).join('');
};
const simReflejo = (c) => pa('M24 52L48 8L84 52Z', c.a) + r(0, 56, 100, 6, c.a) +
  r(26, 68, 54, 5, c.a) + r(36, 79, 34, 5, c.a) + r(46, 90, 14, 5, c.a);

const SIM = { trazo: simTrazo, renglones: simRenglones, orillas: simOrillas, encuentro: simEncuentro, modulo: simModulo, reflejo: simReflejo };
const simbolo = (k, c, cls = 'sym') => svg([0, 0, 100, 100], SIM[k](c), cls, 'Símbolo Studio Linense');

/* ---------- FUENTES ---------- */
const F = {
  trazo: { lin: fuente('schibsted-grotesk', 800), stu: fuente('schibsted-grotesk', 600), track: -25 },
  renglones: { lin: fuente('familjen-grotesk', 700), stu: fuente('familjen-grotesk', 600), track: -20 },
  orillas: { lin: fuente('syne', 800), stu: fuente('syne', 600), track: -15 },
};
const palabras = (k, H, sH) => ({
  lin: texto(F[k].lin, 'LINENSE', H, F[k].track),
  stu: texto(F[k].stu, 'STUDIO', sH, 240),
});

/* ---------- LOGOTIPOS ---------- */
// TRAZO: el istmo sigue recto y subraya el nombre.
function trazoHorizontal(c) {
  const H = 40, sH = 11, x0 = 100 + 16;
  const { lin, stu } = palabras('trazo', H, sH);
  const base = TZ.y - TZ.w / 2 - 10;
  const extra = 16 + lin.w;
  return svg([0, 0, x0 + lin.w, TZ.y + TZ.w / 2], trazoPaths(c, extra) +
    pa(stu.d(x0, base - H - 9), c.stu) + pa(lin.d(x0, base), c.lin), 'hor');
}
function trazoApilado(c) {
  const H = 40, sH = 11;
  const { lin, stu } = palabras('trazo', H, sH);
  const w = Math.max(100, lin.w), y1 = 100 + 26 + sH, y2 = y1 + 10 + H;
  return svg([0, 0, w, y2], simTrazo(c) + pa(stu.d(0, y1), c.stu) + pa(lin.d(0, y2), c.lin), 'ver');
}

// RENGLONES: STUDIO en el primer renglón, LINENSE ocupa de la 3.ª a la 6.ª línea; el horizonte corre debajo.
function renglonesHorizontal(c) {
  const fila = (i) => RG.y0 + i * RG.paso;
  const H = fila(5) + RG.h - fila(2), sH = RG.h;
  const { lin, stu } = palabras('renglones', H, sH);
  const x0 = 100 + 18;
  return svg([0, 0, x0 + lin.w, 100], simRenglones(c) +
    pa(stu.d(x0, fila(0) + RG.h), c.stu) + pa(lin.d(x0, fila(5) + RG.h), c.lin), 'hor');
}
function renglonesApilado(c) {
  const H = 50, sH = 10;
  const { lin, stu } = palabras('renglones', H, sH);
  const w = Math.max(100, lin.w), y1 = 100 + 24 + sH, y2 = y1 + 12 + H;
  return svg([0, 0, w, y2], simRenglones(c) + pa(stu.d(0, y1), c.stu) + pa(lin.d(0, y2), c.lin), 'ver');
}

// DOS ORILLAS: LINENSE a la altura de la ciudad (su altura de mayúsculas = la altura del bloque bajo).
function orillasHorizontal(c) {
  const H = OR.ciudad[3], sH = 11;
  const { lin, stu } = palabras('orillas', H, sH);
  const x0 = 100 + 20;
  return svg([0, 0, x0 + lin.w, 100], simOrillas(c) + pa(stu.d(x0, 100 - H - 10), c.stu) + pa(lin.d(x0, 100), c.lin), 'hor');
}
function orillasApilado(c) {
  const H = 34, sH = 10;
  const { lin, stu } = palabras('orillas', H, sH);
  const w = Math.max(100, lin.w), y1 = 100 + 26 + sH, y2 = y1 + 10 + H;
  return svg([0, 0, w, y2], simOrillas(c) + pa(stu.d(0, y1), c.stu) + pa(lin.d(0, y2), c.lin), 'ver');
}

module.exports = { simbolo, svg, r, trazoHorizontal, trazoApilado, renglonesHorizontal, renglonesApilado, orillasHorizontal, orillasApilado, RG };
