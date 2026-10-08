// Monta la guía HTML sustituyendo marcadores por SVG del logo.
const fs = require('fs');
const [tpl, piezas, out] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(piezas, 'utf8'));
const dOf = (s) => s.match(/ d="([^"]+)"/)[1];
const LIN = dOf(p.linD), STU = dOf(p.stuD);

const C = { n: '#061E5C', a: '#1F5EFF', b: '#FFFFFF', g: '#F4F6FA', k: '#111318', l: '#C7FF3D' };
const col = (c) => C[c] || c;

const symG = (L, M) =>
  `<g fill="${col(L)}"><rect width="36" height="100"/><rect y="64" width="100" height="36"/></g><rect x="52" width="48" height="48" fill="${col(M)}"/>`;

const W = (116 + p.linW).toFixed(2);
const html = fs.readFileSync(tpl, 'utf8')
  // {{sym:L:M}} símbolo
  .replace(/\{\{sym:(\w+):(\w+)\}\}/g, (_, L, M) =>
    `<svg class="sym" viewBox="0 0 100 100" role="img" aria-label="Símbolo Studio Linense">${symG(L, M)}</svg>`)
  // {{hor:L:M:S:N}} horizontal
  .replace(/\{\{hor:(\w+):(\w+):(\w+):(\w+)\}\}/g, (_, L, M, S, N) =>
    `<svg class="hor" viewBox="0 0 ${W} 100" role="img" aria-label="Studio Linense">${symG(L, M)}` +
    `<path transform="translate(116 48)" fill="${col(S)}" d="${STU}"/><path transform="translate(116 100)" fill="${col(N)}" d="${LIN}"/></svg>`)
  // {{ver:L:M:S:N}} vertical
  .replace(/\{\{ver:(\w+):(\w+):(\w+):(\w+)\}\}/g, (_, L, M, S, N) =>
    `<svg class="ver" viewBox="0 0 ${p.linW.toFixed(2)} 193" role="img" aria-label="Studio Linense">${symG(L, M)}` +
    `<path transform="translate(0 145)" fill="${col(S)}" d="${STU}"/><path transform="translate(0 193)" fill="${col(N)}" d="${LIN}"/></svg>`)
  .replace(/\{\{wordpaths:(\w+):(\w+)\}\}/g, (_, S, N) =>
    `<path transform="translate(116 48)" fill="${col(S)}" d="${STU}"/><path transform="translate(116 100)" fill="${col(N)}" d="${LIN}"/>`)
  // {{word:S:N}} solo nombre
  .replace(/\{\{word:(\w+):(\w+)\}\}/g, (_, S, N) =>
    `<svg class="word" viewBox="0 33 ${p.linW.toFixed(2)} 69" role="img" aria-label="Studio Linense">` +
    `<path transform="translate(0 48)" fill="${col(S)}" d="${STU}"/><path transform="translate(0 100)" fill="${col(N)}" d="${LIN}"/></svg>`)
  .replace(/\{\{wordpaths:(\w+):(\w+)\}\}/g, (_, S, N) =>
    `<path transform="translate(116 48)" fill="${col(S)}" d="${STU}"/><path transform="translate(116 100)" fill="${col(N)}" d="${LIN}"/>`)
  .replace(/\{\{W\}\}/g, W);
fs.writeFileSync(out, html);
console.log('ok', html.length);
