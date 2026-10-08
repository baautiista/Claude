// Genera los SVG del logo de Studio Linense con el texto trazado (sin depender de fuentes).
const o = require('opentype.js');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const load = (w) => {
  const b = fs.readFileSync(`node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-${w}-normal.woff`);
  return o.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const BOLD = load(700);
const MED = load(500);

const C = {
  noche: '#061E5C',
  azul: '#1F5EFF',
  blanco: '#FFFFFF',
  gris: '#F4F6FA',
  negro: '#111318',
  lima: '#C7FF3D',
};

// Retícula del símbolo: 100 × 100 unidades, separación modular G = 16.
const G = 16;
const BAR = 36; // grosor de los trazos de la L
const MOD = 100 - BAR - G; // lado del módulo (48)

function simbolo(x, y, s, cL, cM) {
  const k = s / 100;
  const r = (a, b, w, h) => `<rect x="${(x + a * k).toFixed(2)}" y="${(y + b * k).toFixed(2)}" width="${(w * k).toFixed(2)}" height="${(h * k).toFixed(2)}"/>`;
  return `<g fill="${cL}">${r(0, 0, BAR, 100)}${r(0, 100 - BAR, 100, BAR)}</g>` +
    `<g fill="${cM}">${r(BAR + G, 0, MOD, MOD)}</g>`;
}

// Texto trazado con tracking (en milésimas de em) y kerning.
function texto(font, str, size, tracking) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(str);
  let x = 0;
  const parts = [];
  glyphs.forEach((g, i) => {
    parts.push({ g, x });
    x += g.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      x += font.getKerningValue(g, glyphs[i + 1]) * scale + (tracking / 1000) * size;
    }
  });
  // ancho óptico: del borde izquierdo del primer glifo al derecho del último
  const first = glyphs[0].getBoundingBox();
  const lastP = parts[parts.length - 1];
  const last = lastP.g.getBoundingBox();
  const left = first.x1 * scale;
  const right = lastP.x + last.x2 * scale;
  return {
    width: right - left,
    draw(ox, baseline, fill) {
      const d = parts.map((p) => p.g.getPath(ox - left + p.x + 0.001, baseline + 0.001, size).toPathData(2)).join('');
      return `<path fill="${fill}" d="${d}"/>`;
    },
  };
}

const cap = (font) => font.tables.os2.sCapHeight / font.unitsPerEm;

// LINENSE ocupa exactamente la banda del pie de la L (altura de mayúsculas = BAR)
// y STUDIO apoya su línea base en la base del módulo.
const LIN_SIZE = BAR / cap(BOLD);
const STU_CAP = 13;
const STU_SIZE = STU_CAP / cap(MED);
const lin = texto(BOLD, 'LINENSE', LIN_SIZE, -10);
const stu = texto(MED, 'STUDIO', STU_SIZE, 260);

const svg = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${Math.round(w * 4)}" height="${Math.round(h * 4)}">` +
  (bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : '') + body + '</svg>';

const variantes = {
  // nombre: [fondo, L, módulo, LINENSE, STUDIO]
  'noche': [C.noche, C.blanco, C.lima, C.blanco, C.lima],
  'azul': [C.azul, C.blanco, C.lima, C.blanco, C.blanco],
  'claro': [null, C.noche, C.azul, C.noche, C.azul],
  'negro': [null, C.negro, C.negro, C.negro, C.negro],
  'blanco': [null, C.blanco, C.blanco, C.blanco, C.blanco],
};

function horizontal([bg, cL, cM, cLin, cStu], pad) {
  const tx = 100 + G;
  const w = tx + lin.width;
  const body =
    simbolo(pad, pad, 100, cL, cM) +
    stu.draw(pad + tx, pad + MOD, cStu) +
    lin.draw(pad + tx, pad + 100, cLin);
  return svg(w + pad * 2, 100 + pad * 2, body, bg);
}

function vertical([bg, cL, cM, cLin, cStu], pad) {
  // Símbolo arriba a la izquierda; nombre debajo, alineado a la izquierda (composición asimétrica).
  const s = 100;
  const yStu = s + G * 2 + STU_CAP;
  const yLin = yStu + G * 0.75 + BAR;
  const w = Math.max(s, lin.width);
  const body =
    simbolo(pad, pad, s, cL, cM) +
    stu.draw(pad, pad + yStu, cStu) +
    lin.draw(pad, pad + yLin, cLin);
  return svg(w + pad * 2, yLin + pad * 2, body, bg);
}

function soloSimbolo([bg, cL, cM], pad) {
  return svg(100 + pad * 2, 100 + pad * 2, simbolo(pad, pad, 100, cL, cM), bg);
}

const files = {};
for (const [n, v] of Object.entries(variantes)) {
  const pad = v[0] ? 40 : 0;
  files[`horizontal-${n}.svg`] = horizontal(v, pad);
  files[`vertical-${n}.svg`] = vertical(v, pad);
  files[`simbolo-${n}.svg`] = soloSimbolo(v, v[0] ? 30 : 0);
}

// Favicon / icono de app: símbolo sobre azul noche con margen óptico.
files['favicon.svg'] =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
  `<rect width="64" height="64" rx="12" fill="${C.noche}"/>` + simbolo(14, 14, 36, C.blanco, C.lima) + '</svg>';

// Foto de perfil: el símbolo descentrado hacia abajo-izquierda dentro del círculo,
// para que el recorte circular no lo toque.
files['perfil.svg'] =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">` +
  `<rect width="1080" height="1080" fill="${C.azul}"/>` + simbolo(330, 330, 420, C.blanco, C.lima) + '</svg>';

for (const [n, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT, n), s);

// Datos para la página de presentación
fs.writeFileSync(path.join(OUT, '..', 'piezas.json'), JSON.stringify({
  linW: lin.width, stuW: stu.width,
  linD: lin.draw(0, 0, 'currentColor'), stuD: stu.draw(0, 0, 'currentColor'),
}));
console.log('LINENSE', lin.width.toFixed(1), 'STUDIO', stu.width.toFixed(1), Object.keys(files).length, 'archivos');
