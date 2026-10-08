// Página de la ronda 3: la línea y el Peñón. Seis ideas en B/N y tres desarrolladas.
const fs = require('fs');
const L = require('./r3lib');
const [out, svgDir] = process.argv.slice(2);

// Reutiliza la hoja de estilos de la ronda 2 y añade lo propio de esta ronda.
const css2 = fs.readFileSync(__dirname + '/r2page.js', 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];

const C = { noche: '#061E5C', azul: '#1F5EFF', blanco: '#FFFFFF', gris: '#F4F6FA', negro: '#111318', lima: '#C7FF3D' };
const K = C.negro, W = C.blanco;
const mono = (f) => ({ a: f, b: f, c: f, lin: f, stu: f });

const IDEAS = [
  { k: 'trazo', n: '01', t: 'Trazo', eje: 'Línea → Peñón → La Línea',
    frase: 'Una sola línea sale del mar, sube por la pendiente sur del Peñón, cae por la cara norte y sigue recta: eso es La Línea.',
    dif: 'Trazo, frontera, movimiento y lugar en un solo gesto. La caída final y el tramo recto forman una L sin dibujarla.', sel: true },
  { k: 'renglones', n: '02', t: 'Renglones', eje: 'Líneas de texto con forma de Peñón',
    frase: 'Siete líneas alineadas a la izquierda; sus finales dibujan el perfil del Peñón y la última es el horizonte.',
    dif: 'También se lee como un párrafo en bandera: el estudio editorial y de medios. El Peñón no se dibuja, aparece donde acaban los renglones.', sel: true },
  { k: 'orillas', n: '03', t: 'Dos orillas', eje: 'Dos territorios y la Verja',
    frase: 'Una masa baja y plana (la ciudad sobre el istmo) y una cuña alta con la cara vertical mirándola (el Peñón). Entre ellas, un hueco fino.',
    dif: 'La frontera es el espacio negativo: la línea que separa y une. Funciona como sello compacto.', sel: true },
  { k: 'encuentro', n: '04', t: 'Encuentro', eje: 'Dos masas que se tocan',
    frase: 'Una losa y una cuña que solo se tocan en un punto: el encuentro entre dos territorios.',
    dif: 'Mucha tensión, pero el punto de contacto desaparece en pequeño y la cuña se lee como una vela.' },
  { k: 'modulo', n: '05', t: 'Módulo', eje: 'Mosaico de ciudad, roca y mar',
    frase: 'Piezas cuadradas y triangulares componen ciudad, frontera, roca y mar en una retícula de 3 × 3.',
    dif: 'Excelente como patrón del sistema; como símbolo resulta ilustrativo y se acerca al paisaje.' },
  { k: 'reflejo', n: '06', t: 'Reflejo', eje: 'Horizonte y agua',
    frase: 'La roca sobre la línea del horizonte y su reflejo roto en líneas de agua.',
    dif: 'La más poética, pero también la más turística y vista: puesta de sol, montaña, reflejo.' },
];

const P = [
  {
    k: 'renglones', n: 'A', t: 'Renglones', fuente: 'Familjen Grotesk Bold',
    frase: 'El Peñón aparece donde terminan las líneas de texto.',
    capas: [
      ['Texto', 'Siete renglones alineados a la izquierda: un párrafo en bandera, la forma más básica del diseño editorial.'],
      ['El Peñón', 'Los finales de línea dibujan su perfil visto desde poniente: la cara norte vertical, el pico, la cresta larga y la bajada hacia el sur.'],
      ['Horizonte y mar', 'El último renglón es completo y va en otro color: el horizonte, el agua y la línea que da nombre a la ciudad.'],
    ],
    vinculo: 'Studio Linense cuenta historias desde La Línea con la roca siempre al fondo. El símbolo hace eso mismo: el Peñón es el contorno del texto, no un dibujo.',
    distinta: 'Ninguna agencia genérica puede usarlo: solo funciona con este perfil y este lugar. Se lee en pequeño como un bloque de texto y en grande como un paisaje, y el mismo recurso sirve para componer titulares y párrafos con forma de Peñón.',
    c: {
      oscuro: { bg: C.negro, a: W, b: C.lima, lin: W, stu: C.lima },
      claro: { bg: C.gris, a: C.noche, b: C.azul, lin: C.noche, stu: C.azul },
      icono: { bg: C.azul, a: W, b: C.lima },
      fav: { bg: C.negro, a: W, b: C.lima },
    },
    hor: L.renglonesHorizontal, ver: L.renglonesApilado,
  },
  {
    k: 'trazo', n: 'B', t: 'Trazo', fuente: 'Schibsted Grotesk ExtraBold',
    frase: 'Una línea baja del Peñón y sigue recta: eso es La Línea.',
    capas: [
      ['Mar', 'El trazo empieza plano, a nivel del agua.'],
      ['El Peñón', 'Sube por la pendiente sur y cae en vertical por la cara norte, la que mira a la ciudad. Visto desde el Mediterráneo, el norte queda a la derecha: la geografía es correcta.'],
      ['La Línea', 'Al pie de la cara norte la línea sigue recta: el istmo, la ciudad. Esa esquina final forma una L, y en el logo horizontal la misma línea subraya el nombre.'],
    ],
    vinculo: 'Es el recorrido real del territorio en un solo trazo: del mar a la roca y de la roca a la ciudad. La línea conecta el símbolo con el nombre igual que el estudio conecta marcas, medios y personas.',
    distinta: 'Es un gesto, no una figura: se puede dibujar en vivo, animar como una firma y prolongar para subrayar titulares, separar secciones o enlazar los medios de la red.',
    c: {
      oscuro: { bg: C.noche, a: W, b: C.lima, lin: W, stu: C.lima },
      claro: { bg: W, a: K, b: C.azul, lin: K, stu: C.azul },
      icono: { bg: C.lima, a: C.noche, b: C.noche },
      fav: { bg: C.noche, a: W, b: C.lima },
    },
    hor: L.trazoHorizontal, ver: L.trazoApilado,
  },
  {
    k: 'orillas', n: 'C', t: 'Dos orillas', fuente: 'Syne ExtraBold',
    frase: 'Dos territorios y una línea que no se dibuja.',
    capas: [
      ['La ciudad', 'Un bloque bajo y plano, como el istmo sobre el que está La Línea.'],
      ['El Peñón', 'Una cuña alta con la cara vertical vuelta hacia la ciudad: el perfil reducido a un plano y una diagonal.'],
      ['La Verja', 'El hueco entre ambos es la frontera: una línea en negativo que separa y a la vez une los dos territorios.'],
    ],
    vinculo: 'La identidad de La Línea está en esa relación: una ciudad que vive frente a la roca y en la frontera. El nombre se apoya a la altura de la ciudad, con la misma altura de mayúsculas que el bloque bajo.',
    distinta: 'Es la más rotunda en tamaños pequeños y la más fácil de convertir en sello, señalética o packaging. Las dos masas pueden contener fotos, colores o mensajes distintos: dos orillas que se responden.',
    c: {
      oscuro: { bg: C.noche, a: W, b: C.lima, lin: W, stu: C.lima },
      claro: { bg: W, a: C.noche, b: C.azul, lin: C.noche, stu: C.azul },
      icono: { bg: C.azul, a: W, b: C.lima },
      fav: { bg: C.noche, a: W, b: C.lima },
    },
    hor: L.orillasHorizontal, ver: L.orillasApilado,
  },
];

// Pieza de sistema por propuesta
const parrafoPenon = () => {
  const textos = ['Ideas', 'que se ven desde', 'aquí: campañas,', 'webs, marcas y', 'medios hechos en', 'La Línea para quien', 'vive frente a la roca.'];
  return L.RG.largos.map((l, i) => `<span style="width:${l}%">${textos[i]}</span>`).join('');
};
const sistema = {
  renglones: `<div class="sis sis-ren"><span class="mono">Titular compuesto con el perfil</span><div class="ren">${parrafoPenon()}</div></div>`,
  trazo: `<div class="sis sis-tra"><span class="mono">Animación · la línea se dibuja</span>
    <div class="fr">${[0.18, 0.55, 1].map((p) => `<div><svg viewBox="-8 -8 116 116" aria-hidden="true"><path d="M0 84H8L56 26L76 18V84H100" fill="none" stroke="${C.lima}" stroke-width="12" stroke-linejoin="miter" pathLength="100" stroke-dasharray="${p * 100} 100"/></svg><span class="mono">${Math.round(p * 100)}%</span></div>`).join('')}</div></div>`,
  orillas: `<div class="sis sis-ori"><div class="o-a"><span class="mono">Tu negocio</span></div><div class="o-b"><span class="mono">Nuestra audiencia</span></div></div>`,
};

const cardIdea = (d) => `
  <article class="dir${d.sel ? ' sel' : ''}">
    <div class="dir-fig">${L.simbolo(d.k, d.sel ? mono(W) : mono(K))}</div>
    <div class="dir-meta"><span class="mono">${d.n} · ${d.eje}</span>${d.sel ? '<span class="tag">Seleccionada</span>' : ''}</div>
    <h3>${d.t}</h3><p>${d.frase}</p><p class="dim">${d.dif}</p>
  </article>`;

const prop = (p) => `
<section class="prop" id="${p.k}">
  <div class="wrap">
    <header class="prop-cab"><span class="letra">${p.n}</span><div><h2>${p.t}</h2><p class="frase">${p.frase}</p></div></header>
    <div class="paso"><span class="mono">1 · Monocromo</span></div>
    <div class="g g-mono">
      <div class="t t-blanco t-sim">${L.simbolo(p.k, mono(K))}<span class="mono cap">Símbolo</span></div>
      <div class="t t-negro t-sim">${L.simbolo(p.k, mono(W))}<span class="mono cap">Símbolo invertido</span></div>
      <div class="t t-blanco t-hor">${p.hor(mono(K))}<span class="mono cap">Horizontal</span></div>
      <div class="t t-gris t-ver">${p.ver(mono(K))}<span class="mono cap">Apilado</span></div>
      <div class="t t-negro t-hor2">${p.hor(mono(W))}<span class="mono cap">Horizontal invertido</span></div>
      <div class="t t-blanco t-mini"><div class="tam">${[64, 32, 16].map((s) => `<div style="width:${s}px">${L.simbolo(p.k, mono(K))}</div>`).join('')}</div><span class="mono cap">64 · 32 · 16 px</span></div>
    </div>
    <div class="paso"><span class="mono">2 · Color</span></div>
    <div class="g g-color">
      <div class="t t-hor-c" style="background:${p.c.oscuro.bg}">${p.hor(p.c.oscuro)}<span class="mono cap" style="color:${p.c.oscuro.lin}">Sobre oscuro</span></div>
      <div class="t t-hor-c" style="background:${p.c.claro.bg}">${p.hor(p.c.claro)}<span class="mono cap" style="color:${p.c.claro.lin}">Sobre claro</span></div>
      <div class="t t-ver-c" style="background:${p.c.oscuro.bg}">${p.ver(p.c.oscuro)}</div>
      <div class="t t-perfil">
        <div class="perfil-sq" style="background:${p.c.icono.bg}">${L.simbolo(p.k, p.c.icono)}</div>
        <div class="perfil-ci" style="background:${p.c.icono.bg}">${L.simbolo(p.k, p.c.icono)}</div>
        <div class="perfil-fav" style="background:${p.c.fav.bg}">${L.simbolo(p.k, p.c.fav)}</div>
        <span class="mono cap">Icono · perfil · favicon</span>
      </div>
      <div class="t t-sis">${sistema[p.k]}</div>
    </div>
    <div class="capas">${p.capas.map(([h, t], i) => `<div><span class="mono">Capa ${i + 1}</span><h3>${h}</h3><p>${t}</p></div>`).join('')}</div>
    <div class="textos">
      <div><span class="mono">Vínculo con La Línea</span><p>${p.vinculo}</p></div>
      <div><span class="mono">Por qué es propia</span><p>${p.distinta}</p></div>
      <div><span class="mono">Logotipo</span><p>${p.fuente}, trazado. LINENSE en peso alto; STUDIO pequeño y espaciado.</p></div>
    </div>
  </div>
</section>`;

const css3 = `
.capas { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 3vw, 40px); border-top: 1px solid var(--filete); padding-block: 18px 28px; }
.capas > div { display: grid; gap: 8px; align-content: start; }
.capas h3 { font-size: 24px; }
.capas p { font-size: 15px; }
.capas .mono { color: var(--dim); }
@media (max-width: 820px) { .capas { grid-template-columns: 1fr; } }
.sis-ren { background: var(--noche); color: #fff; padding: 22px; display: grid; gap: 18px; align-content: start; }
.sis-ren .mono { opacity: .6; }
.ren { display: grid; gap: 6px; }
.ren span { display: block; background: #fff; color: var(--noche); font: 800 clamp(11px, 1.15vw, 14px)/1 var(--f-display); letter-spacing: -.01em; padding: 5px 6px; white-space: nowrap; overflow: hidden; }
.ren span:last-child { background: var(--lima); }
.sis-tra { background: var(--noche); color: #fff; padding: 22px; display: grid; gap: 18px; align-content: start; }
.sis-tra .mono { opacity: .6; }
.fr { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.fr > div { border: 1px solid rgba(255,255,255,.25); padding: 10px; display: grid; gap: 8px; }
.sis-ori { display: grid; grid-template-columns: 42fr 8fr 50fr; align-items: end; background: var(--gris); }
.o-a { grid-column: 1; height: 58%; background: var(--azul); color: #fff; padding: 14px; display: flex; align-items: flex-end; }
.o-b { grid-column: 3; height: 100%; background: var(--noche); color: #fff; padding: 14px; display: flex; align-items: flex-end; clip-path: polygon(0 0, 100% 50%, 100% 100%, 0 100%); }
`;

const html = `<title>Studio Linense · La Línea</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${css2}${css3}</style>

<div class="top"><div class="wrap"><span class="mono">Studio Linense · Identidad</span><span class="mono">Ronda 3 · la línea y el Peñón</span></div></div>

<section class="intro">
  <div class="wrap">
    <h1>Una línea, <span>un territorio.</span></h1>
    <div class="intro-txt">
      <p><b>La línea en todos sus sentidos.</b> Trazo, frontera, conexión, dirección, horizonte y el nombre de la ciudad. Cada idea parte de uno de esos sentidos.</p>
      <p><b>El Peñón como idea.</b> Aparece como perfil, como masa o como final de línea; nunca como dibujo turístico.</p>
      <p><b>Primero en una tinta.</b> El color llega solo cuando la forma funciona en negro, en blanco y a 16 px.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="dirs-cab"><h2>Seis ideas</h2><span class="mono dim">Bocetos en blanco y negro</span></div>
    <div class="dirs">${IDEAS.map(cardIdea).join('')}</div>
  </div>
</section>

${P.map(prop).join('')}

<section class="reco">
  <div class="wrap">
    <span class="mono" style="color:var(--lima)">Recomendación</span>
    <h2 style="margin-top:16px">Renglones: <em>el Peñón escrito, no dibujado.</em></h2>
    <div class="reco-g">
      <div><span class="mono">A · Renglones</span><p>La más propia y la que tiene más capas: editorial, horizonte y Peñón a la vez. Además crea un recurso de sistema (titulares con forma de perfil) que nadie más puede usar.</p></div>
      <div><span class="mono">B · Trazo</span><p>La mejor para motion y para conectar símbolo y nombre. Hay que cuidar que no se lea como un logo de montaña genérico: el tramo recto final es lo que lo hace de aquí.</p></div>
      <div><span class="mono">C · Dos orillas</span><p>La más rotunda como sello e icono, y la que explica mejor la frontera. Menos editorial que las otras dos.</p></div>
    </div>
  </div>
</section>
<footer><div class="wrap"><span class="mono">Studio Linense · Ronda 3</span><span class="mono">Archivos en marcas/studio-linense/ronda-3/</span></div></footer>
`;
fs.writeFileSync(out, html);

// SVG sueltos
fs.mkdirSync(svgDir, { recursive: true });
const solo = (s, bg, padF = 0.12) => {
  const vb = s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const inner = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const pad = bg ? Math.max(vb[2], vb[3]) * padF : 0;
  const v = [vb[0] - pad, vb[1] - pad, vb[2] + 2 * pad, vb[3] + 2 * pad].map((x) => +x.toFixed(2));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(' ')}">` + (bg ? `<rect x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}" fill="${bg}"/>` : '') + inner + '</svg>';
};
P.forEach((p) => {
  const n = p.n + '-' + p.k;
  fs.writeFileSync(`${svgDir}/${n}-simbolo-negro.svg`, solo(L.simbolo(p.k, mono(K))));
  fs.writeFileSync(`${svgDir}/${n}-horizontal-negro.svg`, solo(p.hor(mono(K))));
  fs.writeFileSync(`${svgDir}/${n}-apilado-negro.svg`, solo(p.ver(mono(K))));
  fs.writeFileSync(`${svgDir}/${n}-horizontal-oscuro.svg`, solo(p.hor(p.c.oscuro), p.c.oscuro.bg));
  fs.writeFileSync(`${svgDir}/${n}-horizontal-claro.svg`, solo(p.hor(p.c.claro), p.c.claro.bg));
  fs.writeFileSync(`${svgDir}/${n}-icono.svg`, solo(L.simbolo(p.k, p.c.icono), p.c.icono.bg, 0.3));
});
IDEAS.filter((d) => !d.sel).forEach((d) => fs.writeFileSync(`${svgDir}/descartada-${d.n}-${d.k}.svg`, solo(L.simbolo(d.k, mono(K)))));
console.log('ok', html.length);
