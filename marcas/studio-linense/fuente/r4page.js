// Página de la ronda 4: wordmarks dibujados a medida.
const fs = require('fs');
const L = require('./r4lib');
const [out, svgDir] = process.argv.slice(2);
const css2 = fs.readFileSync(__dirname + '/r2page.js', 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];

const C = { noche: '#061E5C', azul: '#1F5EFF', blanco: '#FFFFFF', gris: '#F4F6FA', negro: '#111318', lima: '#C7FF3D' };
const K = C.negro, W = C.blanco;
const mono = (f) => ({ a: f, b: f, i: f, r: f, ola: f, stu: f });

const DIRS = [
  { f: 'lineaLogo', n: '01', t: 'Sobre la línea', eje: 'Trazo · horizonte · conexión',
    frase: 'El pie de la L se alarga y sostiene toda la palabra; pasada la última E sigue hasta el horizonte y lleva a STUDIO encima.',
    dif: 'La línea no es un adorno: es la base de las letras. Las E no tienen brazo inferior, porque su suelo es la propia línea.', sel: true },
  { f: 'pasoLogo', n: '02', t: 'El paso', eje: 'Frontera · encuentro · cruce',
    frase: 'La I es el poste fronterizo: a un lado, la L en positivo; al otro, un bloque con NENSE vaciado. Entre ambos, una ranura.',
    dif: 'Dos territorios que solo se tocan en una letra. El cambio de positivo a negativo hace el cruce visible.', sel: true },
  { f: 'rocaLogo', n: '03', t: 'Roca y mar', eje: 'Peñón · costa · fluidez',
    frase: 'Letras redondas y fluidas, salvo la L, una cuña afilada con la cara norte vertical. La S es una ola y la N y la E comparten trazo.',
    dif: 'El Peñón no es un icono: es la primera letra del nombre. El contraste entre lo afilado y lo redondo es roca contra agua.', sel: true },
  { f: 'refraccion', n: '04', t: 'Refracción', eje: 'Horizonte · agua',
    frase: 'La palabra se corta por el horizonte y la mitad de arriba se desplaza, como vista a través del agua.',
    dif: 'Descartada: se acerca a un efecto de glitch y depende del corte más que de la forma de las letras.' },
  { f: 'estarcido', n: '05', t: 'Estarcido', eje: 'Frontera · puerto',
    frase: 'Letras de plantilla interrumpidas por huecos regulares, como las marcas del puerto y la aduana.',
    dif: 'Descartada: es un cliché industrial y militar; pierde legibilidad sin ganar significado.' },
  { f: 'azulejo', n: '06', t: 'Azulejo', eje: 'Módulo · costa',
    frase: 'Letras construidas con cuadrados y cuartos de círculo, como piezas de un mosaico.',
    dif: 'Descartada: es una tendencia muy vista y el vínculo con La Línea queda débil.' },
];

const P = [
  {
    k: 'linea', n: 'A', t: 'Sobre la línea', logo: L.lineaLogo, icono: L.lineaIcono,
    frase: 'Todo el nombre se apoya en una sola línea, y la línea sigue.',
    capas: [
      ['Trazo', 'La línea nace en el pie de la L y recorre la palabra entera: es el gesto que la construye.'],
      ['Horizonte', 'Pasada la última E, la línea continúa hacia la derecha como el horizonte sobre el mar; STUDIO viaja encima.'],
      ['La Línea', 'El nombre de la ciudad, literalmente: una línea que sostiene lo que se construye sobre ella.'],
    ],
    vinculo: 'Las letras no tienen pie propio: las E pierden su brazo inferior y la S termina dentro de la línea. La ciudad es el suelo común de todo lo que hace el estudio.',
    distinta: 'Es un wordmark que no se puede escribir con una fuente: depende de una regla de construcción propia. La línea se puede alargar sin límite para subrayar titulares, separar secciones o cerrar vídeos, y la marca se reconoce aunque solo se vea la línea.',
    icono_txt: 'La S, la ola, sobre la línea del horizonte.',
    c: {
      oscuro: { bg: C.noche, a: W, b: C.lima, stu: C.lima },
      claro: { bg: W, a: K, b: C.azul, stu: C.azul },
      icono: { bg: C.azul, a: W, b: C.lima },
    },
  },
  {
    k: 'paso', n: 'B', t: 'El paso', logo: L.pasoLogo, icono: L.pasoIcono,
    frase: 'Una palabra, dos territorios y una letra que hace de frontera.',
    capas: [
      ['Frontera', 'La I es más alta que el resto: es el poste que marca el límite.'],
      ['Encuentro', 'A la izquierda, la L y STUDIO en positivo; a la derecha, NENSE vaciado en un bloque macizo. La ranura entre la I y el bloque es la Verja.'],
      ['Paso', 'La palabra se lee de corrido a pesar del cambio de territorio: la frontera separa, pero no corta el nombre.'],
    ],
    vinculo: 'La Línea es una ciudad de paso y de encuentro, que vive a un lado de una frontera. El logo convierte esa condición en la propia estructura de la palabra.',
    distinta: 'El cambio de positivo a negativo dentro de una palabra es un gesto editorial muy fuerte, propio de cartelería y moda. El bloque funciona como etiqueta, sello o pieza de packaging, y la ranura se reconoce incluso en el icono.',
    icono_txt: 'La I y el bloque: la frontera en su forma mínima.',
    c: {
      oscuro: { bg: C.noche, a: W, i: C.lima, b: C.azul, stu: W },
      claro: { bg: W, a: C.noche, i: C.azul, b: C.noche, stu: C.noche },
      icono: { bg: C.lima, a: C.noche, i: C.noche, b: C.noche },
    },
  },
  {
    k: 'roca', n: 'C', t: 'Roca y mar', logo: L.rocaLogo, icono: L.rocaIcono,
    frase: 'La primera letra es roca; el resto, agua.',
    capas: [
      ['El Peñón', 'La L es una cuña: cara norte vertical, cresta corta y pendiente hacia el pie. Es la única forma afilada del logo.'],
      ['La línea', 'El pie de la L es un trazo redondo y horizontal: la ciudad a los pies de la roca.'],
      ['El mar', 'Todas las demás letras son redondas y fluidas; la S es una ola. La N y la E comparten trazo: territorios que se tocan.'],
    ],
    vinculo: 'Desde La Línea el Peñón está siempre presente, pero no es la ciudad. Por eso aparece una sola vez, en la inicial, y el resto del nombre es costa y movimiento.',
    distinta: 'Mezcla dos lenguajes en una palabra: lo geométrico y afilado contra lo redondo y escultórico. Tiene el aire de una marca de cultura o moda, y la L-roca funciona sola como icono sin ser una L dentro de un cuadrado.',
    icono_txt: 'La L-roca: el Peñón con la línea a sus pies.',
    c: {
      oscuro: { bg: C.negro, a: W, r: C.lima, ola: W, stu: C.lima },
      claro: { bg: C.gris, a: C.noche, r: C.azul, ola: C.noche, stu: C.azul },
      icono: { bg: C.noche, a: W, r: C.lima },
    },
  },
];

const app = {
  linea: (c) => `<div class="app app-linea" style="background:${C.noche}"><span class="mono" style="color:rgba(255,255,255,.6)">Cierre de vídeo · la línea cruza la pantalla</span><b>Ideas que se ven.</b><i style="background:${C.lima}"></i></div>`,
  paso: () => `<div class="app app-paso"><div class="et">${L.pasoLogo({ a: C.noche, i: C.azul, b: C.noche, stu: C.noche })}<span class="mono">Edición 01 · Hecho en La Línea</span></div></div>`,
  roca: () => `<div class="app app-roca"><span class="mono">Cartel · la L-roca como recorte</span><div class="rc">${L.rocaIcono({ a: C.lima, r: C.lima })}</div><b>Creatividad<br>hecha aquí.</b></div>`,
};

const card = (d) => `
  <article class="dir${d.sel ? ' sel' : ''}">
    <div class="dir-fig dir-word">${L[d.f](d.sel ? mono(W) : mono(K))}</div>
    <div class="dir-meta"><span class="mono">${d.n} · ${d.eje}</span>${d.sel ? '<span class="tag">Seleccionada</span>' : ''}</div>
    <h3>${d.t}</h3><p>${d.frase}</p><p class="dim">${d.dif}</p>
  </article>`;

const prop = (p) => `
<section class="prop" id="${p.k}">
  <div class="wrap">
    <header class="prop-cab"><span class="letra">${p.n}</span><div><h2>${p.t}</h2><p class="frase">${p.frase}</p></div></header>
    <div class="paso"><span class="mono">1 · Monocromo</span></div>
    <div class="g">
      <div class="t t-blanco w-full">${p.logo(mono(K))}<span class="mono cap">Wordmark principal</span></div>
      <div class="t t-negro w-8">${p.logo(mono(W))}<span class="mono cap">Invertido</span></div>
      <div class="t t-blanco w-4"><div class="tam">${[72, 36, 18].map((s) => `<div style="width:${s}px">${p.icono(mono(K))}</div>`).join('')}</div><span class="mono cap">Icono · 72 · 36 · 18 px</span></div>
    </div>
    <div class="paso"><span class="mono">2 · Color</span></div>
    <div class="g">
      <div class="t w-6" style="background:${p.c.oscuro.bg}">${p.logo(p.c.oscuro)}<span class="mono cap" style="color:${W}">Sobre oscuro</span></div>
      <div class="t w-6" style="background:${p.c.claro.bg};${p.c.claro.bg === W ? 'border:1px solid var(--filete)' : ''}">${p.logo(p.c.claro)}<span class="mono cap" style="color:${K}">Sobre claro</span></div>
      <div class="t t-perfil w-4">
        <div class="perfil-sq" style="background:${p.c.icono.bg}">${p.icono(p.c.icono)}</div>
        <div class="perfil-ci" style="background:${p.c.icono.bg}">${p.icono(p.c.icono)}</div>
        <span class="mono cap">Icono · perfil</span>
      </div>
      <div class="t w-8 t-app">${app[p.k]()}</div>
    </div>
    <div class="capas">${p.capas.map(([h, t], i) => `<div><span class="mono">Capa ${i + 1}</span><h3>${h}</h3><p>${t}</p></div>`).join('')}</div>
    <div class="textos">
      <div><span class="mono">Qué conecta con La Línea</span><p>${p.vinculo}</p></div>
      <div><span class="mono">Por qué es distinta</span><p>${p.distinta}</p></div>
      <div><span class="mono">Icono derivado</span><p>${p.icono_txt}</p><p class="dim">Letras dibujadas a medida; STUDIO en Schibsted Grotesk, trazado.</p></div>
    </div>
  </div>
</section>`;

const css4 = `
.dir-word { padding: 18px 22px; }
.dir-word .word { width: 100%; max-height: 100%; }
.w-full { grid-column: 1 / -1; min-height: 280px; }
.w-full .word { max-width: 760px; }
.w-8 { grid-column: span 8; }
.w-6 { grid-column: span 6; }
.w-4 { grid-column: span 4; }
.w-8 .word, .w-6 .word { max-width: 520px; }
.t { padding-bottom: 46px; }
@media (max-width: 900px) { .w-8, .w-6, .w-4 { grid-column: 1 / -1; } }
.t-app { padding: 0; place-items: stretch; min-height: 260px; }
.app { width: 100%; height: 100%; min-height: 260px; position: relative; overflow: hidden; display: grid; align-content: space-between; padding: 22px; }
.app-linea b { margin-bottom: 48px; color: #fff; font: 900 clamp(30px, 4vw, 52px)/1 var(--f-display); letter-spacing: -.04em; }
.app-linea i { position: absolute; left: 22px; right: -10px; bottom: 30px; height: 14px; }
.app-paso { background: var(--gris); place-items: center; }
.app-paso .et { background: #fff; border: 1px solid var(--filete); padding: 26px 30px 18px; display: grid; gap: 16px; width: min(100%, 420px); box-shadow: 0 16px 40px rgba(6,30,92,.12); transform: rotate(-3deg); }
.app-paso .et .mono { color: var(--dim); }
.app-roca { background: var(--noche); color: #fff; grid-template-columns: 1fr auto; }
.app-roca .mono { grid-column: 1 / -1; opacity: .6; }
.app-roca .rc { grid-column: 2; grid-row: 2 / span 2; width: clamp(110px, 18vw, 190px); align-self: end; }
.app-roca b { align-self: end; font: 900 clamp(28px, 3.6vw, 46px)/.95 var(--f-display); letter-spacing: -.04em; }
.capas { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 3vw, 40px); border-top: 1px solid var(--filete); padding-block: 18px 28px; }
.capas > div { display: grid; gap: 8px; align-content: start; }
.capas h3 { font-size: 24px; }
.capas p { font-size: 15px; }
.capas .mono { color: var(--dim); }
@media (max-width: 820px) { .capas { grid-template-columns: 1fr; } }
`;

const html = `<title>Studio Linense · Lettering</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${css2}${css4}</style>

<div class="top"><div class="wrap"><span class="mono">Studio Linense · Identidad</span><span class="mono">Ronda 4 · lettering a medida</span></div></div>

<section class="intro">
  <div class="wrap">
    <h1>La palabra <span>es la marca.</span></h1>
    <div class="intro-txt">
      <p><b>Letras dibujadas, no tecleadas.</b> LINENSE solo tiene cinco letras distintas (L, I, N, E, S); todas están construidas a medida en cada propuesta.</p>
      <p><b>El concepto, dentro de las letras.</b> La línea, la frontera, el Peñón y el mar aparecen como reglas de construcción, no como dibujos añadidos.</p>
      <p><b>Primero en una tinta.</b> Cada wordmark se resuelve en negro y en blanco antes de pasar al color, y deriva su propio icono.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="dirs-cab"><h2>Seis direcciones</h2><span class="mono dim">Bocetos en blanco y negro</span></div>
    <div class="dirs">${DIRS.map(card).join('')}</div>
  </div>
</section>

${P.map(prop).join('')}

<section class="reco">
  <div class="wrap">
    <span class="mono" style="color:var(--lima)">Recomendación</span>
    <h2 style="margin-top:16px">El paso: <em>la frontera dentro de la palabra.</em></h2>
    <div class="reco-g">
      <div><span class="mono">A · Sobre la línea</span><p>La más útil como sistema: la línea se prolonga en vídeos, webs y titulares. Su riesgo es que en pequeño las letras sin pie pierden contraste con la línea.</p></div>
      <div><span class="mono">B · El paso</span><p>La de mayor impacto y la más propia: nadie más puede justificar una I fronteriza. Funciona como etiqueta, sello y cartel, y el icono es inconfundible.</p></div>
      <div><span class="mono">C · Roca y mar</span><p>La más escultórica y cercana a una marca de cultura o moda. La L-roca es un gran icono; el resto del lettering pide más horas de dibujo fino.</p></div>
    </div>
  </div>
</section>
<footer><div class="wrap"><span class="mono">Studio Linense · Ronda 4</span><span class="mono">Archivos en marcas/studio-linense/ronda-4/</span></div></footer>
`;
fs.writeFileSync(out, html);

fs.mkdirSync(svgDir, { recursive: true });
const solo = (s, bg, padF = 0.08) => {
  const vb = s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const inner = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const pad = bg ? Math.max(vb[2], vb[3]) * padF : 0;
  const v = [vb[0] - pad, vb[1] - pad, vb[2] + 2 * pad, vb[3] + 2 * pad].map((x) => +x.toFixed(2));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(' ')}">` + (bg ? `<rect x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}" fill="${bg}"/>` : '') + inner + '</svg>';
};
P.forEach((p) => {
  const n = p.n + '-' + p.k;
  fs.writeFileSync(`${svgDir}/${n}-wordmark-negro.svg`, solo(p.logo(mono(K))));
  fs.writeFileSync(`${svgDir}/${n}-wordmark-blanco.svg`, solo(p.logo(mono(W))));
  fs.writeFileSync(`${svgDir}/${n}-wordmark-oscuro.svg`, solo(p.logo(p.c.oscuro), p.c.oscuro.bg));
  fs.writeFileSync(`${svgDir}/${n}-wordmark-claro.svg`, solo(p.logo(p.c.claro), p.c.claro.bg));
  fs.writeFileSync(`${svgDir}/${n}-icono.svg`, solo(p.icono(p.c.icono), p.c.icono.bg, 0.3));
});
DIRS.filter((d) => !d.sel).forEach((d) => fs.writeFileSync(`${svgDir}/descartada-${d.n}.svg`, solo(L[d.f](mono(K)))));
console.log('ok', html.length);
