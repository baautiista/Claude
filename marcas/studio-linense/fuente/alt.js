// 8 alternativas de símbolo para Studio Linense, todas sobre retícula de 100 u.
const fs = require('fs');
const [piezas, out, svgDir] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(piezas, 'utf8'));
const dOf = (s) => s.match(/ d="([^"]+)"/)[1];
const LIN = dOf(p.linD), STU = dOf(p.stuD);
const r = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
const poly = (pts, f) => `<polygon points="${pts}" fill="${f}"/>`;

// Cada opción: (P = color principal, A = acento, F = color de fondo para huecos en negativo)
const OPC = [
  {
    id: 'marco', nombre: 'Marco abierto',
    idea: 'Dos L enfrentadas forman un encuadre que no llega a cerrarse. Entre ambas se lee una S girada: Studio + Linense.',
    usa: 'La más versátil para recortar fotos: cada L es una esquina del marco.',
    g: (P, A) => r(0, 0, 30, 100, P) + r(0, 70, 58, 30, P) + r(70, 0, 30, 100, A) + r(42, 0, 58, 30, A),
  },
  {
    id: 's-modular', nombre: 'S modular',
    idea: 'Una S construida con cinco bloques rectos. El último tramo, abajo a la izquierda, dibuja la L.',
    usa: 'La lectura S + L más explícita. Muy sólida en pequeño.',
    g: (P, A) => r(0, 0, 100, 28, P) + r(0, 0, 28, 64, P) + r(0, 36, 100, 28, P) + r(72, 36, 28, 64, P) + r(0, 72, 100, 28, P) + r(72, 0, 28, 28, A),
  },
  {
    id: 'encuadre', nombre: 'Encuadre',
    idea: 'Una L gruesa y un trazo fino en lima que completa el cuadrado: la marca sólida y la pantalla que se abre.',
    usa: 'Contraste de grosores; muy editorial. El trazo fino pide tamaños medios o grandes.',
    g: (P, A) => r(0, 0, 36, 100, P) + r(0, 64, 100, 36, P) + r(36, 0, 64, 8, A) + r(92, 0, 8, 64, A),
  },
  {
    id: 'en-marcha', nombre: 'L en marcha',
    idea: 'La L con el pie cortado en diagonal, como una flecha que avanza. Un módulo lima marca el destino.',
    usa: 'La más dinámica: transmite movimiento y crecimiento. Ideal para campañas.',
    g: (P, A) => poly('0,0 34,0 34,66 100,66 66,100 0,100', P) + r(56, 0, 34, 34, A),
  },
  {
    id: 'pixel', nombre: 'Píxel',
    idea: 'Una retícula de 3 × 3 donde cinco módulos dibujan la L y uno, arriba a la derecha, se enciende en lima.',
    usa: 'La más digital. Se anima muy bien: los módulos aparecen uno a uno.',
    g: (P, A) => {
      const m = (c, f) => r(c[0] * 36, c[1] * 36, 28, 28, f);
      return [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]].map((c) => m(c, P)).join('') + m([2, 0], A);
    },
  },
  {
    id: 'horizonte', nombre: 'Horizonte',
    idea: 'La L es la línea del horizonte de La Línea; sobre ella se apoya un bloque, el negocio que construimos.',
    usa: 'Lectura local directa (la Línea, el suelo, la base). Muy limpia.',
    g: (P, A) => r(0, 0, 22, 100, P) + r(0, 78, 100, 22, P) + r(44, 34, 44, 44, A),
  },
  {
    id: 'visor', nombre: 'Visor',
    idea: 'Dos esquinas opuestas, como las marcas de corte de una imprenta o el visor de una cámara: lo que queda dentro es el proyecto.',
    usa: 'Muy ligera y reconocible; funciona como marco de cualquier contenido.',
    g: (P, A) => r(0, 0, 32, 100, P) + r(0, 68, 100, 32, P) + r(52, 0, 48, 16, A) + r(84, 0, 16, 48, A),
  },
  {
    id: 'bloque', nombre: 'Bloque',
    idea: 'Un bloque macizo con la L vaciada en negativo y el módulo encajado. Sello compacto, tipo app.',
    usa: 'La mejor como foto de perfil y favicon: ya es un cuadrado lleno.',
    g: (P, A, F) => r(0, 0, 100, 100, P) + r(18, 18, 22, 64, F) + r(18, 60, 64, 22, F) + r(56, 18, 26, 26, A),
  },
];

const sym = (o, P, A, F, cls = 'sym') => `<svg class="${cls}" viewBox="0 0 100 100" role="img" aria-label="Símbolo ${o.nombre}">${o.g(P, A, F)}</svg>`;
const W = (116 + p.linW).toFixed(2);
const hor = (o, P, A, F, S, N) => `<svg class="hor" viewBox="0 0 ${W} 100" role="img" aria-label="Studio Linense, opción ${o.nombre}">${o.g(P, A, F)}` +
  `<path transform="translate(116 48)" fill="${S}" d="${STU}"/><path transform="translate(116 100)" fill="${N}" d="${LIN}"/></svg>`;

const C = { n: '#061E5C', a: '#1F5EFF', b: '#FFFFFF', g: '#F4F6FA', k: '#111318', l: '#C7FF3D' };

const tarjetas = OPC.map((o, i) => `
<article class="op" id="${o.id}">
  <div class="op-cab"><span class="num">${String(i + 2).padStart(2, '0')}</span><h2>${o.nombre}</h2></div>
  <div class="op-grid">
    <div class="t-noche">${hor(o, C.b, C.l, C.n, C.l, C.b)}</div>
    <div class="t-claro">${hor(o, C.n, C.a, C.b, C.a, C.n)}</div>
    <div class="t-mini">
      <div class="m m-azul">${sym(o, C.b, C.l, C.a)}</div>
      <div class="m m-lima">${sym(o, C.n, C.n, C.l)}</div>
      <div class="m m-fav"><div style="width:16px">${sym(o, C.b, C.l, C.n)}</div><div style="width:32px">${sym(o, C.b, C.l, C.n)}</div></div>
    </div>
  </div>
  <div class="op-txt"><p>${o.idea}</p><p class="usa">${o.usa}</p></div>
</article>`).join('');

// La opción 01 (propuesta inicial) como referencia
const base = { nombre: 'Esquina + módulo', g: (P, A) => r(0, 0, 36, 100, P) + r(0, 64, 100, 36, P) + r(52, 0, 48, 48, A) };

const html = fs.readFileSync(__dirname + '/alt.tpl.html', 'utf8')
  .replace('{{TARJETAS}}', tarjetas)
  .replace('{{BASE}}', hor(base, C.b, C.l, C.n, C.l, C.b))
  .replace('{{INDICE}}', [base, ...OPC].map((o, i) => `<a href="#${o.id || 'top'}" class="ix"><span class="ixs">${sym(o, C.n, C.a, C.g)}</span><span>${String(i + 1).padStart(2, '0')} · ${o.nombre}</span></a>`).join(''));
fs.writeFileSync(out, html);

// SVG sueltos para el repositorio
fs.mkdirSync(svgDir, { recursive: true });
OPC.forEach((o, i) => {
  const n = String(i + 2).padStart(2, '0');
  fs.writeFileSync(`${svgDir}/${n}-${o.id}-noche.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 ${(+W + 80).toFixed(2)} 180"><rect x="-40" y="-40" width="100%" height="100%" fill="${C.n}"/>` + hor(o, C.b, C.l, C.n, C.l, C.b).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>');
  fs.writeFileSync(`${svgDir}/${n}-${o.id}-claro.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 100">` + hor(o, C.n, C.a, C.b, C.a, C.n).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>');
});
console.log('ok', html.length);
