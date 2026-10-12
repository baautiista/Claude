import * as THREE from "three";
import type { Mundo } from "../mundo/mundo";
import { aplicarCorrecciones, edificioEn, type Correccion, type Efectivo, type SectorDatos } from "../mundo/sectores/generador";
import { SECTORES, borrarCorreccion, correccionesDe, exportarCorrecciones, guardarCorreccion } from "../mundo/sectores/registro";

/**
 * Editor de ciudad (?editor=1): revisar los sectores generados edificio a edificio.
 * Tocar un edificio lo selecciona; los cambios se guardan como corrección en una capa
 * aparte (src/datos/correcciones/<sector>.json en desarrollo; este navegador si no hay
 * servidor) y se aplican al momento. Los datos descargados no se modifican nunca.
 */

const OPCIONES: Record<string, [string, string][]> = {
  tipologia: [["casa_baja", "Casa de una planta"], ["casa_dos", "Casa de dos plantas"], ["burguesa", "Casa burguesa"], ["bloque", "Bloque"], ["anexo", "Anexo / patio"]],
  material: [["revoco", "Revoco de color"], ["encalado", "Encalado"], ["ladrillo", "Ladrillo visto"]],
  ventanas: [["auto", "Según tipología"], ["persiana", "Con persiana"], ["recercado", "Con recercado"], ["arco", "En arco"], ["sencilla", "Sencilla"]],
  balcones: [["auto", "Según tipología"], ["ninguno", "Ninguno"], ["forja", "Forja"], ["corrido", "Corridos"], ["cierro", "Cierros"]],
  cubierta: [["azotea", "Azotea"], ["tejado", "Tejado"]],
  pb: [["vivienda", "Vivienda"], ["comercio", "Comercio"], ["portal", "Portal"]],
  modelo: [["generado", "Generado"], ["oculto", "Oculto (pendiente de modelo propio)"]],
  estado: [["pendiente", "Pendiente de revisar"], ["correcto", "Correcto"]],
};

export function iniciarEditor(mundo: Mundo, raiz: HTMLElement) {
  if (!SECTORES.length) return;
  let sector: SectorDatos = SECTORES[0];
  let sel: Efectivo | null = null;
  const contorno = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#C4E910", depthTest: false }));
  contorno.renderOrder = 99;

  document.body.classList.add("modo-editor");
  const panel = document.createElement("aside");
  panel.className = "editor-ciudad";
  raiz.append(panel);
  const centro = (s: SectorDatos) => [s.manzana.reduce((a, p) => a + p[0], 0) / s.manzana.length, s.manzana.reduce((a, p) => a + p[1], 0) / s.manzana.length] as const;
  const [x0, y0] = centro(sector);
  mundo.enfocarMapa(x0, y0, 80);

  const efectivos = () => aplicarCorrecciones(sector, correccionesDe(sector.id));

  function marcar(e: Efectivo | null) {
    mundo.ayudaEditor(contorno, false);
    if (!e) return;
    const { cx, cy, suelo } = mundo.origenMapa;
    contorno.geometry.setFromPoints(e.huella.map(([x, y]) => new THREE.Vector3(x - cx, suelo + e.alturaM + 1.2, y - cy)));
    mundo.ayudaEditor(contorno, true);
  }

  function pintar(aviso = "") {
    const lista = efectivos();
    sel = sel ? lista.find((e) => e.id === sel!.id) ?? null : null;
    marcar(sel);
    const corr = sel ? correccionesDe(sector.id)[sel.id] ?? {} : {};
    const campo = (k: keyof Correccion & string, valor: string) =>
      `<label>${k}<select data-k="${k}">${OPCIONES[k].map(([v, t]) => `<option value="${v}" ${v === valor ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
    const revisados = lista.filter((e) => e.estado === "correcto").length;
    panel.innerHTML = `
      <header><strong>Editor de ciudad</strong><span>${sector.id}</span></header>
      <p class="ed-sub">${sector.nombre}<br>${revisados}/${lista.length} revisados · generado ${sector.generado.slice(0, 16).replace("T", " ")}</p>
      <ol class="ed-lista">${lista.map((e) => `<li data-id="${e.id}" class="${e.id === sel?.id ? "sel" : ""}"><b>${e.id.split("-").pop()}</b> ${e.nombre ?? e.tipologia} · ${e.plantas}P <i class="n${e.nivel}">${e.nivel}</i> ${e.estado === "correcto" ? "✓" : "•"}${e.corregido.length ? " ✎" : ""}</li>`).join("")}</ol>
      ${sel ? `
      <section class="ed-ficha">
        <h3>${sel.id}${sel.nombre ? ` · ${sel.nombre}` : ""}</h3>
        <p class="ed-sub">Fuente: ${sel.fuente}${sel.osm ? ` (${sel.osm})` : ""} · ${sel.area} m² · frente ${sel.frente} m · nivel ${sel.nivel}<br>
        Altura: ${sel.origenAltura}${sel.calles.filter(Boolean).length ? `<br>Calles: ${[...new Set(sel.calles.filter(Boolean))].join(", ")}` : ""}</p>
        ${sel.avisos.length ? `<ul class="ed-avisos">${sel.avisos.map((a) => `<li>${a}</li>`).join("")}</ul>` : ""}
        <label>plantas<input type="number" min="1" max="20" data-k="plantas" value="${sel.plantas}"></label>
        <label>altura (m)<input type="number" min="3" max="70" step="0.1" data-k="alturaM" value="${sel.alturaM}"></label>
        <label>color<input type="color" data-k="color" value="${sel.color}"></label>
        ${campo("tipologia", sel.tipologia)}${campo("material", sel.material)}${campo("ventanas", sel.ventanas)}
        ${campo("balcones", sel.balcones)}${campo("cubierta", sel.cubierta)}${campo("pb", sel.pb)}
        ${campo("modelo", sel.modelo)}${campo("estado", sel.estado)}
        <label>nota<input type="text" data-k="nota" value="${(corr.nota ?? "").replace(/"/g, "&quot;")}"></label>
        <div class="ed-botones"><button data-a="restablecer">Restablecer datos generados</button></div>
      </section>` : `<p class="ed-sub">Toca un edificio de la manzana para revisarlo.</p>`}
      <div class="ed-botones"><button data-a="exportar">Exportar correcciones</button></div>
      <p class="ed-aviso">${aviso}</p>`;
  }

  async function cambiar(k: string, v: string) {
    if (!sel) return;
    const valor: unknown = k === "plantas" ? Math.max(1, Math.round(Number(v))) : k === "alturaM" ? Number(v) : v;
    const cambios: Correccion = { [k]: valor } as Correccion;
    // Cambiar plantas sin tocar la altura la recalcula; cambiar la altura la fija.
    if (k === "plantas") cambios.alturaM = Math.round((3.6 + (Number(valor) - 1) * 3.0) * 10) / 10;
    const donde = await guardarCorreccion(sector.id, sel.id, cambios);
    mundo.construirSectorGenerado(sector.id);
    pintar(donde === "repositorio" ? "Guardado en src/datos/correcciones/" + sector.id + ".json" : "Guardado en este navegador (exporta para conservarlo)");
  }

  panel.addEventListener("change", (ev) => {
    const t = ev.target as HTMLInputElement;
    if (t.dataset.k) void cambiar(t.dataset.k, t.value);
  });
  panel.addEventListener("click", async (ev) => {
    const t = ev.target as HTMLElement;
    const li = t.closest("li[data-id]") as HTMLElement | null;
    if (li) {
      sel = efectivos().find((e) => e.id === li.dataset.id) ?? null;
      return pintar();
    }
    if (t.dataset.a === "restablecer" && sel) {
      await borrarCorreccion(sector.id, sel.id);
      mundo.construirSectorGenerado(sector.id);
      return pintar("Corrección eliminada");
    }
    if (t.dataset.a === "exportar") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([exportarCorrecciones(sector.id)], { type: "application/json" }));
      a.download = `${sector.id}.json`;
      a.click();
    }
  });
  mundo.editorCiudad = (x, y) => {
    for (const s of SECTORES) {
      const e = edificioEn(s, x, y);
      if (e) {
        sector = s;
        sel = efectivos().find((q) => q.id === e.id) ?? null;
        return pintar();
      }
    }
  };
  pintar();
  Object.assign(window, { __editor: { seleccionar: (id: string) => ((sel = efectivos().find((e) => e.id === id) ?? null), pintar()), cambiar } });
}
