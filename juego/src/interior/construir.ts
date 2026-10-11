import { CATEGORIAS, MUEBLES, precioCaja, precioReventa, type Categoria } from "../compartido/hogar/catalogo";
import { errorColocacion, type MuebleColocado } from "../compartido/hogar/hogar";
import { habitacionEn } from "../compartido/hogar/plano";
import { iconoSvg } from "../iconos";
import { con } from "../red/conexion";
import { h, html, poner } from "../ui/dom";
import { sonido } from "../ui/sonido";
import type { Toque } from "./escena";
import { previa } from "./modelos";
import type { Vivienda } from "./vivienda";

/**
 * Modo construcción: catálogo de Muebles Linenses con vistas previas,
 * arrastrar y soltar sobre la rejilla, girar, colores, colisiones en vivo,
 * deshacer/rehacer, guardar o vender. Cada cambio lo valida y guarda el
 * servidor al momento (autoguardado) y llega en directo a quien esté dentro.
 */

interface Paso {
  nombre: string;
  hacer: () => Promise<boolean>;
  deshacer: () => Promise<boolean>;
}

export function abrirConstruccion(v: Vivienda) {
  if (!v.puedeEditar) {
    v.j.aviso("Solo el titular y quien convive pueden mover muebles.");
    return;
  }
  const esc = v.escena;
  let inventario: Record<string, number> = {};
  let categoria: Categoria = "Salón";
  let pestana: "catalogo" | "inventario" = "catalogo";
  let paso = 1; // medias celdas por salto de rejilla
  let colocando: { tipo: string; color: string; rot: number; uid?: string } | null = null;
  let pos: { x: number; z: number } | null = null;
  let seleccion: string | null = null;
  let gastado = 0;
  const hechos: Paso[] = [];
  const deshechos: Paso[] = [];
  /** Si un mueble se retira y se vuelve a poner, cambia de uid: se sigue la pista. */
  const alias = new Map<string, string>();
  const real = (uid: string) => {
    let u = uid;
    while (alias.has(u)) u = alias.get(u)!;
    return u;
  };

  const cuerpo = v.abrirPanel("CONSTRUIR", "Muebles y decoración", () => {
    window.removeEventListener("keydown", teclas);
    esc.mostrarRejilla(0);
    if (seleccion) void con.llamar("hogarBloquear", { id: v.id, uid: seleccion, soltar: true }).catch(() => {});
  });
  const estado = h("div", { class: "construir-estado" });
  const zona = h("div", { class: "construir-zona" });
  cuerpo.append(estado, zona);
  esc.mostrarRejilla(paso);
  esc.verCasaEntera();

  const cargarInventario = async () => {
    inventario = await con.llamar<Record<string, number>>("hogarInventario").catch(() => inventario);
    pintar();
  };

  /* ── Colocación ─────────────────────────────────────────────────── */

  /** Posición ajustada a la rejilla para el punto del suelo; los de pared se pegan a la pared más cercana. */
  const ajustar = (t: Toque) => {
    if (!colocando || !t.suelo) return null;
    const def = MUEBLES[colocando.tipo];
    const doc = v.doc;
    const hx = t.suelo.x * 2;
    const hz = t.suelo.z * 2;
    let rot = colocando.rot;
    if (def.capa === "pared") {
      const hab = habitacionEn(doc.plano, Math.floor(t.suelo.x), Math.floor(t.suelo.z));
      if (!hab) return null;
      const dist = [hz - hab.z0 * 2, hab.x1 * 2 - hx, hab.z1 * 2 - hz, hx - hab.x0 * 2];
      rot = dist.indexOf(Math.min(...dist));
      colocando.rot = rot;
      const [w, d] = rot % 2 ? [def.d, def.w] : [def.w, def.d];
      let x = Math.round((hx - w / 2) / paso) * paso;
      let z = Math.round((hz - d / 2) / paso) * paso;
      if (rot === 0) z = hab.z0 * 2;
      if (rot === 2) z = hab.z1 * 2 - d;
      if (rot === 1) x = hab.x1 * 2 - w;
      if (rot === 3) x = hab.x0 * 2;
      x = Math.max(hab.x0 * 2, Math.min(hab.x1 * 2 - w, x));
      z = Math.max(hab.z0 * 2, Math.min(hab.z1 * 2 - d, z));
      return { x, z };
    }
    const [w, d] = rot % 2 ? [def.d, def.w] : [def.w, def.d];
    return { x: Math.round((hx - w / 2) / paso) * paso, z: Math.round((hz - d / 2) / paso) * paso };
  };

  const motivo = () => {
    if (!colocando || !pos) return "Mueve el puntero por la casa.";
    const m: MuebleColocado = { uid: colocando.uid ?? "_nuevo", tipo: colocando.tipo, x: pos.x, z: pos.z, rot: colocando.rot, color: colocando.color };
    return errorColocacion(v.doc, m, colocando.uid);
  };

  const actualizarFantasma = () => {
    if (!colocando || !pos) return esc.fantasma(null);
    const err = motivo();
    esc.fantasma({ ...colocando, ...pos }, !err);
    pintarEstado();
  };

  esc.herramienta = {
    capturaArrastre: false,
    bajar: (t) => {
      if (colocando) {
        esc.herramienta!.capturaArrastre = true;
        pos = ajustar(t) ?? pos;
        actualizarFantasma();
      }
    },
    mover: (t) => {
      if (!colocando) return;
      const p = ajustar(t);
      if (p && (!pos || p.x !== pos.x || p.z !== pos.z)) {
        pos = p;
        actualizarFantasma();
        v.directo({ que: "arrastre", tipo: colocando.tipo, x: p.x, z: p.z, rot: colocando.rot });
      }
    },
    subir: (t) => {
      if (colocando) {
        esc.herramienta!.capturaArrastre = false;
        pos = ajustar(t) ?? pos;
        actualizarFantasma();
        void soltar();
        return;
      }
      // Sin nada en la mano: tocar un mueble lo selecciona.
      if (t.objeto?.tipo === "mueble") void seleccionar(t.objeto.id);
      else void seleccionar(null);
    },
  };

  async function soltar() {
    if (!colocando || !pos) return;
    const err = motivo();
    if (err) {
      sonido("mal");
      v.j.aviso(err);
      return;
    }
    const c = { ...colocando };
    const p = { ...pos };
    if (c.uid) {
      // Mover un mueble existente.
      const m = v.doc.muebles.find((x) => x.uid === c.uid)!;
      const antes = { x: m.x, z: m.z, rot: m.rot };
      const uid = c.uid;
      await ejecutar({
        nombre: `Mover ${MUEBLES[c.tipo].nombre}`,
        hacer: async () => !!(await v.op("hogarMover", { uid: real(uid), x: p.x, z: p.z, rot: c.rot })),
        deshacer: async () => !!(await v.op("hogarMover", { uid: real(uid), ...antes })),
      });
      esc.ocultarMueble(null);
      colocando = null;
      esc.fantasma(null);
      void seleccionar(uid);
      return;
    }
    const enInventario = (inventario[`mueble:${c.tipo}`] ?? 0) > 0;
    let uid = "";
    const ok = await ejecutar({
      nombre: `Colocar ${MUEBLES[c.tipo].nombre}`,
      hacer: async () => {
        const antes = new Set(v.doc.muebles.map((m) => m.uid));
        const r = await v.op("hogarColocar", { tipo: c.tipo, x: p.x, z: p.z, rot: c.rot, color: c.color, comprar: true });
        if (!r) return false;
        const nuevo = v.doc.muebles.find((m) => !antes.has(m.uid));
        if (uid && nuevo) alias.set(uid, nuevo.uid);
        uid = uid || nuevo?.uid || "";
        return true;
      },
      deshacer: async () => !!(await v.op("hogarRetirar", { uid: real(uid) })),
    });
    if (ok) {
      if (!enInventario) gastado += MUEBLES[c.tipo].precio;
      sonido("moneda");
      await cargarInventario();
      // Se puede seguir colocando otro igual (sillas, macetas…).
      if (!(inventario[`mueble:${c.tipo}`] ?? 0) && !confirmarOtro(c.tipo)) {
        colocando = null;
        esc.fantasma(null);
      }
      pintar();
    }
  }
  const confirmarOtro = (tipo: string) => ["silla", "maceta", "jarron", "cuadro", "geranios", "lamparaMesa"].includes(tipo);

  async function ejecutar(p: Paso) {
    const ok = await p.hacer();
    if (ok) {
      hechos.push(p);
      deshechos.length = 0;
      pintarEstado();
    }
    return ok;
  }
  async function deshacer() {
    const p = hechos.pop();
    if (!p) return;
    if (await p.deshacer()) deshechos.push(p);
    else hechos.push(p);
    await cargarInventario();
  }
  async function rehacer() {
    const p = deshechos.pop();
    if (!p) return;
    if (await p.hacer()) hechos.push(p);
    else deshechos.push(p);
    await cargarInventario();
  }

  async function seleccionar(uid: string | null) {
    if (seleccion && seleccion !== uid) void con.llamar("hogarBloquear", { id: v.id, uid: seleccion, soltar: true }).catch(() => {});
    seleccion = uid;
    esc.resaltar(uid);
    if (uid) {
      const otro = v.bloqueadoPorOtro(uid);
      if (otro) {
        v.j.aviso("Otro jugador está moviendo ese mueble ahora mismo.");
        seleccion = null;
        esc.resaltar(null);
      } else await con.llamar("hogarBloquear", { id: v.id, uid }).catch(() => {});
    }
    pintar();
  }

  /* ── Interfaz ───────────────────────────────────────────────────── */

  function pintarEstado() {
    const err = colocando ? motivo() : null;
    poner(estado, 
      h("div", { class: "construir-botones" },
        h("button", { class: "boton-icono", title: "Deshacer (Ctrl+Z)", disabled: !hechos.length, onclick: () => void deshacer(), html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>' }),
        h("button", { class: "boton-icono", title: "Rehacer (Ctrl+Y)", disabled: !deshechos.length, onclick: () => void rehacer(), html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg>' }),
        h("button", { class: `chip${paso === 1 ? " activo" : ""}`, onclick: () => cambiarPaso(1) }, "Rejilla 0,5 m"),
        h("button", { class: `chip${paso === 2 ? " activo" : ""}`, onclick: () => cambiarPaso(2) }, "1 m"),
        h("span", { class: "gastado" }, gastado ? `Gastado: ${gastado} €` : ""),
      ),
      colocando
        ? h("div", { class: `aviso-colocar${err ? " mal" : ""}` },
          err ?? (colocando.uid ? "Suelta para moverlo aquí." : (inventario[`mueble:${colocando.tipo}`] ?? 0) > 0 ? "Suelta para colocarlo (lo tienes en el inventario)." : `Suelta para comprarlo y colocarlo: ${MUEBLES[colocando.tipo].precio} €`),
          h("button", { class: "chip", onclick: () => girar() }, "Girar (R)"),
          h("button", { class: "chip", onclick: () => cancelar() }, "Cancelar"))
        : null,
    );
  }
  function cambiarPaso(n: number) {
    paso = n;
    esc.mostrarRejilla(n);
    pintarEstado();
  }
  function girar() {
    if (!colocando) {
      if (seleccion) void girarSeleccion();
      return;
    }
    colocando.rot = (colocando.rot + 1) & 3;
    actualizarFantasma();
  }
  function cancelar() {
    colocando = null;
    esc.fantasma(null);
    esc.ocultarMueble(null);
    pintar();
  }
  async function girarSeleccion() {
    const m = v.doc.muebles.find((x) => x.uid === seleccion);
    if (!m) return;
    const uid = m.uid;
    const antes = m.rot;
    await ejecutar({
      nombre: "Girar",
      hacer: async () => !!(await v.op("hogarMover", { uid: real(uid), x: m.x, z: m.z, rot: (antes + 1) & 3 })),
      deshacer: async () => !!(await v.op("hogarMover", { uid: real(uid), x: m.x, z: m.z, rot: antes })),
    });
  }

  function pintar() {
    pintarEstado();
    const sel = seleccion ? v.doc.muebles.find((m) => m.uid === seleccion) : null;
    if (sel) {
      const def = MUEBLES[sel.tipo];
      const uid = sel.uid;
      poner(zona, 
        h("div", { class: "seleccion-mueble" },
          h("img", { src: previa(sel.tipo, sel.color), alt: "" }),
          h("div", {}, h("b", {}, def.nombre), h("small", {}, sel.roto ? "Roto: sácalo al contenedor en Reformas" : `Reventa: ${precioReventa(sel.tipo)} €`)),
        ),
        h("div", { class: "colores" }, ...def.colores.map((c) => h("button", { class: `color${c === sel.color ? " activo" : ""}`, style: `background:${c}`, "aria-label": `Color ${c}`, onclick: async () => {
          const antes = sel.color;
          await ejecutar({ nombre: "Color", hacer: async () => !!(await v.op("hogarColor", { uid: real(uid), color: c })), deshacer: async () => !!(await v.op("hogarColor", { uid: real(uid), color: antes })) });
          pintar();
        } }))),
        h("div", { class: "acciones-mueble" },
          h("button", { class: "boton", onclick: () => {
            colocando = { tipo: sel.tipo, color: sel.color, rot: sel.rot, uid };
            pos = { x: sel.x, z: sel.z };
            esc.ocultarMueble(uid);
            actualizarFantasma();
            pintar();
          } }, "Mover"),
          h("button", { class: "boton", onclick: () => void girarSeleccion() }, "Girar"),
          h("button", { class: "boton", disabled: !!sel.roto, onclick: async () => {
            const copia = { ...sel };
            await ejecutar({
              nombre: "Guardar",
              hacer: async () => !!(await v.op("hogarRetirar", { uid: real(uid) })),
              deshacer: async () => {
                const antes = new Set(v.doc.muebles.map((m) => m.uid));
                const r = await v.op("hogarColocar", { tipo: copia.tipo, x: copia.x, z: copia.z, rot: copia.rot, color: copia.color });
                const nuevo = v.doc.muebles.find((m) => !antes.has(m.uid));
                if (nuevo) alias.set(real(uid), nuevo.uid);
                return !!r;
              },
            });
            seleccion = null;
            await cargarInventario();
          } }, "Guardar"),
          h("button", { class: "boton rosa", disabled: !!sel.roto, onclick: async () => {
            if (!(await v.op("hogarRetirar", { uid: real(uid) }))) return;
            const r = await con.llamar("hogarVenderMueble", { tipo: sel.tipo }).catch((e) => v.j.aviso((e as Error).message));
            if (r) {
              sonido("moneda");
              v.j.aviso(`Vendido por <b>${precioReventa(sel.tipo)} €</b>.`);
            }
            seleccion = null;
            hechos.length = 0;
            await cargarInventario();
          } }, `Vender ${precioReventa(sel.tipo)} €`),
          h("button", { class: "boton", onclick: () => void seleccionar(null) }, "Listo"),
        ),
      );
      return;
    }
    const tabs = h("div", { class: "pestanas" },
      h("button", { class: pestana === "catalogo" ? "activa" : "", onclick: () => ((pestana = "catalogo"), pintar()) }, "Catálogo"),
      h("button", { class: pestana === "inventario" ? "activa" : "", onclick: () => ((pestana = "inventario"), pintar()) }, `Inventario (${Object.entries(inventario).filter(([k]) => k.startsWith("mueble:") || k.startsWith("caja:")).reduce((s, [, n]) => s + n, 0)})`),
    );
    if (pestana === "catalogo") {
      const items = Object.entries(MUEBLES).filter(([, d]) => d.categoria === categoria);
      poner(zona, 
        tabs,
        h("div", { class: "chips" }, ...CATEGORIAS.map((c) => h("button", { class: `chip${c === categoria ? " activo" : ""}`, onclick: () => ((categoria = c), pintar()) }, c))),
        h("div", { class: "catalogo-muebles" }, ...items.map(([id, d]) => tarjeta(id, d.colores[0], `${d.precio} €`, d.montable ? `En caja ${precioCaja(id)} €` : ""))),
      );
    } else {
      const muebles = Object.entries(inventario).filter(([k]) => k.startsWith("mueble:"));
      const cajas = Object.entries(inventario).filter(([k]) => k.startsWith("caja:"));
      poner(zona, 
        tabs,
        muebles.length || cajas.length
          ? h("div", { class: "catalogo-muebles" },
            ...muebles.map(([k, n]) => tarjeta(k.slice(7), MUEBLES[k.slice(7)].colores[0], `Tienes ${n}`, "")),
            ...cajas.map(([k, n]) => h("button", { class: "tarjeta-mueble caja", onclick: () => void import("./reformas").then((m) => m.abrirMontaje(v, k.slice(5))) },
              h("img", { src: previa(k.slice(5), MUEBLES[k.slice(5)].colores[0]), alt: "" }),
              h("b", {}, MUEBLES[k.slice(5)].nombre), h("small", {}, `${n} en caja · Montar`))))
          : h("p", { class: "vacio" }, "El inventario está vacío. Lo que guardes o compres aparece aquí."),
      );
    }
  }

  function tarjeta(tipo: string, color: string, precio: string, extra: string) {
    const def = MUEBLES[tipo];
    return h("div", { class: `tarjeta-mueble${colocando?.tipo === tipo && !colocando.uid ? " activa" : ""}` },
      h("button", { class: "tarjeta-tocar", onclick: () => {
        colocando = { tipo, color, rot: 0 };
        pos = null;
        sonido("toque");
        v.j.aviso(`Arrastra <b>${def.nombre}</b> por la casa y suelta donde quieras ponerlo.`);
        pintar();
      } },
      h("img", { src: previa(tipo, color), alt: "", loading: "lazy" }),
      h("b", {}, def.nombre),
      h("small", {}, precio)),
      extra ? h("button", { class: "enlace", onclick: async () => {
        const r = await con.llamar("hogarComprarMueble", { tipo, caja: true }).catch((e) => v.j.aviso((e as Error).message));
        if (r) {
          sonido("moneda");
          gastado += precioCaja(tipo);
          v.j.aviso(`Caja comprada. Móntala desde el <b>Inventario</b>.`);
          await cargarInventario();
        }
      } }, extra) : null,
    );
  }

  function teclas(ev: KeyboardEvent) {
    if (ev.key === "r" || ev.key === "R") girar();
    else if (ev.key === "Escape") cancelar();
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") void deshacer();
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") void rehacer();
  }
  window.addEventListener("keydown", teclas);
  v.alCambiar = () => pintar();
  // Arrastres de otros jugadores: se ven como un fantasma rosa breve.
  v.alDirecto = () => {};
  void cargarInventario();
  void html;
  void iconoSvg;
}
