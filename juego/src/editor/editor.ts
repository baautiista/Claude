import * as THREE from "three";
import type { Mundo } from "../mundo/mundo";
import { aplicar, type Correccion, type Efectivo, type EdificioCiudad } from "../mundo/ciudad/tipos";
import { INDICE } from "../mundo/ciudad/teselas";
import { borrarCorreccion, correccionDe, dondeSeGuarda, exportarCorrecciones, guardarCorreccion } from "../mundo/ciudad/correcciones";

/**
 * Editor de ciudad (?editor=1). Revisión de la ciudad generada:
 *  - contornos por estado (verde: datos fiables; amarillo: algo estimado; rojo: errores),
 *  - lista de pendientes (primero los rojos) y ficha de cada edificio con sus fuentes y confianza,
 *  - correcciones guardadas en el backend (servidor de Mi Línea o base de datos del artifact),
 *    en el fichero del repositorio en desarrollo y como respaldo en el navegador; exportables.
 * Los datos generados nunca se modifican: las correcciones son una capa aparte.
 */

const OPCIONES: Record<string, [string, string][]> = {
  tipologia: [["atunara", "Casa de La Atunara"], ["casa_baja", "Casa de una planta"], ["casa_dos", "Casa de dos plantas"], ["medianeras", "Entre medianeras"], ["burguesa", "Burguesa"], ["comercial", "Comercial del Centro"], ["bloque", "Bloque"], ["singular", "Singular (pendiente de modelo)"], ["anexo", "Anexo / patio"]],
  revestimiento: [["encalado", "Encalado"], ["revoco", "Revoco de color"], ["ladrillo", "Ladrillo visto"], ["ceramico", "Gresite / cerámico"], ["piedra_pb", "Aplacado de piedra en planta baja"]],
  ventanas: [["auto", "Según tipología"], ["persiana", "Con persiana"], ["recercado", "Con recercado"], ["arco", "En arco"], ["sencilla", "Sencilla"]],
  balcones: [["auto", "Según tipología"], ["ninguno", "Ninguno"], ["forja", "Forja"], ["corrido", "Corridos"], ["cierro", "Cierros"]],
  cubierta: [["azotea", "Azotea"], ["dos_aguas", "Tejado a dos aguas"], ["cuatro_aguas", "Tejado a cuatro aguas"], ["tejadillo", "Azotea con faldón a la calle"]],
  pb: [["vivienda", "Vivienda"], ["comercio", "Comercio"], ["portal", "Portal"]],
  modelo: [["generado", "Generado"], ["oculto", "Oculto (pendiente de modelo propio)"]],
  revision: [["pendiente", "Pendiente"], ["correcto", "Revisado: correcto"]],
};
const COLOR_ESTADO = { verde: "#2E9E4F", amarillo: "#E6B800", rojo: "#E5243B" } as const;

export function iniciarEditor(mundo: Mundo, raiz: HTMLElement) {
  document.body.classList.add("modo-editor");
  let sel: Efectivo | null = null;
  let filtro: "rojo" | "amarillo" | "verde" | "todos" = "rojo";
  let verEstados = true;
  const contorno = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#C4E910", depthTest: false }));
  contorno.renderOrder = 99;
  const estados = new THREE.Group();
  const panel = document.createElement("aside");
  panel.className = "editor-ciudad";
  raiz.append(panel);
  const { cx, cy, suelo } = mundo.origenMapa;

  // Encuadre inicial: centro de las teselas generadas.
  const bbs = Object.values(INDICE.teselas).map((t) => t.bbox);
  if (bbs.length) mundo.enfocarMapa((Math.min(...bbs.map((b) => b[0])) + Math.max(...bbs.map((b) => b[2]))) / 2, (Math.min(...bbs.map((b) => b[1])) + Math.max(...bbs.map((b) => b[3]))) / 2, 160);

  const efectivos = () => mundo.ciudad.cargados().map((e) => aplicar(e, correccionDe(e.id)));

  function dibujarEstados() {
    mundo.ayudaEditor(estados, false);
    estados.children.forEach((c) => (c as THREE.LineLoop).geometry.dispose());
    estados.clear();
    if (!verEstados) return;
    for (const e of efectivos()) {
      const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(e.huella.map(([x, y]) => new THREE.Vector3(x - cx, suelo + e.alturaM + 0.6, y - cy))), new THREE.LineBasicMaterial({ color: COLOR_ESTADO[e.estado], depthTest: false }));
      l.renderOrder = 98;
      estados.add(l);
    }
    mundo.ayudaEditor(estados, true);
  }

  function marcar(e: Efectivo | null) {
    mundo.ayudaEditor(contorno, false);
    if (!e) return;
    contorno.geometry.setFromPoints(e.huella.map(([x, y]) => new THREE.Vector3(x - cx, suelo + e.alturaM + 1.4, y - cy)));
    mundo.ayudaEditor(contorno, true);
  }

  function pintar(aviso = "") {
    const lista = efectivos();
    sel = sel ? lista.find((e) => e.id === sel!.id) ?? null : null;
    marcar(sel);
    const n = { verde: 0, amarillo: 0, rojo: 0 };
    for (const e of lista) n[e.estado]++;
    const vista = lista.filter((e) => filtro === "todos" || e.estado === filtro).slice(0, 300);
    const corr = sel ? correccionDe(sel.id) ?? {} : {};
    const campo = (k: string, valor: string) => `<label>${k}<select data-k="${k}">${OPCIONES[k].map(([v, t]) => `<option value="${v}" ${v === valor ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
    const conf = (c: string) => `<i class="conf ${c}">${c}</i>`;
    panel.innerHTML = `
      <header><strong>Editor de ciudad</strong><span>${Object.keys(INDICE.teselas).length} teselas</span></header>
      <p class="ed-sub">Cargados: ${lista.length} edificios · se guarda en: <b>${dondeSeGuarda()}</b></p>
      <div class="ed-estados">
        ${(["rojo", "amarillo", "verde", "todos"] as const).map((k) => `<button data-f="${k}" class="${filtro === k ? "act" : ""} ${k}">${k === "todos" ? "Todos" : k.toUpperCase()} ${k === "todos" ? lista.length : n[k]}</button>`).join("")}
        <label class="ed-check"><input type="checkbox" data-a="estados" ${verEstados ? "checked" : ""}> contornos</label>
      </div>
      <ol class="ed-lista">${vista.map((e) => `<li data-id="${e.id}" class="${e.id === sel?.id ? "sel" : ""}"><span class="punto ${e.estado}"></span><b>${e.nombre ?? e.tipologia}</b> · ${e.plantas}P · ${e.barrio}${e.corregido.length ? " ✎" : ""}${e.revision === "correcto" ? " ✓" : ""}</li>`).join("") || "<li>Nada en este filtro.</li>"}</ol>
      ${sel ? `
      <section class="ed-ficha">
        <h3><span class="punto ${sel.estado}"></span>${sel.nombre ?? sel.id}</h3>
        <p class="ed-sub">${sel.id} · ${sel.barrio} · ${sel.area} m² · frente ${sel.frente} m · nivel ${sel.nivel}<br>
        Huella: ${sel.fuentes.huella} ${conf(sel.confianza.huella)}<br>
        Plantas: ${sel.fuentes.plantas} ${conf(sel.confianza.plantas)}<br>
        Altura: ${sel.fuentes.altura} ${conf(sel.confianza.altura)}<br>
        Cubierta ${conf(sel.confianza.cubierta)} · Tipología ${conf(sel.confianza.tipologia)}</p>
        ${sel.motivos.length ? `<ul class="ed-avisos">${sel.motivos.map((a) => `<li>${a}</li>`).join("")}</ul>` : ""}
        ${sel.reparado.length ? `<ul class="ed-reparado">${sel.reparado.map((a) => `<li>Reparado: ${a}</li>`).join("")}</ul>` : ""}
        <label>plantas<input type="number" min="1" max="40" data-k="plantas" value="${sel.plantas}"></label>
        <label>altura (m)<input type="number" min="3" max="150" step="0.1" data-k="alturaM" value="${sel.alturaM}"></label>
        <label>color<input type="color" data-k="color" value="${sel.color}"></label>
        ${campo("tipologia", sel.tipologia)}${campo("revestimiento", sel.revestimiento)}${campo("ventanas", sel.ventanas)}
        ${campo("balcones", sel.balcones)}${campo("cubierta", sel.cubierta)}${campo("pb", sel.pb)}
        ${campo("modelo", sel.modelo)}${campo("revision", sel.revision)}
        <label>nota<input type="text" data-k="nota" value="${String(corr.nota ?? "").replace(/"/g, "&quot;")}"></label>
        <div class="ed-botones"><button data-a="restablecer">Restablecer datos generados</button></div>
      </section>` : `<p class="ed-sub">Toca un edificio o elígelo en la lista.</p>`}
      <div class="ed-botones"><button data-a="exportar">Exportar correcciones (JSON)</button></div>
      <p class="ed-aviso">${aviso}</p>`;
  }

  async function cambiar(k: string, v: string) {
    if (!sel) return;
    const valor: unknown = k === "plantas" ? Math.max(1, Math.round(Number(v))) : k === "alturaM" ? Number(v) : v;
    const cambios = { [k]: valor } as Correccion;
    if (k === "plantas") cambios.alturaM = Math.round((3.6 + (Number(valor) - 1) * 3.0) * 10) / 10;
    const donde = await guardarCorreccion(sel.id, cambios);
    setTimeout(dibujarEstados, 300);
    pintar(`Guardado en: ${donde}`);
  }
  const seleccionar = (e: EdificioCiudad | null) => {
    sel = e ? aplicar(e, correccionDe(e.id)) : null;
    pintar();
  };

  panel.addEventListener("change", (ev) => {
    const t = ev.target as HTMLInputElement;
    if (t.dataset.a === "estados") {
      verEstados = t.checked;
      return dibujarEstados();
    }
    if (t.dataset.k) void cambiar(t.dataset.k, t.value);
  });
  panel.addEventListener("click", async (ev) => {
    const t = ev.target as HTMLElement;
    const li = t.closest("li[data-id]") as HTMLElement | null;
    if (li) {
      const e = mundo.ciudad.cargados().find((q) => q.id === li.dataset.id) ?? null;
      seleccionar(e);
      if (e) mundo.enfocarMapa(e.huella[0][0], e.huella[0][1], 70);
      return;
    }
    if (t.dataset.f) {
      filtro = t.dataset.f as typeof filtro;
      return pintar();
    }
    if (t.dataset.a === "restablecer" && sel) {
      await borrarCorreccion(sel.id);
      setTimeout(dibujarEstados, 300);
      return pintar("Corrección eliminada");
    }
    if (t.dataset.a === "exportar") pintar(`Correcciones ${await exportarCorrecciones()}`);
  });
  mundo.editorCiudad = (x, y) => seleccionar(mundo.ciudad.edificioEn(x, y));
  // Al cargar teselas nuevas se refrescan lista y contornos.
  let previos = -1;
  setInterval(() => {
    const n = mundo.ciudad.cargados().length;
    if (n !== previos) {
      previos = n;
      dibujarEstados();
      pintar();
    }
  }, 1500);
  pintar();
  Object.assign(window, { __editor: { seleccionar: (id: string) => seleccionar(mundo.ciudad.cargados().find((e) => e.id === id) ?? null), cambiar } });
}
