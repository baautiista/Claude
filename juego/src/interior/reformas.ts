import * as THREE from "three";
import { MUEBLES, PINTURAS, PLANTAS_JARDIN, PRECIO_PINTURA, SUELOS } from "../compartido/hogar/catalogo";
import { montajeDe } from "../compartido/hogar/hogar";
import { habitacionEn, type Habitacion, type Lado } from "../compartido/hogar/plano";
import { girar } from "../compartido/hogar/puzles";
import { con } from "../red/conexion";
import { h, poner } from "../ui/dom";
import { sonido } from "../ui/sonido";
import { abrirConstruccion } from "./construir";
import type { Toque } from "./escena";
import { previa } from "./modelos";
import type { Vivienda } from "./vivienda";

/**
 * Las diez reformas de Hogar Linense. Todas son interacciones reales (frotar,
 * arrastrar, trazar, girar piezas, cavar…), con herramienta, objetivo,
 * progreso y resultado; el servidor comprueba el resultado, paga lo que
 * cueste el material, da la experiencia y guarda el cambio para siempre.
 */

const DIRS: Record<Lado, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] };
const OPUESTO: Record<Lado, Lado> = { n: "s", s: "n", e: "o", o: "e" };

interface Actividad {
  id: string;
  nombre: string;
  herramienta: string;
  pendiente: (v: Vivienda) => string;
  abrir: (v: Vivienda) => void;
}

const ACTIVIDADES: Actividad[] = [
  {
    id: "limpieza", nombre: "Limpieza", herramienta: "Esponja y bolsa",
    pendiente: (v) => (v.doc.manchas.length + v.doc.basura.length ? `${v.doc.manchas.length} manchas · ${v.doc.basura.length} basuras` : ""),
    abrir: (v) => limpieza(v),
  },
  {
    id: "trastos", nombre: "Sacar trastos", herramienta: "Carretilla",
    pendiente: (v) => { const n = v.doc.muebles.filter((m) => m.roto).length; return n ? `${n} muebles rotos` : ""; },
    abrir: (v) => trastos(v),
  },
  {
    id: "grietas", nombre: "Reparar paredes", herramienta: "Llana y masilla",
    pendiente: (v) => (v.doc.grietas.length ? `${v.doc.grietas.length} grietas` : ""),
    abrir: (v) => grietas(v),
  },
  {
    id: "pintura", nombre: "Pintar", herramienta: "Rodillo y brocha",
    pendiente: (v) => { const n = Object.values(v.doc.pinturaVieja).filter(Boolean).length; return n ? `${n} habitaciones desconchadas` : "Cambia el color cuando quieras"; },
    abrir: (v) => pintura(v),
  },
  {
    id: "suelo", nombre: "Cambiar suelos", herramienta: "Piqueta y baldosas",
    pendiente: (v) => { const n = Object.values(v.doc.sueloRoto).filter(Boolean).length; return n ? `${n} suelos rotos` : "Cambia el material cuando quieras"; },
    abrir: (v) => suelos(v),
  },
  {
    id: "electricidad", nombre: "Electricidad", herramienta: "Cables y polímetro",
    pendiente: (v) => (v.doc.electricidad.resuelto ? "" : "Sin luz en casa"),
    abrir: (v) => void puzle(v, "electricidad"),
  },
  {
    id: "fontaneria", nombre: "Fontanería", herramienta: "Tuberías y llave inglesa",
    pendiente: (v) => (v.doc.fontaneria.resuelto ? "" : "No sale agua"),
    abrir: (v) => void puzle(v, "fontaneria"),
  },
  {
    id: "montaje", nombre: "Montar muebles", herramienta: "Destornillador",
    pendiente: () => "Muebles en caja del inventario",
    abrir: (v) => void elegirCaja(v),
  },
  {
    id: "decoracion", nombre: "Decorar", herramienta: "Catálogo de adornos",
    pendiente: (v) => `${Math.min(12, v.doc.hechas.decoracion ?? 0)}/12 adornos con premio`,
    abrir: (v) => abrirConstruccion(v),
  },
  {
    id: "jardin", nombre: "Jardinería", herramienta: "Azada, semillas y regadera",
    pendiente: (v) => { const n = v.doc.jardin.filter((c) => c.mala).length; return v.doc.jardin.length ? (n ? `${n} arriates con malas hierbas` : "Planta y riega") : "Sin patio"; },
    abrir: (v) => jardin(v),
  },
];

export function abrirReformas(v: Vivienda) {
  if (!v.puedeReformar) {
    v.j.aviso("Para reformar necesitas una llave de esta casa (o que te contraten).");
    return;
  }
  const c = v.abrirPanel("REFORMAS", "¿Qué hacemos hoy?");
  const pintar = () => {
    poner(c, 
      h("div", { class: "lista-reformas" }, ...ACTIVIDADES.map((a) => {
        const p = a.pendiente(v);
        const hecho = !p && !["pintura", "suelo", "montaje", "decoracion"].includes(a.id);
        return h("button", { class: `tarjeta-reforma${hecho ? " hecha" : ""}`, disabled: a.id === "jardin" && !v.doc.jardin.length, onclick: () => a.abrir(v) },
          h("b", {}, a.nombre), h("small", {}, hecho ? "✓ Hecho" : p), h("span", { class: "herramienta" }, a.herramienta));
      })),
      v.rol === "titular"
        ? h("button", { class: "boton azul", onclick: () => encargar(v) }, "Encargar la reforma a otro jugador")
        : null,
    );
  };
  pintar();
  v.alCambiar = pintar;
}

/* ── Utilidades de panel y superposición 2D ─────────────────────────── */

function progreso(v: Vivienda, seccion: string, titulo: string, texto: () => string, extra?: () => (Node | null)[]) {
  const c = v.abrirPanel(seccion, titulo);
  const p = h("div", { class: "progreso-reforma" });
  const pintar = () => poner(p, h("p", { html: texto() }), ...(extra?.() ?? []).filter((x): x is Node => !!x));
  c.append(p);
  pintar();
  v.alCambiar = pintar;
  return pintar;
}

/** Pantalla 2D encima del interior para trabajos de detalle (pared, suelo, puzles). */
function superposicion(v: Vivienda, seccion: string, titulo: string) {
  const cuerpo = h("div", { class: "taller-cuerpo" });
  const pie = h("div", { class: "taller-pie" });
  const el = h("div", { class: "taller", role: "dialog", "aria-label": titulo },
    h("div", { class: "hoja-cabeza" },
      h("div", {}, h("span", { class: "etiqueta" }, seccion), h("h2", {}, titulo)),
      h("button", { class: "cerrar", "aria-label": "Cerrar", onclick: () => cerrar() }, "✕"),
    ),
    cuerpo, pie);
  v.ui.append(el);
  let alCerrar: (() => void) | null = null;
  const cerrar = () => {
    el.remove();
    alCerrar?.();
    v.directo({ que: "herramienta", texto: "" });
  };
  return { el, cuerpo, pie, cerrar, alCerrarFn: (f: () => void) => (alCerrar = f) };
}

/** Lienzo con coordenadas de puntero (ratón y táctil por igual). */
function lienzo(ancho: number, alto: number) {
  const c = h("canvas", { class: "taller-lienzo" }) as HTMLCanvasElement;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = ancho * dpr;
  c.height = alto * dpr;
  c.style.aspectRatio = `${ancho} / ${alto}`;
  const x = c.getContext("2d")!;
  x.scale(dpr, dpr);
  const punto = (ev: PointerEvent) => {
    const r = c.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * ancho, y: ((ev.clientY - r.top) / r.height) * alto };
  };
  return { c, x, punto };
}

const haciendo = (v: Vivienda, texto: string) => v.directo({ que: "herramienta", texto });

/* ── 1. Limpieza: frotar manchas con la esponja y recoger basura ────── */

function limpieza(v: Vivienda) {
  haciendo(v, "🧽 limpiando");
  let bolsa = 0;
  const CAPACIDAD = 5;
  const frotado = new Map<string, number>();
  let ultimo: { x: number; y: number } | null = null;
  const pintar = progreso(v, "LIMPIEZA", "Esponja y bolsa de basura", () =>
    `<b>Frota</b> las manchas del suelo arrastrando sobre ellas y <b>toca</b> la basura para recogerla. Quedan <b>${v.doc.manchas.length}</b> manchas y <b>${v.doc.basura.length}</b> basuras. Bolsa: <b>${bolsa}/${CAPACIDAD}</b>${bolsa >= CAPACIDAD ? " — llena: llévala a la puerta de la calle." : ""}`,
  () => [bolsa ? h("button", { class: "boton", onclick: () => vaciar() }, "Llevar la bolsa al contenedor") : null, !v.doc.manchas.length && !v.doc.basura.length ? h("p", { class: "exito" }, "¡La casa está limpia!") : null]);
  const vaciar = () => {
    const e = v.doc.plano.entrada;
    v.escena.andarA(new THREE.Vector2(e.x + 0.5, e.z + 0.3), () => {
      sonido("bien");
      v.escena.flotar(`🗑️ ${bolsa} al contenedor`, new THREE.Vector3(e.x + 0.5, 1.8, e.z));
      bolsa = 0;
      pintar();
    });
  };
  const manchaEn = (t: Toque) => {
    if (t.objeto?.tipo === "mancha") return t.objeto.id;
    if (!t.suelo) return null;
    return v.doc.manchas.find((m) => Math.hypot(m.x - t.suelo!.x, m.z - t.suelo!.z) < m.r)?.id ?? null;
  };
  const frotar = async (t: Toque) => {
    const id = manchaEn(t);
    if (!id || !ultimo) return;
    const d = Math.hypot(t.x - ultimo.x, t.y - ultimo.y);
    const s = Math.max(0, (frotado.get(id) ?? 1) - d / 900);
    frotado.set(id, s);
    v.escena.frotar(id, s);
    if (s <= 0 && frotado.get(id) !== -1) {
      frotado.set(id, -1);
      const r = await v.op("hogarLimpiar", { mancha: id });
      if (r) {
        sonido("bien");
        if (t.suelo) v.escena.flotar("✨ +1 XP", t.suelo.clone().setY(0.6));
      }
      pintar();
    }
  };
  v.escena.herramienta = {
    capturaArrastre: true,
    bajar: (t) => (ultimo = { x: t.x, y: t.y }),
    mover: (t) => {
      void frotar(t);
      ultimo = { x: t.x, y: t.y };
    },
    subir: async (t) => {
      ultimo = null;
      if (t.objeto?.tipo === "basura") {
        if (bolsa >= CAPACIDAD) {
          sonido("mal");
          v.j.aviso("La bolsa está llena. Llévala al contenedor de la calle.");
          return;
        }
        const id = t.objeto.id;
        const destino = new THREE.Vector2(t.objeto.punto.x, t.objeto.punto.z);
        v.escena.andarA(destino, async () => {
          const r = await v.op("hogarBasura", { basura: id });
          if (r) {
            bolsa++;
            sonido("toque");
            pintar();
          }
        });
      } else if (!manchaEn(t) && t.suelo) v.escena.andarA(new THREE.Vector2(t.suelo.x, t.suelo.z));
    },
  };
}

/* ── 2. Trastos: cargar el mueble roto y llevarlo a la puerta ──────── */

function trastos(v: Vivienda) {
  haciendo(v, "🛒 sacando trastos");
  let cargado: string | null = null;
  const pintar = progreso(v, "TRASTOS", "Sacar los muebles rotos", () => {
    const n = v.doc.muebles.filter((m) => m.roto).length;
    if (!n) return "<b>No quedan trastos.</b> La casa ya respira.";
    return cargado ? "Llevas un trasto en la carretilla: <b>toca la puerta de la calle</b> (o el suelo junto a ella) para sacarlo al contenedor." : `<b>Toca un mueble roto</b> (los grises) para cargarlo en la carretilla. Quedan <b>${n}</b>.`;
  });
  const e = v.doc.plano.entrada;
  const entrada = new THREE.Vector2(e.x + 0.5, e.z + 0.3);
  v.escena.herramienta = {
    subir: (t) => {
      if (!cargado && t.objeto?.tipo === "mueble") {
        const m = v.doc.muebles.find((x) => x.uid === t.objeto!.id);
        if (!m?.roto) return void v.j.aviso("Ese mueble está bien. Busca los rotos (grises).");
        const uid = m.uid;
        v.escena.andarA(new THREE.Vector2(t.objeto.punto.x, t.objeto.punto.z), () => {
          cargado = uid;
          v.escena.ocultarMueble(uid);
          sonido("toque");
          v.escena.flotar("🛒 cargado", new THREE.Vector3(v.escena.pos.x, 2, v.escena.pos.y));
          pintar();
        });
        return;
      }
      if (cargado && t.suelo) {
        const cerca = t.suelo.distanceTo(new THREE.Vector3(entrada.x, 0, entrada.y)) < 1.6 || t.objeto?.tipo === "pared";
        v.escena.andarA(cerca ? entrada : new THREE.Vector2(t.suelo.x, t.suelo.z), async () => {
          if (v.escena.pos.distanceTo(entrada) > 1.2) return;
          const uid = cargado!;
          const r = await v.op("hogarTrasto", { uid });
          cargado = null;
          v.escena.ocultarMueble(null);
          if (r) {
            sonido("bien");
            v.escena.flotar("🗑️ +3 XP", new THREE.Vector3(entrada.x, 1.8, entrada.y));
          }
          pintar();
        });
      } else if (t.suelo) v.escena.andarA(new THREE.Vector2(t.suelo.x, t.suelo.z));
    },
  };
}

/* ── 3. Grietas: masilla siguiendo la grieta y lijado ───────────────── */

function grietas(v: Vivienda) {
  const c = v.abrirPanel("PAREDES", "Reparar grietas");
  const pintar = () => poner(c, 
    v.doc.grietas.length
      ? h("div", { class: "lista-simple" }, ...v.doc.grietas.map((g) => {
        const hab = v.doc.plano.habitaciones.find((x) => x.id === g.hab);
        return h("button", { class: "boton", onclick: () => repararGrieta(v, g.id) }, `Grieta en ${hab?.nombre ?? "la pared"} (pared ${({ n: "norte", s: "sur", e: "este", o: "oeste" })[g.lado]})`);
      }))
      : h("p", { class: "exito" }, "No quedan grietas. Paredes como nuevas."),
  );
  pintar();
  v.alCambiar = pintar;
}

function repararGrieta(v: Vivienda, id: string) {
  const g = v.doc.grietas.find((x) => x.id === id);
  if (!g) return;
  haciendo(v, "🧱 arreglando una pared");
  const t = superposicion(v, "PAREDES", "Masilla y lija");
  const W = 520;
  const H = 360;
  const { c, x, punto } = lienzo(W, H);
  const u0 = g.puntos[0][0] - 0.4;
  const u1 = g.puntos[g.puntos.length - 1][0] + 0.4;
  const esc = Math.min(W / (u1 - u0), H / 2.7);
  const aPx = (u: number, vv: number) => ({ x: (u - u0) * esc, y: H - vv * esc });
  // Grieta muestreada cada 4 px.
  const muestras: { x: number; y: number; ok: boolean }[] = [];
  for (let i = 1; i < g.puntos.length; i++) {
    const a = aPx(...g.puntos[i - 1]);
    const b = aPx(...g.puntos[i]);
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 4));
    for (let k = 0; k < n; k++) muestras.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n, ok: false });
  }
  let fase: "masilla" | "lija" = "masilla";
  let trazos = 0;
  let fuera = 0;
  let lijado = 0;
  let abajo = false;
  let ultimo: { x: number; y: number } | null = null;
  const hab = v.doc.plano.habitaciones.find((hh) => hh.id === g.hab);
  const color = (hab && v.doc.pintura[hab.id]) || "#EFE6D2";
  const dibujar = () => {
    x.fillStyle = color;
    x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < 40; i++) x.fillRect((i * 97) % W, (i * 61) % H, 30, 18);
    // Grieta.
    x.lineWidth = 3;
    x.lineCap = "round";
    for (let i = 1; i < muestras.length; i++) {
      x.strokeStyle = muestras[i].ok ? "#F4EFE4" : "#3A2E24";
      x.lineWidth = muestras[i].ok ? 12 : 3;
      x.beginPath();
      x.moveTo(muestras[i - 1].x, muestras[i - 1].y);
      x.lineTo(muestras[i].x, muestras[i].y);
      x.stroke();
    }
    if (fase === "lija") {
      x.fillStyle = `rgba(255,255,255,${0.15 + 0.5 * (lijado / 100)})`;
      for (const m of muestras) x.fillRect(m.x - 10, m.y - 10, 20, 20);
    }
  };
  const precision = () => {
    const cub = muestras.filter((m) => m.ok).length / muestras.length;
    return Math.max(0, Math.min(1, cub - (fuera / Math.max(1, trazos)) * 0.6));
  };
  const pie = () => poner(t.pie, 
    h("p", { html: fase === "masilla"
      ? `<b>Llana con masilla:</b> arrastra siguiendo la grieta de punta a punta. Cubierta: <b>${Math.round((muestras.filter((m) => m.ok).length / muestras.length) * 100)}%</b> · Precisión: <b>${Math.round(precision() * 100)}%</b>`
      : `<b>Lija:</b> frota sobre la masilla hasta dejarla lisa. <b>${Math.round(lijado)}%</b>` }),
    fase === "masilla"
      ? h("div", { class: "fila-botones" },
        h("button", { class: "boton", onclick: () => { for (const m of muestras) m.ok = false; trazos = fuera = 0; dibujar(); pie(); } }, "Rascar y empezar otra vez"),
        h("button", { class: "boton azul", disabled: muestras.filter((m) => m.ok).length / muestras.length < 0.85, onclick: () => { fase = "lija"; dibujar(); pie(); } }, "Lijar"))
      : h("button", { class: "boton azul", disabled: lijado < 100, onclick: async () => {
        const r = await v.op("hogarGrieta", { grieta: g.id, precision: Math.round(precision() * 100) / 100 });
        if (r) {
          sonido("bien");
          v.j.aviso(`Pared reparada. Precisión <b>${Math.round(precision() * 100)}%</b>.`);
          t.cerrar();
        } else {
          fase = "masilla";
          for (const m of muestras) m.ok = false;
          trazos = fuera = 0;
          lijado = 0;
          dibujar();
          pie();
        }
      } }, "Terminar"),
  );
  c.addEventListener("pointerdown", (ev) => {
    c.setPointerCapture(ev.pointerId);
    abajo = true;
    ultimo = punto(ev);
  });
  c.addEventListener("pointermove", (ev) => {
    if (!abajo) return;
    const p = punto(ev);
    if (fase === "masilla") {
      trazos++;
      let cerca = false;
      for (const m of muestras) {
        const d = Math.hypot(m.x - p.x, m.y - p.y);
        if (d < 14) m.ok = cerca = true;
        else if (d < 26) cerca = true;
      }
      if (!cerca) fuera++;
    } else if (ultimo && muestras.some((m) => Math.hypot(m.x - p.x, m.y - p.y) < 22)) {
      lijado = Math.min(100, lijado + Math.hypot(p.x - ultimo.x, p.y - ultimo.y) / 12);
    }
    ultimo = p;
    dibujar();
    pie();
  });
  c.addEventListener("pointerup", () => (abajo = false));
  t.cuerpo.append(c);
  dibujar();
  pie();
}

/* ── 4. Pintura: rodillo y brocha sobre las paredes desplegadas ─────── */

/** Huecos (puertas/ventanas) de una pared de la habitación, por metro. */
function huecosPared(v: Vivienda, hab: Habitacion, lado: Lado) {
  const p = v.doc.plano;
  const horizontal = lado === "n" || lado === "s";
  const largo = horizontal ? hab.x1 - hab.x0 : hab.z1 - hab.z0;
  const out: (string | null)[] = [];
  for (let k = 0; k < largo; k++) {
    const cx = horizontal ? hab.x0 + k : lado === "o" ? hab.x0 : hab.x1 - 1;
    const cz = horizontal ? (lado === "n" ? hab.z0 : hab.z1 - 1) : hab.z0 + k;
    const [dx, dz] = DIRS[lado];
    const hu = p.huecos.find((x) => (x.x === cx && x.z === cz && x.lado === lado) || (x.x === cx + dx && x.z === cz + dz && x.lado === OPUESTO[lado]));
    out.push(hu?.tipo ?? null);
  }
  return out;
}

function pintura(v: Vivienda) {
  const habs = v.doc.plano.habitaciones.filter((x) => x.tipo !== "patio" && x.tipo !== "terraza");
  const actual = v.habitacionActual();
  let hab = habs.find((x) => x.id === actual?.id) ?? habs[0];
  let color = "cal";
  const c = v.abrirPanel("PINTURA", "Elige habitación y color");
  const pintar = () => poner(c, 
    h("div", { class: "chips" }, ...habs.map((x) => h("button", { class: `chip${x === hab ? " activo" : ""}`, onclick: () => ((hab = x), pintar()) }, `${x.nombre}${v.doc.pinturaVieja[x.id] ? " ⚠" : ""}`))),
    h("div", { class: "colores grandes" }, ...Object.entries(PINTURAS).map(([id, p]) => h("button", { class: `color${id === color ? " activo" : ""}`, style: `background:${p.color}`, title: p.nombre, "aria-label": p.nombre, onclick: () => ((color = id), pintar()) }))),
    h("p", {}, `${PINTURAS[color].nombre} · bote para una habitación: ${PRECIO_PINTURA} € (se cobra al terminar)`),
    h("button", { class: "boton azul", onclick: () => pintarHabitacion(v, hab, color) }, `Pintar ${hab.nombre}`),
  );
  pintar();
}

function pintarHabitacion(v: Vivienda, hab: Habitacion, color: string) {
  haciendo(v, "🖌️ pintando");
  const t = superposicion(v, "PINTURA", `${hab.nombre} · ${PINTURAS[color].nombre}`);
  const lados: Lado[] = ["n", "e", "s", "o"];
  const largos = lados.map((l) => (l === "n" || l === "s" ? hab.x1 - hab.x0 : hab.z1 - hab.z0));
  const total = largos.reduce((s, x) => s + x, 0);
  const W = 760;
  const esc = Math.min((W - 30) / total, 60);
  const ALTO = 2.7 * esc;
  const H = ALTO + 70;
  const { c, x, punto } = lienzo(W, H);
  const y0 = 30;
  // Rejilla de cobertura (celdas de 6 px) y zonas pintables.
  const CEL = 6;
  const cols = Math.ceil(W / CEL);
  const filas = Math.ceil(H / CEL);
  const pintable = new Uint8Array(cols * filas);
  const pintado = new Uint8Array(cols * filas);
  const tramos: { x0: number; lado: Lado; huecos: (string | null)[] }[] = [];
  let ox = 15;
  lados.forEach((l, i) => {
    tramos.push({ x0: ox, lado: l, huecos: huecosPared(v, hab, l) });
    ox += largos[i] * esc;
  });
  const esHueco = (px: number, py: number) => {
    for (const tr of tramos) {
      const k = Math.floor((px - tr.x0) / esc);
      if (k < 0 || k >= tr.huecos.length) continue;
      const hu = tr.huecos[k];
      if (!hu) return false;
      const v0 = (y0 + ALTO - py) / esc;
      const dentro = (px - tr.x0) / esc - k;
      if ((hu === "puerta" || hu === "entrada") && v0 < 2.1 && dentro > 0.1 && dentro < 0.9) return true;
      if (hu === "ventana" && v0 > 0.9 && v0 < 2.1 && dentro > 0.15 && dentro < 0.85) return true;
      return false;
    }
    return true;
  };
  for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) {
    const px = i * CEL + CEL / 2;
    const py = j * CEL + CEL / 2;
    if (py > y0 && py < y0 + ALTO && px > 15 && px < ox && !esHueco(px, py)) pintable[j * cols + i] = 1;
  }
  const totalPintable = pintable.reduce((s, b) => s + b, 0);
  const capa = document.createElement("canvas");
  capa.width = W;
  capa.height = H;
  const cx2 = capa.getContext("2d")!;
  let herramienta: "rodillo" | "brocha" = "rodillo";
  let carga = 0;
  let manchas = 0;
  let fueraEnTrazo = false;
  let abajo = false;
  let ultimo: { x: number; y: number } | null = null;
  const viejo = v.doc.pintura[hab.id] ?? "#EFE6D2";
  const nuevo = PINTURAS[color].color;
  const BANDEJA = { x: W - 120, y: H - 34, w: 100, h: 26 };
  const cobertura = () => {
    let n = 0;
    for (let i = 0; i < pintable.length; i++) if (pintable[i] && pintado[i]) n++;
    return n / totalPintable;
  };
  const dibujar = () => {
    x.clearRect(0, 0, W, H);
    x.fillStyle = "#FBFAF6";
    x.fillRect(0, 0, W, y0);
    x.fillStyle = "#C9B79A";
    x.fillRect(0, y0 + ALTO, W, H - y0 - ALTO);
    for (const tr of tramos) {
      const w = tr.huecos.length * esc;
      x.fillStyle = v.doc.pinturaVieja[hab.id] ? "#D9CDB4" : viejo;
      x.fillRect(tr.x0, y0, w, ALTO);
      x.drawImage(capa, tr.x0, y0, w, ALTO, tr.x0, y0, w, ALTO);
      tr.huecos.forEach((hu, k) => {
        const hx = tr.x0 + k * esc;
        if (hu === "puerta" || hu === "entrada") {
          x.fillStyle = "#8A5A35";
          x.fillRect(hx + esc * 0.1, y0 + ALTO - 2.1 * esc, esc * 0.8, 2.1 * esc);
        } else if (hu === "ventana") {
          x.fillStyle = "#BFE0F7";
          x.fillRect(hx + esc * 0.15, y0 + ALTO - 2.1 * esc, esc * 0.7, 1.2 * esc);
          x.strokeStyle = "#FFFFFF";
          x.lineWidth = 3;
          x.strokeRect(hx + esc * 0.15, y0 + ALTO - 2.1 * esc, esc * 0.7, 1.2 * esc);
        }
      });
      x.strokeStyle = "rgba(0,0,0,0.25)";
      x.lineWidth = 1;
      x.strokeRect(tr.x0, y0, w, ALTO);
      x.fillStyle = "#061E5C";
      x.font = "600 12px Poppins, sans-serif";
      x.fillText(({ n: "Norte", s: "Sur", e: "Este", o: "Oeste" })[tr.lado], tr.x0 + 4, y0 - 8);
    }
    // Manchas fuera (techo, suelo, marcos).
    x.drawImage(capa, 0, 0, W, y0, 0, 0, W, y0);
    // Bandeja del rodillo.
    x.fillStyle = "#9AA3AE";
    x.fillRect(BANDEJA.x, BANDEJA.y, BANDEJA.w, BANDEJA.h);
    x.fillStyle = nuevo;
    x.fillRect(BANDEJA.x + 6, BANDEJA.y + 5, BANDEJA.w - 12, BANDEJA.h - 10);
    x.fillStyle = "#061E5C";
    x.fillText("Bandeja: moja aquí", BANDEJA.x - 6, BANDEJA.y - 6);
  };
  const pie = () => poner(t.pie, 
    h("div", { class: "fila-botones" },
      h("button", { class: `chip${herramienta === "rodillo" ? " activo" : ""}`, onclick: () => ((herramienta = "rodillo"), pie()) }, "Rodillo (paños)"),
      h("button", { class: `chip${herramienta === "brocha" ? " activo" : ""}`, onclick: () => ((herramienta = "brocha"), pie()) }, "Brocha (bordes)"),
      h("span", { class: "medidor" }, h("i", { style: `width:${Math.round(carga)}%;background:${nuevo}` })),
    ),
    h("p", { html: `Cobertura <b>${Math.round(cobertura() * 100)}%</b> (hace falta 95 %) · Salpicones fuera de la pared: <b>${manchas}</b>${carga < 5 ? " · <b>Moja el rodillo en la bandeja</b>" : ""}` }),
    h("button", { class: "boton azul", disabled: cobertura() < 0.95, onclick: async () => {
      const r = await v.op("hogarPintar", { hab: hab.id, color, cobertura: Math.round(cobertura() * 1000) / 1000, manchas });
      if (r) {
        sonido("bien");
        v.j.aviso(`¡${hab.nombre} pintado de ${PINTURAS[color].nombre.toLowerCase()}!${manchas ? ` (${manchas} salpicones: menos XP)` : ""}`);
        t.cerrar();
      }
    } }, "Terminar"),
  );
  const pincelar = (p: { x: number; y: number }) => {
    const r = herramienta === "rodillo" ? 22 : 8;
    if (carga <= 0) return;
    cx2.fillStyle = nuevo;
    cx2.globalAlpha = 0.9;
    cx2.beginPath();
    if (herramienta === "rodillo") cx2.rect(p.x - r, p.y - r * 0.55, r * 2, r * 1.1);
    else cx2.arc(p.x, p.y, r, 0, Math.PI * 2);
    cx2.fill();
    let fuera = false;
    for (let i = Math.floor((p.x - r) / CEL); i <= Math.floor((p.x + r) / CEL); i++) for (let j = Math.floor((p.y - r) / CEL); j <= Math.floor((p.y + r) / CEL); j++) {
      if (i < 0 || j < 0 || i >= cols || j >= filas) continue;
      const k = j * cols + i;
      if (pintable[k]) pintado[k] = 1;
      else if (Math.hypot(i * CEL + CEL / 2 - p.x, j * CEL + CEL / 2 - p.y) < r * 0.6) fuera = true;
    }
    if (fuera && !fueraEnTrazo) {
      manchas++;
      fueraEnTrazo = true;
    }
    carga = Math.max(0, carga - (herramienta === "rodillo" ? 0.9 : 0.25));
  };
  c.addEventListener("pointerdown", (ev) => {
    c.setPointerCapture(ev.pointerId);
    const p = punto(ev);
    if (p.x > BANDEJA.x && p.x < BANDEJA.x + BANDEJA.w && p.y > BANDEJA.y - 10) {
      carga = 100;
      sonido("toque");
      pie();
      return;
    }
    abajo = true;
    fueraEnTrazo = false;
    ultimo = p;
    pincelar(p);
    dibujar();
  });
  c.addEventListener("pointermove", (ev) => {
    if (!abajo || !ultimo) return;
    const p = punto(ev);
    const d = Math.hypot(p.x - ultimo.x, p.y - ultimo.y);
    const n = Math.max(1, Math.ceil(d / 6));
    for (let k = 1; k <= n; k++) pincelar({ x: ultimo.x + ((p.x - ultimo.x) * k) / n, y: ultimo.y + ((p.y - ultimo.y) * k) / n });
    ultimo = p;
    dibujar();
    pie();
    v.directo({ que: "trazo", hab: hab.id });
  });
  c.addEventListener("pointerup", () => {
    abajo = false;
    pie();
  });
  t.cuerpo.append(c);
  dibujar();
  pie();
}

/* ── 5. Suelos: levantar las baldosas viejas y colocar las nuevas ───── */

function suelos(v: Vivienda) {
  const habs = v.doc.plano.habitaciones;
  const actual = v.habitacionActual();
  let hab = habs.find((x) => x.id === actual?.id) ?? habs[0];
  let material = "hidraulico";
  const c = v.abrirPanel("SUELOS", "Elige habitación y material");
  const pintar = () => {
    const area = (hab.x1 - hab.x0) * (hab.z1 - hab.z0);
    poner(c, 
      h("div", { class: "chips" }, ...habs.map((x) => h("button", { class: `chip${x === hab ? " activo" : ""}`, onclick: () => ((hab = x), pintar()) }, `${x.nombre}${v.doc.sueloRoto[x.id] ? " ⚠" : ""}`))),
      h("div", { class: "chips" }, ...Object.entries(SUELOS).map(([id, s]) => h("button", { class: `chip${id === material ? " activo" : ""}`, onclick: () => ((material = id), pintar()) }, h("i", { class: "muestra", style: `background:${s.colores[0]};border-color:${s.colores[1]}` }), ` ${s.nombre} · ${s.precioM2} €/m²`))),
      h("p", {}, `${hab.nombre}: ${area} m² · Material: ${SUELOS[material].precioM2 * area} € (se cobra al terminar)`),
      h("button", { class: "boton azul", onclick: () => solar(v, hab, material) }, "Empezar la obra"),
    );
  };
  pintar();
}

function solar(v: Vivienda, hab: Habitacion, material: string) {
  haciendo(v, "🔨 cambiando el suelo");
  const t = superposicion(v, "SUELOS", `${hab.nombre} · ${SUELOS[material].nombre}`);
  const w = hab.x1 - hab.x0;
  const d = hab.z1 - hab.z0;
  const CEL = Math.min(Math.floor(520 / w), Math.floor(330 / d), 70);
  const W = w * CEL + 40;
  const H = d * CEL + 110;
  const { c, x, punto } = lienzo(W, H);
  const area = w * d;
  // Estado de cada m²: 0 baldosa vieja, 1 (rota) a medio levantar, 2 levantada, 3 nueva.
  const roto = !!v.doc.sueloRoto[hab.id];
  const celdas = new Array(area).fill(0);
  const golpes = new Array(area).fill(0);
  let arrastrando: { x: number; y: number } | null = null;
  const viejo = SUELOS[v.doc.suelo[hab.id]]?.colores ?? ["#C9B79A", "#B0A080"];
  const nuevo = SUELOS[material].colores;
  const PALE = { x: W / 2 - 50, y: H - 60, w: 100, h: 44 };
  const fase = () => (celdas.some((s) => s < 2) && !celdas.some((s) => s === 3) ? "levantar" : "colocar");
  const dibujar = () => {
    x.fillStyle = "#EDE6D6";
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
      const k = j * w + i;
      const px = 20 + i * CEL;
      const py = 20 + j * CEL;
      const s = celdas[k];
      if (s === 2) {
        x.fillStyle = "#9C8A72";
        x.fillRect(px, py, CEL, CEL);
        x.fillStyle = "rgba(0,0,0,0.12)";
        for (let n = 0; n < 6; n++) x.fillRect(px + ((n * 17) % CEL), py + ((n * 29) % CEL), 4, 4);
      } else {
        const col = s === 3 ? nuevo : viejo;
        x.fillStyle = col[0];
        x.fillRect(px + 1, py + 1, CEL - 2, CEL - 2);
        x.strokeStyle = col[1];
        x.lineWidth = 3;
        x.strokeRect(px + 6, py + 6, CEL - 12, CEL - 12);
        if (s < 3 && (roto || golpes[k])) {
          x.strokeStyle = "#3A2E24";
          x.lineWidth = 1.5;
          x.beginPath();
          x.moveTo(px + 5, py + CEL * 0.3);
          x.lineTo(px + CEL * 0.5, py + CEL * 0.55);
          x.lineTo(px + CEL - 6, py + CEL * 0.4);
          x.stroke();
        }
      }
    }
    if (fase() === "colocar") {
      x.fillStyle = "#B08A4E";
      x.fillRect(PALE.x, PALE.y + 30, PALE.w, 12);
      for (let n = 0; n < 4; n++) {
        x.fillStyle = nuevo[0];
        x.fillRect(PALE.x + 8 + n * 3, PALE.y + 22 - n * 6, PALE.w - 24, 10);
        x.strokeStyle = nuevo[1];
        x.strokeRect(PALE.x + 8 + n * 3, PALE.y + 22 - n * 6, PALE.w - 24, 10);
      }
      x.fillStyle = "#061E5C";
      x.font = "600 12px Poppins, sans-serif";
      x.fillText("Arrastra baldosas desde el palé", PALE.x - 40, PALE.y - 6);
    }
    if (arrastrando) {
      x.globalAlpha = 0.85;
      x.fillStyle = nuevo[0];
      x.fillRect(arrastrando.x - CEL / 2, arrastrando.y - CEL / 2, CEL, CEL);
      x.strokeStyle = nuevo[1];
      x.strokeRect(arrastrando.x - CEL / 2 + 6, arrastrando.y - CEL / 2 + 6, CEL - 12, CEL - 12);
      x.globalAlpha = 1;
    }
  };
  const celdaEn = (p: { x: number; y: number }) => {
    const i = Math.floor((p.x - 20) / CEL);
    const j = Math.floor((p.y - 20) / CEL);
    return i >= 0 && j >= 0 && i < w && j < d ? j * w + i : -1;
  };
  const pie = () => {
    const levantadas = celdas.filter((s) => s >= 2).length;
    const puestas = celdas.filter((s) => s === 3).length;
    poner(t.pie, 
      h("p", { html: fase() === "levantar"
        ? `<b>Piqueta:</b> golpea cada baldosa vieja para levantarla (${roto ? "las rotas salen a la primera" : "dos golpes cada una"}). Levantadas: <b>${levantadas}/${area}</b>`
        : `<b>Coloca</b> las baldosas nuevas: arrástralas del palé a cada hueco. Puestas: <b>${puestas}/${area}</b>` }),
      h("button", { class: "boton azul", disabled: puestas < area, onclick: async () => {
        const r = await v.op("hogarSuelo", { hab: hab.id, material, colocadas: puestas });
        if (r) {
          sonido("bien");
          v.j.aviso(`Suelo nuevo de <b>${SUELOS[material].nombre.toLowerCase()}</b> en ${hab.nombre}.`);
          t.cerrar();
        }
      } }, "Terminar la obra"),
    );
  };
  c.addEventListener("pointerdown", (ev) => {
    c.setPointerCapture(ev.pointerId);
    const p = punto(ev);
    if (fase() === "levantar") {
      const k = celdaEn(p);
      if (k < 0 || celdas[k] >= 2) return;
      golpes[k]++;
      if (roto || golpes[k] >= 2) celdas[k] = 2;
      sonido("toque");
    } else if (p.x > PALE.x - 10 && p.x < PALE.x + PALE.w + 10 && p.y > PALE.y - 10) arrastrando = p;
    dibujar();
    pie();
  });
  c.addEventListener("pointermove", (ev) => {
    if (fase() === "levantar" && ev.buttons) {
      // Arrastrar con la piqueta también golpea (rápido en táctil).
      const k = celdaEn(punto(ev));
      if (k >= 0 && celdas[k] < 2 && golpes[k] === 0) {
        golpes[k] = 1;
        if (roto) celdas[k] = 2;
        dibujar();
        pie();
      }
      return;
    }
    if (!arrastrando) return;
    arrastrando = punto(ev);
    dibujar();
  });
  c.addEventListener("pointerup", (ev) => {
    if (!arrastrando) return;
    const k = celdaEn(punto(ev));
    if (k >= 0 && celdas[k] === 2) {
      celdas[k] = 3;
      sonido("toque");
      v.directo({ que: "baldosa", hab: hab.id });
    }
    arrastrando = null;
    dibujar();
    pie();
  });
  t.cuerpo.append(c);
  dibujar();
  pie();
}

/* ── 6 y 7. Electricidad y fontanería: girar piezas del circuito ────── */

async function puzle(v: Vivienda, tipo: "electricidad" | "fontaneria") {
  const r = await v.op<{ resuelto: boolean; puzle: { ancho: number; alto: number; origen: number; destinos: number[]; piezas: number[] } }>("hogarPuzle", { tipo });
  if (!r) return;
  if (r.resuelto) return void v.j.aviso(tipo === "electricidad" ? "La instalación eléctrica ya funciona." : "Ya sale agua por todos los grifos.");
  haciendo(v, tipo === "electricidad" ? "⚡ con la luz" : "🔧 con las tuberías");
  const p = r.puzle;
  const elec = tipo === "electricidad";
  const t = superposicion(v, elec ? "ELECTRICIDAD" : "FONTANERÍA", elec ? "Conecta el cuadro con las lámparas" : "Lleva el agua a los grifos");
  const CEL = Math.min(78, Math.floor(480 / p.ancho));
  const W = p.ancho * CEL + 20;
  const H = p.alto * CEL + 20;
  const { c, x, punto } = lienzo(W, H);
  const giros = p.piezas.map(() => 0);
  const giroVisual = p.piezas.map(() => 0);
  let resultado = "";
  const mascara = (i: number) => girar(p.piezas[i], giros[i]);
  const conectados = () => {
    const vistos = new Set([p.origen]);
    const cola = [p.origen];
    let fugas = 0;
    const dirs: [number, number, number, number][] = [[1, 0, -1, 4], [2, 1, 0, 8], [4, 0, 1, 1], [8, -1, 0, 2]];
    while (cola.length) {
      const i = cola.shift()!;
      const m = mascara(i);
      for (const [b, dx, dy, op] of dirs) {
        if (!(m & b)) continue;
        const nx = (i % p.ancho) + dx;
        const ny = Math.floor(i / p.ancho) + dy;
        if (nx < 0 || ny < 0 || nx >= p.ancho || ny >= p.alto) { fugas++; continue; }
        const j = ny * p.ancho + nx;
        if (!(mascara(j) & op)) { fugas++; continue; }
        if (!vistos.has(j)) { vistos.add(j); cola.push(j); }
      }
    }
    return { vistos, fugas };
  };
  const activo = elec ? "#F2C230" : "#3FA9F5";
  const dibujar = () => {
    const { vistos } = conectados();
    x.fillStyle = elec ? "#2B2D31" : "#DCE6EE";
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < p.piezas.length; i++) {
      const cx = 10 + (i % p.ancho) * CEL + CEL / 2;
      const cy = 10 + Math.floor(i / p.ancho) * CEL + CEL / 2;
      x.fillStyle = elec ? "#3A3D44" : "#FFFFFF";
      x.fillRect(cx - CEL / 2 + 2, cy - CEL / 2 + 2, CEL - 4, CEL - 4);
      if (!p.piezas[i]) continue;
      giroVisual[i] += (giros[i] - giroVisual[i]) * 0.35;
      x.save();
      x.translate(cx, cy);
      x.rotate((giroVisual[i] * Math.PI) / 2);
      const m = p.piezas[i];
      x.strokeStyle = vistos.has(i) ? activo : elec ? "#7A808C" : "#9AA3AE";
      x.lineWidth = elec ? 7 : 14;
      x.lineCap = "round";
      for (const [b, dx, dy] of [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]] as const) {
        if (!(m & b)) continue;
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo((dx * CEL) / 2, (dy * CEL) / 2);
        x.stroke();
      }
      x.fillStyle = x.strokeStyle;
      x.beginPath();
      x.arc(0, 0, elec ? 6 : 9, 0, Math.PI * 2);
      x.fill();
      x.restore();
      if (i === p.origen) {
        x.fillStyle = elec ? "#1F5EFF" : "#1F5EFF";
        x.fillRect(cx - 16, cy - 16, 32, 32);
        x.fillStyle = "#FFFFFF";
        x.font = "700 16px Poppins, sans-serif";
        x.textAlign = "center";
        x.fillText(elec ? "⚡" : "💧", cx, cy + 6);
      }
      if (p.destinos.includes(i)) {
        x.fillStyle = vistos.has(i) ? activo : "#9AA3AE";
        x.beginPath();
        x.arc(cx, cy, 15, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "#061E5C";
        x.font = "16px sans-serif";
        x.textAlign = "center";
        x.fillText(elec ? "💡" : "🚰", cx, cy + 6);
      }
    }
  };
  const pie = () => {
    const { vistos, fugas } = conectados();
    const alcanzados = p.destinos.filter((d) => vistos.has(d)).length;
    poner(t.pie, 
      h("p", { html: `<b>Toca una pieza</b> para girarla. ${elec ? "Lámparas" : "Grifos"} conectados: <b>${alcanzados}/${p.destinos.length}</b> · ${elec ? "Cables sueltos" : "Fugas"}: <b>${fugas}</b>${resultado ? ` · ${resultado}` : ""}` }),
      h("button", { class: "boton azul", onclick: async () => {
        const res = await v.op<{ resuelto: boolean; alcanzados: number; fugas: number }>("hogarResolver", { tipo, giros });
        if (!res) return;
        if (res.resuelto) {
          sonido("bien");
          v.j.aviso(elec ? "¡Se hizo la luz! Ya funcionan los enchufes y las lámparas." : "¡Agua! Ya puedes ducharte y fregar.");
          v.escena.aplicarHora();
          t.cerrar();
        } else {
          sonido("mal");
          resultado = `El ${elec ? "polímetro" : "manómetro"} marca ${res.alcanzados}/${p.destinos.length} y ${res.fugas} ${elec ? "cables sueltos" : "fugas"}.`;
          pie();
        }
      } }, elec ? "Subir el diferencial" : "Abrir la llave de paso"),
    );
  };
  c.addEventListener("pointerdown", (ev) => {
    const q = punto(ev);
    const i = Math.floor((q.x - 10) / CEL);
    const j = Math.floor((q.y - 10) / CEL);
    if (i < 0 || j < 0 || i >= p.ancho || j >= p.alto) return;
    const k = j * p.ancho + i;
    if (!p.piezas[k] || p.piezas[k] === 15) return;
    giros[k] = giros[k] + (ev.button === 2 ? -1 : 1);
    sonido("toque");
    resultado = "";
    pie();
  });
  c.addEventListener("contextmenu", (ev) => ev.preventDefault());
  let vivo = true;
  t.alCerrarFn(() => (vivo = false));
  const animar = () => {
    if (!vivo) return;
    dibujar();
    requestAnimationFrame(animar);
  };
  t.cuerpo.append(c);
  animar();
  pie();
}

/* ── 8. Montaje: seguir el manual pieza a pieza y atornillar ────────── */

async function elegirCaja(v: Vivienda) {
  const inv = await con.llamar<Record<string, number>>("hogarInventario").catch(() => ({} as Record<string, number>));
  const cajas = Object.entries(inv).filter(([k]) => k.startsWith("caja:"));
  const c = v.abrirPanel("MONTAJE", "Muebles en caja");
  c.append(
    cajas.length
      ? h("div", { class: "catalogo-muebles" }, ...cajas.map(([k, n]) => h("button", { class: "tarjeta-mueble", onclick: () => abrirMontaje(v, k.slice(5)) },
        h("img", { src: previa(k.slice(5), MUEBLES[k.slice(5)].colores[0]), alt: "" }), h("b", {}, MUEBLES[k.slice(5)].nombre), h("small", {}, `${n} en caja`))))
      : h("p", { class: "vacio" }, "No tienes muebles en caja. En Construir → Catálogo, los montables se venden en caja un 30 % más baratos."),
  );
}

const NOMBRE_PIEZA: Record<string, string> = {
  base: "Base", lateralI: "Lateral izquierdo", lateralD: "Lateral derecho", trasera: "Trasera", estante: "Estante", techo: "Techo", puertas: "Puertas", tiradores: "Tiradores",
  tablero: "Tablero", pata1: "Pata 1", pata2: "Pata 2", pata3: "Pata 3", pata4: "Pata 4", travesano: "Travesaño",
  patas: "Patas", laterales: "Largueros", somier: "Somier", cabecero: "Cabecero", colchon: "Colchón",
};

export function abrirMontaje(v: Vivienda, tipo: string) {
  haciendo(v, "🪛 montando un mueble");
  const m = montajeDe(tipo);
  const t = superposicion(v, "MONTAJE", MUEBLES[tipo].nombre);
  const orden: string[] = [];
  let tornillos = 0;
  let pendiente: string | null = null;
  const bandeja = [...m.piezas].sort((a, b) => ((a.charCodeAt(0) * 31 + a.length) % 7) - ((b.charCodeAt(0) * 31 + b.length) % 7));
  const W = 420;
  const H = 300;
  const { c, x } = lienzo(W, H);
  const manual = h("ol", { class: "manual" }, ...m.piezas.map((p, i) => h("li", {}, `${i + 1}. ${NOMBRE_PIEZA[p] ?? p}${m.requiere[p] ? ` (tras ${m.requiere[p].map((q) => NOMBRE_PIEZA[q] ?? q).join(", ")})` : ""}`)));
  const dibujar = () => {
    x.fillStyle = "#F4EFE4";
    x.fillRect(0, 0, W, H);
    x.strokeStyle = "#9AA3AE";
    x.setLineDash([6, 6]);
    x.strokeRect(60, 40, 300, 220);
    x.setLineDash([]);
    const col = MUEBLES[tipo].colores[0];
    const puesta = (p: string) => orden.includes(p) || pendiente === p;
    x.fillStyle = col;
    x.strokeStyle = "#5A3B22";
    x.lineWidth = 2;
    const r = (a: number, b: number, w: number, hh: number) => {
      x.fillRect(a, b, w, hh);
      x.strokeRect(a, b, w, hh);
    };
    if (m.piezas.includes("base")) {
      if (puesta("base")) r(100, 236, 220, 16);
      if (puesta("lateralI")) r(100, 70, 16, 166);
      if (puesta("lateralD")) r(304, 70, 16, 166);
      if (puesta("trasera")) { x.globalAlpha = 0.5; r(116, 70, 188, 166); x.globalAlpha = 1; }
      if (puesta("estante")) r(116, 150, 188, 10);
      if (puesta("techo")) r(100, 58, 220, 14);
      if (puesta("puertas")) { r(118, 74, 90, 160); r(212, 74, 90, 160); }
      if (puesta("tiradores")) { x.fillStyle = "#D9C9A8"; x.fillRect(196, 140, 6, 26); x.fillRect(218, 140, 6, 26); }
    } else if (tipo.startsWith("cama")) {
      if (puesta("patas")) { r(96, 220, 12, 30); r(312, 220, 12, 30); }
      if (puesta("laterales")) r(96, 200, 228, 20);
      if (puesta("somier")) { x.fillStyle = "#C9A06A"; r(104, 186, 212, 14); }
      if (puesta("cabecero")) r(96, 110, 20, 110);
      if (puesta("colchon")) { x.fillStyle = "#FFFFFF"; r(118, 160, 200, 26); }
    } else {
      if (puesta("tablero")) r(90, 120, 240, 18);
      ["pata1", "pata2", "pata3", "pata4"].forEach((p, i) => { if (puesta(p)) r(100 + i * 70, 138, 12, 110); });
      if (puesta("travesano")) r(100, 210, 222, 8);
    }
    if (pendiente) {
      for (let i = 0; i < 2; i++) {
        x.fillStyle = i < tornillos ? "#2E7D4F" : "#C8322B";
        x.beginPath();
        x.arc(180 + i * 60, 30, 9, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = "#061E5C";
      x.font = "600 12px Poppins, sans-serif";
      x.fillText("Atornilla: toca los dos tornillos", 120, 16);
    }
  };
  const pie = () => poner(t.pie, 
    h("div", { class: "montaje-cols" },
      h("div", {}, h("b", {}, "Manual"), manual),
      h("div", {}, h("b", {}, "Piezas de la caja"), h("div", { class: "piezas" }, ...bandeja.filter((p) => !orden.includes(p) && p !== pendiente).map((p) =>
        h("button", { class: "pieza", draggable: "true", disabled: !!pendiente, onclick: () => colocarPieza(p), ondragstart: (ev: Event) => (ev as DragEvent).dataTransfer?.setData("text/plain", p) }, NOMBRE_PIEZA[p] ?? p)))),
    ),
    h("p", { html: `Piezas montadas: <b>${orden.length}/${m.piezas.length}</b>${pendiente ? ` · Falta atornillar: <b>${NOMBRE_PIEZA[pendiente]}</b>` : ""}` }),
  );
  const colocarPieza = (p: string) => {
    const faltan = (m.requiere[p] ?? []).filter((q) => !orden.includes(q));
    if (faltan.length) {
      sonido("mal");
      v.j.aviso(`El manual dice: antes va <b>${faltan.map((q) => NOMBRE_PIEZA[q] ?? q).join(", ")}</b>.`);
      return;
    }
    pendiente = p;
    tornillos = 0;
    sonido("toque");
    dibujar();
    pie();
  };
  c.addEventListener("dragover", (ev) => ev.preventDefault());
  c.addEventListener("drop", (ev) => {
    ev.preventDefault();
    const p = ev.dataTransfer?.getData("text/plain");
    if (p && !pendiente) colocarPieza(p);
  });
  c.addEventListener("pointerdown", async (ev) => {
    if (!pendiente) return;
    const r = c.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const py = ((ev.clientY - r.top) / r.height) * H;
    const i = [0, 1].find((k) => Math.hypot(px - (180 + k * 60), py - 30) < 22);
    if (i === undefined || i < tornillos) return;
    tornillos++;
    sonido("toque");
    if (tornillos >= 2) {
      orden.push(pendiente);
      pendiente = null;
      if (orden.length === m.piezas.length) {
        const res = await con.llamar("hogarMontar", { tipo, orden }).catch((e) => v.j.aviso((e as Error).message));
        if (res) {
          sonido("bien");
          v.j.aviso(`<b>${MUEBLES[tipo].nombre}</b> montado. Ya está en tu inventario para colocarlo. +6 XP`);
          t.cerrar();
          return;
        }
      }
    }
    dibujar();
    pie();
  });
  t.cuerpo.append(c);
  dibujar();
  pie();
}

/* ── 10. Jardinería: arrancar, cavar, plantar, regar y recoger ──────── */

function jardin(v: Vivienda) {
  type Util = "manos" | "azada" | "semillas" | "regadera";
  let util: Util = "manos";
  let planta = "geranio";
  let pulsado: { celda: string; t0: number; recorrido: number; ultimo: { x: number; y: number } } | null = null;
  const patio = v.doc.plano.habitaciones.find((x) => x.tipo === "patio" || x.tipo === "terraza");
  if (patio) v.escena.andarA(new THREE.Vector2((patio.x0 + patio.x1) / 2, (patio.z0 + patio.z1) / 2));
  haciendo(v, "🌱 en el jardín");
  const pintar = progreso(v, "JARDÍN", "Arriates del patio", () => {
    const malas = v.doc.jardin.filter((c) => c.mala).length;
    const plantadas = v.doc.jardin.filter((c) => c.planta).length;
    return {
      manos: `<b>Manos:</b> mantén pulsado sobre un arriate con malas hierbas para arrancarlas. Quedan <b>${malas}</b>. Si una planta ya ha crecido, tócala para recogerla.`,
      azada: "<b>Azada:</b> arrastra adelante y atrás sobre un arriate limpio para cavar la tierra.",
      semillas: `<b>Semillas:</b> toca un arriate cavado para plantar ${PLANTAS_JARDIN[planta].nombre.toLowerCase()} (${PLANTAS_JARDIN[planta].precio} €).`,
      regadera: `<b>Regadera:</b> mantén pulsado sobre una planta para regarla. Plantas: <b>${plantadas}</b>.`,
    }[util];
  }, () => [
    h("div", { class: "chips" }, ...(["manos", "azada", "semillas", "regadera"] as Util[]).map((u) => h("button", { class: `chip${u === util ? " activo" : ""}`, onclick: () => ((util = u), pintar()) }, { manos: "🧤 Manos", azada: "⛏️ Azada", semillas: "🌱 Semillas", regadera: "🚿 Regadera" }[u]))),
    util === "semillas" ? h("div", { class: "chips" }, ...Object.entries(PLANTAS_JARDIN).map(([id, p]) => h("button", { class: `chip${id === planta ? " activo" : ""}`, onclick: () => ((planta = id), pintar()) }, `${p.nombre} · ${p.precio} € · ${p.horas} h`))) : null,
  ]);
  const celdaDe = (t: Toque) => {
    if (t.objeto?.tipo === "jardin") return t.objeto.id;
    if (!t.suelo) return null;
    const c = v.doc.jardin.find((j) => Math.floor(t.suelo!.x) === j.x && Math.floor(t.suelo!.z) === j.z);
    return c ? `${c.x},${c.z}` : null;
  };
  const accion = async (celda: string, a: string, extra: Record<string, unknown> = {}) => {
    const [cx, cz] = celda.split(",").map(Number);
    const r = await v.op("hogarJardin", { x: cx, z: cz, accion: a, ...extra });
    if (r) {
      sonido(a === "recoger" ? "moneda" : "toque");
      v.escena.flotar(({ arrancar: "🌿 arrancada", cavar: "⛏️ cavado", plantar: "🌱 plantado", regar: "💧 regado", recoger: "🌸 +4 XP" } as Record<string, string>)[a] ?? "", new THREE.Vector3(cx + 0.5, 1, cz + 0.5));
    }
    pintar();
  };
  v.escena.herramienta = {
    capturaArrastre: true,
    bajar: (t) => {
      const celda = celdaDe(t);
      if (celda) pulsado = { celda, t0: performance.now(), recorrido: 0, ultimo: { x: t.x, y: t.y } };
    },
    mover: (t) => {
      if (!pulsado) return;
      pulsado.recorrido += Math.abs(t.y - pulsado.ultimo.y) + Math.abs(t.x - pulsado.ultimo.x);
      pulsado.ultimo = { x: t.x, y: t.y };
    },
    subir: (t) => {
      const p = pulsado;
      pulsado = null;
      const celda = celdaDe(t);
      if (!p || !celda || celda !== p.celda) {
        if (t.suelo && !celda) v.escena.andarA(new THREE.Vector2(t.suelo.x, t.suelo.z));
        return;
      }
      const c = v.doc.jardin.find((j) => `${j.x},${j.z}` === celda)!;
      const ms = performance.now() - p.t0;
      if (util === "manos") {
        if (c.mala) {
          if (ms < 700) return void v.j.aviso("Las raíces agarran fuerte: <b>mantén pulsado</b> para arrancarlas.");
          void accion(celda, "arrancar");
        } else if (c.planta) void accion(celda, "recoger");
      } else if (util === "azada") {
        if (p.recorrido < 160) return void v.j.aviso("Cava con ganas: <b>arrastra adelante y atrás</b> sobre el arriate.");
        void accion(celda, "cavar");
      } else if (util === "semillas") void accion(celda, "plantar", { planta });
      else if (util === "regadera") {
        if (ms < 1000) return void v.j.aviso("Riega despacio: <b>mantén pulsado</b> sobre la planta.");
        void accion(celda, "regar");
      }
    },
  };
}

/* ── Encargos: contratar a otro jugador (pago en depósito) ──────────── */

function encargar(v: Vivienda) {
  const tareas = new Set<string>();
  const opciones: [string, string][] = [["limpieza", "Limpieza"], ["trastos", "Sacar trastos"], ["grietas", "Grietas"], ["pintura", "Pintura"], ["suelo", "Suelos"], ["electricidad", "Electricidad"], ["fontaneria", "Fontanería"], ["jardin", "Malas hierbas"]];
  let pago = 40;
  const c = v.abrirPanel("ENCARGO", "Contratar a otro jugador");
  const pintar = () => poner(c, 
    h("p", {}, "El pago queda en depósito en el servidor y solo se le paga cuando el trabajo está comprobado en tu casa."),
    h("div", { class: "chips" }, ...opciones.map(([id, n]) => h("button", { class: `chip${tareas.has(id) ? " activo" : ""}`, onclick: () => { if (tareas.has(id)) tareas.delete(id); else tareas.add(id); pintar(); } }, n))),
    h("label", { class: "campo" }, "Pago (€) ", h("input", { type: "number", min: 10, max: 5000, value: pago, oninput: (ev: Event) => (pago = Number((ev.target as HTMLInputElement).value)) })),
    h("button", { class: "boton azul", disabled: !tareas.size, onclick: async () => {
      const r = await con.llamar("hogarPublicarEncargo", { id: v.id, tareas: [...tareas], pago }).catch((e) => v.j.aviso((e as Error).message));
      if (r) {
        sonido("moneda");
        v.j.aviso(`Encargo publicado en <b>Hogar Linense → Encargos</b>. ${pago} € en depósito.`);
        v.cerrarPanel();
      }
    } }, "Publicar encargo"),
  );
  pintar();
}

/** Para las pruebas: lista de actividades. */
export const ACTIVIDADES_REFORMA = ACTIVIDADES.map((a) => a.id);
void habitacionEn;
