"""Página para el móvil con las secciones de la ciudad (city-reconstruction/secciones/secciones.html)."""
import json
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
d = json.load(open(os.path.join(RAIZ, "city-reconstruction/secciones/secciones.json")))
tramos = json.load(open(os.path.join(RAIZ, "city-reconstruction/calles/tramos.json")))
secs = [{k: s[k] for k in ("id", "barrio", "caja", "calles", "edificios", "comercios", "estado", "hechos", "orden")} for s in d["secciones"]]
lineas = []
for t in tramos:
    if t["grupo"] in ("calle", "peatonal") and t["clase"] <= 3:
        e = t["eje"]
        pts = [e[0]] + [p for i, p in enumerate(e[1:-1]) if i % 2 == 0] + [e[-1]]
        lineas.append([round(v) for p in pts for v in p])
xs = [s["caja"][0] for s in secs] + [s["caja"][2] for s in secs]
ys = [s["caja"][1] for s in secs] + [s["caja"][3] for s in secs]
caja = [min(xs) - 40, min(ys) - 40, max(xs) + 40, max(ys) + 40]
DATOS = json.dumps({"secciones": secs, "lineas": lineas, "caja": caja}, ensure_ascii=False, separators=(",", ":"))

HTML = r"""<title>Secciones de La Línea</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600&display=swap">
<style>
/* Ficha de campo: mapa arriba, sección elegida y lista por barrio. Azul InfoLinense de fondo en la cabecera. */
:root {
  --azul: #1F5EFF; --lima: #C4E910; --rosa: #FF1254;
  --bg: #F3F5FA; --tarjeta: #FFFFFF; --texto: #121722; --suave: #5A6375; --borde: #DDE2EC;
  --tierra: #E4E9F3; --calle: #B9C3D6; --pend: #CBD3E2; --parcial: #C4E910; --fotos: #FFB547; --hecha: #1F5EFF;
  --f-titulo: "Poppins", "Arial Black", system-ui, sans-serif; --f-texto: "Inter", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0D1220; --tarjeta: #151C2E; --texto: #EEF1F7; --suave: #9AA4B8; --borde: #263049; --tierra: #1A2236; --calle: #33405C; --pend: #3A4560; color-scheme: dark } }
:root[data-theme="dark"] { --bg: #0D1220; --tarjeta: #151C2E; --texto: #EEF1F7; --suave: #9AA4B8; --borde: #263049; --tierra: #1A2236; --calle: #33405C; --pend: #3A4560; color-scheme: dark }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--texto); font: 15px/1.5 var(--f-texto); }
.envoltura { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); max-width: 980px; margin: 0 auto; }
header { background: var(--azul); color: #fff; }
header .envoltura { padding-block: 22px 20px; }
.etiqueta { display: inline-block; font: 700 11px var(--f-titulo); letter-spacing: .12em; background: #fff; color: var(--azul); padding: 3px 8px; border-radius: 4px; }
h1 { font: 800 clamp(26px, 6vw, 40px)/1.05 var(--f-titulo); margin: 10px 0 6px; text-wrap: balance; }
header p { margin: 0; max-width: 60ch; opacity: .92; }
.cifras { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 14px; font-variant-numeric: tabular-nums; }
.cifras b { display: block; font: 800 26px var(--f-titulo); color: var(--lima); }
.cifras span { font-size: 12px; opacity: .85; }
main { display: grid; gap: 18px; padding-block: 18px 40px; }
section.bloque { background: var(--tarjeta); border: 1px solid var(--borde); border-radius: 12px; padding: 16px; min-width: 0; }
h2 { font: 700 18px var(--f-titulo); margin: 0 0 10px; }
.mapa { width: 100%; aspect-ratio: 1 / 1; max-height: 70vh; display: block; background: var(--tierra); border-radius: 10px; touch-action: manipulation; }
.leyenda { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--suave); margin-top: 8px; }
.leyenda i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -2px; margin-right: 5px; }
.elegida { display: grid; gap: 8px; }
.elegida .cab { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.elegida .cod { font: 800 30px var(--f-titulo); color: var(--azul); }
.chip { display: inline-block; font: 600 12px var(--f-texto); padding: 2px 9px; border-radius: 999px; background: var(--pend); color: var(--texto); }
.chip.parcial { background: var(--parcial); color: #1b2200; }
.chip.fotos { background: var(--fotos); color: #2b1800; }
.chip.modelada { background: var(--hecha); color: #fff; }
.calles { display: flex; flex-wrap: wrap; gap: 6px; }
.calles span { background: var(--bg); border: 1px solid var(--borde); border-radius: 6px; padding: 2px 8px; font-size: 13px; }
ol.pasos { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
ol.pasos b { font-weight: 600; }
.filtros { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.filtros button { font: 600 13px var(--f-texto); border: 1px solid var(--borde); background: var(--tarjeta); color: var(--texto); border-radius: 999px; padding: 4px 11px; cursor: pointer; }
.filtros button[aria-pressed="true"] { background: var(--azul); color: #fff; border-color: var(--azul); }
.lista { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.sec { text-align: left; font: inherit; color: inherit; background: var(--tarjeta); border: 1px solid var(--borde); border-radius: 10px; padding: 10px 12px; cursor: pointer; display: grid; gap: 4px; min-width: 0; }
.sec:hover, .sec:focus-visible { border-color: var(--azul); outline: none; }
.sec .fila { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.sec b { font: 700 16px var(--f-titulo); }
.sec small { color: var(--suave); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.numeros { font-size: 12px; color: var(--suave); font-variant-numeric: tabular-nums; }
.copiar { font: 600 13px var(--f-texto); border: 0; background: var(--azul); color: #fff; border-radius: 8px; padding: 7px 12px; cursor: pointer; justify-self: start; }
@media (prefers-reduced-motion: no-preference) { .sec { transition: border-color .15s; } }
</style>

<header><div class="envoltura">
  <span class="etiqueta">CIUDAD · RECONSTRUCCIÓN</span>
  <h1>Secciones de La Línea</h1>
  <p>La ciudad dividida en zonas de unas pocas manzanas para fotografiarlas a pie. Elige una sección, haz las fotos de la lista y súbelas al chat con su código: con ellas modelo los edificios, comercios, carteles, aceras y mobiliario tal y como son.</p>
  <div class="cifras" id="cifras"></div>
</div></header>

<main class="envoltura">
  <section class="bloque">
    <h2>Mapa</h2>
    <svg class="mapa" id="mapa" role="img" aria-label="Mapa de secciones de La Línea"></svg>
    <div class="leyenda">
      <span><i style="background:var(--pend)"></i>Pendiente</span>
      <span><i style="background:var(--parcial)"></i>Algún edificio hecho</span>
      <span><i style="background:var(--fotos)"></i>Fotos recibidas</span>
      <span><i style="background:var(--hecha)"></i>Modelada</span>
    </div>
  </section>

  <section class="bloque elegida" id="elegida" aria-live="polite"></section>

  <section class="bloque">
    <h2>Qué fotografiar en cada sección</h2>
    <ol class="pasos">
      <li><b>Cada fachada entera</b>, de frente y desde la acera de enfrente, con la planta baja y el tejado a la vista. Si no cabe, en dos fotos que se solapen.</li>
      <li><b>Las esquinas</b> en diagonal, para ver las dos fachadas a la vez.</li>
      <li><b>Comercios de cerca</b>: rótulo, escaparate, toldo y puerta (se ve el nombre y los colores).</li>
      <li><b>Placas de calle</b> y números de portal.</li>
      <li><b>Aceras y suelo</b>: tipo de baldosa o adoquín, bordillos, alcorques y pasos de peatones.</li>
      <li><b>Mobiliario</b>: farolas, bancos, papeleras, bolardos, maceteros, paradas de autobús y señales.</li>
      <li>Al subirlas, escribe el <b>código de la sección</b> (p. ej. CEN-01) y, si puedes, la calle de cada foto.</li>
    </ol>
  </section>

  <section class="bloque">
    <h2>Todas las secciones</h2>
    <div class="filtros" id="filtros"></div>
    <div class="lista" id="lista"></div>
  </section>
</main>

<script>
const D = __DATOS__;
const ESTADO = { pendiente: "Pendiente", parcial: "Algún edificio hecho", fotos: "Fotos recibidas", modelada: "Modelada" };
const color = { pendiente: "var(--pend)", parcial: "var(--parcial)", fotos: "var(--fotos)", modelada: "var(--hecha)" };
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const secs = D.secciones;
const total = secs.reduce((a, s) => a + s.edificios, 0);
$("#cifras").innerHTML = [[secs.length, "secciones"], [new Set(secs.map((s) => s.barrio)).size, "barrios"], [total.toLocaleString("es-ES"), "edificios"], [secs.filter((s) => s.estado === "modelada").length, "modeladas"]]
  .map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`).join("");

// Mapa: calles principales y cajas de sección (coordenadas del juego: x al este, y al sur).
const [x0, y0, x1, y1] = D.caja;
const W = x1 - x0, H = y1 - y0;
const svg = $("#mapa");
svg.setAttribute("viewBox", `${x0} ${y0} ${W} ${H}`);
svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
const NS = "http://www.w3.org/2000/svg";
const g1 = document.createElementNS(NS, "g");
for (const l of D.lineas) {
  const p = document.createElementNS(NS, "polyline");
  let pts = "";
  for (let i = 0; i < l.length; i += 2) pts += `${l[i]},${l[i + 1]} `;
  p.setAttribute("points", pts);
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", "var(--calle)");
  p.setAttribute("stroke-width", Math.max(W, H) / 700);
  g1.append(p);
}
svg.append(g1);
const rects = new Map();
for (const s of secs) {
  const [a, b, c, d] = s.caja;
  const r = document.createElementNS(NS, "rect");
  Object.entries({ x: a, y: b, width: c - a, height: d - b, rx: 6, fill: color[s.estado], "fill-opacity": 0.7, stroke: "var(--tarjeta)", "stroke-width": Math.max(W, H) / 900, tabindex: 0 }).forEach(([k, v]) => r.setAttribute(k, v));
  r.style.cursor = "pointer";
  const t = document.createElementNS(NS, "title");
  t.textContent = `${s.id} · ${s.barrio}`;
  r.append(t);
  r.addEventListener("click", () => elegir(s.id));
  r.addEventListener("keydown", (e) => e.key === "Enter" && elegir(s.id));
  svg.append(r);
  rects.set(s.id, r);
}

let actual = null;
function elegir(id) {
  const s = secs.find((x) => x.id === id);
  if (!s) return;
  if (actual) rects.get(actual).setAttribute("stroke", "var(--tarjeta)");
  actual = id;
  const r = rects.get(id);
  r.setAttribute("stroke", "var(--rosa)");
  r.parentNode.append(r);
  $("#elegida").innerHTML = `
    <div class="cab"><span class="cod">${s.id}</span><span class="chip ${s.estado}">${ESTADO[s.estado]}</span><span class="numeros">Orden ${s.orden} de ${secs.length}</span></div>
    <div><b>${esc(s.barrio)}</b> · ${s.edificios} edificios · ${s.comercios} con comercio en planta baja${s.hechos ? ` · ${s.hechos} ya modelados` : ""}</div>
    <div class="calles">${s.calles.map((c) => `<span>${esc(c)}</span>`).join("") || "<span>Sin calles con nombre</span>"}</div>
    <button class="copiar" id="copiar">Copiar código ${s.id}</button>`;
  $("#copiar").onclick = async () => {
    try { await navigator.clipboard.writeText(s.id); $("#copiar").textContent = "Código copiado"; }
    catch { $("#copiar").textContent = s.id; }
  };
  try { localStorage.setItem("seccion", id); } catch {}
}

// Lista con filtro por barrio.
const barrios = ["Todos", ...new Set(secs.map((s) => s.barrio))];
let filtro = "Todos";
function pintarLista() {
  $("#filtros").innerHTML = barrios.map((b) => `<button aria-pressed="${b === filtro}" data-b="${esc(b)}">${esc(b)}</button>`).join("");
  document.querySelectorAll("#filtros button").forEach((b) => (b.onclick = () => { filtro = b.dataset.b; pintarLista(); }));
  $("#lista").innerHTML = secs.filter((s) => filtro === "Todos" || s.barrio === filtro).map((s) => `
    <button class="sec" data-id="${s.id}">
      <span class="fila"><b>${s.id}</b><span class="chip ${s.estado}">${ESTADO[s.estado]}</span></span>
      <small>${esc(s.calles.slice(0, 3).join(" · ") || s.barrio)}</small>
      <span class="numeros">${s.edificios} edificios · ${s.comercios} comercios</span>
    </button>`).join("");
  document.querySelectorAll(".sec").forEach((b) => (b.onclick = () => { elegir(b.dataset.id); $("#elegida").scrollIntoView({ behavior: "smooth", block: "start" }); }));
}
pintarLista();
let inicial = secs[0].id;
try { inicial = localStorage.getItem("seccion") || inicial; } catch {}
elegir(inicial);
</script>
"""
open(os.path.join(RAIZ, "city-reconstruction/secciones/secciones.html"), "w").write(HTML.replace("__DATOS__", DATOS))
print(round(os.path.getsize(os.path.join(RAIZ, "city-reconstruction/secciones/secciones.html")) / 1024), "KB")
