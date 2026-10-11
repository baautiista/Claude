import { BARRIOS, type BarrioId } from "../datos/mapa";
import { OBJETOS, type ObjetoId } from "../datos/objetos";
import { PERSONAJES, type PersonajeId } from "../datos/personajes";
import { borrar, limitar, nivelAmistad, quitar, VIENTOS } from "../estado";
import * as historia from "../historia";
import type { Juego } from "../juego";
import { con } from "../red/conexion";
import { h, html } from "./dom";
import { retrato } from "./retrato";
import { alternarSonido, sonido, sonidoActivo } from "./sonido";

/** Mochila, diario y menú. */

export function abrirMochila(j: Juego) {
  const e = j.e;
  const ids = Object.keys(e.mochila) as ObjetoId[];
  j.hoja(
    "MOCHILA", `${e.dinero} € y lo que llevas`,
    ids.length
      ? h("div", { class: "objetos" }, ...ids.map((id) => {
          const o = OBJETOS[id];
          return h(
            "div", { class: "objeto" },
            h("span", { class: "bola", style: `background:${o.color}` }),
            h("b", {}, e.mochila[id]!),
            h("span", {}, o.nombre),
            o.comida
              ? h("button", {
                  onclick: async () => {
                    quitar(e, id);
                    e.comida = limitar(e.comida + o.comida!);
                    e.animo = limitar(e.animo + (o.animo ?? 0));
                    sonido("bien");
                    j.cerrar();
                    await j.pasar(15);
                    j.aviso(`${o.nombre}: <b>+${o.comida} comida</b>`);
                  },
                }, "Comer")
              : null,
          );
        }))
      : h("p", { class: "vacio" }, "La mochila está vacía."),
  );
}

export function abrirDiario(j: Juego) {
  const e = j.e;
  const obj = historia.objetivo(e);
  const pasos = [
    [1, "Llegaste a La Línea y Carmen te dio las llaves."],
    [2, "Abriste la caja: una foto de 1968, la llave del puesto 14 y una carta para Manuel Ríos."],
    [3, `Empezaste a trabajar ${e.oficio === "pescador" ? "en la barca de Antonio" : e.oficio === "hortelano" ? "en la huerta de Rafa" : "en la redacción de InfoLinense"}.`],
    [5, "Encontraste el banco de la foto en el Paseo de Poniente."],
    [6, "Lola te mandó a preguntar a Juani."],
    [7, "Juani te habló de Manolo y del puesto 14."],
    [8, "Andrés te contó el cierre de la Verja en 1969."],
    [10, "Reabriste el puesto 14 del Mercado."],
    [11, "Terminaste el capítulo 1."],
  ] as const;
  j.hoja(
    "DIARIO", "Tu historia en La Línea",
    h("div", { class: "seccion-titulo" }, obj.titulo),
    h("p", { class: "desc" }, h("strong", {}, "Ahora: "), obj.texto),
    ...pasos.filter(([n]) => e.paso >= n).map(([, t]) => h("p", { class: "desc", style: "margin-bottom:6px" }, `· ${t}`)),
    h("div", { class: "seccion-titulo" }, "Vecinos"),
    ...(Object.keys(PERSONAJES) as PersonajeId[]).map((p) =>
      h(
        "div", { class: "medidor" },
        html(`<div style="width:44px;height:44px;border-radius:50%;overflow:hidden">${retrato(PERSONAJES[p])}</div>`),
        h("div", {}, h("b", {}, PERSONAJES[p].nombre), " ", h("small", {}, `${nivelAmistad(e.amistad[p])} · ${PERSONAJES[p].rol}`), h("div", { class: "nivel" }, h("i", { style: `width:${e.amistad[p]}%` }))),
      ),
    ),
    h("div", { class: "seccion-titulo" }, "Reputación por barrio"),
    ...(Object.keys(BARRIOS) as BarrioId[]).map((b) =>
      h(
        "div", { class: "medidor", style: "grid-template-columns:1fr" },
        h("div", {}, h("b", {}, BARRIOS[b].nombre), " ", h("small", {}, `${Math.round(e.reputacion[b])}/100`), h("div", { class: "nivel" }, h("i", { style: `width:${e.reputacion[b]}%;background:var(--lima)` }))),
      ),
    ),
    h("div", { class: "seccion-titulo" }, "Tiempo"),
    h("p", { class: "desc" }, `Hoy: ${VIENTOS[e.viento].nombre}. ${VIENTOS[e.viento].efecto} Mañana: ${VIENTOS[e.vientoManana].nombre}.`),
  );
}

/** Salas (servidores) de la ciudad, con su ocupación. */
function salas(j: Juego) {
  const caja = h("div", { class: "calidad" }, h("p", { class: "vacio" }, "Cargando salas…"));
  void con.llamar<{ nombre: string; jugadores: number; capacidad: number }[]>("salas").then((lista) =>
    caja.replaceChildren(...lista.map((s) => h("button", {
      "aria-pressed": String(con.sala === s.nombre),
      disabled: s.jugadores >= s.capacidad && con.sala !== s.nombre,
      onclick: async () => {
        try {
          await con.llamar("unirseSala", { sala: s.nombre });
          con.sala = s.nombre;
          sonido("bien");
          j.cerrar();
          j.aviso(`Ahora juegas en <b>${s.nombre}</b>`);
        } catch (e) {
          j.aviso((e as Error).message);
        }
      },
    }, h("b", {}, s.nombre), h("small", {}, `${s.jugadores}/${s.capacidad} jugadores`)))));
  return caja;
}

/** Botón con confirmación en dos toques (el visor no admite confirm()). */
function nuevaPartida() {
  let armado = false;
  const b = h("button", { class: "accion" });
  const pintar = () => b.replaceChildren(h("span", {}, h("b", {}, armado ? "Toca otra vez para borrar la partida" : "Nueva partida"), h("small", {}, armado ? "Se perderá el progreso de esta partida" : "Borra la partida guardada")));
  b.addEventListener("click", () => {
    if (!armado) {
      armado = true;
      b.classList.add("historia");
      pintar();
      return;
    }
    borrar();
    // Con servidor también se vacía la partida guardada en la cuenta (el dinero y las casas siguen).
    void con.llamar("guardarPartida", { partida: null }).catch(() => {}).finally(() => window.dispatchEvent(new Event("mi-linea:portada")));
  });
  pintar();
  return b;
}

export function abrirMenu(j: Juego) {
  const boton = h("button", { class: "accion" });
  const pintarSonido = () => boton.replaceChildren(h("span", {}, h("b", {}, `Sonido: ${sonidoActivo() ? "activado" : "desactivado"}`), h("small", {}, "Efectos ligeros al tocar, cobrar y acertar")));
  boton.addEventListener("click", () => {
    alternarSonido();
    pintarSonido();
  });
  pintarSonido();
  const niveles = [["baja", "Baja", "Más fluido en móviles sencillos"], ["media", "Media", "Equilibrio: detalle y sombras"], ["alta", "Alta", "Oclusión ambiental y sombras finas"]] as const;
  const calidad = h("div", { class: "calidad", role: "group", "aria-label": "Calidad gráfica" });
  const pintarCalidad = () => calidad.replaceChildren(...niveles.map(([id, t, sub]) =>
    h("button", { "aria-pressed": String(j.mundo.calidad() === id), onclick: () => { j.mundo.calidad(id); sonido("toque"); pintarCalidad(); } }, h("b", {}, t), h("small", {}, sub))));
  pintarCalidad();
  const cuenta = con.modo === "servidor" && con.perfil
    ? [
        h("div", { class: "seccion-titulo" }, "Cuenta y servidor"),
        h("p", { class: "desc" }, `Conectado como ${con.perfil.usuario} en ${con.sala}. Tu partida, tu dinero y tus casas se guardan en el servidor.`),
        salas(j),
        h("div", { class: "acciones" }, j.boton({ icono: "cerrar", titulo: "Cerrar sesión", sub: "Para entrar con otra cuenta", fn: async () => { j.guardarTodo(true); await con.salir(); window.dispatchEvent(new Event("mi-linea:portada")); } })),
      ]
    : [h("div", { class: "seccion-titulo" }, "Cuenta"), h("p", { class: "desc" }, "Juegas sin servidor: la partida se guarda en este navegador. Abre el juego desde el servidor de Mi Línea para tener cuenta, amigos y casas compartidas.")];
  j.hoja(
    "AJUSTES", "Mi Línea",
    ...cuenta,
    h("div", { class: "seccion-titulo" }, "Calidad gráfica"),
    calidad,
    h("div", { class: "seccion-titulo" }, "Partida"),
    h("p", { class: "desc" }, "La partida se guarda sola en este dispositivo."),
    h("div", { class: "acciones" },
      boton,
      nuevaPartida(),
    ),
    h("div", { class: "seccion-titulo" }, "Créditos"),
    h("p", { class: "desc" }, "Un juego de InfoLinense ambientado en La Línea de la Concepción. Personajes e historias de ficción."),
    h("p", { class: "desc" }, "Mapa: esquema provisional del trazado de la ciudad. La versión final usa datos © colaboradores de OpenStreetMap (ODbL)."),
  );
}
