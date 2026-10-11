import type { Juego } from "../juego";
import { entrarEnVivienda, Vivienda } from "../interior/vivienda";
import { iconoSvg } from "../iconos";
import { con } from "../red/conexion";
import { esc, h, html, poner } from "./dom";
import { sonido } from "./sonido";

/**
 * Hogar Linense: la inmobiliaria del juego en el móvil. Buscar y filtrar,
 * ficha con plano e inspección, visitas en 3D, comprar, alquilar, vender,
 * mudarse, llaves para otros jugadores y encargos de reforma.
 */

type Pestana = "buscar" | "mias" | "encargos";
interface Ficha {
  id: string; nombre: string; barrio: string; barrioId: string; tipo: string; superficie: number; dormitorios: number; planta: number;
  estado: number; precio: number; alquiler: number; valor: number; situacion: string; precioVenta: number | null; modo: string | null; rol: string | null; x: number; y: number;
  renta?: number; pagadoHasta?: number; enVenta?: number | null; compartida?: string; titularNombre?: string;
}

const BARRIOS: [string, string][] = [["", "Todos"], ["centro", "Centro"], ["sanBernardo", "San Bernardo"], ["atunara", "La Atunara"], ["zabal", "El Zabal"], ["poniente", "Poniente"], ["levante", "Levante"]];
const filtros = { barrio: "", tipo: "", precioMax: 0, dormMin: 0, orden: "precio", pagina: 0 };

const euros = (n: number) => `${n.toLocaleString("es-ES")} €`;

export function abrirHogar(j: Juego, opciones: { edificio?: number; pestana?: Pestana } = {}) {
  let pestana: Pestana = opciones.pestana ?? "buscar";
  const cuerpo = h("div", { class: "web-cuerpo app-hogar" });
  const nav = h("div", { class: "web-nav", role: "tablist" });
  const pantalla = h("div", { class: "movil hogar", role: "dialog", "aria-label": "Hogar Linense" },
    h("div", { class: "web-cabecera hogar-cabecera" },
      h("div", { class: "fila" },
        h("div", { class: "marca-app" }, h("span", { html: iconoSvg("casa", 22) }), h("b", {}, "Hogar Linense")),
        h("button", { class: "cerrar", "aria-label": "Cerrar", onclick: () => j.cerrar() }, html(iconoSvg("cerrar", 18))),
      ),
      nav),
    cuerpo);
  j.pantalla(pantalla);
  const pintarNav = () => poner(nav, ...([["buscar", "Buscar"], ["mias", "Mis casas"], ["encargos", "Encargos"]] as [Pestana, string][]).map(([id, t]) =>
    h("button", { role: "tab", "aria-selected": String(id === pestana), onclick: () => ir(id) }, t)));
  const cargando = () => poner(cuerpo, h("p", { class: "vacio" }, "Cargando…"));
  const fallo = (e: unknown) => poner(cuerpo, h("p", { class: "vacio" }, esc((e as Error).message)));

  const ir = (p: Pestana) => {
    pestana = p;
    pintarNav();
    if (p === "buscar") void buscar();
    else if (p === "mias") void mias();
    else void encargos();
  };

  /* ── Buscar ────────────────────────────────────────────────────────── */

  async function buscar() {
    cargando();
    try {
      const args: Record<string, unknown> = { ...filtros };
      if (opciones.edificio !== undefined) args.edificio = opciones.edificio;
      if (!filtros.precioMax) delete args.precioMax;
      if (!filtros.dormMin) delete args.dormMin;
      if (filtros.orden === "cerca") args.cerca = Vivienda.actual ? [Vivienda.actual.unidad.x, Vivienda.actual.unidad.y] : j.mundo.posicionJugador;
      const r = await con.llamar<{ total: number; lista: Ficha[] }>("hogarCatalogo", args);
      const sel = (valor: string, opciones: [string, string][], fn: (v: string) => void, etiqueta: string) =>
        h("label", { class: "filtro" }, h("small", {}, etiqueta), h("select", { onchange: (ev: Event) => fn((ev.target as HTMLSelectElement).value) },
          ...opciones.map(([v, t]) => h("option", { value: v, selected: v === valor }, t))));
      const recargar = () => ((filtros.pagina = 0), void buscar());
      poner(cuerpo, 
        opciones.edificio !== undefined
          ? h("div", { class: "aviso-edificio" }, "Viviendas de este edificio ", h("button", { class: "enlace", onclick: () => { delete opciones.edificio; void buscar(); } }, "Ver todas"))
          : h("div", { class: "filtros" },
            sel(filtros.barrio, BARRIOS, (v) => ((filtros.barrio = v), recargar()), "Barrio"),
            sel(filtros.tipo, [["", "Todas"], ["casa", "Casas"], ["piso", "Pisos"], ["atico", "Áticos"]], (v) => ((filtros.tipo = v), recargar()), "Tipo"),
            sel(String(filtros.precioMax), [["0", "Sin límite"], ["800", "Hasta 800 €"], ["1500", "Hasta 1.500 €"], ["3000", "Hasta 3.000 €"], ["6000", "Hasta 6.000 €"]], (v) => ((filtros.precioMax = Number(v)), recargar()), "Precio"),
            sel(String(filtros.dormMin), [["0", "Cualquiera"], ["2", "2 o más"], ["3", "3 o más"]], (v) => ((filtros.dormMin = Number(v)), recargar()), "Dormitorios"),
            sel(filtros.orden, [["precio", "Más baratas"], ["superficie", "Más grandes"], ["estado", "Mejor estado"], ["cerca", "Más cerca"]], (v) => ((filtros.orden = v), recargar()), "Orden"),
          ),
        h("p", { class: "web-aviso" }, `${r.total.toLocaleString("es-ES")} viviendas · página ${filtros.pagina + 1}`),
        ...r.lista.map((f) => tarjeta(f)),
        h("div", { class: "fila-botones" },
          h("button", { class: "boton", disabled: filtros.pagina === 0, onclick: () => { filtros.pagina--; void buscar(); } }, "Anteriores"),
          h("button", { class: "boton", disabled: (filtros.pagina + 1) * 20 >= r.total, onclick: () => { filtros.pagina++; void buscar(); } }, "Siguientes")),
      );
      j.mundo.pines(r.lista.map((f) => ({ x: f.x, y: f.y, texto: euros(f.precioVenta ?? f.precio), clase: f.situacion === "tuya" ? "tuya" : "venta" })));
    } catch (e) {
      fallo(e);
    }
  }

  function tarjeta(f: Ficha) {
    return h("button", { class: "articulo tarjeta-vivienda", onclick: () => void ficha(f.id) },
      h("div", { class: "meta" },
        h("span", { class: `etiqueta${f.situacion === "tuya" ? " lima" : ""}` }, f.situacion === "libre" ? f.tipo.toUpperCase() : f.situacion.toUpperCase()),
        `${f.barrio} · ${f.superficie} m² · ${f.dormitorios} dorm.`),
      h("h3", {}, f.nombre),
      h("div", { class: "precio-fila" },
        h("b", { class: "precio" }, euros(f.precioVenta ?? f.precio)),
        f.situacion === "libre" ? h("small", {}, `o ${euros(f.alquiler)}/semana`) : null,
        h("span", { class: "barra-estado mini", title: `Estado ${f.estado}%` }, h("i", { style: `width:${f.estado}%` }))),
    );
  }

  /* ── Ficha ─────────────────────────────────────────────────────────── */

  async function ficha(id: string) {
    cargando();
    let f: Ficha & {
      habitaciones: { nombre: string; tipo: string; m2: number }[];
      incluye: string[];
      inspeccion: Record<string, number | boolean>;
      materiales: string[];
      permisos: { roles: { id: string; nombre: string; rol: string }[] } | null;
    };
    try {
      f = await con.llamar("hogarFicha", { id });
    } catch (e) {
      return fallo(e);
    }
    const ins = f.inspeccion;
    const problemas = [
      [ins.manchas, "manchas"], [ins.basura, "bolsas de basura"], [ins.trastos, "muebles rotos"], [ins.grietas, "grietas"],
      [ins.pinturaVieja, "habitaciones por pintar"], [ins.sueloRoto, "suelos rotos"],
    ].filter(([n]) => Number(n) > 0).map(([n, t]) => `${n} ${t}`);
    if (!ins.electricidad) problemas.push("instalación eléctrica averiada");
    if (!ins.fontaneria) problemas.push("fontanería averiada");
    const tuya = f.rol === "titular";
    const acciones: (Node | null)[] = [];
    const accion = (texto: string, fn: () => Promise<unknown> | void, clase = "boton") => h("button", { class: clase, onclick: async () => {
      try {
        await fn();
      } catch (e) {
        sonido("mal");
        j.aviso(esc((e as Error).message));
      }
    } }, texto);
    if (f.situacion === "libre" || (f.situacion === "en venta" && !tuya)) {
      acciones.push(accion(`Comprar por ${euros(f.precioVenta ?? f.precio)}`, async () => {
        await con.llamar("hogarComprar", { id });
        sonido("moneda");
        j.aviso(`¡Enhorabuena! <b>${esc(f.nombre)}</b> ya es tuya. Entra y empieza a reformar.`);
        void ficha(id);
      }, "boton azul"));
      if (f.situacion === "libre") acciones.push(accion(`Alquilar: ${euros(f.alquiler * 2)} (fianza + 1.ª semana)`, async () => {
        await con.llamar("hogarAlquilar", { id });
        sonido("moneda");
        j.aviso(`Alquiler firmado. Se cobran <b>${euros(f.alquiler)}</b> cada semana.`);
        void ficha(id);
      }));
    }
    if (f.rol) acciones.push(accion(f.rol === "visita" ? "Visitar por dentro" : "Entrar", () => void entrarEnVivienda(j, id), f.rol === "visita" ? "boton" : "boton azul"));
    acciones.push(accion("Ver en el mapa", () => {
      j.cerrar();
      j.mundo.mirarA(f.x, f.y);
      j.mundo.pines([{ x: f.x, y: f.y, texto: f.nombre, clase: tuya ? "tuya" : "venta" }]);
    }));
    if (tuya || f.rol === "conviviente") acciones.push(accion("Vivir aquí", async () => {
      await con.llamar("hogarMudarse", { id });
      j.aviso(`Ahora vives en <b>${esc(f.nombre)}</b>. «Entrar en casa» te trae aquí.`);
    }));
    if (tuya && !id.startsWith("abuela:")) {
      if (f.modo === "alquiler") acciones.push(accion("Dejar el alquiler (te devuelven la fianza)", async () => {
        await con.llamar("hogarVenderBanco", { id });
        j.aviso("Has dejado el alquiler.");
        ir("mias");
      }, "boton rosa"));
      else {
        acciones.push(f.precioVenta
          ? accion(`Quitar de la venta (${euros(f.precioVenta)})`, async () => { await con.llamar("hogarQuitarVenta", { id }); void ficha(id); })
          : h("div", { class: "fila-botones" },
            h("input", { type: "number", class: "campo-precio", min: 100, value: f.valor, "aria-label": "Precio de venta" }),
            accion("Poner en venta a jugadores", async () => {
              const input = cuerpo.querySelector(".campo-precio") as HTMLInputElement;
              await con.llamar("hogarPonerEnVenta", { id, precio: Number(input.value) });
              j.aviso("Publicada en Hogar Linense. Cobrarás cuando otro jugador la compre.");
              void ficha(id);
            })));
        acciones.push(accion(`Vender al banco ya: ${euros(Math.round(f.valor * 0.9))}`, async () => {
          if (!confirm("¿Vender la vivienda al banco? Perderás lo que haya dentro.")) return;
          await con.llamar("hogarVenderBanco", { id });
          sonido("moneda");
          j.aviso("Vendida al banco.");
          ir("mias");
        }, "boton rosa"));
      }
    }
    poner(cuerpo, 
      h("button", { class: "enlace", onclick: () => ir(pestana) }, "← Volver"),
      h("div", { class: "meta" }, h("span", { class: "etiqueta" }, f.barrio.toUpperCase()), `${f.tipo === "piso" ? `Planta ${f.planta}` : f.tipo} · ${f.superficie} m²`),
      h("h2", { class: "titular-ficha" }, f.nombre),
      h("div", { class: "datos-ficha" },
        h("div", {}, h("small", {}, "PRECIO"), h("b", {}, euros(f.precioVenta ?? f.precio))),
        h("div", {}, h("small", {}, "VALOR HOY"), h("b", {}, euros(f.valor))),
        h("div", {}, h("small", {}, "ESTADO"), h("b", {}, `${f.estado}%`)),
        h("div", {}, h("small", {}, "DORMITORIOS"), h("b", {}, String(f.dormitorios)))),
      plano(f.habitaciones),
      h("h4", {}, "Inspección"),
      h("p", {}, problemas.length ? `Necesita: ${problemas.join(", ")}.` : "En perfecto estado."),
      h("h4", {}, "Materiales"),
      h("p", {}, f.materiales.join(" · ")),
      f.incluye.length ? h("p", {}, h("b", {}, "Incluye: "), f.incluye.join(", ")) : null,
      h("div", { class: "acciones-ficha" }, ...acciones.filter((a): a is Node => !!a)),
      tuya ? llaves(id, f.permisos?.roles ?? []) : null,
    );
  }

  /** Plano esquemático (proporcional al reparto real de superficies). */
  function plano(habs: { nombre: string; tipo: string; m2: number }[]) {
    const total = habs.reduce((s, x) => s + x.m2, 0);
    const colores: Record<string, string> = { salon: "#DCE6FF", cocina: "#FFF1C9", dormitorio: "#E8F7C0", bano: "#D7F0F5", patio: "#E2F0D5", terraza: "#E2F0D5", estudio: "#F3E2F5" };
    return h("div", { class: "plano-ficha" }, ...habs.map((x) =>
      h("div", { style: `flex:${x.m2};background:${colores[x.tipo] ?? "#EEE"}`, title: `${x.nombre}: ${x.m2} m²` }, h("b", {}, x.nombre), h("small", {}, `${x.m2} m²`))),
    h("small", { class: "total" }, `${total} m² útiles`));
  }

  /** Llaves: convivientes (editan y reforman) y ayudantes (solo reforman). */
  function llaves(id: string, roles: { id: string; nombre: string; rol: string }[]) {
    const caja = h("div", { class: "llaves" }, h("h4", {}, "Llaves y permisos"));
    caja.append(...roles.map((r) => h("div", { class: "fila-llave" },
      h("span", {}, `${r.nombre} · ${r.rol}`),
      h("button", { class: "enlace", onclick: async () => {
        await con.llamar("hogarPermiso", { id, jugador: r.id, rol: null }).catch((e) => j.aviso(esc((e as Error).message)));
        void ficha(id);
      } }, "Quitar llave"),
      h("button", { class: "enlace rosa", onclick: async () => {
        await con.llamar("hogarExpulsar", { id, jugador: r.id, bloquear: confirm("¿Bloquear también a este jugador?") }).catch((e) => j.aviso(esc((e as Error).message)));
        void ficha(id);
      } }, "Expulsar"))));
    void con.llamar<{ id: string; nombre: string; estado: string }[]>("amigos").then((amigos) => {
      const posibles = amigos.filter((a) => a.estado === "aceptada" && !roles.some((r) => r.id === a.id));
      if (!posibles.length) return void caja.append(h("p", { class: "vacio" }, "Haz amigos en Vecinos para darles llave."));
      caja.append(...posibles.map((a) => h("div", { class: "fila-llave" },
        h("span", {}, a.nombre),
        ...(["conviviente", "ayudante"] as const).map((rol) => h("button", { class: "enlace", onclick: async () => {
          await con.llamar("hogarPermiso", { id, jugador: a.id, rol }).catch((e) => j.aviso(esc((e as Error).message)));
          j.aviso(`Llave de ${rol} para <b>${esc(a.nombre)}</b>.`);
          void ficha(id);
        } }, rol === "conviviente" ? "Dar llave (convivir)" : "Llave de ayudante")))));
    }).catch(() => {});
    return caja;
  }

  /* ── Mis casas ─────────────────────────────────────────────────────── */

  async function mias() {
    cargando();
    try {
      const r = await con.llamar<{ residencia: string; viviendas: Ficha[]; compartidas: Ficha[] }>("hogarMias");
      poner(cuerpo, 
        h("p", { class: "web-aviso" }, "Tus viviendas. La que tiene la etiqueta VIVES AQUÍ es la que abre «Entrar en casa»."),
        ...r.viviendas.map((f) => h("div", { class: "articulo tarjeta-vivienda" },
          h("div", { class: "meta" },
            h("span", { class: `etiqueta${f.id === r.residencia ? " lima" : ""}` }, f.id === r.residencia ? "VIVES AQUÍ" : f.modo === "alquiler" ? "ALQUILADA" : "EN PROPIEDAD"),
            `${f.barrio} · ${f.superficie} m²${f.modo === "alquiler" && f.renta ? ` · ${f.renta} €/semana` : ""}${f.enVenta ? ` · En venta: ${euros(f.enVenta)}` : ""}`),
          h("h3", {}, f.nombre),
          h("div", { class: "fila-botones" },
            h("button", { class: "boton azul", onclick: () => void entrarEnVivienda(j, f.id) }, "Entrar"),
            h("button", { class: "boton", onclick: () => void ficha(f.id) }, "Gestionar")))),
        r.compartidas.length ? h("h4", {}, "Casas donde tienes llave") : null,
        ...r.compartidas.map((f) => h("div", { class: "articulo tarjeta-vivienda" },
          h("div", { class: "meta" }, h("span", { class: "etiqueta" }, String(f.compartida).toUpperCase()), `De ${f.titularNombre}`),
          h("h3", {}, f.nombre),
          h("button", { class: "boton azul", onclick: () => void entrarEnVivienda(j, f.id) }, "Entrar"))),
      );
      j.mundo.pines(r.viviendas.filter((f) => !f.id.startsWith("abuela:")).map((f) => ({ x: f.x, y: f.y, texto: f.nombre, clase: "tuya" })));
    } catch (e) {
      fallo(e);
    }
  }

  /* ── Encargos de reforma entre jugadores ───────────────────────────── */

  async function encargos() {
    cargando();
    try {
      const lista = await con.llamar<{ id: string; vivienda: string; barrio: string; tareas: string[]; pago: number; estado: string; propietarioNombre: string; mio: boolean; aceptadoPorMi: boolean; inmueble: string }[]>("hogarEncargos");
      poner(cuerpo, 
        h("p", { class: "web-aviso" }, "Trabajos de reforma de otros jugadores. El pago está en depósito: cobras en cuanto el servidor comprueba que está hecho."),
        ...(lista.length ? lista.map((e) => h("div", { class: "articulo" },
          h("div", { class: "meta" }, h("span", { class: `etiqueta${e.aceptadoPorMi ? " lima" : ""}` }, e.mio ? "TU ENCARGO" : e.aceptadoPorMi ? "ACEPTADO" : "SE BUSCA"), `${e.propietarioNombre} · ${e.barrio}`),
          h("h3", {}, `${e.vivienda}: ${e.tareas.join(", ")}`),
          h("p", {}, h("b", {}, euros(e.pago)), ` · ${e.estado}`),
          h("div", { class: "fila-botones" },
            !e.mio && e.estado === "abierto" ? h("button", { class: "boton azul", onclick: async () => {
              try {
                await con.llamar("hogarAceptarEncargo", { encargo: e.id });
                sonido("bien");
                j.aviso("Encargo aceptado: tienes llave de ayudante. ¡A trabajar!");
                void encargos();
              } catch (err) {
                j.aviso(esc((err as Error).message));
              }
            } }, "Aceptar") : null,
            e.aceptadoPorMi ? h("button", { class: "boton", onclick: () => void entrarEnVivienda(j, e.inmueble) }, "Ir a la casa") : null,
            e.aceptadoPorMi ? h("button", { class: "boton azul", onclick: async () => {
              try {
                await con.llamar("hogarCompletarEncargo", { encargo: e.id });
                sonido("moneda");
                j.aviso(`¡Trabajo comprobado! Cobras <b>${euros(e.pago)}</b>.`);
                void encargos();
              } catch (err) {
                j.aviso(esc((err as Error).message));
              }
            } }, "Entregar el trabajo") : null,
            e.mio ? h("button", { class: "boton rosa", onclick: async () => {
              try {
                await con.llamar("hogarCancelarEncargo", { encargo: e.id });
                j.aviso("Encargo cancelado. Te devuelven el depósito.");
                void encargos();
              } catch (err) {
                j.aviso(esc((err as Error).message));
              }
            } }, "Cancelar") : null,
          ))) : [h("p", { class: "vacio" }, "No hay encargos ahora mismo.")]),
      );
    } catch (e) {
      fallo(e);
    }
  }

  ir(pestana);
}
