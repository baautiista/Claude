// Página de la ronda 4: wordmarks dibujados a medida.
const fs = require('fs');
const L = require('./r5lib');
const [out, svgDir] = process.argv.slice(2);
const css2 = fs.readFileSync(__dirname + '/r2page.js', 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];

const C = { noche: '#061E5C', azul: '#1F5EFF', blanco: '#FFFFFF', gris: '#F4F6FA', negro: '#111318', lima: '#C7FF3D' };
const K = C.negro, W = C.blanco;
const mono = (f) => ({ a: f, b: f, l: f, p: f, r: f, ola: f, stu: f });

const DIRS = [
  { f: 'perfilLogo', n: '01', t: 'Perfil', eje: 'Peñón · horizonte · ciudad',
    frase: 'La altura de cada letra sigue el perfil del Peñón visto desde poniente: cara norte vertical en la l, pico, cresta larga y bajada hacia el sur.',
    dif: 'El Peñón no se dibuja: es la silueta que forma la palabra al ponerla de pie. Los remates se cortan en diagonal, siguiendo la ladera.', sel: true },
  { f: 'istmoLogo', n: '02', t: 'Istmo', eje: 'Conexión · dos territorios',
    frase: '«line» y «nse» unidos por un puente líquido que se estrecha en el centro: la barra de la e cruza hacia la n.',
    dif: 'La Línea está sobre un istmo, y «line» es literalmente línea. Dos masas y un paso estrecho entre ellas.', sel: true },
  { f: 'bucleLogo', n: '03', t: 'Bucle', eje: 'Trazo · cruce · paso',
    frase: 'La l es una sola línea que llega desde el horizonte, sube en pendiente, se enrosca y cae en vertical cruzándose a sí misma.',
    dif: 'Pendiente y caída son el perfil del Peñón visto desde el Mediterráneo; el corte limpio en el cruce es el paso.', sel: true },
  { f: 'costaLogo', n: '04', t: 'Costa', eje: 'Mar · roca',
    frase: 'La s se estira como una ola y el punto de la i es una pequeña cuña de roca.',
    dif: 'Descartada como logo: dos guiños sueltos en vez de un gesto. El punto-roca se guarda como detalle del sistema.' },
  { f: 'rotulista', n: '05', t: 'Rotulista', eje: 'Calle · comercio local',
    frase: 'Letras de pincel, como los rótulos pintados de los comercios de la ciudad.',
    dif: 'Descartada como logo: la textura no aguanta en pequeño ni en una tinta. Útil como recurso de campaña.' },
  { f: 'contraforma', n: '06', t: 'Contraforma', eje: 'Espacio negativo',
    frase: 'Letras macizas; el ojo de la primera e se abre como una cuña en negativo.',
    dif: 'Descartada: el hueco es demasiado pequeño para leerse y el gesto se pierde por debajo de 60 px.' },
];

const P = [
  {
    k: 'perfil', n: 'A', t: 'Perfil', logo: L.perfilLogo, icono: L.perfilIcono,
    frase: 'La palabra puesta de pie dibuja el Peñón.',
    capas: [
      ['Cara norte', 'La l es la letra más alta y tiene el lado izquierdo vertical: el frente de roca que mira a la ciudad.'],
      ['Cresta y ladera', 'Las letras van bajando de altura y sus remates se cortan en diagonal siguiendo la ladera; las curvas de n, e y s se estiran para llegar.'],
      ['Horizonte', 'Todas comparten la misma línea base: el nivel del mar. El punto de la i, en lima, queda justo bajo la cresta.'],
    ],
    vinculo: 'Desde La Línea el Peñón ocupa el horizonte entero. Aquí ocupa el nombre entero, pero solo como contorno: quien no lo sabe ve un wordmark expresivo; quien es de aquí reconoce la silueta.',
    distinta: 'Es lettering imposible de teclear: cada letra tiene una altura y un corte propios. Tiene la energía de un cartel de festival y una lectura local inmediata sin un solo dibujo añadido.',
    icono_txt: 'La l y la i: la cara norte y el punto bajo la cresta.',
    c: {
      oscuro: { bg: C.noche, a: W, p: C.lima, stu: W },
      claro: { bg: W, a: C.noche, p: C.azul, stu: C.azul },
      icono: { bg: C.azul, a: W, p: C.lima },
    },
  },
  {
    k: 'istmo', n: 'B', t: 'Istmo', logo: L.istmoLogo, icono: L.istmoIcono,
    frase: 'Dos palabras dentro de una, unidas por un paso estrecho.',
    capas: [
      ['La línea', '«line» queda a la izquierda del puente: el nombre de la ciudad contiene la palabra línea.'],
      ['El istmo', 'El puente líquido se estrecha hasta casi la mitad del trazo: una franja de tierra entre dos masas.'],
      ['El cruce', 'La barra de la e atraviesa el puente y llega a la n: una letra que cruza al otro lado.'],
    ],
    vinculo: 'La Línea de la Concepción está sobre un istmo, entre la bahía y el Mediterráneo, entre España y Gibraltar. El logo hace de esa geografía un gesto tipográfico: separar sin cortar.',
    distinta: 'El puente líquido es un gesto de lettering contemporáneo, pero aquí tiene una razón de ser. Se puede animar estirándose y encogiéndose, y el recorte «e~n» es un icono propio.',
    icono_txt: 'El recorte «e~n»: dos letras y el paso entre ellas.',
    c: {
      oscuro: { bg: C.negro, a: W, b: C.lima, stu: W },
      claro: { bg: C.gris, a: C.noche, b: C.azul, stu: C.azul },
      icono: { bg: C.noche, a: W, b: C.lima },
    },
  },
  {
    k: 'bucle', n: 'C', t: 'Bucle', logo: L.bucleLogo, icono: L.bucleIcono,
    frase: 'Una línea llega, sube, da la vuelta y se cruza.',
    capas: [
      ['Horizonte', 'La l empieza como un trazo horizontal a ras de suelo, a la izquierda de la palabra.'],
      ['El Peñón', 'Sube en pendiente larga, se enrosca arriba y cae en vertical: la ladera sur y la cara norte, vistas desde el Mediterráneo.'],
      ['El paso', 'Al caer, la línea se cruza consigo misma; un corte limpio marca qué tramo pasa por encima. Después sigue la palabra: la ciudad al pie de la roca.'],
    ],
    vinculo: 'Es el recorrido del territorio en un solo trazo, como en la ronda 3, pero ahora convertido en letra: la l de Linense es a la vez el Peñón, la frontera que se cruza y la línea que continúa.',
    distinta: 'Una única letra transformada en gesto y el resto de la palabra en calma, como piden las referencias. La l en bucle funciona sola como icono, se anima dibujándose y no se parece a ninguna L encerrada en un cuadrado.',
    icono_txt: 'La l en bucle, sola.',
    c: {
      oscuro: { bg: C.noche, a: W, l: C.azul, stu: C.lima },
      claro: { bg: W, a: K, l: C.azul, stu: C.azul },
      icono: { bg: C.azul, a: W, l: W },
    },
  },
];

const app = {
  perfil: () => `<div class="app app-roca"><span class="mono">Cartel · el perfil como titular</span><div class="rc rc-ancha">${L.perfilLogo({ a: C.blanco, p: C.lima, stu: C.lima })}</div><b>Hecho<br>aquí.</b></div>`,
  istmo: () => `<div class="app app-linea" style="background:${C.negro}"><span class="mono" style="color:rgba(255,255,255,.6)">Motion · el puente se estira entre dos mensajes</span><b>Tu negocio <span style="color:${C.lima}">~</span> nuestra audiencia.</b></div>`,
  bucle: () => `<div class="app app-paso"><div class="et">${L.bucleLogo({ a: C.noche, l: C.azul, stu: C.azul })}<span class="mono">Edición 01 · Hecho en La Línea</span></div></div>`,
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
      <div><span class="mono">Icono derivado</span><p>${p.icono_txt}</p><p class="dim">«linense» dibujada a medida; STUDIO en Schibsted Grotesk, trazado.</p></div>
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
.app-roca .rc-ancha { grid-column: 1 / -1; grid-row: auto; width: min(100%, 420px); justify-self: start; }
.app-roca .rc { grid-column: 2; grid-row: 2 / span 2; width: clamp(110px, 18vw, 190px); align-self: end; }
.app-roca b { align-self: end; font: 900 clamp(28px, 3.6vw, 46px)/.95 var(--f-display); letter-spacing: -.04em; }
.capas { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 3vw, 40px); border-top: 1px solid var(--filete); padding-block: 18px 28px; }
.capas > div { display: grid; gap: 8px; align-content: start; }
.capas h3 { font-size: 24px; }
.capas p { font-size: 15px; }
.capas .mono { color: var(--dim); }
@media (max-width: 820px) { .capas { grid-template-columns: 1fr; } }
`;

const html = `<title>Studio Linense · Gesto</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${css2}${css4}</style>

<div class="top"><div class="wrap"><span class="mono">Studio Linense · Identidad</span><span class="mono">Ronda 5 · un gesto, una palabra</span></div></div>

<section class="intro">
  <div class="wrap">
    <h1>Un gesto, <span>una palabra.</span></h1>
    <div class="intro-txt">
      <p><b>Minúscula y trazo continuo.</b> «linense» dibujada a medida con un trazo grueso y redondo; una sola letra o unión se transforma en el gesto de la marca.</p>
      <p><b>Con las referencias como nivel.</b> Se toma de ellas el atrevimiento (el bucle, la unión líquida, la palabra que dibuja un lugar), no ninguna forma concreta.</p>
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
    <h2 style="margin-top:16px">Perfil: <em>el Peñón es la palabra.</em></h2>
    <div class="reco-g">
      <div><span class="mono">A · Perfil</span><p>La de mayor impacto y la más local: se reconoce de un vistazo y no necesita explicación. Pide cuidar el uso en tamaños pequeños, donde conviene pasar al icono.</p></div>
      <div><span class="mono">B · Istmo</span><p>La más elegante y legible. El puente es un gesto mínimo con una historia precisa; ideal si se quiere una marca sobria con un detalle memorable.</p></div>
      <div><span class="mono">C · Bucle</span><p>La más cercana al lenguaje de las referencias y la mejor para motion. La l en bucle es el icono más fuerte de las tres.</p></div>
    </div>
  </div>
</section>
<footer><div class="wrap"><span class="mono">Studio Linense · Ronda 5</span><span class="mono">Archivos en marcas/studio-linense/ronda-5/</span></div></footer>
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
