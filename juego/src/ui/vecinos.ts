import { OBJETOS, type ObjetoId } from "../datos/objetos";
import { cuantos, dar, quitar } from "../estado";
import { iconoJuego } from "../iconos";
import type { Juego } from "../juego";
import { EMOTES } from "../red";
import { con } from "../red/conexion";
import { esc, h, html } from "./dom";
import { retrato } from "./retrato";
import { sonido } from "./sonido";

/**
 * Vecinos (multijugador): jugadores cercanos con sus acciones, amigos y
 * solicitudes, chat de la zona y mensajes privados, ranking y mercadillo.
 * Todo pasa por la autoridad del juego (servidor o servicio local).
 */
type Pestana = "cerca" | "amigos" | "chat" | "ranking" | "mercadillo";

const NOMBRE_SALUDO: Record<(typeof EMOTES)[number], string> = {
  hola: "¡Hola!", risa: "Risas", bien: "¡Bien!", corazon: "Cariño", pez: "A pescar", tomate: "De la huerta", balon: "¡Aúpa Balona!", sol: "Buen día",
};

interface Cercano { id: string; nombre: string; ropa: string; piel: string; nivel: number; x: number; y: number; distancia: number; amigo: boolean }
interface Amigo { id: string; nombre: string; nivel: number; estado: "pendiente" | "aceptada"; entrante: boolean }
interface MensajeP { de: string; a: string; texto: string; t: number }

const fallo = (j: Juego) => (e: unknown) => {
  sonido("mal");
  j.aviso(esc((e as Error).message));
};

export function abrirVecinos(j: Juego, inicial: Pestana = "cerca", conQuien?: string) {
  let pestana = inicial;
  let privadoCon = conQuien ?? null;
  const cuerpo = h("div");
  const pestanas = h("div", { class: "pestanas", role: "tablist" });
  const pintarPestanas = () =>
    pestanas.replaceChildren(...([["cerca", "Cerca"], ["amigos", "Amigos"], ["chat", "Chat"], ["ranking", "Ranking"], ["mercadillo", "Mercado"]] as const).map(([id, t]) =>
      h("button", { role: "tab", "aria-selected": String(pestana === id), onclick: () => { pestana = id; privadoCon = null; sonido("toque"); pintar(); } }, t)));
  const pintar = () => {
    pintarPestanas();
    j.vivoChat = null;
    if (pestana === "cerca") void cerca(j, cuerpo, (id) => { pestana = "chat"; privadoCon = id; pintar(); });
    else if (pestana === "amigos") void amigos(j, cuerpo, (id) => { pestana = "chat"; privadoCon = id; pintar(); });
    else if (pestana === "chat") {
      j.contarSinLeer(0);
      void chat(j, cuerpo, privadoCon, (id) => { privadoCon = id; pintar(); });
    } else if (pestana === "ranking") void ranking(cuerpo);
    else void mercadillo(j, cuerpo);
  };
  j.hoja("MULTIJUGADOR", "Vecinos", estadoRed(), pestanas, cuerpo);
  pintar();
}

function estadoRed() {
  const texto = con.modo === "servidor"
    ? `${con.conectado ? "Conectado" : "Reconectando…"} · ${con.sala} · ${con.remotos.length} cerca`
    : `Modo sin servidor · ${con.remotos.length} en otras pestañas`;
  return h("div", { class: `estado-red${con.conectado ? "" : " solo"}` }, h("i"), texto);
}

/** Ficha de acciones sobre otro jugador. */
function acciones(j: Juego, p: { id: string; nombre: string; amigo?: boolean }, privado: (id: string) => void, volver: () => void) {
  const llamar = (op: string, args: Record<string, unknown>, ok: string) =>
    con.llamar(op, args).then(() => { sonido("bien"); j.aviso(ok); volver(); }).catch(fallo(j));
  const [x, y] = j.mundo.posicionJugador;
  return h("div", { class: "acciones-jugador" },
    p.amigo ? null : h("button", { onclick: () => llamar("solicitarAmistad", { a: p.id }, `Solicitud enviada a <b>${esc(p.nombre)}</b>`) }, html(iconoJuego("corazon", 18)), "Amistad"),
    h("button", { onclick: () => privado(p.id) }, html(iconoJuego("hola", 18)), "Mensaje"),
    h("button", { onclick: () => llamar("invitar", { a: p.id, tipo: "unirse", escena: con.escena, x, y }, `Invitación enviada a <b>${esc(p.nombre)}</b>`) }, html(iconoJuego("ir", 18)), "Invitar"),
    h("button", { class: "peligro", onclick: () => llamar("bloquear", { a: p.id }, `Has bloqueado a <b>${esc(p.nombre)}</b>. No os veréis ni os podréis escribir.`) }, "Bloquear"),
    h("button", { class: "peligro", onclick: () => denunciar(j, p) }, "Denunciar"),
  );
}

function denunciar(j: Juego, p: { id: string; nombre: string }) {
  const motivos: [string, string][] = [["insultos", "Insultos"], ["acoso", "Acoso"], ["trampas", "Trampas"], ["nombre", "Nombre ofensivo"], ["spam", "Spam"], ["otro", "Otro"]];
  const texto = h("input", { type: "text", maxlength: 200, placeholder: "Cuéntanos qué ha pasado (opcional)" }) as HTMLInputElement;
  j.hoja("DENUNCIA", `Denunciar a ${p.nombre}`,
    h("p", { class: "desc" }, "El equipo de moderación revisará la denuncia. Mientras, puedes bloquear al jugador."),
    h("div", { class: "campo" }, texto),
    h("div", { class: "acciones" }, ...motivos.map(([id, t]) => j.boton({ icono: "objetivo", titulo: t, fn: () => void con.llamar("denunciar", { a: p.id, motivo: id, texto: texto.value }).then(() => { j.cerrar(); j.aviso("Denuncia enviada. Gracias."); }).catch(fallo(j)) }))),
  );
}

async function cerca(j: Juego, cuerpo: HTMLElement, privado: (id: string) => void) {
  cuerpo.replaceChildren(h("p", { class: "vacio" }, "Buscando vecinos…"));
  const lista = await con.llamar<Cercano[]>("cercanos").catch(() => [] as Cercano[]);
  let abierto: string | null = null;
  const pintar = () => cuerpo.replaceChildren(
    h("div", { class: "seccion-titulo" }, "Saluda a quien esté cerca"),
    h("div", { class: "emotes" }, ...EMOTES.map((e) => h("button", { "aria-label": `Saludar: ${NOMBRE_SALUDO[e]}`, title: NOMBRE_SALUDO[e], onclick: () => { sonido("bien"); j.saludar(e); j.cerrar(); }, html: iconoJuego(e, 30) }))),
    h("div", { class: "seccion-titulo" }, `En esta zona (${lista.length})`),
    lista.length
      ? h("div", { class: "acciones" }, ...lista.flatMap((v) => [
          h("button", { class: `accion${abierto === v.id ? " abierta" : ""}`, onclick: () => { abierto = abierto === v.id ? null : v.id; pintar(); } },
            h("span", { class: "ico", html: retrato({ piel: v.piel, pelo: "#2B1B12", ropa: v.ropa }, v.amigo ? "#2E7D4F" : "#FF1254") }),
            h("span", {}, h("b", {}, v.nombre + (v.amigo ? " · amigo" : "")), h("small", {}, `Nivel ${v.nivel} · a ${v.distancia * 2} m`)),
            h("span", { class: "precio ver", onclick: (ev: Event) => { ev.stopPropagation(); j.cerrar(); j.mundo.mirarA(v.x, v.y); } }, "Ver")),
          abierto === v.id ? acciones(j, v, privado, () => void cerca(j, cuerpo, privado)) : null,
        ].filter(Boolean) as HTMLElement[]))
      : h("p", { class: "vacio" }, con.modo === "servidor" ? "No hay nadie más en esta zona ahora mismo." : "Juega con el servidor de Mi Línea para ver a otros jugadores."),
  );
  pintar();
}

async function amigos(j: Juego, cuerpo: HTMLElement, privado: (id: string) => void) {
  cuerpo.replaceChildren(h("p", { class: "vacio" }, "Cargando…"));
  const [lista, enLinea, bloqueados] = await Promise.all([
    con.llamar<Amigo[]>("amigos").catch(() => [] as Amigo[]),
    con.llamar<string[]>("enLinea").catch(() => [] as string[]),
    con.llamar<{ id: string; nombre: string }[]>("bloqueados").catch(() => []),
  ]);
  const recargar = () => void amigos(j, cuerpo, privado);
  const entrantes = lista.filter((a) => a.entrante);
  const aceptados = lista.filter((a) => a.estado === "aceptada").sort((a, b) => Number(enLinea.includes(b.id)) - Number(enLinea.includes(a.id)));
  const enviados = lista.filter((a) => a.estado === "pendiente" && !a.entrante);
  const [x, y] = j.mundo.posicionJugador;
  cuerpo.replaceChildren(...[
    entrantes.length ? h("div", { class: "seccion-titulo" }, "Solicitudes") : null,
    ...entrantes.map((a) => h("div", { class: "accion" },
      h("span", { class: "ico", html: iconoJuego("gente", 26) }), h("span", {}, h("b", {}, a.nombre), h("small", {}, `Nivel ${a.nivel} quiere ser tu amigo`)),
      h("button", { class: "precio", onclick: () => void con.llamar("aceptarAmistad", { de: a.id }).then(recargar).catch(fallo(j)) }, "Aceptar"),
      h("button", { class: "precio gris", onclick: () => void con.llamar("eliminarAmistad", { a: a.id }).then(recargar).catch(fallo(j)) }, "No"))),
    h("div", { class: "seccion-titulo" }, `Amigos (${aceptados.length})`),
    aceptados.length
      ? h("div", { class: "acciones" }, ...aceptados.map((a) => {
          const online = enLinea.includes(a.id);
          return h("div", { class: "accion" },
            h("span", { class: `ico estado${online ? " online" : ""}`, html: iconoJuego("gente", 26) }),
            h("span", {}, h("b", {}, a.nombre), h("small", {}, `${online ? "En línea" : "Desconectado"} · Nv ${a.nivel}`)),
            h("button", { class: "precio", onclick: () => privado(a.id) }, "Escribir"),
            online ? h("button", { class: "precio", onclick: () => void con.llamar("invitar", { a: a.id, tipo: "unirse", escena: con.escena, x, y }).then(() => j.aviso(`Invitación enviada a <b>${esc(a.nombre)}</b>`)).catch(fallo(j)) }, "Invitar") : null,
            h("button", { class: "precio gris", title: "Quitar amigo", onclick: () => void con.llamar("eliminarAmistad", { a: a.id }).then(recargar).catch(fallo(j)) }, "✕"));
        }))
      : h("p", { class: "vacio" }, "Añade amigos desde la pestaña «Cerca»."),
    enviados.length ? h("p", { class: "nota" }, `Solicitudes enviadas: ${enviados.map((a) => a.nombre).join(", ")}`) : null,
    bloqueados.length ? h("div", { class: "seccion-titulo" }, "Bloqueados") : null,
    ...bloqueados.map((b) => h("div", { class: "accion" }, h("span", {}, h("b", {}, b.nombre)),
      h("button", { class: "precio gris", onclick: () => void con.llamar("desbloquear", { a: b.id }).then(recargar).catch(fallo(j)) }, "Desbloquear"))),
  ].filter(Boolean) as HTMLElement[]);
}

async function chat(j: Juego, cuerpo: HTMLElement, privadoCon: string | null, elegir: (id: string | null) => void) {
  const entrada = h("input", { type: "text", maxlength: 200, placeholder: privadoCon ? "Mensaje privado…" : "Escribe a los de esta zona…", "aria-label": "Mensaje" }) as HTMLInputElement;
  const registro = h("div", { class: "chat-registro", role: "log", "aria-live": "polite" });
  const amigosLista = await con.llamar<Amigo[]>("amigos").catch(() => [] as Amigo[]);
  const conversaciones = amigosLista.filter((a) => a.estado === "aceptada");
  const nombreDe = (id: string) => amigosLista.find((a) => a.id === id)?.nombre ?? con.remotos.find((r) => r.id === id)?.nombre ?? "Vecino";
  const linea = (nombre: string, texto: string, mio: boolean, hora: number) =>
    h("div", { class: `chat-linea${mio ? " mia" : ""}` }, h("b", {}, nombre), h("span", {}, texto), h("small", {}, new Date(hora).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })));
  const pintarRegistro = async () => {
    if (privadoCon) {
      const msgs = await con.llamar<MensajeP[]>("conversacion", { con: privadoCon }).catch(() => [] as MensajeP[]);
      registro.replaceChildren(...msgs.map((m) => linea(m.de === con.jugador ? "Tú" : nombreDe(privadoCon!), m.texto, m.de === con.jugador, m.t)));
    } else registro.replaceChildren(...j.chatPublico.map((m) => linea(m.de === con.jugador ? "Tú" : m.nombre, m.texto, m.de === con.jugador, m.hora)));
    if (!registro.children.length) registro.append(h("p", { class: "vacio" }, privadoCon ? "Aún no os habéis escrito." : "Nadie ha dicho nada todavía por aquí."));
    registro.scrollTop = registro.scrollHeight;
  };
  const enviar = async () => {
    const t = entrada.value.trim();
    if (!t) return;
    entrada.value = "";
    if (privadoCon) await con.llamar("enviarPrivado", { a: privadoCon, texto: t }).catch(fallo(j));
    else con.chat(t);
    sonido("toque");
    void pintarRegistro();
  };
  entrada.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") void enviar();
  });
  j.vivoChat = () => void pintarRegistro();
  cuerpo.replaceChildren(
    h("div", { class: "chat-canales" },
      h("button", { "aria-pressed": String(!privadoCon), onclick: () => elegir(null) }, "Zona"),
      ...conversaciones.map((a) => h("button", { "aria-pressed": String(privadoCon === a.id), onclick: () => elegir(a.id) }, a.nombre)),
      privadoCon && !conversaciones.some((a) => a.id === privadoCon) ? h("button", { "aria-pressed": "true" }, nombreDe(privadoCon)) : null,
    ),
    registro,
    h("div", { class: "chat-entrada" }, entrada, h("button", { class: "boton azul", onclick: () => void enviar() }, "Enviar")),
  );
  await pintarRegistro();
}

async function ranking(cuerpo: HTMLElement) {
  cuerpo.replaceChildren(h("p", { class: "vacio" }, "Cargando…"));
  const filas = await con.llamar<{ id: string; nombre: string; nivel: number; xp: number }[]>("ranking").catch(() => []);
  cuerpo.replaceChildren(
    h("div", { class: "seccion-titulo" }, "Los linenses con más experiencia"),
    filas.length
      ? h("div", {}, ...filas.map((f, i) =>
          h("div", { class: `fila-ranking${f.id === con.jugador ? " yo" : ""}` },
            h("span", { class: "pos" }, i + 1),
            h("span", {}, h("b", {}, f.nombre + (f.id === con.jugador ? " (tú)" : "")), h("small", {}, ` · Nv ${f.nivel}`)),
            h("span", { class: "xpt" }, `${f.xp} XP`))))
      : h("p", { class: "vacio" }, "Aún no hay nadie en el ranking."),
  );
}

interface Oferta { id: string; vendedor: string; apodo: string; objeto: string; cantidad: number; precio: number; estado: string; mia: boolean }

async function mercadillo(j: Juego, cuerpo: HTMLElement) {
  cuerpo.replaceChildren(h("p", { class: "vacio" }, "Cargando…"));
  const ofertas = (await con.llamar<Oferta[]>("ofertas").catch(() => [] as Oferta[])).filter((o) => o.objeto in OBJETOS);
  const recargar = () => void mercadillo(j, cuerpo);
  const ajenas = ofertas.filter((o) => !o.mia && o.estado === "abierta");
  const mias = ofertas.filter((o) => o.mia);
  const fila = (o: Oferta, accion: HTMLElement) => {
    const ob = OBJETOS[o.objeto as ObjetoId];
    return h("div", { class: "accion" },
      h("span", { class: "ico", style: `background:${ob.color}` }),
      h("span", {}, h("b", {}, `${o.cantidad} × ${o.cantidad === 1 ? ob.nombre : ob.plural}`), h("small", {}, o.mia ? (o.estado === "vendida" ? `Vendido por ${o.precio} € (ya cobrado)` : "En venta") : `Vende ${o.apodo}`)),
      accion);
  };
  const comprar = (o: Oferta) => h("button", {
    class: "precio", disabled: j.e.dinero < o.precio,
    onclick: async () => {
      try {
        const r = await con.llamar<{ dinero: number; objeto: string; cantidad: number }>("comprarOferta", { id: o.id });
        j.e.dinero = r.dinero;
        dar(j.e, r.objeto as ObjetoId, r.cantidad);
        sonido("bien");
        j.aviso(`Comprado: <b>${r.cantidad} ${OBJETOS[r.objeto as ObjetoId].plural}</b>`);
        j.refrescar();
      } catch (e) {
        fallo(j)(e);
      }
      recargar();
    },
  }, `${o.precio} €`);
  const retirar = (o: Oferta) => h("button", {
    class: "precio",
    onclick: async () => {
      try {
        const r = await con.llamar<{ devolver: boolean; objeto: string; cantidad: number }>("retirarOferta", { id: o.id });
        if (r.devolver) dar(j.e, r.objeto as ObjetoId, r.cantidad);
        sonido("bien");
        j.refrescar();
      } catch (e) {
        fallo(j)(e);
      }
      recargar();
    },
  }, o.estado === "vendida" ? "Archivar" : "Retirar");
  const propios = (Object.keys(j.e.mochila) as ObjetoId[]).filter((id) => cuantos(j.e, id) > 0);
  const sel = h("select", { "aria-label": "Qué vendes" }, ...propios.map((id) => h("option", { value: id }, `${OBJETOS[id].nombre} (${cuantos(j.e, id)})`))) as HTMLSelectElement;
  const cant = h("input", { type: "number", min: 1, max: 20, value: 1, "aria-label": "Cantidad" }) as HTMLInputElement;
  const precio = h("input", { type: "number", min: 1, max: 500, value: 5, "aria-label": "Precio en euros" }) as HTMLInputElement;
  const vender = h("button", {
    class: "boton azul", disabled: !propios.length,
    onclick: async () => {
      const id = sel.value as ObjetoId;
      const n = Math.max(1, Math.min(cuantos(j.e, id), Math.round(Number(cant.value) || 1)));
      const p = Math.max(1, Math.min(500, Math.round(Number(precio.value) || 1)));
      if (!quitar(j.e, id, n)) return;
      try {
        await con.llamar("publicarOferta", { objeto: id, cantidad: n, precio: p });
        sonido("bien");
        j.aviso(`En el mercadillo: <b>${n} ${OBJETOS[id].plural}</b> por ${p} €`);
      } catch (e) {
        dar(j.e, id, n);
        fallo(j)(e);
      }
      j.refrescar();
      recargar();
    },
  }, "Poner a la venta");
  cuerpo.replaceChildren(...[
    h("p", { class: "desc" }, "Compra y vende cosechas, pescado y platos. El pago lo hace el servidor: cobras en cuanto alguien compra."),
    h("div", { class: "seccion-titulo" }, "En venta ahora"),
    ajenas.length ? h("div", { class: "acciones" }, ...ajenas.map((o) => fila(o, comprar(o)))) : h("p", { class: "vacio" }, "No hay nada a la venta. ¡Sé el primero!"),
    mias.length ? h("div", { class: "seccion-titulo" }, "Tus puestos") : null,
    mias.length ? h("div", { class: "acciones" }, ...mias.map((o) => fila(o, retirar(o)))) : null,
    h("div", { class: "seccion-titulo" }, "Vender"),
    propios.length ? h("div", { class: "vender" }, sel, cant, precio) : h("p", { class: "vacio" }, "Tu mochila está vacía."),
    propios.length ? vender : null,
  ].filter(Boolean) as HTMLElement[]);
}
