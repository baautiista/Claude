import { OBJETOS, type ObjetoId } from "../datos/objetos";
import { amistad, dar, ganarXP, publicar, reputacion } from "../estado";
import * as historia from "../historia";
import type { Juego } from "../juego";
import { h } from "./dom";
import { sonido } from "./sonido";

/** Los tres oficios de la Temporada 1, cada uno con su minijuego corto. */

async function terminarTurno(j: Juego, pago: number, botin: Partial<Record<ObjetoId, number>>, energia: number, resumen: string) {
  const e = j.e;
  e.dinero += pago;
  for (const [id, n] of Object.entries(botin) as [ObjetoId, number][]) if (n > 0) dar(e, id, n);
  e.turnoDia = e.dia;
  e.turnos += 1;
  ganarXP(e, 6);
  e.social = Math.min(100, e.social + 8);
  sonido("moneda");
  const lista = (Object.entries(botin) as [ObjetoId, number][]).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${n === 1 ? OBJETOS[id].nombre.toLowerCase() : OBJETOS[id].plural}`);
  j.pantalla(
    h(
      "div", { class: "mini" },
      h("span", { class: "etiqueta lima" }, "TURNO TERMINADO"),
      h("h2", {}, `+${pago} €`),
      h("p", { class: "ayuda" }, resumen),
      lista.length ? h("p", { class: "ayuda" }, `Te llevas: ${lista.join(", ")}.`) : null,
      h("div", { class: "espacio", style: "flex:1" }),
      h("button", {
        class: "boton",
        onclick: async () => {
          j.cerrar();
          if (await j.pasar(180, energia)) return;
          await historia.trasTurno(j);
        },
      }, "Volver a la ciudad"),
    ),
  );
}

/* ── Pesca en La Atunara ─────────────────────────────────────────────── */

export async function faena(j: Juego) {
  const e = j.e;
  if (e.viento === "levanteFuerte") {
    await j.decir(["antonio", "Con este levante no sale ni el más valiente. Hoy toca remendar redes en tierra. Vuelve mañana."]);
    return;
  }
  if (!j.puede(25)) return;
  const ancho = e.viento === "levante" ? 0.14 : e.viento === "calma" ? 0.22 : 0.26;
  const lances = 5;
  let lance = 0;
  const botin: Partial<Record<ObjetoId, number>> = {};
  const chips = h("div", { class: "lances" });
  const zona = h("div", { class: "zona" });
  const centro = h("div", { class: "centro" });
  const aguja = h("div", { class: "aguja" });
  const estado = h("div", { class: "mar-fondo" }, "Antonio para el motor. «Ahí abajo hay pescado. Atento.»");
  let objetivo = 0.5;
  let t0 = performance.now();
  let vivo = true;
  const colocar = () => {
    objetivo = 0.18 + Math.random() * 0.64;
    zona.style.left = `${(objetivo - ancho / 2) * 100}%`;
    zona.style.width = `${ancho * 100}%`;
    centro.style.left = `${(objetivo - ancho / 6) * 100}%`;
    centro.style.width = `${(ancho / 3) * 100}%`;
  };
  const posicion = () => (Math.sin(((performance.now() - t0) / 1000) * (1.6 + lance * 0.35)) + 1) / 2;
  const animar = () => {
    if (!vivo) return;
    aguja.style.left = `${posicion() * 100}%`;
    requestAnimationFrame(animar);
  };
  const boton = h("button", {
    class: "boton",
    onclick: () => {
      const d = Math.abs(posicion() - objetivo);
      let texto: string;
      if (d < ancho / 6) {
        const pulpo = Math.random() < 0.3;
        const id: ObjetoId = pulpo ? "pulpo" : "camaron";
        const n = pulpo ? 1 : 3;
        botin[id] = (botin[id] ?? 0) + n;
        texto = pulpo ? "¡Un pulpo! Antonio silba." : "¡Lance perfecto! Camarones a puñados.";
        sonido("bien");
        chips.append(h("span", { class: "chip lima" }, pulpo ? "Pulpo" : "Camarón ×3"));
      } else if (d < ancho / 2) {
        const id: ObjetoId = Math.random() < 0.55 ? "sardina" : "boqueron";
        botin[id] = (botin[id] ?? 0) + 2;
        texto = `Buen lance: ${OBJETOS[id].plural}.`;
        sonido("toque");
        chips.append(h("span", { class: "chip" }, `${OBJETOS[id].nombre} ×2`));
      } else {
        texto = "Red vacía. «Paciencia», dice Antonio.";
        sonido("mal");
        chips.append(h("span", { class: "chip rosa" }, "Nada"));
      }
      lance++;
      estado.textContent = texto;
      if (lance >= lances) {
        vivo = false;
        const total = Object.values(botin).reduce((s, n) => s + (n ?? 0), 0);
        amistad(e, "antonio", 5);
        reputacion(e, "atunara", 3);
        void terminarTurno(j, 10, botin, 25, total ? `Antonio reparte la captura: tu parte va contigo. «${total > 8 ? "Hoy has pescado como un atunareño." : "Mañana, mejor."}»` : "Mal día de pesca. Antonio te paga el jornal igualmente.");
        return;
      }
      t0 = performance.now() - Math.random() * 1000;
      colocar();
    },
  }, "¡Recoger la red!");
  colocar();
  j.pantalla(
    h(
      "div", { class: "mini" },
      h("span", { class: "etiqueta lima" }, "LA ATUNARA · FAENA"),
      h("h2", {}, "Echa la red en su momento"),
      h("p", { class: "ayuda" }, `Recoge cuando la aguja pase por la zona verde. En el centro, captura especial. ${e.viento === "levante" ? "Con levante, la zona es más estrecha." : ""}`),
      chips,
      h("div", { class: "red" }, zona, centro, aguja),
      estado,
      boton,
    ),
  );
  animar();
}

/* ── Plagas en la huerta del Zabal ───────────────────────────────────── */

export function jornadaHuerta(j: Juego) {
  const e = j.e;
  if (!j.puede(25)) return;
  const DURACION = 20;
  let atrapados = 0;
  let perdidos = 0;
  const casillas = Array.from({ length: 9 }, () => h("button", { class: "planta", "aria-label": "Planta" }, h("span", { html: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 7-8 7zM12 14c0-3-2-5-7-5 0 4 2 5 7 5z"/></svg>' })));
  const marcador = h("div", { class: "marcador" });
  const reloj = h("span", { class: "chip lima" });
  const pintar = (resta: number) => {
    reloj.textContent = `${Math.ceil(resta)} s`;
    marcador.replaceChildren(reloj, h("span", { class: "chip" }, `Pulgones fuera: ${atrapados}`), h("span", { class: "chip rosa" }, `Se escapan: ${perdidos}`));
  };
  const timers: number[] = [];
  casillas.forEach((c) => {
    c.addEventListener("pointerdown", () => {
      const bicho = c.querySelector(".bicho");
      if (!bicho) return;
      bicho.remove();
      c.classList.remove("plaga");
      atrapados++;
      sonido("toque");
    });
  });
  const aparecer = () => {
    const libres = casillas.filter((c) => !c.querySelector(".bicho"));
    if (!libres.length) return;
    const c = libres[Math.floor(Math.random() * libres.length)];
    const b = h("span", { class: "bicho" }, "×");
    c.classList.add("plaga");
    c.append(b);
    timers.push(window.setTimeout(() => {
      if (b.isConnected) {
        b.remove();
        c.classList.remove("plaga");
        perdidos++;
      }
    }, e.viento === "levante" || e.viento === "levanteFuerte" ? 1300 : 1700));
  };
  const inicio = performance.now();
  let ultimo = 0;
  let vivo = true;
  const bucle = (t: number) => {
    if (!vivo) return;
    const pasado = (t - inicio) / 1000;
    if (t - ultimo > Math.max(380, 760 - pasado * 18)) {
      ultimo = t;
      aparecer();
    }
    pintar(DURACION - pasado);
    if (pasado >= DURACION) {
      vivo = false;
      timers.forEach(clearTimeout);
      const tomates = Math.min(5, 1 + Math.floor(atrapados / 5));
      const pimientos = atrapados >= 15 ? 2 : 0;
      amistad(e, "rafa", 5);
      reputacion(e, "zabal", 3);
      void terminarTurno(j, 8 + Math.min(atrapados, 22), { tomate: tomates, pimiento: pimientos }, 25,
        perdidos > atrapados ? "El pulgón ha ganado esta vez. Rafa se rasca la cabeza: «Mañana madrugamos más»." : `Rafa revisa los bancales: «Así da gusto». Has salvado ${atrapados} plantas.`);
      return;
    }
    requestAnimationFrame(bucle);
  };
  pintar(DURACION);
  j.pantalla(
    h(
      "div", { class: "mini" },
      h("span", { class: "etiqueta lima" }, "EL ZABAL · HUERTA"),
      h("h2", {}, "Quita el pulgón a tiempo"),
      h("p", { class: "ayuda" }, `Toca las plantas en cuanto aparezca la plaga. ${e.viento.startsWith("levante") ? "Con levante, la plaga corre más." : ""}`),
      marcador,
      h("div", { class: "bancal" }, ...casillas),
    ),
  );
  requestAnimationFrame(bucle);
}

/* ── Redacción de InfoLinense ────────────────────────────────────────── */

type Veredicto = "Confirmado" | "Desmentido" | "Sin confirmar";

interface Soplo {
  seccion: string;
  soplo: string;
  fuentes: readonly [string, string][];
  afirmaciones: readonly [string, Veredicto][];
  titulares: readonly [string, "bien" | "sensacionalista" | "falso"][];
  entradilla: string;
}

const SOPLOS: readonly Soplo[] = [
  {
    seccion: "CIUDAD",
    soplo: "Un lector escribe: «¡Cierra la churrería de la Plaza para siempre! Dicen que por una multa».",
    fuentes: [["Dueño de la churrería", "«Cerramos un mes por reformas. Volvemos el 1 de noviembre, con horno nuevo»."], ["Cartel en la persiana", "«Cerrado por obras. Disculpen las molestias»."], ["Vecino del bloque", "«Yo he oído que es por una multa, pero no sé de quién»."]],
    afirmaciones: [["La churrería cierra para siempre", "Desmentido"], ["Reabrirá el 1 de noviembre", "Confirmado"], ["El cierre se debe a una multa", "Sin confirmar"]],
    titulares: [["La churrería de la Plaza cierra un mes por reformas y vuelve en noviembre", "bien"], ["ADIÓS PARA SIEMPRE a la churrería más querida de La Línea", "sensacionalista"], ["Multan y cierran la churrería de la Plaza", "falso"]],
    entradilla: "El negocio reabrirá el 1 de noviembre con horno nuevo, según confirma su dueño.",
  },
  {
    seccion: "CURIOSIDADES",
    soplo: "Circula un vídeo: «¡Una orca en la bahía, frente a Poniente!».",
    fuentes: [["Pescador que grabó el vídeo", "«Lo grabé ayer a las siete, desde la barca, frente al paseo»."], ["Bióloga marina consultada", "«Por la aleta y el tamaño es un delfín mular, habitual en la bahía»."], ["Comentario en redes", "«Dicen que se ha quedado a vivir aquí»."]],
    afirmaciones: [["El vídeo se grabó ayer frente a Poniente", "Confirmado"], ["El animal es una orca", "Desmentido"], ["Se ha quedado a vivir en la bahía", "Sin confirmar"]],
    titulares: [["Un delfín mular se deja ver frente al Paseo de Poniente", "bien"], ["NO TE VAS A CREER lo que apareció en la bahía", "sensacionalista"], ["Una orca se instala en la bahía de Algeciras", "falso"]],
    entradilla: "Un pescador grabó al animal desde su barca; una bióloga confirma que se trata de un delfín mular.",
  },
  {
    seccion: "CULTURA",
    soplo: "Mensaje a la redacción: «Habrá concierto gratis en la caseta municipal y uno sorpresa el último día».",
    fuentes: [["Comisión de fiestas", "«El concierto del viernes está cerrado. Entrada libre hasta completar aforo»."], ["Cartel oficial", "«Viernes, 23:00. Entrada libre»."], ["Amigo del mensajero", "«Me han dicho que el domingo viene alguien famoso»."]],
    afirmaciones: [["Hay concierto el viernes", "Confirmado"], ["La entrada es libre", "Confirmado"], ["Habrá un concierto sorpresa el domingo", "Sin confirmar"]],
    titulares: [["Concierto con entrada libre el viernes en la caseta municipal", "bien"], ["El concierto que NADIE te ha contado", "sensacionalista"], ["Dos conciertos gratis y una estrella sorpresa en la Feria", "falso"]],
    entradilla: "La comisión de fiestas confirma la cita del viernes a las 23:00; el aforo es limitado.",
  },
  {
    seccion: "CIUDAD",
    soplo: "Llamada a la redacción: «En el Mercado van a cerrar la mitad de los puestos».",
    fuentes: [["Asociación de comerciantes", "«Hay seis puestos vacíos y queremos sacarlos a concurso para gente joven»."], ["Juani, tendera", "«Cerrar, aquí no cierra nadie. Lo que hay son puestos vacíos desde hace años»."], ["Vecina en la cola", "«Seguro que lo convierten en un centro comercial»."]],
    afirmaciones: [["Van a cerrar la mitad de los puestos", "Desmentido"], ["Hay seis puestos vacíos", "Confirmado"], ["El Mercado será un centro comercial", "Sin confirmar"]],
    titulares: [["El Mercado busca gente joven para sus seis puestos vacíos", "bien"], ["El FIN del Mercado de toda la vida", "sensacionalista"], ["Cierra la mitad del Mercado de Abastos", "falso"]],
    entradilla: "Los comerciantes quieren sacar a concurso los puestos sin actividad para atraer nuevos negocios.",
  },
];

export function turnoRedaccion(j: Juego) {
  const e = j.e;
  if (!j.puede(20)) return;
  const s = SOPLOS[e.turnos % SOPLOS.length];
  const respuestas: (Veredicto | null)[] = s.afirmaciones.map(() => null);
  const continuar = h("button", { class: "boton", disabled: true, onclick: () => titular() }, "Elegir titular");
  const pantalla = (...hijos: (Node | null)[]) =>
    j.pantalla(h("div", { class: "mini" }, h("span", { class: "etiqueta lima" }, `INFOLINENSE · ${s.seccion}`), ...hijos.filter((x): x is Node => x !== null)));

  pantalla(
    h("h2", {}, "Contrasta antes de publicar"),
    h("p", { class: "ayuda" }, s.soplo),
    ...s.fuentes.map(([quien, dice]) => h("div", { class: "fuente" }, h("b", {}, quien), dice)),
    h("p", { class: "ayuda", style: "margin-top:12px" }, "Según las fuentes, cada afirmación está…"),
    ...s.afirmaciones.map(([texto], i) => {
      const botones = (["Confirmado", "Desmentido", "Sin confirmar"] as Veredicto[]).map((v) =>
        h("button", {
          "aria-pressed": "false",
          onclick: (ev: Event) => {
            respuestas[i] = v;
            botones.forEach((b) => b.setAttribute("aria-pressed", String(b === ev.currentTarget)));
            (continuar as HTMLButtonElement).disabled = respuestas.some((r) => r === null);
            sonido("toque");
          },
        }, v),
      );
      return h("div", { class: "afirmacion" }, h("p", {}, texto), h("div", { class: "veredictos" }, ...botones));
    }),
    continuar,
  );

  const titular = () => {
    let elegido = -1;
    const publicarBtn = h("button", { class: "boton", disabled: true, onclick: () => fin(elegido) }, "Publicar en InfoLinense");
    const opciones = s.titulares.map(([t], i) =>
      h("button", {
        "aria-pressed": "false",
        onclick: (ev: Event) => {
          elegido = i;
          opciones.forEach((b) => b.setAttribute("aria-pressed", String(b === ev.currentTarget)));
          (publicarBtn as HTMLButtonElement).disabled = false;
          sonido("toque");
        },
      }, t),
    );
    pantalla(
      h("h2", {}, "Elige el titular"),
      h("p", { class: "ayuda" }, "Marta lo repite siempre: dato, contexto, explicación. Sin exagerar y sin afirmar lo que no está confirmado."),
      h("div", { class: "titulares" }, ...opciones),
      publicarBtn,
    );
  };

  const fin = async (i: number) => {
    const aciertos = s.afirmaciones.filter(([, v], n) => respuestas[n] === v).length;
    const [texto, tipo] = s.titulares[i];
    const bienTitulado = tipo === "bien";
    const puntos = aciertos + (bienTitulado ? 2 : 0);
    if (bienTitulado) {
      publicar(e, { seccion: s.seccion, titular: texto, entradilla: s.entradilla, tuya: true });
      reputacion(e, "centro", 2 + aciertos);
      amistad(e, "marta", 4 + aciertos);
      sonido("bien");
    } else sonido("mal");
    const comentario = bienTitulado
      ? aciertos === 3 ? "«Impecable. Esto es periodismo local». Marta lo publica tal cual." : "«El titular está bien, pero repasa las fuentes: alguna afirmación la has dado por buena sin estarlo»."
      : tipo === "sensacionalista"
        ? "Marta tacha el titular en rojo: «Aquí no hacemos “no te lo vas a creer”. Lo reescribo yo»."
        : "Marta niega con la cabeza: «Eso no lo dice ninguna fuente. Si lo publicamos, mañana tenemos que rectificar».";
    if (!bienTitulado) publicar(e, { seccion: s.seccion, titular: s.titulares.find(([, t]) => t === "bien")![0], entradilla: s.entradilla });
    await terminarTurno(j, 6 + puntos * 3, {}, 20, `${aciertos} de 3 afirmaciones bien contrastadas. ${comentario}`);
  };
}

