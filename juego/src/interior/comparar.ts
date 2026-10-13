import "../red/conexion";
import { crearInterior, unidades } from "../compartido/hogar/hogar";
import { NOMBRE_ESTILO, NOMBRE_GAMA, NOMBRE_PROGRAMA, perfilDe, type Gama } from "../compartido/hogar/perfil";
import { EscenaInterior } from "./escena";

/**
 * Comparación de viviendas (?comparar=1): una económica, una media y una de gama alta
 * lado a lado, con su ficha. Con ?ids=a,b,c se eligen las viviendas; ?hora=21 enciende las luces.
 */
export function iniciarComparacion(raiz: HTMLElement) {
  document.body.classList.add("modo-comparar");
  const q = new URLSearchParams(location.search);
  const us = unidades();
  const ids = (q.get("ids") ?? "").split(",").filter(Boolean);
  const elegir = (g: Gama, min: number) => us.filter((u) => perfilDe(u).gama === g && u.superficie >= min).sort((a, b) => a.superficie - b.superficie)[0];
  const lista = ids.length ? ids.map((id) => us.find((u) => u.id === id)!).filter(Boolean) : [elegir("economica", 60), elegir("media", 85), elegir("alta", 120)];
  const hora = Number(q.get("hora") ?? 12);
  const caja = document.createElement("div");
  caja.className = "comparar";
  raiz.replaceChildren(caja);
  const escenas: EscenaInterior[] = [];
  for (const u of lista) {
    const doc = crearInterior(u);
    // Por defecto se compara el diseño: sin suciedad ni desperfectos (con ?real=1, tal cual).
    if (!q.has("real")) {
      doc.manchas = [];
      doc.basura = [];
      doc.grietas = [];
      for (const k of Object.keys(doc.pinturaVieja)) doc.pinturaVieja[k] = false;
      for (const k of Object.keys(doc.sueloRoto)) doc.sueloRoto[k] = false;
      for (const m of doc.muebles) m.roto = false;
      doc.electricidad.resuelto = true;
    }
    const p = doc.perfil!;
    const col = document.createElement("section");
    col.className = `comparar-col gama-${p.gama}`;
    const marco = document.createElement("div");
    marco.className = "comparar-marco";
    const ficha = document.createElement("header");
    ficha.innerHTML = `<span class="etiqueta">${NOMBRE_GAMA[p.gama].toUpperCase()}</span><b>${u.precio.toLocaleString("es-ES")} €</b>
      <small>${NOMBRE_PROGRAMA[p.programa]} · ${u.superficie} m² · ${NOMBRE_ESTILO[p.estilo]}</small>
      <small>${p.dormitorios} dorm. · ${p.banos} baño${p.banos > 1 ? "s" : ""} · techo ${doc.plano.techo} m · ${p.pasillo === 2 ? "galería" : p.pasillo ? "pasillo" : "sin pasillo"}</small>`;
    col.append(ficha, marco);
    caja.append(col);
    const esc = new EscenaInterior(marco);
    esc.plantaBaja = u.tipo === "casa" || u.planta === 0;
    esc.cargar({ ...doc, estado: 100 });
    esc.tabiques = Number(q.get("tabiques") ?? 0.32);
    esc.aplicarHora(hora);
    esc.jugador.visible = false;
    esc.inclinacion = Number(q.get("inclinacion") ?? 0.95);
    if (q.has("yaw")) esc.orientar(Number(q.get("yaw")));
    const tipo = q.get("hab");
    const hab = tipo ? doc.plano.habitaciones.filter((h) => h.tipo === tipo).sort((a, b) => Number(!!b.principal) - Number(!!a.principal))[0] : null;
    if (hab) esc.enfocarHabitacion(hab, Number(q.get("cerca") ?? 1.45));
    else esc.verCasaEntera();
    escenas.push(esc);
  }
  Object.assign(window, { __comparar: escenas });
}
