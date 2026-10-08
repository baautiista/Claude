// Tablero de marca: Studio Linense · Trama variable.
const fs = require('fs');
const L = require('./r6lib');
const [out, svgDir] = process.argv.slice(2);
const { azul: A, negro: K, lima: Li, blanco: W } = L.PAL;
const c = { A, K, T: K };

const modulosBasicos = [['r', 0, A], ['a', 180, K], ['s', 0, K], ['a', 0, K], ['q', 0, K]]
  .map((m) => L.trama([[m]], 'sym mod').svg).join('');
const variaciones = L.VARIACIONES(A, K).map((f) => `<div class="var">${L.trama(f).svg}</div>`).join('');
const submarcas = L.SUBMARCAS.map((s) => `
  <div class="sub">${L.trama(s.f(s.lima ? Li : A, K)).svg}<h3>${s.n}</h3><p>${s.t}</p></div>`).join('');

// Código de los módulos para el botón "Reordenar" (mismo dibujo que en el servidor)
const clienteJS = `
const U = ${L.U}, GAP = ${L.GAP};
const BASE = {${Object.entries(L.BASE).map(([k, f]) => `${k}: ${f.toString()}`).join(',\n')}};
const TIPOS = ['s','r','d','q','a'], GIROS = [0,90,180,270], COL = ['${A}','${K}'];
function pieza(t, g, col, ci, fi) {
  const x = ci * (U + GAP), y = fi * (U + GAP);
  return '<path d="' + BASE[t](x, y) + '" fill="' + col + '"' + (g ? ' transform="rotate(' + g + ' ' + (x + U/2) + ' ' + (y + U/2) + ')"' : '') + '/>';
}
function reordenar() {
  const n = (k) => Math.floor(Math.random() * k);
  const cols = [n(2), 1 - n(2)];
  let body = '';
  for (let f = 0; f < 2; f++) for (let ci = 0; ci < 2; ci++) {
    const col = COL[(f + ci + (n(3) === 0 ? 1 : 0)) % 2];
    body += pieza(TIPOS[n(5)], GIROS[n(4)], col, ci, f);
  }
  document.getElementById('trama-viva').innerHTML = body;
}
document.getElementById('btn-reordenar').addEventListener('click', reordenar);
`;
const vivaInicial = L.trama(L.simboloFilas(A, K)).body;

const html = `<title>Studio Linense · Trama variable</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700;800&display=swap">
<style>
/* Tablero de marca en retícula de paneles con filetes finos, como una lámina de presentación. Un solo mundo visual: papel claro. */
:root {
  --negro: ${K}; --azul: ${A}; --lima: ${Li}; --blanco: ${W};
  --papel: #FBFBFA; --gris: #EDEDEB; --filete: #DCDCD8; --tinta: #0B0B0B; --dim: #6B6B6B;
  --f: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  color-scheme: light;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--papel); color: var(--tinta); font: 400 15px/1.5 var(--f); }
.wrap { max-width: 1240px; margin-inline: auto; padding-inline: max(16px, 3vw); padding-block: clamp(24px, 4vw, 48px); }
svg { display: block; }
.sym, .hor, .logo, .app { width: 100%; height: auto; }
h1, h2, h3 { margin: 0; font-family: var(--f); }
p { margin: 0; }
.eti { font: 700 11px/1.2 var(--f); letter-spacing: .16em; text-transform: uppercase; }
.num { font: 500 11px/1.2 var(--f); color: var(--dim); }
.panel-cab { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.fila { display: grid; gap: 0; border-top: 1px solid var(--filete); }
.panel { padding: 22px; min-width: 0; }
.panel + .panel { border-left: 1px solid var(--filete); }
@media (max-width: 900px) { .panel + .panel { border-left: 0; border-top: 1px solid var(--filete); } }

/* Fila 1 */
.f1 { grid-template-columns: 1fr 1.45fr 1.1fr; border-top: 0; }
@media (max-width: 900px) { .f1 { grid-template-columns: 1fr; } }
.concepto { display: grid; align-content: space-between; gap: 32px; padding-left: 0; }
.concepto h1 { font-size: clamp(46px, 5.6vw, 72px); font-weight: 800; letter-spacing: -.04em; line-height: .9; }
.concepto .lema { font-size: 20px; color: var(--azul); font-weight: 500; line-height: 1.2; margin-top: 12px; }
.concepto p.txt { color: #333; max-width: 36ch; margin-top: 18px; font-size: 14px; }
.atributos { border-top: 1px solid var(--tinta); width: 44px; padding-top: 14px; }
.atributos ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font: 500 11px/1 var(--f); letter-spacing: .3em; width: max-content; }
.p-logo { display: grid; align-content: start; }
.p-logo .logo { max-width: 400px; margin: 10px auto 0; }
.p-sim .sym { max-width: 260px; margin: 30px auto 0; }

/* Sistema */
.f2 { grid-template-columns: 1fr; }
.sistema { display: grid; grid-template-columns: 1.1fr 1fr; gap: 32px; align-items: center; }
@media (max-width: 900px) { .sistema { grid-template-columns: 1fr; } }
.mods { display: flex; gap: 14px; }
.mods .mod { width: 18%; max-width: 72px; }
.leyenda { display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: center; margin-top: 18px; font-size: 12px; color: var(--dim); }
.leyenda span { font: 500 10px/1 var(--f); letter-spacing: .2em; text-transform: uppercase; }
.vars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px 26px; }
.var .sym { max-width: 64px; margin-inline: auto; }
.vars-pie { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 18px; }
.vars-pie span { font: 500 10px/1 var(--f); letter-spacing: .2em; text-transform: uppercase; color: var(--dim); }
.viva { display: grid; grid-template-columns: 120px 1fr; gap: 24px; align-items: center; margin-top: 26px; border-top: 1px solid var(--filete); padding-top: 22px; }
.viva p { font-size: 13px; color: var(--dim); max-width: 46ch; }
button { font: 700 11px/1 var(--f); letter-spacing: .14em; text-transform: uppercase; background: var(--tinta); color: #fff; border: 0; padding: 12px 16px; cursor: pointer; }
button:hover { background: var(--azul); }
button:focus-visible { outline: 2px solid var(--azul); outline-offset: 3px; }
#trama-viva path { transition: d .35s ease, fill .35s ease; }
@media (prefers-reduced-motion: reduce) { #trama-viva path { transition: none; } }

/* Submarcas */
.subs { display: grid; grid-template-columns: repeat(4, 1fr); }
@media (max-width: 760px) { .subs { grid-template-columns: repeat(2, 1fr); } }
.sub { padding: 18px 12px; text-align: center; display: grid; gap: 10px; justify-items: center; }
.sub + .sub { border-left: 1px solid var(--filete); }
.sub .sym { width: 96px; }
.sub h3 { font-size: 24px; font-weight: 700; letter-spacing: -.01em; margin-top: 6px; }
.sub p { color: var(--dim); font-size: 14px; max-width: 16ch; }

/* Paleta, tipografía, versiones */
.f4 { grid-template-columns: 1fr 1fr 1.1fr; }
@media (max-width: 900px) { .f4 { grid-template-columns: 1fr; } }
.paleta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.paleta div { display: grid; gap: 8px; font-size: 12px; }
.paleta i { display: block; width: 56px; aspect-ratio: 1; border-radius: 50%; }
.paleta code { font: 500 11px/1 var(--f); color: var(--dim); }
.tipo { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; }
.tipo .nom { max-width: 220px; }
.tipo p { font-size: 12px; color: var(--dim); }
.tipo small { display: block; margin-top: 10px; font-size: 11px; color: var(--dim); }
.versiones { display: grid; grid-template-columns: 1fr 96px; gap: 18px; align-items: center; }
.versiones .hor { max-width: 230px; }
.versiones .lista { display: grid; gap: 18px; }
.mono-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.mono-fila div { padding: 14px; }
.mono-fila .hor { max-width: 200px; }

/* Aplicaciones */
.apps { display: grid; grid-template-columns: 1.15fr 1.3fr .95fr; grid-template-rows: auto auto; gap: 10px; }
@media (max-width: 900px) { .apps { grid-template-columns: 1fr; } }
.mk { background: var(--gris); position: relative; overflow: hidden; min-width: 0; }
.mk-cartel { grid-row: span 2; display: grid; place-items: center; padding: 28px; background: #D9D8D3; }
.cartel { background: #fff; width: 100%; max-width: 360px; aspect-ratio: 3 / 4.3; padding: 8%; display: grid; grid-template-rows: auto 1fr auto; box-shadow: 0 20px 40px rgba(0,0,0,.18); }
.cartel .top { display: flex; justify-content: space-between; gap: 10px; }
.cartel b { font: 800 clamp(16px, 2vw, 22px)/1 var(--f); letter-spacing: -.02em; text-transform: uppercase; max-width: 9ch; }
.cartel .top .hor { width: 70px; }
.cartel .gran { width: 66%; align-self: center; justify-self: center; }
.cartel .pie { display: flex; justify-content: space-between; font: 500 7px/1.5 var(--f); letter-spacing: .2em; text-transform: uppercase; }
.mk-papel { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 22px; align-items: center; background: #CFCFCB; }
.tarjeta { aspect-ratio: 85 / 55; padding: 10%; display: grid; align-content: space-between; box-shadow: 0 10px 22px rgba(0,0,0,.18); }
.tarjeta .hor { width: 72%; }
.tarjeta span { font: 500 7px/1.6 var(--f); letter-spacing: .2em; text-transform: uppercase; }
.bolsa { background: #F1EEE6; aspect-ratio: 4 / 4.6; display: grid; place-items: center; padding: 18%; position: relative; box-shadow: 0 10px 22px rgba(0,0,0,.14); }
.bolsa::before { content: ""; position: absolute; top: -22%; left: 30%; width: 40%; height: 30%; border: 4px solid #E3DED2; border-bottom: 0; border-radius: 50% 50% 0 0; }
.mk-rotulo { grid-row: span 2; background: #3A3A38; display: grid; place-items: center; padding: 30px; }
.rotulo { background: var(--negro); width: 100%; max-width: 230px; aspect-ratio: 1; padding: 18%; display: grid; gap: 12%; align-content: center; box-shadow: 14px 14px 0 rgba(0,0,0,.35); border-radius: 6px; }
.rotulo .sym { width: 70%; justify-self: center; }
.rotulo .nm { width: 100%; }
.mk-movil { display: grid; grid-template-columns: .8fr 1fr; gap: 10px; background: transparent; }
.movil { background: #fff; border: 8px solid #111; border-radius: 28px; padding: 18px 14px; display: grid; gap: 12px; align-content: start; min-height: 300px; position: relative; overflow: hidden; }
.movil .barra { display: flex; justify-content: space-between; align-items: center; }
.movil .barra .hor { width: 70px; }
.movil b { font: 800 19px/1.05 var(--f); letter-spacing: -.02em; }
.movil p { font-size: 9px; color: var(--dim); }
.movil .cta { font: 700 8px/1 var(--f); background: var(--negro); color: #fff; border-radius: 99px; padding: 8px 10px; justify-self: start; }
.movil .deco { position: absolute; right: -10px; bottom: -10px; width: 46%; }
.post { background: #fff; display: grid; grid-template-rows: auto 1fr; overflow: hidden; }
.post .cab { padding: 14px; display: flex; justify-content: space-between; gap: 8px; background: var(--azul); color: #fff; }
.post .cab span { font: 500 9px/1.7 var(--f); letter-spacing: .22em; text-transform: uppercase; }
.post .cab .sym { width: 30px; }
.post .foto { min-height: 150px; background: repeating-linear-gradient(135deg, #DADAD6 0 10px, #E6E6E2 10px 20px); display: grid; place-items: center; padding: 14px; text-align: center; font: 500 10px/1.4 var(--f); color: var(--dim); letter-spacing: .06em; }
.iconos { grid-column: 2 / span 2; display: flex; gap: 14px; padding: 18px; background: #fff; justify-content: center; flex-wrap: wrap; }
.iconos .app { width: 64px; }
@media (max-width: 900px) { .iconos { grid-column: auto; } .mk-cartel, .mk-rotulo { grid-row: auto; } }

/* La Línea */
.linea { display: grid; grid-template-columns: 300px 1fr; gap: 32px; align-items: center; }
@media (max-width: 760px) { .linea { grid-template-columns: 1fr; } }
.linea .lineas { position: relative; max-width: 300px; }
.linea .lineas .cruz { position: absolute; inset: 0; }
.linea h2 { font-size: clamp(24px, 3vw, 34px); font-weight: 800; letter-spacing: -.03em; line-height: 1.05; }
.linea p { color: #333; max-width: 60ch; margin-top: 12px; }
.linea ul { margin: 14px 0 0; padding-left: 18px; color: #333; display: grid; gap: 6px; }
</style>

<div class="wrap">
  <div class="fila f1">
    <section class="panel concepto">
      <div>
        <span class="eti" style="color:var(--dim)">Concepto de marca</span>
        <h1 style="margin-top:14px">Trama<br>variable</h1>
        <p class="lema">Una identidad que reordena sus piezas.</p>
        <p class="txt">Un sistema de módulos geométricos que se adaptan, se mueven y se reorganizan según el contexto. Trama variable es una identidad flexible para un estudio creativo de La Línea, pensada para conectar ideas, formatos y audiencias a través de una misma estructura reconocible.</p>
      </div>
      <div class="atributos"><ul><li>ADAPTABLE</li><li>ESTRUCTURADA</li><li>EN MOVIMIENTO</li><li>CONECTADA</li><li>CONTEMPORÁNEA</li></ul></div>
    </section>
    <section class="panel p-logo">
      <div class="panel-cab"><span class="eti">Logo principal</span><span class="num">01</span></div>
      ${L.logoPrincipal(c)}
    </section>
    <section class="panel p-sim">
      <div class="panel-cab"><span class="eti">Símbolo / icono</span><span class="num">02</span></div>
      ${L.simbolo(A, K)}
    </section>
  </div>

  <div class="fila f2">
    <section class="panel" style="padding-inline:0">
      <div class="panel-cab"><span class="eti">Sistema modular</span><span class="num">03</span></div>
      <div class="sistema">
        <div>
          <div class="mods">${modulosBasicos}</div>
          <div class="leyenda"><span>Módulos básicos</span><p>Cinco piezas simples que, al combinarse, forman un sistema visual flexible y reconocible en infinitas configuraciones.</p></div>
        </div>
        <div>
          <div class="vars">${variaciones}</div>
          <div class="vars-pie"><span>Variaciones del sistema</span></div>
        </div>
      </div>
      <div class="viva">
        <svg class="sym" viewBox="0 0 214 214" role="img" aria-label="Trama reordenable"><g id="trama-viva">${vivaInicial}</g></svg>
        <div><p>La trama nunca es fija: cada pieza, campaña o formato puede reordenar los módulos sin perder la marca. Prueba a reordenarla.</p><button id="btn-reordenar" type="button" style="margin-top:14px">Reordenar</button></div>
      </div>
    </section>
  </div>

  <div class="fila">
    <section class="panel" style="padding-inline:0">
      <div class="panel-cab"><span class="eti">Submarcas / aplicaciones de servicio</span><span class="num">04</span></div>
      <div class="subs">${submarcas}</div>
    </section>
  </div>

  <div class="fila f4">
    <section class="panel" style="padding-left:0">
      <div class="panel-cab"><span class="eti">Paleta de color</span><span class="num">05</span></div>
      <div class="paleta">
        <div><i style="background:${K}"></i>Negro<code>${K}</code></div>
        <div><i style="background:${A}"></i>Azul eléctrico<code>${A}</code></div>
        <div><i style="background:${Li}"></i>Lima neón<code>${Li}</code></div>
        <div><i style="background:${W};border:1px solid var(--filete)"></i>Blanco<code>${W}</code></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-cab"><span class="eti">Tipografía</span><span class="num">06</span></div>
      <div class="tipo">
        <div class="nom">${L.svg([0, 0, L.nombreDos(44, K).w, L.nombreDos(44, K).h], L.nombreDos(44, K).draw(0, 0), 'hor')}</div>
        <div><p>Una identidad flexible para territorio, cultura, creatividad y conexiones.</p><small>Montserrat Light y Bold, muy espaciadas. Logotipo trazado.</small></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-cab"><span class="eti">Versiones</span><span class="num">07</span></div>
      <div class="versiones">
        <div class="lista">${L.logoHorizontal(c)}${L.logoApilado(c)}</div>
        ${L.appIcono(K, A, W)}
      </div>
      <div class="mono-fila">
        <div style="background:#fff;border:1px solid var(--filete)">${L.logoHorizontal({ A: K, K, T: K })}</div>
        <div style="background:${K}">${L.logoHorizontal({ A: W, K: W, T: W })}</div>
      </div>
    </section>
  </div>

  <div class="fila">
    <section class="panel" style="padding-inline:0">
      <div class="panel-cab"><span class="eti">Aplicaciones</span><span class="num">08</span></div>
      <div class="apps">
        <div class="mk mk-cartel">
          <div class="cartel">
            <div class="top"><b>Ideas que se reordenan para llegar más lejos.</b><div style="width:70px">${L.logoApilado({ A: K, K, T: K }).replace(/<path[^>]*fill="#0B0B0B"[^>]*\/>/, (m) => m)}</div></div>
            <div class="gran">${L.trama(L.principalFilas(A, K)).svg}</div>
            <div class="pie"><span>Territorio<br>Cultura<br>Creatividad<br>Conexiones</span><span style="text-align:right">La Línea<br>Spain</span></div>
          </div>
        </div>
        <div class="mk mk-papel">
          <div style="display:grid;gap:12px">
            <div class="tarjeta" style="background:#fff">${L.logoApilado(c)}<span style="text-align:right">Territorio · cultura<br>creatividad · conexiones</span></div>
            <div class="tarjeta" style="background:${K}">${L.logoHorizontal({ A, K: W, T: W })}</div>
          </div>
          <div class="bolsa">${L.trama(L.principalFilas(A, K)).svg}</div>
        </div>
        <div class="mk mk-rotulo">
          <div class="rotulo">${L.trama([[['r', 0, A], ['s', 0, W]], [['r', 270, W], ['d', 0, A]]]).svg}<div class="nm">${L.svg([0, 0, L.nombreLinea(30, W).w, 32], L.nombreLinea(30, W).draw(0, 31), 'hor')}</div></div>
        </div>
        <div class="mk mk-movil">
          <div class="movil">
            <div class="barra"><div style="width:74px">${L.logoApilado(c)}</div><span style="font-size:14px">≡</span></div>
            <b>Contenido que se adapta a tu próximo movimiento.</b>
            <p>Estrategia, diseño y desarrollo para marcas en constante evolución.</p>
            <span class="cta">Hablemos →</span>
            <div class="deco">${L.trama([[null, ['q', 0, A]], [['q', 0, K], ['s', 0, A]]]).svg}</div>
          </div>
          <div class="post">
            <div class="cab"><span>Territorio<br>Cultura<br>Creatividad<br>Conexiones</span>${L.simbolo(W, W)}</div>
            <div class="foto">Aquí va una foto real<br>del Peñón desde La Línea</div>
          </div>
        </div>
        <div class="iconos">
          ${L.appIcono(A, W, W)}${L.appIcono(W, A, K)}${L.appIcono(K, Li, Li)}${L.appIcono(Li, K, K)}
        </div>
      </div>
    </section>
  </div>

  <div class="fila">
    <section class="panel linea" style="padding-inline:0">
      <div class="lineas">
        ${L.trama(L.simboloFilas(A, K)).svg}
      </div>
      <div>
        <span class="eti" style="color:var(--azul)">Vínculo con La Línea</span>
        <h2 style="margin-top:10px">La línea es el hueco entre las piezas.</h2>
        <p>Los módulos nunca se tocan: siempre los separa la misma línea fina, que en el símbolo forma una cruz. Esa línea es la que da nombre a la ciudad y la que organiza todo el sistema.</p>
        <ul>
          <li><b>Frontera y cruce:</b> las dos líneas del símbolo separan cuatro piezas y a la vez las mantienen unidas, como un paso.</li>
          <li><b>Territorios que se reordenan:</b> cada pieza es un territorio distinto (ciudad, mar, roca, medios) que cambia de lugar sin romper la trama.</li>
          <li><b>La S de Studio:</b> las curvas de las piezas dibujan una S; en el logo principal, la S completa en tres filas.</li>
        </ul>
      </div>
    </section>
  </div>
</div>
<script>${clienteJS}</script>
`;
fs.writeFileSync(out, html);

// Archivos para el repositorio
fs.mkdirSync(svgDir, { recursive: true });
const solo = (s, bg) => {
  const vb = s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const inner = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const pad = bg ? Math.max(vb[2], vb[3]) * 0.12 : 0;
  const v = [vb[0] - pad, vb[1] - pad, vb[2] + 2 * pad, vb[3] + 2 * pad].map((x) => +x.toFixed(2));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(' ')}">` + (bg ? `<rect x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}" fill="${bg}"/>` : '') + inner + '</svg>';
};
const F = {
  'logo-principal.svg': solo(L.logoPrincipal(c)),
  'logo-principal-negativo.svg': solo(L.logoPrincipal({ A, K: W, T: W }), K),
  'simbolo.svg': solo(L.simbolo(A, K)),
  'simbolo-negro.svg': solo(L.simbolo(K, K)),
  'simbolo-blanco.svg': solo(L.simbolo(W, W)),
  'horizontal.svg': solo(L.logoHorizontal(c)),
  'horizontal-negro.svg': solo(L.logoHorizontal({ A: K, K, T: K })),
  'horizontal-negativo.svg': solo(L.logoHorizontal({ A, K: W, T: W }), K),
  'apilado.svg': solo(L.logoApilado(c)),
  'app-negro.svg': solo(L.appIcono(K, A, W)),
  'app-azul.svg': solo(L.appIcono(A, W, W)),
  'app-blanco.svg': solo(L.appIcono(W, A, K)),
  'app-lima.svg': solo(L.appIcono(Li, K, K)),
};
L.SUBMARCAS.forEach((s) => { F[`submarca-${s.n.toLowerCase()}.svg`] = solo(L.trama(s.f(s.lima ? Li : A, K)).svg); });
for (const [n, s] of Object.entries(F)) fs.writeFileSync(`${svgDir}/${n}`, s);
console.log('ok', html.length, Object.keys(F).length, 'svg');
