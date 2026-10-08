// Ronda 2 de Studio Linense: símbolos y logotipos trazados (sin depender de fuentes).
const o = require('opentype.js');
const fs = require('fs');

const fuente = (fam, w) => {
  const b = fs.readFileSync(`${__dirname}/node_modules/@fontsource/${fam}/files/${fam}-latin-${w}-normal.woff`);
  return o.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const capDe = (f) => (f.tables.os2.sCapHeight || f.charToGlyph('H').getBoundingBox().y2) / f.unitsPerEm;

// Texto trazado con altura de mayúsculas exacta y tracking en milésimas de em.
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
    // ox = borde izquierdo de la tinta, base = línea base
    d(ox, base) {
      return parts.map((p) => p.g.getPath(ox - left + p.x + 0.001, base + 0.001, size).toPathData(2)).join('');
    },
  };
}

const r = (x, y, w, h, f) => `<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}" fill="${f}"/>`;
const pa = (d, f) => `<path d="${d}" fill="${f}"/>`;
let uid = 0;

/* ---------- SÍMBOLOS (campo 100 × 100) ---------- */
// colores: { a: pieza principal, b: segunda pieza / acento, bg: fondo (para huecos) }

// 1 · DESFASE: una línea partida; la segunda mitad cae su propio grosor y solo se tocan en un punto.
const DES = { T: 24, L: 50 };
const simDesfase = (c) => r(0, 50 - DES.T, DES.L, DES.T, c.a) + r(DES.L, 50, DES.L, DES.T, c.b);

// 2 · ENSAMBLE: dos bloques unidos por una cola de milano; el canal entre ellos es la línea.
const ENS = { g: 7 };
const ENS_IZQ = 'M0 0H50V22L34 16V40L50 34V66L66 60V84L50 78V100H0Z';
const ENS_DER = 'M50 0H100V100H50V78L66 84V60L50 66V34L34 40V16L50 22Z';
const ENS_JUNTA = 'M50 -5V22L34 16V40L50 34V66L66 60V84L50 78V105';
function simEnsamble(c) {
  const id = 'ens' + uid++;
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">` +
    `<rect x="-10" y="-10" width="120" height="120" fill="#fff"/>` +
    `<path d="${ENS_JUNTA}" fill="none" stroke="#000" stroke-width="${ENS.g}" stroke-linejoin="miter" stroke-miterlimit="10"/></mask></defs>` +
    `<g mask="url(#${id})">${pa(ENS_IZQ, c.a)}${pa(ENS_DER, c.b)}</g>`;
}

// 3 · ISTMO: una masa grande y una pequeña unidas por una línea.
const IST = { big: [0, 0, 46, 100], line: [46, 45, 30, 10], small: [76, 37, 24, 26] };
const simIstmo = (c) => r(...IST.big, c.a) + r(...IST.line, c.b) + r(...IST.small, c.a);

/* Bocetos de las direcciones descartadas (solo B/N) */
const simReticula = (c) => {
  const m = 100 / 3, cel = [];
  const full = [[0, 2], [1, 2], [1, 1], [2, 0]];
  full.forEach(([x, y]) => cel.push(r(x * m, y * m, m, m, c.a)));
  // medios módulos que suavizan la diagonal
  cel.push(pa(`M${m} ${2 * m}L${2 * m} ${m}H${m}Z`.replace(/(\d+\.\d+)/g, (n) => (+n).toFixed(2)), c.a));
  cel.push(pa(`M${2 * m} ${m}L${3 * m} 0V${m}Z`.replace(/(\d+\.\d+)/g, (n) => (+n).toFixed(2)), c.a));
  cel.push(pa(`M0 ${2 * m}H${m}L0 ${3 * m}Z`.replace(/(\d+\.\d+)/g, (n) => (+n).toFixed(2)), c.a));
  return cel.join('');
};
const simInterseccion = (c) => `<path fill-rule="evenodd" fill="${c.a}" d="M0 0H64V64H0ZM36 36H100V100H36Z"/>`;
const simTresLineas = (c) => r(0, 6, 64, 20, c.a) + r(0, 40, 100, 20, c.a) + r(0, 74, 64, 20, c.a);

const SIM = { desfase: simDesfase, ensamble: simEnsamble, istmo: simIstmo, reticula: simReticula, interseccion: simInterseccion, tres: simTresLineas };

const svg = (vb, body, cls = '', label = 'Studio Linense') =>
  `<svg class="${cls}" viewBox="${vb.map((n) => +n.toFixed(2)).join(' ')}" role="img" aria-label="${label}">${body}</svg>`;
const simbolo = (k, c, cls = 'sym') => svg([0, 0, 100, 100], SIM[k](c), cls, 'Símbolo Studio Linense');

/* ---------- LOGOTIPOS ---------- */
const F = {
  des: { lin: fuente('schibsted-grotesk', 900), stu: fuente('schibsted-grotesk', 600) },
  ens: { lin: fuente('syne', 800), stu: fuente('syne', 600) },
  ist: { lin: fuente('bricolage-grotesque', 800), stu: fuente('bricolage-grotesque', 600) },
};

// DESFASE: LINE arriba, NSE un escalón abajo; E y N se tocan en un punto, como el símbolo.
function palabraDesfase(H) {
  const line = texto(F.des.lin, 'LINE', H, -10);
  const nse = texto(F.des.lin, 'NSE', H, -10);
  const stu = texto(F.des.stu, 'STUDIO', H * 0.3, 220);
  return {
    w: line.w + nse.w, h: 2 * H, stuH: H * 0.3,
    draw(x, y, cLin, cNse, cStu, conStudio = true) {
      // y = parte superior de la fila de LINE
      return pa(line.d(x, y + H), cLin) + pa(nse.d(x + line.w, y + 2 * H), cNse) +
        (conStudio ? pa(stu.d(x + line.w + H * 0.2, y + H * 0.3), cStu) : '');
    },
  };
}

function desfaseHorizontal(c, H = 50) {
  const w = palabraDesfase(H);
  // el símbolo usa el mismo grosor que la altura de las mayúsculas: sus barras ocupan las dos filas
  const s = 100 * H / DES.T; // escala para que T = H
  const symW = s, gap = H * 0.6;
  const yTop = 0;
  const body = `<g transform="translate(0 ${yTop - (50 - DES.T) * s / 100}) scale(${s / 100})">${simDesfase(c)}</g>` +
    w.draw(symW + gap, yTop, c.lin, c.lin2 || c.lin, c.stu);
  return svg([0, 0, symW + gap + w.w, 2 * H], body, 'hor');
}
function desfaseApilado(c, H = 50) {
  const w = palabraDesfase(H);
  const s = w.w * 0.5;
  const sy = s * (DES.T * 2) / 100;
  const body = `<g transform="translate(0 ${-(50 - DES.T) * s / 100}) scale(${s / 100})">${simDesfase(c)}</g>` +
    w.draw(0, sy + H * 0.55, c.lin, c.lin2 || c.lin, c.stu);
  return svg([0, 0, w.w, sy + H * 0.55 + 2 * H], body, 'ver');
}
function desfasePalabra(c, H = 50) {
  const w = palabraDesfase(H);
  return svg([0, 0, w.w, 2 * H], w.draw(0, 0, c.lin, c.lin2 || c.lin, c.stu), 'word');
}

// ENSAMBLE / ISTMO: símbolo + STUDIO pequeño sobre LINENSE grande.
function clasicoHorizontal(k, fam, c, opts = {}) {
  const H = opts.H || 46;
  const lin = texto(F[fam].lin, 'LINENSE', H, opts.track ?? -20);
  const stu = texto(F[fam].stu, 'STUDIO', H * 0.3, 260);
  const gap = 24;
  const body = SIM[k](c) + pa(stu.d(100 + gap, 100 - H - H * 0.32), c.stu) + pa(lin.d(100 + gap, 100), c.lin);
  return svg([0, 0, 100 + gap + lin.w, 100], body, 'hor');
}
function clasicoApilado(k, fam, c, opts = {}) {
  const H = opts.H || 46;
  const lin = texto(F[fam].lin, 'LINENSE', H, opts.track ?? -20);
  const stu = texto(F[fam].stu, 'STUDIO', H * 0.3, 260);
  const yS = 100 + 34 + H * 0.3, yL = yS + H * 0.32 + H;
  const body = SIM[k](c) + pa(stu.d(0, yS), c.stu) + pa(lin.d(0, yL), c.lin);
  return svg([0, 0, Math.max(100, lin.w), yL], body, 'ver');
}

// ISTMO firma lineal: STUDIO —— LINENSE (masa pequeña, línea, masa grande: el símbolo convertido en nombre).
function istmoFirma(c, H = 46) {
  const lin = texto(F.ist.lin, 'LINENSE', H, -20);
  const stu = texto(F.ist.stu, 'STUDIO', H * 0.3, 260);
  const mid = H / 2, t = H * 0.1, lw = H * 1.6;
  const xL = stu.w + lw;
  const body = pa(stu.d(0, mid + H * 0.15), c.stu) + r(stu.w + H * 0.12, mid - t / 2, lw - H * 0.24, t, c.line || c.b) + pa(lin.d(xL, H), c.lin);
  return svg([0, 0, xL + lin.w, H], body, 'word');
}

module.exports = { simbolo, SIM, svg, r, desfaseHorizontal, desfaseApilado, desfasePalabra, clasicoHorizontal, clasicoApilado, istmoFirma };
