import type { LugarId } from "./datos/mapa";
import { PERSONAJES, type PersonajeId } from "./datos/personajes";
import {
  amistad, cuantos, g, horaDelDia, limitar, publicar, quitar, reputacion, type Estado, type Oficio,
} from "./estado";
import type { Juego } from "./juego";
import { h } from "./ui/dom";
import { abierto, type Accion } from "./ui/lugares";
import { sonido } from "./ui/sonido";

/**
 * Temporada 1 · Capítulo 1: «La caja de la abuela».
 *
 * Vuelves a La Línea a vender la casa de tu abuela Concha y encuentras una caja
 * con una foto de 1968, la llave del puesto 14 del Mercado y una carta que
 * nunca cruzó la Verja. Cada `paso` es un punto de la historia.
 */

const OFICIOS: Record<Oficio, { quien: PersonajeId; lugar: LugarId; nombre: (e: Estado) => string }> = {
  pescador: { quien: "antonio", lugar: "atunara", nombre: (e) => g(e, "pescador", "pescadora") },
  hortelano: { quien: "rafa", lugar: "huerta", nombre: (e) => g(e, "hortelano", "hortelana") },
  periodista: { quien: "marta", lugar: "redaccion", nombre: () => "periodista" },
};

/** Horas en las que cada vecino está en su sitio. */
export const HORAS: Record<PersonajeId, [number, number]> = {
  carmen: [8, 23],
  lola: [8, 24],
  juani: [8, 15],
  antonio: [6, 18],
  rafa: [7, 20],
  marta: [9, 21],
  andres: [9, 20],
};

/** Con «buscar», Andrés pide un día: el desenlace llega a la mañana siguiente. */
const esperaAndres = (e: Estado) => e.flags.decision === "buscar" && e.dia <= Number(e.flags.diaDecision);

export const presente = (e: Estado, p: PersonajeId) => {
  const hh = horaDelDia(e);
  return hh >= HORAS[p][0] && hh < HORAS[p][1];
};

/* ── Objetivo visible en pantalla ─────────────────────────────────────── */

export function objetivo(e: Estado): { titulo: string; texto: string; lugar?: LugarId; opciones?: LugarId[] } {
  const cap = "Capítulo 1 · La caja de la abuela";
  switch (e.paso) {
    case 0: return { titulo: cap, texto: "Ve a la casa de tu abuela, en San Bernardo", lugar: "casa" };
    case 1: return { titulo: cap, texto: "Abre la caja que te dejó la abuela", lugar: "casa" };
    case 2: return { titulo: cap, texto: "Busca trabajo: Antonio (La Atunara), Rafa (El Zabal) o Marta (InfoLinense)", opciones: ["atunara", "huerta", "redaccion"] };
    case 3: {
      const o = OFICIOS[e.oficio!];
      return { titulo: cap, texto: `Haz tu primer turno de ${o.nombre(e)}`, lugar: o.lugar };
    }
    case 4: return { titulo: cap, texto: "Lleva la foto al Paseo de Poniente", lugar: "paseo" };
    case 5: return { titulo: cap, texto: "Enséñale la foto a Lola, en su bar de la Calle Real", lugar: "bar" };
    case 6: return { titulo: cap, texto: "Pregunta a Juani, en el Mercado de Abastos", lugar: "mercado" };
    case 7:
      return e.flags.pistaTortillitas
        ? { titulo: cap, texto: cuantos(e, "tortillitas") ? "Lleva las tortillitas a Andrés, en la Verja" : "Cocina tortillitas de camarones (2 camarones + 1 harina)", lugar: cuantos(e, "tortillitas") ? "frontera" : "casa" }
        : { titulo: cap, texto: "Busca a Andrés en su banco, junto a la Verja", lugar: "frontera" };
    case 8: return { titulo: cap, texto: "Habla con Marta en la redacción de InfoLinense", lugar: "redaccion" };
    case 9: return { titulo: cap, texto: `Reabre el puesto 14 del Mercado (30 €${e.dinero < 30 ? `; tienes ${e.dinero} €` : ""})`, lugar: "mercado" };
    case 10:
      return esperaAndres(e)
        ? { titulo: cap, texto: "Andrés necesita un día. Descansa en casa: mañana tendrás noticias", lugar: "casa" }
        : { titulo: cap, texto: "Vuelve a casa: algo te espera", lugar: "casa" };
    default: return { titulo: "Juego libre", texto: "Encargos del tablón, tu oficio y tus vecinos. Próximamente: Capítulo 2 · La Feria", lugar: "plaza" };
  }
}

/* ── Escenas ──────────────────────────────────────────────────────────── */

export async function intro(j: Juego) {
  await j.decir(
    ["narrador", "El autobús frena en la estación. Hacía años que no pisabas La Línea."],
    ["narrador", "Huele a mar y a churros. Al fondo, como siempre, **el Peñón**."],
    ["narrador", "Tu abuela Concha murió hace un mes y te ha dejado su casa en San Bernardo. Vienes a venderla… en principio."],
  );
  j.mundo.centrarEn("casa");
}

export async function alLlegar(j: Juego, lugar: LugarId) {
  const e = j.e;
  if (lugar === "casa" && e.paso === 0) {
    await j.decir(["narrador", "La casa de la abuela. Persianas verdes, macetas secas y la higuera asomando por encima de la tapia."]);
    const r = await j.conversar(
      [
        ["carmen", `¡${e.nombre}! Ay, que estás ${g(e, "igualito", "igualita")} que tu abuela de joven. Soy Carmen, la de al lado. Cuarenta años puerta con puerta con ella.`],
        ["carmen", "Toma las llaves. Te lo he dejado todo como estaba… Bueno, he regado las macetas cuando me acordaba."],
        ["carmen", "Y una cosa: en el dormitorio hay una **caja de lata**. Tu abuela me dijo que era para ti. Que no la abriera nadie más."],
      ],
      ["¿Sabe qué hay dentro?", "Gracias, Carmen. Voy a verla."],
    );
    if (r === 0) await j.decir(["carmen", "Ni idea, mi alma. Y mira que soy curiosa."]);
    amistad(e, "carmen", 10);
    e.paso = 1;
    j.refrescar();
  } else if (lugar === "casa" && e.paso === 10 && !esperaAndres(e)) {
    await desenlace(j);
  } else if (lugar === "huerta" && !e.flags.tutoZabal && e.paso >= 2) {
    e.flags.tutoZabal = true;
    await j.decir(
      ["rafa", `¡Hombre, ${g(e, "el nieto", "la nieta")} de Concha! Esos seis bancales de ahí eran de tu abuela. Los he tenido regados, pero llevan meses sin sembrar.`],
      ["rafa", "Toca un bancal y planta lo que tengas. La **lechuga** sale en hora y media; el **tomate**, en tres horas; el **pimiento**, en cinco. Con poniente, todo va más rápido."],
      ["rafa", "Y no hace falta que te quedes mirando: la tierra trabaja sola. Vuelve cuando esté listo y cosechas."],
    );
  } else if (lugar === "atunara" && !e.flags.tutoBarca && e.paso >= 2) {
    e.flags.tutoBarca = true;
    await j.decir(
      ["antonio", "¿Ves la barca lima del muelle? Era de tu abuelo. Tu abuela nunca quiso venderla."],
      ["antonio", "Te dejo a uno de mis chavales de marinero. Tú dices cuándo sale: una **salida corta** es una hora y trae sardinas; una **larga**, tres horas y trae camarón y boquerón. Con suerte, hasta pulpo."],
    );
  } else if (lugar === "paseo" && e.paso === 4) {
    await j.decir(
      ["narrador", "Es aquí. El mismo banco de piedra, el mismo Peñón al fondo, a la izquierda. Solo que las palmeras ahora son más altas."],
      ["yo", "Si alguien sabe quién es este muchacho, será alguien que lleve toda la vida en el Centro."],
      ["narrador", "**Lola**, la del bar de la Calle Real, conoce a todo el mundo."],
    );
    e.paso = 5;
    e.animo = limitar(e.animo + 5);
    j.refrescar();
  }
}

async function abrirCaja(j: Juego) {
  const e = j.e;
  await j.decir(
    ["narrador", "Una caja de lata de galletas, con el dibujo borrado de tanto abrirla. Dentro hay tres cosas."],
    ["narrador", "**Una foto** en blanco y negro: tu abuela, joven, riéndose en un banco del Paseo de Poniente. A su lado, un muchacho con camisa blanca.\n\nDetrás: «Poniente, agosto de 1968. M.»"],
    ["narrador", "**Una llave** con una etiqueta de cartón: «Puesto 14»."],
    ["narrador", "**Una carta** cerrada, con el sello puesto y sin matasellar. Dirigida a «Manuel Ríos — Gibraltar». Nunca llegó a mandarla."],
    ["yo", "¿Quién eras tú, M.?"],
    ["narrador", "Debajo de la caja, unos papeles: la abuela tenía **seis bancales en El Zabal**, junto a la huerta de Rafa, y la **barca del abuelo** sigue amarrada en La Atunara. Ahora son tuyos."],
    ["narrador", "Para quedarte un tiempo y averiguarlo, necesitas ganarte la vida. Carmen te ha dicho que buscan gente en **La Atunara** (Antonio), en **El Zabal** (Rafa) y en la redacción de **InfoLinense** (Marta)."],
  );
  e.paso = 2;
  j.refrescar();
}

/** Botones de historia que aparecen en cada lugar. */
export function acciones(j: Juego, lugar: LugarId): Accion[] {
  const e = j.e;
  if (lugar === "casa" && e.paso === 1) {
    return [{ icono: "objetivo", titulo: "Abrir la caja de la abuela", sub: "En el dormitorio, encima del armario", historia: true, fn: () => abrirCaja(j) }];
  }
  if (lugar === "mercado" && e.paso === 9) {
    return [{
      icono: "mercado", titulo: "Reabrir el puesto 14", sub: "Licencia y puesta a punto", precio: "30 €", historia: true,
      desactivada: !abierto(j, "mercado") ? "El Mercado abre de 8:00 a 15:00." : e.dinero < 30 ? `Te faltan ${30 - e.dinero} €. Trabaja o entrega encargos del tablón.` : false,
      fn: async () => {
        e.dinero -= 30;
        e.flags.puesto = true;
        sonido("bien");
        await j.decir(
          ["narrador", "Quitas el candado. Dentro, las cajas de fruta apiladas, una radio y una foto de la Virgen del Carmen."],
          ["juani", "¡Mira cómo brilla otra vez el 14! Desde hoy vendes aquí, y la gente paga más por lo de un puesto conocido."],
          ["juani", "Tu abuela estaría orgullosa. Y cantaría. No hace falta que cantes, ¿eh?"],
        );
        reputacion(e, "centro", 10);
        amistad(e, "juani", 10);
        e.paso = 10;
        j.refrescar();
      },
    }];
  }
  return [];
}

/* ── Conversaciones ───────────────────────────────────────────────────── */

export async function hablar(j: Juego, p: PersonajeId) {
  const e = j.e;
  if (!presente(e, p)) {
    j.aviso(`${PERSONAJES[p].nombre} no está ahora. Suele estar de ${HORAS[p][0]}:00 a ${HORAS[p][1]}:00.`);
    return;
  }
  if (await escenaDeHistoria(j, p)) {
    j.refrescar();
    return;
  }
  // Charla diaria: una al día sube la amistad.
  const per = PERSONAJES[p];
  if (e.charlaHoy[p] === e.dia) {
    await j.decir([p, "¡Que vaya bien el día! Ya nos vemos."]);
    return;
  }
  e.charlaHoy[p] = e.dia;
  const charla = per.charlas[(e.dia + p.length) % per.charlas.length];
  await j.decir([p, charla]);
  amistad(e, p, 3);
  e.social = limitar(e.social + 10);
  await j.pasar(10);
}

async function escenaDeHistoria(j: Juego, p: PersonajeId): Promise<boolean> {
  const e = j.e;

  // Paso 2: ofertas de trabajo.
  if (e.paso === 2 && (p === "antonio" || p === "rafa" || p === "marta")) {
    const oficio: Oficio = p === "antonio" ? "pescador" : p === "rafa" ? "hortelano" : "periodista";
    const oferta: Record<typeof p, string[]> = {
      antonio: [
        `Así que tú eres ${g(e, "el nieto", "la nieta")} de Concha. Tu abuela vendía mi pescado en el Mercado mejor que nadie.`,
        "¿Buscas trabajo? A mi barca le falta una mano. Se madruga, se suda y se aprende. ¿Te vienes?",
      ],
      rafa: [
        "¿Trabajo? Aquí sobra trabajo y falta gente. El pulgón no perdona y yo ya no tengo veinte años.",
        "Además, con la gente queriendo comprar huertas para hacer pisos, me vendría bien alguien que crea en esto. ¿Te quedas?",
      ],
      marta: [
        "Así que quieres contar La Línea. Aquí no buscamos clics: buscamos que la gente entienda lo que pasa en su ciudad.",
        "Contrastar, titular bien y explicar. Sin «no te lo vas a creer». ¿Te atreves?",
      ],
    };
    const r = await j.conversar(oferta[p].map((t) => [p, t] as const), [`Me apunto: seré ${OFICIOS[oficio].nombre(e)}`, "Me lo voy a pensar"]);
    if (r !== 0) return true;
    e.oficio = oficio;
    e.paso = 3;
    amistad(e, p, 10);
    sonido("bien");
    await j.decir([p, "Pues no se hable más. Tu primer turno, cuando quieras: hoy mismo, si te ves con fuerzas."]);
    return true;
  }

  if (e.paso === 5 && p === "lola") {
    await j.decir(
      ["lola", "A ver esa foto… ¡Pero si es Concha! Qué guapa, por Dios. Venía aquí a por café cuando cerraba el puesto."],
      ["lola", "Al muchacho no lo conozco, eso es de antes de mi tiempo. Pero **Juani**, la del Mercado, lleva allí desde que era una chiquilla. Pregúntale a ella."],
    );
    amistad(e, "lola", 5);
    e.paso = 6;
    return true;
  }

  if (e.paso === 6 && p === "juani") {
    await j.decir(
      ["juani", "¡La llave del 14! La reconocería con los ojos cerrados. Era el puesto de tu abuela: frutas, verduras y coplas gratis."],
      ["juani", "Y ese de la foto… es **Manolo**. Manolo Ríos. Trabajaba en el muelle de Gibraltar y cada tarde se pasaba por el puesto. Todo el Mercado sabía que se querían."],
      ["juani", "Luego cerraron la Verja y… bueno. Eso te lo cuenta mejor **Andrés**, que cruzaba con él cada mañana. Lo encuentras en su banco, junto a la frontera."],
    );
    amistad(e, "juani", 5);
    e.paso = 7;
    return true;
  }

  if (e.paso === 7 && p === "andres") {
    if (!cuantos(e, "tortillitas")) {
      await j.decir(
        ["andres", `¿${g(e, "El nieto", "La nieta")} de Concha? Siéntate, siéntate. Pero no me hagas hablar de aquellos años con el estómago vacío…`],
        ["andres", "A tu abuela le salían las mejores tortillitas de camarones de La Línea. Si me traes unas hechas por ti, te cuento lo que sé."],
        ["narrador", "Necesitas **2 camarones** (en la lonja de La Atunara o pescando) y **1 de harina** (en el Mercado). Se preparan en la cocina de casa: tardan media hora."],
      );
      e.flags.pistaTortillitas = true;
      return true;
    }
    quitar(e, "tortillitas");
    const r = await j.conversar(
      [
        ["andres", "Mmm. Les falta un poquito de sal… Pero son de la familia, eso se nota."],
        ["andres", "Manolo y yo cruzábamos juntos la Verja cada mañana para trabajar en el muelle. Tu abuela lo esperaba a la vuelta, en el Paseo."],
        ["andres", "En **junio del 69** cerraron la frontera. De un día para otro. Miles de linenses se quedaron sin trabajo y muchas familias, partidas en dos."],
        ["andres", "Manolo dormía al otro lado esa noche. Y allí se quedó. Durante años la gente se hablaba a gritos a través de la Verja… Tu abuela iba algunos domingos."],
        ["andres", "Hasta finales del 82 no se volvió a pasar andando. Para entonces, cada uno tenía su vida. Nunca supe si llegaron a verse."],
        ["andres", "Esa carta que llevas era para él, ¿verdad? ¿Qué vas a hacer con ella?"],
      ],
      [
        "Contarlo en InfoLinense: alguien sabrá dónde está Manuel Ríos",
        "Buscarlo con discreción: Andrés conoce gente al otro lado",
        "Guardar la carta: es la historia de la abuela",
      ],
    );
    amistad(e, "andres", 10);
    e.flags.diaDecision = e.dia;
    if (r === 0) {
      e.flags.decision = "publicar";
      e.paso = 8;
      await j.decir(["andres", "Hoy en día todo el mundo lee eso en el móvil… Puede que funcione. Habla con Marta, la de la redacción."]);
    } else if (r === 1) {
      e.flags.decision = "buscar";
      amistad(e, "andres", 15);
      e.paso = 9;
      await j.decir(
        ["andres", "Déjamelo a mí. Tengo un par de amigos llanitos que lo saben todo de todo el mundo. Dame un día."],
        ["andres", "Y mientras tanto, abre el puesto de tu abuela. Que el 14 lleva demasiado tiempo cerrado."],
      );
    } else {
      e.flags.decision = "guardar";
      amistad(e, "carmen", 10);
      e.paso = 9;
      await j.decir(
        ["andres", "Tu abuela tampoco la mandó. A lo mejor tenía sus razones. Me parece bien."],
        ["andres", "Pero el puesto sí deberías abrirlo. Eso sí que lo habría querido."],
      );
    }
    return true;
  }

  if (e.paso === 8 && p === "marta") {
    await j.conversar(
      [
        ["marta", "Una carta de 1969 que nunca llegó a cruzar la Verja. Es una historia preciosa, y muy de aquí."],
        ["marta", "Pero la hacemos bien: sin datos privados y sin abrir la carta. Solo la foto y una pregunta: ¿alguien conoce a Manuel Ríos?"],
      ],
      ["Adelante, publícalo"],
    );
    publicar(e, {
      seccion: "HISTORIA",
      titular: "Una carta de 1969 busca a su destinatario al otro lado de la Verja",
      entradilla: "Una familia de San Bernardo busca a Manuel Ríos, que trabajaba en el muelle de Gibraltar cuando se cerró la frontera. ¿Lo conoces?",
      tuya: true,
    });
    reputacion(e, "centro", 8);
    amistad(e, "marta", 8);
    sonido("bien");
    await j.decir(["marta", "Publicado. Ahora, paciencia. Mientras tanto, ¿por qué no abres el puesto de tu abuela?"]);
    e.paso = 9;
    return true;
  }

  if (e.paso >= 2 && e.paso < 9 && p === "carmen" && e.charlaHoy.carmen !== e.dia) {
    e.charlaHoy.carmen = e.dia;
    await j.decir(["carmen", "¿Y esa cara? Ya me han dicho que andas preguntando por la foto. En este barrio no se puede tener un secreto, mi alma."]);
    amistad(e, "carmen", 3);
    return true;
  }

  return false;
}

/* ── Ganchos del día ──────────────────────────────────────────────────── */

export async function trasTurno(j: Juego) {
  const e = j.e;
  if (e.paso !== 3) return;
  await j.decir(["narrador", "Primer sueldo en el bolsillo. Al lado, la foto de la abuela. Ese banco del Paseo de Poniente… ¿seguirá allí?"]);
  e.paso = 4;
  j.refrescar();
}

export async function alDespertar(j: Juego) {
  if (j.e.paso === 10) await desenlace(j);
}

async function desenlace(j: Juego) {
  const e = j.e;
  if (e.flags.decision === "publicar") {
    await j.decir(
      ["narrador", "El móvil echa humo: tu historia es lo más leído de InfoLinense."],
      ["narrador", "Un mensaje de una lectora:\n\n«Manuel Ríos es mi abuelo. Vive en Gibraltar, en Catalan Bay. Tiene 80 años y todavía guarda la foto de un banco del Paseo de Poniente. Quiere conocerte»."],
    );
    publicar(e, {
      seccion: "HISTORIA",
      titular: "Encontrado el destinatario de la carta que no cruzó la Verja",
      entradilla: "Una lectora reconoce a su abuelo en la foto de 1968. Las dos familias se verán en los próximos días.",
      tuya: true,
    });
  } else if (e.flags.decision === "buscar") {
    await j.decir(
      ["narrador", "Llaman a la puerta temprano. Es Andrés, con la gorra en la mano."],
      ["andres", "Lo he encontrado. Vive en Catalan Bay. Cuando le nombré a Concha se quedó callado un buen rato."],
      ["andres", `Y luego dijo: «Dile a ${g(e, "su nieto", "su nieta")} que venga. Tengo algo que es suyo»`],
    );
  } else {
    await j.decir(
      ["narrador", "Al dejar la caja de lata en su sitio, el fondo se mueve. Es un doble fondo."],
      ["narrador", "Debajo hay otra carta. Esta sí tiene matasellos: **Gibraltar, diciembre de 1982**.\n\n«Concha: la Verja abre por fin. Te espero en nuestro banco, el domingo a las seis. M.»"],
      ["yo", "¿Fuiste a aquel banco, abuela?"],
    );
  }
  e.paso = 11;
  e.flags.capitulo1 = true;
  sonido("bien");
  await finCapitulo(j);
}

const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function finCapitulo(j: Juego) {
  const e = j.e;
  return new Promise<void>((resolver) => {
    j.pantalla(
      h(
        "div", { class: "pantalla" },
        h("span", { class: "etiqueta lima", style: "align-self:flex-start" }, "FIN DEL CAPÍTULO 1"),
        h("h1", { style: "margin-top:14px" }, "La caja de la abuela"),
        h("p", { style: "margin-top:14px" }, "La historia de Concha y Manolo continúa en la Temporada 3 · La Verja. Antes llega la Temporada 2 · La Feria."),
        h("p", { style: "margin-top:14px" }, `${e.dia} días en La Línea · ${cuenta(e.turnos, "turno", "turnos")} de trabajo · ${cuenta(Number(e.flags.encargos ?? 0), "encargo entregado", "encargos entregados")}.`),
        h("div", { class: "espacio" }),
        h("p", { style: "margin-bottom:16px" }, "Puedes seguir jugando: tu oficio, el puesto 14, el tablón de encargos y tus vecinos te esperan."),
        h("button", { class: "boton", onclick: () => { j.cerrar(); resolver(); } }, "Seguir en La Línea"),
      ),
    );
  });
}
