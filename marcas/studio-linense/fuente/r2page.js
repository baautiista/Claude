// Página de la ronda 2: seis direcciones en B/N y desarrollo de las tres elegidas.
const fs = require('fs');
const L = require('./r2lib');
const out = process.argv[2];
const svgDir = process.argv[3];

const C = { noche: '#061E5C', azul: '#1F5EFF', blanco: '#FFFFFF', gris: '#F4F6FA', negro: '#111318', lima: '#C7FF3D' };
const K = C.negro, W = C.blanco;
const mono = (f, bg) => ({ a: f, b: f, bg, lin: f, stu: f, line: f });

/* ---------- Direcciones ---------- */
const DIRS = [
  { k: 'desfase', n: '01', t: 'Desfase', eje: 'Una línea que se interrumpe',
    frase: 'Una línea se parte y sigue un escalón más abajo: las dos mitades solo se tocan en un punto.',
    dif: 'Sale del propio nombre: LINENSE contiene LINE, y el logotipo se compone igual que el símbolo.', sel: true },
  { k: 'ensamble', n: '02', t: 'Ensamble', eje: 'Tensión entre dos masas',
    frase: 'Dos bloques unidos por dos colas de milano opuestas; el canal que los separa es la línea.',
    dif: 'No es una letra: es una junta de carpintería. Habla de construir y de encajar.', sel: true },
  { k: 'reticula', n: '03', t: 'Retícula', eje: 'Sistema modular',
    frase: 'Módulos y medios módulos de una retícula de 3 × 3 forman una diagonal que crece.',
    dif: 'Genera patrones infinitos, pero como signo aislado se parece a muchos iconos de «crecimiento».' },
  { k: 'interseccion', n: '04', t: 'Intersección', eje: 'Óptico, espacio negativo',
    frase: 'Dos cuadrados se solapan y la zona común queda vacía: el espacio compartido.',
    dif: 'El protagonista es lo que no se dibuja. Recurso muy visto; difícil de registrar.' },
  { k: 'tres', n: '05', t: 'Tres líneas', eje: 'Editorial y tipográfico',
    frase: 'La E central de LINENSE sin su asta: tres renglones, el del medio sale hacia fuera.',
    dif: 'Muy editorial, pero se confunde con un icono de menú en pantalla.' },
  { k: 'istmo', n: '06', t: 'Istmo', eje: 'Abstracto, no basado en letras',
    frase: 'Una masa grande y una pequeña unidas por una línea fina.',
    dif: 'Referencia local sin nada literal: La Línea está sobre un istmo. También es un nodo de red.', sel: true },
];

const dirCards = DIRS.map((d) => `
  <article class="dir${d.sel ? ' sel' : ''}">
    <div class="dir-fig">${L.simbolo(d.k, d.sel ? mono(W, K) : mono(K, W))}</div>
    <div class="dir-meta"><span class="mono">${d.n} · ${d.eje}</span>${d.sel ? '<span class="tag">Seleccionada</span>' : ''}</div>
    <h3>${d.t}</h3>
    <p>${d.frase}</p>
    <p class="dim">${d.dif}</p>
  </article>`).join('');

/* ---------- Propuestas desarrolladas ---------- */
const P = [
  {
    k: 'desfase', n: 'A', t: 'Desfase', fuente: 'Schibsted Grotesk Black',
    frase: 'La línea se rompe y sigue: un escalón exacto, del tamaño de su propio grosor.',
    lecturas: ['LINENSE contiene la palabra LINE. El logotipo se parte en LINE y NSE con el mismo escalón del símbolo; la E y la N se tocan solo por una esquina.',
      'Una frontera no es un muro: es el punto en el que una línea cambia de nivel y continúa.'],
    distinta: 'No hay letra dibujada ni forma decorativa: el símbolo y el nombre comparten una única regla de construcción. Es reconocible en una tinta y a 16 px, y el escalón se puede aplicar a titulares, maquetas y animaciones.',
    representa: 'El lado editorial y de medios: titulares, maquetación, el ritmo de una página.',
    c: {
      oscuro: { bg: C.negro, a: W, b: C.lima, lin: W, lin2: C.lima, stu: C.lima },
      claro: { bg: W, a: K, b: C.azul, lin: K, lin2: C.azul, stu: C.azul },
      perfil: { bg: C.lima, a: K, b: K },
      fav: { bg: K, a: W, b: C.lima },
    },
    hor: (c) => L.desfaseHorizontal(c), ver: (c) => L.desfaseApilado(c), palabra: (c) => L.desfasePalabra(c),
  },
  {
    k: 'ensamble', n: 'B', t: 'Ensamble', fuente: 'Syne ExtraBold',
    frase: 'Lo que separa también une: cada pieza entra en la otra.',
    lecturas: ['La cola de milano es la unión de carpintería que no necesita clavos: aguanta porque las piezas están bien cortadas. Aquí hay dos, en sentidos opuestos: cada pieza entra en la otra.',
      'El canal entre los bloques dibuja una frontera quebrada que, mirada de cerca, recorre una S. Y las dos piezas son la marca y su audiencia: «Tu negocio. Nuestra audiencia».'],
    distinta: 'Viene del oficio y de la arquitectura, no del marketing. El canal es una línea en negativo que se puede animar abriendo y cerrando las piezas, y el bloque compacto funciona como sello en packaging y señalética.',
    representa: 'El estudio de branding y producto: construir marcas, colecciones y objetos propios.',
    c: {
      oscuro: { bg: C.azul, a: W, b: C.noche, lin: W, stu: W },
      claro: { bg: C.gris, a: C.noche, b: C.azul, lin: C.noche, stu: C.azul },
      perfil: { bg: C.azul, a: W, b: C.noche },
      fav: { bg: C.noche, a: W, b: C.azul },
    },
    hor: (c) => L.clasicoHorizontal('ensamble', 'ens', c, { H: 40, track: -10 }), ver: (c) => L.clasicoApilado('ensamble', 'ens', c, { H: 40, track: -10 }),
  },
  {
    k: 'istmo', n: 'C', t: 'Istmo', fuente: 'Bricolage Grotesque ExtraBold',
    frase: 'Dos masas distintas unidas por una línea: el lugar, la red y el nombre a la vez.',
    lecturas: ['La Línea de la Concepción está sobre un istmo, una franja de tierra que une dos espacios. Sin mapas, sin Peñón: solo la idea.',
      'Es también un nodo: medios, marcas y personas conectados. Y en la firma lineal, STUDIO es la masa pequeña y LINENSE la grande.'],
    distinta: 'Es la única de las tres que no remite a ninguna letra. Tiene una historia local fuerte sin caer en lo literal, y la línea de conexión se convierte en un recurso gráfico propio: subrayados, separadores, enlaces entre medios.',
    representa: 'La red: Studio Linense como lo que conecta InfoLinense, Carnavalinense, Ferialinense, El Cofrade Linense y AgendaLinense.',
    c: {
      oscuro: { bg: C.noche, a: W, b: C.lima, lin: W, stu: C.lima, line: C.lima },
      claro: { bg: W, a: K, b: C.azul, lin: K, stu: C.azul, line: C.azul },
      perfil: { bg: C.noche, a: W, b: C.lima },
      fav: { bg: C.noche, a: W, b: C.lima },
    },
    hor: (c) => L.clasicoHorizontal('istmo', 'ist', c, { H: 44, track: -15 }), ver: (c) => L.clasicoApilado('istmo', 'ist', c, { H: 44, track: -15 }),
    firma: (c) => L.istmoFirma(c),
  },
];

/* Piezas de sistema: un ejemplo de cómo crece cada símbolo */
const sistema = {
  desfase: `
    <div class="sis sis-des">
      <span class="mono">Cartel · el escalón aplicado a un titular</span>
      <div class="esc1">Ideas que</div><div class="esc2">se ven.</div>
      <div class="sis-pie">${L.simbolo('desfase', { a: W, b: C.lima }, 'sym s-mini')}<span>Studio Linense · Campañas 2027</span></div>
    </div>`,
  ensamble: `
    <div class="sis sis-ens">
      <div class="ens-a"><span class="mono">Tu negocio</span></div>
      <div class="ens-b"><span class="mono">Nuestra audiencia</span></div>
      <svg class="ens-junta" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0H100V100H50V78L66 84V60L50 66V34L34 40V16L50 22Z" fill="${C.azul}"/><path d="M50 -5V22L34 16V40L50 34V66L66 60V84L50 78V105" fill="none" stroke="${C.gris}" stroke-width="5" vector-effect="non-scaling-stroke"/></svg>
    </div>`,
  istmo: `
    <div class="sis sis-ist">
      <span class="mono">Firma de red · la línea conecta los medios</span>
      <ul>
        ${['InfoLinense', 'Carnavalinense', 'Ferialinense', 'El Cofrade Linense', 'AgendaLinense'].map((m) => `<li><b>${m}</b><i></i><span>Studio Linense</span></li>`).join('')}
      </ul>
    </div>`,
};

const prop = (p) => {
  const blancoNegro = mono(K, W), negroBlanco = mono(W, K);
  return `
<section class="prop" id="${p.k}">
  <div class="wrap">
    <header class="prop-cab">
      <span class="letra">${p.n}</span>
      <div><h2>${p.t}</h2><p class="frase">${p.frase}</p></div>
    </header>

    <div class="paso"><span class="mono">1 · Monocromo: el concepto tiene que funcionar en una tinta</span></div>
    <div class="g g-mono">
      <div class="t t-blanco t-sim">${L.simbolo(p.k, blancoNegro)}<span class="mono cap">Símbolo</span></div>
      <div class="t t-negro t-sim">${L.simbolo(p.k, negroBlanco)}<span class="mono cap">Símbolo invertido</span></div>
      <div class="t t-blanco t-hor">${p.hor(blancoNegro)}<span class="mono cap">Horizontal</span></div>
      <div class="t t-gris t-ver">${p.ver(blancoNegro)}<span class="mono cap">Apilado</span></div>
      <div class="t t-negro t-hor2">${p.hor(negroBlanco)}<span class="mono cap">Horizontal invertido</span></div>
      <div class="t t-blanco t-mini">
        <div class="tam">${[64, 32, 16].map((s) => `<div style="width:${s}px">${L.simbolo(p.k, blancoNegro)}</div>`).join('')}</div>
        <span class="mono cap">64 · 32 · 16 px</span>
      </div>
    </div>

    <div class="paso"><span class="mono">2 · Color: solo después de resolver la forma</span></div>
    <div class="g g-color">
      <div class="t t-hor-c" style="background:${p.c.oscuro.bg}">${p.hor(p.c.oscuro)}<span class="mono cap" style="color:${p.c.oscuro.lin}">Sobre oscuro</span></div>
      <div class="t t-hor-c" style="background:${p.c.claro.bg}">${p.hor(p.c.claro)}<span class="mono cap" style="color:${p.c.claro.lin}">Sobre claro</span></div>
      <div class="t t-ver-c" style="background:${p.c.oscuro.bg}">${p.ver(p.c.oscuro)}</div>
      <div class="t t-perfil">
        <div class="perfil-sq" style="background:${p.c.perfil.bg}">${L.simbolo(p.k, p.c.perfil)}</div>
        <div class="perfil-ci" style="background:${p.c.perfil.bg}">${L.simbolo(p.k, p.c.perfil)}</div>
        <div class="perfil-fav" style="background:${p.c.fav.bg}">${L.simbolo(p.k, p.c.fav)}</div>
        <span class="mono cap">Perfil · recorte circular · favicon</span>
      </div>
      ${p.firma ? `<div class="t t-firma" style="background:${p.c.claro.bg}">${p.firma(p.c.claro)}<span class="mono cap">Firma lineal: STUDIO — LINENSE</span></div>` : ''}
      <div class="t t-sis">${sistema[p.k]}</div>
    </div>

    <div class="textos">
      <div><span class="mono">Concepto</span>${p.lecturas.map((l) => `<p>${l}</p>`).join('')}</div>
      <div><span class="mono">Por qué es distinta</span><p>${p.distinta}</p></div>
      <div><span class="mono">Qué representa</span><p>${p.representa}</p><p class="dim">Logotipo: ${p.fuente}, trazado.</p></div>
    </div>
  </div>
</section>`;
};

const html = `<title>Studio Linense · Ronda 2</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Maqueta: cuaderno de estudio suizo; blanco y negro hasta que cada propuesta pasa al color. Retícula de 12 columnas, filetes finos, etiquetas en mono. Un solo mundo visual. */
:root {
  --papel: #FFFFFF; --tinta: #111318; --gris: #F4F6FA; --filete: #DADDE3; --dim: #5E6370;
  --noche: #061E5C; --azul: #1F5EFF; --lima: #C7FF3D;
  --f-display: "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
  color-scheme: light;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--papel); color: var(--tinta); font: 400 16px/1.55 var(--f-display); }
.wrap { max-width: 1240px; margin-inline: auto; padding-inline: max(16px, 3.5vw); }
h1, h2, h3 { margin: 0; font-family: var(--f-display); font-weight: 900; letter-spacing: -.035em; line-height: .95; text-wrap: balance; }
p { margin: 0; max-width: 62ch; }
.mono { font: 500 11px/1.4 var(--f-mono); letter-spacing: .06em; text-transform: uppercase; }
.dim { color: var(--dim); }
svg { display: block; }
.sym, .hor, .ver, .word { width: 100%; height: auto; }

/* Cabecera */
.top { border-bottom: 1px solid var(--tinta); padding-block: 18px; }
.top .wrap { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.intro { padding-block: clamp(48px, 8vw, 110px) clamp(36px, 5vw, 64px); }
.intro h1 { font-size: clamp(48px, 9.5vw, 136px); max-width: 11ch; }
.intro h1 span { display: block; padding-left: 1.2em; }
.intro-txt { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: clamp(32px, 5vw, 56px); border-top: 1px solid var(--filete); padding-top: 18px; }
.intro-txt p { font-size: 15px; color: var(--dim); }
.intro-txt b { color: var(--tinta); font-weight: 700; }
@media (max-width: 820px) { .intro-txt { grid-template-columns: 1fr; } }

/* Direcciones */
.dirs-cab { display: flex; justify-content: space-between; align-items: end; gap: 16px; flex-wrap: wrap; border-top: 1px solid var(--tinta); padding-top: 14px; margin-bottom: 24px; }
.dirs-cab h2 { font-size: clamp(28px, 4vw, 44px); }
.dirs { display: grid; grid-template-columns: repeat(3, 1fr); border-left: 1px solid var(--filete); border-top: 1px solid var(--filete); }
@media (max-width: 900px) { .dirs { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .dirs { grid-template-columns: 1fr; } }
.dir { border-right: 1px solid var(--filete); border-bottom: 1px solid var(--filete); padding: 22px; display: grid; gap: 10px; align-content: start; min-width: 0; }
.dir-fig { background: var(--gris); aspect-ratio: 16 / 10; max-width: 100%; display: grid; place-items: center; margin-bottom: 8px; }
.dir-fig .sym { width: 30%; }
.dir.sel .dir-fig { background: var(--tinta); }
.dir-meta { display: flex; justify-content: space-between; gap: 8px; align-items: center; color: var(--dim); }
.tag { font: 500 10px/1 var(--f-mono); text-transform: uppercase; letter-spacing: .08em; background: var(--lima); color: var(--tinta); padding: 5px 7px; white-space: nowrap; }
.dir h3 { font-size: 28px; }
.dir p { font-size: 14.5px; }

/* Propuestas */
.prop { padding-block: clamp(64px, 9vw, 120px) 0; }
.prop-cab { display: grid; grid-template-columns: auto 1fr; gap: clamp(16px, 3vw, 40px); align-items: start; border-top: 3px solid var(--tinta); padding-top: 20px; margin-bottom: clamp(28px, 4vw, 48px); }
.letra { font: 900 clamp(64px, 10vw, 140px)/.8 var(--f-display); letter-spacing: -.05em; }
.prop-cab h2 { font-size: clamp(44px, 7vw, 96px); }
.frase { font-size: clamp(18px, 2vw, 24px); line-height: 1.3; margin-top: 14px; font-weight: 500; max-width: 34ch; }
.paso { border-top: 1px solid var(--filete); padding-block: 12px 14px; color: var(--dim); }
.g { display: grid; grid-template-columns: repeat(12, 1fr); gap: 10px; margin-bottom: 28px; }
.t { position: relative; padding: clamp(22px, 3.5vw, 44px); display: grid; place-items: center; min-height: 220px; min-width: 0; }
.t .cap { position: absolute; left: 14px; bottom: 12px; opacity: .6; }
.t-blanco { background: var(--papel); border: 1px solid var(--filete); color: var(--tinta); }
.t-negro { background: var(--tinta); color: #fff; }
.t-gris { background: var(--gris); color: var(--tinta); }
.t-sim { grid-column: span 3; aspect-ratio: 1; max-width: 100%; }
.t-sim .sym { width: 52%; }
.t-hor { grid-column: span 6; }
.t-hor .hor, .t-hor2 .hor { max-width: 460px; }
.t-ver { grid-column: span 4; grid-row: span 2; }
.t-ver .ver { max-width: 230px; }
.t-hor2 { grid-column: span 5; }
.t-mini { grid-column: span 3; }
.tam { display: flex; gap: 22px; align-items: flex-end; }
.t-hor-c { grid-column: span 6; min-height: 260px; }
.t-hor-c .hor { max-width: 480px; }
.t-ver-c { grid-column: span 4; grid-row: span 2; }
.t-ver-c .ver { max-width: 220px; }
.t-perfil { grid-column: span 4; background: var(--gris); display: flex; align-items: flex-end; justify-content: center; gap: 18px; padding-bottom: 48px; }
.perfil-sq { width: 120px; aspect-ratio: 1; display: grid; place-items: center; }
.perfil-ci { width: 80px; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; }
.perfil-fav { width: 32px; aspect-ratio: 1; display: grid; place-items: center; border-radius: 6px; }
.perfil-sq .sym, .perfil-ci .sym { width: 50%; }
.perfil-fav .sym { width: 62%; }
.t-firma { grid-column: span 4; border: 1px solid var(--filete); }
.t-firma .word { max-width: 340px; }
.t-sis { grid-column: span 4; padding: 0; place-items: stretch; }
.prop#istmo .t-sis { grid-column: span 4; }
@media (max-width: 980px) {
  .t-sim, .t-mini { grid-column: span 6; }
  .t-hor, .t-hor2, .t-hor-c { grid-column: 1 / -1; }
  .t-ver, .t-ver-c, .t-perfil, .t-firma, .t-sis, .prop#istmo .t-sis { grid-column: span 6; grid-row: auto; }
}
@media (max-width: 600px) {
  .t-sim, .t-mini, .t-ver, .t-ver-c, .t-perfil, .t-firma, .t-sis, .prop#istmo .t-sis { grid-column: 1 / -1; }
}

/* Sistema */
.sis { width: 100%; height: 100%; min-height: 300px; position: relative; overflow: hidden; }
.sis-des { background: var(--tinta); color: #fff; padding: 22px; display: grid; grid-template-rows: auto 1fr auto 1fr auto; }
.sis-des .mono { opacity: .6; }
.esc1, .esc2 { font: 900 clamp(34px, 4vw, 52px)/.9 var(--f-display); letter-spacing: -.04em; }
.esc1 { align-self: end; }
.esc2 { color: var(--lima); justify-self: end; }
.sis-pie { display: flex; gap: 10px; align-items: center; font: 500 11px/1 var(--f-mono); text-transform: uppercase; letter-spacing: .06em; opacity: .85; }
.s-mini { width: 26px !important; }
.sis-ens { background: var(--noche); color: #fff; }
.ens-a { position: absolute; left: 18px; top: 18px; z-index: 1; }
.ens-b { position: absolute; right: 18px; bottom: 18px; z-index: 1; }
.ens-junta { position: absolute; inset: 0; width: 100%; height: 100%; }
.sis-ist { background: var(--noche); color: #fff; padding: 22px; display: grid; gap: 18px; align-content: start; }
.sis-ist .mono { opacity: .6; }
.sis-ist ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.sis-ist li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0; }
.sis-ist b { font: 800 clamp(15px, 1.6vw, 19px)/1 var(--f-display); letter-spacing: -.01em; background: #fff; color: var(--noche); padding: 7px 9px; }
.sis-ist i { height: 3px; background: var(--lima); }
.sis-ist span { font: 500 10px/1 var(--f-mono); letter-spacing: .08em; text-transform: uppercase; border: 1px solid rgba(255,255,255,.6); padding: 5px 6px; }

.textos { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: clamp(20px, 3vw, 40px); border-top: 1px solid var(--filete); padding-top: 18px; }
.textos > div { display: grid; gap: 10px; align-content: start; min-width: 0; }
.textos .mono { color: var(--dim); }
.textos p { font-size: 15px; }
@media (max-width: 900px) { .textos { grid-template-columns: 1fr; } }

/* Recomendación */
.reco { margin-top: clamp(72px, 10vw, 140px); background: var(--tinta); color: #fff; padding-block: clamp(56px, 8vw, 104px); }
.reco h2 { font-size: clamp(36px, 6vw, 80px); max-width: 14ch; }
.reco h2 em { font-style: normal; color: var(--lima); }
.reco-g { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: clamp(32px, 5vw, 56px); }
@media (max-width: 820px) { .reco-g { grid-template-columns: 1fr; } }
.reco-g > div { border-top: 1px solid rgba(255,255,255,.35); padding-top: 14px; display: grid; gap: 10px; align-content: start; }
.reco-g .mono { color: var(--lima); }
.reco-g p { font-size: 15px; color: rgba(255,255,255,.82); }
footer { background: var(--tinta); color: rgba(255,255,255,.55); border-top: 1px solid rgba(255,255,255,.15); padding-block: 22px; }
footer .wrap { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
</style>

<div class="top"><div class="wrap"><span class="mono">Studio Linense · Identidad</span><span class="mono">Ronda 2 · exploración de símbolo</span></div></div>

<section class="intro">
  <div class="wrap">
    <h1>Seis direcciones, <span>tres caminos.</span></h1>
    <div class="intro-txt">
      <p><b>Primero en blanco y negro.</b> Cada dirección parte de una idea distinta (una línea, una frontera, un sistema, un vacío, una letra, un lugar), no de una variación de forma.</p>
      <p><b>Después, tres desarrolladas.</b> Símbolo, horizontal, apilado, monocromo, color sobre claro y oscuro, perfil, favicon y una pieza de sistema.</p>
      <p><b>Sin literalidad.</b> Ni mapas, ni Peñón, ni iconos de agencia. La ciudad aparece como idea: la línea, el cruce, el istmo.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="dirs-cab"><h2>Las seis direcciones</h2><span class="mono dim">Bocetos en una tinta</span></div>
    <div class="dirs">${dirCards}</div>
  </div>
</section>

${P.map(prop).join('')}

<section class="reco">
  <div class="wrap">
    <span class="mono" style="color:var(--lima)">Recomendación</span>
    <h2 style="margin-top:16px">Desfase, porque <em>el nombre ya es el concepto.</em></h2>
    <div class="reco-g">
      <div><span class="mono">A · Desfase</span><p>La más propia y la más registrable: símbolo y logotipo salen de la misma regla y nadie más puede escribir LINE/NSE. Además crea un lenguaje (el escalón) para titulares, carteles y motion.</p></div>
      <div><span class="mono">B · Ensamble</span><p>La más sólida como sello de producto y packaging. Encaja si Studio Linense quiere sonar más a estudio de diseño y objeto que a medio.</p></div>
      <div><span class="mono">C · Istmo</span><p>La de mejor historia local y la que mejor explica la red de medios. Su línea fina pide cuidado por debajo de 24 px.</p></div>
    </div>
  </div>
</section>
<footer><div class="wrap"><span class="mono">Studio Linense · Ronda 2</span><span class="mono">Archivos en marcas/studio-linense/ronda-2/</span></div></footer>
`;
fs.writeFileSync(out, html);

/* SVG sueltos */
fs.mkdirSync(svgDir, { recursive: true });
const solo = (s, bg) => {
  const vb = s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const inner = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const pad = bg ? Math.max(vb[2], vb[3]) * 0.12 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb[0] - pad} ${vb[1] - pad} ${vb[2] + 2 * pad} ${vb[3] + 2 * pad}">` +
    (bg ? `<rect x="${vb[0] - pad}" y="${vb[1] - pad}" width="${vb[2] + 2 * pad}" height="${vb[3] + 2 * pad}" fill="${bg}"/>` : '') + inner + '</svg>';
};
P.forEach((p) => {
  const n = p.n + '-' + p.k;
  fs.writeFileSync(`${svgDir}/${n}-simbolo-negro.svg`, solo(L.simbolo(p.k, mono(K, W))));
  fs.writeFileSync(`${svgDir}/${n}-horizontal-negro.svg`, solo(p.hor(mono(K, W))));
  fs.writeFileSync(`${svgDir}/${n}-apilado-negro.svg`, solo(p.ver(mono(K, W))));
  fs.writeFileSync(`${svgDir}/${n}-horizontal-oscuro.svg`, solo(p.hor(p.c.oscuro), p.c.oscuro.bg));
  fs.writeFileSync(`${svgDir}/${n}-horizontal-claro.svg`, solo(p.hor(p.c.claro), p.c.claro.bg));
  fs.writeFileSync(`${svgDir}/${n}-perfil.svg`, solo(L.simbolo(p.k, p.c.perfil), p.c.perfil.bg).replace(/viewBox="[^"]+"/, 'viewBox="-40 -40 180 180"').replace(/<rect x="[^"]+" y="[^"]+" width="[^"]+" height="[^"]+"/, '<rect x="-40" y="-40" width="180" height="180"'));
  if (p.firma) fs.writeFileSync(`${svgDir}/${n}-firma-negro.svg`, solo(p.firma(mono(K, W))));
});
DIRS.filter((d) => !d.sel).forEach((d) => fs.writeFileSync(`${svgDir}/descartada-${d.n}-${d.k}.svg`, solo(L.simbolo(d.k, mono(K, W)))));
console.log('ok', html.length);
